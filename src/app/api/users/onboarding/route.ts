import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { onboardingSchema } from "@/lib/validations/user";
import { NextResponse } from "next/server";

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = onboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, phone, playPosition, playerLevel } = parsed.data;

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name,
      phone,
      playPosition,
      playerLevel,
      isProfileComplete: true,
    },
    select: {
      id: true,
      name: true,
      phone: true,
      playPosition: true,
      playerLevel: true,
      isProfileComplete: true,
    },
  });

  return NextResponse.json(updated);
}
