import { auth } from "@/lib/auth";
import { admissionDenied, isAdmittedSession } from "@/lib/admission";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { buildUpdateProfileSchema } from "@/lib/validations/user";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!isAdmittedSession(session)) {
    return admissionDenied(session);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      phone: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json(user);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!isAdmittedSession(session)) {
    return admissionDenied(session);
  }

  const locale = await getLocale();
  const t = getDictionary(locale);

  const body = await req.json();
  const parsed = buildUpdateProfileSchema(t).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: t.common.error, details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { name, phone } = parsed.data;

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(name ? { name } : {}),
      ...(phone ? { phone } : {}),
    },
    select: {
      id: true,
      name: true,
      phone: true,
    },
  });

  return NextResponse.json(updated);
}
