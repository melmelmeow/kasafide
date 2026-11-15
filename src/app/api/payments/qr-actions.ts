"use server";

import { createClient } from "@/utils/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import QRCode from "qrcode";

export type CreateQrPaymentResult = {
  success: boolean;
  error?: string;
  paymentId?: string;
  referenceId?: string;
  amount?: number;
  qrString?: string;
  qrImageDataUrl?: string;
  expiresAt?: string;
};

/**
 * Server Action: Creates a pending payment record and requests a Dynamic QR Ph
 * from Xendit's Payments API (v3/payment_requests).
 *
 * Security:
 * - Amount is retrieved from DB properties (NEVER trusted from client)
 * - Minimum PHP 1.00, Maximum PHP 50,000.00
 * - Uses server-only XENDIT_SECRET_KEY
 * - Idempotency key per transaction
 */
export async function createQrPaymentAction(params: {
  propertyId: string;
  purpose?: string;
  period?: string;
  dueDate?: string;
  depositMonths?: number;
}): Promise<CreateQrPaymentResult> {
  const { propertyId, purpose = "rent", period, dueDate, depositMonths } = params;

  if (!propertyId) {
    return { success: false, error: "Property ID is required." };
  }

  // 1. Verify user session
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized. Please sign in." };
  }

  // 2. Fetch verified property price from DB
  const { data: property, error: propError } = await adminClient
    .from("properties")
    .select("id, title, price, landowner_id")
    .eq("id", propertyId)
    .single();

  if (propError || !property) {
    return { success: false, error: "Property not found." };
  }

  const amount = Number(property.price);

  // 3. Enforce Xendit QR Ph limits: Min PHP 1.00, Max PHP 50,000.00
  if (amount < 1.0) {
    return { success: false, error: "Amount is below the minimum allowed for QR Ph (PHP 1.00)." };
  }
  if (amount > 50000.0) {
    return {
      success: false,
      error: "Amount exceeds the maximum limit for QR Ph (PHP 50,000.00). Please pay via Bank Transfer.",
    };
  }

  const referenceId = `kf_pay_${Date.now()}_${user.id.slice(0, 8)}`;
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes expiry

  // 4. Call Xendit Payments API v3 for QRPH
  const secretKey = process.env.XENDIT_SECRET_KEY;
  if (!secretKey) {
    return { success: false, error: "Xendit configuration missing on server." };
  }

  const authHeader = Buffer.from(`${secretKey}:`).toString("base64");
  let qrString = "";
  let xenditPaymentRequestId: string | null = null;

  try {
    const res = await fetch("https://api.xendit.co/v3/payment_requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${authHeader}`,
        "api-version": "2022-09-05",
        "Idempotency-key": referenceId,
      },
      body: JSON.stringify({
        reference_id: referenceId,
        type: "PAY",
        country: "PH",
        currency: "PHP",
        request_amount: amount,
        capture_method: "AUTOMATIC",
        channel_code: "QRPH",
        channel_properties: {
          expires_at: expiresAt,
        },
        description: `Kasafide Payment for ${property.title}`,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      // Fallback to legacy QR codes endpoint if Payments API v3 returns channel configuration issue
      const legacyRes = await fetch("https://api.xendit.co/qr_codes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${authHeader}`,
        },
        body: JSON.stringify({
          reference_id: referenceId,
          type: "DYNAMIC",
          currency: "PHP",
          amount,
          expires_at: expiresAt,
        }),
      });
      const legacyData = await legacyRes.json();
      qrString = legacyData?.qr_string || "";
      xenditPaymentRequestId = legacyData?.id || null;
    } else {
      xenditPaymentRequestId = data.id || null;
      qrString =
        data?.actions?.find((a: { action: string }) => a.action === "PRESENT_TO_CUSTOMER")?.qr_string ||
        data?.channel_properties?.qr_string ||
        data?.qr_string ||
        "";
    }
  } catch (apiErr: unknown) {
    console.error("[createQrPaymentAction] Xendit API request error:", apiErr);
    return { success: false, error: "Failed to connect to payment provider. Please try again." };
  }

  if (!qrString) {
    return { success: false, error: "Failed to generate QR Ph code from provider." };
  }

  // Generate QR image data URL server-side
  let qrImageDataUrl = "";
  try {
    qrImageDataUrl = await QRCode.toDataURL(qrString, {
      margin: 2,
      width: 280,
      color: {
        dark: "#1e1b4b",
        light: "#ffffff",
      },
    });
  } catch (qrErr) {
    console.error("[createQrPaymentAction] QRCode generation error:", qrErr);
  }

  // 5. Order-first insertion into database
  const { data: payment, error: insertError } = await adminClient
    .from("payments")
    .insert({
      buyer_id: user.id,
      property_id: propertyId,
      amount,
      purpose,
      period: period ?? null,
      due_date: dueDate ?? null,
      deposit_months: depositMonths ?? null,
      status: "pending",
      method: "QRPH",
      xendit_reference_id: referenceId,
      qr_code_url: qrImageDataUrl,
      xendit_qr_string: qrString,
    })
    .select("id")
    .single();

  if (insertError || !payment) {
    console.error("[createQrPaymentAction] DB payment insert error:", insertError);
    return { success: false, error: "Could not create pending payment order." };
  }

  return {
    success: true,
    paymentId: payment.id,
    referenceId,
    amount,
    qrString,
    qrImageDataUrl,
    expiresAt,
  };
}

/**
 * Server Action: Poll or check status of an existing payment
 */
export async function getPaymentStatusAction(paymentId: string): Promise<{
  status: string;
  isPaid: boolean;
  error?: string;
}> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "unauthorized", isPaid: false, error: "Unauthorized" };
  }

  const { data: payment } = await supabase
    .from("payments")
    .select("id, status, buyer_id")
    .eq("id", paymentId)
    .maybeSingle();

  if (!payment) {
    return { status: "not_found", isPaid: false, error: "Payment not found" };
  }

  // Ensure user owns this payment or is admin
  if (payment.buyer_id !== user.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "admin" && profile?.role !== "super_admin" && profile?.role !== "superadmin") {
      return { status: "forbidden", isPaid: false, error: "Forbidden" };
    }
  }

  const isPaid = payment.status === "paid" || payment.status === "confirmed";
  return { status: payment.status, isPaid };
}
