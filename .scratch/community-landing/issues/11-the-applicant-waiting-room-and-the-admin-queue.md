# The Applicant's waiting room and the Admin's queue

Type: prototype
Status: resolved
Assignee: jefrykurniaone
Parent: ../map.md
Blocked by: 05

## Question

05 made joining approval-gated, which creates two surfaces that do not exist
today: `/pending`, where an **Applicant** waits, and the queue where an **Admin**
admits or declines them. 05 fixed the *mechanism* — `admittedAt` nullable,
decline is `isActive = false`, queue is `admittedAt IS NULL AND isActive`. It
did not decide what either surface looks like or says.

What do these two screens do?

Sub-questions:

- **`/pending` has one job and no controls.** A stranger who has just handed
  over their name and phone is looking at a page that gives them nothing. What
  stops it reading as a dead end — an expected wait time, the Admin's WhatsApp
  (`PRODUCT.md:44`), the Activities they picked, sign-out? Does it show the
  community's real sessions, or is that exactly the tease that annoys?
- **The declined state renders on the same route.** `isActive = false` with
  `admittedAt` null is a different message from "not yet". How blunt is it, and
  does it offer any recourse — or is WhatsApp the recourse?
- **Where does the Admin's queue live?** A fifth tab under `/admin`, a band at
  the top of `/admin/members`, or a badge on the existing roster with a filter?
  `/admin/members` already lists users, sorts on `isActive`, and has a per-row
  action component — reuse or a new surface?
- **What does the Admin see to judge on?** Name, phone, email, when they asked,
  which Activities they picked. Is that the row, or is there a detail view? A
  volunteer organizer deciding on a phone deserves a one-glance row.
- **Both surfaces are enamel, not board.** 01 decision 4 confines painted board
  to the landing hero. Neither of these is a marketing surface — they are the
  app, and they follow `DESIGN.md` as-is. Confirm no exemption is wanted.
- **Two audiences, two form factors** (`PRODUCT.md:16`): `/pending` is a
  stranger on a phone; the queue is an organizer on a desktop who may be on a
  phone. Neither may break on the longer Indonesian string.

Use `/prototype` — "what does a waiting room that doesn't feel like a rejection
look like" is a question to answer by making something, not by arguing.

## Prototype (asset — **B won on both surfaces**)

Built per `/prototype`, UI branch: **two throwaway routes, three structurally
different variants each**, switchable from a floating bar (dev-gated, hidden in
production builds). `←` / `→` cycle variants; the bar also carries the toggles
each surface needs.

**The Applicant's waiting room** — `/prototype/pending?variant=A|B|C`, with
`&state=waiting|declined` and `&lang=en|id`.

- **A — Receipt tile.** A `40rem` single-task column, ruled lattice, Tape mark.
  Echoes back exactly what they handed over: name, WhatsApp, email, when they
  asked, the Activities they picked. Argues the cure for a dead end is
  *evidence* — proof the request landed. No sessions shown.
- **B — Interstitial.** Vertical-centred, owns the viewport (legal under
  `DESIGN.md:215`, which reserves vertical centring for exactly this).
  One mark, one Display statement, one line, WhatsApp as the primary action,
  sign-out beside it. No data echo at all. Argues brevity, and that replaying a
  form back at someone is filler.
- **C — Waiting room with the board visible.** Status strip, then the
  community's next three real `SCHEDULED` sessions as ruled rows — Activity,
  date, time, default location, each carrying a **Blank** mark reading "Not
  yours yet". Argues the cure is showing what they are waiting *for*, and puts
  the tease question on screen where it can be judged instead of argued.

**The Admin's queue** — `/admin/prototype-queue?variant=A|B|C`, with
`&filter=` and `&lang=en|id`. Mounted inside the real admin group, so it renders
with the real sidebar, real auth, and real user rows.

- **A — Band above the roster.** Queue as a ruled band on the members surface,
  roster untouched below. No new route, no sixth nav item.
- **B — Its own surface.** Queue-only page (the fifth-tab shape), including what
  the empty state costs on the days nobody has asked.
- **C — One register, filtered.** Single table, state column, All / Waiting /
  In / Declined filter, row action swapping to Admit/Decline for waiting rows.

### How each variant renders the declined state

