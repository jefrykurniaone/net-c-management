import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { buildUpdateProfileSchema } from "@/lib/validations/user";
import { NextResponse } from "next/server";

// GET /api/users/profile — get current user's full profile
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      phone: true,
      playPosition: true,
      playerLevel: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json(user);
}

// PATCH /api/users/profile — update current user's profile
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  const { name, phone, playPosition, playerLevel } = parsed.data;

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(name ? { name } : {}),
      ...(phone ? { phone } : {}),
      ...(playPosition ? { playPosition } : {}),
      ...(playerLevel ? { playerLevel } : {}),
    },
    select: {
      id: true,
      name: true,
      phone: true,
      playPosition: true,
      playerLevel: true,
    },
  });

  return NextResponse.json(updated);
}
