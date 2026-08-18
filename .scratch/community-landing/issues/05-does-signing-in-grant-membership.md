# Does signing in from the public page make you a member?

Type: grilling
Status: resolved
Parent: ../map.md
Blocks: 06, 08, 10

## Question

Today, any Google account that signs in becomes a `User`, is sent to
`/onboarding`, and picks Activities to join — a fully self-serve path that
existed safely only because nobody who wasn't already invited would ever see the
page. Advertising `/` to strangers turns that quiet path into the front door.

Is self-serve joining what this community wants?

Sub-questions:

- Was the open door **intended** or merely **unobserved**? Nothing in
  PRODUCT.md or CONTEXT.md states a joining policy. This ticket has to author
  it, then get it into PRODUCT.md via 09.
- If joining stays open: what stops a stranger from occupying a `Seat` in a
  small paid community? `PRODUCT.md:43` says a seat is money-backed, which is a
  real gate — is it gate enough?
- If joining should be gated: what is the gate — admin approval of a new
  `User`, an invite code, or a `Membership` that an Admin must grant? Each is a
  schema and flow change, and each turns this map's CTA into "ask to join"
  rather than "join".
- `CONTEXT.md:10` — "Whether they may sign in at all is a property of the User."
  Does a mechanism for that already exist in the schema, or is it aspirational
  language?
- Third possibility: the public page is **informational only** — it sells, and
  the actual joining happens through WhatsApp with an admin
  (`PRODUCT.md:44`, the incumbent channel). Rule it in or out here.

## Answer

**Joining becomes approval-gated.** Signing in makes you an **Applicant**, not a
Member. An Admin admits you. The public page says so *before* the click.

### Premise corrections

Two of the ticket's premises were wrong, and both changed the shape of the answer.

- **`CONTEXT.md:10` is not aspirational — it is half-built.** `User.isActive`
  exists (`schema.prisma:104`), ships an admin control
  (`api/users/route.ts:111`, `admin/members/member-actions.tsx:62-72`), and is
  carried into the auth session (`lib/auth.ts:40`). **Nothing reads it.** There
  is no `signIn` callback and `proxy.ts` never checks it, so a deactivated user
  still signs in and reaches `/dashboard`. The gate this ticket asked whether to
  build is already half-installed and silently inert. That is a live defect
  independent of any landing page.
- **"A money-backed Seat is the gate" is false.** The money gate covers the
  **Seat**, never the **Membership**. `ensureMembership` (`lib/activity.ts:38`)
  creates a `Membership` free and unreviewed — from `/onboarding` *and* from the
  session-register path, so a `User` auto-joins an Activity merely by
  registering. A free Membership already reads the Activity's bank name, account
  number, and holder on `/payments/upload`. Advertising `/` under the status quo
  publishes the community's bank details to any Google account on the internet.

So the real question was never "add a gate or don't" — it was **finish the gate
that is already half-installed, or delete it.** It gets finished.

### Decisions

1. **The joining policy is approval-gated.** Sign-in is open to anyone; being
   *in* is not. Rejected **open self-serve** for the bank-details exposure
   above. Rejected **Admin-granted `Membership`** — it kills self-serve
   onboarding and the register-path auto-join, a schema-and-flow rewrite well
   past this map's destination. Rejected **informational-only / join over
   WhatsApp** — it throws away the one thing a landing page is for, and the
   incumbent channel (`PRODUCT.md:44`) stays available regardless.

