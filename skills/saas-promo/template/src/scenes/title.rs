//! `title`: one line of huge glowing words over the light end of the gradient. The first word
//! fills the frame and slides in from the right, the camera pulls back as the other words
//! arrive as cyan-tinted glass and settle to white with a hard bloom; then the camera pushes
//! in again, the line turns into outlined glass, an arrow halftone ring sweeps out from the
//! centre, a frosted pill rises from the bottom and the line lifts toward the top, handing
//! over to a `window` scene (which keeps drawing the line, the pill and the ring's tail).
//!
//! Motion is the reference intro's measured track (frames 0-47 at 25 fps), replayed through
//! `vframe`: the entrance runs at its own speed from the start, the hand-over at its own
//! speed up to the cut, and the settled hold in between stretches with `dur`.
//! Params: references/kinds/title.md.
use crate::kit::{self, Persp, T, clamp01, ease_out, hex3, lerp, seg, smooth};
use crate::spec::P;
use fframes::{FFramesContext, Frame, Shader, ShaderUniforms, Svgr};
use std::sync::LazyLock;

/// Frame rate the reference tracks were measured at.
pub const REF_FPS: f32 = 25.0;

/// Scene time mapped onto a reference shot that ran from frame `f0` to `f1`: the entrance
/// (`f0..fe`) plays at its own speed from the scene start, the exit (`fx..f1`) at its own
/// speed up to the cut, and the hold between them stretches or squeezes to fill the scene.
/// A scene shorter than entrance + exit plays the whole shot proportionally faster.
pub fn vframe(tm: &T, f0: f32, fe: f32, fx: f32, f1: f32) -> f32 {
    let e = tm.e() * REF_FPS;
    let x = tm.x() * REF_FPS;
    let total = tm.len / tm.pace * REF_FPS;
    let (ent, ext) = (fe - f0, f1 - fx);
    if total >= ent + ext {
        if e <= ent {
            f0 + e
        } else if x <= ext {
            f1 - x
        } else {
            let k = (e - ent) / (total - ent - ext).max(1e-3);
            fe + (fx - fe) * k
        }
    } else {
        f0 + (f1 - f0) * clamp01(e / total.max(1e-3))
    }
}

/// `#rrggbb` of a colour mix.
pub fn mix_hex(a: &str, b: &str, t: f32) -> String {
    let (a, b) = (hex3(a), hex3(b));
    let c = |i: usize| (lerp(a[i], b[i], t).clamp(0.0, 1.0) * 255.0).round() as u8;
    format!("#{:02x}{:02x}{:02x}", c(0), c(1), c(2))
}

/// The palette's backdrop colours as hex (white, cyan, peri, deep, navy, glow).
pub fn bg_hex(i: usize) -> String {
    let c = kit::pal().bg[i];
    format!("#{:02x}{:02x}{:02x}", (c[0] * 255.0) as u8, (c[1] * 255.0) as u8, (c[2] * 255.0) as u8)
}

// ── the line ─────────────────────────────────────────────────────────────────────────────

/// Line layout and look, shared with `window`'s back title.
#[derive(Debug, Clone)]
pub struct Line {
    pub words: Vec<String>,
    pub size: f32,
    pub weight: u16,
    /// Letter spacing (px) and the gap between words (px).
    pub track: f32,
    pub gap: f32,
    /// Centre x and baseline of the settled line.
    pub cx: f32,
    pub base: f32,
    /// Reference frame each word starts to arrive (the first is already in).
    pub at: Vec<f32>,
    pub glow: f32,
}

impl Line {
    /// From a scene's params; `key` names the words param (`words` or `backtitle`).
    pub fn from(p: P, key: &str) -> Self {
        let words: Vec<String> = match p.strs(key).as_slice() {
            [one] if one.contains(' ') => one.split_whitespace().map(str::to_string).collect(),
            ws => ws.iter().map(|s| s.to_string()).collect(),
        };
        let size = p.f("size", 105.5);
        // measured: "all" at 12.6, "builders" at 20.6; later words keep that 8-frame step
        let at_s = p.fs("at");
        let stagger = p.f("stagger", 0.32) * REF_FPS;
        let first = p.f("second_at", 0.504) * REF_FPS;
        let at = (0..words.len())
            .map(|i| match at_s.get(i) {
                Some(s) => s * REF_FPS,
                None if i == 0 => -10.0,
                None => first + (i - 1) as f32 * stagger,
            })
            .collect();
        Line {
            words,
            size,
            weight: p.i("weight", 400) as u16,
            track: p.f("tracking", 0.0133) * size,
            gap: p.f("gap", 0.306) * size,
            cx: p.f("x", 640.0),
            base: p.f("y", 397.0),
            at,
            glow: p.f("glow", 1.0),
        }
    }
}

