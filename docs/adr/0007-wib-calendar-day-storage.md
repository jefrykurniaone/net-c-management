# A Session's date is stored as UTC midnight of its WIB calendar day, so every day boundary is built and read with the `getUTC*` accessors

`ActivitySession.date` does not hold an instant the Session happens at. It holds the Session's WIB calendar day, encoded as UTC midnight of that day (#197). The stored value is therefore a label for a day, and reading it as a moment in the server's own zone is what produces a Tuesday Session that advertises itself as Monday.

Everything downstream follows from that one fact. A day, a week edge or a range boundary compared against a stored date is built with `Date.UTC` and read back with `getUTCDay`, `getUTCDate`, `getUTCMonth` and `getUTCFullYear` — never with `getDay()`, never with a locale-aware formatter, and never with the server's own midnight. A range that a member sees starts from `wibDayStart` rather than from `new Date()` truncated locally: a server running in UTC would otherwise call a Session past from 07:00 WIB, mid-morning of the day it actually happens on, which is how a Session disappears from a board while people are still on their way to it. `src/lib/wib.ts` holds the conversions; `src/lib/board-days.ts`, `src/lib/sessions-board.ts`, `src/lib/dashboard-sessions.ts`, `src/lib/chart-weeks.ts` and `src/lib/session-lock.ts` are the surfaces that depend on them.

The weekly charts inherit the same rule through their week edges. A Monday-start week boundary built with `Date.UTC` lines up with the stored dates exactly, and the Monday rule itself lives in `mondayOf` in `src/lib/chart-weeks.ts` and nowhere else, so there is one definition of where a week begins rather than one per chart.

This record states the encoding and its consequence. It does not decide the display zone of any timestamp that genuinely is an instant — `createdAt`, `holdExpiresAt`, a Payment's own moment — which are ordinary timestamps and are not what this is about.

Status: accepted, 2026-09-04.
