# Divergence-Hunt Review — ARCHITECTURE-SPINE.md

**Reviewer lens:** divergence hunt only. For each finding I construct two concrete units one level down (two stories / two builders) that each obey **every** AD to the letter, yet still produce **incompatible** artifacts. Each such pair is a hole the spine must close with a new or tightened AD.

**Target:** `_bmad-output/planning-artifacts/architecture/architecture-net-c-management-2026-06-30/ARCHITECTURE-SPINE.md`
**Grounded against:** PRD + addendum, UX `DESIGN.md` / `EXPERIENCE.md`, and live code (`prisma/schema.prisma`, `src/app/api/sessions/[id]/attendance/route.ts`, `src/app/api/payments/route.ts`, `src/app/api/payments/upload/route.ts`, `src/app/api/payments/[id]/route.ts`, `src/lib/ekskul.ts`, `src/lib/validations/*`).

---

## Verdict: MANY HOLES

The spine is strong on *structure* (AD-1..AD-3, AD-9..AD-11 are genuinely binding and adopted-in-code). It is weak on the *money state machine* it was created to introduce. The three genuinely-new ADs (AD-4/5 payment model, AD-6 pre-pay, AD-7 mode) each pin a noun but leave the **verbs, the temporal key, and the failure/cascade paths** open — and several leave them open in ways two reasonable builders will resolve incompatibly. Worse, two pairs of ADs are mutually **contradictory as written** (AD-4 upsert vs AD-5 partial index; AD-7 immutable-current-period vs AD-7 single-mutable-column). These aren't taste differences; they are forks that will be discovered at integration or, worse, in production money math.

Below, holes are ordered by blast radius.

---

## H1 — SESSION payment `month`/`year` shape is unspecified → incompatible ledgers and stat rollups

**ADs touched:** AD-4, AD-5. **Severity: HIGH.**

`Payment.month` and `Payment.year` are **non-null `Int`** today (`schema.prisma:195-196`). AD-4 says "extend `Payment` … add `type` and nullable `sessionId`" and "per-session charges reuse the same … columns." AD-5 governs uniqueness. **Neither AD says what `month`/`year` hold for a `SESSION` row.** That single omission forks the build:

