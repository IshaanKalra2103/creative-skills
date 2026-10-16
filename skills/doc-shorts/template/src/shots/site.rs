//! site: the call to action. A dark, out-of-focus landing page (brand bar, two-line headline,
//! kicker, body copy, two pill buttons, a phone mockup playing a screen recording, a feature
//! panel, round buttons) slides in from the right and settles; a sharp translucent search pill
//! glides in with it and types the query, then the caret blinks. Page offset, pill edge and
//! caret are measured per tick on the reference. Params: references/shots.md#site.
use crate::kit::{self, T};
use crate::spec::P;
use fframes::{FFramesContext, Frame, Svgr};

/// Page x offset per tick (green button's left edge minus its final 20 px).
const PAGE_DX: [f32; 18] = [600.0, 210.0, 136.0, 94.0, 66.0, 48.0, 34.0, 28.0, 20.0, 14.0, 12.0, 8.0, 4.0, 2.0, 0.0, 0.0, 0.0, 0.0];
/// Pill left edge per tick (none on the first).
const PILL_X: [f32; 18] = [
    900.0, 510.0, 388.0, 320.0, 273.0, 241.0, 219.0, 201.0, 187.0, 176.0, 167.0, 161.0, 155.0, 151.0, 146.0, 144.0, 142.0, 140.0,
];
const PILL_W: f32 = 441.0;
const PILL_Y: f32 = 590.0;
const PILL_H: f32 = 72.0;
const TEXT_SIZE: f32 = 35.0;

pub fn look(_p: P) -> (f32, f32) {
    (1.0, 1.0)
}

/// Google Drive triangle and Gmail M, as seen inside the reference phone's screen recording.
fn drive<'a>(x: f32, y: f32, s: f32, rot: f32) -> Svgr<'a> {
    let t = format!("translate({x:.1} {y:.1}) rotate({rot:.1}) scale({s:.3})");
    fframes::svgr!(<g transform={t}>
        <path d="M -10 -16 L 10 -16 L 24 8 L 14 24 Z" fill="#fbbc04" />
        <path d="M -10 -16 L -24 8 L -14 24 L 4 -6 Z" fill="#0f9d58" />
        <path d="M -14 24 L 14 24 L 24 8 L -4 8 Z" fill="#4285f4" />
    </g>)
}

fn gmail<'a>(x: f32, y: f32, s: f32, rot: f32) -> Svgr<'a> {
    let t = format!("translate({x:.1} {y:.1}) rotate({rot:.1}) scale({s:.3})");
    fframes::svgr!(<g transform={t}>
        <path d="M -24 -16 L -24 18 L -14 18 L -14 -4 Z" fill="#4285f4" />
        <path d="M 24 -16 L 24 18 L 14 18 L 14 -4 Z" fill="#34a853" />
        <path d="M -24 -16 L 0 2 L 24 -16 L 24 -6 L 0 12 L -24 -6 Z" fill="#ea4335" />
        <path d="M 14 -8 L 24 -16 L 24 -4 Z" fill="#fbbc04" />
    </g>)
}

/// A neutral app tile (rounded square in a colour) for `phone = "tiles"`.
fn tile<'a>(x: f32, y: f32, s: f32, rot: f32, color: &'a str) -> Svgr<'a> {
    let t = format!("translate({x:.1} {y:.1}) rotate({rot:.1}) scale({s:.3})");
    fframes::svgr!(<g transform={t}><rect x="-22" y="-22" width="44" height="44" rx="11" fill={color} /></g>)
}

