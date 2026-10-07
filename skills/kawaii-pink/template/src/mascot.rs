//! The mascot: an original mochi dough blob with a leaf sprout, dot eyes and hatched blush.
//! Swap the body function and the face kit for your own character (see
//! references/mascots.md); keep the state fields, the beats drive them.
use crate::geom::*;
use crate::Pal;
use fframes::Svgr;
use std::f32::consts::{PI, TAU};

#[derive(Default, Clone, Copy)]
pub struct Mochi {
    /// bottom centre in the frame
    pub x: f32,
    pub y: f32,
    pub s: f32,
    /// squash and stretch around the bottom
    pub sx: f32,
    pub sy: f32,
    /// -1 looks left, 1 right
    pub look: f32,
    pub blink: bool,
    /// mouth open 0..1 (the slurp)
    pub open: f32,
    /// cheeks full 0..1 (after the gulp)
    pub puff: f32,
    pub happy: bool,
    pub face: bool,
    /// sprout grown 0..1 and its sway
    pub sprout: f32,
    pub sprout_angle: f32,
}

/// Beat times the mascot shares with the rest of the film.
pub struct MochiBeats {
    /// where it sits on the word (bottom centre)
    pub sit: Pt,
    /// where it lands at the end (bottom centre)
    pub land: Pt,
    pub slurp_at: f32,
    pub gulp_at: f32,
    pub hop_at: f32,
    pub land_at: f32,
}

pub fn state(t: f32, b: &MochiBeats) -> Option<Mochi> {
    let base = Mochi { s: 1.0, sx: 1.0, sy: 1.0, face: true, sprout: 1.0, ..Default::default() };
    // 0.00-0.30 a stretched seed zips down through the frame
    if t < 0.3 {
        let k = ease_in(seg(t, 0.0, 0.3));
        return Some(Mochi { x: 440.0, y: lerp(250.0, 1350.0, k), s: 0.5, sx: 0.42, sy: 1.8 + k, sprout: 0.0, ..base });
    }
    if t < 0.62 {
        return None;
    }
    // 0.62-0.95 the seed falls onto its seat, splats, then grows a face
    if t < 0.95 {
        let k = ease_in(seg(t, 0.62, 0.95));
        return Some(Mochi { x: b.sit.0, y: lerp(-60.0, b.sit.1, k), s: 0.55, sx: 0.4, sy: 1.9, face: false, sprout: 0.0, ..base });
    }
    if t < b.hop_at {
        let w = wobble(t - 0.95, 22.0, 8.0);
        let grow = spring(t - 1.38, 17.0, 7.5);
        let mut m = Mochi {
            x: b.sit.0,
            y: b.sit.1,
            s: 0.55 + 0.45 * grow,
            sy: 1.0 - 0.55 * w,
            face: t > 1.42,
            sprout: spring(t - 1.45, 20.0, 7.0),
            ..base
        };
        m.sx = m.sy.powf(-0.8);
        // idle breathing, two blinks, a glance left
        let breath = (TAU * (t - 1.7) / 1.15).sin() * 0.022 * seg(t, 1.6, 1.8);
        m.sy *= 1.0 + breath;
        m.sx *= 1.0 - breath * 0.7;
        m.blink = (2.08..2.15).contains(&t) || (2.26..2.33).contains(&t);
        m.look = -ease_in_out(seg(t, 2.55, 2.72));
        m.sprout_angle = 0.12 * (t * 3.1).sin();
        // anticipation: squash, then stretch while the mouth opens
        let a = b.slurp_at - 0.35;
        let squash = ease_in_out(seg(t, a, a + 0.17));
        let stretch = ease_out(seg(t, a + 0.17, a + 0.33));
        let k = lerp(-0.16 * squash, 0.08, stretch);
        m.sy *= 1.0 + k;
        m.sx *= 1.0 - k * 0.8;
        m.open = ease_out(seg(t, a + 0.2, b.slurp_at + 0.02)) * (1.0 - ease_in(seg(t, b.gulp_at, b.gulp_at + 0.07)));
        m.open *= 0.92 + 0.08 * (t * 45.0).sin();
        // the slurp inflates it, with a shiver
        let fill = ease_in_out(seg(t, b.slurp_at, b.gulp_at));
        m.s *= 1.0 + 0.3 * fill;
        m.x += (t * 70.0).sin() * 2.5 * fill * (1.0 - seg(t, b.gulp_at - 0.05, b.gulp_at + 0.05));
        m.puff = seg(t, b.gulp_at, b.gulp_at + 0.06);
        m.sprout_angle -= 0.5 * fill;
        return Some(m);
    }
    // hop to the landing spot
    if t < b.land_at {
        let k = seg(t, b.hop_at, b.land_at);
        let (x, y) = lerp2(b.sit, b.land, ease_in_out(k));
        let lift = 170.0 * 4.0 * k * (1.0 - k);
        let sy = 1.0 + 0.25 * (k * PI).sin();
        return Some(Mochi {
            x,
            y: y - lift,
            s: lerp(1.3, 1.2, k),
            sy,
            sx: sy.powf(-0.8),
            look: -1.0 + k,
            puff: 1.0,
            sprout_angle: -0.6 + 0.4 * k,
            ..base
        });
    }
    // splat flat, stretch tall, settle happy (volume kept: sx = sy^-0.8)
    let w = wobble(t - b.land_at, 17.0, 5.0);
    let sy = if w > 0.0 { 1.0 - 0.6 * w } else { 1.0 - 1.15 * w };
    Some(Mochi {
        x: b.land.0,
        y: b.land.1,
        s: lerp(1.2, 1.55, ease_out(seg(t, b.land_at, b.land_at + 0.3))),
        sy,
        sx: sy.powf(-0.8),
        puff: 1.0 - seg(t, b.land_at, b.land_at + 0.08),
        happy: t > b.land_at + 0.1,
        sprout_angle: 0.7 * wobble(t - b.land_at - 0.05, 24.0, 4.5) + 0.08 * (t * 3.1).sin(),
        ..base
    })
}

