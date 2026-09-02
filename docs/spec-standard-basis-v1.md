# Spec: standards basis — count code only, grandfather, and make the enforcement claims true

| | |
|---|---|
| Spec | [#235](https://github.com/jefrykurniaone/net-c-management/issues/235) — `spec:standard-basis` |
| Run | `run:standards` |
| Execution map | [#252](https://github.com/jefrykurniaone/net-c-management/issues/252) |
| Tickets | #238, #239, #243, #244 — sub-issues of #235 |
| Version | v1 (2026-09-02) |
| Grilled from | the owner's question of whether the 40-line function and 300-line file rules are applicable |
| Overrides | #205's ruling, carried as non-relitigable by [#233](https://github.com/jefrykurniaone/net-c-management/issues/233): "the function-length rule is enforced as written, route-level page components are not exempt, and the standard's text is not amended". Reopened and reversed by the owner. |
| Depends on | nothing in this run. Waves 1 and 2 of #252 gate the `followups` run, not the reverse. |

This is a verbatim copy of the tracker issue at the time of ticketing. The issue is the live record; this file is the durable one. Below the rule is the issue body.

---

## Problem Statement

The coding standard in `CLAUDE.md` says "Max function length: 40 lines; max file length: 300 lines". Both numbers are measured against physical lines, which means they count JSX markup, data tables and comment lines as if they were logic. The owner's purpose for these numbers is his own readability and maintainability — a personal standard, not a machine gate — but every sub-agent executor loads that section as a binding completion gate, and the map for the current delivery run states the raw numbers inline.

An audit measured what the rules actually catch:

- 17 of 368 `.ts`/`.tsx` files under `src/` exceed 300 physical lines, but only **3** exceed 300 lines of code: the payment write module (636), the activity form sections (441) and the RSVP button (337). Of the other files over the physical limit, ten are comment-heavy — the worst is 252 comment lines out of 498 — and one is the i18n dictionary, which is data.
- ESLint's `max-lines-per-function` at 40 reports 193 violations across 145 files. Of the 145 top-level non-test functions over the limit, **73 fall to 40 or fewer once JSX-returning returns are subtracted**. Half the violations are markup.
- Of genuine logic functions, 58 of 667 exceed 40 (8.7%), the median is 12 lines, and the longest is 119.
- SonarSource's own equivalent rule for function length hard-exempts capitalised functions that return JSX, defaults to 200 lines rather than 40, and ships disabled. The file-length rule defaults to 1000. What a stock Sonar profile actually gates function size on is cognitive complexity, not line count.

So the rules are not wrong; they are aimed at the wrong quantity. A 194-line form whose body is one markup tree is tall, not unreadable, and an executor told to keep it under 40 lines either fragments working code or concludes the standards section does not describe this codebase and stops reading it — taking the rules that *are* wanted (Conventional Commits, no direct push to `main`, no magic numbers, nesting depth 3) down with it.

Compounding this, four statements in the repository claim these standards are enforced when nothing enforces them. There are no length, complexity or nesting rules in the ESLint config, which declares exactly one rule. CI runs two gates: `npm run lint` and `npx tsc --noEmit`. No `husky` or `lint-staged` has ever appeared in `package.json`. The only active pre-commit hook is a machine-global one that checks text encoding and never invokes ESLint.

- `CLAUDE.md:10` — "`npm run lint` # ESLint (enforced via pre-commit hook)"
- `CLAUDE.md:71` — the heading "## Coding Standards (from AGENTS.md)" cites a file deleted in `eff4b48` on 2026-06-28. That heading is the only surviving reference to it in the tree.
- `PRODUCT.md:86` — "ESLint (which is already a pre-commit hook)"
- `PRODUCT.md:87` — "Coding standards are enforced: 40-line functions, 300-line files, max 3 levels of nesting, no magic numbers."

## Solution

Keep both numbers and change what they count. Function length and file length are measured on **lines of code**: markup and data do not count, and where a shape genuinely cannot obey the limit, that is accepted rather than recorded as a violation. Existing over-length code is grandfathered — the standard binds new and modified code, and nothing is split to satisfy a counter.

Then make the documentation honest: correct all four enforcement claims, and state plainly which rules a tool checks and which are review-only.

Because the delivery run currently in flight states the raw numbers in its own completion gate, the amendment has to reach the documents the executors actually read, not `CLAUDE.md` alone. Editing `CLAUDE.md` by itself is a no-op on the run.

## Goals

- The standard describes the codebase it governs, so an executor reading it finds it credible and obeys the rest of the section.
- No document claims an enforcement mechanism that does not exist.
- The two page components that genuinely carry too much logic remain in scope for extraction; the two that were only tall fall out of scope.
- The amendment lands before the `followups` run dispatches, so no executor receives contradictory instructions mid-ticket.

## Non-goals

- Renumbering 40 or 300. The canonical vault standard states 40/300/3 and `CLAUDE.md` transcribes it faithfully; the numbers are not in dispute, only the counting basis and the exemptions.
- Adding a lint rule for either limit. This is a personal readability standard, and a machine gate would also contradict grandfathering.
- Adding a cognitive-complexity threshold or the plugin that would check one. It was considered and declined: the metric has real external backing, but adding a dev dependency and a new lint gate while parallel worktrees are queued changes the build for every executor, and no measurement exists of how many functions a genuine implementation would flag here.
- Splitting, extracting or reformatting any existing over-length file that a ticket does not already name.

## Decided constraints and trade-offs

**The purpose is personal readability and maintainability, not gate-keeping.** This is the decision everything else follows from. It is why the counting basis changes rather than the numbers, why no linter is wired up, and why "accept it where the shape cannot obey" is a legitimate outcome rather than a loophole.

**Code-only counting, with acceptance where the shape cannot comply.** Markup and data are excluded. Test callbacks, functions with no control flow at all (a validation schema, a table-column array, a single `Promise.all` of queries) and API guard cascades whose ordering is carried by co-location are accepted as inapplicable. The alternative — counting everything and exempting nothing — was the standing decision and is being overridden here, because it produces a rule that half the codebase violates for reasons that have nothing to do with readability.

**Grandfather, explicitly.** The three files over 300 code lines and the 58 logic functions over 40 stay as they are. Fixing them in passing was rejected: it hands every executor an unbounded refactor licence inside a ticket scoped for something else, which is how a wave's contention plan fails. This is why the standard must also say, in words, that an executor does not split a file or a function its ticket did not name.

**No lint gate, now or as part of this spec.** Beyond the personal-standard reason, the run's completion gate requires `npm run lint` to pass with zero warnings, and `npm run lint` is bare `eslint` with no warning threshold. Any rule added as a warning therefore fails every ticket in the run on dispatch while CI still reports green — a stall that is harder to diagnose than a red build. If a file-length rule is ever wired, it must count code only (`skipComments` and `skipBlankLines` both true), which reduces the day-one reports from 13 to the same 3 real violators.

**The amendment overrides a prior ruling, deliberately and visibly.** The map for the `followups` run lists, under decisions it carries so they are not relitigated, that the function-length rule is enforced as written, that route-level page components are not exempt, and that the standard's text is not amended. The owner has reopened and overridden that ruling. The override is recorded here so it is not mistaken for drift, and so the documents carrying the old ruling are corrected in the same change rather than left to contradict the standard.

## User Stories

1. As the repository owner, I want the length rules measured on code rather than markup, so that a page whose body is one form tree is not reported as unreadable.
2. As the repository owner, I want a shape that genuinely cannot obey the limit to be accepted rather than logged as debt, so that the standard reflects a judgement I actually hold.
3. As the repository owner, I want my personal standard to stay a review rule, so that no build turns red over a preference of mine.
4. As a sub-agent executor, I want the coding standards section to cite a source I can open, so that I do not discount the whole section as stale.
5. As a sub-agent executor, I want to know which rules a tool checks and which are review-only, so that I neither trust a hook that does not exist nor assume nothing is checked.
6. As a sub-agent executor, I want to be told explicitly not to split a file my ticket did not name, so that I do not refactor working code and collide with a parallel worktree.
7. As a sub-agent executor working a ticket from the current run, I want the completion gate and the coding standard to agree, so that I am not handed two contradictory limits inside one ticket.
8. As a reviewer, I want the exemption categories written down with reasons, so that a long function is judged on whether it is tangled rather than on how tall it is.
9. As the repository owner, I want the existing over-length code grandfathered in writing, so that nobody reads a measured violation count as a backlog.
10. As someone reading `PRODUCT.md` to understand how this project is run, I want its claims about enforcement to be true, so that I do not build a plan on a gate that is absent.
11. As the repository owner, I want the two page components that carry too much *logic* still extracted, so that the amendment is not mistaken for abandoning the rule.
12. As the repository owner, I want the page components that were only tall dropped from the extraction work, so that no executor spends a ticket on a file that already complies.
13. As a future reader of this decision, I want the override of the earlier ruling recorded with its reasoning, so that the question is not reopened a third time.
14. As the repository owner, I want the measured numbers preserved alongside the rule, so that the next person to question it starts from evidence rather than from scratch.

## Implementation Decisions

- The coding standards section of `CLAUDE.md` is rewritten in place. Its heading loses the dead file citation. The length bullets gain the code-only counting basis, the accepted-shape exemptions, the grandfather clause and the no-drive-by-splits instruction. Each length bullet states that nothing checks it.
- The nesting-depth rule is kept verbatim and is not annotated as evidence of anything. It is worth keeping because it is free, but of the repository's 2,475 functions only four ever reach depth 3, so it has never constrained an edit and must not be cited as proof that the section is respected.
- The two false pre-commit-hook claims and the false "standards are enforced" claim are corrected to describe what actually runs: ESLint and the TypeScript check, in CI, on pull requests. The machine-global encoding hook is not this repository's mechanism and is not claimed as one.
- The completion-gate wording in the `followups` execution map is amended in the same change, because it states the raw numbers inline and delegates only naming to `CLAUDE.md`. The `followups` standard spec and its repository mirror are amended for the same reason.
- The ticket that extracts the member Sessions page and the landing page is rescoped or closed. Its premise does not survive measurement: the Sessions page component is 33 lines and already complies with the rule as written; the figure of 78 that the ticket cites was produced by measuring from the start of the function to the end of the file, which swallowed a separate 43-line presentational helper. The landing page component is 63 lines, of which 25 are not markup.
- The ticket covering the dashboard and member payments pages is left as it is. Both still fail after the markup subtraction — 168 and 161 lines of code respectively — so the amendment does not release them.
- No ESLint configuration changes in this spec.

## Testing Decisions

A good test here asserts a property of the repository that a human would otherwise have to re-measure, and it asserts external behaviour rather than wording. There is very little to test, and that is the correct outcome: the deliverable is documentation, and documentation is verified by review.

- The one mechanically checkable property is that no tracked document claims an enforcement mechanism that does not exist. The prior art is the design-token suite, which scans the source tree for a pattern rather than trusting a count taken at authoring time. A guard of that shape could assert that the phrase describing a pre-commit hook does not reappear in a tracked document. This is optional and deliberately left to the ticket's judgement; it is a small guard against a claim that has now been wrong twice.
- Everything else is checked by `npx tsc --noEmit` and `npm run lint` staying green, which they are today, and by review against this spec.
- Note for anyone adding a test in this spec's tickets: the test suite does not run in CI. That gap is addressed by the sibling spec on comment-only facts, and a test added here would not gate anything until that lands.

## Out of Scope

- Any change to the numbers 40, 300 or 3.
- Any ESLint, Sonar or pre-commit rule for length or complexity.
- Extracting, splitting or reformatting any file the current run's tickets do not already name.
- The comment policy and the file-header cap, which are their own spec.
- The three defects the audit surfaced, which are their own spec.
- Reconciling the canonical vault standard with this project override. The vault note remains canonical on the numbers; this project overrides only the counting basis and the exemptions, which the authority order permits, and the override is labelled as such in the file.

## Further Notes

The measurement that motivates this spec is worth keeping, because it is the answer to the question if it is asked again:

| Quantity | Measured |
|---|---|
| Files over 300 physical lines | 17 of 368 (4.6%) |
| Files over 300 lines of code | 3 |
| ESLint reports at `max-lines-per-function` 40 | 193 across 145 files |
| Top-level non-test functions over 40 | 145 |
| Of those, markup rather than logic | 73 (50.3%) |
| Logic functions over 40 | 58 of 667 (8.7%), median 12, longest 119 |
| Functions reaching nesting depth 3 | 4 of 2,475 |
| Length or complexity rules in the ESLint config | 0 |

One further finding, recorded because a ceiling can never surface it: the dashboard and member payments pages each hand-roll the same monthly-dues derivation, and a comment in the payments page records that the two once diverged. Neither file ever breached 300 lines, so the file-length rule never asked for the extraction that would have prevented that defect. Compliance with a ceiling is not sufficiency, and the amended standard says so.

The audit also found that file sizes do not cluster beneath the 300-line limit in the way a followed rule would produce. The distribution declines smoothly straight through the boundary, the ratio across it is indistinguishable from the ratio across an arbitrary control boundary, and the dashboard page sat above 300 lines for roughly six weeks with nobody trimming it. Both rules are equally unfollowed today. That is an argument for making them credible, which is what this spec does; it is not an argument for deleting them.