A flips its Tape mark to **Strike** and dims the echoed values (per
`MarkedValue`'s rule — the mark carries the strike, the value recedes), and
promotes WhatsApp from quiet to primary. B keeps its shape and swaps mark, title
and lead. C **drops the schedule band entirely** — a tease is only defensible
while there is still something to wait for. That is itself a decision on screen.

### What the prototype is honest about

- **Nothing writes.** `User.admittedAt` does not exist yet (05 specified it; no
  migration has run), so "waiting" is synthesised — on `/pending` from the
  signed-in user, in the queue from the newest profile-complete non-revoked
  `MEMBER` rows, with revoked users standing in for declined ones. Admit and
  Decline are stubs that record intent inline.
- **Copy is local, not dictionary.** Both locales live in each route's
  `proto-copy.ts` so `&lang=id` proves the longer Indonesian survives every
  layout before any string earns a `dictionaries.ts` entry. The `id` strings are
  deliberately long-form, not clipped.
- **Not rendered in a browser yet.** `npx tsc --noEmit` and `eslint` are clean
  on all six files, but the dev server could not bind in the session that built
  this, so no variant has been *seen*. Run `npm run dev` and open the URLs above.
- **Not committed to a throwaway branch,** against `/prototype`'s capture rule:
  the working tree carries uncommitted work from concurrent sessions on this map
  (`map.md`, `src/app/page.tsx`, `dictionaries.ts`), so branching would either
  sweep their WIP or leave `HEAD` off `main` underneath them. The files are
  additive and marked `PROTOTYPE — throwaway` in every header; move them to a
  branch once the tree is quiet.

### Files

- `src/components/prototype/prototype-switcher.tsx`
- `src/app/prototype/pending/{page.tsx,variants.tsx,proto-copy.ts,sign-out-link.tsx}`
- `src/app/(admin)/admin/prototype-queue/{page.tsx,variants.tsx,proto-copy.ts,stub-actions.tsx}`

### Sharpened by building it — what the reaction has to settle

1. **Does `/pending` echo the request back (A/C) or say one thing and stop (B)?**
2. **Does it show the schedule (C only)?** And if it does, is the Blank
   "Not yours yet" mark honest framing or a taunt?
3. **Is the Applicant inside or outside 04's allow-list?** 04 withheld the
   per-session `location` and all admin free text from `/` because it is
   *unauthenticated*. An Applicant is authenticated but not admitted — a third
   audience nothing has ruled on. C currently shows the Activity's
   `defaultLocation` and never the per-session override, and shows no session
   `title` and no `notes`, i.e. it treats an Applicant as a stranger. Confirm or
   reverse; whichever way, it constrains what `/pending` may query.
4. **Where does the queue live?** A costs nothing and hides the queue inside a
   busy page; B is findable and gives the admission email a sibling but adds a
   sixth nav item that is empty most days; C avoids a second surface but makes
   the roster carry four states at once.
5. **Does the queue reuse `/admin/members`' table or get its own row?** The
   prototype does not reuse it: the roster row leads with attendance and payment
   counts, which are always `0` for an Applicant, and omits `phone`, which is
   the one field 05 made the Admin judge on. Reuse would mean changing the
   roster's columns for everyone.
6. **The badge is already precedented.** `pendingPayments` flows
   layout → `getAdminNav` → sidebar/mobile-nav as a `--warning` pill
   (`src/app/(admin)/layout.tsx:30`, `src/components/layout/nav-items.ts:63`).
   An `AdminNavBadges.waitingApplicants` field is a two-line change and needs no
   new mechanism — but it only has somewhere to point under B, or at a filtered
   URL under C.
7. **Enamel confirmed, no exemption taken.** Both surfaces are the app, not
   marketing: no painted board, no `type-hero`, `2/10/16/28` spacing, `2px`
   corners, marks by form. Confirm that is what you want, per 01 decision 4.

## Answer

**B on both surfaces.** `/pending` is an **interstitial that says one thing and
stops**; the admin queue is **its own surface with its own nav item**. Chosen by
the human from the prototype above.

### Decisions

1. **`/pending` is an interstitial, not a receipt.** Vertical-centred, owning the
   whole viewport under the identity rail — the one placement `DESIGN.md:215`
   already reserves for interstitials, so this needs no layout amendment (03's
   band-stack category is `/`'s alone). One mark, one statement, one lead line,
   one primary action. Rejected **A (receipt tile)**: replaying the form back at
   someone is filler, and a stranger who has just handed over a name and a phone
   number does not need to be shown their own phone number.

2. **The page echoes nothing back — not the profile, not the Activities picked.**
   This is the substantive cost of B and it is accepted: the Applicant gets no
   on-screen proof their request landed. What carries that job instead is 05's
   pair — the gate is **disclosed before the click** (dec 8), so nobody arrives
   here surprised, and **admission is emailed** (dec 7), so the wait has a real
   terminator. A receipt page would be a third, weaker copy of the same
   reassurance.

3. **`/pending` shows no community data at all.** No sessions, no Activity list,
   no counts. Beyond the community name and the organizer's WhatsApp — both from
   `Settings` — the route queries **nothing**. Rejected **C**: a schedule the
   reader cannot act on is a tease, and the "Not yours yet" mark C used to make
   it honest just labels the frustration rather than removing it.

   This also **closes 04's boundary question by making it moot**, which is the
   cleaner outcome: an Applicant is authenticated but not admitted — a third
   audience 04 never ruled on — and B means no ruling is needed, because
   `/pending` reads no `Activity`, `ActivitySession`, `Membership` or `User`
   data. **Standing rule: `/pending` may query `Settings` and the session's own
   identity, nothing else.** Any future addition reopens the boundary question.

4. **One job, no controls.** The affordances are exactly two: **message an
   organizer** (WhatsApp, `Settings.adminWhatsapp`, the incumbent channel per
   `PRODUCT.md:44`) and **sign out**. The ticket asked what stops the page
   reading as a dead end — the answer is *the door out and a human to talk to*,
   not more content.

   Consequently an Applicant **cannot revise their request while waiting** — no
   editing name, phone, or Activity picks from `/pending`. Revision is a
   conversation with the organizer, who is one tap away and holds the decision
   anyway. This is not fog: it is this ticket's scope and it is decided.

5. **Declined renders the same shape, differently marked.** Same interstitial;
   the **Tape** mark becomes **Strike**, the title and lead say plainly that an
   organizer reviewed the request and did not admit them, and WhatsApp is
   promoted from quiet to primary. **There is no in-app recourse** — no appeal
   button, no re-apply flow. WhatsApp *is* the recourse, and it is honest: the
   organizer decided and the organizer can change their mind. (Note the mark
   pair is doing real work here — Tape is *provisional and held*, Strike is
   *void*, and per the Mark-Not-Hue Rule the two are tellable apart with colour
   removed.)

6. **The admin queue is its own surface: a new admin nav item.** Rejected **A
   (band on `/admin/members`)** — the queue is where new people are let into the
   community and it should not be something you find by scrolling past a roster.
   Rejected **C (one filtered register)** — it makes the roster carry four
   states at once, and the filter that matters is then one URL among four rather
   than a place. Accepted cost of B: on most days the surface is **empty**, so
   the empty state is part of the design, not an afterthought — a **Blank** mark
   plus one line ("Nobody is waiting"), Blank being precisely *expected but not
   yet placed*.

7. **The badge needs no new mechanism, and B is what gives it a destination.**
   `pendingPayments` already flows `(admin)/layout.tsx:30` → `getAdminNav`
   (`nav-items.ts:63`) → sidebar and mobile nav as a `--warning` pill.
   `AdminNavBadges` gains `waitingApplicants`, counted with 05's queue query
   (`admittedAt IS NULL AND isActive`), and the new nav item carries it. This
   discharges 05 dec 7's "the Admin gets a queue badge rather than mail per
   signup" with a two-line change. The item sits **directly above Members** —
   it feeds that register, and it is not a settings-tier concern.

8. **The queue row is its own row; `/admin/members` is left alone.** Reuse was
   rejected on the evidence: the roster row leads with attendance and payment
   counts, which are always `0` for an Applicant, and omits `phone` — the one
   field 05 dec 2 made the Admin judge on. The queue row is one glance:
   **name**, email beneath it, **phone as a `wa.me` link**, the **Activities
   they picked**, **how long they have waited**, then **Admit / Decline**.
   Reusing the roster would have meant changing its columns for everyone to suit
   a surface that shows at most a handful of rows.

9. **Both surfaces are enamel; no exemption is taken** — confirmed against 01
   decision 4. No painted board, no `type-hero`, no marketing devices. Enamel
   material, `2px` corners, `2/10/16/28` spacing, ruled lattice, Six Marks by
   form, `DESIGN.md` as-is. `/pending` sits in the `40rem` single-task column
   width (`DESIGN.md:215`), the queue in the admin shell's normal density.

10. **Form factors hold.** `/pending` is a stranger on a phone and carries one
    statement plus two actions, which is the easiest thing on this map to keep
    unbroken at any width. The queue is an organizer who may be on either, so
    its rows wrap rather than scroll horizontally, and the row's five fields are
    ordered so the two that decide anything — name and phone — come first.

### Handed to other tickets

- **08 — already closed while this ticket was being worked, and it lands
  compatibly.** 08 gave `/pending` a **top-level `pending` namespace** in the
  dictionary and ruled that the dictionary authors everything with no `Settings`
  key, which is exactly what these two surfaces need. So no open ticket owns the
  wording: the strings are execution under 08's rules, into `pending` for the
  waiting mark/title/lead, the declined mark/title/lead and the WhatsApp and
  sign-out labels, and into the existing `nav` / `admin` namespaces for the new
  nav item's label, the queue's head/hint/empty-state, and **Admit / Decline** as
  the action pair (`Terima` / `Tolak` in the prototype). The prototype's `id`
  strings are deliberately long-form and stand as the length budget to hold to.
- **09** — no new `CONTEXT.md` vocabulary beyond what 05 already sends
  (**Applicant**, **Admit** / **Decline**). No `DESIGN.md` amendment is needed:
  decision 1 uses the interstitial clause that already exists, and decision 9
  takes no exemption. Worth one line in `PRODUCT.md` alongside 05's joining
  policy: the Applicant waits on a page that shows no community data.

## Built — B folded in, prototypes dropped

Both surfaces exist. The six prototype files are deleted: the winner is folded in
per `/prototype`, and `src/components/prototype/prototype-switcher.tsx` stays
because the landing prototype still uses it.

- **`/pending` (dec 1–5)** — `src/app/pending/{page.tsx,sign-out-action.tsx}`.
  Interstitial in the `40rem` column under an identity-only rail; one mark, one
  statement, one lead, two affordances (`wa.me` from `Settings.adminWhatsapp`,
  and sign out). It reads `Settings` and the signed-in person's own admission
  state and **nothing else** — the standing rule is written into the file's
  header so a future addition has to argue with it. Three statements, not two:
  waiting takes **Tape**, declined takes **Strike**, and a *revoked* member —
  who lands here too — gets their own Strike-marked pair, because "we did not
  admit you" is false for someone who was already in.
- **The queue (dec 6–8)** — `src/app/(admin)/admin/applicants/`, its own nav item
  directly above Members (`nav-items.ts`, `UserPlus`), with the row: name, email
  beneath, phone as a `wa.me` link, Activities picked, how long they waited, then
  Admit / Decline. `/admin/members` untouched. Empty state is a **Blank** mark
  plus one line. One deliberate addition the prototype did not have: the list is
  capped at 100 rows with the cap stated on screen (`applicantsCapped`), because
  a public page can point more people at this queue than one screen holds and
  silent truncation would read as "nobody else is waiting".
- **The badge (dec 7)** — `AdminNavBadges.waitingApplicants`, counted in
  `(admin)/layout.tsx` with 05's `WAITING_APPLICANT_WHERE` and threaded through
  sidebar and mobile nav. Verified showing `1`, and clearing on Admit.
- **Copy (08's rules)** — a top-level `pending` namespace and flat
  `admin.applicant*` keys, both locales, from the prototype's `id` strings.

**Rendered in a browser, which this ticket left owed.** en and id, 420px and
1280px: the Indonesian Display title holds at two lines with no overflow, the
declined Strike mark reads as void with colour removed, the queue row wraps
instead of scrolling on a phone, and the empty state was seen for real by
admitting the only Applicant. Screenshots:
`.scratch/community-landing/assets/05-11-*`.
