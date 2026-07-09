# Manual Testing Guide

Step-by-step guide to exercise every feature flow — happy paths **and** edge
cases — against the seeded local database. Covers the defects and observations
found in QA (BUG-01…04, OBS-01…07) and all seven email flows.

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
