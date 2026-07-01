import 'server-only';
import { Prisma, PaymentStatus, PaymentType } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/**
 * Server-only payment writes (Story 3.2, AD-5).
 *
 * MONTHLY uniqueness is a PARTIAL unique index — `(userId, ekskulId, month,
 * year) WHERE type = 'MONTHLY'` (see prisma/payment-monthly-unique.sql).
 * `prisma.payment.upsert` cannot target a partial index, so the monthly
 * insert-or-update is done by hand here: update-first, then create, with the
 * partial index as the race arbiter (a concurrent create that loses the race
 * throws P2002 and we fall back to update). This keeps Prisma-generated cuid
 * ids and gives every monthly billing path one race-free write.
 */

const UNIQUE_VIOLATION = 'P2002';

/** The fields a monthly proof-upload writes. `amount` snapshots the fee. */
export interface MonthlyPaymentInput {
  userId: string;
  ekskulId: string;
  amount: number;
  month: number;
  year: number;
  proofUrl: string;
  proofPath: string;
}

/**
 * Insert-or-update the single MONTHLY Payment row for a member / Activity /
 * period, race-free. Re-uploading resets it to PENDING and clears any prior
 * confirmation, matching the pre-migration upsert behavior (NFR-8).
 */
export async function upsertMonthlyPayment(input: MonthlyPaymentInput) {
  const { userId, ekskulId, amount, month, year, proofUrl, proofPath } = input;
  const filter = { userId, ekskulId, month, year, type: PaymentType.MONTHLY };
  const mutable = {
    amount,
    status: PaymentStatus.PENDING,
    proofUrl,
    proofPath,
    confirmedBy: null,
    confirmedAt: null,
  };

  const { count } = await prisma.payment.updateMany({ where: filter, data: mutable });
  if (count > 0) {
    return prisma.payment.findFirstOrThrow({ where: filter });
  }

  try {
    return await prisma.payment.create({
      data: { userId, ekskulId, month, year, type: PaymentType.MONTHLY, ...mutable },
    });
  } catch (error) {
    // A concurrent create won the race and the partial unique index rejected
    // this one — the row now exists, so update it instead.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === UNIQUE_VIOLATION
    ) {
      await prisma.payment.updateMany({ where: filter, data: mutable });
      return prisma.payment.findFirstOrThrow({ where: filter });
    }
    throw error;
  }
}
