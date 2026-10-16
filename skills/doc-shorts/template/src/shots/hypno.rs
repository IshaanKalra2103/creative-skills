//! hypno: "X has an idea". A zoom-blur burst, then hypnotic concentric rings with a cut-out
//! collage head zooming out of an extreme close-up and wobbling, under a caption whose last
//! words fade in. Params: references/shots.md#hypno.
//!
//! The rings are logarithmic (each band 1.28x the last, measured on the reference) and flow
//! inward. `stages` picks the one-tick lead-ins (burst, spiral, cone, close) before the
//! settle; the settle's face positions and ring phases are the reference's, per tick.
use crate::kit::{self, T};
use crate::spec::P;
use fframes::{FFramesContext, Frame, Svgr};

const Q: f32 = 1.28;
const DUTY: f32 = 0.36;

/// Colours and the head plate for one render.
struct Look<'a> {
    yellow: &'a str,
    image: &'a str,
    /// plate size in ref px at scale 1 (height = `face_h`)
    pw: f32,
    ph: f32,
}

/// Yellow log-ring bands around (cx, cy) with phase `phi`, out to `r_max`.
fn rings<'a>(lk: &Look<'a>, cx: f32, cy: f32, phi: f32, r_max: f32) -> Svgr<'a> {
    let lq = Q.ln();
    let n0 = (2.0f32.ln() / lq).floor() as i32;
    let n1 = (r_max.max(2.0).ln() / lq).ceil() as i32 + 1;
    let bands: Vec<Svgr> = (n0..=n1)
        .filter_map(|n| {
            let a = Q.powf(n as f32 + phi);
            let b = Q.powf(n as f32 + phi + DUTY).min(r_max);
            if b <= a || a > r_max {
                return None;
            }
            let r = (a + b) / 2.0;
            let w = b - a;
            Some(fframes::svgr!(<circle cx={cx} cy={cy} r={r} fill="none" stroke={lk.yellow} stroke-width={w} />))
        })
        .collect();
    fframes::svgr!(<g>{bands}</g>)
}

/// Explicit yellow bands (inner, outer radius) measured on a tick, continued inward by log
/// rings below the first one.
fn bands<'a>(lk: &Look<'a>, cx: f32, cy: f32, list: &[(f32, f32)]) -> Svgr<'a> {
    let mut all: Vec<(f32, f32)> = Vec::new();
    let (mut a, mut b) = list[0];
    while a > 3.0 {
        a /= Q;
        b /= Q;
        all.push((a, b));
    }
    all.extend_from_slice(list);
    let rings: Vec<Svgr> = all
        .iter()
        .map(|(a, b)| {
            let r = (a + b) / 2.0;
            let w = b - a;
            fframes::svgr!(<circle cx={cx} cy={cy} r={r} fill="none" stroke={lk.yellow} stroke-width={w} />)
        })
        .collect();
    fframes::svgr!(<g>{rings}</g>)
}

/// The broad yellow arm that swirls out of the tiny spiral into the cone (tick 121).
fn arm<'a>(lk: &Look<'a>, cx: f32, cy: f32) -> Svgr<'a> {
    let pts: Vec<String> = (0..=60)
        .map(|i| {
            // from below-right, clockwise over the top, growing outward
            let u = i as f32 / 60.0;
            let th = (70.0 - 330.0 * u).to_radians();
            let r = 28.0 * 2f32.powf(u * 0.9);
            format!("{:.1},{:.1}", cx + r * th.cos(), cy + r * th.sin())
        })
        .collect();
    fframes::svgr!(<polyline points={pts.join(" ")} fill="none" stroke={lk.yellow} stroke-width="17" stroke-linecap="round" />)
}

/// The face collage, scaled (sx, sy) and rotated (deg) about its centre, centre at (cx, cy).
#[allow(clippy::too_many_arguments)]
fn face<'a>(ctx: &FFramesContext<'a, '_>, lk: &Look<'a>, cx: f32, cy: f32, sx: f32, sy: f32, rot: f32) -> Svgr<'a> {
    let Some(p) = kit::plate(ctx, lk.image) else {
        return fframes::svgr!(<rect x="0" y="0" width="720" height="1280" fill="#ff00ff" />);
    };
    let (pw, ph) = (lk.pw, lk.ph);
    let t = format!("translate({cx:.2} {cy:.2}) rotate({rot:.2}) scale({sx:.4} {sy:.4}) translate({:.1} {:.1})", -pw / 2.0, -ph / 2.0);
    fframes::svgr!(<g transform={t}>
        <image href={p.href} x="0" y="0" width={pw} height={ph} preserveAspectRatio="none" />
    </g>)
}