/// (frame, scale, ink-left x, baseline y) of the reference line ("Calling all builders",
/// settled ink-left 208, baseline 397). Positions are applied relative to the settled line.
const REF_INK_L: f32 = 208.0;
const REF_BASE: f32 = 397.0;
const TRACK: &[(f32, [f32; 3])] = &[
    (0.0, [3.20, 1028.0, 485.0]),
    (1.0, [3.22, 718.0, 485.0]),
    (2.0, [3.24, 585.0, 485.0]),
    (3.0, [3.26, 498.0, 484.0]),
    (4.0, [3.27, 436.0, 483.0]),
    (5.0, [3.27, 390.0, 482.0]),
    (6.0, [3.27, 356.0, 480.0]),
    (7.0, [3.26, 332.0, 479.0]),
    (8.0, [3.25, 315.0, 478.0]),
    (9.0, [3.22, 300.0, 477.0]),
    (10.0, [3.15, 286.0, 475.0]),
    (11.0, [3.08, 270.0, 473.0]),
    (12.0, [2.97, 249.0, 467.0]),
    (13.0, [2.62, 207.0, 455.0]),
    (14.0, [2.32, 176.0, 444.0]),
    (15.0, [2.24, 166.0, 440.0]),
    (16.0, [2.17, 160.0, 437.0]),
    (17.0, [2.09, 158.0, 435.0]),
    (18.0, [2.02, 158.0, 433.0]),
    (19.0, [1.93, 160.0, 430.0]),
    (20.0, [1.83, 165.0, 426.0]),
    (21.0, [1.72, 174.0, 421.0]),
    (22.0, [1.43, 190.0, 411.0]),
    (23.0, [1.217, 202.0, 403.0]),
    (24.0, [1.11, 207.0, 399.0]),
    (25.0, [1.04, 210.0, 397.0]),
    (26.0, [1.02, 211.0, 397.0]),
    (27.0, [1.005, 210.0, 397.0]),
    (31.0, [1.0, 208.0, 397.0]),
    (32.0, [1.005, 204.0, 397.0]),
    (33.0, [1.012, 199.0, 397.0]),
    (34.0, [1.03, 190.0, 397.0]),
    (35.0, [1.065, 175.0, 397.0]),
    (36.0, [1.133, 145.0, 398.0]),
    (37.0, [1.262, 89.0, 400.0]),
    (38.0, [1.30, 72.0, 401.0]),
    (39.0, [1.322, 63.0, 402.0]),
    (40.0, [1.336, 57.0, 400.0]),
    (41.0, [1.348, 52.0, 397.0]),
    (42.0, [1.356, 48.0, 392.0]),
    (43.0, [1.362, 46.0, 386.0]),
    (44.0, [1.365, 44.0, 377.0]),
    (45.0, [1.365, 44.0, 365.0]),
    (46.0, [1.365, 44.0, 344.0]),
    (47.0, [1.362, 45.0, 288.0]),
    (48.0, [1.36, 46.0, 233.0]),
    (49.0, [1.36, 46.0, 211.0]),
    (50.0, [1.36, 46.0, 198.0]),
    (52.0, [1.355, 48.0, 184.0]),
    (54.0, [1.35, 51.0, 175.0]),
    (56.0, [1.35, 51.0, 170.0]),
    (58.0, [1.348, 52.0, 167.0]),
    (60.0, [1.347, 52.0, 166.0]),
    (64.0, [1.35, 51.0, 166.0]),
    (70.0, [1.355, 49.0, 168.0]),
    (75.0, [1.36, 47.0, 169.0]),
    (80.0, [1.345, 53.0, 171.0]),
    (85.0, [1.33, 59.0, 173.0]),
    (90.0, [1.31, 68.0, 175.0]),
    (93.0, [1.30, 72.0, 177.0]),
    (95.0, [1.286, 79.0, 179.0]),
    (97.0, [1.255, 92.0, 182.0]),
    (99.0, [1.24, 98.0, 184.0]),
];

