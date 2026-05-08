import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadPaymentProof, PAYMENT_PROOFS_BUCKET } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// POST /api/payments/upload — upload proof image + create/update payment record
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const month = parseInt(formData.get("month") as string);
  const year = parseInt(formData.get("year") as string);
  const amount = parseInt(formData.get("amount") as string);

  if (!file) {
    return NextResponse.json({ error: "File wajib diupload" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Format file tidak didukung. Gunakan JPG, PNG, atau WebP." },
      { status: 400 }
    );
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "Ukuran file maksimal 5MB." },
      { status: 400 }
    );
  }
  if (!month || month < 1 || month > 12 || !year || year < 2020) {
    return NextResponse.json({ error: "Bulan/tahun tidak valid" }, { status: 400 });
  }
  if (!amount || amount < 1) {
    return NextResponse.json({ error: "Jumlah pembayaran tidak valid" }, { status: 400 });
  }

  const ext = file.type.split("/")[1];
  const storagePath = `${session.user.id}/${year}-${String(month).padStart(2, "0")}-${randomUUID()}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { url, path } = await uploadPaymentProof(buffer, storagePath, file.type);

  // Upsert payment record — one record per user per month/year
  const payment = await prisma.payment.upsert({
    where: {
      userId_month_year: {
        userId: session.user.id,
        month,
        year,
      },
    },
    create: {
      userId: session.user.id,
      amount,
      month,
      year,
      status: "PENDING",
      proofUrl: url,
      proofPath: path,
    },
    update: {
      amount,
      status: "PENDING",
      proofUrl: url,
      proofPath: path,
      confirmedBy: null,
      confirmedAt: null,
    },
  });

  return NextResponse.json(payment, { status: 201 });
}
