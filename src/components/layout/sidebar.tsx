'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { LogOut, User, ChevronsUpDown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useLocale } from '@/components/providers/locale-provider';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeToggle } from '@/components/ThemeToggle';
import { CommunityIdentityMark } from '@/components/community/identity-mark';
import { getAdminNav, getMemberViewLink, isNavActive } from './nav-items';

/** OWNER → "Owner", ADMIN → "Admin" — role shown under the user's name. */
function formatRole(role?: string): string {
    if (!role) return '';
    return role.charAt(0) + role.slice(1).toLowerCase();
}

export function Sidebar({
    communityName,
    logoUrl,
    pendingPayments,
    waitingApplicants,
}: Readonly<{
    communityName: string;
    logoUrl?: string;
    pendingPayments?: number;
    waitingApplicants?: number;
}>) {
    const pathname = usePathname();
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

    const ADMIN_NAV = getAdminNav(t, { pendingPayments, waitingApplicants });
    const memberViewLink = getMemberViewLink(t);

    return (
        // `dark` is forced here rather than left to the page theme: the shell
        // renders Black Green in both themes (DESIGN.md, Implementation
        // Decisions → Shell), so every generic token below (`background`,
        // `foreground`, `muted-foreground`, `border`, `ring`, `primary`,
        // `destructive`) resolves to its already-asserted dark-theme pair
        // regardless of which theme the rest of the page is in. Only the
        // active nav item diverges from the dark theme's own `--accent`
        // (which inverts to olive-on-lime) and reaches for the dedicated
        // `sidebar-accent*` tokens instead — see colors.css.
        <aside className='dark flex flex-col h-full w-64 bg-background text-foreground border-r border-border'>
            {/* Logo */}
            <div className='flex items-center gap-3 px-5 py-5'>
                <CommunityIdentityMark
                    communityName={communityName}
                    logoUrl={logoUrl}
                    size='md'
                />
                <div className='min-w-0'>
                    <p className='font-semibold text-foreground text-[13px] leading-tight truncate'>
                        {communityName}
                    </p>
                    <p className='text-[10px] font-medium text-muted-foreground uppercase tracking-wider'>
                        {t.nav.adminLabel}
                    </p>
                </div>
            </div>

            {/* Navigation */}
            <nav
                aria-label={t.nav.adminLabel}
                className='flex-1 px-3 py-1 space-y-0.5 overflow-y-auto'>
                {ADMIN_NAV.map(({ label, href, icon: Icon, badge }) => {
                    const active = isNavActive(pathname, href);
                    return (
                        <Link
                            key={href}
                            href={href}
                            aria-current={active ? 'page' : undefined}
                            className={cn(
                                'flex items-center gap-2.5 px-3 min-h-10 rounded-sm text-[13px] transition-rally focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                active
                                    ? // Active item: Lime tile, Black Green text (spec). The fill
                                      // alone clears 13.68:1 against the Black Green shell — nowhere
                                      // near the 1.04:1 Lime-on-beige trap the page's own accent can
                                      // hit — but it still carries an explicit boundary
                                      // (`sidebar-accent-border`, 3.18:1 on Lime) per The Boundary
                                      // Rule, in case this state is ever reused against a lighter
                                      // ground.
                                      'bg-sidebar-accent text-sidebar-accent-foreground font-semibold border border-sidebar-accent-border'
                                    : 'text-foreground font-medium border border-transparent hover:bg-white/5',
                            )}>
                            <Icon className='w-4 h-4 shrink-0' />
                            <span className='flex-1'>{label}</span>
                            {badge !== undefined && badge > 0 && (
                                <span className='ml-auto rounded-full bg-warning px-1.5 py-0.5 text-[10.5px] font-semibold leading-none text-warning-foreground tabular-nums'>
                                    {badge}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Cross-shell: back to member view (its own landmark, not part of Admin nav) */}
            <nav aria-label={t.nav.mainLabel} className='px-3 pb-3'>
                <Link
                    href={memberViewLink.href}
                    className='flex items-center gap-2 px-3 min-h-10 rounded-lg text-[13px] font-semibold text-primary hover:bg-white/5 transition-rally focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'>
                    <memberViewLink.icon className='w-4 h-4 shrink-0' />
                    {memberViewLink.label}
                </Link>
            </nav>

            {/* User block — compact row that opens a menu (profile, language, theme, sign out) */}
            <div className='border-t border-border p-3'>
                <DropdownMenu>
                    <DropdownMenuTrigger className='flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-white/5 transition-rally focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'>
                        <Avatar className='w-8 h-8'>
                            <AvatarImage
                                src={session?.user?.image ?? ''}
                                alt={session?.user?.name ?? ''}
                            />
                            <AvatarFallback className='bg-white/10 text-primary text-xs font-semibold'>
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                        <div className='flex-1 min-w-0'>
                            <p className='text-[13px] font-semibold text-foreground truncate'>
                                {session?.user?.name ?? '—'}
                            </p>
                            <p className='text-[11px] text-muted-foreground truncate'>
                                {formatRole(session?.user?.role) || t.nav.admin}
                            </p>
                        </div>
                        <ChevronsUpDown className='w-4 h-4 shrink-0 text-muted-foreground' />
                    </DropdownMenuTrigger>
                    {/* The popover itself is not the shell — it floats on the
                        page's own theme, like every other menu in the app. */}
                    <DropdownMenuContent
                        side='top'
                        align='start'
                        sideOffset={8}
                        className='w-[13.5rem]'>
                        <DropdownMenuItem asChild>
                            <Link href='/profile'>
                                <User className='w-4 h-4 shrink-0' />
                                {t.nav.profile}
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <div className='px-1 py-0.5'>
                            <LanguageSwitcher />
                            <ThemeToggle />
                        </div>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            variant='destructive'
                            onSelect={() => signOut({ callbackUrl: '/' })}>
                            <LogOut className='w-4 h-4 shrink-0' />
                            {t.nav.signOut}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </aside>
    );
}
