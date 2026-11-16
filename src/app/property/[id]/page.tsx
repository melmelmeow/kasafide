import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SaveButton } from "@/components/SaveButton";
import { createViewingRequestAction } from "@/app/module-actions";
import { getMe } from "@/lib/auth";
import { peso } from "@/lib/format";
import { createClient } from "@/utils/supabase/server";

type Props = { params: { id: string }; searchParams: Record<string, string | string[] | undefined> };

function one<T>(relation: T | T[] | null | undefined): T | null {
  return Array.isArray(relation) ? relation[0] ?? null : relation ?? null;
}

function validId(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!validId(params.id)) return { title: "Property not found | Kasafide" };
  const supabase = createClient();
  const { data } = await supabase.from("properties").select("title").eq("id", params.id).eq("status", "approved").maybeSingle();
  return { title: data?.title ? `${data.title} | Kasafide` : "Property not found | Kasafide" };
}

export default async function PropertyPage({ params, searchParams }: Props) {
  if (!validId(params.id)) notFound();

  const supabase = createClient();
  const [{ data: property, error }, me] = await Promise.all([
    supabase.from("properties")
      .select("id, landowner_id, title, price, listing_type, property_type, address, description, images, thumbnail_url, bedrooms, bathrooms, floor_area_sqm, lot_area_sqm, amenities, latitude, longitude, price_negotiable, status, lifecycle_status, barangays(name)")
      .eq("id", params.id)
      .eq("status", "approved")
      .maybeSingle(),
    getMe(),
  ]);
  if (error) throw new Error(`Could not load property details: ${error.message}`);
  if (!property || property.lifecycle_status) notFound();

  const { data: seller, error: sellerError } = await supabase
    .from("public_profiles")
    .select("id, full_name, first_name, last_name, role, account_status")
    .eq("id", property.landowner_id)
    .maybeSingle();
  if (sellerError) throw new Error(`Could not load property owner: ${sellerError.message}`);

  let saved = false;
  if (me?.profile.role === "buyer") {
    const { data: savedRow, error: savedError } = await supabase
      .from("saved_properties")
      .select("property_id")
      .eq("user_id", me.user.id)
      .eq("property_id", property.id)
      .maybeSingle();
    if (savedError) throw new Error(`Could not load saved state: ${savedError.message}`);
    saved = Boolean(savedRow);
  }

  const images = Array.isArray(property.images)
    ? property.images.filter((image): image is string => typeof image === "string" && image.length > 0)
    : [];
  const image = property.thumbnail_url || images[0];
  const amenities = Array.isArray(property.amenities)
    ? property.amenities.filter((amenity): amenity is string => typeof amenity === "string" && amenity.length > 0)
    : [];
  const location = one(property.barangays)?.name || property.address || "Sta. Maria, Bulacan";
  const sellerName = seller?.full_name || [seller?.first_name, seller?.last_name].filter(Boolean).join(" ") || "Kasafide seller";
  const errorParam = typeof searchParams.error === "string" ? searchParams.error : "";
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());

  return (
    <>
      <link rel="stylesheet" href="/assets/css/buyer/buyer-listing.css" />
      <link rel="stylesheet" href="/assets/css/responsive.css" />
      <div className="layout">
        <div className="main">
          <nav className="property-nav">
            <Link href="/" className="property-nav-brand">Kasafide</Link>
            <div>
              <Link href="/browse">Browse Listings</Link>
              {me ? <Link href={`/${me.profile.role}`}>My Dashboard</Link> : <Link href="/auth/login">Sign In</Link>}
            </div>
          </nav>
          <div className="content">
            <main className="property-detail-page">
              <Link className="back-link" href="/browse">‹ <span>Back to Listings</span></Link>
              <div className="detail-wrap">
          <div className="detail-img-wrap">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt={property.title} />
            ) : <div className="detail-image-empty" />}
            <span className={`badge-tl ${property.listing_type === "rent" ? "badge-rent" : "badge-sale"}`}>
              {property.listing_type === "rent" ? "For Rent" : "For Sale"}
            </span>
            <span className="badge-avail">Available</span>
          </div>
          {images.length > 1 && (
            <div className="thumb-strip">
              {images.map((src, index) => (
                <a key={`${src}-${index}`} className={`thumb-item ${index === 0 ? "active" : ""}`} href={src} target="_blank" rel="noreferrer" aria-label={`Open property photo ${index + 1}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" loading="lazy" />
                </a>
              ))}
            </div>
          )}

          <div className="detail-body">
            {typeof searchParams.viewing === "string" && searchParams.viewing === "1" && <p className="alert alert-success">Your viewing request has been sent to the seller.</p>}
            {errorParam && <p className="alert alert-error" role="alert">
              {errorParam === "viewing-fields" ? "Choose a valid date and time for your viewing request."
                : errorParam === "viewing-date-past" ? "Choose a future date and time."
                  : errorParam === "own-listing" ? "You cannot request a viewing for your own listing."
                    : errorParam === "verification-required" ? "Verify your identity before requesting a viewing."
                      : "The request could not be completed."}
            </p>}
            <div className="detail-title-row">
              <h1 className="detail-title">{property.title}</h1>
              <div className="detail-price-block">
                <div className="detail-price">{peso(property.price)}</div>
                {property.listing_type === "rent" && <span className="detail-price-per">/month</span>}
                {property.price_negotiable && <span className="price-negotiable">Price negotiable</span>}
              </div>
            </div>
            <div className="detail-location">
              <span>{location}</span>
              {property.latitude !== null && property.longitude !== null && (
                <a className="map-link" href={`https://www.google.com/maps?q=${property.latitude},${property.longitude}`} target="_blank" rel="noreferrer">View on Map</a>
              )}
            </div>
            <div className="detail-specs">
              {property.bedrooms !== null && <span className="spec-item">{property.bedrooms === 0 ? "Studio" : `${property.bedrooms} bedroom${property.bedrooms === 1 ? "" : "s"}`}</span>}
              {property.bathrooms !== null && <span className="spec-item">{property.bathrooms} bathroom{property.bathrooms === 1 ? "" : "s"}</span>}
              {property.floor_area_sqm && <span className="spec-item">{property.floor_area_sqm} sqm floor area</span>}
              {property.lot_area_sqm && <span className="spec-item">{property.lot_area_sqm} sqm lot area</span>}
            </div>
            <h2 className="detail-section-title">Description</h2>
            <p className="detail-desc">{property.description || "The seller has not added a description."}</p>
            {amenities.length > 0 && <div className="amenities-wrap">{amenities.map((amenity) => <span className="amenity-tag" key={amenity}>{amenity}</span>)}</div>}

            <section className="seller-card">
              <div>
                <div className="seller-label">Listed by</div>
                <div className="seller-name">
                  {sellerName}
                  {seller?.account_status === "verified" && <span className="verified-sm">Verified</span>}
                </div>
              </div>
              {(!me || me.profile.role === "buyer") && seller?.id !== me?.user.id && (
                <div className="seller-actions">
                  {me?.profile.role === "buyer" ? (
                    <>
                      <SaveButton propertyId={property.id} initiallySaved={saved} className={saved ? "saved" : ""} />
                      <Link className="msg-btn" href={`/buyer/messages?with=${seller?.id}&property=${property.id}`}>Message Seller</Link>
                    </>
                  ) : <Link className="msg-btn" href={`/auth/login?next=${encodeURIComponent(`/property/${property.id}`)}`}>Sign in to contact</Link>}
                </div>
              )}
            </section>

            {me?.profile.role === "buyer" && seller?.id !== me.user.id && (
              <form action={createViewingRequestAction} className="section-card viewing-request-form">
                <h2 className="detail-section-title">Schedule a Property Viewing</h2>
                <input type="hidden" name="property_id" value={property.id} />
                <div className="viewing-fields">
                  <label className="modal-label">Date<input className="modal-input" type="date" name="requested_date" min={today} required /></label>
                  <label className="modal-label">Time
                    <select className="modal-select" name="requested_time" required defaultValue="">
                      <option value="" disabled>Choose a time</option>
                      {["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"].map((time) => <option value={time} key={time}>{time}</option>)}
                    </select>
                  </label>
                </div>
                <label className="modal-label">Note (optional)<textarea className="modal-textarea" name="buyer_notes" rows={3} maxLength={500} /></label>
                <button className="schedule-btn" type="submit">Request Viewing</button>
              </form>
            )}
              </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </>
  );
}
