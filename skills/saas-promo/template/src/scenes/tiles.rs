//! `tiles`: a one-line glass headline (with a highlighted run that springs up into its box)
//! over a row of frosted tiles. The row rises in from below, rolled and blurred, tiles fading
//! in from the right; it slides so the `on` tiles end centred, then the `on` tiles light up
//! and the rest dim; everything blurs away at the cut. Measured on the reference promo's
//! "Bolt is free this weekend" + October date row (frames 100-146).
//!
//! `tiles = [{ big = "17", label = "October", sub = "Saturday", on = true }, ...]`, or the
//! shortcut `dates = { from = "2026-10-14", to = "2026-10-22", on = ["2026-10-17", ...] }`.
//! See references/kinds/tiles.md.
use super::caption::{self, Placed, Style};
use crate::kit::{self, Persp, T, Tok, clamp01, ease_in, keys, lerp, seg, smooth};
use crate::spec::P;
use fframes::{FFramesContext, Frame, Svgr};

/// One tile: big number/word, label under it, small sub-label, lit at the end.
pub struct Tile {
    pub big: String,
    pub label: String,
    pub sub: String,
    pub on: bool,
}

// ── dates ────────────────────────────────────────────────────────────────────────────────

const MONTHS: [&str; 12] = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS: [&str; 7] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/// Days since 1970-01-01 of a civil date (Howard Hinnant's algorithm).
fn days_from_civil(y: i64, m: i64, d: i64) -> i64 {
    let y = if m <= 2 { y - 1 } else { y };
    let era = if y >= 0 { y } else { y - 399 } / 400;
    let yoe = y - era * 400;
    let mp = (m + 9) % 12;
    let doy = (153 * mp + 2) / 5 + d - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    era * 146097 + doe - 719468
}

fn civil_from_days(z: i64) -> (i64, i64, i64) {
    let z = z + 719468;
    let era = if z >= 0 { z } else { z - 146096 } / 146097;
    let doe = z - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    (if m <= 2 { y + 1 } else { y }, m, d)
}

fn parse_date(s: &str) -> Option<i64> {
    let mut it = s.split('-').map(|x| x.trim().parse::<i64>().ok());
    let (y, m, d) = (it.next()??, it.next()??, it.next()??);
    Some(days_from_civil(y, m, d))
}

/// Tiles from `dates = { from, to, on = [...] }`: day number, month name, weekday.
fn date_tiles(p: P) -> Vec<Tile> {
    let (Some(a), Some(b)) = (p.opt("from").and_then(parse_date), p.opt("to").and_then(parse_date)) else { return vec![] };
    let on: Vec<i64> = p.strs("on").iter().filter_map(|s| parse_date(s)).collect();
    (a..=b.min(a + 60))
        .map(|z| {
            let (_, m, d) = civil_from_days(z);
            // 1970-01-01 was a Thursday (index 3 from Monday)
            let wd = ((z % 7 + 7 + 3) % 7) as usize;
            Tile { big: d.to_string(), label: MONTHS[(m - 1) as usize].to_string(), sub: WEEKDAYS[wd].to_string(), on: on.contains(&z) }
        })
        .collect()
}

fn tiles_of(p: P) -> Vec<Tile> {
    let list = p.list("tiles");
    if !list.is_empty() {
        return list
            .iter()
            .map(|t| Tile { big: t.s("big", "").to_string(), label: t.s("label", "").to_string(), sub: t.s("sub", "").to_string(), on: t.b("on", false) })
            .collect();
    }
    date_tiles(p.sub("dates"))
}

// ── measured motion (entry clock, seconds) ───────────────────────────────────────────────

