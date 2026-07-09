import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdminRole } from "@/lib/utils";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { NextResponse } from "next/server";

// GET /api/settings — get all settings as a key-value map
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await prisma.settings.findMany();
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  return NextResponse.json(map);
}

// PATCH /api/settings — upsert settings (admin only)
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json() as Record<string, string>;

  // Community name is the app's branding fallback everywhere — never let it be
  // blanked out. Reject an empty/whitespace value when the key is submitted.
  if ("communityName" in body && String(body.communityName ?? "").trim() === "") {
    const t = getDictionary(await getLocale());
    return NextResponse.json(
      { error: t.validation.communityNameRequired },
      { status: 400 },
    );
  }

  await Promise.all(
    Object.entries(body).map(([key, value]) =>
      prisma.settings.upsert({
        where: { key },
        create: { key, value: String(value) },
        update: { value: String(value) },
      })
    )
  );

  const updated = await prisma.settings.findMany();
  const map = Object.fromEntries(updated.map((s) => [s.key, s.value]));
  return NextResponse.json(map);
}
