-- Drop the live "monthlyFee" column: the Dues figure is now a DuesRate row,
-- never a column on Activity.
--
-- Safe because every Activity already carries a beginning-of-time DuesRate row
-- (effectiveFrom = 0), written by migration 20260829163748_add_dues_rate for
-- every Activity that existed then, by the Activity create path since, and by
-- both seeders -- so every Billing Period, however far back, still resolves an
-- amount through src/lib/dues-rate.ts once this column is gone. No other
-- column or table is touched: no Payment row changes.
ALTER TABLE "Activity" DROP COLUMN "monthlyFee";
