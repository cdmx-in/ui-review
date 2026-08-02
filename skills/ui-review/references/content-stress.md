# Content robustness & text-stress scenarios

Stress injections MUTATE the DOM — run them last on a page and reload between
recipes. After every injection, re-run the overflow scan and screenshot.

Overflow scan (reuse after each injection):
```js
[...new Set([...document.querySelectorAll('*')].filter(e=>{
  const s=getComputedStyle(e);
  return (e.scrollWidth>e.clientWidth+1&&s.overflowX==='visible')||
         e.getBoundingClientRect().right>document.documentElement.clientWidth+1;
}).map(e=>e.tagName+'.'+e.className))].slice(0,20)
```

## Zoom & reflow (WCAG 1.4.4 / 1.4.10)

Layout-accurate zoom in headless = shrink the viewport, not devicePixelRatio:
- **200% zoom** ≡ `set viewport 640 512` (half of 1280×1024)
- **400% zoom / reflow** ≡ `set viewport 320 900`

At each: horizontal scroll check (`scrollWidth > clientWidth`), plus content loss:
```js
[...document.querySelectorAll('button,a,input')].filter(e=>{const r=e.getBoundingClientRect();
  return r.width>0&&(r.right<0||r.left>innerWidth)}).length
```

## Injection stress tests

**Long unbroken string** (URLs, emails, hashes):
```js
const W='x'.repeat(80);
document.querySelectorAll('h1,h2,h3,td,th,li,a,button,label,[class*=name],[class*=title],[class*=email]')
  .forEach(e=>{if(!e.children.length&&e.textContent.trim())e.textContent=W});
```
Static defense check: `overflowWrap!=='break-word' && wordBreak==='normal'` on text containers.

**Text expansion +40% (German test)** — buttons/tabs/nav:
```js
document.querySelectorAll('button,nav a,[role=tab],th,label').forEach(e=>{
  if(!e.children.length)e.textContent+=e.textContent.slice(0,Math.ceil(e.textContent.length*.4))});
```
Screenshot at 1280 and 375. Uppercase elements (`text-transform:uppercase`) expand extra — check those first.

**Locale width variance** — prices/dates:
```js
document.querySelectorAll('[class*=price],[class*=amount],[class*=total]').forEach(e=>e.textContent='123.456.789,00 €');
document.querySelectorAll('[class*=date],time').forEach(e=>e.textContent='27 septembre 2026, 23:59');
```

**RTL flip**: `document.documentElement.dir='rtl'` → full screenshot, diff vs LTR.
Then inject Arabic into headings (`'مرحبا بك في التطبيق'`) — bidi with numbers/latin
brand names is where it breaks. Static smell: absolutely-positioned elements and
asymmetric physical padding (`paddingLeft !== paddingRight` by >8px).

**CJK/Thai line-breaking**: inject
`'これは非常に長い日本語のテキストで折り返しの動作を確認します'` and
`'ทดสอบการตัดคำภาษาไทยที่ไม่มีช่องว่าง'` into paragraphs/titles.

**Diacritic/descender clipping** — tight line-height + overflow hidden chops
Vietnamese/Thai stacked marks: inject `'Ẹ̀g̃ýp̂q Ǫ̈'` into buttons/badges, screenshot.

**Emoji grapheme clusters** — inject `'👨‍👩‍👧‍👦'` into name fields; after any JS truncation:
`document.body.innerText.includes('�')` = split cluster.

**Whitespace/newline content** — name = `'   '` or `'a\nb\nc'` via real inputs: empty-looking
rows, exploded heights.

**Number extremes** — `0, -1, 99999999.999, 1e21, NaN` into stat tiles; grep rendered text
for `e+`, `NaN`, `-0`.

**HTML escaping** — via real input fields (not DOM mutation): `<b>bold</b> & "quotes"`.
If it renders styled instead of literal = escaping bug (and possible XSS) — report as security.

## Format & template leaks (pure text scan, run everywhere)

```js
const t=document.body.innerText;
({plural:t.match(/\b1 [a-z]+s\b/gi),           // "1 items"
  template:t.match(/\{\{?[\w.]+\}?\}|%[sd]\b/g), // unrendered tokens
  junk:t.match(/\b(undefined|null|NaN|\[object Object\]|Invalid Date)\b/g),
  epoch:t.match(/\b19(69|70)\b/g)})              // new Date(0) leaks
```

## List-size extremes

- **0 items**: route the API to `[]` (see interaction.md) — expect a designed empty state.
- **1 item**: grids designed for 3 columns show one stretched lonely card; "1-1 of 1" text.
- **1000 items** (virtualization check):
```js
const row=document.querySelector('tbody tr');const t0=performance.now();
for(let i=0;i<1000;i++)row.parentNode.appendChild(row.cloneNode(true));
({ms:performance.now()-t0,height:document.body.scrollHeight})
```
- **Pagination boundaries**: `?page=9999`, `?page=0`, `?page=-1` — expect graceful clamp,
  not blank/error.

## Truncation correctness

```js
[...document.querySelectorAll('*')].filter(e=>{const s=getComputedStyle(e);
  const clamped=s.textOverflow==='ellipsis'||s.webkitLineClamp!=='none';
  const truncated=e.scrollWidth>e.clientWidth+1||e.scrollHeight>e.clientHeight+1;
  return clamped&&truncated&&!e.title&&!e.getAttribute('aria-label')})
  .map(e=>e.textContent.slice(0,40))
```
Truncated with no tooltip/title/aria-label = full value unreachable. Hover one and
screenshot to confirm a tooltip appears.

## Font-size scaling (px-locked layouts)

Only fonts grow (distinct from zoom): `document.documentElement.style.fontSize='32px'`
catches rem-based apps; for px-set text double each leaf's computed size. Then flag
fixed-height containers clipping: `scrollHeight > clientHeight+2 && overflowY==='hidden'`.
