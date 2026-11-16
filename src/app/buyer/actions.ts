"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export async function toggleSavePropertyAction(propertyId: string): Promise<{
  saved: boolean;
  error?: string;
}> {
  const supabase = createClient();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(propertyId)) {
    return { saved: false, error: "This property cannot be saved." };
  }
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) {
    console.error("[saved-properties] Could not verify session:", authError.message);
    return { saved: false, error: "Your session could not be verified. Please sign in again." };
  }

  if (!user) {
    return { saved: false, error: "Please sign in to save properties." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, account_status")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) {
    console.error("[saved-properties] Could not load account:", profileError.message);
    return { saved: false, error: "Your account could not be verified." };
  }
  if (profile?.role !== "buyer") {
    return { saved: false, error: "Only buyer accounts can save properties." };
  }
  if (profile.account_status !== "verified") {
    return { saved: false, error: "Complete identity verification before saving properties." };
  }

  const { data: existing, error: existingError } = await supabase
    .from("saved_properties")
    .select("property_id")
    .eq("user_id", user.id)
    .eq("property_id", propertyId)
    .maybeSingle();
  if (existingError) {
    console.error("[saved-properties] Could not check saved state:", existingError.message);
    return { saved: false, error: "The saved listing could not be checked." };
  }

  if (existing) {
    const { error } = await supabase
      .from("saved_properties")
      .delete()
      .eq("user_id", user.id)
      .eq("property_id", propertyId);
    if (error) {
      console.error("[saved-properties] Could not remove saved listing:", error.message);
      return { saved: true, error: "The listing could not be removed from your saved list." };
    }

    revalidatePath("/buyer/saved");
    revalidatePath("/buyer/dashboard");
    return { saved: false };
  } else {
    const { error } = await supabase
      .from("saved_properties")
      .insert({ user_id: user.id, property_id: propertyId });
    if (error) {
      console.error("[saved-properties] Could not save listing:", error.message);
      return { saved: false, error: "The listing could not be saved." };
    }

    revalidatePath("/buyer/saved");
    revalidatePath("/buyer/dashboard");
    return { saved: true };
  }
}