/// The face collage seen in perspective (camera close to the chin, flying out): drawn as
/// horizontal strips whose scale grows linearly from the top of the plate to the bottom.
/// Plate point (`ax`, 0) lands at (`sx0`, `sy0`); `drift` shifts the anchor by the bottom.
#[allow(clippy::too_many_arguments)]
fn face_persp<'a>(ctx: &FFramesContext<'a, '_>, lk: &Look<'a>, ax: f32, sx0: f32, sy0: f32, kx: (f32, f32), ky: (f32, f32), drift: f32) -> Svgr<'a> {
    let Some(p) = kit::plate(ctx, lk.image) else {
        return fframes::svgr!(<rect x="0" y="0" width="720" height="1280" fill="#ff00ff" />);
    };
    let (pw, ph) = (lk.pw, lk.ph);
    // `ax` is given for the reference's 378 px wide plate; keep it proportional
    let ax = ax / 378.0 * pw;
    const N: usize = 36;
    let mut y_screen = sy0;
    let mut strips: Vec<Svgr> = Vec::with_capacity(N);
    for i in 0..N {
        let v = (i as f32 + 0.5) / N as f32;
        let (y0, y1) = (ph * i as f32 / N as f32, ph * (i + 1) as f32 / N as f32);
        let sx = kit::lerp(kx.0, kx.1, v);
        let sy = kit::lerp(ky.0, ky.1, v);
        let x_anchor = sx0 + drift * v;
        let t = format!("translate({:.2} {:.2}) scale({sx:.4} {sy:.4}) translate({:.2} {:.2})", x_anchor, y_screen, -ax, -y0);
        let h = y1 - y0 + 0.6;
        strips.push(fframes::svgr!(<g transform={t}>
            <svg x="0" y={y0} width={pw} height={h} viewBox={format!("0 {y0:.3} {pw} {h:.3}")} preserveAspectRatio="none">
                <image href={p.href.clone()} x="0" y="0" width={pw} height={ph} preserveAspectRatio="none" />
            </svg>
        </g>));
        y_screen += (y1 - y0) * sy;
    }
    fframes::svgr!(<g>{strips}</g>)
}

/// A pink cone streaking up to an apex: the brain met at an extreme low angle.
fn brain_cone<'a>(cone: &[&'a str], ax: f32, ay: f32) -> Svgr<'a> {
    let c = |i: usize| cone.get(i).copied().unwrap_or("#e59bb5");
    let d = format!("M {ax} {ay} C {:.1} {:.1} {:.1} {:.1} -40 1320 L 760 1320 C {:.1} {:.1} {:.1} {:.1} {ax} {ay} Z",
        ax - 140.0, ay + 60.0, -20.0, 900.0, 740.0, 980.0, ax + 160.0, ay + 50.0);
    fframes::svgr!(<g>
        <defs>
            <clipPath id="hypno_cone"><path d={d.clone()} /></clipPath>
            <linearGradient id="hypno_pink" x1="0" y1="0" x2="1" y2="0.2">
                <stop offset="0" stop-color={c(0)} />
                <stop offset="0.45" stop-color={c(1)} />
                <stop offset="0.7" stop-color={c(2)} />
                <stop offset="1" stop-color={c(3)} />
            </linearGradient>
        </defs>
        <path d={d} fill="url(#hypno_pink)" />
        <g clip-path="url(#hypno_cone)" filter="url(#b8)" opacity="0.5">{burst(ax, ay, 40.0, 140.0, 22, c(4), c(5), 41)}</g>
    </g>)
}

/// Radial streak burst (a zoom blur): wedges of alternating colour around (cx, cy).
fn burst<'a>(cx: f32, cy: f32, a0: f32, a1: f32, n: u32, c1: &'a str, c2: &'a str, salt: u32) -> Svgr<'a> {
    let wedges: Vec<Svgr> = (0..n)
        .map(|i| {
            let u0 = i as f32 / n as f32;
            let u1 = (i as f32 + 0.35 + 0.5 * kit::rnd(i, salt)) / n as f32;
            let t0 = (a0 + (a1 - a0) * u0).to_radians();
            let t1 = (a0 + (a1 - a0) * u1).to_radians();
            let r = 1600.0;
            let d = format!(
                "M {cx:.1} {cy:.1} L {:.1} {:.1} L {:.1} {:.1} Z",
                cx + r * t0.cos(), cy + r * t0.sin(), cx + r * t1.cos(), cy + r * t1.sin()
            );
            let fill = if i % 2 == 0 { c1 } else { c2 };
            let op = 0.45 + 0.5 * kit::rnd(i, salt + 7);
            fframes::svgr!(<path d={d} fill={fill} opacity={op} />)
        })
        .collect();
    fframes::svgr!(<g>{wedges}</g>)
}

