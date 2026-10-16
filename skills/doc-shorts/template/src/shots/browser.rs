//! browser: a landscape background with a retro (XP-era) browser window holding a spinning
//! wireframe globe or an image. The camera pulls back from an extreme close-up (the window
//! rises faster than the background zooms: parallax); a condensed caps title builds up word
//! by word above the window; on the last tick the whole picture squashes vertically onto
//! black (CRT-off). Without `image`, a procedural sky and hill stand in for the photo.
//!
//! Every per-tick table was measured on the reference (the background by fitting the hill
//! crest to the reference horizon, the window by the globe's box, the title by its line
//! boxes). The background table is stored relative to its rest placement, so any image or
//! rest rect gets the same pull-back. Params: references/shots.md#browser.
use crate::kit::{self, T};
use crate::spec::P;
use fframes::{FFramesContext, Frame, Svgr};

/// Background placement per tick on the reference (x, y, w, h in ref px); the last entry is
/// the rest placement. Used relative to the rest: offsets in units of the rest size.
const BG: [(f32, f32, f32, f32); 10] = [
    (-1256.5, -3084.5, 3737.0, 4701.0),
    (-832.3, -2225.0, 2889.0, 3634.0),
    (-640.4, -1825.2, 2505.0, 3151.0),
    (-549.5, -1621.2, 2323.0, 2922.0),
    (-499.0, -1503.8, 2222.0, 2795.0),
    (-463.6, -1420.0, 2151.0, 2706.0),
    (-438.4, -1360.2, 2101.0, 2643.0),
    (-416.2, -1310.3, 2056.0, 2587.0),
    (-398.0, -1271.8, 2020.0, 2541.0),
    (-398.0, -1271.8, 2020.0, 2541.0),
];

/// Globe (diameter, centre y) per tick; the window is built around it.
const GLOBE: [(f32, f32); 10] = [
    (440.0, 1297.0),
    (360.0, 999.0),
    (306.0, 869.0),
    (272.0, 803.0),
    (244.0, 760.0),
    (228.0, 735.0),
    (216.0, 721.0),
    (206.0, 711.0),
    (200.0, 705.0),
    (200.0, 705.0),
];

/// Title (scale, top of the first line's caps) per tick; at scale 1 the caps top is y=410.
const CAPTION: [(f32, f32); 10] = [
    (1.83, 217.0),
    (1.83, 217.0),
    (1.48, 286.0),
    (1.345, 327.0),
    (1.224, 356.0),
    (1.135, 376.0),
    (1.075, 390.0),
    (1.028, 401.0),
    (1.0, 410.0),
    (1.0, 410.0),
];

/// Exposure ease over the first ticks (the reference's sky/grass ratio vs ours).
const GAIN: [f32; 10] = [1.05, 1.05, 1.18, 1.17, 1.12, 1.07, 1.04, 1.02, 1.0, 1.0];

/// Window width per globe diameter, and the globe centre's depth below the window top
/// (fraction of window width). Measured at ticks 14-19 of the reference.
const WIN_PER_GLOBE: f32 = 2.47;
const GLOBE_DEPTH: f32 = 0.3907;

/// Title line sizes and the line widths they are stretched to (measured: the reference's caps
/// are Instrument Serif widened to 281 and 273 ref px).
const LINE_SIZE: [f32; 2] = [50.0, 65.3];
const LINE_WIDTH: [f32; 2] = [281.0, 273.0];
const LINE_BASE: [f32; 2] = [445.0, 505.0];
const LINE_STROKE: [f32; 2] = [1.1, 1.3];
/// Opacity ramp of a word after it appears (line 1, line 2), one value per tick.
const RAMP: [&[f32]; 2] = [&[0.55, 1.0], &[0.35, 0.8, 1.0]];

