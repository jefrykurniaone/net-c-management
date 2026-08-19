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
