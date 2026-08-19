import type { MetadataRoute } from 'next';

/**
 * One indexable route, and a disallow list for everything else (ticket 12
 * decision 7).
 *
 * This is the *second* of two enforcements, not the only one: robots.txt is a
 * request not to crawl, which a well-behaved crawler honours and nothing
 * guarantees, so the `noindex` tag on the routes themselves is what actually
 * keeps them out of an index. Both exist because they fail differently — a tag
 * only works on a page a crawler has already fetched, and a disallow line only
 * works on a crawler that reads it.
 *
 * `/auth` is on the list for the reason that is easy to miss: the middleware
 * 307s an unauthenticated request for `/dashboard` to `/auth/signin`, which
 * answers 200. The authenticated routes are not what a crawler ends up
 * indexing — the sign-in page is.
 *
 * **No sitemap.** One indexable page does not need a file listing it, and a
 * sitemap naming a single URL is ceremony that then has to be kept true.
 */
export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: [
                // Behind auth: the member surfaces, then the admin ones.
                '/dashboard',
                '/sessions',
                '/payments',
                '/profile',
                '/admin',
                // A 200 page an unauthenticated crawler is redirected *to*.
                '/auth',
                '/onboarding',
                // A shared session's time and place should not be searchable,
                // even after decision 1 trimmed the card down to what is
                // publishable — the link is meant to be pasted to someone, not
                // found by a stranger.
                '/s/',
                // Not a page anyone should reach from a search. The throwaway
                // design surfaces this list also named (wayfinder tickets 07 and
                // 11) are deleted now that both winners are folded in, and a
                // disallow line for a route that does not exist is exactly the
                // ceremony the sitemap note below refuses.
                '/api/',
            ],
        },
    };
}
