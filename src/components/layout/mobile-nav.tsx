'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { LogOut, Menu, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Sheet,
    SheetContent,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLocale } from '@/components/providers/locale-provider';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeToggle } from '@/components/ThemeToggle';
import { CommunityIdentityMark } from '@/components/community/identity-mark';
import { getAdminNav, getMemberViewLink, isNavActive } from './nav-items';

function NavLinks({
    onClose,
    communityName,
    logoUrl,
    pendingPayments,
    waitingApplicants,
}: Readonly<{
    onClose?: () => void;
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
        <div className='flex flex-col h-full'>
            {/* Logo */}
            <div className='flex items-center gap-3 px-4 py-4 border-b border-border'>
                <CommunityIdentityMark
                    communityName={communityName}
                    logoUrl={logoUrl}
                    size='md'
                />
                <span className='font-bold text-foreground'>{communityName}</span>
            </div>

            <nav
                aria-label={t.nav.adminLabel}
                className='flex-1 px-3 py-4 space-y-1 overflow-y-auto'>
                <p className='px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2'>
                    {t.nav.adminLabel}
                </p>
                {ADMIN_NAV.map(({ label, href, icon: Icon, badge }) => {
                    const active = isNavActive(pathname, href);
                    return (
                        <Link
                            key={href}
                            href={href}
                            onClick={onClose}
                            aria-current={active ? 'page' : undefined}
                            className={cn(
                                'flex items-center gap-3 px-3 min-h-11 rounded-lg text-sm font-medium transition-rally focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                active
                                    ? // See sidebar.tsx: Lime tile, Black Green text, plus an
                                      // explicit boundary against a lighter ground.
                                      'bg-sidebar-accent text-sidebar-accent-foreground font-semibold border border-sidebar-accent-border'
                                    : 'text-foreground border border-transparent hover:bg-white/5',
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
            <nav aria-label={t.nav.mainLabel} className='px-3'>
                <Link
                    href={memberViewLink.href}
                    onClick={onClose}
                    className='flex items-center gap-3 px-3 min-h-11 rounded-lg text-sm font-medium text-primary hover:bg-white/5 transition-rally focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'>
                    <memberViewLink.icon className='w-4 h-4 shrink-0' />
                    {memberViewLink.label}
                </Link>
            </nav>

            <div className='border-t border-border p-4'>
                <div className='flex items-center gap-3 mb-3'>
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
                        <p className='text-sm font-medium text-foreground truncate'>
                            {session?.user?.name ?? '—'}
                        </p>
                    </div>
                </div>
                <LanguageSwitcher />
                <ThemeToggle />
                <Link
                    href='/profile'
                    onClick={onClose}
                    className='flex items-center gap-2 px-2 py-1.5 min-h-11 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-white/5 transition-rally w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'>
                    <User className='w-4 h-4 shrink-0' />
                    {t.nav.profile}
                </Link>
                <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className='flex items-center gap-2 text-sm text-destructive hover:bg-white/5 px-1 mt-1 w-full min-h-11 rounded transition-rally focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'>
                    <LogOut className='w-4 h-4' />
                    {t.nav.signOut}
                </button>
            </div>
        </div>
    );
}

export function MobileNav({
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
    const [open, setOpen] = useState(false);
    const { locale } = useLocale();
    const t = getDictionary(locale);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant='ghost' size='icon' className='md:hidden min-h-11 min-w-11'>
                    <Menu className='w-5 h-5' />
                    <span className='sr-only'>{t.nav.navigationMenu}</span>
                </Button>
            </SheetTrigger>
            {/* `dark` forces the sheet's own subtree — including its default
                close button — to the shell's Black Green rendering in both
                themes, the same way sidebar.tsx forces the desktop rail. */}
            <SheetContent
                side='left'
                className='dark p-0 w-64 bg-background text-foreground border-border'>
                <SheetTitle className='sr-only'>{t.nav.navigationMenu}</SheetTitle>
                <NavLinks
                    onClose={() => setOpen(false)}
                    communityName={communityName}
                    logoUrl={logoUrl}
                    pendingPayments={pendingPayments}
                    waitingApplicants={waitingApplicants}
                />
            </SheetContent>
        </Sheet>
    );
}
