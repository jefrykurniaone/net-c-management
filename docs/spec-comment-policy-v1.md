# Spec: comment policy — minimal comments, six keep categories, file headers capped

| | |
|---|---|
| Spec | [#237](https://github.com/jefrykurniaone/net-c-management/issues/237) — `spec:comment-policy` |
| Run | `run:standards` |
| Execution map | [#252](https://github.com/jefrykurniaone/net-c-management/issues/252) |
| Tickets | #242, #247, #248, #249, #250, #251 — sub-issues of #237 |
| Version | v1 (2026-09-02) |
| Grilled from | the owner's request to keep comments minimal and let the code carry its own meaning |
| Adoption | **after** run `followups` closes. Waves 3 to 5 of #252. |
| Correction | the unattached-doc-block count in the body (96 blocks / 1,611 lines) was re-measured to 131 blocks / 1,704 lines across 114 files before ticketing. See the correction comment on #237; the cap tickets carry the corrected numbers. |

This is a verbatim copy of the tracker issue at the time of ticketing. The issue is the live record; this file is the durable one. Below the rule is the issue body.

---

## Problem Statement

The owner wants comments minimal — written only when needed, with the code carrying its own meaning. The repository has no written comment policy, so every contributor and every sub-agent executor draws the line differently.

An audit measured what is actually there, and the result reframes the request. The things a minimal-comment policy usually targets **do not exist here**:

- Zero `TODO`, `FIXME`, `HACK`, `XXX` or `WIP` anywhere under `src/`.
- Zero commented-out code.
- One suppression directive in the entire repository, and it is a test's own assertion.
- Zero lint suppressions and zero scanner suppressions.

What does exist is a volume problem of a different shape, and a decay problem:

- **Comment density is 19.82%** — 9,689 comment lines against 48,875 non-blank. 121 of 381 files exceed 25%. The library layer's own files reach 37.46%.
- **96 doc-shaped blocks are attached to no declaration at all**: 1,611 lines, 17.3% of every comment line under `src/`, averaging 17 lines each and reaching 46. These are file-header essays. No tool reads them, and they are the single largest component of comment volume.
- **73 comment runs are older than the code beneath them**, 15 of them by more than 40 days, the worst by 102 days. A comment that has drifted from its code is worse than no comment.
- **Of 11 in-code `file:line` citations, at least 5 resolve wrong.** One points at a blank line and is cited three times; another points at a blank line where the fact it names lives 53 lines further down.

And there is a hazard that makes a careless cleanup expensive. Several comments are the only copy of a constraint, because the modules holding them have no tests: nothing imports the holds or payments modules in a test, and the middleware is untested. The shared domain document is silent on the connection pooler, on row-level security, on the service role and on the pooler ports. So for those facts, the policy's own instruction to "find the explanation's other home before cutting it" comes up empty — there is no other home.

An adversarial review of a first draft of this policy found it deleting, by its own literal wording, the row-level-security bypass warning, the connection-pool rationale, the privacy no-list that keeps bank account numbers off the unauthenticated landing page, and the 56 comment lines carrying decision identifiers that a defect record in the product document uses as its inventory of undocumented decisions. The draft was refused for that reason. The policy below is the corrected one.

## Solution

A short policy with a single operative test — **a comment earns its line when it says something the code cannot** — expressed as six keep categories drawn from what this codebase actually relies on, and a delete list whose first two entries are fixed by changing the code rather than by removing a line.

Two rules carry most of the weight and neither is about deleting:

- **A wrong comment is corrected, never deleted for being wrong.** The 73 drifted runs and the 5 broken citations get fixed. A citation is rewritten to name a symbol or a heading, and the line survives, because the citation is the least valuable thing on it.
- **Move before cut.** Where an explanation is the only copy of a rule, its content moves to a type, a test name, the domain document or a decision record *first*. If it has no other home yet, it stays.

The volume problem is addressed separately and directly: the 96 file-header essays are capped at roughly six lines each, with the argument moved into the domain document or a decision record and cited from the file.

The policy is adopted **after** the `followups` delivery run closes.

## Goals

- One written test a contributor or executor can apply at the line, instead of six people's instincts.
- Comment volume reduced where it is essay and not explanation, principally in the 1,611 lines of file header.
- The drifted and wrong comments corrected, since those actively mislead.
- Not one load-bearing constraint lost in the process.

## Non-goals

- A density target. No percentage is a goal; 19.82% is a symptom, not the thing being managed.
- Requiring documentation on exported functions. It was considered and declined — see below.
- Deleting the decision identifiers in code comments. They look like dead references and are in fact a worklist.
- Enforcing the judgement-bearing parts with a tool. Most of this policy is judgement and no linter can hold it.
- Touching the vendored UI primitives.

## Decided constraints and trade-offs

**Six keep categories, not two.** The first draft had two — a why, and a fact from outside the file — and an adversarial review showed both the security warnings and the deliberate-absence notes falling through the gap. The six are: why the obvious code is absent (a platform or ORM limit); an ordering **or non-ordering** obligation no type enforces, explicitly including a comment stating that a call is deliberately *not* made here; a security or privacy boundary the code does not enforce; a storage invariant the column type permits but the domain forbids; a measurement or a deliberate duplication, naming what it duplicates and why nothing connects the two; and a deployment or runtime fact that lives outside the source tree.

**The negative-ordering category is not optional.** Six comments in this repository document the deliberate absence of the expired-hold sweep, and the reason differs each time — an unauthenticated read must not write or send mail; a chart read must not mutate; a lock must be taken only after the sweep. A rule about "call order" does not reach any of them.

**Documentation on exports stays optional.** 412 of 748 exports carry a doc block and 336 do not, and that split is not a gap to close. Nothing in the governing standards asks for it: the canonical standard is silent, and the scanner delegation cannot supply the rule because no such rule exists for TypeScript in that rule set. Requiring it would mean a new dev dependency and 336 new comments, most restating a typed signature — the exact noise this policy exists to remove. A doc block is written only for what the signature omits: an encoding, a format, a refusal case.

**Deletion by renaming, where a comment exists only because a name is poor.** This is the highest-value category, because it converts a comment into a permanently better name. It is also the one that can go wrong quietly, so the rename is verified by the type checker and the affected call sites, not assumed.

**The decision identifiers are replaced and recorded, never deleted.** 56 comment lines carry identifiers of the form used for architecture decisions and requirements. They appear absent from the documentation, which is what made them look dead — but the product document records their absence as an open defect and enumerates them, and a spec from an earlier run lists backfilling several of them as planned work. Those in-code citations are that task's only inventory. The rule is therefore: rewrite an identifier to an issue number or a decision-record path once the record exists; until then keep the identifier and, without exception, the sentence around it.

**Precedence is explicit: a keep rule outranks a delete rule on the same line.** The draft's own flagship keep example contained, on its second line, two of the identifiers its delete list named by hand. Without a precedence rule a policy that contradicts itself inside one line range produces churn and argument.

**Comments a test asserts are code.** One comment in the repository is required to exist by a test. That carve-out is real but has a known expiry: a spec in the current run mandates deleting that exact comment as part of resolving the decision it marks. The policy states the principle and does not name that instance as permanent.

**Vendored UI primitives are out of scope.** Their comments are upstream's and return on every component upgrade, so cleaning them converts a one-time tidy into a per-upgrade tax. Noted honestly: that directory is not purely vendored — it carries 31 commits and several repo-authored files — so the boundary is by provenance, not by path, and a repo-authored file in that directory is in scope.

**The i18n dictionary gets its own two-line rule.** Its roughly 400 comment lines do a job no other file's do: per-key notes for whoever writes the other locale, plus an append-only merge convention that a spec treats as binding on future edits. Neither the keep list nor the delete list fits.

**Adoption is after the run.** The standards list in the repository's agent instructions is described by a current spec as the completion gate of every ticket in every run. Adopting a comment policy with no scope clause therefore makes it binding on 19 in-flight tickets. The delete rules' hits land on more than 45 shared files, including the i18n dictionary — the single most merge-contended file in the repository — and the payment write module, which another spec in the same run is editing. Every one of those is a rebase conflict over a comment, in a workflow where each ticket gets its own worktree. Waiting costs nothing: nothing is currently generating the comments the owner objects to.

**The policy must not become the bloat it forbids.** A first draft ran 738 words — around 77% of the entire project-authored agent-instructions file — while five of its rules governed zero occurrences and it carried 23 of the citations it banned. The final policy states only rules with live subjects, and its examples are cited by symbol rather than by line number.

## User Stories

1. As the repository owner, I want one written test for whether a comment earns its line, so that the judgement is not remade differently by every contributor.
2. As the repository owner, I want the file-header essays capped, so that comment volume falls where it is genuinely essay.
3. As the repository owner, I want the argument in those headers preserved somewhere, so that capping them is a move and not a loss.
4. As a contributor, I want a comment that exists only because a name is poor to be fixed by renaming, so that the explanation stops being needed at all.
5. As a contributor, I want a wrong comment corrected rather than deleted, so that a rule is not lost because its statement had drifted.
6. As a contributor, I want a broken citation rewritten to a symbol name, so that it survives the next refactor rather than rotting again.
7. As a sub-agent executor, I want the keep list to name security and privacy boundaries, so that I do not delete a row-level-security warning that reads like a restatement of the variable beside it.
8. As a sub-agent executor, I want "this call is deliberately absent here" protected in writing, so that I do not delete a note whose whole content is a negation.
9. As a sub-agent executor, I want to be told a keep rule beats a delete rule on the same line, so that I do not have to arbitrate a contradiction mid-ticket.
10. As a sub-agent executor, I want the decision identifiers protected until their records exist, so that I do not destroy the inventory of a backfill task.
11. As the repository owner, I want the TODO format to require an issue number, so that a marker is a pointer into the tracker rather than a dead end.
12. As the repository owner, I want commented-out code banned outright, so that it stays at zero rather than accumulating.
13. As a translator or whoever writes the other locale, I want the dictionary's per-key notes and its append-only convention left alone, so that the file's merge discipline survives.
14. As the repository owner, I want the policy short enough to read in under a minute, so that it does not become the thing it forbids.
15. As a reviewer, I want the move-before-cut rule stated with teeth, so that an explanation with no other home is kept rather than cut on the assumption one exists.
16. As the repository owner, I want the policy adopted after the current run, so that a comment cleanup does not collide with 19 tickets across parallel worktrees.

## Implementation Decisions

- The policy is added to the repository's agent instructions as a short subsection: the operative test in one line, the six keep categories, the delete list, the TODO format, the precedence rule, and the move-before-cut rule. Examples cite a symbol or a module, never a line number.
- The delete list is: a comment that exists only because a name is poor (fixed by renaming); a comment heading a long block that should be an extracted, named function (fixed by extracting); a restatement of the declaration beneath it; a section divider; repository history narration, which belongs in version control; commented-out code; and a `file:line` citation, which is *rewritten* to a symbol or a heading rather than removed.
- The two rules with no live subject in this repository are kept as prevention only, and only two: the TODO format and the commented-out-code ban. The suppression-comment clauses are dropped, because the existing lint rule already requires a description on the one suppression form permitted and there are no suppressions to govern; the marker ban is dropped for the same reason.
- The correction pass is bounded and mechanical, and every item is enumerable before work starts: the section dividers, the broken citations, the drifted comment runs, and the verified renames. Nothing in the correction pass requires judgement about whether a comment should exist.
- The file-header cap is its own pass, one file at a time with a per-file verdict, because several of these headers are load-bearing. The destination — the domain document or a decision record — is written **before** the header is trimmed, never after. A header whose argument has nowhere to go is left at full length and reported.
- No dependency is added and no lint rule is added. Where a delete rule is mechanically checkable — the identifier shapes, the citation shapes, the dividers — a source-tree-scanning test in the shape of the existing design-token guard is the right instrument, and that is left to the ticket. Such a guard is worthless until the test suite runs in CI, which is the sibling spec's first ticket.

## Testing Decisions

A good test here asserts a property of the source tree rather than a count taken when the test was written, which is why the existing design-token guard is the prior art: it scans for a pattern instead of trusting a snapshot.

- The three mechanically checkable delete rules — identifier shapes, `file:line` citation shapes, box-drawing dividers — can each be a tree-scan assertion. Optional, and gated on the CI test step existing.
- One keep-category subject can be converted from a comment into a checked pair: the email palette's hand-copied colour values, whose own comment says outright that nothing connects them to the stylesheet they duplicate. A test comparing the two turns a keep-forever comment into a verified duplication. This is the clearest instance of the policy's own preferred outcome — a fact moved from prose into a mechanism — and is worth doing for that reason.
- Everything else is review. Per the governing standards, an empty editor-diagnostics result is not evidence of anything: it returns empty both for a clean file and for a file the editor never opened.
- Renames are verified by the type checker and by the affected call sites, and the type check must be green before and after.

## Out of Scope

- Any comment change inside a file that a `followups` ticket is editing, for as long as that run is open.
- Requiring documentation on exports, and the plugin that would enforce it.
- The vendored UI primitives, except files in that directory with no upstream original.
- Deleting the decision identifiers, or the prose around them, before their records exist.
- Splitting the i18n dictionary, which is a separate question with its own trade-offs.
- The three defects the audit surfaced, which are their own spec.
- The coding standard's counting basis, which is its own spec.
- Any density target or coverage threshold.

## Further Notes

The audit's numbers, kept because they are the baseline any later measurement is compared against:

| Quantity | Measured |
|---|---|
| Comment density | 19.82% (9,689 of 48,875 non-blank lines) |
| Files over 25% comments | 121 of 381 |
| Densest area | library layer's own files, 37.46% |
| Doc blocks attached to no declaration | 96 blocks, 1,611 lines, 17.3% of all comment lines |
| Comment runs older than the code beneath | 73; 15 by over 40 days; worst 102 days |
| In-code `file:line` citations | 11, of which at least 5 resolve wrong |
| Comment lines carrying decision identifiers | 56 |
| Markers (`TODO`/`FIXME`/`HACK`/`XXX`/`WIP`) | 0 |
| Commented-out code | 0 |
| Suppression directives, whole repository | 1 (a test's own assertion) |
| Exports with a doc block | 412 of 748 |

Two cautions for whoever executes this.

The estimated line reduction from capping the file headers was described by the agent that produced it as a policy scenario it chose, not a measurement — the weakest number in the audit and the one it least wanted acted on. The cap is the owner's decision and stands, but it is executed one file at a time with a verdict per file, and the number of lines it removes is an outcome rather than a target.

The audit also found that the reason the sibling spec's three defects were invisible is that the comment describing each read as adequate documentation. Read the comments and the system looks covered; only checking whether anything *executes* them revealed that nothing did. A comment can be well written, accurate, and still be the wrong place for the fact to live. That is what move-before-cut is for, and it is why this policy's first instinct on a load-bearing comment is to give the fact a mechanism rather than to shorten the prose.
