# Spec mirror: prose em dashes out of user-facing copy

Point-in-time copy of issue #326, written 2026-09-05, before any of its tickets ran.
Delivery run `sessions-by-activity`. Map: #336.
Its own run falsifies claims written here; whoever closes the run marks them in a Delivery record
section rather than editing this body. Citations address the code as it stood on 2026-09-05 and
are never renumbered.

## Delivery record — 2026-09-05, marked at the close of run `sessions-by-activity`

Run `sessions-by-activity` closed on 2026-09-05. The body below is unchanged and stays unchanged; this section marks the claims delivery falsified or settled. Nothing below is deleted, and no `path:line` citation has been renumbered.

Delivered by #330 (email templates, merged `d063e5d`), #331 (the stale comment, merged `19f9f73`) and #335 (the dictionary, merged `155eb1e`).

| Claim in the body | State at close |
|---|---|
| "prose em dashes number 48 there and 23 across `src/lib/email/`" | **Confirmed, both figures exactly.** The 48 survived #333 and #334 editing the dictionary in the same run and were counted again on the branch before merging: 24 English strings and 24 Indonesian. 23 came out of nine email template files; `dues-change-withdrawn.ts` held no rendered dash and was not touched. |
| "The public landing copy is included, but constrained… where a dash cannot be removed without breaking one of them, the string is left as it is" | **Falsified, and the constraint never bound.** `landing.hero.pitch` and `landing.hero.lead` carry no em dash in either locale, so no landing string was rewritten and nothing was at risk against `pitch-budget.test.ts`. Its limits are unchanged because nothing needed them raised. The two authored rules — no sport named, the approval gate disclosed before the sign-in click — are intact for the same reason: the copy they govern was never opened. |
| "Two strings are asserted literally by a test… the community-name validation messages" | **Falsified as the risk, and the real one was elsewhere.** Neither `validation.communityNameTooLong` nor `validation.communityNameWordTooLong` carried an em dash, so `community-name-length.test.ts:163,169` is not in the diff at all. The literal-assertion trap the audit missed is `src/lib/__tests__/seats-filled-view.test.ts`, which asserts the rendered `insights.fillValueRow` character for character at four places rather than naming the dictionary key. The executor stopped rather than widening its write surface, #335's `writes:` was widened by the orchestrator, and the four assertions moved with the string in the same commit. |
| "the range separators including `boardWeekOf` at `dictionaries.ts:537` and `:1809`" | **Overtaken by this run's own first spec.** `boardWeekOf` no longer exists: #333 deleted it with the week navigation. The claim was true when written and the key it names is gone, not rewritten. The other range separators it lists are untouched. |
| "the voice rule is recorded at `dictionaries.ts:187`" and "The dictionary already carries its own voice rule in a comment" | **Confirmed and left alone.** 46 developer comment lines in the dictionary carry em dashes and all 46 survive. They are the record of the plain-voice rule, not user-facing copy, and the non-goal "Rewriting comments, code identifiers or documentation" covers them. After #335 no string value in either locale carries a prose em dash. |

**Claims delivery confirmed, unchanged.**

- Every load-bearing dash is byte-identical: the `EM_DASH` placeholder constants, `TIME_RANGE_DASH`, the inline time ranges including `src/lib/email/day-reminder.ts:52` which still renders `19:00 - 21:00` in both locales, and the payment description separator at `src/app/api/payments/[id]/route.ts:220-221`. None of them lived inside any ticket's write surface.
- Both locales still carry the same key set and no key ships empty. #335 added, renamed and reordered nothing; the key changes in this run are #333's and #334's, which the body already excepts as "the removals another spec in this run owns".
- The email snapshot was regenerated deliberately and its diff is 30 insertions and 30 deletions, all wording: no subject line, link, recipient, tag or template structure moved.
- No lint rule or test banning a character was added, per the testing decision that argued against one.

**One rewrite was handed back during verification, and the record is worth keeping.** #330's English admission subject first became "You are in at ${communityName}", which is not English a person writes. It shipped as "You are in: ${communityName}", matching the label-colon subject form six other templates already use and keeping the parallel to the untouched Indonesian `Kamu diterima di ${communityName}`. The spec's premise that reviewing the snapshot diff is how these rewrites are actually checked is what caught it.

---
## Problem statement

The product's copy reads, in places, like it was written by a machine. The user named the tell: the prose em dash, dropped mid-sentence to join two clauses that a full stop or a comma would join better. An audit of every user-facing string found 48 of them in the dictionary and 23 across the email templates.

The same audit is the reason this spec is narrow. Every other marker of machine-written copy was searched for and not found: no "seamless", "effortless", "empower", "unlock", "leverage", "robust", "elevate", "streamline", "at a glance", "designed to", "ensures that" or "simply", anywhere, in either locale; no "not only, but also"; no doubled exclamation marks. The dictionary already carries its own voice rule in a comment — plain, second person, no superlatives — and follows it. The dash is where it slipped.

## Solution

Rewrite the sentences that carry a prose dash so they no longer need one, in both English and Indonesian, across the member application's strings, the email templates and the public landing copy. Meaning is preserved exactly: this is a rewrite of how a sentence is joined, not of what it says.

Dashes that are doing a job keep doing it. A dash standing in for a value that is not set, a dash separating the two ends of a time range, and the dash inside a generated payment description are all structural, not prose, and are left alone.

## Goals and non-goals

Goals: remove the prose em dash from user-facing copy in both locales; keep each string's meaning, its register and its second-person plainness; leave every load-bearing dash untouched; keep the two locales structurally mirrored, key for key; keep the strings inside the length budgets the tests enforce.

