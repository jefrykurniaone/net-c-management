# What real data an unauthenticated page may show

Type: grilling
Status: open
Parent: ../map.md
Blocks: 07, 08

## Question

The human chose **real data from the database** over any placeholder proof —
correct under `PRODUCT.md:94`, which forbids invented evidence outright. But `/`
renders for people with no account, so every field shown is a field published to
the internet.

What may this page read, and what must never leave the boundary?

Sub-questions:

- Which entities? Candidates: `Activity` (name, icon, colour, weekly slot,
  capacity, fee), the next few `ActivitySession` rows (date, time, location,
  seats left), counts (activities offered, members). Rule each in or out.
- **Hard no-list, to be confirmed and written down:** `bankName` /
  `bankAccountNumber` / `bankAccountHolder` (`PRODUCT.md:42`), admin WhatsApp
  numbers (`PRODUCT.md:44`), any `User` name or avatar, any `Payment` row.
- Is a **member count** publishable? It is real, so `PRODUCT.md:94` permits it —
  but on a fresh deployment it reads as "3 members", which sells nothing and
  cannot be hidden selectively without becoming a lie by omission. Decide the
  rule now, not per-render.
- Is showing a **venue address and a weekly time** to the open internet a safety
  question for a small community that meets there? Whose call is it — the
  design's, or an admin toggle in Settings?
- Seats-left is real-time and capacity-sensitive; the holds sweep
  (`src/lib/holds.ts`) runs at the top of capacity-sensitive reads. Does a public
  read trigger that sweep, and should it?

## Answer

<!-- resolved by the session that takes this ticket -->
