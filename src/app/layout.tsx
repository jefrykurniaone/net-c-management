import type { Metadata } from 'next';
import { Archivo } from 'next/font/google';
import './globals.css';
import { auth } from '@/lib/auth';
import { AuthProvider } from '@/components/providers/auth-provider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { Toaster } from '@/components/ui/sonner';
import { getAppUrl } from '@/lib/app-url';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { LocaleProvider } from '@/components/providers/locale-provider';
import { Analytics } from '@vercel/analytics/next';

// One family, loaded as a variable font on both of its axes: weight
// 100–900 and width 62–125. The width axis is what gives Rally a
// condensed heavy display face (the Display role sets `wdth` 66) and a
// neutral grotesque for everything else out of a single download,
// instead of a second family — see `src/app/styles/type-roles.css`.
//
// `axes` is only accepted when the weight is variable: `next/font`
// rejects it outright against a static weight list
// (`validate-google-font-function-call.js`, "Axes can only be defined
// for variable fonts when the weight property is nonexistent or set to
// `variable`"), which is why the five static weights this used to
// request are gone. The variable file covers all of them and more.
const archivo = Archivo({
    variable: '--font-archivo',
    subsets: ['latin'],
    weight: 'variable',
    axes: ['wdth'],
});

// This runs on every request to *every* route, which is why it reads the
// dictionary and the locale and **never the database** (ticket 12 decision 4).
// It used to render `${communityName} - ${t.brand.tagline}` off `getSettings()`
// — an uncached `findMany` that made `/` cost two Settings queries per render,
// quietly defeating ticket 10's zero-connections-on-a-cache-hit — and the
// tagline itself put a placeholder brand in software-marketing voice into the
// public `<title>`, which is what ticket 08 banned from `/`.
//
// What remains is a neutral default title, inherited by every route that sets
// none of its own. `/` overrides it with the community name; the authenticated
// route groups keep it, because a per-page tab label across the whole app is a
// different job with a different reader.
//
// `metadataBase` is set here and only here (decision 9). It has to exist at all
// because a relative metadata URL without it is a build error, and the OG image
// below the root segment is exactly such a URL. Reusing the app URL the email
// CTAs already use keeps one answer to "where does this deployment live".
export async function generateMetadata(): Promise<Metadata> {
    const locale = await getLocale();
    const t = getDictionary(locale);
    return {
        metadataBase: new URL(getAppUrl()),
        title: t.brand.defaultTitle,
        // Default-deny indexing, and `/` is the single route that opts back in
        // (decision 7). Stated here rather than only on the authenticated
        // layouts because the middleware makes the real exposure
        // counter-intuitive: an unauthenticated crawler hitting `/dashboard` is
        // 307'd to `/auth/signin`, which is itself a 200 indexable page. So the
        // pages at risk of landing in a search index are the auth pages, not the
        // protected ones — and a route added later inherits the safe answer
        // instead of needing to remember this. The two authenticated layouts
        // restate it, and `src/app/robots.ts` is the second enforcement, because
        // robots.txt is advisory where this tag is not.
        robots: { index: false, follow: false },
        // One card shape for every route (decision 10). The OG image at this
        // segment is 1200x630 and `summary` would crop it to a small square.
        // A route that declares its own `twitter` block replaces this object
        // wholesale, so `/` and `/s/[id]` restate the card there.
        twitter: { card: 'summary_large_image' },
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
            className={`${archivo.variable} h-full antialiased`}
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
