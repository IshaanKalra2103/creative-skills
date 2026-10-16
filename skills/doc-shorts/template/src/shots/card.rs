//! card: a text card. Words typed, popped, slid or zoomed on black, grey, paper or any colour.
//! Every mode's default motion is the reference reel's, measured tick by tick:
//! - `type`   letters land one by one, each popping in small and soft for a tick ("Forever");
//!            with `pop = false` they just appear ("1995").
//! - `cursor` typed with a "|" caret, the line (plus caret) kept centred, caret blinks when
//!            done; `zoom_out = true` pulls the page back over the last 8 ticks ("What if…").
//! - `pop`    blank tick, then the words grow 74% → 93% → 100% ("But").
//! - `slide`  enters from the right edge with a smear and decelerates to centre ("Better way").
//! - `zoom`   slides in small from the right, jumps to double size with a blur, settles ("The Internet").
//! Params: references/shots.md#card.
use crate::kit::{self, T};
use crate::spec::P;
use fframes::{FFramesContext, Frame, Svgr};

#[derive(Clone, Copy, PartialEq)]
enum Bg {
    Black,
    Grey,
    Paper,
    Hex,
}

fn bg_kind(p: P) -> Bg {
    match p.s("bg", "black") {
        "black" => Bg::Black,
        "grey" | "gray" => Bg::Grey,
        "paper" => Bg::Paper,
        _ => Bg::Hex,
    }
}

/// Relative luminance of a `#rrggbb` colour (0..1); unknown strings count as dark.
pub fn luma(hex: &str) -> f32 {
    let h = hex.trim_start_matches('#');
    if h.len() < 6 {
        return 0.0;
    }
    let c = |i: usize| u8::from_str_radix(&h[i..i + 2], 16).unwrap_or(0) as f32 / 255.0;
    0.2126 * c(0) + 0.7152 * c(2) + 0.0722 * c(4)
}

/// (fill, default ink colour, caption filter) for a card ground.
fn ground(p: P<'_>) -> (&'static str, &'static str, &'static str) {
    match bg_kind(p) {
        Bg::Black => ("#080808", "#dad7d0", "cap"),
        Bg::Grey => ("#d6d6d6", "#141414", "ink"),
        Bg::Paper => ("#dcd2c1", "#241f19", "ink"),
        Bg::Hex => {
            let hex = kit::intern(p.s("bg", "#080808"));
            if luma(hex) > 0.45 { (hex, "#141414", "ink") } else { (hex, "#dad7d0", "cap") }
        }
    }
}

pub fn look(p: P) -> (f32, f32) {
    match bg_kind(p) {
        Bg::Grey | Bg::Paper => (0.2, 0.0),
        Bg::Black => (0.15, 1.0),
        Bg::Hex => (1.0, 1.0),
    }
}

/// The card's ground: flat colour, or paper (beige, low-frequency mottle, dust specks).
pub fn ground_svg<'a>(p: P<'a>) -> Svgr<'a> {
    let (fill, _, _) = ground(p);
    if bg_kind(p) != Bg::Paper {
        return kit::fill(fill);
    }
    // measured dust specks of the reference page; `specks = [[x, y, r], ...]` replaces them
    let rows = p.rows("specks");
    let specks: Vec<(f32, f32, f32)> = if rows.is_empty() {
        vec![(480.0, 120.0, 4.2), (683.0, 83.0, 3.6), (491.0, 427.0, 4.0), (599.0, 440.0, 3.8)]
    } else {
        rows.iter().filter(|r| r.len() >= 3).map(|r| (r[0], r[1], r[2])).collect()
    };
    let dots: Vec<Svgr> = specks
        .iter()
        .map(|(x, y, r)| fframes::svgr!(<circle cx={*x} cy={*y} r={*r} fill="#6d6458" opacity="0.45" filter="url(#b1)" />))
        .collect();
    fframes::svgr!(<g>
        <defs>
            <filter id="card_mottle" x="0" y="0" width="1" height="1" filterUnits="objectBoundingBox">
                <feTurbulence type="fractalNoise" baseFrequency="0.004 0.006" numOctaves="3" seed="7" result="card_n" />
                <feColorMatrix in="card_n" type="matrix" values="0 0 0 0 0.42  0 0 0 0 0.37  0 0 0 0 0.30  0 0 0 -0.9 0.62" />
            </filter>
        </defs>
        // oversized so the page still fills the frame during a zoom-out
        <rect x="-200" y="-300" width="1120" height="1880" fill={fill} />
        <rect x="-200" y="-300" width="1120" height="1880" filter="url(#card_mottle)" opacity="0.3" />
        {dots}
    </g>)
}

