import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const isLoggedIn = !!session?.user;
  const isAdmin = session?.user?.role === "ADMIN";
  const isProfileComplete = session?.user?.isProfileComplete ?? false;

  const isAuthPage = nextUrl.pathname.startsWith("/auth");
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

  // Redirect non-admin users away from admin routes
  if (isLoggedIn && isAdminRoute && !isAdmin) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  // Redirect logged-in users away from auth pages
  if (isLoggedIn && isAuthPage) {
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
