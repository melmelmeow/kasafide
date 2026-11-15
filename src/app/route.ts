import { type NextRequest, NextResponse } from 'next/server';

/**
 * Root GET — redirects "/" to the static "/index.html" served from public/.
 * route.ts is used (not page.tsx) so it bypasses the App Router layout wrapper.
 * Next.js serves public/index.html as a static file at /index.html automatically.
 */
export async function GET() {
  return new Response(null, {
    status: 307,
    headers: {
      Location: "/index.html",
    },
  });
}
