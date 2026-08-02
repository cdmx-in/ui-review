// ui-review in-page defect detector. Run via: agent-browser eval --stdin < detect.js
// Returns JSON: { viewport, viewportMetaMissing, horizontalScroll, offenders,
//                 clippedText, overlaps, tinyTapTargets, brokenImages,
//                 distortedImages, overflowingMedia, smallText, wrappedControls,
//                 placeholderText }
(() => {
  const CAP = 15; // max findings per category, keeps output readable
  const de = document.documentElement;
  const vw = de.clientWidth, vh = de.clientHeight;

  const sel = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id) return s + "#" + el.id;
    if (el.classList.length) s += "." + [...el.classList].slice(0, 2).join(".");
    const t = (el.textContent || "").trim().slice(0, 40);
    return t ? s + ` ("${t}")` : s;
  };

  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return false;
    const s = getComputedStyle(el);
    return s.display !== "none" && s.visibility !== "hidden" && s.opacity !== "0";
  };

  const issues = {
    viewport: vw + "x" + vh,
    viewportMetaMissing: !document.querySelector("meta[name=viewport]"),
    horizontalScroll: de.scrollWidth > de.clientWidth + 1,
    offenders: [], clippedText: [], overlaps: [], tinyTapTargets: [],
    brokenImages: [], distortedImages: [], overflowingMedia: [],
    smallText: [], wrappedControls: [], placeholderText: [],
  };

  const PLACEHOLDER_RE = /\b(lorem ipsum|undefined|NaN|\[object Object\]|TODO:)/;

  const all = [...document.querySelectorAll("body *")].filter(visible);
  const textLeaves = [];

  for (const el of all) {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());

    // elements poking past the viewport edge (cause of horizontal scroll)
    if (issues.horizontalScroll && issues.offenders.length < CAP &&
        (r.right > vw + 1 || r.left < -1)) {
      issues.offenders.push({ el: sel(el), left: Math.round(r.left), right: Math.round(r.right) });
    }

    if (hasText) {
      textLeaves.push({ el, r });

      // text clipped without ellipsis (horizontal or vertical)
      const clipX = el.scrollWidth > el.clientWidth + 2 &&
        (s.overflowX === "hidden" || s.overflowX === "clip") && s.textOverflow !== "ellipsis";
      const clipY = el.scrollHeight > el.clientHeight + 4 &&
        (s.overflowY === "hidden" || s.overflowY === "clip") && s.webkitLineClamp === "none";
      if ((clipX || clipY) && issues.clippedText.length < CAP) {
        issues.clippedText.push({ el: sel(el), axis: clipX ? "x" : "y",
          scroll: clipX ? el.scrollWidth : el.scrollHeight,
          client: clipX ? el.clientWidth : el.clientHeight });
      }

      if (parseFloat(s.fontSize) < 12 && issues.smallText.length < CAP) {
        issues.smallText.push({ el: sel(el), fontSize: s.fontSize });
      }

      // dev leakage: lorem ipsum, undefined, NaN, [object Object], TODO:
      const txt = el.textContent.trim().slice(0, 200);
      if (PLACEHOLDER_RE.test(txt) && issues.placeholderText.length < CAP) {
        issues.placeholderText.push({ el: sel(el), text: txt.slice(0, 80) });
      }
    }
  }

  // interactive elements: tap-target size + unintended multi-line wrapping
  for (const el of document.querySelectorAll("a,button,input:not([type=hidden]),select,textarea,[role=button],[role=link]")) {
    if (!visible(el)) continue;
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();

    // tap targets < 24px (WCAG 2.5.8); inline links inside prose are exempt
    if (issues.tinyTapTargets.length < CAP &&
        !(el.tagName === "A" && s.display === "inline") &&
        (r.width < 24 || r.height < 24)) {
      issues.tinyTapTargets.push({ el: sel(el), size: Math.round(r.width) + "x" + Math.round(r.height) });
    }

    // button/link text wrapped onto 2+ lines (usually a squeezed layout);
    // measure actual text rects, not element height — fixed-height icon+label
    // buttons (h-11 etc.) are single-line despite being tall
    if (issues.wrappedControls.length < CAP && (el.tagName === "BUTTON" || el.tagName === "A") &&
        s.display !== "inline" && el.textContent.trim()) {
      const lh = parseFloat(s.lineHeight) || parseFloat(s.fontSize) * 1.2;
      const range = document.createRange();
      range.selectNodeContents(el);
      const tops = [...range.getClientRects()].filter(x => x.width > 1 && x.height > 1).map(x => x.top);
      range.detach();
      if (tops.length && Math.max(...tops) - Math.min(...tops) > lh * 0.8) {
        issues.wrappedControls.push({ el: sel(el), height: Math.round(r.height) });
      }
    }
  }

  for (const img of document.images) {
    if (img.complete && img.naturalWidth === 0 && img.src && issues.brokenImages.length < CAP) {
      issues.brokenImages.push({ src: img.src.slice(0, 120) });
    }
    if (!visible(img)) continue;
    const r = img.getBoundingClientRect();

    // stretched/squashed: rendered aspect ratio off from natural by >3%
    if (img.naturalWidth > 0 && r.width > 20 && r.height > 20 &&
        getComputedStyle(img).objectFit === "fill" && issues.distortedImages.length < CAP) {
      const natural = img.naturalWidth / img.naturalHeight;
      const rendered = r.width / r.height;
      if (Math.abs(natural - rendered) / natural > 0.03) {
        issues.distortedImages.push({ el: sel(img),
          natural: img.naturalWidth + "x" + img.naturalHeight,
          rendered: Math.round(r.width) + "x" + Math.round(r.height) });
      }
    }

    const p = img.parentElement;
    if (p && issues.overflowingMedia.length < CAP) {
      const pr = p.getBoundingClientRect();
      if (r.width - pr.width > 4) {
        issues.overflowingMedia.push({ el: sel(img), width: Math.round(r.width), container: Math.round(pr.width) });
      }
    }
  }

  // overlapping text elements (skip ancestor/descendant pairs)
  // ponytail: O(n²) capped at 300 leaves; spatial index if pages get huge
  const leaves = textLeaves.slice(0, 300);
  outer:
  for (let i = 0; i < leaves.length; i++) {
    for (let j = i + 1; j < leaves.length; j++) {
      if (issues.overlaps.length >= CAP) break outer;
      const a = leaves[i], b = leaves[j];
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const x = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
      const y = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
      if (x <= 0 || y <= 0) continue;
      const overlap = x * y;
      const smaller = Math.min(a.r.width * a.r.height, b.r.width * b.r.height);
      if (smaller > 0 && overlap / smaller > 0.3) {
        issues.overlaps.push({ a: sel(a.el), b: sel(b.el) });
      }
    }
  }

  return JSON.stringify(issues);
})()
