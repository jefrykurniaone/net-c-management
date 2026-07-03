-- Rename the legacy "Ekskul" table and "ekskulId" columns to match the
-- Activity model naming. Pure renames — no data movement. Constraints and
-- indexes are renamed to Prisma's default names so `migrate diff` stays clean.
-- RLS policies and stored expressions follow renames automatically in Postgres.

-- Ekskul -> Activity
ALTER TABLE "Ekskul" RENAME TO "Activity";
ALTER TABLE "Activity" RENAME CONSTRAINT "Ekskul_pkey" TO "Activity_pkey";
ALTER INDEX "Ekskul_slug_key" RENAME TO "Activity_slug_key";

-- Membership.ekskulId -> activityId
ALTER TABLE "Membership" RENAME COLUMN "ekskulId" TO "activityId";
ALTER TABLE "Membership" RENAME CONSTRAINT "Membership_ekskulId_fkey" TO "Membership_activityId_fkey";
ALTER INDEX "Membership_ekskulId_idx" RENAME TO "Membership_activityId_idx";
ALTER INDEX "Membership_userId_ekskulId_key" RENAME TO "Membership_userId_activityId_key";

-- ActivitySession.ekskulId -> activityId
ALTER TABLE "ActivitySession" RENAME COLUMN "ekskulId" TO "activityId";
ALTER TABLE "ActivitySession" RENAME CONSTRAINT "ActivitySession_ekskulId_fkey" TO "ActivitySession_activityId_fkey";
ALTER INDEX "ActivitySession_ekskulId_idx" RENAME TO "ActivitySession_activityId_idx";

-- Payment.ekskulId -> activityId
ALTER TABLE "Payment" RENAME COLUMN "ekskulId" TO "activityId";
ALTER TABLE "Payment" RENAME CONSTRAINT "Payment_ekskulId_fkey" TO "Payment_activityId_fkey";
ALTER INDEX "Payment_ekskulId_idx" RENAME TO "Payment_activityId_idx";
-- Partial monthly-uniqueness index is applied via raw SQL outside Prisma
-- (prisma/payment-monthly-unique.sql) and only exists where that script ran.
ALTER INDEX IF EXISTS "Payment_userId_ekskulId_month_year_monthly_key" RENAME TO "Payment_userId_activityId_month_year_monthly_key";
