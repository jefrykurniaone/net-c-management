# Owner-role immutability and Owner contact privacy

This document is cited by a code comment in `src/lib/utils.ts` (`isAdminRole`) and describes rules
that the server already enforces. It was recreated from that enforcing code; the code is the
authority, and this page exists so that nobody has to read three route handlers to learn what the
Owner role means.

## Why the Owner exists

`Role` has three members: `MEMBER`, `ADMIN` and `OWNER`. The first is the permission tier that may
act only on its own participation, money and profile. The second is the tier that runs the
community. The third is **not** a third tier.

Owner is the account that stays standing. A community run by volunteers hands the Admin role around,
and every Admin can change every other Admin — which means that with only two tiers there is a
sequence of ordinary, individually reasonable edits that ends with nobody able to administer the
community, or with the person who set it up locked out of it. Owner closes that path by being the one
account no edit reaches. It is an immutability and privacy marker, not a capability tier, and no
surface should present it as a rank.

Because the Owner's account cannot be edited, its holder's contact number is also the one contact
detail an Admin cannot obtain by promoting themselves and reading it back. That is the second rule
below, and it exists for the same reason as the first: the protection has to hold against an Admin,
not merely against a member.

## The four rules

### 1. An Owner account is refused any modification, by anyone — including another Owner

Enforced in `src/app/api/users/route.ts`, in the `PATCH` handler. The handler loads the target user
before writing anything and refuses with HTTP 403 and the message `Cannot modify an OWNER account`
when that user's role is `OWNER`. The check is on the **target**, never on the caller, so an Owner
editing another Owner — or editing themselves — is refused by exactly the same branch as an Admin
attempting it. There is no bypass parameter and no privileged caller.

`PATCH /api/users` is the only route in the application that writes `User.role` or `User.isActive`,
so this single check is the whole of the rule for both fields.

### 2. An Admin never sees an Owner's contact number

Enforced in `src/app/api/users/admin-contacts/route.ts`, in the `GET` handler. It builds the set of
roles whose phone numbers the caller may read: an Admin gets `[ADMIN]`, and the Owner's row is
excluded by the database query rather than filtered out afterwards, so the number is never in the
response body at all.

The Members register applies the same rule on the page's own server-side read
(`src/app/(admin)/admin/members/member-rows.ts`): an Owner row viewed by an Admin has its email and
phone dropped before the row is handed to the client, and the register draws the word **Withheld** in
their place. Withheld rather than blank is deliberate — an Admin who sees an empty cell concludes the
Owner has not filled their profile in, goes looking for the number elsewhere, and learns the rule
only by being refused. A blank hides the rule; **Withheld** states it.

The register's search is filtered for the same reason. A filter that matches on a value the row
refuses to print is an oracle for that value: an Admin types one character at a time and watches the
Owner's row appear or vanish. So the email arm of the search skips Owner rows for anybody but an
Owner; the Owner stays findable by name, which is the identifier the surface does show.

#### Where this rule is not yet enforced

Three Admin-reachable routes still return an Owner's stored `email` and `phone`, so as of this
writing the rule holds on the Members register and in the contact picker but not across the whole
product. Recorded here rather than left to be rediscovered:

- `GET /api/users` (`src/app/api/users/route.ts`) gates on `isAdminRole` and selects `email` and
  `phone` for every row, Owner included.
- `GET /api/payments/export` (`src/app/api/payments/export/route.ts`) and
  `GET /api/sessions/[id]/export` (`src/app/api/sessions/[id]/export/route.ts`) write both fields
  into a downloadable CSV with no role filter.

Closing them means running `resolveOwnerVisibility` over the rows in each handler before they are
serialised. It is deliberately not done in the change that recreated this document, which was a
display-only ticket, and is tracked on issue #70.

### 3. An Owner sees both Admins' numbers and their own

The same handler in `src/app/api/users/admin-contacts/route.ts` gives a caller whose role is `OWNER`
the roles `[ADMIN, OWNER]`, which is every Admin plus the Owner themselves. The response marks the
caller's own row with `isSelf` so a contact picker can label it. On the Members register, an Owner
viewing the roster sees contact details on every row, their own included.

This is a privacy rule with a direction, not a hierarchy: the Owner is not being trusted with more,
they are the only person whose number the rule protects, and a rule that hid their own number from
them would protect nothing and cost them their own profile.

### 4. The Owner has no capability an Admin lacks

`isAdminRole` in `src/lib/utils.ts` returns true for both `ADMIN` and `OWNER`, and it is the single
predicate every admin gate uses — the middleware in `src/proxy.ts`, the `(admin)` layout guard, and
every admin API route. There is no capability check anywhere that admits `OWNER` and refuses `ADMIN`.

The two roles therefore differ in exactly two ways, both of them restrictions on what may be done
*to* the Owner rather than powers granted *by* the role:

- an Owner account cannot be modified;
- an Owner's contact details are not shown to an Admin.

Any surface that renders the Owner as senior to an Admin — a louder label, a brighter colour, a badge
implying rank — is stating something the code does not do. On the Members register the two role
labels are drawn identically and differ only in the word.

## How to change an Owner

There is no in-product path, by design: rule 1 refuses every write. The role is set from a script run
directly against the database.

`prisma/promote-owner.ts` takes an email address and sets that user's role to `OWNER`, along with
`isActive`, `isProfileComplete` and `admittedAt` — the last because joining is approval-gated, and an
Owner whose `admittedAt` is null would be treated as an Applicant and redirected away from the admin
area they are meant to reach.

```
npm run db:promote -- someone@example.com        # local database
npm run db:promote:prod -- someone@example.com   # production database
```

The user must have signed in with Google at least once, since that is what creates the `User` row;
the script reports "No user with that email" otherwise.

Demoting an Owner has no script. It is a deliberate gap: an operator with database access can change
the row directly, and anyone without database access is exactly who rule 1 is protecting the account
from.
