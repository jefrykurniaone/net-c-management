import { auth } from "@/lib/auth";
import { admissionDenied, isAdmittedSession } from "@/lib/admission";
import { prisma } from "@/lib/prisma";
import { invalidatePublicLanding } from "@/lib/public-landing";
import { isAdminRole } from "@/lib/utils";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary, type Dictionary } from "@/lib/i18n/dictionaries";
import {
  checkPublicCopyPatch,
  longestWordLength,
  publicCopyRefusalMessage,
  PUBLIC_COPY_KEYS,
} from "@/lib/public-copy";
import { NextResponse } from "next/server";

// GET /api/settings — get all settings as a key-value map.
// Deliberately outside the admission gate: /onboarding reads the community name
// from here, and an Applicant has to get through onboarding before an Admin has
// anything to decide on. The exemption rests on no key in this table being
// *member* data — not on the public route already publishing them. This returns
// every Settings row to any signed-in session, including keys the public route
// deliberately withholds (`adminWhatsapp`, `defaultLocation`) and operational
// ones (`holdDurationMinutes`); `PUBLIC_SETTINGS_KEYS` in
// `src/lib/public-landing.ts` is the far narrower public allow-list.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await prisma.settings.findMany();
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  return NextResponse.json(map);
}

// Everything PATCH refuses, before it writes anything. The public-copy caps
// live in src/lib/public-copy.ts and the Admin Settings form counts against
// them client-side, so the number the refusal names here is the number the
// counter counted against, and this is that rule's bypassed-form path: an older
// client, a stale tab, a direct call.
//
// The community-name caps below have no second copy: the form has nothing to
// count against and shows the message this route returns (#209), which keeps
// one number in one place rather than a cap that drifts between the two.
/**
 * The community name is the one Settings value that is *typeset* rather than
 * merely stored: it wears `type-title` in the public landing rail
 * (`src/components/landing/identity-rail.tsx`) and in every threshold rail. #209
 * removed the mid-word break those rails used to fall back on, and refused
 * truncation, so the value itself is where the fit is bounded — no size the
 * design system owns is small enough to hold an unbounded word.
 *
 * Both numbers were measured on 2026-09-04 in headless Chromium against the
 * committed Archivo variable font and the `type-title` role verbatim (17px,
 * weight 700, letter-spacing -0.01em), at a 390px viewport:
 *
 *  - **18 letters per word.** The narrowest width a rail can give the wordmark
 *    at 390px is 312px — the threshold rail's line (390 less 32px of
 *    `px-block`, a 36px mark and a 10px `gap-cell`), which is also what the
 *    landing rail yields once its control row takes a second flex row. `W` is
 *    the widest glyph in the family at weight 700 (16.218px), so the worst
 *    possible 18-letter word measures 291.94px and clears 312px with 20.06px
 *    to spare. 19 letters (308.16px) is the measured ceiling and 20 (324.38px)
 *    overflows; 18 keeps the margin and still admits every real word tested,
 *    including `Sportgemeinschaft` at 17.
 *  - **48 characters total.** Total length drives line count, not width. At the
 *    landing rail's unwrapped 164.06px a realistic 46-character name sets 3
 *    line boxes and 49 characters is where a 4th begins, so 48 holds the
 *    wordmark to three lines and an 87.28px rail. It is also the cap
 *    `PUBLIC_COPY_CAPS.heroHeadline` already sets for the loudest
 *    Admin-authored line on the same page, so the name is not held to a looser
 *    rule than the headline beside it.
 *
 * Same split, and the same reasoning, as the hero headline's own pair of caps.
 */
const COMMUNITY_NAME_MAX_LENGTH = 48;
const COMMUNITY_NAME_MAX_WORD_LENGTH = 18;

function badRequest(error: string): NextResponse {
  return NextResponse.json({ error }, { status: 400 });
}

/**
 * Every `Settings` key the application declares: the identity and
 * operational fields the Admin form edits directly, plus the
 * Admin-authored public copy (#153, `PUBLIC_COPY_KEYS`). PATCH treats this
 * as its allow-list (#302) — a key outside it is refused before anything
 * is written, rather than upserted sight unseen.
 */
const DECLARED_SETTINGS_KEYS = [
  "communityName",
  "defaultLocation",
  "adminWhatsapp",
  "logoUrl",
  "heroImageUrl",
  "holdDurationMinutes",
  ...PUBLIC_COPY_KEYS,
] as const;

/**
 * Declared keys a dedicated route owns end to end — the `Settings` row and
 * a Storage bucket object kept in step (`POST`/`DELETE
 * /api/settings/hero-image`, `POST /api/settings/logo`; #155). PATCH still
 * accepts a body carrying either without refusing the request, because the
 * Admin Settings form always echoes both back unchanged
 * (`use-settings-form.ts:184`) — refusing them would break every ordinary
 * Save. It just never lets either reach the table, so a direct
 * `{"heroImageUrl": ...}` call can no longer strand the bucket object the
 * dedicated route manages.
 */
const ROUTE_OWNED_SETTINGS_KEYS = new Set(["logoUrl", "heroImageUrl"]);

/** The first key in `body` the application does not declare, or `undefined`
 *  when every key is declared. */
function findUndeclaredSettingsKey(
  body: Record<string, string>,
): string | undefined {
  return Object.keys(body).find(
    (key) => !(DECLARED_SETTINGS_KEYS as readonly string[]).includes(key),
  );
}

/**
 * The three community-name refusals, in the order the Admin meets them. Word
 * length is measured by the same {@link longestWordLength} the headline rule
 * uses, so a hyphenated token counts as one word — conservative in the only
 * direction that matters, since the cap then refuses a name the rail could
 * actually have wrapped at the hyphen.
 */
function refuseCommunityName(value: string, t: Dictionary): NextResponse | null {
  const name = value.trim();

  // Community name is the app's branding fallback everywhere — never let it be
  // blanked out.
  if (name === "") {
    return badRequest(t.validation.communityNameRequired);
  }
  if (name.length > COMMUNITY_NAME_MAX_LENGTH) {
    return badRequest(
      t.validation.communityNameTooLong.replace(
        "{max}",
        String(COMMUNITY_NAME_MAX_LENGTH),
      ),
    );
  }
  if (longestWordLength(name) > COMMUNITY_NAME_MAX_WORD_LENGTH) {
    return badRequest(
      t.validation.communityNameWordTooLong.replace(
        "{max}",
        String(COMMUNITY_NAME_MAX_WORD_LENGTH),
      ),
    );
  }
  return null;
}

async function refuseInvalidSettings(
  body: Record<string, string>,
): Promise<NextResponse | null> {
  const t = getDictionary(await getLocale());

  const undeclaredKey = findUndeclaredSettingsKey(body);
  if (undeclaredKey) {
    return badRequest(`Unknown settings key: ${undeclaredKey}`);
  }

  if ("communityName" in body) {
    const named = refuseCommunityName(String(body.communityName ?? ""), t);
    if (named) {
      return named;
    }
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
    Object.entries(body)
      .filter(([key]) => !ROUTE_OWNED_SETTINGS_KEYS.has(key))
      .map(([key, value]) =>
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
