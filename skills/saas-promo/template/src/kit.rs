//! The shared look and motion of every scene: scene time, easing, the palette and look from
//! the spec, the backdrop shader with its named framings, glass type (words that blur in as
//! frosted glass and settle to solid), highlight boxes, a fake 3D camera for flat layers,
//! blur groups, the cursor and the letterbox.
//!
//! Scenes draw in a 1280x720 design space; the video scales it to the 1920x1080 output.
use crate::spec::P;
use fframes::{Color, FFramesContext, FontQuery, Frame, Shader, ShaderUniforms, Svgr};
use std::sync::{LazyLock, OnceLock};
use toml::Table;

pub const W: f32 = 1280.0;
pub const H: f32 = 720.0;

// ── scene time ───────────────────────────────────────────────────────────────────────────

/// Time inside a scene, in seconds.
#[derive(Debug, Clone, Copy)]
pub struct T {
    /// Seconds since the scene started.
    pub t: f32,
    /// Scene length in seconds.
    pub len: f32,
    /// Seconds since the film started.
    pub g: f32,
    /// Animation speed factor from `[look] pace` (0.8 = everything 20 % snappier).
    pub pace: f32,
}

impl T {
    /// Entry clock: animation seconds since the scene started (entrances are authored on it).
    pub fn e(&self) -> f32 {
        self.t / self.pace
    }
    /// Exit clock: animation seconds left until the cut (exits are authored on it, so a
    /// longer scene only holds longer).
    pub fn x(&self) -> f32 {
        (self.len - self.t) / self.pace
    }
    /// Progress through the scene, 0..1.
    pub fn p(&self) -> f32 {
        clamp01(self.t / self.len.max(1e-3))
    }
}

// ── easing ───────────────────────────────────────────────────────────────────────────────

pub fn clamp01(x: f32) -> f32 {
    x.clamp(0.0, 1.0)
}
/// 0 before `a`, 1 after `b`, linear between.
pub fn seg(t: f32, a: f32, b: f32) -> f32 {
    if b <= a { if t >= b { 1.0 } else { 0.0 } } else { clamp01((t - a) / (b - a)) }
}
pub fn lerp(a: f32, b: f32, t: f32) -> f32 {
    a + (b - a) * t
}
pub fn smooth(t: f32) -> f32 {
    let t = clamp01(t);
    t * t * (3.0 - 2.0 * t)
}
pub fn ease_out(t: f32) -> f32 {
    1.0 - (1.0 - clamp01(t)).powi(3)
}
pub fn ease_out_quint(t: f32) -> f32 {
    1.0 - (1.0 - clamp01(t)).powi(5)
}
pub fn ease_out_expo(t: f32) -> f32 {
    let t = clamp01(t);
    if t >= 1.0 { 1.0 } else { 1.0 - 2f32.powf(-10.0 * t) }
}
pub fn ease_in(t: f32) -> f32 {
    clamp01(t).powi(3)
}
pub fn ease_in_out(t: f32) -> f32 {
    let t = clamp01(t);
    if t < 0.5 { 4.0 * t * t * t } else { 1.0 - (-2.0 * t + 2.0).powi(3) / 2.0 }
}
/// Keyframes `(t, v)` with an easing inside each segment.
pub fn keys(t: f32, k: &[(f32, f32)], ease: fn(f32) -> f32) -> f32 {
    if k.is_empty() {
        return 0.0;
    }
    if t <= k[0].0 {
        return k[0].1;
    }
    for w in k.windows(2) {
        if t <= w[1].0 {
            return lerp(w[0].1, w[1].1, ease(seg(t, w[0].0, w[1].0)));
        }
    }
    k[k.len() - 1].1
}
/// Keyframes of N values `(t, [v; N])`, linear.
pub fn track<const N: usize>(t: f32, k: &[(f32, [f32; N])]) -> [f32; N] {
    if t <= k[0].0 {
        return k[0].1;
    }
    for w in k.windows(2) {
        if t <= w[1].0 {
            let u = seg(t, w[0].0, w[1].0);
            let mut out = [0f32; N];
            for i in 0..N {
                out[i] = lerp(w[0].1[i], w[1].1[i], u);
            }
            return out;
        }
    }
    k[k.len() - 1].1
}
/// Deterministic hash in 0..1 (SplitMix64).
pub fn rnd(i: u64, salt: u64) -> f32 {
    let mut z = (salt << 32 | i).wrapping_add(0x9E3779B97F4A7C15);
    z = (z ^ (z >> 30)).wrapping_mul(0xBF58476D1CE4E5B9);
    z = (z ^ (z >> 27)).wrapping_mul(0x94D049BB133111EB);
    z ^= z >> 31;
    (z >> 40) as f32 / (1u64 << 24) as f32
}

