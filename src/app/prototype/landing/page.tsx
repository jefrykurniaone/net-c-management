/**
 * PROTOTYPE — throwaway (wayfinder ticket 07).
 * Three compositions of the public landing page on one route.
 *
 *   npm run dev  →  http://localhost:3000/prototype/landing?variant=A
 *
 * Toggles, from the floating bar or the query string:
 *   ?variant=A|B|C            the three band inventories
 *   ?data=demo|real|sparse|empty
 *                             demo   — synthesised, so composition can be judged
 *                                      against a dev DB that has nothing in it
 *                             real   — ticket 04's allow-list, read from Postgres
 *                             sparse — one activity, no sessions
 *                             empty  — a fresh deployment (PRODUCT.md:103)
 *   ?lang=en|id               the longer Indonesian
 *   ?w=phone|full             a 390px frame; `phone` also swaps the hero and
 *                             wordmark type's `vw` for `cqw` so they really do
 *                             shrink instead of sitting at desktop size
 *   ?name=<text>              override the community name, to stress-test a
 *                             long or single-word runtime name (PRODUCT.md:86)
 *
 * Read-only. The hero's form is a no-op stub — see `stub-action.ts`.
 */

import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings';
import { PrototypeSwitcher } from '@/components/prototype/prototype-switcher';
import { landingCopy, type LandingCopy, type ProtoLang } from './proto-copy';
import { HeroBand, IdentityRail, LandingFooter } from './parts';
import type { ProtoActivity, ProtoSession } from './parts';
import { VariantA, VariantB, VariantC, type VariantProps } from './variants';

const VARIANTS = [
    { key: 'A', name: 'Ledger — two bands + closing CTA' },
    { key: 'B', name: 'One board — single fused band' },
    { key: 'C', name: 'Schedule-led — empty bands vanish' },
] as const;

/** Ticket 04: the next three SCHEDULED sessions, and nothing else. */
const SESSION_TAKE = 3;

type DataMode = 'demo' | 'real' | 'sparse' | 'empty';

function one(value: string | string[] | undefined): string | undefined {
    return Array.isArray(value) ? value[0] : value;
}

function pickLang(raw: string | undefined): ProtoLang {
    return raw === 'id' ? 'id' : 'en';
}

function pickVariant(raw: string | undefined): string {
    const found = VARIANTS.find((v) => v.key === raw);
    return found ? found.key : 'A';
}

function pickData(raw: string | undefined): DataMode {
    const modes: readonly DataMode[] = ['demo', 'real', 'sparse', 'empty'];
    const found = modes.find((m) => m === raw);
    return found ?? 'demo';
}

/* ── formatting ──────────────────────────────────────────────────────────── */

function rupiah(amount: number): string {
    return `Rp ${new Intl.NumberFormat('id-ID').format(amount)}`;
}

/**
 * Ticket 04: fees publish **including zero**, rendered as Free/Gratis through
 * the dictionary; both modes show, monthly primary.
 */
function feeLines(
    a: Readonly<{
        monthlyFee: number;
        sessionFee: number;
        allowsMonthly: boolean;
        allowsPerSession: boolean;
    }>,
    copy: LandingCopy,
): Readonly<{ primary: string; secondary: string | null }> {
    const monthly = a.monthlyFee === 0 ? copy.labels.free : `${rupiah(a.monthlyFee)} ${copy.labels.perMonth}`;
    const perSession =
        a.sessionFee === 0 ? copy.labels.free : `${rupiah(a.sessionFee)} ${copy.labels.perSession}`;

    if (a.allowsMonthly && a.allowsPerSession) return { primary: monthly, secondary: perSession };
    if (a.allowsPerSession) return { primary: perSession, secondary: null };
    return { primary: monthly, secondary: null };
}

function weeklySlot(
    day: number | null,
    start: string,
    end: string,
    copy: LandingCopy,
): string | null {
    if (day === null || day < 0 || day > 6) return null;
    return `${copy.days[day]} · ${start}–${end}`;
}

function initialOf(name: string): string {
    return name.trim().charAt(0).toUpperCase() || '·';
}

