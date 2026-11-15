import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";

/**
 * Xendit Webhook Endpoint
 * 
 * URL to register in Xendit Dashboard:
 * https://choya.kasafide.com/api/webhooks/xendit
 *
 * Security:
 * - Verifies `x-callback-token` header against XENDIT_CALLBACK_TOKEN
 * - Rejects unauthorized requests with 403 Forbidden
 * - Idempotent processing: Ignores duplicate success events
 * - Updates payment status strictly on the server using adminClient (service_role)
 */
export async function POST(req: NextRequest) {
  try {
    const callbackToken = req.headers.get("x-callback-token");
    const configuredToken = process.env.XENDIT_CALLBACK_TOKEN;

    if (!callbackToken || !configuredToken || callbackToken !== configuredToken) {
      console.warn("[Xendit Webhook] Unauthorized attempt with invalid or missing callback token");
      return NextResponse.json({ error: "Forbidden: invalid callback token" }, { status: 403 });
    }

    const body = (await req.json()) as {
      event?: string;
      reference_id?: string;
      external_id?: string;
      status?: string;
      data?: {
        reference_id?: string;
        status?: string;
        payment_request_id?: string;
      };
      [key: string]: unknown;
    };

    const referenceId = body.reference_id ?? body.external_id ?? body.data?.reference_id;
    const rawStatus = (body.status ?? body.data?.status ?? "").toUpperCase();
    const event = body.event ?? "";

    if (!referenceId) {
      return NextResponse.json({ received: true, note: "missing reference_id" });
    }

    // Determine target payment status
    const isSuccess =
      rawStatus === "SUCCEEDED" ||
      rawStatus === "COMPLETED" ||
      rawStatus === "PAID" ||
      event === "payment.capture" ||
      event === "payment_request.succeeded";

    const isFailed = rawStatus === "FAILED" || rawStatus === "EXPIRED";

    if (!isSuccess && !isFailed) {
      return NextResponse.json({ received: true, note: "event acknowledged" });
    }

    // 1. Fetch current payment row for idempotency check
    const { data: existingPayment, error: queryError } = await adminClient
      .from("payments")
      .select("id, status")
      .eq("xendit_reference_id", referenceId)
      .maybeSingle();

    if (queryError || !existingPayment) {
      console.warn(`[Xendit Webhook] Payment not found for reference: ${referenceId}`);
      return NextResponse.json({ received: true, note: "payment not found" });
    }

    // Idempotency: If payment is already confirmed or paid, do not process again
    if (existingPayment.status === "confirmed" || existingPayment.status === "paid") {
      return NextResponse.json({ received: true, note: "already processed" });
    }

    // 2. Update status
    const newStatus = isSuccess ? "paid" : "failed";
    const updatePayload: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };
    if (isSuccess) {
      updatePayload.paid_at = new Date().toISOString();
    }

    const { error: updateError } = await adminClient
      .from("payments")
      .update(updatePayload)
      .eq("id", existingPayment.id);

    if (updateError) {
      console.error("[Xendit Webhook] DB update error:", updateError.message);
      return NextResponse.json({ error: "Database update error" }, { status: 500 });
    }

    return NextResponse.json({ received: true, status: newStatus });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[Xendit Webhook] Unexpected error:", message);
    return NextResponse.json({ received: true });
  }
}
