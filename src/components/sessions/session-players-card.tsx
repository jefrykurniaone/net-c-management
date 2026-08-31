import type { Dictionary } from '@/lib/i18n/dictionaries';
import { PlayerList, type PlayerItem } from './player-list';

/**
 * The session detail page's players card: how many Seats are filled, the fill
 * bar, and the roster with each Participant's own attendance chip. Split out
 * of the page itself so the page composes cards rather than drawing one
 * inline — the same reason the header and the facts card are their own files.
 */

const CARD_CLASS = 'rounded-xl bg-card shadow-lift p-block';
const FILL_TRACK_CLASS =
    'mb-3 h-[5px] overflow-hidden rounded-full bg-muted';

export interface SessionPlayersCardData {
    readonly players: readonly PlayerItem[];
    readonly attendeeCount: number;
    readonly maxPlayers: number;
    readonly fillPercent: number;
}

export function SessionPlayersCard({
    data,
    locale,
    t,
}: Readonly<{
    data: SessionPlayersCardData;
    locale: string;
    t: Dictionary;
}>) {
    return (
        <div className={CARD_CLASS}>
            <div className='mb-3 flex items-center justify-between'>
                <h2 className='type-title text-card-foreground'>
                    {t.sessions.playersLabel}
                </h2>
                <p className='type-figure tabular-nums text-card-foreground'>
                    {data.attendeeCount}
                    <span className='font-normal text-subtle-foreground'>
                        /{data.maxPlayers}
                    </span>
                </p>
            </div>
            <div className={FILL_TRACK_CLASS}>
                <div
                    className='h-full rounded-full bg-primary'
                    style={{ width: `${data.fillPercent}%` }}
                />
            </div>
            {data.players.length === 0 ? (
                <p className='py-4 text-center type-body text-muted-foreground'>
                    {t.sessions.noAttendees}
                </p>
            ) : (
                <PlayerList
                    players={[...data.players]}
                    youLabel={locale === 'id' ? 'Kamu' : 'you'}
                    showAllTemplate={t.sessions.showAllPlayers}
                    chipLabels={t.chips}
                />
            )}
        </div>
    );
}
