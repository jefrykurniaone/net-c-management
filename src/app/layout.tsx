import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
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

export async function generateMetadata(): Promise<Metadata> {
    const [{ communityName }, locale] = await Promise.all([
        getSettings(),
        getLocale(),
    ]);
    const t = getDictionary(locale);
    return {
        title: `${communityName} - ${t.auth.signInSubtitle}`,
        description: `${t.auth.signInSubtitle} ${communityName}`,
    };
}

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const locale = await getLocale();

    return (
        <html
            lang={locale}
            className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
            suppressHydrationWarning>
            <body className='min-h-full flex flex-col'>
                <ThemeProvider attribute='class' defaultTheme='system' enableSystem>
                    <AuthProvider>
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
