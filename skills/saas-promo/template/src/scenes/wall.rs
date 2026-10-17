//! `wall`: a wall of cards floating over the backdrop with a shallow depth of field. The
//! centre card drops in, the side cards slide into a 3x3 arrangement around it, the camera
//! settles, snaps in on the centre card and keeps pushing; the centre card swaps through
//! colour-band wipes (e.g. a word card -> a poster); a button appears under it, the cursor
//! comes up and clicks ("Submit" -> "Submitted", blue fill sweeping across), the camera
//! pulls back and everything defocuses into the cut. With `letterbox = true` the bars close
//! over the last 0.9 s and the cursor is drawn above them at the very end.
//!
//! Entrances, the snap push and the centre sequence run on the entry clock; the cursor,
//! click, pull-back and defocus on the exit clock. Curves measured on the reference promo
//! (shot 492-561 at 25 fps). Params: references/kinds/wall.md.
mod cards;

use crate::kit::{self, T, clamp01, ease_in_out, ease_out, keys, lerp, seg, smooth};
use crate::spec::P;
use fframes::{FFramesContext, Frame, Svgr};

/// Card aspect (h / w): 16:9.
const ASPECT: f32 = 0.5625;

/// Rest slots around the centre card (screen px at camera scale 1): (x, y, w), then the
/// entrance: offset (dx, dy) it slides in from and the slide window (t0, t1) in seconds.
/// Measured: ML, TR (rises from MR), BC (from the left), BR, TL (from the left edge),
/// TC (from the top), BL (from the bottom), MR (from the right).
const SLOTS: [(f32, f32, f32, f32, f32, f32, f32); 8] = [
    (278.0, 359.0, 308.0, -70.0, 0.0, 0.72, 0.88),
    (1059.0, 120.0, 294.0, 0.0, 220.0, 0.48, 0.92),
    (639.0, 602.0, 322.0, -235.0, 8.0, 0.26, 0.6),
    (1058.0, 765.0, 296.0, 0.0, 0.0, 0.0, 0.0),
    (217.0, 121.0, 306.0, -218.0, 0.0, 0.34, 0.62),
    (639.0, 113.0, 326.0, 0.0, -343.0, 0.5, 0.84),
    (218.0, 610.0, 308.0, 0.0, 330.0, 0.62, 0.92),
    (1113.0, 360.0, 298.0, 587.0, 0.0, 0.7, 0.96),
];

/// Outer ring for cards 9+ (fade in, no slide).
const OUTER: [(f32, f32); 8] = [(-205.0, 360.0), (1485.0, 360.0), (639.0, -135.0), (639.0, 855.0), (-205.0, -135.0), (1485.0, -135.0), (-205.0, 855.0), (1485.0, 855.0)];

struct Shot {
    /// Reveal time of each centre item (item 0 at 0).
    reveals: Vec<f32>,
    cam: f32,
}

/// Camera scale about the frame centre, relative to the resting wall.
fn cam_scale(tm: &T) -> f32 {
    let (e, x) = (tm.e(), tm.x());
    let push = keys(
        e,
        &[(0.0, 1.147), (0.04, 1.086), (0.08, 1.074), (0.12, 1.049), (0.2, 1.043), (0.28, 1.025), (0.36, 1.012), (0.44, 1.0), (0.56, 0.988), (0.72, 0.997), (0.92, 1.0), (1.0, 1.012), (1.04, 1.025), (1.08, 1.037), (1.12, 1.061), (1.16, 1.169), (1.2, 1.294), (1.24, 1.331), (1.28, 1.353), (1.32, 1.368), (1.36, 1.387), (1.44, 1.402), (1.52, 1.414), (1.6, 1.429), (1.68, 1.436)],
        |t| t,
    );
    if x >= 0.96 {
        return push;
    }
    let pull = keys(-x, &[(-0.96, 1.436), (-0.88, 1.429), (-0.84, 1.417), (-0.8, 1.387), (-0.76, 1.362), (-0.68, 1.35), (-0.6, 1.337), (-0.52, 1.331), (-0.44, 1.319), (-0.36, 1.307), (-0.28, 1.294), (-0.2, 1.27), (-0.12, 1.245), (-0.04, 1.221), (0.0, 1.21)], |t| t);
    // a short scene: never pull past where the push got to
    pull * push / 1.436
}

