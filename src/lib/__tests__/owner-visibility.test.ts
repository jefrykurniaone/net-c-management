import { describe, expect, it } from 'vitest';
import { Role } from '@prisma/client';
import {
    resolveOwnerVisibility,
    type ContactSource,
} from '../owner-visibility';

/**
 * The read half of the Owner rules (docs/owner-role-immutability.md). The thing
 * worth asserting is that the values are actually *gone*, not merely flagged:
 * a surface that received them and chose not to draw them would still have sent
 * them to the browser.
 */

const CONTACT = { email: 'someone@example.com', phone: '62811000111' };

function userWith(role: Role): ContactSource {
    return { role, ...CONTACT };
}

describe('resolveOwnerVisibility', () => {
    it('withholds an Owner’s details from an Admin, values and all', () => {
        const seen = resolveOwnerVisibility(userWith(Role.OWNER), Role.ADMIN);
        expect(seen).toEqual({
            email: null,
            phone: null,
            isContactWithheld: true,
            isImmutable: true,
        });
    });

    it('shows an Owner their own details', () => {
        const seen = resolveOwnerVisibility(userWith(Role.OWNER), Role.OWNER);
        expect(seen).toEqual({
            ...CONTACT,
            isContactWithheld: false,
            isImmutable: true,
        });
    });

    it.each([Role.ADMIN, Role.MEMBER])(
        'withholds nothing on a %s account',
        (role) => {
            for (const viewer of [Role.ADMIN, Role.OWNER]) {
                expect(resolveOwnerVisibility(userWith(role), viewer)).toEqual({
                    ...CONTACT,
                    isContactWithheld: false,
                    isImmutable: false,
                });
            }
        },
    );

    it('marks an Owner immutable for every viewer, an Owner included', () => {
        for (const viewer of [Role.ADMIN, Role.OWNER, Role.MEMBER]) {
            expect(
                resolveOwnerVisibility(userWith(Role.OWNER), viewer).isImmutable,
            ).toBe(true);
        }
    });
});
