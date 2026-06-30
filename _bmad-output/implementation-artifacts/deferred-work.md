# Deferred Work

Items surfaced during reviews that are real but intentionally not actioned now. Each notes where it should be picked up.

## Deferred from: code review of story-1.4 (2026-06-30)

- **3-digit hex foreground edge case** — `parseHex` in `src/components/ekskul/ekskul-badge.tsx` accepts only 6-digit hex; a 3-digit hex (e.g. `#fff`) returns null and falls back to a white foreground, which is unreadable on a light background. Not currently reachable (`Ekskul.color` is set via a 6-digit color picker). Expand to accept 3-digit hex during the Epic 4 UI refresh.
- **Badge icon sizing** — `EkskulBadge` (`src/components/ekskul/ekskul-badge.tsx`) renders its lucide icon at the default size (24px) with no explicit `size`, which may look oversized inside a small badge. Visual-only; tune during the Epic 4 UI refresh.