pub fn render<'a>(p: P<'a>, tm: &T, frame: &mut Frame, ctx: &FFramesContext<'a, '_>) -> Svgr<'a> {
    let k = tm.tick.clamp(0, 9) as usize;

    // background: the image moved like the reference's pull-back, relative to its rest rect
    let rest = BG[9];
    let rel = |(x, y, w, h): (f32, f32, f32, f32)| ((x - rest.0) / rest.2, (y - rest.1) / rest.3, w / rest.2, h / rest.3);
    let (u, v, sx, sy) = rel(BG[k]);
    let image = p.opt("image");
    let plate = image.and_then(|name| kit::plate(ctx, name));
    let (rx, ry, rw, rh) = rest_rect(p, plate.as_ref().map(|pl| (pl.w, pl.h)));
    let (bx, by, bw, bh) = (rx + u * rw, ry + v * rh, sx * rw, sy * rh);
    let grade = p.s("grade", "none");
    let gain = GAIN[k];
    let bg = match (image, plate) {
        (Some(_), Some(pl)) => {
            let filter = if grade == "bliss" { "url(#browser_grade)" } else { "url(#browser_soft_bg)" };
            fframes::svgr!(<image href={pl.href} x={bx} y={by} width={bw} height={bh} preserveAspectRatio="none" filter={filter} />)
        }
        (Some(_), None) => kit::fill("#ff00ff"),
        (None, _) => landscape(bx, by, bw, bh),
    };

    let (d, gy) = GLOBE[k];
    let win_w = WIN_PER_GLOBE * d;
    let s = win_w / 1000.0;
    let (wx, wy) = (360.0 - win_w / 2.0, gy - GLOBE_DEPTH * win_w);
    let window = window(p, frame, ctx, tm.gtick, s, wx, wy);

    let lines = p.strs("title");
    let title = if tm.tick >= 1 && !lines.is_empty() { title(p, frame, ctx, tm.tick, CAPTION[k], &lines) } else { Svgr::empty() };

    let scene = fframes::svgr!(<g>
        {bg}
        {title}
        {window}
    </g>);
    // last tick: the picture collapses to half height (measured 0.97 x 0.5 about y=639)
    let squash = if p.b("squash", true) && tm.len >= 3 && tm.tick >= tm.len - 1 {
        "translate(360 639) scale(0.97 0.5) translate(-360 -639)"
    } else {
        ""
    };
    fframes::svgr!(<g>
        <defs>
            // grade fitted on the reference (sRGB affine): blue sky -> teal, punchier grass
            <filter id="browser_grade" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">
                <feColorMatrix type="matrix" values="-0.647 1.076 0.011 0 0.100  -0.782 1.347 0.155 0 0.157  -0.270 0.297 0.842 0 0.001  0 0 0 1 0" />
                <feComponentTransfer>
                    <feFuncR type="linear" slope={gain} />
                    <feFuncG type="linear" slope={gain} />
                    <feFuncB type="linear" slope={gain} />
                </feComponentTransfer>
                <feGaussianBlur stdDeviation="0.8" />
            </filter>
            <filter id="browser_soft_bg" x="0" y="0" width="1" height="1"><feGaussianBlur stdDeviation="0.8" /></filter>
            // the reel's window is a soft, re-photographed screen
            <filter id="browser_soft" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="1.6" /></filter>
            <clipPath id="browser_frame"><rect x="0" y="0" width="720" height="1280" /></clipPath>
            <linearGradient id="browser_titlebar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="#3d8bff" />
                <stop offset="0.12" stop-color="#0d61ea" />
                <stop offset="0.55" stop-color="#0a57e2" />
                <stop offset="1" stop-color="#0747c2" />
            </linearGradient>
        </defs>
        {kit::fill("#050505")}
        <g transform={squash}><g clip-path="url(#browser_frame)">{scene}</g></g>
    </g>)
}

/// Rest placement of the background (x, y, w, h in ref px): `bg_rect` if given, else the
/// image (or the procedural landscape, as 16:9) cover-fitted to the frame after stretching it
/// vertically by `stretch`, zoomed by `zoom`, with image point `focus` (0..1) at the centre.
fn rest_rect(p: P, size: Option<(f32, f32)>) -> (f32, f32, f32, f32) {
    let r = p.fs("bg_rect");
    if r.len() == 4 {
        return (r[0], r[1], r[2], r[3]);
    }
    let (iw, ih) = size.unwrap_or((1920.0, 1080.0));
    let stretch = p.f("stretch", 1.0);
    let zoom = p.f("zoom", 1.0);
    let ih = ih * stretch;
    let s = (720.0 / iw).max(1280.0 / ih) * zoom;
    let (w, h) = (iw * s, ih * s);
    let f = p.fs("focus");
    let (fx, fy) = if f.len() == 2 { (f[0], f[1]) } else { (0.5, 0.5) };
    let x = (360.0 - fx * w).clamp(720.0 - w, 0.0);
    let y = (640.0 - fy * h).clamp(1280.0 - h, 0.0);
    (x, y, w, h)
}

