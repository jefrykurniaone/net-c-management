-- AlterTable
ALTER TABLE "Ekskul" ADD COLUMN     "bankAccountHolder" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "bankAccountNumber" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "bankName" TEXT NOT NULL DEFAULT '';