/// Text in Roboto, squeezed or stretched to `w` when given (the page is blurred, so only the
/// line's extent and weight need to match), else its natural width capped at `max_w`.
#[allow(clippy::too_many_arguments)]
fn fit<'a>(frame: &mut Frame, ctx: &FFramesContext<'a, '_>, s: &str, weight: u16, size: f32, x: f32, base: f32, w: Option<f32>, max_w: f32, fill: &'a str) -> Svgr<'a> {
    let s = kit::intern(s);
    let adv = kit::text_w(frame, ctx, kit::SANS, weight, size as usize, s).max(1.0);
    let target = w.unwrap_or(adv.min(max_w));
    let t = format!("translate({x:.1} {base:.1}) scale({:.4} 1)", target / adv);
    // the page's type is heavier than Roboto Bold: thicken it with a stroke of its own colour
    let sw = if weight >= 700 { size * 0.06 } else { size * 0.03 };
    fframes::svgr!(<text transform={t} x="0" y="0" font-family={kit::SANS} font-weight={weight} font-size={size} fill={fill}
        stroke={fill} stroke-width={sw} stroke-linejoin="round">{s}</text>)
}

/// i-th element of a numeric list param, if present.
fn nth(v: &[f32], i: usize) -> Option<f32> {
    v.get(i).copied()
}

