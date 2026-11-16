import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { CardProperty } from "@/components/PropertyCard";
import { peso } from "@/lib/format";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Kasafide | Verified homes in Sta. Maria",
  description:
    "Find reviewed homes for sale and rent across Sta. Maria, Bulacan.",
  openGraph: {
    title: "Kasafide",
    description: "Verified homes in Sta. Maria, Bulacan.",
    type: "website",
    images: [{ url: "/assets/img/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kasafide",
    description: "Verified homes in Sta. Maria, Bulacan.",
    images: ["/assets/img/og-image.png"],
  },
};

export const dynamic = "force-dynamic";

type LocationRow = {
  barangays: { name: string } | { name: string }[] | null;
};

type LandingProperty = CardProperty & {
  bedrooms: number | null;
  bathrooms: number | null;
  floor_area_sqm: number | null;
};

function getBarangayName(row: LocationRow): string | null {
  const barangay = Array.isArray(row.barangays) ? row.barangays[0] : row.barangays;
  return barangay?.name ?? null;
}

async function getLiveListingCounts(supabase: ReturnType<typeof createClient>) {
  const counts: Record<string, number> = {};
  const pageSize = 1000;
  let total = 0;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("properties")
      .select("id, barangays(name)")
      .eq("status", "approved")
      .or("lifecycle_status.is.null,lifecycle_status.not.in.(sold,rented)")
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) throw new Error(`Could not load live listing counts: ${error.message}`);

    const rows = (data ?? []) as LocationRow[];
    total += rows.length;
    for (const row of rows) {
      const name = getBarangayName(row);
      if (name) counts[name] = (counts[name] ?? 0) + 1;
    }

    if (rows.length < pageSize) break;
    offset += pageSize;
  }

  return { counts, total };
}