/// Procedural stand-in for the photo: teal sky with soft clouds over a rolling green hill with
/// grass texture, drawn in a 1000x1000 box stretched onto `(x, y, w, h)`. Colours are the
/// reference's graded Bliss (sky ~#6ba9a6 at the horizon, grass ~#4c9a2a).
fn landscape<'a>(x: f32, y: f32, w: f32, h: f32) -> Svgr<'a> {
    let tf = format!("translate({x:.2} {y:.2}) scale({:.5} {:.5})", w / 1000.0, h / 1000.0);
    fframes::svgr!(<g transform={tf}>
        <defs>
            <linearGradient id="browser_sky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="#2f8fb8" />
                <stop offset="0.45" stop-color="#5fa9b8" />
                <stop offset="0.62" stop-color="#9bcfc8" />
            </linearGradient>
            <linearGradient id="browser_hill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="#67b52e" />
                <stop offset="0.5" stop-color="#4a9a22" />
                <stop offset="1" stop-color="#2f7414" />
            </linearGradient>
            <filter id="browser_cloud" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="9" /></filter>
            <filter id="browser_grass" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">
                <feTurbulence type="fractalNoise" baseFrequency="0.035 0.16" numOctaves="3" seed="4" result="noise" />
                <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0.12  0 0 0 0 0.30  0 0 0 0 0.05  0 0 0 -0.9 0.55" result="tex" />
                <feComposite in="tex" in2="SourceGraphic" operator="in" result="mask" />
                <feMerge>
                    <feMergeNode in="SourceGraphic" />
                    <feMergeNode in="mask" />
                </feMerge>
            </filter>
        </defs>
        <rect x="0" y="0" width="1000" height="1000" fill="url(#browser_sky)" />
        <g filter="url(#browser_cloud)" fill="#ffffff" opacity="0.55">
            <ellipse cx="160" cy="210" rx="120" ry="34" />
            <ellipse cx="610" cy="140" rx="170" ry="40" />
            <ellipse cx="860" cy="300" rx="110" ry="30" />
            <ellipse cx="380" cy="360" rx="90" ry="22" />
        </g>
        <path d="M0 640 C 180 470, 420 455, 620 560 C 760 630, 880 600, 1000 560 L 1000 1000 L 0 1000 Z" fill="url(#browser_hill)" filter="url(#browser_grass)" />
    </g>)
}

