import type { LucideIcon } from 'lucide-react';
import {
    LayoutDashboard,
    CalendarDays,
    CreditCard,
    Users,
    UserPlus,
    Shapes,
    Settings,
    Home,
    ArrowLeft,
} from 'lucide-react';
import { getDictionary } from '@/lib/i18n/dictionaries';

type Dict = ReturnType<typeof getDictionary>;

export type NavItem = {
    label: string;
    /** Compact label for the member bottom tab bar; falls back to `label`. */
    shortLabel?: string;
    href: string;
    icon: LucideIcon;
    /** Count pill shown after the label (e.g. pending payments). Hidden when 0. */
    badge?: number;
};

/** Live counts surfaced as nav badges. */
export type AdminNavBadges = {
    pendingPayments?: number;
    /** Applicants waiting for a decision — the admission queue's own count. */
    waitingApplicants?: number;
};

/** Member primary nav — the single source of truth for both member shell surfaces. */
export function getMemberNav(t: Dict): NavItem[] {
    return [
        { label: t.nav.dashboard, href: '/dashboard', icon: LayoutDashboard },
        {
            label: t.nav.sessions,
            shortLabel: t.nav.sessionsShort,
            href: '/sessions',
            icon: CalendarDays,
        },
        {
            label: t.nav.payments,
            shortLabel: t.nav.paymentsShort,
            href: '/payments',
            icon: CreditCard,
        },
    ];
}

/** Admin primary nav — rendered by the admin shell (sidebar + sheet). */
export function getAdminNav(t: Dict, badges?: AdminNavBadges): NavItem[] {
    return [
        { label: t.nav.adminDashboard, href: '/admin', icon: Home },
        {
            label: t.nav.adminSessions,
            href: '/admin/sessions',
            icon: CalendarDays,
        },
        {
            label: t.nav.adminPayments,
            href: '/admin/payments',
            icon: CreditCard,
            badge: badges?.pendingPayments,
        },
        // Directly above Members: the queue feeds that register, and it is not a
        // settings-tier concern. Empty on most days — the surface's empty state
        // is part of its design, not an afterthought.
        {
            label: t.nav.adminApplicants,
            href: '/admin/applicants',
            icon: UserPlus,
            badge: badges?.waitingApplicants,
        },
        { label: t.nav.adminMembers, href: '/admin/members', icon: Users },
        { label: t.nav.adminActivity, href: '/admin/activities', icon: Shapes },
        { label: t.nav.adminSettings, href: '/admin/settings', icon: Settings },
    ];
}

/** Whether a nav item is the active route. Mirrors the pre-existing rule. */
export function isNavActive(pathname: string, href: string): boolean {
    if (href === '/admin') return pathname === href;
    return pathname === href || pathname.startsWith(href + '/');
}

/** Cross-shell "back to member view" link — shown by both admin nav surfaces. */
export function getMemberViewLink(t: Dict): NavItem {
    return { label: t.nav.memberView, href: '/dashboard', icon: ArrowLeft };
}