export default async function HomePage() {
  const supabase = createClient();
  const [featuredResult, sellersResult, barangaysResult, listingStats] = await Promise.all([
    supabase
      .from("properties")
      .select("id, title, price, listing_type, images, thumbnail_url, address, bedrooms, bathrooms, floor_area_sqm, barangays(name)")
      .eq("status", "approved")
      .or("lifecycle_status.is.null,lifecycle_status.not.in.(sold,rented)")
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("public_profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "seller")
      .eq("account_status", "verified"),
    supabase.from("barangays").select("id, name").order("name"),
    getLiveListingCounts(supabase),
  ]);

  if (featuredResult.error) {
    throw new Error(`Could not load featured listings: ${featuredResult.error.message}`);
  }
  if (sellersResult.error) {
    throw new Error(`Could not load verified seller count: ${sellersResult.error.message}`);
  }
  if (barangaysResult.error) {
    throw new Error(`Could not load barangays: ${barangaysResult.error.message}`);
  }

  const featuredListings = (featuredResult.data ?? []) as unknown as LandingProperty[];
  const barangays = barangaysResult.data ?? [];
  const verifiedSellers = sellersResult.count ?? 0;

  return (
    <>
      <link rel="stylesheet" href="/assets/css/index.css" />
      <link rel="stylesheet" href="/assets/css/responsive.css" />
      <link rel="stylesheet" href="/assets/css/glass-nav.css" />
      <nav className="nav-photo">
        <Link href="/" className="nav-logo">
          <Image src="/assets/img/kasafide-favicon.svg" alt="" width={32} height={32} />
          <span className="nav-logo-divider" />
          <span>Kasafide</span>
        </Link>
        <div className="nav-links">
          <Link href="#featured">Featured</Link>
          <Link href="#barangays">Barangays</Link>
          <Link href="#trust">Our Promise</Link>
        </div>
        <div className="nav-btns">
          <Link className="btn-outline" href="/auth/login">Sign In</Link>
          <Link className="btn-solid" href="/auth/signup">Sign Up</Link>
        </div>
      </nav>

      <main>
        <section className="hero hero-photo">
          <div className="hero-bg" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="hero-bg-img is-active" src={featuredListings[0]?.thumbnail_url || featuredListings[0]?.images?.[0] || "/assets/img/house_image.jpg"} alt="" />
          </div>
          <div className="hero-shade" aria-hidden="true" />
          <div className="hero-watermark" aria-hidden="true">KASAFIDE</div>
          <div className="hero-left">
            <p className="hero-badge"><span className="hero-badge-dot" /> Sta. Maria, Bulacan</p>
            <h1 className="hero-title">
              Buy. Sell. Rent.<br />All in one place.
              <span className="hero-title-accent">Verified, every time.</span>
            </h1>
            <p className="hero-desc">Kasafide connects buyers with verified property owners across Sta. Maria, Bulacan. No hidden listings. No unverified sellers.</p>
            <div className="hero-trust">
              <span className="hero-trust-item"><span className="hero-trust-icon">✓</span>Every seller ID-checked, every listing reviewed</span>
            </div>
            <div className="hero-ctas">
              <Link href="/browse" className="hero-btn-primary hero-btn-browse"><span>Browse Listings</span><span className="hero-btn-arrow">→</span></Link>
              <Link href="/auth/signup?role=seller" className="hero-btn-secondary hero-btn-list"><span>List Your Property</span></Link>
            </div>
          </div>
          <aside className="hero-side">
            {featuredListings[0] && <Link href={`/property/${featuredListings[0].id}`} className="hero-feature">
              <span className="hf-thumb-btn">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="hf-thumb" src={featuredListings[0].thumbnail_url || featuredListings[0].images?.[0] || "/assets/img/house_image.jpg"} alt="" />
              </span>
              <span className="hf-panel">
                <span className="hf-text">
                  <span className="hf-kicker">{featuredListings[0].listing_type === "rent" ? "For Rent" : "For Sale"} · {getBarangayName(featuredListings[0]) || "Sta. Maria"}</span>
                  <span className="hf-title"><span>{featuredListings[0].title}</span></span>
                  <span className="hf-price">{`₱${Number(featuredListings[0].price).toLocaleString("en-PH")}`}</span>
                </span>
              </span>
            </Link>}
            <div className="hero-brgy">
              <div className="hero-brgy-head">Browse by category</div>
              <div className="hero-brgy-chips">
                {[["house", "Houses"], ["apartment", "Apartments"], ["condo", "Condos"], ["lot", "Lots"]].map(([type, label]) => (
                  <Link key={type} className="hero-brgy-chip" href={`/browse?type=${type}`}>{label}</Link>
                ))}
              </div>
            </div>
          </aside>
        </section>

        <section id="featured" className="section-alt">
          <span className="section-label">Featured Properties</span>
          <h2 className="section-title">Curated Listings Near You</h2>
          <p className="section-sub">Browse properties reviewed and approved for Kasafide.</p>
          {featuredListings.length === 0 ? <p className="section-sub">There are no available listings yet. Check back soon.</p> : (
            <div className="fp-stage">
              <div className="fp-track">
                {featuredListings.map((property) => {
                  const image = property.thumbnail_url || property.images?.[0];
                  const barangay = getBarangayName(property);
                  return (
                    <Link key={property.id} href={`/property/${property.id}`} className="fp-card">
                      <div className="fp-media">
                        {image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img className="fp-img" src={image} alt={property.title} loading="lazy" />
                        )}
                        <span className={`fp-badge fp-badge-${property.listing_type}`}>{property.listing_type === "rent" ? "For Rent" : "For Sale"}</span>
                      </div>
                      <div className="fp-body">
                        <div className="fp-price">{peso(property.price)}{property.listing_type === "rent" && <span>/month</span>}</div>
                        <h3 className="fp-title">{property.title}</h3>
                        <div className="fp-loc"><span>⌖</span><span>{barangay || property.address || "Sta. Maria, Bulacan"}</span></div>
                        <div className="fp-foot">
                          <div className="fp-specs">
                            {property.bedrooms ? <span className="fp-spec">{property.bedrooms} bed</span> : null}
                            {property.bathrooms ? <span className="fp-spec">{property.bathrooms} bath</span> : null}
                            {property.floor_area_sqm ? <span className="fp-spec">{property.floor_area_sqm} sqm</span> : null}
                          </div>
                          <span className="fp-cta">View details →</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
          <Link href="/browse" className="fp-all">View all listings →</Link>
        </section>

        <section id="barangays" className="section">
          <span className="section-label">Explore the Area</span>
          <h2 className="section-title">Live listings by barangay</h2>
          <p className="section-sub">See approved properties available in Sta. Maria communities.</p>
          <div className="categories-grid">
            {barangays.map((barangay) => (
              <Link key={barangay.id} href={`/browse?barangay=${encodeURIComponent(barangay.name)}`} className="cat-card">
                <span className="cat-shade" />
                <span className="cat-text"><span className="cat-name">{barangay.name}</span><span className="cat-count">{listingStats.counts[barangay.name] ?? 0} listings</span></span>
              </Link>
            ))}
          </div>
        </section>

        <section id="trust" className="section-alt">
          <div className="stats-inner">
            <span className="section-label">Kasafide at a glance</span>
            <h2 className="section-title">A better way to find a home</h2>
            <div className="stats-grid">
              <StatCard label="Available listings" value={listingStats.total} />
              <StatCard label="Verified sellers" value={verifiedSellers} />
              <StatCard label="Barangays covered" value={barangays.length} />
              <StatCard label="Reviewed listings" value={listingStats.total} />
            </div>
          </div>
        </section>
        <section className="cta-section">
          <div className="cta-inner">
            <h2 className="cta-title">Ready to find your next home?</h2>
            <p className="cta-sub">Explore verified listings or join Kasafide as a property owner.</p>
            <div className="cta-btns">
              <Link href="/browse" className="cta-btn-white">Browse Listings</Link>
              <Link href="/auth/signup?role=seller" className="cta-btn-ghost">List a Property</Link>
            </div>
          </div>
        </section>
      </main>
      <footer className="footer">
        <div className="footer-grid">
          <div><Link href="/" className="footer-logo">Kasafide</Link><p className="footer-tagline">Verified homes in Sta. Maria, Bulacan.</p></div>
          <div><h3 className="footer-col-title">Explore</h3><Link className="footer-link" href="/browse">Browse Listings</Link><Link className="footer-link" href="/about">About Us</Link></div>
          <div><h3 className="footer-col-title">Support</h3><Link className="footer-link" href="/help">Help Center</Link><Link className="footer-link" href="/privacy-policy">Privacy Policy</Link><Link className="footer-link" href="/terms">Terms of Service</Link></div>
        </div>
        <div className="footer-divider" />
        <p className="footer-copy">© 2026 Kasafide · Sta. Maria, Bulacan</p>
      </footer>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-box">
      <p className="stat-value">{value.toLocaleString("en-PH")}</p>
      <p className="stat-label">{label}</p>
    </div>
  );
}
