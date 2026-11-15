/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // "/" is the server-rendered landing page (src/app/page.tsx). The old plain-HTML pages in public/
  // are still served at their own .html URLs while they are migrated to the app router.
  output: "standalone",

  // Suppress webpack cache string-serialization perf warnings (cosmetic only, no runtime impact)
  webpack(config) {
    config.infrastructureLogging = { level: 'error' };
    return config;
  },

  // â”€â”€ SSR rewrites â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Maps clean SSR-protected URLs to the existing HTML files in public/.
  // Middleware (src/middleware.ts) handles auth for /buyer/*, /seller/*, /admin/*.
  async rewrites() {
    return [
      // ── Clean routes rewritten only for pages not yet in App Router ──────────
      { source: "/buyer/messages",      destination: "/module/buyer/messages.html" },
      { source: "/buyer/profile",       destination: "/module/buyer/profile.html" },
      { source: "/buyer/settings",      destination: "/module/buyer/settings.html" },
      { source: "/buyer/reviews",       destination: "/module/buyer/reviews.html" },
      { source: "/buyer/notifications", destination: "/module/buyer/notifications.html" },
      { source: "/buyer/help",          destination: "/module/buyer/help.html" },
      { source: "/buyer/verification",  destination: "/module/buyer/verification.html" },

      { source: "/seller/post",             destination: "/module/seller/post.html" },
      { source: "/seller/payments",         destination: "/module/seller/payments.html" },
      { source: "/seller/messages",         destination: "/module/seller/messages.html" },
      { source: "/seller/settings",         destination: "/module/seller/settings.html" },
      { source: "/seller/profile",          destination: "/module/seller/profile.html" },
      { source: "/seller/reviews",          destination: "/module/seller/reviews.html" },
      { source: "/seller/viewing-requests", destination: "/module/seller/viewing-requests.html" },
      { source: "/seller/verification",     destination: "/module/seller/verification.html" },
      { source: "/seller/notifications",    destination: "/module/seller/notifications.html" },
      { source: "/seller/tenants",          destination: "/module/seller/tenants.html" },
      { source: "/seller/help",             destination: "/module/seller/help.html" },
      { source: "/seller/moa",              destination: "/module/seller/moa.html" },

      { source: "/admin/analytics",     destination: "/module/admin/analytics.html" },
      { source: "/admin/reports",       destination: "/module/admin/reports.html" },
      { source: "/admin/settings",      destination: "/module/admin/settings.html" },
      { source: "/admin/notifications", destination: "/module/admin/notifications.html" },

      { source: "/super-admin/dashboard",   destination: "/module/super-admin/super-admin.html" },
      { source: "/super-admin/admins",      destination: "/module/super-admin/admins.html" },
      { source: "/super-admin/audit-trail", destination: "/module/super-admin/audit-trail.html" },
      { source: "/super-admin/reports",     destination: "/module/super-admin/reports.html" },

      { source: "/auth/signin",          destination: "/auth/signin.html" },
      { source: "/auth/login",           destination: "/auth/signin.html" },
      { source: "/auth/signup",          destination: "/auth/signup.html" },
      { source: "/auth/forgot-password", destination: "/auth/forgot-password.html" },

      { source: "/about",          destination: "/about.html" },
      { source: "/browse",         destination: "/browse.html" },
      { source: "/faqs",           destination: "/faqs.html" },
      { source: "/help",           destination: "/help.html" },
      { source: "/privacy-policy", destination: "/privacy-policy.html" },
      { source: "/terms",          destination: "/terms.html" },
    ];
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.xendit.co" },
      { protocol: "https", hostname: "**.google.com" },
      { protocol: "https", hostname: "**.googleapis.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      // Self-hosted Supabase instance
      { protocol: "https", hostname: "srv1824055.hstgr.cloud" },
    ],
  },
};

export default nextConfig;