/// One word's look at reference frame `f`.
struct Gl {
    blur: f32,
    /// Body alpha (1 solid .. ~0.08 clear glass) and how cyan the body is.
    body: f32,
    cyan: f32,
    /// Bright outline band and specular rim.
    edge: f32,
    rim: f32,
    halo_a: f32,
    halo_r: f32,
    /// Tight inner bloom.
    core: f32,
    /// Dark line just inside the bright outline (the glass tube look).
    dark: f32,
    opacity: f32,
}

fn look(f: f32, s: f32, reveal_at: f32, turn0: f32, turn1: f32, glow: f32) -> Gl {
    // enters as crisp cyan glass, settling to white over ~5 frames
    let p = clamp01((f - reveal_at) / 5.0);
    let e = ease_out(p);
    let enter_glass = 1.0 - smooth(seg(p, 0.3, 1.0));
    // later: the whole line turns into outlined glass
    let turn = smooth(seg(f, turn0, turn1));
    let glass = enter_glass.max(turn);
    let _ = glass;
    let blur = lerp(3.5 * s, 0.0, e) + turn * 0.9 * s;
    // the big type at the start blooms hard; the glass line keeps a soft halo
    let bloom = 1.0 - smooth(seg(f, 34.0, 41.0));
    Gl {
        blur,
        body: lerp(1.0, 0.24, turn) * lerp(1.0, 0.85, enter_glass),
        cyan: enter_glass,
        edge: turn.max(enter_glass * 0.35),
        rim: turn * 1.25 + enter_glass * 0.4,
        halo_a: (lerp(0.25, 0.7, bloom) * (1.0 - enter_glass * 0.5) * glow).min(1.0),
        halo_r: (4.0 + 3.5 * s) * lerp(0.6, 1.0, bloom) + blur * 0.6,
        core: (lerp(0.18, 0.9, bloom) * (1.0 - turn * 0.7) * (1.0 - enter_glass * 0.6) * glow).min(1.0),
        dark: turn * 0.45,
        opacity: smooth(seg(p, 0.0, 0.1)),
    }
}

fn filter(id: &str, l: &Gl, s: f32) -> Svgr<'static> {
    let blur = l.blur.max(0.01);
    let rimsrc = (l.blur * 0.6 + 1.4 * s).max(0.6);
    let erode = (2.2 * s).max(0.6);
    let erode2 = (4.0 * s).max(1.0);
    let pal = kit::pal();
    let [tr, tg, tb] = hex3(pal.text);
    let [cr, cg, cb] = pal.bg[1];
    let [dr, dg, db] = pal.bg[3];
    // the dark tube line: the deep backdrop colour, darker
    let darkm = format!("0 0 0 0 {:.3}  0 0 0 0 {:.3}  0 0 0 0 {:.3}  0 0 0 {:.3} 0", dr * 0.6 + 0.05, dg * 0.6 + 0.08, db * 0.6, l.dark);
    // entering words are tinted toward a light cyan
    let (lr, lg, lb) = (lerp(cr, 1.0, 0.25), lerp(cg, 1.0, 0.7), lerp(cb, 1.0, 0.9));
    let body = format!(
        "0 0 0 0 {:.3}  0 0 0 0 {:.3}  0 0 0 0 {:.3}  0 0 0 {:.3} 0",
        lerp(tr, lr, l.cyan),
        lerp(tg, lg, l.cyan),
        lerp(tb, lb, l.cyan),
        l.body
    );
    let edge = format!("0 0 0 0 {tr:.3}  0 0 0 0 {tg:.3}  0 0 0 0 {tb:.3}  0 0 0 {:.3} 0", l.edge);
    let rim = format!("1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 {:.3} 0", l.rim);
    let [gr, gg, gb] = pal.bg[5];
    let halo = format!("0 0 0 0 {:.3}  0 0 0 0 {:.3}  0 0 0 0 {:.3}  0 0 0 {:.3} 0", lerp(gr, tr, 0.6), lerp(gg, tg, 0.6), lerp(gb, tb, 0.6), l.halo_a);
    let core = format!("0 0 0 0 {tr:.3}  0 0 0 0 {tg:.3}  0 0 0 0 {tb:.3}  0 0 0 {:.3} 0", l.core);
    let halo_r = l.halo_r;
    let core_r = (1.6 * s + l.blur * 0.5).max(0.5);
    let id = id.to_string();
    fframes::svgr!(
        <filter id={id} x="-30%" y="-80%" width="160%" height="260%" color-interpolation-filters="sRGB">
            <feGaussianBlur in="SourceAlpha" stdDeviation={blur} result="soft" />
            <feMorphology in="SourceAlpha" operator="erode" radius={erode} result="thin" />
            <feGaussianBlur in="thin" stdDeviation={blur} result="thinsoft" />
            <feComposite in="soft" in2="thinsoft" operator="out" result="band" />
            <feColorMatrix in="band" type="matrix" values={edge} result="edgelit" />
            <feMorphology in="SourceAlpha" operator="erode" radius={erode2} result="thinner" />
            <feGaussianBlur in="thinner" stdDeviation={blur} result="thinnersoft" />
            <feComposite in="thinsoft" in2="thinnersoft" operator="out" result="band2" />
            <feColorMatrix in="band2" type="matrix" values={darkm} result="darkline" />
            <feGaussianBlur in="SourceAlpha" stdDeviation={rimsrc} result="bump" />
            <feSpecularLighting in="bump" surfaceScale="7" specularConstant="1.5" specularExponent="14" lighting-color="#ffffff" result="spec">
                <feDistantLight azimuth="240" elevation="38" />
            </feSpecularLighting>
            <feComposite in="spec" in2="soft" operator="in" result="rimraw" />
            <feColorMatrix in="rimraw" type="matrix" values={rim} result="rimlit" />
            <feColorMatrix in="soft" type="matrix" values={body} result="body" />
            <feGaussianBlur in="soft" stdDeviation={halo_r} result="halosrc" />
            <feColorMatrix in="halosrc" type="matrix" values={halo} result="halo" />
            <feGaussianBlur in="soft" stdDeviation={core_r} result="coresrc" />
            <feColorMatrix in="coresrc" type="matrix" values={core} result="corelit" />
            <feMerge>
                <feMergeNode in="halo" />
                <feMergeNode in="corelit" />
                <feMergeNode in="body" />
                <feMergeNode in="darkline" />
                <feMergeNode in="edgelit" />
                <feMergeNode in="rimlit" />
            </feMerge>
        </filter>
    )
}