/// Global defocus into the cut.
fn out_blur(x: f32) -> f32 {
    keys(-x, &[(-0.18, 0.0), (-0.12, 1.2), (-0.08, 3.0), (-0.04, 5.5), (0.0, 7.0)], |t| t)
}

/// A side card's screen box (cx, cy, w, opacity) at entry time `e`.
fn slot_at(i: usize, e: f32, cam: f32) -> (f32, f32, f32, f32) {
    let (rx, ry, rw, ox, oy, op) = if i < SLOTS.len() {
        let (x, y, w, dx, dy, t0, t1) = SLOTS[i];
        let k = if t1 > t0 { 1.0 - ease_out(seg(e, t0, t1)) } else { 0.0 };
        (x, y, w, dx * k, dy * k, 1.0)
    } else {
        let (x, y) = OUTER[(i - SLOTS.len()) % OUTER.len()];
        (x, y, 300.0, 0.0, 0.0, smooth(seg(e, 0.0, 0.3)))
    };
    let (x, y) = (rx + ox, ry + oy);
    (640.0 + (x - 640.0) * cam, 360.0 + (y - 360.0) * cam, rw * cam, op)
}

/// Depth-of-field blur for a side card at screen (cx, cy).
fn dof(i: usize, e: f32, x: f32, cx: f32, cy: f32) -> f32 {
    let pull = keys(e, &[(0.0, 7.5), (0.04, 5.0), (0.08, 3.4), (0.16, 2.0), (0.28, 1.0), (0.4, 0.5)], ease_out);
    let r = (((cx - 640.0) / 1.15).powi(2) + (cy - 360.0).powi(2)).sqrt();
    let k = keys(e, &[(0.92, 0.010), (1.16, 0.010), (1.36, 0.017), (1.52, 0.019)], ease_in_out);
    let edge = (r - 260.0).max(0.0) * k;
    // two corner cards sit further back (TL, BR)
    let extra = match i {
        4 => 2.6,
        3 => 2.5,
        _ => 0.0,
    } * smooth(seg(e, 0.32, 0.56));
    pull + edge + extra + out_blur(x)
}

fn mix_hex(a: &str, b: &str, t: f32) -> String {
    let (a, b) = (kit::hex3(a), kit::hex3(b));
    format!(
        "#{:02x}{:02x}{:02x}",
        (lerp(a[0], b[0], t) * 255.0) as u8,
        (lerp(a[1], b[1], t) * 255.0) as u8,
        (lerp(a[2], b[2], t) * 255.0) as u8
    )
}

fn side_card<'a>(id: &str, href: String, cx: f32, cy: f32, w: f32, blur: f32, opacity: f32) -> Svgr<'a> {
    // out-of-focus cards read hazier (lifted blacks); the corners sink into a dark falloff
    let haze = (blur / 6.0).clamp(0.0, 1.0) * 0.36;
    let r = (((cx - 640.0) / 1.15).powi(2) + (cy - 360.0).powi(2)).sqrt();
    let dim = ((r - 380.0) / 260.0).clamp(0.0, 1.0) * 0.5;
    let pal = kit::pal();
    let haze_c = mix_hex(pal.highlight, "#ffffff", 0.2);
    let dim_c = mix_hex(&format!("#{:02x}{:02x}{:02x}", (pal.bg[4][0] * 255.0) as u8, (pal.bg[4][1] * 255.0) as u8, (pal.bg[4][2] * 255.0) as u8), "#3040a0", 0.4);
    let h = w * ASPECT;
    let (x, y) = (cx - w / 2.0, cy - h / 2.0);
    let rr = (w * 0.014).max(2.0);
    let cid = format!("{id}c");
    let clip = format!("url(#{cid})");
    let body = fframes::svgr!(
        <g opacity={opacity}>
            <clipPath id={cid}><rect x={x} y={y} width={w} height={h} rx={rr} /></clipPath>
            <g clip-path={clip}>
                <image href={href} x={x} y={y} width={w} height={h} preserveAspectRatio="xMidYMid slice" />
                <rect x={x} y={y} width={w} height={h} fill={haze_c} opacity={haze} />
                <rect x={x} y={y} width={w} height={h} fill={dim_c} opacity={dim} />
            </g>
        </g>
    );
    kit::blurred(id, blur, body)
}