/* ── data ────────────────────────────────────────────────────────────────── */

type RawActivity = Readonly<{
    id: string;
    name: string;
    recurringDay: number | null;
    recurringStartTime: string;
    recurringEndTime: string;
    defaultLocation: string;
    monthlyFee: number;
    sessionFee: number;
    allowsMonthly: boolean;
    allowsPerSession: boolean;
}>;

function toActivity(raw: RawActivity, copy: LandingCopy): ProtoActivity {
    const fees = feeLines(raw, copy);
    return {
        id: raw.id,
        name: raw.name,
        initial: initialOf(raw.name),
        weeklySlot: weeklySlot(raw.recurringDay, raw.recurringStartTime, raw.recurringEndTime, copy),
        location: raw.defaultLocation,
        feePrimary: fees.primary,
        feeSecondary: fees.secondary,
    };
}

const DEMO_ACTIVITIES: readonly RawActivity[] = [
    {
        id: 'demo-1',
        name: 'Badminton',
        recurringDay: 2,
        recurringStartTime: '19:00',
        recurringEndTime: '21:00',
        defaultLocation: 'GOR Cendrawasih, Lapangan 3',
        monthlyFee: 150000,
        sessionFee: 25000,
        allowsMonthly: true,
        allowsPerSession: true,
    },
    {
        id: 'demo-2',
        name: 'Futsal',
        recurringDay: 5,
        recurringStartTime: '20:00',
        recurringEndTime: '22:00',
        defaultLocation: 'Lapangan Merdeka',
        monthlyFee: 0,
        sessionFee: 40000,
        allowsMonthly: false,
        allowsPerSession: true,
    },
    {
        id: 'demo-3',
        name: 'Tenis Meja',
        recurringDay: 0,
        recurringStartTime: '07:00',
        recurringEndTime: '09:00',
        defaultLocation: 'Balai Warga RW 04',
        monthlyFee: 0,
        sessionFee: 0,
        allowsMonthly: true,
        allowsPerSession: false,
    },
];

function demoSessions(copy: LandingCopy, intl: string): ProtoSession[] {
    // Fixed dates: a prototype that renders differently every day is a prototype
    // nobody can compare two screenshots of.
    const seeds = [
        { id: 'ds-1', activityId: 'demo-1', name: 'Badminton', iso: '2026-08-25', time: '19:00–21:00', where: 'GOR Cendrawasih, Lapangan 3' },
        { id: 'ds-2', activityId: 'demo-2', name: 'Futsal', iso: '2026-08-28', time: '20:00–22:00', where: 'Lapangan Merdeka' },
        { id: 'ds-3', activityId: 'demo-1', name: 'Badminton', iso: '2026-09-01', time: '19:00–21:00', where: 'GOR Cendrawasih, Lapangan 3' },
    ];
    return seeds.map((s) => {
        const date = new Date(`${s.iso}T00:00:00`);
        return {
            id: s.id,
            activityId: s.activityId,
            activityName: s.name,
            activityInitial: initialOf(s.name),
            dayLabel: new Intl.DateTimeFormat(intl, { weekday: 'short' }).format(date),
            dateNumeral: new Intl.DateTimeFormat(intl, { day: 'numeric' }).format(date),
            monthLabel: new Intl.DateTimeFormat(intl, { month: 'short' }).format(date),
            timeLabel: s.time,
            location: s.where,
        };
    });
}