// ── strings and text ─────────────────────────────────────────────────────────────────────

/// `text_width` and scene names need strings that outlive the render; intern them once
/// (one leak per distinct string).
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

/// Advance width of `s` in px (measured at 10x for sub-pixel accuracy).
pub fn text_w(frame: &mut Frame, ctx: &FFramesContext, family: &str, size: f32, weight: u16, s: &str) -> f32 {
    let family = intern(family);
    let w = frame
        .text_width(ctx, FontQuery { family, size: (size * 10.0).round() as usize, weight, ..Default::default() }, intern(s))
        .unwrap_or(0);
    w as f32 / 10.0
}

// ── palette and look (from the spec) ─────────────────────────────────────────────────────

/// Colours of the film. `[palette] preset = "..."` picks a base, every key overrides it.
#[derive(Debug, Clone)]
pub struct Palette {
    /// Backdrop: light core, cyan ring, periwinkle body, deep top, navy edge, edge glow.
    pub bg: [[f32; 3]; 6],
    /// Type on the backdrop.
    pub text: &'static str,
    /// Highlight box tint, its resting alpha and the flash colour it pops in with.
    pub highlight: &'static str,
    pub highlight_alpha: f32,
    pub flash: &'static str,
    /// Buttons, caret, send arrow, "Submitted".
    pub accent: &'static str,
    /// Frosted surfaces (pills, tiles, the prompt box rim).
    pub frost: &'static str,
    /// UI panels and UI text.
    pub panel: &'static str,
    pub ink: &'static str,
}

pub fn hex3(s: &str) -> [f32; 3] {
    let s = s.trim_start_matches('#');
    let v = u32::from_str_radix(s, 16).unwrap_or(0xffffff);
    [((v >> 16) & 255) as f32 / 255.0, ((v >> 8) & 255) as f32 / 255.0, (v & 255) as f32 / 255.0]
}

pub fn color(s: &str) -> Color {
    let [r, g, b] = hex3(s);
    Color::rgb((r * 255.0) as u8, (g * 255.0) as u8, (b * 255.0) as u8)
}

/// Built-in palettes: (name, [white, cyan, peri, deep, navy, glow], text, highlight, flash,
/// accent, frost). "blue" is the fitted reference.
pub const PALETTES: &[(&str, [&str; 6], [&str; 5])] = &[
    ("blue", ["#cce3f3", "#11aaeb", "#216bf5", "#0606e5", "#010056", "#b7cfff"], ["#ffffff", "#c8d4ff", "#a5e8ff", "#1e90ff", "#dfe6ff"]),
    ("ember", ["#ffe9d6", "#ff9a3c", "#ff4f6d", "#5a0fd6", "#1a0533", "#ffc9a8"], ["#ffffff", "#ffd2b8", "#ffe7a0", "#ff6a2b", "#ffe8dc"]),
    ("mint", ["#e6fff4", "#2ee6b0", "#1fa7a0", "#073d5c", "#021622", "#bff7e4"], ["#ffffff", "#c3f5e4", "#e0ff9a", "#14c795", "#e2fff4"]),
    ("violet", ["#f1e6ff", "#c26bff", "#7a4dff", "#2a0aa8", "#0b0233", "#dccbff"], ["#ffffff", "#e2d2ff", "#ffc2f1", "#9b5cff", "#efe6ff"]),
    ("noir", ["#f2f2f2", "#9aa4b2", "#4a5160", "#15171c", "#050506", "#d9dde4"], ["#ffffff", "#d8dbe2", "#ffffff", "#f2f2f2", "#e9ebef"]),
];

