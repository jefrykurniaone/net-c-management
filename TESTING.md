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

## 7. Session management (admin)

1. **List** — `/admin/sessions` → table with pagination, sortable columns.
2. **Search / filter** — search "Rally" → 1 result; filter activity = Tennis.
3. **Edge — filtered empty state (OBS-02)** — search `zzzznonexistent` → **"No
   sessions match your search."** (not "No sessions yet.").
4. **Create — empty form** → inline required-field errors, nothing created.
5. **Edge — end before start (BUG-01)** — `/admin/sessions/new`, valid fields but
   Start `20:00` / End `18:00` → inline **"End time must be after start time"**;
   equal times are rejected too; nothing created.
6. **Create — valid** → appears as Scheduled, 0/max.
7. **Edge — locked fields on edit** — open a session's edit page → Activity is
   read-only; **Fee** is disabled once members have registered.
8. **Update** — change title/times → persists in the list.
9. **Manual attendance** — mark a player Present → persists (verify via CSV).
10. **Edge — CSV headers localized (OBS-03)** — `GET /api/sessions/{id}/export`
    → EN headers (`No,Name,Email,…`); switch language to Indonesian (profile) then
    re-export → `No,Nama,Email,…`.
11. **Delete** — confirm dialog warns attendance is deleted; row disappears.

## 8. Payment review (admin — Manage Dues)

1. `/admin/payments` → list, filters, Export CSV.
2. Filter Status = Pending → count matches the sidebar badge.
3. **Confirm** a pending payment (dialog) → leaves the queue as Confirmed.
4. **Edge — reject requires a reason** — Reject button disabled until a reason is
   typed.
5. **Reject** with a reason → status REJECTED; appears under the Rejected filter.
6. CSV export → `GET /api/payments/export?month=7&year=2026` (headers localized,
   OBS-03).

## 9. Activity management (admin)

1. `/admin/activities` → list with member counts / fees / status.
2. Create — empty form → validation errors.
3. Create — valid (e.g. `Yoga QA`, slug `yoga-qa`) → appears Active, 0 members.
4. **Edge — duplicate slug** — `POST /api/activities` with an existing slug →
   `409 "That slug is already in use"`.
5. **Edge — missing fields** — `POST /api/activities` without `minMembers` /
   `maxPlayers` → `400` with field-level details.
6. Deactivate (confirm) → status Inactive; button flips to Activate.

## 10. Member management (admin)

1. `/admin/members` → directory with search + activity filter + pagination.
2. Promote a member to ADMIN (confirm) → role badge Admin.
3. Demote back to Member (confirm) → role Member.
4. **Edge — incomplete profile badge** — `newbie@xclub.local` shows the "Profile
   Incomplete" badge.
5. Member detail `/admin/members/{id}` → memberships, attendance & dues history.

## 11. Community settings (admin)

1. `/admin/settings` → current values.
2. Save a new Community Name → app rebrands (title + sidebar).
3. **Edge — empty name (BUG-02)** — clear Community Name → **Save** is blocked
   with "Community name is required"; the stored value is unchanged. Server also
   rejects: `PATCH /api/settings {"communityName":"   "}` → `400`.

## 12. Member — dashboard & sessions

Sign in as **Adi** (`member@xclub.local`).

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

The design system (`DESIGN.md`, *Papan Jadwal*) makes two promises that rot
silently: every text and mark pair clears WCAG AA in **both** board materials,
and every state survives having its colour removed. This area turns both into
cases that fail on a **number** or on a **screenshot**, not on an opinion, so a
nudged token is a failed case rather than a matter of taste.

Every case below is stated as something a person can see. Nothing asserts that a
component rendered with a class name — such a case passes forever while the
design breaks.

### 16.0 Conventions, vocabulary and shared preconditions

Each case carries an id (`TC-DS-NNN`), a priority (**P0** ships nothing broken,
**P1** ships with a known note, **P2** is cosmetic), a type (Positive / Negative /
Edge), its own preconditions, numbered steps, and an expected result. Where a
case touches an API the expected result names the **HTTP status**.

The two board materials are objects, not themes (`DESIGN.md`, *The
Material-Is-Not-Mode Rule*):