fn family(p: P) -> &'static str {
    match p.s("font", "serif") {
        "script" => kit::SCRIPT,
        "sans" => kit::SANS,
        _ => kit::SERIF,
    }
}

/// Advance of `s` at `size` with `track` em of letter-spacing.
fn adv(frame: &mut Frame, ctx: &FFramesContext<'_, '_>, fam: &'static str, size: f32, track: f32, s: &str) -> f32 {
    let n = s.chars().count() as f32;
    let mut w = kit::text_w(frame, ctx, fam, 400, size.round().max(1.0) as usize, s) + track * size * n;
    if s.ends_with(' ') {
        // text_width drops a trailing space
        w += kit::text_w(frame, ctx, fam, 400, size as usize, "a a") - kit::text_w(frame, ctx, fam, 400, size as usize, "aa");
    }
    w
}

/// Text in the card's font with tracking, a hairline weight stroke and a filter.
#[allow(clippy::too_many_arguments)]
fn line<'a>(fam: &'static str, x: f32, y: f32, size: f32, bold: f32, track: f32, fill: &'a str, anchor: &'a str, filter: &str, s: String) -> Svgr<'a> {
    let f = if filter.is_empty() { String::new() } else { format!("url(#{filter})") };
    let ls = format!("{track}em");
    fframes::svgr!(<text x={x} y={y} font-family={fam} font-size={size} fill={fill} stroke={fill}
        stroke-width={bold} stroke-linejoin="round" letter-spacing={ls} text-anchor={anchor} filter={f}>{s}</text>)
}

/// Letters drawn one by one from left x `x0`. Letter i shows with progress
/// `p = clamp(count - i, 0, 1)`: when `pop`, it grows from `smin` about its own centre, fades
/// up and is soft until fully in (the reference shows a half-size "F", then a dot of an "r").
#[allow(clippy::too_many_arguments)]
pub fn reveal<'a>(
    frame: &mut Frame,
    ctx: &FFramesContext<'a, '_>,
    fam: &'static str,
    text: &str,
    count: f32,
    x0: f32,
    baseline: f32,
    size: f32,
    bold: f32,
    track_px: f32,
    smin: f32,
    pop: bool,
    fill: &'a str,
    filter: &str,
) -> Svgr<'a> {
    let chars: Vec<char> = text.chars().collect();
    if !pop {
        let n = count.floor().max(0.0) as usize;
        let s: String = chars.iter().take(n).collect();
        return line(fam, x0, baseline, size, bold, track_px / size, fill, "start", filter, s);
    }
    let mut parts: Vec<Svgr> = Vec::new();
    for (i, ch) in chars.iter().enumerate() {
        let p = kit::clamp01(count - i as f32);
        if p <= 0.0 || *ch == ' ' {
            continue;
        }
        let before = kit::text_w(frame, ctx, fam, 400, size as usize, &kit::prefix(text, i));
        let w = kit::text_w(frame, ctx, fam, 400, size as usize, &ch.to_string());
        let x = x0 + before + track_px * i as f32;
        let s = smin + (1.0 - smin) * p;
        let pivot = (x + w * 0.5, baseline + (1.0 - p) * size * 0.1);
        let soft = if p < 1.0 { "url(#b1)" } else { "" };
        let place = kit::scale_about(pivot.0, pivot.1, s);
        parts.push(fframes::svgr!(<g transform={place} opacity={0.45 + 0.55 * p}>
            <g filter={soft}>{line(fam, x, baseline, size, bold, 0.0, fill, "start", filter, ch.to_string())}</g>
        </g>));
    }
    fframes::svgr!(<g>{parts}</g>)
}

