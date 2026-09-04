# Prisma's generated enums are imported as types and their values written as string literals, in explicitly typed mutable arrays

The rule modules of `docs/adr/0005-pure-rule-modules.md` are read by client components, and several of them are about `AttendanceStatus`, `PaymentStatus` and `SessionStatus`. Importing one of those generated enums as a *value* drags the Prisma client into the browser bundle for the sake of a handful of strings. So they are imported as types, and the values are written as string literals checked against the type — `const SEAT_HOLDING: AttendanceStatus[] = ['REGISTERED', 'PRESENT']` rather than `[AttendanceStatus.REGISTERED, …]`. The literal is still checked: a value renamed in `schema.prisma` fails the type check at every site that spells it, which is the safety the enum import was there for. `src/lib/attendance-admin.ts` and `src/lib/session-lock.ts` are the two modules this bites hardest, and each names it in a line rather than restating the reason.

**The array is explicitly typed and mutable — never `readonly`, and never a `const` assertion.** A Prisma `in` filter takes a mutable array, so `as const` or `readonly AttendanceStatus[]` type-errors at the query rather than at the declaration, a long way from the line that caused it. This repository has already been bitten by that, which is why the shape is written down rather than left to be rediscovered.

A type-only import is erased at compile time, so this rule costs nothing at runtime and reading the *shape* of a `server-only` module's output is likewise not importing it — `src/lib/session-floor.ts` reads a quota's type without pulling in the module that produces it.

**The exception is a value that a statement must name rather than spell.** `src/lib/payment-queue.ts` writes `PaymentStatus.PENDING` into its `ORDER BY … CASE` through the generated enum. That module is `server-only` SQL with no bundle to protect, and the whole point of the statement is that a value which is ever renamed moves the constant and the ordering together instead of leaving a hand-typed string behind.

Status: accepted, 2026-09-04.
