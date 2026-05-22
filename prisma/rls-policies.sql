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
-- =============================================================================

-- BadmintonSession ─────────────────────────────────────────────────────────────
CREATE POLICY "deny_direct_api_access" ON "BadmintonSession"
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- Payment ──────────────────────────────────────────────────────────────────────
CREATE POLICY "deny_direct_api_access" ON "Payment"
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- Session (NextAuth session table) ─────────────────────────────────────────────
CREATE POLICY "deny_direct_api_access" ON "Session"
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- Settings ─────────────────────────────────────────────────────────────────────
CREATE POLICY "deny_direct_api_access" ON "Settings"
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- User ─────────────────────────────────────────────────────────────────────────
CREATE POLICY "deny_direct_api_access" ON "User"
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- VerificationToken (NextAuth token table) ─────────────────────────────────────
CREATE POLICY "deny_direct_api_access" ON "VerificationToken"
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
