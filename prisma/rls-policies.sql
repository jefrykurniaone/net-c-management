-- =============================================================================
-- RLS Policies: Server-Side Only Access
-- =============================================================================
-- Context:
--   - This app accesses the DB exclusively via Prisma (server-side) using the
--     service_role key, which automatically BYPASSES RLS.
--   - Authentication uses NextAuth (not Supabase Auth), so auth.uid() is always
--     NULL — Supabase Auth roles (anon/authenticated) are never used.
--   - These policies explicitly DENY direct API access for anon/authenticated
--     to resolve the "RLS Enabled No Policy" Security Advisor warning.
--
-- Idempotent and covers EVERY table, including enabling RLS itself — required
-- after a fresh `db push --force-reset`, which recreates tables with RLS off.
-- Apply with:
--   cross-env DATABASE_TARGET=prod prisma db execute --file prisma/rls-policies.sql
-- =============================================================================

-- Account (NextAuth OAuth account table) ──────────────────────────────────────
ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_direct_api_access" ON "Account";
CREATE POLICY "deny_direct_api_access" ON "Account"
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- Session (NextAuth session table) ─────────────────────────────────────────────
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_direct_api_access" ON "Session";
CREATE POLICY "deny_direct_api_access" ON "Session"
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- VerificationToken (NextAuth token table) ─────────────────────────────────────
ALTER TABLE "VerificationToken" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_direct_api_access" ON "VerificationToken";
CREATE POLICY "deny_direct_api_access" ON "VerificationToken"
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- User ─────────────────────────────────────────────────────────────────────────
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_direct_api_access" ON "User";
CREATE POLICY "deny_direct_api_access" ON "User"
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- Activity ─────────────────────────────────────────────────────────────────────
ALTER TABLE "Activity" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_direct_api_access" ON "Activity";
CREATE POLICY "deny_direct_api_access" ON "Activity"
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- Membership ───────────────────────────────────────────────────────────────────
ALTER TABLE "Membership" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_direct_api_access" ON "Membership";
CREATE POLICY "deny_direct_api_access" ON "Membership"
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- ActivitySession ──────────────────────────────────────────────────────────────
ALTER TABLE "ActivitySession" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_direct_api_access" ON "ActivitySession";
CREATE POLICY "deny_direct_api_access" ON "ActivitySession"
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- Attendance ───────────────────────────────────────────────────────────────────
ALTER TABLE "Attendance" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_direct_api_access" ON "Attendance";
CREATE POLICY "deny_direct_api_access" ON "Attendance"
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- Payment ──────────────────────────────────────────────────────────────────────
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_direct_api_access" ON "Payment";
CREATE POLICY "deny_direct_api_access" ON "Payment"
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- Settings ─────────────────────────────────────────────────────────────────────
ALTER TABLE "Settings" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_direct_api_access" ON "Settings";
CREATE POLICY "deny_direct_api_access" ON "Settings"
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
