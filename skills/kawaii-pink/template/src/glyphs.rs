//! A bubble-graffiti alphabet built from fat round-capped strokes.
//!
//! Design space: baseline y=0, cap height about 185, up is -y, x from 0 to `width`.
//! A letter is drawn as two passes of the same strokes: ink at `w + 2*LINE`, then paper at
//! `w`. Strokes of one letter merge into one bubble; a stroke with `seam: true` starts a new
//! outlined part drawn on top (crossbars, bowls, the second arm of K), which is what keeps
//! fat letters readable. Stroke order is the draw-on order.
//!
//! Keep slits open: two parallel strokes `d` apart show a gap only if
//! `d > (w1 + w2) / 2 + 2 * LINE` (LINE = 14). Ring counters need `r > w / 2 + LINE + 6`.
use crate::geom::{Pt, lerp, smooth};
use std::f32::consts::TAU;

pub struct GStroke {
    pub pts: Vec<Pt>,
    pub w: f32,
    pub seam: bool,
}

pub struct Glyph {
    pub strokes: Vec<GStroke>,
    /// skeleton extent in x; the next letter starts `width + GAP` further
    pub width: f32,
    /// a filled star dotting the letter (centre, radius)
    pub dot: Option<(Pt, f32)>,
}

/// Distance between one letter's skeleton end and the next one's start. Outlines overlap.
pub const GAP: f32 = 60.0;

fn c(ctrl: &[Pt]) -> Vec<Pt> {
    smooth(ctrl, false, 14)
}
fn ring(cx: f32, cy: f32, rx: f32, ry: f32) -> Vec<Pt> {
    let ctrl: Vec<Pt> = (0..10)
        .map(|k| {
            let a = -1.7 - TAU * k as f32 / 10.0;
            (cx + rx * a.cos(), cy + ry * a.sin())
        })
        .collect();
    let mut p = smooth(&ctrl, true, 10);
    p.push(p[0]);
    p
}
fn arc(cx: f32, cy: f32, r: f32, from: f32, to: f32) -> Vec<Pt> {
    let ctrl: Vec<Pt> = (0..=8)
        .map(|k| {
            let a = lerp(from, to, k as f32 / 8.0).to_radians();
            (cx + r * a.cos(), cy + r * a.sin())
        })
        .collect();
    smooth(&ctrl, false, 10)
}
fn arc_end(cx: f32, cy: f32, r: f32, deg: f32) -> Pt {
    let a = deg.to_radians();
    (cx + r * a.cos() - 2.0, cy + r * a.sin())
}
/// A ball: two points half a pixel apart, the round cap makes the circle.
fn ball(p: Pt) -> Vec<Pt> {
    vec![p, (p.0 + 0.5, p.1)]
}
fn s(pts: Vec<Pt>, w: f32) -> GStroke {
    GStroke { pts, w, seam: false }
}
fn seam(pts: Vec<Pt>, w: f32) -> GStroke {
    GStroke { pts, w, seam: true }
}
/// A counter: a tiny seam stroke shows as an outlined pill inside a merged letter.
fn hole(a: Pt, b: Pt, w: f32) -> GStroke {
    GStroke { pts: vec![a, b], w, seam: true }
}
fn g(width: f32, strokes: Vec<GStroke>) -> Glyph {
    Glyph { strokes, width, dot: None }
}

