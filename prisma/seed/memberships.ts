/** Memberships (all payment-mode variants) + monthly/session payment rows. */
import { PaymentMode, PaymentStatus } from '@prisma/client';
import { prisma } from './client';
import { now, CURRENT_KEY, NEXT_KEY, Period, periodOf, monthsAgo } from './dates';
import {
    ACTIVITY_CONFIGS,
    LOGIN_EMAIL,
    ROSTERS,
    PER_SESSION_EMAILS,
    PENDING_SWITCH_NAME,
    UNSELECTED_MODE_NAME,
    TENNIS,
    FUTSAL,
    slugEmail,
} from './config';
import { activityPeriods } from './specs';

interface MembershipModeOpts {
    mode: PaymentMode | null;
    pendingMode?: PaymentMode | null;
    pendingEffectiveFrom?: number | null;
}

export async function upsertMembership(
    userId: string,
    activityId: string,
    opts: MembershipModeOpts,
) {
    const data = {
        isActive: true,
        paymentMode: opts.mode,
        effectiveFrom: opts.mode ? CURRENT_KEY : 0,
        pendingMode: opts.pendingMode ?? null,
        pendingEffectiveFrom: opts.pendingEffectiveFrom ?? null,
    };
    await prisma.membership.upsert({
        where: { userId_activityId: { userId, activityId } },
        update: data,
        create: { userId, activityId, ...data },
    });
}

export async function createMonthlyPayment(
    userId: string,
    activityId: string,
    amount: number,
    period: Period,
    ownerId: string,
    status: PaymentStatus = PaymentStatus.CONFIRMED,
) {
    const isConfirmed = status === PaymentStatus.CONFIRMED;
    await prisma.payment.create({
        data: {
            userId,
            activityId,
            type: 'MONTHLY',
            amount,
            month: period.month,
            year: period.year,
            status,
            notes: 'Seeded payment',
            confirmedBy: isConfirmed ? ownerId || null : null,
            confirmedAt: isConfirmed ? now : null,
        },
    });
}

/** One SESSION-type payment row funding a member's seat in one session. */
export async function createSessionPayment(input: {
    userId: string;
    activityId: string;
    sessionId: string;
    sessionDate: Date;
    amount: number;
    ownerId: string;
    status: PaymentStatus;
}) {
    const period = periodOf(input.sessionDate);
    const isConfirmed = input.status === PaymentStatus.CONFIRMED;
    await prisma.payment.create({
        data: {
            userId: input.userId,
            activityId: input.activityId,
            sessionId: input.sessionId,
            type: 'SESSION',
            amount: input.amount,
            month: period.month,
            year: period.year,
            status: input.status,
            proofUrl: isConfirmed ? null : 'https://placehold.co/600x800/png?text=Transfer+Receipt',
            notes: 'Seeded session payment',
            confirmedBy: isConfirmed ? input.ownerId || null : null,
            confirmedAt: isConfirmed ? now : null,
        },
    });
}

function membershipMode(slug: string, email: string): MembershipModeOpts {
    if (slug === 'badminton' && PER_SESSION_EMAILS.has(email)) {
        return { mode: PaymentMode.PER_SESSION };
    }
    if (slug === 'badminton' && email === slugEmail(PENDING_SWITCH_NAME)) {
        return {
            mode: PaymentMode.MONTHLY,
            pendingMode: PaymentMode.PER_SESSION,
            pendingEffectiveFrom: NEXT_KEY,
        };
    }
    return { mode: PaymentMode.MONTHLY };
}

/** Whether a member's dues for this activity come from MONTHLY payments. */
function paysMonthly(slug: string, email: string): boolean {
    if (slug === 'badminton' && PER_SESSION_EMAILS.has(email)) return false;
    // Adi's Badminton dues stay unpaid → dashboard "Pay now" banner.
    if (slug === 'badminton' && email === LOGIN_EMAIL) return false;
    return true;
}

/**
 * Join every roster member (plus Adi) to each activity and confirm monthly
 * dues, except: Adi-in-Badminton (unpaid banner), the PER_SESSION members
 * (funded per session), and Citra Dewi carries a queued mode switch.
 */
export async function seedMemberships(
    idByEmail: Map<string, string>,
    idBySlug: Map<string, string>,
    ownerId: string,
) {
    for (const cfg of ACTIVITY_CONFIGS) {
        const activityId = idBySlug.get(cfg.slug);
        if (!activityId) throw new Error(`Missing activity ${cfg.slug}`);
        const emails = [LOGIN_EMAIL, ...ROSTERS[cfg.slug].map(slugEmail)];
        for (const email of emails) {
            const userId = idByEmail.get(email);
            if (!userId) throw new Error(`Missing seeded user for ${email}`);
            await upsertMembership(userId, activityId, membershipMode(cfg.slug, email));
            if (!paysMonthly(cfg.slug, email)) continue;
            for (const period of activityPeriods(cfg.slug)) {
                await createMonthlyPayment(userId, activityId, cfg.duesRate, period, ownerId);
            }
        }
    }
    console.log('[ok] Memberships + dues (Adi Badminton UNPAID; 4 PER_SESSION; 1 pending switch)');
}

/** Eka joins Futsal with paymentMode = null → tests the mode-selection flow. */
export async function seedUnselectedModeMember(
    idByEmail: Map<string, string>,
    idBySlug: Map<string, string>,
) {
    const userId = idByEmail.get(slugEmail(UNSELECTED_MODE_NAME));
    const activityId = idBySlug.get('futsal');
    if (!userId || !activityId) throw new Error('Missing Eka or Futsal for unselected-mode seed');
    await upsertMembership(userId, activityId, { mode: null });
    console.log(`[ok] Unselected mode: ${UNSELECTED_MODE_NAME} in Futsal (paymentMode = null)`);
}

/**
 * Extra history rows for Adi so the payments History list shows more than
 * "Approved": one PENDING (In review) and one REJECTED submission in the
 * previous month, where no monthly dues exist yet (keeps the monthly-unique
 * constraint happy). The PENDING row also feeds the admin review queue.
 */
export async function seedHistoryExtras(
    idByEmail: Map<string, string>,
    idBySlug: Map<string, string>,
) {
    const adiId = idByEmail.get(LOGIN_EMAIL);
    if (!adiId) throw new Error('Missing seeded Adi');
    const proofUrl = 'https://placehold.co/600x800/png?text=Transfer+Receipt';
    const prev = periodOf(monthsAgo(1, 2));

    const rows = [
        { slug: 'tennis', fee: TENNIS.duesRate, status: PaymentStatus.PENDING, notes: null, createdAt: monthsAgo(1, 2) },
        { slug: 'futsal', fee: FUTSAL.duesRate, status: PaymentStatus.REJECTED, notes: 'wrong amount', createdAt: monthsAgo(1, 1) },
    ];
    for (const r of rows) {
        const activityId = idBySlug.get(r.slug);
        if (!activityId) throw new Error(`Missing activity ${r.slug}`);
        await prisma.payment.create({
            data: {
                userId: adiId,
                activityId,
                type: 'MONTHLY',
                amount: r.fee,
                month: prev.month,
                year: prev.year,
                status: r.status,
                proofUrl,
                notes: r.notes,
                createdAt: r.createdAt,
            },
        });
    }
    console.log('[ok] History extras: 1 PENDING (Tennis) + 1 REJECTED (Futsal)');
}
