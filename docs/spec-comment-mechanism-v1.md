# Spec: comment mechanism — facts that live only in a comment become mechanisms

| | |
|---|---|
| Spec | [#236](https://github.com/jefrykurniaone/net-c-management/issues/236) — `spec:comment-mechanism` |
| Run | `run:standards` |
| Execution map | [#252](https://github.com/jefrykurniaone/net-c-management/issues/252) |
| Tickets | #240, #241, #245, #246 — sub-issues of #236 |
| Version | v1 (2026-09-02) |
| Grilled from | a comment audit run to decide a minimal-comment policy, which surfaced three production gaps instead |
| Depends on | nothing. #240 (the CI test step) gates #245, #246 and #247 inside the run. |

This is a verbatim copy of the tracker issue at the time of ticketing. The issue is the live record; this file is the durable one. Below the rule is the issue body.

## Delivery record — 2026-09-04, marked at the close of run `standards`

Run `standards` closed on 2026-09-04. The body below is unchanged and stays unchanged; this section marks the claims delivery falsified or settled. Nothing below is deleted, and no `path:line` citation has been renumbered.

**All four problems this spec names are fixed. Verified on `main` at the close rather than taken from the tickets:**

| Claim in the body | State at close |
|---|---|
| "`prisma/payment-monthly-unique.sql` and `prisma/rls-policies.sql` sit beside the migration directory… nothing creates the partial unique index, and nothing enables row-level security" | **Reversed** by #246. Migration `20260902180043_add_monthly_payment_unique_index_and_rls` exists among the now 14 migration folders, and **both loose SQL files are gone from the tree** — the ticket took the option the body left open. Nothing depends on a human applying SQL any more. |
| "The day-of reminder guard is stamped even when every send failed" | **Reversed** by #245. `src/lib/day-reminder-stamp.ts` exists as the pure function the body specifies, tested at the library seam. |
| "The service-role Supabase client and the Prisma pool are not import-guarded" | **Reversed** by #241. `server-only` is at line 1 of both `src/lib/supabase.ts` and `src/lib/prisma.ts`. No transitive client import was surfaced, so the finding the ticket was told to report rather than work around did not arise. |
| "the test suite does not run in CI… Locally 45 test files and 840 tests pass. On a pull request, none of them run." | **Reversed** by #240. `.github/workflows/ci.yml` runs `npm test` at line 34. The suite has since grown to **52 files and 924 tests**, so the 45/840 figures are an authoring-time snapshot. |

**Claims delivery confirmed, unchanged.**

- "The comments stay. They are good comments." — honoured. The later comment-policy tickets (#248, #249, #250, #251) left every one of them at full length, each under a named keep rule in `CLAUDE.md`: the row-level-security bypass boundary, the connection-pool runtime fact, the double-send guard and the deliberate-absence notes. `src/lib/supabase.ts` and `src/lib/prisma.ts` are not in any cap ticket's diff at all — neither carries an unattached block, so neither was ever in that population.
- "Auditing row-level security policy content… is a separate question" (Non-goals) and "Reviewing whether the existing row-level security policies are correct or sufficient" (Out of Scope) — **still not done, deliberately.** #246 brought the existing policies under migration control and asserted their presence after apply. Whether they are the right policies remains open and is not tracked by any ticket in this run.
- "Testing the cron route handler itself" stays out of scope; no route handler is tested in this repository today.

**One claim of this spec's own reasoning was borne out in an unexpected place.** The body's closing observation — that all three gaps were invisible because each comment "reads as adequate documentation", and that only checking whether anything *executes* it revealed that nothing did — recurred during the later comment work. #248 found two comments in code no ticket owned describing behaviour the code does not have, and both are now filed as defects: **#293** (a comment claimed a fixed avatar path overwrites on re-upload; `randomUUID()` means it never does, and nothing deletes the predecessor) and **#294** (a reminder batch that sends nothing still arms the 24-hour cooldown — the same shape as the defect #245 fixed, on the admin-triggered path instead of the cron path). Neither was found by a test. Both were found by reading a comment against its code.

---

## Problem Statement

A comment audit of this repository, run to decide a minimal-comment policy, found three places where a comment is not documenting a mechanism — it *is* the mechanism. Deleting the comment would not lose an explanation; it would lose the only statement of a rule the running system depends on. Two of the three are live production defects.

**The monthly-payment unique index and row-level security exist only as loose SQL files that no migration applies.** `prisma/payment-monthly-unique.sql` and `prisma/rls-policies.sql` sit beside the migration directory. All 13 migration folders were searched: nothing creates the partial unique index, and nothing enables row-level security or creates a policy. A database built by `prisma migrate deploy` alone therefore has neither. The partial unique index is the race arbiter for every monthly billing write — the payment write path deliberately hand-rolls an update-then-create sequence because the ORM cannot target a partial index, and the index is what makes that sequence safe. Without it, concurrent monthly writes can create duplicate payment rows. Row-level security being absent is a security posture problem in its own right. The header comments in those two files are currently the entire mechanism.

**The day-of reminder guard is stamped even when every send failed.** The cron route loops over recipients, counts successes and failures, and then unconditionally stamps the session's reminder timestamp after the loop. A transient SMTP outage therefore marks the reminders as sent and suppresses that day's emails permanently — the guard that exists to prevent a double send instead guarantees a missed send. The only prose about it describes the intent ("the double-send guard") and not the failure mode.

**The service-role Supabase client and the Prisma pool are not import-guarded.** 31 modules under `src/` open with a server-only import. The two that hold the most dangerous surfaces are not among them: the Supabase client constructed with the service-role key, which bypasses row-level security, and the Prisma singleton. The Supabase module's only protection is a two-line comment saying the key bypasses RLS and must never reach the client — and that comment is precisely the shape a minimal-comment policy deletes, because the names beside it already carry the words "admin", "client" and "service role key". The one word the names do not carry is the one that matters.

Underneath all three sits a fourth problem that makes them hard to fix safely: **the test suite does not run in CI.** The workflow has five steps — checkout, setup, install, ESLint, TypeScript — and no test step. Locally 45 test files and 840 tests pass. On a pull request, none of them run. So a fix that adds a test adds nothing that gates anything, and a change that breaks an existing test merges green.

## Solution

Turn each comment-only fact into a mechanism the machine holds, and make the machine actually run on pull requests.

Add the test step to CI first, so every guard added afterwards is real. Then: bring the partial unique index and the row-level security policies under migration control so a deployed database gets them; make the reminder stamp conditional on whether anything was actually sent, with the decision extracted to a pure function and tested at the existing seam; and add the server-only import to the two modules missing it.

The comments stay. They are good comments. The point is that they should no longer be the *only* thing standing between the code and the failure.

## Goals

- A database created by `prisma migrate deploy` has the partial unique index and the row-level security policies, with no hand-applied SQL step.
- A day of failed sends does not permanently suppress that day's reminders.
- Importing the service-role Supabase client or the Prisma singleton from client code fails the build rather than shipping.
- The 840 existing tests run on every pull request.

## Non-goals

- Rewriting or deleting any of the comments involved. This spec adds mechanisms beside them; the comment policy spec decides their wording later, and by then each will have a second home.
- Broadening test coverage beyond what these fixes need. The narrow coverage policy — pure logic under the library test directory, nothing touching Prisma, Supabase or the DOM — is deliberate and stays.
- Auditing row-level security policy content. This spec brings the existing policies under migration control; whether they are the right policies is a separate question.
- Testing the cron route handler itself. No route handler is tested in this repository today, and doing so needs Prisma and mailer mocks the suite deliberately avoids.

## Decided constraints and trade-offs

**The CI test step goes first and blocks the rest.** It is the seam that makes every other guard in this spec real. It is expected to go green on arrival, since the suite passes locally, but that expectation is itself part of the first ticket's acceptance: if it does not, that is a finding and not a reason to skip it.

**The reminder-stamp decision is extracted to a pure function, not tested through the route.** The alternative — testing the route handler with Prisma and mailer mocks — covers the real path but introduces a kind of seam the repository has none of. Extracting the decision matches the established pattern of pure derivation modules tested under the library test directory, and it puts the rule in a named, testable place. The route keeps its own untested status, which is the existing and accepted posture.

**The migration must be written with a correctness argument, not generated.** Two risks make this the most delicate ticket in the run. First, ordering: a migration that creates a unique index on a table which already holds duplicate rows fails on apply, so the migration has to establish what it does about pre-existing duplicates before it creates the index. Second, environment drift: the untracked hand-applied SQL means production and local databases may already differ from each other and from what the migration expects, and this repository has been broken once before by exactly that class of drift. The migration therefore has to be safe to apply to a database that already has the index and policies, and to one that has neither.

**Row-level security needs its policies checked, not assumed.** Bringing the policy file under migration control is the fix, but a policy that exists and does nothing is worse than a visible gap, so the ticket asserts the policies are present after apply rather than only that the migration ran.

**No new dependency.** Every fix here uses what is installed.

## User Stories

1. As the repository owner, I want a database built from migrations alone to have the monthly-payment unique index, so that a deployed environment is not one hand-applied SQL file away from duplicate billing rows.
2. As the repository owner, I want row-level security to arrive with the schema, so that a fresh environment is not silently unprotected.
3. As a member of the community, I want my day-of reminder to arrive on a day when the mail service had a hiccup, so that a transient outage does not silently cost me the notice entirely.
4. As an administrator, I want a reminder run that failed for everyone to be retried rather than marked done, so that I am not told reminders were sent when none were.
5. As the repository owner, I want the reminder-stamp rule to live in a named, tested function, so that the condition is visible and a regression is caught.
6. As a developer, I want importing the service-role client from a client component to fail the build, so that the service-role key cannot reach a browser bundle through an ordinary mistake.
7. As a developer, I want the Prisma singleton import-guarded like its 31 siblings, so that the guard is a property of the module rather than of the reader's attention.
8. As a developer opening a pull request, I want the test suite to run, so that a green check means the tests pass and not merely that the code compiles.
9. As a sub-agent executor, I want CI to catch a test I broke, so that I do not merge a worktree that silently deleted something a test asserted.
10. As the repository owner, I want the migration to be safe to apply to a database that already has the index, so that production and local environments converge rather than diverge further.
11. As the repository owner, I want each of these three facts to have a second home, so that the comment policy can later be applied to their comments without losing the rule.
12. As a future reader, I want to know these three gaps came out of a comment audit rather than an incident, so that the audit's value is on the record.

## Implementation Decisions

- The CI workflow gains a test step after the type check. It runs the existing test command. No test configuration changes.
- The partial unique index and the row-level security policies move into a Prisma migration, created through `prisma migrate dev` so the migration folder is recorded and the local and production histories stay in step. The two loose SQL files stop being the mechanism; whether they remain in the tree as reference or are removed is the ticket's call, but nothing may still depend on a human applying them.
- The migration is written to be idempotent-safe against an environment that already carries the index and the policies, since production may. It states in its own comment what it does about pre-existing duplicate monthly rows.
- The reminder-stamp decision becomes a pure function in the library layer, taking the counts the loop produced and returning whether to stamp. The cron route calls it. The function is tested at the existing library test seam, covering at minimum: every send succeeded, every send failed, a partial failure, and a session with no recipients at all.
- The two modules missing the server-only import gain it. This is expected to be a two-line change, but it can surface a real violation: if any client component transitively imports either module, the build will fail, and that failure is the finding rather than a reason to revert. Any such import is reported, not worked around.
- Deployment note for whoever lands the migration: this repository deploys pending migrations with a dedicated command after a merge, and a migration that adds a constraint wants the application build deployed in the right order relative to it. The ticket names the order it needs.

## Testing Decisions

A good test here asserts external behaviour — what the system does — and not how the module is arranged. Two of the three fixes are testable at the existing seam; one is verified by the type checker and one by inspecting the applied database.

- **Reminder stamp.** A pure-function suite under the library test directory. Prior art: the recurring-session generator, the status-chip resolver and the payment and dues rule suites, which are all pure derivations tested on their inputs. Cases: all sent, all failed, partial, and no recipients. The no-recipients case is a genuine decision the ticket must make and record, not an edge case to guess at — a session with nobody to notify is not the same as a session whose sends all failed.
- **Server-only imports.** Verified by `npx tsc --noEmit` and the production build staying green. No unit test; the guard *is* the mechanism.
- **Migration.** Verified by applying it to a database that has neither object and asserting both exist afterwards, and by applying it to one that already has them and asserting it does not fail. Asserting the presence of the index and the policies is the acceptance criterion, not that the migration command exited zero. Whether that assertion becomes a CI check is left to the ticket; if it does, it belongs in the same shape as the existing tree-scanning guard rather than as a new kind of integration test.
- **CI test step.** Verified by the pull request showing the test job, and by the run being green.

## Out of Scope

- Any change to the comments involved, including the two SQL file headers, the Supabase RLS-bypass warning, the pool-cap comment and the double-send-guard line.
- Testing route handlers, adding Prisma or Supabase mocks, or widening the coverage policy.
- Reviewing whether the existing row-level security policies are correct or sufficient.
- Adding coverage thresholds, a coverage report, or any CI step beyond the test run.
- The comment policy itself and the file-header cap.
- The coding standard's counting basis.

## Further Notes

The three fixes are independent of each other and of the coding-standard amendment. Only the CI test step gates anything, and it gates the reminder-stamp work because that is the one fix adding a test.

The migration is the highest-risk item in the whole `standards` run: it touches money, it touches a security posture, it needs a correctness argument about pre-existing rows, and it carries environment-drift risk in a repository that has been broken once by untracked drift already. It is ticketed accordingly.

One observation worth recording for the comment policy spec. The reason all three of these gaps were invisible is that the comment describing each one reads as adequate documentation. `prisma/rls-policies.sql` has a clear header; the double-send guard is named in prose; the Supabase warning is emphatic. Reading the comments, the system looks covered. Only checking whether anything *executes* the comment revealed that nothing does. That is the sharpest argument for the comment policy's move-before-cut rule: a comment can be well written, accurate, and still be the wrong place for the fact to live.
