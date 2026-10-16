//! faces: cut-out portrait cards with name labels on a flat colour field. The group starts
//! huge and spread apart, then slides together while it zooms out (the reel's "Larry page /
//! Sergey brin" shot). Params: references/shots.md#faces.
//!
//! Each card shows a box of its image around an anchor point (the face), optionally rotated
//! inside the box. The default motion uses the reference's measured curves over the whole
//! shot; `keys = [[t, m, x1, y1, x2, y2, ...]]` gives the zoom multiplier `m` and every
//! card's anchor on screen exactly.
use super::photo::{draw_plate, key_at, pt, remain};
use crate::kit::{self, T};
use crate::spec::P;
use fframes::{FFramesContext, Frame, Svgr};

/// Remaining fraction of the zoom (scale 0.527 -> 0.317 on the reference, 15 ticks).
const ZOOM: [f32; 15] = [1.0, 0.748, 0.567, 0.443, 0.352, 0.267, 0.21, 0.162, 0.114, 0.086, 0.062, 0.043, 0.029, 0.01, 0.0];
/// Remaining fraction of the slide together (card anchors, 15 ticks).
const SLIDE: [f32; 15] = [1.0, 0.689, 0.501, 0.374, 0.282, 0.211, 0.161, 0.118, 0.085, 0.06, 0.04, 0.027, 0.012, 0.006, 0.0];

struct Card<'a> {
    p: P<'a>,
    image: &'a str,
    anchor: (f32, f32),
    /// box around the anchor in image px: x0, y0, x1, y1
    bx: [f32; 4],
    rot: f32,
    /// ref px per image px at the end of the shot (times the zoom multiplier `m`)
    scale: f32,
}

fn cards<'a>(p: P<'a>, ctx: &FFramesContext<'a, '_>) -> Vec<Card<'a>> {
    p.list("cards")
        .into_iter()
        .map(|c| {
            let image = c.s("image", "");
            let (iw, ih) = kit::plate(ctx, image).map(|pl| (pl.w, pl.h)).unwrap_or((400.0, 500.0));
            let anchor = pt(c, "anchor", (iw / 2.0, ih / 2.0));
            let b = c.fs("box");
            let bx = if b.len() == 4 {
                [b[0], b[1], b[2], b[3]]
            } else {
                // default: a 4:5 box filling most of the image around the anchor
                let h = ih.min(iw * 1.25) * 0.9;
                [-h * 0.4, -h * 0.5, h * 0.4, h * 0.5]
            };
            let scale = c.f("scale", p.f("card_h", 184.0) / (bx[3] - bx[1]));
            Card { p: c, image, anchor, bx, rot: c.f("rotate", 0.0), scale }
        })
        .collect()
}

/// One card: plate with `anchor` at screen (px, py), scale `s`, clipped to its box.
fn card<'a>(ctx: &FFramesContext<'a, '_>, id: String, c: &Card<'a>, px: f32, py: f32, s: f32) -> Svgr<'a> {
    let b = c.bx;
    let (x, y, w, h) = (px + b[0] * s, py + b[1] * s, (b[2] - b[0]) * s, (b[3] - b[1]) * s);
    let clip = format!("url(#{id})");
    fframes::svgr!(<g>
        <clipPath id={id}><rect x={x} y={y} width={w} height={h} /></clipPath>
        <g clip-path={clip}>{draw_plate(ctx, c.image, c.anchor.0, c.anchor.1, px, py, s, c.rot)}</g>
    </g>)
}

/// A label in the reel's caption face, centred at `cx`; `size` in ref px.
fn label<'a>(cx: f32, baseline: f32, size: f32, color: &'a str, text: &str) -> Svgr<'a> {
    let tf = format!("translate({cx:.2} {baseline:.2}) scale(1.1 1)");
    fframes::svgr!(<g transform={tf}>
        {kit::serif_ls(0.0, 0.0, size, 0.4 * size / 56.0, 0.02, color, "middle", "cap", text.to_string())}
    </g>)
}