async function realData(
    copy: LandingCopy,
    intl: string,
): Promise<Readonly<{ activities: ProtoActivity[]; sessions: ProtoSession[] }>> {
    const [activityRows, sessionRows] = await Promise.all([
        prisma.activity.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' },
            // Hand-written select only — ticket 04's choke point rule. `include`
            // would drag bank details and adminWhatsapp onto a public page.
            select: {
                id: true,
                name: true,
                recurringDay: true,
                recurringStartTime: true,
                recurringEndTime: true,
                defaultLocation: true,
                monthlyFee: true,
                sessionFee: true,
                allowsMonthly: true,
                allowsPerSession: true,
            },
        }),
        prisma.activitySession.findMany({
            where: { status: 'SCHEDULED', activity: { isActive: true } },
            orderBy: { date: 'asc' },
            take: SESSION_TAKE,
            select: {
                id: true,
                date: true,
                startTime: true,
                endTime: true,
                // No `location`, no `title`, no `notes`, no `maxPlayers`:
                // ticket 04 withheld all four.
                activity: { select: { id: true, name: true, defaultLocation: true } },
            },
        }),
    ]);

    return {
        activities: activityRows.map((r) => toActivity(r, copy)),
        sessions: sessionRows.map((r) => ({
            id: r.id,
            activityId: r.activity.id,
            activityName: r.activity.name,
            activityInitial: initialOf(r.activity.name),
            dayLabel: new Intl.DateTimeFormat(intl, { weekday: 'short' }).format(r.date),
            dateNumeral: new Intl.DateTimeFormat(intl, { day: 'numeric' }).format(r.date),
            monthLabel: new Intl.DateTimeFormat(intl, { month: 'short' }).format(r.date),
            timeLabel: `${r.startTime}–${r.endTime}`,
            location: r.activity.defaultLocation,
        })),
    };
}

async function loadData(
    mode: DataMode,
    copy: LandingCopy,
    intl: string,
): Promise<Readonly<{ activities: ProtoActivity[]; sessions: ProtoSession[] }>> {
    if (mode === 'empty') return { activities: [], sessions: [] };
    if (mode === 'sparse') {
        return { activities: [toActivity(DEMO_ACTIVITIES[0], copy)], sessions: [] };
    }
    if (mode === 'real') return realData(copy, intl);
    return {
        activities: DEMO_ACTIVITIES.map((a) => toActivity(a, copy)),
        sessions: demoSessions(copy, intl),
    };
}

/* ── page ────────────────────────────────────────────────────────────────── */

export default async function PrototypeLandingPage({
    searchParams,
}: Readonly<{
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
    const sp = await searchParams;
    const variant = pickVariant(one(sp.variant));
    const lang = pickLang(one(sp.lang));
    const mode = pickData(one(sp.data));
    const phone = one(sp.w) === 'phone';
    const intl = lang === 'id' ? 'id-ID' : 'en-GB';
    const copy = landingCopy(lang);

    const [settings, data] = await Promise.all([getSettings(), loadData(mode, copy, intl)]);

    // `?name=` stress-tests `PRODUCT.md:86,88` — the community name is runtime
    // config and every surface must survive an unknown one. The rail's failure
    // mode was a long single word painting over the theme toggle, and that is
    // only reproducible with a name nobody has in their dev database.
    const communityName = one(sp.name)?.trim() || settings.communityName;

    const props: VariantProps = {
        copy,
        activities: data.activities,
        sessions: data.sessions,
    };

    const page = (
        <div className='flex min-h-dvh flex-col bg-background'>
            <IdentityRail
                communityName={communityName}
                logoUrl={settings.logoUrl}
                unit={phone ? 'cqw' : 'vw'}
            />
            <HeroBand copy={copy} communityName={communityName} unit={phone ? 'cqw' : 'vw'} />
            <main className='flex-1'>
                {variant === 'A' && <VariantA {...props} />}
                {variant === 'B' && <VariantB {...props} />}
                {variant === 'C' && <VariantC {...props} />}
            </main>
            <LandingFooter communityName={communityName} copy={copy} year='2026' />
        </div>
    );

    return (
        <>
            {phone ? (
                <div className='min-h-dvh bg-neutral-500/20 py-6'>
                    <div className='mx-auto w-[390px] overflow-hidden border-2 border-neutral-700 [container-type:inline-size]'>
                        {page}
                    </div>
                </div>
            ) : (
                page
            )}
            <Suspense fallback={null}>
                <PrototypeSwitcher
                    variants={VARIANTS}
                    current={variant}
                    toggles={[
                        { param: 'data', values: ['demo', 'real', 'sparse', 'empty'], label: 'data' },
                        { param: 'lang', values: ['en', 'id'], label: 'lang' },
                        { param: 'w', values: ['full', 'phone'], label: 'width' },
                    ]}
                />
            </Suspense>
        </>
    );
}
