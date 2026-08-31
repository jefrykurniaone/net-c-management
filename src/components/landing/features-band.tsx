import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { PublicFeatureCard } from '@/lib/public-copy';
import { Band, BandGrid, BandHead } from './band';

/**
 * Up to four short cards saying what a member gets once they are in, written by
 * the Admin.
 *
 * `getPublicCopy` has already dropped every untitled slot, so the array that
 * arrives here is exactly what renders, in slot order, and a set with no titled
 * card resolves to an empty array — which the caller reads as "no band". A card
 * with a title and no line is legal and renders as a title alone: the title is
 * the claim and the line only elaborates it.
 *
 * Cards rather than prose, because these are a set of comparable things and
 * that is what a card grid is for. The key is the slot the card was written in,
 * never its array index and never its title: the untitled slots are dropped
 * before the list gets here, and nothing stops an Admin titling two cards the
 * same.
 */
export function FeaturesBand({
    t,
    features,
}: Readonly<{ t: Dictionary; features: readonly PublicFeatureCard[] }>) {
    return (
        <Band>
            <BandHead head={t.landing.features.head} />
            <BandGrid kind='features'>
                {features.map((card) => (
                    <FeatureCard key={card.position} card={card} />
                ))}
            </BandGrid>
        </Band>
    );
}

/**
 * One claim. `h-full` so a row of them shares one height whatever their lines
 * do; both strings are the Admin's, capped at 32 and 120 characters, and both
 * carry `break-words` because a cap in characters is not a cap in width.
 */
function FeatureCard({ card }: Readonly<{ card: PublicFeatureCard }>) {
    return (
        <Card className='h-full'>
            <CardHeader>
                <CardTitle className='min-w-0 break-words'>
                    {card.title}
                </CardTitle>
            </CardHeader>
            {card.line ? (
                <CardContent>
                    <p className='type-body min-w-0 break-words text-secondary-foreground'>
                        {card.line}
                    </p>
                </CardContent>
            ) : null}
        </Card>
    );
}
