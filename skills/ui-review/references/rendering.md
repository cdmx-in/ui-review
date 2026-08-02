# Rendering environments & motion scenarios

Some checks are static-only in headless Chrome — label those findings
**"flagged, verify on device"** (iOS 100vh, safe-area, scrollbar gutter,
cross-engine CSS). Never report them as confirmed failures.

Shared contrast helper for eval snippets:
```js
const lum=c=>{const[r,g,b]=c.match(/\d+/g).map(n=>{n/=255;return n<=.03928?n/12.92:((n+.055)/1.055)**2.4});return .2126*r+.7152*g+.0722*b};
const contrast=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
const rules=[...document.styleSheets].flatMap(s=>{try{return[...s.cssRules]}catch{return[]}}); // CORS sheets skipped
```

## Dark mode (`set media dark`, laptop viewport)

**No/partial theme** — light vs dark screenshots, `diff screenshot`: near-zero diff =
no theme. Partial: visible elements >20k px² with light bg (luminance > 0.85) while
body bg is dark (< 0.2).

**Hardcoded colors → invisible text** — walk text elements, resolve nearest
non-transparent ancestor bg: `contrast(color,bg) < 2` = broken; 2–4.5 = AA fail
(3 for large text). Re-run in both schemes.

**Baked-white images** — same-origin imgs: canvas-sample 4 corner pixels; all near-white
(>240) on a dark parent bg = white box floating in dark UI. Shortcut: any `.jpg` (no
alpha possible) on dark bg → eyeball the screenshot. Inverse: dark logo invisible on dark.

**Theme flash (FART)** — `set media dark` → reload → immediate screenshot vs
post-networkidle screenshot → big luminance flip = flash. If no `prefers-color-scheme`
in `rules` but dark works, theme is JS-only = flash-prone.

## Motion (`set media` + reduced-motion)

**prefers-reduced-motion ignored** — under reduce:
```js
document.getAnimations({subtree:true}).filter(a=>a.playState==='running')
  .map(a=>({dur:a.effect.getTiming().duration,iter:a.effect.getTiming().iterations,
    el:a.effect.target?.tagName+'.'+a.effect.target?.className}))
```
Any running = flag; `iter===Infinity` or `dur>3000` = high severity. Also flag
`video[autoplay]` and `scroll-behavior:smooth` not dropping to `auto`.

**JS carousels** (getAnimations misses setInterval) — two screenshots 4s apart, pixel-diff
the hero region: movement without interaction and no pause control = flag.

**Parallax/`background-attachment:fixed`** — `rules` scan; janky/broken on iOS.

## Scroll & fixed elements

**Sticky header overlaps anchor targets** — header with `position:sticky/fixed` at top:
for each `a[href^="#"]` target, `scroll-margin-top`/`scroll-padding-top` <
header height = flag. Behavioral: `t.scrollIntoView(); t.getBoundingClientRect().top <
headerRect.bottom`.

**Content occluded by fixed footer/cookie bar** — scroll to bottom;
`document.elementFromPoint(innerWidth/2, innerHeight-footerH/2)` returns the footer while
last content sits behind it; `body` padding-bottom < footer height corroborates.

**Nested scroll containers** — elements with `overflowY:auto|scroll` and
`scrollHeight>clientHeight`: flag container-inside-container or >2 per page.

**Scroll chaining from modals** — scrollables inside `[role=dialog]`/fixed overlays without
`overscroll-behavior: contain`.

**100vh on mobile** — `rules` scan for `height:100vh` with no `dvh/svh` sibling → flag on
mobile viewport (static-only; headless can't reproduce iOS URL bar). Approximate:
screenshot 390x844 vs 390x664, check bottom CTA visibility.

**Scrollbar-gutter shift** — static-only: `scrollbar-gutter:stable` absent and no
`overflow-y:scroll` on html/body → "verify on Windows".

**Safe areas** — `viewport-fit=cover` in meta but no `env(safe-area-inset` in `rules` =
guaranteed notch collision on device (static-only flag).

## Viewport / DPI

**Landscape phone** — `set viewport 800 360`: run detect.js; fixed header+footer combined
height / 360 > 0.4 = chrome eats the screen; modals/heroes with min-height > 360.

**Blurry images on 2x screens** — `set device "iPhone 14"` (or viewport with scale 2):
```js
[...document.images].filter(i=>i.complete&&i.naturalWidth>0&&!/\.svg/.test(i.currentSrc))
  .map(i=>({src:i.currentSrc,cssW:i.clientWidth,have:i.naturalWidth,need:Math.round(i.clientWidth*devicePixelRatio)}))
  .filter(x=>x.cssW>40&&x.have<x.need*0.75)
```
Also flag `have > need*2.5` (oversized download) and content imgs missing `srcset`.

## Fonts

**FOIT risk** — `@font-face` rules with `font-display` auto/empty; font 404s/slow loads in
`network requests`; `document.fonts.status!=='loaded'` after networkidle = stuck.

**Icon-font tofu** — leaf elements with PUA chars (`/[-]/`) whose font fails
`document.fonts.check(...)`; ligature fonts rendering literal words ("menu") = icon-classed
element with width ≫ height.

**Fallback metric jump** — screenshot post-nav vs post-`document.fonts.ready`, pixel-diff;
big text-region diff + no `size-adjust`/`ascent-override` in fallback = CLS source.

## CSS feature fallbacks (honest limits)

Chrome-only CLI cannot behaviorally test Safari/Firefox — `CSS.supports()` here says
nothing about other engines. Feasible: usage inventory — scan `rules` for `@container`,
`:has(`, `subgrid`, `@layer`, `text-wrap`, report each use site and whether it's wrapped
in `@supports` or has a preceding fallback declaration. Output a risk map for manual
verification, not pass/fail. `forced-colors` emulation is likewise out of scope — say so.

## Print (content/docs/invoice pages only)

No `@media print` rules at all = flag. If media-type emulation is available: nav/side
widgets should vanish, dark bg goes light, no fixed elements.
