'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { LogOut, ChevronRight, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useLocale } from '@/components/providers/locale-provider';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeToggle } from '@/components/ThemeToggle';
import { CommunityIdentityMark } from '@/components/community/identity-mark';
import { getAdminNav, getMemberViewLink, isNavActive } from './nav-items';

export function Sidebar({
    communityName,
    logoUrl,
}: Readonly<{ communityName: string; logoUrl?: string }>) {
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

    const ADMIN_NAV = getAdminNav(t);
    const memberViewLink = getMemberViewLink(t);

    return (
        <aside className='flex flex-col h-full w-64 bg-card border-r border-border'>
            {/* Logo */}
            <div className='flex items-center gap-3 px-6 py-5 border-b border-border'>
                <CommunityIdentityMark
                    communityName={communityName}
                    logoUrl={logoUrl}
                    size='md'
                />
                <div>
                    <p className='font-bold text-foreground text-sm leading-tight'>
                        {communityName}
                    </p>
                </div>
            </div>

            {/* Navigation */}
            <nav
                aria-label={t.nav.adminLabel}
                className='flex-1 px-3 py-4 space-y-1 overflow-y-auto'>
                <p className='px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2'>
                    {t.nav.adminLabel}
                </p>
                {ADMIN_NAV.map(({ label, href, icon: Icon }) => {
                    const active = isNavActive(pathname, href);
                    return (
                        <Link
                            key={href}
                            href={href}
                            aria-current={active ? 'page' : undefined}
                            className={cn(
                                'flex items-center gap-3 px-3 min-h-11 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                active
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                            )}>
                            <Icon className='w-4 h-4 shrink-0' />
                            {label}
                            {active && (
                                <ChevronRight className='w-3 h-3 ml-auto text-primary' />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Cross-shell: back to member view (its own landmark, not part of Admin nav) */}
            <nav aria-label={t.nav.mainLabel} className='px-3'>
                <Link
                    href={memberViewLink.href}
                    className='flex items-center gap-3 px-3 min-h-11 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'>
                    <memberViewLink.icon className='w-4 h-4 shrink-0' />
                    {memberViewLink.label}
                </Link>
            </nav>

            {/* User info + logout */}
            <div className='border-t border-border p-4'>
                <div className='flex items-center gap-3 mb-3'>
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
                        <p className='text-sm font-medium text-foreground truncate'>
                            {session?.user?.name ?? '—'}
                        </p>
                        <p className='text-xs text-muted-foreground truncate'>
                            {session?.user?.email ?? '—'}
                        </p>
                    </div>
                </div>
                <Link
                    href='/profile'
                    className='flex items-center gap-2 px-2 py-1.5 min-h-11 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'>
                    <User className='w-4 h-4 shrink-0' />
                    {t.nav.profile}
                </Link>
                <LanguageSwitcher />
                <ThemeToggle />
                <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className='flex items-center gap-2 text-sm text-destructive hover:bg-destructive/10 transition-colors px-1 py-1 mt-1 w-full min-h-11 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'>
                    <LogOut className='w-4 h-4' />
                    {t.nav.signOut}
                </button>
            </div>
        </aside>
    );
}
