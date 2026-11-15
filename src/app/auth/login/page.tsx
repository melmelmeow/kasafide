import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { redirect } from "next/navigation";
import { getMe, homeFor } from "@/lib/auth";
import { LoginForm } from "@/components/AuthForm";
import { first } from "@/lib/format";

export const metadata: Metadata = {
  title: "Kasafide – Sign In",
  description: "Verified homes in Sta. Maria, Bulacan.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { [k: string]: string | string[] | undefined };
}) {
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
            No hidden listings.<br />
            <em>No unverified sellers.</em>
          </h2>
          <p>Kasafide connects buyers with verified property owners across Sta. Maria, Bulacan.</p>
        </div>

        <div className="auth-card">
          <Link className="auth-card-brand" href="/">
            <span className="kf-logo" data-size="28" role="img" aria-label="Kasafide logo"></span>
            Kasafide
          </Link>

          <LoginForm next={first(searchParams.next) || undefined} />
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
