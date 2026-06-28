import { NextResponse, type NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';

/**
 * DEV-ONLY OAuth bypass. A native form POST from /auth/dev hits this handler,
 * which creates a NextAuth database session for the chosen user and redirects to
 * /dashboard.
 *
 * Why a Route Handler (real HTTP 303 redirect) instead of a server action with
 * redirect(): a server-action redirect is a *soft* client navigation, so the
 * root layout does NOT re-run auth() and <SessionProvider> keeps the stale
 * logged-out session — the admin nav then only appears after a manual reload.
 * A full-page navigation re-runs the root layout with the new cookie, so the
 * client session (incl. role) is correct from the first paint.
 *
 * Hard-gated to non-production so it can never ship as a backdoor.
 */

// Auth.js v5 names the cookie `authjs.session-token` over http (dev). The secure
// `__Secure-` prefix only applies in production, which this handler refuses to run in.
const SESSION_COOKIE = 'authjs.session-token';
const SESSION_MAX_AGE_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
    if (process.env.NODE_ENV === 'production') {
        return new NextResponse('Not found', { status: 404 });
    }

    const formData = await req.formData();
    const email = String(formData.get('email') ?? '').trim();
    if (!email) {
        return NextResponse.redirect(new URL('/auth/dev', req.url), 303);
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        return NextResponse.redirect(new URL('/auth/dev', req.url), 303);
    }

    const sessionToken = randomUUID();
    const expires = new Date(Date.now() + SESSION_MAX_AGE_DAYS * MS_PER_DAY);
    await prisma.session.create({
        data: { sessionToken, userId: user.id, expires },
    });

    // 303 forces the browser to GET /dashboard (full navigation) so the root
    // layout re-runs auth() with the cookie just set below.
    const res = NextResponse.redirect(new URL('/dashboard', req.url), 303);
    res.cookies.set(SESSION_COOKIE, sessionToken, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        expires,
    });
    return res;
}
