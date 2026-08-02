---
name: ui-review
description: Automated UI/UX review of a web page or app using the agent-browser CLI. Detects text overflow/clipping, awkward wrapping, horizontal scroll, overlapping elements, tiny tap targets, broken/distorted images, placeholder-text leakage, and responsiveness defects across common resolutions (mobile/tablet/laptop/desktop), then visually inspects screenshots. When run against a local dev server with the codebase available, maps findings back to source files and can fix them. Supports regression mode - save a baseline, later runs diff against it and only inspect what changed. Trigger with /ui-review [url], "/ui-review baseline", "review the UI", "check responsiveness", "find layout bugs", "text overflow check".
allowed-tools: Bash(agent-browser:*), Read, Glob, Grep
---

# ui-review

Audit a web page across common breakpoints with `agent-browser`, combining
programmatic in-page checks (this skill's `scripts/detect.js`) with visual
screenshot inspection. Report findings; fix only if the user asked.

## Inputs

- **URL**: from the user's message. If none given, detect a local dev server
  (try `agent-browser open localhost:3000` then 5173, 8080, 4200 — a page
  title confirms a hit) or ask.
- **Pages**: default to the given page only. If the user says "the whole app",
  snapshot the nav (`agent-browser snapshot -i -u`) and review the top ~5 routes.
- **Codebase**: if the URL is a local dev server and the project source is in
  the working directory, findings must be mapped to source files (see
  "Codebase mapping" below).

## Breakpoints

| Name | Viewport |
|---|---|
| mobile | 360 x 800 |
| tablet | 768 x 1024 |
| laptop | 1366 x 768 |
| desktop | 1920 x 1080 |

## Workflow

Work in a scratch dir for screenshots. `DETECT` = this skill's
`scripts/detect.js` (resolve path relative to this SKILL.md).

```bash
agent-browser open <url>
agent-browser wait --load networkidle

# Per breakpoint (repeat for each row of the table):
agent-browser set viewport 360 800
agent-browser wait 300                              # allow reflow/media queries
agent-browser eval --stdin < <DETECT>               # -> JSON defect report
agent-browser screenshot --full shots/mobile.png

# After all breakpoints:
agent-browser console                               # console messages
agent-browser errors                                # page errors
agent-browser network requests --status 400-599     # failed assets/API calls
agent-browser close
```

Optional extras (newer agent-browser builds — skip silently if the command
prints generic help; suggest `agent-browser upgrade` in the report footer):

```bash
agent-browser a11y --tags wcag2aa --json    # axe-core audit: contrast, labels, alt text
agent-browser vitals --json                 # CLS / LCP / INP
```

Notes:
- `eval --stdin` returns a JSON string; parse it. Categories:
  `viewportMetaMissing`, `horizontalScroll` + `offenders`, `clippedText`,
  `overlaps`, `tinyTapTargets`, `brokenImages`, `distortedImages`,
  `overflowingMedia`, `smallText`, `wrappedControls`, `placeholderText`.
  Each entry has a readable selector.
- Only flag `tinyTapTargets` and `smallText` as real issues on mobile/tablet.
- If the app has a dark mode: `agent-browser set media dark`, re-screenshot at
  laptop size, and compare — `agent-browser diff screenshot --baseline
  shots/laptop.png -o shots/dark-diff.png` highlights unstyled regions.
- For real-device fidelity on mobile, `agent-browser set device "iPhone 14"`
  can replace the raw mobile viewport.

## Regression mode (baselines + diffs)

Baselines live in the reviewed project at `.ui-review/<page-slug>/` (slug from
the URL path, `root` for `/`). Committable, so CI and teammates share them.

**Save a baseline** (`/ui-review baseline [url]`): run the normal per-breakpoint
loop, but store artifacts instead of writing a report:

```
.ui-review/<page-slug>/
  mobile.json  mobile.png       # detect.js output + full screenshot
  tablet.json  tablet.png       # ...one pair per breakpoint
  snapshot.txt                  # agent-browser snapshot > snapshot.txt (desktop)
```

Do the visual inspection once here — a baseline with known defects should have
them listed in `.ui-review/<page-slug>/KNOWN.md` so later runs don't re-report
them.

**Compare** (default when a baseline exists): per breakpoint —

```bash
agent-browser set viewport 360 800
agent-browser eval --stdin < <DETECT>          # -> current JSON
agent-browser screenshot --full shots/mobile.png
agent-browser diff screenshot --baseline .ui-review/<slug>/mobile.png -o shots/mobile-diff.png -t 0.2
```

Then triage cheaply, in order:

1. Diff the two JSONs yourself (baseline vs current) — new entries are
   regressions, vanished entries are fixes. This is plain text, costs almost
   nothing.
2. If the pixel diff reports no/near-zero change AND the JSON diff is empty:
   **skip the Read of that breakpoint's screenshot entirely** — that's the
   token saving. Say "unchanged" and move on.
3. Only when pixels changed: Read the `-diff.png` (changed regions are
   highlighted) and the current screenshot, judge whether the change is a
   regression or an intended edit.
4. `agent-browser diff snapshot --baseline .ui-review/<slug>/snapshot.txt`
   catches content/structure changes screenshots blur over.

Report only deltas: `regressed / fixed / unchanged` per breakpoint, plus
anything in KNOWN.md that got fixed (suggest pruning it). After the user
confirms current state is good, offer to refresh the baseline.

## Visual inspection (mandatory)

The JS checks can't judge aesthetics. Read every screenshot with the Read tool
and look for what only eyes catch:

- Awkward line wrapping: single-word orphans in headings, buttons wrapping to
  two lines, labels breaking mid-word.
- Truncation that loses meaning (ellipsis hiding the important part).
- Misalignment: inconsistent gutters, off-grid cards, uneven spacing between
  siblings.
- Content cut off at the fold or behind fixed headers/footers.
- Elements that overlap visually even if detect.js missed them (transforms,
  canvas, absolutely positioned art).
- Contrast that looks illegible, images stretched/squashed, empty states that
  render blank.

## Codebase mapping

When the reviewed app's source is available locally, every finding gets a
source location, not just a DOM selector:

1. Take the finding's class name, id, or visible text from the selector.
2. Grep the project source (components, templates, CSS/SCSS, Tailwind
   classes) for it. Utility-class-only selectors: grep the visible text
   instead.
3. Report `file:line` next to the finding.
4. If the user asked for fixes: fix in source (CSS/component), let the dev
   server hot-reload, re-run the same breakpoint's detect + screenshot to
   confirm the finding is gone. Fix the **broken** tier first, then move down.

## Report

One section per breakpoint, ranked by severity. For each finding:
`[severity] element — what's wrong — file:line (if mapped) — suggested fix (one line)`.
Severity: **broken** (content unusable/unreadable) > **degraded** (works but
looks wrong) > **polish**. End with console/page errors and failed network
requests if any. If everything passes, say so plainly — don't invent findings.
