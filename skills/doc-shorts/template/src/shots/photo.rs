//! photo: a photo plate with a camera move (whip, pull-out zoom, pan, slow push or exact
//! keyframes), an optional per-tick flipbook, and captions (name label, rising two-line
//! title, word-by-word or letter-by-letter line). Params: references/shots.md#photo.
//!
//! The camera is described in image space: image point `focus` (px) lands on screen point
//! `screen` (ref px) at `scale` ref px per image px, rotated by `rotate` degrees. The entry
//! moves are the reference's measured ease curves (remaining fraction per tick), stretched
//! to `enter_ticks`; `move = [[t, x, y, zoom, rot], ...]` replaces them with exact keys.
use crate::kit::{self, T};
use crate::spec::P;
use fframes::{FFramesContext, Frame, Svgr};

// ── house curves: remaining fraction per tick (1 at the start, 0 when settled) ─────────────

/// Whip slide (Larry/Sergey): 330 px in 7 ticks, most of it on the first tick.
pub const WHIP: [f32; 8] = [1.0, 0.55, 0.34, 0.214, 0.126, 0.067, 0.026, 0.0];
/// Pull-out zoom (Garage): 2x to 1x in 8 ticks.
pub const PULL: [f32; 9] = [1.0, 0.591, 0.364, 0.216, 0.119, 0.054, 0.017, 0.001, 0.0];
/// Slow drift (Board): a 108 px pan that settles over 11 ticks.
pub const DRIFT: [f32; 12] = [1.0, 0.61, 0.405, 0.28, 0.2, 0.135, 0.087, 0.056, 0.033, 0.013, 0.004, 0.0];
/// Rising title (Stanford): scale and baseline drop, 9 ticks.
pub const TITLE_SCALE: [f32; 10] = [1.0, 0.586, 0.386, 0.269, 0.178, 0.116, 0.076, 0.040, 0.022, 0.0];
pub const TITLE_RISE: [f32; 10] = [1.0, 0.444, 0.254, 0.158, 0.097, 0.060, 0.034, 0.018, 0.006, 0.0];

/// Remaining fraction of `curve` `k` ticks in, with the curve stretched over `ticks` ticks.
pub fn remain(curve: &[f32], k: f32, ticks: f32) -> f32 {
    if ticks <= 0.0 || k >= ticks {
        return 0.0;
    }
    if k <= 0.0 {
        return 1.0;
    }
    let u = k / ticks * (curve.len() - 1) as f32;
    let i = u.floor() as usize;
    let j = (i + 1).min(curve.len() - 1);
    kit::lerp(curve[i], curve[j], u - i as f32)
}

/// Values of keyframe rows `[t, v1, v2, ...]` at time `t` (linear between rows, held at the
/// ends). Columns a row leaves out take `defaults`.
pub fn key_at(rows: &[Vec<f32>], t: f32, defaults: &[f32]) -> Vec<f32> {
    let get = |r: &Vec<f32>, c: usize| r.get(c + 1).copied().unwrap_or(defaults[c]);
    let n = defaults.len();
    if rows.is_empty() {
        return defaults.to_vec();
    }
    if t <= rows[0][0] {
        return (0..n).map(|c| get(&rows[0], c)).collect();
    }
    for w in rows.windows(2) {
        if t <= w[1][0] {
            let u = kit::seg(t, w[0][0], w[1][0]);
            return (0..n).map(|c| kit::lerp(get(&w[0], c), get(&w[1], c), u)).collect();
        }
    }
    let last = rows.last().unwrap();
    (0..n).map(|c| get(last, c)).collect()
}

/// `[x, y]` from a 2-number param, else `d`.
pub fn pt(p: P, k: &str, d: (f32, f32)) -> (f32, f32) {
    let v = p.fs(k);
    if v.len() >= 2 { (v[0], v[1]) } else { d }
}

// ── camera ──────────────────────────────────────────────────────────────────────────────

/// Where the focus point sits on screen, the zoom multiplier and extra rotation at a tick.
#[derive(Debug, Clone, Copy)]
pub struct Cam {
    pub x: f32,
    pub y: f32,
    pub z: f32,
    pub r: f32,
}

