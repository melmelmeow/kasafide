"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getMe, requireRole } from "@/lib/auth";

function text(data: FormData, key: string, maxLength: number): string {
  const value = data.get(key);
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function rawText(data: FormData, key: string, maxLength: number): string {
  const value = data.get(key);
  return typeof value === "string" ? value.slice(0, maxLength) : "";
}

function uuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function updateProfileAction(formData: FormData): Promise<void> {
  const me = await getMe();
  if (!me || !["buyer", "seller"].includes(me.profile.role)) redirect("/auth/login");

  const firstName = text(formData, "first_name", 80);
  const lastName = text(formData, "last_name", 80);
  const phone = text(formData, "phone", 40);
  if (!firstName || !lastName) redirect(`/${me.profile.role}/profile?error=name-required`);

  const { error } = await me.supabase
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      full_name: `${firstName} ${lastName}`,
      phone: phone || null,
    })
    .eq("id", me.user.id);
  if (error) throw new Error(`Could not update profile: ${error.message}`);

  revalidatePath(`/${me.profile.role}/profile`);
  redirect(`/${me.profile.role}/profile?updated=1`);
}

export async function changePasswordAction(formData: FormData): Promise<void> {
  const me = await getMe();
  if (!me?.user.email) redirect("/auth/login");

  const currentPassword = rawText(formData, "current_password", 256);
  const newPassword = rawText(formData, "new_password", 256);
  const confirmation = rawText(formData, "confirm_password", 256);

  if (!currentPassword || !newPassword || newPassword !== confirmation) {
    redirect(`/${me.profile.role}/settings?error=password-fields`);
  }
  if (
    newPassword.length < 8 ||
    !/[A-Z]/.test(newPassword) ||
    !/[0-9]/.test(newPassword) ||
    !/[^A-Za-z0-9]/.test(newPassword)
  ) {
    redirect(`/${me.profile.role}/settings?error=password-strength`);
  }

  const { error: authError } = await me.supabase.auth.signInWithPassword({
    email: me.user.email,
    password: currentPassword,
  });
  if (authError?.code === "invalid_credentials") {
    redirect(`/${me.profile.role}/settings?error=current-password`);
  }
  if (authError) throw new Error(`Could not verify the current password: ${authError.message}`);

  const { error } = await me.supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(`Could not update password: ${error.message}`);
  redirect(`/${me.profile.role}/settings?updated=password`);
}

export async function sendMessageAction(formData: FormData): Promise<void> {
  const me = await getMe();
  if (!me || !["buyer", "seller"].includes(me.profile.role)) redirect("/auth/login");
  if (me.profile.role === "buyer" && me.profile.account_status !== "verified") {
    redirect("/buyer/verification?error=verification-required");
  }

  const receiverId = text(formData, "receiver_id", 64);
  const body = text(formData, "body", 2000);
  const propertyId = text(formData, "property_id", 64);
  if (!uuid(receiverId) || receiverId === me.user.id || !body) {
    redirect(`/${me.profile.role}/messages?error=message-fields`);
  }

  const { data: receiver, error: receiverError } = await me.supabase
    .from("public_profiles")
    .select("id, role")
    .eq("id", receiverId)
    .maybeSingle();
  if (receiverError) throw new Error(`Could not verify message recipient: ${receiverError.message}`);
  const expectedRole = me.profile.role === "buyer" ? "seller" : "buyer";
  if (!receiver || receiver.role !== expectedRole) {
    redirect(`/${me.profile.role}/messages?error=invalid-recipient`);
  }

  const payload: {
    sender_id: string;
    receiver_id: string;
    body: string;
    type: string;
    property_id?: string;
  } = {
    sender_id: me.user.id,
    receiver_id: receiverId,
    body,
    type: "text",
  };
  if (propertyId) {
    if (!uuid(propertyId)) redirect(`/${me.profile.role}/messages?error=invalid-property`);
    const { data: property, error: propertyError } = await me.supabase
      .from("properties")
      .select("id, landowner_id")
      .eq("id", propertyId)
      .maybeSingle();
    if (propertyError) throw new Error(`Could not verify message listing: ${propertyError.message}`);
    if (!property || property.landowner_id !== receiverId) {
      redirect(`/${me.profile.role}/messages?error=invalid-property`);
    }
    payload.property_id = propertyId;
  }

  const { error } = await me.supabase.from("messages").insert(payload);
  if (error) throw new Error(`Could not send message: ${error.message}`);
  revalidatePath(`/${me.profile.role}/messages`);
  redirect(`/${me.profile.role}/messages?with=${encodeURIComponent(receiverId)}`);
}

