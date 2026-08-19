/**
 * PROTOTYPE — throwaway (wayfinder ticket 11).
 * The Admin's admission queue, three placements on one route, inside the real
 * admin shell (real sidebar, real auth, real users) so density is judged in
 * context rather than in a vacuum:
 *
 *   npm run dev  →  http://localhost:3000/admin/prototype-queue?variant=A
 *   ?variant=A|B|C  ?filter=all|waiting|member|declined  ?lang=en|id
 *
 * `User.admittedAt` does not exist yet (05 specified it, no migration has run),
 * so "waiting" is synthesised: the newest profile-complete, non-revoked MEMBERs
 * stand in for Applicants, and revoked users stand in for declined ones.
 * Nothing on this route writes.
 */

import { Suspense } from 'react';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAdminRole } from '@/lib/utils';
import { redirect } from 'next/navigation';
import { PrototypeSwitcher } from '@/components/prototype/prototype-switcher';
import { queueCopy, type ProtoLang } from './proto-copy';
import {
    QueueVariantA,
    QueueVariantB,
    QueueVariantC,
    type QueueFilter,
    type QueuePerson,
    type QueueVariantProps,
} from './variants';

const VARIANTS = [
    { key: 'A', name: 'Band above roster' },
    { key: 'B', name: 'Its own surface' },
    { key: 'C', name: 'One register, filtered' },
] as const;

/** How many recent users stand in for Applicants while `admittedAt` is unbuilt. */
const SYNTH_WAITING = 3;
const ROSTER_TAKE = 24;
const MS_PER_DAY = 86_400_000;

function one(value: string | string[] | undefined): string | undefined {
    return Array.isArray(value) ? value[0] : value;
}

function pickVariant(raw: string | undefined): string {
    const found = VARIANTS.find((v) => v.key === raw);
    return found ? found.key : 'A';
}

function pickFilter(raw: string | undefined): QueueFilter {
    const allowed: readonly QueueFilter[] = ['all', 'waiting', 'member', 'declined'];
    return allowed.find((f) => f === raw) ?? 'all';
}

function pickLang(raw: string | undefined): ProtoLang {
    return raw === 'id' ? 'id' : 'en';
}

function waitedFor(since: Date, lang: ProtoLang): string {
    const days = Math.floor((Date.now() - since.getTime()) / MS_PER_DAY);
    if (days <= 0) return lang === 'id' ? 'hari ini' : 'today';
    return lang === 'id' ? `${days} hari` : `${days}d`;
}

export default async function PrototypeQueuePage({
    searchParams,
}: Readonly<{
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
    const session = await auth();
    if (!isAdminRole(session?.user?.role)) redirect('/dashboard');

    const sp = await searchParams;
    const variant = pickVariant(one(sp.variant));
    const filter = pickFilter(one(sp.filter));
    const lang = pickLang(one(sp.lang));
    const intl = lang === 'id' ? 'id-ID' : 'en-GB';

    const rows = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: ROSTER_TAKE,
        select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            isActive: true,
            createdAt: true,
            memberships: {
                where: { isActive: true, activity: { isActive: true } },
                select: { activity: { select: { id: true, name: true, color: true } } },
            },
        },
    });

    const askedFmt = new Intl.DateTimeFormat(intl, { day: 'numeric', month: 'short' });

    // Stand-in states: the newest plain MEMBERs read as Applicants, revoked
    // users as declined, everyone else as admitted.
    const synthIds = new Set(
        rows
            .filter((r) => r.isActive && r.role === 'MEMBER')
            .slice(0, SYNTH_WAITING)
            .map((r) => r.id),
    );

    function stateOf(row: (typeof rows)[number]): QueuePerson['state'] {
        if (!row.isActive) return 'declined';
        return synthIds.has(row.id) ? 'waiting' : 'member';
    }

    const everyone: QueuePerson[] = rows.map((r) => ({
        id: r.id,
        name: r.name ?? '—',
        email: r.email ?? '—',
        phone: r.phone ?? '',
        askedAt: askedFmt.format(r.createdAt),
        waitedFor: waitedFor(r.createdAt, lang),
        state: stateOf(r),
        activities: r.memberships.map((m) => m.activity),
    }));

    const props: QueueVariantProps = {
        copy: queueCopy(lang),
        waiting: everyone.filter((p) => p.state === 'waiting'),
        everyone,
        filter,
        filterHref: (f) => `/admin/prototype-queue?variant=${variant}&lang=${lang}&filter=${f}`,
    };

    return (
        <>
            {variant === 'A' && <QueueVariantA {...props} />}
            {variant === 'B' && <QueueVariantB {...props} />}
            {variant === 'C' && <QueueVariantC {...props} />}
            <Suspense fallback={null}>
                <PrototypeSwitcher
                    variants={VARIANTS}
                    current={variant}
                    toggles={[{ param: 'lang', values: ['en', 'id'], label: 'lang' }]}
                />
            </Suspense>
        </>
    );
}