impl Palette {
    pub fn from(p: P) -> Self {
        let name = p.s("preset", "blue");
        let (_, bgs, rest) = PALETTES.iter().find(|x| x.0 == name).unwrap_or(&PALETTES[0]);
        let keys = ["bg_white", "bg_cyan", "bg_peri", "bg_deep", "bg_navy", "bg_glow"];
        let mut bg = [[0f32; 3]; 6];
        for i in 0..6 {
            bg[i] = hex3(p.s(keys[i], bgs[i]));
        }
        Palette {
            bg,
            text: intern(p.s("text", rest[0])),
            highlight: intern(p.s("highlight", rest[1])),
            highlight_alpha: p.f("highlight_alpha", 0.30),
            flash: intern(p.s("flash", rest[2])),
            accent: intern(p.s("accent", rest[3])),
            frost: intern(p.s("frost", rest[4])),
            panel: intern(p.s("panel", "#ffffff")),
            ink: intern(p.s("ink", "#151515")),
        }
    }
}

/// Global look: fonts, weights, glow, dot screen, pace.
#[derive(Debug, Clone)]
pub struct LookCfg {
    pub display: &'static str,
    pub ui: &'static str,
    pub weight: u16,
    pub glow: f32,
    pub dots: f32,
    pub pace: f32,
}

impl LookCfg {
    pub fn from(p: P) -> Self {
        LookCfg {
            display: intern(p.s("font", "Inter Display")),
            ui: intern(p.s("ui_font", "Inter Text")),
            weight: p.i("weight", 400) as u16,
            glow: p.f("glow", 0.35),
            dots: p.f("dots", 0.035),
            pace: p.f("pace", 1.0).max(0.2),
        }
    }
}

static SPEC_DIR: OnceLock<std::path::PathBuf> = OnceLock::new();

/// Folder of the spec (its `assets/` holds images, fonts and the SVG logo).
pub fn spec_dir() -> &'static std::path::Path {
    SPEC_DIR.get_or_init(|| std::path::PathBuf::from(".")).as_path()
}
pub fn set_spec_dir(dir: &std::path::Path) {
    let _ = SPEC_DIR.set(dir.to_path_buf());
}

static PALETTE: OnceLock<Palette> = OnceLock::new();
static LOOK: OnceLock<LookCfg> = OnceLock::new();

pub fn init(palette: &Table, look: &Table) {
    let _ = PALETTE.set(Palette::from(P(palette)));
    let _ = LOOK.set(LookCfg::from(P(look)));
}
pub fn pal() -> &'static Palette {
    PALETTE.get_or_init(|| Palette::from(P::empty()))
}
pub fn look() -> &'static LookCfg {
    LOOK.get_or_init(|| LookCfg::from(P::empty()))
}

// ── backdrop ─────────────────────────────────────────────────────────────────────────────

/// Fitted geometry: b0 b1 b2 b3 ew lx ly lr r0 r1 top topg blob bx by br eg.
pub type BgFit = [f32; 17];