fn page<'a>(p: P<'a>, i: usize, frame: &mut Frame, ctx: &FFramesContext<'a, '_>) -> Svgr<'a> {
    let accent = p.s("accent", "#2e8b3a");
    let accent2 = p.s("accent2", "#a85e22");
    let accent_ink = p.s("accent_ink", "#a6d8ab");
    let accent2_ink = p.s("accent2_ink", "#e8b080");
    let tiles = p.strs("tile_colors");
    let tc = |k: usize| -> &'a str { if tiles.is_empty() { ["#5b8def", "#e0b23c", "#d9534f", "#43a36b"][k % 4] } else { tiles[k % tiles.len()] } };
    // the phone's screen recording changes as it plays
    let apps: Svgr<'a> = if p.s("phone", "tiles") == "google" {
        match i {
            0..=2 => fframes::svgr!(<circle cx="185" cy="985" r="26" fill="#9fc6d8" opacity="0.8" />),
            3 => fframes::svgr!(<g>{drive(130.0, 870.0, 0.8, 0.0)}{drive(215.0, 905.0, 0.9, 12.0)}{gmail(150.0, 1055.0, 1.2, -8.0)}{gmail(280.0, 1030.0, 1.3, 6.0)}</g>),
            4..=5 => fframes::svgr!(<g>{drive(85.0, 1095.0, 2.0, -18.0)}{drive(210.0, 900.0, 1.4, 0.0)}{gmail(265.0, 1000.0, 1.4, 4.0)}</g>),
            6..=8 => fframes::svgr!(<g>{drive(75.0, 880.0, 1.6, 0.0)}<rect x="40" y="980" width="320" height="6" fill="#7bbf9a" /></g>),
            _ => fframes::svgr!(<g>{gmail(330.0, 1200.0, 1.6, 0.0)}{drive(240.0, 1215.0, 1.0, 0.0)}<rect x="40" y="980" width="320" height="6" fill="#7bbf9a" /></g>),
        }
    } else {
        match i {
            0..=2 => fframes::svgr!(<circle cx="185" cy="985" r="26" fill={tc(0)} opacity="0.6" />),
            3 => fframes::svgr!(<g>{tile(130.0, 870.0, 0.8, 0.0, tc(0))}{tile(215.0, 905.0, 0.9, 12.0, tc(1))}{tile(150.0, 1055.0, 1.2, -8.0, tc(2))}{tile(280.0, 1030.0, 1.3, 6.0, tc(3))}</g>),
            4..=5 => fframes::svgr!(<g>{tile(85.0, 1095.0, 2.0, -18.0, tc(1))}{tile(210.0, 900.0, 1.4, 0.0, tc(0))}{tile(265.0, 1000.0, 1.4, 4.0, tc(2))}</g>),
            6..=8 => fframes::svgr!(<g>{tile(75.0, 880.0, 1.6, 0.0, tc(0))}<rect x="40" y="980" width="320" height="6" fill={tc(3)} opacity="0.7" /></g>),
            _ => fframes::svgr!(<g>{tile(330.0, 1200.0, 1.6, 0.0, tc(2))}{tile(240.0, 1215.0, 1.0, 0.0, tc(1))}<rect x="40" y="980" width="320" height="6" fill={tc(3)} opacity="0.7" /></g>),
        }
    };
    let head = p.strs("headline");
    let head = if head.is_empty() { vec!["Your headline goes", "right here"] } else { head };
    let head_w = p.fs("headline_w");
    let body = p.strs("body");
    let body_w = p.fs("body_w");
    let mut copy: Vec<Svgr> = Vec::new();
    for (n, s) in body.iter().take(6).enumerate() {
        copy.push(fit(frame, ctx, s, 400, 19.0, 14.0, 269.0 + n as f32 * 32.8, nth(&body_w, n), 690.0, "#575757"));
    }
    let mut title: Vec<Svgr> = Vec::new();
    for (n, s) in head.iter().take(2).enumerate() {
        title.push(fit(frame, ctx, s, 700, 50.0, 14.0, 120.0 + n as f32 * 54.0, nth(&head_w, n), 690.0, "#d2d2d2"));
    }
    let buttons = p.strs("buttons");
    let bw = p.fs("buttons_w");
    let b0 = buttons.first().copied().unwrap_or("Get started");
    let b1 = buttons.get(1).copied().unwrap_or("Learn more");
    let feats = p.strs("features");
    let fw = p.fs("features_w");
    let mut panel: Vec<Svgr> = Vec::new();
    for (n, s) in feats.iter().take(3).enumerate() {
        let y = 725.0 + n as f32 * 65.0;
        panel.push(fframes::svgr!(<g>
            <circle cx="392" cy={y} r="7" fill={accent} />
            {fit(frame, ctx, s, 500, 18.0, 414.0, y + 6.0, nth(&fw, n), 300.0, "#6a6a6a")}
        </g>));
    }
    fframes::svgr!(<g filter="url(#site_soft)">
        <rect x="0" y="-20" width="760" height="1320" fill="#0b0c0b" />
        // brand bar
        {fit(frame, ctx, p.s("brand", "YOURBRAND"), 700, 26.0, 10.0, 26.0, p.has("brand_w").then(|| p.f("brand_w", 200.0)), 260.0, "#8c8c8c")}
        <rect x="545" y="2" width="44" height="28" rx="6" fill="#7a7a7a" />
        <rect x="598" y="4" width="70" height="24" rx="6" fill={p.s("chip", "#8a5a6a")} />
        <rect x="694" y="0" width="30" height="34" fill={accent} />
        // headline, two lines of big bold white
        {title}
        // kicker
        {fit(frame, ctx, p.s("kicker", ""), 700, 17.0, 14.0, 221.0, p.has("kicker_w").then(|| p.f("kicker_w", 332.0)), 600.0, accent)}
        {copy}
        // buttons
        <rect x="20" y="434" width="210" height="54" rx="27" fill={accent} />
        {fit(frame, ctx, b0, 500, 17.0, 60.0, 467.0, nth(&bw, 0), 150.0, accent_ink)}
        <rect x="250" y="434" width="218" height="54" rx="27" fill={accent2} />
        {fit(frame, ctx, b1, 500, 17.0, 292.0, 467.0, nth(&bw, 1), 150.0, accent2_ink)}
        // phone mockup with its screen recording
        <rect x="25" y="526" width="405" height="708" rx="22" fill="#b4b4b2" />
        {apps}
        // dark feature panel on the right
        <rect x="372" y="578" width="360" height="314" rx="6" fill="#121212" />
        {panel}
        // round buttons
        <circle cx="480" cy="1015" r="52" fill={accent} />
        <path d="M 462 1015 L 494 1015 M 482 1003 L 494 1015 L 482 1027" stroke={accent_ink} stroke-width="6" fill="none" />
        <circle cx="650" cy="1085" r="52" fill={accent} />
        <path d="M 634 1069 L 666 1101 M 666 1069 L 634 1101" stroke={accent_ink} stroke-width="6" fill="none" />
    </g>)
}

