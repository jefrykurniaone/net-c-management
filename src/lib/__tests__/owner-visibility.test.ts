import { describe, expect, it } from 'vitest';
import { Role } from '@prisma/client';
import {
    resolveOwnerVisibility,
    visibleContact,
    visibleContactCells,
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

/**
 * The two projections a serialised row uses (`GET /api/users` and the two CSV
 * exports). `toEqual` on the whole object is the assertion that matters twice
 * over: it proves the values are gone, and it proves the two flags are not
 * silently added to a published row shape.
 */
describe('visibleContact', () => {
    it('withholds an Owner’s pair from an Admin as null, and adds no field', () => {
        expect(visibleContact(userWith(Role.OWNER), Role.ADMIN)).toEqual({
            email: null,
            phone: null,
        });
    });

    it('gives an Owner their own pair', () => {
        expect(visibleContact(userWith(Role.OWNER), Role.OWNER)).toEqual(
            CONTACT,
        );
    });

    it.each([Role.ADMIN, Role.MEMBER])(
        'withholds nothing on a %s row',
        (role) => {
            for (const viewer of [Role.ADMIN, Role.OWNER]) {
                expect(visibleContact(userWith(role), viewer)).toEqual(CONTACT);
            }
        },
    );
});

describe('visibleContactCells', () => {
    it('writes an Owner’s pair as empty cells for an Admin', () => {
        expect(visibleContactCells(userWith(Role.OWNER), Role.ADMIN)).toEqual({
            email: '',
            phone: '',
        });
    });

    it('writes an Owner their own pair', () => {
        expect(visibleContactCells(userWith(Role.OWNER), Role.OWNER)).toEqual(
            CONTACT,
        );
    });

    it.each([Role.ADMIN, Role.MEMBER])('writes a %s row whole', (role) => {
        for (const viewer of [Role.ADMIN, Role.OWNER]) {
            expect(visibleContactCells(userWith(role), viewer)).toEqual(
                CONTACT,
            );
        }
    });

    it('writes an unset value as an empty cell, never as a null', () => {
        const blank: ContactSource = {
            role: Role.MEMBER,
            email: null,
            phone: null,
        };
        expect(visibleContactCells(blank, Role.ADMIN)).toEqual({
            email: '',
            phone: '',
        });
    });
});
