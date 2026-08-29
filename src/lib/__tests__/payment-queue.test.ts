import { describe, it, expect } from 'vitest';
import { splitQueuePage } from '../payment-queue';

/**
 * The queue's ordering is arithmetic, so the arithmetic is what can be wrong
 * without anybody noticing: a page that drops a row or shows one twice is a
 * Payment an Admin never decides. Every case below is a page boundary against
 * the awaiting band, which is where an off-by-one would live.
 */

const PAGE_SIZE = 10;

describe('splitQueuePage', () => {
    it('fills a first page from the awaiting band, then tops up from decided', () => {
        expect(splitQueuePage(3, 0, PAGE_SIZE)).toEqual({
            awaiting: { skip: 0, take: 3 },
            decided: { skip: 0, take: 7 },
        });
    });

    it('takes a whole page from the awaiting band when it has more than fits', () => {
        expect(splitQueuePage(25, 0, PAGE_SIZE)).toEqual({
            awaiting: { skip: 0, take: 10 },
            decided: { skip: 0, take: 0 },
        });
    });

    it('offsets the decided band by the awaiting rows an earlier page passed', () => {
        expect(splitQueuePage(3, 10, PAGE_SIZE)).toEqual({
            awaiting: { skip: 3, take: 0 },
            decided: { skip: 7, take: 10 },
        });
    });

    it('straddles the boundary, closing one band and opening the other', () => {
        expect(splitQueuePage(15, 10, PAGE_SIZE)).toEqual({
            awaiting: { skip: 10, take: 5 },
            decided: { skip: 0, take: 5 },
        });
    });

    it('lands exactly on the boundary without skipping a decided row', () => {
        expect(splitQueuePage(10, 10, PAGE_SIZE)).toEqual({
            awaiting: { skip: 10, take: 0 },
            decided: { skip: 0, take: 10 },
        });
    });

    it('gives the whole page to the decided band when nothing is awaiting', () => {
        expect(splitQueuePage(0, 0, PAGE_SIZE)).toEqual({
            awaiting: { skip: 0, take: 0 },
            decided: { skip: 0, take: 10 },
        });
    });

    it('asks for both bands whole when the page size is "show all"', () => {
        expect(splitQueuePage(4, undefined, undefined)).toEqual({
            awaiting: { skip: undefined, take: undefined },
            decided: { skip: undefined, take: undefined },
        });
    });

    it('covers every row exactly once across consecutive pages', () => {
        const awaitingTotal = 7;
        const seen: string[] = [];
        for (let page = 0; page < 3; page += 1) {
            const split = splitQueuePage(
                awaitingTotal,
                page * PAGE_SIZE,
                PAGE_SIZE,
            );
            seen.push(
                ...bandRows('awaiting', split.awaiting, awaitingTotal),
                ...bandRows('decided', split.decided, 20),
            );
        }
        expect(new Set(seen).size).toBe(seen.length);
        expect(seen.slice(0, awaitingTotal)).toEqual(
            Array.from({ length: awaitingTotal }, (_, i) => `awaiting-${i}`),
        );
    });
});

/** The rows one band's slice would return, given how many it holds. */
function bandRows(name: string, band: ReturnType<typeof splitQueuePage>['awaiting'], total: number): string[] {
    const skip = band.skip ?? 0;
    const take = band.take ?? total;
    const rows: string[] = [];
    for (let i = skip; i < Math.min(skip + take, total); i += 1) {
        rows.push(`${name}-${i}`);
    }
    return rows;
}
