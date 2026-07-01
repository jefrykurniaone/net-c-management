-- =============================================================================
-- Partial unique index: one MONTHLY Payment per member / Activity / period
-- =============================================================================
-- Context (Story 3.2, AD-5):
--   - The unconditional @@unique([userId, ekskulId, month, year]) was dropped
--     from the Prisma schema. It would have blocked a member from having both a
--     MONTHLY row and any SESSION row (or a second SESSION row) in the same
--     month/year, which is exactly the mode-partitioned billing we need.
--   - SESSION uniqueness is native (@@unique([userId, sessionId])). MONTHLY
--     uniqueness must be a PARTIAL unique index (WHERE type = 'MONTHLY'), which
--     Prisma `db push` / the schema DSL cannot express — so it is applied here
--     out-of-band via `prisma db execute`.
--   - This index is also the race arbiter for the monthly insert-or-update:
--     concurrent first-uploads for the same period collide here, so exactly one
--     row can ever exist (see src/lib/payments.ts:upsertMonthlyPayment).
-- Apply:
--   npx prisma db execute --file prisma/payment-monthly-unique.sql --schema prisma/schema.prisma
-- Idempotent: safe to re-run.
-- =============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS "Payment_userId_ekskulId_month_year_monthly_key"
  ON "Payment" ("userId", "ekskulId", "month", "year")
  WHERE "type" = 'MONTHLY';
