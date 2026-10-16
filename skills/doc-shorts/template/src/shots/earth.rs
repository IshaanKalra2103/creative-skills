//! earth: a cyan "network" Earth at night (glowing dotted coasts, city lights, orange arcs)
//! that rolls slowly in screen space, zoom-blurred into and out of the shot, with a caption
//! typed on letter by letter (each new letter drops in from below). Stock footage in the
//! reference; rebuilt as a baked plate (tools/earth_bake.py, any region) whose roll, scale
//! and blur per tick were measured on the footage. Params: references/shots.md#earth.
use crate::kit::{self, T};
use crate::spec::P;
use fframes::{FFramesContext, Frame, Svgr};

/// Default plate placement: tools/earth_bake.py covers ref px x -90..810, y -160..1440.
const PLATE: [f32; 4] = [-90.0, -160.0, 900.0, 1600.0];

/// Measured per tick: screen roll (deg, about the frame centre), scale, zoom-blur (0..1).
/// Ticks 0-2 are the entry, 3-5 the slow roll, 6-8 the exit.
const MOTION: [(f32, f32, f32); 9] = [
    (8.84, 1.012, 0.8),
    (4.31, 1.0, 0.25),
    (1.83, 1.01, 0.0),
    (0.0, 1.0, 0.0),
    (-1.48, 1.01, 0.0),
    (-2.83, 1.0, 0.0),
    (-3.66, 1.03, 0.1),
    (-4.90, 1.12, 0.5),
    (-2.85, 1.35, 1.0),
];
/// Roll per tick while holding between entry and exit.
const ROLL_RATE: f32 = -1.415;

/// (roll, scale, blur) for tick `k` of a shot `len` ticks long: the measured entry and exit
/// with the slow roll stretched or cut in between (identical to the table at 9 ticks).
fn motion(k: i32, len: i32, entry: bool, exit: bool) -> (f32, f32, f32) {
    let n_in = if entry { 3 } else { 0 };
    let n_out = if exit { 3.min((len - n_in).max(0)) } else { 0 };
    let mid_end = len - n_out; // first exit tick
    // roll in the middle section: the measured ticks 3-5, then the same rate
    let mid = |j: i32| -> (f32, f32, f32) {
        if j <= 2 { MOTION[3 + j as usize] } else { (MOTION[5].0 + ROLL_RATE * (j - 2) as f32, 1.0, 0.0) }
    };
    if k < n_in {
        MOTION[k.max(0) as usize]
    } else if k < mid_end {
        mid(k - n_in)
    } else {
        // exit, relative to where the roll stopped
        let j = (k - mid_end).clamp(0, 2);
        let last = if mid_end - n_in > 0 { mid(mid_end - n_in - 1).0 } else { MOTION[2].0 };
        let (r, s, b) = MOTION[6 + j as usize];
        (r + (last - MOTION[5].0), s, b)
    }
}