/// The palette-tinted bloom behind the wall.
fn bloom(tm: &T) -> Svgr<'static> {
    let p = tm.p();
    let cx = keys(p, &[(0.0, 330.0), (0.47, 430.0), (1.0, 520.0)], smooth);
    let cy = keys(p, &[(0.0, 300.0), (0.47, 380.0), (1.0, 430.0)], smooth);
    let a = keys(p, &[(0.0, 0.75), (0.4, 0.6), (1.0, 0.5)], smooth);
    let c = &kit::pal().bg;
    let h = |v: [f32; 3]| format!("#{:02x}{:02x}{:02x}", (v[0] * 255.0) as u8, (v[1] * 255.0) as u8, (v[2] * 255.0) as u8);
    let core = h([lerp(c[0][0], c[1][0], 0.45), lerp(c[0][1], c[1][1], 0.45), lerp(c[0][2], c[1][2], 0.45)]);
    let mid = h([lerp(c[1][0], c[2][0], 0.5), lerp(c[1][1], c[2][1], 0.5), lerp(c[1][2], c[2][2], 0.5)]);
    let edge = h(c[3]);
    fframes::svgr!(
        <g style="mix-blend-mode:screen" opacity={a}>
            <defs>
                <radialGradient id="wallBloom" cx={cx} cy={cy} r="620" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stop-color={core} />
                    <stop offset="0.45" stop-color={mid} stop-opacity="0.7" />
                    <stop offset="1" stop-color={edge} stop-opacity="0" />
                </radialGradient>
            </defs>
            <rect x="0" y="0" width="1280" height="720" fill="url(#wallBloom)" />
        </g>
    )
}

/// Centre card box (cx, cy, w): drops in from the top, then rides the camera.
fn center_at(e: f32, cam: f32) -> (f32, f32, f32) {
    let dy = keys(e, &[(0.0, -305.0), (0.04, -272.0), (0.08, -261.0), (0.12, -248.0), (0.16, -98.0), (0.2, -55.0), (0.24, -34.0), (0.28, -21.0), (0.32, -13.0), (0.36, -7.0), (0.44, -2.0), (0.6, 0.0)], |t| t);
    (639.0, 360.0 + dy, 326.0 * cam)
}

fn shot(p: P, tm: &T) -> Shot {
    let n = p.list("center").len().max(1);
    let given = p.fs("center_times");
    let mut reveals = vec![0.0];
    for k in 1..n {
        reveals.push(given.get(k - 1).copied().unwrap_or(0.794 + (k - 1) as f32 * 0.6));
    }
    Shot { reveals, cam: cam_scale(tm) }
}

