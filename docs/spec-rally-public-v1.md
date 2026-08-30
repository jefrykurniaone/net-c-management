# Spec: Rally public and threshold — landing bands, Admin copy, hero image, email shell

| | |
|---|---|
| Spec | [#143](https://github.com/jefrykurniaone/net-c-management/issues/143) — `spec:rally-public` |
| Run | `run:rally` |
| Execution map | filled in at Stage 4 of the pipeline |
| Tickets | filled in at Stage 3 of the pipeline |
| Version | v1 (2026-08-30) |
| Grilled from | the request to restyle the app after the Playbypoint case study |
| Depends on | [#142](https://github.com/jefrykurniaone/net-c-management/issues/142) (foundation). Binding ADR: [0003](adr/0003-retire-papan-jadwal-for-rally.md). Supersedes the 2026-08-19 public-copy authority decision |

This is a verbatim copy of the tracker issue at the time of ticketing. The issue is the live record; this file is the durable one. Below the rule is the issue body.

---

Grilled on 2026-08-30 as part of run `rally`. Depends on the foundation spec (`spec:rally-foundation`) for tokens, type roles, chips and pattern primitives. Supersedes the 2026-08-19 decision that the dictionary authors every public string.

Repo copy: `docs/spec-rally-public-v1.md`. Execution map and tickets are linked below once they exist.

## Problem Statement

The public page is the one route a stranger reaches from search or a shared link, and today it is a painted-board hero with a dictionary-authored pitch, one band of Activities, and a footer. Under the retired system that was the right amount of page. Under the reference the owner wants — a full-bleed hero with a motion photograph or a pattern, a headline in condensed caps, a statement about the club, and a short row of feature cards — it is too little, and none of its copy can be changed by the people who run the community. The Admin cannot say what their club is, cannot show a photo of their hall, and cannot name the three things a member gets by joining.

The same threshold pages a stranger or a new member passes through — sign-in, onboarding, the waiting room, the shared Session card, and every email — still wear the old material and inline colours.

## Solution

Rebuild the public page as a band stack in the Rally look: a hero band (Admin-uploaded photograph or the pattern fallback, headline and subline in Display type, one loud join action), an optional *about* band, the community's real Activities as a card grid, an optional band of up to four *feature* cards, and the footer. The Admin writes the headline, subline, about paragraph and feature cards in a new **Public page** section of Settings; each field is one plain-text value shown in both locales; empty hero fields fall back to the dictionary's defaults and empty about/feature bands are not rendered. A hero image is uploaded in the same section and covers the hero at every viewport.

Sign-in, onboarding, the waiting room, the shared Session card and the email shell are restyled onto the same tokens so that a stranger's whole first hour is one product.

## Goals and success criteria

Goals:

- An Admin can make the public page speak for their community — words and one photograph — in under five minutes, without touching code or asking for a deploy.
- A stranger on a phone sees the headline, the photograph or pattern, and the join action without scrolling.
- Every threshold page and every email reads as the same product as the public page.

Non-goals: rich text, per-locale copy fields, a cropper, a media library, more than one hero image, SEO changes beyond keeping the existing title/description behaviour, any change to how sign-in works.

Success criteria — this spec is done when:

- With nothing configured, `/` renders the pattern hero with the dictionary headline and subline, the Activity cards (or the single empty card), and the footer — no about band, no feature band, no broken image.
- With everything configured, `/` renders the uploaded photograph covering the hero at 390×844 and 1440×900, the Admin's headline within its cap, the about band, up to four feature cards, and the footer.
- The Settings "Public page" section refuses over-cap text at the form and at the API with a message naming the cap, and accepts a JPEG/PNG/WebP up to 5 MB, refusing anything else with a message naming the rule.
- The public page's cached data is invalidated when any public copy or the hero image changes.
- The join action is reachable by keyboard with a visible ring, and the headline never paints over it at any viewport with the longest permitted string.
- Every email template renders through the restyled shell in both locales.
- The `TC-PP-*` manual suite for this spec has been executed and recorded.

## User Stories

1. As a stranger, I want to see what this community is in one headline and one photograph, so that I know within seconds whether it is for me.
2. As a stranger on a phone, I want the join action visible without scrolling, so that I do not have to search for how to get in.
3. As a stranger, I want to read a short paragraph about the community in the Admin's own words, so that the page feels like a club and not a software vendor.
4. As a stranger, I want to see the community's real Activities as cards with their weekly slot and next date, so that I know what actually happens here.
5. As a stranger, I want a few short feature cards telling me what I can do once I join, so that I understand the value before signing in.
6. As a stranger who has set the dark theme, I want the hero to stay legible and the rest of the page to follow my theme, so that the page respects my preference.
7. As an Admin, I want to write the hero headline and subline in Settings, so that the page says what we want it to say.
8. As an Admin, I want to write an about paragraph and up to four feature cards, so that the page tells our story.
9. As an Admin, I want to upload a photograph for the hero, so that the page shows our hall and our people.
10. As an Admin, I want the form to tell me the character limit and stop me at it, so that my text never breaks the layout.
11. As an Admin, I want to remove the photograph and go back to the pattern, so that a bad photo is one click from gone.
12. As an Admin, I want to leave any field empty and get a sensible default or no band at all, so that a half-filled form never shows a broken page.
13. As an Admin, I want the public page to update right after I save, so that I can check my work.
14. As an Admin, I want a preview link from the Settings section, so that I can see what a stranger sees.
15. As a new member signing in, I want the sign-in page to look like the public page I came from, so that I trust I am in the right place.
16. As a new member completing onboarding, I want the form to look like the rest of the product, so that the first task does not feel like a different app.
17. As an Applicant in the waiting room, I want the page to carry the community's identity and one clear next step, so that waiting does not feel like an error.
18. As a member sharing a Session link, I want the shared card to carry the new look, so that what I share represents the club well.
19. As a member receiving an email, I want it to carry the community's name, the new colours and the same chip vocabulary, so that I recognise it and act on it.
20. As an Indonesian-locale stranger, I want every dictionary-authored string translated and the Admin's copy shown as written, so that nothing reads as a machine.

## Implementation Decisions

**Band stack.** Order: header (logo, community name, theme toggle, sign-in) → hero band → about band (optional) → Activities band → features band (optional) → footer. Each band is full-bleed with gutter-aligned content; the hero's content is centred at a text measure. Density and spacing come from the foundation tokens.

**Hero.** Dark ground regardless of theme (existing decision kept: a stranger has no preference set). Background is the uploaded photograph, `object-fit: cover`, centred, with a dark scrim behind the text for contrast; when no photograph is set, the grid-lines pattern over the dark ground. Headline in Display type, subline in Statement or Body, one primary action (join / continue with Google) and the account-creation statement beneath it. The headline auto-fits with the type role's clamp, `text-wrap: balance`, and mid-word break as last resort, so an over-long string degrades visibly rather than painting over the action.

**Admin-editable copy.** Fields: hero headline, hero subline, about paragraph, and four feature cards each with a title and one line. All plain text; line breaks in the about paragraph are kept, nothing else is interpreted. **One value per field, shown in both locales** — the owner chose this over per-locale fields; the consequence, recorded, is that an Indonesian community's copy is shown to an English-locale visitor as written. Caps, enforced in the form and again at the API: headline 48 characters with no word over 12; subline 120; about 600; feature title 32; feature line 120. Empty headline or subline falls back to the dictionary default for the visitor's locale; an empty about paragraph hides the about band; feature cards render only for the cards that have a title; a features band with no titled card is not rendered.

**Storage of copy.** Key–value rows in the existing Settings table, one key per field, read through the existing cached public-landing data path and invalidated on write. No new table, no migration. The Settings API gains these keys with their validation; the read side treats a missing key as empty.

**Hero image.** New storage bucket alongside the logo bucket, one object per community (upsert), public URL stored as a Settings key. Upload route mirrors the logo route's shape: Admin-gated, JPEG/PNG/WebP, 5 MB cap, invalidates the public landing cache. A remove action deletes the object and clears the key. Served through the image component with `priority` on the hero. No cropper: the photograph is cover-cropped by the browser and the Admin is told in the form that the centre of the image is what survives on a phone.

**Settings "Public page" section.** A new section in the Admin Settings page: hero image control (preview, upload, remove), then the text fields grouped hero / about / features, each with a live character counter against its cap, and a "view public page" link. The section is bilingual in its labels and help text like the rest of Settings; the values it holds are not.

**Activities band.** The existing public Activity rows become cards in a responsive grid: Activity icon tile or initial, name, weekly slot, next scheduled date, and a neutral "nothing scheduled" chip when there is none. A community with no Activities renders one card carrying the empty-state chip and one sentence, so the band never disappears.

**Threshold pages.** Sign-in, onboarding, waiting room and the shared Session card are restyled onto Rally: centred single-task card on the page ground, identity header, Display page title, primary action. No behaviour change.

**Email shell.** The shared HTML layout gets the Rally palette as inline colours (dark header with the community name, off-white body, primary action button in PBP Green with Black Green text, chip-styled status words), keeping the bilingual structure and every existing template's content. Email clients cannot consume CSS tokens, so the hex values are duplicated here on purpose and the design document names this as the one permitted duplication.

**Copy authority, superseded.** The 2026-08-19 decision that no Admin writes marketing copy is superseded for the public page only: the dictionary still authors every label, button and system message; the Admin authors the community's own statements. The product-rule that copy must not name a sport applies to dictionary strings; an Admin naming their sport in their own about paragraph is the Admin's choice and is not the product naming one.

**Metadata.** Title stays the community name alone; description stays the dictionary string. Not changed by this spec.

## Testing Decisions

A good test checks the rendered outcome — what a stranger sees, what an Admin is refused — not the storage shape.

- **Vitest:** copy-cap validation (each field's cap and the 12-character word rule on the headline, both accepting at the cap and refusing one over); fallback resolution (empty headline → dictionary, empty about → band hidden, feature cards filtered to titled ones); hero-image request validation (mime and size) at the route's validation seam. Prior art: the pitch-budget test for the word rule; the activity-validation tests for a zod-schema seam; the public-landing tests for the cached data shape.
- **Manual `TC-PP-*` suite (new section in the test document):** nothing-configured render; everything-configured render at 390×844 and 1440×900; longest-permitted headline in both locales never overlaps the action; hero photograph covers at both viewports; remove photograph returns to the pattern; cache invalidation observed after save; keyboard reachability and focus ring; each threshold page in both themes and locales; each email template rendered through the new shell in both locales.
- **Not tested:** the aesthetic of the Admin's photograph; per-locale Admin copy (there is none by decision).

## Out of Scope

- Rich text, markdown, links or images inside Admin copy.
- Per-locale Admin copy fields (decided: one value, both locales).
- A cropper or image editor; multiple hero images; a gallery.
- Changing the sign-in provider, the onboarding fields, or the waiting-room rules.
- SEO or metadata changes.
- Any member or admin surface beyond the Settings section this spec adds.

## Further Notes

**Why one photograph and no bundled stock.** The product is white-label and must not name a sport; any bundled racquet or ball photograph does. The community photographs itself; the product ships the frame and the fallback pattern.

**Why caps and auto-fit both.** Caps keep the layout honest for the common case; the shrink-and-break fallback exists so a value that slips past validation (an older client, a direct API call) degrades visibly instead of covering the button. The Vitest pitch budget stays on the dictionary defaults, re-measured against the new Display type.

**Bucket provisioning is a human step.** The new bucket must exist in the Supabase project before the upload route works in production; the ticket for it carries a checklist for that step and the deploy order (bucket first, then the build).
