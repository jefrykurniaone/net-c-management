/**
 * PROTOTYPE — throwaway (wayfinder ticket 11).
 * Three variants of the Applicant's waiting room on one route, switchable via
 * `?variant=A|B|C`, `?state=waiting|declined`, `?lang=en|id`.
 *
 * Read-only: `User.admittedAt` does not exist yet (05 specified it, no
 * migration has run), so the Applicant on screen is synthesised from the signed
 * -in user where there is one and from a stand-in otherwise. Nothing mutates.
 *
 *   npm run dev  →  http://localhost:3000/prototype/pending?variant=A
 */

import { Suspense } from 'react';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings';
import { PrototypeSwitcher } from '@/components/prototype/prototype-switcher';
import { pendingCopy, type ProtoLang } from './proto-copy';
import {
    VariantA,
    VariantB,
    VariantC,
    type ProtoApplicant,
    type ProtoSession,
    type ProtoState,
    type VariantProps,
} from './variants';

const VARIANTS = [
    { key: 'A', name: 'Receipt tile' },
    { key: 'B', name: 'Interstitial' },
    { key: 'C', name: 'Waiting room + board' },
] as const;

const SESSION_TAKE = 3;

/** A stand-in Applicant, for judging the page while signed out. */
const STAND_IN: ProtoApplicant = {
    name: 'Wulandari Prasetyaningrum',
    phone: '6281200000009',
    email: 'wulandari.prasetyaningrum@example.com',
    askedAt: '—',
    activities: [],
};

function one(value: string | string[] | undefined): string | undefined {
    return Array.isArray(value) ? value[0] : value;
}

function pickLang(raw: string | undefined): ProtoLang {
    return raw === 'id' ? 'id' : 'en';
}

function pickState(raw: string | undefined): ProtoState {
    return raw === 'declined' ? 'declined' : 'waiting';
}

function pickVariant(raw: string | undefined): string {
    const found = VARIANTS.find((v) => v.key === raw);
    return found ? found.key : 'A';
}

export default async function PrototypePendingPage({
    searchParams,
}: Readonly<{
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
    const sp = await searchParams;
    const variant = pickVariant(one(sp.variant));
    const state = pickState(one(sp.state));
    const lang = pickLang(one(sp.lang));
    const intl = lang === 'id' ? 'id-ID' : 'en-GB';

    const [session, settings, rows] = await Promise.all([
        auth(),
        getSettings(),
        prisma.activitySession.findMany({
            where: { status: 'SCHEDULED', activity: { isActive: true } },
            orderBy: { date: 'asc' },
            take: SESSION_TAKE,
            select: {
                id: true,
                date: true,
                startTime: true,
                endTime: true,
                location: true,
                activity: { select: { name: true, color: true, defaultLocation: true } },
            },
        }),
    ]);

    let applicant = STAND_IN;
    if (session?.user?.id) {
        const me = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                name: true,
                email: true,
                phone: true,
                createdAt: true,
                memberships: {
                    where: { isActive: true },
                    select: { activity: { select: { id: true, name: true, color: true } } },
                },
            },
        });
        if (me) {
            applicant = {
                name: me.name ?? '—',
                phone: me.phone ?? '—',
                email: me.email ?? '—',
                askedAt: new Intl.DateTimeFormat(intl, {
                    day: 'numeric',
                    month: 'short',
                }).format(me.createdAt),
                activities: me.memberships.map((m) => m.activity),
            };
        }
    }

    const sessions: ProtoSession[] = rows.map((r) => ({
        id: r.id,
        activityName: r.activity.name,
        activityColor: r.activity.color,
        dateLabel: new Intl.DateTimeFormat(intl, {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
        }).format(r.date),
        timeLabel: `${r.startTime}–${r.endTime}`,
        // 04 withheld the per-session location from `/`. Whether an Applicant
        // is inside or outside that boundary is one of this ticket's questions,
        // so the variant shows the Activity's default and never the override.
        location: r.activity.defaultLocation || '—',
    }));

    const props: VariantProps = {
        state,
        copy: pendingCopy(lang),
        communityName: settings.communityName,
        adminWhatsapp: settings.adminWhatsapp,
        applicant,
        sessions,
    };

    return (
        <>
            {variant === 'A' && <VariantA {...props} />}
            {variant === 'B' && <VariantB {...props} />}
            {variant === 'C' && <VariantC {...props} />}
            <Suspense fallback={null}>
                <PrototypeSwitcher
                    variants={VARIANTS}
                    current={variant}
                    toggles={[
                        { param: 'state', values: ['waiting', 'declined'], label: 'state' },
                        { param: 'lang', values: ['en', 'id'], label: 'lang' },
                    ]}
                />
            </Suspense>
        </>
    );
}
