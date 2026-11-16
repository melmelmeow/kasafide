import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ID_TYPES = new Set([...IMAGE_TYPES, "application/pdf"]);

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-80) || "upload";
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) {
    console.error("[verify/documents] Could not verify session:", authError.message);
    return NextResponse.redirect(new URL("/auth/login?error=session-check-failed", request.url), 303);
  }
  if (!user) return NextResponse.redirect(new URL("/auth/login", request.url), 303);

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, account_status, verification_expiry")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) {
    console.error("[verify/documents] Could not load account:", profileError.message);
    return NextResponse.redirect(new URL("/auth/login?error=account-check-failed", request.url), 303);
  }
  if (!profile) return NextResponse.redirect(new URL("/auth/login?error=account-check-failed", request.url), 303);
  if (!["buyer", "seller"].includes(profile.role)) return NextResponse.redirect(new URL("/", request.url), 303);

  const returnPath = `/${profile.role}/verification`;
  const form = await request.formData();
  const idFile = form.get("government_id");
  const selfieFile = form.get("selfie");
  if (!(idFile instanceof File) || !(selfieFile instanceof File) || !idFile.size || !selfieFile.size) {
    return NextResponse.redirect(new URL(`${returnPath}?error=verification-files-required`, request.url), 303);
  }
  if (!ID_TYPES.has(idFile.type) || idFile.size > MAX_FILE_SIZE) {
    return NextResponse.redirect(new URL(`${returnPath}?error=invalid-id-file`, request.url), 303);
  }
  if (!IMAGE_TYPES.has(selfieFile.type) || selfieFile.size > MAX_FILE_SIZE) {
    return NextResponse.redirect(new URL(`${returnPath}?error=invalid-selfie-file`, request.url), 303);
  }
  if (profile.account_status === "pending" || profile.account_status === "reverification") {
    return NextResponse.redirect(new URL(`${returnPath}?error=verification-pending`, request.url), 303);
  }

  const renewal = profile.account_status === "verified";
  if (renewal) {
    const daysLeft = profile.verification_expiry
      ? Math.ceil((new Date(profile.verification_expiry).getTime() - Date.now()) / 86400000)
      : null;
    if (daysLeft === null || daysLeft > 30) {
      return NextResponse.redirect(new URL(`${returnPath}?error=renewal-not-due`, request.url), 303);
    }
  }

  const uploaded: string[] = [];
  try {
    const docs: { label: string; path: string }[] = [];
    for (const [label, file] of [["Government-issued ID", idFile], ["Selfie", selfieFile]] as const) {
      const path = `${user.id}/${Date.now()}-${randomUUID()}-${safeFileName(file.name)}`;
      const { error } = await supabase.storage.from("verification-docs").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (error) throw new Error(error.message);
      uploaded.push(path);
      docs.push({ label, path });
    }

    const now = new Date().toISOString();
    const profilePatch = renewal
      ? { new_verification_docs: docs, new_submitted_verification_at: now, account_status: "reverification" }
      : { verification_docs: docs, submitted_verification_at: now, account_status: "pending" };
    const { error } = await supabase.from("profiles").update(profilePatch).eq("id", user.id);
    if (error) throw new Error(error.message);
  } catch (error) {
    if (uploaded.length) {
      const { error: cleanupError } = await supabase.storage.from("verification-docs").remove(uploaded);
      if (cleanupError) {
        console.error("[verify/documents] Could not clean up failed uploads:", cleanupError.message);
      }
    }
    console.error("[verify/documents] Verification upload failed:", error);
    return NextResponse.redirect(new URL(`${returnPath}?error=verification-upload-failed`, request.url), 303);
  }

  return NextResponse.redirect(new URL(`${returnPath}?submitted=1`, request.url), 303);
}
