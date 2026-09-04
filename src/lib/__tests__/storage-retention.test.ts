import { describe, it, expect } from 'vitest';
import { selectSupersededObjectKeys } from '../storage-retention';

/**
 * The one seam in storage retention whose failure deletes the wrong file
 * (#303, `docs/adr/0017-storage-object-retention.md`). The case that matters is
 * not "were the old files selected" but "was the file just written left out of
 * the selection" — that is the case that turns a tidy-up into data loss.
 */

const MEMBER_PREFIX = 'u1';
const WRITTEN_NAME = 'new-picture.png';
const WRITTEN_KEY = `${MEMBER_PREFIX}/${WRITTEN_NAME}`;

describe('selectSupersededObjectKeys', () => {
    it('leaves only the newest when the owner has several older files', () => {
        const removals = selectSupersededObjectKeys(
            MEMBER_PREFIX,
            ['old-one.jpg', 'old-two.webp', WRITTEN_NAME],
            WRITTEN_KEY,
        );

        expect(removals).toEqual(['u1/old-one.jpg', 'u1/old-two.webp']);
    });

    it('removes nothing for an owner with no prior files', () => {
        expect(selectSupersededObjectKeys(MEMBER_PREFIX, [], WRITTEN_KEY)).toEqual(
            [],
        );
    });

    it.each([
        ['the listing gives it relative to the prefix', MEMBER_PREFIX, WRITTEN_NAME],
        ['the listing gives it as a full key', '', WRITTEN_KEY],
        ['the prefix carries a trailing slash', `${MEMBER_PREFIX}/`, WRITTEN_NAME],
        ['the join would double the separator', MEMBER_PREFIX, `/${WRITTEN_NAME}`],
    ])(
        'never returns the key just written when %s',
        (_case, ownerPrefix, existingName) => {
            const removals = selectSupersededObjectKeys(
                ownerPrefix,
                [existingName],
                WRITTEN_KEY,
            );

            expect(removals).not.toContain(WRITTEN_KEY);
            expect(removals).toEqual([]);
        },
    );

    it('selects a singleton bucket by full key, the logo the format change left', () => {
        const removals = selectSupersededObjectKeys(
            '',
            ['community-logo.jpg', 'community-logo.png'],
            'community-logo.png',
        );

        expect(removals).toEqual(['community-logo.jpg']);
    });

    it('ignores a blank listing entry, which names an area and not a file', () => {
        const removals = selectSupersededObjectKeys(
            MEMBER_PREFIX,
            ['', '   ', 'old-one.jpg'],
            WRITTEN_KEY,
        );

        expect(removals).toEqual(['u1/old-one.jpg']);
    });

    it('names one object once, however the listing spelled its separators', () => {
        const removals = selectSupersededObjectKeys(
            MEMBER_PREFIX,
            ['old-one.jpg', '/old-one.jpg'],
            WRITTEN_KEY,
        );

        expect(removals).toEqual(['u1/old-one.jpg']);
    });

    it('throws on a blank written key rather than selecting every file', () => {
        expect(() =>
            selectSupersededObjectKeys(MEMBER_PREFIX, ['old-one.jpg'], '  '),
        ).toThrow(TypeError);
    });
});
