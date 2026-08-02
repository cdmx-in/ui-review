# Interaction & UI-state scenarios

Run against a live page with `agent-browser` (snapshot → act → eval). Ranked by
real-world frequency. Recipes are `eval --stdin` JS unless marked CLI.

## Top tier

**Silent network failure** — API error shows nothing to the user (console-only).
CLI: `network route "**/api/**" --status 500` → reload/trigger → assert visible
error UI: `!!document.querySelector('[role=alert],[class*=error]')?.offsetParent`.

**Double-submit not prevented** — two orders from a double click.
CLI: `network route` the POST with delay → click submit twice fast →
`network requests --method POST` count. 2 = bug.

**Missing focus indicator** — keyboard users can't see where they are.
```js
[...document.querySelectorAll('a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])')].map(el=>{
  const p=['outline','boxShadow','border','backgroundColor'];
  const before=JSON.stringify(p.map(x=>getComputedStyle(el)[x]));
  el.focus();
  const after=JSON.stringify(p.map(x=>getComputedStyle(el)[x]));
  el.blur();
  return before===after?el.tagName+'.'+el.className:null}).filter(Boolean)
```
Programmatic `.focus()` may skip `:focus-visible` — confirm via `press Tab` × N + screenshots.

**Modal behavior** — open a modal, then:
- Escape closes: `press Escape` → `!document.querySelector('[role=dialog],.modal')?.offsetParent`
- Focus moved in: `document.querySelector('[role=dialog]')?.contains(document.activeElement)`
- Focus trapped: press Tab ~20×, re-check containment each time
- Scroll locked: `const y=scrollY;scrollBy(0,500);const leak=scrollY!==y;scrollTo(0,y);leak`
- On close, focus returns to the trigger element.

**Dead loading state** — spinner never resolves.
CLI: wait 10–15s after load, then:
```js
[...document.querySelectorAll('[class*=spinner],[class*=loading],[class*=skeleton],[aria-busy=true]')]
  .filter(e=>e.offsetParent).map(e=>e.className)
```
Pair with a forced-500 route: spinner must become an error state, not spin forever.

**Invisible overlay blocking clicks** — closed-but-mounted overlay missing `pointer-events:none`.
```js
[...document.querySelectorAll('button,a[href]')].filter(el=>{const r=el.getBoundingClientRect();
  if(!r.width||!el.offsetParent)return false;
  const top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
  return top&&top!==el&&!el.contains(top)&&!top.contains(el)})
  .map(el=>el.textContent.trim().slice(0,30))
```

**Empty state renders blank** — CLI: `network route "**/api/**" --body '{"items":[]}'` → reload →
```js
const m=document.querySelector('main,[role=main]')||document.body;
({textLen:m.innerText.trim().length,looksBlank:m.innerText.trim().length<20})
```

## Forms

**Label association missing**:
```js
[...document.querySelectorAll('input:not([type=hidden]),select,textarea')].filter(i=>
  !i.labels?.length&&!i.getAttribute('aria-label')&&!i.getAttribute('aria-labelledby'))
  .map(i=>i.name||i.id||i.outerHTML.slice(0,80))
```

**Validation errors not associated / focus not moved** — submit an empty form, then check
inputs near visible errors for `aria-invalid`/`aria-describedby`, and that
`document.activeElement` is the first invalid field, not `<body>`/submit.

**Wrong input type / missing autocomplete**:
```js
[...document.querySelectorAll('input')].map(i=>{const n=(i.name+i.id+i.placeholder).toLowerCase();const x=[];
  if(/mail/.test(n)&&i.type!=='email')x.push('type=email');
  if(/phone|tel|mobile/.test(n)&&i.type!=='tel')x.push('type=tel');
  if(/mail|name|phone|address|zip|postal|country/.test(n)&&!i.autocomplete)x.push('autocomplete');
  return x.length?{el:i.name||i.id,x}:null}).filter(Boolean)
```

**Disabled submit dead-end** — disabled button with no visible hint why. Counter-pattern:
always-enabled submit that silently no-ops (click on empty form → assert something changed).

**Unsaved changes lost** — type into a form, navigate away, go back: field empty and no
confirm dialog = data loss.

## Keyboard & focus

**Positive tabindex smell**: `[...document.querySelectorAll('[tabindex]')].filter(e=>+e.tabIndex>0)`.
**Tab order sanity** — CLI: press Tab repeatedly, track `document.activeElement.getBoundingClientRect()`;
flag jumps against reading order or focus on invisible elements.
**Focus lost after DOM updates** — after delete/close/paginate: `document.activeElement===document.body`.
**Skip link** — first Tab from load should hit a skip link whose `href` target exists and is focusable.
**Custom select keyboard-dead** — focus `[role=combobox]`, press ArrowDown/Enter; `aria-expanded`
must toggle. Custom dropdowns fail this constantly.
**Sticky header covers focused element** — while tabbing:
`document.activeElement.getBoundingClientRect().top < headerRect.bottom`.

## Hover/touch

**Hover-only disclosure** — for each nav item: `hover` shows submenu, then `focus`+Enter must too.
On coarse-pointer emulation, tap must open it.
**Gesture-only carousels**: `[...document.querySelectorAll('[class*=carousel],[class*=swiper]')].filter(c=>!c.querySelector('button,[role=button]'))`.
**Tooltip persistence** — hover away and Escape must both dismiss (WCAG 1.4.13).

## Async & notifications

**Toast invisible to AT / too fast** — after triggering: check `[role=alert],[role=status],[class*=toast]`
exists with `aria-live`; re-check at 2s/4s (gone before ~4s with actionable text = too fast).
**Silent async updates** — after search/filter, some `[aria-live]` region text must change.
**Stale-response race** — delay response for query "a" 3s, instant for "ab"; type fast; results
must match "ab".
**CLS on content arrival**:
```js
new Promise(r=>{let cls=0;new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)cls+=e.value})
  .observe({type:'layout-shift',buffered:true});setTimeout(()=>r(cls),5000)})
```
Flag > 0.1.
