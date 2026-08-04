# Changelog

## 1.1.0 — 2026-08-05

- "When to run this without being asked": the calling agent now runs a
  standard pass automatically after editing frontend code (before reporting
  the task complete) and as the first diagnostic step when a user reports a
  visual/layout bug.
- Standard sweep selects the widest realistic list/table row (most
  tags/badges, longest strings) before running detect.js, instead of
  reviewing whatever renders first — pulled forward from thorough mode's
  content-stress pack.
- New component mode (`/ui-review components`): audit the shared UI library
  via Storybook or a synthesized kitchen-sink page, so a shared-primitive
  defect is caught once at the source instead of by luck per page.
- New `references/ci.md`: pre-commit/CI recipe for baseline + compare gating
  on frontend diffs — monorepo baseline layout, fail-on-broken severity
  policy, changed-routes-only for speed.
- Compare mode reports "no baseline exists for this route" as an explicit
  finding instead of silently falling back to a fresh review.
- Multi-page reports collapse the same finding on 3+ pages into one
  root-cause finding attributed to the shared component, with affected pages
  listed under it.

## 1.0.1 — 2026-08-04

Documentation fixes from first field use, ranked by time each cost in practice.

- Workflow now creates the screenshot dir up front and uses absolute paths for
  all file arguments — agent-browser resolves relative paths against its own
  process cwd, so `shots/mobile.png` silently failed.
- Documented that `eval --stdin` output is JSON-encoded twice (parse, then
  parse the resulting string again).
- Documented that `type` requires a selector — text-only invocation silently
  no-ops.
- Console step filters to `[warning]`/`[error]` lines so real findings aren't
  buried in HMR/debug noise.
- Inputs section covers authenticated pages: log in once before the breakpoint
  loop, don't close the browser mid-review.
- Standard sweep now exercises interactive states of the specific element under
  review (invalid/valid input, dependent-control enable/disable) by default,
  instead of gating that behind thorough mode.

## 1.0.0 — 2026-08-02

Initial release.

- Standard sweep: 12-category in-page defect detector (overflow, clipping,
  overlaps, tap targets, wrapped controls, broken/distorted images, placeholder
  leaks, small text, viewport meta) across 4 breakpoints, plus screenshot
  inspection and console/network error collection.
- Codebase mapping: findings traced to `file:line` when reviewing a local dev
  server; optional fix-and-reverify loop.
- Regression mode: committable `.ui-review/` baselines, pixel- and JSON-diff
  compare runs that skip unchanged breakpoints.
- Thorough mode: scenario packs for interaction/state QA, content & i18n
  stress injection, and rendering environments (dark mode, reduced motion,
  hi-DPI, fonts).
- Persistent `REPORT.md` artifact per reviewed page.
- Installable as a Claude Code plugin (`/plugin marketplace add cdmx-in/ui-review`)
  or via `npx skills add cdmx-in/ui-review`; works with any SKILL.md-compatible
  agent.
