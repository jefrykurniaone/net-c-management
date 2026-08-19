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
        <aside className='flex flex-col h-full w-64 bg-card border-r border-border'>
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
                    <p className='text-[10px] font-medium text-subtle-foreground uppercase tracking-wider'>
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
                                'flex items-center gap-2.5 px-3 min-h-10 rounded-sm text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                active
                                    ? 'bg-accent text-accent-foreground font-semibold'
                                    : 'text-secondary-foreground font-medium hover:bg-muted hover:text-foreground',
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
                    className='flex items-center gap-2 px-3 min-h-10 rounded-lg text-[13px] font-semibold text-primary hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'>
                    <memberViewLink.icon className='w-4 h-4 shrink-0' />
                    {memberViewLink.label}
                </Link>
            </nav>

            {/* User block — compact row that opens a menu (profile, language, theme, sign out) */}
            <div className='border-t border-border p-3'>
                <DropdownMenu>
                    <DropdownMenuTrigger className='flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'>
                        <Avatar className='w-8 h-8'>
                            <AvatarImage
                                src={session?.user?.image ?? ''}
                                alt={session?.user?.name ?? ''}
                            />
                            <AvatarFallback className='bg-primary/10 text-primary text-xs font-semibold'>
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                        <div className='flex-1 min-w-0'>
                            <p className='text-[13px] font-semibold text-foreground truncate'>
                                {session?.user?.name ?? '—'}
                            </p>
                            <p className='text-[11px] text-subtle-foreground truncate'>
                                {formatRole(session?.user?.role) || t.nav.admin}
                            </p>
                        </div>
                        <ChevronsUpDown className='w-4 h-4 shrink-0 text-subtle-foreground' />
                    </DropdownMenuTrigger>
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
