# Spec: followups standard — encodings, line endings, the 40-line rule, one stale case

| | |
|---|---|
| Spec | [#231](https://github.com/jefrykurniaone/net-c-management/issues/231) — `spec:followups-standard` |
| Run | `run:followups` |
| Execution map | [#233](https://github.com/jefrykurniaone/net-c-management/issues/233) |
| Tickets | #219, #217, #205, #232, #221 — sub-issues of #231 |
| Version | v1 (2026-09-02) |
| Grilled from | the triage of the nineteen issues left open by runs `rally`, `dues-rate` and `admin-registers` |
| Depends on | nothing in this run. The function-length and file-length rules are `CLAUDE.md`'s; the case format is `TESTING.md` §16–§23's |

This is a verbatim copy of the tracker issue at the time of ticketing. The issue is the live record; this file is the durable one. Below the rule is the issue body.

---

Grilled on 2026-09-02 as part of run `followups`, the run that clears the nineteen issues left open by runs `rally`, `dues-rate` and `admin-registers`. This spec owns the four that are about the **repository disagreeing with itself** — two files whose bytes fight the commit hook, one written standard nothing enforces, and one test case that asserts the opposite of what ships.

Repo copy: `docs/spec-followups-standard-v1.md`. Execution map: to follow. Tickets: linked below as sub-issues.

## Problem Statement

None of these four is a defect a member or an Admin can see. All four cost the next person who touches the code, and three of them cost it silently.

- **Two committed files carry a UTF-8 byte-order mark.** Both are page-level loading skeletons. Nothing is broken today, because they are already committed — but the moment any ticket edits one of them, the commit is refused by the global pre-commit hook, and the refusal names the byte-order mark rather than the edit, so it reads as a tooling fault. That is exactly what happened in the last run: a ticket needed one line in a third such file, hit the hook, and spent a detour on it. Both remaining files are skeletons, so any future skeleton change — a new stat card, a changed row count — walks into it. A sweep of `src/`, the repo root and `docs/` finds exactly these two.
- **A snapshot file goes modified with an empty diff after every test run.** The test runner writes it with line feeds; the checkout wants carriage returns; the content is identical either way, and `git diff` reports no change at all, only the "LF will be replaced by CRLF" warning. The cost is that every gate run on Windows leaves a dirty working tree that has to be inspected and discarded before a branch or a worktree can be trusted as clean — it was inspected twice in one wave of the last run. A dirty tree is exactly the signal an orchestrator must not learn to ignore. There is no `.gitattributes` in the repository at all, and `core.autocrlf` is on, so nothing overrides the conversion for a generated file.
- **The 40-line function rule is written down and unenforced on route-level page components.** Four of them exceed it, one by nearly seven times: the member dashboard page's component runs 271 lines, the payments page's 226, the sessions page's 78, the landing page's 63. No file breaks the 300-line file cap. No ticket has ever been handed back for it. A rule that is written down but never enforced quietly weakens every other item on the same list — and the same list is the completion gate of every ticket in every run.
- **One manual test case asserts the opposite of what ships.** It says the member dashboard's Activity cells carry no claim or withdraw control, which was true under the retired design, where the board was the only place a Seat could be claimed. The shipped build carries one deliberately: the dashboard's Activity cards resolve state and action through the same resolver the week strip uses, so that a member never has to learn two different cards. The behaviour is right and the case is out of date. The ticket that re-ran it owned a different section of the document and recorded the mismatch honestly rather than quietly rewriting another suite's expected result.

## Solution

The bytes, the line endings, the standard and the test document are each brought into agreement with the tree, and the run's user-visible changes are recorded in one place.

The two byte-order marks are stripped with an editor. A `.gitattributes` pins generated snapshots to line feeds so the working tree stops going dirty for no reason. The 40-line rule is **enforced**, by the owner's decision: the four route-level page components are extracted into composed sections rather than the rule being softened. And the stale case is marked superseded by the suite that now covers the behaviour, in the same ticket that records everything this run changed.

## Goals

- No file under version control carries a byte-order mark, and the pre-commit hook is the thing that keeps new ones out.
- A full gate run leaves the working tree clean.
- Every function in the repository, route-level page components included, respects the 40-line rule the completion gate asserts.
- The manual test document does not assert anything the shipped build contradicts.

## Non-goals

- Amending the coding standard. The owner's decision was to enforce the rule as written, not to exempt page components or to replace the line count with a complexity threshold.
- Normalising line endings across the repository. Only generated snapshot files are pinned.
- Rewriting or renumbering the manual test document's existing sections.
- Wiring a static-analysis scanner into CI. None is wired here, and this run does not add one.

## Constraints and trade-offs, with the reasons

- **The byte-order marks are stripped with an editor, never through a shell round trip.** Reading and rewriting the content through PowerShell 5.1 double-encodes non-ASCII text and writes a fresh mark, which converts an obvious failure into an invisible one. The whole point of the ticket is bytes, so the tool that changes them matters.
- **`.gitattributes` is scoped to snapshots, not to the whole tree.** A blanket `text=auto` would renormalise every file in the repository in one commit, which is a diff nobody can review and a merge conflict for every open branch. The rule names the snapshot files and nothing else; the one committed snapshot is renormalised with it.
- **Extraction must not invent single-use wrappers that make the pages harder to read.** The four pages are async Server Components whose length is mostly composition and a batched set of data reads, not branching logic. Sections are extracted where they are genuinely a section — a card group, a region, a list — and each extracted piece is named for what it is. The measure of success is that a reader finds the page easier, not that a line counter is satisfied.
- **The pages must render identically after extraction.** This is a structural change with no behavioural intent. Every one of the four surfaces is verified at both viewports, both themes and both locales, against the baseline captured before the run.
- **The stale case is marked superseded, not deleted, and not rewritten.** By the owner's decision the original text stays as history, marked, the way the last run marked the retired design-system cases. The behaviour it used to assert is already covered by the newer suite, so no coverage is lost.
- **One ticket owns the test document for the whole run.** Every other ticket in every spec of this run is forbidden from touching it, and reports instead. That is what keeps a document with several thousand lines merge-able across five waves.

## Success criteria

- The byte-order-mark sweep over `src/`, the repo root and `docs/` returns nothing, and an edit to either former offender commits without the hook firing.
- `npm test` followed by `git status --porcelain` returns nothing.
- No function in the four route-level page components exceeds 40 lines; no file exceeds 300; nesting stays within three levels.
- The four pages render identically to the pre-run baseline at 1440×900 and 390×844, in both themes and both locales.
- The stale case is marked superseded with a citation to the two tickets that decided the behaviour, and the document's new section records every user-visible change this run made.

## User Stories

1. As a developer editing a loading skeleton, I want my commit to be accepted, so that a byte-order mark from an earlier commit does not block an unrelated one-line change.
2. As a developer, I want the pre-commit hook to be the only thing standing between the tree and a byte-order mark, so that the guard is prevention rather than a trap.
3. As an orchestrator running the gate, I want a clean working tree afterwards, so that a dirty tree stays a real signal instead of noise I learn to discard.
4. As a developer creating a worktree, I want the branch to be trustworthy as checked out, so that I do not have to decide whether a modified snapshot matters.
5. As a developer reading the member dashboard page, I want it composed of named sections, so that I can find the part I came for.
6. As a developer, I want the 40-line rule to be true of the whole repository, so that the completion gate is a description of the code rather than an aspiration.
7. As a member, I want the dashboard and the payments page to look and behave exactly as before, so that a refactor is invisible to me.
8. As a maintainer reading the manual test document, I want no case asserting the opposite of what ships, so that a re-run does not produce a false failure.
9. As a maintainer, I want the superseded case's original text kept, so that the record of what the product used to assert is not lost.
10. As a maintainer, I want this run's user-visible changes recorded as cases, so that the next run can re-run them instead of rediscovering them.

## Implementation Decisions

- The two byte-order marks are removed by rewriting the files' content through an editor, leaving the text itself untouched. The sweep is re-run afterwards over `src/`, the repo root and `docs/` and its result recorded.
- A `.gitattributes` is added at the repository root with a rule pinning generated snapshot files to line feeds, and the one committed snapshot is renormalised in the same commit. Nothing else is given an attribute.
- The four route-level page components are extracted into composed sections. The work is split across two tickets by surface — the two long member pages, then the sessions page and the landing page — so each fits one context and each is verified on its own.
- Extracted pieces live beside the existing per-surface component folders, follow the repository's file-naming rules, and take read-only props.
- The stale manual case is marked superseded, citing the two tickets whose decision it contradicts, with its original text kept.
- A new section is appended to the manual test document recording this run's user-visible changes: the wordmark's new role and the rail fit, the per-chart empty messages, the legend's wrapping and its item order, the Sessions register's icon, the create form's fee note, and the dashboard's corrected figures. It is appended at the end of the document; no existing section is reordered or renumbered.

## Testing Decisions

- A good test here is mostly **the gate itself**: lint, build, test, and a clean `git status` afterwards.
- The byte-order-mark sweep is the acceptance evidence for that ticket, run and pasted rather than described.
- The extraction tickets are guarded by the existing test suite plus a rendered comparison against the baseline; no new unit test is written for a structural move, because there is no new behaviour to assert.
- The manual document's own conventions are followed for the new section: the case format of the existing sections, one case per behaviour, recorded against a real run rather than written speculatively.
- The recorded run for the whole run's user-visible changes is this spec's last ticket, and it is blocked by every ticket whose change it records.

## Out of Scope

- Any change to the coding standard's text.
- Renormalising line endings for any file that is not a generated snapshot.
- Extracting any component that is not one of the four named route-level pages.
- Renumbering, reordering or deleting any existing section or case of the manual test document.
- Adding a static-analysis scanner, a CI workflow, or a lint rule to enforce function length automatically.

## Further Notes

The byte-order-mark and line-ending items are both instances of the same failure shape recorded in this machine's global instructions: a text path with a Windows shell in the middle of it. Neither is a bug in the code they affect, and neither is fixable by a `.gitattributes` alone — the marks are content and have to be rewritten, the line endings are conversion and have to be pinned.
