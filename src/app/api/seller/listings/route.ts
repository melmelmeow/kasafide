import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_PHOTOS = 10;
const MAX_DOCUMENTS = 8;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const DOCUMENT_TYPES = new Set([...IMAGE_TYPES, "application/pdf"]);

function failure(request: NextRequest, code: string) {
  return NextResponse.redirect(new URL(`/seller/post?error=${encodeURIComponent(code)}`, request.url), 303);
}

function parseOptionalNumber(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : Number.NaN;
}

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-80) || "upload";
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/auth/login?next=%2Fseller%2Fpost", request.url), 303);

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, account_status")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) {
    console.error("[seller/listings] Could not load account:", profileError.message);
    return failure(request, "account-check-failed");
  }
  if (profile?.role !== "seller") return NextResponse.redirect(new URL("/seller", request.url), 303);
  if (profile.account_status !== "verified") return NextResponse.redirect(new URL("/seller/verification", request.url), 303);

  const form = await request.formData();
  const intent = form.get("intent") === "submit" ? "submit" : "draft";
  const title = String(form.get("title") ?? "").trim();
  const listingType = String(form.get("listing_type") ?? "");
  const propertyType = String(form.get("property_type") ?? "");
  const address = String(form.get("address") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const negotiable = form.get("price_negotiable") === "on";
  const hasMultipleUnits = form.get("has_multiple_units") === "on";
  const price = parseOptionalNumber(form.get("price"));
  const barangayId = Number(form.get("barangay_id"));
  const floorArea = parseOptionalNumber(form.get("floor_area_sqm"));
  const lotArea = parseOptionalNumber(form.get("lot_area_sqm"));
  const bedrooms = parseOptionalNumber(form.get("bedrooms"));
  const bathrooms = parseOptionalNumber(form.get("bathrooms"));
  const totalUnits = parseOptionalNumber(form.get("total_units"));
  const availableUnits = parseOptionalNumber(form.get("available_units"));
  const photos = form.getAll("photos").filter((file): file is File => file instanceof File && file.size > 0);
  const documents = form.getAll("documents").filter((file): file is File => file instanceof File && file.size > 0);

  if (!title || title.length > 180 || !address || address.length > 240) return failure(request, "required-fields");
  if (!["sale", "rent"].includes(listingType) || !["house", "apartment", "condo", "commercial", "lot"].includes(propertyType)) {
    return failure(request, "invalid-listing-type");
  }
  if (price === null || Number.isNaN(price) || price <= 0 || !Number.isInteger(barangayId)) return failure(request, "invalid-price-or-location");
  if ([floorArea, lotArea, bedrooms, bathrooms].some((value) => Number.isNaN(value))) return failure(request, "invalid-measurement");
  if (
    (bedrooms !== null && (!Number.isInteger(bedrooms) || bedrooms > 30)) ||
    (bathrooms !== null && (!Number.isInteger(bathrooms) || bathrooms > 30))
  ) return failure(request, "invalid-measurement");
  if (hasMultipleUnits && (
    totalUnits === null || availableUnits === null ||
    !Number.isInteger(totalUnits) || !Number.isInteger(availableUnits) ||
    totalUnits < 2 || totalUnits > 1000 || availableUnits < 0 || availableUnits > totalUnits
  )) return failure(request, "invalid-units");
  if (photos.length > MAX_PHOTOS || documents.length > MAX_DOCUMENTS) return failure(request, "too-many-files");
  if (intent === "submit" && (!photos.length || !documents.length)) return failure(request, "listing-files-required");

  const { data: barangay, error: barangayError } = await supabase
    .from("barangays")
    .select("id, name")
    .eq("id", barangayId)
    .maybeSingle();
  if (barangayError) {
    console.error("[seller/listings] Could not verify barangay:", barangayError.message);
    return failure(request, "barangay-check-failed");
  }
  if (!barangay) return failure(request, "invalid-price-or-location");

  for (const file of photos) {
    if (!IMAGE_TYPES.has(file.type) || file.size > MAX_FILE_SIZE) return failure(request, "invalid-photo");
  }
  for (const file of documents) {
    if (!DOCUMENT_TYPES.has(file.type) || file.size > MAX_FILE_SIZE) return failure(request, "invalid-document");
  }

  const { data: listing, error: insertError } = await supabase
    .from("properties")
    .insert({
      landowner_id: user.id,
      title,
      listing_type: listingType,
      property_type: propertyType,
      price,
      price_negotiable: negotiable,
      barangay_id: barangayId,
      city: "Santa Maria",
      province: "Bulacan",
      address,
      description: description || null,
      floor_area_sqm: floorArea,
      lot_area_sqm: lotArea,
      bedrooms,
      bathrooms,
      has_multiple_units: hasMultipleUnits,
      total_units: hasMultipleUnits ? totalUnits : null,
      available_units: hasMultipleUnits ? availableUnits : null,
      status: "draft",
      images: [],
      documents: [],
    })
    .select("id")
    .single();
  if (insertError || !listing) {
    if (insertError) console.error("[seller/listings] Could not create draft:", insertError.message);
    return failure(request, "draft-save-failed");
  }

  const uploaded: { bucket: string; path: string }[] = [];
  try {
    const imageUrls: string[] = [];
    for (const file of photos) {
      const path = `${user.id}/${Date.now()}-${randomUUID()}-${safeFileName(file.name)}`;
      const { error } = await supabase.storage.from("listing-images").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (error) throw new Error(error.message);
      uploaded.push({ bucket: "listing-images", path });
      imageUrls.push(supabase.storage.from("listing-images").getPublicUrl(path).data.publicUrl);
    }

    const documentRows: { label: string; path: string }[] = [];
    for (const file of documents) {
      const path = `${user.id}/${Date.now()}-${randomUUID()}-${safeFileName(file.name)}`;
      const { error } = await supabase.storage.from("verification-docs").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (error) throw new Error(error.message);
      uploaded.push({ bucket: "verification-docs", path });
      documentRows.push({ label: file.name, path });
    }

    const update: {
      images: string[];
      thumbnail_url: string | null;
      documents: { label: string; path: string }[];
      status: string;
    } = {
      images: imageUrls,
      thumbnail_url: imageUrls[0] ?? null,
      documents: documentRows,
      status: intent === "submit" ? "pending" : "draft",
    };
    const { error: updateError } = await supabase
      .from("properties")
      .update(update)
      .eq("id", listing.id)
      .eq("landowner_id", user.id);
    if (updateError) throw new Error(updateError.message);
  } catch (error) {
    const cleanupResults = await Promise.all(
      uploaded.map(({ bucket, path }) => supabase.storage.from(bucket).remove([path])),
    );
    for (const result of cleanupResults) {
      if (result.error) {
        console.error("[seller/listings] Could not clean up failed upload:", result.error.message);
      }
    }
    console.error("[seller/listings] Upload or listing update failed:", error);
    return failure(request, "listing-upload-failed");
  }

  return NextResponse.redirect(
    new URL(`/seller/listings?created=${intent === "submit" ? "pending" : "draft"}`, request.url),
    303,
  );
}
