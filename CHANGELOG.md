# Changelog

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
