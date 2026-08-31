import { auth } from "@/lib/auth";
import { admissionDenied, isAdmittedSession } from "@/lib/admission";
import { prisma } from "@/lib/prisma";
import { invalidatePublicLanding } from "@/lib/public-landing";
import { isAdminRole } from "@/lib/utils";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import {
  checkPublicCopyPatch,
  publicCopyRefusalMessage,
} from "@/lib/public-copy";
import { NextResponse } from "next/server";

// GET /api/settings — get all settings as a key-value map.
// Deliberately outside the admission gate: /onboarding reads the community name
// from here, and an Applicant has to get through onboarding before an Admin has
// anything to decide on. Everything in this table is community identity —
// name, logo, default location, the organizer's WhatsApp — which the public
// route already publishes; no key here is member data.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await prisma.settings.findMany();
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  return NextResponse.json(map);
}

// Everything PATCH refuses, before it writes anything. The Admin Settings form
// runs the same two rules client-side, so this is the bypassed-form path: an
// older client, a stale tab, a direct call. The copy caps live in
// src/lib/public-copy.ts and are shared with the form, so the number the
// refusal names here is the number the counter counted against.
async function refuseInvalidSettings(
  body: Record<string, string>,
): Promise<NextResponse | null> {
  const t = getDictionary(await getLocale());

  // Community name is the app's branding fallback everywhere — never let it be
  // blanked out. Reject an empty/whitespace value when the key is submitted.
  if ("communityName" in body && String(body.communityName ?? "").trim() === "") {
    return NextResponse.json(
      { error: t.validation.communityNameRequired },
      { status: 400 },
    );
  }

  const refusal = checkPublicCopyPatch(body);
  if (refusal) {
    return NextResponse.json(
      { error: publicCopyRefusalMessage(refusal, t), key: refusal.key },
      { status: 400 },
    );
  }

  return null;
}

// PATCH /api/settings — upsert settings (admin only)
export async function PATCH(req: Request) {
  const session = await auth();
  if (!isAdmittedSession(session)) {
    return admissionDenied(session);
  }
  if (!isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json() as Record<string, string>;

  const refused = await refuseInvalidSettings(body);
  if (refused) {
    return refused;
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

  // A rename moves the public hero *and* the <title> and OG card (ticket 12).
  // Since #153 the same call is what puts the Admin's freshly saved public copy
  // on `/` immediately, instead of up to an hour later.
  invalidatePublicLanding();

  const updated = await prisma.settings.findMany();
  const map = Object.fromEntries(updated.map((s) => [s.key, s.value]));
  return NextResponse.json(map);
}
