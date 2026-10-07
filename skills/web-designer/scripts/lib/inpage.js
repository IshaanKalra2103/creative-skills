// Evaluated inside the page (via CDP, so a site's CSP cannot block it).
// Defines window.__wd: the slop scan, layout defects, OS font emulation and
// pseudo-localisation. Plain browser JavaScript, no imports.
(() => {
  if (window.__wd) return;

  // ---------------------------------------------------------------- colour
  const parse = (c) => {
    if (!c) return null;
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (m) {
      const p = m[1].split(/[ ,/]+/).filter(Boolean).map((v) => (v.endsWith("%") ? parseFloat(v) / 100 : Number(v)));
      return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 };
    }
    // oklch()/lab()/color() come back from modern engines: let a canvas convert.
    if (/^(oklch|oklab|lab|lch|color|hsl|hwb)\(/.test(c)) {
      const cv = parse.cv || (parse.cv = document.createElement("canvas").getContext("2d", { willReadFrequently: true }));
      cv.clearRect(0, 0, 1, 1); cv.fillStyle = "#000"; cv.fillStyle = c; cv.fillRect(0, 0, 1, 1);
      const d = cv.getImageData(0, 0, 1, 1).data;
      const alpha = (c.match(/\/\s*([\d.]+%?)\s*\)$/) || [])[1];
      return { r: d[0], g: d[1], b: d[2], a: alpha ? (alpha.endsWith("%") ? parseFloat(alpha) / 100 : +alpha) : 1 };
    }
    return null;
  };
  const colorsIn = (s) => [...(s || "").matchAll(/(rgba?|oklch|oklab|lab|lch|color|hsl)\([^()]*(\([^()]*\)[^()]*)*\)/g)].map((m) => parse(m[0])).filter(Boolean);
  const lum = ({ r, g, b }) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const hsl = ({ r, g, b }) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
    if (max === min) return { h: 0, s: 0, l };
    const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return { h: h * 60, s, l };
  };
  const blend = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });

  // ------------------------------------------------------------- elements
  const csCache = new WeakMap();
  const cs = (e) => { let c = csCache.get(e); if (!c) { c = getComputedStyle(e); csCache.set(e, c); } return c; };
  const opacityOf = (e) => { let o = 1; for (let n = e; n && n.nodeType === 1; n = n.parentElement) o *= +cs(n).opacity; return o; };
  const isVisible = (e) => {
    const r = e.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    const c = cs(e);
    if (c.visibility === "hidden" || c.display === "none") return false;
    if (e.closest("[aria-hidden=true],.sr-only,.visually-hidden,[hidden],template,noscript,script,style")) return false;
    if (e.checkVisibility && !e.checkVisibility({ visibilityProperty: true, contentVisibilityAuto: false })) return false; // closed <details>, content-visibility
    if (e.closest("details:not([open])") && !e.closest("summary")) return false;
    // Visually hidden (screen-reader only) text: clip to a pixel, clip-path, text-indent, zero font size.
    const clipNums = (c.clip.match(/-?[\d.]+px/g) || []).map(parseFloat);
    if (clipNums.length === 4 && Math.abs(clipNums[1] - clipNums[3]) <= 1 && Math.abs(clipNums[2] - clipNums[0]) <= 1) return false;
    if (/inset\(\s*(50%|100%)|circle\(0/.test(c.clipPath)) return false;
    if (parseFloat(c.textIndent) < -500 || parseFloat(c.fontSize) === 0) return false;
    if (r.width <= 2 || r.height <= 2) return false;
    return true;
  };
  const ownText = (e) => [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(" ").replace(/\s+/g, " ").trim();
  const label = (e, n = 40) => (e.getAttribute?.("aria-label") || e.textContent || e.getAttribute?.("alt") || e.tagName.toLowerCase()).replace(/\s+/g, " ").trim().slice(0, n);
  const textElements = () => [...document.body.querySelectorAll("*")].filter((e) => !e.closest("svg,script,style,noscript,template,[data-wd-ignore]") && ownText(e) && isVisible(e));
  const docRect = (e) => { const r = e.getBoundingClientRect(); return { left: r.left + scrollX, right: r.right + scrollX, top: r.top + scrollY, bottom: r.bottom + scrollY, width: r.width, height: r.height }; };

  // Does this element paint a real image or gradient behind its content? A
  // gradient sized to a pixel or two is an underline or rule, not a ground.
  const paintsBg = (c) => {
    if (!c.backgroundImage || c.backgroundImage === "none") return false;
    if (/^url\(.*\.svg/.test(c.backgroundImage)) return false;
    const sizes = c.backgroundSize.split(",").map((x) => x.trim().split(/\s+/).map(parseFloat));
    return !sizes.every((sz) => sz.some((v) => !isNaN(v) && v <= 3));
  };
  // Effective solid ground behind an element; null if a gradient or image is in the way.
  const groundOf = (el) => {
    const layers = [];
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const c = cs(n);
      if (paintsBg(c)) return null;
      const bg = parse(c.backgroundColor);
      if (bg && bg.a > 0) { layers.push(bg); if (bg.a >= 0.99) break; }
    }
    let base = { r: 255, g: 255, b: 255, a: 1 };
    const root = parse(cs(document.documentElement).backgroundColor);
    if (root && root.a > 0.99) base = root;
    for (let i = layers.length - 1; i >= 0; i--) base = blend(layers[i], base);
    return base;
  };
  // Is an image, video, canvas or gradient painted between the text and its solid ground?
  const blended = (e) => { for (let n = e; n && n.nodeType === 1; n = n.parentElement) if (cs(n).mixBlendMode !== "normal") return true; return false; };
  const overMedia = (e) => {
    if (blended(e)) return true; // the colour you see is computed by the compositor
    // Text on its own opaque ground (a pill button) reads against that ground,
    // whatever its rounded corners let show through.
    // Only small grounds close to the text (a pill, a badge, a button): a whole
    // section's colour can still have a photo painted between it and the text.
    let hop = 0;
    for (let n = e; n && n.nodeType === 1 && hop < 3; n = n.parentElement, hop++) {
      if (paintsBg(cs(n))) break;
      const q = n.getBoundingClientRect();
      if ((parse(cs(n).backgroundColor)?.a || 0) > 0.95 && q.width * q.height < 160000) return false;
    }
    const r = e.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return false; // only measurable in view
    const stack = document.elementsFromPoint(r.left + Math.min(r.width / 2, 40), r.top + r.height / 2);
    const at = stack.indexOf(e);
    for (const n of stack.slice(at + 1)) {
      if (n.contains(e) && !paintsBg(cs(n))) { if ((parse(cs(n).backgroundColor)?.a || 0) > 0.95) return false; continue; }
      if (n.matches("img,video,canvas,picture,iframe") || n.closest("svg") || paintsBg(cs(n))) return true;
      if ((parse(cs(n).backgroundColor)?.a || 0) > 0.95) return false;
    }
    return false;
  };

  // ------------------------------------------------------------ word lists
  const SLOP_WORDS = [
    "supercharge", "seamless", "effortless", "unlock", "unleash", "elevate", "empower", "revolutioni", "game-chang", "game chang",
    "next-level", "next level", "cutting-edge", "cutting edge", "state-of-the-art", "streamline your", "leverage", "harness the",
    "all-in-one", "all in one place", "at your fingertips", "take control of", "like never before", "transform the way",
    "transform your", "built for the modern", "for modern teams", "the future of", "reimagin", "level up", "ready to get started",
    "get started today", "join thousands", "trusted by thousands", "loved by teams", "world-class", "best-in-class", "blazing",
    "lightning-fast", "lightning fast", "10x your", "skyrocket", "turbocharge", "in just minutes", "say goodbye to", "say hello to",
    "your journey", "welcome back", "powered by ai", "ai-powered", "magic happens", "lorem", "ipsum", "dolor sit",
  ];
  const FAKE_NAMES = /\b(john doe|jane doe|jane smith|john smith|acme( corp| inc)?|lorem|foo bar|user name|your name|company name|sarah johnson|alex johnson|emily chen|michael chen|david kim)\b/i;
  const DEFAULT_FONTS = /^(inter|inter var|inter tight|geist|geist sans|poppins|montserrat|plus jakarta sans|manrope|dm sans|space grotesk|outfit|sora|urbanist|lexend|figtree|onest|instrument serif|fraunces|playfair display|playfair|dm serif display|dm serif text|cormorant|cormorant garamond|lora|roboto|open sans|lato|nunito|raleway|work sans|ibm plex sans|jetbrains mono|space mono)$/i;
  const ICON_FONTS = /(material|icons|symbols|font ?awesome|fa-|bootstrap-icons|remixicon|phosphor|tabler|ionicons|feather)/i;
  const SYSTEM_FAMS = /^(-apple-system|blinkmacsystemfont|system-ui|ui-sans-serif|ui-serif|ui-monospace|ui-rounded|segoe ui|segoe ui variable.*|roboto|helvetica neue|helvetica|arial|sans-serif|serif|monospace|apple color emoji|segoe ui emoji|segoe ui symbol|noto color emoji|noto sans|ubuntu|cantarell|oxygen|fira sans|droid sans)$/i;
  const fam1 = (ff) => ff.split(",")[0].replace(/["']/g, "").trim();

  // ======================================================== the slop scan
  function scan(opts = {}) {
    const app = !!opts.app, mobile = innerWidth <= 520;
    const fails = [], warns = [], facts = {};
    const F = (m) => fails.push(m), W = (m) => warns.push(m);
    const all = [...document.body.querySelectorAll("*")].filter((e) => !e.closest("script,style,noscript,template,[data-wd-ignore]"));
    const texts = textElements();
    const bodyText = texts.map(ownText).join(" \n ");
    const lower = bodyText.toLowerCase();

    // ---- document
    const vp = document.querySelector('meta[name="viewport"]');
    if (!vp) F('No <meta name="viewport">. Phones will render the desktop layout zoomed out.');
    if (!document.documentElement.lang) W("<html> has no lang attribute (screen readers, hyphenation, translation).");
    if (!document.title.trim()) W("Empty <title>.");
    const se = document.scrollingElement;
    if (se.scrollWidth > se.clientWidth + 1) {
      const wide = overflowCulprits();
      F(`Page scrolls sideways at ${innerWidth}px (content ${se.scrollWidth}px wide)${wide.length ? ". Sticking out: " + wide.join("; ") : ""}. Often 100vw, a fixed width, or an unwrapped long word.`);
    }

    // ---- typography
    const fams = new Map(), sizes = new Map();
    let tiny = [], small = [], lowC = [], centered = 0, blocks = 0, longLines = [], looseDisplay = [], eyebrows = 0, numbered = 0, smallBody = [];
    let maxPx = 0, bodyPx = 0, bodyChars = 0;
    const lowEls = (window.__wdLow = []);
    const pxJobs = [];
    for (const e of texts) {
      const c = cs(e), t = ownText(e), n = t.length;
      const fam = fam1(c.fontFamily);
      if (!ICON_FONTS.test(fam) && !/^[-]+$/.test(t)) fams.set(fam, (fams.get(fam) || 0) + n);
      const px = parseFloat(c.fontSize);
      sizes.set(px, (sizes.get(px) || 0) + n);
      if (px > maxPx && opacityOf(e) > 0.3) maxPx = px;
      if (/^(p|li|dd|blockquote)$/i.test(e.tagName) && n > 60) { bodyPx += px * n; bodyChars += n; if (px < (app ? 13 : 15)) smallBody.push(`${px}px "${t.slice(0, 30)}"`); }
      const avatar = n <= 3 && /^[A-Z0-9+]+$/.test(t) && e.closest("*") && [e, e.parentElement].some((x) => x && parseFloat(cs(x).borderTopLeftRadius) >= x.getBoundingClientRect().width * 0.3);
      if (px < 11 && !e.closest("sup,sub") && !avatar) tiny.push(`${px}px "${t.slice(0, 30)}"`);
      else if (px < 12 && !e.closest("sup,sub,small,footer,[data-dense]")) small.push(`${px}px "${t.slice(0, 30)}"`);
      if (px >= 40 && c.textTransform !== "uppercase" && t !== t.toUpperCase() && (c.letterSpacing === "normal" || parseFloat(c.letterSpacing) >= 0)) looseDisplay.push(`${Math.round(px)}px "${t.slice(0, 24)}"`);
      if (c.textTransform === "uppercase" && px < 15 && n < 40 && (parseFloat(c.letterSpacing) || 0) > 0.4) {
        eyebrows++;
        if (/^(\(?\d{1,3}\)?|[ivx]+)\s*[—–\-/.·:]|^\[\d+\]/i.test(t) || /^(0\d|\d{2})\b/.test(t)) numbered++;
      }
      if (n > 24) { blocks++; if (c.textAlign === "center") centered++; }
      if (/^(p|li)$/i.test(e.tagName) && n > 200) {
        const rg = document.createRange(); rg.selectNodeContents(e);
        const lines = new Set([...rg.getClientRects()].map((r) => Math.round(r.top))).size;
        if (lines > 1) { const cpl = e.textContent.trim().length / lines; if (cpl > 88) longLines.push(`~${Math.round(cpl)} chars/line "${t.slice(0, 24)}"`); }
      }
      // contrast
      const fg = parse(c.color);
      if (!fg || fg.a * opacityOf(e) < 0.05 || !/[\p{L}\p{N}]/u.test(t)) continue;
      const large = px >= 24 || (px >= 18.66 && +c.fontWeight >= 700);
      const need = large ? 3 : 4.5;
      if (overMedia(e)) { pxJobs.push({ i: pxJobs.length, t: t.slice(0, 40), fg, need }); e.setAttribute("data-wd-px", pxJobs.length - 1); continue; }
      const bg = groundOf(e);
      if (!bg) continue;
      const a = { ...fg, a: fg.a * opacityOf(e) };
      const ratio = contrast(blend(a, bg), bg);
      if (ratio < need && !e.closest("[disabled],[aria-disabled=true],:disabled")) { lowC.push(`${ratio.toFixed(2)}:1 ${px}px "${t.slice(0, 30)}"`); lowEls.push({ e, need, px, t: t.slice(0, 30) }); }
    }
    const famList = [...fams.entries()].sort((a, b) => b[1] - a[1]);
    const totalChars = famList.reduce((s, [, n]) => s + n, 0) || 1;
    const used = famList.filter(([, n]) => n / totalChars > 0.015).map(([f]) => f);
    facts.fonts = Object.fromEntries(famList.map(([f, n]) => [f, Math.round((n / totalChars) * 100) + "%"]));
    facts.sizes = [...sizes.keys()].sort((a, b) => b - a);
    facts.body = bodyChars ? +(bodyPx / bodyChars).toFixed(1) : null;
    if (used.length > 3) F(`${used.length} type families in real use (${used.join(", ")}). Two is a system, four is a ransom note.`);
    const defaults = used.filter((f) => DEFAULT_FONTS.test(f));
    if (defaults.length) W(`Default-reach font: ${defaults.join(", ")}. If DIRECTION.md does not say why this face and not another, it is the default talking.`);
    if (used.length && used.every((f) => SYSTEM_FAMS.test(f)) && !app) W(`Only system fonts (${used.join(", ")}). They render differently on Mac, Windows and Linux; a marketing page usually wants a chosen face.`);
    if (sizes.size > 12) W(`${sizes.size} distinct text sizes. A scale has 6 to 9 steps: ${facts.sizes.join(", ")}`);
    const bp = facts.body || 16;
    if (!app && !mobile && document.querySelector("h1") && maxPx / bp < 2.4) W(`Largest text is ${maxPx}px against ${bp}px body (${(maxPx / bp).toFixed(1)}x). Nothing owns the first screen.`);
    if (tiny.length) F(`Text under 11px: ${tiny.slice(0, 4).join("; ")}`);
    if (small.length > 3) W(`${small.length} text elements at 11px: ${small.slice(0, 3).join("; ")}`);
    if (smallBody.length > 2) W(`Running text under ${app ? 13 : 15}px: ${smallBody.slice(0, 3).join("; ")}`);
    if (longLines.length) W(`Lines too long to read comfortably (aim for 45 to 75): ${longLines.slice(0, 3).join("; ")}`);
    if (looseDisplay.length) W(`Display type with default or positive tracking: ${looseDisplay.slice(0, 3).join("; ")}. Big type usually wants -1% to -4%.`);
    if (lowC.length) F(`Contrast below WCAG AA: ${lowC.slice(0, 5).join("; ")}${lowC.length > 5 ? ` (+${lowC.length - 5} more)` : ""}`);
    if (blocks >= 6 && centered / blocks > 0.6) W(`${centered} of ${blocks} text blocks are centred. Centred everything is the template look; left-aligned reads and scans better.`);
    if (eyebrows > 6) W(`${eyebrows} small letter-spaced uppercase labels. An eyebrow over every section stops meaning anything.`);
    if (numbered >= 3) W(`${numbered} numbered uppercase labels ("01 —"). Numbered mono eyebrows are the anti-slop house style; see slop.md "The overcorrection".`);

    if (!app && scrollY < 2 && document.querySelector("h1") && !firstScreenAction().length) W(`No action in the first ${innerWidth}×${innerHeight} screen (outside the nav). The one action should be visible without scrolling.`);

    // ---- layout defects (clipping, collisions)
    const d = defects();
    for (const m of d.fails) F(m);
    for (const m of d.warns) W(m);

    // ---- copy
    const emoji = [...new Set((bodyText.match(/\p{Extended_Pictographic}/gu) || []).filter((ch) => !/[©®™↔↕]/.test(ch)))];
    if (emoji.length) F(`Emoji in interface copy: ${emoji.join(" ")}. Use an icon set at one weight, or words.`);
    const hits = SLOP_WORDS.filter((w) => lower.includes(w));
    if (hits.length >= 3) F(`Slop copy: ${hits.map((h) => `"${h}"`).join(", ")}. Say what the product does, in the customer's words.`);
    else if (hits.length) W(`Marketing cliché: ${hits.map((h) => `"${h}"`).join(", ")}. Is there a more specific way to say it?`);
    const fake = bodyText.match(FAKE_NAMES);
    if (fake) F(`Placeholder content: "${fake[0]}".`);
    const greet = texts.find((e) => /^(good (morning|afternoon|evening)|welcome back|hi|hey|hello)\b[ ,!]/i.test(e.textContent.trim()) && docRect(e).top < 400);
    if (greet) F(`Greeting header: "${greet.textContent.trim().slice(0, 40)}". Spend the top of the screen on the work.`);
    if (/[+\-−]?\d+(\.\d+)?%\s+(from|vs\.?|since|over)\s+last\s+(month|week|year|period)/i.test(bodyText)) F('"+20.1% from last month" KPI cards: the shadcn example dashboard, verbatim.');
    if (/\$45,231\.89|\+2350|\+12,234/.test(bodyText)) F("Numbers from the shadcn example dashboard.");
    // The two-beat aphorism: "Send the invoice. Get paid." Two short sentences as the headline.
    const h1t = (document.querySelector("h1")?.textContent || "").replace(/\s+/g, " ").trim();
    const beats = h1t.split(/(?<=[.!?])\s+/).filter(Boolean);
    if (!app && beats.length === 2 && beats.every((b) => b.split(" ").length <= 6)) W(`Two-beat aphorism headline ("${h1t.slice(0, 60)}"). Every generated hero is one now; say the specific thing instead (copy.md).`);
    if (/most popular/i.test(bodyText)) W('"Most popular" pricing badge. Does the middle tier really need a badge, or is it reflex?');
    const round = bodyText.match(/\b(10,?000\+|50,?000\+|100,?000\+|1M\+|10M\+|99\.9+%|10x|5x faster|10x faster)/gi);
    if (round && round.length >= 2) W(`Round-number proof (${[...new Set(round)].slice(0, 4).join(", ")}). Specific numbers are believed; round ones are skimmed.`);
    const dashes = (bodyText.match(/—/g) || []).length;
    if (dashes > 2) W(`${dashes} em dashes in visible copy. A period or colon usually reads cleaner.`);
    const bangs = (bodyText.match(/!(\s|$)/g) || []).length;
    if (bangs > 1) W(`${bangs} exclamation marks. The page is shouting.`);

    // ---- colour, surface, structure
    const hues = new Map();
    let grads = 0, purple = [], gradText = [], glows = 0, blobs = 0, glass = 0, shadows = 0, dotGrid = 0;
    const radii = new Map(); let boxes = 0; const cards = [];
    for (const e of all) {
      if (!isVisible(e)) continue;
      const c = cs(e), r = e.getBoundingClientRect();
      const inImg = e.closest("picture,[data-wd-art]");
      for (const prop of ["color", "backgroundColor", "borderTopColor", "fill", "stroke"]) {
        if ((prop === "fill" || prop === "stroke") && !(e instanceof SVGElement)) continue;
        if (prop === "color" && !ownText(e)) continue;
        if (prop === "borderTopColor" && parseFloat(c.borderTopWidth) === 0) continue;
        const col = parse(c[prop]);
        if (!col || col.a < 0.5 || inImg) continue;
        const { h, s, l } = hsl(col);
        if (s > 0.4 && l > 0.18 && l < 0.82) { const k = (Math.round(h / 30) * 30) % 360; hues.set(k, (hues.get(k) || 0) + (prop === "backgroundColor" ? r.width * r.height / 2000 : 1)); }
      }
      const bi = c.backgroundImage;
      if (bi && bi.includes("gradient")) {
        const stops = colorsIn(bi).filter((x) => x.a > 0.15).map(hsl);
        const sat = stops.filter((x) => x.s > 0.35 && x.l > 0.15 && x.l < 0.85);
        const bs = c.backgroundSize;
        if (/repeating|radial/.test(bi) && /\d/.test(bs) && parseFloat(bs) > 0 && parseFloat(bs) <= 64 && r.width > 300 && !/no-repeat/.test(c.backgroundRepeat) && r.width * r.height > innerWidth * innerHeight * 0.25) dotGrid++;
        else if (sat.length) grads++;
        const clip = c.backgroundClip === "text" || c.webkitBackgroundClip === "text";
        if (sat.some((x) => x.h >= 230 && x.h <= 300) && (r.width * r.height > 2000 || clip)) purple.push(label(e, 24) || e.tagName);
        if (clip && ownText(e) !== "" || (clip && e.textContent.trim())) gradText.push(`"${e.textContent.trim().slice(0, 24)}"`);
      }
      if (/blur\(\s*(\d+)/.test(c.filter) && +c.filter.match(/blur\(\s*(\d+)/)[1] >= 30 && r.width > 120) blobs++;
      if (c.backdropFilter && c.backdropFilter !== "none" && /blur/.test(c.backdropFilter)) glass++;
      if (c.boxShadow !== "none") {
        shadows++;
        for (const sh of c.boxShadow.split(/,(?![^(]*\))/)) {
          const col = colorsIn(sh)[0];
          const nums = sh.replace(/(rgba?|oklch|oklab|lab|lch|color|hsl)\([^)]*\)/g, "").trim().split(/\s+/).map(parseFloat).filter((x) => !isNaN(x));
          if (col && !/inset/.test(sh) && Math.abs(nums[0] || 0) < 2 && Math.abs(nums[1] || 0) < 2 && (nums[2] || 0) >= 10 && hsl(col).s > 0.4 && col.a > 0.15) glows++;
        }
      }
      const radius = parseFloat(c.borderTopLeftRadius);
      const filled = (parse(c.backgroundColor)?.a || 0) > 0.04 || c.boxShadow !== "none" || parseFloat(c.borderTopWidth) > 0;
      if (filled && r.width > 140 && r.height > 60 && !e.matches("img,video,input,textarea,select,button,html,body")) {
        boxes++; const k = Math.round(radius); radii.set(k, (radii.get(k) || 0) + 1);
        if (radius >= 6 || c.boxShadow !== "none" || parseFloat(c.borderTopWidth) > 0) cards.push(e);
      }
    }
    const hueList = [...hues.entries()].filter(([, n]) => n >= 1.5).map(([h]) => h);
    facts.hues = hueList;
    if (hueList.length > 4) F(`${hueList.length} saturated hue families (${hueList.join("°, ")}°). One accent with one job, plus semantic colour where state needs it.`);
    else if (hueList.length === 4) W(`Four saturated hue families (${hueList.join("°, ")}°). Is each one earning its place?`);
    if (purple.length) F(`Indigo/violet gradient x${purple.length} (${purple.slice(0, 3).join(", ")}). The most recognisable AI-made tell on the web.`);
    if (gradText.length) F(`Gradient-filled text: ${gradText.slice(0, 3).join(", ")}. The "two words in a gradient" headline is the template hero.`);
    if (grads > 3) W(`${grads} colour gradients. A gradient is a seasoning, not a surface.`);
    if (glows) F(`Coloured glow shadow x${glows}. Light comes from a scene, not from buttons.`);
    if (blobs) F(`Large blurred blob x${blobs}: the ambient "aurora" orb behind the hero.`);
    if (glass > 3) W(`${glass} frosted-glass (backdrop-filter) surfaces. Glass on everything is 2021 Dribbble.`);
    if (dotGrid) W(`Dot or grid-line backdrop x${dotGrid}: the default "technical" texture. Does the concept call for graph paper?`);
    if (shadows > 14) W(`${shadows} elements cast shadows. Depth from one or two layers, not every box.`);
    const topR = [...radii.entries()].sort((a, b) => b[1] - a[1])[0];
    if (boxes >= 8 && topR && topR[0] >= 12 && topR[1] / boxes > 0.75) W(`${topR[1]} of ${boxes} boxes share one ${topR[0]}px radius. The radius should vary with the object's size and role.`);
    let nested = 0; for (const c of cards) if (cards.some((o) => o !== c && o.contains(c) && (parseFloat(cs(o).borderTopLeftRadius) >= 6))) nested++;
    facts.boxes = boxes;
    if (nested >= (app ? 6 : 3)) W(`Boxes nested inside boxes x${nested}. Group with space and alignment before containers.`);

    // Identical card grids: 3+ same-size siblings, each a box holding an icon, a heading-ish line and a paragraph.
    const grids = [];
    for (const parent of new Set(cards.map((c) => c.parentElement))) {
      if (!parent) continue;
      const kids = [...parent.children].filter((k) => isVisible(k));
      if (kids.length < 3 || kids.length > 12) continue;
      const rs = kids.map((k) => k.getBoundingClientRect());
      const sameW = rs.every((r) => Math.abs(r.width - rs[0].width) < 3);
      const shaped = kids.filter((k) => cards.includes(k) && k.querySelector("svg,img,i,[class*=icon]") && k.querySelector("h2,h3,h4,h5,strong,b,[class*=title],[class*=font-semibold]") && k.querySelector("p")).length;
      if (sameW && shaped >= Math.max(3, kids.length - 1)) grids.push(`${kids.length} cards "${label(kids[0].querySelector("h2,h3,h4,h5,strong,b,[class*=title],[class*=font-semibold]") || kids[0], 22)}…"`);
    }
    facts.cardGrids = grids.length;
    if (grids.length >= 3) F(`${grids.length} grids of identical icon-heading-paragraph cards (${grids.slice(0, 3).join("; ")}). The page is a stack of templates.`);
    else if (grids.length) W(`Icon + heading + paragraph card grid: ${grids.join("; ")}. The most generated section on the web. Could it be a list, a table, a demo, or one strong example?`);

    // Icon chips: a small tinted rounded square holding a glyph.
    let chips = 0;
    for (const e of all) {
      const r = e.getBoundingClientRect();
      if (r.width < 28 || r.width > 64 || Math.abs(r.width - r.height) > 2) continue;
      const c = cs(e), radius = parseFloat(c.borderTopLeftRadius);
      const bg = parse(c.backgroundColor);
      if (bg && bg.a > 0.04 && radius >= 4 && radius < r.width / 2 - 1 && e.querySelector("svg,img,i") && !ownText(e) && isVisible(e)) chips++;
    }
    if (chips >= 3) W(`${chips} icons sitting in tinted rounded squares. When every item has one, none of them mean anything.`);

    // The pill badge above the hero headline.
    const h1 = document.querySelector("h1");
    if (h1 && isVisible(h1)) {
      const hr = docRect(h1);
      const pill = all.find((e) => {
        if (e === h1 || h1.contains(e) || e.contains(h1) || !isVisible(e) || e.closest("header,nav,[role=banner],[role=navigation]")) return false;
        for (let n = e; n && n.nodeType === 1; n = n.parentElement) if (/fixed|sticky/.test(cs(n).position)) return false; // floating chrome, not a badge
        const r = docRect(e), c = cs(e);
        const filled = (parse(c.backgroundColor)?.a || 0) > 0.04 || parseFloat(c.borderTopWidth) > 0;
        return filled && r.height >= 18 && r.height <= 44 && r.width < 520 && parseFloat(c.borderTopLeftRadius) >= r.height / 2 - 2 && r.bottom <= hr.top + 2 && hr.top - r.bottom < 90 && e.textContent.trim().length > 6;
      });
      if (pill) W(`Pill badge right above the headline ("${pill.textContent.trim().slice(0, 40)}"). The announcement-pill hero is the most copied layout in SaaS.`);
      if (cs(h1).textAlign === "center" && !app && !mobile) facts.centeredHero = true;
    }

    // Logo strip.
    const strip = texts.find((e) => /^(trusted by|used by|loved by|backed by|powering|as seen|teams at|join(ed)? by|chosen by)/i.test(e.textContent.trim()));
    if (strip) W(`Logo strip ("${strip.textContent.trim().slice(0, 40)}"). If the logos are not real customers you can name, cut it; if they are, is a greyscale row the strongest way to show it?`);

    // ---- images and icons
    const imgs = [...document.images].filter((i) => isVisible(i));
    const broken = imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => (i.getAttribute("src") || "").slice(0, 60));
    if (broken.length) F(`Broken image x${broken.length}: ${broken.slice(0, 3).join(", ")}`);
    const hosts = [...document.querySelectorAll("img,source,[style*=url]")].map((e) => e.getAttribute("src") || e.getAttribute("srcset") || e.getAttribute("style") || "").join(" ");
    const ph = hosts.match(/(placehold\.co|placeholder\.com|via\.placeholder|picsum\.photos|dummyimage|placekitten|source\.unsplash\.com|loremflickr|fakeimg)/);
    if (ph) F(`Placeholder image service (${ph[1]}). Real images, generated art-directed ones, or a designed field.`);
    const av = hosts.match(/(pravatar|randomuser\.me|ui-avatars|robohash|dicebear)/);
    if (av) W(`Stock avatar service (${av[1]}). Fake faces make fake testimonials obvious.`);
    const unsized = imgs.filter((i) => !i.getAttribute("width") && !i.getAttribute("height") && cs(i).aspectRatio === "auto" && !i.closest("[style*=aspect-ratio]") && cs(i).position !== "absolute").length;
    if (unsized > 2) W(`${unsized} <img> without width/height or aspect-ratio. They shift the layout as they load (CLS).`);
    const noAlt = imgs.filter((i) => !i.hasAttribute("alt")).length;
    if (noAlt) W(`${noAlt} image(s) with no alt attribute (use alt="" for decoration).`);
    const lucide = [...document.querySelectorAll("svg")].filter((s) => isVisible(s) && (s.classList.contains("lucide") || (s.getAttribute("viewBox") === "0 0 24 24" && s.getAttribute("stroke-width") === "2" && s.getAttribute("fill") === "none"))).length;
    facts.defaultIcons = lucide;
    if (lucide > 14) W(`${lucide} stock outline icons at the default 2px stroke (Lucide/Feather/Heroicons). Match the stroke to the type weight, or use fewer.`);

    // ---- the named faces (slop.md): enough of a face's features and it IS that face
    {
      const ground = parse(cs(document.body).backgroundColor)?.a > 0.5 ? parse(cs(document.body).backgroundColor) : parse(cs(document.documentElement).backgroundColor);
      const g = ground ? hsl(ground) : null;
      const paper = []; // The Paper Edition
      if (g && g.l > 0.88 && g.l < 0.985 && g.s > 0.12 && g.h >= 25 && g.h <= 65) paper.push("warm off-white ground");
      if (h1 && [...h1.querySelectorAll("*")].concat(h1).some((e) => cs(e).fontStyle === "italic")) paper.push("an italic word in the headline");
      const h1fam = h1 ? fam1(cs(h1).fontFamily) : "";
      const serifInH1 = h1 && [h1, ...h1.querySelectorAll("*")].some((e) => /instrument serif|fraunces|playfair|dm serif|cormorant|newsreader|lora|gloock|young serif|^serif$|georgia|times/i.test(fam1(cs(e).fontFamily)));
      if (serifInH1 || /(^|\s)serif$/i.test(h1fam)) paper.push("a serif display headline");
      if (warns.some((m) => m.startsWith("Pill badge"))) paper.push("a pill badge over the headline");
      if (eyebrows >= 3 && texts.some((e) => cs(e).textTransform === "uppercase" && /mono/i.test(cs(e).fontFamily))) paper.push("mono uppercase labels");
      const blackPill = [...document.querySelectorAll("a[href],button")].some((b) => { if (!isVisible(b)) return false; const r = b.getBoundingClientRect(), bg = parse(cs(b).backgroundColor); return r.top < innerHeight && bg && bg.a > 0.9 && lum(bg) < 0.03 && parseFloat(cs(b).borderTopLeftRadius) >= r.height / 2 - 2; });
      if (blackPill) paper.push("a black pill button");
      if (/no (credit )?card required|cancel anytime/i.test(bodyText)) paper.push("\"no card required\" small print");
      if (paper.length >= 4) F(`This page is slop face 1, "The Paper Edition" (${paper.length} of its features: ${paper.join(", ")}). Start over from the concept (slop.md).`);
      else if (paper.length === 3) W(`Three features of "The Paper Edition" (${paper.join(", ")}). One more and it is the face.`);

      const dash = []; // The shadcn Dashboard
      const side = all.find((e) => { const r = e.getBoundingClientRect(); return r.left < 2 && r.width >= 180 && r.width <= 320 && r.height > innerHeight * 0.8 && e.querySelectorAll("a,button").length >= 5; });
      if (side) dash.push("a left sidebar of links");
      if (/[+\-−]?\d+(\.\d+)?\s?(%|pts?)\s+(from|vs\.?|since|over)\s+(last|yesterday|previous)/i.test(bodyText)) dash.push("metric deltas \"vs last …\"");
      const kpi = [...new Set(cards.map((c) => c.parentElement))].some((p) => { if (!p) return false; const kids = [...p.children].filter((k) => cards.includes(k) && k.getBoundingClientRect().top < 520); return kids.length >= 3 && kids.every((k) => [...k.querySelectorAll("*")].some((x) => parseFloat(cs(x).fontSize) >= 24 && /\d/.test(ownText(x)))); });
      if (kpi) dash.push("a row of KPI cards");
      if (used.some((f) => /^(inter|geist)/i.test(f))) dash.push("Inter or Geist");
      if (lucide > 10) dash.push("stock outline icons");
      if (hueList.length >= 5) dash.push("a hue for every status");
      if (dash.length >= 4) F(`This screen is slop face 3, "The shadcn Dashboard" (${dash.join(", ")}). The work should own the screen (app.md).`);
      else if (dash.length === 3) W(`Three features of "The shadcn Dashboard" (${dash.join(", ")}).`);
    }

    // ---- accessibility basics
    const nameless = [...document.querySelectorAll("button,a[href],[role=button]")].filter((b) => isVisible(b) && !b.textContent.trim() && !b.getAttribute("aria-label") && !b.getAttribute("aria-labelledby") && !b.getAttribute("title") && !b.querySelector("img[alt]:not([alt='']),[aria-label],svg title,[title]") && !(b.matches("input") && b.value));
    if (nameless.length) F(`${nameless.length} button(s)/link(s) with no accessible name (icon-only). Add aria-label.`);
    const unlabeled = [...document.querySelectorAll("input:not([type=hidden]):not([type=submit]):not([type=button]),select,textarea")].filter((i) => isVisible(i) && !i.getAttribute("aria-label") && !i.getAttribute("aria-labelledby") && !(i.id && document.querySelector(`label[for="${CSS.escape(i.id)}"]`)) && !i.closest("label") && !i.getAttribute("title"));
    if (unlabeled.length) W(`${unlabeled.length} form field(s) without a label (a placeholder is not a label).`);
    const h1s = [...document.querySelectorAll("h1")].filter(isVisible).length;
    if (h1s === 0 && !app) W("No visible <h1>.");
    if (h1s > 1) W(`${h1s} <h1> elements.`);
    if (mobile) {
      const targets = [...document.querySelectorAll("a[href],button,[role=button],input:not([type=hidden]),select,textarea,summary,label[for]")].filter(isVisible);
      const rects = targets.map((b) => b.getBoundingClientRect());
      const tiny = targets.filter((b, i) => {
        const r = rects[i];
        if (r.width >= 24 && r.height >= 24) return false;
        // WCAG 2.5.8 spacing exception: a 24px square on its centre touches no other target.
        const cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
        const sq = { l: cx - 12, r: cx + 12, t: cy - 12, b: cy + 12 };
        if (!rects.some((o, j) => j !== i && !targets[j].contains(b) && !b.contains(targets[j]) && o.left < sq.r && o.right > sq.l && o.top < sq.b && o.bottom > sq.t)) return false;
        if (b.matches("a") && b.parentElement && /^(p|li|span|td|dd)$/i.test(b.parentElement.tagName) && b.parentElement.textContent.trim().length > b.textContent.trim().length + 20) return false; // inline link in a sentence
        return true;
      });
      if (tiny.length) F(`${tiny.length} tap target(s) under 24x24px (WCAG 2.5.8): ${tiny.slice(0, 4).map((b) => `${Math.round(b.getBoundingClientRect().width)}x${Math.round(b.getBoundingClientRect().height)} "${label(b, 18)}"`).join("; ")}`);
    }
    return { fails, warns, facts, pxJobs };
  }

  // ================================================ layout defects only
  // Used by the scan and by every matrix pass: what broke, not what is slop.
  const alnum = (t) => /[\p{L}\p{N}]/u.test(t);
  // Elements that move forever (marquees, tickers, carousels on autoplay).
  const looping = () => {
    const s = new Set();
    for (const a of document.getAnimations()) {
      const t = a.effect?.getComputedTiming?.();
      if (a.playState === "running" && t && t.endTime === Infinity && a.effect.target) s.add(a.effect.target);
    }
    return s;
  };
  // The nearest ancestor that clips (html and body excluded: that is the viewport's job).
  const clipper = (e) => {
    for (let n = e.parentElement; n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
      const c = cs(n);
      if (c.overflow === "visible" && c.overflowX === "visible" && c.overflowY === "visible" && c.contain.indexOf("paint") < 0 && (c.clipPath === "none" || !c.clipPath)) continue;
      return { n, scrolls: /auto|scroll/.test(c.overflowX + c.overflowY), r: n.getBoundingClientRect() };
    }
    return null;
  };

  function defects() {
    const fails = [], warns = [];
    const texts = textElements();
    const clipped = [], overlaps = [], offscreen = [], hidden = [];
    const boxes = [];
    const vw = document.documentElement.clientWidth;
    const loops = looping();
    const inLoop = (e) => { for (let n = e; n; n = n.parentElement) if (loops.has(n)) return true; return false; };
    for (const e of texts) {
      const c = cs(e), t = ownText(e).slice(0, 30);
      if (opacityOf(e) < 0.06) {
        // Fixed layers (a footer revealed behind the page, a menu, a toast) are hidden by design.
        const inFixed = (() => { for (let n = e; n && n.nodeType === 1; n = n.parentElement) if (cs(n).position === "fixed") return true; return false; })();
        if (alnum(t) && !inFixed && !e.closest("[role=tooltip],[popover],dialog:not([open]),[data-state=closed],[aria-expanded=false]")) hidden.push(`"${t}"`);
        continue;
      }
      if (inLoop(e)) continue; // a marquee is cut on purpose
      const clip = clipper(e);
      const er = e.getBoundingClientRect();
      // Wholly outside its clipping box: a closed accordion, a hidden slide, an off-canvas drawer.
      if (clip && (er.bottom <= clip.r.top + 1 || er.top >= clip.r.bottom - 1 || er.right <= clip.r.left + 1 || er.left >= clip.r.right - 1 || clip.r.height < 2 || clip.r.width < 2)) continue;
      if (er.right <= 0 || er.left >= vw) continue; // off-canvas
      if (c.overflow !== "visible" || c.overflowX !== "visible") {
        if (e.scrollWidth > e.clientWidth + 1 && c.textOverflow !== "ellipsis" && !/auto|scroll/.test(c.overflowX)) clipped.push(`"${t}"`);
        if (e.scrollHeight > e.clientHeight + 2 && !/\d/.test(c.webkitLineClamp || "") && !/auto|scroll/.test(c.overflowY) && e.clientHeight > 0) clipped.push(`"${t}" (height)`);
      }
      const fs = parseFloat(c.fontSize);
      for (const n of e.childNodes) {
        if (n.nodeType !== 3 || !n.textContent.trim()) continue;
        const rg = document.createRange(); rg.selectNodeContents(n);
        for (const lr of rg.getClientRects()) {
          if (lr.width < 1) continue;
          const top = Math.max(lr.top, lr.bottom - 0.98 * fs) + scrollY, bottom = lr.bottom - 0.04 * fs + scrollY;
          boxes.push({ e, t, clip, r: { left: lr.left, right: lr.right, top, bottom, height: bottom - top } });
          // Crossing the viewport edge with nothing clipping it on purpose.
          if (!clip && c.position !== "fixed" && ((lr.right > vw + 1 && lr.left < vw) || (lr.left < -1 && lr.right > 0))) offscreen.push(`"${t}"`);
        }
      }
    }
    // Containers that cut text (scroll containers are allowed to).
    for (const b of boxes) {
      if (!b.clip || b.clip.scrolls || cs(b.e).textOverflow === "ellipsis") continue;
      const pr = b.clip.r, top = pr.top + scrollY, bottom = pr.bottom + scrollY;
      if (b.r.right > pr.right + 1 || b.r.left < pr.left - 1 || b.r.bottom > bottom + 2 || b.r.top < top - 2) clipped.push(`"${b.t}" cut by its container`);
    }
    // Collisions, bucketed so long pages stay fast.
    const bucket = new Map(), key = (x, y) => `${x},${y}`;
    boxes.forEach((b, i) => {
      for (let x = Math.floor(b.r.left / 200); x <= Math.floor(b.r.right / 200); x++)
        for (let y = Math.floor(b.r.top / 200); y <= Math.floor(b.r.bottom / 200); y++) { const k = key(x, y); if (!bucket.has(k)) bucket.set(k, []); bucket.get(k).push(i); }
    });
    const seen = new Set(), cands = [];
    const layer = (e) => e.closest("[style*=position\\:\\ fixed],header,nav,[role=dialog],dialog,[popover],[data-wd-float]");
    for (const list of bucket.values()) for (let x = 0; x < list.length; x++) for (let y = x + 1; y < list.length; y++) {
      const i = list[x], j = list[y], pk = i < j ? i + ":" + j : j + ":" + i;
      if (seen.has(pk)) continue; seen.add(pk);
      const a = boxes[i], b = boxes[j];
      if (a.e === b.e || a.e.contains(b.e) || b.e.contains(a.e)) continue;
      if (layer(a.e) !== layer(b.e) && (cs(a.e).position === "fixed" || cs(b.e).position === "fixed" || layer(a.e) || layer(b.e))) continue;
      const ox = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
      const oy = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
      if (ox > 2 && oy > Math.min(a.r.height, b.r.height) * 0.35) cands.push([a, b, (Math.max(a.r.left, b.r.left) + Math.min(a.r.right, b.r.right)) / 2, (Math.max(a.r.top, b.r.top) + Math.min(a.r.bottom, b.r.bottom)) / 2]);
    }
    // Look at each candidate where it is: if an opaque layer sits between the two
    // texts, the lower one is covered (a stacked mockup, a menu), not colliding.
    const y0 = scrollY;
    for (const [a, b, x, y] of cands.slice(0, 40)) {
      scrollTo({ top: Math.max(0, y - innerHeight / 2), behavior: "instant" });
      const vy = y - scrollY;
      const stack = document.elementsFromPoint(x, vy);
      const ia = stack.findIndex((n) => n === a.e || a.e.contains(n)), ib = stack.findIndex((n) => n === b.e || b.e.contains(n));
      if (ia < 0 || ib < 0) continue; // one of them is not painted here at all
      const [hi, lo] = ia < ib ? [ia, ib] : [ib, ia];
      const cover = stack.slice(hi + 1, lo).find((n) => !n.contains(stack[hi]) && ((parse(cs(n).backgroundColor)?.a || 0) > 0.85 || n.matches("img,video,canvas") || (/blur/.test(cs(n).backdropFilter) && (parse(cs(n).backgroundColor)?.a || 0) > 0.3)));
      if (!cover) { overlaps.push(`"${a.t}" / "${b.t}"`); continue; }
      // A big panel over text is a stacked layer (a mockup, a sheet). A small
      // control over text is text running underneath a button: a collision.
      const cr = cover.getBoundingClientRect();
      const ctl = cover.closest("button,a,[role=button],input,select,label") || (cr.width * cr.height < 40000 ? cover : null);
      if (ctl) overlaps.push(`"${(stack[lo] === a.e || a.e.contains(stack[lo]) ? a : b).t}" runs underneath "${label(ctl, 20)}"`);
    }
    scrollTo({ top: y0, behavior: "instant" });
    // Buttons and tabs whose short label broke onto two lines.
    const wrapped = [];
    for (const b of document.querySelectorAll("button,[role=button],[role=tab],a[class*=btn],a[class*=button],.btn,.button,nav a,header a")) {
      if (b.closest("table,[role=table],[role=grid]")) continue;
      const t = (b.textContent || "").replace(/\s+/g, " ").trim();
      if (!t || t.length > 28 || t.split(" ").length < 2 || !isVisible(b) || opacityOf(b) < 0.1) continue;
      // A run of text that breaks inside itself. Stacked runs (name over count) are deliberate.
      const tw = document.createTreeWalker(b, NodeFilter.SHOW_TEXT);
      while (tw.nextNode()) {
        const node = tw.currentNode, raw = node.textContent;
        if (raw.trim().split(/\s+/).length < 2) continue;
        const rg = document.createRange();
        rg.setStart(node, raw.search(/\S/)); rg.setEnd(node, raw.trimEnd().length);
        const fs = parseFloat(cs(node.parentElement).fontSize);
        const tops = [...rg.getClientRects()].filter((r) => r.width > 2 && r.height > 4).map((r) => r.top).sort((x, y) => x - y);
        if (tops.length > 1 && tops[tops.length - 1] - tops[0] > fs * 0.6) { wrapped.push(`"${raw.trim().slice(0, 24)}"`); break; }
      }
    }
    if (wrapped.length) (innerWidth <= 360 ? warns : fails).push(`Control label wraps onto two lines: ${[...new Set(wrapped)].slice(0, 4).join("; ")}. Give it room or shorten it${innerWidth <= 360 ? " (at 320px a tidy two-line wrap is acceptable; running off the screen is not)" : ""}.`);
    if (clipped.length) fails.push(`Text clipped: ${[...new Set(clipped)].slice(0, 4).join("; ")}`);
    if (overlaps.length) fails.push(`Text overlapping text: ${[...new Set(overlaps)].slice(0, 4).join("; ")}`);
    if (offscreen.length) fails.push(`Text running off the viewport: ${[...new Set(offscreen)].slice(0, 3).join("; ")}`);
    const share = hidden.length / Math.max(1, texts.length);
    const msg = `${hidden.length} text elements invisible after scrolling the whole page (${hidden.slice(0, 3).join("; ")}).`;
    if (hidden.length > 2 && share > 0.3) fails.push(`${msg} A reveal that never fired hides the content. Content must be visible by default and animate only as an enhancement.`);
    else if (hidden.length > 2) warns.push(`${msg} A scroll reveal that did not fire, or a timed demo still running? If it is a reveal, make content visible by default.`);
    return { fails, warns, count: texts.length };
  }

  // ===================================================== OS font emulation
  // What the page's font stacks resolve to on another OS, drawn with
  // metric-compatible stand-ins so line breaks and widths match.
  const PROFILES = {
    windows: {
      generic: { "system-ui": "Segoe UI", "sans-serif": "Arial", serif: "Times New Roman", monospace: "Consolas", cursive: "Comic Sans MS", fantasy: "Impact", emoji: "Segoe UI Emoji", math: "Cambria Math" },
      unsupported: ["-apple-system", "blinkmacsystemfont", "ui-sans-serif", "ui-serif", "ui-monospace", "ui-rounded"],
      installed: ["Segoe UI", "Segoe UI Variable", "Segoe UI Variable Text", "Segoe UI Variable Display", "Arial", "Arial Black", "Bahnschrift", "Calibri", "Cambria", "Candara", "Comic Sans MS", "Consolas", "Constantia", "Corbel", "Courier New", "Franklin Gothic Medium", "Gabriola", "Georgia", "Impact", "Lucida Console", "Lucida Sans Unicode", "Microsoft Sans Serif", "Palatino Linotype", "Segoe Print", "Segoe Script", "Segoe UI Emoji", "Segoe UI Symbol", "Sitka", "Sylfaen", "Tahoma", "Times New Roman", "Trebuchet MS", "Verdana", "Cascadia Code", "Cascadia Mono"],
      aliases: {},
    },
    linux: { // Ubuntu with GNOME; Fedora swaps Ubuntu for Cantarell and DejaVu for Noto.
      generic: { "system-ui": "Ubuntu", "sans-serif": "DejaVu Sans", serif: "DejaVu Serif", monospace: "DejaVu Sans Mono", cursive: "DejaVu Sans", fantasy: "DejaVu Sans", emoji: "Noto Color Emoji" },
      unsupported: ["-apple-system", "blinkmacsystemfont", "ui-sans-serif", "ui-serif", "ui-monospace", "ui-rounded"],
      installed: ["DejaVu Sans", "DejaVu Serif", "DejaVu Sans Mono", "Liberation Sans", "Liberation Serif", "Liberation Mono", "Ubuntu", "Ubuntu Mono", "Noto Sans", "Noto Serif", "Noto Color Emoji", "Cantarell"],
      aliases: { arial: "Liberation Sans", helvetica: "Liberation Sans", "helvetica neue": "Liberation Sans", "times new roman": "Liberation Serif", times: "Liberation Serif", "courier new": "Liberation Mono", courier: "Liberation Mono", calibri: "Carlito", verdana: "DejaVu Sans" },
    },
    android: {
      generic: { "system-ui": "Roboto", "sans-serif": "Roboto", serif: "Noto Serif", monospace: "Droid Sans Mono", cursive: "Roboto", fantasy: "Roboto", emoji: "Noto Color Emoji" },
      unsupported: ["-apple-system", "blinkmacsystemfont", "ui-sans-serif", "ui-serif", "ui-monospace", "ui-rounded"],
      installed: ["Roboto", "Noto Serif", "Noto Sans", "Droid Sans Mono", "Noto Color Emoji"],
      aliases: { arial: "Roboto", helvetica: "Roboto", "helvetica neue": "Roboto", "times new roman": "Noto Serif", times: "Noto Serif", "courier new": "Droid Sans Mono", georgia: "Noto Serif" },
    },
    mac: {
      generic: { "system-ui": "SF Pro", "-apple-system": "SF Pro", blinkmacsystemfont: "SF Pro", "ui-sans-serif": "SF Pro", "ui-monospace": "SF Mono", "ui-serif": "New York", "ui-rounded": "SF Pro Rounded", "sans-serif": "Helvetica", serif: "Times", monospace: "Menlo", emoji: "Apple Color Emoji" },
      unsupported: [],
      installed: ["SF Pro", "SF Mono", "New York", "Helvetica", "Helvetica Neue", "Arial", "Times", "Times New Roman", "Georgia", "Verdana", "Tahoma", "Trebuchet MS", "Courier New", "Courier", "Menlo", "Monaco", "Avenir", "Avenir Next", "Futura", "Gill Sans", "Optima", "Palatino", "Baskerville", "Didot", "American Typewriter", "Impact", "Comic Sans MS", "Apple Color Emoji", "SFMono-Regular"],
      aliases: { sfmono: "SF Mono", "sfmono-regular": "SF Mono" },
    },
  };

  // stand-ins: target font -> [file stem, size-adjust]. Fonts the host has natively are used as-is.
  const STAND = {
    "Segoe UI": ["selawik", 1], "Segoe UI Variable": ["selawik", 1], "Segoe UI Variable Text": ["selawik", 1], "Segoe UI Variable Display": ["selawik", 1],
    Arial: ["arimo", 1], "Liberation Sans": ["arimo", 1], Helvetica: ["arimo", 1], "Helvetica Neue": ["arimo", 1],
    "Times New Roman": ["tinos", 1], "Liberation Serif": ["tinos", 1], Times: ["tinos", 1], "DejaVu Serif": ["tinos", 1.1], "Noto Serif": ["tinos", 1.04], Georgia: ["tinos", 1.07], Cambria: ["tinos", 1.02], "New York": ["tinos", 1.05],
    "Courier New": ["cousine", 1], "Liberation Mono": ["cousine", 1], Courier: ["cousine", 1], "Droid Sans Mono": ["cousine", 1],
    Consolas: ["inconsolata", 1.1], "Cascadia Code": ["inconsolata", 1.2], "Cascadia Mono": ["inconsolata", 1.2], "Lucida Console": ["cousine", 1],
    Calibri: ["carlito", 1], Carlito: ["carlito", 1], Candara: ["carlito", 1.02], Corbel: ["carlito", 1.02],
    "DejaVu Sans": ["dejavu-sans", 1], Verdana: ["dejavu-sans", 1.0], Tahoma: ["dejavu-sans", 0.93], "Microsoft Sans Serif": ["arimo", 1], "Trebuchet MS": ["arimo", 1.0], Bahnschrift: ["arimo", 0.95],
    "DejaVu Sans Mono": ["dejavu-mono", 1], Menlo: ["dejavu-mono", 1], "SF Mono": ["dejavu-mono", 1], Monaco: ["dejavu-mono", 1.02],
    Ubuntu: ["ubuntu", 1], Cantarell: ["cantarell", 1], "Noto Sans": ["dejavu-sans", 0.94],
    Roboto: ["arimo", 0.98], "SF Pro": ["arimo", 0.98], "SF Pro Rounded": ["arimo", 0.98],
  };

  function installStandIns(base) {
    if (document.getElementById("__wd-fonts")) return;
    const files = {
      selawik: [["300", "selawik-300.woff2"], ["400", "selawik-400.woff2"], ["600", "selawik-600.woff2"], ["700", "selawik-700.woff2"]],
    };
    const css = [];
    const stems = new Set(Object.values(STAND).map(([s]) => s));
    const adjusts = new Map();
    for (const [, [stem, adj]] of Object.entries(STAND)) adjusts.set(`${stem}|${adj}`, [stem, adj]);
    for (const [k, [stem, adj]] of adjusts) {
      const name = `WD ${stem} ${adj}`;
      const list = files[stem] || [["400", `${stem}-400-latin.woff2`], ["700", `${stem}-700-latin.woff2`]];
      for (const [w, f] of list) {
        const ext = stem === "selawik" ? [] : [`${stem}-${w}-latin-ext.woff2`];
        css.push(`@font-face{font-family:"${name}";font-weight:${w};src:url("${base}/${f}") format("woff2");size-adjust:${adj * 100}%;font-display:block;unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}`);
        for (const x of ext) css.push(`@font-face{font-family:"${name}";font-weight:${w};src:url("${base}/${x}") format("woff2");size-adjust:${adj * 100}%;font-display:block;unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF}`);
      }
    }
    const st = document.createElement("style"); st.id = "__wd-fonts"; st.textContent = css.join("\n");
    document.head.appendChild(st);
    void stems;
  }

  const splitFamilies = (ff) => ff.match(/("[^"]*"|'[^']*'|[^,]+)/g)?.map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean) || [];

  // Returns how text changed: elements whose line count grew, or that now overflow.
  async function emulateFonts(profile, base) {
    const P = PROFILES[profile];
    if (!P) return { error: "unknown profile " + profile };
    installStandIns(base);
    const loaded = new Set();
    for (const f of document.fonts) if (f.status === "loaded" && !/^WD /.test(f.family)) loaded.add(f.family.replace(/["']/g, "").toLowerCase());
    const texts = textElements();
    const lines = (e) => { const rg = document.createRange(); rg.selectNodeContents(e); return new Set([...rg.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top))).size; };
    const before = texts.map((e) => ({ e, lines: lines(e), w: e.scrollWidth, cw: e.clientWidth }));
    const resolved = new Map(), targets = new Map(), report = new Map();
    for (const el of [document.documentElement, ...document.querySelectorAll("body, body *")]) {
      if (el.closest?.("svg")) continue;
      const ff = cs(el).fontFamily;
      if (!resolved.has(ff)) {
        let target = null, keep = false;
        for (const f of splitFamilies(ff)) {
          const k = f.toLowerCase();
          if (loaded.has(k) || /^wd /.test(k)) { keep = true; break; } // a web font, or inherited from an element already emulated
          if (P.unsupported.includes(k)) continue;
          if (P.generic[k]) { target = P.generic[k]; break; }
          if (P.aliases[k]) { target = P.aliases[k]; break; }
          const inst = P.installed.find((x) => x.toLowerCase() === k);
          if (inst) { target = inst; break; }
        }
        if (!keep && !target) target = P.generic.serif;
        let value = null;
        if (!keep) {
          const s = STAND[target];
          value = s ? `"WD ${s[0]} ${s[1]}"` : `"${target}", "WD ${STAND[P.generic["sans-serif"]][0]} 1"`;
        }
        resolved.set(ff, value); targets.set(ff, target);
      }
      const v = resolved.get(ff);
      if (v) {
        el.style.setProperty("font-family", v, "important"); csCache.delete(el);
        const t = ownText(el);
        const key = splitFamilies(ff).slice(0, 3).join(", ");
        if (t && !report.has(key)) report.set(key, `${targets.get(ff)} (e.g. "${t.slice(0, 24)}")`);
      }
    }
    // Faces start loading only once layout asks for them: force layout, then
    // wait until nothing is loading (font-display: block hides text meanwhile).
    void document.body.offsetHeight;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    for (let i = 0; i < 60 && [...document.fonts].some((f) => f.status === "loading"); i++) await new Promise((r) => setTimeout(r, 50));
    await document.fonts.ready;
    const grew = [], overflow = [];
    for (const b of before) {
      csCache.delete(b.e);
      const n = lines(b.e);
      if (n > b.lines) grew.push(`"${ownText(b.e).slice(0, 28)}" ${b.lines}→${n} lines`);
      if (b.e.scrollWidth > b.e.clientWidth + 1 && b.w <= b.cw + 1 && cs(b.e).overflowX !== "visible") overflow.push(`"${ownText(b.e).slice(0, 28)}"`);
    }
    return { stacks: Object.fromEntries(report), grew, overflow };
  }

  // Pseudo-localisation: about 35% longer text with accents, like German or
  // Finnish against English. Numbers, URLs and code are left alone.
  function pseudoLocalize() {
    const map = { a: "á", e: "é", i: "í", o: "ö", u: "ü", A: "Á", E: "É", O: "Ö", U: "Ü", c: "ç", n: "ñ" };
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentElement.closest("script,style,code,pre,kbd,svg,[data-wd-ignore]") || !n.textContent.trim() ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const n of nodes) {
      n.textContent = n.textContent.replace(/[A-Za-z]{2,}/g, (w) => {
        const acc = w.replace(/[aeiouAEOUcn]/g, (ch) => map[ch] || ch);
        const extra = Math.ceil(w.length * 0.35);
        return acc + acc.slice(0, extra).toLowerCase();
      });
    }
    for (const b of document.querySelectorAll("[placeholder]")) b.setAttribute("placeholder", b.getAttribute("placeholder") + " ëxtënded");
    return nodes.length;
  }

  // Forced colours (Windows High Contrast): controls whose only boundary
  // was a background colour vanish.
  function forcedColorsCheck() {
    const out = [];
    for (const b of document.querySelectorAll("button,a[href],[role=button],input,select,textarea,[role=switch],[role=checkbox],[role=tab]")) {
      if (!isVisible(b)) continue;
      const c = getComputedStyle(b), r = b.getBoundingClientRect();
      const looksLikeControl = b.matches("button,input,select,textarea,[role=switch],[role=checkbox]") || (r.height >= 28 && r.width >= 60 && b.matches("a,[role=button]") && !b.closest("p,li,nav"));
      if (!looksLikeControl || b.matches("input[type=checkbox],input[type=radio],input[type=range]")) continue;
      const border = ["Top", "Right", "Bottom", "Left"].some((s) => parseFloat(c[`border${s}Width`]) > 0 && c[`border${s}Style`] !== "none");
      const outline = c.outlineStyle !== "none" && parseFloat(c.outlineWidth) > 0;
      if (!border && !outline && !b.textContent.trim() && !b.querySelector("svg,img")) out.push(`"${label(b, 20)}"`);
      else if (!border && !outline && b.matches("button,[role=button],input,select,textarea")) out.push(`"${label(b, 20)}"`);
    }
    return out;
  }

  // Animations still running for someone who asked for reduced motion.
  function motionCheck() {
    const moving = [];
    for (const a of document.getAnimations()) {
      const t = a.effect?.getComputedTiming?.();
      const kf = a.effect?.getKeyframes?.() || [];
      const props = new Set(kf.flatMap((k) => Object.keys(k)).filter((k) => !["offset", "easing", "composite", "computedOffset"].includes(k)));
      const onlyOpacity = [...props].every((p) => /opacity|color|background/.test(p));
      if (a.playState === "running" && (t?.duration > 0) && !onlyOpacity) moving.push(`${a.animationName || [...props].join("+")} on <${a.effect?.target?.tagName?.toLowerCase() || "?"}>`);
    }
    return [...new Set(moving)];
  }

  // Scroll-linked colour (text that darkens as you reach it) reads as invisible
  // from the top of the page. Re-measure each failure where a reader meets it.
  async function recheckContrast() {
    const still = [], px_ = [], y0 = scrollY;
    for (const { e, need, px, t } of (window.__wdLow || []).slice(0, 40)) {
      e.scrollIntoView({ block: "center", behavior: "instant" });
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      await new Promise((r) => setTimeout(r, 160));
      // Only text that is really on top at its own position counts: an
      // invisible duplicate under the visible headline is not what people read.
      const tn = [...e.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
      if (tn) {
        const rg = document.createRange(); rg.selectNodeContents(tn);
        const lr = [...rg.getClientRects()].find((q) => q.width > 1);
        if (lr) {
          const top = document.elementsFromPoint(lr.left + Math.min(lr.width / 2, 30), lr.top + lr.height / 2).find((n) => ownText(n) || n.matches("img,video,canvas,svg"));
          if (top && top !== e && !e.contains(top) && !top.contains(e)) continue;
        }
      }
      const c = getComputedStyle(e), fg = parse(c.color);
      if (!fg) continue;
      if (overMedia(e)) { const i = 1000 + px_.length; e.setAttribute("data-wd-px", i); px_.push({ i, t, fg, need }); continue; }
      const bg = groundOf(e);
      if (!bg) continue;
      const ratio = contrast(blend({ ...fg, a: fg.a * opacityOf(e) }, bg), bg);
      if (ratio < need) still.push(`${ratio.toFixed(2)}:1 ${px}px "${t}"`);
    }
    scrollTo({ top: y0, behavior: "instant" });
    return { still, px: px_, total: (window.__wdLow || []).length };
  }

  // Is there a real action (not navigation) in the first viewport?
  function firstScreenAction() {
    const cands = [...document.querySelectorAll("a[href],button,input[type=submit],[role=button]")].filter((b) => {
      if (!isVisible(b) || b.closest("header,nav,footer,[role=navigation],[role=banner],dialog,[aria-hidden=true]")) return false;
      const r = b.getBoundingClientRect(), c = cs(b);
      const styled = (parse(c.backgroundColor)?.a || 0) > 0.5 || parseFloat(c.borderTopWidth) > 0 || b.matches("button,input");
      return styled && r.height >= 32 && r.width >= 60 && r.top >= 0 && r.bottom <= innerHeight;
    });
    return cands.map((b) => label(b, 24));
  }

  // The elements that stick out past the right edge: the deepest ones, named.
  function overflowCulprits() {
    const vw = document.documentElement.clientWidth;
    const out = [...document.body.querySelectorAll("*")].filter((e) => {
      const r = e.getBoundingClientRect();
      if (r.right <= vw + 1 || r.width < 1) return false;
      const c = cs(e);
      if (c.position === "fixed") return false;
      // clipped by an ancestor that does not let it widen the page
      for (let n = e.parentElement; n && n !== document.body; n = n.parentElement) {
        const nc = cs(n);
        if (nc.overflowX !== "visible") return false;
      }
      return true;
    });
    const deepest = out.filter((e) => !out.some((o) => o !== e && e.contains(o)));
    const name = (e) => {
      const cls = typeof e.className === "string" && e.className.trim() ? "." + e.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
      const r = e.getBoundingClientRect();
      const t = (e.textContent || "").replace(/\s+/g, " ").trim().slice(0, 24);
      return `<${e.tagName.toLowerCase()}${e.id ? "#" + e.id : ""}${cls}> ${Math.round(r.width)}px wide, right edge at ${Math.round(r.right)}${t ? ` "${t}"` : ""}`;
    };
    return deepest.slice(0, 3).map(name);
  }

  // Every visible text element's box, so High Contrast can be compared against normal colours.
  function textBoxes() {
    return textElements().map((e, i) => {
      e.setAttribute("data-wd-tb", i);
      const r = e.getBoundingClientRect();
      return { i, w: r.width, h: r.height, t: ownText(e).slice(0, 24) };
    });
  }
  function compareTextBoxes(before) {
    const broke = [];
    for (const b of before) {
      const e = document.querySelector(`[data-wd-tb="${b.i}"]`);
      if (!e) continue;
      csCache.delete(e);
      const r = e.getBoundingClientRect();
      const vis = isVisible(e);
      if (!vis && b.w * b.h > 40) broke.push(`"${b.t}" disappears`);
      else if (b.w > 20 && (r.width < b.w * 0.5 || r.height > b.h * 2.2)) broke.push(`"${b.t}" ${Math.round(b.w)}→${Math.round(r.width)}px wide`);
    }
    return broke;
  }

  window.__wd = { firstScreenAction, overflowCulprits, textBoxes, compareTextBoxes, recheckContrast, scan, defects, emulateFonts, pseudoLocalize, forcedColorsCheck, motionCheck, parse, contrast };
})();