/// Characters shown at tick `tick`: an explicit per-tick list (`reveal`), else `rate` chars
/// per tick starting `delay` ticks in, from `start` (a fractional first letter).
fn shown(p: P, tick: i32, n: usize, rate: f32, start: f32, delay: f32) -> f32 {
    let list = p.fs("reveal");
    let c = if !list.is_empty() {
        list[(tick.max(0) as usize).min(list.len() - 1)]
    } else {
        let k = tick as f32 - p.f("delay", delay);
        if k < 0.0 { 0.0 } else { p.f("start", start) + p.f("rate", rate) * k }
    };
    c.clamp(0.0, n as f32)
}

pub fn render<'a>(p: P<'a>, tm: &T, frame: &mut Frame, ctx: &FFramesContext<'a, '_>) -> Svgr<'a> {
    let mode = p.s("enter", "type");
    let (_, ink, cap) = ground(p);
    let fill = kit::intern(p.s("color", ink));
    let filter = p.s("filter", cap);
    let fam = family(p);
    let text = p.s("text", "");
    let lines: Vec<&str> = text.split('\n').collect();
    let cx = p.f("x", 360.0);
    let i = tm.tick.max(0);

    // mode defaults: (size, baseline, bold, track em) measured per reference shot
    let (dsize, dbase, dbold, dtrack) = match mode {
        "cursor" => (43.0, 655.0, 0.15, 0.019),
        "pop" => (52.0, 657.0, 0.2, 0.05),
        "slide" => (57.0, 654.0, 0.2, 0.075),
        "zoom" => (122.0, 685.0, 0.6, 0.025),
        _ => (55.5, 660.0, 0.2, 0.054),
    };
    let mut size = p.f("size", dsize);
    let track = p.f("track", dtrack);
    let bold = p.f("bold", dbold);
    let lh = p.f("line_height", 1.18);
    // fit: shrink so the widest line stays inside `max_width`
    let max_w = p.f("max_width", 640.0);
    let widest = lines.iter().map(|l| adv(frame, ctx, fam, size, track, l)).fold(0.0, f32::max);
    if widest > max_w {
        size *= max_w / widest;
    }
    // block of lines centred on the baseline of a single line
    let base0 = p.f("y", dbase) - (lines.len() as f32 - 1.0) * size * lh / 2.0;
    let anchor = p.s("align", "center");

    let body: Svgr<'a> = match mode {
        "pop" => {
            let scales = p.fs("scales");
            let scales = if scales.is_empty() { vec![0.0, 0.74, 0.93, 1.0] } else { scales };
            let s = scales[(i as usize).min(scales.len() - 1)];
            if s <= 0.0 {
                Svgr::empty()
            } else {
                let rows: Vec<Svgr> = lines
                    .iter()
                    .enumerate()
                    .map(|(k, l)| line(fam, cx, base0 + k as f32 * size * lh, size, bold, track, fill, "middle", filter, l.to_string()))
                    .collect();
                fframes::svgr!(<g transform={kit::scale_about(cx, base0 - size * 0.33, s)}>{rows}</g>)
            }
        }
        "slide" | "zoom" => {
            // centre offset per tick from the final centre (ref px), measured
            let (offs, def) = if mode == "slide" {
                ("offsets", vec![306.0, 158.5, 91.5, 53.0, 29.0, 14.0, 5.0, 0.0])
            } else {
                ("offsets", vec![235.0, 138.0, 177.0, 114.0, 69.0, 39.0, 20.0, 7.0])
            };
            let o = p.fs(offs);
            let o = if o.is_empty() { def } else { o };
            let dx = o[(i as usize).min(o.len() - 1)];
            // zoom: small for `small_ticks`, then full size with a blur on the jump tick
            let small_ticks = p.i("small_ticks", 2) as i32;
            let (sz, base, b, blur) = if mode == "zoom" && i < small_ticks {
                let r = p.f("small", 0.4918);
                (size * r, base0 - 23.0 * size / dsize, bold * 0.5, "")
            } else if mode == "zoom" && i == small_ticks {
                (size, base0, bold, "url(#b4)")
            } else if mode == "slide" && i == 0 {
                (size, base0, bold, "url(#hb6)")
            } else {
                (size, base0, bold, "")
            };
            let rows: Vec<Svgr> = lines
                .iter()
                .enumerate()
                .map(|(k, l)| line(fam, cx + dx, base + k as f32 * sz * lh, sz, b, track, fill, "middle", filter, l.to_string()))
                .collect();
            fframes::svgr!(<g filter={blur}>{rows}</g>)
        }
        "cursor" => {
            let n: usize = text.chars().filter(|c| *c != '\n').count();
            let c = shown(p, i, n, 2.0, 0.0, 1.0).floor() as usize;
            // first tick where everything is typed; then the caret blinks (`blink` ticks on/off)
            let mut done_at = 0;
            while done_at < 600 && (shown(p, done_at, n, 2.0, 0.0, 1.0).floor() as usize) < n {
                done_at += 1;
            }
            let blink = (p.i("blink", 2) as i32).max(1);
            let caret_on = c < n || ((i - done_at) / blink) % 2 == 0;
            let gap = p.f("caret_gap", 9.0) * size / dsize;
            // typed chars per line; the caret sits on the last line that has any
            let mut left = c;
            let typed: Vec<String> = lines
                .iter()
                .map(|l| {
                    let len = l.chars().count();
                    let t = kit::prefix(l, left.min(len));
                    left = left.saturating_sub(len);
                    t
                })
                .collect();
            let active = typed.iter().rposition(|t| !t.is_empty()).unwrap_or(0);
            let mut rows: Vec<Svgr> = Vec::new();
            let mut caret: Svgr<'a> = Svgr::empty();
            for (k, t) in typed.into_iter().enumerate() {
                let tw = adv(frame, ctx, fam, size, track, &t);
                let y = base0 + k as f32 * size * lh;
                let g = if t.is_empty() { 0.0 } else { gap };
                // the line plus caret stays centred while typing
                let x0 = if anchor == "left" { p.f("x", 60.0) } else { cx - 2.5 - (tw + g + 2.0) / 2.0 };
                if k == active && caret_on {
                    caret = fframes::svgr!(<rect x={x0 + tw + g} y={y - size * 34.0 / 43.0} width={1.6 * size / 43.0}
                        height={size * 44.0 / 43.0} fill={fill} filter="url(#ink)" />);
                }
                rows.push(line(fam, x0, y, size, bold, track, fill, "start", filter, t));
            }
            fframes::svgr!(<g>{rows}{caret}</g>)
        }
        _ => {
            // type: letters land left to right; the finished block is centred (or `align`)
            let n: usize = text.chars().filter(|c| *c != '\n').count();
            let c = shown(p, i, n, 1.85, 0.35, 0.0);
            let pop = p.b("pop", true);
            let smin = p.f("smin", 0.3);
            let mut left = c;
            let mut rows: Vec<Svgr> = Vec::new();
            for (k, l) in lines.iter().enumerate() {
                let len = l.chars().count() as f32;
                let w = adv(frame, ctx, fam, size, track, l);
                let x0 = match anchor {
                    "left" => p.f("x", 60.0),
                    _ => p.f("left", cx - w / 2.0),
                };
                let y = base0 + k as f32 * size * lh;
                rows.push(reveal(frame, ctx, fam, l, left.min(len), x0, y, size, bold, track * size, smin, pop, fill, filter));
                left = (left - len).max(0.0);
            }
            fframes::svgr!(<g>{rows}</g>)
        }
    };

    // optional page zoom-out over the last ticks (the measured "What if…" pull-back)
    let zoom = p.fs("zoom");
    let s = if !zoom.is_empty() {
        zoom[(i as usize).min(zoom.len() - 1)]
    } else if p.b("zoom_out", false) {
        let tail = [0.977, 0.977, 0.955, 0.955, 0.93, 0.886, 0.856, 0.766];
        let from_end = tm.len - 1 - i;
        if from_end >= tail.len() as i32 { 1.0 } else { tail[tail.len() - 1 - from_end.max(0) as usize] }
    } else {
        1.0
    };
    fframes::svgr!(<g>
        <g transform={kit::scale_about(360.0, 640.0, s)}>
            {ground_svg(p)}
            {body}
        </g>
    </g>)
}

