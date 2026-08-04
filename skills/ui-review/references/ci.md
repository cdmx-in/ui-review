# Wiring ui-review into CI / pre-commit

Compare mode (SKILL.md "Regression mode") is cheap enough to gate frontend
changes: JSON diff and pixel diff are pure computation, and the model only
inspects breakpoints whose pixels actually changed — in CI the common case is
"unchanged", which costs near-zero tokens.

## Where baselines live

- Single app: `.ui-review/<page-slug>/` at the repo root, committed.
- Monorepo: one `.ui-review/` per app package (`apps/web/.ui-review/`), next
  to the code that renders those routes. A path filter on `apps/web/**` then
  naturally pairs with that app's baselines, and each team owns its own.

## Trigger only on frontend diffs

Skip the job entirely for backend-only commits.

Pre-commit (`.git/hooks/pre-commit` or husky/lefthook):

```bash
changed=$(git diff --cached --name-only | grep -E '\.(tsx|jsx|vue|svelte|html|css|scss)$')
[ -z "$changed" ] && exit 0
```

GitHub Actions:

```yaml
on:
  pull_request:
    paths:
      - "apps/web/src/**/*.{tsx,jsx,css,scss}"
      - "apps/web/src/**/*.vue"
```

## The job

1. Start the dev/preview server; wait until the URL responds.
2. Map changed files to routes, and review **only those routes**:
   - a changed page/route file → its own route;
   - a changed shared component → the routes that import it. If that set is
     large, review the 2–3 most representative routes plus a component-mode
     kitchen-sink page (SKILL.md "Component mode") instead of all of them.
3. Run headless per route:

   ```bash
   claude -p "/ui-review http://localhost:3000/<route>"
   ```

   Compare mode engages automatically when a baseline exists. Routes with no
   baseline must be flagged as "no baseline exists for this route" in the
   output — never silently passed.

## Severity gate

- New **broken** findings → exit non-zero, fail the check.
- New **degraded** / **polish** findings → surface in the job summary or PR
  comment, don't fail. Promote degraded to failing later if the team wants a
  stricter gate.
- **Fixed** findings → note them and suggest refreshing the baseline.

The machine-readable source for the gate is `.ui-review/<slug>/REPORT.md`
(regressed/fixed/unchanged per breakpoint); grep it for `[broken]` rows that
aren't in the baseline's KNOWN.md.

## Keeping it fast

- Changed-routes-only (step 2) — never the whole app per commit.
- The JSON-diff + pixel-diff triage already skips vision inspection of
  unchanged breakpoints, so most CI runs are compute-only.
- Refresh baselines in the same PR that intentionally changes a page's look,
  so the next run diffs against the new intended state instead of flagging it
  forever.
