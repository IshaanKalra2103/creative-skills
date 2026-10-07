//! Points, easing, splines and SVG path helpers. Everything in the video is a point list.
use fframes::Svgr;
use std::fmt::Write as _;

pub type Pt = (f32, f32);

pub fn clamp01(x: f32) -> f32 {
    x.clamp(0.0, 1.0)
}
/// 0 before `a`, 1 after `b`, linear between.
pub fn seg(t: f32, a: f32, b: f32) -> f32 {
    clamp01((t - a) / (b - a))
}
pub fn lerp(a: f32, b: f32, k: f32) -> f32 {
    a + (b - a) * k
}
pub fn lerp2(a: Pt, b: Pt, k: f32) -> Pt {
    (lerp(a.0, b.0, k), lerp(a.1, b.1, k))
}
pub fn ease_out(x: f32) -> f32 {
    1.0 - (1.0 - x).powi(3)
}
pub fn ease_in(x: f32) -> f32 {
    x * x * x
}
pub fn ease_in_out(x: f32) -> f32 {
    if x < 0.5 { 4.0 * x * x * x } else { 1.0 - (-2.0 * x + 2.0).powi(3) / 2.0 }
}
pub fn expo_out(x: f32) -> f32 {
    if x >= 1.0 { 1.0 } else { 1.0 - 2f32.powf(-10.0 * x) }
}
/// Damped spring 0 -> 1, `x` seconds after it starts (overshoots).
pub fn spring(x: f32, freq: f32, damp: f32) -> f32 {
    if x <= 0.0 { 0.0 } else { 1.0 - (-damp * x).exp() * (freq * x).cos() }
}
/// Damped oscillation that starts at 1 and dies out (0 before it starts).
pub fn wobble(x: f32, freq: f32, damp: f32) -> f32 {
    if x < 0.0 { 0.0 } else { (-damp * x).exp() * (freq * x).cos() }
}
pub fn rot(p: Pt, a: f32) -> Pt {
    let (s, c) = a.sin_cos();
    (p.0 * c - p.1 * s, p.0 * s + p.1 * c)
}
pub fn dist(a: Pt, b: Pt) -> f32 {
    ((a.0 - b.0).powi(2) + (a.1 - b.1).powi(2)).sqrt()
}
pub fn add(a: Pt, b: Pt) -> Pt {
    (a.0 + b.0, a.1 + b.1)
}
pub fn sub(a: Pt, b: Pt) -> Pt {
    (a.0 - b.0, a.1 - b.1)
}
pub fn mul(a: Pt, k: f32) -> Pt {
    (a.0 * k, a.1 * k)
}

/// Catmull-Rom through the control points, `per` samples per span.
pub fn smooth(ctrl: &[Pt], closed: bool, per: usize) -> Vec<Pt> {
    let n = ctrl.len() as isize;
    let get = |i: isize| -> Pt {
        if closed { ctrl[i.rem_euclid(n) as usize] } else { ctrl[i.clamp(0, n - 1) as usize] }
    };
    let spans = if closed { n } else { n - 1 };
    let mut out = Vec::with_capacity(spans as usize * per + 1);
    for i in 0..spans {
        let (p0, p1, p2, p3) = (get(i - 1), get(i), get(i + 1), get(i + 2));
        for k in 0..per {
            let u = k as f32 / per as f32;
            let (u2, u3) = (u * u, u * u * u);
            let f = |a: f32, b: f32, c: f32, d: f32| {
                0.5 * (2.0 * b + (-a + c) * u + (2.0 * a - 5.0 * b + 4.0 * c - d) * u2 + (-a + 3.0 * b - 3.0 * c + d) * u3)
            };
            out.push((f(p0.0, p1.0, p2.0, p3.0), f(p0.1, p1.1, p2.1, p3.1)));
        }
    }
    if !closed {
        out.push(ctrl[ctrl.len() - 1]);
    }
    out
}

pub fn polylen(pts: &[Pt]) -> f32 {
    pts.windows(2).map(|w| dist(w[0], w[1])).sum()
}

/// The first `len` pixels of a polyline.
pub fn partial(pts: &[Pt], len: f32) -> Vec<Pt> {
    let mut out = vec![pts[0]];
    let mut left = len;
    for w in pts.windows(2) {
        let d = dist(w[0], w[1]);
        if d >= left {
            out.push(lerp2(w[0], w[1], if d > 0.0 { left / d } else { 0.0 }));
            return out;
        }
        left -= d;
        out.push(w[1]);
    }
    out
}

pub fn path_d(pts: &[Pt], closed: bool) -> String {
    let mut s = String::with_capacity(pts.len() * 14);
    for (i, (x, y)) in pts.iter().enumerate() {
        let _ = write!(s, "{}{x:.1} {y:.1}", if i == 0 { "M" } else { "L" });
    }
    if closed {
        s.push('Z');
    }
    s
}

/// A round-capped stroke along the points.
pub fn line(pts: &[Pt], color: &'static str, width: f32) -> Svgr<'static> {
    if pts.len() < 2 || width <= 0.2 {
        return Svgr::empty();
    }
    fframes::svgr!(<path d={path_d(pts, false)} fill="none" stroke={color} stroke-width={width}
        stroke-linecap="round" stroke-linejoin="round" />)
}

/// A closed, filled and outlined shape.
pub fn shape(pts: &[Pt], fill: &'static str, stroke: &'static str, width: f32) -> Svgr<'static> {
    if pts.len() < 3 {
        return Svgr::empty();
    }
    fframes::svgr!(<path d={path_d(pts, true)} fill={fill} stroke={stroke} stroke-width={width.max(0.5)}
        stroke-linejoin="round" />)
}
