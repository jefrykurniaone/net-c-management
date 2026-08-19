import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/utils";
import { NextResponse } from "next/server";

/**
 * Layer one of three. Middleware routes *pages*; it deliberately does not carry
 * the whole gate, because its matcher covers API routes while the path list
 * below does not — see `src/lib/admission.ts` for the API boundary and the
 * layout guards in `(main)`/`(admin)` for layer two.
 */

/** Who is asking. */
type Viewer = Readonly<{
    isLoggedIn: boolean;
    isAdmin: boolean;
    isProfileComplete: boolean;
    isAdmitted: boolean;
}>;

/** Where they are asking for. */
type Where = Readonly<{
    isAuthPage: boolean;
    isDevLoginPage: boolean;
    isOnboarding: boolean;
    isPending: boolean;
    isAdminRoute: boolean;
    isProtectedRoute: boolean;
}>;

const ONBOARDING = "/onboarding";
const PENDING = "/pending";
const DASHBOARD = "/dashboard";
const SIGN_IN = "/auth/signin";

function readWhere(pathname: string): Where {
    const isAdminRoute = pathname.startsWith("/admin");
    const isPending = pathname === PENDING;
    return {
        isAuthPage: pathname.startsWith("/auth"),
        // Dev-only login page (/auth/dev) must stay reachable even when logged
        // in, so you can switch between the seeded users. Never matches in
        // production.
        isDevLoginPage:
            process.env.NODE_ENV !== "production" && pathname === "/auth/dev",
        isOnboarding: pathname === ONBOARDING,
        isPending,
        isAdminRoute,
        isProtectedRoute:
            pathname.startsWith(DASHBOARD) ||
            pathname.startsWith("/sessions") ||
            pathname.startsWith("/payments") ||
            pathname.startsWith("/profile") ||
            isPending ||
            isAdminRoute,
    };
}

/**
 * The one room this viewer belongs in, in order: profile first, admission
 * second, the app third. An Applicant's `isProfileComplete` and `Membership`
 * rows are inert while the door is shut, so the order is not negotiable — the
 * Admin judges a person with a phone number.
 */
function homeFor(viewer: Viewer): string {
    if (!viewer.isProfileComplete) return ONBOARDING;
    if (!viewer.isAdmitted) return PENDING;
    return DASHBOARD;
}

function redirectFor(viewer: Viewer, where: Where): string | null {
    if (!viewer.isLoggedIn) {
        return where.isProtectedRoute ? SIGN_IN : null;
    }

    const home = homeFor(viewer);

    // Signed in, so no door is needed. A completed profile never needs
    // onboarding again — the form loads empty and resubmitting would overwrite
    // the saved name/phone — and an admitted member has no business waiting.
    if (where.isAuthPage) return where.isDevLoginPage ? null : home;
    if (where.isOnboarding) return home === ONBOARDING ? null : home;
    if (where.isPending) return home === PENDING ? null : home;

    if (!where.isProtectedRoute) return null;
    if (home !== DASHBOARD) return home;
    if (where.isAdminRoute && !viewer.isAdmin) return DASHBOARD;
    return null;
}

export default auth((req) => {
    const { nextUrl, auth: session } = req;
    const viewer: Viewer = {
        isLoggedIn: !!session?.user,
        isAdmin: isAdminRole(session?.user?.role),
        isProfileComplete: session?.user?.isProfileComplete ?? false,
        // Revoked counts as not admitted for routing: a member an Admin threw
        // out lands on the same page an Applicant does, marked differently.
        isAdmitted:
            (session?.user?.isAdmitted ?? false) &&
            (session?.user?.isActive ?? false),
    };

    const target = redirectFor(viewer, readWhere(nextUrl.pathname));
    if (target) {
        return NextResponse.redirect(new URL(target, nextUrl));
    }
    return NextResponse.next();
});

export const config = {
    matcher: [
        "/((?!api/auth|_next/static|_next/image|favicon.ico|robots.txt).*)",
    ],
};