/// Named framings of the gradient, fitted on the reference film (frame noted). Scenes pick
/// one with `bg = "name"`, or drift between two with `bg = ["a", "b"]`.
pub const PRESETS: &[(&str, BgFit)] = &[
    ("sky", [-0.0607, -0.0914, 0.4803, 0.0345, 0.4000, -0.0289, 2.5000, 4.0000, 0.5723, 2.5000, 0.0200, 0.2000, 0.3980, 2.1477, -0.1053, 0.3000, 0.4247]), // 0: all light
    ("sky2", [0.0304, -0.8541, 2.0776, -0.8319, 0.4000, 0.2068, 2.5000, 2.7420, 0.8870, 1.0052, 1.2000, 0.2000, 0.2313, 0.0652, 0.2467, 0.0072, 0.2938]), // 18
    ("dawn", [0.4313, -1.9822, 3.7300, -1.6263, 0.2769, 0.2690, 2.1311, 2.5720, 0.8566, 2.5000, 1.2000, 0.2000, 0.8936, 1.9230, 0.0984, 0.2002, 0.1325]), // 36: light, dark top right
    ("window", [0.3903, 0.5412, -1.5564, 1.3944, 0.3329, -0.4648, 1.0377, 1.5089, 0.5951, 0.4796, 0.6123, 0.2219, 0.5888, 0.0140, 0.3617, 0.1530, 0.1664]), // 85
    ("free", [0.3672, 1.1259, -4.0000, 3.4974, 0.1923, -0.2880, 0.9235, 1.5664, 0.4593, 0.5661, 0.5405, 0.4551, 1.0000, 0.2800, 0.1089, 0.1783, 0.5484]), // 125
    ("sweep", [0.3763, 1.6547, -4.0000, 3.0320, 0.1635, -0.2193, 0.9567, 1.3715, 0.4805, 0.7328, 0.8073, 0.6288, 0.8354, 0.2445, 0.0213, 0.1553, 0.5049]), // 165
    ("turn", [0.4272, 1.4102, -3.4303, 2.4970, 0.1782, -0.2960, 1.0057, 1.3819, 0.4876, 0.7282, 0.7491, 0.5333, 0.7722, 0.1534, 0.0358, 0.1905, 0.4411]), // 205
    ("low", [0.4635, 1.1290, -4.0000, 3.5607, 0.1444, -0.2174, 0.9664, 1.3701, 0.4583, 0.6382, 0.7140, 0.8043, 0.7744, 0.2504, 0.0241, 0.2008, 0.6743]), // 250
    ("prompt", [1.0388, -2.5111, 4.0000, -1.8876, 0.4000, -0.1836, 0.5160, 3.5251, 1.1241, 1.0864, 0.4414, 0.2000, 0.4838, 0.1119, 0.3501, 0.3000, 0.2258]), // 300: lit band low
    ("prompt2", [0.6103, 0.8273, -3.1515, 2.4572, 0.2412, -1.4960, 0.2000, 2.0477, 0.7561, 1.0578, 0.8833, 0.2000, 0.5013, 0.0025, 0.0715, 0.2290, 0.4219]), // 345
    ("wide", [0.2993, 1.0576, -4.0000, 4.0000, 0.2900, -0.3282, 0.9969, 1.5017, 0.5736, 0.8253, 0.9686, 0.2211, 0.5063, 0.2743, 0.1974, 0.1705, 0.0111]), // 470
    ("logo", [0.3718, 1.2332, -2.5497, 1.9727, 0.2783, -0.3486, 1.0213, 1.6558, 0.4790, 0.7847, 0.7889, 0.3536, 0.4424, 0.1546, 0.2066, 0.2175, 0.0000]), // 565
    ("end", [0.3422, 1.1477, -2.9883, 2.3844, 0.3462, -0.3288, 0.9463, 1.4331, 0.5131, 0.6492, 0.6571, 0.2526, 0.6303, 0.1862, 0.0890, 0.1746, 0.0000]), // 600
    ("end2", [0.5076, 0.1394, -1.5773, 1.9453, 0.2960, -0.4243, 1.0910, 1.5394, 0.5004, 0.6694, 0.7426, 0.2371, 0.5581, 0.1540, 0.0953, 0.2332, 0.0000]), // 690
];

pub fn preset(name: &str) -> BgFit {
    PRESETS.iter().find(|p| p.0 == name).map(|p| p.1).unwrap_or(PRESETS[6].1)
}

/// The backdrop: a camera over the gradient plus its fitted geometry.
#[derive(Debug, Clone, Copy)]
pub struct Bg {
    pub cx: f32,
    pub cy: f32,
    pub zoom: f32,
    pub rot: f32,
    pub fit: BgFit,
    pub dots: f32,
    pub time: f32,
}

