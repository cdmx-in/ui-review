# ui-review: examples/demo/demo.html — 2026-08-02

Mode: standard · agent-browser 0.31.1 · ui-review 1.0.0

## Summary

8 findings at mobile (360x800): 3 broken, 4 degraded, 1 polish. Page is not
mobile-ready — fixed-width hero forces horizontal scroll and the viewport meta
is missing entirely.

## mobile (360 x 800)

| Sev | Element | Issue | Source | Fix |
|---|---|---|---|---|
| broken | `div.hero` | Fixed 1400px width forces page-wide horizontal scroll (right edge at 1448px on a 360px viewport) | demo.html:3 | Replace `width:1400px` with `max-width:100%` |
| broken | `<meta name=viewport>` | Missing — mobile browsers render at desktop width | demo.html:1 | Add `<meta name="viewport" content="width=device-width, initial-scale=1">` |
| broken | `p ("Revenue is up NaN% since undefined.")` | Unrendered data leaked into copy (`NaN`, `undefined`) | demo.html:6 | Guard the revenue calculation and date before interpolating |
| degraded | `h3 ("Kraftfahrzeugversicherungsbericht Q3")` | Text clipped at 200px with no ellipsis (needs 336px) | demo.html:3 | Add `text-overflow:ellipsis` + `title` attr, or allow wrapping |
| degraded | `button.icon-btn ("×")` | 18x18px tap target — below the 24px WCAG 2.5.8 minimum | demo.html:3 | Pad to ≥24x24 (44px comfortable) |
| degraded | `img (/missing-chart.png)` | Broken image (404) | demo.html:8 | Fix the asset path or add a fallback |
| degraded | `button ("Download full report")` | Label wraps to two lines in the 80px-wide button | demo.html:8 | Let the button size to content or shorten the label |
| polish | `div.stat` | 10px font size — below the 12px legibility floor | demo.html:3 | Bump to ≥12px |

Screenshot: [./mobile.png](./mobile.png)

## Console / network

1 failed request: `missing-chart.png` (404). No console errors.
