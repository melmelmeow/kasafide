import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { homeFor } from "@/lib/auth";
import { getAuthOrigin } from "@/lib/auth/google";

export async function GET(request: NextRequest) {
  const origin = getAuthOrigin(request);
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=missing_auth_code`);
  }

  try {
    const supabase = createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("[auth/callback] exchangeCodeForSession error:", exchangeError);
      return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      const role = profile?.role || "buyer";
      return NextResponse.redirect(`${origin}${homeFor(role)}`);
    }

    return NextResponse.redirect(`${origin}${next}`);
  } catch (err) {
    console.error("[auth/callback] unexpected error:", err);
    return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`);
  }
}
