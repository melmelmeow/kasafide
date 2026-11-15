"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { homeFor, SUPER_ADMIN_ROLES, type AppRole } from "@/lib/auth";

export type AuthActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
};

export async function signInAction(
  prevState: AuthActionState | null,
  formData: FormData
): Promise<AuthActionState> {
  const email = (formData.get("email") as string | null)?.trim() ?? "";
  const password = (formData.get("password") as string | null) ?? "";
  const next = (formData.get("next") as string | null)?.trim() ?? "";

  const fieldErrors: Record<string, string> = {};
  if (!email) fieldErrors.email = "Email is required";
  if (!password) fieldErrors.password = "Password is required";

  if (Object.keys(fieldErrors).length > 0) {
    return { error: "Please provide both email and password.", fieldErrors };
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data?.user) {
    return {
      error: error?.message || "Invalid email or password, or email not verified.",
    };
  }

  // Determine role and destination
  let destination = "";
  if (next && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\")) {
    destination = next;
  } else {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();

    const role = profile?.role || "buyer";
    destination = homeFor(role);
  }

  revalidatePath("/", "layout");
  redirect(destination);
}

export async function signUpAction(
  prevState: AuthActionState | null,
  formData: FormData
): Promise<AuthActionState> {
  const firstName = (formData.get("firstName") as string | null)?.trim() ?? "";
  const lastName = (formData.get("lastName") as string | null)?.trim() ?? "";
  const middleInitial = (formData.get("mi") as string | null)?.trim() ?? "";
  const email = (formData.get("email") as string | null)?.trim() ?? "";
  const phone = (formData.get("phone") as string | null)?.trim() ?? "";
  const password = (formData.get("password") as string | null) ?? "";
  const confirmPassword = (formData.get("confirmPassword") as string | null) ?? "";
  const roleInput = (formData.get("role") as string | null)?.trim() ?? "buyer";

  // Security: only buyer or seller allowed from public sign up
  const role: "buyer" | "seller" = roleInput === "seller" ? "seller" : "buyer";

  const fieldErrors: Record<string, string> = {};
  if (!firstName) fieldErrors.firstName = "First name is required";
  if (!lastName) fieldErrors.lastName = "Last name is required";
  if (!email) fieldErrors.email = "Email is required";
  if (!password) fieldErrors.password = "Password is required";
  if (password.length < 8) fieldErrors.password = "Password must be at least 8 characters";
  if (password !== confirmPassword) fieldErrors.confirmPassword = "Passwords do not match";

  if (Object.keys(fieldErrors).length > 0) {
    return { error: "Please fix the form errors.", fieldErrors };
  }

  const fullName = [firstName, middleInitial, lastName].filter(Boolean).join(" ");
  const formattedPhone = phone ? `+63${phone.replace(/\D/g, "")}` : "";

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
        middle_initial: middleInitial,
        full_name: fullName,
        phone: formattedPhone,
        phone_number: formattedPhone,
        role, // strictly "buyer" or "seller"
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // If user session exists immediately (e.g. email confirmation disabled), redirect
  if (data?.session) {
    revalidatePath("/", "layout");
    redirect(homeFor(role));
  }

  return { success: true };
}

export async function signOutAction(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/auth/login");
}

export async function updateUserRoleAction(
  targetUserId: string,
  newRole: AppRole
): Promise<{ error?: string; success?: boolean }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Verify caller is super admin
  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!callerProfile || !SUPER_ADMIN_ROLES.includes(callerProfile.role)) {
    return { error: "Permission denied: only super admins can change user roles." };
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq("id", targetUserId);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath("/super-admin");
  revalidatePath("/admin/users");
  return { success: true };
}
