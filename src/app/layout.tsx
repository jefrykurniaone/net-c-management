import type { Metadata } from 'next';
import { Geist, Geist_Mono, Sora } from 'next/font/google';
import './globals.css';
import { auth } from '@/lib/auth';
import { AuthProvider } from '@/components/providers/auth-provider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { Toaster } from '@/components/ui/sonner';
import { getSettings } from '@/lib/settings';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { LocaleProvider } from '@/components/providers/locale-provider';
import { Analytics } from '@vercel/analytics/next';

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
});

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
});

const sora = Sora({
    variable: '--font-sora',
    subsets: ['latin'],
    weight: ['400', '600', '700', '800'],
});

export async function generateMetadata(): Promise<Metadata> {
    const [{ communityName }, locale] = await Promise.all([
        getSettings(),
        getLocale(),
    ]);
    const t = getDictionary(locale);
    return {
        title: `${communityName} - ${t.brand.tagline}`,
        description: `${t.brand.tagline} - ${communityName}`,
    };
}

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const [locale, session] = await Promise.all([getLocale(), auth()]);

    return (
        <html
            lang={locale}
            className={`${geistSans.variable} ${geistMono.variable} ${sora.variable} h-full antialiased`}
            suppressHydrationWarning>
            <body className='min-h-full flex flex-col'>
                <ThemeProvider attribute='class' defaultTheme='system' enableSystem>
                    <AuthProvider session={session}>
                        <LocaleProvider initialLocale={locale}>
                            {children}
                            <Toaster richColors position='top-right' />
                        </LocaleProvider>
                    </AuthProvider>
                </ThemeProvider>
                <Analytics />
            </body>
        </html>
    );
}
