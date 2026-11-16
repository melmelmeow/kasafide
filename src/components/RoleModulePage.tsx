import Link from "next/link";
import { redirect } from "next/navigation";
import type { AppRole } from "@/lib/auth";
import { requireRole } from "@/lib/auth";
import { peso, shortDate } from "@/lib/format";
import {
  changePasswordAction,
  markNotificationsReadAction,
  respondToViewingAction,
  sendMessageAction,
  signSellerMoaAction,
  updateListingStatusAction,
  updatePaymentMethodsAction,
  updateProfileAction,
} from "@/app/module-actions";

type ModuleRole = "buyer" | "seller";
type Params = Record<string, string | string[] | undefined>;

const STYLES: Record<string, string[]> = {
  "buyer:saved": ["/assets/css/buyer/buyer-saved.css"],
  "buyer:payments": ["/assets/css/buyer/buyer-payments.css", "/assets/css/payment-modal.css"],
  "buyer:profile": ["/assets/css/buyer/buyer-profile.css", "/assets/css/phone-input.css"],
  "buyer:verification": ["/assets/css/seller/seller-verification.css", "/assets/css/camera-capture.css"],
  "buyer:messages": ["/assets/css/buyer/buyer-messages.css", "/assets/css/payment-modal.css"],
  "buyer:reviews": ["/assets/css/skeleton.css"],
  "buyer:settings": ["/assets/css/buyer/buyer-settings.css"],
  "buyer:notifications": ["/assets/css/notifications.css"],
  "buyer:help": ["/assets/css/buyer/buyer.css"],
  "seller:listings": ["/assets/css/seller/seller-listings.css", "/assets/css/close-listing-modal.css"],
  "seller:post": ["/assets/css/seller/seller-post.css", "/assets/css/camera-capture.css"],
  "seller:payments": ["/assets/css/seller/seller-payments.css"],
  "seller:messages": ["/assets/css/buyer/buyer-messages.css", "/assets/css/seller/seller-messages.css"],
  "seller:tenants": ["/assets/css/seller/seller-tenants.css"],
  "seller:verification": ["/assets/css/seller/seller-verification.css", "/assets/css/camera-capture.css"],
  "seller:viewing-requests": ["/assets/css/seller/viewing-requests.css"],
  "seller:profile": ["/assets/css/seller/seller-profile.css", "/assets/css/phone-input.css"],
  "seller:settings": ["/assets/css/seller/seller-settings.css"],
  "seller:notifications": ["/assets/css/notifications.css"],
  "seller:reviews": ["/assets/css/skeleton.css"],
  "seller:help": ["/assets/css/seller/seller.css"],
  "seller:moa": ["/assets/css/seller/seller-moa.css"],
};

const TITLES: Record<string, [string, string]> = {
  "buyer:profile": ["My Profile", "Manage your personal information and account details"],
  "seller:profile": ["My Profile", "Manage your seller profile and published properties"],
  "buyer:verification": ["Identity Verification", "Verify your identity to message sellers and save listings"],
  "seller:verification": ["Identity Verification", "Verify your identity to publish listings and build trust"],
  "buyer:settings": ["Account Settings", "Manage your account security and payment preferences"],
  "seller:settings": ["Account Settings", "Manage your account security and payment methods"],
  "buyer:reviews": ["Reviews & Feedback", "See your ratings and feedback on Kasafide"],
  "seller:reviews": ["Reviews & Feedback", "See what buyers say about your listings"],
  "buyer:notifications": ["Notifications", "Updates about your activity on Kasafide"],
  "seller:notifications": ["Notifications", "Updates about your listings and buyers"],
  "buyer:help": ["Help Center", "Get help with using Kasafide"],
  "seller:help": ["Help Center", "Get help managing your listings and buyers"],
  "seller:moa": ["Memorandum of Agreement", "Review and acknowledge the seller agreement"],
  "seller:post": ["Post a Property", "Fill in your property details to save a draft or submit it for review"],
  "seller:listings": ["My Listings", "Manage and track your property listings"],
  "seller:viewing-requests": ["Viewing Requests", "Manage property viewing appointments from buyers"],
  "seller:tenants": ["My Tenants", "People who have made a confirmed payment or deposit"],
  "seller:payments": ["Payment Management", "Manage rent collections and security deposits"],
  "buyer:payments": ["My Payments", "Track payments and view your transaction history"],
  "buyer:saved": ["Saved Listings", "Properties you have saved"],
  "buyer:messages": ["Messages", "Conversations with buyers and sellers"],
  "seller:messages": ["Messages", "Conversations with buyers and sellers"],
};

function one<T>(relation: T | T[] | null | undefined): T | null {
  return Array.isArray(relation) ? relation[0] ?? null : relation ?? null;
}

function uuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

const MOA_SECTIONS = [
  {
    title: "Recitals",
    paragraphs: [
      'This Memorandum of Agreement ("MOA") is entered into by and between Kasafide Online Property Marketplace ("Kasafide" or "the Platform") and the undersigned registered seller ("the Seller") on the date of electronic acceptance below.',
      "Kasafide is an online real estate marketplace that connects property sellers and landlords with prospective buyers and tenants within the Municipality of Sta. Maria, Bulacan. The Seller wishes to list one or more properties on Kasafide and agrees to the following terms and conditions.",
    ],
  },
  {
    title: "Article I — Purpose",
    paragraphs: [
      "The purpose of this MOA is to establish the rights, obligations, and responsibilities of Kasafide and the Seller with respect to the posting, management, and promotion of property listings on the Kasafide platform. This agreement promotes transparency, accountability, and a safe marketplace for all parties.",
    ],
  },
  {
    title: "Article II — Obligations of the Seller",
    items: [
      "The Seller shall provide accurate, truthful, and complete information for all property listings, including but not limited to the property address, type, price, photos, and availability.",
      "The Seller shall not post duplicate listings, fictitious properties, or listings that the Seller does not have the authority to sell or rent.",
      "The Seller shall ensure that all property photos submitted are genuine and accurately represent the property being listed.",
      "The Seller shall respond to buyer or tenant inquiries in a timely and professional manner.",
      "The Seller shall immediately notify Kasafide of any changes in property status (e.g., property has been sold or rented).",
      "The Seller shall comply with all applicable local government ordinances, national laws, and regulations governing real estate transactions in the Philippines.",
      "The Seller shall undergo and pass Kasafide's identity verification process before publishing active listings.",
      "The Seller shall not engage in any fraudulent, misleading, or deceptive practices on the platform.",
    ],
  },
  {
    title: "Article III — Obligations of Kasafide",
    items: [
      "Kasafide shall maintain the Seller's listings on the platform in accordance with these terms for the duration of the Seller's active account.",
      "Kasafide shall provide the Seller with access to listing management tools, inquiry notifications, and analytics within the platform.",
      "Kasafide shall handle all personal data provided by the Seller in compliance with the Data Privacy Act of 2012 (Republic Act No. 10173).",
      "Kasafide shall process verification documents securely and use them solely for identity verification purposes.",
      "Kasafide reserves the right to remove or suspend any listing found to be in violation of platform policies or applicable laws.",
      "Kasafide shall notify the Seller prior to any material changes in platform policies that affect their listed properties.",
    ],
  },
  {
    title: "Article IV — Intellectual Property",
    paragraphs: [
      "By submitting photos, descriptions, and other content to Kasafide, the Seller grants Kasafide a non-exclusive, royalty-free license to display, reproduce, and promote such content for the purpose of operating and marketing the platform. The Seller represents and warrants that they hold the necessary rights to all submitted content.",
    ],
  },
  {
    title: "Article V — Confidentiality",
    paragraphs: [
      "Both parties agree to keep confidential any proprietary or sensitive information exchanged under this MOA and not to disclose such information to third parties without prior written consent, except as required by law.",
    ],
  },
  {
    title: "Article VI — Term and Termination",
    paragraphs: [
      "This MOA shall be effective upon the Seller's electronic acceptance and shall remain in force for the duration of the Seller's active registration on the Kasafide platform.",
      "Either party may terminate this agreement upon thirty (30) days' written or electronic notice. Kasafide reserves the right to immediately terminate this MOA and suspend the Seller's account in cases of fraud, gross negligence, or serious violation of platform policies.",
    ],
  },
  {
    title: "Article VII — Dispute Resolution",
    paragraphs: [
      "In the event of any dispute arising from this MOA, the parties shall first attempt to resolve the matter through good-faith negotiation. If the dispute cannot be resolved within thirty (30) days, the matter shall be referred to the appropriate government authority or courts of the Philippines having jurisdiction.",
    ],
  },
  {
    title: "Article VIII — Governing Law",
    paragraphs: [
      "This MOA shall be governed by and construed in accordance with the laws of the Republic of the Philippines. Any legal action arising from this MOA shall be brought before the proper courts of Bulacan, Philippines.",
    ],
  },
];

