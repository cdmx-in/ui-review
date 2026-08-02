# ui-review

A [Claude Code](https://claude.com/claude-code) skill that reviews any web page or app for UI/UX defects using the [agent-browser](https://github.com/vercel-labs/agent-browser) CLI.

It checks every common breakpoint (mobile 360, tablet 768, laptop 1366, desktop 1920) for:

- Text overflow, clipping, and truncation without ellipsis
- Awkward wrapping (multi-line buttons, orphan words)
- Horizontal scroll and the elements causing it
- Overlapping elements
- Tap targets smaller than 24px (WCAG 2.5.8)
- Broken, stretched, or container-overflowing images
- Placeholder leakage (`undefined`, `NaN`, `[object Object]`, lorem ipsum)
- Missing viewport meta, tiny font sizes
- Console errors and failed network requests
- Dark-mode regressions (screenshot diff)

Programmatic checks run in-page via `eval`; screenshots are then visually inspected by the model for things JS can't judge (misalignment, bad truncation, contrast). When reviewing a local dev server with the source code present, findings are mapped back to `file:line` and can be fixed in place.

**Regression mode**: `/ui-review baseline` stores per-breakpoint screenshots + defect JSON in `.ui-review/` (commit it). Later runs pixel-diff and JSON-diff against the baseline and only spend vision tokens on breakpoints that actually changed — unchanged pages cost near zero.

## Install

1. Install agent-browser (once):

   ```bash
   npm i -g agent-browser && agent-browser install
   ```

2. In any Claude Code session, run:

   ```
   /plugin marketplace add roney492/ui-review
   /plugin install ui-review@ui-review
   ```

That's it. No tokens or accounts needed — it installs straight from this public GitHub repo.

<details>
<summary>Alternative: manual install via git clone</summary>

```bash
git clone https://github.com/roney492/ui-review /tmp/ui-review
cp -r /tmp/ui-review/skills/ui-review ~/.claude/skills/ui-review
```

Windows (PowerShell):

```powershell
git clone https://github.com/roney492/ui-review "$env:TEMP\ui-review"
Copy-Item -Recurse "$env:TEMP\ui-review\skills\ui-review" "$env:USERPROFILE\.claude\skills\ui-review"
```

Claude Code auto-discovers skills in `~/.claude/skills/`.
</details>

## Use

In any Claude Code session:

```
/ui-review http://localhost:3000
```

or just say:

- "review the UI"
- "check responsiveness of my app"
- "find layout bugs on staging.example.com"

With no URL, it probes common local dev ports (3000, 5173, 8080, 4200). Ask for fixes ("review the UI and fix what you find") and it will patch the source, hot-reload, and re-verify.

## Layout

```
SKILL.md            # the skill definition Claude Code follows
scripts/detect.js   # in-page defect detector, piped via `agent-browser eval --stdin`
```