export async function createViewingRequestAction(formData: FormData): Promise<void> {
  const { supabase, user, profile } = await requireRole(["buyer"], "/browse");
  if (profile.account_status !== "verified") redirect("/buyer/verification?error=verification-required");

  const propertyId = text(formData, "property_id", 64);
  const requestedDate = text(formData, "requested_date", 10);
  const requestedTime = text(formData, "requested_time", 5);
  const buyerNotes = text(formData, "buyer_notes", 500);
  if (
    !uuid(propertyId) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(requestedDate) ||
    !/^\d{2}:\d{2}$/.test(requestedTime)
  ) {
    redirect(`/property/${encodeURIComponent(propertyId)}?error=viewing-fields`);
  }
  const [year, month, day] = requestedDate.split("-").map(Number);
  const [hour, minute] = requestedTime.split(":").map(Number);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (
    calendarDate.getUTCFullYear() !== year ||
    calendarDate.getUTCMonth() !== month - 1 ||
    calendarDate.getUTCDate() !== day ||
    hour > 23 ||
    minute > 59
  ) {
    redirect(`/property/${propertyId}?error=viewing-fields`);
  }
  const requestedAt = new Date(`${requestedDate}T${requestedTime}:00+08:00`);
  if (requestedAt <= new Date()) {
    redirect(`/property/${propertyId}?error=viewing-date-past`);
  }

  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("id, landowner_id")
    .eq("id", propertyId)
    .eq("status", "approved")
    .is("lifecycle_status", null)
    .maybeSingle();
  if (propertyError) throw new Error(`Could not load property for viewing request: ${propertyError.message}`);
  if (!property) redirect("/browse?error=listing-unavailable");
  if (property.landowner_id === user.id) redirect(`/property/${propertyId}?error=own-listing`);

  const { error } = await supabase.from("viewing_requests").insert({
    property_id: property.id,
    buyer_id: user.id,
    seller_id: property.landowner_id,
    requested_date: requestedDate,
    requested_time: requestedTime,
    buyer_notes: buyerNotes || null,
  });
  if (error) throw new Error(`Could not create viewing request: ${error.message}`);

  revalidatePath("/seller/viewing-requests");
  redirect(`/property/${propertyId}?viewing=1`);
}

export async function updateListingStatusAction(formData: FormData): Promise<void> {
  const { supabase, user } = await requireRole(["seller"]);
  const id = text(formData, "id", 64);
  const decision = text(formData, "decision", 24);
  if (!uuid(id) || !["close", "submit", "reopen", "delete"].includes(decision)) {
    redirect("/seller/listings?error=invalid-action");
  }

  if (decision === "delete") {
    const { error } = await supabase
      .from("properties")
      .delete()
      .eq("id", id)
      .eq("landowner_id", user.id)
      .in("status", ["draft", "rejected"]);
    if (error) throw new Error(`Could not delete listing: ${error.message}`);
  } else {
    const { data: listing, error: listingError } = await supabase
      .from("properties")
      .select("id, status, images, documents")
      .eq("id", id)
      .eq("landowner_id", user.id)
      .maybeSingle();
    if (listingError) throw new Error(`Could not load listing: ${listingError.message}`);
    if (!listing) redirect("/seller/listings?error=listing-not-found");

    let status: string;
    if (decision === "close" && listing.status === "approved") status = "closed";
    else if (decision === "reopen" && listing.status === "closed") status = "pending";
    else if (decision === "submit" && ["draft", "rejected"].includes(listing.status)) {
      const images = Array.isArray(listing.images) ? listing.images : [];
      const documents = Array.isArray(listing.documents) ? listing.documents : [];
      if (!images.length || !documents.length) redirect("/seller/listings?error=listing-documents-required");
      status = "pending";
    } else {
      redirect("/seller/listings?error=invalid-transition");
    }

    const { error } = await supabase
      .from("properties")
      .update({ status })
      .eq("id", id)
      .eq("landowner_id", user.id);
    if (error) throw new Error(`Could not update listing: ${error.message}`);
  }

  revalidatePath("/seller/listings");
  revalidatePath("/seller/dashboard");
  redirect("/seller/listings?updated=1");
}