pub fn glyph(ch: char) -> Option<Glyph> {
    let stem = |x: f32| c(&[(x, 0.0), (x - 2.0, -92.0), (x, -185.0)]);
    Some(match ch.to_ascii_uppercase() {
        'A' => g(128.0, vec![
            s(c(&[(0.0, 0.0), (28.0, -95.0), (62.0, -186.0)]), 74.0),
            s(c(&[(62.0, -186.0), (96.0, -95.0), (128.0, 0.0)]), 76.0),
            hole((63.0, -122.0), (63.5, -104.0), 9.0),
        ]),
        'B' => g(98.0, vec![
            s(stem(0.0), 76.0),
            s(c(&[(4.0, -183.0), (64.0, -180.0), (84.0, -142.0), (56.0, -104.0), (8.0, -98.0)]), 62.0),
            s(c(&[(8.0, -98.0), (78.0, -94.0), (100.0, -48.0), (72.0, -4.0), (4.0, 0.0)]), 66.0),
            hole((36.0, -146.0), (40.0, -138.0), 8.0),
            hole((40.0, -54.0), (46.0, -44.0), 10.0),
        ]),
        'C' => {
            let (cx, cy, r) = (70.0, -90.0, 70.0);
            g(128.0, vec![
                s(arc(cx, cy, r, -58.0, -302.0), 72.0),
                s(ball(arc_end(cx, cy, r, -58.0)), 80.0),
                s(ball(arc_end(cx, cy, r, 58.0)), 80.0),
            ])
        }
        'D' => g(112.0, vec![
            s(stem(0.0), 76.0),
            s(c(&[(4.0, -185.0), (80.0, -176.0), (114.0, -95.0), (82.0, -10.0), (4.0, 0.0)]), 70.0),
            hole((48.0, -124.0), (50.0, -64.0), 12.0),
        ]),
        'E' => g(100.0, vec![
            s(stem(0.0), 76.0),
            s(c(&[(6.0, -182.0), (98.0, -187.0)]), 48.0),
            s(c(&[(6.0, -94.0), (80.0, -96.0)]), 44.0),
            s(c(&[(6.0, -2.0), (100.0, 2.0)]), 50.0),
        ]),
        'F' => g(98.0, vec![
            s(stem(0.0), 76.0),
            s(c(&[(6.0, -182.0), (98.0, -187.0)]), 50.0),
            s(c(&[(6.0, -96.0), (80.0, -97.0)]), 46.0),
        ]),
        'G' => {
            let (cx, cy, r) = (70.0, -90.0, 70.0);
            g(132.0, vec![
                s(arc(cx, cy, r, -48.0, -318.0), 70.0),
                s(ball(arc_end(cx, cy, r, -48.0)), 78.0),
                seam(c(&[(84.0, -78.0), (128.0, -78.0), (130.0, -30.0)]), 50.0),
            ])
        }
        'H' => g(128.0, vec![
            s(c(&[(0.0, 2.0), (-6.0, -96.0), (4.0, -182.0)]), 78.0),
            seam(c(&[(16.0, -88.0), (66.0, -94.0), (118.0, -98.0)]), 58.0),
            s(c(&[(128.0, 6.0), (134.0, -100.0), (124.0, -204.0)]), 80.0),
        ]),
        // short stem, a star for a dot
        'I' => Glyph {
            strokes: vec![s(c(&[(0.0, 4.0), (4.0, -60.0), (2.0, -118.0)]), 78.0)],
            width: 4.0,
            dot: Some(((14.0, -196.0), 30.0)),
        },
        'J' => g(94.0, vec![s(c(&[(92.0, -186.0), (94.0, -80.0), (70.0, -8.0), (22.0, -6.0), (0.0, -42.0)]), 74.0)]),
        'K' => g(118.0, vec![
            s(stem(0.0), 76.0),
            s(c(&[(14.0, -84.0), (66.0, -136.0), (112.0, -190.0)]), 60.0),
            seam(c(&[(36.0, -100.0), (80.0, -50.0), (118.0, 0.0)]), 68.0),
        ]),
        'L' => g(104.0, vec![
            s(c(&[(0.0, -186.0), (-2.0, -90.0), (4.0, 0.0)]), 78.0),
            s(c(&[(4.0, 0.0), (104.0, 2.0)]), 66.0),
        ]),
        // fat legs, a deep V, a bulb on each foot
        'M' => g(150.0, vec![
            s(c(&[(0.0, 0.0), (-4.0, -80.0), (10.0, -168.0)]), 84.0),
            s(c(&[(10.0, -168.0), (44.0, -112.0), (72.0, -76.0)]), 62.0),
            s(c(&[(72.0, -76.0), (100.0, -124.0), (132.0, -178.0)]), 64.0),
            s(c(&[(132.0, -178.0), (148.0, -92.0), (146.0, 0.0)]), 86.0),
            s(ball((-6.0, -8.0)), 100.0),
            s(ball((150.0, -6.0)), 98.0),
        ]),
        'N' => g(122.0, vec![
            s(c(&[(0.0, 0.0), (-2.0, -92.0), (0.0, -186.0)]), 74.0),
            seam(c(&[(0.0, -186.0), (60.0, -92.0), (122.0, 0.0)]), 62.0),
            s(c(&[(122.0, 0.0), (124.0, -92.0), (122.0, -186.0)]), 74.0),
        ]),
        'O' => g(120.0, vec![s(ring(60.0, -86.0, 57.0, 63.0), 68.0)]),
        'P' => g(98.0, vec![
            s(stem(0.0), 76.0),
            s(c(&[(4.0, -183.0), (72.0, -178.0), (98.0, -136.0), (70.0, -96.0), (6.0, -90.0)]), 64.0),
            hole((40.0, -144.0), (46.0, -134.0), 9.0),
        ]),
        'Q' => g(130.0, vec![
            s(ring(60.0, -86.0, 57.0, 63.0), 68.0),
            seam(c(&[(80.0, -38.0), (132.0, 8.0)]), 50.0),
        ]),
        'R' => g(106.0, vec![
            s(stem(0.0), 76.0),
            s(c(&[(4.0, -183.0), (72.0, -178.0), (98.0, -136.0), (70.0, -96.0), (6.0, -90.0)]), 64.0),
            hole((40.0, -144.0), (46.0, -134.0), 9.0),
            seam(c(&[(34.0, -92.0), (78.0, -46.0), (106.0, 0.0)]), 70.0),
        ]),
        'S' => g(104.0, vec![s(c(&[
            (100.0, -158.0), (62.0, -190.0), (10.0, -172.0), (12.0, -122.0), (56.0, -98.0),
            (100.0, -64.0), (88.0, -12.0), (40.0, 2.0), (0.0, -26.0),
        ]), 64.0)]),
        'T' => g(136.0, vec![
            s(c(&[(0.0, -180.0), (68.0, -186.0), (136.0, -182.0)]), 62.0),
            seam(c(&[(68.0, -176.0), (66.0, -90.0), (70.0, 0.0)]), 76.0),
        ]),
        'U' => g(118.0, vec![s(c(&[(0.0, -186.0), (-2.0, -70.0), (30.0, -4.0), (88.0, -4.0), (118.0, -70.0), (118.0, -186.0)]), 74.0)]),
        'V' => g(124.0, vec![
            s(c(&[(0.0, -186.0), (32.0, -80.0), (62.0, 0.0)]), 72.0),
            s(c(&[(62.0, 0.0), (94.0, -90.0), (124.0, -186.0)]), 70.0),
        ]),
        'W' => g(176.0, vec![
            s(c(&[(0.0, -186.0), (18.0, -90.0), (38.0, 0.0)]), 64.0),
            s(c(&[(38.0, 0.0), (62.0, -60.0), (88.0, -116.0)]), 58.0),
            s(c(&[(88.0, -116.0), (112.0, -60.0), (138.0, 0.0)]), 58.0),
            s(c(&[(138.0, 0.0), (158.0, -90.0), (176.0, -186.0)]), 64.0),
        ]),
        'X' => g(118.0, vec![
            s(c(&[(0.0, -186.0), (58.0, -92.0), (118.0, 0.0)]), 70.0),
            seam(c(&[(118.0, -186.0), (58.0, -92.0), (0.0, 0.0)]), 66.0),
        ]),
        'Y' => g(122.0, vec![
            s(c(&[(0.0, -186.0), (30.0, -130.0), (60.0, -90.0)]), 66.0),
            s(c(&[(122.0, -186.0), (90.0, -130.0), (60.0, -90.0), (58.0, 0.0)]), 74.0),
        ]),
        'Z' => g(114.0, vec![
            s(c(&[(0.0, -180.0), (108.0, -184.0)]), 60.0),
            s(c(&[(108.0, -184.0), (54.0, -92.0), (0.0, 0.0)]), 62.0),
            s(c(&[(0.0, 0.0), (114.0, 2.0)]), 62.0),
        ]),
        '!' => Glyph {
            strokes: vec![s(c(&[(0.0, -186.0), (2.0, -110.0), (0.0, -60.0)]), 70.0)],
            width: 4.0,
            dot: Some(((0.0, 6.0), 24.0)),
        },
        ' ' => g(20.0, vec![]),
        _ => return None,
    })
}
