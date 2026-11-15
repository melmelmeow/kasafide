"use client";

import { useState } from "react";
import Link from "next/link";
import { signInAction } from "@/app/auth/actions";

export function LoginForm({ next }: { next?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const fd = new FormData(e.currentTarget);
    const emailValue = (String(fd.get("email") || email)).trim();
    const passwordValue = String(fd.get("password") || password);

    if (!emailValue || !passwordValue) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await signInAction(null, fd);
      if (res?.error) {
        setError(res.error);
        setLoading(false);
      }
    } catch (err: unknown) {
      // In Next.js, redirect() throws a NEXT_REDIRECT error which should not be caught as an error
      if (err && typeof err === "object" && "digest" in err && String((err as { digest: string }).digest).startsWith("NEXT_REDIRECT")) {
        throw err;
      }
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  function signInWithGoogle() {
    window.location.href = `/api/auth/google?action=signin${next ? `&redirect=${encodeURIComponent(next)}` : ""}`;
  }

  return (
    <div className="auth-form-wrap signin-wrap">
      <h1 className="auth-title">Welcome Back</h1>
      <p className="auth-sub">Sign in to access your Kasafide account</p>

      <form onSubmit={handleSubmit}>
        {next && <input type="hidden" name="next" value={next} />}

        <div className="field-group">
          <label className="field-label" htmlFor="email-input">Email</label>
          <input
            id="email-input"
            name="email"
            className="field-input full"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            autoComplete="email"
          />
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="password-input">Password</label>
          <div className="input-eye">
            <input
              id="password-input"
              name="password"
              className="field-input full"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              className="eye-btn"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          </div>
          <div className="field-row-end">
            <a href="/auth/forgot-password.html" className="forgot-link">Forgot password?</a>
          </div>
        </div>

        {error && (
          <div style={{ color: "#ef4444", fontSize: "13px", marginBottom: "14px", fontWeight: 500 }}>
            {error}
          </div>
        )}

        <button type="submit" className="btn-primary full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="divider"><span>or</span></div>

      <button type="button" className="btn-google full" onClick={signInWithGoogle}>
        <svg width="18" height="18" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </svg>
        Sign in with Google
      </button>

      <p className="auth-footer-text">
        Don&apos;t have an account?{" "}
        <Link href="/auth/signup" className="auth-link">Sign up</Link>
      </p>
    </div>
  );
}

export function SignupForm() {
  const [role, setRole] = useState<"buyer" | "seller">("buyer");
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [mi, setMi] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agree, setAgree] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!agree) {
      setError("Please agree to the Terms of Service and Privacy Policy.");
      return;
    }

    const fd = new FormData(e.currentTarget);
    const lastNameVal = String(fd.get("lastName") || lastName).trim();
    const firstNameVal = String(fd.get("firstName") || firstName).trim();
    const miVal = String(fd.get("mi") || mi).trim();
    const emailVal = String(fd.get("email") || email).trim();
    const phoneVal = String(fd.get("phone") || phone).trim();
    const passwordVal = String(fd.get("password") || password);
    const confirmPasswordVal = String(fd.get("confirmPassword") || confirmPassword);

    if (!firstNameVal || !lastNameVal || !emailVal) {
      setError("Please fill in all required name and email fields.");
      return;
    }
    if (passwordVal !== confirmPasswordVal) {
      setError("Passwords do not match.");
      return;
    }
    if (passwordVal.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);
    try {
      const formattedPhone = phoneVal ? `+63${phoneVal.replace(/\D/g, "")}` : undefined;
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstNameVal,
          lastName: lastNameVal,
          middleInitial: miVal,
          email: emailVal,
          phone: formattedPhone,
          password: passwordVal,
          role,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not create account. Please try again.");
      } else {
        setModalOpen(true);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function signUpWithGoogle() {
    window.location.href = `/api/auth/google?action=signup&role=${role}`;
  }

  return (
    <>
      <div className="auth-form-wrap">
        <h1 className="auth-title">Create an account</h1>
        <p className="auth-sub">Join Kasafide to find your dream property.</p>

        <form onSubmit={onSubmit}>
          <input type="hidden" name="role" value={role} />

          <div className="field-group">
            <label className="field-label">I am registering as a…</label>
            <div className="role-toggle">
              <button
                type="button"
                className={`role-btn ${role === "buyer" ? "active" : ""}`}
                onClick={() => setRole("buyer")}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Buyer / Renter
              </button>
              <button
                type="button"
                className={`role-btn ${role === "seller" ? "active" : ""}`}
                onClick={() => setRole("seller")}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M3 9h18M9 21V9" />
                </svg>
                Seller / Lister
              </button>
            </div>
          </div>

          <div className="field-group">
            <label className="field-label">Name</label>
            <div className="name-row">
              <input
                name="lastName"
                className="field-input"
                type="text"
                placeholder="Surname"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
              <input
                name="firstName"
                className="field-input"
                type="text"
                placeholder="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
              <input
                name="mi"
                className="field-input mi"
                type="text"
                placeholder="M.I."
                value={mi}
                onChange={(e) => setMi(e.target.value)}
                maxLength={4}
              />
            </div>
          </div>

          <div className="field-pair">
            <div className="field-group">
              <label className="field-label">Email</label>
              <input
                name="email"
                className="field-input full"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="field-group">
              <label className="field-label">Phone Number</label>
              <div className="phone-input">
                <span className="phone-prefix">+63</span>
                <input
                  name="phone"
                  className="field-input"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="9000000000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="field-pair">
            <div className="field-group">
              <label className="field-label">Password</label>
              <div className="input-eye">
                <input
                  name="password"
                  className="field-input full"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="field-group">
              <label className="field-label">Confirm Password</label>
              <div className="input-eye">
                <input
                  name="confirmPassword"
                  className="field-input full"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="eye-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <span className="field-hint field-hint--pair">Must be at least 8 characters long.</span>

          <label className="agree-check">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
            />
            <span className="agree-box"></span>
            <span className="agree-text">
              I have read and agree to Kasafide&apos;s{" "}
              <a href="/terms.html" target="_blank" rel="noopener noreferrer">Terms of Service</a>{" "}
              and{" "}
              <a href="/privacy-policy.html" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
            </span>
          </label>

          {error && (
            <div style={{ color: "#ef4444", fontSize: "13px", margin: "10px 0", fontWeight: 500 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary full"
            disabled={!agree || loading}
            style={{
              opacity: !agree || loading ? 0.45 : 1,
              cursor: !agree || loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Creating Account…" : "Create Account"}
          </button>
        </form>

        <div className="divider"><span>or</span></div>

        <button type="button" className="btn-google full" onClick={signUpWithGoogle}>
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
          Sign up with Google
        </button>

        <p className="auth-footer-text">
          Already have an account?{" "}
          <Link href="/auth/login" className="auth-link">Sign in</Link>
        </p>
      </div>

      {/* Verify Email Modal */}
      {modalOpen && (
        <div className="modal-backdrop active">
          <div className="modal-card">
            <button type="button" className="modal-close" onClick={() => setModalOpen(false)}>&times;</button>
            <div className="modal-icon-wrap">
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: "var(--primary)" }}>
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <div className="modal-check">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ stroke: "var(--on-primary)" }} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>
            <h2 className="modal-title">Verify Your Email</h2>
            <p className="modal-text">We sent a verification link to</p>
            <p className="modal-email">{email}</p>
            <p className="modal-text">Please check your inbox and click the link<br />to activate your account.</p>
            <Link href="/auth/login" className="btn-primary modal-resend-btn" style={{ display: "inline-block", textDecoration: "none" }}>
              Proceed to Sign In
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