/// The centre card content (card-local units) with the band wipes between items.
fn center_content<'a>(p: P<'a>, sh: &Shot, e: f32, frame: &mut Frame, ctx: &FFramesContext<'a, '_>) -> Svgr<'a> {
    let items = p.list("center");
    if items.is_empty() {
        return fframes::svgr!(<rect x="0" y="0" width="326" height="184" fill="#ffffff" />);
    }
    let wipe = p.strs("wipe");
    let wipe: Vec<&str> = if wipe.is_empty() { vec!["#ecd52c", "#1b33c9"] } else { wipe };
    // the current item: the last one whose reveal has started
    let mut cur = 0;
    for (k, r) in sh.reveals.iter().enumerate() {
        if e >= *r - 0.2 {
            cur = k;
        }
    }
    let mut layers = vec![];
    // the item under the current reveal (still visible while the bands wipe)
    let k = cur;
    let edge = if k > 0 { cards::band_edge(e, sh.reveals[k]) } else { 2.0 };
    if k > 0 && edge < 1.1 {
        let prev = items[k - 1];
        let r0 = sh.reveals[k - 1];
        layers.push(cards::item(prev, e, r0, sh.reveals[k], frame, ctx));
        // the bands before the reveal
        let nb = wipe.len();
        for (j, col) in wipe.iter().enumerate() {
            let t0 = sh.reveals[k] - 0.081 * (nb - j) as f32;
            layers.push(cards::band(col, cards::band_edge(e, t0)));
        }
    }
    let next_out = sh.reveals.get(k + 1).copied().unwrap_or(1e6);
    let body = cards::item(items[k], e, sh.reveals[k], next_out, frame, ctx);
    if k > 0 && edge < 1.1 {
        let d = cards::band_path(edge);
        let id = format!("wallRev{k}");
        let url = format!("url(#wallRev{k})");
        layers.push(fframes::svgr!(<g><clipPath id={id}><path d={d} /></clipPath><g clip-path={url}>{body}</g></g>));
    } else {
        layers.push(body);
    }
    fframes::svgr!(<g>{layers}</g>)
}

/// The button: pops in under the card after the last reveal; hover, press-squash, label
/// switch and the blue fill sweep run on the exit clock.
#[allow(clippy::too_many_arguments)]
fn button(p: P, e: f32, x: f32, last: f32, cx: f32, card_bottom: f32, s: f32, frame: &mut Frame, ctx: &FFramesContext) -> Svgr<'static> {
    let labels = p.strs("button");
    if p.b("no_button", false) {
        return Svgr::empty();
    }
    let a0 = last + 0.31;
    let appear = smooth(seg(e, a0, a0 + 0.048));
    if appear <= 0.0 {
        return Svgr::empty();
    }
    let pop = lerp(0.9, 1.0, ease_out(seg(e, a0, a0 + 0.096)));
    let narrow = keys(-x, &[(-0.86, 1.0), (-0.82, 0.88), (-0.8, 0.775), (-0.76, 0.82), (-0.68, 0.93), (-0.56, 0.956)], ease_out);
    let bw = 341.0 * s * pop * narrow;
    let bh = 41.0 * s * pop;
    let top = card_bottom + 21.0 * s;
    let bx = cx - bw / 2.0;
    let rr = 11.0 * s;
    let hover = smooth(seg(-x, -0.968, -0.856));
    let fill = ease_out(seg(-x, -0.856, -0.3)) * 0.62;
    let fill_w = (bw * clamp01(0.42 + fill)).max(0.5);
    let full = smooth(seg(-x, -0.4, -0.24));
    let accent = kit::pal().accent;
    let light = mix_hex(accent, "#ffffff", 0.45);
    let hover_c = mix_hex(accent, "#ffffff", 0.82);
    let base_col = if hover > 0.0 { hover_c } else { "#ffffff".to_string() };
    let base_o = lerp(0.95, 0.97, hover);
    let done = x <= 0.8;
    let font = 20.5 * s;
    let label = if done { labels.get(1).copied().unwrap_or("Submitted") } else { labels.first().copied().unwrap_or("Submit") }.to_string();
    let col = if done { "#ffffff".to_string() } else { mix_hex(accent, "#1f3fa8", 0.5) };
    let ui = kit::look().ui.to_string();
    let lw = kit::text_w(frame, ctx, &ui, font, 500, &label);
    let lx = cx - lw / 2.0;
    let ly = top + bh / 2.0 + font * 0.36;
    let blue_full_w = (bw * full).max(0.5);
    let pressed = if x <= 0.856 {
        let (a1, a2, a3) = (light.clone(), accent.to_string(), accent.to_string());
        fframes::svgr!(
            <g clip-path="url(#wallBtnClip)">
                <rect x={bx} y={top} width={bw} height={bh} fill={a1} />
                <rect x={bx} y={top} width={fill_w} height={bh} fill={a2} />
                <rect x={bx} y={top} width={blue_full_w} height={bh} fill={a3} opacity={full} />
            </g>
        )
    } else {
        Svgr::empty()
    };
    let body = fframes::svgr!(
        <g opacity={appear}>
            <clipPath id="wallBtnClip"><rect x={bx} y={top} width={bw} height={bh} rx={rr} /></clipPath>
            <rect x={bx} y={top + 2.0 * s} width={bw} height={bh} rx={rr} fill="#0a1a6a" opacity="0.12" />
            <rect x={bx} y={top} width={bw} height={bh} rx={rr} fill={base_col} opacity={base_o} />
            {pressed}
            <text x={lx} y={ly} font-family={ui} font-size={font} font-weight="500" fill={col}>{label}</text>
        </g>
    );
    kit::blurred("wallBtnBlur", out_blur(x), body)
}

