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
