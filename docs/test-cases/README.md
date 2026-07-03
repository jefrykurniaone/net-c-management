# Test Cases — Sports Community Management App

End-to-end test case documentation for the Sports Community Management app (Next.js 16 + Prisma + Supabase + NextAuth).

## Folder Structure

| Folder | Scope |
|---|---|
| `01-auth-onboarding/` | Sign-in (Google OAuth, dev login), middleware routing, profile onboarding |
| `02-sessions-attendance/` | Sessions from the member side (list, detail, RSVP, cancel) and admin side (CRUD, manual attendance, export) |
| `03-payments/` | Monthly payments, per-session payments, payment-mode selection/switching, admin review |
| `04-activities-membership/` | Activity CRUD (admin), join/leave membership (member) |
| `05-admin-users-settings/` | User management (role, active/inactive), community settings, profile & avatar |
| `06-cross-cutting/` | i18n, cross-endpoint authorization, file-upload validation, pagination, general edge cases |

## Writing Conventions

- **Test case ID**: `TC-<AREA>-<NNN>`, e.g. `TC-AUTH-001`.
- **Priority**: `P0` (critical — money/access), `P1` (core functionality), `P2` (secondary/UI edge case).
- **Type**: `Positive` (happy path), `Negative` (invalid input/rejected), `Edge` (boundary condition).
- Every case includes: preconditions, steps, expected result (including HTTP status for API calls).

## Test Environment Prerequisites

1. PostgreSQL database (Supabase) fully migrated (`npx prisma migrate dev`).
2. Supabase Storage buckets available: `payment-proofs`, `avatars`, `logos`.
3. Env vars set: `DATABASE_URL`, `AUTH_SECRET`, Google OAuth credentials, `SUPABASE_SERVICE_ROLE_KEY`.
4. Run `npm run dev` (the dev login page `/auth/dev` is only available in non-production).

## Standard Test Data

Prepare the following users (via seed or dev login):

| Alias | Role | State |
|---|---|---|
| `owner` | OWNER | Profile complete |
| `admin` | ADMIN | Profile complete |
| `member-monthly` | MEMBER | Profile complete, member of Activity A, mode MONTHLY |
| `member-persession` | MEMBER | Profile complete, member of Activity A, mode PER_SESSION |
| `member-new` | MEMBER | First login, `isProfileComplete = false` |
| `member-outsider` | MEMBER | Profile complete, NOT a member of Activity A |

Test activities:

| Alias | State |
|---|---|
| Activity A | Active, `monthlyFee > 0`, `sessionFee > 0`, `allowsMonthly = true`, `allowsPerSession = true`, bank account filled |
| Activity B | Active, `allowsMonthly = true` only, `monthlyFee > 0` |
| Activity C | Inactive (`isActive = false`) |
| Activity D | Active, `monthlyFee = 0`, `sessionFee = 0` (free) |

Upload test files:

| Alias | Description |
|---|---|
| `proof-ok.jpg` | Valid JPEG < 5MB |
| `proof-ok.png` / `proof-ok.webp` | Valid PNG/WebP < 5MB |
| `proof-large.jpg` | JPEG > 5MB |
| `proof-wrong.pdf` | PDF (disallowed type) |
| `proof-fake.jpg` | Non-image file renamed to `.jpg` |