/// Cursor tip (screen) relative to the button centre, in card-scale units, on the exit clock.
fn cursor_at(p: P, tm: &T) -> Option<(f32, f32, f32)> {
    let x = tm.x();
    if x > 1.16 || p.b("no_button", false) {
        return None;
    }
    let e = tm.e();
    let cam = cam_scale(tm);
    let (cx, cy, cw) = center_at(e, cam);
    let s = cw / cards::CW;
    let ch = cards::CH * s;
    let by = cy + ch / 2.0 + 21.0 * s + 20.5 * s;
    let ox = keys(-x, &[(-1.16, 72.2), (-1.12, 70.4), (-1.08, 66.2), (-1.04, 64.1), (-1.0, 62.0), (-0.96, 59.9), (-0.92, 56.8), (-0.88, 56.0), (-0.84, 55.0), (-0.8, 51.2), (-0.76, 51.4), (-0.72, 49.5), (-0.64, 49.2), (-0.56, 50.1), (-0.48, 47.3), (-0.4, 44.0), (-0.32, 38.3), (-0.24, 28.9), (-0.16, 11.1), (-0.08, -16.2), (0.0, -50.0)], |t| t);
    let oy = keys(-x, &[(-1.16, 128.0), (-1.12, 99.2), (-1.08, 69.2), (-1.04, 52.5), (-1.0, 42.0), (-0.96, 33.7), (-0.92, 28.4), (-0.88, 22.5), (-0.84, 20.3), (-0.8, 18.7), (-0.76, 14.8), (-0.72, 9.9), (-0.68, 7.3), (-0.6, 6.3), (-0.56, 4.8), (-0.48, 7.0), (-0.4, 12.8), (-0.32, 21.8), (-0.24, 38.1), (-0.16, 63.7), (-0.08, 103.3), (0.0, 155.0)], |t| t);
    Some((cx + ox * s - 1.0, by + oy * s - 2.0, 2.58 * cam))
}

