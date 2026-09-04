# Spec: storage object retention across the four buckets

| | |
|---|---|
| Spec | [#303](https://github.com/jefrykurniaone/net-c-management/issues/303) — `spec:storage-retention` |
| Run | `run:retention` |
| Execution map | [#309](https://github.com/jefrykurniaone/net-c-management/issues/309) |
| Tickets | #305, #306, #307, #308 — sub-issues of #303 |
| Version | v1 (2026-09-04) |
| Grilled from | [#293](https://github.com/jefrykurniaone/net-c-management/issues/293), orphaned avatar objects, filed out of #248 |
| Split out | [#302](https://github.com/jefrykurniaone/net-c-management/issues/302) — the settings route writes arbitrary keys and can strand a hero photograph. Found during the grill, deliberately not folded in. |
| Depends on | nothing. The production measurement is outstanding as of 2026-09-04 and gates only the separate purge work, not this spec. |

This is a verbatim copy of the tracker issue at the time of ticketing. The issue is the live record; this file is the durable one. Below the rule is the issue body.

---
## Problem statement

When a member replaces their profile picture, the picture they replaced stays in storage forever. When an admin replaces the community logo with a file in a different format, the old logo stays too, and both files sit in the bucket with only one of them shown. When a member gives up a seat they had reserved but not paid for, the payment record disappears and the uploaded proof stays behind, with nothing left in the system that points to it or explains what it is.

None of this is visible to anyone using the app. It surfaces only as a bucket that grows and cannot be reasoned about: nobody can look at the stored files and say which ones the community still relies on, which are superseded, and which are the residue of a record that no longer exists. That matters most for the pictures of people's faces, which stay retrievable after the member has replaced them, and for payment proofs, where the inability to tell a live proof from a stranded one undermines the one thing proofs are for.

The community already solved this once, for the hero photograph on the public page, and the solution never reached the other three places.

## Solution

Every file the app stores gets an explicit answer to one question: when it is superseded or its record is deleted, does it go, and who decides?

- A member's replaced profile picture is removed when they upload a new one. Their earlier pictures — including ones already stranded — go with it.
- The community logo behaves like the hero photograph already does: uploading a new one leaves exactly one logo, whatever format either file was in.
- A payment proof lives exactly as long as the claim it backs. Give up an unpaid reservation and the proof goes with the record. A confirmed payment is evidence and is never touched, because the record that holds it already cannot be deleted.
- The hero photograph is unchanged. It is the model the rest now follow.

Nobody using the app sees a new screen or a new button. What changes is that the stored files and the records finally agree with each other, and the rule they agree by is written down instead of being rediscovered per bucket.

## Goals and non-goals

**Goals**

- One recorded retention rule per storage bucket, with the reason it was chosen.
- Superseded and stranded files stop accumulating on every path the app writes today.
- A member's upload never fails because cleaning up their old file failed.
- A deliberate delete never reports success when the file is still there.
- The logic that decides *which* files to remove is testable without touching storage.

**Non-goals**

- Reducing storage cost. Cost is not the driver, and if it were, the target would be payment proofs, which are the one thing that should grow.
- Removing files that are already stranded in production. That is real deletion against real data and is its own decision, gated on measuring what is actually there.
- Any change to what a member or admin sees, or to any upload flow's inputs, limits, or validation.
- Retention *periods*. Nothing here expires on a clock; files are tied to the life of the record that references them.

## User stories

1. As a member, I want my previous profile pictures gone once I replace them, so that a picture of my face is not retrievable after I have decided to change it.
2. As a member, I want my new profile picture to upload successfully even if clearing the old one fails, so that a background tidy-up problem never blocks something I am waiting on.
3. As a member who gives up a reserved seat I never paid for, I want the proof I uploaded to go with the reservation, so that an image of my transfer receipt does not outlive the claim it was submitted for.
4. As a member whose payment was confirmed, I want my proof kept, so that the record of a payment I made is not weakened.
5. As an admin, I want uploading a new community logo to leave exactly one logo, so that switching image format does not silently leave the old one behind.
6. As an admin who deliberately removes an image, I want to be told if the removal failed, so that I never believe something is gone when it is still stored.
7. As a maintainer, I want the retention rule for each bucket written down with its reason, so that the next bucket added inherits an answer instead of repeating this investigation.
8. As a maintainer, I want the file-selection logic covered by tests, so that a change to it cannot start deleting the wrong files unnoticed.

## Implementation decisions

**The hero-photograph pattern is the basis, and it does not generalise unchanged.** The existing hero-image flow clears every object in its bucket before writing the new one, so accumulation is impossible regardless of what the file is named or what format it is in. That works because the bucket holds exactly one meaningful file. The community logo is the same shape and adopts it directly. Profile pictures and payment proofs are *not* that shape — each member and each payment owns files — so the same idea is applied scoped to one owner rather than to the whole bucket. **This distinction is the single most important thing to record**, because applying the unscoped version to profile pictures would delete every member's picture.

**Profile pictures clear by owner, not by remembered path.** On upload, the member's own area is listed and everything that is not the file just written is removed. The alternative — storing the path of the current picture on the member record and deleting that one — was rejected: it needs a schema change, and it can only ever clean up files uploaded *after* it ships, leaving every already-stranded file stranded permanently. Clearing by owner collects a member's history the first time they upload again, with no migration.

**A stable filename per member was rejected.** Naming the file after the member so each upload overwrites the last looks simpler, but the filename carries the image format, so a member switching format writes a second file and overwrites nothing. That is precisely the defect the community logo is sitting in today.

**Payment proofs already carry everything needed.** The storage location of a proof is recorded on the payment when it is uploaded, in exactly the form the removal call expects. No schema change, no deriving a location from a public link. Only the development seed omits it, which is why the seeded rows look as though the field is unused.

**The removal happens after the database transaction commits, never inside it.** Seat release runs as a single transaction holding a lock on the payment row. Storage removal is a network call to a third party and cannot participate in that transaction: if it succeeds and the transaction then rolls back, the surviving record points at evidence that no longer exists — worse than the stranded file this work exists to remove. It also holds a money row lock open across a third-party call, which the standing decision on row locks exists to prevent. So the storage location is read inside the transaction *before* the record is deleted, carried out, and acted on after commit. **That read order is load-bearing**: once the record is gone, so is the location.

Its failure mode is deliberately the weaker one — a crash between commit and removal strands a single file, which is exactly the condition the separate purge work already covers.

**Failure behaviour splits by what the user asked for.** A deliberate delete — an admin removing an image, a member removing their picture — reports failure, because the person asked for the file to be gone and must not be told it is gone while it remains. A cleanup that happens *during a replace* swallows the failure and logs it: the new file is already stored, the person is waiting, and a leftover predecessor is untidy rather than wrong. Both halves live in one place so the next bucket does not re-decide.

**Per-bucket drivers, recorded.** Privacy for profile pictures; evidence for payment proofs; tidiness for the logo and hero photograph. Cost is explicitly not a driver for any of them. These differ, and recording them is what stops a future change applying one bucket's answer to another.

**The decisions above are recorded as an architecture decision record**, not as comments spread across the modules that implement them, because they govern four buckets and every bucket added later.

## Testing decisions

**One seam, and it is a pure one.** The part worth testing is the decision — given the files currently in an owner's area and the file just written, which files are removed — because that is the part whose failure deletes the wrong thing. Extracted as a pure function taking a listing and returning the removals, tested under the existing pure-logic test directory. This follows the repository's standing decision to put rules in pure modules, and matches how the neighbouring proof-link logic is already tested.

**The storage call itself is not covered**, deliberately. It is a single call whose failure mode is a network error, not a wrong answer, and covering it would mean adding the storage client as a test double for the first time in this repository and carrying that double into every later storage test.

A good test here names the situation rather than the mechanics: a member with several older files keeps only the newest; a member with none is left alone; the file just written is never itself removed. That last one is the case that turns a tidy-up into data loss, and it is the reason the seam exists.

Behaviour that only exists at the network boundary — a failed removal not breaking an upload, a failed deliberate delete surfacing — is verified by exercising the app, not by a unit test.

## Success criteria

- Uploading a replacement profile picture leaves exactly one file for that member, and any files that member had stranded earlier are gone too.
- Uploading a replacement community logo leaves exactly one logo, including when the two uploads are different image formats.
- Giving up an unpaid reservation removes the uploaded proof along with the payment record.
- A confirmed payment's proof is never removed, and the existing protection on confirmed records is what guarantees it rather than a new check.
- A simulated storage failure during a replace does not fail the upload, and is logged.
- A simulated storage failure during a deliberate delete surfaces to the person who asked for it.
- The removal-selection function is covered by tests, including the case where the newly written file must not be selected.
- Each of the four buckets has its rule and its reason recorded in one architecture decision record, including why the whole-bucket clear does not apply to per-owner buckets.
- The hero photograph flow is unchanged.
- The full test suite passes, and lint and type-check are green.

## Out of scope

- Removing files already stranded in production. Separate work, gated on measuring production.
- The settings route that writes arbitrary keys and can strand a hero photograph, filed separately.
- Any retention period, expiry clock, or scheduled sweep. Nothing here runs on a schedule; a sweep is only reconsidered if the production measurement shows the per-upload cleanup cannot catch up.
- Changing the hero photograph implementation, which is already correct.
- Cost optimisation, storage tiering, or image compression.
- Deleting a member and cascading their files, which no code path currently reaches.

## Further notes

The production position is still unmeasured: the credentials for listing production storage are not on the developer machine. Nothing in this spec depends on that figure — it sizes the separate purge work only. The development measurement is not a substitute, because storage survives a database reseed while the records do not, so every surviving development file reads as stranded regardless of whether the defect exists.

The hero photograph flow that this spec generalises was itself built to fix the same class of problem in one place. That it was not carried to the other three buckets at the time is the reason this run exists, and is worth one sentence in the decision record so the next singleton bucket inherits it by default rather than by someone remembering.
