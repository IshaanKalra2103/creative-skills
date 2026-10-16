//! tunnel: thumbnails ("millions of websites") rushing at the camera down a corridor: a
//! ray-cast swarm of small pages on depth slices with a dark band down the vanishing line,
//! plus a near wall of bigger tiles at the top right. The first ticks arrive zoom-blurred
//! (the hand-over from the previous shot). Stock footage in the reference, rebuilt as a
//! shader; the defaults are tuned to its framing and density. Params: references/shots.md#tunnel.
use crate::kit::{self, T};
use crate::spec::P;
use fframes::{FFramesContext, Frame, Shader, ShaderUniforms, Svgr};
use std::sync::LazyLock;

static WALLS: LazyLock<Shader> = LazyLock::new(|| Shader::sksl(include_str!("../shaders/tunnel_walls.sksl")));

/// The reference's thumbnail accents (blue, red, teal, violet, slate) as linear-ish floats.
const PALETTE: [[f32; 3]; 5] = [[0.26, 0.26, 0.66], [0.80, 0.24, 0.30], [0.36, 0.74, 0.76], [0.52, 0.40, 0.74], [0.45, 0.47, 0.52]];

fn hex3(h: &str) -> Option<[f32; 3]> {
    let h = h.trim_start_matches('#');
    if h.len() != 6 {
        return None;
    }
    let c = |i: usize| u8::from_str_radix(&h[i..i + 2], 16).ok().map(|v| v as f32 / 255.0);
    Some([c(0)?, c(2)?, c(4)?])
}

pub fn render<'a>(p: P<'a>, tm: &T, frame: &mut Frame, ctx: &FFramesContext<'a, '_>) -> Svgr<'a> {
    let k = tm.tick as f32;
    // zoom blur on the first ticks (the cut arrives blurred); `blur_in = []` turns it off
    let blur_in = if p.has("blur_in") { p.fs("blur_in") } else { vec![1.6, 0.6] };
    let blur = blur_in.get(tm.tick.max(0) as usize).copied().unwrap_or(0.0);
    let pal: Vec<[f32; 3]> = p.strs("palette").iter().filter_map(|h| hex3(h)).collect();
    let c = |i: usize| -> [f32; 3] { if pal.is_empty() { PALETTE[i] } else { pal[i % pal.len()] } };
    let vp = p.fs("vp");
    let (vx, vy) = if vp.len() == 2 { (vp[0], vp[1]) } else { (348.0, 560.0) };
    let mut u = ShaderUniforms::new()
        .float("uCamZ", p.f("cam_start", 40.0) + k * p.f("speed", 1.1))
        .float("uBlur", blur)
        .float2("uVP", vx, vy)
        .float("uFocal", p.f("focal", 520.0))
        .float("uWallR", p.f("wall_distance", 10.0))
        .float("uBand", p.f("band", 0.05))
        .float("uDensity", p.f("density", 0.11))
        .float("uGain", p.f("gain", 1.25))
        .float("uWall", if p.b("wall", true) { 1.0 } else { 0.0 })
        .float("uGrey", p.f("grey_share", 0.55).clamp(0.0, 0.95));
    for (i, name) in ["uC1", "uC2", "uC3", "uC4", "uC5"].into_iter().enumerate() {
        let [r, g, b] = c(i);
        u = u.float3(name, r, g, b);
    }
    let layer = WALLS.draw(frame, u);
    let soft = if p.b("soften", true) { "url(#b2)" } else { "" };
    let caption = match p.opt("caption") {
        Some(text) => caption(p, frame, ctx, tm, text),
        None => Svgr::empty(),
    };
    fframes::svgr!(<g>
        <rect x="-10" y="-10" width="740" height="1300" fill={p.s("bg", "#030303")} />
        <g filter={soft}>
            <image href={layer.href()} x="0" y="0" width="720" height="1280" />
        </g>
        {caption}
    </g>)
}

/// Optional caption: white serif with the `cap` halo, centred; `caption_type = true` types it
/// on one letter per tick.
fn caption<'a>(p: P<'a>, _frame: &mut Frame, _ctx: &FFramesContext<'a, '_>, tm: &T, text: &'a str) -> Svgr<'a> {
    let n = if p.b("caption_type", false) { (tm.tick + 1).max(0) as usize } else { usize::MAX };
    let shown = kit::prefix(text, n);
    let size = p.f("caption_size", 44.0);
    let y = p.f("caption_y", 656.0);
    kit::serif(360.0, y, size, 0.4, p.s("caption_color", "#e9eef0"), "middle", "cap", shown)
}

pub fn look(_p: P) -> (f32, f32) {
    (1.0, 1.0)
}