pub fn render<'a>(p: P<'a>, tm: &T, _frame: &mut Frame, ctx: &FFramesContext<'a, '_>) -> Svgr<'a> {
    let cs = cards(p, ctx);
    let n = cs.len();
    if n == 0 {
        return kit::fill(p.s("field", "#960a09"));
    }
    // end layout: a row of cards centred on `at`, staggered up/down
    let (ax, ay) = pt(p, "at", (356.0, 628.0));
    let gap = p.f("gap", 8.0);
    let stagger = p.f("stagger", 29.0);
    let mut order: Vec<usize> = (0..n).collect();
    order.sort_by_key(|&i| cs[i].p.i("slot", i as i64));
    let widths: Vec<f32> = cs.iter().map(|c| (c.bx[2] - c.bx[0]) * c.scale).collect();
    let total: f32 = widths.iter().sum::<f32>() + gap * (n as f32 - 1.0);
    let mut ends = vec![(0.0, 0.0); n];
    let mut left = ax - total / 2.0;
    for (slot, &i) in order.iter().enumerate() {
        let c = &cs[i];
        let ccx = left + widths[i] / 2.0;
        let ccy = ay + if n == 1 { 0.0 } else if slot % 2 == 0 { -stagger } else { stagger };
        // anchor = card centre minus the box centre (in screen px)
        ends[i] = (ccx - (c.bx[0] + c.bx[2]) / 2.0 * c.scale, ccy - (c.bx[1] + c.bx[3]) / 2.0 * c.scale);
        left += widths[i] + gap;
    }
    // default motion: zoom from `zoom_from`, anchors spread out from the group centre
    let k = tm.tick as f32;
    let ticks = p.f("ticks", tm.len.max(2) as f32 - 1.0);
    let (spx, spy) = pt(p, "spread", (4.4, 1.7));
    let m0 = 1.0 + (p.f("zoom_from", 1.66) - 1.0) * remain(&ZOOM, k, ticks);
    let r = remain(&SLIDE, k, ticks);
    let mut dflt = vec![m0];
    for e in &ends {
        dflt.push(e.0 + (e.0 - ax) * (spx - 1.0) * r);
        dflt.push(e.1 + (e.1 - ay) * (spy - 1.0) * r);
    }
    let rows = p.rows("keys");
    let v = if rows.is_empty() { dflt } else { key_at(&rows, tm.t, &dflt) };
    let m = v[0];

    let color = p.s("label_color", "#ebe7df");
    let mut parts: Vec<Svgr> = Vec::new();
    for (i, c) in cs.iter().enumerate() {
        let (px, py) = (v[1 + 2 * i], v[2 + 2 * i]);
        let s = c.scale * m;
        parts.push(card(ctx, format!("faces_card{i}"), c, px, py, s));
        let text = c.p.s("label", "");
        if text.is_empty() {
            continue;
        }
        let b = c.bx;
        let (lx, ly, lsize) = if c.p.has("label_at") {
            // exact: offset from the anchor and size in image px (scale with the card)
            let (dx, dy) = pt(c.p, "label_at", (0.0, 0.0));
            (px + dx * s, py + dy * s, c.p.f("label_size", 72.0) * s)
        } else {
            let size = c.p.f("label_size", 24.0) * m;
            let cx = px + (b[0] + b[2]) / 2.0 * s;
            let y = if c.p.s("label_pos", "below") == "above" { py + b[1] * s - 0.3 * size } else { py + b[3] * s + 1.17 * size };
            (cx, y, size)
        };
        parts.push(label(lx, ly, lsize, color, text));
    }
    fframes::svgr!(<g>
        {kit::fill(p.s("field", "#960a09"))}
        {parts}
    </g>)
}

pub fn look(_p: P) -> (f32, f32) {
    (1.0, 1.0)
}