/// Slide of the row: progress 0..1 of `slide` px (the measured centre of tile 17).
const SLIDE: &[(f32, f32)] = &[
    (-0.04, 236.0), (0.16, 244.0), (0.24, 249.0), (0.32, 252.6), (0.4, 256.6), (0.48, 262.0), (0.56, 271.4), (0.6, 276.5),
    (0.64, 284.0), (0.68, 293.5), (0.72, 306.0), (0.76, 323.5), (0.8, 352.0), (0.84, 391.0), (0.88, 419.5), (0.92, 437.0),
    (0.96, 449.5), (1.0, 458.5), (1.04, 465.5), (1.08, 471.5), (1.12, 476.5), (1.16, 479.5), (1.2, 483.0), (1.24, 486.0),
    (1.28, 488.0), (1.32, 490.0), (1.4, 492.0),
];
/// Extra drop of the row while it rises in (px).
const DROP: &[(f32, f32)] = &[
    (-0.04, 150.0), (0.0, 140.0), (0.04, 125.0), (0.08, 112.0), (0.12, 84.0), (0.16, 56.0), (0.2, 44.8), (0.24, 35.3),
    (0.28, 26.4), (0.32, 20.0), (0.36, 14.6), (0.4, 10.9), (0.44, 7.8), (0.48, 5.7), (0.52, 3.2), (0.56, 1.6), (0.6, 0.5), (0.64, 0.0),
];
/// Roll of the row (degrees, - = right side up) as it swings in.
const ROLL: &[(f32, f32)] = &[
    (0.0, -6.0), (0.08, -5.0), (0.12, -4.0), (0.16, -3.0), (0.2, -2.2), (0.24, -1.8), (0.28, -1.5), (0.32, -1.2), (0.4, -0.9),
    (0.48, -0.6), (0.56, -0.4), (0.64, -0.2), (0.72, 0.0),
];
/// Row blur on entry.
const BLUR_IN: &[(f32, f32)] = &[(-0.04, 11.0), (0.04, 8.0), (0.12, 4.0), (0.2, 1.0), (0.26, 0.0)];

