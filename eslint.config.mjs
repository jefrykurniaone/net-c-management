import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Design handoff — vendored design artifact, not app source.
    "Sports Community Management UI-handoff/**",
    // Agent-tool local state. Git worktrees live under .claude/worktrees/, so
    // without this a stale worktree's copy of the tree is linted as if it were
    // source and its findings are reported twice.
    ".claude/**",
  ]),
  // DESIGN.md, Hero: the ninth type role is the public route's and nothing
  // else. Tailwind `@utility` is global, so file placement guarantees nothing
  // and this restriction is the actual enforcement — the size gap to Display is
  // a property, not a guard. A board is read, not shouted at: board surfaces
  // cap at `type-display`.
  {
    files: ["src/app/(main)/**", "src/app/(admin)/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/type-hero/]",
          message:
            "type-hero is scoped to the public route (DESIGN.md, Hero). Board surfaces cap at type-display.",
        },
        {
          selector: "TemplateElement[value.raw=/type-hero/]",
          message:
            "type-hero is scoped to the public route (DESIGN.md, Hero). Board surfaces cap at type-display.",
        },
      ],
    },
  },
  // Ticket 04, Rule 1: `src/lib/public-landing.ts` is the sole thing an
  // unauthenticated route may query, and its Rule 3 bans mutation on an
  // unauthenticated GET. A reviewable choke point only holds while nothing
  // bypasses it, so the bypass is a lint error rather than a convention.
  //
  // The list below is every route that answers without a session, which ticket
  // 12 is why it is a list at all: the restriction named `/` alone, and `/s/[id]`
  // — a public route nobody had charted — meanwhile shipped a card publishing
  // admin free text and a capacity figure that was arithmetically wrong. A guard
  // scoped to one route gets broken by the next one.
  {
    files: [
      "src/app/page.tsx",
      "src/app/opengraph-image.tsx",
      "src/app/s/**",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/lib/prisma", "@/lib/prisma"],
              message:
                "An unauthenticated route reads through src/lib/public-landing.ts only (ticket 04, Rule 1). A direct Prisma query here is how bank details and adminWhatsapp reach an unauthenticated page.",
            },
            {
              group: ["**/lib/settings", "@/lib/settings"],
              message:
                "getSettings() returns adminWhatsapp, which ticket 04 bars from an unauthenticated route, and it is an uncached findMany that costs a Prisma connection per anonymous hit. Read identity through getPublicIdentity() in src/lib/public-landing.ts.",
            },
            {
              group: ["**/lib/holds", "@/lib/holds"],
              message:
                "An unauthenticated GET never mutates and never sends mail (ticket 04, Rule 3). releaseExpiredHolds deletes Attendance rows and queues member email, so no capacity data belongs on the public route.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