pub fn render<'a>(p: P<'a>, tm: &T, frame: &mut Frame, ctx: &FFramesContext<'a, '_>) -> Svgr<'a> {
    let i = tm.tick.max(0) as usize;
    let page_dx = PAGE_DX[i.min(PAGE_DX.len() - 1)];
    let px = PILL_X[i.min(PILL_X.len() - 1)];
    let query = p.s("query", "yourbrand.com");
    let n = query.chars().count();
    // typed characters per tick: `reveal`, else ~1.4 a tick from tick 1
    let rv = p.fs("reveal");
    let count = if !rv.is_empty() {
        rv[i.min(rv.len() - 1)] as usize
    } else if i == 0 {
        0
    } else {
        ((i as f32) * p.f("rate", 1.45)).round() as usize
    }
    .min(n);
    let typed = kit::prefix(query, count);
    // caret: `caret` per tick (1/0), else on while typing, then 2 on / 3 off
    let cv = p.fs("caret");
    let caret_on = if !cv.is_empty() {
        cv[i.min(cv.len() - 1)] > 0.5
    } else if i == 0 {
        false
    } else if count < n {
        true
    } else {
        let mut done = 1;
        while done < 400 && (if rv.is_empty() { ((done as f32) * p.f("rate", 1.45)).round() as usize } else { rv[done.min(rv.len() - 1)] as usize }) < n {
            done += 1;
        }
        (i - done.min(i)) % 5 < 2
    };
    let size = p.f("query_size", TEXT_SIZE);
    let mut adv = kit::text_w(frame, ctx, kit::SANS, 400, size as usize, &typed);
    // long queries shrink to stay inside the pill
    let room = PILL_W - 27.0 - 70.0;
    let full = kit::text_w(frame, ctx, kit::SANS, 400, size as usize, query);
    let size = if full > room { size * room / full } else { size };
    if full > room {
        adv *= room / full;
    }
    let tx = px + 27.0;
    let caret = if caret_on {
        fframes::svgr!(<rect x={tx + adv + 2.0} y="608" width="2.4" height="37" fill="#f0f0f0" />)
    } else {
        Svgr::empty()
    };
    let lens = format!("translate({:.1} 624)", px + PILL_W - 46.0);
    let pill = if i == 0 {
        Svgr::empty()
    } else {
        fframes::svgr!(<g>
            <rect x={px} y={PILL_Y} width={PILL_W} height={PILL_H} rx={PILL_H / 2.0} fill="#262626" fill-opacity="0.55"
                stroke="#1a1a1a" stroke-width="5" stroke-opacity="0.6" />
            <rect x={px} y={PILL_Y} width={PILL_W} height={PILL_H} rx={PILL_H / 2.0} fill="none" stroke="#e8e8e8" stroke-width="3" filter="url(#cap)" />
            <text x={tx} y="640" font-family={kit::SANS} font-size={size} fill="#ececec" letter-spacing="-0.01em" filter="url(#cap)">{typed}</text>
            {caret}
            <g transform={lens}>
                <circle cx="-3" cy="-3" r="11" fill="none" stroke="#f0f0f0" stroke-width="3" />
                <line x1="5" y1="5" x2="13" y2="13" stroke="#f0f0f0" stroke-width="3.4" stroke-linecap="round" />
            </g>
        </g>)
    };
    let page_t = format!("translate({page_dx:.1} 0)");
    fframes::svgr!(<g>
        <defs>
            // the page is out of focus: soft, a touch dim, glyph weight bleeding into a glow
            <filter id="site_soft" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">
                <feGaussianBlur in="SourceGraphic" stdDeviation={p.f("blur", 4.8)} result="soft" />
                <feComponentTransfer in="soft">
                    <feFuncR type="linear" slope="0.88" />
                    <feFuncG type="linear" slope="0.88" />
                    <feFuncB type="linear" slope="0.88" />
                </feComponentTransfer>
            </filter>
        </defs>
        {kit::fill("#050505")}
        <g transform={page_t}>{page(p, i, frame, ctx)}</g>
        {pill}
    </g>)
}
