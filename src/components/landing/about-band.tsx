import type { Dictionary } from '@/lib/i18n/dictionaries';
import { Band, BandHead } from './band';

/**
 * The Admin's paragraph about their community, in their own words.
 *
 * The band renders only when there is a paragraph — `getPublicCopy` resolves an
 * unwritten one to `null`, and an unwritten band is an absent band rather than
 * a band of filler. The caller is what decides that, so this component is never
 * asked to render nothing.
 *
 * Prose on the page ground rather than inside a card. A card is for a set of
 * comparable objects, and this is one paragraph; putting it on a face would
 * make the page's only piece of continuous reading look like the smallest of
 * the Activity cards.
 *
 * The head is the dictionary's, in the visitor's locale; the paragraph is the
 * Admin's, shown as written in both locales. That split is the whole of the
 * superseded copy-authority decision: the product still names its own sections,
 * and the community still says its own things.
 */
export function AboutBand({
    t,
    about,
}: Readonly<{ t: Dictionary; about: string }>) {
    return (
        <Band>
            <BandHead head={t.landing.about.head} />
            {/* `whitespace-pre-line` is the one piece of formatting this field
                keeps. `public-copy.ts` trims the surrounding whitespace and
                interprets nothing else — no markdown, no links, no HTML — so a
                paragraph the Admin broke into three stays three, and a stray
                `<b>` is text. Body at a 65ch measure, which is the measure the
                role is authored for; the 600-character cap is about four lines
                of it. */}
            <p className='type-body max-w-[65ch] whitespace-pre-line text-secondary-foreground'>
                {about}
            </p>
        </Band>
    );
}