/// The camera `tick` ticks into a shot of `len` ticks.
pub fn camera(p: P, tick: i32, len: i32) -> Cam {
    let (sx, sy) = pt(p, "screen", (360.0, 640.0));
    let t = tick as f32 / 10.0;
    let rows = p.rows("move");
    if !rows.is_empty() {
        let v = key_at(&rows, t, &[sx, sy, 1.0, 0.0]);
        return Cam { x: v[0], y: v[1], z: v[2], r: v[3] };
    }
    let k = tick as f32;
    let (mut x, mut y, mut z) = (sx, sy, 1.0);
    let enter = p.s("enter", "cut");
    let dist = p.f("enter_dist", 330.0);
    match enter {
        "whip_left" => x -= dist * remain(&WHIP, k, p.f("enter_ticks", 7.0)),
        "whip_right" => x += dist * remain(&WHIP, k, p.f("enter_ticks", 7.0)),
        "whip_up" => y -= dist * remain(&WHIP, k, p.f("enter_ticks", 7.0)),
        "whip_down" => y += dist * remain(&WHIP, k, p.f("enter_ticks", 7.0)),
        "pull" => z += (p.f("pull_from", 2.0) - 1.0) * remain(&PULL, k, p.f("enter_ticks", 8.0)),
        _ => {}
    }
    let (px, py) = pt(p, "pan", (0.0, 0.0));
    if px != 0.0 || py != 0.0 {
        let r = remain(&DRIFT, k - p.f("pan_at", 0.0) * 10.0, p.f("pan_ticks", 11.0));
        x -= px * r;
        y -= py * r;
    }
    let push = p.f("push", 0.03);
    let prog = if len <= 1 { 1.0 } else { tick as f32 / (len - 1) as f32 };
    z *= 1.0 + push * kit::clamp01(prog);
    Cam { x, y, z, r: 0.0 }
}

/// The plate for this tick: `frames[tick]` (held on the last) or `image`.
pub fn plate_name<'a>(p: P<'a>, tick: i32) -> &'a str {
    let frames = p.strs("frames");
    if !frames.is_empty() {
        return frames[(tick.max(0) as usize).min(frames.len() - 1)];
    }
    p.s("image", "")
}

/// Draw a plate with image point `(fx, fy)` at screen `(x, y)`, `s` ref px per image px,
/// rotated `rot` degrees about that point. Missing plates show magenta.
pub fn draw_plate<'a>(ctx: &FFramesContext<'a, '_>, name: &str, fx: f32, fy: f32, x: f32, y: f32, s: f32, rot: f32) -> Svgr<'a> {
    let Some(pl) = kit::plate(ctx, name) else {
        return fframes::svgr!(<rect x="-40" y="-40" width="800" height="1360" fill="#ff00ff" />);
    };
    let tf = format!("translate({x:.2} {y:.2}) rotate({rot:.3}) scale({s:.5}) translate({:.2} {:.2})", -fx, -fy);
    fframes::svgr!(<g transform={tf}>
        <image href={pl.href} x="0" y="0" width={pl.w} height={pl.h} preserveAspectRatio="none" />
    </g>)
}

/// Base scale: `scale` if given, else the cover scale of the first plate times `zoom`, made
/// big enough that a whip entry has `enter_dist` of picture to travel over on either side.
pub fn base_scale(p: P, ctx: &FFramesContext<'_, '_>) -> f32 {
    if p.has("scale") {
        return p.f("scale", 1.0);
    }
    let Some(pl) = kit::plate(ctx, plate_name(p, 0)) else { return 1.0 };
    let mut s = (kit::W / pl.w).max(kit::H / pl.h) * p.f("zoom", 1.0);
    let dist = p.f("enter_dist", 330.0);
    match p.s("enter", "cut") {
        "whip_left" | "whip_right" => s = s.max((kit::W + 2.0 * dist) / pl.w),
        "whip_up" | "whip_down" => s = s.max((kit::H + 2.0 * dist) / pl.h),
        _ => {}
    }
    s
}