- **enamel** — the light material. `:root` in `src/app/styles/board-materials.css`.
- **painted board** — the dark green material. `.dark` in the same file. The
  public route's hero band renders it in **both** materials, deliberately.

Shared preconditions for every case in this area:

1. §1 prerequisites done and `npm run dev` running on `http://localhost:3000`.
2. §2 seed loaded (`npm run db:seed`) — these cases use the §3 accounts
   (`member@xclub.local` = Adi, `owner@xclub.local`), the four seeded activities
   (Badminton, Basket, Futsal, Tennis) and the §4 sessions. No fixture of their
   own, and no fixture invented in a case.
3. Material switched with the **theme toggle** in the header rail (or the OS
   colour scheme, which `system` follows).
4. Locale switched on `/profile` → Language, or by setting the `NEXT_LOCALE`
   cookie to `en` / `id`.
5. Viewport set with the browser's device toolbar: **390 × 844** (phone) and
   **1440 × 900** (desktop).

Contrast is read the same way in every case: inspect the element, and read the
ratio DevTools prints in the colour picker beside `color` — or compute it from
the two token values. Ratios below are the measured values of the shipped
tokens; a case fails when the measurement is **below its target**, not when it
differs from the value printed here.

### TC-DS-001 · P0 · Positive — Enamel text-on-surface pairs clear WCAG AA

**Preconditions:** signed in as Adi; material = enamel; locale = en.

**Steps:**
1. Open `/dashboard`, `/sessions`, `/payments` and `/profile`.
2. For each text role on a cell (tile) and on the page ground, read the contrast
   ratio of `color` against the surface behind it.

**Expected result:** every pair clears **4.5:1** (AA, body text; a role at
≥24px, or ≥18.66px and bold, only has to clear 3:1):

| Pair | Tokens | Target | Measured |
|---|---|---|---|
| Graphite Ink on tile | `--foreground` on `--card` | 4.5 | **16.10** |
| Graphite Ink on ground | `--foreground` on `--background` | 4.5 | **14.19** |
| Secondary Ink on tile | `--muted-foreground` on `--card` | 4.5 | **6.13** |
| Secondary Ink on ground | `--muted-foreground` on `--background` | 4.5 | **5.41** |
| Quiet Ink on tile | `--subtle-foreground` on `--card` | 4.5 | **4.74** |
| Court Green on tile | `--primary` on `--card` | 4.5 | **6.98** |
| Court Green on ground | `--primary` on `--background` | 4.5 | **6.15** |
| Primary action | `--primary-solid-foreground` on `--primary-solid` | 4.5 | **6.98** |

And one constraint that is part of the same case: **Quiet Ink on the enamel
ground measures 4.17:1 and does not clear AA.** No surface may put
`--subtle-foreground` text on `--background` or `--muted`; text sitting on the
ground takes Secondary Ink instead (5.41:1). A page where Quiet Ink lands on the
ground fails this case.

### TC-DS-002 · P0 · Positive — Painted-board text-on-surface pairs clear WCAG AA

**Preconditions:** signed in as Adi; material = painted board; locale = en.

**Steps:** as TC-DS-001, over the same four routes.

**Expected result:** every pair clears **4.5:1**:

| Pair | Tokens | Target | Measured |
|---|---|---|---|
| Chalk Ink on tile | `--foreground` on `--card` | 4.5 | **11.49** |
| Chalk Ink on ground | `--foreground` on `--background` | 4.5 | **13.06** |
| Chalk Secondary on tile | `--muted-foreground` on `--card` | 4.5 | **5.45** |
| Chalk Secondary on ground | `--muted-foreground` on `--background` | 4.5 | **6.19** |
| Chalk Quiet on tile | `--subtle-foreground` on `--card` | 4.5 | **4.70** |
| Chalk Quiet on ground | `--subtle-foreground` on `--background` | 4.5 | **5.35** |
| Court Green Lit on tile | `--primary` on `--card` | 4.5 | **6.00** |
| Court Green Lit on ground | `--primary` on `--background` | 4.5 | **6.82** |
| Primary action | `--primary-solid-foreground` on `--primary-solid` | 4.5 | **6.82** |

### TC-DS-003 · P0 · Positive — Mark-on-wash pairs clear AA, enamel

