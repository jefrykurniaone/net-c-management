import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/utils";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const isLoggedIn = !!session?.user;
  const isAdmin = isAdminRole(session?.user?.role);
  const isProfileComplete = session?.user?.isProfileComplete ?? false;

  const isAuthPage = nextUrl.pathname.startsWith("/auth");
  // Dev-only login page (/auth/dev) must stay reachable even when logged in, so
  // you can switch between the seeded users. Never matches in production.
  const isDevLoginPage =
    process.env.NODE_ENV !== "production" &&
    nextUrl.pathname === "/auth/dev";
  const isOnboarding = nextUrl.pathname === "/onboarding";
  const isAdminRoute = nextUrl.pathname.startsWith("/admin");
  const isProtectedRoute =
    nextUrl.pathname.startsWith("/dashboard") ||
    nextUrl.pathname.startsWith("/sessions") ||
    nextUrl.pathname.startsWith("/payments") ||
    nextUrl.pathname.startsWith("/profile") ||
    isAdminRoute;

  // Redirect unauthenticated users trying to access protected routes
  if (!isLoggedIn && isProtectedRoute) {
    return NextResponse.redirect(new URL("/auth/signin", nextUrl));
  }

  // Redirect logged-in users to onboarding if profile is incomplete
  if (isLoggedIn && !isProfileComplete && !isOnboarding && !isAuthPage) {
    if (isProtectedRoute) {
      return NextResponse.redirect(new URL("/onboarding", nextUrl));
    }
  }

  // A completed profile never needs onboarding again — the form is empty, and
  // resubmitting it would overwrite the member's saved name/phone.
  if (isLoggedIn && isProfileComplete && isOnboarding) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  // Redirect non-admin users away from admin routes
  if (isLoggedIn && isAdminRoute && !isAdmin) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  // Redirect logged-in users away from auth pages
  if (isLoggedIn && isAuthPage && !isDevLoginPage) {
    if (!isProfileComplete) {
      return NextResponse.redirect(new URL("/onboarding", nextUrl));
    }
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|robots.txt).*)",
  ],
};