/// Keep a plate covering the frame: clamp the focus point's screen position so no edge of
/// the image comes inside the 720x1280 frame (centred if the image is smaller).
pub fn clamp_cover(x: f32, y: f32, fx: f32, fy: f32, w: f32, h: f32, s: f32) -> (f32, f32) {
    let c = |v: f32, lo: f32, hi: f32| if lo > hi { (lo + hi) / 2.0 } else { v.clamp(lo, hi) };
    (c(x, kit::W - (w - fx) * s, fx * s), c(y, kit::H - (h - fy) * s, fy * s))
}

/// A Gaussian blur filter of `std` ref px (empty when 0), id-scoped to `id`.
pub fn blur_filter<'a>(id: &str, std: f32) -> (Svgr<'a>, String) {
    if std <= 0.0 {
        return (Svgr::empty(), String::new());
    }
    let id = id.to_string();
    let url = format!("url(#{id})");
    (
        fframes::svgr!(<defs><filter id={id} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation={std} />
        </filter></defs>),
        url,
    )
}

// ── captions ────────────────────────────────────────────────────────────────────────────

/// The reel's name caption: Instrument Serif widened 10% with a hairline stroke and +0.02em
/// tracking (its caption face is wider and heavier than the font). `x` = ink left edge.
pub fn name_caption<'a>(x: f32, baseline: f32, size: f32, color: &'a str, text: &str) -> Svgr<'a> {
    let k = size / 56.0;
    let tf = format!("translate({x:.2} {baseline:.2}) scale({:.5} {k:.5})", 1.1 * k);
    fframes::svgr!(<g transform={tf}>
        {kit::serif_ls(0.0, 0.0, 56.0, 0.5, 0.02, color, "start", "cap", text.to_string())}
    </g>)
}

/// Width of `name_caption` text at `size`.
pub fn name_width(frame: &mut Frame, ctx: &FFramesContext<'_, '_>, size: f32, text: &str) -> f32 {
    let n = text.chars().count().max(1) as f32;
    (kit::text_w(frame, ctx, kit::SERIF, 400, 56, text) + 0.02 * 56.0 * (n - 1.0)) * 1.1 * size / 56.0
}

/// Letters drawn one by one from left `x0`: letter i shows with `p = clamp(count - i, 0, 1)`,
/// popping from scale `smin`, dropped by `rise * size` and faint/soft until fully in.
#[allow(clippy::too_many_arguments)]
pub fn reveal_letters<'a>(
    frame: &mut Frame,
    ctx: &FFramesContext<'a, '_>,
    text: &str,
    count: f32,
    x0: f32,
    baseline: f32,
    size: f32,
    bold: f32,
    smin: f32,
    rise: f32,
    fill: &'a str,
    filter: &str,
) -> Svgr<'a> {
    let mut parts: Vec<Svgr> = Vec::new();
    for (i, ch) in text.chars().enumerate() {
        let pr = kit::clamp01(count - i as f32);
        if pr <= 0.0 || ch == ' ' {
            continue;
        }
        let before = kit::text_w(frame, ctx, kit::SERIF, 400, size as usize, &kit::prefix(text, i));
        let w = kit::text_w(frame, ctx, kit::SERIF, 400, size as usize, &ch.to_string());
        let x = x0 + before;
        let s = smin + (1.0 - smin) * pr;
        let drop = rise * size * (1.0 - pr);
        let pivot = (x + w * 0.5, baseline + (1.0 - pr) * size * 0.1);
        let soft = if pr < 1.0 { "url(#b1)" } else { "" };
        let place = format!("translate(0 {drop:.2}) {}", kit::scale_about(pivot.0, pivot.1, s));
        parts.push(fframes::svgr!(<g transform={place} opacity={0.45 + 0.55 * pr}>
            <g filter={soft}>{kit::serif(x, baseline, size, bold, fill, "start", filter, ch.to_string())}</g>
        </g>));
    }
    fframes::svgr!(<g>{parts}</g>)
}