function PageHeader({ role, page, action }: { role: ModuleRole; page: string; action?: React.ReactNode }) {
  const [title, subtitle] = TITLES[`${role}:${page}`] ?? [page, ""];
  return (
    <div className="page-header">
      <div className="page-title-wrap">
        <div>
          <div className="page-title">{title}</div>
          <div className="page-sub">{subtitle}</div>
        </div>
      </div>
      {action}
    </div>
  );
}

function ErrorNotice({ message }: { message?: string }) {
  if (!message) return null;
  const labels: Record<string, string> = {
    "name-required": "Enter both your first and last name.",
    "password-fields": "Check the password fields and make sure they match.",
    "password-strength": "Use at least 8 characters, including an uppercase letter, a number, and a symbol.",
    "current-password": "Your current password was not accepted.",
    "message-fields": "Enter a valid recipient and message.",
    "invalid-recipient": "The selected user is not a valid conversation partner.",
    "invalid-property": "The listing reference is invalid.",
    "invalid-action": "That listing action is not valid.",
    "listing-not-found": "The listing could not be found.",
    "listing-documents-required": "Add at least one listing photo and an ownership document before submitting.",
    "invalid-transition": "That listing cannot be moved to the selected status.",
    "invalid-response": "Choose a valid response.",
    "counter-date-required": "Choose a proposed date and time.",
    "payment-details": "Complete the details for each payment method you enable.",
    "invalid-notification": "That notification could not be found.",
    "agreement-required": "Confirm that you have read and agree to the seller agreement.",
    "already-signed": "The seller agreement has already been signed.",
    "verification-files-required": "Choose both your government-issued ID and selfie.",
    "invalid-id-file": "The ID must be a JPG, PNG, WebP, or PDF file no larger than 10 MB.",
    "invalid-selfie-file": "The selfie must be a JPG, PNG, or WebP file no larger than 10 MB.",
    "verification-pending": "Your verification is already waiting for review.",
    "renewal-not-due": "Your verification cannot be renewed yet.",
    "verification-upload-failed": "We could not submit your documents. Please try again.",
    "verification-required": "Complete identity verification before contacting sellers or requesting viewings.",
    "required-fields": "Complete the required listing details.",
    "invalid-listing-type": "Choose a valid listing and property type.",
    "invalid-price-or-location": "Enter a valid price and choose a barangay.",
    "invalid-measurement": "Check the property area and room measurements.",
    "invalid-units": "Enter a total of at least two units and a valid available-unit count.",
    "too-many-files": "You can upload up to 10 photos and 8 ownership documents.",
    "listing-files-required": "Add at least one listing photo and an ownership document before submitting.",
    "invalid-photo": "Photos must be JPG, PNG, or WebP files no larger than 10 MB each.",
    "invalid-document": "Ownership documents must be JPG, PNG, WebP, or PDF files no larger than 10 MB each.",
    "barangay-check-failed": "We could not verify the selected barangay. Please try again.",
    "draft-save-failed": "We could not save your listing. Please try again.",
    "listing-upload-failed": "We could not upload your files or save the listing. Please try again.",
    "account-check-failed": "We could not verify your account. Please try again.",
  };
  return <div className="alert alert-error" role="alert">{labels[message] ?? "The request could not be completed."}</div>;
}

