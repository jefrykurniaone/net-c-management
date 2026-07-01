'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { ShieldCheck, User, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn, isAdminRole } from '@/lib/utils';
import { useLocale } from '@/components/providers/locale-provider';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeToggle } from '@/components/ThemeToggle';
import { CommunityIdentityMark } from '@/components/community/identity-mark';
import { getMemberNav, isNavActive, type NavItem } from './nav-items';

type ShellProps = Readonly<{ communityName: string; logoUrl?: string }>;

/** Nav items shared by both surfaces: member core (+ Profile on mobile) + Admin entry when admin. */
function useMemberItems({ withProfile }: { withProfile: boolean }): NavItem[] {
    const { data: session } = useSession();
    const { locale } = useLocale();
    const t = getDictionary(locale);
    const items = getMemberNav(t);
    if (withProfile) {
        items.push({ label: t.nav.profile, href: '/profile', icon: User });
    }
    if (isAdminRole(session?.user?.role)) {
        items.push({ label: t.nav.admin, href: '/admin', icon: ShieldCheck });
    }
    return items;
}

function IdentityMark({ communityName, logoUrl }: ShellProps) {
    return (
        <div className='flex items-center gap-2 min-w-0'>
            <CommunityIdentityMark
                communityName={communityName}
                logoUrl={logoUrl}
                size='sm'
            />
            <span className='font-bold text-foreground text-sm truncate'>
                {communityName}
            </span>
        </div>
    );
}

function ProfileMenu() {
    const { data: session } = useSession();
    const { locale } = useLocale();
    const t = getDictionary(locale);
    const initials =
        session?.user?.name
            ?.split(' ')
            .slice(0, 2)
            .map((n) => n[0])
            .join('')
            .toUpperCase() ?? '?';

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                aria-label={t.nav.profile}
                className='rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'>
                <Avatar className='w-9 h-9'>
                    <AvatarImage
                        src={session?.user?.image ?? ''}
                        alt={session?.user?.name ?? ''}
                    />
                    <AvatarFallback className='bg-primary/10 text-primary text-xs font-semibold'>
                        {initials}
                    </AvatarFallback>
                </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-56 p-2'>
                <DropdownMenuLabel className='truncate'>
                    {session?.user?.name ?? '—'}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <Link
                    href='/profile'
                    className='flex items-center gap-2 px-2 py-2 min-h-11 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'>
                    <User className='w-4 h-4 shrink-0' />
                    {t.nav.profile}
                </Link>
                <LanguageSwitcher />
                <ThemeToggle />
                <DropdownMenuSeparator />
                <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className='flex items-center gap-2 px-2 py-2 min-h-11 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'>
                    <LogOut className='w-4 h-4 shrink-0' />
                    {t.nav.signOut}
                </button>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

/** Sticky top bar: identity mark + inline desktop nav (≥ md) + profile menu. */
export function MemberTopBar({ communityName, logoUrl }: ShellProps) {
    const pathname = usePathname();
    const { locale } = useLocale();
    const t = getDictionary(locale);
    const items = useMemberItems({ withProfile: false });

    return (
        <header className='sticky top-0 z-30 flex items-center gap-4 px-4 py-3 bg-card border-b border-border'>
            <IdentityMark communityName={communityName} logoUrl={logoUrl} />
            <nav
                aria-label={t.nav.mainLabel}
                className='hidden md:flex items-center gap-1 ml-2'>
                {items.map(({ label, href, icon: Icon }) => {
                    const active = isNavActive(pathname, href);
                    return (
                        <Link
                            key={href}
                            href={href}
                            aria-current={active ? 'page' : undefined}
                            className={cn(
                                'flex items-center gap-2 px-3 min-h-11 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                active
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                            )}>
                            <Icon className='w-4 h-4 shrink-0' />
                            {label}
                        </Link>
                    );
                })}
            </nav>
            <div className='ml-auto'>
                <ProfileMenu />
            </div>
        </header>
    );
}

/** Fixed bottom tab bar — mobile only (< md). */
export function MemberBottomNav() {
    const pathname = usePathname();
    const { locale } = useLocale();
    const t = getDictionary(locale);
    const items = useMemberItems({ withProfile: true });

    return (
        <nav
            aria-label={t.nav.mainLabel}
            className='md:hidden fixed bottom-0 inset-x-0 z-30 flex items-stretch justify-around bg-card border-t border-border pb-[env(safe-area-inset-bottom)]'>
            {items.map(({ label, shortLabel, href, icon: Icon }) => {
                const active = isNavActive(pathname, href);
                return (
                    <Link
                        key={href}
                        href={href}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                            'flex flex-1 flex-col items-center justify-center gap-1 py-2 min-h-14 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                            active
                                ? 'text-primary'
                                : 'text-muted-foreground hover:text-foreground',
                        )}>
                        <Icon className='w-5 h-5 shrink-0' />
                        <span className='truncate max-w-full px-1'>
                            {shortLabel ?? label}
                        </span>
                    </Link>
                );
            })}
        </nav>
    );
}