/// Mouth position in the frame (the slurp target).
pub fn mouth(m: &Mochi) -> Pt {
    (m.x + m.look * 22.0 * m.s * m.sx, m.y - 42.0 * m.s * m.sy)
}

pub fn draw(m: &Mochi, pal: Pal) -> Vec<Svgr<'static>> {
    let k = m.s;
    let tf = |p: Pt| -> Pt { (m.x + p.0 * k * m.sx, m.y + p.1 * k * m.sy) };
    let mut out = Vec::new();
    let w = 11.0 * k.min(1.25);

    // body: domed top, flat sagging bottom, cheeks widen when puffed
    let body: Vec<Pt> = (0..72)
        .map(|i| {
            let th = TAU * i as f32 / 72.0;
            let (sn, c) = th.sin_cos();
            let cheeks = 1.0 + 0.14 * m.puff * (1.0 - (sn + 0.3).abs().min(1.0));
            let x = 76.0 * c * (1.0 + 0.07 * sn.max(0.0)) * cheeks;
            let y = if sn < 0.0 { -92.0 * (-sn).powf(0.85) } else { 24.0 * sn.powf(0.55) };
            tf((x, y - 24.0))
        })
        .collect();

    // sprout: a stem and two leaves on top
    if m.sprout > 0.02 {
        let base = (0.0, -112.0);
        let a = m.sprout_angle;
        let tip = add(base, rot((0.0, -24.0 * m.sprout), a));
        let mid = add(base, rot((5.0, -12.0 * m.sprout), a));
        out.push(line(&[tf(base), tf(mid), tf(tip)], pal.ink, 5.0 * k.min(1.3)));
        for side in [-1.0f32, 1.0] {
            let la = a + side * 0.95;
            let leaf: Vec<Pt> = (0..24)
                .map(|i| {
                    let th = TAU * i as f32 / 24.0;
                    let u = (1.0 - th.cos()) * 0.5 * 26.0 * m.sprout;
                    let v = th.sin() * 8.0 * m.sprout * (1.0 - th.cos()).sqrt() * 0.75;
                    tf(add(tip, rot((v, -u), la)))
                })
                .collect();
            out.push(shape(&leaf, pal.ink, pal.ink, 2.0));
        }
    }
    out.push(shape(&body, pal.paper, pal.ink, w));
    if !m.face {
        return out;
    }

    let fx = m.look * 22.0;
    let fw = 4.5 * k.min(1.3);
    for side in [-1.0f32, 1.0] {
        let (ex, ey) = (fx + side * 21.0, -62.0);
        let squint = m.open > 0.3 || m.puff > 0.5;
        if m.happy {
            // ^ ^
            out.push(line(&[tf((ex - 8.0, ey + 3.0)), tf((ex, ey - 6.0)), tf((ex + 8.0, ey + 3.0))], pal.ink, fw));
        } else if squint {
            // > <
            let d = -side;
            out.push(line(&[tf((ex - 6.0 * d, ey - 7.0)), tf((ex + 6.0 * d, ey)), tf((ex - 6.0 * d, ey + 7.0))], pal.ink, fw));
        } else if m.blink {
            out.push(line(&[tf((ex - 7.0, ey)), tf((ex + 7.0, ey))], pal.ink, fw));
        } else {
            let (cx, cy) = tf((ex, ey));
            out.push(fframes::svgr!(<ellipse cx={cx} cy={cy} rx={6.0 * k * m.sx} ry={7.5 * k * m.sy} fill={pal.ink} />));
        }
        // hatched blush
        let (bx, by) = (fx + side * 44.0, -46.0);
        for j in 0..3 {
            let x = bx + (j as f32 - 1.0) * 7.0;
            out.push(line(&[tf((x - 3.0, by + 4.5)), tf((x + 3.0, by - 4.5))], pal.ink, 3.0 * k.min(1.3)));
        }
    }
    let my = -44.0;
    if m.open > 0.02 {
        let (cx, cy) = tf((fx, my + 4.0));
        out.push(fframes::svgr!(<ellipse cx={cx} cy={cy} rx={(6.0 + 12.0 * m.open) * k * m.sx} ry={(4.0 + 17.0 * m.open) * k * m.sy} fill={pal.ink} />));
    } else if m.puff > 0.5 {
        let (cx, cy) = tf((fx, my));
        out.push(fframes::svgr!(<ellipse cx={cx} cy={cy} rx={4.5 * k * m.sx} ry={4.0 * k * m.sy} fill="none" stroke={pal.ink} stroke-width={fw * 0.8} />));
    } else if m.happy {
        let mouth = [tf((fx - 11.0, my - 2.0)), tf((fx - 5.0, my + 8.0)), tf((fx, my + 10.0)), tf((fx + 5.0, my + 8.0)), tf((fx + 11.0, my - 2.0))];
        out.push(shape(&mouth, pal.ink, pal.ink, fw * 0.6));
    } else {
        // a little "w"
        let mouth = [(fx - 10.0, my - 2.0), (fx - 5.0, my + 4.0), (fx, my), (fx + 5.0, my + 4.0), (fx + 10.0, my - 2.0)];
        let pts: Vec<Pt> = smooth(&mouth, false, 6).into_iter().map(tf).collect();
        out.push(line(&pts, pal.ink, fw * 0.8));
    }
    out
}
