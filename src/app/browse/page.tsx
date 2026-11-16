import type { Metadata } from "next";
import Link from "next/link";
import type { CardProperty } from "@/components/PropertyCard";
import { first } from "@/lib/format";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Browse homes | Kasafide",
  description: "Search approved homes for sale and rent across Sta. Maria, Bulacan.",
  openGraph: {
    title: "Browse Listings | Kasafide",
    description: "Search reviewed homes for sale and rent across Sta. Maria, Bulacan.",
    type: "website",
    images: [{ url: "/assets/img/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Browse Listings | Kasafide",
    description: "Search reviewed homes for sale and rent across Sta. Maria, Bulacan.",
    images: ["/assets/img/og-image.png"],
  },
};

export const dynamic = "force-dynamic";

const PROPERTY_TYPES = [
  ["house", "House"],
  ["apartment", "Apartment"],
  ["condo", "Condo"],
  ["commercial", "Commercial"],
  ["lot", "Lot only"],
] as const;

type SearchParams = Record<string, string | string[] | undefined>;
type BrowseProperty = CardProperty & {
  bedrooms: number | null;
  bathrooms: number | null;
  floor_area_sqm: number | null;
  lot_area_sqm: number | null;
};

function parsePrice(value: string): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = createClient();
  const rawType = first(searchParams.type).toLowerCase();
  const rawFor = first(searchParams.for).toLowerCase();
  const rawBarangay = first(searchParams.barangay).trim();
  const rawSearch = first(searchParams.q).trim();
  const rawMinPrice = first(searchParams.minPrice).trim();
  const rawMaxPrice = first(searchParams.maxPrice).trim();

  const selectedType = PROPERTY_TYPES.some(([value]) => value === rawType) ? rawType : "";
  const selectedFor = rawFor === "sale" || rawFor === "rent" ? rawFor : "";
  const minPrice = parsePrice(rawMinPrice);
  const maxPrice = parsePrice(rawMaxPrice);
  const searchTerm = rawSearch.replace(/[^a-zA-Z0-9\s-]/g, "").trim().slice(0, 100);
  const filterErrors: string[] = [];

  if (rawType && !selectedType) filterErrors.push("Choose a valid property type.");
  if (rawFor && !selectedFor) filterErrors.push("Choose sale or rent.");
  if (rawMinPrice && minPrice === undefined) filterErrors.push("Minimum price must be a non-negative number.");
  if (rawMaxPrice && maxPrice === undefined) filterErrors.push("Maximum price must be a non-negative number.");
  if (rawSearch && !searchTerm) filterErrors.push("Search using letters, numbers, spaces, or hyphens.");
  if (rawSearch && searchTerm && rawSearch !== searchTerm) {
    filterErrors.push("Some unsupported characters were removed from the search.");
  }
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    filterErrors.push("Minimum price cannot be greater than maximum price.");
  }

  const { data: barangayRows, error: barangayError } = await supabase
    .from("barangays")
    .select("id, name")
    .order("name");
  if (barangayError) throw new Error(`Could not load barangays: ${barangayError.message}`);

  const barangays = barangayRows ?? [];
  const selectedBarangay = barangays.find(
    (barangay) => barangay.name.toLowerCase() === rawBarangay.toLowerCase(),
  );
  const unknownBarangay = Boolean(rawBarangay && !selectedBarangay);

  let count = 0;
  let listings: BrowseProperty[] = [];

  if (!unknownBarangay && !(minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice)) {
    const locationJoin = selectedBarangay ? "barangays!inner(name)" : "barangays(name)";
    let query = supabase
      .from("properties")
      .select(
        `id, title, price, listing_type, property_type, images, thumbnail_url, address, bedrooms, bathrooms, floor_area_sqm, lot_area_sqm, ${locationJoin}`,
        { count: "exact" },
      )
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (selectedType) query = query.eq("property_type", selectedType);
    if (selectedFor) query = query.eq("listing_type", selectedFor);
    if (selectedBarangay) query = query.eq("barangays.name", selectedBarangay.name);
    if (minPrice !== undefined) query = query.gte("price", minPrice);
    if (maxPrice !== undefined) query = query.lte("price", maxPrice);
    const liveListingsFilter = "or(lifecycle_status.is.null,lifecycle_status.not.in.(sold,rented))";
    const searchFilter = searchTerm
      ? `,or(title.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%)`
      : "";
    query = query.or(
      searchTerm
        ? `and(${liveListingsFilter}${searchFilter})`
        : "lifecycle_status.is.null,lifecycle_status.not.in.(sold,rented)",
    );

    const { data, error, count: resultCount } = await query.range(0, 47);
    if (error) throw new Error(`Could not load listings: ${error.message}`);
    listings = (data ?? []) as unknown as BrowseProperty[];
    count = resultCount ?? 0;
  }

  return (
    <>
      <link rel="stylesheet" href="/assets/css/browse.css" />
      <link rel="stylesheet" href="/assets/css/responsive.css" />
      <nav className="browse-nav">
        <div className="browse-nav-content">
          <Link href="/" className="nav-logo"><span className="nav-logo-text">Kasafide</span></Link>
          <div className="nav-actions">
            <Link href="/" className="btn-signin">Home</Link>
            <Link href="/auth/login" className="btn-signin">Sign In</Link>
            <Link href="/auth/signup" className="btn-signup">Get Started</Link>
          </div>
        </div>
      </nav>
      <main className="browse-container">
        <header className="browse-header">
          <h1 className="browse-title">Browse Properties</h1>
          <p className="browse-subtitle">Find your perfect home in Sta. Maria, Bulacan</p>
        </header>

        <form method="get" action="/browse" className="browse-filters">
          <div className="filter-row">
            <select className="filter-select" name="type" aria-label="Property type" defaultValue={selectedType}>
              <option value="">All Types</option>
              {PROPERTY_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select className="filter-select" name="for" aria-label="Listing type" defaultValue={selectedFor}>
              <option value="">For Sale &amp; Rent</option>
              <option value="rent">For Rent</option>
              <option value="sale">For Sale</option>
            </select>
            <select className="filter-select" name="barangay" aria-label="Barangay" defaultValue={selectedBarangay?.name ?? rawBarangay}>
              <option value="">All Barangays</option>
              {unknownBarangay && <option value={rawBarangay}>{rawBarangay}</option>}
              {barangays.map((barangay) => <option key={barangay.id} value={barangay.name}>{barangay.name}</option>)}
            </select>
            <input name="q" type="search" className="filter-search" aria-label="Search by title or address"
              defaultValue={searchTerm || rawSearch} maxLength={100} placeholder="Search by title or address..." />
            <input name="minPrice" type="number" min="0" step="any" className="filter-select" aria-label="Minimum price"
              placeholder="Minimum price" defaultValue={rawMinPrice} />
            <input name="maxPrice" type="number" min="0" step="any" className="filter-select" aria-label="Maximum price"
              placeholder="Maximum price" defaultValue={rawMaxPrice} />
            <button type="submit" className="btn-signup">Apply Filters</button>
            <Link href="/browse" className="btn-signin">Clear</Link>
          </div>
        </form>

        {filterErrors.map((message) => <p key={message} className="browse-filter-error" role="alert">{message}</p>)}
        {unknownBarangay && <p className="browse-filter-error">No barangay named “{rawBarangay}” was found.</p>}
        <div className="browse-results-header">
          <span className="results-count">
            {count.toLocaleString("en-PH")} propert{count === 1 ? "y" : "ies"} found
            {count > listings.length ? ` · Showing the first ${listings.length}` : ""}
          </span>
        </div>
        {listings.length === 0 ? (
          <div className="browse-empty">
            <div className="empty-title">No listings found</div>
            <div className="empty-text">Try adjusting your filters.</div>
          </div>
        ) : (
          <div className="browse-grid">
            {listings.map((property) => {
              const image = property.thumbnail_url || property.images?.[0];
              const barangay = Array.isArray(property.barangays) ? property.barangays[0] : property.barangays;
              return (
                <Link key={property.id} href={`/property/${property.id}`} className="listing-card">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image} alt={property.title} className="listing-image" loading="lazy" />
                  ) : <div className="listing-image listing-image-empty" aria-hidden="true" />}
                  <div className="listing-content">
                    <div className="listing-header"><span className={`listing-type ${property.listing_type}`}>{property.listing_type === "rent" ? "For Rent" : "For Sale"}</span></div>
                    <div className="listing-title">{property.title}</div>
                    <div className="listing-address">{property.address || barangay?.name || "Sta. Maria, Bulacan"}</div>
                    <div className="listing-price">{`₱${Number(property.price).toLocaleString("en-PH")}`}{property.listing_type === "rent" ? " / month" : ""}</div>
                    <div className="listing-details">
                      {property.bedrooms !== null && property.bedrooms !== undefined && <span className="listing-detail">{property.bedrooms === 0 ? "Studio" : `${property.bedrooms} bed`}</span>}
                      {property.bathrooms !== null && property.bathrooms !== undefined && <span className="listing-detail">{property.bathrooms} bath</span>}
                      {(property.floor_area_sqm || property.lot_area_sqm) && <span className="listing-detail">{property.floor_area_sqm || property.lot_area_sqm} m²</span>}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
      <footer className="browse-footer">
        <div className="footer-content">
          <p>© 2026 Kasafide. All rights reserved.</p>
          <div className="footer-links">
            <Link href="/privacy-policy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
            <Link href="/about">About Us</Link>
          </div>
        </div>
      </footer>
    </>
  );
}
