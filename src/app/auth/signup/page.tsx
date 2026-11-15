import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { redirect } from "next/navigation";
import { getMe, homeFor } from "@/lib/auth";
import { SignupForm } from "@/components/AuthForm";

export const metadata: Metadata = {
  title: "Kasafide – Create an Account",
  description: "Verified homes in Sta. Maria, Bulacan.",
};

export default async function SignupPage() {
  const me = await getMe();
  if (me) redirect(homeFor(me.profile.role));

  return (
    <>
      <div className="auth-page">
        <div className="auth-bg-photo" id="authBgPhoto"></div>
        <div className="auth-bg-overlay"></div>
        <span className="auth-glow auth-glow-1"></span>
        <span className="auth-glow auth-glow-2"></span>

        <div className="auth-tagline">
          <h2>
            Find your home,<br />
            <em>the verified way.</em>
          </h2>
          <p>Every seller is ID-checked and every listing is reviewed before it ever reaches browse.</p>
        </div>

        <div className="auth-card auth-card--wide">
          <Link className="auth-card-brand" href="/">
            <span className="kf-logo" data-size="28" role="img" aria-label="Kasafide logo"></span>
            Kasafide
          </Link>

          <SignupForm />
        </div>

        <footer className="auth-page-footer">
          <span>© 2026 Kasafide</span>
          <div className="footer-links">
            <Link href="/terms.html">Terms</Link>
            <Link href="/privacy-policy.html">Privacy</Link>
          </div>
        </footer>
      </div>

      <Script src="/assets/js/kasafide-grainient.js" strategy="lazyOnload" />
    </>
  );
}