**Preconditions:** signed in as Adi; material = enamel. Marks with a live
producer: **Ink** (a Confirmed Payment on `/payments`), **Tape** (the pending
payment on **Hold Lab**, and the MAYBE RSVP on **Free Play**), **Strike** (the
rejected payment under `/payments?historyStatus=REJECTED`, and **Rained Out
(Cancelled)**), **Blank** (the RSVP-not-yet-given pill on `/dashboard`, and
`Unposted` on `/`).

**Steps:**
1. Open each surface above and find the mark.
2. Read the mark label's contrast against the wash it sits on.

**Expected result:** every mark clears **4.5:1** — worst case for a mark that can
sit on either surface is listed:

| Mark | Pair | Target | Measured |
|---|---|---|---|
| Ink | Court Green on ink wash | 4.5 | **6.31** |
| Tape | Tape Ochre on tape wash | 4.5 | **5.36** |
| Strike | Struck Red on strike wash | 4.5 | **5.97** |
| Erased | Secondary Ink on ground | 4.5 | **5.41** |
| Blank | Secondary Ink on ground (worst) / tile | 4.5 | **5.41** / 6.13 |
| Hollow | Struck Red on ground (worst) / tile | 4.5 | **5.73** / 6.50 |

### TC-DS-004 · P0 · Positive — Mark-on-wash pairs clear AA, painted board

**Preconditions:** as TC-DS-003, material = painted board.

**Expected result:** every mark clears **4.5:1**:

| Mark | Pair | Target | Measured |
|---|---|---|---|
| Ink | Court Green Lit on ink wash | 4.5 | **5.40** |
| Tape | Tape Ochre Lit on tape wash | 4.5 | **6.20** |
| Strike | Struck Red Lit on strike wash | 4.5 | **5.45** |
| Erased | Chalk Secondary on ground | 4.5 | **6.19** |
| Blank | Chalk Secondary on tile (worst) / ground | 4.5 | **5.45** / 6.19 |
| Hollow | Struck Red Lit on tile (worst) / ground | 4.5 | **5.04** / 5.73 |

### TC-DS-005 · P0 · Negative — The banned action pairing never renders

**Preconditions:** any material; `/` open (its hero band is painted board in both
materials).

**Steps:**
1. Inspect the hero's primary action.
2. Read its label colour and its ground.

**Expected result:** the label is **Board Ground ink on Court Green Lit**
(`--primary-solid-foreground` on `--primary-solid`) at **6.82:1**. Chalk Ink on
Court Green Lit measures **1.92:1** and is banned — if the label resolves to
`--foreground` on the lit green, the case fails. This is the one pairing on the
public route that can be got wrong by an override, and the token layer already
pairs it correctly, so the case is watching for exactly that override.

### TC-DS-006 · P0 · Positive — The six marks survive colour removal

**Preconditions:** signed in as Adi; run once per material.

**Steps:**
1. Open `/dashboard` and paste the following in the browser console — it renders
   the six marks together, using the shipped variant classes from
   `src/components/ui/mark.tsx`, at label size and again enlarged:
   ```js
   (() => {
     const B = 'inline-flex w-fit shrink-0 items-center justify-center gap-1 rounded-[2px] px-2 py-[3px] type-label whitespace-nowrap';
     const K = [
       ['ink', 'border border-success-soft-border bg-success-soft text-success-soft-foreground', 'Confirmed'],
       ['tape', 'mark-torn pr-3.5 bg-warning-soft text-warning-soft-foreground', 'Pending'],
       ['strike', 'border border-destructive-soft-border bg-destructive-soft text-destructive line-through decoration-[1.5px]', 'Rejected'],
       ['erased', 'border border-transparent bg-board text-muted-foreground', 'Opted Out'],
       ['blank', 'border border-dashed border-rule text-muted-foreground', 'Unposted'],
       ['hollow', 'border-2 border-dashed border-destructive text-destructive', 'No-Show'],
     ];
     document.getElementById('mark-strip')?.remove();
     const h = document.createElement('div');
     h.id = 'mark-strip';
     h.className = 'bg-card';
     h.style = 'position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;gap:28px;padding:28px;height:max-content;width:max-content';
     const row = () => { const r = document.createElement('div'); r.style = 'display:flex;gap:16px;align-items:center';
       K.forEach(([k, c, l]) => { const s = document.createElement('span'); s.className = `${B} ${c}`; s.dataset.mark = k; s.textContent = l; r.appendChild(s); }); return r; };
     h.appendChild(row());
     const big = document.createElement('div'); big.style = 'zoom:2.4'; big.appendChild(row()); h.appendChild(big);
     document.body.appendChild(h);
   })();
   ```