impl Bg {
    pub fn of(fit: BgFit) -> Self {
        Bg { cx: 0.5, cy: 0.5, zoom: 1.0, rot: 0.0, fit, dots: look().dots, time: 0.0 }
    }
    pub fn lerp_fit(a: &BgFit, b: &BgFit, t: f32) -> BgFit {
        let mut v = [0f32; 17];
        for i in 0..17 {
            v[i] = lerp(a[i], b[i], t);
        }
        v
    }
    /// Geometry keyed in time: `(t, fit)` pairs, smoothed between keys.
    pub fn keyed(t: f32, k: &[(f32, BgFit)]) -> Self {
        if t <= k[0].0 {
            return Self::of(k[0].1);
        }
        for w in k.windows(2) {
            if t <= w[1].0 {
                return Self::of(Self::lerp_fit(&w[0].1, &w[1].1, smooth(seg(t, w[0].0, w[1].0))));
            }
        }
        Self::of(k[k.len() - 1].1)
    }
}

/// A scene's backdrop from its params: `bg = "turn"` or `bg = ["sweep", "turn"]` (drifts
/// across the scene), `bg_zoom`, `bg_x`, `bg_y`, `bg_rot` (degrees), `dots`.
pub fn backdrop(p: P, tm: &T, default: &str) -> Bg {
    let names = p.strs("bg");
    let names: Vec<&str> = if names.is_empty() { vec![default] } else { names };
    let n = names.len();
    let mut b = if n == 1 {
        Bg::of(preset(names[0]))
    } else {
        let k: Vec<(f32, BgFit)> = names.iter().enumerate().map(|(i, nm)| (i as f32 / (n - 1) as f32, preset(nm))).collect();
        Bg::keyed(tm.p(), &k)
    };
    b.zoom = p.f("bg_zoom", 1.0);
    b.cx = 0.5 + p.f("bg_x", 0.0);
    b.cy = 0.5 + p.f("bg_y", 0.0);
    b.rot = p.f("bg_rot", 0.0).to_radians();
    b.dots = p.f("dots", look().dots);
    b.time = tm.g;
    b
}

static BG: LazyLock<Shader> = LazyLock::new(|| Shader::sksl(include_str!("shaders/Bg.sksl")));

pub fn bg(frame: &Frame, b: &Bg) -> Svgr<'static> {
    let f = &b.fit;
    let c = &pal().bg;
    let layer = BG.draw(
        frame,
        ShaderUniforms::new()
            .float("iTime", b.time)
            .float4("uView", b.cx, b.cy, b.zoom, b.rot)
            .float4("uEdge", f[0], f[1], f[2], f[3])
            .float4("uEdge2", f[4], f[16], f[10], f[11])
            .float4("uLight", f[5], f[6], f[7], f[8])
            .float4("uLight2", f[9], f[12], f[13], f[14])
            .float("uBlobR", f[15])
            .float("uDots", b.dots)
            .float3("uWhite", c[0][0], c[0][1], c[0][2])
            .float3("uCyan", c[1][0], c[1][1], c[1][2])
            .float3("uPeri", c[2][0], c[2][1], c[2][2])
            .float3("uDeep", c[3][0], c[3][1], c[3][2])
            .float3("uNavy", c[4][0], c[4][1], c[4][2])
            .float3("uGlow", c[5][0], c[5][1], c[5][2]),
    );
    fframes::svgr!(<image href={layer.href()} x="0" y="0" width="1280" height="720" />)
}

// ── fake 3D ──────────────────────────────────────────────────────────────────────────────

/// A flat layer seen through a camera: rolled by `rz`, yawed by `ry` (+ turns its right side
/// away) and pitched by `rx` about `(px, py)`, projected with focal length `f`, then scaled by
/// `s` and moved by `(dx, dy)`. Each element is drawn with the affine matrix that matches the
/// projection at its own box, so small elements (words, cards) look right.
#[derive(Debug, Clone, Copy)]
pub struct Persp {
    pub px: f32,
    pub py: f32,
    pub rz: f32,
    pub ry: f32,
    pub rx: f32,
    pub f: f32,
    pub s: f32,
    pub dx: f32,
    pub dy: f32,
}