/// Draw the line at reference frame `f`. `hold` freezes the camera track at that frame (for
/// `exit = "blur"` / `"cut"`); `out` is an extra exit look (blur radius, fade 0..1).
pub fn draw<'a>(ln: &Line, f: f32, hold: Option<f32>, out: (f32, f32), frame: &mut Frame, ctx: &FFramesContext<'a, '_>, idp: &str) -> Svgr<'a> {
    if f > 99.5 || ln.words.is_empty() {
        return Svgr::empty();
    }
    let display = kit::look().display;
    let tf = hold.map(|h| f.min(h)).unwrap_or(f);
    let [s, left, base] = kit::track(tf, TRACK);
    // settled layout, centred on cx
    let ws: Vec<f32> = ln.words.iter().map(|w| kit::text_w(frame, ctx, display, ln.size, ln.weight, w) + ln.track * w.chars().count() as f32).collect();
    let total: f32 = ws.iter().sum::<f32>() + ln.gap * (ws.len() as f32 - 1.0);
    let lsb = 0.04 * ln.size;
    let x_start = ln.cx - total / 2.0;
    let ink_l = x_start + lsb;
    let cam = Persp { px: ink_l, py: ln.base, s, dx: left - REF_INK_L, dy: base - REF_BASE, ..Persp::flat() };
    let mut x = x_start;
    let mut parts = vec![];
    for (i, text) in ln.words.iter().enumerate() {
        let at = ln.at[i];
        let w = ws[i];
        // even words (1st, 3rd, ...) turn to glass first, odd ones later (measured)
        let (t0, t1) = if i % 2 == 0 { (35.5, 40.0) } else { (42.5, 49.0) };
        if f >= at {
            // entering words slide in from the right (60 layout px, decaying over 7 frames)
            let q = clamp01((f - at) / 7.0);
            let slide = 60.0 * (1.0 - q).powf(1.5);
            let wx = x + slide;
            // a held line (exit = blur / cut) keeps its settled look too: no glass turn
            let mut l = look(tf, s, at, t0, t1, ln.glow);
            l.blur += out.0;
            l.opacity *= 1.0 - out.1;
            if l.opacity > 0.002 {
                let id = format!("{idp}{i}");
                let fid = format!("url(#{id})");
                let m = cam.m(wx, ln.base - ln.size, w, ln.size);
                let flt = filter(&id, &l, s);
                let op = l.opacity;
                let wt = ln.weight.to_string();
                let text = text.clone();
                let fam = display.to_string();
                let (size, base_y, tr) = (ln.size, ln.base, ln.track);
                parts.push(fframes::svgr!(
                    <g opacity={op}>
                        <defs>{flt}</defs>
                        <g filter={fid}>
                            <g transform={m}>
                                <text x={wx} y={base_y} font-family={fam} font-size={size} font-weight={wt} letter-spacing={tr} fill="#ffffff">{text}</text>
                            </g>
                        </g>
                    </g>
                ));
            }
        }
        x += w + ln.gap;
    }
    fframes::svgr!(<g>{parts}</g>)
}

