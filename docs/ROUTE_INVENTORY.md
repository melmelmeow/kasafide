# Next.js Route Inventory — HomeSure Platform

Generated on: 2026-11-16  
Framework: Next.js 14 (App Router)  
Workspace Directory: `src/app/`

---

## 1. Architectural Summary & Routing Patterns

- **Routing Model**: 100% App Router (`src/app/`). No legacy `pages/` directory exists.
- **Route Groups**: None present (no folders matching `(group)`).
- **Dynamic Segments**: None present (no `[param]`, `[...slug]`, or `[[...slug]]` segments). All current Next.js routes use explicit static paths.
- **Root Route (`/`)**: Handled by [`src/app/route.ts`](file:///home/slick2/lando/kasafide/src/app/route.ts), which responds to `GET` requests with an HTTP 307 redirect to `/index.html` (served statically from `public/index.html`).
- **Legacy Static HTML Rewrites**: Configured via `next.config.mjs` to map legacy modules in `public/module/` and static HTML pages in `public/` (e.g., `/about`, `/browse`, `/terms`) to clean URLs until fully migrated into App Router.

---

## 2. UI Pages

| Route Path | File Location | Purpose / Access |
| :--- | :--- | :--- |
| `/admin` | [`src/app/admin/page.tsx`](file:///home/slick2/lando/kasafide/src/app/admin/page.tsx) | Admin entry view |
| `/admin/dashboard` | [`src/app/admin/dashboard/page.tsx`](file:///home/slick2/lando/kasafide/src/app/admin/dashboard/page.tsx) | Admin overview & statistics |
| `/admin/listings` | [`src/app/admin/listings/page.tsx`](file:///home/slick2/lando/kasafide/src/app/admin/listings/page.tsx) | Property listings moderation |
| `/admin/payments` | [`src/app/admin/payments/page.tsx`](file:///home/slick2/lando/kasafide/src/app/admin/payments/page.tsx) | Payment audit & transaction ledger |
| `/admin/users` | [`src/app/admin/users/page.tsx`](file:///home/slick2/lando/kasafide/src/app/admin/users/page.tsx) | User management & verification |
| `/auth/continue` | [`src/app/auth/continue/page.tsx`](file:///home/slick2/lando/kasafide/src/app/auth/continue/page.tsx) | Post-authentication onboarding / role assignment |
| `/auth/login` | [`src/app/auth/login/page.tsx`](file:///home/slick2/lando/kasafide/src/app/auth/login/page.tsx) | User sign-in page |
| `/auth/signup` | [`src/app/auth/signup/page.tsx`](file:///home/slick2/lando/kasafide/src/app/auth/signup/page.tsx) | User registration page |
| `/buyer` | [`src/app/buyer/page.tsx`](file:///home/slick2/lando/kasafide/src/app/buyer/page.tsx) | Buyer portal entry view |
| `/buyer/dashboard` | [`src/app/buyer/dashboard/page.tsx`](file:///home/slick2/lando/kasafide/src/app/buyer/dashboard/page.tsx) | Buyer home dashboard |
| `/buyer/payments` | [`src/app/buyer/payments/page.tsx`](file:///home/slick2/lando/kasafide/src/app/buyer/payments/page.tsx) | Buyer payment history & checkout |
| `/buyer/saved` | [`src/app/buyer/saved/page.tsx`](file:///home/slick2/lando/kasafide/src/app/buyer/saved/page.tsx) | Saved / bookmarked listings |
| `/login` | [`src/app/login/page.tsx`](file:///home/slick2/lando/kasafide/src/app/login/page.tsx) | Root login redirect / alias |
| `/seller` | [`src/app/seller/page.tsx`](file:///home/slick2/lando/kasafide/src/app/seller/page.tsx) | Seller portal entry view |
| `/seller/dashboard` | [`src/app/seller/dashboard/page.tsx`](file:///home/slick2/lando/kasafide/src/app/seller/dashboard/page.tsx) | Seller performance & metrics |
| `/seller/listings` | [`src/app/seller/listings/page.tsx`](file:///home/slick2/lando/kasafide/src/app/seller/listings/page.tsx) | Seller property management |
| `/signup` | [`src/app/signup/page.tsx`](file:///home/slick2/lando/kasafide/src/app/signup/page.tsx) | Root signup redirect / alias |
| `/super-admin` | [`src/app/super-admin/page.tsx`](file:///home/slick2/lando/kasafide/src/app/super-admin/page.tsx) | Super administrator control console |

---

## 3. API Route Handlers

| Endpoint Path | HTTP Methods | File Location | Description / Purpose |
| :--- | :--- | :--- | :--- |
| `/` | `GET` | [`src/app/route.ts`](file:///home/slick2/lando/kasafide/src/app/route.ts) | Root route: redirects `GET /` to static `/index.html` |
| `/api/ai/customer-service` | `POST` | [`src/app/api/ai/customer-service/route.ts`](file:///home/slick2/lando/kasafide/src/app/api/ai/customer-service/route.ts) | AI customer service chat completion |
| `/api/auth/callback` | `GET` | [`src/app/api/auth/callback/route.ts`](file:///home/slick2/lando/kasafide/src/app/api/auth/callback/route.ts) | Supabase OAuth code exchange callback |
| `/api/auth/callback/google` | `GET` | [`src/app/api/auth/callback/google/route.ts`](file:///home/slick2/lando/kasafide/src/app/api/auth/callback/google/route.ts) | Google OAuth callback handler |
| `/api/auth/forgot-password` | `POST` | [`src/app/api/auth/forgot-password/route.ts`](file:///home/slick2/lando/kasafide/src/app/api/auth/forgot-password/route.ts) | Password reset email request trigger |
| `/api/auth/google` | `GET` | [`src/app/api/auth/google/route.ts`](file:///home/slick2/lando/kasafide/src/app/api/auth/google/route.ts) | Initiates Google OAuth redirect |
| `/api/auth/reset-password` | `POST` | [`src/app/api/auth/reset-password/route.ts`](file:///home/slick2/lando/kasafide/src/app/api/auth/reset-password/route.ts) | Password update verification |
| `/api/auth/set-cookie` | `POST` | [`src/app/api/auth/set-cookie/route.ts`](file:///home/slick2/lando/kasafide/src/app/api/auth/set-cookie/route.ts) | Sets auth session cookies on the response |
| `/api/auth/set-session` | `OPTIONS`, `POST` | [`src/app/api/auth/set-session/route.ts`](file:///home/slick2/lando/kasafide/src/app/api/auth/set-session/route.ts) | Sets SSR session with CORS support |
| `/api/auth/signout` | `POST` | [`src/app/api/auth/signout/route.ts`](file:///home/slick2/lando/kasafide/src/app/api/auth/signout/route.ts) | Terminates Supabase authentication session |
| `/api/auth/signup` | `POST` | [`src/app/api/auth/signup/route.ts`](file:///home/slick2/lando/kasafide/src/app/api/auth/signup/route.ts) | Registers new user account with role metadata |
| `/api/google` | `GET` | [`src/app/api/google/route.ts`](file:///home/slick2/lando/kasafide/src/app/api/google/route.ts) | Google API service ping / proxy handler |
| `/api/notifications/email` | `POST` | [`src/app/api/notifications/email/route.ts`](file:///home/slick2/lando/kasafide/src/app/api/notifications/email/route.ts) | Dispatches notification emails |
| `/api/payments/confirm` | `POST` | [`src/app/api/payments/confirm/route.ts`](file:///home/slick2/lando/kasafide/src/app/api/payments/confirm/route.ts) | Verifies & confirms incoming payments |
| `/api/payments/create-invoice` | `POST` | [`src/app/api/payments/create-invoice/route.ts`](file:///home/slick2/lando/kasafide/src/app/api/payments/create-invoice/route.ts) | Generates Xendit invoice for transaction |
| `/api/payments/manual-proof` | `POST` | [`src/app/api/payments/manual-proof/route.ts`](file:///home/slick2/lando/kasafide/src/app/api/payments/manual-proof/route.ts) | Submits manual bank transfer / payment proof |
| `/api/refunds/disburse` | `POST` | [`src/app/api/refunds/disburse/route.ts`](file:///home/slick2/lando/kasafide/src/app/api/refunds/disburse/route.ts) | Disburses approved refund to customer |
| `/api/refunds/request` | `POST` | [`src/app/api/refunds/request/route.ts`](file:///home/slick2/lando/kasafide/src/app/api/refunds/request/route.ts) | Submits refund request for review |
| `/api/verify/ocr` | `POST` | [`src/app/api/verify/ocr/route.ts`](file:///home/slick2/lando/kasafide/src/app/api/verify/ocr/route.ts) | Document OCR inspection and verification |
| `/api/webhooks/xendit` | `POST` | [`src/app/api/webhooks/xendit/route.ts`](file:///home/slick2/lando/kasafide/src/app/api/webhooks/xendit/route.ts) | Webhook listener for Xendit payment events |
| `/auth/callback` | `GET` | [`src/app/auth/callback/route.ts`](file:///home/slick2/lando/kasafide/src/app/auth/callback/route.ts) | Auth redirect callback & session establishment |
| `/auth/confirm` | `GET` | [`src/app/auth/confirm/route.ts`](file:///home/slick2/lando/kasafide/src/app/auth/confirm/route.ts) | Email confirmation & OTP verification |
| `/auth/signout` | `GET`, `POST` | [`src/app/auth/signout/route.ts`](file:///home/slick2/lando/kasafide/src/app/auth/signout/route.ts) | Clears session cookies and redirects to login |
