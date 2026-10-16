//! Shared pieces for every shot: time on threes, math, text, photo plates, filters and the
//! film look (scanlines, halftone screen, vignette, grain).
//!
//! Shots draw in a 720x1280 design space ("ref px", the size of the reel this look was
//! measured on); the root group scales it by 1.5 to the 1080x1920 output.
use fframes::{FFramesContext, FontQuery, Frame, Shader, ShaderUniforms, Svgr};
use std::sync::LazyLock;

pub const W: f32 = 720.0;
pub const H: f32 = 1280.0;
pub const CX: f32 = 360.0;
pub const CY: f32 = 640.0;

pub const SERIF: &str = "Instrument Serif";
pub const SCRIPT: &str = "Homemade Apple";
pub const SANS: &str = "Roboto";

// ── time ────────────────────────────────────────────────────────────────────────────────

/// Time inside a shot, quantized to the reference's 10 fps ("on threes").
#[derive(Debug, Clone, Copy)]
pub struct T {
    /// Ticks since the shot started (0, 1, 2, ...). One tick = 0.1 s = 3 frames.
    pub tick: i32,
    /// `tick / 10`: seconds since the shot started, on the 10 fps grid.
    pub t: f32,
    /// Global tick (10 per second from the start of the video).
    pub gtick: i32,
    /// Global seconds on the 10 fps grid (`gtick / 10`).
    pub g: f32,
    /// Shot length in ticks.
    pub len: i32,
    /// Unquantized seconds since the shot started, for the rare thing that moves on ones.
    pub smooth: f32,
    /// Global frame index (30 fps).
    pub frame: usize,
}

impl T {
    pub fn new(global_frame: usize, k0: i32, k1: i32) -> Self {
        let gtick = ((global_frame + 1) / 3) as i32;
        let tick = gtick - k0;
        let start = crate::tick_frame(k0) as f32;
        Self {
            tick,
            t: tick as f32 / 10.0,
            gtick,
            g: gtick as f32 / 10.0,
            len: k1 - k0,
            smooth: (global_frame as f32 - start) / 30.0,
            frame: global_frame,
        }
    }
    /// Progress 0..1 through the shot, on the tick grid (0 at the first tick, 1 at the last).
    pub fn p(&self) -> f32 {
        if self.len <= 1 { 1.0 } else { self.tick as f32 / (self.len - 1) as f32 }
    }
}

// ── math ────────────────────────────────────────────────────────────────────────────────

pub fn clamp01(x: f32) -> f32 {
    x.clamp(0.0, 1.0)
}
/// 0 before `a`, 1 after `b`, linear between.
pub fn seg(t: f32, a: f32, b: f32) -> f32 {
    clamp01((t - a) / (b - a))
}
pub fn lerp(a: f32, b: f32, t: f32) -> f32 {
    a + (b - a) * t
}
pub fn ease_out(t: f32) -> f32 {
    1.0 - (1.0 - clamp01(t)).powi(3)
}
pub fn ease_in(t: f32) -> f32 {
    clamp01(t).powi(3)
}
pub fn ease_in_out(t: f32) -> f32 {
    let t = clamp01(t);
    if t < 0.5 { 4.0 * t * t * t } else { 1.0 - (-2.0 * t + 2.0).powi(3) / 2.0 }
}
pub fn expo_out(t: f32) -> f32 {
    let t = clamp01(t);
    if t >= 1.0 { 1.0 } else { 1.0 - 2f32.powf(-10.0 * t) }
}
/// Piecewise-linear lookup through `(time, value)` keys (clamped at both ends). Handy for
/// matching values measured tick by tick on the reference.
pub fn keys(t: f32, k: &[(f32, f32)]) -> f32 {
    if t <= k[0].0 {
        return k[0].1;
    }
    for w in k.windows(2) {
        if t <= w[1].0 {
            return lerp(w[0].1, w[1].1, seg(t, w[0].0, w[1].0));
        }
    }
    k[k.len() - 1].1
}
/// Deterministic pseudo-random in 0..1 (SplitMix64 over salt and index).
pub fn rnd(i: u32, salt: u32) -> f32 {
    let mut z = (((salt as u64) << 32) | i as u64).wrapping_add(0x9E37_79B9_7F4A_7C15);
    z = (z ^ (z >> 30)).wrapping_mul(0xBF58_476D_1CE4_E5B9);
    z = (z ^ (z >> 27)).wrapping_mul(0x94D0_49BB_1331_11EB);
    z ^= z >> 31;
    (z >> 40) as f32 / (1u64 << 24) as f32
}
/// SVG transform that scales by `s` around `(cx, cy)`.
pub fn scale_about(cx: f32, cy: f32, s: f32) -> String {
    format!("translate({:.3} {:.3}) scale({:.5})", cx * (1.0 - s), cy * (1.0 - s), s)
}

// ── text ────────────────────────────────────────────────────────────────────────────────