export async function RoleModulePage({
  role,
  page,
  searchParams = {},
}: {
  role: ModuleRole;
  page: string;
  searchParams?: Params;
}) {
  const allowedPages = role === "buyer"
    ? ["saved", "payments", "messages", "profile", "verification", "reviews", "settings", "notifications", "help"]
    : ["listings", "post", "payments", "messages", "tenants", "verification", "viewing-requests", "profile", "settings", "reviews", "notifications", "help", "moa"];
  if (!allowedPages.includes(page)) redirect(`/${role}/dashboard`);

  const { supabase, user, profile } = await requireRole([role as AppRole], `/${role}/${page}`);
  const styles = STYLES[`${role}:${page}`] ?? [];
  const [title] = TITLES[`${role}:${page}`] ?? [page];
  const errorParam = typeof searchParams.error === "string" ? searchParams.error : undefined;
  let content: React.ReactNode;

  if (page === "saved" && role === "buyer") {
    const sort = ["recent", "price-asc", "price-desc"].includes(
      typeof searchParams.sort === "string" ? searchParams.sort : "",
    ) ? searchParams.sort as "recent" | "price-asc" | "price-desc" : "recent";
    const { data, error } = await supabase
      .from("saved_properties")
      .select("created_at, properties!inner(id, title, price, listing_type, property_type, address, description, images, thumbnail_url, bedrooms, bathrooms, floor_area_sqm, lot_area_sqm, status, lifecycle_status, barangays(name))")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(`Could not load saved listings: ${error.message}`);
    const listings = (data ?? [])
      .map((row) => ({ savedAt: row.created_at, property: one(row.properties) }))
      .filter((row) => row.property?.status === "approved" && !row.property?.lifecycle_status);
    if (sort === "price-asc" || sort === "price-desc") {
      listings.sort((a, b) => {
        const difference = Number(a.property?.price ?? 0) - Number(b.property?.price ?? 0);
        return sort === "price-asc" ? difference : -difference;
      });
    } else {
      listings.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
    }
    content = (
      <>
        <PageHeader role={role} page={page} action={
          <form method="get" action="/buyer/saved" className="sort-wrap">
            <label htmlFor="savedSort" className="sr-only">Sort saved listings</label>
            <select id="savedSort" name="sort" className="sort-select" defaultValue={sort}>
              <option value="recent">Recently Saved</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
            <button type="submit" className="btn-ghost">Sort</button>
          </form>
        } />
        <p className="page-sub">{listings.length} saved listing{listings.length === 1 ? "" : "s"}</p>
        <div className="saved-list">
          {listings.length === 0 ? (
            <div className="empty-state">You have no saved listings yet. <Link href="/browse">Browse homes</Link></div>
          ) : listings.map(({ property, savedAt }) => property && (
            <article key={property.id} className="saved-card">
              <Link href={`/property/${property.id}`} className="saved-img-wrap">
                {(property.thumbnail_url || property.images?.[0]) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="saved-img" src={property.thumbnail_url || property.images?.[0]} alt={property.title} />
                )}
              </Link>
              <div className="saved-body">
                <Link className="saved-title" href={`/property/${property.id}`}>{property.title}</Link>
                <div className="saved-location">{one(property.barangays)?.name || property.address || "Sta. Maria, Bulacan"}</div>
                <div className="saved-desc">{property.description ?? ""}</div>
                <div className="saved-specs">
                  {property.bedrooms !== null && <span>{property.bedrooms === 0 ? "Studio" : `${property.bedrooms} bed`}</span>}
                  {property.bathrooms !== null && <span>{property.bathrooms} bath</span>}
                  {(property.floor_area_sqm || property.lot_area_sqm) && <span>{property.floor_area_sqm || property.lot_area_sqm} sqm</span>}
                </div>
                <div className="saved-date">Saved {shortDate(savedAt)}</div>
              </div>
              <div className="saved-price-col">
                <div className="saved-price">{peso(property.price)}</div>
                {property.listing_type === "rent" && <div className="saved-price-per">/month</div>}
              </div>
            </article>
          ))}
        </div>
      </>
    );
  } else if (page === "payments") {
    const [paymentsResult, depositsResult] = role === "buyer"
      ? await Promise.all([
          supabase.from("payments")
            .select("id, amount, status, purpose, method, reference, period, due_date, created_at, properties(title)")
            .eq("user_id", user.id).order("created_at", { ascending: false }).limit(200),
          supabase.from("security_deposits")
            .select("id, amount, status, deductions, created_at, properties(title)")
            .eq("buyer_id", user.id).order("created_at", { ascending: false }),
        ])
      : await Promise.all([
          supabase.from("payments")
            .select("id, amount, status, purpose, method, reference, period, due_date, created_at, user_id, property_id, properties!inner(title, landowner_id)")
            .eq("properties.landowner_id", user.id).order("created_at", { ascending: false }).limit(500),
          supabase.from("security_deposits")
            .select("id, amount, status, deductions, created_at, buyer_id, property_id, properties!inner(title, landowner_id)")
            .eq("seller_id", user.id).order("created_at", { ascending: false }),
        ]);
    if (paymentsResult.error) throw new Error(`Could not load payments: ${paymentsResult.error.message}`);
    if (depositsResult.error) throw new Error(`Could not load security deposits: ${depositsResult.error.message}`);
    const payments = paymentsResult.data ?? [];
    const deposits = depositsResult.data ?? [];
    content = (
      <>
        <PageHeader role={role} page={page} />
        {role === "seller" && (
          <div className="tab-bar">
            <Link className="tab" href="/seller/settings">Payment Settings</Link>
            <Link className="tab" href="/seller/tenants">Tenants</Link>
          </div>
        )}
        <div className="stat-row">
          <div className="stat-card"><div className="stat-number">{payments.length}</div><div className="stat-label">Payments</div></div>
          <div className="stat-card"><div className="stat-number">{payments.filter((p) => p.status === "paid").length}</div><div className="stat-label">Confirmed</div></div>
          <div className="stat-card"><div className="stat-number">{deposits.length}</div><div className="stat-label">Security deposits</div></div>
        </div>
        <div className="table-wrap">
          <table className="pay-table">
            <thead><tr><th>Date</th><th>Property</th><th>Purpose</th><th>Period / Due</th><th>Amount</th><th>Method</th><th>Status</th></tr></thead>
            <tbody>
              {payments.length === 0 ? <tr><td colSpan={7} className="empty-state">No payments yet.</td></tr> : payments.map((payment) => (
                <tr key={payment.id}>
                  <td>{shortDate(payment.created_at)}</td>
                  <td>{one(payment.properties)?.title ?? "—"}</td>
                  <td>{payment.purpose ?? "Payment"}</td>
                  <td>{payment.period ?? shortDate(payment.due_date)}</td>
                  <td>{peso(payment.amount)}</td>
                  <td>{payment.method ?? "—"}</td>
                  <td><span className={`status-badge ${payment.status}`}>{payment.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h2 className="section-title">Security deposits</h2>
        <div className="table-wrap">
          <table className="pay-table">
            <thead><tr><th>Property</th><th>Amount</th><th>Status</th><th>Recorded</th></tr></thead>
            <tbody>
              {deposits.length === 0 ? <tr><td colSpan={4} className="empty-state">No security deposits.</td></tr> : deposits.map((deposit) => (
                <tr key={deposit.id}>
                  <td>{one(deposit.properties)?.title ?? "—"}</td>
                  <td>{peso(deposit.amount)}</td>
                  <td>{deposit.status}</td>
                  <td>{shortDate(deposit.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  } else if (page === "profile") {
    const [reviewsResult, listingsResult] = role === "buyer"
      ? await Promise.all([
          supabase.from("reviews").select("id").eq("reviewee_id", user.id),
          supabase.from("payments").select("id").eq("user_id", user.id).eq("status", "paid"),
        ])
      : await Promise.all([
          supabase.from("reviews").select("id").eq("reviewee_id", user.id),
          supabase.from("properties").select("id, status, lifecycle_status").eq("landowner_id", user.id),
        ]);
    if (reviewsResult.error) throw new Error(`Could not load profile reviews: ${reviewsResult.error.message}`);
    if (listingsResult.error) throw new Error(`Could not load profile activity: ${listingsResult.error.message}`);
    const { data: details, error } = await supabase.from("profiles")
      .select("first_name, last_name, full_name, phone, avatar_url, account_status, created_at")
      .eq("id", user.id).maybeSingle();
    if (error) throw new Error(`Could not load profile details: ${error.message}`);
    const activityCount = listingsResult.data?.length ?? 0;
    content = (
      <>
        <PageHeader role={role} page={page} />
        <div className="profile-card">
          <div className="avatar-wrap-buyer">
            <div className="avatar">{(details?.first_name?.[0] ?? "") + (details?.last_name?.[0] ?? "")}</div>
          </div>
          <div className="profile-info">
            <div className="profile-name">{details?.full_name || [details?.first_name, details?.last_name].filter(Boolean).join(" ") || "Kasafide member"}</div>
            <div className="profile-meta">
              {activityCount} {role === "buyer" ? "paid transaction" : "listing"}{activityCount === 1 ? "" : "s"} · {reviewsResult.data?.length ?? 0} reviews · Member since {shortDate(details?.created_at)}
            </div>
          </div>
          <div className={`status-badge status-${details?.account_status ?? "unverified"}`}>{details?.account_status ?? "Unverified"}</div>
        </div>
        <form action={updateProfileAction} className="section-card">
          <div className="section-header"><div className="section-title">Personal information</div></div>
          <div className="section-body">
            <div className="field-2col">
              <label className="field">First name<input name="first_name" required maxLength={80} defaultValue={details?.first_name ?? ""} /></label>
              <label className="field">Last name<input name="last_name" required maxLength={80} defaultValue={details?.last_name ?? ""} /></label>
            </div>
            <label className="field">Phone number<input name="phone" type="tel" maxLength={40} defaultValue={details?.phone ?? ""} /></label>
            <label className="field">Email address<input type="email" disabled value={user.email ?? ""} /></label>
            <ErrorNotice message={errorParam} />
            {searchParams.updated === "1" && <p className="alert alert-success">Profile updated.</p>}
            <button type="submit" className="btn-primary">Save Changes</button>
          </div>
        </form>
      </>
    );
  } else if (page === "messages") {
    const requestedWith = typeof searchParams.with === "string" && uuid(searchParams.with) ? searchParams.with : "";
    const requestedProperty = typeof searchParams.property === "string" && uuid(searchParams.property)
      ? searchParams.property : "";
    const { data: messageRows, error } = await supabase.from("messages")
      .select("id, sender_id, receiver_id, body, type, property_id, read, created_at, properties(title)")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(`Could not load messages: ${error.message}`);
    const counterpartIds = [...new Set((messageRows ?? []).map((m) => m.sender_id === user.id ? m.receiver_id : m.sender_id))];
    const [peopleResult, propertiesResult] = await Promise.all([
      counterpartIds.length
        ? supabase.from("public_profiles").select("id, full_name, first_name, last_name, avatar_url").in("id", counterpartIds)
        : Promise.resolve({ data: [], error: null }),
      supabase.from("properties").select("id, title").in("id", [...new Set((messageRows ?? []).map((m) => m.property_id).filter(Boolean))]),
    ]);
    if (peopleResult.error) throw new Error(`Could not load conversation profiles: ${peopleResult.error.message}`);
    if (propertiesResult.error) throw new Error(`Could not load conversation listings: ${propertiesResult.error.message}`);
    const people = new Map((peopleResult.data ?? []).map((person) => [person.id, person]));
    const properties = new Map((propertiesResult.data ?? []).map((property) => [property.id, property.title]));
    const activeId = requestedWith || counterpartIds[0] || "";
    const conversation = (messageRows ?? []).filter((m) =>
      (m.sender_id === user.id ? m.receiver_id : m.sender_id) === activeId,
    ).reverse();
    const activePerson = people.get(activeId);
    const conversationList = counterpartIds.map((id) => {
      const person = people.get(id);
      const latest = (messageRows ?? []).find((message) => message.sender_id === id || message.receiver_id === id);
      return { id, person, latest };
    });
    content = (
      <>
        <div className="messages-layout">
          <aside className="conv-panel">
            <div className="conv-top"><div className="conv-title">Messages</div></div>
            <div className="conv-list">
              {conversationList.length === 0 ? <div className="empty-state">No messages yet.</div> : conversationList.map(({ id, person, latest }) => (
                <Link className={`conv-item ${id === activeId ? "active" : ""}`} key={id} href={`/${role}/messages?with=${id}`}>
                  <div className="conv-info">
                    <div className="conv-name">{person?.full_name || [person?.first_name, person?.last_name].filter(Boolean).join(" ") || "Kasafide member"}</div>
                    <div className="conv-preview">{latest?.body ?? "Conversation"}</div>
                  </div>
                  <div className="conv-time">{shortDate(latest?.created_at)}</div>
                </Link>
              ))}
            </div>
          </aside>
          <section className="chat-panel">
            {activeId ? (
              <>
                <div className="chat-header"><strong>{activePerson?.full_name || [activePerson?.first_name, activePerson?.last_name].filter(Boolean).join(" ") || "Conversation"}</strong></div>
                <div className="chat-messages">
                  {conversation.map((message) => (
                    <article key={message.id} className={`msg-row ${message.sender_id === user.id ? "buyer" : "seller"}`}>
                      <div className="msg-bubble">{message.body ?? `[${message.type}]`}</div>
                      <time className="msg-time">{shortDate(message.created_at)} · {properties.get(message.property_id) ?? ""}</time>
                    </article>
                  ))}
                </div>
                <form action={sendMessageAction} className="chat-compose">
                  <input type="hidden" name="receiver_id" value={activeId} />
                  {requestedProperty && <input type="hidden" name="property_id" value={requestedProperty} />}
                  <label className="sr-only" htmlFor="messageBody">Message</label>
                  <textarea id="messageBody" name="body" required maxLength={2000} placeholder="Write a message..." />
                  <button type="submit" className="btn-primary">Send</button>
                </form>
              </>
            ) : <div className="empty-state">Select a conversation to view messages.</div>}
          </section>
        </div>
        <ErrorNotice message={errorParam} />
      </>
    );
  } else if (page === "verification") {
    const { data: details, error } = await supabase.from("profiles")
      .select("account_status, verification_docs, new_verification_docs, verified_at, verification_expiry, verification_reject_reason, submitted_verification_at")
      .eq("id", user.id).maybeSingle();
    if (error) throw new Error(`Could not load verification status: ${error.message}`);
    const status = details?.account_status ?? "unverified";
    const daysUntilExpiry = details?.verification_expiry
      ? Math.ceil((new Date(details.verification_expiry).getTime() - Date.now()) / 86400000)
      : null;
    const renewalDue = status === "verified" && daysUntilExpiry !== null && daysUntilExpiry <= 30;
    const canSubmit = status !== "pending" && status !== "reverification" && (status !== "verified" || renewalDue);
    content = (
      <>
        <PageHeader role={role} page={page} />
        <ErrorNotice message={errorParam} />
        {searchParams.submitted === "1" && <p className="alert alert-success">Verification documents submitted for review.</p>}
        <div className="verify-col">
          <div className={`banner-card ${status === "unverified" ? "danger" : ""}`}>
            <div className="banner-title">{status === "verified" ? "Identity verified" : status === "pending" || status === "reverification" ? "Documents under review" : "Verification required"}</div>
            <div className="banner-desc">
              {status === "verified"
                ? `Your identity was verified on ${shortDate(details?.verified_at)}${details?.verification_expiry ? ` and expires ${shortDate(details.verification_expiry)}` : ""}.`
                : status === "pending" || status === "reverification"
                  ? `Your documents were submitted ${shortDate(details?.submitted_verification_at)} and are waiting for review.`
                  : details?.verification_reject_reason || "Submit a clear government-issued ID and a selfie to verify your account."}
            </div>
          </div>
          {status === "verified" && !renewalDue && (
            <p className="page-sub">You can renew your verification within 30 days of its expiry.</p>
          )}
          {canSubmit && (
            <form action="/api/verify/documents" method="post" encType="multipart/form-data" className="section-card">
              <div className="section-header"><div className="section-title">Submit verification documents</div></div>
              <div className="section-body">
                <label className="upload-label">Government-issued ID
                  <input required type="file" name="government_id" accept="image/jpeg,image/png,image/webp,application/pdf" />
                </label>
                <label className="upload-label">Selfie
                  <input required type="file" name="selfie" accept="image/jpeg,image/png,image/webp" />
                </label>
                <p className="page-sub">Accepted: JPG, PNG, WebP or PDF for ID; JPG, PNG or WebP for selfie. Maximum 10 MB per file.</p>
                <button className="btn-primary" type="submit">Submit for Verification</button>
              </div>
            </form>
          )}
        </div>
      </>
    );
  } else if (page === "listings" && role === "seller") {
    const status = typeof searchParams.status === "string" && ["approved", "draft", "pending", "closed"].includes(searchParams.status)
      ? searchParams.status : "approved";
    const { data, error } = await supabase.from("properties")
      .select("id, title, price, listing_type, property_type, status, address, images, created_at, rejection_reason, rejection_notes, lifecycle_status, has_multiple_units, available_units, total_units")
      .eq("landowner_id", user.id).order("created_at", { ascending: false });
    if (error) throw new Error(`Could not load seller listings: ${error.message}`);
    const listings = (data ?? []).filter((listing) =>
      status === "draft" ? listing.status === "draft" || listing.status === "rejected" : listing.status === status,
    );
    const isVerified = profile.account_status === "verified";
    content = (
      <>
        <PageHeader role={role} page={page} action={
          <Link className="btn-add" href={isVerified ? "/seller/post" : "/seller/verification"}>{isVerified ? "Add New Listing" : "Complete Verification"}</Link>
        } />
        {searchParams.updated === "1" && <p className="alert alert-success">Listing status updated.</p>}
        {typeof searchParams.created === "string" && <p className="alert alert-success">{searchParams.created === "pending" ? "Listing submitted for review." : "Draft saved."}</p>}
        {!isVerified && <div className="warn-banner">You must be verified to publish listings. <Link href="/seller/verification">Complete verification →</Link></div>}
        <nav className="tab-bar" aria-label="Listing status">
          {[
            ["approved", "Active"], ["draft", "Draft"], ["pending", "Pending"], ["closed", "Closed"],
          ].map(([value, label]) => (
            <Link key={value} className={`tab ${status === value ? "active" : ""}`} href={`/seller/listings?status=${value}`}>
              {label} ({(data ?? []).filter((listing) => value === "draft" ? listing.status === "draft" || listing.status === "rejected" : listing.status === value).length})
            </Link>
          ))}
        </nav>
        {errorParam && <ErrorNotice message={errorParam} />}
        <div className="listing-list">
          {listings.length === 0 ? <div className="empty-state">No {status === "approved" ? "active" : status} listings yet.</div> : listings.map((listing) => (
            <article key={listing.id} className="listing-card">
              <div className="listing-row">
                {(listing.images?.[0]) && <img className="listing-thumb" src={listing.images[0]} alt="" />}
                <div className="listing-info">
                  <div className="listing-title-row"><span className="listing-title">{listing.title}</span><span className={`pill pill-${listing.listing_type}`}>{listing.listing_type}</span></div>
                  <div className="listing-address">{listing.address ?? listing.property_type ?? ""}</div>
                  <div className="listing-price">{peso(listing.price)}{listing.listing_type === "rent" ? "/mo" : ""}</div>
                  <div className="listing-posted">Posted {shortDate(listing.created_at)}</div>
                  {listing.rejection_reason && <p className="rejection-reason">{listing.rejection_reason}</p>}
                </div>
                <div className="listing-actions">
                  <span className={`status-badge ${listing.status}`}>{listing.status}</span>
                  <div className="action-btns">
                    {["draft", "rejected"].includes(listing.status) && <ListingAction id={listing.id} decision="submit" label="Submit for Review" />}
                    {listing.status === "approved" && <ListingAction id={listing.id} decision="close" label="Close Listing" />}
                    {listing.status === "closed" && <ListingAction id={listing.id} decision="reopen" label="Resubmit for Review" />}
                    {["draft", "rejected"].includes(listing.status) && <ListingAction id={listing.id} decision="delete" label="Delete" />}
                    {listing.has_multiple_units && <span>{listing.available_units}/{listing.total_units} Available</span>}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </>
    );
  } else if (page === "post" && role === "seller") {
    if (profile.account_status !== "verified") {
      content = (
        <>
          <PageHeader role={role} page={page} />
          {searchParams.updated === "1" && <p className="alert alert-success">Viewing request updated.</p>}
          <div id="verifyGate"><div className="gate-card">
            <div className="gate-title">Verification Required</div>
            <div className="gate-desc">Complete identity verification before you submit property listings.</div>
            <Link className="gate-btn-primary" href="/seller/verification">Start Verification</Link>
          </div></div>
        </>
      );
    } else {
      const { data: barangays, error } = await supabase.from("barangays").select("id, name").order("name");
      if (error) throw new Error(`Could not load barangays: ${error.message}`);
      content = (
        <>
          <PageHeader role={role} page={page} />
          <form action="/api/seller/listings" method="post" encType="multipart/form-data" className="settings-col">
            <section className="section-card">
              <div className="section-header"><div className="section-title">Listing Details</div><div className="section-sub">Basic information about your property</div></div>
              <div className="section-body">
                <div className="field"><label htmlFor="listingTitle">Listing title</label><input id="listingTitle" required name="title" maxLength={180} placeholder="e.g. 3-Bedroom House in Poblacion" /></div>
                <div className="field">
                  <label>Listing type</label>
                  <div className="pill-toggle-group">
                    <input className="listing-type-radio" type="radio" id="listingSale" name="listing_type" value="sale" defaultChecked />
                    <label className="pill-toggle" htmlFor="listingSale">For Sale</label>
                    <input className="listing-type-radio" type="radio" id="listingRent" name="listing_type" value="rent" />
                    <label className="pill-toggle" htmlFor="listingRent">For Rent</label>
                  </div>
                </div>
                <div className="field-2col">
                  <div className="field"><label htmlFor="propertyType">Property type</label><select required id="propertyType" name="property_type"><option value="">Select type</option>{["house", "apartment", "condo", "commercial", "lot"].map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
                  <div className="field"><label htmlFor="listingPrice">Price (₱)</label><input required id="listingPrice" type="number" name="price" min="1" step="0.01" /></div>
                </div>
                <div className="field-2col">
                  <div className="field"><label htmlFor="listingBarangay">Barangay</label><select required id="listingBarangay" name="barangay_id"><option value="">Select barangay</option>{(barangays ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
                  <div className="field"><label htmlFor="listingAddress">Full address</label><input required id="listingAddress" name="address" maxLength={240} placeholder="Street, Subdivision, Barangay, Sta. Maria, Bulacan" /></div>
                </div>
                <div className="toggle-row"><span className="toggle-row-label">Negotiable</span><label className="toggle"><input type="checkbox" name="price_negotiable" /><span className="toggle-track" /></label></div>
                <div className="toggle-row"><span className="toggle-row-label">Multiple units</span><label className="toggle"><input type="checkbox" name="has_multiple_units" /><span className="toggle-track" /></label></div>
                <div className="field-2col">
                  <div className="field"><label htmlFor="totalUnits">Total units (if multiple)</label><input id="totalUnits" type="number" name="total_units" min="2" max="1000" /></div>
                  <div className="field"><label htmlFor="availableUnits">Available units</label><input id="availableUnits" type="number" name="available_units" min="0" max="1000" /></div>
                </div>
                <div className="field-2col">
                  <div className="field"><label htmlFor="floorArea">Floor area (sqm)</label><input id="floorArea" type="number" name="floor_area_sqm" min="1" step="any" /></div>
                  <div className="field"><label htmlFor="lotArea">Lot area (sqm)</label><input id="lotArea" type="number" name="lot_area_sqm" min="1" step="any" /></div>
                </div>
                <div className="field-2col">
                  <div className="field"><label htmlFor="listingBedrooms">Bedrooms</label><select id="listingBedrooms" name="bedrooms"><option value="">Select</option>{[0, 1, 2, 3, 4, 5].map((n) => <option value={n} key={n}>{n === 0 ? "Studio" : n === 5 ? "5+" : n}</option>)}</select></div>
                  <div className="field"><label htmlFor="listingBathrooms">Bathrooms</label><select id="listingBathrooms" name="bathrooms"><option value="">Select</option>{[1, 2, 3, 4].map((n) => <option value={n} key={n}>{n === 4 ? "4+" : n}</option>)}</select></div>
                </div>
                <div className="field"><label htmlFor="listingDescription">Description</label><textarea id="listingDescription" name="description" rows={5} maxLength={2000} /></div>
                <div className="field-2col">
                  <div className="field"><label htmlFor="listingPhotos">Photos (up to 10)</label><input id="listingPhotos" type="file" name="photos" accept="image/jpeg,image/png,image/webp" capture="environment" multiple /></div>
                  <div className="field"><label htmlFor="listingDocuments">Deed / ownership proof</label><input id="listingDocuments" type="file" name="documents" accept="image/jpeg,image/png,image/webp,application/pdf" multiple /></div>
                </div>
                <p className="page-sub">Save a draft without files, or include at least one photo and ownership document to submit for review. Maximum 10 MB each.</p>
                <div className="submit-actions">
                  <button className="btn-ghost" type="submit" name="intent" value="draft">Save as Draft</button>
                  <button className="btn-primary" type="submit" name="intent" value="submit">Submit for Review</button>
                </div>
              </div>
            </section>
          </form>
          {typeof searchParams.error === "string" && <ErrorNotice message={errorParam} />}
        </>
      );
    }
  } else if (page === "viewing-requests" && role === "seller") {
    const { data, error } = await supabase.from("viewing_requests")
      .select("id, property_id, buyer_id, status, requested_date, requested_time, proposed_date, proposed_time, buyer_notes, seller_notes, created_at, properties(title)")
      .eq("seller_id", user.id).order("created_at", { ascending: false }).limit(250);
    if (error) throw new Error(`Could not load viewing requests: ${error.message}`);
    const personIds = [...new Set((data ?? []).map((request) => request.buyer_id))];
    const { data: people, error: peopleError } = personIds.length
      ? await supabase.from("public_profiles").select("id, full_name, first_name, last_name").in("id", personIds)
      : { data: [], error: null };
    if (peopleError) throw new Error(`Could not load buyer profiles: ${peopleError.message}`);
    const names = new Map((people ?? []).map((person) => [person.id, person.full_name || [person.first_name, person.last_name].filter(Boolean).join(" ")]));
    content = (
      <>
        <PageHeader role={role} page={page} />
        <div className="requests-list">
          {(data ?? []).length === 0 ? <div className="empty-state">No viewing requests yet.</div> : data?.map((request) => (
            <article className="request-card" key={request.id}>
              <div className="request-header"><strong>{one(request.properties)?.title ?? "Property viewing"}</strong><span className={`status-badge ${request.status}`}>{request.status}</span></div>
              <p>Buyer: {names.get(request.buyer_id) || "Kasafide member"}</p>
              <p>Requested: {shortDate(request.requested_date)} · {request.requested_time}</p>
              {request.buyer_notes && <p>Note: {request.buyer_notes}</p>}
              {request.proposed_date && <p>Proposed: {shortDate(request.proposed_date)} · {request.proposed_time}</p>}
              {request.status === "pending" && (
                <form action={respondToViewingAction} className="modal-actions">
                  <input type="hidden" name="id" value={request.id} />
                  <input name="seller_notes" maxLength={500} placeholder="Optional note to buyer" />
                  <button name="status" value="declined" className="action-btn decline-btn">Decline</button>
                  <button name="status" value="confirmed" className="action-btn accept-btn">Accept</button>
                  <input type="date" name="proposed_date" aria-label="Counter-proposed date" />
                  <input type="time" name="proposed_time" aria-label="Counter-proposed time" />
                  <button name="status" value="counter-proposed" className="action-btn counter-btn">Counter-propose</button>
                </form>
              )}
            </article>
          ))}
        </div>
        <ErrorNotice message={errorParam} />
      </>
    );
  } else if (page === "tenants" && role === "seller") {
    const [paymentsResult, depositsResult] = await Promise.all([
      supabase.from("payments").select("id, user_id, property_id, amount, status, created_at").eq("status", "paid").limit(1000),
      supabase.from("security_deposits").select("id, buyer_id, property_id, amount, status, created_at").eq("seller_id", user.id),
    ]);
    if (paymentsResult.error) throw new Error(`Could not load tenant payments: ${paymentsResult.error.message}`);
    if (depositsResult.error) throw new Error(`Could not load tenant deposits: ${depositsResult.error.message}`);
    const { data: myProperties, error: propertyError } = await supabase.from("properties")
      .select("id, title").eq("landowner_id", user.id);
    if (propertyError) throw new Error(`Could not load seller properties: ${propertyError.message}`);
    const propertyMap = new Map((myProperties ?? []).map((property) => [property.id, property.title]));
    const tenantEntries = [
      ...(paymentsResult.data ?? []).filter((payment) => propertyMap.has(payment.property_id)).map((payment) => ({
        personId: payment.user_id, propertyId: payment.property_id, amount: payment.amount, status: payment.status, date: payment.created_at,
      })),
      ...(depositsResult.data ?? []).map((deposit) => ({
        personId: deposit.buyer_id, propertyId: deposit.property_id, amount: deposit.amount, status: deposit.status, date: deposit.created_at,
      })),
    ];
    const tenantIds = [...new Set(tenantEntries.map((entry) => entry.personId))];
    const { data: tenants, error: tenantsError } = tenantIds.length
      ? await supabase.from("public_profiles").select("id, full_name, first_name, last_name").in("id", tenantIds)
      : { data: [], error: null };
    if (tenantsError) throw new Error(`Could not load tenant names: ${tenantsError.message}`);
    const tenantNames = new Map((tenants ?? []).map((tenant) => [tenant.id, tenant.full_name || [tenant.first_name, tenant.last_name].filter(Boolean).join(" ")]));
    content = (
      <>
        <PageHeader role={role} page={page} />
        <div className="stat-row"><div className="stat-card"><div className="stat-number">{tenantIds.length}</div><div className="stat-label">Tenants / buyers</div></div><div className="stat-card"><div className="stat-number">{tenantEntries.length}</div><div className="stat-label">Payments and deposits</div></div></div>
        <div className="tenant-list">
          {tenantEntries.length === 0 ? <div className="empty-state">No confirmed payments or deposits yet.</div> : tenantEntries.map((entry, index) => (
            <article key={`${entry.personId}-${entry.propertyId}-${entry.status}-${index}`} className="tenant-card">
              <div className="tenant-info"><strong>{tenantNames.get(entry.personId) || "Kasafide member"}</strong><span>{propertyMap.get(entry.propertyId) ?? "Property"}</span></div>
              <div className="tenant-payment">{peso(entry.amount)} · {entry.status}</div>
              <time>{shortDate(entry.date)}</time>
            </article>
          ))}
        </div>
      </>
    );
  } else if (page === "settings") {
    const { data: settings, error } = role === "seller"
      ? await supabase.from("profiles").select("payment_methods").eq("id", user.id).maybeSingle()
      : { data: null, error: null };
    if (error) throw new Error(`Could not load account settings: ${error.message}`);
    const methods = (settings?.payment_methods ?? {}) as {
      gcash?: { enabled?: boolean; number?: string; name?: string };
      maya?: { enabled?: boolean; number?: string; name?: string };
      bank?: { enabled?: boolean; bankName?: string; accountNumber?: string; accountName?: string };
    };
    content = (
      <>
        <PageHeader role={role} page={page} />
        <ErrorNotice message={errorParam} />
        {searchParams.updated === "payment-methods" && <p className="alert alert-success">Payment methods saved.</p>}
        <section className="section-card">
          <div className="section-header"><div className="section-title">Security</div><div className="section-sub">Update your Kasafide account password</div></div>
          <form action={changePasswordAction} className="section-body">
            <label className="field">Current password<input type="password" name="current_password" required autoComplete="current-password" /></label>
            <label className="field">New password<input type="password" name="new_password" required minLength={8} autoComplete="new-password" /></label>
            <label className="field">Confirm new password<input type="password" name="confirm_password" required minLength={8} autoComplete="new-password" /></label>
            <button type="submit" className="btn-primary">Update Password</button>
          </form>
        </section>
        {role === "seller" && (
          <form action={updatePaymentMethodsAction} className="section-card">
            <div className="section-header"><div className="section-title">Payment Methods</div><div className="section-sub">These details are shown only to buyers you are dealing with.</div></div>
            <div className="section-body">
              <PaymentMethodFields label="GCash" prefix="gcash" method={methods.gcash} />
              <PaymentMethodFields label="Maya" prefix="maya" method={methods.maya} />
              <div className="setting-row"><label><input type="checkbox" name="bank_enabled" defaultChecked={methods.bank?.enabled} /> Bank transfer</label></div>
              <div className="field-2col">
                <label className="field">Bank name<input name="bank_name" maxLength={80} defaultValue={methods.bank?.bankName ?? ""} /></label>
                <label className="field">Account number<input name="bank_account_number" maxLength={40} defaultValue={methods.bank?.accountNumber ?? ""} /></label>
                <label className="field">Account name<input name="bank_account_name" maxLength={120} defaultValue={methods.bank?.accountName ?? ""} /></label>
              </div>
              <button type="submit" className="btn-primary">Save Payment Methods</button>
            </div>
          </form>
        )}
      </>
    );
  } else if (page === "notifications") {
    const { data, error } = await supabase.from("notifications")
      .select("id, type, title, body, link, read, created_at")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
    if (error) throw new Error(`Could not load notifications: ${error.message}`);
    content = (
      <>
        <PageHeader role={role} page={page} action={
          <form action={markNotificationsReadAction}><button className="btn-ghost" type="submit">Mark all read</button></form>
        } />
        <ErrorNotice message={errorParam} />
        <div className="notification-list">
          {(data ?? []).length === 0 ? <div className="empty-state">You are all caught up.</div> : data?.map((notification) => (
            <article className={`notification-item ${notification.read ? "" : "unread"}`} key={notification.id}>
              <div><strong>{notification.title || notification.type}</strong><p>{notification.body}</p><time>{shortDate(notification.created_at)}</time></div>
              {!notification.read && <form action={markNotificationsReadAction}><input type="hidden" name="id" value={notification.id} /><button className="btn-ghost" type="submit">Mark read</button></form>}
              {notification.link && <Link href={notification.link}>Open</Link>}
            </article>
          ))}
        </div>
      </>
    );
  } else if (page === "reviews") {
    const { data, error } = await supabase.from("reviews")
      .select("id, reviewer_id, rating, comment, created_at, properties(title)")
      .eq("reviewee_id", user.id).order("created_at", { ascending: false }).limit(250);
    if (error) throw new Error(`Could not load reviews: ${error.message}`);
    const reviewerIds = [...new Set((data ?? []).map((review) => review.reviewer_id))];
    const { data: reviewers, error: reviewerError } = reviewerIds.length
      ? await supabase.from("public_profiles").select("id, full_name, first_name, last_name").in("id", reviewerIds)
      : { data: [], error: null };
    if (reviewerError) throw new Error(`Could not load reviewers: ${reviewerError.message}`);
    const reviewerNames = new Map((reviewers ?? []).map((reviewer) => [reviewer.id, reviewer.full_name || [reviewer.first_name, reviewer.last_name].filter(Boolean).join(" ")]));
    const average = data?.length ? (data.reduce((sum, review) => sum + review.rating, 0) / data.length).toFixed(1) : "—";
    content = (
      <>
        <PageHeader role={role} page={page} />
        <div className="stats-overview">
          <div className="stat-card"><div className="stat-number">{data?.length ?? 0}</div><div className="stat-label">Reviews</div></div>
          <div className="stat-card"><div className="stat-number">{average}</div><div className="stat-label">Average rating</div><div className="star-display" aria-label={`${average} out of 5 stars`}>★★★★★</div></div>
        </div>
        <div className="review-list">
          {(data ?? []).length === 0 ? <div className="empty-state">No reviews yet.</div> : data?.map((review) => (
            <article key={review.id} className="review-card">
              <div className="review-head"><strong>{reviewerNames.get(review.reviewer_id) || "Kasafide member"}</strong><span className="star-display" aria-label={`${review.rating} out of 5 stars`}>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span></div>
              <p>{review.comment || "No written feedback."}</p>
              <div className="page-sub">{one(review.properties)?.title ?? "Property review"} · {shortDate(review.created_at)}</div>
            </article>
          ))}
        </div>
      </>
    );
  } else if (page === "help") {
    content = (
      <>
        <PageHeader role={role} page={page} />
        <div className="settings-col">
          <section className="section-card"><div className="section-title">How can we help?</div><p>Browse available properties, manage your account, or contact the Kasafide support team.</p><p><a href="mailto:support@kasafide.com">support@kasafide.com</a></p></section>
          <section className="section-card"><div className="section-title">Account and verification</div><p>Use your verification page to submit or check your identity documents.</p><Link href={`/${role}/verification`}>Open verification</Link></section>
        </div>
      </>
    );
  } else if (page === "moa" && role === "seller") {
    const { data: agreement, error } = await supabase.from("profiles").select("moa_signed_at").eq("id", user.id).maybeSingle();
    if (error) throw new Error(`Could not load agreement status: ${error.message}`);
    const signedAt = agreement?.moa_signed_at;
    content = (
      <>
        <PageHeader role={role} page={page} action={
          signedAt
            ? <span className="moa-signed-badge">Signed on {shortDate(signedAt)}</span>
            : <span className="moa-pending-badge">Awaiting Signature</span>
        } />
        <ErrorNotice message={errorParam} />
        {searchParams.signed === "1" && <p className="alert alert-success">MOA signed successfully. Your agreement is recorded.</p>}
        <div className="moa-col">
          {signedAt ? (
            <div className="signed-banner">
              <div className="signed-icon" aria-hidden="true">✓</div>
              <div>
                <div className="signed-title">MOA Successfully Signed</div>
                <div className="signed-desc">You signed this Memorandum of Agreement on <strong>{shortDate(signedAt)}</strong>. Your agreement is kept on record by Kasafide. You can review it below.</div>
              </div>
            </div>
          ) : (
            <div className="banner-card">
              <div className="banner-icon" aria-hidden="true">✎</div>
              <div>
                <div className="banner-title">Signature Required</div>
                <div className="banner-desc">Please read the Memorandum of Agreement below and confirm your acceptance.</div>
              </div>
            </div>
          )}
          <section className={`moa-doc ${signedAt ? "readonly" : ""}`}>
            <div className="moa-doc-header">
              <div className="moa-doc-logo" aria-hidden="true">▤</div>
              <div>
                <div className="moa-doc-title">MEMORANDUM OF AGREEMENT</div>
                <div className="moa-doc-subtitle">Kasafide Online Property Marketplace &amp; Property Seller</div>
              </div>
            </div>
            <div className="moa-body">
              {MOA_SECTIONS.map((section) => (
                <section className="moa-section" key={section.title}>
                  <h2 className="moa-section-title">{section.title}</h2>
                  {section.paragraphs?.map((paragraph) => <p className="moa-section-body" key={paragraph}>{paragraph}</p>)}
                  {section.items && <ol className="moa-list">{section.items.map((item) => <li key={item}>{item}</li>)}</ol>}
                </section>
              ))}
            </div>
            {signedAt && (
              <div className="moa-signature-block">
                <div className="sig-row">
                  <div className="sig-item"><div className="sig-name">Kasafide Platform</div><div className="sig-line" /><div className="sig-label">Authorized Representative</div><div className="sig-date">Date: {shortDate(signedAt)}</div></div>
                  <div className="sig-item"><div className="sig-name">{profile.full_name || "Seller"}</div><div className="sig-line" /><div className="sig-label">Seller / Property Owner</div><div className="sig-date">Date: {shortDate(signedAt)}</div></div>
                </div>
              </div>
            )}
          </section>
          {!signedAt && (
            <form action={signSellerMoaAction} className="sign-panel">
              <div className="sign-panel-inner">
                <label className="agree-check">
                  <input type="checkbox" name="agree" required />
                  <span className="check-box" />
                  <span className="check-label">I have read and understood this Memorandum of Agreement and agree to be bound by its terms.</span>
                </label>
                <button className="btn-sign" type="submit">Sign MOA</button>
              </div>
            </form>
          )}
        </div>
      </>
    );
  } else {
    redirect(`/${role}/dashboard`);
  }

  return (
    <>
      {styles.map((href) => <link key={href} rel="stylesheet" href={href} />)}
      <link rel="stylesheet" href="/assets/css/responsive.css" />
      <title>{title} | Kasafide</title>
      {content}
    </>
  );
}

function ListingAction({ id, decision, label }: { id: string; decision: string; label: string }) {
  return (
    <form action={updateListingStatusAction}>
      <input type="hidden" name="id" value={id} />
      <button className={`btn-${decision}`} name="decision" value={decision} type="submit">{label}</button>
    </form>
  );
}

function PaymentMethodFields({
  label,
  prefix,
  method,
}: {
  label: string;
  prefix: "gcash" | "maya";
  method?: { enabled?: boolean; number?: string; name?: string };
}) {
  return (
    <>
      <div className="setting-row"><label><input type="checkbox" name={`${prefix}_enabled`} defaultChecked={method?.enabled} /> {label}</label></div>
      <div className="field-2col">
        <label className="field">{label} number<input name={`${prefix}_number`} maxLength={24} defaultValue={method?.number ?? ""} /></label>
        <label className="field">Account name<input name={`${prefix}_name`} maxLength={120} defaultValue={method?.name ?? ""} /></label>
      </div>
    </>
  );
}