pub fn render<'a>(p: P<'a>, tm: &T, frame: &mut Frame, ctx: &FFramesContext<'a, '_>) -> Svgr<'a> {
    let bg = kit::bg(frame, &kit::backdrop(p, tm, "free"));
    let (e, x) = (tm.e(), tm.x());
    let pal = kit::pal();

    // ── headline: the `lift` move; overrides in `head = { ... }`
    let hp = p.sub("head");
    let mut st = Style::from_with(hp, "lift");
    if !hp.has("weight") {
        st.weight = 500;
    }
    let cam = st.cam(e, x);
    let head = p.s("headline", "");
    let lines: Vec<Vec<Tok>> = if head.is_empty() { vec![] } else { vec![caption::parse_line(head)] };
    let mut hp_t = hp.0.clone();
    if !hp_t.contains_key("run_wait") {
        hp_t.insert("run_wait".into(), toml::Value::Float(0.044));
    }
    let (words, runs) = caption::layout(&st, &lines, P(&hp_t), frame, ctx);
    let run_at = runs.first().map(|r| r.at).unwrap_or(0.0);
    let spring = p.f("spring", 73.0);
    let rise_of = |w: &Placed| -> f32 {
        if !w.hl {
            return 0.0;
        }
        let age = e - run_at;
        if age < 0.0 { spring } else { spring / (1.0 + 12.5 * age).powi(2) }
    };
    let (boxes, head_words) = caption::draw(&st, &words, &runs, e, x, &cam, "tilesh", &rise_of, frame, ctx);

    // ── tiles
    let tiles = tiles_of(p);
    let pitch = p.f("pitch", 293.0);
    let tw = p.f("tile_w", 273.0);
    let th = p.f("tile_h", 204.0);
    let top0 = p.f("tile_y", 298.0);
    let big_size = p.f("big_size", 101.5);
    let label_size = p.f("label_size", 36.0);
    let sub_size = p.f("sub_size", 25.5);
    let slide = p.f("slide", 256.0);
    let fam = kit::look().display;

    let on_idx: Vec<usize> = tiles.iter().enumerate().filter(|(_, t)| t.on).map(|(i, _)| i).collect();
    let (anchor, n_on) = match on_idx.first() {
        Some(&i) => (i, on_idx.len()),
        None => (tiles.len() / 2, 1),
    };
    // the anchor tile's centre ends here, so the lit tiles sit centred (the reference sits 6 px left)
    let x_end = 640.0 - (n_on as f32 - 1.0) * pitch / 2.0 - 6.0;
    let u = (keys(e, SLIDE, |t| t) - 236.0) / (492.0 - 236.0);
    let x_anchor = x_end - slide * (1.0 - u);

    // roll about the row's middle, then the headline's camera
    let mut tcam: Persp = cam;
    tcam.px = 640.0;
    tcam.py = 400.0;
    tcam.rz = keys(e, ROLL, |t| t).to_radians() * p.f("roll", 1.0);
    tcam.dy = cam.dy + 40.0 * (cam.s - 1.0);
    let drop = keys(e, DROP, |t| t);
    let top = top0 + drop;
    let lit = smooth(seg(e, p.f("light_at", 0.96), p.f("light_at", 0.96) + 0.16));
    let dim = smooth(seg(e, p.f("light_at", 0.96) - 0.04, p.f("light_at", 0.96) + 0.1));
    let frost = pal.frost;
    let ink = pal.text;

    let mut drawn = vec![];
    for (i, t) in tiles.iter().enumerate() {
        let cx = x_anchor + (i as f32 - anchor as f32) * pitch;
        let x0 = cx - tw / 2.0;
        let (sx, _) = tcam.p(cx, top);
        if !(-400.0..=1680.0).contains(&sx) {
            continue;
        }
        // tiles fade in from the right: the 4th tile right of the anchor first
        let k = (anchor as f32 + 3.0 - i as f32).max(0.0);
        let appear = smooth(seg(e, -0.01 + k * 0.022, 0.022 + k * 0.022));
        if appear <= 0.0 {
            continue;
        }
        let (fill_a, text_a, label_a, sub_a) = if t.on {
            (lerp(0.17, 0.32, lit), 1.0, lerp(0.88, 1.0, lit), lerp(0.62, 0.95, lit))
        } else {
            (lerp(0.17, 0.11, dim), lerp(1.0, 0.22, dim), lerp(0.88, 0.2, dim), lerp(0.62, 0.15, dim))
        };
        let sub_w = if t.on && lit > 0.5 { "600" } else { "500" };
        // long big/label/sub text shrinks to fit the tile
        let fit = |size: f32, txt: &str, frame: &mut Frame| -> f32 {
            let w = kit::text_w(frame, ctx, fam, size, 500, txt);
            if w > tw * 0.84 { size * tw * 0.84 / w } else { size }
        };
        let (bs, ls_, ss) = (fit(big_size, &t.big, frame), fit(label_size, &t.label, frame), fit(sub_size, &t.sub, frame));
        let m = tcam.m(x0, top, tw, th);
        let nb = top + th * 0.5;
        let mb = top + th * 0.718;
        let db = top + th * 0.846;
        let (big, label, sub) = (t.big.clone(), t.label.clone(), t.sub.clone());
        let stroke_a = fill_a * 0.6;
        drawn.push(fframes::svgr!(
            <g transform={m} opacity={appear}>
                <rect x={x0} y={top} width={tw} height={th} rx="21" fill={frost} fill-opacity={fill_a} stroke="#ffffff" stroke-opacity={stroke_a} stroke-width="1.2" />
                <text x={cx} y={nb} text-anchor="middle" font-family={fam} font-size={bs} font-weight="500" fill={ink} fill-opacity={text_a}>{big}</text>
                <text x={cx} y={mb} text-anchor="middle" font-family={fam} font-size={ls_} font-weight="500" fill={ink} fill-opacity={label_a}>{label}</text>
                <text x={cx} y={db} text-anchor="middle" font-family={fam} font-size={ss} font-weight={sub_w} fill={ink} fill-opacity={sub_a}>{sub}</text>
            </g>
        ));
    }
    // blur in, and the shared exit blur
    let (xa, xb, xmax) = st.xblur();
    let xp = if xa > xb { clamp01((xa - x) / (xa - xb)) } else { 0.0 };
    let tile_blur = keys(e, BLUR_IN, |t| t) + xmax * clamp01(ease_in(xp) * 1.3);
    let tiles_op = 1.0 - smooth(clamp01((0.08 - x) / 0.08));
    let row = kit::blurred("tilesrow", tile_blur, fframes::svgr!(<g opacity={tiles_op}>{drawn}</g>));

    fframes::svgr!(
        <g>
            {bg}
            {row}
            {boxes}
            {head_words}
        </g>
    )
}

/// Drawn above the letterbox.
#[allow(dead_code)]
pub fn overlay(_p: P, _t: f32, _len: f32) -> Svgr<'static> {
    Svgr::empty()
}
