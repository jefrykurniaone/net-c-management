import { describe, expect, it } from 'vitest';
import { resolveSessionFloor } from '../session-floor';

/**
 * The floor a Sessions register row draws. The figures are the quota helper's;
 * the only decision here is whether there is a floor at all — an Activity with
 * no minimum has none, and `0/0` would read as a floor that has been met.
 */

describe('resolveSessionFloor', () => {
    it('draws nothing when the Activity sets no minimum', () => {
        expect(
            resolveSessionFloor({ committed: 4, needed: 0, isMet: true }),
        ).toBeNull();
    });

    it('draws nothing when the Session has no quota at all', () => {
        expect(resolveSessionFloor(undefined)).toBeNull();
    });

    it('carries committed, needed and whether the floor is met', () => {
        expect(
            resolveSessionFloor({ committed: 8, needed: 6, isMet: true }),
        ).toEqual({ committed: 8, needed: 6, isMet: true });
    });

    it('keeps a Session below its floor readable as short', () => {
        expect(
            resolveSessionFloor({ committed: 2, needed: 6, isMet: false }),
        ).toEqual({ committed: 2, needed: 6, isMet: false });
    });
});