2. Screenshot the strip.
3. Remove the colour: `$('#mark-strip').style.filter = 'grayscale(1)'`, and
   screenshot again.
4. Compare the two screenshots.

**Expected result:** in the greyscale screenshot all six marks are still tellable
apart, by **form** alone:

- **Ink** — solid 1px border around a filled rectangle.
- **Tape** — filled rectangle whose right edge is three ink teeth. The teeth
  read at label size, which is the point: the prototype found a torn edge cut out
  of the *fill* nearly invisible there, so the tear is drawn **in ink** instead
  (`src/app/styles/mark-forms.css`). Provisional (Tape) versus settled (Ink)
  must be distinguishable, and this edge is what distinguishes them.
- **Strike** — bordered rectangle with a line through the label.
- **Erased** — flat, ground-coloured, **no** border.
- **Blank** — **1px** dashed outline, no fill.
- **Hollow** — **2px** dashed outline, no fill.

Blank and Hollow are never interchangeable, so the dash weight is load-bearing:
if the two are indistinguishable in greyscale the case fails.

### TC-DS-007 · P1 · Positive — Lattice rules stay visible, enamel

**Preconditions:** signed in as owner; material = enamel.

**Steps:**
1. Open `/admin` (KPI lattice), `/admin/sessions` (table rules) and `/` (the
   activities lattice below the seam).
