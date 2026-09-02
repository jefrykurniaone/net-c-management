-- Bring two hand-applied database objects under migration control.
--
-- Until this migration, the partial unique index on MONTHLY payments and the
-- row-level security policies existed only as loose SQL files beside this
-- directory (prisma/payment-monthly-unique.sql, prisma/rls-policies.sql). No
-- migration applied either one, so a database built by `prisma migrate deploy`
-- alone had neither, and both depended on a human remembering to run
-- `prisma db execute`. This migration is now the mechanism, and those two files
-- were deleted in the same change: a second, hand-executable copy of this DDL
-- is exactly the untracked drift that migrations exist to prevent. Their
-- contents are preserved in git history.
--
-- Every statement below is idempotent. The migration is designed to be applied
-- both to a database that already has these objects (production, where the
-- loose files were executed by hand) and to one that has neither (a fresh
-- database, or a local development database).

-- ---------------------------------------------------------------------------
-- 1. Pre-existing duplicate MONTHLY payments: refuse, never delete.
-- ---------------------------------------------------------------------------
-- Creating a unique index fails if the table already holds rows that violate
-- it. This migration deliberately does NOT de-duplicate. A Payment row is a
-- financial record: it carries an amount, a status, a confirming admin, and a
-- proof-of-payment object in Supabase Storage behind proofUrl/proofPath.
-- Choosing which of two competing rows "counted" is a business decision about
-- money that no automated rule can make safely, and a DELETE here would also
-- orphan the storage object belonging to the discarded row.
--
-- So instead of guessing, the migration stops and names the offending groups.
-- The operator reconciles them by hand and re-runs. This costs a failed deploy
-- in the duplicate case; silently destroying a payment record would cost more.
--
-- To check before deploying, run this query against the target database:
--
--   SELECT "userId", "activityId", "month", "year", COUNT(*)
--   FROM "Payment" WHERE "type" = 'MONTHLY'
--   GROUP BY 1, 2, 3, 4 HAVING COUNT(*) > 1;
--
-- A database that already carries the index cannot have duplicates, so this
-- guard passes trivially there.
DO $$
DECLARE
  duplicate_groups integer;
  offending_groups text;
BEGIN
  WITH duplicates AS (
    SELECT "userId", "activityId", "month", "year", COUNT(*) AS row_count
    FROM "Payment"
    WHERE "type" = 'MONTHLY'
    GROUP BY "userId", "activityId", "month", "year"
    HAVING COUNT(*) > 1
  )
  SELECT
    COUNT(*),
    string_agg(
      format('(userId=%s activityId=%s period=%s/%s rows=%s)',
             "userId", "activityId", "month", "year", row_count),
      ', '
    )
  INTO duplicate_groups, offending_groups
  FROM duplicates;

  IF duplicate_groups > 0 THEN
    RAISE EXCEPTION
      USING MESSAGE = format(
              'Cannot create the MONTHLY partial unique index: %s duplicate group(s) exist.',
              duplicate_groups),
            DETAIL = offending_groups,
            HINT = 'Reconcile each group by hand (decide which Payment row counted, '
                   'remove its proof object from Supabase Storage if you delete a row), '
                   'then re-run this migration. This migration will not choose for you.';
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 2. Partial unique index: one MONTHLY Payment per member / Activity / period.
-- ---------------------------------------------------------------------------
-- SESSION uniqueness is native to the schema (@@unique([userId, sessionId]));
-- NULLs are distinct in PostgreSQL, so MONTHLY rows (sessionId = null) are
-- unaffected by it. MONTHLY uniqueness needs a PARTIAL unique index instead.
--
-- This index is also the race arbiter for the monthly insert-or-update in
-- src/lib/payments.ts:upsertMonthlyPayment. That function hand-rolls
-- update-then-create because the ORM cannot target a partial index, and relies
-- on a concurrent create losing the race here with P2002. Without the index,
-- two concurrent monthly writes can both create a row.
--
-- The name is kept byte-for-byte identical to the one the loose SQL file
-- created, so a database that already has it is left exactly as it is. IF NOT
-- EXISTS is what makes that path a no-op rather than a "relation already
-- exists" failure.
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_userId_activityId_month_year_monthly_key"
  ON "Payment" ("userId", "activityId", "month", "year")
  WHERE "type" = 'MONTHLY';

-- ---------------------------------------------------------------------------
-- 3. Roles the policies are granted to.
-- ---------------------------------------------------------------------------
-- anon and authenticated are created by Supabase, so they already exist in
-- production and this block is a no-op there. They do NOT exist on a plain
-- PostgreSQL cluster, which is what local development runs, and CREATE POLICY
-- ... TO anon, authenticated fails outright when the role is missing.
--
-- Creating them when absent is what lets the same policy definition apply
-- everywhere, which is the entire point of bringing this under migration
-- control: local and production end up with identical catalog state instead of
-- drifting. Both roles are NOLOGIN and hold no grants, so on a cluster that is
-- not Supabase they are inert. Note that roles are cluster-wide in PostgreSQL,
-- not database-scoped.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 4. Row-level security: deny direct API access on every application table.
-- ---------------------------------------------------------------------------
-- This app reaches the database exclusively through Prisma using the service
-- role, which bypasses RLS, and authenticates with NextAuth rather than
-- Supabase Auth, so auth.uid() is always NULL and the anon/authenticated roles
-- are never used by the application. These policies exist to deny direct
-- PostgREST access to those two roles and to resolve Supabase Security
-- Advisor's "RLS Enabled No Policy" warning.
--
-- Driven from one table list rather than eleven copy-pasted blocks, so no
-- table can be missed or fall out of step with the others. ENABLE ROW LEVEL
-- SECURITY is idempotent, and DROP POLICY IF EXISTS before CREATE POLICY makes
-- the policy definition idempotent too.
--
-- _prisma_migrations is deliberately absent: it is Prisma's own bookkeeping
-- table and was not covered by the loose SQL file either. This migration only
-- brings the existing policies under migration control and does not change
-- which tables they cover or what they say.
DO $$
DECLARE
  target_table text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'Account', 'Session', 'VerificationToken', 'User', 'Activity', 'Membership',
    'ActivitySession', 'Attendance', 'Payment', 'DuesRate', 'Settings'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', target_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I',
                   'deny_direct_api_access', target_table);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL TO anon, authenticated '
      'USING (false) WITH CHECK (false)',
      'deny_direct_api_access', target_table);
  END LOOP;
END
$$;