pub fn render<'a>(p: P<'a>, tm: &T, frame: &mut Frame, ctx: &FFramesContext<'a, '_>) -> Svgr<'a> {
    let bg = kit::bg(frame, &kit::backdrop(p, tm, "wide"));
    let bloom = if p.b("bloom", true) { bloom(tm) } else { Svgr::empty() };
    let (e, x) = (tm.e(), tm.x());
    let sh = shot(p, tm);

    // side cards
    let mut side = vec![];
    for (i, name) in p.strs("cards").iter().enumerate() {
        let Some(img) = ctx.get_image(name) else { continue };
        let (cx, cy, w, o) = slot_at(i, e, sh.cam);
        // motion blur while a card slides fast
        let (ax, ay, _, _) = slot_at(i, e - 0.02, sh.cam);
        let (bx, by, _, _) = slot_at(i, e + 0.02, sh.cam);
        let v = ((bx - ax).powi(2) + (by - ay).powi(2)).sqrt();
        let mb = ((v - 8.0) * 0.03).clamp(0.0, 3.0);
        let blur = dof(i, e, x, cx, cy) + mb;
        side.push(side_card(&format!("wall{i}"), img.href().to_string(), cx, cy, w, blur, o));
    }

    // centre card
    let (ccx, ccy, cw) = center_at(e, sh.cam);
    let s = cw / cards::CW;
    let ch = cards::CH * s;
    let (x0, y0) = (ccx - cw / 2.0, ccy - ch / 2.0);
    let tr = format!("translate({x0:.3} {y0:.3}) scale({s:.5})");
    let content = center_content(p, &sh, e, frame, ctx);
    let cblur = keys(e, &[(0.0, 8.0), (0.04, 5.0), (0.08, 3.0), (0.12, 2.2), (0.16, 2.6), (0.24, 1.4), (0.32, 0.6), (0.44, 0.0)], |t| t) + out_blur(x);
    let crr = 4.0 * s;
    let card = fframes::svgr!(
        <g>
            <clipPath id="wallCC"><rect x={x0} y={y0} width={cw} height={ch} rx={crr} /></clipPath>
            <g clip-path="url(#wallCC)"><g transform={tr}>{content}</g></g>
        </g>
    );
    let card = kit::blurred("wallCCBlur", cblur, card);

    // focus ring after the last reveal
    let last = *sh.reveals.last().unwrap_or(&0.0);
    let ring_o = smooth(seg(e, last + 0.406, last + 0.526)) * smooth(seg(x, 0.04, 0.12));
    let ring = if ring_o > 0.0 {
        let gap = 5.5;
        let (rx, ry, rw, rh) = (x0 - gap, y0 - gap, cw + gap * 2.0, ch + gap * 2.0);
        let rr = 6.0 * s + gap;
        let rc = mix_hex(kit::pal().flash, "#ffffff", 0.4);
        let rc2 = rc.clone();
        fframes::svgr!(
            <g opacity={ring_o}>
                <rect x={rx} y={ry} width={rw} height={rh} rx={rr} fill="none" stroke={rc} stroke-width="5" opacity="0.35" />
                <rect x={rx} y={ry} width={rw} height={rh} rx={rr} fill="none" stroke={rc2} stroke-width="1.8" />
            </g>
        )
    } else {
        Svgr::empty()
    };

    let btn = button(p, e, x, last, ccx, y0 + ch, s, frame, ctx);
    // the cursor goes above the letterbox at the very end (see `overlay`)
    let over_bars = p.b("letterbox", false) && x <= 0.24;
    let cur = match cursor_at(p, tm) {
        Some((cx, cy, sc)) if !over_bars => kit::blurred("wallCurBlur", out_blur(x) * 0.8, kit::cursor(cx, cy, sc, 1.0)),
        _ => Svgr::empty(),
    };

    fframes::svgr!(
        <g>
            {bg}
            {bloom}
            {side}
            {ring}
            {card}
            {btn}
            {cur}
        </g>
    )
}

/// The cursor above the letterbox over the last 0.24 s (when the scene closes the bars).
pub fn overlay(p: P, t: f32, len: f32) -> Svgr<'static> {
    let pace = kit::look().pace;
    let tm = T { t, len, g: 0.0, pace };
    if !p.b("letterbox", false) || tm.x() > 0.24 {
        return Svgr::empty();
    }
    cursor_at(p, &tm).map(|(x, y, s)| kit::cursor(x, y, s, 1.0)).unwrap_or_default()
}