/// `text_width` needs a string that outlives the render; typed prefixes are per-frame
/// locals, so intern them (one leak per distinct string, a bounded set).
pub fn intern(s: &str) -> &'static str {
    static SET: LazyLock<std::sync::Mutex<std::collections::HashSet<&'static str>>> = LazyLock::new(Default::default);
    let mut set = SET.lock().unwrap();
    if let Some(found) = set.get(s) {
        return found;
    }
    let leaked: &'static str = Box::leak(s.to_string().into_boxed_str());
    set.insert(leaked);
    leaked
}

/// Advance width of `s` in ref px.
pub fn text_w(frame: &mut Frame, ctx: &FFramesContext<'_, '_>, family: &'static str, weight: u16, size: usize, s: &str) -> f32 {
    frame
        .text_width(ctx, FontQuery { family, size, weight, ..Default::default() }, intern(s))
        .map(|w| w as f32)
        .unwrap_or(s.chars().count() as f32 * size as f32 * 0.5)
}

/// The first `n` characters of `s`.
pub fn prefix(s: &str, n: usize) -> String {
    s.chars().take(n).collect()
}

/// A serif caption in Instrument Serif (measured: the reference's caption proportions match it
/// to 2%). The reference strokes read heavier, so glyphs get a hairline stroke of their own
/// colour (`bold`, ref px; 0 = none). `filter` is an id from `defs()`: `"cap"` = white with a
/// soft dark halo, `"ink"` = dark text on a light ground, `""` = none. `anchor` is `start`,
/// `middle` or `end`.
#[allow(clippy::too_many_arguments)]
pub fn serif<'a>(x: f32, y: f32, size: f32, bold: f32, fill: &'a str, anchor: &'a str, filter: &str, s: String) -> Svgr<'a> {
    let f = if filter.is_empty() { String::new() } else { format!("url(#{filter})") };
    fframes::svgr!(<text x={x} y={y} font-family={SERIF} font-size={size} fill={fill} stroke={fill}
        stroke-width={bold} stroke-linejoin="round" text-anchor={anchor} filter={f}>{s}</text>)
}

/// `serif` with letter-spacing in em (the reference tracks some captions wider than the font).
#[allow(clippy::too_many_arguments)]
pub fn serif_ls<'a>(x: f32, y: f32, size: f32, bold: f32, track: f32, fill: &'a str, anchor: &'a str, filter: &str, s: String) -> Svgr<'a> {
    let f = if filter.is_empty() { String::new() } else { format!("url(#{filter})") };
    let ls = format!("{track}em");
    fframes::svgr!(<text x={x} y={y} font-family={SERIF} font-size={size} fill={fill} stroke={fill}
        stroke-width={bold} stroke-linejoin="round" letter-spacing={ls} text-anchor={anchor} filter={f}>{s}</text>)
}

// ── plates ──────────────────────────────────────────────────────────────────────────────

/// A photo plate from the runtime `assets/` folder, with its pixel size.
pub struct Plate {
    pub href: std::sync::Arc<fframes::usvgr::PreloadedImageData>,
    pub w: f32,
    pub h: f32,
}

pub fn plate(ctx: &FFramesContext<'_, '_>, name: &str) -> Option<Plate> {
    ctx.get_image(name).map(|i| Plate { href: i.href(), w: i.metadata.width as f32, h: i.metadata.height as f32 })
}

/// Draw `name` scaled by `s` (ref px per image px) with image point `(ix, iy)` at screen
/// point `(sx, sy)`. Missing plates draw a magenta box so they show up in review.
pub fn place<'a>(ctx: &FFramesContext<'a, '_>, name: &str, ix: f32, iy: f32, sx: f32, sy: f32, s: f32) -> Svgr<'a> {
    match plate(ctx, name) {
        Some(p) => {
            let (w, h) = (p.w * s, p.h * s);
            let (x, y) = (sx - ix * s, sy - iy * s);
            fframes::svgr!(<image href={p.href} x={x} y={y} width={w} height={h} preserveAspectRatio="none" />)
        }
        None => fframes::svgr!(<rect x="0" y="0" width="720" height="1280" fill="#ff00ff" />),
    }
}

/// Full-frame flat colour.
pub fn fill<'a>(color: &'a str) -> Svgr<'a> {
    fframes::svgr!(<rect x="-40" y="-40" width="800" height="1360" fill={color} />)
}

// ── filters ─────────────────────────────────────────────────────────────────────────────

