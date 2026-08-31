# Manual Testing Guide

Step-by-step guide to exercise every feature flow — happy paths **and** edge
cases — against the seeded local database. Covers the defects and observations
found in QA (BUG-01…04, OBS-01…07) and all seven email flows.

Areas, in order: prerequisites and fixtures (§1–§4), auth and onboarding (§5),
admin surfaces (§6–§11), member surfaces (§12–§13), email flows (§14), production
reset (§15), and **design-system verification — contrast, colourless state, rule
visibility, the landing threshold, locale and typography (§16, `TC-DS-*`)**. §16 is
the one area written as numbered test cases carrying measured numbers in their
expected results, and it reuses the §2 seed, the §3 accounts and the §4 sessions
rather than fixtures of its own.

**Member-surface verification (§17, `TC-MS-*`)** is the second such area, written
to the same conventions and inheriting §16.0 by reference. It covers what a
member can see and do on the board, the dashboard, a Session, the dues surfaces
and the mobile rail.

**Admin-register verification (§18, `TC-AR-*`)** is the third, written to the same
conventions and inheriting §16.0 by reference. It covers every admin surface —
the Payments queue, the Sessions register and its locks, the attendance register
and the fourth attendance value, Members and the Owner rules, Activities,
Applicants and Settings — together with the exports, both locales, the keyboard
and both widths. **§7–§11 below are retired into it**: their steps are the raw
material `TC-AR-*` was folded out of, and each section now points at the cases
that replaced it rather than restating them.

> The full test-case report (with screenshots) is generated as a DOCX under
> `docs/` — that folder is **git-ignored**, so it is a local artifact only.

---

## 1. Prerequisites

```bash
npm install
npx prisma generate          # after any schema change
npm run db:seed              # load the demo/test dataset (see §2)
npm run dev                  # http://localhost:3000
```

The dev server must be running for every test below.

Email flows additionally need `GMAIL_USER` / `GMAIL_APP_PASSWORD` in `.env.local`
(and `CRON_SECRET` for the day-reminder cron). See §14.

---

## 2. Reseed to a clean state

The seed is **idempotent and destructive-for-transactional-data**: it clears all
`Attendance`, `Payment` and `ActivitySession` rows and re-upserts users,
activities, memberships and settings. Run it any time to get back to a known
baseline.

```bash
npm run db:seed                               # anchor = real "today"
npm run db:seed -- --date=2026-08-15          # pretend today is 15 Aug 2026
npm run db:seed -- --date=2026-08-15 --from=2026-07-01 --to=2026-08-14
```

- `--date` — the day treated as "today"; every relative scenario shifts with it.
- `--from` / `--to` — the range past COMPLETED sessions are spread over.
- Env fallbacks: `SEED_DATE`, `SEED_FROM`, `SEED_TO`.

**Always reseed before an email round** (§14) and after it, so no test artifacts
linger.

---

## 3. Test accounts (dev login)

Local dev has an OAuth bypass at **`/auth/dev`** — click a user, or POST the
email to `/api/dev-login` (form field `email`). Never ships to production.

| Email | Role | Notes |
|-------|------|-------|
| `owner@xclub.local` | OWNER | full admin access |
| `admin@xclub.local`, `admin2@xclub.local` | ADMIN | admin access |
| `member@xclub.local` | MEMBER | **Adi Pratama** — Badminton monthly **UNPAID**; Basket/Futsal/Tennis paid |
| `eka.saputri@xclub.local` | MEMBER | **Eka** — Futsal `paymentMode = null` (must pick a mode) |
| `newbie@xclub.local` | MEMBER | **incomplete profile** → bounced to `/onboarding` |
| `sari.rahma@…`, `bima.wicaksono@…`, … | MEMBER | roster members |

All non-real addresses use the `@xclub.local` domain — **never send real email to
them** (see §14).

---

## 4. Seeded scenario sessions

Each maps to one or more test cases. Find them in the sessions list or by title.

| Session | Purpose / edge case |
|---------|---------------------|
| Weekly Rally Night, Morning Drills, Futsal Friday, Pickup Game, Singles Ladder | normal upcoming, paid |
| **Free Play (Maybe Test)** | fee 0 → Going/Maybe/Can't-make-it; Adi seeded MAYBE |
| **Hold Lab (Per-Session Test)** | confirmed + pending session payments, **live hold**, **expired hold** |
| **Full Court Challenge** | 6/6 full → register button disabled (OBS-04) |
| **Underbooked Friendly** | 2 going < min 4 → admin "Remind members" (§14) |
| **Rained Out (Cancelled)** | CANCELLED → no RSVP actions |
| **Live Pickup (Ongoing)** | ONGOING → "RSVP closed" |
| **Today Ladder (Reminder Test)** | SCHEDULED today (WIB) → day-reminder cron target (§14) |

---

## 5. Auth & onboarding

1. **Anonymous guard** — sign out, open `/admin` → redirected to `/auth/signin`.
2. **Member blocked from admin** — sign in as Adi, open `/admin` → redirected to
   `/dashboard`; the Admin nav entry is absent.
3. **Owner sees admin nav** — sign in as `owner@xclub.local` → `/dashboard` shows
   the **Admin** entry.
4. **Onboarding (incomplete profile)** — sign in as `newbie@xclub.local` → bounced
   to `/onboarding` with an empty form. Fill name + phone (`08…`) + pick an
   activity → **Save** → lands on `/dashboard`.