export async function respondToViewingAction(formData: FormData): Promise<void> {
  const { supabase, user } = await requireRole(["seller"]);
  const id = text(formData, "id", 64);
  const status = text(formData, "status", 24);
  const sellerNotes = text(formData, "seller_notes", 500);
  if (!uuid(id) || !["confirmed", "declined", "counter-proposed"].includes(status)) {
    redirect("/seller/viewing-requests?error=invalid-response");
  }

  const patch: {
    status: string;
    seller_notes: string | null;
    proposed_date?: string;
    proposed_time?: string;
  } = { status, seller_notes: sellerNotes || null };
  if (status === "counter-proposed") {
    const proposedDate = text(formData, "proposed_date", 10);
    const proposedTime = text(formData, "proposed_time", 8);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(proposedDate) || !/^\d{2}:\d{2}$/.test(proposedTime)) {
      redirect("/seller/viewing-requests?error=counter-date-required");
    }
    patch.proposed_date = proposedDate;
    patch.proposed_time = proposedTime;
  }

  const { error } = await supabase
    .from("viewing_requests")
    .update(patch)
    .eq("id", id)
    .eq("seller_id", user.id);
  if (error) throw new Error(`Could not respond to viewing request: ${error.message}`);
  revalidatePath("/seller/viewing-requests");
  redirect("/seller/viewing-requests?updated=1");
}

export async function updatePaymentMethodsAction(formData: FormData): Promise<void> {
  const { supabase, user } = await requireRole(["seller"]);
  const gcashEnabled = formData.get("gcash_enabled") === "on";
  const mayaEnabled = formData.get("maya_enabled") === "on";
  const bankEnabled = formData.get("bank_enabled") === "on";
  const methods = {
    gcash: {
      enabled: gcashEnabled,
      number: text(formData, "gcash_number", 24),
      name: text(formData, "gcash_name", 120),
    },
    maya: {
      enabled: mayaEnabled,
      number: text(formData, "maya_number", 24),
      name: text(formData, "maya_name", 120),
    },
    bank: {
      enabled: bankEnabled,
      bankName: text(formData, "bank_name", 80),
      accountNumber: text(formData, "bank_account_number", 40),
      accountName: text(formData, "bank_account_name", 120),
    },
  };
  if (
    (gcashEnabled && (!methods.gcash.number || !methods.gcash.name)) ||
    (mayaEnabled && (!methods.maya.number || !methods.maya.name)) ||
    (bankEnabled && (!methods.bank.bankName || !methods.bank.accountNumber || !methods.bank.accountName))
  ) {
    redirect("/seller/settings?error=payment-details");
  }

  const { error } = await supabase.from("profiles").update({ payment_methods: methods }).eq("id", user.id);
  if (error) throw new Error(`Could not save payment methods: ${error.message}`);
  revalidatePath("/seller/settings");
  redirect("/seller/settings?updated=payment-methods");
}

export async function signSellerMoaAction(formData: FormData): Promise<void> {
  const { supabase, user } = await requireRole(["seller"]);
  if (formData.get("agree") !== "on") redirect("/seller/moa?error=agreement-required");

  const { data: signed, error } = await supabase
    .from("profiles")
    .update({ moa_signed_at: new Date().toISOString() })
    .eq("id", user.id)
    .is("moa_signed_at", null)
    .select("moa_signed_at")
    .maybeSingle();
  if (error) throw new Error(`Could not record seller agreement: ${error.message}`);
  if (!signed) redirect("/seller/moa?error=already-signed");

  revalidatePath("/seller/moa");
  redirect("/seller/moa?signed=1");
}

export async function markNotificationsReadAction(formData: FormData): Promise<void> {
  const me = await getMe();
  if (!me || !["buyer", "seller"].includes(me.profile.role)) redirect("/auth/login");

  const id = text(formData, "id", 64);
  let query = me.supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", me.user.id)
    .eq("read", false);
  if (id) {
    if (!uuid(id)) redirect(`/${me.profile.role}/notifications?error=invalid-notification`);
    query = query.eq("id", id);
  }
  const { error } = await query;
  if (error) throw new Error(`Could not mark notifications as read: ${error.message}`);
  revalidatePath(`/${me.profile.role}/notifications`);
  redirect(`/${me.profile.role}/notifications?updated=1`);
}