2. **Profile first, admission second.** Sign in → complete name and phone →
   pick Activities → wait. The Admin judges a person with a phone number, which
   *is* the identity check in a WhatsApp-run community; an email address alone
   is not a decision. Nothing in onboarding grants access on its own once the
   gate sits on the User — `isProfileComplete` and `Membership` rows are inert
   while the door is shut. **Accepted consequence:** an Applicant's `Membership`
   rows exist before admission, so any count reading memberships includes people
   who are not in yet. That is a display problem for the surfaces that count
   (see the map's *Not yet specified*), not a reason to invert the order.

3. **"Never admitted" gets its own state: `User.admittedAt`, nullable.**
   `isActive` keeps exactly its current meaning — an Admin revoked this person.
   Collapsing both facts into one boolean would make the admin roster unable to
   tell three people waiting at the door from two people who were thrown out,
   which is precisely the distinction an approval queue is made of. Existing
   rows backfill `admittedAt = createdAt`, so nobody currently signed in is
   affected. Rejected a `PENDING`/`ACTIVE`/`SUSPENDED` enum: cleaner in the
   abstract, but it rewrites every `isActive` read across `payments.ts`,
   `activity.ts`, and the admin surfaces for no gain this map needs. The
   timestamp also records *when* someone was let in, which a boolean discards.

4. **The word is Applicant; the act is Admit.** An **Applicant** is a User who
   has signed in and completed their profile but has not been let into the
   community. The Admin **admits** or **declines** them. The field is
   `admittedAt`, not `approvedAt`, because `CONTEXT.md:83` reserves
   `Confirm`/`Reject` for the Admin's act on a **Payment** and explicitly bans
   "approve" — naming the column `approvedAt` would write a forbidden word into
   the schema permanently. "Applicant" also carries the right implication:
   someone who has *asked*, which is exactly what the new CTA produces.
   New terms go to `CONTEXT.md` via ticket 09.

5. **Declining is `isActive = false` with `admittedAt` still null.** The admin
   queue is `admittedAt IS NULL AND isActive`, so a declined Applicant drops out
   of it and their waiting page says the door is closed. Rejected **no decline
   at all** — with a public page the queue would never clear and would be
   useless within a month. Rejected **deleting the User row** — it destroys the
   record of who asked, and the same Google account can sign in again and
   reappear, so deletion is not a gate.

6. **Applicants wait at a dedicated `/pending` route.** `proxy.ts:40` already
   bounces a profile-complete user *off* `/onboarding` toward `/dashboard`, for
   a good reason (an empty form would overwrite a saved profile), so reusing
   onboarding's post-submit state means unpicking a deliberate redirect. A
   dedicated route also gives the admission email an honest destination.

7. **The Applicant is emailed on admission; the Admin gets a queue badge, not
   mail per signup.** The admission email is non-negotiable — the Applicant has
   closed the tab and has no reason to ever return without one, and a landing
   page that converts into silence is worse than no landing page. A per-signup
   admin email is how a volunteer organizer learns to filter this app into a
   folder; a count badge on `/admin` costs nothing and is seen when they are
   already there. WhatsApp stays the incumbent nudge (`PRODUCT.md:44`).

8. **The gate is disclosed before the click, not after.** The CTA and its
   surrounding copy make clear that joining is a request an organizer reviews.
   Rejected revealing it on `/pending`: it converts better and it lies — a
   stranger who signs in with Google expecting access and lands in a waiting
   room has been tricked into handing over an email address. It is also the
   friendlier truth for this product; "an organizer will let you in" is what an
   amateur community *is*, and it matches the WhatsApp reality members already
   live in. **Binding on ticket 06** — not a free choice there.

9. **Enforcement is three-layered: middleware redirect, layout guard, and a
   shared `requireAdmitted()` at the API boundary.** Middleware alone has a
   documented hole: `proxy.ts:19-24` lists only `/dashboard`, `/sessions`,
   `/payments`, `/profile`, `/admin` as protected, so API routes are matched by
   the config but fall outside the check and are guarded only by their own
   `auth()` calls — a middleware-only gate would redirect an Applicant away from
   `/sessions` while leaving `POST /api/sessions/[id]/reserve` reachable.
   Rejected enforcing in the NextAuth `session` callback: it fails closed
   everywhere, which is attractive, but it makes the Applicant invisible to
   `/pending` — you cannot render "waiting to be let in" for someone the auth
   layer refuses to acknowledge. Three layers matches how the codebase already
   stacks auth (`CLAUDE.md`: middleware + layout guards) and adds the third
   where the money is.

### Facts established (no decision needed)

- **Bootstrap survives the gate.** The production OWNER is made by signing in
  first and *then* running `db:seed:prod` / `db:promote:prod`, which sets
  `role: 'OWNER'` **and `isActive: true`** explicitly (`prisma/seed-prod.ts:115-120`,
  `prisma/promote-owner.ts`). No chicken-and-egg — but both scripts, plus
  `prisma/seed/core.ts:42`, **must also set `admittedAt`**, or the first admin
  locks themselves out.
- **`PRODUCT.md:71` is stale.** It states no email, SMS, or push channel exists.
  `src/lib/email/` ships Gmail SMTP with bilingual templates and five live
  triggers. Decision 7 depends on that channel; the correction goes to ticket 09
  regardless.
- **The gate needs no new admin surface primitives.** `/admin/members` already
  lists users, sorts on `isActive`, and carries a per-row action component.

### Handed to other tickets

- **06** — the CTA must read as a *request*, disclosed before the click
  (decision 8). "Continue with Google" as the primary label is now dead: it
  promises access the page cannot grant.
- **08** — new bilingual strings: the CTA and its disclosure, the `/pending`
  page, the declined state, the admission email, the admin queue.
- **09** — amendments: `CONTEXT.md` gains **Applicant** and **Admit / Decline**,
  and `CONTEXT.md:10` becomes enforceable rather than decorative; `PRODUCT.md`
  gains the joining policy as a durable constraint and corrects `:46` ("Google
  is the only way in" → and an Admin admits you), `:53`, and the stale `:71`.
- **10** (new) — what the Applicant sees at `/pending` and what the Admin sees
  in the queue. The two surfaces this gate creates, and the only part of it that
  still has design decisions in it.

### Why there is no separate "wire the gate" ticket

The human ruled the unenforced `isActive` **in scope** for this map rather than
a separate defect. That scope is discharged *here*: decisions 3, 5, 6, 9 plus
the bootstrap fact are a complete mechanism spec — state, queue query, route,
enforcement layers, seed-script obligation, backfill. Nothing about the
mechanism remains to *decide*, so a ticket for it would be an execution ticket,
and this map's destination is decisions, not the diff. It ships with the map's
handoff alongside every other decision recorded here.