/// The two-line rising title (Stanford style) centred at `cx`, main baseline at `base`.
fn title<'a>(cx: f32, base: f32, s: f32, size: f32, color: &'a str, main: &str, sub: &str) -> Svgr<'a> {
    let tf = format!("translate({cx:.2} {base:.2}) scale({s:.4})");
    let (sz2, gap) = (size * 42.0 / 62.0, size * 37.0 / 62.0);
    fframes::svgr!(<g>
        <defs>
            <filter id="photo_title_glow" x="-30%" y="-80%" width="160%" height="260%" color-interpolation-filters="sRGB">
                <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="wide" />
                <feComponentTransfer in="wide" result="widea"><feFuncA type="linear" slope="0.6" /></feComponentTransfer>
                <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="near" />
                <feMerge>
                    <feMergeNode in="widea" />
                    <feMergeNode in="near" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
        </defs>
        <g transform={tf} filter="url(#photo_title_glow)">
            <g transform="scale(1.2 1)">
                <text x="0" y="0" font-family={kit::SERIF} font-size={size} fill={color} stroke={color}
                    stroke-width={size * 1.2 / 62.0} letter-spacing="0.02em" text-anchor="middle">{main.to_string()}</text>
                <text x="0" y={gap} font-family={kit::SERIF} font-size={sz2} fill={color} stroke={color}
                    stroke-width={size * 0.8 / 62.0} letter-spacing="0.02em" text-anchor="middle">{sub.to_string()}</text>
            </g>
        </g>
    </g>)
}

/// One caption table (see references/shots.md#captions). `ride` offsets are how far the
/// camera's focus point is from where it ends up.
pub fn caption<'a>(c: P<'a>, tm: &T, frame: &mut Frame, ctx: &FFramesContext<'a, '_>, ride: (f32, f32)) -> Svgr<'a> {
    let text = c.s("text", "");
    if text.is_empty() {
        return Svgr::empty();
    }
    let at = c.f("at", 0.0);
    let k0 = (at * 10.0).round() as i32;
    if tm.tick < k0 {
        return Svgr::empty();
    }
    let style = c.s("style", "name");
    let color = c.s("color", if style == "title" { "#d3121e" } else { "#ebe7df" });
    let size = c.f("size", match style {
        "title" => 62.0,
        "plain" => 44.0,
        _ => 56.0,
    });
    let (rx, ry) = match c.s("ride", "none") {
        "x" => (ride.0, 0.0),
        "xy" | "true" => ride,
        "y" => (0.0, ride.1),
        _ => (0.0, 0.0),
    };
    let local = tm.tick - k0;
    let t = tm.t;

    if style == "title" {
        let (cx, base) = (c.f("cx", 360.0), c.f("y", 695.0));
        let rk = c.f("rise_ticks", 9.0);
        let dflt = [
            cx,
            base + c.f("rise_dist", 653.0) * remain(&TITLE_RISE, local as f32, rk),
            1.0 + (c.f("rise_scale", 2.18) - 1.0) * remain(&TITLE_SCALE, local as f32, rk),
        ];
        let v = key_at(&c.rows("keys"), t, &dflt);
        let v = if c.rows("keys").is_empty() { dflt.to_vec() } else { v };
        return title(v[0] + rx, v[1] + ry, v[2], size, color, text, c.s("sub", ""));
    }

    // what is shown so far
    let reveal = c.s("reveal", "all");
    let step = c.f("step", 0.2);
    let words: Vec<&str> = text.split(' ').collect();
    let shown: String = match reveal {
        "words" => {
            let ticks = c.fs("word_ticks");
            let n = if ticks.is_empty() {
                ((local as f32 / (step * 10.0)).floor() as usize + 1).min(words.len())
            } else {
                ticks.iter().filter(|&&w| w as i32 <= tm.tick).count()
            };
            words[..n].join(" ")
        }
        _ => text.to_string(),
    };
    if shown.is_empty() {
        return Svgr::empty();
    }
    // the caption's first visible tick can be drawn faint (the reel fades "small" in)
    let first = match (reveal, c.fs("word_ticks").first()) {
        ("words", Some(w)) => *w as i32,
        _ => k0,
    };
    let fade = if tm.tick == first { c.f("fade_in", if reveal == "words" { 0.55 } else { 1.0 }) } else { 1.0 };

    // position: explicit left x, or centred on cx; keys [t, x, y, scale, opacity] override
    let full_w = if style == "name" { name_width(frame, ctx, size, text) } else { kit::text_w(frame, ctx, kit::SERIF, 400, size as usize, text) };
    let x_default = if c.has("x") { c.f("x", 0.0) } else { c.f("cx", 360.0) - full_w / 2.0 };
    let rows = c.rows("keys");
    let v = key_at(&rows, t, &[x_default, c.f("y", 734.5), 1.0, fade]);
    let (x, y, sc, op) = (v[0] + rx, v[1] + ry, v[2], if rows.is_empty() { fade } else { v[3] });
    let size = size * sc;

    let body = match (style, reveal) {
        ("plain", "letters") => {
            let counts = c.fs("counts");
            let count = if counts.is_empty() {
                (local as f32 + 1.0) * c.f("cps", 14.0) / 10.0
            } else {
                counts[(local.max(0) as usize).min(counts.len() - 1)]
            };
            reveal_letters(frame, ctx, text, count, x, y, size, c.f("bold", 0.2), c.f("smin", 0.5), c.f("rise", 0.35), color, c.s("filter", "cap"))
        }
        ("plain", _) => kit::serif(x, y, size, c.f("bold", 0.2), color, "start", c.s("filter", "cap"), shown),
        _ => name_caption(x, y, size, color, &shown),
    };
    fframes::svgr!(<g opacity={op}>{body}</g>)
}

