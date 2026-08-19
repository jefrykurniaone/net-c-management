-- AlterTable
ALTER TABLE "User" ADD COLUMN     "admittedAt" TIMESTAMP(3);

-- Backfill: everyone who already had an account was already in. A null
-- `admittedAt` means "never admitted", so without this every existing member —
-- including the OWNER who has to work the queue — would be locked out at the
-- door the moment the gate goes live.
UPDATE "User" SET "admittedAt" = "createdAt" WHERE "admittedAt" IS NULL;

-- CreateIndex
CREATE INDEX "User_admittedAt_isActive_idx" ON "User"("admittedAt", "isActive");