pub fn render<'a>(p: P<'a>, tm: &T, frame: &mut Frame, ctx: &FFramesContext<'a, '_>) -> Svgr<'a> {
    let rows = p.rows("motion");
    let entry = p.b("entry", true);
    let exit = p.b("exit", true);
    let (rot, sc, blur) = match rows.get(tm.tick.max(0) as usize).or(rows.last()) {
        Some(r) if r.len() >= 3 => (r[0], r[1], r[2]),
        _ => motion(tm.tick, tm.len, entry, exit),
    };
    let name = p.s("plate", "earth_plate.png");
    let Some(plate) = kit::plate(ctx, name) else { return kit::fill("#ff00ff") };
    let r = p.fs("plate_rect");
    let [px, py, pw, ph] = if r.len() == 4 { [r[0], r[1], r[2], r[3]] } else { PLATE };
    // zoom blur: stacked copies scaled about the centre, fading out
    let copies = if blur > 0.0 { 7 } else { 1 };
    let layers: Vec<Svgr> = (0..copies)
        .map(|i| {
            let f = i as f32 / 6.0;
            let s = sc * (1.0 + blur * 0.10 * f);
            let op = if copies == 1 { 1.0 } else { 0.42 * (1.0 - 0.6 * f) };
            let tf = format!("translate(360 640) rotate({rot}) scale({s}) translate(-360 -640)");
            let href = plate.href.clone();
            fframes::svgr!(<g transform={tf} opacity={op}>
                <image href={href} x={px} y={py} width={pw} height={ph} preserveAspectRatio="none" />
            </g>)
        })
        .collect();
    let blur_f = if blur > 0.4 { "url(#b2)" } else if blur > 0.0 { "url(#b1)" } else { "" };
    let caption = match p.opt("caption") {
        Some(text) => caption(p, frame, ctx, tm, text, exit),
        None => Svgr::empty(),
    };
    fframes::svgr!(<g>
        {kit::fill(p.s("bg", "#04090c"))}
        <g filter={blur_f}>{layers}</g>
        {caption}
    </g>)
}

/// The typed caption: settled letters plus an entering one (lower, smaller, faint). `reveal`
/// rows `[[letters, entering_opacity, first_opacity], ...]` set it per tick; otherwise
/// `letters_per_tick` (default 1.33, the reference's pace) drives it. The word is centred
/// unless `caption_x` (its left edge) is given. On the last two ticks of an exit it shrinks.
fn caption<'a>(p: P<'a>, frame: &mut Frame, ctx: &FFramesContext<'a, '_>, tm: &T, word: &'a str, exit: bool) -> Svgr<'a> {
    let len = word.chars().count();
    let rows = p.rows("reveal");
    let k = tm.tick.max(0) as usize;
    let (n, enter, first) = if let Some(r) = rows.get(k).or(rows.last()) {
        (r.first().copied().unwrap_or(0.0) as usize, r.get(1).copied().unwrap_or(0.0), r.get(2).copied().unwrap_or(1.0))
    } else {
        let rate = p.f("letters_per_tick", 1.33);
        let pos = 1.0 + k as f32 * rate;
        let n = pos.floor() as usize;
        let enter = if n < len { (pos.fract() * 1.1).min(0.7) } else { 0.0 };
        (n, if enter > 0.25 { enter } else { 0.0 }, if k == 0 { 0.45 } else { 1.0 })
    };
    let n = n.min(len);
    let size = p.f("caption_size", 60.0);
    let base = p.f("caption_y", 656.0);
    let x = p.f("caption_x", 360.0 - kit::text_w(frame, ctx, kit::SERIF, 400, size.round() as usize, word) / 2.0);
    let settled = kit::prefix(word, n);
    let entering = if enter > 0.0 { word.chars().nth(n).map(|c| c.to_string()).unwrap_or_default() } else { String::new() };
    let tf = if exit && tm.len >= 6 && tm.tick == tm.len - 2 {
        "translate(360 640) scale(0.96) translate(-360 -640)".to_string()
    } else if exit && tm.len >= 6 && tm.tick >= tm.len - 1 {
        "translate(360 640) scale(0.81) translate(-360 -640)".to_string()
    } else {
        String::new()
    };
    let fill = p.s("caption_color", "#e9eef0");
    let small = size * 0.8;
    let drop = size * 16.0 / 60.0;
    fframes::svgr!(<g transform={tf}>
        <text x={x} y={base} font-family={kit::SERIF} font-size={size} fill={fill} stroke={fill} stroke-width="0.4"
            stroke-linejoin="round" filter="url(#cap)" opacity={first}>
            <tspan>{settled}</tspan>
            <tspan dy={drop} font-size={small} fill-opacity={enter} stroke-opacity={enter}>{entering}</tspan>
        </text>
    </g>)
}

pub fn look(_p: P) -> (f32, f32) {
    (1.0, 1.0)
}
