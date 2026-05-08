import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

  const body = await req.json() as {
    name?: string;
    phone?: string;
    playPosition?: string;
    playerLevel?: string;
  };

  // Basic validation
  if (body.name && (body.name.length < 2 || body.name.length > 100)) {
    return NextResponse.json({ error: "Nama tidak valid" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(body.name ? { name: body.name } : {}),
      ...(body.phone ? { phone: body.phone } : {}),
      ...(body.playPosition ? { playPosition: body.playPosition as never } : {}),
      ...(body.playerLevel ? { playerLevel: body.playerLevel as never } : {}),
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
