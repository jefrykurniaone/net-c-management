# What real data an unauthenticated page may show

Type: grilling
Status: resolved
Assignee: jefrykurniaone
Parent: ../map.md
Blocks: 07, 08, 10

## Question

The human chose **real data from the database** over any placeholder proof —
correct under `PRODUCT.md:94`, which forbids invented evidence outright. But `/`
renders for people with no account, so every field shown is a field published to
the internet.

What may this page read, and what must never leave the boundary?

Sub-questions:

- Which entities? Candidates: `Activity` (name, icon, colour, weekly slot,
  capacity, fee), the next few `ActivitySession` rows (date, time, location,
  seats left), counts (activities offered, members). Rule each in or out.
- **Hard no-list, to be confirmed and written down:** `bankName` /
  `bankAccountNumber` / `bankAccountHolder` (`PRODUCT.md:42`), admin WhatsApp
  numbers (`PRODUCT.md:44`), any `User` name or avatar, any `Payment` row.
- Is a **member count** publishable? It is real, so `PRODUCT.md:94` permits it —
  but on a fresh deployment it reads as "3 members", which sells nothing and
  cannot be hidden selectively without becoming a lie by omission. Decide the
  rule now, not per-render.
- Is showing a **venue address and a weekly time** to the open internet a safety
  question for a small community that meets there? Whose call is it — the
  design's, or an admin toggle in Settings?
- Seats-left is real-time and capacity-sensitive; the holds sweep
  (`src/lib/holds.ts`) runs at the top of capacity-sensitive reads. Does a public
  read trigger that sweep, and should it?

## Answer

The boundary is drawn as an **allow-list with a single choke point**, not as a
no-list applied per call site. Three standing rules govern it, and everything
below is a consequence of one of them.

**Rule 1 — one module owns every public read.** `src/lib/public-landing.ts`
(server-only) is the *sole* thing `/` may query. It exports hand-written Prisma
`select` objects and the no-list is documented beside them. No `include`
anywhere on this path — `Activity` carries `bankName`, `bankAccountNumber`,
`bankAccountHolder` and `adminWhatsapp` on the same row as `name`, `color` and
the fees (`prisma/schema.prisma:118-148`), so a single `include: { activity: true }`
publishes all four. A per-call-site `select` discipline is how those fields
eventually ship; one reviewable file is not.

**Rule 2 — no aggregate people-count on `/`, ever.** Not members, not
attendance, not "N reserved this week." A real count is permitted by
`PRODUCT.md:94`, and a fresh deployment's "3 members" is truthful — but any
conditional rendering ("only above 20") is evidence-shaped silence, the same lie
`:94` exists to prevent. A flat rule kills the entire "does it look sad when
small" class of bug without a per-render judgement. Counts of *activities* are
structural, not social proof, and remain allowed.

**Rule 3 — an unauthenticated GET never mutates and never sends mail.** This
settles the holds question outright. `releaseExpiredHolds`
(`src/lib/holds.ts:70-88`) is not a read: it `deleteMany`s `Attendance` rows and
queues member emails. So the public path must not call it — and without the
sweep any seat count is stale-high, meaning the page could say "Full" when seats
are free. Therefore **no capacity data on `/` at all**: no seats-left, no
Open/Full, no progress bar. Capacity truth stays behind auth, where the sweep
legitimately runs. The public band's job is "this happens, here, on these days",
not a booking widget.

### What may be read

**`Activity`** — `isActive: true` only, ordered by `recurringDay`.
Fields: `name`, `icon`, `color`, `recurringDay`, `recurringStartTime`,
`recurringEndTime`, `defaultLocation`, `monthlyFee`, `sessionFee`,
`allowsMonthly`, `allowsPerSession`.

**`ActivitySession`** — `date >= today`, `status: SCHEDULED`, limit **3**,
ascending. Fields: `date`, `startTime`, `endTime`, and the parent activity's
`name` / `color` for labelling. `ONGOING` and `COMPLETED` are backward-looking;
`CANCELLED` on a page selling the community is self-harm. Three proves the thing
is alive without turning the page into a schedule it must keep accurate.

**Count of active Activities** — permitted (structural, per Rule 2).

### Hard no-list, confirmed

- `Activity.bankName`, `bankAccountNumber`, `bankAccountHolder` (`PRODUCT.md:42`)
- `Activity.adminWhatsapp` and `Settings.adminWhatsapp` (`PRODUCT.md:44`)
- Any `User` field — name, email, avatar, phone. No exceptions, including the
  admin's.
- Any `Payment`, `Membership`, or `Attendance` row or derivative.
- `Activity.maxPlayers`, and every capacity-derived number (Rule 3).
- `ActivitySession.location` — per-session location can be a one-off private
  address. Only the standing `Activity.defaultLocation` is published.
- **All admin-authored free text**: `Activity.description`,
  `ActivitySession.title`, `ActivitySession.notes`. These are unvalidated
  `@db.Text` written under an internal-tool assumption; an admin will eventually
  paste a phone number, a bank line, or a member's name into one. Every public
  field must be one an admin *could not* have mistaken for private —
  `Activity.name` is a label ("Badminton"), `description` is prose. A dedicated
  "public description" field would be the honest fix, but that is a schema change
  and a new admin surface: a separate effort, not this map.

### Venue and timing

`Activity.defaultLocation` plus the weekly day and time **are published**. The
standing venue and "Tuesdays 20:00" are what make a local club joinable;
withholding them guts the pitch. Per-session `location` is withheld (above). No
`Settings` toggle — that is a product change needing a `PRODUCT.md` amendment,
and it pushes the call onto an admin who will never find the switch.

### Fees

Fees **are published**, including zero. A stored `0` is rendered as **"Free" /
"Gratis"** through `dictionaries.ts`, never as "Rp 0" — the DB cannot distinguish
*unconfigured* from *genuinely free*, and "Rp 0" reads as a broken template on a
page whose job is persuasion while "Free" reads as an offer. Both are truthful
about the stored value.

When an Activity allows both modes, **both prices show, visually ranked**:
monthly primary, per-session secondary. Choosing one for the visitor is
editorial, and a month and a night are not comparable quantities.

### Consequences for the rest of the map

- **Fee display order and the "Free" string** are inputs to 08 (copy authority) —
  the zero-fee word is a dictionary string, not a component literal.
- **The empty community** is folded into 07: every band it proposes must state
  its empty behaviour. Cleared from the map's fog.
- **Caching** graduates to ticket 10. The read shape is now known — two small
  selects, no writes, no per-user variance — so `/`'s render mode and
  revalidation window is a sharp question, and 07 must not design bands assuming
  request-time freshness.