/// Filters every shot can reference. Blur sizes are in ref px (they scale with the root).
pub fn defs<'a>() -> Svgr<'a> {
    fframes::svgr!(<defs>
        // white caption: soft dark halo, a warm/cool colour fringe either side (the
        // reference's chromatic aberration), a faint bloom, then the glyphs
        <filter id="cap" x="-25%" y="-80%" width="150%" height="260%" color-interpolation-filters="sRGB">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2.6" result="halo" />
            <feComponentTransfer in="halo" result="shade">
                <feFuncA type="linear" slope="0.75" />
            </feComponentTransfer>
            <feOffset in="SourceAlpha" dx="1.3" dy="0" result="ra" />
            <feFlood flood-color="#ff8a3d" flood-opacity="0.85" result="warm" />
            <feComposite in="warm" in2="ra" operator="in" result="fringer" />
            <feOffset in="SourceAlpha" dx="-1.3" dy="0" result="ba" />
            <feFlood flood-color="#6fa8ff" flood-opacity="0.7" result="cool" />
            <feComposite in="cool" in2="ba" operator="in" result="fringeb" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.4" result="bloom" />
            <feMerge>
                <feMergeNode in="shade" />
                <feMergeNode in="fringer" />
                <feMergeNode in="fringeb" />
                <feMergeNode in="bloom" />
                <feMergeNode in="SourceGraphic" />
            </feMerge>
        </filter>
        // dark text on a light ground: slightly soft, with the same warm/cool fringe
        <filter id="ink" x="-10%" y="-40%" width="120%" height="180%" color-interpolation-filters="sRGB">
            <feOffset in="SourceAlpha" dx="1.2" dy="0" result="ra" />
            <feFlood flood-color="#b0582a" flood-opacity="0.55" result="warm" />
            <feComposite in="warm" in2="ra" operator="in" result="fringer" />
            <feOffset in="SourceAlpha" dx="-1.0" dy="0" result="ba" />
            <feFlood flood-color="#3d5a8a" flood-opacity="0.35" result="cool" />
            <feComposite in="cool" in2="ba" operator="in" result="fringeb" />
            <feMerge result="inked">
                <feMergeNode in="fringer" />
                <feMergeNode in="fringeb" />
                <feMergeNode in="SourceGraphic" />
            </feMerge>
            <feGaussianBlur in="inked" stdDeviation="0.45" />
        </filter>
        <filter id="b1" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1" /></filter>
        <filter id="b2" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2" /></filter>
        <filter id="b4" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4" /></filter>
        <filter id="b8" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="8" /></filter>
        <filter id="b16" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="16" /></filter>
        // horizontal motion blur for whip slides
        <filter id="hb6" x="-30%" y="-5%" width="160%" height="110%"><feGaussianBlur stdDeviation="6 0" /></filter>
        <filter id="hb14" x="-40%" y="-5%" width="180%" height="110%"><feGaussianBlur stdDeviation="14 0" /></filter>
        <filter id="vb6" x="-5%" y="-30%" width="110%" height="160%"><feGaussianBlur stdDeviation="0 6" /></filter>
    </defs>)
}

// ── film look ───────────────────────────────────────────────────────────────────────────

pub(crate) static LOOK: LazyLock<Shader> = LazyLock::new(|| Shader::sksl(include_str!("shaders/look.sksl")));
static GRAIN: LazyLock<Shader> = LazyLock::new(|| Shader::sksl(include_str!("shaders/grain.sksl")));

/// The film look, from the spec's `[look]` table (defaults measured on the reference reel).
#[derive(Debug, Clone, Copy)]
pub struct Look {
    /// Scanline depth (multiply, 0..1) and period in ref px.
    pub scan: f32,
    pub scan_period: f32,
    /// Halftone screen depth and period in ref px (square grid at 30 degrees).
    pub dots: f32,
    pub dot_period: f32,
    pub vignette: f32,
    /// Overlay grain strength (a new pattern every tick).
    pub grain: f32,
}

impl Look {
    pub fn from(p: crate::spec::P) -> Self {
        Self {
            scan: p.f("scan", 0.16),
            scan_period: p.f("scan_period", 5.38),
            dots: p.f("dots", 0.10),
            dot_period: p.f("dot_period", 6.0),
            vignette: p.f("vignette", 0.12),
            grain: p.f("grain", 0.10),
        }
    }
}

/// Multiply layer: scanlines, the halftone screen and a light vignette, drawn at output
/// resolution. `dots` and `vignette` scale the look's values for the current shot (the flat
/// grey and paper cards of the reference show neither).
pub fn look_layer<'a>(frame: &Frame, look: &Look, dots: f32, vignette: f32) -> Svgr<'a> {
    let layer = LOOK.draw(
        frame,
        ShaderUniforms::new()
            .float("uScanDepth", look.scan)
            .float("uScanPeriod", look.scan_period * crate::UP)
            .float("uDotDepth", look.dots * dots)
            .float("uDotPeriod", look.dot_period * crate::UP)
            .float("uVignette", look.vignette * vignette),
    );
    fframes::svgr!(<image href={layer.href()} x="0" y="0" width="1080" height="1920" />)
}

/// Animated grain (changes every tick), composited with overlay.
pub fn grain_layer<'a>(frame: &Frame, look: &Look) -> Svgr<'a> {
    let layer = GRAIN.draw(frame, ShaderUniforms::new().float("uStrength", look.grain).float("uSize", 1.5));
    fframes::svgr!(<image href={layer.href()} x="0" y="0" width="1080" height="1920" />)
}