5. **Edge — onboarding not reopenable (BUG-03)** — as Adi (complete profile) open
   `/onboarding` directly → redirected to `/dashboard` (the form never renders, so
   a resubmit can't overwrite the saved name/phone).
6. **Edge — admin APIs reject a member** — as Adi run in the browser console:
   `fetch('/api/activities',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}).then(r=>r.status)` → `403`.

## 6. Admin dashboard

1. `/admin` → KPI cards, "Needs attention" (pending proofs + under-booked), "This
   week", per-activity cards.
2. **Edge — dues collected (OBS-01)** — every activity card's "Dues collected"
   numerator is **≤** its member count (e.g. Badminton `14/21`, never `22/21`);
   only MONTHLY confirmed payments count.

## 7. Session management (admin) — retired into §18

**Retired.** These were plain numbered steps without case ids, written before
spec #30 rebuilt the admin side. Every one of them that still applies was folded
into a `TC-AR-*` case, which states its preconditions, its steps and its expected
result with an HTTP status where a route is involved. The section numbers stay so
that references from elsewhere in this file keep resolving; the steps themselves
are not re-run here.

| Was | Now |
|---|---|
| 1–2 list, search and filter | `TC-AR-001`, `TC-AR-036` |
| 3 filtered empty state (OBS-02) | `TC-AR-031` |
| 4–6 create: empty form, end before start (BUG-01), valid | `TC-AR-030` |
| 7 locked fields on edit | `TC-AR-003`, `TC-AR-004`, `TC-AR-005` |
| 8 update | `TC-AR-005` step 4, `TC-AR-003` step 4 |
| 9 manual attendance | `TC-AR-017`, `TC-AR-019` — attendance moved to its own register (`/admin/sessions/{id}/attendance`) and out of the edit form |
| 10 CSV headers localized (OBS-03) | `TC-AR-033` |
| 11 delete | `TC-AR-008` |

## 8. Payment review (admin — Manage Dues) — retired into §18

**Retired**, on the same terms as §7. The surface is a queue now, not a list, and
its ordering is the feature the cases test.

| Was | Now |
|---|---|
| 1–2 list, filters, awaiting count | `TC-AR-020`, `TC-AR-021` |
| 3 confirm a pending payment | `TC-AR-024` |
| 4 reject requires a reason | `TC-AR-025` — the reason is refused **in the dialog with a message**, not by a disabled button, and by the route |
| 5 reject with a reason | `TC-AR-025`, `TC-AR-026` |
| 6 CSV export (OBS-03) | `TC-AR-033` |

## 9. Activity management (admin) — retired into §18

**Retired**, on the same terms as §7.

| Was | Now |
|---|---|
| 1 list with counts, fees, status | `TC-AR-029`, `TC-AR-036` |
| 2–3 create: empty form, valid | `TC-AR-029` |
| 4 duplicate slug → `409` | `TC-AR-029` step 3 |
| 5 missing fields → `400` | `TC-AR-029` step 4 |
| 6 deactivate / activate | `TC-AR-029` step 5 |

## 10. Member management (admin) — retired into §18

**Retired**, on the same terms as §7.

| Was | Now |
|---|---|
| 1 directory, search, filter, pagination | `TC-AR-028`, `TC-AR-031` |
| 2–3 promote and demote | `TC-AR-028` step 3 |
| 4 incomplete profile badge | `TC-AR-028` |
| 5 member detail | `TC-AR-028` steps 4–5 |
| (new) Owner immutability and contact privacy | `TC-AR-007`, `TC-AR-027` |

## 11. Community settings (admin) — retired into §18

**Retired**, on the same terms as §7.

| Was | Now |
|---|---|
| 1 current values | `TC-AR-032` |
| 2 save a new Community Name | `TC-AR-032` step 4 |
| 3 empty name (BUG-02), and `PATCH /api/settings` → `400` | `TC-AR-032` steps 2–3 |

## 12. Member — dashboard & sessions

Sign in as **Adi** (`member@xclub.local`).

> **Partly superseded by spec #29.** Items 1 and 2 still describe the surfaces
> as they were before #57 and #59 rebuilt them on the Slot Cell: there are no
> RSVP pills on the dashboard and no "This week / Later" grouping on
> `/sessions`. The expected results below are left as written rather than
> guessed at; **§17's TC-MS-004, TC-MS-007, TC-MS-012 and TC-MS-013 are the
> current expectation** for those two items. Everything from item 3 down was
> re-run on 2026-08-20 and holds.

1. **Dashboard** — greeting, **"Badminton dues unpaid"** banner, stat tiles,
   per-activity cards with RSVP pills.
2. **Sessions list** `/sessions` — grouped This week / Later, quota badges, filters.
3. **Free session RSVP** — open **Free Play (Maybe Test)** → switch Maybe → Going
   → Can't-make-it (seat count updates, no payment).
4. **Per-session hold** — open **Hold Lab**, "Change payment mode" → Per session →
   "Register & pay" → redirected to the pay page; back on the session it shows
   "Reserved · pay within MM:SS" + Cancel. **Cancel** releases the seat.
5. **Edge — full session (OBS-04)** — open **Full Court Challenge** (6/6) → the CTA
   is the disabled **"Session Full"** button (never an enabled Register).
6. **Edge — cancelled** — **Rained Out (Cancelled)** → "Session Cancelled", no
   actions.
7. **Edge — ongoing** — **Live Pickup (Ongoing)** → "RSVP closed".
8. **Edge — server guards** — as Adi, `POST /api/sessions/{ongoingId}/attendance`
   → `403 "RSVP closed"`; the cancelled session → `400 "Session is cancelled"`;
   reserving a full session → `409`.
9. **Edge — pay page helper (OBS-06)** — the register-&-pay page shows **"Set by
   this session's fee"** (not the monthly-fee text).

## 13. Member — payments & profile

> **Two notes from the 2026-08-20 re-run.** Item 1's "July" is whichever month
> the seed anchors to — **August** on a default `npm run db:seed`, and the
> Badminton mark there now reads **Pending** rather than "Unpaid". Item 3 holds
> on every surface: the run found `/dashboard` and `/profile` reading `Pending`
> where `/payments` read `In review`, and the two states were given two words —
> **In review** once a Proof is sent, **Pending** while nothing has been — rather
> than the case being softened. See §17.10, defect 8.

1. **Edge — unpaid dues surfaced (BUG-04)** — `/payments` → the July section lists
   **Badminton = Unpaid** alongside Basket/Futsal/Tennis = Paid, matching the
   dashboard banner.
2. **Upload proof** — `/payments/upload`, select Badminton (amount locked) → attach
   an image → Submit → history shows "In review".
3. **Edge — in-review badge (OBS-05)** — after upload, the Badminton dues card and
   the dashboard activity card read **"In review"** (not "Unpaid"); the unpaid
   banner disappears.
4. **Edge — client file check (OBS-07)** — on the upload page, force a `.txt` onto
   the file input → instant toast "Unsupported file format…", input cleared,
   Submit stays disabled. (Server also returns `400`.)
5. **Payment mode dialog** — on a paid Badminton session, "Change payment mode" →
   Monthly ↔ Per session re-prices the button (applies immediately while unpaid).
6. **Edge — no mode chosen** — sign in as **Eka**, open **Futsal Friday** → plain
   "Register" (no price) → dialog forces Monthly vs Per session.
7. **Rejected payment** — `/payments?historyStatus=REJECTED` → shows reason +
   refund guidance + WhatsApp link.
8. **Profile** — edit name; phone `08123456789` normalizes to `628123456789`;
   language toggle switches EN↔ID; Sign Out ends the session.

---

## 14. Email flows (all seven) — safe procedure

The app sends real email via Gmail SMTP, and the seed roster uses fake
`@xclub.local` addresses. **Never trigger a flow that would mail those.** Route
every send to a real inbox you control.

Recipient by flow:

| Flow | Trigger | Recipient |
|------|---------|-----------|
| Reservation hold created (payment deadline) | reserve a paid seat | the reserving member |
| Payment approved / rejected | admin confirms/rejects a proof | the paying member |
| Hold expired (re-register) | a hold lapses, then any capacity read runs the sweep | the member who held it |
| Day-of attendance reminder | `GET /api/cron/day-reminders` | every REGISTERED attendee of today's SCHEDULED sessions |
| Under-booked "Remind members" | `POST /api/sessions/{id}/remind` (admin) | active activity members **not** registered |

### 14.1 Point a test member at your inbox

Use Prisma Studio (`npm run db:studio`) or a one-off script to set a member's
email to a real address, e.g. change one roster member to `you@example.com`.
Reseeding restores the original.

### 14.2 Per-member flows (hold-created, approved, rejected)

Safe by construction — they only mail the one acting member:

1. Set that member's email to your inbox (§14.1) and sign in as them.
2. Reserve a paid seat (e.g. **Singles Ladder**) → **hold-created** email.
3. Upload a proof for it → then sign in as owner and **Confirm** → **approved**
   email; or **Reject** with a note → **rejected** email.

### 14.3 Hold-expired

1. Set members A/B to real inboxes.
2. In Prisma Studio: delete any `Attendance` with a non-null `holdExpiresAt`
   (clears seeded holds), then create a REGISTERED attendance for A and B on any
   SCHEDULED session with `holdExpiresAt` in the **past**.
3. Load any capacity page (e.g. `/payments`) → the lazy sweep releases them and
   emails only A/B.

### 14.4 Day-of reminder (cron) — fan-out, isolate first

The seed provides **Today Ladder (Reminder Test)** (SCHEDULED, today WIB) but its
attendees are fake addresses. To test safely:

1. In Prisma Studio, set `dayReminderSentAt = now` on **every** today SCHEDULED
   session (so the cron skips them).
2. Delete that session's attendances; add REGISTERED attendances only for your
   real-inbox members; set its `dayReminderSentAt = null`.
3. Trigger:
   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/day-reminders
   ```
   Expect `{"sessions":1,"sent":2,"skipped":0}` — mail only to your inboxes.

### 14.5 Under-booked "Remind members" — fan-out, isolate first

The blast mails **all active activity members not registered** — with the seed
that is the whole fake roster. Do **not** run it on a seeded activity. Instead:

1. Create a throwaway activity whose only two members are your real inboxes, plus
   one SCHEDULED session in it (`lastReminderAt = null`).
2. As owner: `POST /api/sessions/{thatSessionId}/remind` → `{"sent":2,"skipped":0}`.

**After any email round, reseed (`npm run db:seed`) to remove the test data and
restore the fake addresses.**

---

## 15. Resetting **production** to a clean state

> ⚠️ **Destructive and irreversible.** These act on the real production database
> (`.env.prod`). Take a Supabase backup first. `npm run db:seed` /
> `npm run db:seed:prod` are **not** interchangeable — the plain `db:seed` loads
> the demo dataset and must **never** run against prod.

Prisma CLI targets prod only when `DATABASE_TARGET=prod` (see `prisma.config.ts`,
which then loads `.env.prod`). `npm run db:seed:prod` is **idempotent and
non-destructive** — it only upserts Settings, the two Activities, and promotes the
owner (only if that user already signed in with Google). It does **not** wipe
data.

### Option A — targeted cleanup (recommended)

Removes the transactional test data (sessions, payments, RSVPs) but keeps real
users, Google logins, memberships, activities and settings.

1. Open the prod DB — Supabase SQL editor, or `npm run db:studio:prod`.
2. Delete the transactional tables (order avoids FK issues):
   ```sql
   DELETE FROM "Attendance";
   DELETE FROM "Payment";
   DELETE FROM "ActivitySession";
   -- optional: also clear test memberships (members must rejoin afterwards)
   -- DELETE FROM "Membership";
   ```
3. Re-assert the catalog + owner:
   ```bash
   npm run db:seed:prod
   ```

### Option B — full wipe (true blank slate)

Drops **every** row (including real users and their Google account links) and
re-applies migrations.

```bash
# --skip-seed is REQUIRED: migrate reset would otherwise run the local DEMO
# seed (prisma.config.ts) and inject demo data into prod.
cross-env DATABASE_TARGET=prod npx prisma migrate reset --skip-seed --force

npm run db:seed:prod   # settings + activities (owner is promoted only after
                       # they sign in with Google again — see seed-prod.ts)
```

Notes:
- `migrate reset` needs a **direct** database connection, not the Supabase
  transaction pooler (port 6543). Point `.env.prod`'s `DATABASE_URL` (or
  `DIRECT_URL`) at the direct/session connection for the reset.
- After a full wipe the owner must sign in with Google once, then re-run
  `npm run db:seed:prod` (or `npm run db:promote:prod`) to regain the OWNER role.

---

## 16. Design-system verification (`TC-DS-*`)

Rally (`DESIGN.md`) makes five promises that rot silently: every pair of colours
the product can put on screen clears its floor in **both** themes; every state
arrives as a chip carrying a written label in **both** locales; every control
shows the keyboard where it is; motion stops for a reader who asked it to; and
the retired system leaves nothing behind in the built stylesheet. This area
turns each of them into a case that fails on a **number**, a **string** or a
**file**, never on an opinion — so a nudged token is a failed case rather than a
matter of taste.

Nothing here asserts that a component rendered with a class name. Such a case
passes forever while the design breaks.

The suite was rewritten for Rally by #152 and is numbered from **TC-DS-101**, so
that the Papan Jadwal ids stay unambiguous rather than being reused. The old
`TC-DS-001` … `TC-DS-017` are kept in §16.5, superseded, with a pointer each.

### 16.0 Conventions, vocabulary and shared preconditions

Each case carries an id (`TC-DS-NNN`), a priority (**P0** ships nothing broken,
**P1** ships with a known note, **P2** is cosmetic), a type (Positive / Negative
/ Edge), its own preconditions, numbered steps, and an expected result. Where a
case touches an API the expected result names the **HTTP status**.

**Two themes, not two materials.** The painted-board vocabulary went with Papan
Jadwal (ADR 0003):

- **light** — warm off-white grounds carrying Black Green ink. `:root` in
  `src/app/styles/board-materials.css`.
- **dark** — a real Black Green ground carrying off-white ink, with card faces
  stepping *up* from it. `.dark` in the same file. The public route's hero band
  forces `.dark` regardless of the visitor's preference, deliberately, so every
  dark value has to hold inside a light-themed page as well.

**How a case is executed** is part of the case, because three kinds live here:

- **Computed** — the ratio is calculated from the two committed hex values. No
  browser, no server, no seed. `src/lib/__tests__/design-tokens.test.ts` already
  asserts every one of these on every `npm test`; running the case by hand is
  reading the same numbers back off the same file.
- **Static** — the answer is in a file on disk: a grep over `src/`, or a scan of
  the stylesheet `npm run build` emits.
- **Rendered** — the answer only exists in a browser with the app running, and
  the case says which route, which theme and which locale.

Shared preconditions for the **rendered** cases only:

1. §1 prerequisites done and `npm run dev` running on `http://localhost:3000`.
2. §2 seed loaded (`npm run db:seed`) — these cases use the §3 accounts
   (`member@xclub.local` = Adi, `owner@xclub.local`), the four seeded activities
   (Badminton, Basket, Futsal, Tennis) and the §4 sessions. No fixture of their
   own, and none invented in a case.
3. Theme switched with the **theme toggle** in the header rail (or the OS colour
   scheme, which `system` follows).
4. Locale switched on `/profile` → Language, or by setting the `NEXT_LOCALE`
   cookie to `en` / `id`.
5. Viewport set with the browser's device toolbar: **390 × 844** (phone) and
   **1440 × 900** (desktop).

Contrast is read the same way everywhere: inspect the element and read the ratio
DevTools prints in the colour picker beside `color`, or compute it from the two
token values with the WCAG formula in `src/lib/theme-contrast.ts`. **The ratios
below are the measured values of the committed tokens.** A case fails when the
measurement is below its **floor**, not when it differs from the value printed
here — but a value that has drifted from the table is a change somebody has to
own, and the table is updated in the same commit as the token.

The floors are WCAG 2.1 AA: **4.5:1** for text (1.4.3), **3:1** for a rule, a
ring, a state edge or a plotted mark (1.4.11). A role at ≥24px, or ≥18.66px and
bold, would only have to clear 3:1; no pair below relies on that concession.

### 16.1 The token layer — computed cases

#### TC-DS-101 · P0 · Positive — Every text pair clears AA in both themes

**Preconditions:** none. Computed from `src/app/styles/board-materials.css`.

**Steps:**
1. For each row below, read the two token values out of `:root` and out of
   `.dark`.
2. Compute the contrast ratio of each pair in each theme.
3. Open `/dashboard`, `/sessions`, `/payments`, `/profile`, `/admin` and `/` in
   both themes and confirm each pair is one a surface actually produces — a
   pair in the table that no surface can render is dead weight, and a pair a
   surface renders that is **not** in the table is the failure this step exists
   to find.

**Expected result:** every pair clears **4.5:1** in both themes.

*Ink on grounds and faces*

| Pair | Tokens | Light | Dark |
|---|---|---|---|
| body ink on the page ground | `--foreground` on `--background` | **14.17** | **14.75** |
| body ink on a card | `--foreground` on `--card` | **17.11** | **12.73** |
| card ink on a card | `--card-foreground` on `--card` | **17.11** | **12.73** |
| menu and dialog ink | `--popover-foreground` on `--popover` | **17.11** | **12.73** |
| ink on a muted fill | `--foreground` on `--muted` | **14.17** | **11.34** |
| ink on a secondary fill | `--foreground` on `--secondary` | **14.17** | **12.73** |
| supporting ink on the ground | `--secondary-foreground` on `--background` | **7.01** | **9.14** |
| supporting ink on a card | `--secondary-foreground` on `--card` | **8.47** | **7.89** |
| secondary button label | `--secondary-foreground` on `--secondary` | **7.01** | **7.89** |
| muted ink on the ground | `--muted-foreground` on `--background` | **5.90** | **9.14** |
| muted ink on a card | `--muted-foreground` on `--card` | **7.13** | **7.89** |
| menu label and shortcut | `--muted-foreground` on `--popover` | **7.13** | **7.89** |
| quiet ink on the ground | `--subtle-foreground` on `--background` | **4.99** | **7.36** |
| quiet ink on a card | `--subtle-foreground` on `--card` | **6.03** | **6.35** |

*Ink on brand fills and washes*

| Pair | Tokens | Light | Dark |
|---|---|---|---|
| active navigation, menu focus | `--accent-foreground` on `--accent` | **13.68** | **10.06** |
| selected option label | `--foreground` on `--accent` | **13.68** | **10.85** |
| link on an accent hover | `--primary` on `--accent` | **6.90** | **5.79** |
| link on the ground | `--primary` on `--background` | **7.15** | **7.88** |
| link on a card | `--primary` on `--card` | **8.64** | **6.80** |
| checkbox tick, avatar badge | `--primary-foreground` on `--primary` | **8.64** | **7.88** |
| settled ink on the ground | `--success` on `--background` | **5.43** | **8.74** |
| settled ink on a card | `--success` on `--card` | **6.56** | **7.54** |
| ink on a settled fill | `--success-foreground` on `--success` | **6.56** | **8.74** |
| provisional ink on the ground | `--warning` on `--background` | **5.82** | **8.18** |
| provisional ink on a card | `--warning` on `--card` | **7.03** | **7.06** |
| count badge on a provisional fill | `--warning-foreground` on `--warning` | **7.03** | **7.98** |
| dues-banner action | `--warning-solid-foreground` on `--warning-solid` | **7.03** | **7.98** |
| void ink on the ground | `--destructive` on `--background` | **6.15** | **6.57** |
| void ink on a card | `--destructive` on `--card` | **7.43** | **5.67** |
| ink on a void fill | `--destructive-foreground` on `--destructive` | **7.43** | **6.68** |
| destructive action | `--destructive-solid-foreground` on `--destructive-solid` | **7.43** | **6.68** |

*The two actions, which do not move with the theme*

| Pair | Tokens | Light | Dark |
|---|---|---|---|
| **the primary action's label** | `--primary-solid-foreground` on `--primary-solid` | **8.74** | **8.74** |
| the secondary action's label | `--secondary-solid-foreground` on `--secondary-solid` | **14.75** | **14.75** |

The five chip pairs and the value beside a void chip are text pairs too and are
read in TC-DS-102 instead, where a reader can see them together. Thirty-nine
text pairs in all.

#### TC-DS-102 · P0 · Positive — Every chip's ink and edge clear their floors, both themes

**Preconditions:** none for the numbers. Computed the same way as TC-DS-101.

**Steps:**
1. Read the wash, ink and edge token of each of the five variants out of
   `src/components/ui/chip.tsx`.
2. Compute the ink-on-wash ratio and the edge-on-wash ratio, per theme.
3. Compute the ratio of the de-emphasised value beside a void chip, on the wash
   it can sit in.

**Expected result:** every **ink** clears **4.5:1** and every **edge** clears
**3:1**, in both themes.

| Variant | Ink on wash, light | dark | Edge on wash, light | dark |
|---|---|---|---|---|
| **settled** | **5.59** | **7.06** | **5.59** | **7.06** |
| **provisional** | **6.00** | **6.73** | **6.00** | **6.73** |
| **void** | **6.04** | **5.88** | **6.04** | **5.88** |
| **neutral** | **5.90** | **7.03** | **3.29** | **3.70** |
| **info** | **6.93** | **7.14** | **6.93** | **7.14** |

The neutral chip is the only one whose edge is a different colour from its ink —
it takes `--border`, the taupe that serves every rule in the system — which is
why its edge row is the tightest of the five at **3.29**. It clears.

And one reading that is part of the same case: **the value a void state applies
to is dimmed, never struck.** `--muted-foreground` measures **5.80 / 8.19** on
the void wash, **7.13 / 7.89** on a card and **5.90 / 9.14** on the page ground.
A `text-decoration` strike anywhere on a value fails the case; so does a value
left at full strength beside a void chip, because the de-emphasis is the
behaviour the retired Strike mark carried and Rally kept.

#### TC-DS-103 · P0 · Positive — Every rule, edge and focus ring clears 3:1 in both themes

**Preconditions:** none. Computed.

**Steps:** compute each pair below in both themes.

**Expected result:** every pair clears **3:1** (WCAG 1.4.11).

| Pair | Tokens | Light | Dark |
|---|---|---|---|
| rule and input edge on the ground | `--border` on `--background` | **3.29** | **4.81** |
| rule and input edge on a card | `--border` on `--card` | **3.98** | **4.15** |
| rule on a muted fill | `--border` on `--muted` | **3.29** | **3.70** |
| **rule on an accent fill** | `--border` on `--accent` | **3.18** | **3.54** |
| rule on the link wash | `--border` on `--primary-soft` | **3.19** | **4.36** |
| rule on the settled wash | `--border` on `--success-soft` | **3.39** | **3.89** |
| rule on the provisional wash | `--border` on `--warning-soft` | **3.39** | **3.96** |
| rule on the void wash | `--border` on `--destructive-soft` | **3.23** | **4.31** |
| focus ring on the ground | `--ring` on `--background` | **7.15** | **7.88** |
| focus ring on a card | `--ring` on `--card` | **8.64** | **6.80** |
| info chip edge, link wash edge | `--primary-soft-border` on `--primary-soft` | **6.93** | **7.14** |
| link wash edge on a card | `--primary-soft-border` on `--card` | **8.64** | **6.80** |
| settled chip edge | `--success-soft-border` on `--success-soft` | **5.59** | **7.06** |
| provisional chip edge | `--warning-soft-border` on `--warning-soft` | **6.00** | **6.73** |
| void chip edge | `--destructive-soft-border` on `--destructive-soft` | **6.04** | **5.88** |
| destructive outline button edge | `--destructive-soft-border` on `--card` | **7.43** | **5.67** |

`--border` on `--accent` at **3.18** is the worst rule case in the system and the
reason the taupe is as dark as it is. Lightening `--border` to taste is what this
row exists to catch.

Three pairs are measured and **published without a floor**, because none is a
WCAG pairing and each thing is identified by something the rows above already
cover: the card face on the page ground (**1.21 / 1.16** — the card is bounded
by `--border` where drawn and by `--shadow-lift`), the action fill on a card
(**1.96 / 7.54** — the control is identified by its 8.74:1 label and its
shadow), and the accent fill on the ground (**1.04 / 1.36** — a hue step, not a
lightness one). They are in `RECORDED_PAIRS` rather than `AA_PAIRS`. Moving one
of them into `AA_PAIRS` without re-colouring it is what would fail.

#### TC-DS-104 · P0 · Negative — The banned pairing never renders

**Preconditions:** for the numbers, none. For step 3, `/` open in either theme —
its hero band forces the dark theme in both.

**Steps:**
1. Compute white and off-white against `--primary-solid` in both themes.
2. Read `src/lib/__tests__/design-tokens.test.ts`, which asserts the *direction*
   rather than a hex: the action's label is the darker of the two, and white on
   the action ground is below 4.5:1.
3. Inspect the hero's primary action and read its label colour and its ground.

**Expected result:**

- White on PBP Green measures **1.96:1**; the off-white `--foreground` the dark
  theme uses measures **1.69:1**; the beige page ground measures **1.62:1**.
  **There is no size at which any of them is acceptable.**
- The action carries Black Green at **8.74:1**, identically in both themes.
- The token layer cannot produce the other direction:
  `--primary-solid-foreground` is `#0E1F17` in `:root` and in `.dark`, and the
  test asserts the label's relative luminance is lower than the ground's. A
  surface that overrides the label colour on a primary action is what this case
  is watching for, and it fails on the reading in step 3 rather than on the
  tokens.

#### TC-DS-105 · P0 · Positive — Every chart series clears 3:1 on the card it is drawn on

**Preconditions:** none for the numbers. For step 3, any surface rendering a
`ChartFigure`.

**Steps:**
1. Compute each `--chart-N` against `--card` in both themes.
2. Compute `--chart-2` and `--chart-3` against `--background` as well.
3. Confirm every chart on every surface is inside a `ChartFigure`, and that the
   figure's `<details>` list carries every plotted value as text.

**Expected result:** all five series clear **3:1** against `--card`:

| Series | Light | Dark | Values |
|---|---|---|---|
| `--chart-1` | **6.56** | **7.54** | `#136B3F` / `#3ED27E` |
| `--chart-2` | **5.34** | **6.80** | `#6C4CF0` / `#B7A4F7` |
| `--chart-3` | **3.10** | **7.06** | `#E8701A` / `#F2A24A` |
| `--chart-4` | **7.43** | **5.67** | `#9E2B25` / `#F08078` |
| `--chart-5` | **17.11** | **11.80** | `#0E1F17` / `#D8F25E` |

And the constraint that goes with them: **a series is never drawn on the page
ground.** There `--chart-3` measures **2.57** and `--chart-2` **4.42**, so a
figure that escapes its card fails this case even though every series still
clears its floor on a card. `ChartFigure` composing onto a `Card` is what makes
the floor true, not a convention.

`--chart-3` at **3.10** light is the tightest pair in the system. It clears, and
it has no room left.

#### TC-DS-106 · P0 · Negative — The built stylesheet carries no retired class outside the alias block

**Preconditions:** a clean `npm run build`. Static, no browser.

**Steps:**
1. Run `npm run build`.
2. Find the emitted stylesheet — `.next/static/chunks/*.css`, the one of any
   size.
3. Search it for each retired Papan Jadwal utility.
4. For every name found, confirm it is declared in the alias block of
   `src/app/globals.css` or in the aliased utilities at the foot of
   `src/app/styles/type-roles.css`, each of which names **#174** as the ticket
   that removes it.
5. Search `src/` for the three mark-form class names — the strike utility, the
   decoration-thickness override beside it, and the torn-edge class — and for
   the `data-mark` attribute.

**Expected result:**

- The **alias** utilities are present and are expected to be, until #174 runs:
  `.bg-board`, `.ring-offset-board`, `.bg-tile`, `.border-rule`, `.divide-rule`,
  `.bg-rule`, the three wash aliases, `.shadow-tile`, `.shadow-tile-pressed`,
  `.type-hero`, `.type-mark`. Every one of them resolves to a Rally token and
  every one carries a removal note.
- The three **mark-form** names are **absent from the stylesheet and from
  `src/`**, and so is `data-mark`. The torn-edge class cannot render at all:
  `src/app/styles/mark-forms.css`, which defined it, is deleted.
- No retired name is emitted that is not in the alias block.

**Why this case is not obvious.** Tailwind v4's automatic source detection scans
markdown as well as code, so a class name **quoted in this document** is enough
to emit its rule into the built stylesheet even when no element in `src/` uses
it. The retired TC-DS-006 quoted the six marks' class strings verbatim, which is
why the strike utility and the decoration override survived in the CSS long after
their last call site was deleted. That is also why neither this document nor
`DESIGN.md` spells those two names any more: a test document was keeping dead
CSS alive on its own.

Three **recorded-run** rows named the strike utility by its class name as well —
§17.10's TC-MS-017 and TC-MS-021 rows and §18.6's TC-AR-002 row. #152 replaced
the class name with a description of it in those three places and changed nothing
else in them: every ratio, every figure, every negation and every result stands
exactly as it was recorded. A run's record is not editable; the spelling of a
dead class name inside it is, and it had to be, because the spelling was
shipping CSS.

### 16.2 The rendered surfaces

#### TC-DS-107 · P0 · Positive — Every chip carries a visible label, both locales, both themes

**Preconditions:** signed in as Adi for the member surfaces and as
`owner@xclub.local` for the admin ones; run once per locale, in both themes.

**Steps:**
1. Visit `/dashboard`, `/sessions`, a Session's own page, `/payments`,
   `/profile`, `/admin`, `/admin/sessions`, `/admin/payments` and
   `/admin/members`.
2. Find every element carrying `data-slot="chip"` and read its text.
3. Confirm none is empty, none is an abbreviation, and none is the stored enum.
4. Switch locale and read the same chips again.
5. Apply `filter: grayscale(1)` to the page and confirm every state is still
   readable.

**Expected result:** every chip carries a written label, and it is one of the
thirteen the dictionary ships in both locales:

| Key | en | id |
|---|---|---|
| `scheduled` | Scheduled | Terjadwal |
| `ongoing` | Ongoing | Berlangsung |
| `completed` | Completed | Selesai |
| `cancelled` | Cancelled | Dibatalkan |
| `confirmed` | Confirmed | Lunas |
| `pending` | In review | Ditinjau |
| `rejected` | Rejected | Ditolak |
| `registered` | Registered | Terdaftar |
| `maybe` | Maybe | Mungkin |
| `present` | Present | Hadir |
| `optedOut` | Opted Out | Batal Ikut |
| `noShow` | No-Show | Tidak Hadir |
| `unposted` | Unposted | Belum Dipasang |

- A chip with no text cannot be built — `ChipProps` requires `label` and omits
  `children` — so this case is watching for a label that is present but wrong:
  a stored enum (`ABSENT` must never reach a member as "Absent"), an English
  string in the Indonesian build, or a truncated one.
- **In greyscale every state is still readable**, because the word carries it.
  This is what replaced the six mark forms, and it is the whole reason dropping
  them was legitimate (`DESIGN.md`, *The Label Rule*).
- The dot inside a chip is `aria-hidden` and takes `bg-current`, so a screen
  reader hears the label alone and the dot cannot drift off a measured pair.
- No chip label clips: `scrollWidth === clientWidth` at 390px, in `id`, where
  `Belum Dipasang` is the longest label the product sets.

#### TC-DS-108 · P0 · Positive — Focus ring visible on every control, both themes

**Preconditions:** signed in as Adi, then as the owner; run in both themes.

**Steps:**
1. From the top of each of `/dashboard`, `/sessions`, `/payments/upload`,
   `/profile`, `/admin/sessions/new` and `/`, press `Tab` repeatedly.
2. At each stop, read the computed `border-color`, `box-shadow` and
   `outline` of the focused element, and confirm the stop matches
   `:focus-visible`.
3. On a `Button`, wait for its **150ms** transition to settle before judging the
   ring — a ring read in the first frames still measures transparent.
4. Repeat inside a Dialog, a Sheet, a Select's listbox and a Dropdown menu, and
   confirm focus is trapped where the overlay traps it.

**Expected result:** every stop paints an indicator, and every indicator has a
**full-opacity part**:

- **Button** — `focus-visible` resolves a 1px `--ring` border **and** a 3px
  `--ring` ring at 50% alpha. The border is the part that carries the
  requirement: `--ring` measures **7.15 / 7.88** against the page ground and
  **8.64 / 6.80** on a card, against a 3:1 floor. The halo is decoration.
- **Input, Textarea, Select trigger, native select** — a `--ring` border plus a
  2px `--ring` ring offset 2px from the field edge, both at full opacity.
- **Checkbox** — a `--ring/50` 3px ring with the `--ring` border beneath it.
- **Tab** — a `--ring` border, a 3px `--ring/50` ring and a 1px `--ring`
  outline.
- **Link** — the shared `outline-ring/50` from the base layer.

A stop with no visible indicator fails the case. So does an indicator whose only
full-opacity part is a colour the reader cannot distinguish from the surface —
which is what the ratios above are there to rule out.

#### TC-DS-109 · P0 · Positive — Reduced motion is honoured

**Preconditions:** the OS or the browser set to **reduce motion** (DevTools →
Rendering → *Emulate CSS prefers-reduced-motion*). Run in one theme; the rule is
not themed.

**Steps:**
1. Hover a `Button`, a table row, a stat card and a tab, and read the computed
   `transition-duration` of each.
2. Open a Dialog, a Sheet, a Select and a Dropdown menu, and read the computed
   `animation-duration` of the overlay and of the content.
3. Close each of them and confirm the node leaves the DOM rather than staying
   mounted.
4. Look at a loading spinner and at a skeleton.
5. Turn the preference off and confirm the motion returns.

**Expected result:**

- Every transition in the primitives resolves **`0s`**, through
  `motion-reduce:transition-none`. `.transition-rally` resolves `0ms` through
  `src/app/styles/motion.css`.
- The seven overlay slots — `dialog-overlay`, `dialog-content`, `sheet-overlay`,
  `sheet-content`, `select-content`, `dropdown-menu-content` and
  `dropdown-menu-sub-content` — resolve an `animation-duration` of **`1ms`**,
  and the sheet's transition resolves `0ms`. `1ms` rather than `none` on purpose:
  the keyframe still fires `animationend`, so Radix unmounts the node instead of
  leaving it on the page.
- The **skeleton** stops pulsing (`motion-reduce:animate-none`).
- The **spinner keeps turning.** That is the one deliberate exemption: a spinner
  reports that work is in progress, which WCAG 2.3.3 treats as essential motion
  rather than decoration, and stopping it removes the only signal that the app is
  still doing something.
- Nothing on any surface animates because the page loaded or because it scrolled
  into view, with the preference on or off. There are no entrance animations to
  suppress.

#### TC-DS-110 · P1 · Positive — The shared field treatment, at rest, invalid and read-only

**Preconditions:** both themes, both locales, 1440 × 900 and 390 × 844. Visit a
surface composing `Input` (`/onboarding`), `Textarea` (an admin Reject dialog's
reason field) and `Select` (`/admin/sessions/new`'s Activity picker), plus a
read-only field (`/payments/upload`'s server-set amount).

**Steps:**
1. At rest, read the computed background, border colour and `border-radius` of
   an `Input`, a `Textarea` and a `Select` trigger.
2. Submit a form with an invalid value on a field carrying `aria-invalid` and
   read its border and its helper text.
3. Load `ReadOnlyField` and read its background, with the field neither focused
   nor disabled.
4. Repeat at 390 × 844.

**Expected result:** at rest every field resolves a `--card` fill, a 1px
`--input` edge and an **8px** corner — no pill, no transparent ground, at either
width or theme. An `aria-invalid` field resolves a `--destructive` border with a
`--destructive/20` ring, and its helper text names the problem and the fix. A
read-only field falls back to `--background`. A disabled field takes `--input/50`
and 50% opacity, which is a state and not a boundary — a disabled control is
exempt from 1.4.11 and is the only control here that is.

### 16.3 Recorded run — 2026-08-31

Executed by #152 against the committed tokens on Next.js 16, Vitest 4.1.10, and
a production `npm run build`. The computed and static cases were run in full; the
rendered cases were written with their measured expected values and left for the
browser pass, which drives Playwright against merged `main` in both themes and
both locales.

| Case | How | Result |
|---|---|---|
| TC-DS-101 | Computed | **Pass** — 39/39 text pairs clear 4.5:1 in both themes; worst is `--subtle-foreground` on `--background` at **4.99** light |
| TC-DS-102 | Computed | **Pass** — 5/5 inks clear 4.5:1, 5/5 edges clear 3:1; worst is the neutral chip's edge at **3.29** light. The value beside a void chip measures 5.80 / 8.19 on the wash, and no surface strikes it |
| TC-DS-103 | Computed | **Pass** — 16/16 clear 3:1; worst is `--border` on `--accent` at **3.18** light. The three unfloored pairs are in `RECORDED_PAIRS`, not `AA_PAIRS` |
| TC-DS-104 | Computed | **Pass** — white **1.96**, off-white **1.69**, beige ground **1.62** on PBP Green; the action carries Black Green at **8.74** in both themes, and the direction assertion holds |
| TC-DS-105 | Computed | **Fail on first run, then fixed** — `--chart-1` measured **1.96** against the light card. See below |
| TC-DS-106 | Static | **Fail before the rewrite, Pass after** — measured in `.next/static/chunks/*.css`. Before: the strike utility was **present**, with **0** call sites in `src/`. After: **0** occurrences, and so are the torn-edge class and `data-mark`; the only retired decoration utilities left are `text-decoration-line` and `text-decoration-color` inside live `underline` rules, which are CSS property names rather than retired classes. Every retired name still emitted — `.bg-board`, `.ring-offset-board`, `.bg-tile`, `.border-rule`, `.divide-rule`, `.bg-rule`, `.bg-wash-ink`, `.bg-wash-tape`, `.bg-wash-strike`, `.shadow-tile`, `.shadow-tile-pressed`, `.type-hero`, `.type-mark` — is an alias carrying a #174 removal note. Stylesheet **92,998 bytes** |
| TC-DS-107 | Rendered | **Pending — orchestrator run** |
| TC-DS-108 | Rendered | **Pending — orchestrator run** |
| TC-DS-109 | Rendered | **Pending — orchestrator run** |
| TC-DS-110 | Rendered | **Pending — orchestrator run** |

`npm test` runs the computed half of TC-DS-101 through TC-DS-105 on every
commit: **60 pairs × 2 themes**, read out of the committed stylesheet by
`src/lib/__tests__/design-tokens.test.ts`. 499 tests over 29 files passed.

**Defect found and fixed in code.** TC-DS-105 failed as written: `--chart-1` was
PBP Green `#3ED27E` in **both** themes, which measures **1.96:1** against the
light theme's white card — below the 3:1 a plotted mark needs, and visible as a
faint green line in #169's first render. It broke a second rule at the same time:
*The One Action Rule* reserves that green for the action and names a chart series
as exactly what it must not become. Fixed by giving the light theme the settled
green **ink** `#136B3F` instead, which measures **6.56:1** on a card; the dark
theme is unchanged, because there the ink step and the bright value are the same
colour. The five series pairs were then added to `AA_PAIRS` (55 → **60**), so
the next one cannot be introduced without clearing the floor. Nothing was
softened: the earlier decision that "colour is free for charts" was withdrawn
rather than restated.

**Defect found and fixed in code.** TC-DS-109 was unsatisfiable as written. The
overlay layers animate through `tw-animate-css`, which ships no reduced-motion
guard, and Tailwind's `motion-reduce:` variant cannot reach them — the enter
utilities are emitted as `[data-state='open']` selectors, which outrank a plain
class. `src/app/styles/motion.css` now collapses the seven overlay slots to a
`1ms` animation under `prefers-reduced-motion: reduce`, unlayered so it wins over
`@layer utilities`. The spinner is left turning deliberately.

**Decision recorded, not a defect.** The overlay entrance and exit animations
themselves **stay**, which #150 and #151 each declined to settle alone. Rally
bans *entrance and scroll* animation — content animating in because a page loaded
or because it came into view. A Dialog, Sheet, Select or Dropdown-menu open-close
answers a tap, tells a reader a layer arrived rather than the page having been
replaced, and Radix needs the exit keyframe to keep the node mounted while it
plays. They are now instant under reduced motion, which is what the rule was
actually protecting. `DESIGN.md`'s Motion section states the rule at that scope,
so the document and the code agree.

**Documented facts that turned out to need correcting.** Two, both in
`DESIGN.md` and both fixed there:

- *Borders are for controls and dividers, not for cards* was written as an
  absolute, and the overlay surfaces — dialog, sheet, popover, menu — all carry
  `--border` as well as `shadow-lift`. They should: an overlay floats over
  whatever happened to be underneath it. The rule now says so.
- *The No-Glow Rule* bans zero-offset shadows, and every focus ring in the
  system is one. A ring is a state indicator WCAG requires, not depth; the rule
  now excludes it explicitly.

**One gap reported, not fixed.** `.transition-rally` and `--duration-rally:
175ms` shipped in #151 with **no consumer**: every transition in the primitives
predates them and carries Tailwind's own `duration-150` (or `duration-200` on the
Sheet), all inside the spec's 150–200ms band and all carrying
`motion-reduce:transition-none`. Adopting the utility means editing surfaces four
other tickets own, so #152 documented the state instead of sweeping it. The
surface runs are what adopt it.

### 16.4 Superseded by Rally — `TC-DS-001` … `TC-DS-017`

ADR 0003 retires Papan Jadwal in full and says its cases are **marked
superseded, not deleted**. What follows is the marker and the pointer for each.
The step-by-step bodies are not reproduced: every one of them asserted a mark
form, a lattice rule, a tile radius or a retired token's ratio, none of those
exists, and the old TC-DS-006 body in particular was emitting dead CSS into the
production stylesheet by quoting class names (TC-DS-106). The full text of all
seventeen is in this file's history at `0dea3c0`.

The rule used to separate the two: **a case is superseded when the thing it
asserts no longer exists** — a mark's form, a lattice's rule, a tile's corner, a
retired token's ratio. **A case stays live when it asserts something a member can
still do or still read** — a label, a route, a status, a keyboard path, a locale
string — even where the surface drawing it is scheduled for recomposition. A
future change is not grounds for superseding a case that passes today.

| Case | Marker | Superseded by |
|---|---|---|
| TC-DS-001 · Enamel text-on-surface pairs clear AA | **Superseded by Rally** — the enamel material and the Graphite / Court Green tokens are gone | TC-DS-101, light theme |
| TC-DS-002 · Painted-board text-on-surface pairs clear AA | **Superseded by Rally** — same, dark side | TC-DS-101, dark theme |
| TC-DS-003 · Mark-on-wash pairs clear AA, enamel | **Superseded by Rally** — there are no marks; five chips replaced six marks | TC-DS-102, light theme |
| TC-DS-004 · Mark-on-wash pairs clear AA, painted board | **Superseded by Rally** — same, dark side | TC-DS-102, dark theme |
| TC-DS-005 · The banned action pairing never renders | **Superseded by Rally** — the obligation is unchanged, the ground is now PBP Green and the numbers are different | TC-DS-104 |
| TC-DS-006 · The six marks survive colour removal | **Superseded by Rally** — the forms are gone; the state now survives colour removal because the label is a word (*The Label Rule*) | TC-DS-107 |
| TC-DS-007 · Lattice rules stay visible, enamel | **Superseded by Rally** — the lattice is gone (ADR 0003); the 3:1 obligation is not | TC-DS-103, light theme |
| TC-DS-008 · Lattice rules stay visible, painted board | **Superseded by Rally** — same, dark side | TC-DS-103, dark theme |
| TC-DS-010 · The fold law holds at 1440 × 900 | **Superseded by Rally** — the public band-stack surface and its fold law are retired and re-decided by spec #143 | the public spec's own suite |
| TC-DS-011 · The landing is keyboard-reachable with a visible focus ring | **Superseded by Rally** — the ring is `--ring` purple now, not Court Green Lit, and the replacement covers every control rather than one route | TC-DS-108 |
| TC-DS-017 · The Inputs / Fields treatment on every shared field | **Superseded by Rally** — `bg-tile`, `border-rule` and the 2px corner are all retired; the treatment is now a `--card` fill, an `--input` edge and an 8px corner | TC-DS-110 |

**Six of the seventeen stay live**, and are not marked:

- **TC-DS-009** — the landing action is reachable without scrolling on a phone.
  Behaviour, not geometry, and the obligation does not move. Its **415px**
  measurement does: it was taken against a hero whose headline came only from
  the dictionary, and **#153 has since made the headline and subline
  Admin-authored** (`publicHeroHeadline`, `publicHeroSubline`, capped at 48
  characters with no word over 12, and 120, in `src/lib/public-copy.ts`), so a
  longer authored headline moves the action down the page. Re-measure against
  the seeded copy **and** against a headline at the 48-character cap; spec #143
  recomposing the route is a second reason to re-measure. Neither is grounds for
  superseding the case — a number to re-take is not a rule that stopped
  applying.
- **TC-DS-012** — the account-creation statement is present in both locales and
  tied to the control by `aria-describedby`. Untouched by the design system.
- **TC-DS-013** — the hero band renders the forced theme in both themes and the
  rail above it stays themed. The behaviour survives verbatim; only the
  vocabulary moved, from *painted board in both materials* to *`.dark` in both
  themes* (`DESIGN.md`, *The Theme-Is-Not-An-Inversion Rule*).
- **TC-DS-014** — the Activity colour column is gone and nothing renders in its
  place, including the `201` from `POST /api/activities` with a stray `color`.
  One bullet of its expected result is **superseded in part**: the livery is no
  longer *a magnet tile bearing the Activity's initial*, because `Activity.icon`
  returns with a renderer under spec #145. What stays live is the part the case
  is named for — no swatch, no inline `background-color` or `border-color`, and
  no `color` key in the response.
- **TC-DS-015** and **TC-DS-016** stay live as well. TC-DS-015 (no English leaks
  into the Indonesian build) is unaffected except that the labels it names are
  now chip labels resolved from `t.chips`; the strings are the same. One
  addition to its allow-list, from #153: the landing headline and subline are
  now Admin-authored (`publicHeroHeadline`, `publicHeroSubline`) and fall back to
  the dictionary only when blank, so once an Admin has written them they are
  **runtime configuration** and are expected to read identically in both
  locales — like the community name, and unlike a hardcoded literal. TC-DS-016
  (one lettering system, tabular figures on every number that matters) is
  unaffected except in citation: it names *The One Hand Rule*, which is restated
  as *The One Family Rule*, and the family it asserts is unchanged.

---

## 17. Member surfaces (`TC-MS-*`)

Spec #29 rebuilt what a member sees: the Slot Cell and the sessions board, the
dashboard composed from the same cell, the payments history on the marks, the
Proof upload that used to dead-end on an empty select, the profile's payment
mode, the mobile rail. This area tests **what the member can see and do** on
those surfaces.

That is the line every case here is written to. "A member with no resolved
payment mode reaches the Proof upload and is given a route out" is a test. "The
uploader filters memberships by effective mode" is an implementation detail that
passes while the member is still stuck, so no case below asserts one.

> **Rally markers (#152).** Cases and bullets in this area that assert lattice,
> tile or mark **geometry** carry a `Superseded by Rally` or `Partly superseded
> by Rally` blockquote under their heading, with a pointer to what replaces
> them. Nothing is deleted (ADR 0003). The rule used to separate the two is in
> §16.4: a case is superseded when the thing it asserts no longer exists, and
> stays live when it asserts something a member can still do or still read —
> even where the surface drawing it is scheduled for recomposition by spec #144.
> Four cases here are superseded in whole or in the half that named a mark form;
> the behavioural assertions in every one of them stay live and are still P0.

Seat-holding is money-backed and transactional. Every case that claims,
withdraws or pays therefore asserts **capacity from the database**, before and
after, as numbers — not from what the screen happened to draw.

### 17.0 Conventions, surfaces and shared preconditions

This area inherits **§16.0 in full** and restates none of it: the same id /
priority / type / preconditions / numbered steps / expected-result shape, the
same P0-P1-P2 meanings, the same two board materials (enamel = `:root`, painted
board = `.dark`, both in `src/app/styles/board-materials.css`), the same theme
toggle and `NEXT_LOCALE` switches, the same two viewports (**390 × 844** and
**1440 × 900**), and the same rule that a contrast case fails when a measurement
falls **below its target**, not when it differs from the number printed here.
Ratios quoted below are §16's measured values for the same token pairs, reused
rather than recomputed.

**Surfaces in scope.** `/dashboard`, `/sessions`, `/sessions/{id}`,
`/sessions/{id}/pay`, `/payments`, `/payments/upload`, `/profile`, and the
member shell that carries them — the sticky top bar and the fixed mobile bottom
rail from `src/components/layout/member-nav.tsx`.

**Out of scope**, deliberately: every `/admin/*` surface (spec #30 owns those),
the public route `/` and onboarding (§16 and §5 own those), and No-Show, which
nothing in this product records — see TC-MS-021.

**Shared preconditions for every case in this area**, on top of §16.0's:

1. §1 prerequisites done, `npm run dev` running on `http://localhost:3000`, and
   the §2 seed freshly loaded (`npm run db:seed`).
2. The accounts are §3's, with no new fixture and no fixture invented in a case:
   - `member@xclub.local` — **Adi Pratama**. In all four seeded Activities;
     Badminton Dues **unpaid** this period, Basket / Futsal / Tennis
     **Confirmed**; Badminton mode MONTHLY.
   - `eka.saputri@xclub.local` — **Eka Saputri**. One Membership, Futsal, with
     `paymentMode = null`.
   - `yoga.saputra@xclub.local` — **Yoga Saputra**, a §3 roster member. One
     Membership, Badminton, at `PER_SESSION` (§2's `PER_SESSION_NAMES`); his
     Seats are funded by SESSION Payments, never by Dues.
   - `owner@xclub.local` — used only to Confirm or Reject, in TC-MS-017.
3. The Sessions are §4's. The three this area leans on most:
   - **Free Play (Maybe Test)** — Badminton, Saturday 10:00–12:00, `maxPlayers`
     **20**, fee **0**. Adi seeded `MAYBE` (which holds no Seat), Sari and Bima
     `REGISTERED`, Dewi `MAYBE` → `seatsHeld: 2`, `seatsFree: 18`.
   - **Futsal Friday** — Futsal, Friday 20:00–22:00, `maxPlayers` **12**, fee
     15 000. Adi plus six roster members `REGISTERED` → `seatsHeld: 7`,
     `seatsFree: 5`. Futsal's `minMembers` is **4**.
   - **Hold Lab (Per-Session Test)** — Badminton, 18:00–20:00, `maxPlayers`
     **8**, fee 25 000. Four `REGISTERED` rows as seeded, two of them on holds
     (one live, one already lapsed), so the first capacity-sensitive read drops
     it to three and an hour later to two.
4. **Capacity is read from the database, never from the screen.** The helper is
   `.claude/seat-audit.ts` in the main tree (git-ignored):

   ```bash
   npx tsx .claude/seat-audit.ts "<part of the Session title>" member@xclub.local
   ```

   It prints `seatsHeld`, `seatsFree`, `byStatus` (all four `AttendanceStatus`
   values), `mySeat` (`status` + `holdExpiresAt`) and `myPayment` (`status`,
   `amount`, `type`) for one Session. **It does not run the lazy hold sweep** —
   load the page under test once first, then run it, or a lapsed hold still
   counts here while the app has already let it go. Every "before" and "after"
   figure in a case below is that helper's output.
5. The RSVP window closes **24 hours** before a Session starts
   (`RSVP_CLOSE_HOURS_BEFORE`), and a Session that is not `SCHEDULED` or whose
   window has closed is offered no control at all. Cases needing a control
   therefore name a Session more than a day out.
6. `1rem = 16px`: the app sets no root font size, so the Slot Cell's
   `grid-cols-[5.5rem_…]` leading column is **88px** at every width.

**A note on the regression net.** §12 and §13 (member sessions, payments and
profile) and the attendance behaviour under §7 are the regression net for
everything this spec did not intend to change — capacity counting, seat release,
mode resolution, monthly against per-session billing. They are re-run, not
rewritten. One of them is stale rather than failing: **§12.2's expected wording
("grouped This week / Later", quota badges, filters) was invalidated by #57**,
which replaced that arrangement with a week read down the page. TC-MS-004 and
TC-MS-007 are the current expectation for that surface; §12.2 wants an edit from
whoever owns it, and is recorded under *Suspected defects* below rather than
softened here.

---

### 17.1 Eka — a Membership with no payment mode chosen

Sign in as **Eka** (`eka.saputri@xclub.local`). Enamel, `en`, 1440 × 900 unless
a step says otherwise.

#### TC-MS-001 · P0 · Negative — The Proof upload names the missing payment mode and gives a working route to choose one

**Preconditions:** signed in as Eka. Her only Membership is Futsal with
`paymentMode = null`; Futsal offers **both** ways to pay (`allowsMonthly` and
`allowsPerSession` are true in the §2 seed), so no mode auto-applies.

**Steps:**
1. Open `/payments`, then follow **Pay now** / the **Upload Proof** route to
   `/payments/upload`. Open `/payments/upload` directly as well.
2. Read the heading and the sentence beneath it.
3. Press the action beneath them and note where it lands.
4. In the browser console:
   `await fetch('/api/users/memberships').then(async r => [r.status, await r.json()])`
   and read the Futsal row.

**Expected result:** the screen renders **no select, no form and no empty
dropdown**. It renders, in the 40rem single-task column:

- A heading at **Display**: `You have not chosen how you pay yet` (en) /
  `Kamu belum memilih cara pembayaran` (id).
- A sentence at **Body** in Secondary Ink naming her own Activity and her own
  period: “You have not chosen how you pay for **Futsal**, so no monthly dues
  have been raised for **{Month} {Year}**. You pick monthly or per session when
  you claim a seat in a session.” A generic "your activities" fails the case.
- An action reading `Choose how you pay` / `Pilih cara pembayaran`. Because
  exactly **one** Activity is named, it links to
  `/sessions?activityId=<Futsal id>` — the sessions list already scoped to
  Futsal. A link to the bare `/sessions`, or no action at all, fails the case.
- A **Back to dues history** / **Kembali ke riwayat iuran** link above it, so
  the screen is never a cul-de-sac.

`GET /api/users/memberships` returns **200** and the Futsal row carries
`joined: true`, `allowsMonthly: true`, `effectiveMode: null` — the triple that
makes this `modeUnchosen` and not one of the other four causes. No other cause's
copy appears: `Nothing monthly to pay here` on this screen fails the case.

Following the action and opening **Futsal Friday** gives the plain `Register`
CTA with no price and the Monthly-vs-Per-session dialog (§13.6) — the route out
actually resolves the cause it named. Nothing is written by any of this: no
Payment row, no Membership change.

#### TC-MS-002 · P1 · Negative — The board withholds the claim on an Activity she has not joined

**Preconditions:** signed in as Eka; `/sessions`. She is in Futsal only, so
Badminton, Basket and Tennis are Activities she is browsing, not in.

**Steps:**
1. On `/sessions`, the view filter is **My activities** — read the board.
2. Switch the filter to **All activities** / **Semua aktivitas**.
3. Find a `SCHEDULED` Badminton row more than 24 hours out with free Seats — the
   §4 **Hold Lab (Per-Session Test)** row will do.
4. Read what the row offers, and press the row itself.

**Expected result:**

- Under **My activities** the board draws Futsal only, and still draws **all
  seven days** — the days with nothing on them take a Blank `None` / `Kosong`
  cell rather than being dropped.
- Under **All activities** the Badminton row appears with its free-Seat figure,
  and carries **no claim control at all**. Reserving joins the Activity, so a
  one-tap claim from a row that shows neither the price nor the word "join"
  would enrol her and open a bill in one tap; the offer is withheld and the row
  keeps its link instead.
- Pressing the row opens `/sessions/{id}`, where the price and the join are both
  stated. A `Claim a Seat` or `Claim & pay` control on an unjoined Activity's
  row fails the case (this is the third defect `dbc6a38` fixed, and the case
  exists to keep it fixed).
- Nothing is written: `npx tsx .claude/seat-audit.ts "Hold Lab" eka.saputri@xclub.local`
  reports `mySeat: null` and `myPayment: null` before and after.

---

### 17.2 Yoga — a Membership billed per Session only

Sign in as **Yoga Saputra** (`yoga.saputra@xclub.local`).

#### TC-MS-003 · P0 · Negative — The Proof upload tells a per-Session-only member where a Fee is actually paid

**Preconditions:** signed in as Yoga. His only Membership is Badminton at
`PER_SESSION` (§2's `PER_SESSION_NAMES`), and the seed has already funded his
Seats with **Confirmed** SESSION Payments.

**Steps:**
1. Open `/payments/upload`.
2. Read the heading, the sentence and the action.
3. Press the action and note where it lands.
4. In the console: `await fetch('/api/users/memberships').then(async r => [r.status, await r.json()])`.
5. Go back to `/payments` and read the history.

**Expected result:**

- Heading at **Display**: `Nothing monthly to pay here` /
  `Tidak ada iuran bulanan di sini`.
- Sentence at **Body** in Secondary Ink: “You are billed per session for
  **Badminton**, so there are no monthly dues for **{Month} {Year}**. A session
  fee is paid from the session itself, when you claim a seat.”
- Action `Go to sessions` / `Buka daftar sesi`, linking to
  `/sessions?activityId=<Badminton id>` because exactly one Activity is named.
- **The two causes are never confused.** `You have not chosen how you pay yet`
  appearing here fails the case, and so does the reverse in TC-MS-001: a
  confident wrong explanation is worse than none, which is the whole reason
  these two are separate P0s.
- `GET /api/users/memberships` returns **200**; the Badminton row carries
  `joined: true` and `effectiveMode: "PER_SESSION"`, and **no** row in the
  response has `effectiveMode: "MONTHLY"`.
- `/payments` still has content: his SESSION Payments render as **Ink** marks
  reading `Confirmed` / `Lunas` in the history, with `Fee` / `Biaya Sesi` and
  the Billing Period beside the amount. "Nothing monthly to pay" and "no money
  here at all" are different statements and the two screens must not agree.

---

### 17.3 Adi — the sessions board (`/sessions`)

Sign in as **Adi** (`member@xclub.local`). Enamel, `en`, 1440 × 900 unless a
step says otherwise. Run these in order: TC-MS-009 through TC-MS-011 write.

#### TC-MS-004 · P0 · Positive — Every day of the displayed week gets a cell, and the two silences read differently

> **Partly superseded by Rally (#152).** One bullet is retired: *the board is a
> ruled lattice, not a card list*, with its `gap-px` over a rule-coloured ground
> and its shared 1px rules. ADR 0003 replaced the lattice with card grids on
> member surfaces, so a card list is now the correct answer and this bullet
> would fail the surface it is checking. Pointer: the member surface spec (#144)
> settles the composition. **Everything else stays live**, and it is what the
> case is named for: seven consecutive Monday-first day bands with none skipped,
> and the two silences reading differently — a standing slot nobody posted says
> so, a day nobody planned says *nothing on this day*, and telling a member the
> Admin is behind on a day nothing was planned for is a lie the board is not
> allowed to tell. The `Unposted` and `None` marks are now `neutral` chips
> carrying the same words.

**Preconditions:** Adi; `/sessions`; the default **My activities** view and the
current WIB week. Adi is in all four Activities, whose standing weekly slots are
Badminton Sunday 19:00–21:00, Basket Tuesday 19:30–21:30, Tennis Thursday
17:00–19:00, Futsal Friday 20:00–22:00 (§2 seed).

**Steps:**
1. Open `/sessions`.
2. Count the day bands from the top of the board to the bottom, and read each
   heading.
3. Find a day carrying a posted Session.
4. Find a day whose Activity has a standing weekly slot with nothing posted on
   it.
5. Find a day with neither.
6. Inspect the board's own container and the rules between cells.

**Expected result:**

- Exactly **seven** day bands, Monday-first, consecutive, none skipped — one
  `<h2>` per day reading `<Weekday> <d> <Month>` ("Monday 18 August" /
  "Senin 18 Agustus"), from the week's Monday to its Sunday. A week that renders
  six bands, or that skips a day because nothing is on it, fails the case.
- A day with a posted Session draws one Slot Cell per Session, linked to
  `/sessions/{id}`.
- A day carrying a **standing weekly slot with nothing posted** draws a Slot
  Cell whose title is the **Activity's own name**, whose `when` rail carries the
  Activity's recurring start and end times, whose standing column is a **Blank**
  mark reading `Unposted` / `Belum Dipasang`, and whose note under the venue
  reads `An Admin has not posted this session yet.` /
  `Admin belum mengumumkan sesi ini.` That row is **not** a link, takes no hover
  tint, and carries no control.
- A day with **neither** draws one cell carrying a **Blank** mark labelled
  `None` / `Kosong` beside `Nothing on this day.` /
  `Tidak ada apa pun di hari ini.` Labelling this day `Unposted` fails the case:
  one silence means an Admin owes the board a Session and the other means nobody
  was ever going to play, and telling a member the Admin is behind on a day
  nothing was planned for is a lie the board is not allowed to tell.
- The board is a **ruled lattice**, not a card list: one column of day rows,
  cells sharing 1px rules with their neighbours through `gap-px` over a
  rule-coloured ground, at 1440 **and** at 390. A missing rule, or a gap between
  floating cards, fails the case.
- No column heads, no horizontal scrolling, and
  `document.documentElement.scrollWidth === document.documentElement.clientWidth`
  at both widths.

#### TC-MS-005 · P1 · Edge — A week with no Sessions at all still draws seven ruled day rows

> **Partly superseded by Rally (#152).** *Ruled* and *the lattice never degrades
> into an unruled list* are retired with the lattice (ADR 0003, and see
> TC-MS-004); read the title as "seven day rows". Pointer: the member surface
> spec (#144). **Still live, and the point of the case:** seven bands on an
> empty week, four unposted standing slots and three empty days, **no**
> community-wide "never had a Session" strip on a week a member merely paged
> forward to, and Previous week returning unchanged.

**Preconditions:** Adi; `/sessions`.

**Steps:**
1. Press **Next week** / `Minggu berikutnya` repeatedly until the week on screen
   carries no posted Session at all. The seed posts nothing beyond about a week
   out; recurring generation runs at month end, so step past any generated week
   in the following month rather than settling for it.
2. Read the week caption, the number of day bands, and every cell.
3. Confirm no notice strip has appeared above the board.

**Expected result:**

- The caption reads `{start} – {end}`, the far end carrying its year
  ("18 August – 24 August 2026").
- **Seven** day bands, still. Four of them carry an unposted standing-slot cell
  (Sunday Badminton, Tuesday Basket, Thursday Tennis, Friday Futsal), each with
  a **Blank** `Unposted` / `Belum Dipasang` mark and the "has not posted"
  sentence. The other three carry a **Blank** `None` / `Kosong` cell.
- **No Blank-marked notice strip above the board.** That strip answers "has this
  community ever had a Session", which is community-wide and unfiltered; the
  seed has Sessions, so a strip here would tell a member who merely paged
  forward that their community is new. TC-MS-006 is the case that earns it.
- Every rule is still drawn and the lattice never degrades into an unruled list.
- **Previous week** returns to the populated week unchanged.

#### TC-MS-006 · P1 · Edge — A community that has never had a Session keeps its board and says so

**Preconditions:** Adi. This case needs a reversible manipulation of the local
database and **must be followed immediately by `npm run db:seed`**. Never run it
against production.

**Steps:**
1. In Prisma Studio (`npm run db:studio`) or the local SQL console, delete the
   transactional tables in §15's order — `Attendance`, then `Payment`, then
   `ActivitySession` — so `ActivitySession` holds zero rows. Leave users,
   memberships, activities and settings alone.
2. Open `/sessions`.
3. Read what sits above the board, and then the board itself.
4. Run `npm run db:seed` and reload; confirm the strip is gone.

**Expected result:**

- A **Blank**-marked strip renders above the board: the mark reads `Unposted` /
  `Belum Dipasang`, and the sentence beside it reads `Sessions have not been
  posted yet. They appear here as soon as an Admin posts one.` / `Belum ada sesi
  yang diumumkan. Sesi akan muncul di sini begitu Admin mengumumkan satu.`
- **The board is not dropped.** Seven day bands still render beneath the strip,
  with unposted standing-slot cells on the four recurring weekdays and `None` /
  `Kosong` on the rest. An empty page, a dropped board, or a spinner that never
  resolves all fail the case: Blank means *expected but not yet placed*, which
  is the honest state of a community that has just been set up.
- After reseeding, the strip is gone and the board is TC-MS-004's again.

#### TC-MS-007 · P0 · Positive — The Slot Cell's three columns hold their positions at 1440 × 900 and 390 × 844

> **Superseded by Rally (#152).** The shared Slot Cell seam is retired by
> ADR 0003 — each member surface composes its own card, and the three fixed
> columns, the `5.5rem` `when` rail and the shared standing edge go with it.
> Pointer: the member surface spec (#144) owns what replaces this. The one
> assertion that outlives the cell is that the control is a **sibling** of the
> link and never a descendant, which is restated in `DESIGN.md`, *Retired
> rules*, as still in force on any card in any design system.

**Preconditions:** Adi; `/sessions`; a week carrying at least six rows; run at
both viewports and in both locales.

**Steps:**
1. At 1440 × 900, for **every** row of the week, read
   `getBoundingClientRect().left` of the start-time figure, `.left` of the
   Session title, and `.right` of the standing element (the mark, or the
   free-Seat figure).
2. Read the computed width of the `when` column.
3. Find a row carrying a claim or withdraw control and read the control's
   `.left`, plus whether its `<button>` is a descendant of the row's `<a>`.
4. Read `document.documentElement.scrollWidth` against `clientWidth`.
5. Repeat all of it at 390 × 844.

**Expected result:**

- The `when` rail is a fixed **5.5rem = 88px** track at both widths
  (`grid-cols-[5.5rem_minmax(0,1fr)_auto]`, root font size not overridden). It
  carries the start time as Figure with the end time as Caption beneath it and
  **nothing else** — no title, no venue, no mark, no control. On this surface it
  carries no date either: the day band above the rows owns that.
- Each of the three x-values holds **one** value down every row of the week, at
  each width. #57 recorded **388 / 486 / 1038** at 1440 × 900 and
  **27 / 125 / 333** at 390 × 844 across all eight of its rows; those are the
  reference, and the case fails on a row that differs from **its own column's**
  value, not on a difference from those figures.
- Where a row carries a control, the control sits on its **own row beneath** the
  three columns, on the same `grid-cols-[5.5rem_minmax(0,1fr)]` template, so its
  left edge equals the title's left edge to the pixel and the `when` rail stays
  a column of times beside it. In the DOM the `<button>` is a **sibling** of the
  `<a>`, never a descendant — `anchorEl.contains(buttonEl)` must be `false`.
- No cell reflows onto a second line at 390px, and
  `scrollWidth === clientWidth` on the document at both widths.
- The rows are the same three columns on both materials and in both locales; the
  Indonesian build is the binding one and is covered by TC-MS-008.

#### TC-MS-008 · P0 · Positive — The widest mark this product sets never collides with the seat figure

> **Superseded by Rally (#152).** There are no marks, and there is no lattice
> for one to collide inside — five labelled chips replaced the six marks (#149)
> and ADR 0003 replaced the ruled lattice with card grids. Pointer: TC-DS-107
> asserts that no chip label clips at 390px in `id`, which is what this case was
> protecting. **Keep the measurement:** the widest label this product sets is
> the Indonesian `Belum Dipasang` at **133.8px**, and any future fixed-width
> cell putting a label beside a figure has to budget for that, not for the
> ~105px a session status suggests. The member surface spec (#144) owns the
> layout that has to hold it.

**Preconditions:** Adi; `/sessions`; locale **`id`** (the binding locale); run at
1440 × 900 and 390 × 844.

**Steps:**
1. Switch to Indonesian on `/profile` → Language.
2. Find a row whose standing column is the Blank mark `BELUM DIPASANG` — the
   widest mark in the product at **133.8px**, measured for #57 and kept on the
   record in `DESIGN.md`, and also the commonest, because every standing slot an
   Admin has not posted carries one.
3. Read that mark's bounding box against its cell's content box, and against the
   rows above and below.
4. Find a row whose standing column is the free-Seat figure `n/max` and read its
   right edge.
5. Read `markEl.scrollWidth` against `markEl.clientWidth`.
6. Repeat at 390 × 844.

**Expected result:**

- **#57's resolution is that the collision is dissolved, not paid for.** The
  week reads down the page as one column of ruled day rows at every width, so a
  mark and a seat figure are never inside the same fixed-width cell and never
  compete for the same 200px, whatever an Activity is named and whatever
  language it is read in. There is no `12.5rem` column floor, no horizontally
  scrolling rail and no `88rem` board measure on this surface — all three went
  with the seven-column lattice. Finding any of them fails the case.
- The `BELUM DIPASANG` mark does **not** wrap:
  `markEl.scrollWidth === markEl.clientWidth`, and its own height is one line.
- The mark's **right edge never crosses its cell's content box**: it is at or
  inside the cell's padding-box right minus the `10px` cell padding, at 390 and
  at 1440.
- The mark's right edge is the **same** value as the free-Seat figure's right
  edge on every other row — the shared standing edge TC-MS-007 records for
  column three. A mark that sits 6px past its cell's right edge, as the lattice
  did at an `11rem` floor, fails the case.
- No horizontal page overflow at either width.

#### TC-MS-009 · P0 · Positive — Claim a Seat from the row you are reading, and the capacity moves by exactly one

**Preconditions:** Adi; `/sessions`, on the week carrying **Free Play (Maybe
Test)** (Badminton, Saturday 10:00–12:00, `maxPlayers` **20**, fee **0**). Adi is
seeded `MAYBE` there, which holds no Seat. The Session is more than 24 hours out.

**Steps:**
1. Load `/sessions` once, so the lazy hold sweep has run, then read the truth
   from the database:
   `npx tsx .claude/seat-audit.ts "Free Play" member@xclub.local`.
   Record `seatsHeld`, `seatsFree`, `byStatus` and `mySeat`.
2. On the Free Play row, read the standing column and the control's label and
   accessible name.
3. Press the control. Watch the network tab.
4. Re-run the helper with the same arguments.

**Expected result:**

- **Before:** the standing column is a **Tape** mark reading `Maybe` /
  `Mungkin` — the reader's own tentative RSVP outranks the seat figure. The
  helper reports `seatsHeld: 2`, `seatsFree: 18`,
  `mySeat: { "status": "MAYBE", "holdExpiresAt": null }`, `byStatus.MAYBE: 2`,
  `myPayment: null`.
- The control reads `Claim a Seat` / `Ambil kursi` — **not** `Claim & pay`,
  because this Session's fee is 0 — and its accessible name is
  `Claim a Seat in Free Play (Maybe Test)` /
  `Ambil kursi di Free Play (Maybe Test)`, so a screen reader hears which
  Session the control belongs to.
- On pressing it, `POST /api/sessions/{id}/reserve` returns **201** with
  `{"payUrl": null}`, a toast reads `Seat claimed.` / `Kursi diambil.`, and the
  row re-renders **in place** — no navigation, because there is no bill.
- **After, on the row:** the standing column is an **Ink** mark reading
  `Registered` / `Terdaftar`, and the control has flipped to `Withdraw` /
  `Batal ikut`. The three columns have not moved (TC-MS-007's values still hold).
- **After, in the database** — this is the assertion, not the screen:
  `seatsHeld: 3`, `seatsFree: 17` — exactly one higher and one lower;
  `mySeat: { "status": "REGISTERED", "holdExpiresAt": null }` — a free Seat is
  permanent and is **never** held on a payment hold; `byStatus.MAYBE: 1`; and
  `myPayment: null`, because a fee-0 Session raises no Payment. A `holdExpiresAt`
  with a value here fails the case.

#### TC-MS-010 · P0 · Positive — Withdraw from the row; the Seat comes back and the row says Opted Out

**Preconditions:** Adi; `/sessions`, on the week carrying **Futsal Friday**
(Futsal, Friday 20:00–22:00, `maxPlayers` **12**, fee 15 000; use **Next week**
if it is not on the current board). Adi holds a Seat there and his Futsal Dues
for this period are **Confirmed** — which is exactly what makes the release a
forfeit rather than a deletion.

**Steps:**
1. Load `/sessions`, then
   `npx tsx .claude/seat-audit.ts "Futsal Friday" member@xclub.local`.
2. Read the row: standing column, the note under the venue, the control.
3. Press the control and read the toast.
4. Re-run the helper.
5. Reload `/sessions` and read the row again.

**Expected result:**

- **Before:** standing is an **Ink** mark reading `Registered` / `Terdaftar`.
  The note under the venue is the quota — an **Ink** mark reading `Quota met` /
  `Kuota terpenuhi` with `(7/4)` in tabular figures, Futsal's `minMembers` being
  4. The control reads `Withdraw` / `Batal ikut`, accessible name
  `Withdraw from Futsal Friday` / `Batal ikut Futsal Friday`. Helper:
  `seatsHeld: 7`, `seatsFree: 5`,
  `mySeat: { "status": "REGISTERED", "holdExpiresAt": null }`, `myPayment: null`.
- `DELETE /api/sessions/{id}/attendance` returns **200** with
  `{"success": true, "isForfeited": true}`, and the toast is the **forfeit**
  sentence, not the plain one: `Seat released. Your Dues cover the month, not
  this Session, so nothing is refunded.` / `Kursi dilepas. Iuranmu menanggung
  satu bulan, bukan sesi ini, jadi tidak ada pengembalian dana.` The plain
  `Seat released — somebody else can take it now.` here fails the case: Dues
  were paid, and leaving a member to expect money back is the thing this copy
  exists to prevent.
- **After, on the row:** the standing column is the free-Seat figure again —
  `Free` / `Sisa` over **6/12** in tabular figures, with the spoken form
  `6 of 12 seats free` / `6 dari 12 kursi tersisa` for a screen reader. It is
  **not** a mark: the member released that Seat, so the free-Seat figure is the
  fact they now need.
- Their withdrawal is said on the **Session's own line** instead: an **Erased**
  mark reading `Opted Out` / `Batal Ikut` beside `You released this Seat.` /
  `Kamu melepas kursi ini.`, in the note position under the venue, where it
  outranks the quota. The word **Absent** appearing anywhere on this row fails
  the case — the stored `ABSENT` is Opted Out to a member, always
  (`CONTEXT.md`).
- The control reads `Claim a Seat` / `Ambil kursi` again: a released Seat may be
  reclaimed.
- **After, in the database:** `seatsHeld: 6`, `seatsFree: 6`,
  `mySeat: { "status": "ABSENT", "holdExpiresAt": null }`, `byStatus.ABSENT: 1`.
  The row is **kept** as ABSENT rather than deleted — ABSENT holds no Seat, and
  the row is what stops the monthly attendance sync silently re-registering him
  on the next page load. A deleted row here fails the case.

#### TC-MS-011 · P0 · Positive — The board and the claim-a-Seat flow are reachable and operable from the keyboard

**Preconditions:** Adi; `/sessions`; either material; **Free Play (Maybe Test)**
on screen, with Adi holding the Seat TC-MS-009 claimed.

**Steps:**
1. From the top of the document, press `Tab` repeatedly and note every stop, in
   order, and whether each paints a visible ring.
2. Count the stops within one Slot Cell that has a control, one that has none,
   and one unposted cell.
3. Tab to the Free Play row's control and press `Enter`.
4. Run `npx tsx .claude/seat-audit.ts "Free Play" member@xclub.local`.
5. Tab back to the same control — now `Claim a Seat` — and press `Enter`.
6. Re-run the helper.

**Expected result:**

- Tab order is document order and matches reading order: the shell's controls,
  then the board's filters, then the week nav (`Previous week`, `This week`,
  `Next week`), then the board itself top to bottom, day band by day band.
- **Two** stops per posted cell that carries a control — the row anchor first,
  then its control — **one** stop for a posted cell with no control, and
  **zero** for an unposted standing slot or an empty day, which are not links.
  A control that cannot be reached, or one reached before the row it belongs to,
  fails the case.
- Every stop paints a visible `:focus-visible` indicator. The row anchor's ring
  is drawn **2px inside** the cell edge rather than offset outside it (an offset
  ring would be clipped by the lattice's own `overflow-hidden`) and is Court
  Green `--ring`, measuring **6.98:1** against the enamel tile and **6.00:1**
  against the painted-board tile — both far past the 3:1 a non-text indicator
  needs. The control carries the shared button ring. A stop with no visible
  indicator fails the case.
- `Enter` on the control does exactly what a press does. Releasing:
  `DELETE …/attendance` → **200**, `{"isForfeited": false}` (Adi's Badminton
  Dues are unpaid, so nothing covered this Session), toast `Seat released —
  somebody else can take it now.` / `Kursi dilepas — anggota lain bisa
  mengambilnya sekarang.` Helper after: `seatsHeld: 2`, `seatsFree: 18`,
  `mySeat: null` — the row is **deleted**, not kept, because no Dues covered it.
- Claiming again: `POST …/reserve` → **201**, `{"payUrl": null}`, toast `Seat
  claimed.`, helper `seatsHeld: 3`, `seatsFree: 17`,
  `mySeat: { "status": "REGISTERED", "holdExpiresAt": null }`.
- Focus is not lost to the top of the document after either write: the refresh
  re-renders the row without a navigation.

---

### 17.4 Adi — the dashboard (`/dashboard`)

#### TC-MS-012 · P1 · Positive — The dashboard draws every day of its own range, each cell carrying its own date

> **Partly superseded by Rally (#152).** *The dashboard's small boards are ruled
> lattices, not card lists* is retired (ADR 0003); pointer, the member surface
> spec (#144). **Still live:** every day of the range gets a cell, a day carrying
> two Sessions contributes two cells, every cell carries its own date, and no
> tracked-caps label clips at 390px in `id` — the recorded widths there
> (`Kehadiran 103px`, `Mendatang 109px`, `Iuran 55px`) are a measurement to
> re-take, not an assertion to retire.

**Preconditions:** Adi; `/dashboard`; enamel; `en`; both viewports. The
dashboard's range is **today through the sixth day after it** — seven days, per
Activity.

**Steps:**
1. Open `/dashboard`.
2. For one Activity card, count the day cells and read the Figure Lead numeral
   and the short weekday label at the head of each.
3. Compare a Session row here against the same Session's row on `/sessions`.
4. Find a day in the range with nothing posted and nothing planned.
5. At 390 × 844, read the three summary tiles' labels in **`id`** and check each
   for clipping (`el.scrollWidth === el.clientWidth`).

**Expected result:**

- Each Activity card carries **at least seven** cells and skips no day: the day
  figures are seven consecutive calendar days beginning with today, and a day
  carrying two Sessions of one Activity contributes two cells rather than
  replacing one.
- Every cell carries its **own** date in the `when` rail — the short weekday as
  Label (`Sun`…`Sat` / `Min`…`Sab`) above the day-of-month as **Figure Lead** —
  because there is no day band above these rows to carry it. That is the one
  deliberate difference from the sessions board's cells; the three columns are
  otherwise identical, and a Session's title, venue, livery and standing read
  the same in both places.
- A day with neither a posted Session nor a standing slot takes a **Blank** mark
  labelled `None` / `Kosong` beside `Nothing on this day.` /
  `Tidak ada apa pun di hari ini.`, and still carries its date figure.
- Cells share 1px rules through `gap-px` over a rule-coloured ground; the
  dashboard's small boards are ruled lattices, not card lists, at both widths.
- At 390 × 844 in `id`, the three summary tiles stack one per row (below 640px)
  and none of the tracked-caps labels clips: `KEHADIRAN` **103px**,
  `MENDATANG` **109px**, `IURAN` **55px** as #59 recorded, each with
  `scrollWidth === clientWidth`. `KEHADIRA` or `MENDATAN` cut mid-word fails the
  case.

#### TC-MS-013 · P1 · Positive — The dashboard's cells carry no claim control, and its money mark comes from the resolver

**Preconditions:** Adi; `/dashboard`; run once per material.

**Steps:**
1. Read each Activity card's header: livery tile, name, and the mark hard right.
2. Read the Badminton card's mark, then the Basket, Futsal and Tennis cards'.
3. Look for any claim or withdraw control inside a day cell.
4. Press the Badminton header mark.

**Expected result:**

- Badminton, whose Dues are unpaid this period, carries a **Blank** mark reading
  `Pending` / `Pending` — Dues nobody has placed yet — and it is
  a link to `/payments/upload`.
- Basket, Futsal and Tennis, whose Dues are **Confirmed**, each carry an **Ink**
  mark reading `Confirmed` / `Lunas`, from the mark resolver and not from a
  surface-local colour.
- **No day cell on this surface carries a claim or withdraw control.** The
  dashboard composes the Slot Cell without opting into the action, which is
  exactly what the cell's optional `action` field is for; the claim lives on the
  sessions board and on the Session's own page. A control here is not a bug
  found — it is a change to a decided contract, and fails the case.
- Every cell is still a link to its Session, and the row-wide tap target works.
- No state on this surface is carried by colour alone: each mark's form (filled
  rectangle with a solid border for Ink, 1px dashed outline with no fill for
  Blank) identifies it with the colour removed.

---

### 17.5 Adi — a Session's own page (`/sessions/{id}`)

#### TC-MS-014 · P0 · Positive — The detail header is the same Slot Cell, and the page says one date

> **Partly superseded by Rally (#152).** *The same Slot Cell* is retired with the
> seam (ADR 0003, and see TC-MS-007), so the half of this case asserting that the
> header is the identical component with the identical three columns no longer
> holds. Pointer: the member surface spec (#144). **Still live:** the page says
> **one** date and does not repeat it, and the header's facts are the Session's
> own — that is behaviour, and it survives whatever draws it.

**Preconditions:** Adi; open **Hold Lab (Per-Session Test)** from the board; run
at both viewports.

**Steps:**
1. Read the header block at the top of the page: the `when` rail, the title, the
   standing column, the venue and livery line.
2. Read the facts card immediately beneath it.
3. Compare the date the header shows with the date the facts card shows.
4. Compare the header against the same Session's row on `/sessions`.

**Expected result:**

- The header is the **Slot Cell**, not a second arrangement: the same three
  columns in the same fixed positions, the same livery (a magnet tile bearing
  the Activity's initial, no colour, no swatch), the same standing precedence,
  the same marks. Two differences only, both deliberate: the `when` rail carries
  the **date** (full weekday as Label above the day-of-month as Figure Lead),
  because there is no day band here to carry it; and the cell is **not** a link
  and carries **no** control, because the member is already on this Session and
  the RSVP card below owns the claim.
- **The page says one date.** The header's weekday and day-of-month and the
  facts card's `<Weekday>, <d> <Month>` name the **same** calendar day. A header
  reading `SUNDAY 23` above a facts card reading `Monday, 24 August` fails the
  case — that was the second defect `dbc6a38` fixed, caused by the facts card
  formatting the same instant through the machine's zone, and this case exists
  to keep it fixed.
- The facts card repeats none of the header's facts: it carries the full date,
  the duration, the map link, the **Fee** and the Admin's notes, and never the
  times, the venue or the quota a second time.
- The participants list draws each Participant's standing through the mark
  resolver — `Registered` / `Terdaftar` as Ink, `Maybe` / `Mungkin` as Tape —
  with Adi's own row suffixed `(you)` / `(Kamu)`.

#### TC-MS-015 · P0 · Positive — Reserving a paid Seat holds it on money not yet sent, and capacity moves at once

**Preconditions:** Adi; **Hold Lab (Per-Session Test)** (Badminton, 18:00–20:00,
`maxPlayers` **8**, fee 25 000), more than 24 hours out. Adi's Badminton mode is
MONTHLY and this period's Dues are **unpaid**, so the Seat is claimed against
the Dues bill. The hold duration is the `holdDurationMinutes` setting, **60**
minutes in the seed.

**Steps:**
1. Load `/sessions/{holdLabId}` once so the sweep runs, then
   `npx tsx .claude/seat-audit.ts "Hold Lab" member@xclub.local` and record
   every field.
2. Read the RSVP card's CTA.
3. Press it and note where it lands.
4. Re-run the helper **without** loading another page first, then again after
   loading `/payments`.
5. Go back to `/sessions/{holdLabId}` and to `/sessions`, and read both.

**Expected result:**

- **Before:** the helper reports `mySeat: null` and `myPayment: null`. The seed
  gives Hold Lab four `REGISTERED` rows, two of them on holds — one lapsed
  before the anchor and one an hour after it — so after the first sweep
  `seatsHeld` is **3** (`seatsFree: 5`), and **2** (`seatsFree: 6`) once the
  live hold has also lapsed. Record whichever it is; the assertion below is a
  delta, not an absolute.
- The CTA reads `Register & pay` / the Indonesian equivalent followed by
  `· Rp 75.000` in tabular figures — the **monthly** fee, because Adi is billed
  monthly for Badminton and that is the bill behind this Seat. A per-Session
  price here would be the wrong bill.
- Pressing it: `POST /api/sessions/{id}/reserve` returns **201** with
  `{"payUrl": "/payments/upload"}` and the browser is taken straight there —
  claiming and paying are one flow, and the Seat is never held outside the hold
  window because the same response does both.
- **After, in the database:** `seatsHeld` is exactly **one higher** and
  `seatsFree` exactly one lower than the before figures;
  `mySeat.status === "REGISTERED"`; `mySeat.holdExpiresAt` is non-null and is
  **60 minutes** after the reservation instant; and `myPayment` is still
  `null` — the Seat is held on money that has not been sent yet, which is what
  makes it provisional.
- Back on `/sessions/{holdLabId}`: the RSVP card shows the countdown `Reserved ·
  pay within MM:SS` above a `Pay monthly first · Rp 75.000` button and a cancel
  control. On `/payments`, the Badminton dues card carries the same deadline as
  a countdown beside its **Blank** `Pending` mark.
- **Known gap, recorded rather than asserted as a pass:** on the `/sessions`
  board the Hold Lab row now offers `Withdraw` and says nothing about the
  deadline — the board's read carries no `holdExpiresAt`. #60 judged a third
  action kind out of scope and recorded it. The case records it here too; it is
  not softened into an expectation, and it is listed under *Suspected defects*.

---

### 17.6 Adi, then the owner — Monthly Dues (`/payments`, `/payments/upload`)

Run TC-MS-016 and TC-MS-017 in order: the second reviews what the first
submitted.

#### TC-MS-016 · P0 · Positive — Upload Proof and leave it pending: Tape everywhere, and a month of Seats made permanent

> **Partly superseded by Rally (#152).** One bullet is retired: *the Tape mark's
> form survives colour removal — a filled rectangle whose right edge is three ink
> teeth*. The torn edge is gone with the marks (#149) and the CSS file that drew
> it is deleted. Pointer: **TC-DS-107** — the state now survives colour removal
> because the chip carries the word `In review` / `Ditinjau`, which is a stronger
> guarantee than a shape a reader has to learn. **Everything else stays live**,
> and it is nearly all of the case: the state reads `In review` on every surface
> and never borrows `Pending`, and paying a month makes that month's Seats
> permanent without moving `seatsHeld` on a Session that had no room.

**Preconditions:** Adi; TC-MS-015 has run, so a Badminton Seat is held on a live
hold. Any JPEG/PNG/WebP under 5MB will do as the Proof image.

**Steps:**
1. Before uploading, record the Badminton picture:
   `npx tsx .claude/seat-audit.ts "Hold Lab" member@xclub.local` and
   `npx tsx .claude/seat-audit.ts "Weekly Rally" member@xclub.local`.
2. Open `/payments/upload`. Read the Activity select, the two locked fields and
   the bank details.
3. Attach the image and press `Submit for review` / `Kirim untuk ditinjau`.
4. Read the toast and where it lands.
5. Read `/payments`: the dues card, the banner, and the history's newest row.
6. Read `/dashboard`: the Badminton card's mark.
7. Re-run both helper calls from step 1.

**Expected result:**

- The uploader renders the **form**, not an explanation: Adi has a monthly
  Activity, so `resolveProofUploadCase` returns `monthly`. Badminton is offered
  in the select; **Period** and **Amount** are read-only (TC-MS-018 covers their
  treatment); the bank details for Badminton are shown beside the upload.
- `POST /api/payments/upload` returns **201**. A toast confirms, and the browser
  returns to `/payments`.
- **On every surface the state is Tape, and only Tape.** `/payments`: the
  Badminton dues card carries a **Tape** mark reading `In review` / `Ditinjau`,
  the unpaid banner is **gone**, and the newest history row carries a **Tape**
  mark reading `In review` / `Ditinjau` with `Dues · {Month} {Year}` /
  `Iuran · {Month} {Year}` above the amount. `/dashboard` and `/profile`: the
  Badminton mark is `In review` / `Ditinjau` too, no longer the Blank
  Blank `Pending`. **The two states never borrow each other's word.** `In review`
  means a Proof was sent and an Admin has not looked at it; `Pending` means
  nothing has been sent. A surface saying `In review` before a Proof exists, or
  `Pending` after one does, fails the case — and every surface but the dues card
  said `Pending` for both until the run of 2026-08-20.
  A card still reading `Unpaid` after a Proof was sent fails the case — the
  member has acted.
- The Tape mark's form survives colour removal: a filled rectangle whose right
  edge is three ink teeth (`mark-torn`, a 6px `::after` band clipped by the
  sawtooth path), which is what tells it from Ink at label size.
- **Capacity, from the database.** Paying a month buys availability for the
  month, so the upload does two things to Seats, and both are asserted:
  - On **Hold Lab**: `mySeat.holdExpiresAt` is now `null` — the Seat is
    permanent, the sweep can no longer take it — while `mySeat.status` stays
    `"REGISTERED"` and `seatsHeld` is **unchanged**.
  - On every other `SCHEDULED`/`ONGOING` paid Badminton Session in this calendar
    month that had room, Adi is now `REGISTERED` where he was not: on **Weekly
    Rally Night** `mySeat` was already `REGISTERED` and stays so, and any paid
    Badminton Session of the month he held no row in gains one, each lifting
    that Session's `seatsHeld` by exactly one. **Full Court Challenge** gains
    nothing — `seatsHeld: 6`, `seatsFree: 0` before and after — because the sync
    respects capacity. Record `seatsHeld` for each Badminton Session before and
    after; a Session whose `seatsHeld` rose by more than one, or which went over
    `maxPlayers`, fails the case.

#### TC-MS-017 · P0 · Positive — The owner Rejects the Proof: Strike, a named reason, a way back, and the Seats released

> **Partly superseded by Rally (#152).** *A bordered rectangle with a real line
> through the label* is retired: nothing in the product strikes anything now, and
> the rejected row carries a **void** chip reading `Rejected` / `Ditolak`.
> Pointer: **TC-DS-102**, which asserts both that the void chip clears its floor
> and that no value is struck. **Still live, unchanged, and the reason the case is
> P0:** the amount beside it is **dimmed, not struck**; the reason is quoted
> verbatim in supporting ink and not in a status colour; the refund guidance and
> the route back to an Admin are both there; and rejecting the Dues releases
> exactly the Seats that Payment was holding, no more.

**Preconditions:** TC-MS-016 has run and left one PENDING Badminton MONTHLY
Payment. Sign in as `owner@xclub.local` for steps 1–2, then back as Adi.

Adi also holds three *historical* Attendance rows on Badminton Sessions dated
inside that same calendar month — one `PRESENT`, one `ABSENT` (Opted Out) and
one `NO_SHOW`, the last recorded by an Admin from that Session's own attendance
register (`/admin/sessions/{id}/attendance`, saved through
`POST /api/sessions/{id}/attendance/bulk`) — the Session edit form has carried no
attendance control since #67. Record their `Attendance.id` values before step 2;
the case asserts on them in step 7.

**Steps:**
1. As owner, open `/admin/payments`, filter Status = Pending, find Adi's
   Badminton row.
2. Press **Reject**, type the reason `wrong amount`, and confirm. Note the HTTP
   status.
3. Sign back in as Adi and open `/payments`, then
   `/payments?historyStatus=REJECTED`.
4. Read the rejected row: mark, amount, reason, and what follows it.
5. Read the Badminton dues card and the `/dashboard` Badminton mark.
6. Re-run the helper calls from TC-MS-016 step 1.
7. Re-read the three precondition Attendance rows by `Attendance.id`, straight
   from the database.

**Expected result:**

- `PATCH /api/payments/{id}` returns **200**. Rejecting an already-reviewed
  Payment would return **409**; rejecting with an empty reason is refused in the
  dialog with a message, and by the route with a **400** (`TC-AR-025`).
- The member's history row carries a **Strike** mark reading `Rejected` /
  `Ditolak` — a bordered rectangle with a real line through the label — and the
  **amount beside it is dimmed to Secondary Ink, not struck**: the mark carries
  the line, a second line through the value reads as damage to the row.
- Beneath it, in Secondary Ink and not in a surface-local status colour: the
  reason (`Reject reason: wrong amount` / the Indonesian equivalent), the refund
  guidance, and a WhatsApp link to the Admin. A rejected row with no reason, or
  with the reason in red, fails the case.
- The Badminton dues card is a **Blank** `Pending` mark again and
  is a link to `/payments/upload` — a rejected Proof leaves the member with
  something to do, and the way to do it. On `/dashboard` the Badminton card's
  mark is `Rejected` / `Ditolak`, still a link to the uploader.
- **Capacity, from the database.** Rejecting the Dues releases every Seat that
  Payment was holding this period: every `REGISTERED` row of Adi's across
  Badminton's Sessions in that calendar month is deleted, so each of those
  Sessions' `seatsHeld` **falls by exactly one**. It does not necessarily return
  to its TC-MS-016 "before" figure: where Adi already held an unfunded row on a
  Session before the upload, the upload added nothing there and the Reject still
  takes one away. *Falls by exactly one* is the rule that holds everywhere.
  `PRESENT`, `ABSENT` and `NO_SHOW` rows are untouched — a
  completed Session's history is never rewritten, and a No-Show is history in
  exactly the way the other two are. Assert this on **Hold Lab** and on
  **Weekly Rally Night**: `mySeat` is `null` on both afterwards.
- **History survives the Reject, from the database.** Re-read the three
  precondition rows by `Attendance.id`. All three still exist and all three
  still carry their original status — `PRESENT`, `ABSENT` and `NO_SHOW`. A
  missing `NO_SHOW` row, or one whose status changed, fails the case: the
  cleanup deletes on `status: 'REGISTERED'` and nothing else, and No-Show is
  preserved by that construction rather than by a rule of its own
  (`docs/adr/0001-no-show-attendance-value.md`).

#### TC-MS-018 · P0 · Positive — Money display: a column of amounts aligns, and a server-set amount is visibly not the member's to edit

**Preconditions:** Adi; run at both viewports and on both materials. The seed
plus TC-MS-016/017 give the history at least five rows with three different
Payment states.

**Steps:**
1. Open `/payments`. On the history, read every amount's
   `getBoundingClientRect().right` and its computed `font-variant-numeric`.
2. Read the amount format itself, and the label above it.
3. Open `/payments/upload`. Inspect the **Period** and **Amount** fields:
   computed `background-color`, the `readOnly` attribute, the lock affordance,
   the note beneath, and what the note is tied to.
4. Reserve a per-Session Seat and open `/sessions/{id}/pay`; inspect its
   **Amount** field the same way. (Use Hold Lab after switching Badminton to
   Per session, or simply open the pay page for an outstanding reservation from
   `/payments`.)
5. Try to type into every read-only field.

**Expected result:**

- Every amount in the history column carries `font-variant-numeric:
  tabular-nums` and every amount's **right edge is the same value** — #58
  recorded **1271.5** at 1440 × 900 and **342** at 390 × 844 across five rows.
  The case fails on two rows whose right edges differ by more than 0.5px, not on
  a difference from those figures.
- Amounts render as whole Rupiah with `id-ID` grouping and no subunits —
  `Rp 75.000`, `Rp 25.000` — **in both locales**, because a Rupiah amount is a
  Rupiah amount in English too. A `Rp 75,000` in the English build fails the
  case.
- Above each amount, in tracked caps, is which of Dues or a Fee it settles and
  which Billing Period, **with the year**: `Dues · August 2026` /
  `Iuran · Agustus 2026`, `Fee · August 2026` / `Biaya Sesi · Agustus 2026`. The
  stored `MONTHLY` / `SESSION` enum never appears to a member.
- On `/payments/upload`, **Period** and **Amount** are `readOnly`, take the
  **ground** fill (`--board`: `#E8EBEA` on enamel, `#1B2621` on painted board)
  rather than the tile fill of an editable field, carry a lock glyph, and each
  carries a note naming who set them — `The current period, set by the calendar`
  / `Periode berjalan, mengikuti kalender` and `Set by this activity's monthly
  fee` / `Ditetapkan dari iuran bulanan aktivitas ini` — tied to the input by
  `aria-describedby`, so a screen-reader user hears why the field will not
  accept typing. The **Amount** additionally takes the tabular Figure role.
  Typing changes nothing in either field.
- On `/sessions/{id}/pay`, the Amount field is `readOnly` and tabular, and its
  note reads `Set by this session's fee` / `Ditetapkan dari biaya sesi ini`
  (OBS-06). See *Suspected defects* — this field is expected to diverge from the
  treatment above on at least the lock glyph, and on the painted board possibly
  on the fill as well.
- The read-only state is carried by **form and words** — ground fill, lock,
  note — never by colour alone.

---

### 17.7 Adi — the mobile bottom navigation rail

#### TC-MS-019 · P0 · Positive — The rail's cells are equal, reachable, and the active one is a filled tile

> **Partly superseded by Rally (#152).** *A filled tile* is retired vocabulary
> and a retired shape: the active navigation item is now the Lime `--accent`
> highlight carrying `--accent-foreground` at **13.68 / 10.06**, on a pill rather
> than a square tile. Pointer: **TC-DS-101** for the ratio, and the member
> surface spec (#144) for the rail's composition. **Still live:** the cells are
> equal-width and each is a real tap target, every cell is reachable, and the
> active one is distinguishable **without relying on its hue** — which is now
> carried by the weight change as well as the fill (`DESIGN.md`, *The Boundary
> Rule*).

**Preconditions:** Adi; viewport **390 × 844**; run once per material and once
per locale.

**Steps:**
1. Open `/dashboard`. The rail is `md:hidden`, so confirm it is present below
   768px and **absent** at 1440 × 900, where the top bar carries the nav
   instead.
2. Read each cell's computed width and the rules between them.
3. Tap each cell in turn and confirm the destination.
4. Read the active cell's background, its label colour and its `aria-current`.
5. Tab to each cell and read the focus indicator.
6. Read the labels in `id` and check each for clipping.

**Expected result:**

- The rail is a **fixed, full-bleed row of equal cells divided by 1px rules**,
  with a 1px rule along its top edge and no gaps — never floating pills. #53
  recorded **four cells at 97.75px each** in a 390px viewport and a rail
  **63px** tall; the assertion is that the four widths are **equal to within
  1px of each other**, which is what the `min-w-0` fix restored after they
  measured 95.2px to 100.4px.
- Four cells: `Dashboard` / `Dashboard` → `/dashboard`, `Sessions` / `Sesi` →
  `/sessions`, `Payments` / `Iuran` → `/payments`, `My Profile` / `Profil Saya`
  → `/profile`. Each is a real link, each reaches its surface in one tap, and
  each is at least 44px tall (`min-h-14`).
- The **active** cell is a filled Court Green identity tile —
  `--primary-solid` ground carrying `--primary-solid-foreground` ink — and
  carries `aria-current="page"`. Form, not colour alone, is what marks it: the
  filled rectangle is visible with the colour removed.
- Contrast, reusing §16's measured values for the same token pairs — every pair
  clears its target on **both** materials:

  | Pair | Tokens | Target | Measured (enamel / painted board) |
  |---|---|---|---|
  | active cell label | `--primary-solid-foreground` on `--primary-solid` | 4.5 | **6.98** / **6.82** |
  | inactive cell label | `--secondary-foreground` on `--tile` | 4.5 | **6.13** / **5.45** |
  | the rail's top rule and its dividers | `--rule` on `--tile` | 3 | **3.72** / **3.74** |
  | focus ring, inactive cell | `--ring` on `--tile` | 3 | **6.98** / **6.00** |
  | focus ring, active cell | `--primary-solid-foreground` on `--primary-solid` | 3 | **6.98** / **6.82** |

- In `id` no label clips: `scrollWidth === clientWidth` on each, which is what
  the short forms `Sesi` and `Iuran` exist for.

#### TC-MS-020 · P0 · Negative — The rail does not obscure the primary action on a short screen

**Preconditions:** Adi; viewport **390 × 640** — deliberately shorter than 844,
because a rail that clears the action on a tall phone can still sit on it on a
short one.

**Steps:**
1. Open `/dashboard` and scroll to the bottom.
2. Read the rail's `getBoundingClientRect().top` and the bottom edge of the last
   interactive element in `<main>`.
3. Read the computed `padding-bottom` of `<main>`.
4. Repeat on `/payments`, on `/payments/upload` (whose primary action is
   `Submit for review`), and on `/sessions/{id}` (whose primary action is the
   RSVP CTA).
5. Confirm the last action can be pressed without the rail intercepting the tap.

**Expected result:**

- **On every surface, the primary action's bottom edge sits above the rail's top
  edge.** #53 recorded the rail at **577–640** in a 390 × 640 viewport, **63px**
  tall, with the last action's bottom edge at **527** — 50px of clearance. The
  case fails on any surface where `action.bottom > rail.top`, whatever the
  figures.
- The clearance is reserved once, by the layout, not per page: `<main>` carries
  `padding-bottom` of **96px** (`pb-24`) below 768px and **24px** (`md:pb-6`)
  above it, so no surface has to remember. A page that reserves its own
  clearance instead is a second answer to one question and should be reported.

---

### 17.8 Adi — the marks in both board materials

#### TC-MS-021 · P0 · Positive — Every mark a member can reach, on every member surface that shows state, in both materials

> **Superseded by Rally (#152).** Every assertion in this case is about the six
> marks: their forms in greyscale, their `data-mark` attribute, their per-mark
> wash ratios and the two board materials. None of those exists — five labelled
> chips replaced the marks (#149), no element carries `data-mark`, and the
> materials are now two themes. Pointer: **TC-DS-107** for the labels on every
> member surface in both locales, **TC-DS-102** for the ink and edge ratios.
> **What carries over unchanged** is the rule underneath it, and TC-DS-107
> asserts it: no mark label is ever the stored enum, and `Absent` must not appear
> anywhere on a member surface — the member chose to opt out, which is not a
> failure.

**Preconditions:** Adi; run the whole case **twice**, once per material, at
1440 × 900. TC-MS-009, TC-MS-010, TC-MS-016 and TC-MS-017 have run, so the
Tape, Strike and Erased producers are live rather than stubbed.

**Steps:**
1. Visit each surface below and find every mark on it.
2. For each mark, read its label, its `data-mark` attribute, and the contrast of
   its label against the wash it sits on.
3. Switch material and repeat.
4. On one surface, apply `filter: grayscale(1)` to the page and confirm each
   mark is still tellable apart by form alone.

**Expected result:** five of the six marks have a live producer on a member
surface, and each is drawn through the one resolver — no surface picks its own
mark or its own status colour:

| Mark | Where a member reaches it | Label (en / id) |
|---|---|---|
| **Ink** | `/sessions` standing column on a Seat held (TC-MS-009); `/payments` dues card and history on a Confirmed Payment; `/dashboard` Activity mark on Confirmed Dues; `/sessions/{id}` participants list; `/sessions` quota line when met | `Registered` / `Terdaftar`, `Confirmed` / `Lunas`, `Quota met` / `Kuota terpenuhi` |
| **Tape** | `/sessions` standing column on a `MAYBE` row; `/payments` dues card and history on a Payment awaiting review; `/payments` outstanding-reservation row; `/dashboard` and `/profile` Activity mark; `/sessions` quota line when short | `Maybe` / `Mungkin`, `In review` / `Ditinjau`, `Needs {n} more` / `Butuh {n} lagi` |
| **Strike** | `/sessions` standing column on **Rained Out (Cancelled)**; `/payments` history on a Rejected Payment (TC-MS-017) | `Cancelled` / `Dibatalkan`, `Rejected` / `Ditolak` |
| **Erased** | `/sessions` and `/sessions/{id}` note line after a withdrawal that forfeited Dues (TC-MS-010) | `Opted Out` / `Batal Ikut` |
| **Blank** | `/sessions` unposted standing slot and empty day; `/sessions` standing column on **Full Court Challenge**; `/payments` dues card when unpaid; `/dashboard` Activity mark when no Payment exists; `/profile` Membership row for an unpaid period | `Unposted` / `Belum Dipasang`, `None` / `Kosong`, `Full` / `Penuh`, `Pending` (both locales — the loanword the Indonesian dictionary already keeps) |
| **Hollow** | Producer is an Admin-recorded `NO_SHOW` attendance value (#64, PR #75); the reader's own No-Show draws Hollow in the Slot Cell standing column (#78) | `No-Show` / `Tidak Hadir` |

- Every mark clears **4.5:1** against the wash it sits on, in both materials —
  the same pairs §16 measured: Ink **6.31** / **5.40**, Tape **5.36** / **6.20**,
  Strike **5.97** / **5.45**, Erased **5.41** / **6.19**, Blank **5.41** /
  **5.45** worst case, Hollow **5.73** / **5.04** worst case.
- In greyscale the five live marks are still tellable apart by **form**: Ink a
  solid 1px border around a filled rectangle; Tape a filled rectangle whose
  right edge is three ink teeth; Strike a bordered rectangle with a real line
  through the label; Erased flat, ground-coloured, with **no** border; Blank a
  **1px** dashed outline with no fill. Hollow's **2px** dashed outline is only
  reachable through the component strip in TC-DS-006, and Blank and Hollow are
  never interchangeable, so that dash weight stays load-bearing.
- **Erased now has a live surface**, which §16.17 recorded as not existing: the
  Slot Cell's Opted Out line produces it on `/sessions` and on the Session's own
  header. Hollow still has none. Whoever next edits §16.17 should say so.
- No mark label is ever the stored enum: `Absent` must not appear anywhere on a
  member surface.

---

### 17.9 Adi — the Indonesian build

#### TC-MS-022 · P1 · Positive — No English leaks into any member surface

**Preconditions:** Adi; locale `id`, set on `/profile` → Language or by setting
the `NEXT_LOCALE` cookie; visit `/dashboard`, `/sessions`, a Session's page,
`/sessions/{id}/pay`, `/payments`, `/payments/upload` and `/profile`, plus the
top bar and the bottom rail. Run at 390 × 844, where a longer Indonesian string
is most likely to break something as well as to be missing.

**Steps:**
1. Read every visible string on each surface in `id`.
2. Read the same surface in `en` and list the strings that are byte-identical in
   both.
3. For each identical string, check whether it is a dictionary entry
   (`src/lib/i18n/dictionaries.ts`) or a hardcoded literal.
4. Sign in as **Eka** and as **Yoga** and read their `/payments/upload` in `id`
   as well — the five dead-end explanations are the newest copy in the product.
5. On each surface, check no tracked-caps label clips.

**Expected result:** no user-facing string bypasses the dictionary. The strings
identical across locales are only the ones §16's TC-DS-015 already allows — the
community name and other runtime configuration, proper nouns (Activity names,
Session titles, member names, venues, emails), numerals and Rupiah amounts, and
the loanwords the Indonesian dictionary deliberately keeps. Anything else
identical is a hardcoded literal and fails the case. In particular:

- Mark labels switch: `Unposted` → `Belum Dipasang`, `None` → `Kosong`,
  `Confirmed` → `Lunas`, `In review` → `Ditinjau`, `Rejected` →
  `Ditolak`, `Registered` → `Terdaftar`, `Maybe` → `Mungkin`, `Opted Out` →
  `Batal Ikut`, `Full` → `Penuh`.
- The board's two silences switch: `Nothing on this day.` → `Tidak ada apa pun
  di hari ini.` and `An Admin has not posted this session yet.` → `Admin belum
  mengumumkan sesi ini.`
- The Seat controls switch: `Claim a Seat` → `Ambil kursi`, `Claim & pay` →
  `Ambil & bayar`, `Withdraw` → `Batal ikut`, and their accessible names with
  them.
- The forfeit sentence switches whole: `Seat released. Your Dues cover the
  month, not this Session, so nothing is refunded.` → `Kursi dilepas. Iuranmu
  menanggung satu bulan, bukan sesi ini, jadi tidak ada pengembalian dana.`
- The rail's short labels switch: `Sessions` → `Sesi`, `Payments` → `Iuran`.
- All five Proof-upload dead-end explanations switch — title, body and action.
- Rupiah amounts do **not** switch: `Rp 75.000` in both, by design.
- Nothing clips: every tracked-caps label has `scrollWidth === clientWidth` at
  390px.

---

### 17.10 Recorded run — 2026-08-20

Executed once against the §2 seed on Next.js 16, 1440 × 900 / 390 × 844 /
390 × 640, both materials, both locales, on a **UTC+8 host** — which is not WIB,
and is what exposed the first defect below. Every capacity figure quoted in a
case was read from the database with `.claude/seat-audit.ts`, before and after,
never from the screen.

| Case | Priority | Result |
|---|---|---|
| TC-MS-001 | P0 | **Pass** — no select, no form; heading at Display 48/800, body at 15px in Secondary Ink naming **Futsal** and **August 2026**; action → `/sessions?activityId=<Futsal>`; `GET /api/users/memberships` **200** with `joined: true`, `effectiveMode: null`; the other cause's copy absent |
| TC-MS-002 | P1 | **Pass** — under *My activities* Futsal only, all seven days drawn; under *All activities* exactly **two** controls on the page, both on her own Futsal, none on Badminton / Basket / Tennis; `mySeat: null` and `myPayment: null` before and after |
| TC-MS-003 | P0 | **Pass** — `Nothing monthly to pay here` naming **Badminton**; action → `/sessions?activityId=<Badminton>`; **200** with `effectiveMode: "PER_SESSION"` and no MONTHLY row; `/payments` still shows three Ink `Confirmed` rows reading `FEE · AUGUST 2026` |
| TC-MS-004 | P0 | **Pass** — seven bands Monday-first, none skipped; `UNPOSTED` + "An Admin has not posted this session yet." distinct from `NONE` + "Nothing on this day."; lattice is `gap-px` over `bg-rule` inside `border-rule`; `scrollWidth === clientWidth` at both widths |
| TC-MS-005 | P1 | **Pass** — "14 September – 20 September 2026", seven bands, exactly 4 Blank `UNPOSTED` + 3 Blank `NONE`, **no** notice strip |
| TC-MS-006 | P1 | **Pass** — with `ActivitySession` at zero rows the Blank strip renders with its exact sentence **and** the seven-band board is still drawn beneath it; restored by `npm run db:seed` |
| TC-MS-007 | P0 | **Pass** — `when` = **88px** at both widths; across all 12 rows one value per column: **387.5 / 485.5 / 1037.5** at 1440, **27 / 125 / 348** at 390; control rows on `88px 552px` with the button's left edge **485.5**, equal to the title's; `anchor.contains(button) === false`; no page overflow |
| TC-MS-008 | P0 | **Pass** — `BELUM DIPASANG` measures **133.8px** exactly, `scrollWidth === clientWidth`, right edge on the cell's content box (1037.5 at 1440, 348 at 390) and identical to every seat figure's; no `12.5rem` floor, no scrolling rail, no `88rem` measure — the only `overflow-x-auto` on the page is the Activity filter row, which contains no board row and does not scroll |
| TC-MS-009 | P0 | **Pass** — before Tape `MAYBE`, `seatsHeld: 2`, aria `Claim a Seat in Free Play (Maybe Test)`; **201** `{"payUrl": null}`, toast `Seat claimed.`, no navigation; after Ink `Registered`, control `Withdraw`, columns unmoved, `seatsHeld: 3` / `seatsFree: 17`, `holdExpiresAt: null`, `myPayment: null` |
| TC-MS-010 | P0 | **Fail → fixed → Pass** — every clause held (**200** `{"isForfeited": true}`, the forfeit sentence, Erased `Opted Out` + "You released this Seat.", seat figure back to 6/12, `seatsHeld` 7 → 6, row **kept** as `ABSENT`, no "Absent" anywhere) **except the control, which read `Claim & pay`**. See defect 3 |
| TC-MS-011 | P0 | **Fail → fixed → Pass** — order, stop counts (2 / 1 / 0) and rings all held: anchor ring solid **2px** `--ring` at **-2px** offset, control ring **3px** `--ring` box-shadow; `Enter` released (**200**, `isForfeited: false`, row deleted, 3 → 2) and reclaimed (**201**, 2 → 3). **Focus was lost to `<body>` after each write.** See defect 4 |
| TC-MS-012 | P1 | **Pass** — 8 / 7 / 7 / 7 cells per Activity card, seven consecutive days from today, the day carrying two Badminton Sessions contributing **two** cells; every cell carries its own date; ruled lattices; at 390 in `id` the tiles stack one per row and measure **Kehadiran 103px, Mendatang 109px, Iuran 55px**, none clipped |
| TC-MS-013 | P1 | **Pass** — Badminton Blank `PENDING`, dashed 1px, **no fill**, linked to `/payments/upload`; Basket / Futsal / Tennis Ink `CONFIRMED`, solid 1px over a fill; **zero** controls in any day cell |
| TC-MS-014 | P0 | **Pass** — header is the Slot Cell grid, **not** a link, **no** control; `when` carries `MONDAY 24`; facts card reads `Monday, 24 August` — **one date on the page**; participants through the resolver |
| TC-MS-015 | P0 | **Pass** — CTA `Register & pay · Rp 75.000` (the monthly bill); **201** `{"payUrl": "/payments/upload"}`; `seatsHeld` 3 → **4**, `seatsFree` 5 → 4, `holdExpiresAt` = **exactly 60 minutes** after the press (15:37:16.995Z → 16:37:17.374Z), `myPayment` still **null**; back on the Session `Reserved · pay within 59:32` above `Pay monthly dues first · Rp 75.000`; on `/payments` the Blank `PENDING` card carries `Pay within 59:13` |
| TC-MS-016 | P0 | **Pass, after defect 8** — **201**, toast, back to `/payments`; Tape on the dues card, banner gone, newest history row Tape under `DUES · AUGUST 2026`. On the first run the dues card read `IN REVIEW` while the history row beneath it, the dashboard and the profile all read `PENDING` — the same word those three used for Dues with *nothing* sent. The submitted state is now **`IN REVIEW`** / **`DITINJAU`** on all four, and the not-yet-paid state is **`PENDING`**, verified by watching Badminton cross from one to the other on all three surfaces. Capacity across all ten Badminton Sessions of the month: Hold Lab's hold **cleared to `null`** with `seatsHeld` unchanged at 4; Morning Drills **6 → 7**; Weekly Rally Night unchanged at 18; **Full Court Challenge 6 / free 0 before and after**; the CANCELLED and COMPLETED Sessions untouched. No Session rose by more than one |
| TC-MS-017 | P0 | **Pass** — Reject disabled until a reason is typed; `PATCH` **200** → `REJECTED`; Strike `REJECTED` with the strike-through utility on its own label, the amount **dimmed to `--muted-foreground` and not struck**; reason, refund guidance and WhatsApp link all in Secondary Ink, none in red; dues card back to Blank `UNPAID`. Every Badminton Seat released — Hold Lab 4 → 3, Weekly Rally 18 → 17, Morning Drills 7 → 6, `mySeat: null` on all three — while the three `PRESENT` rows on COMPLETED Sessions and the `MAYBE` on Free Play were untouched. **One sub-clause of the case is wrong as written**: Weekly Rally Night does not "return to its TC-MS-016 before figure", because Adi already held an unfunded row there before the upload. The rule that holds everywhere is *falls by exactly one* |
| TC-MS-018 | P0 | **Fail ×2 → fixed → Pass** — alignment held: six amounts, **one** right edge (1031.5), all `tabular-nums`, `Rp 75.000` id-ID grouping in the **English** build, `Dues · August 2026` with the year, no enum leak. Both read-only treatments failed. See defects 5 and 6 |
| TC-MS-019 | P0 | **Fail → fixed → Pass** — rail **63px** tall at 577–640, four cells **94/94/94/93px** (spread **1px**), each **56px** tall, active cell `--primary-solid` ground with board ink and `aria-current="page"`, `divide-x` + `border-t` in `--rule`. **Two labels were ellipsised.** See defect 7 |
| TC-MS-020 | P0 | **Pass** — at 390 × 640 on `/dashboard`, `/payments`, `/payments/upload` and `/sessions/{id}`: rail top **577**, content bottom **543.7–544.4** on every one, `<main>` carrying `padding-bottom: 96px` from the layout rather than per page, and no tap intercepted by the rail. The safe-area inset resolved to the **0.375rem floor** — no device reporting a non-zero inset was available |
| TC-MS-021 | P0 | **Pass** — five live producers, each through the one resolver. Measured against §16's own figures and matching them: painted board Ink **5.40**, Tape **6.20**, Strike **5.45**, Erased **6.19**, Blank **5.45**; enamel Ink **6.31**, Tape **5.36**, Strike **5.97**, Erased **5.41**, Blank **6.13**. Forms distinct with hue discarded — Ink solid border + fill, Blank dashed border + **no** fill, Tape 0px border + clip-path teeth + `::after`, Strike border + the strike-through utility, Erased **transparent border** over the ground fill. Hollow has no producer, as the case says. `Absent` appears nowhere |
| TC-MS-022 | P1 | **Pass** — board, dashboard, payments, upload and profile in `id` with no English leak; marks all switch (`BELUM DIPASANG`, `KOSONG`, `TERDAFTAR`, `MUNGKIN`, `DIBATALKAN`, `BATAL IKUT`, `PENUH`, `LUNAS`, `DITINJAU`, `DITOLAK`, `KUOTA TERPENUHI`, `BUTUH 2 LAGI`); controls and their accessible names switch; the forfeit sentence switches whole; `Sesi` / `Iuran` on the rail; Eka's dead-end fully Indonesian; `Rp 75.000` unchanged. The only cross-locale matches were the community name, proper nouns, numerals and the documented loanwords. Nothing clips — the single `scrollWidth > clientWidth` hit is an `sr-only` node, which is what `sr-only` is |

**Regression net — the existing cases re-run, not rewritten.**

| Area | Result |
|---|---|
| §12 Member — dashboard & sessions — 1–9 | **Re-run, pass**, with two wording notes. §12.3 free RSVP: Maybe → Going took `seatsHeld` 2 → 3 with `MAYBE` 2 → 1 and no hold; Can't-make-it took it back to 2 and **deleted** the row (fee 0, so no Dues to forfeit). §12.4 hold: mode dialog re-priced Rp 75.000 → Rp 25.000, reserve set a 60-minute hold with no Payment, `Reserved · pay within` showed, Cancel released it 4 → 3. §12.5 disabled `Session Full`, §12.6 `Session Cancelled`, §12.7 `RSVP closed`, §12.9 "Set by this session's fee" all as written. §12.8 guards exact: ongoing attendance **403** `RSVP closed`, cancelled attendance **400** `Session is cancelled`, full reserve **409** `Session Full`. **§12.1's "RSVP pills" and §12.2's "grouped This week / Later" are stale** — #59 and #57 replaced both with Slot Cells; documentation, not product |
| §13 Member — payments & profile — 1–8 | **Re-run, pass**, one wording note. §13.1 the unpaid Activity is surfaced beside the paid three (the section is **August**, not July — the seed anchors to the current month). §13.2 upload → PENDING row with the proof in Supabase. §13.4 a `.txt` forced onto the input → toast "Unsupported file format.", input cleared, Submit still disabled. §13.5 the dialog re-prices. §13.6 Eka gets a plain `Register`. §13.7 the rejected row carries reason, refund guidance and a WhatsApp link. §13.8 phone `08123456789` normalised to `628123456789`. **§13.3 caught defect 8**: it asks for `In review` on both the dues card and the dashboard, and only the dues card said it — the dashboard and profile said `Pending`. Fixed in code rather than softened; the case now holds as written |
| §7 Session management (admin) — 1–11 | **Not re-run.** Admin surfaces belong to spec #30 and are out of this area's scope (§17.0). Only §8.4's "Reject requires a reason" was exercised, as the tool TC-MS-017 needs, and it held |
| §16 Design system — TC-DS-001…016 | **Not re-executed as a suite.** Its mark ratios were independently re-measured by TC-MS-021 on both materials and matched every recorded figure, so nothing in §16 is known to have rotted; a full re-run is still owed |

**Defects found and fixed in code.** Nine. None was visible to `tsc`, ESLint,
the 93 tests or a clean production build.

1. **Every seeded Session was stored on the wrong day** — `prisma/seed/dates.ts`,
   `specs.ts`. The seed had two conventions for turning an instant into a day and
   used the wrong one for 24 of 25 Sessions: local `setHours(0,0,0,0)` instead of
   `wibDayStart`. On any host east of UTC — WIB included — that stores the
   previous day, and the board names its days by reading `getUTC*`. "Weekly Rally
   Night", logged by the seed as Sunday 23, was drawn on **Saturday 22** on both
   the board and the dashboard, and the ONGOING "happening right now" Session sat
   on **yesterday's** row. Found by the §12 regression net before any TC-MS case
   could run on a trustworthy fixture. The app was never wrong: the create route
   and the recurring generator both write UTC midnight. `startOfDay` is deleted
   rather than corrected, so the two conventions cannot drift apart again. From
   the **seed**, predating this spec.
2. **`Badminton Â· Rp 75.000` rendered to members** — `(main)/payments/page.tsx`.
   A double-encoded middle dot on the unpaid-dues banner and twice more on each
   outstanding-reservation line, on the surface whose job is telling a member
   what they owe. Twelve corrupted em-dashes in comments across the four member
   pages went with it. Found by §13.1.
3. **The board asked for money the member did not owe** — `slot-action.ts`,
   `sessions-board.ts`, `payments.ts`, `board-view.ts`. `isPaid` was `fee > 0`,
   a fact about the Session's price list rather than about this member's money. A
   MONTHLY member whose Dues are already Confirmed claims a fee-bearing Seat with
   no bill: the row said **Claim & pay** and the reserve route answered **201
   `{"payUrl": null}`** and charged nothing. `readFreeClaimPeriods` now resolves
   the same `isFreeRegisterAllowed` rule the route applies, batched over a week.
   Verified both directions: Futsal Friday and Underbooked Friendly (Dues
   Confirmed) now read `Claim a Seat`; Hold Lab and Morning Drills (Dues unpaid)
   still read `Claim & pay` and still route to `/payments/upload`. Caught by
   TC-MS-010. From **#60**.
4. **Focus was thrown to the top of the board on every claim and withdrawal** —
   `seat-action.tsx`. The control is `disabled` while the write is in flight and
   a disabled element cannot hold focus, so the browser dropped it to `<body>`; a
   keyboard member releasing a Seat from row nine tabbed back down a whole week
   to reach the row they were on. Focus is restored to the control once the write
   settles. Caught by TC-MS-011. From **#60**.
5. **A read-only field took a lighter fill than the tile it sits on** —
   `read-only-field.tsx`. `Input` ships `dark:bg-input/30`, whose `&:is(.dark *)`
   is one class more specific than `ReadOnlyField`'s `bg-board`, so on the painted
   board Period and Amount rendered `--input` at 30% — raised where the design
   says recessed, with the one affordance meaning "the server set this" pointing
   the wrong way. Now `#1b2621` against the `#243029` tile. Caught by TC-MS-018,
   and predicted by suspected defect 2 below. From **#54**.
6. **The per-Session pay page never got that treatment at all** —
   `(main)/sessions/[id]/pay/page.tsx`. It hand-rolled an `Input` with `bg-muted`,
   no lock, and the note "Set by this session's fee" on screen but tied to
   nothing, so a screen-reader member met an uneditable field and was told nothing
   about why. It now uses the same `ReadOnlyField` as the Dues uploader. Caught by
   TC-MS-018, and predicted by suspected defect 3 below. From **#54**.
7. **The bottom rail ellipsised its two longest labels** — `member-nav.tsx`. The
   label span carried `px-1` inside a cell that already had `px-1`, leaving 78px
   of the 86px available; `Dashboard` needs 82px and `Profil Saya` 84px, so a
   member at 390px read `Dashboar…` and `Profil Say…` — the two labels with no
   short form to fall back on. All four now fit in both locales, cells still equal
   to within 1px. Caught by TC-MS-019. From **#53**.
8. **Two different states shared one word, and one state had two** —
   `dictionaries.ts`, `money-mark.tsx`. There are two things a member can be told
   about this period's Dues, and the product was not telling them apart:

   | State | Before | After |
   |---|---|---|
   | Proof sent, Admin has not reviewed it | `/payments` card **In review**; history row, `/dashboard`, `/profile`, Admin queue **Pending** | **In review** / **Ditinjau** everywhere |
   | Nothing sent at all | **Unpaid** / **dues unpaid** / **Belum bayar** | **Pending**, both locales |

   The dues card read `payments.inReview` while everything else resolved through
   `marks.pending`, so a member who had already paid was told so on one card and
   left in the passive voice on the next, one tap apart — and the word used for
   them there was the same one now reserved for having paid nothing.
   `marks.pending` is the only label a Payment's PENDING status resolves to
   (`PAYMENT_MARKS`), so one line per locale moved all five surfaces;
   `paymentStatus` went with it so the Admin queue's filter matches its own rows.
   The unpaid Blank marks took `Pending` in their place. `dashboard` needed a new
   key for its mark — `duesUnpaidBanner` is prose the dues banner reads as
   "{Activity} dues unpaid", and sharing it would have produced "Badminton
   Pending". Verified by watching Badminton cross from one state to the other on
   `/payments` (card and row), `/dashboard` and `/profile`, in both locales, with
   the banner prose intact. Caught by §13.3; the two-word split is a **product
   decision**, not one I picked. From **#58/#59** jointly.
9. **The seed refused to run every WIB evening** — `prisma/seed/dates.ts`. A
   regression from defect 1's own fix, and caught only because the run crossed
   into the evening: `resolveRange` compared its derived `to` — UTC midnight of
   today's WIB day — against `now` as an instant. Those are different kinds of
   thing. From 17:00Z until midnight, UTC midnight of the *current* WIB day is
   still in the future, so `npm run db:seed` died on its own default with
   `--to must be on or before the anchor (--date)`. Now compared as days. Both
   the default and the `--date/--from/--to` path re-run clean. Mine, from this
   ticket.

**Not met.**

- **SonarLint has still been consulted on no ticket in this spec.**
  `mcp__ide__getDiagnostics` is not resolvable in this environment either, for the
  executor or the orchestrator, so the completion gate's editor-diagnostics clause
  is unverified across all ten tickets. `tsc --noEmit` plus ESLint stood in, as
  they did in every earlier wave. This is the one acceptance criterion of map #51
  that no wave has satisfied.
- **§7's admin cases were not re-run**, by scope: §17.0 puts every `/admin/*`
  surface in spec #30. §16's `TC-DS-*` were not re-executed as a suite either,
  though TC-MS-021 re-measured their mark ratios and matched all ten.
- **The safe-area inset was only observed at its `0.375rem` floor.** No device or
  emulator reporting a non-zero `env(safe-area-inset-bottom)` was available, so
  TC-MS-020's `(measure)` marker is answered with the floor rather than a real
  inset.
- **The run crossed a WIB date boundary**, from 20 to 21 August, between TC-MS-018
  and TC-MS-019. Nothing above depends on "today" after that point, but a re-run
  wanting the "today" fixtures should reseed first.
- **Two documentation edits are owed to §12 and §13** — §12.1, §12.2 and half of
  §13.3 describe surfaces that #57, #58 and #59 replaced. This ticket may not edit
  §1–§16, so they are recorded here and in *Suspected defects* rather than fixed.

### 17.11 Suspected defects, found by reading

Found while writing the cases above, not by running them. Each names the case
that should catch it, the ticket it came from, and how confident the reading is.

**Two of these were confirmed by the run and fixed** — 2 and 3, both read from
the source before a browser was opened, and both exactly as predicted. They are
kept below with the reading intact, marked **fixed**, because a suspicion that
proved out is worth more on the record than one quietly deleted. The rest stand.

1. **§12.2's expected wording is stale, not failing.** It expects `/sessions`
   "grouped This week / Later, quota badges, filters"; #57 replaced that with a
   week read down the page, and #57's own closing comment says so: "`TESTING.md`
   §12.2's expected wording … is invalidated by that change and wants updating
   by whoever owns that file." Caught by the regression-net row for §12 above,
   and by TC-MS-004. **Documentation, not code** — it must not be recorded as a
   product failure, and this ticket may not edit §1–§16. Confidence: certain.
2. **The read-only Amount on the painted board may not take the ground fill.**
   `ReadOnlyField` sets `bg-board`, but the shared `Input` also carries
   `dark:bg-input/30`, and `tailwind-merge` keeps both because they are
   different variants. Under `@custom-variant dark (&:is(.dark *))` the dark
   rule has the higher specificity (0,2,0 against 0,1,0), so on the painted
   board the field would render `--input` at 30% over the tile — **lighter**
   than its surroundings — where the design calls for the ground, which is
   **darker**. That reverses the signal the fill is carrying. Caught by
   TC-MS-018 step 3, on the painted board only. From #54. Confidence:
   high on the specificity, unverified on what it looks like.
   **Confirmed and fixed** — measured at `oklab(0.615459 …/0.3)` where `--board`
   is `#1b2621`; `dark:bg-board` added. Defect 5 in §17.10.
3. **`/sessions/{id}/pay`'s Amount field never got #54's read-only
   treatment.** It is a bare `Input` with `bg-muted` and no lock glyph, no
   Figure role and no `aria-describedby` tying its note to it, where
   `/payments/upload` has all four. Both are server-set amounts on the same
   product; two treatments for one state is the inconsistency #54 existed to
   remove, and this page was outside its scope. Caught by TC-MS-018 step 4.
   From #54 (scope), surfaced by #58's convention. Confidence: high — read
   directly from the source.
   **Confirmed and fixed** — the page now composes `ReadOnlyField`. Defect 6 in
   §17.10.
4. **The Erased mark disappears as a form when its cell is hovered.** Erased is
   `bg-board` with a transparent border; a Slot Cell with something to open
   takes `hover:bg-board`. On hover the mark's fill is exactly its cell's, so
   the chip stops being a chip. The words beside it (`You released this Seat.`)
   still carry the state, so this is not a WCAG failure, but "flat and
   ground-coloured" stops being a distinguishable form at the moment a pointer
   is on it. Caught by TC-MS-010 and TC-MS-021 if the tester hovers. From #60.
   Confidence: medium — the mechanism is certain, whether it reads as a defect
   is a judgement.
5. **The board offers `Withdraw` while an unpaid hold is live, and says nothing
   about the deadline.** The board's read carries no `holdExpiresAt`, so a
   member looking at the row cannot see that the Seat lapses in minutes; the
   Session's own page and `/payments` both show the countdown. Recorded by #60
   as out of scope and worth its own ticket. Caught by TC-MS-015's last bullet.
   Confidence: certain — it is recorded behaviour, not a suspicion.
6. **`isRsvpClosed` computes the RSVP window with `setHours`, in the server's
   zone.** On a UTC host that is about **seven hours** off for WIB, so the
   window opens and closes at the wrong time — which decides whether the board
   offers a control at all. Pre-existing and deliberately reused by #60, which
   recorded it. Caught indirectly by TC-MS-009 through TC-MS-011 if a control is
   missing or present when the stated window says otherwise, and only on a host
   whose zone is not WIB. Confidence: certain in the code, host-dependent in
   whether a case sees it.
7. **`/payments` and `/dashboard` are each half board and half floating
   panel.** The history is a ruled lattice (#58) but the dues card, the
   outstanding-reservations list and the Activity summary cards are still
   `bg-card rounded-xl` panels with gaps between them. Both #58 and #59 recorded
   this and left it for its own ticket. Visible in TC-MS-013, TC-MS-016 and
   TC-MS-018. Confidence: certain; scope, not a bug.
8. **`src/app/(main)/sessions/[id]/page.tsx` is 381 lines**, over the 300-line
   standard, recorded by #60. No case here catches it — it is a standards
   finding, not something a member can see. Listed so it is not lost.
9. **Ten `dashboard.*` dictionary keys are unreferenced** after #59, and
   `sessions.boardDaysShort` was left deliberately after #57 but is now read
   again by the dashboard's day cells. No case catches dead keys; a grep does.
   Confidence: certain, cosmetic.
10. **SonarLint has been consulted on none of the nine closed tickets under map
    #51**, because `mcp__ide__getDiagnostics` was unavailable in every wave. It
    is unavailable to this ticket too — not in the tool list and not resolvable
    through tool search — so the gate's editor-diagnostics clause remains
    unverified for the whole spec. One pass with the extension live is worth
    doing before #29 is called done. No case here can substitute for it.

---

## 18. Admin registers (`TC-AR-*`)

Spec #30 rebuilt the admin side: the Payments queue became a queue, No-Show
became a value an Admin can record, attendance got a register of its own, and
every admin surface became a ruled register composed from one shared component.
This area tests **what the Admin can see and decide** on those surfaces, and the
rules the surfaces only reflect.

That is the line every case here is written to. "Payments awaiting a decision
appear above decided ones" is a test. "The query orders by status" is an
implementation detail that passes while the queue is still unusable.

> **Rally markers (#152).** ADR 0003 replaced the shared ruled Register with
> tables composed inside cards, so four cases here — TC-AR-001, TC-AR-002,
> TC-AR-019 and TC-AR-036 — carry a `Partly superseded by Rally` blockquote
> under their heading naming exactly which assertions retired and pointing at
> what replaces them. In all four the retired half is geometry (*ruled*,
> *struck*, *distinct marks*) and the live half is the P0 behaviour the case
> exists for. Nothing is deleted, and no behavioural case is marked. The rule
> used to separate them is in §16.4.

Two kinds of claim in this area are asserted **from the database**, never from
the screen, because they are the two the redesign could break silently: money,
and the fourth attendance value. Every case that records a No-Show, saves an
attendance list, or decides a Payment reads the affected rows before and after
and quotes the figures.

### 18.0 Conventions and shared preconditions

This area inherits **§16.0 in full** and restates none of it: the same id /
priority / type / preconditions / numbered steps / expected-result shape, the
same P0-P1-P2 meanings, the same two board materials (enamel = `:root`, painted
board = `.dark`), the same theme toggle and `NEXT_LOCALE` switches, and the same
two viewports (**390 × 844** and **1440 × 900**).

**Surfaces in scope.** `/admin`, `/admin/sessions`, `/admin/sessions/new`,
`/admin/sessions/{id}/edit`, `/admin/sessions/{id}/attendance`,
`/admin/payments`, `/admin/members`, `/admin/members/{id}`,
`/admin/activities`, `/admin/applicants`, `/admin/settings`, and the routes
those surfaces write through.

**Out of scope**, deliberately: every member surface (§17 owns those, and this
area reaches one only to check that a decision made here shows up there), the
design system's own tokens and marks (§16), and the public route.

**Shared preconditions for every case in this area**, on top of §16.0's:

1. §1 prerequisites done, `npm run dev` running on `http://localhost:3000`, and
   the §2 seed loaded.
2. The accounts are §3's: `admin@xclub.local` (**Admin Satu**) unless a case says
   otherwise, `owner@xclub.local` where the Owner's own view is what is being
   read, and `member@xclub.local` (**Adi Pratama**) where a member has to see the
   consequence of a decision.
3. The Sessions and Payments are §4's and §2's. **No case invents a fixture it
   does not also remove.** Where a case needs a state the seed has not got — a
   `NO_SHOW` row, a fortieth Proof, an Owner with money behind them — it says so
   in its preconditions, and the recorded run names the probe that added the
   rows and the probe that took them away again.
4. **The route is exercised directly** wherever a rule lives on the server:
   `PATCH`/`DELETE /api/sessions/{id}`, `POST /api/sessions/{id}/attendance/bulk`
   and `PATCH /api/payments/{id}`, each with a signed-in cookie and
   `Content-Type: application/json`. A control the form did or did not draw is a
   courtesy; the refusal is the rule, and a case that only reads the form passes
   while the server is wide open.
5. **Vocabulary**, from `CONTEXT.md`. **Opted Out** is stored `ABSENT` and
   renders **Erased**; **No-Show** is stored `NO_SHOW` and renders **Hollow**.
   The stored name `ABSENT` never surfaces to a user as "Absent". Confirm /
   Reject is what an Admin does to a Payment; Admit / Decline is what they do to
   an Applicant; the two vocabularies never cross.
6. **The refusal shape.** Every locking refusal on the Sessions routes is a
   **409** whose body carries both a translated `error` sentence and a stable
   `reason` code; the case fails on a 200, on a different status, or on a body
   missing either field. Every bulk-attendance refusal is a **400** carrying
   `error: "Invalid payload"` and a `reason` naming the fault.

### TC-AR-001 · P0 · Positive — Every Session row carries its eight facts, ruled, at both widths

> **Partly superseded by Rally (#152).** *Ruled* is retired: ADR 0003 replaced
> the shared ruled Register with tables composed inside cards, so the 1px shared
> rules and the one-bounded-frame treatment are no longer the target. Pointer:
> the admin surface spec (#145). **Still live, and it is most of the case:** every
> Session row carries its **eight** facts, and at 390px the register collapses by
> axis rather than scrolling sideways — each cell keeps its column's label as
> real text, and a second DOM tree is still refused (`DESIGN.md`, *Retired
> rules*, where that one is marked still in force).

**Preconditions:** admin on `/admin/sessions`, at least three Sessions listed.

**Steps:**
1. At 1440 × 900, read the `<thead>` and one row.
2. Read the computed `border` between two neighbouring rows and two neighbouring
   cells.
3. Resize to 390 × 844 and read the same row.
4. Read the capacity and floor cells with a screen reader.

**Expected result:**

- Eight columns, in this order: **Date** (date over the time range, tabular),
  **Session** (the title), **Activity** (initial tile plus name), **Location**,
  **Capacity** (`held/max`), **Floor** (`committed/needed`), **Status** (one mark),
  **Actions**.
- Rows are separated by a shared **1px** rule and the register is bounded by one
  frame. There are no cards and no coloured accent line at any width.
- At 390px the register **collapses by axis**: each row is still a ruled row, and
  each cell carries its column's own label above its value. The `<thead>` is
  hidden there and the inline labels are hidden at full width — nothing is
  announced twice.
- The capacity cell announces "*n* of *max* seats held" and the floor cell
  "*n* of *needed* members committed"; neither leaves a bare `6/16` to be
  interpreted.
- A Session whose Activity sets `minMembers = 0` draws **"No floor"**, never
  `0/0`. A Session below its floor carries the words **"Below floor"** beside the
  figure — the fact is never carried by colour alone.

### TC-AR-002 · P0 · Positive — A cancelled Session reads as struck, and its figures still hold

> **Partly superseded by Rally (#152).** *Reads as struck* is retired. A
> cancelled Session now carries a **void** chip reading `Cancelled` /
> `Dibatalkan`, and nothing anywhere is struck — not the chip's own label and not
> the row's title. Pointer: **TC-DS-102**. **Still live, and it is what the case
> actually protects:** the title recedes to `--muted-foreground` rather than
> being struck through, the row's figures still hold after cancellation, and a
> cancelled row offers `Take attendance, Edit, Detail, CSV` and **no** Cancel.

**Preconditions:** one Session cancelled from its row (see `TC-AR-006`).

**Steps:**
1. Find the cancelled Session's row and read the standing column.
2. Read the title cell's colour and text decoration.
3. Repeat with colour removed (grayscale), per §16.0.

**Expected result:**

- The standing column carries the **Strike** mark, whose own label is struck
  through, and the title recedes to Quiet Ink beside it. The strike is on the
  mark, not on the title: one line through two words reads as a stamp, a second
  through the value reads as damage to the row.
- With all colour removed the row is still identifiable as cancelled, by the
  struck label alone.
- The row offers no **Cancel session** control — the Session is already closed —
  while its attendance, edit, detail and CSV controls remain.

### TC-AR-003 · P0 · Negative — The fee of a Session with money behind it is refused

**Preconditions:** a **Scheduled** Session with at least one seat-holding
Attendance, or one live (`PENDING`/`CONFIRMED`) Payment naming it. Note its
stored `fee`.

**Steps:**
1. `PATCH /api/sessions/{id}` with `{ "fee": <stored fee + 1000> }`.
2. Re-read the Session and compare its `fee`.
3. Open `/admin/sessions/{id}/edit` and read the Fee field.
4. Repeat step 1 on a Session with **no** held Seat and **no** live Payment.

**Expected result:**

- **409**, with `reason: "FEE_LOCKED"` and a sentence naming both the reason and
  the fix ("…already has a payment or a held seat, so its fee cannot be changed.
  Post a new session at the new fee instead."), in the caller's own locale.
- The stored `fee` is **unchanged**. The old behaviour — the field silently
  dropped and a 200 returned — is a failure of this case.
- In the form the Fee input is **`readonly`**, not `disabled`: it is focusable,
  its value posts, it carries the Enamel Ground fill (`bg-board`, from the shared
  `Input`'s own `read-only:` variant), and a Body-size sentence beneath it is
  tied to it with `aria-describedby`.
- Step 4 returns **200** and the fee changes: a Session with no money behind it
  stays fully editable.

### TC-AR-004 · P0 · Negative — Capacity cannot go below the Seats already held

**Preconditions:** a Scheduled Session with **n ≥ 2** seat-holding Attendances.

**Steps:**
1. `PATCH` with `{ "maxPlayers": n - 1 }`.
2. `PATCH` with `{ "maxPlayers": n }`.
3. Let a reservation hold lapse (§14.3's hold, or set `holdExpiresAt` into the
   past) and repeat step 1 counting only the Seats that survive the sweep.

**Expected result:**

- Step 1 is **409** with `reason: "CAPACITY_BELOW_HELD"`, and the sentence names
  the figure: "Capacity cannot go below the *n* seats already held. Set it to *n*
  or higher, or release a seat first."
- Step 2 is **200**: capacity *equal* to the held Seats fits everyone who holds
  one and only refuses new claims.
- Step 3 succeeds against the lower count — the lazy hold sweep runs at the top
  of the write, so an expired hold neither floors capacity nor locks a fee.
- In the form the capacity input carries `min` equal to the held Seats and the
  same Body-size sentence, tied to it with `aria-describedby`. It is **not**
  read-only: raising capacity is still the Admin's to do.

### TC-AR-005 · P0 · Negative — A Completed or Cancelled Session accepts notes and nothing else

**Preconditions:** one Session stored as `COMPLETED` and one as `CANCELLED`.

**Steps:**
1. `PATCH` the Completed Session with `{ "title": "<a different title>" }`.
2. `PATCH` it with `{ "status": "SCHEDULED" }`.
3. `PATCH` it with `{ "notes": "Rain stopped play." }`.
4. Open its edit form, change **only** the notes, and Save — the form posts every
   field, each at its stored value.
5. Repeat steps 1 and 3 against the Cancelled Session.

**Expected result:**

- Steps 1 and 2 are **409** with `reason: "SESSION_CLOSED"`. `status` is locked
  like every other field: a closed Session is not reopened from here.
- Step 3 is **200** and the notes are stored. What happened is exactly what an
  Admin writes down afterwards.
- Step 4 **succeeds**: an unchanged field is not an edit, so a whole-payload save
  that changes only the notes is not refused.
- The form shows every field but the notes in the read-only treatment, with one
  Body-size sentence — "This session is completed or cancelled, so only its notes
  can be changed here." — that each of them points at with `aria-describedby`.
  The status control is drawn as its own label in that treatment rather than as a
  disabled `<select>`.

### TC-AR-006 · P1 · Positive — The register's jobs act from the row, and it is traversable by keyboard

**Preconditions:** admin on `/admin/sessions`, at least one Scheduled Session.

**Steps:**
1. Tab from the page heading through one row's controls and read the focus
   indicator on each.
2. Press Enter on **Take attendance**, then go back.
3. Press Enter on **Cancel session** and read the dialog, then confirm.
4. Read the register's head for the way to post a new Session.
5. Read `<tr>` for a `tabindex` attribute.

**Expected result:**

- Tab reaches each row's controls in DOM order — attendance, edit, detail, CSV,
  cancel — each with a visible focus ring, and Enter presses them.
- **Take attendance** lands on `/admin/sessions/{id}/attendance`; **Edit** on
  `/admin/sessions/{id}/edit`; **Detail** on `/sessions/{id}`; **CSV** downloads
  the export.
- Cancel asks first, names the Session in its title, and states what cancelling
  does before it is confirmed. Confirmed, the row's standing column becomes
  Strike without leaving the page.
- **New Session** sits in the register's head and lands on
  `/admin/sessions/new`.
- No `<tr>` carries a `tabindex`: the row's own controls are what focus travels
  through.
- At 390 × 844 the last row's controls are still reachable and pressable, and
  nothing overlays them. The admin shell carries **no fixed bottom rail** — that
  is the member shell's, and `TC-MS-019`/`TC-MS-020` own it. Two bullets about
  the rail's safe-area inset stood here until the run of 2026-08-29; they were
  pasted from `TC-MS-020` and asserted about a component this surface does not
  render.

### TC-AR-007 · P0 · Negative — An Owner's email stays withheld on the Payments queue, the attendance register and both payments routes

**Preconditions:** the Owner (`owner@xclub.local`) enrolled as a Participant on
one Session, with a seat-holding Attendance on it, and holding one Payment. An
admin account from §3.

**Steps:**
1. As the admin, open `/admin/payments` and find the Owner's row; open the
   Owner's Session's attendance register.
2. As the admin, `GET /api/payments?userId=<the Owner's id>` and
   `GET /api/payments/{the Owner's payment id}`.
3. As the admin, search the Payments queue by the Owner's email address.
4. Repeat steps 1 and 2 signed in as the Owner.

**Expected result:**

- The Payments queue's Member cell and the attendance register's Participant
  cell both draw **Withheld** where the Owner's email would sit, for the admin;
  neither cell's markup carries the address.
- Both routes in step 2 return **200** with `email: null` on the Owner's row;
  every other field on it, and its key set, is unchanged.
- Step 3 returns no rows: the Owner is not found by an email an Admin cannot
  see.
- Signed in as the Owner (step 4), all four surfaces show the Owner's own
  email intact: the queue, the attendance register, and both routes.

### TC-AR-008 · P0 · Negative — A Session with money behind it, or a Completed one, refuses deletion

**Preconditions:** four Sessions — one **Scheduled** with at least one
seat-holding Attendance, one **Scheduled** with no held Seat but one live
(`PENDING`/`CONFIRMED`) Payment naming it, one **`COMPLETED`** with neither, and
one **`CANCELLED`** with neither.

**Steps:**
1. `DELETE /api/sessions/{id}` on the Session with the held Seat.
2. `DELETE` on the Session the live Payment names.
3. `DELETE` on the Completed Session.
4. `DELETE` on the Cancelled Session, then re-read it.
5. Open `/admin/sessions/{id}/edit` for each of the four and read the buttons
   beneath the form.
6. In the form for the Session with the held Seat, if a Delete button is drawn at
   all, press it and read the toast.

**Expected result:**

- Steps 1 and 2 are **409** with `reason: "SESSION_HAS_MONEY"` and a sentence
  naming both the reason and the fix ("…has a payment or a held seat behind it,
  so it cannot be deleted. Cancel the session instead…"), in the caller's own
  locale. A **500** is the failure this case exists to catch: `Payment.session`
  is `onDelete: Restrict`, so the old route let Prisma throw where it should have
  been answering.
- Step 3 is **409** with `reason: "SESSION_CLOSED"` and its own sentence — the
  Session is part of the record, not "only its notes can be changed", which is
  the PATCH sentence and answers a question nobody asked here.
- Step 4 is **200** and the Session is gone. A cancelled Session with nothing
  behind it is a plan that was called off, not history; where cancelling was what
  was meant, `TC-AR-009` is the way back rather than this.
- Step 5: the **Delete session** button is absent on the first three forms and
  present only on the Cancelled one. Absent, not disabled — the same way the
  register draws no Cancel control on a Closed Session.
- Step 6 does not arise where step 5 passed; if it does, the toast carries the
  route's own sentence, not the generic "Failed to delete session".

### TC-AR-009 · P0 · Positive — A Cancelled Session is reopened while its day has not passed

**Preconditions:** three Sessions — one **`CANCELLED`** dated **today or later**
in WIB, one **`CANCELLED`** dated **before today** in WIB, and one
**`COMPLETED`**. Note that "today" is the **WIB** day: between 00:00 and 07:00
WIB the UTC date is still yesterday's, and a Session dated for the WIB today is
not past.

**Steps:**
1. On `/admin/sessions`, read the controls on each of the three rows.
2. Press **Reopen session** on the not-yet-past Cancelled Session, read the
   dialog, and confirm. Read the row's standing column afterwards.
3. `PATCH /api/sessions/{id}` with `{ "status": "SCHEDULED" }` on the past
   Cancelled Session.
4. The same `PATCH` on the Completed Session.
5. `PATCH` the reopened Session's twin — a Cancelled, not-yet-past Session — with
   `{ "status": "SCHEDULED", "title": "<a different title>" }`.
6. Open `/admin/sessions/{id}/edit` for a Cancelled Session and read the Status
   control.

**Expected result:**

- Step 1: only the not-yet-past Cancelled row offers **Reopen session**. The past
  Cancelled row and the Completed row offer neither Reopen nor Cancel — a Session
  the server will refuse gets no control rather than a disabled one.
- Step 2: the dialog names the Session, says the Session goes back to Scheduled
  and that Seats held when it was cancelled are still held, and confirming turns
  the standing column from **Strike** to Scheduled without leaving the page.
- Step 3 is **409** with `reason: "SESSION_PAST"` and a sentence saying the day
  has passed and to post a new session for the next date.
- Step 4 is **409** with `reason: "SESSION_CLOSED"`: a completed Session is never
  reopened.
- Step 5 is **409** with `reason: "SESSION_CLOSED"`. Reopening is a status-only
  write: a body that renames the Session in the same request is the edit the
  Closed rule refuses, not a reopening. The stored `title` and `status` are both
  **unchanged**.
- Step 6: the Status control is still drawn read-only, as its own label. The
  reopening lives on the register only — the form's job is the Session's facts,
  and one way to do a thing is what keeps two surfaces agreeing.

### TC-AR-010 · P0 · Negative — A capacity edit and a reservation cannot cross

**Preconditions:** a **Scheduled** Session with a fee, capacity `max`, and
**n = max − 1** seat-holding Attendances — exactly one free Seat. Two browsers:
an admin in one, and in the other a member who holds no Seat on this Session and
whose Membership on that Activity is billed **Per-Session**, so claiming a Seat
takes the hold path. The two presses have to overlap; where they cannot be made
to by hand, issue them as two `fetch` calls without awaiting the first —
`PATCH /api/sessions/{id}` with `{ "maxPlayers": n }` and
`POST /api/sessions/{id}/reserve`.

**Steps:**
1. Admin tab: open `/admin/sessions/{id}/edit` and set Max Participants to **n**,
   without saving yet.
2. Member tab: press the control that claims the last Seat, and press Save in the
   admin tab in the same moment.
3. Re-read the Session: its stored `maxPlayers`, and its count of seat-holding
   (`REGISTERED`/`PRESENT`) Attendances.
4. Repeat the whole case with the two presses in the other order, several times.

**Expected result:**

- **Every run ends with `held ≤ maxPlayers`.** `maxPlayers = n` stored beside
  `n + 1` held Seats is the failure this case exists to catch — it is the state
  the old two-statement PATCH could reach, and one this one cannot.
- **Exactly one of the two writes is refused**, and which one depends only on
  which committed first; both succeeding is a failure of this case.
  - Reservation first: capacity ends **unchanged** at `max`, the Seat is held,
    and the edit is **409** with `reason: "CAPACITY_BELOW_HELD"` naming `n + 1`
    seats — the figure the Admin has to be told, since it is one higher than the
    page they were reading said.
  - Edit first: capacity ends at **n**, held stays at **n**, and the member's
    claim is refused as full rather than seated over the new capacity.
- Neither write leaves a half-write behind: no Payment row without its
  Attendance, and no capacity written without the count it was decided against.

### TC-AR-011 · P2 · Edge — A Confirm by one Admin cannot duplicate or drop a row on another Admin's page

**Preconditions:** two Admin accounts signed in in two separate browsers, A and
B. At least 14 Payments match no filter, of which exactly **4** are awaiting a
decision — so page 1 holds all four awaiting rows followed by six decided ones
and the boundary between the two groups falls inside the page. A reads
`/admin/payments` with no filter and no sort applied: the queue's own order is
what this case is about, and an explicit column sort is a different read.

**Steps:**
1. On A, load page 1 and record the ten rows in order, by Payment id.
2. On B, Confirm the Payment sitting **fourth** on that page — the last of the
   awaiting rows, and so the one on the boundary.
3. On A, reload page 1 and record the ten ids again.
4. Repeat steps 2 and 3 with the next awaiting Payment each time, reloading on A
   **twenty** times across the run, recording the ids of every load, and pressing
   Confirm on B while A's reload is in flight rather than between reloads.
5. Compare the recorded lists, and read page 2 once at the end.

**Expected result:**

- Every load returns **exactly ten** rows while at least ten Payments match, and
  **no id appears twice within one load**.
- No Payment that matched the filter for the whole run is absent from every
  load: a row that moves does so by moving *down*, never by vanishing.
- On every load the **queue order** is awaiting first, then the decided newest
  first. What a row *draws* can be one decision newer than the position it was
  given: the page is an ordered read of the ids followed by a fetch of those
  ids, so a Confirm landing between the two renders a decided row in the
  position its awaiting standing earned it, for exactly one load. That is the
  same tolerance the counts get below, and it is **not** a failure of this case —
  the row set is. A load where a decided row sits above an awaiting one **and**
  the awaiting row is missing, duplicated, or on two pages at once is.
- A Payment Confirmed mid-run appears on the next load in the decided group, and
  on exactly one page — never on page 1 and page 2 at once, never on neither.
- The heading's awaiting count and the pagination total are read by two counts
  taken beside the page rather than as part of it, so either may be one decision
  behind for a single load. That is **not** a failure of this case; the row set
  is what this case tests.
- **The old boundary is closed.** The page used to be two reads over two bands
  (`status = PENDING`, then `status <> PENDING`) whose slices were worked out
  from a count taken before them, so a Confirm arriving between the count and a
  band read moved a row across the boundary and the page dropped it or drew it
  twice. It is now one ordered statement returning the page's ids, and a fetch
  of those ids — which can return fewer rows only if a Payment was deleted
  outright, and cannot reorder them at all.
- The Owner's email is still withheld from the Admin throughout, and still not
  searchable by them: `TC-AR-007` holds unchanged against this read, which now
  reaches the member through raw SQL rather than through Prisma.

### 18.1 The fourth attendance value

The four cases here are the ones the spec calls out as the only part of the
redesign that can lose data. Each reads the rows it is about from the database,
before and after.

### TC-AR-012 · P0 · Positive — Recording a No-Show leaves every capacity figure where it was

**Preconditions:** a census of every Session's `maxPlayers` and its count of
seat-holding (`REGISTERED`/`PRESENT`) Attendances, taken from the database
first. One **`COMPLETED`** Session carrying at least one `PRESENT` row and one
`ABSENT` (Opted Out) row, and one ended Session carrying `REGISTERED` rows.

**Steps:**
1. Take the census.
2. On the Completed Session, `POST /api/sessions/{id}/attendance/bulk` with
   `{ "rows": [{ "userId": "<the ABSENT member>", "status": "NO_SHOW" }] }`.
3. Retake the census and compare it, Session by Session.
4. On the ended Session, move one `REGISTERED` row to `NO_SHOW` the same way, and
   retake the census.
5. Read the Capacity cell of both Sessions on `/admin/sessions`.
6. Put both rows back to what they were.

**Expected result:**

- Step 2 is **200** with `{ "updated": 1 }`.
- After step 3 **every** Session's `maxPlayers` is unchanged and **every**
  Session's held count is unchanged, the edited one included. Opted Out and
  No-Show both sit outside the seat-holding pair, so moving a row between them
  moves no figure at all. This is the clause that proves capacity is unchanged
  *by definition* rather than by an adjustment somebody has to remember.
- After step 4 the edited Session's held count falls by **exactly one** and every
  other figure in the census — every `maxPlayers`, every other Session's held
  count — is unchanged. That fall is the same one a withdrawal produces, because
  `REGISTERED` holds a Seat and neither `ABSENT` nor `NO_SHOW` does; a No-Show
  that left the Seat held, or that moved a figure on any other Session, is the
  failure this case exists to catch.
- Step 5: the Capacity cell reads the new `held/max` with `max` unchanged, and
  the announced sentence is still "*n* of *max* seats held".

### TC-AR-013 · P0 · Negative — A No-Show record changes no amount, no Payment and no Seat

**Preconditions:** a Session that charges a Fee, with a Participant who holds a
seat-holding Attendance **and** a Payment against that Session. Note the Payment
row in full and the member's own dues state.

**Steps:**
1. Record the member's row as `NO_SHOW` through the bulk route.
2. Re-read that member's Payments: every field, `status` and `amount` included.
3. Re-read the Session's `fee`, and the member's `/payments` page as the member.
4. Re-read the Attendance rows of every other member on that Session.
5. Put the row back.

**Expected result:**

- The Payment is **byte-for-byte unchanged** — `status`, `amount`, `notes`,
  `confirmedBy`, `confirmedAt`, `updatedAt`. Recording that somebody did not turn
  up is not a billing decision, and there is no refund, credit or penalty
  anywhere in this path.
- The Session's `fee` is unchanged, and the member's dues state on `/payments`
  is the one it was before.
- No other member's Attendance row is touched — status or `updatedAt`.
- The member's own history shows the Session at the **Hollow** mark, not a money
  mark: what changed is the record of the day, and nothing else.

### TC-AR-014 · P0 · Negative — Rejecting a monthly Payment removes only Registered rows; No-Show, Present and Opted Out survive

**Preconditions:** one member with a **`PENDING`** `MONTHLY` Payment for an
Activity and Billing Period, and four Attendance rows of theirs on four Sessions
of **that Activity in that month**, one at each of `REGISTERED`, `NO_SHOW`,
`PRESENT` and `ABSENT`. Record all four row ids, their statuses and their
`updatedAt`. This is the fixture `TC-MS-017` documents from the member's side;
here it is read from the Admin's.

**Steps:**
1. As an admin, Reject the Payment from its row on `/admin/payments`, with a
   reason typed into the dialog.
2. Re-read all four Attendance rows from the database.
3. Re-read the member's Attendance rows on that Activity's Sessions **outside**
   that month, and on other Activities' Sessions inside it.
4. Re-read the Payment.
5. Reject the same Payment a second time.
6. Restore the fixture.

**Expected result:**

- Step 1 is **200**.
- Step 2: the `REGISTERED` row is **gone**. The `NO_SHOW`, `PRESENT` and `ABSENT`
  rows are all **present**, at their original statuses and their original
  `updatedAt` — untouched, not rewritten. The No-Show surviving is the one this
  case exists for: the cleanup filters on `status: 'REGISTERED'`, so the fourth
  value falls outside it by construction, and a change that "helpfully" widened
  that filter would delete history.
- Step 3: nothing outside the Activity-and-month window is touched.
- Step 4: the Payment is `REJECTED`, its `notes` carry the typed reason verbatim,
  and `confirmedBy` names the deciding admin.
- Step 5 is **409** — "This payment has already been reviewed." A decision is
  made once.

### TC-AR-015 · P0 · Positive — The dashboard's attendance aggregate counts three historical states

**Preconditions:** `/admin` as an admin. A count, from the database, of
Attendance rows at each of `PRESENT`, `ABSENT` and `NO_SHOW`.

**Steps:**
1. Read the dashboard's attendance figure and note it.
2. Record one more `NO_SHOW` through the bulk route.
3. Reload `/admin` and read the figure again.
4. Move that row to `ABSENT` and reload again.
5. Put the row back.

**Expected result:**

- The figure equals `PRESENT + ABSENT + NO_SHOW` — three states, not two. An
  aggregate still on the old pair is short by exactly the No-Show count, which is
  zero on a fresh seed and is why this case adds a row rather than trusting it.
- Step 3's figure is **one higher** than step 1's.
- Step 4's figure is the **same** as step 3's: all three are history, and moving
  a row between two of them moves no total.

### TC-AR-016 · P0 · Negative — No-Show is never derived; an ended Session with Registered rows stays Registered

**Preconditions:** a Session whose end time in WIB has **passed**, whose status is
not `CANCELLED`, carrying at least one Attendance row and **every** listed row
still `REGISTERED`.

**Steps:**
1. Read every Attendance row on that Session from the database.
2. Open `/admin/sessions/{id}/attendance` and read the notice above the register
   and the Recorded column on every row.
3. Leave the page without pressing Save, reload it, and re-read the rows from the
   database.
4. Press **Save attendance** with nothing changed and read what is sent.
5. Read the same Session's row in the member's own history.

**Expected result:**

- Step 1 and step 3 return the **same rows, at the same statuses, with the same
  `updatedAt`**. Nothing about opening the register writes anything.
- Step 2: every Recorded cell reads the **Ink Registered** mark, none reads
  Hollow, and the register carries the notice: *"This session has ended and no
  attendance has been recorded. Everyone here is still Registered — nobody
  becomes a No-Show until you record one."* The form points at it with
  `aria-describedby`.
- Step 4 sends nothing at all: the Save control is **disabled** while nothing has
  changed and the counter beside it reads "Nothing changed yet". A route call
  with `{ "rows": [] }` is **400** with `reason: "ROWS_EMPTY"`.
- Step 5: the member's own surfaces show the Session as Registered. Nobody has
  been branded a No-Show for an Admin's omission, which is the whole point of the
  state having a producer rather than an inference.

### 18.2 The attendance register

### TC-AR-017 · P0 · Positive — A bulk save writes only the rows the Admin touched

**Preconditions:** a Session with at least four Participants. Record every row's
`status` and `updatedAt` from the database.

**Steps:**
1. Open the attendance register, change **two** rows, and read the counter beside
   Save.
2. Press **Save attendance** and read the response.
3. Re-read every row from the database.
4. Press **Mark All Present**, then Save, then re-read.
5. Reopen the register and press Save without touching anything.
6. Restore every row.

**Expected result:**

- Step 1: the counter reads "2 changed"; Save is enabled only once something has.
- Step 2 is **200** with `{ "updated": 2 }` — the payload carried two rows and
  two rows only.
- Step 3: exactly those two rows carry the new statuses and a moved `updatedAt`.
  **Every other row's `status` and `updatedAt` are identical to step 0's.** A
  save that rewrote untouched rows would move their timestamps even where the
  status happened to match, and this is the assertion that catches it.
- Step 4: **Mark All Present** is a prefill — it moves only rows currently
  reading Registered, leaves rows already recorded as Opted Out or No-Show alone,
  and writes **nothing** until Save is pressed.
- Step 5 is refused by the disabled control, and `{ "rows": [] }` against the
  route is **400** `ROWS_EMPTY`. A save that changes nothing is not a save.

### TC-AR-018 · P0 · Negative — A payload with one invalid row writes nothing

**Preconditions:** a Session with at least two Participants. Record every row's
`status` and `updatedAt`.

**Steps:**
1. `POST /api/sessions/{id}/attendance/bulk` with two rows, the first a valid
   change and the second carrying `"status": "MAYBE"`.
2. Re-read every row.
3. Repeat with the second row naming a `userId` who holds no Seat on this
   Session; then with the same `userId` twice; then with `{ "rows": [] }`; then
   with no `rows` key at all.
4. Repeat step 1 against a Session id that does not exist, and again signed in as
   a member.

**Expected result:**

- Step 1 is **400** with `error: "Invalid payload"` and `reason: "ROW_INVALID"`.
  `MAYBE` is the member's own tentative RSVP and is never an Admin's judgement,
  so it is refused here exactly as it is on the single-row route.
- Step 2: **no row is written** — the valid first row included. The whole payload
  is validated before the transaction opens, so one bad row is all of nothing;
  a half-save is the failure this case exists to catch.
- Step 3 returns **400** with, in order, `reason: "USER_NOT_ON_SESSION"`,
  `"DUPLICATE_USER"`, `"ROWS_EMPTY"` and `"ROWS_MISSING"`, and nothing is written
  by any of them.
- Step 4 is **404** for the unknown Session and **403** for the member. Neither
  writes anything.

### TC-AR-019 · P0 · Positive — Opted Out and No-Show are distinct records and distinct marks, reached through real flows

> **Partly superseded by Rally (#152).** *Distinct marks* is retired — Erased's
> borderless ground fill and Hollow's 2px dashed outline are both gone. Pointer:
> **TC-DS-107**. The distinction is now carried entirely by two words, `Opted
> Out` / `Batal Ikut` on a **neutral** chip and `No-Show` / `Tidak Hadir` on a
> **void** one, which is the swap ADR 0003 made deliberately: the obligation
> (WCAG 1.4.1) is unchanged and the channel is a word rather than a shape a
> reader has to learn. **Still live, and it is the P0 half:** they are two
> distinct stored `AttendanceStatus` values reached through two real flows, a
> member's own withdrawal and an Admin's record, and neither is ever derived from
> the other.

**Preconditions:** two Participants on the same Session, one who will withdraw
themselves and one an Admin will record as a No-Show.

**Steps:**
1. As the first member, withdraw from the Session through the member surface.
2. As the admin, open the attendance register and record the second member as
   **No-Show**, then Save.
3. Read both rows from the database.
4. Read both rows' Recorded cells, in both materials and with colour removed.
5. Read the same two Sessions on each member's own history.
6. Restore both rows.

**Expected result:**

- Step 3: the withdrawal stored **`ABSENT`**, the Admin's record stored
  **`NO_SHOW`**. Two rows, two values — the distinction the glossary draws is in
  the data, not only in the copy.
- Step 4: `ABSENT` renders **Erased** and reads **"Opted Out"** / **"Batal
  Ikut"**; `NO_SHOW` renders **Hollow** and reads **"No-Show"** / **"Tidak
  Hadir"**. The two forms differ with hue discarded — Erased is a transparent
  border over the ground fill, Hollow is a dashed outline with no fill — so
  neither state is carried by colour. The word **"Absent"** appears on no
  surface: the stored name never becomes user-facing copy.
- Step 5: the member who withdrew sees their own decision; the member who did not
  turn up sees the Hollow record. Neither is told the other's word.

### 18.3 The Payments queue

### TC-AR-020 · P0 · Positive — Awaiting Payments are the top of the page, and the decided follow by recency

**Preconditions:** a set of Payments with mixed standings — at least three
`PENDING`, several `CONFIRMED` and at least one `REJECTED` — and no filter and no
column sort applied.

**Steps:**
1. Open `/admin/payments` and read the standing column down page 1, then page 2.
2. Read the heading above the register.
3. Read the whole set on one page (`?pageSize=all`) and check the order end to
   end.
4. Apply a status filter, then a column sort, and read the order again.
5. Press **Back to the queue order** and read it once more.

**Expected result:**

- Every `PENDING` row is **above** every decided row, on page 1 and across the
  whole set. Within each group the order is newest first, and the tie-break is
  stable, so two loads of the same data give the same list.
- The heading reads "*n* waiting for a decision" with *n* equal to the count of
  `PENDING` rows matching the current filter.
- A `REJECTED` row is decided, not awaiting: it sits with the Confirmed ones and
  carries the **Strike** mark with its amount struck through.
- Step 4: an explicit column sort **wins** — the Admin has said what order they
  want, and the queue's own order is not silently reimposed on top of it. No
  column head ever renders as "sorted by" the queue order, because the queue
  order is not a column.
- Step 5 returns to the queue's own order.

### TC-AR-021 · P1 · Edge — A queue with nothing awaiting a decision still reads as a queue

**Preconditions:** a filter that is **not** a standing filter and under which no
Payment is `PENDING` — an Activity whose Payments are all decided is the cheapest
— then the Confirmed **standing** filter, and then a filter matching no Payment
at all.

**Steps:**
1. Open `/admin/payments?activityId={an Activity with nothing awaiting}` and read
   the heading and the rows.
2. Read the standing column: nothing should be Tape.
3. Open `/admin/payments?status=CONFIRMED` and read the heading.
4. Open a filter that matches nothing at all and read the register's body.
5. Clear the filters and confirm the awaiting count comes back.

**Expected result:**

- Step 1: the heading says **"nothing is waiting for a decision"** — a sentence,
  not "0 waiting", and not a hidden heading. An empty queue is a fact worth
  stating, and the surface does not pretend the boundary is somewhere it is not.
- Step 2: every row is decided; the ordering rule is vacuously satisfied and the
  page is still the register, not a different layout.
- Step 3: the sentence is **absent**. Under an explicit standing filter the
  awaiting count is structurally zero — the filter is hiding the queue, not
  emptying it — and "nothing is waiting for a decision" would be a false sentence
  about Payments that are still waiting. A heading that says it there fails this
  case as surely as one that omits it in step 1.
- Step 4: the register draws its **empty row** — the register's own empty state,
  inside the same frame and the same rules, with its mark and its sentence. It is
  not a card, and it is not a bare table with no rows.

### TC-AR-022 · P0 · Positive — The Proof column's three cells: an image, no Proof, and a Proof that will not load

**Preconditions:** three Payments in the queue — one whose `proofUrl` is a real
image on the storage host, one with `proofUrl` null, and one whose `proofUrl` is
on a host the image optimiser is not configured for, or is a dead URL.

**Steps:**
1. Read all three cells at 1440 × 900.
2. Tab to the first cell's control and press Enter; read the dialog; close it and
   read where focus went.
3. Read the accessible name of the thumbnail control.
4. Read the second and third cells' text, and check neither draws a mark.
5. Reload the whole page and confirm it still renders.

**Expected result:**

- The first cell is a real `<button>` holding the thumbnail, reached by Tab in
  the row's own order, opened with **Enter** — no single-key shortcut anywhere
  near a money decision. Its accessible name names the member: "Open the Proof
  from {name}".
- The dialog shows the Proof full size with the Activity and Billing Period in
  its description, so an opened Proof still says which row it came from. Closing
  it returns focus to the same button.
- The second cell draws a **dashed box** the same size as the ones holding an
  image, captioned **"No Proof"** / **"Tidak ada bukti"**. It is not a broken
  image glyph and it is not empty.
- The third cell draws a **ruled** box — something is there — with the caption
  **"Failed to load"** / **"Gagal dimuat"**.
- Neither of those two cells uses a **mark**: every mark on this surface lands on
  the standing column's shared edge, and a second mark in this column would break
  that line.
- Step 5: the page renders. A single Payment carrying a Proof URL on an unlisted
  host must not blank the queue — that failure is issue #88, and this clause is
  its regression net.

### TC-AR-023 · P1 · Positive — A forty-row queue's image weight is the thumbnails, not the originals

**Preconditions:** a queue page showing **40 rows**, each with a Proof on the
storage host. Where the seed has fewer, add sentinel Payments carrying the same
Proof and remove them afterwards.

**Steps:**
1. Load `/admin/payments?pageSize=40` at 1440 × 900.
2. In the console, read `performance.getEntriesByType('resource')` and sum
   `transferSize` over the entries whose name contains `/_next/image`.
3. Read one entry's URL and note its `w=` parameter.
4. Note the size of the original Proof object for comparison.
5. Open one Proof full size and re-read the resource list.

**Expected result:**

- Every thumbnail is requested through the framework's optimiser at the fixed
  box — `/_next/image?url=…&w=96&q=75` on a 2× device, `w=48` at 1× — never as
  the original object.
- The summed thumbnail weight is a small fraction of forty originals. **(measure)**
  — record the sum, the per-thumbnail size and the original's size, and the ratio
  between them. The case fails if the page fetches originals at all, not on a
  particular number.
- Step 5: the full-size render is fetched **only when the dialog mounts**, so it
  is absent from the list until then — which is why the queue's own weight is
  unaffected by it.

### TC-AR-024 · P0 · Positive — Confirm goes through a dialog, and a low amount is pointed out without being blocked

**Preconditions:** two `PENDING` Payments: one whose `amount` equals the current
price for its mode, and one whose `amount` is **below** it — below the Activity's
Dues for a monthly Payment, or below the Session's Fee for a per-Session one.

**Steps:**
1. Press **Confirm** on the first and read the dialog before deciding.
2. Cancel, and confirm the Payment's stored status has not moved.
3. Press **Confirm** on the low one and read the dialog.
4. Read the `aria-describedby` on the dialog's Confirm button.
5. Confirm it, and re-read the Payment.
6. Restore both.

**Expected result:**

- A dialog opens on **every** Confirm. A money decision is never one mis-click
  away — "Confirm this payment?" with the amount, the Billing Period, the
  Activity and the bank account restated, so the Admin is comparing the row
  against the screenshot rather than against memory.
- Cancelling writes nothing.
- Step 3: the dialog carries the sentence **"This is less than the current Dues
  of {amount}. You can still Confirm."** (or the Fee wording for a per-Session
  Payment), at **Body** size in Secondary Ink — a disclosure, not fine print.
- Step 4: the Confirm button points at that sentence with `aria-describedby`, so
  it reaches a screen reader as part of the decision rather than as decoration.
- Step 5: the Confirm **succeeds** — **200**, status `CONFIRMED`. It warns; it
  never blocks. A dialog that refused a short amount would not stop an Admin
  accepting a partial transfer, it would teach them to type a figure that never
  arrived.

### TC-AR-025 · P0 · Negative — Reject refuses an empty reason and names the Seat consequence first

**Preconditions:** one `PENDING` **`MONTHLY`** Payment and one `PENDING`
**`SESSION`** Payment.

**Steps:**
1. Press **Reject** on the monthly one and press Reject in the dialog with the
   reason box empty.
2. Type only spaces and press Reject again.
3. Read the sentence above the dialog's Reject button, and its
   `aria-describedby`.
4. `PATCH /api/payments/{id}` with `{ "status": "REJECTED" }` and no `notes`, and
   again with `{ "notes": "   " }`.
5. Type a real reason and Reject. Re-read the Payment.
6. Open the Reject dialog on the per-Session Payment and read whether the Seat
   sentence is there.
7. Restore both.

**Expected result:**

- Steps 1 and 2 are refused **in the dialog**, with the message *"No reason
  given. Write why you are rejecting this payment — the member sees it."* carried
  by a live region. The control is **not** disabled: a dead button explains
  nothing, and the Admin is told what is missing.
- Step 3: for the monthly Payment the dialog states the consequence before the
  Admin commits — *"Every seat this member is Registered for in {activity}
  sessions in {period} is released. Seats they attended or opted out of are
  untouched."* — at Body size, with the Reject button pointing at it with
  `aria-describedby`.
- Step 4 is **400** both times, with `error: "REJECT_REASON_REQUIRED"`. The rule
  is the route's, not the dialog's; the dialog is the courtesy.
- Step 5 is **200**, `status` `REJECTED`, and `notes` carry the typed reason
  verbatim — it is what the member reads.
- Step 6: the Seat sentence is **absent** on a per-Session Payment. Rejecting one
  releases that Session's Seat only, and a sentence about a month of Seats would
  be false there. The rest of the dialog is unchanged.

### TC-AR-026 · P0 · Positive — The member's own view reflects the Admin's decision

**Preconditions:** one `PENDING` Payment belonging to a member who can be signed
in as.

**Steps:**
1. As the member, read `/payments` and note the Payment's mark and the dues card.
2. As the admin, Reject it with a reason.
3. As the member, reload `/payments` and read the row, the reason and the way
   back.
4. As the admin, restore and then Confirm a Payment for the same member.
5. As the member, reload and read the row again.
6. Restore.

**Expected result:**

- After the Reject the member's row carries the **Strike** mark, the Admin's
  reason verbatim, refund guidance and a route back to sending new Proof. The
  amount is dimmed, not struck: the money is a fact, the decision is what was
  struck.
- After the Confirm the row carries the **Ink** mark and the dues card for that
  period settles.
- Neither state is carried by colour alone, and the member is never shown the
  Admin's machine words — no `REJECTED`, no `PENDING` enum leaking through.

### 18.4 The Owner, the Activities form, and the exports

### TC-AR-027 · P0 · Negative — An Owner account is visibly immutable, as an Admin and as the Owner

**Preconditions:** the Owner (`owner@xclub.local`) and an admin from §3.

**Steps:**
1. As the admin, open `/admin/members` and find the Owner's row. Read the role
   treatment, the Contact cell, and every control on the row.
2. Read the sentence the row carries where other rows carry a promote or demote
   control.
3. Attempt the role change through the route the register would have used.
4. Open `/admin/members/{the Owner's id}` and read the same.
5. Repeat steps 1 and 4 signed in as the Owner.

**Expected result:**

- The Owner's row carries **no** promote, demote or edit control — absent, not
  disabled — and the sentence **"This account cannot be changed."** / **"Akun ini
  tidak bisa diubah."** in its place. The rule is visible in the product rather
  than discovered by a refused edit.
- The role is drawn as the tracked-caps **label**, not as a mark: a role is a
  standing property of a person, not a state of a thing. It reads as an
  immutability and privacy marker, and the register implies **no hierarchy of
  power** — the Owner carries no capability an Admin lacks.
- The Contact cell reads **Withheld** / **Dirahasiakan**, never a blank: a blank
  reads as an unfilled profile and sends the Admin looking for the number
  somewhere else.
- Step 3 is refused by the server, whatever the register drew.
- Step 5: the Owner sees their own contact details intact, and their own account
  still immutable — the rule is about the account, not about who is looking.

### TC-AR-028 · P1 · Positive — The Members register and a member's detail page answer a member's question in one read

**Preconditions:** admin on `/admin/members`. One member with a monthly
Membership whose Dues are Confirmed this period, one with nothing sent, one with
a Proof awaiting a decision, one on a per-Session Membership, and
`newbie@xclub.local` with an incomplete profile.

**Steps:**
1. Read the register's columns and one row of each of the five kinds.
2. Read the Standing column on the per-Session Membership.
3. Promote a member to Admin from the row, confirm the dialog, and read the row;
   then demote them back.
4. Open one member's detail page and read their Memberships, their attendance and
   their dues history.
5. Read the No-Show figure on the detail page, and look for one on the register.

**Expected result:**

- The register carries each member's Activities, payment mode and standing, so
  the common question is answered without opening four screens.
- **Standing is the current Billing Period's Dues state per monthly Membership**:
  **Ink** Confirmed, **Tape** awaiting a decision, **Blank** "Pending" where
  nothing has been sent or only a Rejected Payment stands. A **per-Session**
  Membership carries **no standing mark at all**, only its mode label — there is
  no monthly obligation for it to be in good or bad standing on.
- `newbie@xclub.local` carries the incomplete-profile marker.
- Step 3 asks first, and the role label flips both ways.
- Step 5: the **No-Show count is on the detail page** and **not** a register
  column. The register is already dense; the count serves a conversation, and the
  detail page is where that conversation is prepared.

### TC-AR-029 · P1 · Negative — The Activity form offers no colour and no icon, and nothing is drawn in their place

**Preconditions:** admin on `/admin/activities` and on the Activity create and
edit forms.

**Steps:**
1. Read every control on the create form and on the edit form.
2. Read one Activity's cell in the register, and the Activity cell on the
   Sessions register.
3. `POST /api/activities` with a slug an Activity already uses.
4. `POST /api/activities` without `minMembers` and without `maxPlayers`.
5. Deactivate an Activity from its row, then activate it again.

**Expected result:**

- There is **no colour control and no icon control** on either form — not
  disabled, not hidden behind a toggle: gone.
- Nothing is rendered in their place: **no swatch, no default colour chip, no
  accent line, no broken icon**. Each Activity is identified by its **initial on
  a tile**, so the register is scannable without colour.
- The register carries price, weekly slot, capacity and destination bank account
  together, so an Activity's setup is auditable in one read.
- Step 3 is **409** — "That slug is already in use".
- Step 4 is **400** with field-level details.
- Step 5 asks first, and the standing flips both ways.

### TC-AR-030 · P1 · Negative — Posting a Session refuses an empty form and an end before its start

**Preconditions:** admin on `/admin/sessions/new`.

**Steps:**
1. Submit the empty form.
2. Fill it validly but set Start `20:00` and End `18:00`; submit.
3. Set them equal; submit.
4. Fill it validly and submit.
5. Re-read the Sessions register after each of steps 1–3.

**Expected result:**

- Step 1 shows inline required-field errors and creates nothing.
- Steps 2 and 3 show the inline message **"End time must be after start time"**
  and create nothing — equal times are refused too.
- Step 4 creates the Session, which appears in the register as **Scheduled** at
  `0/max`.
- The register's row count is unchanged after each refusal. A refused post that
  wrote a row anyway is the failure this case exists to catch.

### TC-AR-031 · P1 · Edge — A search that matches nothing says so in the register's own words

**Preconditions:** admin on `/admin/sessions`, and on `/admin/payments` and
`/admin/members`.

**Steps:**
1. Search `zzzznonexistent` on each register.
2. Read the register's body and the sentence in it.
3. Clear the search and read the body again.

**Expected result:**

- Each register draws its **empty row** inside the same frame and the same rules
  — the register's own empty state, with its mark and its sentence, never a card
  and never a bare table.
- The sentence distinguishes **"nothing matches your search"** from **"there is
  nothing here yet"**: two different facts, and telling an Admin the wrong one
  sends them to create a row that already exists.
- Clearing the search restores the rows.

### TC-AR-032 · P1 · Negative — Community settings save, and an empty community name is refused

**Preconditions:** admin on `/admin/settings`. Note the stored community name
first, and restore it at the end.

**Steps:**
1. Read the page: the frame, the fieldsets, and the field treatment on each
   control.
2. Clear the Community Name and press Save.
3. `PATCH /api/settings` with `{ "communityName": "   " }`.
4. Save a new name and read the header and the browser title.
5. Restore the original name.

**Expected result:**

- The page is on the board's own treatment — one frame, ruled rows inside
  fieldsets, the shared field treatment on every control. It is not the one page
  left from the old product, and it renders **no card shell** at any width.
- Step 2 is blocked with **"Community name is required"** and the stored value is
  unchanged.
- Step 3 is **400**: the rule is the server's, and the form is the courtesy.
- Step 4 rebrands the app — header and title both.

### TC-AR-033 · P1 · Positive — The export routes are unchanged, localised, and carry all four attendance values

**Preconditions:** a Session carrying an Attendance row at **each** of
`REGISTERED`, `PRESENT`, `ABSENT` and `NO_SHOW`. An admin and the Owner.

**Steps:**
1. `GET /api/sessions/{id}/export` as the admin in `en`; read the header row and
   every status cell.
2. Switch the locale to `id` and re-export; read the header row.
3. `GET /api/payments/export?month=8&year=2026`; read the header row and the row
   count.
4. Repeat steps 1 and 3 signed in as the Owner, with the Owner holding a row on
   that Session.
5. Restore the fixture.

**Expected result:**

- The session export's header is
  `"No","Name","Email","WhatsApp","Status","Registered At"` in `en` and its
  Indonesian equivalent in `id` — the headers are localised, the data is not.
- Every status cell carries the **stored** value: `REGISTERED`, `PRESENT`,
  `ABSENT` and `NO_SHOW`, all four, spelled as the database spells them. The
  glossary rule that the stored `ABSENT` never surfaces as "Absent" is a rule
  about **user-facing copy**, not about a machine-readable export, and an export
  that translated its values would break whatever reads the file.
- The payments export's header and its row count are unchanged from before this
  spec.
- Step 4: for an **Admin**, the Owner's Email and WhatsApp cells are **empty**
  while the Owner's row is still written, with its status and timestamp
  unchanged. For the **Owner**, both cells carry their stored values.

### 18.5 Both locales, the keyboard, and both widths

### TC-AR-034 · P1 · Positive — No English leaks into any admin surface

**Preconditions:** `NEXT_LOCALE` set to `id`; every surface in §18.0's scope.

**Steps:**
1. Visit each surface in `id` and read every heading, column head, control,
   dialog, empty state, mark label and toast.
2. Read the accessible names of the controls, not only their visible text.
3. Compare each string against the `en` build and list every one that matches.
4. Read the four attendance marks and the Proof cells' captions in `id`.

**Expected result:**

- No English string anywhere. Column heads, the register captions, the empty
  rows, both payment dialogs, the untaken notice, the Owner's withheld cell, the
  reopen and cancel dialogs and every toast all switch.
- The marks switch: `No-Show` → **Tidak Hadir**, Opted Out → **Batal Ikut**,
  `Withheld` → **Dirahasiakan**, `No Proof` → **Tidak ada bukti**, `Failed to
  load` → **Gagal dimuat**.
- The only strings matching across locales are the community name, proper nouns,
  numerals, currency and the documented loanwords.
- No **metaphor word** from `CONTEXT.md` — board, tile, rail, lattice, register —
  appears in user-facing copy in either locale.

### TC-AR-035 · P1 · Positive — The queue is traversed and decided from the keyboard alone

**Preconditions:** admin on `/admin/payments`, at least three awaiting rows.

**Steps:**
1. Tab from the page heading into the register and record the order focus
   travels: filters, then each row's controls.
2. Read the focus indicator on each stop.
3. Open a Proof with Enter, close it with Escape, and read where focus went.
4. Reach a row's Confirm with Tab and press Enter; move through the dialog with
   Tab; cancel with Escape.
5. Press every single letter key over a focused row and read what happens.
6. Read `<tr>` for a `tabindex`.

**Expected result:**

- Focus travels in **plain DOM order**: the filter controls, then row by row, and
  within a row the Proof button, then Confirm, then Reject.
- Every stop carries a visible focus ring.
- Escape closes both the Proof dialog and a decision dialog, returning focus to
  the control that opened it.
- **No single-key shortcut does anything.** A one-key Confirm on a money row is a
  mis-press waiting to happen, and plain tab order already satisfies "no mouse".
- No `<tr>` carries a `tabindex`.

### TC-AR-036 · P0 · Positive — Every register is ruled at 1440 and collapses by axis at 390

> **Partly superseded by Rally (#152).** *Ruled at 1440* is retired: one bounded
> frame of 1px-ruled rows is exactly what ADR 0003 replaced with tables inside
> cards. Pointer: the admin surface spec (#145). **Still live, and it is the P0
> half:** at 390 every register **collapses by axis** — still rows, each cell
> carrying its column's label as real text, the table role and `scope` dropped
> together, no horizontal page scroll, and no second DOM tree.

**Preconditions:** each of `/admin/sessions`, `/admin/payments`,
`/admin/members`, `/admin/activities`, `/admin/applicants`,
`/admin/sessions/{id}/attendance` and `/admin/settings`.

**Steps:**
1. At **1440 × 900**, read each surface's frame, its row rules and its cell
   rules, and — on every register that carries a **standing column** — confirm
   its marks land on one shared edge. The Members register is the exception by
   design: its standing is one mark per monthly Membership inside the
   Memberships cell, so its marks are aligned to their own rows, not to a
   column edge.
2. Search each surface's markup for a card shell, a coloured swatch, an accent
   line and a `rounded-xl` container.
3. Resize to **390 × 844** and read the same surfaces: the `<thead>`, the inline
   cell labels, and `document.documentElement.scrollWidth`.
4. Read one row's controls at 390 and press one.
5. Read the Applicants surface's action vocabulary.

**Expected result:**

- At 1440 every register is one bounded frame of ruled rows — **1px** rules,
  tabular figures down the money columns, the standing mark in its own column on
  a shared edge, density rather than whitespace. Forty rows are readable without
  scrolling past furniture.
- **No admin surface renders a card shell, a coloured swatch or an accent line at
  any width.** The old mobile card shell and its field and empty-state companions
  are gone from the repository, not merely unused.
- At 390 each register **collapses by axis**: still ruled rows, each cell
  carrying its own column label above its value, the `<thead>` hidden, and
  `scrollWidth === 390` — the page never scrolls sideways.
- Every row control is reachable and pressable at 390.
- The Applicants surface says **Admit** and **Decline**, never Confirm or Reject.

### 18.6 Recorded run — 2026-08-29

Executed once against `main` at **`3370853`** (the merge of #98, the last register
ticket), on the §2 seed, on Next.js 16, at **1440 × 900** and **390 × 844**, in
**both locales**, and on **both board materials**. Every figure below is measured
— from the route's own response, from `getComputedStyle`, from
`performance.getEntriesByType('resource')`, or from the database — never from
what a screenshot looked like.

**The seed was left exactly as it was found.** Every fixture this run created was
removed and the state re-compared afterwards: 25 Sessions with **zero** diffs in
`maxPlayers`, seat-holding count or per-status breakdown; `Attendance` at
`REGISTERED 69 / PRESENT 38 / ABSENT 13 / MAYBE 3 / NO_SHOW 0`; `Payment` at
`PENDING 3 / CONFIRMED 40 / REJECTED 1`; the Owner holding no Attendance and no
Payment. The only residue is that rows the run touched carry a moved
`updatedAt` — a timestamp cannot be put back, and no case depends on one.

| Case | Priority | Result |
|---|---|---|
| TC-AR-001 | P0 | **Pass** — eight heads in order (`DATE, SESSION, ACTIVITY, LOCATION, CAPACITY, FLOOR, STATUS, ACTIONS`); cell rule **1px solid `rgb(119,131,127)`**; `scrollWidth === 1440`; capacity announced "7 of 24 seats held", floor "2 of 4 members committed · **Below floor**" and "**No floor**" where `minMembers = 0`; at 390 `<thead>` is `display: none`, every cell carries its own label, `scrollWidth === clientWidth === 390`; no `<tr>` carries `tabindex` |
| TC-AR-002 | P0 | **Pass** — Strike mark, `text-decoration` set to a strike on the **mark's own label**; the title span recedes to `rgb(84,97,91)` against `rgb(21,30,27)` on a Scheduled row and carries **no** strike; the cancelled row offers `Take attendance, Edit, Detail, CSV` and **no Cancel** |
| TC-AR-003 | P0 | **Pass** — Morning Drills `{ "fee": 26000 }` → **409** `FEE_LOCKED`, "This session already has a payment or a held seat, so its fee cannot be changed. Post a new session at the new fee instead."; stored `fee` unchanged at 25 000; the form's Fee input is `readOnly: true`, `disabled: false`, `bg rgb(232,235,234)` against the open fields' `rgb(247,249,248)`, `aria-describedby="session-fee-note"`; a clean sentinel Session took `{ "fee": 11000 }` at **200** |
| TC-AR-004 | P0 | **Pass** — `{ "maxPlayers": 6 }` against 7 held → **409** `CAPACITY_BELOW_HELD`, "Capacity cannot go below the 7 seats already held. Set it to 7 or higher, or release a seat first."; `{ "maxPlayers": 7 }` → **200**; the form's capacity input carries `min="7"`, `aria-describedby="session-capacity-note"` and is **not** read-only. **Step 3 (a lapsed hold lowering the floor) was not re-run** — carried from #69 and #94 |
| TC-AR-005 | P0 | **Pass** — on the Completed Friendly Match `{ "title" }` and `{ "status": "SCHEDULED" }` → **409** `SESSION_CLOSED`; `{ "notes" }` → **200**; a whole payload with every field at its stored value and only the notes changed → **200**; the form draws all eight fields `readOnly` with `aria-describedby="session-closed-note"` and the **status as an `<input readonly>` reading "Completed"**, never a disabled `<select>`; notes stays open |
| TC-AR-006 | P1 | **Pass** — Tab order `New Session → search → activity filter → Search → DATE/SESSION/LOCATION/STATUS heads → Take attendance, Edit, Detail, CSV, Cancel/Reopen`, each with a visible indicator; the Cancel dialog reads "Cancel Underbooked Friendly?" and states the consequence before it is confirmed; no `<tr>` `tabindex`. The two safe-area-inset bullets that stood here were a paste from `TC-MS-020` — the admin shell renders **no** fixed bottom rail (`0` elements at `position: fixed; bottom: 0`) — and were replaced |
| TC-AR-007 | P0 | **Pass** — Members register, Payments queue and attendance register all draw **Withheld** / **Dirahasiakan** to the Admin, and `row.innerHTML` carries the address on **none** of them; `GET /api/payments?userId=<owner>` and `GET /api/payments/{id}` both **200** with `email: null` and an unchanged key set; `?search=owner%40xclub.local` on the queue returns no row; as the Owner all four surfaces carry `owner@xclub.local` |
| TC-AR-008 | P0 | **Pass** — held Seat → **409** `SESSION_HAS_MONEY`; a live `PENDING` Payment on a Session with **no** held Seat → **409** `SESSION_HAS_MONEY`; a `COMPLETED` Session with nothing behind it → **409** `SESSION_CLOSED` with its **own** sentence, "This session is completed, so it is part of the record and cannot be deleted." (`id`: "Sesi ini sudah selesai, jadi sudah menjadi catatan dan tidak bisa dihapus.") — distinct from the PATCH sentence, as the case demands; a Cancelled Session with nothing behind it → **200** then **404**. No **500** anywhere. The **Delete Session** button is absent on the money-behind and Completed forms and present only on the Cancelled one |
| TC-AR-009 | P0 | **Pass** — a Cancelled Session dated 2026-08-31 offers **Reopen session**; Rained Out (Cancelled, 2026-08-24, past) and Friendly Match (Completed) offer neither Reopen nor Cancel; `{ "status": "SCHEDULED" }` on Rained Out → **409** `SESSION_PAST`; on the Completed Session → **409** `SESSION_CLOSED`; `{ "status": "SCHEDULED", "title": … }` → **409** `SESSION_CLOSED` and `{ "status": "SCHEDULED", "notes": "x" }` → **409** too; plain `{ "status": "SCHEDULED" }` → **200**; the Status control on a Cancelled Session's form is read-only, reading "Cancelled" |
| TC-AR-010 | P0 | **Pass** — **8 runs**, the two writes issued without awaiting the first, capacity reset to `n + 1 = 3` before each. `held ≤ maxPlayers` on **8 / 8**. Both orders were reached: runs 1–2 the reservation committed first → reserve **201**, capacity **unchanged at 3**, edit **409** `CAPACITY_BELOW_HELD`; runs 3–8 the edit committed first → edit **200**, capacity **2**, held **2**, the claim refused **409 "Session Full"** rather than seated over the new capacity. Exactly one write refused every run. No half-write: the reserving member ended the run with his three seeded Payments and no fourth — a hold creates no Payment row |
| TC-AR-011 | P2 | **Pass, with one assertion carried** — 20 loads of page 1 as Admin A with a Confirm by Admin B in flight on four Payments this run created. **Every load returned exactly 10 rows**; none short. The queue order held on 19 loads; on the one load where a Confirm committed between the id read and the row fetch, a row drew as decided in the position its awaiting standing had earned it — the tolerance the case now states, not a dropped or duplicated row. **The id-level "no id twice in one load" assertion could not be read from the page**: the register renders no row-identity attribute, so the only DOM key available (member + amount + standing) collides across the 40 identical seeded Payments. That assertion stands on #87's query-level verification |
| TC-AR-012 | P0 | **Pass** — census of all **25** Sessions before and after. `ABSENT → NO_SHOW` on a Completed Session: **200** `{"updated":1}` and **zero** change to any `maxPlayers` or any held count, anywhere. `REGISTERED → NO_SHOW` on Singles Ladder: that Session's held falls **5 → 4**, `max` unchanged at **8**, and **every other figure in the census is unchanged**. `NO_SHOW → ABSENT` back again: **zero** change — the two behave identically, which is the proof that `NO_SHOW` simply is not in the seat-holding pair rather than being adjusted out of it |
| TC-AR-013 | P0 | **Pass** — Yoga's Hold Lab row `REGISTERED → NO_SHOW`; his `SESSION` Payment `cmt1vyis4006m2kdfhvgin70f` came back **byte-identical**, `updatedAt` still `2026-08-20T19:00:42.772Z`, `status CONFIRMED`, `amount 25000`, `confirmedBy`/`confirmedAt` untouched; the Session's `fee` 25 000 and its own `updatedAt` unmoved; the other two rows on the Session unmoved; his own `/sessions` board draws **Hollow `NO-SHOW`** on Hold Lab and no money mark changed |
| TC-AR-014 | P0 | **Pass** — a `PENDING` `MONTHLY` Badminton August Payment for a member with four rows on four Badminton August Sessions, one at each value. Reject with no `notes` → **400** `REJECT_REASON_REQUIRED`; with `"   "` → **400**; the fixture unchanged after both. Reject with a reason → **200**. The `REGISTERED` row `cmte9njqm0000acdfyrqysll2` is **gone**; `NO_SHOW cmte9njr20001acdfumkml5u9`, `PRESENT cmte9njr50002acdfp3d9a6k1` and `ABSENT cmte9njr80003acdf1yzfzbf8` all survive at their original statuses **and their original `updatedAt`** (`…19.550 / .553 / .556`) — untouched, not rewritten. Payment `REJECTED`, `notes` verbatim, `confirmedBy` the deciding admin. A second Reject → **409** "This payment has already been reviewed." This is also the re-run of `TC-MS-017`'s database assertion, on a fixture this run owned |
| TC-AR-015 | P0 | **Pass** — the Tennis card's attendance rate, watched across four states. One `NO_SHOW` + one `ABSENT` in the month → **69 %** (9/13). The `ABSENT` row moved to `NO_SHOW` → **69 %**, unchanged. The other row moved back from `NO_SHOW` to `ABSENT` → **69 %**, unchanged. One row taken out of history altogether (back to `REGISTERED`) → **75 %** (9/12). A denominator on two states would have read 75 % throughout and moved on every flip; it read 69 % with a No-Show present and never moved between the three |
| TC-AR-016 | P0 | **Pass** — Singles Ladder, ended 2026-08-27, five rows all `REGISTERED`. Every Recorded cell reads Ink `REGISTERED`, none Hollow. The notice renders verbatim — "This session has ended and no attendance has been recorded. Everyone here is still Registered — nobody becomes a No-Show until you record one." — and the form points at it with `aria-describedby="attendance-untaken"`. Save is `disabled`, the counter reads "Nothing changed yet", and `{ "rows": [] }` against the route is **400** `ROWS_EMPTY`. Opening and reloading the register left all five rows at the same status **and the same `updatedAt`** |
| TC-AR-017 | P0 | **Pass** — two rows changed → **200** `{"updated":2}`; exactly those two moved status and `updatedAt`, and the other three kept theirs to the millisecond (`2026-08-20T19:00:42.685Z`, `.688Z`, and `2026-08-29T10:54:22.366Z`). All five rows resent at their stored values → **200** `{"updated":0}` and **no** timestamp moved. **Mark All Present** on a register holding 2 × `REGISTERED`, 1 × `PRESENT`, 1 × `NO_SHOW`, 1 × `ABSENT` moved **only the two Registered rows** — counter "2 changed" — and left the No-Show and Opted Out rows alone; on a register with no Registered row it moved nothing and Save stayed disabled. Neither prefill wrote anything |
| TC-AR-018 | P0 | **Pass** — a valid row followed by `"status": "MAYBE"` → **400** `{"error":"Invalid payload","reason":"ROW_INVALID"}` and **the valid row was not written either**. Then `USER_NOT_ON_SESSION`, `DUPLICATE_USER`, `ROWS_EMPTY`, `ROWS_MISSING`, each **400**; an unknown Session id **404**; the same payload as a member **403**. All five rows on the Session came back with their statuses **and `updatedAt` identical** after every one |
| TC-AR-019 | P0 | **Pass** — reached through real flows on one Session: a member claimed a Seat and withdrew (`DELETE /api/sessions/{id}/attendance` → **200** `{"isForfeited":true}`) storing **`ABSENT`**; an Admin recorded another member as **`NO_SHOW`** through the bulk route. Erased measured `border 1px solid rgba(0,0,0,0)` over `bg rgb(232,235,234)`, label **OPTED OUT / BATAL IKUT**; Hollow measured `border 2px dashed rgb(166,47,38)` over `bg rgba(0,0,0,0)`, label **NO-SHOW / TIDAK HADIR** — fill versus no fill, so the two differ with hue discarded. The word **"Absent" appears nowhere** on the surface in either locale |
| TC-AR-020 | P0 | **Pass** — page 1: three Tape `IN REVIEW` rows, then a Strike `REJECTED` row, then six Ink `CONFIRMED`; page 2 all decided. Heading "Confirm or reject payment proofs · **3 waiting for a decision**". A Rejected Payment sits with the decided group and carries Strike, not Tape. An explicit column sort wins and the register offers **Back to the queue order** to get out of it |
| TC-AR-021 | P1 | **Pass** — `?activityId=<Basket>`, 6 rows all Ink and none awaiting → heading "…· **nothing is waiting for a decision**". `?status=CONFIRMED` → the sentence is **absent**, which is correct and is now what the case asks for: under a standing filter the count is structurally zero and the sentence would be a lie about Payments that are still waiting. A filter matching nothing → the register's own empty row, Blank mark **EMPTY** |
| TC-AR-022 | P0 | **Pass** — three cells measured at 48 × 64px each. Image: a real `<button>`, `border 1px solid rgb(119,131,127)`, `bg rgb(232,235,234)`, `aria-label` "Open the Proof from Adi Pratama". No Proof: `border 1px **dashed**`, `bg rgba(0,0,0,0)` — no fill — caption "No Proof" in Secondary Ink. Failed to load: `border 1px **solid**`, `bg rgb(232,235,234)`, caption "Failed to load" in `rgb(166,47,38)`. **Zero `[data-mark]` in the Proof column** on all three. The page rendered with a Payment carrying an unlisted-host Proof URL present — #88's regression net holds |
| TC-AR-023 | P1 | **Pass on the mechanism; the ratio carried** — 40 rows each carrying a storage-hosted Proof. The browser requested **`/_next/image?url=…&w=48&q=75`**, `currentSrc` at `devicePixelRatio 1`, **transferSize 444 B / encodedBodySize 144 B**, and **not one request for the original object**. The 40 identical URLs deduplicate to a single request, so the queue's whole image weight at 40 rows was **444 B**. The `srcset` offers 32w…3840w and the browser picked 48w, which is the box. **The ratio against a realistic Proof was not re-measured**: the seed's only storage-hosted Proof is itself **144 B**, so there is nothing to shrink. Wave 2's purpose-uploaded **1,083,388 B** object measured **1,392 B at `w=48`** and **5,787 B at `w=96`** — 0.13 % and 0.53 % — and that is the figure this clause still rests on |
| TC-AR-024 | P0 | **Pass** — a `MONTHLY` Payment of Rp 60.000 against Badminton Dues of Rp 75.000. The dialog restates member, Activity, Billing Period and amount, and carries "**This is less than the current Dues of Rp 75.000. You can still Confirm.**" with the Confirm button pointing at it through `aria-describedby`. Confirm is **not** disabled. Escape closed the dialog and wrote nothing. Confirming anyway → **200**, `status CONFIRMED`: it warns, it never blocks |
| TC-AR-025 | P0 | **Pass** — Reject on the monthly Payment with an empty reason and then with `"   "` was refused **in the dialog**, with `role="alert"` carrying "No reason given. Write why you are rejecting this payment — the member sees it." and `aria-invalid="true"` on the textarea; the button stayed enabled both times. The Seat sentence reads "Every seat this member is Registered for in **Badminton** sessions in **August 2026** is released. Seats they attended or opted out of are untouched." and the Reject button points at it. On a **per-Session** Payment that sentence is **absent** and `aria-describedby` is null. At the route, `{ "status": "REJECTED" }` and `{ "notes": "   " }` are both **400** `REJECT_REASON_REQUIRED`; with a reason, **200** and `notes` stored verbatim |
| TC-AR-026 | P0 | **Pass** — after the Admin's Confirm the member's `/payments` reads Ink **PAID** on the dues card and Ink **CONFIRMED** on the history row. After the Reject it reads Blank **PENDING** with a **Pay now** route back, and the history row carries Strike **REJECTED**, "Rejection reason: amount short of the August dues", the refund guidance and the WhatsApp link |
| TC-AR-027 | P0 | **Pass** — the Owner's row carries **no** promote, demote or edit control (only the name link), the sentence "**This account cannot be changed.**", the role as the tracked-caps label `OWNER`, and Contact **Withheld**. `PATCH /api/users { role: "MEMBER" }` on the Owner as an Admin → **403** "Cannot modify an OWNER account"; `{ isActive: false }` → **403** likewise. As the Owner themselves the self-demotion guard answers first — **400** "Cannot demote yourself" — and the account is still not modified. As the Owner the same row shows `owner@xclub.local` and `6281200000000`, and is still immutable |
| TC-AR-028 | **P1** | **Fail — see [#102](https://github.com/jefrykurniaone/net-c-management/issues/102)**. Everything else held: columns `NAME, CONTACT, ROLE, MEMBERSHIPS, ACTIONS`; standing per monthly Membership as Ink `CONFIRMED`, Tape `IN REVIEW` and Blank `PENDING` (all three observed); a **per-Session** Membership carries **no standing mark at all**, only "Per session"; a Membership with no mode reads "Not chosen"; promote → **200** `ADMIN`, demote → **200** `MEMBER`; the detail page carries **PRESENT / OPTED OUT / NO-SHOW** count columns (Yoga 0 / 0 / **1**) and an attendance history row at the Hollow mark, and the register carries **no** No-Show column. **The failing clause is the incomplete profile**: `newbie@xclub.local` carries no marker, because `admin.profileIncomplete` stands in for a *missing name* rather than reporting `isProfileComplete` |
| TC-AR-029 | P1 | **Pass** — the New Activity and Edit Activity dialogs carry **0** `input[type=color]`, **0** fields named for a colour or an icon, **0** inline `background` styles and no mention of either word; the register draws the initial tile and no swatch. `POST /api/activities` with an existing slug → **409** "That slug is already in use"; without `minMembers` / `maxPlayers` → **400** with field-level details. The register carries Dues, Fee, Modes, Weekly slot, Capacity, Floor and Bank together |
| TC-AR-030 | P1 | **Pass** — empty body → **400** listing all eight missing fields; `20:00`→`18:00` → **400** "End time must be after start time"; equal times → the same **400**; a valid post → **201**, Scheduled at `0/8`. The register's row count was unchanged after each refusal |
| TC-AR-031 | **P1** | **Fail — see [#101](https://github.com/jefrykurniaone/net-c-management/issues/101)**. All three registers draw the register's own empty row with the Blank **EMPTY** mark inside the same frame, and clearing the search restores the rows. `/admin/sessions` distinguishes the two facts — "**No sessions match your search.**" — and `/admin/payments` ("No payments found.") and `/admin/members` ("No members found.") do not |
| TC-AR-032 | P1 | **Pass** — three `<fieldset>`s (BASIC INFO / ADMIN CONTACT / PAYMENT & FEES) on the shared field treatment: `border-radius 2px`, `border 1px solid rgb(119,131,127)`, `padding 10px`, `bg rgb(247,249,248)`. **Zero** `.rounded-xl` or `.bg-card` inside `<main>`, at 1440 and at 390, `scrollWidth === 390`. `PATCH /api/settings { "communityName": "" }` and `{ "   " }` → **400** "Community name is required". A rename took **200** and the sidebar rebranded to "T73 Rename Probe" with its own initials tile; restored to "XClub Community". The browser `<title>` on this route is the section name, "Community", not the community's — the header is what rebrands |
| TC-AR-033 | P1 | **Pass** — the session export carries `"No","Name","Email","WhatsApp","Status","Registered At"` in `en` and `"No","Nama","Email","WhatsApp","Status","Waktu Daftar"` in `id`, with the **data unchanged** between them; the five status cells read `REGISTERED`, `REGISTERED`, `NO_SHOW`, `PRESENT`, `ABSENT` — all four stored values, spelled as the database spells them. The payments export header is unchanged. On a Session the Owner holds a Seat on, the Admin's export writes the Owner's row with **empty** Email and WhatsApp cells and an unchanged status and timestamp; the Owner's own export carries both values |
| TC-AR-034 | P1 | **Pass** — all seven surfaces in `id`. Column heads (`TANGGAL, SESI, AKTIVITAS, LOKASI, KAPASITAS, BATAS MINIMUM, STATUS, AKSI`; `ANGGOTA, AKTIVITAS, BUKTI, JUMLAH, PERIODE TAGIHAN, STATUS, DIKIRIM, AKSI`; …), controls (`Buat Sesi, Catat kehadiran, Buka kembali sesi, Batalkan sesi, Konfirmasi, Tolak, Terima, Non-aktifkan, Jadikan Admin, Simpan Pengaturan`), marks (`DIBATALKAN, DITINJAU, LUNAS, TIDAK HADIR, BATAL IKUT, TERDAFTAR, HADIR`), the withheld cell (`Dirahasiakan`), the Proof cells (`Tidak ada bukti`, `Gagal dimuat`), the accessible names (`Buka bukti dari Adi Pratama`) and the routes' own refusal sentences all switch. The only cross-locale matches are the community name, seeded proper nouns, numerals, currency and three documented loanwords that are dictionary values in both blocks — `edit`, `filterBtn` and `status`. No metaphor word — board, tile, rail, lattice, register — appears in either locale. One vocabulary note, not a failure: Decline and Reject both render **Tolak**, where English keeps Decline and Reject apart |
| TC-AR-035 | P1 | **Pass** — focus travels `EXPORT CSV → search → month → year → status → activity → Filter → the four sortable heads → row 1's Confirm, Reject → row 2's Proof button`, i.e. plain DOM order with the Proof button first on any row that has one. Every stop carries an indicator (a `box-shadow` ring on the controls, the ring-coloured `outline` on the sort heads). Escape closes both the Proof dialog and a decision dialog. Pressing `c`, `r`, `y` and `n` over a focused row opened nothing and changed nothing. No `<tr>` `tabindex` |
| TC-AR-036 | P0 | **Pass** — swept at **1440 × 900** and **390 × 844**, in both locales and on both materials, across `/admin/sessions`, `/admin/payments`, `/admin/members`, `/admin/activities`, `/admin/applicants`, an attendance register and `/admin/settings`: **`rounded-xl` 0, `rounded-2xl` 0, `border-l-4` 0, `input[type=color]` 0** on every one. Cell rule 1px solid `rgb(119,131,127)` on enamel and `rgb(122,137,129)` on the painted board (`body` at `rgb(27,38,33)`). Standing marks share one edge where there is a standing column (Sessions 1059–1060, Payments 1048–1054). At 390 every `<thead>` is `display: none`, every cell carries its own label, `scrollWidth === 390`, and every row control is pressable. Applicants says **Terima / Tolak** — Admit / Decline, never Confirm / Reject. The `bg-card` matches inside `<main>` are the shared `Badge` and `Button` token variants, not shells |

**Summary.** 36 cases — 11 carried from waves 3 and 4, **25 written by this
ticket**. **36 executed, 34 Pass, 2 Fail, 0 Not run.** Both failures are **P1**
and both are filed: [#101](https://github.com/jefrykurniaone/net-c-management/issues/101)
and [#102](https://github.com/jefrykurniaone/net-c-management/issues/102).
**Every P0 case passes.** A third defect found by the sweep rather than by a case
is filed as [#103](https://github.com/jefrykurniaone/net-c-management/issues/103).

**The database assertions, and what proved them.**

| Claim | Proof |
|---|---|
| A No-Show leaves capacity alone | A census of all 25 Sessions' `maxPlayers` and seat-holding counts, taken before and after each write and diffed field by field. `ABSENT → NO_SHOW`: **0 diffs**. `NO_SHOW → ABSENT`: **0 diffs**. `REGISTERED → NO_SHOW`: exactly one Session, held **5 → 4**, `max` unchanged, every other row identical |
| A monthly Reject removes only Registered rows | Four rows on four Badminton August Sessions for one member, one at each value, read by id before and after. `REGISTERED` deleted; `NO_SHOW`, `PRESENT` and `ABSENT` present at their original statuses **and their original `updatedAt`** |
| A No-Show touches no money | The paired `SESSION` Payment re-read in full: every field including `updatedAt` identical. The Session's `fee` and `updatedAt` identical |
| A bulk save writes only touched rows | Every row's `status` and `updatedAt` before and after. Two changed rows moved; three did not, to the millisecond. A five-row payload at stored values returned `{"updated":0}` and moved nothing |
| Admin aggregates count three historical states | The Tennis attendance rate held at **69 %** across an `ABSENT ↔ NO_SHOW` flip and moved to **75 %** only when a row left history altogether |
| The queue's page is one snapshot | 20 loads, each exactly 10 rows, with a Confirm in flight on four of them |
| The seed is unchanged | 25 Sessions, 0 census diffs; `Attendance` 69 / 38 / 13 / 3 / **0 NO_SHOW**; `Payment` 3 / 40 / 1; Owner holds no Attendance and no Payment |

**Fixtures created and removed.** All of them, through
`.claude/scratch/t73-probe.ts` (git-ignored, alongside the harness the earlier
waves left): four sentinel Sessions (`T73 Sentinel A…E`), the Attendance rows on
them, one monthly Payment with four paired Attendance rows for the reject case,
four awaiting Payments for the snapshot case, forty Payments carrying one Proof
for the weight case, one Payment with a dead Proof URL, and the Owner fixture
from `probe-owner-seed.ts`. Every one removed, and the state re-compared above.

**Regression net — the existing suites, re-run.**

| Area | Result |
|---|---|
| §7 Session management (admin) — 1–11 | **Retired into `TC-AR-*` and re-run there in full.** Every item is executed above: list and filter (`TC-AR-001`, `TC-AR-036`), filtered empty state (`TC-AR-031`, which is where it failed), create validation (`TC-AR-030`), locked fields (`TC-AR-003`…`005`), attendance (`TC-AR-017`, `TC-AR-019` — now on its own register), localised CSV (`TC-AR-033`), delete (`TC-AR-008`) |
| §8 Payment review (admin) — 1–6 | **Retired into `TC-AR-*` and re-run there in full**: `TC-AR-020`, `TC-AR-021`, `TC-AR-024`, `TC-AR-025`, `TC-AR-026`, `TC-AR-033`. §8.4's "Reject button disabled until a reason is typed" is superseded: the reason is now refused **with a message** and the button stays enabled, which is the better answer and is what `TC-AR-025` asserts |
| §9–§11 Activities, Members, Settings | **Retired into `TC-AR-029`, `TC-AR-028` and `TC-AR-032`**, all executed above |
| §12 Member — dashboard & sessions | **Spot re-run, pass.** The guards are exact: attendance on the ONGOING Session → **403** "RSVP closed"; on the CANCELLED Session → **400** "Session is cancelled"; a member calling `POST /api/activities` → **403**. §12.5's full-Session refusal now answers **403 "RSVP closed"** rather than **409 "Session Full"**, because the seeded full Session's day has passed relative to real today and the window guard runs first — the capacity refusal itself was exercised live in `TC-AR-010` |
| §13 Member — payments & profile | **Spot re-run, pass.** `/payments` reads Tape `IN REVIEW` on Badminton, Ink `PAID` on Basket / Futsal / Tennis, Ink `CONFIRMED` and Strike `REJECTED` in the history, and no unpaid banner while a Proof is in review |
| §16 Design system — `TC-DS-*` | **Not re-executed as a suite.** `TC-AR-019`, `TC-AR-022` and `TC-AR-036` re-measured the mark forms and the field treatment on both materials and matched; a full re-run is still owed |
| §17 Member surfaces — `TC-MS-*` | **Not re-executed as a suite.** `TC-MS-017`'s database assertion was re-run as `TC-AR-014` on a fixture this ticket owned, and `TC-MS-021`'s Hollow producer was re-observed on the member board in `TC-AR-013` |

**Not met.**

- **`TC-AR-011`'s id-level assertion.** The register renders no row-identity
  attribute, so "no id appears twice within one load" cannot be read from the
  page. Row count, order and standing were all checked; the id assertion rests on
  #87's query-level verification. Worth an attribute on the row.
- **`TC-AR-023`'s weight ratio.** Re-measured as a mechanism and as an absolute
  (444 B for a 40-row queue, `w=48`), but not as a ratio: the seed's only
  storage-hosted Proof is a 144-byte placeholder. Wave 2's figure stands.
- **`TC-AR-004` step 3.** A capacity floor lowered by a lapsed hold was not
  re-run; #69 and #94 hold it.
- **SonarLint has still been consulted on no ticket in this spec.**
  `mcp__ide__getDiagnostics` is not resolvable in this environment, for this
  executor either. `tsc --noEmit` through `next build`, plus ESLint at zero
  warnings, stood in — as they did in every earlier wave. This remains the one
  acceptance criterion of the map that no wave has satisfied.
- **Two case texts were corrected during the run, not softened.** `TC-AR-021`
  now asks for the sentence to be **absent** under an explicit standing filter,
  because suppressing it there is right and the original precondition was wrong.
  `TC-AR-011` now states the one-load standing skew the two-read page design
  permits. `TC-AR-006` lost two bullets pasted from `TC-MS-020` about a bottom
  rail this shell does not render. Each is noted in place.

#### Addendum — 2026-08-29, after the follow-up map (#105)

The three defects the run filed — [#101](https://github.com/jefrykurniaone/net-c-management/issues/101),
[#102](https://github.com/jefrykurniaone/net-c-management/issues/102) and
[#103](https://github.com/jefrykurniaone/net-c-management/issues/103) — merged
into `main` as `17c65af`, `532f0f6` and `e1005bd` (PRs #118, #119, #120). The two
failing cases were re-run against `main` at **`e1005bd`**, as
`admin@xclub.local`, at **1440 × 900** and **390 × 844**, in **both locales**,
through Playwright against the dev server; the `TC-AR-036` sweep was extended to
the two Session forms and the dashboard, which the original sweep did not cover.
The seed was left as found: the one fixture (a seeded member's name set to null
to prove the two Members conditions independent) was restored and re-read.

| Case | Priority | Result |
|---|---|---|
| TC-AR-031 | P1 | **Pass** — `?search=zzzznonexistent` on `/admin/payments`, `/admin/members` and `/admin/activities` draws the register's own empty row with the Blank **EMPTY** mark and now says **"No payments match your search."**, **"No members match your search."**, **"No activities match your search."** (`id`: "Tidak ada pembayaran / anggota / aktivitas yang cocok dengan pencarian."); the "found" / "yet" sentence is absent on each. A status-plus-month filter on Payments and an Activity filter on Members also say "match". Sort and page-size parameters alone (`?sort=amount&dir=asc&pageSize=10`, `?sort=name&dir=desc`) render the rows and neither sentence. `/admin/sessions` unchanged; `/admin/applicants` keeps its single sentence, having no filter |
| TC-AR-028 | P1 | **Pass** — the incomplete-profile clause now holds. `newbie@xclub.local` carries **"Profile Incomplete" / "Profil Belum Lengkap"** beneath the name link as a tracked-caps label (`11px`, `letter-spacing 1.1px`, `uppercase`, weight 700, `rgb(84,97,91)`), with **zero** `[data-mark]` in the cell — a label, not one of the six marks; it is the only row of 30 that carries it. At 390 the label's box lies inside the row, `<thead>` is `display: none`, `scrollWidth === 390`. **Independence proved on a fixture:** with `member6@xclub.local`'s name set to null and `isProfileComplete` true, that row read **"(Not set)"** and **no** label while the `newbie` row read its name **and** the label; restored afterwards. Everything else in the case stands as recorded above |
| TC-AR-036 (extended) | P0 | **Pass on the surfaces this map named** — `/admin`, `/admin/sessions/new` and `/admin/sessions/{id}/edit` at both widths: every named shell measures `border-radius 2px`, `1px solid rgb(119,131,127)`, `rgb(247,249,248)`, and `padding 16px` on the panels that hold content directly (the three dashboard frames carry none, because their rows pad themselves); `scrollWidth` 390 and 1440; `blue-*` **0** on every one. The Post-a-Session locking notice is two `<p>` at `15px` in `rgb(84,97,91)` with no icon and no colour, each tied by `aria-describedby` to its control (the Activity `combobox` trigger, `input[name=fee]`) and sitting directly beneath it; Tab from the back link lands on the trigger with `:focus-visible`, a Court Green border and a 2px offset ring. The edit form's `session-capacity-note` and `session-fee-note` are unchanged. Source sweep of `src/app/(admin)/` for `rounded-(xl\|lg\|2xl)` and a Tailwind hue on a container: **0** on containers and notices; the one hit is `text-green-600` on a dashboard sub-line inside a shell, listed on #103. **Two shells outside the sweep's path still render the old idiom on admin surfaces:** the stat strip's container (`src/components/ui/stat-card.tsx:71`, excluded by the map) and the share-Session card the edit form composes (`src/components/sessions/share-session-card.tsx:48`), filed as [#121](https://github.com/jefrykurniaone/net-c-management/issues/121). Both render at `2px` today because the token layer remaps `--radius-xl` |

**Summary after the addendum.** 36 cases, **36 Pass, 0 Fail, 0 Not run.**
Every P0 and P1 case passes. The "Not met" list above is unchanged by this
addendum except that `TC-AR-036`'s sweep now covers the forms and the dashboard;
SonarLint has still been consulted on no ticket.

---

## 19. Dues Rate (`TC-DR-*`)

Spec #107 turned the Dues an Activity charges into a **history against Billing
Periods**. One rate row per (Activity, effective-from Period), the rate of a
Period being the row with the greatest effective-from that is not after it, and
a Period that has arrived keeping its rate for ever. The live `monthlyFee`
column is gone.

This area tests **what a member is charged and what an Admin is allowed to
change**, which are the two things a price that used to be one mutable number
can now get wrong. "The resolver returns the newer row" is not a case here —
Vitest owns that. "A Proof uploaded today for January records January's figure"
is, and it is read from the `Payment` row rather than from the screen.

Money is the whole subject, so every P0 in this area is asserted **from the
database**: the amount a `Payment` row stored, the rows a migration wrote, the
rows a refused write left alone. A surface agreeing with the database is a
separate, weaker claim, and it is made separately.

### 19.0 Conventions and shared preconditions

This area inherits **§16.0 and §18.0 in full** — the same id / priority / type /
preconditions / numbered steps / expected-result shape, the same P0-P1-P2
meanings, the same two board materials, the same locale and viewport switches —
and restates only what differs.

**Surfaces and seams in scope.** `/admin/activities` (the register and the
create and edit dialogs), `PATCH /api/activities/{id}`,
`DELETE /api/activities/{id}/dues-rate`, `POST /api/activities`, the monthly arm
of `POST /api/payments/upload`, `/payments/upload`, the Confirm dialog on
`/admin/payments`, `/admin`'s total-due tile, the `/dashboard` dues banner, and
the three dues-change email templates.

**Out of scope**, deliberately: per-Session Fees (a Session has always carried
its own frozen Fee), payment-mode resolution and graduation, Billing Period
keys, Confirm / Reject behaviour, and the payments page — this spec changed
nothing on it, and §13 owns it.

**Shared preconditions for every case in this area**, on top of §18.0's:

1. §1 prerequisites done, `npm run dev` running on `http://localhost:3000`, and
   the §2 seed loaded.
2. The accounts are §3's: `admin@xclub.local` (**Admin Satu**) unless a case says
   otherwise, `admin2@xclub.local` where two Admins have to write at once,
   `owner@xclub.local` where the Owner's own attempt is the point, and
   `member@xclub.local` (**Adi Pratama**) / `member2@xclub.local` where a member
   has to be charged or told something. `member2@xclub.local` is Monthly on
   Badminton since `202607`, so one member covers a past, the current and a
   queued Period. Tennis carries five Monthly seed members and is the
   banner-and-email fixture Activity.
3. **The refusal shape**, which differs from §18.0 item 6 in exactly one way: the
   stable code travels in **`code`**, not `reason`. Every Dues Rate refusal is
   `{ "error": "<the sentence in the caller's locale>", "code": "<the code>" }`
   with `DUES_RATE_PERIOD_ARRIVED` and `DUES_RATE_NOTHING_QUEUED` at **409** and
   `DUES_RATE_PERIOD_OUT_OF_RANGE` at **400** (`src/lib/dues-rate-writes.ts`).
   A case fails on a 200, on a different status, or on a body missing either
   field.
4. **The clock cannot be moved on the running app.** No case asks for one to be.
   Where a rule turns on *when* it is asked, the case picks Periods around the
   real boundary instead and says which: on the run day the current Period is
   **August 2026** (`202608`), the next — and the earliest a change may start
   from — is **September 2026** (`202609`), the horizon ends at **August 2027**
   (`202708`), and `202709` is the first Period out of range. Where only an
   injected `now` can prove a claim (a queued change disappearing the instant its
   Period arrives), the case **cites the Vitest test that injects one** and says
   so in its expected result rather than pretending the browser proved it.
5. **The pure rules are Vitest's and are not duplicated here.**
   `src/lib/__tests__/dues-rate.test.ts` (resolution and the beginning-of-time
   row), `dues-rate-queue.test.ts` (the twelve-Period window, the freeze, the
   no-op save, the field view) and `dues-notice.test.ts` (who hears about a
   change, and which email a write owes) are cited by id where a case rests on
   one. A `TC-DR-*` case asserts something a member or an Admin can observe.
6. **The upload form is locked to the current Period** — `/payments/upload`
   renders the Period as a read-only field carrying `t.payments.periodLocked`,
   and has no month picker. Only `POST /api/payments/upload` accepts another
   month (any month from 2020 to one year ahead), as `multipart/form-data` with
   `activityId`, `month`, `year` and `file`. So every case that pays a Period
   other than the current one goes **through the route**, and no case has a step
   that picks a month on the form. The amount is server-authoritative in both
   paths: the client never sends one, and a client that sends one is ignored.
7. **Email cannot be delivered in dev** (`.env.local` carries no `GMAIL_USER` /
   `GMAIL_APP_PASSWORD`). The audience is proven by restarting the dev server
   with **dummy** credentials so every send fails at SMTP authentication and is
   logged **once per recipient**, and the expected result is stated as the count
   and the identity of those attempts. Recipient locale is `DEFAULT_LOCALE`
   (`en`) for every recipient — there is no per-user locale column, and the
   Admin's cookie is the Admin's language, not the member's
   (`src/lib/dues-change-mail.ts`). **So the spec's "in both locales" criterion
   resolves, for email, to the template layout being bilingual — both languages
   in one message — and not to a per-recipient locale.** Every on-screen string
   is still read in both locales, by `TC-DR-018`.
8. **Known pre-existing defect, not re-found here:**
   [#128](https://github.com/jefrykurniaone/net-c-management/issues/128) — the seeded bank
   account numbers carry spaces (`1234 567 890`) and the Activity edit dialog's
   digit-only rule refuses them, so the dialog cannot be **saved** on seeded data
   until the field is set to digits. Every case that saves the edit dialog names
   that in its preconditions: set the Bank Account Number to digits first, and
   restore the seeded value by SQL afterwards. A case fails on the Dues Rate
   rule, never on #128.
9. **No case invents a fixture it does not also remove.** A queued rate row is
   withdrawn through `DELETE /api/activities/{id}/dues-rate` **before its Period
   arrives** — once it arrives nothing can delete it, which is the rule under
   test. A monthly upload writes a `Payment` row, a storage object in
   `payment-proofs`, and `REGISTERED` Attendance rows through
   `syncMonthlyAttendances`: the recorded run names the probe that added each and
   the probe that took it away, and re-compares the counts afterwards.
10. **Vocabulary**, from `CONTEXT.md`: **Dues Rate** is Admin-facing — the amount
    an Activity charges for Dues in one Billing Period. **Dues** is what a member
    is told, always with a figure and a month. Billing Period, Payment, Proof and
    Participant keep their meanings, and no metaphor word appears in user-facing
    copy. Case text quotes user-facing copy verbatim.

### 19.1 What a Period charges

### TC-DR-001 · P0 · Positive — A Proof for the current Period records the current Period's rate

**Preconditions:** `member2@xclub.local`, Monthly on Badminton since `202607`.
Badminton's rate rows read from the database first, and its current-Period rate
noted. No Badminton `MONTHLY` Payment for `202608` belonging to that member, or
its `amount` and `status` recorded so it can be put back.

**Steps:**
1. Read `SELECT "amount", "effectiveFrom" FROM "DuesRate" WHERE "activityId" =
   '<Badminton>'` and resolve the August 2026 rate by hand from the rows.
2. As the member, open `/payments/upload`, choose Badminton, and read the Period
   field and the Amount field.
3. Attach an image and Submit.
4. Read the `Payment` row for (member, Badminton, `month = 8`, `year = 2026`,
   `type = 'MONTHLY'`) from the database.
5. Remove the fixture: the `Payment` row, its storage object, and the
   `REGISTERED` Attendance rows the upload synced.

**Expected result:**

- The Period field is **read-only** and reads August 2026, with
  `t.payments.periodLocked` beneath it; the Amount field is read-only and reads
  the resolved August rate as **`Rp 75.000`** (`Rp ` + `toLocaleString('id-ID')`).
- The submit is **201**, and the stored `Payment.amount` **equals the resolved
  August rate exactly** — not the queued figure, not a figure the client sent.
- `status` is `PENDING` and the row's `month`/`year` are `8`/`2026`.
- The amount is server-authoritative: a request carrying `amount` in the form
  data stores the resolved rate regardless.

### TC-DR-002 · P0 · Positive — A Proof for a Period with a queued rate records that Period's rate

**Preconditions:** a rate change queued on Badminton from **September 2026**
(`202609`) at an amount that differs from August's — queued through
`PATCH /api/activities/{Badminton}` with
`{ "duesRate": { "amount": 90000, "effectiveFrom": 202609 } }` as an admin.
`member2@xclub.local` Monthly on Badminton. No `202609` Badminton Payment for
that member.

**Steps:**
1. Confirm the queued row exists and that August's resolved rate is unchanged.
2. As the member, `POST /api/payments/upload` as `multipart/form-data` with
   `activityId = <Badminton>`, `month = 9`, `year = 2026` and an image file.
3. Read the created `Payment` row.
4. Repeat step 2 for `month = 8`, `year = 2026` and read that row too.
5. Withdraw the queued change and remove both Payments, their storage objects
   and the Attendance rows they synced.

**Expected result:**

- Step 2 is **201** and the September `Payment.amount` is **90 000** — the rate
  the queued row gives September, charged before September has arrived. Pre-paying
  a future month is charged at what that month will cost, never at today's figure.
- Step 4's August `Payment.amount` is the **August** rate (75 000), from the same
  request path on the same day: two Periods, two prices, one Activity.
- Neither upload writes, moves or reads a live field; the queued row is untouched
  by both.

### TC-DR-003 · P0 · Positive — A Proof for a past Period records that Period's rate, not today's

**Preconditions:** Badminton carrying a beginning-of-time rate and **no** later
arrived row (the seed state), so every past Period resolves to the founding
figure. `member2@xclub.local` Monthly on Badminton since `202607`. No `202607`
Badminton Payment for that member.

**Steps:**
1. Read Badminton's rate rows and resolve July 2026 by hand.
2. As the member, `POST /api/payments/upload` with `month = 7`, `year = 2026` and
   an image.
3. Read the created `Payment` row.
4. Read the same member's existing seeded Payments for earlier Periods and
   compare their `amount` fields against the resolver's answer for their own
   Periods.
5. Remove the fixture as in `TC-DR-001`.

**Expected result:**

- **201**, and `Payment.amount` equals the **July 2026** rate — the figure that
  Period charged. Catching up on arrears is never repriced at today's figure,
  which is user story 2 and the reason the beginning-of-time row exists.
- Step 4: every seeded Payment's amount still agrees with its own Period's rate.
  The migration repriced nothing (`TC-DR-007` proves that from the totals).
- Where an Activity's Period resolves to no row at all the route answers **400**
  `t.payments.noMonthlyFee` and writes nothing — never a `Payment` of 0.

### 19.2 The freeze and the queue

### TC-DR-004 · P0 · Negative — A rate cannot be started from the current Period or any before it, as Admin or as Owner

**Preconditions:** Badminton, with its rate rows recorded in full (`amount`,
`effectiveFrom`, `setById`, `setAt`). An admin and the Owner signed in.

**Steps:**
1. As the admin, `PATCH /api/activities/{Badminton}` with
   `{ "duesRate": { "amount": 99000, "effectiveFrom": 202608 } }` — the current
   Period.
2. Repeat with `"effectiveFrom": 202607`, and again with `"effectiveFrom": 0`
   (the beginning-of-time key).
3. Re-read every Badminton rate row and compare field by field.
4. Repeat steps 1–3 signed in as `owner@xclub.local`.
5. Repeat step 1 with a second field in the same body
   (`{ "name": "…", "duesRate": { … } }`) and re-read the Activity's `name`.

**Expected result:**

- Every attempt in steps 1, 2 and 4 is **409** with
  `code: "DUES_RATE_PERIOD_ARRIVED"` and the sentence *"That month has already
  arrived, so what it charges is settled and cannot be changed. Pick a later
  month for the new rate."* (`id`: *"Bulan itu sudah berjalan, jadi nominalnya
  sudah final dan tidak bisa diubah. Pilih bulan setelahnya untuk tarif baru."*).
  An out-of-range answer here would be the wrong lesson and fails the case: the
  arrived test runs first deliberately.
- Every rate row is **unchanged**, `setById` and `setAt` included. No row is
  added.
- The **Owner is refused exactly as the Admin is**: immutability is a property of
  the Period, not of who is asking.
- Step 5: the Activity's `name` is **unchanged** too. A refused rate leaves no
  half-renamed Activity behind — the refusal sits before the update, inside the
  same transaction.

### TC-DR-005 · P0 · Negative — A rate cannot be started beyond twelve Periods ahead, or from a key that is not a month

**Preconditions:** Badminton, rate rows recorded. Current Period August 2026, so
the allowed window is `202609` … `202708`.

**Steps:**
1. `PATCH` with `{ "duesRate": { "amount": 99000, "effectiveFrom": 202709 } }` —
   thirteen ahead.
2. `PATCH` with `"effectiveFrom": 202613` — a key inside the numeric interval
   that encodes no calendar month.
3. `PATCH` with `"effectiveFrom": 202708` — the last allowed Period.
4. `PATCH` with `"effectiveFrom": 202609` — the first allowed Period.
5. Re-read the rate rows after each, and open the edit dialog's **Starts from**
   picker and count its options.
6. Withdraw whatever steps 3 and 4 queued.

**Expected result:**

- Steps 1 and 2 are **400** with `code: "DUES_RATE_PERIOD_OUT_OF_RANGE"` and the
  sentence *"A new rate starts from next month at the earliest and twelve months
  ahead at the latest. Pick a month in that range."* (`id`: *"Tarif baru paling
  cepat mulai bulan depan dan paling lambat dua belas bulan ke depan. Pilih bulan
  dalam rentang itu."*), and **nothing is written**.
- `202613` is refused for the same reason and never stored. Stored, it would
  arrive one day, become the rate from January 2027 onward, and be frozen there
  by the very rule that protects a settled Period — which is why the route tests
  membership of the picker's list rather than a numeric interval
  (`dues-rate-queue.test.ts`, *"accepts exactly the keys the picker offers, and
  nothing between them"*).
- Steps 3 and 4 are **200** and each leaves **exactly one** queued row.
- The picker offers **twelve** options, the first September 2026 and the last
  August 2027 — the control and the rule read one list.

### TC-DR-006 · P0 · Negative — An arrived rate cannot be deleted, as Admin or as Owner

**Preconditions:** Badminton with its beginning-of-time row (`effectiveFrom = 0`)
and nothing queued. An admin and the Owner signed in.

**Steps:**
1. As the admin, `DELETE /api/activities/{Badminton}/dues-rate?effectiveFrom=0`.
2. `DELETE …?effectiveFrom=202608` (the current Period) and
   `…?effectiveFrom=202607`.
3. `DELETE …?effectiveFrom=202609` while nothing is queued.
4. `DELETE …?effectiveFrom=202610xyz` and `DELETE` with no `effectiveFrom` at
   all.
5. Re-read every rate row.
6. Repeat steps 1–3 and 5 signed in as `owner@xclub.local`.
7. Open the edit dialog and read whether any control offers to delete the current
   rate.

**Expected result:**

- Steps 1 and 2 are **409** `code: "DUES_RATE_PERIOD_ARRIVED"` with the arrived
  sentence — the founding rate included. The beginning-of-time row is the one an
  Activity's whole history rests on, and it is refused by the same rule rather
  than by a special case.
- Step 3 is **409** `code: "DUES_RATE_NOTHING_QUEUED"` with *"There is no queued
  dues change to withdraw. Reload the page to see what this activity charges
  now."*
- Step 4 is **400** both times: a whole run of digits or nothing, so `202610xyz`
  is refused rather than read as `202610`.
- Every rate row is **byte-identical** afterwards, for the Admin and for the
  Owner alike.
- Step 7: **Withdraw** is drawn only while something is queued, and it names the
  queued Period. There is no control anywhere that offers to delete the rate an
  arrived Period is on.

### TC-DR-007 · P0 · Positive — The migration seeded one rate per Activity and repriced no Payment

**Preconditions:** the shared dev database `netc`, and the two migrations
`20260829163748_add_dues_rate` and `20260830100000_drop_activity_monthly_fee`
applied. The pre-migration figures, from the map's wave-1 baseline: `monthlyFee`
Badminton `cmr4c8pal0004b4dfzbntbi5d` **75 000**, Basket
`cmt0gxmfn0007fkdf294sd66k` **60 000**, Futsal `cmr4c8par0005b4df6vdpl5m8`
**40 000**, Tennis `cmt0gxmfq0008fkdf1e473kc5` **55 000**; `Payment` rows **44**,
`sum(amount)` **2 360 000**.

**Steps:**
1. `SELECT "activityId", "amount", "effectiveFrom", "setById" FROM "DuesRate"
   ORDER BY "activityId", "effectiveFrom"`.
2. `SELECT count(*), sum("amount") FROM "Payment"`.
3. `SELECT column_name FROM information_schema.columns WHERE table_name =
   'Activity'`.
4. `git grep -n monthlyFee -- src prisma/schema.prisma prisma/seed*` and read
   `npm run build` for the same token. `prisma/migrations/` is excluded on
   purpose: the drop migration has to name the column it drops.
5. `npx prisma migrate diff --from-config-datasource … --to-schema
   prisma/schema.prisma --exit-code` against the dev database, and re-run the
   seed on a scratch database.

**Expected result:**

- **One row per Activity at `effectiveFrom = 0`**, its `amount` equal to that
  Activity's `monthlyFee` at migration time — 75 000 / 60 000 / 40 000 / 55 000
  against the four ids above — and `setById` null for the seeded rows, because
  nobody set them.
- `Payment` is **44 rows summing 2 360 000**, unchanged. The migration priced
  nothing again: a Payment records what it recorded.
- **No `monthlyFee` column** on `Activity`, and no reference to the token in
  `src/`, in `prisma/schema.prisma` or in either seeder — the contract step is
  complete, not merely unread.
- `migrate diff` reports **No difference detected**, and the seed runs clean on a
  scratch database: an Activity created by the seeder carries its own
  beginning-of-time row.

### TC-DR-008 · P1 · Positive — A queued change is replaced by saving again, and the disclosure follows it

**Preconditions:** Tennis, nothing queued, its current rate noted. An admin. The
Bank Account Number set to digits first, per 19.0 item 8 (#128), and restored
afterwards.

**Steps:**
1. Open `/admin/activities`, open Tennis's edit dialog, and read the sentence
   beneath the Dues field.
2. Set the Dues amount to a figure above the current rate, pick **September
   2026** in **Starts from**, and Save. Re-open the dialog and read the sentence.
3. Save again with a different amount and the **same** month. Re-open and read.
4. Save again with a different amount and **October 2026**. Re-open and read.
5. `SELECT "amount", "effectiveFrom", "setById", "setAt" FROM "DuesRate" WHERE
   "activityId" = '<Tennis>'` after each save.
6. Save once more repeating step 4's amount and month exactly, and re-read the
   rows.
7. Withdraw the queued change.

**Expected result:**

- Step 1's sentence is *"This activity charges Rp 55.000 a month. A new rate
  applies from the month you pick, never from a month that has already
  arrived."*, at Body size in Secondary Ink, tied to the amount box and to the
  picker by `aria-describedby` on `dues-rate-note-{activityId}`.
- After each of steps 2–4 the sentence is the queued form — *"This activity
  charges {amount} a month, changing to {queued} from {month}."* — naming the
  figure just saved and its month, and a **Withdraw** tile stands beside it.
- **Exactly one queued row exists after every save**, at the month last chosen.
  Replacing at a different month leaves no row behind at the old one: correcting
  a decision is one save, not a delete and a re-add.
- Step 6 writes nothing: the row's `setAt` and `setById` are **unmoved**, because
  the same save arriving twice must not falsify who raised the Dues and when
  (`dues-rate-queue.test.ts`, *"isDuesRateSaveUnchanged"*).
- The current rate is never the thing edited: the resolved current-Period rate is
  the same before and after every save in this case.

### TC-DR-009 · P1 · Positive — A queued change is withdrawn, from the tile and from the route

**Preconditions:** a change queued on Tennis from September 2026. An admin.

**Steps:**
1. Open the edit dialog, read the sentence and press **Withdraw**.
2. Read the toast, and re-read the sentence without reloading the page.
3. Re-read the rate rows.
4. Queue the change again and withdraw it with
   `DELETE /api/activities/{Tennis}/dues-rate?effectiveFrom=202609`.
5. Press Withdraw a second time with nothing queued.

**Expected result:**

- The tile is a `type='button'` **Blank action** inside the form: pressing it
  withdraws the rate and **saves no other field** of the half-edited dialog.
- The toast reads *"Queued dues change withdrawn."* / *"Perubahan iuran yang
  antre ditarik kembali."*, the sentence returns to the current-rate form, and
  the Withdraw tile disappears — all through the `aria-live="polite"` region, so
  the change is announced where it happened.
- The queued row is **gone** and every arrived row is untouched.
- Step 4 is **200** `{ "success": true }`.
- Step 5 is **409** `DUES_RATE_NOTHING_QUEUED`, and the message is surfaced as
  the route's own sentence rather than a generic failure.

### TC-DR-010 · P1 · Edge — Saving the amount the current Period charges withdraws a queued change and writes no row

**Preconditions:** Tennis charging 55 000 now, with a change to 70 000 queued
from September 2026. An admin.

**Steps:**
1. Save the dialog with the Dues amount set back to **55 000** and **September
   2026** in the picker.
2. Read the rate rows.
3. Repeat with **October 2026** picked instead — a month that is not the queued
   one.
4. Read the rows again, and the disclosure.

**Expected result:**

- Both saves are **200**, and afterwards **no queued row exists at all**: an
  Admin who types what the Activity charges now means "charge what we charge
  now", whichever month the picker happens to be showing. Before #127 the
  October save left the September row in place; this is that regression's net.
- **No row is written at the picked month** — the request's own row is deleted
  along with any other queued one.
- Every arrived row is untouched, and the disclosure is back to the current-rate
  sentence with no Withdraw tile.
- The email that follows is the **withdrawn** one, and only if something had been
  queued (`TC-DR-016`).

### TC-DR-011 · P1 · Positive — A new Activity has a rate from creation

**Preconditions:** an admin. No Activity on the slug the case uses.

**Steps:**
1. `POST /api/activities` with a valid body carrying `duesAmount: 50000` and no
   other money field.
2. Read the created Activity's `DuesRate` rows.
3. `POST` a second Activity with a stray `monthlyFee: 50000` **and** a
   `duesAmount`, and read the response body and the rows.
4. Open `/admin/activities` and read the new rows' Dues cells; open the create
   dialog and look for a **Starts from** picker.
5. `DELETE /api/activities/{id}` for both.

**Expected result:**

- **201**, and exactly one `DuesRate` row for the new Activity, at
  `effectiveFrom = 0`, `amount = 50000`, `setById` naming the creating Admin —
  the Activity and its founding rate are one transaction, so no Activity ever
  exists for an instant with no rate.
- Step 3: the stray `monthlyFee` is **stripped**, never stored, and appears in no
  response body; the created row still carries `duesAmount`'s figure. There is no
  column left for it to land on.
- The register prints the new Activity's current rate immediately, with no
  special case for "never had a change".
- The **create** dialog offers a single amount box and **no** month picker: there
  is no month to choose for a founding rate.

### TC-DR-012 · P1 · Edge — Two Admins saving at once leave exactly one queued row

**Preconditions:** Tennis with nothing queued. Two admin sessions,
`admin@xclub.local` and `admin2@xclub.local`. Where the two presses cannot be
made to overlap by hand, issue them as two `fetch` calls without awaiting the
first.

**Steps:**
1. Issue `PATCH /api/activities/{Tennis}` from both sessions in the same moment,
   one with `{ "amount": 80000, "effectiveFrom": 202609 }` and the other with
   `{ "amount": 65000, "effectiveFrom": 202610 }`.
2. Read every `DuesRate` row for Tennis.
3. Read the disclosure in a freshly opened dialog.
4. Repeat several times, alternating which request is issued first, and withdraw
   whatever is queued between runs.

**Expected result:**

- **Exactly one queued row after every run**, carrying whichever save committed
  second. Two future rows — one of them nameable by no disclosure and reachable
  by no Withdraw — is the failure this case exists to catch, and the Activity's
  own `SELECT … FOR UPDATE` is what prevents it.
- Both requests answer **200**: neither is refused, because both are legal; the
  second simply replaces.
- The disclosure names the surviving row, and Withdraw removes it in one press.
- No arrived row moves in any run.

### 19.3 The surfaces that read a rate

### TC-DR-013 · P1 · Positive — The shortfall note judges a Payment by its own Period

**Preconditions:** two `PENDING` `MONTHLY` Payments belonging to the same member
on the same Activity: one for a **past** Period whose amount equals that Period's
rate, and one for the **current** Period whose amount is below the current rate.
An arrived rate change between the two Periods where the seed has none — added by
SQL as a rate row at an arrived Period, and removed by SQL afterwards, since the
route refuses to write one.

**Steps:**
1. On `/admin/payments`, press **Confirm** on the past-Period Payment and read
   the dialog.
2. Press **Confirm** on the current-Period Payment and read the dialog, and read
   the `aria-describedby` on its Confirm button.
3. Confirm the second one and re-read the Payment.
4. Restore both Payments and remove the SQL-added rate row.

**Expected result:**

- Step 1 draws **no shortfall note**: the Payment paid exactly what its own month
  charged, and a note there would be the old defect — today's figure judging a
  settled month.
- Step 2 draws the note, and the figure in it is the rate of the **Payment's own
  Billing Period**, never today's. The sentence stays at Body size in Secondary
  Ink with the Confirm button pointing at it through `aria-describedby`, exactly
  as `TC-AR-024` asserts.
- The wording is the dictionary's own at run time and is quoted verbatim into the
  recorded run: `t.admin.confirmBelowDues` said "the current Dues" while
  [#129](https://github.com/jefrykurniaone/net-c-management/issues/129) stood,
  and the copy fix names the Payment's Period instead. The case
  passes on the **figure and the Period it came from**; the sentence is recorded
  as read.
- Step 3 is **200** and `status` is `CONFIRMED`: it warns, it never blocks.
- A per-Session Payment is still judged by its Session's own Fee
  (`t.admin.confirmBelowFee`), unchanged by this spec.

### TC-DR-014 · P1 · Positive — The dashboard's total due is this Period's rate, and a queued rise does not inflate it

**Preconditions:** `/admin` as an admin. The current Period's total due read and
noted, together with each active Activity's monthly-Membership headcount and its
resolved current rate.

**Steps:**
1. Read the total-due tile and compute the expected figure by hand:
   `Σ headcount × resolveDuesRate(rows, August 2026)`.
2. Queue a **rise** on Tennis from September 2026 and reload `/admin`.
3. Read the tile again.
4. Withdraw the queued change, reload, and read it once more.
5. Read `dues-rate.test.ts` and `dues-rate-queue.test.ts` for the rollover claim.

**Expected result:**

- The tile equals the hand-computed figure to the rupiah, from the rate rows
  rather than from any live field.
- After step 2 the tile is **unchanged**. A rate queued for next month is not
  this month's rate, and the total moves on the first day of the new Period and
  not a day before — because `currentPeriod(now)` moves and nothing is written.
- Step 4 returns the same figure again.
- **The rollover itself is asserted by Period choice, not by a moved clock**: no
  clock is injectable on the running app. The claim that the figure changes the
  instant the Period arrives rests on the resolver's own tests, which pass `now`,
  and on this case showing that the *only* input that decides the figure is the
  Period passed in.
- An Activity no rate row covers contributes **nothing** and logs
  `[admin dashboard] no Dues Rate covers …` — a short total reads as short
  against `collected`, where an invented figure would read as correct.

### TC-DR-015 · P1 · Positive — The dashboard banner tells only the members a change will bill

**Preconditions:** Tennis, with a change queued from **September 2026**. From
wave 3's fixture shape: one Tennis member flipped to **per-Session** by SQL
(`wulan.sari`), one given a **pending switch to Monthly** effective `202609`
(`nadia.putri`), and the rest Monthly. Every SQL fixture restored afterwards.

**Steps:**
1. Sign in as a Monthly Tennis member and read `/dashboard`.
2. Sign in as the per-Session member and read `/dashboard`.
3. Sign in as the member whose switch to Monthly lands in September and read
   `/dashboard`.
4. Sign in as a member who is on Tennis but whose Membership has **no** mode
   chosen, and read `/dashboard`.
5. Read the sentence in both locales, and read it for a member who has already
   paid this month.
6. Withdraw the change and re-read each dashboard.

**Expected result:**

- Step 1: the banner carries one sentence for Tennis — *"Tennis Dues change to
  Rp 70.000 from September 2026"* (`id`: *"Iuran Tennis berubah menjadi
  Rp 70.000 mulai September 2026"*) — in words, with no colour or icon carrying
  the fact, no **Pay now** pill and no link: there is nothing to pay yet.
- Step 2: **nothing**. A member paying per Session is never told about a price
  they do not pay.
- Step 3: the sentence **is** shown. The audience is resolved for the Period the
  change starts from, not for today, so a switch that lands by then counts
  (`dues-notice.test.ts`, *"tells a member whose pending switch to Monthly lands
  by that Period"*).
- Step 4: **nothing**. A member with both modes offered and none chosen has not
  been put on Dues, and a Dues figure would be the first they heard of owing any.
- Step 5: the banner renders **even for a member who owes nothing this month** —
  that member is exactly the one who needs to hear it — and one sentence per
  affected Activity, ordered by Activity name.
- Step 6: every sentence is gone with no write anywhere.
- **"Gone once the Period arrives" is proven by Vitest**, not by the browser:
  `dues-notice.test.ts`, *"drops the sentence once the Period arrives, with no
  write anywhere"*, passes a `now` inside the queued month. No clock can be moved
  on the running app, and the run records that this clause is cited rather than
  re-executed.

### TC-DR-016 · P1 · Positive — Each of the three triggers emails exactly the audience, and an unconfigured app sends nothing

**Preconditions:** two dev-server states. **(a)** as shipped, with no
`GMAIL_USER` / `GMAIL_APP_PASSWORD`. **(b)** restarted with **dummy** values for
both, so every send fails at SMTP authentication and is logged once per
recipient. Tennis as the fixture Activity, with its Monthly headcount, its
per-Session member and its pending-switch member known from `TC-DR-015`.

**Steps:**
1. In state (a), queue a change on Tennis and read the response and the server
   log.
2. Restart in state (b). Queue a change on Tennis; count and identify the send
   attempts in the log, and note when they happen relative to the response.
3. Replace the queued change and read the log again.
4. Withdraw it and read the log again.
5. Save the dialog again changing nothing about Dues, and read the log.
6. Read one template's rendered HTML.

**Expected result:**

- Step 1 is **200** and **nothing is sent and nothing is logged**: the send is
  guarded by `isEmailConfigured()` before any audience is read.
- Step 2: **one attempted send per member of the resolved audience** — every
  member billed Monthly for the effective Period, including the pending-switch
  member — and **none to the per-Session member**, none to a member with no mode
  chosen, none to an inactive or unadmitted member, and none to a member with no
  address. Every attempt happens **after** the response, through `after()`; the
  Admin's save is not slowed by the audience query.
- Step 3 sends the **replaced** template alone — never a withdrawal followed by a
  queue. Step 4 sends the **withdrawn** one, naming the figure that **stays**
  (what the current Period charges), never the figure that will now never apply.
- Step 5 sends **nothing**: a save that queued nothing owes no email.
- Every failure is logged as `[dues-rate] change email to <address> failed:` and
  **none is thrown**: the route's answer is unaffected.
- The message is the shared **bilingual layout** — both languages in one email —
  and every recipient gets `DEFAULT_LOCALE` (`en`), there being no per-user
  locale. That is what this spec's "both locales" resolves to for email, and it
  is recorded as such rather than as a per-recipient result.

### TC-DR-017 · P1 · Negative — A member cannot set or withdraw a rate

**Preconditions:** `member@xclub.local`, and Badminton's rate rows recorded.

**Steps:**
1. As the member, `PATCH /api/activities/{Badminton}` with
   `{ "duesRate": { "amount": 1000, "effectiveFrom": 202609 } }`.
2. As the member, `DELETE /api/activities/{Badminton}/dues-rate?effectiveFrom=202609`.
3. As the member, `POST /api/activities` with a valid body.
4. Re-read every rate row.
5. Repeat step 1 signed out.

**Expected result:**

- Steps 1–3 are **403** `{ "error": "Forbidden" }`. The role check runs before
  the body is parsed, so a member never reaches the rate rules at all.
- Step 5 is the admission refusal, not a 403 leak.
- **No rate row is written, changed or deleted** by any of them, and no email is
  queued.

### 19.4 Both locales, the keyboard, and the register

### TC-DR-018 · P1 · Positive — No English leaks into the Indonesian build on any Dues Rate surface

**Preconditions:** `NEXT_LOCALE` set to `id`; a change queued on Tennis so every
queued-state string renders.

**Steps:**
1. In `id`, read the Activity edit dialog: the Dues label, the **Starts from**
   label, every option in the picker, the disclosure sentence, and the Withdraw
   tile.
2. Trigger each of the three refusals through the route with an `id` cookie and
   read the `error` sentences.
3. Read the `/dashboard` banner sentence, the Activities register's Dues column
   head and its "no rate" cell, and the Confirm dialog's shortfall sentence.
4. Compare each string against the `en` build and list every one that matches.
5. Read the withdraw toast in `id`.

**Expected result:**

- Every string switches: *Mulai dari*, *Tarik kembali*, *Perubahan iuran yang
  antre ditarik kembali.*, *Belum ada tarif*, the three refusal sentences quoted
  in `TC-DR-004`, `TC-DR-005` and `TC-DR-006`, and the banner's *"Iuran
  {activity} berubah menjadi {amount} mulai {month}"* with the month name from
  `t.months`.
- The month options are Indonesian month names, not English ones or bare keys.
- The only cross-locale matches are the community name, proper nouns, numerals
  and currency — `Rp 75.000` is formatted `id-ID` in both locales by design.
- No metaphor word from `CONTEXT.md` appears in either locale, and no
  member-facing string says "rate": member copy says Dues with a figure and a
  month.

### TC-DR-019 · P1 · Positive — The picker and the disclosure are reachable and announced

**Preconditions:** the Activity edit dialog open on an Activity with a change
queued. A screen reader, or the accessibility tree.

**Steps:**
1. Tab from the Dues amount box and record every stop through the picker, the
   disclosure and the Withdraw tile.
2. Open the picker from the keyboard, move through the twelve options with the
   arrow keys, and choose one with Enter.
3. Read the accessible name of the picker's trigger, and the `aria-describedby`
   of both the amount box and the trigger.
4. Withdraw the change without reloading, and observe what is announced.
5. Click the **Starts from** label and read where focus went.
6. Read the disclosure's computed font size and colour, in both materials.

**Expected result:**

- Tab reaches the amount box, then the picker trigger, then the Withdraw tile,
  each with a visible focus ring; the disclosure is text and is not a tab stop.
- The picker opens, traverses and commits from the keyboard alone.
- The trigger is named by a real `<label>` bound with `htmlFor`, and **both** the
  amount box and the trigger point at the disclosure with `aria-describedby`
  (`dues-rate-note-{activityId}`), so the condition reaches a screen reader as
  part of the field rather than as decoration. A validation message joins the
  description rather than replacing it.
- The disclosure is an `aria-live="polite"` region: a change being queued,
  replaced or withdrawn is announced **where it happens**, not on the next focus.
- Clicking the label focuses the trigger.
- The sentence renders at **Body** size in Secondary Ink in both materials —
  never Caption and never the muted step (`DESIGN.md`).

### TC-DR-020 · P2 · Positive — The Activities register prints the current rate and sorts by it

**Preconditions:** `/admin/activities` as an admin, the four seeded Activities,
and a change queued on one of them.

**Steps:**
1. Read each row's Dues cell and compare it against the resolved current-Period
   rate.
2. Press the Dues column head to sort ascending, then descending, and record the
   order.
3. Look for any marker of the queued change in the register.
4. Deactivate an Activity, sort by Dues again, and reactivate it.
5. Read the cell of an Activity with no rate row at all (created by SQL, removed
   afterwards).

**Expected result:**

- Every Dues cell reads what **this** Billing Period charges, formatted
  `Rp 75.000`, with tabular figures down the column.
- The sort ranks by the resolved current rate in both directions, and **name
  breaks every tie**, so two loads of the same data give the same list. The sort
  is `?sortBy=dues`; every other sort keeps its own `orderBy`.
- **No marker for a queued change anywhere in the register**: a queued change is
  not a standing, and the register answers "which Activity charges most" about
  the month it is showing.
- Step 4: the Dues sort ranks active and inactive Activities together, unchanged
  from before the rate history (`src/lib/activity-register.ts`).
- Step 5: the cell reads **"No rate set"** / **"Belum ada tarif"** — never an em
  dash, which means the Activity does not offer Monthly, and never `Rp 0`, which
  would read as a free month rather than a missing row.

### 19.5 Recorded run — 2026-08-30

Executed once against `main` at **`559484b`** (the merge of PR #133 for
[#129](https://github.com/jefrykurniaone/net-c-management/issues/129), on top of
`4162470`), on the §2 seed on the local `netc` database, on **Next.js 16.2.6**
(dev server on `http://localhost:3000`), at **1440 × 900**, in **both locales**.
Playwright (MCP) drove the surfaces, signed in from `/auth/dev`; the routes were
called through an API harness on `/api/dev-login`; the database was read through
`pg`. The current Billing Period on the run day was **August 2026** (`202608`).

**The painted-board material was not measured this run.** Every colour and size
below is the enamel material's. §16 and `TC-AR-036` hold the both-materials
sweep, and re-reading this area on the painted board is still owed.

Every figure below is measured — from the route's own response, from the
database, from the server log, or from `getComputedStyle` — never from what a
screenshot looked like.

**The seed was left as it was found.** After the run: `Payment` **44** rows /
`sum(amount)` **2,360,000**, `PENDING 3 / CONFIRMED 40 / REJECTED 1`;
`Attendance` `REGISTERED 69 / PRESENT 38 / ABSENT 13 / MAYBE 3`; `DuesRate`
exactly one row per Activity at `effectiveFrom 0` (75000 / 60000 / 40000 /
55000); Tennis memberships back to five Monthly from `202608` with nothing
pending; the two sentinel Sessions, the sentinel Activities and every sentinel
Payment, storage object and Attendance row removed; the one Proof URL pointed at
a dead host restored to `NULL`. Residue: `updatedAt` moved on rows the run
touched, and `Tennis.description` was re-saved as the empty string it already
was. The pre-existing
[#128](https://github.com/jefrykurniaone/net-c-management/issues/128) was worked
around as 19.0 item 8 says — Tennis `bankAccountNumber` set to `002101045566` by
SQL and restored to `0021 0104 5566`.

| Case | Priority | Result |
|---|---|---|
| TC-DR-001 | P0 | **Pass** — form as `member2@xclub.local`: Period input read-only `August 2026` with "The current period, set by the calendar"; Amount read-only `Rp 75.000` with "Set by this activity's monthly fee" (that copy is [#134](https://github.com/jefrykurniaone/net-c-management/issues/134)); Submit disabled until a file is attached. A 1×1 PNG → `POST /api/payments/upload` **201**, row `{ amount: 75000, month: 8, year: 2026, type: MONTHLY, status: PENDING }` (`cmtfa246x001y1kdfhez27tn1`); toast "Payment proof uploaded! Awaiting admin confirmation."; `/payments` dues card `Rp 75.000 /month · IN REVIEW`. Client-field injection through the route (multipart `amount=1`, October 2026 while 90.000 was queued from September) → **201** and a stored `amount` of **90000** — the client figure never reaches the row. Fixture removed: 1 Payment, 1 `payment-proofs` object, 3 `REGISTERED` Attendance rows from `syncMonthlyAttendances` |
| TC-DR-002 | P0 | **Pass** — Admin `PATCH /api/activities/cmr4c8pal0004b4dfzbntbi5d` `{"duesRate":{"amount":90000,"effectiveFrom":202609}}` → **200**. member2's route upload `month=9&year=2026` → **201**, `Payment.amount` **90000**; `month=8&year=2026` → **201**, `amount` **75000**. Same path, same day, two Periods, two prices. The queued row was untouched by both (`{90000, 202609}` still present) |
| TC-DR-003 | P0 | **Pass** — route upload `month=7&year=2026` → **201**, `amount` **75000** (the beginning-of-time row; July has no later row). Cross-check over every seeded `MONTHLY` Payment: `count(*) WHERE amount <> resolved rate of its own Period` = **0**. June 2026, before member2's Monthly `effectiveFrom 202607` → **403** "You're not on monthly billing for this activity this period." — not a Payment of 0. **The no-covering-row 400 (`payments.noMonthlyFee`) was not exercised**: every Activity carries a beginning-of-time row, and reaching that guard would mean deleting a seed row |
| TC-DR-004 | P0 | **Pass** — as Admin and as Owner, `PATCH` with `effectiveFrom` `202608`, `202607` and `0` → six × **409** `code: "DUES_RATE_PERIOD_ARRIVED"`, `error: "That month has already arrived, so what it charges is settled and cannot be changed. Pick a later month for the new rate."` Admin `PATCH {"name":"Badminton QA","duesRate":{…,"effectiveFrom":202608}}` → **409** with the same code, and `Activity.name` **unchanged** (`Badminton`). Rate rows byte-identical before and after — `amount`, `effectiveFrom`, `setById`, `setAt` |
| TC-DR-005 | P0 | **Pass** — `effectiveFrom 202709` → **400** `DUES_RATE_PERIOD_OUT_OF_RANGE`, `error: "A new rate starts from next month at the earliest and twelve months ahead at the latest. Pick a month in that range."`; `202613` → **400** with the same code; rows unchanged after both. `202708` → **200**, rows `[{75000,0},{80000,202708, setById cmr4c8pb20007b4dftnl351r2}]`; `202609` → **200**, rows `[{75000,0},{80000,202609}]` — exactly one queued row, the `202708` one replaced. `DELETE …?effectiveFrom=202609` → **200** `{"success":true}` and the rows restored. The edit dialog's **Starts from** picker offers **12** options, `September 2026` … `August 2027` (`id`: `September 2026` … `Agustus 2027`) |
| TC-DR-006 | P0 | **Pass** — `DELETE …/dues-rate?effectiveFrom=0`, `=202608` and `=202607`, as Admin and as Owner → six × **409** `DUES_RATE_PERIOD_ARRIVED` with the same sentence as `TC-DR-004`. `=202609` with nothing queued → **409** `DUES_RATE_NOTHING_QUEUED`, `error: "There is no queued dues change to withdraw. Reload the page to see what this activity charges now."` `=202610xyz` → **400** `{"error":"An error occurred"}` (no `code`); no `effectiveFrom` at all → **400** likewise. Rows byte-identical. In the dialog **Withdraw** is drawn only while a change is queued (0 buttons without one, 1 with), and no control anywhere offers to delete an arrived rate |
| TC-DR-007 | P0 | **Pass** — `DuesRate`: `badminton cmr4c8pal0004b4dfzbntbi5d 75000 @0`, `basket cmt0gxmfn0007fkdf294sd66k 60000 @0`, `futsal cmr4c8par0005b4df6vdpl5m8 40000 @0`, `tennis cmt0gxmfq0008fkdf1e473kc5 55000 @0`, `setById NULL` — equal to the wave-1 `monthlyFee` baseline. `Payment` **44 / 2,360,000**, both baselines unchanged. `information_schema.columns` for `Activity` matching `%fee%`: only `sessionFee`. `_prisma_migrations`: `20260829163748_add_dues_rate` finished `2026-08-29T17:00:56Z`, `20260830100000_drop_activity_monthly_fee` finished `2026-08-30T01:13:16Z`. `git grep -n monthlyFee -- src prisma/schema.prisma prisma/*.ts` → only `src/lib/__tests__/activity-validation.test.ts`, the two cases asserting the old name is stripped. `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` → **No difference detected**, exit 0. On the scratch database `netc_scratch_w4` (created, then dropped): `migrate deploy` "All migrations have been successfully applied", `prisma db seed` exit 0, 4 Activities each with one rate row `0:75000 / 0:60000 / 0:40000 / 0:55000`, **75 Payments / 4,250,000**, no `monthlyFee` column, head `20260830100000_drop_activity_monthly_fee`, `migrate diff` exit 0 |
| TC-DR-008 | P1 | **Pass** — Tennis edit dialog. The opening disclosure `#dues-rate-note-cmt0gxmfq0008fkdf1e473kc5` reads "This activity charges Rp 55.000 a month. A new rate applies from the month you pick, never from a month that has already arrived." as a `<p>` at **15px** in `rgb(84, 97, 91)` with `aria-live="polite"` and no Withdraw. Save `70000 / September 2026` → reopened: "This activity charges Rp 55.000 a month, changing to Rp 70.000 from September 2026.", Withdraw ×1, amount box `70000`, trigger `September 2026`. Save `75000 / September 2026` → "…changing to Rp 75.000 from September 2026."; rows carry exactly one with `effectiveFrom > 202608`: `{75000, 202609, setById cmr4c8pb20007b4dftnl351r2}`. Save `80000 / October 2026` → "…changing to Rp 80.000 from October 2026."; one queued `{80000, 202610}` and **none left at `202609`**. The same save repeated byte-for-byte left `setAt` unchanged (`2026-08-29T19:47:06.957Z`, database clock) and `setById` unchanged. The current rate read `Rp 55.000` throughout. `aria-describedby="dues-rate-note-cmt0gxmfq0008fkdf1e473kc5"` on `input[name=duesAmount]` **and** on the trigger `#dues-rate-period-cmt0gxmfq0008fkdf1e473kc5` |
| TC-DR-009 | P1 | **Pass** — the tile is `<button type="button">Withdraw</button>`. Pressed by keyboard (Enter) with `70000 / 202609` queued: the dialog stays open, the sentence returns to the current-rate form **without a reload** through the `aria-live="polite"` region, the tile is gone, the amount box is back to `55000` and the trigger to `September 2026`, and the toast reads "Queued dues change withdrawn."; the rows carry the beginning-of-time row only. At the route, `DELETE …?effectiveFrom=202609` → **200** `{"success":true}`; with nothing queued → **409** `DUES_RATE_NOTHING_QUEUED` — the tile cannot be pressed twice, because it disappears. Observation, not a failure: after the tile unmounts, `document.activeElement` is the dialog container |
| TC-DR-010 | P1 | **Pass** — with `{80000, 202610}` queued and the current rate 55000, saving `55000 / October 2026` → **200**, toast "Activity updated!", and the rows carry only `{55000, 0}`: no queued row at `202610` and none anywhere. The reopened dialog draws the current-rate sentence and no Withdraw. The `55000 / 202609` variant is #127's own Vitest case and was **not re-run on the form**. The email that followed the same arm under dummy credentials was the **withdrawn** template's three sends (see `TC-DR-016`) |
| TC-DR-011 | P1 | **Pass** — `POST /api/activities` with `monthlyFee: 111111` and no `duesAmount` → **400**, no Activity and no rate row. `POST` with `duesAmount: 123456` **and** a stray `monthlyFee: 999999` → **201**, and exactly one `DuesRate` `{123456, effectiveFrom 0, setById cmr4c8pb20007b4dftnl351r2}` — the creating Admin. `PATCH {"monthlyFee":555555,"description":"patched"}` → **200** with the rows unchanged. `GET /api/activities` items carry no `monthlyFee` key. A second sentinel (`Aikido QA`, `duesAmount 55000`) printed `Rp 55.000` in the register at once. **Not exercised: the create dialog's control set** — the amount box without a picker was not opened this run. Both sentinels deleted (`DELETE /api/activities/{id}` → **200**) |
| TC-DR-012 | P1 | **Pass** — three rounds, `admin@` `{80000, 202609}` against `admin2@` `{65000, 202610}` fired together with the order alternated. **Both 200 every round.** Rows afterwards: round 1 one queued `{65000, 202610}`, round 2 one queued `{80000, 202609}`, round 3 one queued `{65000, 202610}` — exactly one row with `effectiveFrom > 202608` each time, `setById` whichever committed second (admin2, `cmr4c8pbj0009b4dfkzoogwvh`, in all three), the beginning-of-time row unmoved. Between rounds `DELETE` on the surviving key → **200**, on the other → **409** `DUES_RATE_NOTHING_QUEUED` |
| TC-DR-013 | P1 | **Pass** — fixture: a SQL-inserted arrived row on Badminton `{80000, 202608}` (id `w5dr013arrivedrow`, deleted afterwards) and member2 Payments July 75000, August 75000, September 90000, October 90000, all `PENDING`. Confirm dialogs: July (= July's 75000) **no note**; September and October (= 90000) **no note**; August: "**This is less than the Dues for August 2026 of Rp 80.000. You can still Confirm.**", a `<p>` at **15px** in `rgb(84, 97, 91)` with the dialog's Confirm button pointing at it through `aria-describedby`. Confirming through `PATCH /api/payments/cmtf9i2il000f1kdfu5miltak {"status":"CONFIRMED"}` → **200**, `status CONFIRMED`, `amount 75000` — it warns, it never blocks. Escape on the other dialogs wrote nothing (July still `IN REVIEW` afterwards). In `id`, on `member@xclub.local`'s August Badminton row against the same fixture: "**Jumlah ini kurang dari Iuran Agustus 2026 sebesar Rp 80.000. Kamu tetap bisa Konfirmasi.**" That is [#129](https://github.com/jefrykurniaone/net-c-management/issues/129)'s copy as merged in `559484b`: the sentence names the Payment's **own** Period |
| TC-DR-014 | P1 | **Pass** — the `/admin` tile reads "Collected · August — Rp 2.24M of **Rp 3.06M** due", and Σ headcount × current rate = 27×75000 + 6×60000 + 10×40000 + 5×55000 = **3,060,000** (the tile abbreviates to `M`; no full figure is exposed). With Badminton `90000 / 202609` queued the tile read **Rp 3.06M**, unchanged; after the withdrawal, **Rp 3.06M** again. Control: while the SQL-inserted **arrived** row `{80000, 202608}` existed the tile read **Rp 3.19M** (= 3,195,000) — the tile follows the Period's rate, not the queue. `id`: "Rp 2.24M dari Rp 3.19M tagihan", read while that fixture row existed. The rollover itself is **asserted by Period choice** (August against September 2026) plus the resolver's Vitest; no clock is injectable. **The `[admin dashboard] no Dues Rate covers …` log line was not observed**: the only rate-less Activity (Aikido QA) had no members, so it contributed nothing without reaching the resolver |
| TC-DR-015 | P1 | **Pass** — fixture on Tennis by SQL, restored afterwards: `wulan.sari` per-Session; `nadia.putri` per-Session with `pendingMode MONTHLY`, `pendingEffectiveFrom 202609`; `putri.anggraini` `paymentMode NULL`. Queued: Tennis `70000 / 202609`, Badminton `90000 / 202609`. On `/dashboard`: **Citra Dewi** (Monthly, August `CONFIRMED`, owes nothing) → "Tennis Dues change to Rp 70.000 from September 2026"; **Wulan Sari** (per-Session on Tennis) → **no Tennis sentence**, only "Badminton Dues change to Rp 90.000 from September 2026" where she is Monthly; **Nadia Putri** (pending switch), in `id` → "Iuran Tennis berubah menjadi Rp 70.000 mulai September 2026" and the Badminton one; **Putri Anggraini** (no mode on Tennis) → **no Tennis sentence**, Badminton only; **Adi Pratama** (Monthly on both) → the Badminton sentence then the Tennis one, in Activity-name order. The notice box carries **0** links and **0** buttons, at 13px. After the withdrawals the sentences were gone. "Gone once the Period arrives" is **cited to `src/lib/__tests__/dues-notice.test.ts`**, not executed in the browser |
| TC-DR-016 | P1 | **Pass on the logged events, with one anomaly filed as [#135](https://github.com/jefrykurniaone/net-c-management/issues/135)** — (a) unconfigured, as shipped: queue, replace and withdraw each → **200** with **0** `[dues-rate]` lines in the server log. (b) restarted with dummy `GMAIL_USER` / `GMAIL_APP_PASSWORD`: the audience is the Tennis members resolving Monthly for `202609` — `member@`, `nadia.putri@` (the pending switch) and `citra.dewi@`. Per-recipient `[dues-rate] change email to <address> failed: … 535-5.7.8` lines: replace `80000/202610` → **3**; withdraw → **3**; a save changing nothing about Dues → **0**; queue `70000/202609` on a warm server → **3**; replace as the first request after a fresh start → **3**; replace warm → **3**; withdraw → **3**; queue as the first request after a fresh start → **3**. **None** to `wulan.sari@` or `putri.anggraini@` in any event. Every batch landed after the response (route application code 37–84 ms, one cold compile 1268–1366 ms). **The anomaly**: the very first queue event of the run — the first request after the first restart — answered **200** and logged **nothing at all**, neither a per-recipient nor a batch-level line, within 45 s or ever; two deliberate reproductions of the same sequence logged three lines each. Filed as #135 (`needs-info`). **Not exercised**: the inactive, unadmitted and no-address exclusions, for want of a fixture. Locale: the template layout is bilingual and every recipient gets `DEFAULT_LOCALE` (`en`), per 19.0 item 7. Real delivery is not verifiable in dev |
| TC-DR-017 | P1 | **Pass** — as `member@xclub.local`: `PATCH …/activities/{Badminton}` carrying a `duesRate` → **403** `{"error":"Forbidden"}`; `DELETE …/dues-rate?effectiveFrom=202609` → **403**; `POST /api/activities` → **403**. Signed out: `PATCH` → **401** `{"error":"Unauthorized"}`, `DELETE` → **401**. Rate rows byte-identical |
| TC-DR-018 | P1 | **Pass on its assertions; defect [#134](https://github.com/jefrykurniaone/net-c-management/issues/134) found by this case.** In `id`: register head "AKTIVITAS IURAN BIAYA METODE JADWAL MINGGUAN KAPASITAS BATAS MINIMUM BANK STATUS AKSI"; dialog label "Iuran Bulanan (Rp)", picker label "Mulai dari", options `September 2026, Oktober 2026, November 2026, Desember 2026, Januari 2027, Februari 2027, Maret 2027, April 2027, Mei 2027, Juni 2027, Juli 2027, Agustus 2027` — month names, not keys; disclosure "Aktivitas ini menagih Rp 55.000 per bulan, berubah menjadi Rp 70.000 mulai September 2026."; Withdraw "Tarik kembali"; save "Simpan Perubahan"; the rate-less cell "Belum ada tarif"; the shortfall sentence as in `TC-DR-013`; the dashboard tile "Rp 2.24M dari Rp 3.19M tagihan"; the member banner "Iuran Tennis berubah menjadi Rp 70.000 mulai September 2026". Money reads `Rp 55.000` (`id-ID`) in both locales, as designed. No metaphor word, and no member-facing string says "rate". **The defect**: the **en** label reads "Monthly Fee (Rp)" and the upload form says "monthly fee" — `admin.activityFee`, `payments.amountLocked` and `payments.noMonthlyFee`, against `CONTEXT.md:70`, which lists "monthly fee" under *Avoid* → #134. **Not exercised: the three refusal `error` sentences through the route with an `id` cookie** — the API harness cannot attach `NEXT_LOCALE` to the signed-in request context, so they came back in English because the cookie never reached the server. Recorded as "route sentences in `id` not verified" |
| TC-DR-019 | P1 | **Pass** — tab order inside the dialog with a change queued: `input[name=duesAmount]` → `#dues-rate-period-…` (`role="combobox"`) → **Withdraw** → `input[name=sessionFee]`; the disclosure `<p>` carries no `tabindex` and is not a stop. `label[for="dues-rate-period-cmt0gxmfq0008fkdf1e473kc5"]` reads "Starts from". Focus rings under `:focus-visible`: the trigger at `box-shadow: rgb(255,255,255) 0 0 0 2px, rgb(23,97,74) 0 0 0 4px`; Withdraw, after its 0.15 s transition, at `box-shadow: oklab(0.4418 -0.0786 0.0173 / 0.5) 0 0 0 3px` with `border-color rgb(23,97,74)`. From the keyboard, Enter opens one `listbox` of **12** options and ArrowDown + Enter picks `October 2026`, closing it with focus still on the trigger. `aria-describedby="dues-rate-note-…"` on both the amount box and the trigger. Withdrawing by Enter is announced through the `aria-live="polite"` note — the sentence changes in place, with no reload. The disclosure measures **15px** `rgb(84, 97, 91)` on enamel; the painted board was not measured. **Not exercised**: the validation-message join, and focusing the trigger by clicking its label. Observation: focus lands on the dialog container after the tile unmounts |
| TC-DR-020 | P2 | **Pass** — cells `Rp 75.000 / Rp 60.000 / Rp 55.000 / Rp 40.000` at `font-variant-numeric: tabular-nums`. `?sortBy=dues&sortDir=asc`: Futsal 40.000, Aikido QA 55.000, Tennis 55.000, Basket 60.000, Badminton 75.000; `desc`: Badminton, Basket, Aikido QA, Tennis, Futsal — the 55.000 tie broken by **name** both ways. With Tennis carrying `70000 / 202609` queued its cell still read `Rp 55.000` and drew **no marker of any kind**. The deactivated, rate-less Aikido QA sorted together with the active rows (last in `desc`) and its cell read **"No rate set"** (`span.type-figure`, no em dash and no `Rp 0`), `id` **"Belum ada tarif"**. Fixture deleted |

**Summary.** 20 cases, all written by this ticket. **20 executed, 20 Pass, 0
Fail, 0 Not run.** **Every P0 passes.** Two defects were found by the run and
filed rather than fixed here:
[#134](https://github.com/jefrykurniaone/net-c-management/issues/134) — the
English copy still says "monthly fee" (`admin.activityFee`,
`payments.amountLocked`, `payments.noMonthlyFee`), which `CONTEXT.md:70` lists
under *Avoid* — found by `TC-DR-018` and seen again on `TC-DR-001`'s upload form;
and [#135](https://github.com/jefrykurniaone/net-c-management/issues/135) — one
queued-Dues email event attempted no sends and logged nothing, not reproduced in
two attempts. Neither is a failed assertion of the case that found it, and both
are `type:bug` + `spec:dues-rate`. The steps recorded above as **not exercised**
are listed under **Not met**.

**The database assertions, and what proved them.**

| Claim | Proof |
|---|---|
| A Proof records the rate of the Period it pays for | Three uploads by one member on one day through one path: July 2026 → `amount` **75000**, August 2026 → **75000**, September 2026 with `{90000, 202609}` queued → **90000**. Read from the `Payment` rows, not from the screen |
| The client never sets the price | A multipart upload carrying `amount=1` for October 2026 while 90.000 was queued from September stored **90000** |
| No seeded Payment was repriced | `count(*) FROM "Payment" WHERE amount <> the resolved rate of its own Period` = **0**, over every seeded `MONTHLY` row |
| An arrived Period's rate is never rewritten | Twelve refusals — `PATCH` and `DELETE` at `202608`, `202607` and `0`, as Admin and as Owner — each **409** `DUES_RATE_PERIOD_ARRIVED`, with the rate rows read field by field before and after and byte-identical each time, `setById` and `setAt` included |
| A refused rate leaves no half-written Activity | `PATCH {"name":"Badminton QA","duesRate":{…,"effectiveFrom":202608}}` → **409**, and `Activity.name` still `Badminton` |
| The migration seeded one rate per Activity and repriced no Payment | One `effectiveFrom 0` row per Activity at **75000 / 60000 / 40000 / 55000** against the four seeded ids, `setById NULL`; `Payment` **44 / 2,360,000**, equal to the wave-1 and wave-4 baselines; `Activity` carries no `%fee%` column but `sessionFee`; `migrate diff` **No difference detected**, exit 0 |
| At most one queued row survives concurrent saves | Three rounds of two un-awaited saves at different amounts and different months: **both 200** every round, and exactly one row with `effectiveFrom > 202608` afterwards, carrying whichever committed second |
| A queued rise cannot inflate this month's total | The `/admin` total-due tile read **Rp 3.06M** before, during and after a `90000 / 202609` queue; a SQL-inserted **arrived** row `{80000, 202608}` moved the same tile to **Rp 3.19M** |
| The seed is unchanged | `Payment` **44 / 2,360,000**, `3 / 40 / 1`; `Attendance` `69 / 38 / 13 / 3`; `DuesRate` one row per Activity at `effectiveFrom 0`; Tennis back to five Monthly from `202608` with nothing pending; every sentinel row, object and Attendance removed |

**Payments suite re-run.** The upload path changed, so §13 and the Payments
queue of §18 are re-run in full and recorded here rather than by editing either
section.

| Case | Result |
|---|---|
| §13.1 unpaid dues surfaced | **Pass** — member2 `/payments`, August 2026: "Badminton Rp 75.000 /month · PAID" after the Admin's Confirm; dashboard "DUES 0 unpaid" |
| §13.2 upload proof | **Pass** — `/payments/upload`, Badminton, amount locked `Rp 75.000`, PNG attached, Submit → **201**, history row "DUES · AUGUST 2026 Rp 75.000 IN REVIEW" |
| §13.3 in-review badge | **Pass** — dues card and history read **IN REVIEW**; dashboard activity card "Badminton IN REVIEW"; no unpaid banner |
| §13.4 client file check | **Pass** — a `.txt` on the input → toast "Unsupported file format. Use JPG, PNG, or WebP." plus the hint, the input value cleared, Submit still disabled. The server-side `400` for a `.txt` was **not re-sent this run** |
| §13.5 payment mode dialog | **Pass** — sentinel Session "W5 QA Badminton" (1 Sep): "Register & pay · Rp 75.000" and **Change payment mode** → dialog "Choose how you pay … Monthly … Rp 75.000/mo · Per session … Rp 25.000/session" |
| §13.6 no mode chosen | **Pass** — Eka, with no mode, on the sentinel "W5 QA Futsal": a plain **Register** with no price → the same dialog at `Rp 40.000/mo` / `Rp 15.000/session` |
| §13.7 rejected payment | **Pass** — `/payments?historyStatus=REJECTED`: "Rejection reason: QA: amount short of the September dues", refund guidance, 1 WhatsApp link |
| §13.8 profile | **Pass on read** — the profile shows the stored phone `6281200000012` (already normalised), the Language control at `English`, the Theme controls and Sign Out. The edit dialog, the phone normalisation and the language toggle were **not exercised** this run |
| TC-AR-020 | **Pass** — `?pageSize=all`: 48 rows (44 seed plus 4 sentinels at the time), in the sequence `IN REVIEW ×6`, then `CONFIRMED ×41`, then the `REJECTED` row last; heading "Confirm or reject payment proofs · **6 waiting for a decision**". Steps 4–5 — an explicit column sort and **Back to the queue order** — were not re-run |
| TC-AR-021 | **Pass** — `?activityId=<Basket>`: "· **nothing is waiting for a decision**", 6 rows, nothing Tape; `?status=CONFIRMED`: the sentence **absent**; `?search=zzzznomatch`: the register's own empty row, "EMPTY — No payments match your search." — #101's wording, now present |
| TC-AR-022 | **Pass** — the thumbnail is a `<button aria-label="Open the Proof from Adi Pratama">`, Enter opens "Proof from Adi Pratama · Badminton · August 2026" and Escape returns focus to the same button; **39** rows read "No Proof"; a Payment pointed at `https://dead.invalid/…` by SQL reads **"Failed to load"**, and the page rendered all 44 rows with it present. Fixture restored to `NULL` |
| TC-AR-023 | **Pass on the measure, fixture not built** — the seed holds 4 Proofs, 1 of them on the 40-row page: `/_next/image?…&w=48&q=75` at `devicePixelRatio 1`, **300 B** transferred, and **0** fetches of the original object before or after the full-size dialog opened. The forty-Proof sentinel set was not created |
| TC-AR-024 | **Pass** — the same dialogs as `TC-DR-013`: an equal-amount Payment draws no note, Escape writes nothing, the low Payment draws the (now #129) sentence at 15px in Secondary Ink with `aria-describedby`, and Confirm → **200** `CONFIRMED` |
| TC-AR-025 | **Pass** — the dialog refuses an empty and a space-only reason with `role="alert"` carrying "No reason given. Write why you are rejecting this payment — the member sees it."; Reject is **not** disabled; the Seat sentence reads "Every seat this member is Registered for in Badminton sessions in September 2026 is released. Seats they attended or opted out of are untouched." with `aria-describedby` on Reject; at the route `{"status":"REJECTED"}` and `{"notes":"   "}` are both **400** `{"error":"REJECT_REASON_REQUIRED"}`, and a real reason → **200** `REJECTED` with `notes` verbatim; a per-Session Payment's dialog carries **no** Seat sentence |
| TC-AR-026 | **Pass** — member2 after the Reject: the history row carries the `REJECTED` mark, the reason verbatim, refund guidance and the WhatsApp route back, with the amount at `rgb(84,97,91)` and `text-decoration: none` — dimmed, not struck. After the Confirm: the dues card reads **PAID** and the row `CONFIRMED`. The marks carry their own words, and no enum reaches the member beyond those labels |

**Fixtures created and removed.** Every one, and the state re-compared above:
member2's monthly Payments for July, August, September and October 2026 with
their `payment-proofs` objects and the `REGISTERED` Attendance rows
`syncMonthlyAttendances` wrote; queued rate rows on Badminton and Tennis at
`202609`, `202610` and `202708`, each withdrawn through the route before its
Period could arrive; one SQL-inserted **arrived** rate row on Badminton
(`{80000, 202608}`, id `w5dr013arrivedrow`) for `TC-DR-013` and `TC-DR-014`,
deleted by SQL because no route may; two sentinel Activities (`Aikido QA` and the
`duesAmount` probe) deleted through `DELETE /api/activities/{id}`; two sentinel
Sessions (`W5 QA Badminton`, `W5 QA Futsal`) for §13.5 and §13.6; the Tennis
membership fixtures for `TC-DR-015` and `TC-DR-016` (one per-Session, one pending
switch to Monthly from `202609`, one with no mode) restored by SQL; one Proof URL
pointed at a dead host for `TC-AR-022` and restored to `NULL`; Tennis's
`bankAccountNumber` set to digits for the dialog cases (#128) and restored to
`0021 0104 5566`. The scratch database `netc_scratch_w4` was created for
`TC-DR-007` and dropped.

**Not met.**

- **The painted-board material was not measured.** Every colour and size in this
  run is the enamel material's. `TC-DR-008`, `TC-DR-013` and `TC-DR-019` each
  state a Body-size-in-Secondary-Ink claim that holds on one material only so
  far.
- **`TC-DR-003`'s no-covering-row 400.** `payments.noMonthlyFee` was not
  exercised: every Activity carries a beginning-of-time row, and reaching that
  guard would mean deleting a seed row. The `null`-never-0 rule stands on
  `dues-rate.test.ts` and on `payments.ts`'s own guard.
- **`TC-DR-011`'s create dialog.** The claim that the create form offers an
  amount box and no month picker was not read this run; the route half of the
  case was.
- **`TC-DR-014`'s missing-rate log line.** `[admin dashboard] no Dues Rate covers
  …` was not observed, because the only rate-less Activity had no members and so
  contributed nothing without reaching the resolver.
- **`TC-DR-016`'s excluded members.** The inactive, unadmitted and no-address
  exclusions were not exercised, for want of a fixture; the per-Session and
  no-mode exclusions were. Real delivery is not verifiable in dev at all, so the
  audience is proven by attempted sends and never by a received message.
- **`TC-DR-018`'s refusal sentences in `id`.** The API harness cannot attach
  `NEXT_LOCALE` to a signed-in request, so the three refusals came back in
  English because the cookie never reached the server. Every other `id` string in
  the case was read on the surfaces.
- **`TC-DR-019`'s validation-message join and label click.** Neither was
  exercised. The `aria-describedby` wiring both rest on was read directly.
- **Payments suite gaps**, each noted in its row: §13.4's server-side `400`,
  §13.8's edit dialog, phone normalisation and language toggle, `TC-AR-020`'s
  column sort and **Back to the queue order**, and `TC-AR-023`'s forty-Proof
  fixture and weight ratio.
- **SonarLint has still been consulted on no ticket in this spec.**
  `mcp__ide__getDiagnostics` is not resolvable in this environment, for this
  executor either; the IDE MCP server failed to connect this session.
  `tsc --noEmit` through `npm run build`, plus ESLint at zero warnings, stood in,
  as they did in every earlier wave and in §18.6. This remains the one acceptance
  criterion of the map that no wave has satisfied.