impl Persp {
    pub fn flat() -> Self {
        Self { px: W / 2.0, py: H / 2.0, rz: 0.0, ry: 0.0, rx: 0.0, f: 1400.0, s: 1.0, dx: 0.0, dy: 0.0 }
    }
    pub fn p(&self, x: f32, y: f32) -> (f32, f32) {
        let (lx, ly) = (x - self.px, y - self.py);
        let (sz, cz) = self.rz.sin_cos();
        let (lx, ly) = (lx * cz - ly * sz, lx * sz + ly * cz);
        let (sy, cy) = self.ry.sin_cos();
        let (sx, cx) = self.rx.sin_cos();
        let x1 = lx * cy;
        let z1 = lx * sy;
        let y2 = ly * cx;
        let z2 = z1 + ly * sx;
        let k = self.f / (self.f + z2);
        (self.px + self.dx + x1 * k * self.s, self.py + self.dy + y2 * k * self.s)
    }
    /// Affine matrix mapping the layer box (x, y, w, h) onto its projection.
    pub fn m(&self, x: f32, y: f32, w: f32, h: f32) -> String {
        let (w, h) = (w.max(1.0), h.max(1.0));
        let o = self.p(x, y);
        let r = self.p(x + w, y);
        let d = self.p(x, y + h);
        let (a, b) = ((r.0 - o.0) / w, (r.1 - o.1) / w);
        let (c, dd) = ((d.0 - o.0) / h, (d.1 - o.1) / h);
        let e = o.0 - a * x - c * y;
        let f = o.1 - b * x - dd * y;
        format!("matrix({a:.5} {b:.5} {c:.5} {dd:.5} {e:.3} {f:.3})")
    }
    /// Local scale at a point (for blur radii).
    pub fn k(&self, x: f32, y: f32) -> f32 {
        let o = self.p(x, y);
        let r = self.p(x + 10.0, y);
        ((r.0 - o.0).powi(2) + (r.1 - o.1).powi(2)).sqrt() / 10.0
    }
}

// ── glass type ───────────────────────────────────────────────────────────────────────────

/// How one word looks at this instant.
#[derive(Debug, Clone, Copy)]
pub struct Look {
    /// Gaussian blur radius (px, before the 3D scale).
    pub blur: f32,
    /// 0 = solid, 1 = clear glass (see-through body, bright edge ring, specular highlight).
    pub glass: f32,
    pub opacity: f32,
    /// Strength of the soft halo around the letters.
    pub glow: f32,
}

impl Look {
    pub fn solid() -> Self {
        Self { blur: 0.0, glass: 0.0, opacity: 1.0, glow: look().glow }
    }
}

/// The measured word entrance, `age` animation seconds after the word starts to arrive:
/// blur 12 -> 0 over 0.28 s, glass -> solid from 0.04 s over 0.24 s, fade in over 0.06 s.
pub fn arrive(age: f32, blur0: f32) -> Look {
    let blur = blur0 * (1.0 - ease_out(seg(age, 0.0, 0.28)));
    let glass = 1.0 - smooth(seg(age, 0.04, 0.28));
    Look { blur, glass, opacity: smooth(seg(age, -0.024, 0.032)), glow: look().glow }
}

/// The measured exit blur, `left` animation seconds before the cut over a `dur` window.
pub fn leave(mut l: Look, left: f32, dur: f32, max_blur: f32) -> Look {
    if left < dur {
        let p = 1.0 - left / dur;
        l.blur += max_blur * ease_in(clamp01(p * 1.2)).max(p * 0.6);
        l.glass = l.glass.max(smooth(seg(p, 0.0, 0.5)) * 0.6);
        l.opacity *= 1.0 - smooth(seg(p, 0.3, 1.0));
    }
    l
}

