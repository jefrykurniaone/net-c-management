import { Role } from '@prisma/client';

/**
 * The Owner contact rule, in one place.
 *
 * An Owner account is refused every modification and an Owner's contact details
 * are not shown to an Admin; an Owner sees both Admins' details and their own.
 * Both rules, and the code that enforces the write half of them, are written up
 * in `docs/owner-role-immutability.md`.
 *
 * This is the **read** half, and it runs on the server so that the values it
 * withholds are never sent to the browser at all: a component handed the
 * Owner's number and choosing not to draw it would still have shipped the
 * number, and a rule that survives only as long as nobody opens devtools is not
 * a rule. It is a pure function so that the decision can be tested without a
 * database, and so that the roster and the detail page cannot drift apart on it.
 *
 * Neither restriction is a capability: the Owner can do nothing an Admin
 * cannot, and both are limits on what may be done *to* the Owner.
 */

/** The stored fields the rule reads. */
export type ContactSource = Readonly<{
    role: Role;
    email: string | null;
    phone: string | null;
}>;

/** What a given viewer may see of them. */
export type VisibleContact = Readonly<{
    email: string | null;
    phone: string | null;
    /** True where details were withheld — the surface says so rather than drawing a blank. */
    isContactWithheld: boolean;
    /** True on an Owner account: refused every modification, by anyone. */
    isImmutable: boolean;
}>;

export function resolveOwnerVisibility(
    user: ContactSource,
    viewerRole: Role,
): VisibleContact {
    const isImmutable = user.role === Role.OWNER;
    const isContactWithheld = isImmutable && viewerRole !== Role.OWNER;
    return {
        email: isContactWithheld ? null : user.email,
        phone: isContactWithheld ? null : user.phone,
        isContactWithheld,
        isImmutable,
    };
}

/** Just the pair, in the two shapes a serialised row needs them. */
export type ContactPair = Readonly<{
    email: string | null;
    phone: string | null;
}>;

/** The same pair as CSV cells, where a missing value is an empty cell. */
export type ContactCells = Readonly<{ email: string; phone: string }>;

/**
 * The contact pair alone, for a row that already has its own shape and must
 * keep it.
 *
 * `resolveOwnerVisibility` answers with the two flags as well, and a caller that
 * spread its whole result over an existing row would add `isContactWithheld` and
 * `isImmutable` to that row's published shape. A JSON API row is a contract with
 * whoever reads it, so the two projections below take the decision and leave the
 * shape alone. Neither re-decides anything: the rule stays in the one function
 * above.
 */
export function visibleContact(
    user: ContactSource,
    viewerRole: Role,
): ContactPair {
    const { email, phone } = resolveOwnerVisibility(user, viewerRole);
    return { email, phone };
}

/**
 * The pair as a CSV writes it. A withheld value becomes an empty cell — the same
 * cell a member who never filled their profile in already produces, so the file
 * keeps its columns, its column order and its row count whoever exports it.
 */
export function visibleContactCells(
    user: ContactSource,
    viewerRole: Role,
): ContactCells {
    const { email, phone } = visibleContact(user, viewerRole);
    return { email: email ?? '', phone: phone ?? '' };
}
