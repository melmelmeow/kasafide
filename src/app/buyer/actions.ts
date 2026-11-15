"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export async function toggleSavePropertyAction(propertyId: string): Promise<{
  saved: boolean;
  error?: string;
}> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { saved: false, error: "Please sign in to save properties." };
  }

  // Check if currently saved
  const { data: existing } = await supabase
    .from("saved_properties")
    .select("property_id")
    .eq("user_id", user.id)
    .eq("property_id", propertyId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("saved_properties")
      .delete()
      .eq("user_id", user.id)
      .eq("property_id", propertyId);

    revalidatePath("/buyer/saved");
    revalidatePath("/buyer/dashboard");
    return { saved: false };
  } else {
    await supabase
      .from("saved_properties")
      .insert({ user_id: user.id, property_id: propertyId });

    revalidatePath("/buyer/saved");
    revalidatePath("/buyer/dashboard");
    return { saved: true };
  }
}