- **Builder A (per-session-billing story):** makes `month`/`year` **nullable** and writes `NULL` for SESSION rows (a session charge isn't a calendar-month dues row). Obeys AD-4 (one model, `type`+`sessionId`), AD-5 (partial unique `WHERE type='MONTHLY'` still sees non-null month/year on monthly rows; `@@unique(userId, sessionId)` covers session rows).
- **Builder B (per-session-billing story, sibling):** keeps `month`/`year` **non-null** and **derives them from `ActivitySession.date`** for SESSION rows (avoids touching nullability of the legacy column). Also obeys AD-4 and AD-5 verbatim.

**Incompatible outputs — same data, different truth:**
- `GET /api/payments` filters on `month`/`year` (`payments/route.ts:24-29,46-47`). Under A, a SESSION payment **never** matches a month filter (NULL); under B it **always** appears in its session's month. The member's "Payments — history" per-month grouping and the admin "Confirmed (month)" stat card (`EXPERIENCE.md` admin dashboard) produce **different totals** depending solely on which builder wrote the row.
- A reporting/export story (`payments/export`) summing "this month's confirmed dues" double-counts (B) or under-counts (A) per-session income.

**Close it:** add/tighten an AD that **pins the SESSION row's temporal shape**. Recommended: make `month`/`year` nullable and **NULL for SESSION**; state explicitly that monthly-period rollups and the `month`/`year` GET filter apply to MONTHLY rows only, and that per-session income is rolled up via `sessionId`→`ActivitySession.date`. (Either choice works; the spine must pick one, because the two choices are observably different in every rollup.)

---

## H2 — AD-4 "reuse the same upsert flow" directly contradicts AD-5 "partial unique via raw SQL"

**ADs touched:** AD-4, AD-5, AD-12. **Severity: HIGH (internal contradiction, not just divergence).**

The live monthly flow is `prisma.payment.upsert({ where: { userId_ekskulId_month_year: {...} } })` (`payments/upload/route.ts:92-119`). Prisma `upsert` **requires a named unique constraint** present in the schema as its `where` target. AD-5 **drops** `@@unique([userId, ekskulId, month, year])` and replaces it with a **partial** unique index created out-of-band via raw SQL (AD-12). A raw-SQL partial index is **invisible to the Prisma client** — it cannot be an `upsert`/`where`-unique target. So AD-4 ("reuse the same upload→**upsert**→confirm flow") cannot hold once AD-5 lands.

**Divergence pair:**
- **Builder A (monthly story)** keeps the `upsert` call. To compile, they must re-add `@@unique([userId, ekskulId, month, year])` — **re-introducing exactly the unconditional unique AD-5 exists to kill** (it would still block a second SESSION payment? no — but it blocks nothing useful and re-creates the legacy constraint AD-5 forbids).
- **Builder B (monthly story)** replaces `upsert` with `findFirst(type=MONTHLY,…)` → `update` else `create`. This compiles and respects AD-5, but introduces a **check-then-act race**: two concurrent uploads both find nothing, both `create`, the second hits the partial index → unhandled `P2002` → 500.

Both "obey" the ADs as literally readable, yet produce different schemas and different runtime behavior, and one of them silently reverts AD-5's whole point.

**Close it:** tighten AD-4/AD-5 to **state the monthly write pattern explicitly under a partial index**: no `prisma.upsert` on the monthly key; use "find-existing-MONTHLY-then-update-else-create, catching the partial-index unique violation and falling back to update." Make clear the **DB partial index is the authority**, the application code is advisory. Without this, every builder re-derives it differently.

---

## H3 — AD-7 "current period immutable" is unsatisfiable by AD-7's own "single mutable column"; and "billing period" is undefined

**ADs touched:** AD-7 (and AD-6, which *reads* the effective mode). **Severity: HIGH.**

AD-7 binds two things that cannot both be true with the storage it sanctions:
1. **Rule:** "A mode change takes effect the **next** billing period; the current period's mode is **immutable**."
2. **Assumption (sanctioned):** "a single mutable column applied going-forward is sufficient for v1."

A single mutable `Membership.paymentMode` column has **no effective-date and no pending-value**. The instant it is flipped, every not-yet-registered session in the *current* period reads the new mode — so the current period is **not** immutable. You cannot express "immutable now, change next period" without at least a `pendingMode` + `effectiveFrom` (or an effective-dated row). The rule and the sanctioned shape contradict.

Compounding it, **"billing period" / "current period" is never defined.** AD-5's monthly partial unique on `(userId, ekskulId, month, year)` *implies* calendar month, but AD-7 never points at it.

**Divergence pair (even setting the contradiction aside):**
- **Builder A (mode-switch story)** reads "billing period" = **calendar month**; a switch on 15 Mar is effective 1 Apr.
- **Builder B (mode-switch story)** reads "billing period" = **join-anniversary cycle** (`joinedAt` + N months); switch effective at next anniversary boundary.

Then **Builder C (the AD-6 registration story)** computes "effective mode for this session." For a 20 Mar session it gets **MONTHLY** under A but possibly **PER_SESSION** under B — so the member is charged-at-register under one build and registers-free under the other. The money owed for the identical action diverges.

**Close it:** AD-7 must (a) **define "billing period" = calendar `(month, year)` as keyed by AD-5**, evaluated against the session's date; and (b) **resolve its own contradiction** — either drop the "current period immutable" rule for v1 (mode applies immediately) *or* mandate a `pendingMode`/`effectiveFrom` shape now (don't defer the shape while binding an immutability rule the deferred-simplest shape can't honor). As written, the Deferred section punts the storage shape while AD-7 binds a guarantee that shape cannot deliver.

---

## H4 — Pre-pay (AD-6): no owning endpoint, no ordering/atomicity, and capacity authority is unpinned → overbooking + orphaned payments

**ADs touched:** AD-6 (and AD-1). **Severity: HIGH.**

Registration and proof-upload are **two separate endpoints today**: `POST /api/sessions/[id]/attendance` (creates Attendance) and `POST /api/payments/upload` (creates Payment + uploads to Supabase). AD-6 says "a `REGISTERED` Attendance … requires a matching SESSION Payment at status ≥ PENDING" and "secured at proof upload," but **does not say which endpoint owns the combined operation, in what order, or whether it is atomic.**

**Divergence pair:**
- **Builder A (registration story)** modifies the **attendance** route: for PER_SESSION members it **refuses** to create Attendance unless a matching SESSION Payment already exists (proof-first). Order: Payment → Attendance, two client round-trips.
- **Builder B (upload story)** modifies the **upload** route: creating a SESSION Payment **also upserts** the REGISTERED Attendance (slot secured at upload, exactly as AD-6 says). Order: Payment+Attendance in one route; the attendance route rejects PER_SESSION direct calls.

Both satisfy "slot secured at proof upload." But the **client contract differs** (a "Register & pay" button wired for A double-fires or no-ops against B), and the **failure modes differ**:

- **Capacity authority is unpinned.** Capacity is enforced by counting **Attendance** rows (`attendance/route.ts:47`). If the slot is "secured at upload" but Attendance is written in a separate step (A), two PER_SESSION members can both upload proof for the last slot (neither has an Attendance yet → both pass), then both create Attendance → **overbooking**. To prevent that, capacity must count **PENDING SESSION Payments**, not Attendances — but AD-6 never says capacity is measured against Payments. Two builders pick two different capacity authorities and overbook differently.
- **Orphaned payment on rollback.** Supabase storage write is **not transactional** with Postgres. In A, if upload succeeds but the later Attendance create fails (session filled in between), the member has a **PENDING Payment with proof but no slot** (charged, no seat). In B, if Attendance upsert fails after the Supabase upload, the file is already written and must be explicitly cleaned up. AD-6 specifies neither the transaction boundary nor the storage-cleanup compensation.

**Close it:** AD-6 must pin: (1) **the single owning endpoint/transaction** for PER_SESSION register-and-pay; (2) **ordering + atomicity** — Supabase upload first (non-transactional), then a `prisma.$transaction` writing Payment+Attendance together, with defined cleanup of the uploaded file if the transaction fails; (3) **capacity authority** — what occupies a seat for a per-session session (a PENDING SESSION Payment, or the Attendance), so two builders count the same thing.

---

## H5 — REJECT/cancel cascade on a SESSION payment is unowned and crosses AD-6's stated bindings

**ADs touched:** AD-6 (binding) and `PATCH /api/payments/[id]` (NOT in AD-6's bindings). **Severity: MEDIUM-HIGH.**

AD-6: "a REJECTED payment releases the slot. Cancelling registration … releases the slot." But the **reject** path is `PATCH /api/payments/[id]` (`payments/[id]/route.ts:41-75`), which today updates **only the Payment** and never touches Attendance. AD-6 explicitly binds only "the registration route … and its coupling to `Payment`" — the admin reject route is **outside its stated scope**, so the cascade has no owner.

**Divergence pair:**
- **Builder A (admin confirm/reject story)** makes the PATCH route, on `REJECTED`, also **delete/flag the Attendance** → capacity frees immediately; another member can grab the seat.
- **Builder B (member payments-view story)** leaves Attendance untouched and instead **derives "slot at-risk" at read time** by joining the latest SESSION Payment status (per `EXPERIENCE.md`: "Rejected → slot at-risk, re-upload prompt"). The Attendance keeps occupying capacity until the member re-uploads or cancels.

Same REJECT action, **different capacity state**: A's seat is reclaimable, B's is held. And the symmetric question for `DELETE /api/sessions/[id]/attendance` (cancel): does cancel also delete the SESSION Payment and its Supabase file (`proofPath`), or leave a PENDING payment orphaned in the member's dues? Two builders answer differently.

**Close it:** extend AD-6's bindings to **explicitly include the admin reject (`PATCH /api/payments/[id]`) and the cancel (`DELETE …/attendance`) paths**, and pin the cascade: define whether REJECT frees the seat or holds it "at-risk," and whether cancel deletes/voids the SESSION Payment and its stored proof file.

---

## H6 — AD-8: "current Activity fee" vs snapshotted `Payment.amount` is unpinned → two different "what you owe" numbers

**ADs touched:** AD-8 (and FR-11 "current Monthly Fee"). **Severity: MEDIUM-HIGH.**

AD-8 makes the Activity the single source of fees. FR-11 says the owed amount "equals the Activity's **current** Monthly Fee." But `Payment.amount` is a **stored snapshot** (`schema.prisma:194`; written from client `amount` at upload, `payments/upload/route.ts:34,102`). AD-8 never says whether a displayed owed-amount is a **live read** of `Ekskul.monthlyFee` or the **snapshot** on an existing Payment row. When an admin edits the fee mid-period, those diverge.

**Divergence pair:**
- **Builder A (dashboard "what I owe" story)** shows owed = **live** `Ekskul.monthlyFee` for any period without a CONFIRMED payment (literal FR-11 "current").
- **Builder B (payment-record story)** shows owed = the **snapshotted `Payment.amount`** when a PENDING row exists, else live fee.

A member who created a PENDING payment at the old fee then sees the unpaid-banner amount (`DESIGN.md` unpaid-banner "states the amount") as the **new** fee under A but the **old** snapshot under B. The number the member is told to pay, and the number the admin confirms, disagree across the two screens.

The same ambiguity applies to **SESSION**: `ActivitySession.fee` is itself a snapshot of `Ekskul.sessionFee` (AD-8), and `Payment.amount` snapshots that again at register time. If the admin edits `ActivitySession.fee` after one member pre-paid, is the *next* member charged the new fee while the first is settled at the old? Probably yes (snapshot at charge), but the spine never states it.

**Close it:** add a **money snapshot/live-read invariant** (new AD, or a row in Consistency Conventions → Money): "Owed amount is a **live read** of the Activity fee **until** a Payment row exists; once a Payment row exists, its `amount` is **authoritative** for that period/session." That single rule makes the dashboard, the banner, the payment record, and the admin confirm all agree.

---

## H7 — AD-8: behavior when an Activity disables a mode existing members are on

**ADs touched:** AD-8, AD-7, AD-6. **Severity: MEDIUM.**

AD-8 enforces "≥1 of `allowsMonthly`/`allowsPerSession` true" and prevents a member **selecting** a disallowed mode. It is silent on **existing** memberships whose stored `paymentMode` becomes disallowed when an admin later disables that mode on the Activity.

**Divergence pair:**
- **Builder A (Activity-edit story)** on save **migrates** affected members to the remaining mode (effective next period).
- **Builder B (Activity-edit story)** leaves stored modes untouched; AD-6 then reads `PER_SESSION` (pre-pay) for an Activity that **no longer offers** per-session — registration logic and billing now reference a mode the Activity forbids.

Members in the same Activity end up in different billing states depending on which builder owned the toggle.

**Close it:** AD-8 (or AD-7) must state what happens to existing `Membership.paymentMode` values when an Activity revokes a mode — auto-migrate to the surviving mode at the next period, and reconcile with AD-7's "effective next period."

---

## H8 — SESSION charge amount: client-supplied vs server-derived

**ADs touched:** AD-6, AD-8 (and AD-2 validation). **Severity: MEDIUM (also a security hole).**

The upload route **trusts the client `amount`** (`payments/upload/route.ts:34,74`; only `amount ≥ 1`). For a SESSION pre-pay, AD-6 requires "a matching SESSION Payment at status ≥ PENDING" but **does not require `amount == ActivitySession.fee`.**

**Divergence pair:**
- **Builder A** validates server-side that the SESSION charge equals `ActivitySession.fee` (derives it, ignores client amount).
- **Builder B** keeps trusting client `amount` (as today).

Under B, a member can "secure" a slot by uploading proof for **Rp 1** — AD-6's "≥ PENDING" predicate is satisfied, the slot is held, and the under-payment surfaces only at admin confirm. Two builds, two definitions of a valid secured slot.

**Close it:** AD-6/AD-8 must state the **SESSION charge amount is server-derived from `ActivitySession.fee`**, not client-supplied; the proof `amount` is validated against it.

---

## H9 — SESSION `Payment.ekskulId` denormalization vs AD-3 scoping

**ADs touched:** AD-3, AD-4, AD-5. **Severity: MEDIUM.**

`Payment.ekskulId` is **non-null** today (`schema.prisma:193`) and is the column AD-3 scoping and the GET filter rely on (`payments/route.ts:48`; `ekskul.ts` membership checks). A SESSION payment also carries `sessionId`, from which `ekskulId` is derivable. AD-4/AD-5 don't say whether SESSION rows must also **store** `ekskulId`.

**Divergence pair:**
- **Builder A** populates `ekskulId` on SESSION rows (denormalized from the session) → existing AD-3 ekskul-scoped queries and the `ekskulId` GET filter keep working unchanged.
- **Builder B** treats `ekskulId` as session-derived and either leaves it (can't — non-null) or joins through `sessionId` at read time → the existing `where: { ekskulId }` filter and AD-3 scoping silently miss SESSION rows that aren't joined.

**Close it:** state that **SESSION Payment rows MUST carry `ekskulId`** (denormalized from `ActivitySession.ekskulId`) so AD-3 scoping and the existing filter contract hold without per-query joins.

---

## Structural dimensions the spine leaves silent (this altitude should own them)

These are not single divergent pairs but whole axes the feature-architecture altitude owns and the spine never decides — guaranteeing per-builder drift:

1. **Transaction & compensation policy for multi-write money mutations.** AD-1 fixes *where* writes happen (Route Handlers) but nothing fixes *when a mutation must be a `prisma.$transaction`* or how to compensate a **Postgres+Supabase** partial failure (the pre-pay flow is inherently both). Money + external storage demands a transaction/compensation invariant here. (Feeds H1/H4/H5.)

2. **The canonical "billing period" primitive.** `(month, year)` calendar is implied by AD-5 and referenced by AD-6/AD-7, but is never declared as the **one shared temporal key** with a stated derivation (from `now()` for monthly, from `ActivitySession.date` for per-session). Every period computation re-derives it. (Feeds H1/H3.)

3. **Money snapshot-vs-live-read semantics.** The Consistency-Conventions "Money" row pins units (integer Rupiah) but not **authority** — is an owed amount config-live or row-snapshotted? This is cross-cutting (monthly + session, dashboard + record + admin stat). (Feeds H6/H8.)

4. **Concurrency on capacity-bounded registration.** Check-then-act on `count(attendances) < maxPlayers` is already racy; pre-pay makes it worse by splitting the seat-securing act across endpoints. No invariant owns "what atomically claims a seat." (Feeds H4.)

---

## Smaller items (note, not top holes)

- **`type` default/backfill (AD-4/AD-12):** new non-null `PaymentType` column on a table — pre-launch means no rows, so `db push` is safe, but the spine doesn't say whether `type` defaults to `MONTHLY` or is required-no-default. Pick one to keep builders aligned.
- **`Role` enum drift:** schema has `MEMBER/ADMIN/OWNER`; CLAUDE.md and some narration say `MEMBER/ADMIN`. AD-2 correctly insists `OWNER` passes `isAdminRole`; the Consistency-Conventions enum list could restate `Role` to kill the ambiguity. Cosmetic.
- **`defaultFee` → `monthlyFee` rename optionality (AD-8):** leaving the rename optional means two builders reference two different field names in code/UX copy; harmless to data but a small consistency tax. Fine to leave, but flag it as a naming coin-flip.

---

## Proposed AD additions / tightenings (summary)

| Hole | Fix |
|---|---|
| H1 | Tighten AD-4/AD-5: pin SESSION row `month`/`year` shape (recommend nullable + NULL; monthly rollups/filter apply to MONTHLY only). |
| H2 | Tighten AD-4/AD-5/AD-12: forbid `prisma.upsert` on the monthly key under a partial index; mandate find-then-create/update with `P2002` fallback; DB index is authority. |
| H3 | Tighten AD-7: define "billing period" = calendar `(month, year)` per AD-5; resolve the immutable-current-period vs single-mutable-column contradiction (mandate `pendingMode`/`effectiveFrom` now, or drop immutability for v1). |
| H4 | Tighten AD-6: pin the owning endpoint/transaction, upload-then-`$transaction` ordering + storage cleanup, and the capacity authority (Payment vs Attendance). |
| H5 | Extend AD-6 bindings to the reject (`PATCH /api/payments/[id]`) and cancel (`DELETE …/attendance`) paths; pin the slot-release cascade and proof-file disposal. |
| H6 | New money-authority AD (or Conventions row): owed = live Activity fee until a Payment row exists; thereafter `Payment.amount` is authoritative. |
| H7 | Tighten AD-8/AD-7: define what happens to existing `Membership.paymentMode` when an Activity revokes a mode. |
| H8 | Tighten AD-6/AD-8: SESSION charge amount is server-derived from `ActivitySession.fee`, not client-supplied. |
| H9 | Tighten AD-4: SESSION Payment rows MUST carry denormalized `ekskulId` for AD-3 scoping. |
| Silent dims | Add invariants for transaction/compensation policy, the canonical billing-period key, money snapshot semantics, and capacity-claim concurrency. |
