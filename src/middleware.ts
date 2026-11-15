import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PROTECTED_PREFIXES = ["/buyer", "/seller", "/admin", "/super-admin"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let API handle its own authentication as JSON
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Refresh session cookies and check user
  const { response, user } = await updateSession(request);

  if (!user && PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const login = new URL("/auth/signin.html", request.url);
    login.searchParams.set("redirect", pathname + request.nextUrl.search);
    return NextResponse.redirect(login);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|assets/|favicon|site\\.webmanifest|auth/.*|module/.*).*)',
  ],
};