Non-goals: a re-voicing pass over strings that do not carry a dash. Changing which keys exist, apart from the removals another spec in this run owns. Any change to what the product does. Rewriting comments, code identifiers or documentation.

## User stories

1. As a member, I want the product's sentences to read as if a person wrote them, so that the app does not feel generated.
2. As an Indonesian-reading member, I want the same quality of writing as an English-reading one, so that neither locale is the afterthought.
3. As someone receiving a transactional email, I want it to say what happened in plain sentences, so that I can act on it without parsing clause joins.
4. As a stranger reading the public page, I want plain sentences, without losing the specific things that page is careful to say.
5. As a developer, I want the placeholder dashes and range separators left alone, so that a copy pass does not turn a table's "no value" mark into prose.

## Implementation decisions

**The dash is the whole brief.** The audit is the evidence for the scope: the words that usually mark machine-written copy are absent, so a broader re-voicing pass would be churn against snapshot tests and length budgets to fix a defect nobody can point at. Where a rewritten sentence reads better with a different word order, that is fine — but the trigger for touching a string is that it carries a prose dash.

**Both locales, and they stay mirrored.** Every dash-carrying English string has an Indonesian counterpart at the same key. Rewriting one and not the other leaves the two drifting and the next reader unable to tell which is canonical. A structural test already asserts both locales carry the same key set, and this work must keep that true.

**Load-bearing dashes are enumerated and untouched.** Three kinds: the placeholder constant meaning "nothing configured, nothing to draw", used across admin tables; the time-range separator, both as a named constant and inline in templates; and the separator inside a payment description built by string concatenation, which matches a documented pattern. None of these are prose and rewriting any of them would be a defect, not an improvement.

**The public landing copy is included, but constrained.** Its pitch and lead are capped by a test on total characters and longest word, because Indonesian runs materially longer than English and has to fit the same layout. The page also carries authored rules recorded in its own comments: no sport may be named, and the approval gate must be disclosed before the sign-in click rather than after. A rewrite there stays inside both the budget and the rules; where a dash cannot be removed without breaking one of them, the string is left as it is and that is reported rather than silently forced.

**The email snapshot is expected to change, and is regenerated deliberately.** One test renders every template in both locales, strips the markup and locks the text. Any word changed in an email fails it by design. Regenerating it is the correct response here, and reviewing that diff is how the email rewrites are actually checked.

**Two strings are asserted literally by a test.** The community-name validation messages are compared character for character elsewhere. If either is rewritten, the assertion is updated in the same change so that the test still asserts the shipped string rather than a stale one.

**A stale comment is corrected in passing.** The recurring-session generator's header claims it is called from the sessions pages on load. It is not; only the month-end job calls it. This is one line, inside a file this run already reads, and a comment asserting a call site that does not exist is worse than no comment. It is corrected rather than deleted, per this repository's comment rules.

## Testing decisions

Copy is tested here the way this repository already tests it, and no new kind of test is introduced.

The email templates are covered by the existing snapshot of all nine templates in both locales, rendered and tag-stripped. That snapshot is the review surface for this work.

The dictionary is covered by the existing structural tests: both locales carry the same key set, and no key ships empty. The landing pitch and lead are covered by the existing budget test on character count and longest word, which must pass without its limits being raised.

What is deliberately not added: a test asserting that no em dash appears in the dictionary. It would pass today and then fail the first time someone legitimately needs a range separator in a new string, and it would encode a style rule as a build failure in a repository whose voice rules live in comments and are enforced by review.

## Success criteria

- No prose em dash remains in the dictionary or in any email template, in either locale.
- Every load-bearing dash — the "no value" placeholder, the time-range separators, the payment description separator — is byte-identical to before.
- Both locales still carry the same key set, and no key is empty.
- The landing pitch and lead still pass their character and longest-word budgets, without those budgets being changed.
- The email snapshot is regenerated and its diff contains only wording changes, no structural ones.
- Any test asserting a rewritten string literally is updated in the same change and passes.
- Reading a rewritten string beside its original, a reviewer can state that the meaning is unchanged.
- The public page still names no sport and still discloses the approval gate before the sign-in action.

## Out of scope

Re-voicing strings that carry no dash. Admin-only validation and table copy beyond any dash it carries. Adding, renaming or reordering dictionary keys. Comment and documentation prose, apart from the one stale comment named above. Introducing a lint rule or test that bans a character.

## Further notes

Facts established while grilling, true as of 2026-09-05, each an address at the time of writing: the dictionary is `src/lib/i18n/dictionaries.ts`, 2593 lines, 944 key-bearing lines per locale; prose em dashes number 48 there and 23 across `src/lib/email/`; the slop-word sweep over both returned zero hits for every term searched; the voice rule is recorded at `dictionaries.ts:187`; load-bearing dashes are the six `EM_DASH` placeholder constants in the admin cell files, `TIME_RANGE_DASH` at `src/app/(admin)/admin/sessions/session-cells.tsx:20`, the range separators including `boardWeekOf` at `dictionaries.ts:537` and `:1809` and `src/lib/email/day-reminder.ts:52`, and the payment description separator at `src/app/api/payments/[id]/route.ts:220-221`; the email snapshot is `src/lib/__tests__/__snapshots__/email-shell.test.ts.snap`; the literal assertions are at `src/lib/__tests__/community-name-length.test.ts:163,169`; the landing budget test is `src/lib/__tests__/pitch-budget.test.ts:60-82` against `dictionaries.ts:94-95` and `:1536-1537`; the authored landing rules are the comments at `dictionaries.ts:88-108`; the stale comment is `src/lib/recurring-sessions.ts:17`.