/// All captions of a shot: `caption = {..}` and/or `captions = [{..}, ..]`.
pub fn captions<'a>(p: P<'a>, tm: &T, frame: &mut Frame, ctx: &FFramesContext<'a, '_>, ride: (f32, f32)) -> Svgr<'a> {
    let mut list: Vec<P<'a>> = Vec::new();
    if p.has("caption") {
        list.push(p.sub("caption"));
    }
    list.extend(p.list("captions"));
    let out: Vec<Svgr> = list.into_iter().map(|c| caption(c, tm, frame, ctx, ride)).collect();
    fframes::svgr!(<g>{out}</g>)
}

// ── the shot ────────────────────────────────────────────────────────────────────────────

pub fn render<'a>(p: P<'a>, tm: &T, frame: &mut Frame, ctx: &FFramesContext<'a, '_>) -> Svgr<'a> {
    let cam = camera(p, tm.tick, tm.len);
    let end = camera(p, tm.len - 1, tm.len);
    let name = plate_name(p, tm.tick);
    let (fx, fy) = match pt(p, "focus", (f32::NAN, f32::NAN)) {
        (x, _) if x.is_nan() => kit::plate(ctx, name).map(|pl| (pl.w / 2.0, pl.h / 2.0)).unwrap_or((0.0, 0.0)),
        v => v,
    };
    let s = base_scale(p, ctx) * cam.z;
    let rot = p.f("rotate", 0.0) + cam.r;
    // unless the shot is keyframed or tilted, never let the frame see past the picture
    let (cx, cy) = match kit::plate(ctx, name) {
        Some(pl) if p.b("cover", true) && p.rows("move").is_empty() && rot == 0.0 => clamp_cover(cam.x, cam.y, fx, fy, pl.w, pl.h, s),
        _ => (cam.x, cam.y),
    };
    let blurs = p.fs("blur");
    let b = blurs.get(tm.tick.max(0) as usize).copied().unwrap_or(0.0);
    let (bdef, burl) = blur_filter("photo_blur", b);
    let caps = captions(p, tm, frame, ctx, (cam.x - end.x, cam.y - end.y));
    fframes::svgr!(<g>
        {kit::fill(p.s("bg", "#000000"))}
        {bdef}
        <g filter={burl}>{draw_plate(ctx, name, fx, fy, cx, cy, s, rot)}</g>
        {caps}
    </g>)
}

pub fn look(_p: P) -> (f32, f32) {
    (1.0, 1.0)
}
