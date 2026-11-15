import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

type AppRole = "buyer" | "seller" | "admin" | "super_admin" | "superadmin" | "super_duper_admin";

function homeFor(role: string): string {
  if (role === "seller") return "/seller";
  if (role === "admin") return "/admin";
  if (role === "super_admin" || role === "superadmin" || role === "super_duper_admin") {
    return "/super-admin";
  }
  return "/buyer";
}

function isRoleAllowed(role: string, pathname: string): boolean {
  if (pathname.startsWith("/buyer")) {
    return role === "buyer";
  }
  if (pathname.startsWith("/seller")) {
    return role === "seller";
  }
  if (pathname.startsWith("/admin")) {
    return role === "admin" || role === "super_admin" || role === "superadmin" || role === "super_duper_admin";
  }
  if (pathname.startsWith("/super-admin")) {
    return role === "super_admin" || role === "superadmin" || role === "super_duper_admin";
  }
  return true;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let API handle its own authentication as JSON
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Refresh session cookies and check user
  const { response, user, supabase } = await updateSession(request);

  const isAuthRoute =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/auth/login" ||
    pathname === "/auth/signup";

  const isProtectedRoute =
    pathname.startsWith("/buyer") ||
    pathname.startsWith("/seller") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/super-admin");

  // Redirect unauthenticated users from protected routes to login
  if (!user && isProtectedRoute) {
    const login = new URL("/auth/login", request.url);
    login.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(login);
  }

  // If user is authenticated, check role for routing
  if (user && supabase) {
    // If authenticated user visits login or signup, redirect to their role home
    if (isAuthRoute) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      const role = profile?.role || "buyer";
      return NextResponse.redirect(new URL(homeFor(role), request.url));
    }

    // Role-to-route protection
    if (isProtectedRoute) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      const role = profile?.role || "buyer";

      if (!isRoleAllowed(role, pathname)) {
        return NextResponse.redirect(new URL(homeFor(role), request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|assets/|favicon\\.ico|favicon|site\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