// ── the arrow halftone ring ──────────────────────────────────────────────────────────────

static DOTS: LazyLock<Shader> = LazyLock::new(|| Shader::sksl(include_str!("../shaders/Halftone.sksl")));

/// The arrow halftone ring sweeping out from (cx, cy) at reference frames 39.5-50.5.
pub fn halftone(frame: &Frame, f: f32, cx: f32, cy: f32) -> Svgr<'static> {
    if !(39.5..=50.5).contains(&f) {
        return Svgr::empty();
    }
    // (frame, front radius, inner radius, amplitude, vertical squash)
    let r = kit::track(
        f,
        &[
            (39.5, [60.0, -200.0, 0.0, 0.9]),
            (40.0, [150.0, -200.0, 0.3, 0.9]),
            (41.0, [330.0, -150.0, 0.85, 0.9]),
            (42.0, [700.0, 330.0, 0.9, 1.2]),
            (43.0, [900.0, 470.0, 0.9, 1.45]),
            (44.0, [1000.0, 560.0, 0.9, 1.45]),
            (45.0, [1060.0, 650.0, 0.85, 1.45]),
            (46.0, [1100.0, 720.0, 0.8, 1.45]),
            (47.0, [1140.0, 780.0, 0.7, 1.45]),
            (48.0, [1180.0, 830.0, 0.55, 1.45]),
            (49.0, [1220.0, 880.0, 0.3, 1.45]),
            (50.0, [1260.0, 930.0, 0.1, 1.45]),
            (50.5, [1280.0, 960.0, 0.0, 1.45]),
        ],
    );
    let [c0, c1, c2] = hex3(kit::pal().frost);
    let layer = DOTS.draw(frame, ShaderUniforms::new().float4("uRing", r[0], r[1], r[2], r[3]).float2("uCenter", cx, cy).float3("uColor", c0, c1, c2));
    fframes::svgr!(<image href={layer.href()} x="0" y="0" width="1280" height="720" />)
}

// ── the scene ────────────────────────────────────────────────────────────────────────────

pub fn render<'a>(p: P<'a>, tm: &T, frame: &mut Frame, ctx: &FFramesContext<'a, '_>) -> Svgr<'a> {
    let bg = kit::bg(frame, &kit::backdrop(p, tm, "sky"));
    let ln = Line::from(p, "words");
    let pill_on = p.b("pill", true);
    let exit = p.s("exit", if pill_on { "window" } else { "blur" });
    // reference shot: entrance 0-27, settled 27-31, hand-over 31-47
    let f = vframe(tm, 0.0, 27.0, 31.0, 47.0);
    let (hold, out) = match exit {
        // hand over to a window: the full push-in, glass turn and lift
        "window" => (None, (0.0, 0.0)),
        // stay settled (slight push-in) and blur away over the last 0.24 s
        "blur" => {
            let left = tm.x();
            let k = clamp01(1.0 - left / 0.24);
            (Some(35.0), (10.0 * kit::ease_in(k), smooth(seg(k, 0.3, 1.0))))
        }
        _ => (Some(31.0), (0.0, 0.0)),
    };
    let line = draw(&ln, f, hold, out, frame, ctx, "ttw");
    let ring = if p.b("halftone", false) { halftone(frame, f, p.f("ring_x", 660.0), p.f("ring_y", 380.0)) } else { Svgr::empty() };
    let pill = if pill_on { super::window::pill(p, f, None, ctx) } else { Svgr::empty() };
    fframes::svgr!(
        <g>
            {bg}
            {pill}
            {ring}
            {line}
        </g>
    )
}

/// Drawn above the letterbox.
#[allow(dead_code)]
pub fn overlay(_p: P, _t: f32, _len: f32) -> Svgr<'static> {
    Svgr::empty()
}
