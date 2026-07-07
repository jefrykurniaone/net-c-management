-- AlterEnum
ALTER TYPE "AttendanceStatus" ADD VALUE 'MAYBE';

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "holdExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Attendance_holdExpiresAt_idx" ON "Attendance"("holdExpiresAt");
