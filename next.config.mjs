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
      { source: "/admin/analytics",     destination: "/module/admin/analytics.html" },
      { source: "/admin/reports",       destination: "/module/admin/reports.html" },
      { source: "/admin/settings",      destination: "/module/admin/settings.html" },
      { source: "/admin/notifications", destination: "/module/admin/notifications.html" },

      { source: "/super-admin/dashboard",   destination: "/module/super-admin/super-admin.html" },
      { source: "/super-admin/admins",      destination: "/module/super-admin/admins.html" },
      { source: "/super-admin/audit-trail", destination: "/module/super-admin/audit-trail.html" },
      { source: "/super-admin/reports",     destination: "/module/super-admin/reports.html" },

      { source: "/auth/signin",          destination: "/auth/login" },
      { source: "/auth/forgot-password", destination: "/auth/forgot-password.html" },

      { source: "/about",          destination: "/about.html" },
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