/// Opacity of extra caption word `j` (after the lead words) `i` ticks into the settle: the
/// last word fades in slowly (0.2, 0.55, 1), the others in two ticks (0.4, 1).
fn word_op(j: usize, last: bool, i: usize) -> f32 {
    let start = 1 + j;
    if i < start {
        return 0.0;
    }
    let ramp: &[f32] = if last { &[0.2, 0.55, 1.0] } else { &[0.4, 1.0] };
    ramp[(i - start).min(ramp.len() - 1)]
}

pub fn render<'a>(p: P<'a>, tm: &T, frame: &mut Frame, ctx: &FFramesContext<'a, '_>) -> Svgr<'a> {
    let red = p.s("field", "#951d18");
    let image = p.s("image", "");
    let face_h = p.f("face_h", 459.0);
    let (pw, ph) = kit::plate(ctx, image).map(|pl| (pl.w * face_h / pl.h, face_h)).unwrap_or((378.0, 459.0));
    let lk = Look { yellow: p.s("rings", "#ddb521"), image, pw, ph };
    let burst_c = p.strs("burst");
    let bc = |i: usize, d: &'a str| burst_c.get(i).copied().unwrap_or(d);
    let cone = p.strs("cone");
    let cone: Vec<&'a str> = if cone.is_empty() { vec!["#d98aa6", "#f0b3c8", "#e59bb5", "#c9789a", "#f7cddb", "#b9637f"] } else { cone };
    let stages = p.strs("stages");
    let stages: Vec<&str> = if p.has("stages") { stages } else { vec!["burst", "spiral", "cone", "close"] };
    let (ox, oy) = super::photo::pt(p, "offset", (0.0, 0.0));

    let k = tm.tick.max(0) as usize;
    let body: Svgr<'a> = match stages.get(k).copied() {
        // orange zoom-burst
        Some("burst") => fframes::svgr!(<g>
            {kit::fill(bc(0, "#c96a1c"))}
            <g filter="url(#b4)">{burst(360.0, 648.0, 0.0, 360.0, 90, bc(1, "#e19a26"), bc(2, "#b9521a"), 11)}</g>
        </g>),
        // tiny spiral in the field, a cone of streaks pouring down from it
        Some("spiral") => fframes::svgr!(<g>
            {kit::fill(red)}
            <g filter="url(#b16)" opacity="0.9">
                <path d="M 360 629 C 300 760 120 1000 60 1320 L 700 1320 C 620 1000 440 760 360 629 Z" fill={p.s("spiral_cone", if p.has("rings") { lk.yellow } else { "#d79a24" })} />
            </g>
            <g filter="url(#b8)" opacity="0.3">{burst(360.0, 629.0, 58.0, 122.0, 60, if p.has("rings") { lk.yellow } else { "#efc52a" }, if p.has("field") { red } else { "#b6501a" }, 23)}</g>
            <g filter="url(#b4)" opacity="0.85">{arm(&lk, 358.0, 632.0)}</g>
            <g filter="url(#b1)">{bands(&lk, 358.0, 632.0, &[(5.0, 6.0), (8.0, 9.2), (11.5, 13.0), (15.5, 18.0)])}</g>
        </g>),
        // rings grow out of the centre; the top of the head arrives as a stretched cone
        Some("cone") => fframes::svgr!(<g>
            {kit::fill(red)}
            <g filter="url(#b2)">{bands(&lk, 338.0, 595.0, &[(18.0, 22.0), (32.0, 38.0), (48.0, 56.0), (74.0, 134.0)])}</g>
            {brain_cone(&cone, 353.0, 652.0)}
        </g>),
        // extreme close-up of the head in perspective
        Some("close") => fframes::svgr!(<g>
            {kit::fill(red)}
            <g filter="url(#b2)">
                {bands(&lk, 281.0, 582.0, &[(13.0, 22.0), (62.0, 78.0), (100.0, 118.0), (152.0, 209.0), (300.0, 350.0), (559.0, 729.0)])}
            </g>
            <g filter="url(#b2)">{face_persp(ctx, &lk, 222.0, 462.0 + ox, 590.0 + oy, (1.45, 3.2), (1.25, 2.6), -150.0)}</g>
        </g>),
        _ => {
            let i = k.saturating_sub(stages.len()); // settle tick
            // ring centre and inward-flowing phase (fitted per tick, continued linearly)
            const PHI: [f32; 11] = [1.80, 1.30, 0.935, 0.68, 0.505, 0.38, 0.275, 0.18, 0.10, 0.025, -0.065];
            let phi = if i < 11 { PHI[i] } else { PHI[10] - 0.09 * (i - 10) as f32 };
            let (rcx, rcy) = if i == 0 { (354.0, 638.0) } else { (330.0, 662.0) };
            // face: (cx, cy, sx, sy, rot) per settle tick, held after the last
            const FACE: [(f32, f32, f32, f32, f32); 11] = [
                (345.0, 835.0, 1.11, 1.33, -2.0),
                (360.0, 792.0, 1.03, 1.11, 2.0),
                (342.1, 728.8, 1.021, 1.021, 3.31),
                (340.7, 723.0, 1.013, 1.013, 2.26),
                (341.6, 709.7, 0.999, 0.999, 1.19),
                (339.3, 684.0, 0.999, 0.999, 1.19),
                (332.0, 679.5, 1.0, 1.0, 0.0),
                (331.9, 674.3, 1.002, 1.002, -0.01),
                (340.0, 674.4, 1.002, 1.002, 0.5),
                (340.4, 672.6, 1.0, 1.0, 0.45),
                (363.8, 659.8, 1.002, 1.002, 1.41),
            ];
            let (fx, fy, sx, sy, rot) = FACE[i.min(10)];
            // caption settles from big and slanted; the words after `caption_lead` fade in
            const CAP: [(f32, f32, f32, f32); 4] = [(-118.0, -62.0, 1.45, 9.0), (-30.0, -14.0, 1.15, 2.5), (-6.0, -3.0, 1.03, 0.0), (0.0, 0.0, 1.0, 0.0)];
            let (dx, dy, cs, cr) = CAP[i.min(3)];
            let text = p.s("caption", "");
            let words: Vec<&str> = text.split(' ').filter(|w| !w.is_empty()).collect();
            let lead = (p.i("caption_lead", 2).max(0) as usize).min(words.len());
            let size = p.f("caption_size", 54.0);
            let cy = p.f("caption_y", 416.0);
            let cx0 = if p.has("caption_x") {
                p.f("caption_x", 203.0)
            } else {
                360.0 - kit::text_w(frame, ctx, kit::SERIF, 400, size as usize, text) / 2.0
            };
            let extra = words.len() - lead;
            let tail: Vec<Svgr> = words[lead..]
                .iter()
                .enumerate()
                .map(|(j, w)| {
                    let op = word_op(j, j + 1 == extra, i);
                    let s = if j + 1 == extra { w.to_string() } else { format!("{w} ") };
                    fframes::svgr!(<tspan fill-opacity={op} stroke-opacity={op}>{s}</tspan>)
                })
                .collect();
            let head = if lead > 0 { format!("{} ", words[..lead].join(" ")) } else { String::new() };
            let cap = format!("translate({:.1} {:.1}) rotate({cr}) scale({:.3}) scale(1.15 1) translate(-360 -400)", 360.0 + dx, 400.0 + dy, cs);
            let col = p.s("caption_color", "#f1ede6");
            let caption = if text.is_empty() {
                Svgr::empty()
            } else {
                fframes::svgr!(<g transform={cap}>
                    <text x={cx0} y={cy} font-family={kit::SERIF} font-size={size} fill={col} stroke={col}
                        stroke-width={size * 0.8 / 54.0} stroke-linejoin="round" filter="url(#cap)">
                        {head}
                        {tail}
                    </text>
                </g>)
            };
            fframes::svgr!(<g>
                {kit::fill(red)}
                <g filter="url(#b1)">{match i {
                    0 => bands(&lk, 357.0, 635.0, &[(81.0, 89.0), (95.0, 103.0), (119.0, 132.0), (159.0, 177.0), (217.0, 243.0), (306.0, 352.0), (501.0, 621.0), (860.0, 1060.0)]),
                    1 => bands(&lk, 318.0, 674.0, &[(121.0, 131.0), (160.0, 172.0), (203.0, 216.0), (296.0, 322.0), (389.0, 440.0), (554.0, 636.0), (790.0, 900.0)]),
                    _ => rings(&lk, rcx, rcy, phi, 1500.0),
                }}</g>
                {match i {
                    0 => face_persp(ctx, &lk, 222.0, 360.0 + ox, 530.0 + oy, (0.98, 1.32), (1.2, 1.5), -25.0),
                    1 => face_persp(ctx, &lk, 222.0, 392.0 + ox, 543.0 + oy, (1.0, 1.07), (1.06, 1.14), -10.0),
                    _ => face(ctx, &lk, fx + ox, fy + oy, sx, sy, rot),
                }}
                {caption}
            </g>)
        }
    };
    body
}

pub fn look(_p: P) -> (f32, f32) {
    (1.0, 1.0)
}