2. Read each 1px rule against the cell it borders, including a rule bordering a
   **wash** cell (the marks' fills are the lightest cells a rule touches).

**Expected result:** every rule clears **3:1** against its cell:

| Rule against | Target | Measured |
|---|---|---|
| tile (`--rule` on `--card`) | 3 | **3.72** |
| ground (`--rule` on `--background`) | 3 | **3.28** |
| tape wash — lightest wash | 3 | **3.56** |
| strike wash | 3 | **3.42** |
| ink wash | 3 | **3.36** |

A wrapper painted the rule colour to open hairline gaps between its children
(`bg-border` with `gap-px`, as in `src/components/ui/stat-card.tsx`) is **not** a
failure: the edge a person sees there is the wrapper against the surface outside
it, which is the `--rule` on `--background` row above.

### TC-DS-008 · P1 · Positive — Lattice rules stay visible, painted board

**Preconditions:** as TC-DS-007, material = painted board.

**Expected result:** every rule clears **3:1**:

| Rule against | Target | Measured |
|---|---|---|
| tile | 3 | **3.74** |
| ground | 3 | **4.25** |
| ink wash — worst case on this material | 3 | **3.37** |
| tape wash | 3 | **3.62** |
| strike wash | 3 | **4.04** |

### TC-DS-009 · P0 · Positive — The landing action is reachable without scrolling on a phone

**Preconditions:** signed **out**; viewport 390 × 844; run once per locale and
once per material.

**Steps:**
1. Open `/`.
2. Without scrolling, find the primary action.
3. Measure the bottom edge of the action against the viewport height.

**Expected result:** the action reads `Ask to join this community` (en) /
`Minta gabung ke komunitas ini` (id) and its bottom edge lands at **415px**, well
inside the 844px viewport, in both locales and both materials. Any value above
844 fails the case.

### TC-DS-010 · P1 · Positive — The fold law holds at 1440 × 900

**Preconditions:** signed out; viewport 1440 × 900; both locales.

**Steps:**
1. Open `/`.
2. Measure the primary action's bottom edge, then the **top edge of the second
   band** (the activities band below the seam).

**Expected result:** the action's bottom edge is at **556px**, and the second
band's top edge is at **770px** — above the 900px fold, which is the law that
replaces any `min-height` on a band (`DESIGN.md`, *The fold law*). A band sized so
the next band's top edge falls below 900px fails the case. At 390 × 844 the same
edge lands at **596px** (en) / **620px** (id), which is the Indonesian copy
running longer, not a defect.

### TC-DS-011 · P0 · Positive — The landing is keyboard-reachable with a visible focus ring

**Preconditions:** signed out; `/` open; either material.

**Steps:**
1. Press `Tab` repeatedly from the top of the document.
2. Note each stop and whether it paints a visible ring.
3. On the primary action, wait for the transition to settle before judging the
   ring — the button carries `transition-all` at **150ms**, so a ring read in the
   first frames still measures transparent.

**Expected result:** the tab order is theme toggle → locale → **primary action**
→ `Already a member? Sign in` → the band's second `Ask to join` link, every stop
matching `:focus-visible`. The primary action paints a **2px Court Green Lit ring
(`--ring`) offset 2px** by a board-coloured gap, which measures **6.82:1** against
the hero's ground — comfortably past the 3:1 that a non-text indicator needs. A
stop with no visible indicator fails the case.

### TC-DS-012 · P0 · Positive — The account-creation statement is present in both locales

**Preconditions:** signed out; `/` open; run once per locale.

**Steps:**
1. Read the sentence beneath the primary action.
2. Inspect the action and check what it is described by.

**Expected result:** the sentence is present and says that signing in **creates
an account** and that an organizer decides:

- en — “Signing in with Google creates your account the first time you do it, and
  asks an organizer to let you in. They decide, and you get an email when they
  do.”
- id — “Masuk dengan Google membuatkan akunmu saat pertama kali, dan mengajukan
  permintaanmu ke pengelola. Mereka yang memutuskan, dan kamu akan dapat email
  begitu itu terjadi.”

It renders at **Body** in secondary ink — never Caption, never the muted step —
and the action carries `aria-describedby="landing-hero-disclosure"`, so a screen
reader hears the condition and not just the label. A disclosure that is absent,
smaller than Body, or untied from the control fails the case.

### TC-DS-013 · P1 · Positive — The hero band is painted board in both materials

**Preconditions:** signed out; `/` open.

**Steps:**
1. With the material set to enamel, look at the hero band and at the identity
   rail above it.
2. Switch to painted board and look again.

**Expected result:** the hero band renders **painted board in both cases** — a
logged-out stranger has set no preference, so the band does not depend on one —
while the rail above it stays themed. The rail's bottom rule is the band's top
edge (one rule, not two), and where painted board returns to enamel at the
band's bottom there is **no** rule: the material change is the boundary. A hero
that follows the theme fails the case, and so does a rule at the bottom seam.

### TC-DS-014 · P0 · Negative — The Activity colour column is gone, and nothing renders in its place

**Preconditions:** signed in as owner for the admin surfaces, Adi for the member
surfaces; either material.

**Steps:**
1. Open `/admin/activities`, `/admin/sessions`, `/admin`, `/dashboard`,
   `/sessions`, a session detail page, and `/` — every surface that once carried
   an Activity colour.
2. Look at each Activity's livery.
3. Confirm no element carries an inline `background-color` or `border-color`.
4. Send a stray colour to the API, as a stale client would:
   ```js
   await fetch('/api/activities', { method: 'POST', headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ name: 'Colour Probe QA', slug: 'colour-probe-qa', minMembers: 2, maxPlayers: 8,
       sessionFee: 15000, monthlyFee: 50000, allowsMonthly: true, allowsPerSession: true, color: '#ff00ff' }) })
     .then(async (r) => [r.status, await r.json()]);
   ```
5. Delete the probe activity afterwards (`DELETE /api/activities/{id}` → `200`).

**Expected result:** every livery is a **magnet tile bearing the Activity's
initial** in ink — no coloured square, no edge stripe, and no broken, default or
placeholder swatch anywhere. No surface renders an inline background or border
colour. The create call returns **`201`** and the created row carries **no colour
field at all** (the column was dropped in
`prisma/migrations/20260819174507_drop_activity_color`), so a stray `color` is
silently ignored rather than stored. A swatch, an inline colour, or a `color` key
in the response fails the case.

### TC-DS-015 · P1 · Positive — No English leaks into the Indonesian build

**Preconditions:** locale = `id`; visit every surface this spec touched — `/`,
`/dashboard`, `/sessions`, a session detail page, `/payments`,
`/payments/upload`, `/profile`, `/admin`, `/admin/sessions`, `/admin/payments`,
`/admin/activities`, `/admin/members`.

**Steps:**
1. Read every visible string on each surface in `id`.
2. Compare against the same surface in `en`, and list the strings that are
   byte-identical in both.
3. For each identical string, check whether it is a dictionary entry
   (`src/lib/i18n/dictionaries.ts`) or a hardcoded literal.

**Expected result:** no user-facing string bypasses the dictionary. Strings that
are identical in both locales are only: the community name and other runtime
configuration, proper nouns (Activity names, session titles, member names,
venues, emails), numerals and Rupiah amounts, and the loanwords the Indonesian
dictionary deliberately keeps — `Dashboard`, `Status`, `Detail`, `Edit`,
`Filter`, `Slug`, `Export CSV`. Anything else identical across locales is a
hardcoded literal and fails the case. Mark labels in particular must switch:
`Unposted` → `Belum Dipasang`, `Confirmed` → `Lunas`, `Opted Out` → `Batal
Ikut`.

### TC-DS-016 · P1 · Positive — One lettering system, and tabular figures on every number that matters

**Preconditions:** both materials, both locales, across the surfaces listed in
TC-DS-015.

**Steps:**
1. On each surface, read the computed `font-family` of every text element.
2. Find every **time, count, capacity and Rupiah amount** — the day-of-month
   numeral in a session cell, `n/max` seat counts, session times, dues amounts,
   attendance percentages — and read its computed `font-variant-numeric`.

**Expected result:** exactly **one** family resolves everywhere —
`Archivo, "Archivo Fallback"` — with no serif, no second sans and no monospace
(`DESIGN.md`, *The One Hand Rule*). Every time, count, capacity and amount
carries `tabular-nums`. A phone number is none of those four and is out of scope
for this case.

### 16.17 Recorded run — 2026-08-20

Executed once against the §2 seed on Next.js 16.2.6, 1440 × 900 and 390 × 844,
both materials, both locales, 14 routes plus `/`.

| Case | Result |
|---|---|
| TC-DS-001 | **Pass** — 8/8 pairs clear AA; the Quiet-Ink-on-ground constraint holds, no surface puts `--subtle-foreground` on the ground |
| TC-DS-002 | **Pass** — 9/9 pairs clear AA |
| TC-DS-003 | **Pass** — all six mark pairs clear AA |
| TC-DS-004 | **Pass** — all six mark pairs clear AA |
| TC-DS-005 | **Pass** — the hero action resolves to board ink on lit green, 6.82:1 |
| TC-DS-006 | **Pass** — six marks tellable apart in greyscale on both materials; Blank ≠ Hollow by dash weight, Tape ≠ Ink by its ink teeth |
| TC-DS-007 | **Pass** — 5/5 rules clear 3:1 |
| TC-DS-008 | **Pass** — 5/5 rules clear 3:1 |
| TC-DS-009 | **Pass** — action bottom edge 415px of 844, both locales, both materials |
| TC-DS-010 | **Pass** — action 556px, second band top 770px, inside the 900px fold |
| TC-DS-011 | **Pass** — five stops, all `:focus-visible`; the hero ring paints once its 150ms transition settles |
| TC-DS-012 | **Pass** — statement present in both locales, tied by `aria-describedby` |
| TC-DS-013 | **Pass** — hero painted in both materials; no rule at the bottom seam |
| TC-DS-014 | **Pass** — no swatch and no inline colour on any surface; `POST /api/activities` with a stray `color` → **201**, response carries no colour field; probe deleted → **200** |
| TC-DS-015 | **Pass** — no hardcoded literal found; every cross-locale match is configuration, a proper noun, a numeral, or a dictionary-authored loanword |
| TC-DS-016 | **Fail on first run, then fixed** — see below |

**Defects found and fixed in code.** TC-DS-016 failed on three surfaces: the
day-of-month numeral that anchors a session cell rendered without
`tabular-nums`, so dates jittered column-to-column as the digits changed width —
`src/app/(main)/dashboard/page.tsx`, `src/app/(main)/sessions/page.tsx` and
`src/app/(admin)/admin/page.tsx`. Fixed by giving each numeral `tabular-nums`;
the case then passed everywhere. Nothing was softened in the case.

**Documented numbers that turned out wrong.** Three ratios in `DESIGN.md` came
from the prototype and do not match the shipped tokens. The measured values are
recorded above and corrected in `DESIGN.md`:

- Quiet Ink on Enamel Ground: documented 4.20:1, measures **4.17:1**. Both fail
  AA, so the routing rule it justifies is unchanged — only the number was off.
- Chalk Ink on Court Green Lit: documented 2.29:1, measures **1.92:1**. Still
  banned; the pairing is worse than recorded, not better.
- Court Green Lit on board tile: documented 5.9:1, measures **6.00:1**.

The `board-materials.css` comments, by contrast, matched the measurement exactly
at every value (rule 3.72 / 3.28 / 3.56 enamel and 3.74 / 4.25 / 3.37 board;
Chalk Quiet 4.70 / 5.35), as did every ratio in the `mark.tsx` header.

**Two marks ship with no producer.** `Erased` and `Hollow` have no live surface:
nothing records a No-Show yet, and the member session detail page filters
`ABSENT` rows out of the participant list, so Opted Out never reaches a mark
there. Both are covered above through the component (TC-DS-003, TC-DS-004,
TC-DS-006). When the admin spec wires up No-Show recording, TC-DS-003 and
TC-DS-004 gain a live surface for each and should name it.

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
  `dues unpaid` / `iuran belum dibayar` — Dues nobody has placed yet — and it is
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
  a countdown beside its **Blank** `Unpaid` / `Belum bayar` mark.
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
  mark reading `Pending` / `Menunggu Konfirmasi` with `Dues · {Month} {Year}` /
  `Iuran · {Month} {Year}` above the amount. `/dashboard`: the Badminton card's
  mark is `Pending` / `Menunggu Konfirmasi`, no longer the Blank `dues unpaid`.
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

**Preconditions:** TC-MS-016 has run and left one PENDING Badminton MONTHLY
Payment. Sign in as `owner@xclub.local` for steps 1–2, then back as Adi.

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

**Expected result:**

- `PATCH /api/payments/{id}` returns **200**. Rejecting an already-reviewed
  Payment would return **409**; rejecting with an empty reason is blocked
  client-side before it is sent (§8.4).
- The member's history row carries a **Strike** mark reading `Rejected` /
  `Ditolak` — a bordered rectangle with a real line through the label — and the
  **amount beside it is dimmed to Secondary Ink, not struck**: the mark carries
  the line, a second line through the value reads as damage to the row.
- Beneath it, in Secondary Ink and not in a surface-local status colour: the
  reason (`Reject reason: wrong amount` / the Indonesian equivalent), the refund
  guidance, and a WhatsApp link to the Admin. A rejected row with no reason, or
  with the reason in red, fails the case.
- The Badminton dues card is a **Blank** `Unpaid` / `Belum bayar` mark again and
  is a link to `/payments/upload` — a rejected Proof leaves the member with
  something to do, and the way to do it. On `/dashboard` the Badminton card's
  mark is `Rejected` / `Ditolak`, still a link to the uploader.
- **Capacity, from the database.** Rejecting the Dues releases every Seat that
  Payment was holding this period: every `REGISTERED` row of Adi's across
  Badminton's Sessions in that calendar month is deleted, so each of those
  Sessions' `seatsHeld` falls by exactly one and returns to its TC-MS-016
  "before" figure. `PRESENT` and `ABSENT` rows are untouched — a completed
  Session's history is never rewritten. Assert this on **Hold Lab** and on
  **Weekly Rally Night**: `mySeat` is `null` on both afterwards.

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
- Scrolled fully to the bottom, the last element of the page is still fully
  visible above the rail, and a tap on it activates it rather than a rail cell.
- The rail carries `pb-[max(env(safe-area-inset-bottom),0.375rem)]`, so on a
  device with a home indicator the labels are not under it. **(measure)** on a
  device or emulator that reports a non-zero inset, if one is available;
  otherwise record that the inset resolved to the 0.375rem floor.

---

### 17.8 Adi — the marks in both board materials

#### TC-MS-021 · P0 · Positive — Every mark a member can reach, on every member surface that shows state, in both materials

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
| **Tape** | `/sessions` standing column on a `MAYBE` row; `/payments` dues card and history on a Pending Payment; `/payments` outstanding-reservation row; `/dashboard` Activity mark; `/sessions` quota line when short | `Maybe` / `Mungkin`, `Pending` / `Menunggu Konfirmasi`, `In review` / `Ditinjau`, `Needs {n} more` / `Butuh {n} lagi` |
| **Strike** | `/sessions` standing column on **Rained Out (Cancelled)**; `/payments` history on a Rejected Payment (TC-MS-017) | `Cancelled` / `Dibatalkan`, `Rejected` / `Ditolak` |
| **Erased** | `/sessions` and `/sessions/{id}` note line after a withdrawal that forfeited Dues (TC-MS-010) | `Opted Out` / `Batal Ikut` |
| **Blank** | `/sessions` unposted standing slot and empty day; `/sessions` standing column on **Full Court Challenge**; `/payments` dues card when unpaid; `/dashboard` Activity mark when no Payment exists; `/profile` Membership row for an unpaid period | `Unposted` / `Belum Dipasang`, `None` / `Kosong`, `Full` / `Penuh`, `Unpaid` / `Belum bayar` |
| **Hollow** | **No producer.** Nothing in this product records a No-Show, and nothing infers one from a missing row. | `No-Show` / `Tidak Hadir` |

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
  `Confirmed` → `Lunas`, `Pending` → `Menunggu Konfirmasi`, `Rejected` →
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

### 17.10 Recorded run — **pending**

**This area has not been executed.** The cases above were authored against the
shipped code; the Result column below is for whoever runs them against a live
server, and is deliberately empty. A row filled in without a live run is worse
than no row at all.

| Case | Priority | Result |
|---|---|---|
| TC-MS-001 | P0 | |
| TC-MS-002 | P1 | |
| TC-MS-003 | P0 | |
| TC-MS-004 | P0 | |
| TC-MS-005 | P1 | |
| TC-MS-006 | P1 | |
| TC-MS-007 | P0 | |
| TC-MS-008 | P0 | |
| TC-MS-009 | P0 | |
| TC-MS-010 | P0 | |
| TC-MS-011 | P0 | |
| TC-MS-012 | P1 | |
| TC-MS-013 | P1 | |
| TC-MS-014 | P0 | |
| TC-MS-015 | P0 | |
| TC-MS-016 | P0 | |
| TC-MS-017 | P0 | |
| TC-MS-018 | P0 | |
| TC-MS-019 | P0 | |
| TC-MS-020 | P0 | |
| TC-MS-021 | P0 | |
| TC-MS-022 | P1 | |

**Regression net — the existing cases re-run, not rewritten.** These cover the
behaviour underneath this spec that it did not intend to change.

| Area | Result |
|---|---|
| §7 Session management (admin) — 1–11 | |
| §12 Member — dashboard & sessions — 1–9 | |
| §13 Member — payments & profile — 1–8 | |
| §16 Design system — TC-DS-001…016 | |

**Defects found and fixed in code.**

> _(One entry per failure: the case that caught it, what was wrong, the file
> fixed, and the ticket the defect came from. Nothing softened in a case.)_

**Not met.**

> _(One entry per acceptance criterion or coverage item not satisfied, and why.)_

### 17.11 Suspected defects, found by reading

Found while writing the cases above, not by running them. Each names the case
that should catch it, the ticket it came from, and how confident the reading is.
None of them was fixed here: this ticket authors cases, and fixing belongs with
the live measurement.

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
3. **`/sessions/{id}/pay`'s Amount field never got #54's read-only
   treatment.** It is a bare `Input` with `bg-muted` and no lock glyph, no
   Figure role and no `aria-describedby` tying its note to it, where
   `/payments/upload` has all four. Both are server-set amounts on the same
   product; two treatments for one state is the inconsistency #54 existed to
   remove, and this page was outside its scope. Caught by TC-MS-018 step 4.
   From #54 (scope), surfaced by #58's convention. Confidence: high — read
   directly from the source.
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