/// Glass filter: in the glass state the letters are a see-through tinted body with a bright
/// edge ring and a specular highlight on edges facing the top-left light; solid = the type
/// colour with a soft halo. `id` must be unique within the frame.
pub fn glass_filter(id: &str, look: &Look, k: f32) -> Svgr<'static> {
    let blur = (look.blur * k).max(0.0);
    let soft = blur.max(0.01);
    let g = clamp01(look.glass);
    let dil = (1.0 * g * k).max(0.01);
    let ring_w = (1.1 * k).max(0.5);
    let bump = (2.0 * k + blur * 0.5).max(0.5);
    let body_a = lerp(1.0, 0.52, g);
    let ring_a = 0.4 * g;
    let spec_a = 1.0 * g;
    let halo_r = (5.0 + blur * 0.8) * k;
    let halo_a = look.glow * lerp(1.0, 0.6, g);
    let [tr, tg, tb] = hex3(pal().text);
    let [hr, hg, hb] = hex3(pal().highlight);
    let id = id.to_string();
    let body = format!(
        "0 0 0 0 {:.3}  0 0 0 0 {:.3}  0 0 0 0 {:.3}  0 0 0 {body_a:.3} 0",
        lerp(tr, hr * 0.92, g),
        lerp(tg, hg * 0.92, g),
        lerp(tb, hb, g)
    );
    let ring = format!("0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 {ring_a:.3} 0");
    let spec = format!("1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 {spec_a:.3} 0");
    let halo = format!("0 0 0 0 {:.3}  0 0 0 0 {:.3}  0 0 0 0 1  0 0 0 {halo_a:.3} 0", lerp(tr, hr, 0.6), lerp(tg, hg, 0.4));
    fframes::svgr!(
        <filter id={id} x="-40%" y="-80%" width="180%" height="260%" color-interpolation-filters="sRGB">
            <feMorphology in="SourceAlpha" operator="dilate" radius={dil} result="fat" />
            <feGaussianBlur in="fat" stdDeviation={soft} result="soft" />
            <feMorphology in="fat" operator="erode" radius={ring_w} result="inner" />
            <feComposite in="fat" in2="inner" operator="out" result="ringraw" />
            <feGaussianBlur in="ringraw" stdDeviation={soft} result="ringsoft" />
            <feColorMatrix in="ringsoft" type="matrix" values={ring} result="ringlit" />
            <feGaussianBlur in="fat" stdDeviation={bump} result="bump" />
            <feSpecularLighting in="bump" surfaceScale="5" specularConstant="1.4" specularExponent="9" lighting-color="#ffffff" result="spec">
                <feDistantLight azimuth="225" elevation="42" />
            </feSpecularLighting>
            <feComposite in="spec" in2="soft" operator="in" result="specin" />
            <feColorMatrix in="specin" type="matrix" values={spec} result="speclit" />
            <feColorMatrix in="soft" type="matrix" values={body} result="body" />
            <feGaussianBlur in="soft" stdDeviation={halo_r} result="halosrc" />
            <feColorMatrix in="halosrc" type="matrix" values={halo} result="halo" />
            <feMerge>
                <feMergeNode in="halo" />
                <feMergeNode in="body" />
                <feMergeNode in="ringlit" />
                <feMergeNode in="speclit" />
            </feMerge>
        </filter>
    )
}

/// A glass word with its left baseline at layer point (x, y), drawn through `cam`.
/// `width` is the word's advance (for the 3D matrix); `ls` letter spacing in px.
#[allow(clippy::too_many_arguments)]
pub fn glass_word(id: &str, text: &str, family: &str, x: f32, y: f32, size: f32, weight: u16, ls: f32, width: f32, l: &Look, cam: &Persp) -> Svgr<'static> {
    if l.opacity <= 0.002 {
        return Svgr::empty();
    }
    let k = cam.k(x, y);
    let m = cam.m(x, y - size, width, size);
    let fid = format!("url(#{id})");
    let filter = glass_filter(id, l, k);
    // svgr! drops a numeric font-weight (renders 400): pass it as a string
    let wt = weight.to_string();
    let family = family.to_string();
    let text = text.to_string();
    fframes::svgr!(
        <g opacity={l.opacity}>
            <defs>{filter}</defs>
            <g filter={fid}>
                <g transform={m}>
                    <text x={x} y={y} font-family={family} font-size={size} font-weight={wt} letter-spacing={ls} fill="#ffffff">{text}</text>
                </g>
            </g>
        </g>
    )
}

// ── caption markup and layout ────────────────────────────────────────────────────────────

/// One word of a caption line: text and whether it sits in a highlight box.
#[derive(Debug, Clone)]
pub struct Tok {
    pub text: String,
    pub hl: bool,
}

