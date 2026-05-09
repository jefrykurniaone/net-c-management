'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
    LayoutDashboard,
    CalendarDays,
    CreditCard,
    Users,
    Settings,
    LogOut,
    ShieldCheck,
    Menu,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Sheet,
    SheetContent,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn, communityAbbr } from '@/lib/utils';
import { useLocale } from '@/components/providers/locale-provider';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { LanguageSwitcher } from '@/components/language-switcher';

function NavLinks({
    onClose,
    communityName,
}: Readonly<{ onClose?: () => void; communityName: string }>) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const { locale } = useLocale();
    const t = getDictionary(locale);
    const isAdmin = session?.user?.role === 'ADMIN';
    const initials =
        session?.user?.name
            ?.split(' ')
            .slice(0, 2)
            .map((n) => n[0])
            .join('')
            .toUpperCase() ?? '?';

    const MEMBER_NAV = [
        { label: t.nav.dashboard, href: '/dashboard', icon: LayoutDashboard },
        { label: t.nav.sessions, href: '/sessions', icon: CalendarDays },
        { label: t.nav.payments, href: '/payments', icon: CreditCard },
    ];

    const ADMIN_NAV = [
        { label: t.nav.adminDashboard, href: '/admin', icon: ShieldCheck },
        { label: t.nav.adminSessions, href: '/admin/sessions', icon: CalendarDays },
        { label: t.nav.adminPayments, href: '/admin/payments', icon: CreditCard },
        { label: t.nav.adminMembers, href: '/admin/members', icon: Users },
        { label: t.nav.adminSettings, href: '/admin/settings', icon: Settings },
    ];

    return (
        <div className='flex flex-col h-full'>
            {/* Logo */}
            <div className='flex items-center gap-3 px-4 py-4 border-b border-gray-100'>
                <div className='w-8 h-8 bg-green-600 rounded-full flex items-center justify-center'>
                    <span className='text-white font-bold text-xs'>
                        {communityAbbr(communityName)}
                    </span>
                </div>
                <span className='font-bold text-gray-900'>{communityName}</span>
            </div>

            <nav className='flex-1 px-3 py-4 space-y-1 overflow-y-auto'>
                <p className='px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2'>
                    {t.nav.mainLabel}
                </p>
                {MEMBER_NAV.map(({ label, href, icon: Icon }) => {
                    const isActive =
                        pathname === href || pathname.startsWith(href + '/');
                    return (
                        <Link
                            key={href}
                            href={href}
                            onClick={onClose}
                            className={cn(
                                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium',
                                isActive
                                    ? 'bg-green-50 text-green-700'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                            )}>
                            <Icon className='w-4 h-4' />
                            {label}
                        </Link>
                    );
                })}
                {isAdmin && (
                    <div className='pt-4'>
                        <p className='px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2'>
                            {t.nav.adminLabel}
                        </p>
                        {ADMIN_NAV.map(({ label, href, icon: Icon }) => {
                            const isActive =
                                pathname === href ||
                                (href !== '/admin' &&
                                    pathname.startsWith(href + '/'));
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    onClick={onClose}
                                    className={cn(
                                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium',
                                        isActive
                                            ? 'bg-purple-50 text-purple-700'
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                                    )}>
                                    <Icon className='w-4 h-4' />
                                    {label}
                                </Link>
                            );
                        })}
                    </div>
                )}
            </nav>

            <div className='border-t border-gray-100 p-4'>
                <div className='flex items-center gap-3 mb-3'>
                    <Avatar className='w-8 h-8'>
                        <AvatarImage src={session?.user?.image ?? ''} alt='' />
                        <AvatarFallback className='bg-green-100 text-green-700 text-xs font-semibold'>
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                    <div className='flex-1 min-w-0'>
                        <p className='text-sm font-medium text-gray-900 truncate'>
                            {session?.user?.name ?? '—'}
                        </p>
                    </div>
                </div>
                <LanguageSwitcher />
                <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className='flex items-center gap-2 text-sm text-red-500 hover:text-red-700 px-1 mt-1 w-full'>
                    <LogOut className='w-4 h-4' />
                    {t.nav.signOut}
                </button>
            </div>
        </div>
    );
}

export function MobileNav({
    communityName,
}: Readonly<{ communityName: string }>) {
    const [open, setOpen] = useState(false);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant='ghost' size='icon' className='md:hidden'>
                    <Menu className='w-5 h-5' />
                    <span className='sr-only'>Menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side='left' className='p-0 w-64'>
                <SheetTitle className='sr-only'>Navigation Menu</SheetTitle>
                <NavLinks
                    onClose={() => setOpen(false)}
                    communityName={communityName}
                />
            </SheetContent>
        </Sheet>
    );
}
