//! frame_card: a framed photo on a flat field that slides in from the right, settles, then
//! grows toward the camera, with a big name caption near its bottom edge (the reel's
//! "Nightmare" card). Params: references/shots.md#frame_card.
//!
//! Motion defaults are the reference's measured card centre and height per tick (9 ticks),
//! stretched over the shot; `keys = [[t, cx, cy, h], ...]` replaces them.
use super::photo::{self, key_at, name_caption, name_width, pt};
use crate::kit::{self, T};
use crate::spec::P;
use fframes::{FFramesContext, Frame, Svgr};

/// Card centre x, centre y and height per tick, measured (final centre 362, 638; height 378
/// while sliding, 484 at the end).
const CX: [f32; 9] = [594.5, 495.3, 446.9, 416.5, 390.9, 379.2, 369.1, 367.6, 362.0];
const CY: [f32; 9] = [640.0, 638.0, 638.0, 638.0, 637.0, 639.0, 640.0, 639.0, 638.0];
const HT: [f32; 9] = [380.0, 376.0, 378.0, 380.0, 378.0, 386.0, 396.0, 426.0, 484.0];

fn table(t: &[f32; 9], u: f32) -> f32 {
    let f = kit::clamp01(u) * 8.0;
    let i = f.floor() as usize;
    kit::lerp(t[i], t[(i + 1).min(8)], f - i as f32)
}

pub fn render<'a>(p: P<'a>, tm: &T, frame: &mut Frame, ctx: &FFramesContext<'a, '_>) -> Svgr<'a> {
    let name = photo::plate_name(p, tm.tick);
    let aspect = kit::plate(ctx, name).map(|pl| pl.w / pl.h).unwrap_or(1.571);
    // default motion, stretched over the shot and re-anchored on `at` / `height`
    let u = if tm.len <= 1 { 1.0 } else { tm.tick as f32 / (tm.len - 1) as f32 };
    let (ex, ey) = pt(p, "at", (362.0, 638.0));
    let hk = p.f("height", 378.0) / 378.0;
    let dflt = [table(&CX, u) - 362.0 + ex, table(&CY, u) - 638.0 + ey, table(&HT, u) * hk];
    let rows = p.rows("keys");
    let v = if rows.is_empty() { dflt.to_vec() } else { key_at(&rows, tm.t, &dflt) };
    let (cx, cy, h) = (v[0], v[1], v[2]);
    let w = h * aspect;
    let (x, y) = (cx - w / 2.0, cy - h / 2.0);

    let border = p.f("border", 2.5);
    let frame_rect = if border > 0.0 {
        fframes::svgr!(<rect x={x} y={y} width={w} height={h} fill="none" stroke={p.s("border_color", "#26231f")} stroke-width={border} />)
    } else {
        Svgr::empty()
    };
    let img = match kit::plate(ctx, name) {
        Some(pl) => fframes::svgr!(<image href={pl.href} x={x} y={y} width={w} height={h} preserveAspectRatio="xMidYMid slice" />),
        None => fframes::svgr!(<rect x={x} y={y} width={w} height={h} fill="#ff00ff" />),
    };

    // caption: name style, centred on the card, baseline at 93.4% of its height
    let text = p.s("caption", "");
    let cap = if text.is_empty() {
        Svgr::empty()
    } else {
        let k = h / 378.0;
        let size = p.f("caption_size", 62.0) * k;
        let tw = name_width(frame, ctx, size, text);
        name_caption(cx - tw / 2.0, y + p.f("caption_y", 0.934) * h, size, p.s("caption_color", "#ebe7df"), text)
    };
    fframes::svgr!(<g>
        {kit::fill(p.s("bg", "#dedede"))}
        {img}
        {frame_rect}
        {cap}
    </g>)
}

pub fn look(_p: P) -> (f32, f32) {
    (1.0, 0.0)
}