/// `"Turn your [idea]"` -> Turn, your, idea(hl). Square brackets mark a highlight run (one
/// box), e.g. `"into [a product]"`.
pub fn parse_line(s: &str) -> Vec<Tok> {
    let mut out = vec![];
    let mut hl = false;
    for raw in s.split_whitespace() {
        let mut w = raw.to_string();
        if w.starts_with('[') {
            w.remove(0);
            hl = true;
        }
        // `]` may be followed by punctuation: "[backlog],"
        let close = w.contains(']');
        let w = w.replace(']', "");
        if !w.is_empty() {
            out.push(Tok { text: w, hl });
        }
        if close {
            hl = false;
        }
    }
    out
}

/// The translucent highlight box `age` animation seconds after it pops in: grows out from its
/// centre over about 0.1 s, flashes bright and settles into the palette's tint.
pub fn hl_box(x0: f32, x1: f32, top: f32, h: f32, age: f32, opacity: f32, cam: &Persp) -> Svgr<'static> {
    if age < -0.02 || opacity <= 0.0 {
        return Svgr::empty();
    }
    let grow = lerp(0.45, 1.0, ease_out(seg(age, 0.008, 0.104)));
    let w = x1 - x0;
    let m = cam.m(x0, top, w, h);
    let cx = x0 + w / 2.0;
    let bw = (w * grow).max(1.0);
    let bx = cx - bw / 2.0;
    let flash = 1.0 - smooth(seg(age, 0.024, 0.14));
    let a_base = pal().highlight_alpha * smooth(seg(age, -0.02, 0.02));
    let fa = a_base + 0.48 * flash;
    let [hr, hg, hb] = hex3(pal().highlight);
    let [fr, fg, fb] = hex3(pal().flash);
    let mix = Color::rgb((lerp(hr, fr, flash) * 255.0) as u8, (lerp(hg, fg, flash) * 255.0) as u8, (lerp(hb, fb, flash) * 255.0) as u8);
    fframes::svgr!(
        <g transform={m} opacity={opacity}>
            <rect x={bx} y={top} width={bw} height={h} rx="6" fill={mix} fill-opacity={fa} />
        </g>
    )
}

// ── blur groups, cursor, letterbox ───────────────────────────────────────────────────────

/// Wraps `content` in a Gaussian blur of radius `r` (no-op when tiny). `id` must be unique.
pub fn blurred<'a>(id: &str, r: f32, content: Svgr<'a>) -> Svgr<'a> {
    if r < 0.05 {
        return content;
    }
    let fid = format!("url(#{id})");
    let id = id.to_string();
    fframes::svgr!(
        <g>
            <defs>
                <filter id={id} x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB">
                    <feGaussianBlur in="SourceGraphic" stdDeviation={r} />
                </filter>
            </defs>
            <g filter={fid}>{content}</g>
        </g>
    )
}

/// macOS arrow cursor with its tip at (x, y), `s` = scale (1 = 20 px tall).
pub fn cursor(x: f32, y: f32, s: f32, opacity: f32) -> Svgr<'static> {
    let t = format!("translate({x:.2} {y:.2}) scale({s:.4})");
    fframes::svgr!(
        <g transform={t} opacity={opacity}>
            <path d="M0 0 L0 17.2 L4.1 13.3 L6.6 19.4 L9.2 18.3 L6.8 12.3 L11.6 12.3 Z" fill="#000000" stroke="#ffffff" stroke-width="1.3" stroke-linejoin="round" />
        </g>
    )
}

/// Black bars of height `h` at the top and bottom.
pub fn letterbox(h: f32) -> Svgr<'static> {
    if h < 0.5 {
        return Svgr::empty();
    }
    let y2 = H - h;
    fframes::svgr!(
        <g>
            <rect x="0" y="0" width="1280" height={h} fill="#000000" />
            <rect x="0" y={y2} width="1280" height={h} fill="#000000" />
        </g>
    )
}

/// An image from `assets/` (None when missing).
pub fn image<'a>(ctx: &FFramesContext<'a, '_>, name: &str) -> Option<String> {
    if name.is_empty() {
        return None;
    }
    ctx.get_image(name).map(|i| i.href().to_string())
}