/// The title: up to two lines of serif caps stretched to fixed line widths, words fading in
/// one tick apart (line 2 fades as a group for its first word, like the reference).
fn title<'a>(p: P<'a>, frame: &mut Frame, ctx: &FFramesContext<'a, '_>, tick: i32, (sc, top): (f32, f32), lines: &[&'a str]) -> Svgr<'a> {
    let fill = p.s("title_color", "#ebe9df");
    let widths = p.fs("title_width");
    let stretches = p.fs("title_stretch");
    // a one-line title takes the big second-line style
    let slots: Vec<usize> = if lines.len() == 1 { vec![1] } else { vec![0, 1] };
    let mut word_index = 0;
    let mut out = Vec::new();
    for (li, line) in lines.iter().take(2).enumerate() {
        let slot = slots[li];
        let size = LINE_SIZE[slot];
        let base = LINE_BASE[slot];
        let upper = line.to_uppercase();
        let natural = kit::text_w(frame, ctx, kit::SERIF, 400, 100, &upper) * size / 100.0;
        let target = widths.get(slot).copied().unwrap_or(LINE_WIDTH[slot]);
        let stretch = stretches.get(li).copied().unwrap_or((target / natural.max(1.0)).clamp(0.7, 1.45));
        let tf = format!("translate(360 {base}) scale({stretch} 1) translate(-360 -{base})");
        let words: Vec<&str> = upper.split_whitespace().collect();
        let ramp = RAMP[slot];
        let alpha = |w: usize| -> f32 {
            // word w (0-based over the whole title) appears at tick 1 + w
            let since = tick - 1 - w as i32;
            if since < 0 {
                0.0
            } else if w == 0 {
                1.0
            } else {
                ramp.get(since as usize).copied().unwrap_or(1.0)
            }
        };
        let first = word_index;
        let line_alpha = if li == 0 { 1.0 } else { alpha(first) };
        let spans: Vec<Svgr> = words
            .iter()
            .enumerate()
            .map(|(wi, w)| {
                let a = if li == 0 || wi > 0 { alpha(first + wi) } else { 1.0 };
                let a = if li == 0 && wi == 0 { alpha(first) } else { a };
                let text = if wi + 1 < words.len() { format!("{w} ") } else { w.to_string() };
                fframes::svgr!(<tspan fill-opacity={a} stroke-opacity={a}>{text}</tspan>)
            })
            .collect();
        word_index += words.len();
        let stroke = LINE_STROKE[slot];
        out.push(fframes::svgr!(<g transform={tf} opacity={line_alpha}>
            <text x="360" y={base} font-family={kit::SERIF} font-size={size} fill={fill} stroke={fill}
                stroke-width={stroke} stroke-linejoin="round" text-anchor="middle" filter="url(#cap)">{spans}</text>
        </g>));
    }
    let group = format!("translate(360 {top}) scale({sc}) translate(-360 -410)");
    let blur = if tick == 1 { "url(#b1)" } else { "" };
    fframes::svgr!(<g transform={group} filter={blur}>{out}</g>)
}

/// An XP-era browser window, drawn in 1000 x 711 local units and placed with its top-left at
/// (x, y) scaled by `s`. The page shows the spinning globe or `content_image`.
#[allow(clippy::too_many_arguments)]
fn window<'a>(p: P<'a>, frame: &Frame, ctx: &FFramesContext<'a, '_>, gtick: i32, s: f32, x: f32, y: f32) -> Svgr<'a> {
    let tf = format!("translate({x:.2} {y:.2}) scale({s:.5})");
    let win_title = p.s("window_title", "Microsoft Internet Explorer").to_string();
    let content = match p.opt("content_image").and_then(|n| kit::plate(ctx, n)) {
        Some(pl) => fframes::svgr!(<image href={pl.href} x="6" y="95" width="988" height="577" preserveAspectRatio="xMidYMid slice" />),
        None => {
            let n = p.f("meridians", 10.0);
            super::globe_grid::wire_globe(
                frame,
                500.0,
                1000.0 * GLOBE_DEPTH,
                1000.0 / WIN_PER_GLOBE,
                super::globe_grid::spin(gtick, n),
                p.s("globe_color", "#3462c9"),
                0.17,
                gtick as f32,
                n,
            )
        }
    };
    let menu: Vec<Svgr> = [("File", 18.0), ("Edit", 63.0), ("View", 103.0), ("Favorites", 154.0), ("Tools", 228.0), ("Help", 281.0)]
        .iter()
        .map(|(label, mx)| fframes::svgr!(<text x={*mx} y="54" font-family={kit::SANS} font-size="13" fill="#3a3a3a">{label.to_string()}</text>))
        .collect();
    fframes::svgr!(<g transform={tf} filter="url(#browser_soft)">
        // frame and title bar
        <rect x="0" y="0" width="1000" height="711" rx="8" fill="#0c4fd8" />
        <rect x="0" y="0" width="1000" height="36" rx="8" fill="url(#browser_titlebar)" />
        <circle cx="20" cy="18" r="8.5" fill="#5aa6f0" stroke="#e8f2ff" stroke-width="2" />
        <text x="36" y="24" font-family={kit::SANS} font-size="15" font-weight="700" fill="#ffffff">{win_title}</text>
        <rect x="964" y="7" width="27" height="23" rx="3" fill="#e05a2c" stroke="#ffffff" stroke-width="1.2" />
        <path d="M971 13 L984 25 M984 13 L971 25" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" />
        // menu bar, address bar
        <rect x="5" y="36" width="990" height="666" fill="#ece9d8" />
        {menu}
        <rect x="958" y="40" width="9" height="8" fill="#e8462a" />
        <rect x="968" y="40" width="9" height="8" fill="#5bb73a" />
        <rect x="958" y="49" width="9" height="8" fill="#2c6be0" />
        <rect x="968" y="49" width="9" height="8" fill="#f4c42a" />
        <line x1="5" y1="62" x2="995" y2="62" stroke="#cbc6b2" stroke-width="1.5" />
        <text x="18" y="83" font-family={kit::SANS} font-size="12.5" fill="#8a8a8a">"Address"</text>
        <circle cx="86" cy="78" r="6" fill="#3c86e6" />
        <path d="M829 75 L835 81 L841 75" fill="none" stroke="#4a4a4a" stroke-width="2" />
        <rect x="852" y="68" width="20" height="20" rx="2" fill="#4aa63a" />
        <path d="M857 78 L867 78 M863 73 L868 78 L863 83" fill="none" stroke="#ffffff" stroke-width="2" />
        <text x="878" y="84" font-family={kit::SANS} font-size="13" fill="#3a3a3a">"Go"</text>
        <text x="925" y="84" font-family={kit::SANS} font-size="12.5" fill="#6a6a6a">"Links"</text>
        // page
        <rect x="6" y="95" width="988" height="577" fill="#dbdbdb" stroke="#9fb0c4" stroke-width="1" />
        {content}
        // status bar
        <rect x="5" y="673" width="990" height="30" fill="#ece9d8" />
        <circle cx="18" cy="688" r="5" fill="#3c86e6" />
        <text x="30" y="693" font-family={kit::SANS} font-size="12" fill="#4a4a4a">"Done"</text>
    </g>)
}

pub fn look(_p: P) -> (f32, f32) {
    (1.0, 1.0)
}
