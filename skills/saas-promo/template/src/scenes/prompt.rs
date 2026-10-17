//! `prompt`: an AI prompt box. A white blob sharpens into the box ("Let's build it..."), the
//! camera pushes in on the text corner, the prompt is typed with a caret while the camera pans
//! to keep the caret in frame, the camera pulls back to the whole box, a 3D cursor swings in
//! and clicks the send button (press, cyan flash, glow), blur out.
//!
//! Entrances (blob, push, typing) run on the entry clock; the pull-back, cursor and click run on
//! the exit clock, so a longer scene holds the typed prompt longer. Curves measured on the
//! reference promo (shot 272-368 at 25 fps). Params: references/kinds/prompt.md.
use crate::kit::{self, T, clamp01, ease_out, keys, lerp, seg, smooth};
use crate::spec::P;
use fframes::{FFramesContext, Frame, Svgr};

// ── layout (layer px; at camera scale 1 the box sits centred in the frame) ──────────────

const OUT_X: f32 = 226.0;
const OUT_Y: f32 = 239.0;
const OUT_W: f32 = 852.0;
const OUT_H: f32 = 248.0;
const IN_X: f32 = 243.0;
const IN_Y: f32 = 255.0;
const IN_W: f32 = 818.0;
const IN_H: f32 = 216.0;
const TEXT_X: f32 = 277.0;
const TEXT_Y: f32 = 311.5;
/// Box centre and the text corner the push zooms into.
const BOX_C: (f32, f32) = (652.0, 363.0);
const CORNER: (f32, f32) = (271.0, 272.0);
const SEND: (f32, f32) = (1020.0, 428.5);

/// Typing shape: (fraction of characters, seconds after the first key), measured on a 26
/// character prompt; longer prompts stretch it by sqrt(n / 26).
const TYPE_SHAPE: [(f32, f32); 17] = [
    (0.0, 0.0),
    (0.038, 0.024),
    (0.077, 0.144),
    (0.115, 0.224),
    (0.154, 0.304),
    (0.192, 0.344),
    (0.231, 0.384),
    (0.269, 0.424),
    (0.308, 0.464),
    (0.346, 0.504),
    (0.423, 0.544),
    (0.5, 0.584),
    (0.577, 0.624),
    (0.692, 0.664),
    (0.808, 0.704),
    (0.885, 0.744),
    (1.0, 0.824),
];

struct Cfg<'a> {
    text: &'a str,
    placeholder: &'a str,
    controls: [&'a str; 2],
    size: f32,
    /// First key (entry seconds), typing duration (animation seconds).
    t0: f32,
    dur: f32,
    /// Where the camera keeps the caret (screen x) while typing.
    pan_x: f32,
    hold_s: f32,
    click: bool,
}

fn cfg<'a>(p: P<'a>, frame: &mut Frame, ctx: &FFramesContext) -> Cfg<'a> {
    let text = p.s("text", "Build a cool sneaker store");
    let n = text.chars().count().max(1) as f32;
    // shrink the type so the prompt fits the field (one line)
    let mut size = p.f("size", 30.0);
    let field = IN_W - (TEXT_X - IN_X) * 2.0;
    let w = kit::text_w(frame, ctx, kit::look().ui, size, 400, text);
    if w > field {
        size = (size * field / w).max(18.0);
    }
    let dur = p.f("type_dur", 0.824 * (n / 26.0).sqrt().max(0.4));
    let controls = p.strs("controls");
    Cfg {
        text,
        placeholder: p.s("placeholder", "Let's build it..."),
        controls: [controls.first().copied().unwrap_or("Standard"), controls.get(1).copied().unwrap_or("Plan")],
        size,
        t0: p.f("type_at", 1.04),
        dur,
        pan_x: p.f("pan_x", 690.0),
        hold_s: p.f("zoom", 2.25),
        click: p.b("click", true),
    }
}

/// Characters typed at entry time `e`.
fn typed(c: &Cfg, e: f32) -> f32 {
    let n = c.text.chars().count() as f32;
    if e < c.t0 - 0.02 {
        return 0.0;
    }
    let u = (e - c.t0 + 0.024 * c.dur / 0.824) / c.dur * 0.824;
    // invert TYPE_SHAPE: seconds -> fraction
    let k: Vec<(f32, f32)> = TYPE_SHAPE.iter().map(|&(f, s)| (s, f)).collect();
    (keys(u, &k, |t| t) * n).floor()
}

/// Entry time at which character `i` (0-based) appears.
fn typed_at(c: &Cfg, i: usize) -> f32 {
    let (mut a, mut b) = (c.t0 - 0.1, c.t0 + c.dur + 0.2);
    for _ in 0..24 {
        let m = (a + b) / 2.0;
        if typed(c, m) >= (i + 1) as f32 { b = m } else { a = m }
    }
    b
}

/// Layer x of the caret after `n` characters.
fn caret_x(c: &Cfg, n: usize, frame: &mut Frame, ctx: &FFramesContext) -> f32 {
    if n == 0 {
        return TEXT_X;
    }
    let prefix: String = c.text.chars().take(n).collect();
    TEXT_X + kit::text_w(frame, ctx, kit::look().ui, c.size, 400, &prefix) + 3.0
}

/// Camera: (scale, e, f) with screen = s * layer + (e, f).
fn camera(c: &Cfg, tm: &T, frame: &mut Frame, ctx: &FFramesContext) -> (f32, f32, f32) {
    let e = tm.e();
    let x = tm.x();
    let type_end = c.t0 + c.dur;
    // the pull-back starts 1.8 s before the cut, but never before the prompt is typed
    let pull0 = (1.8f32).min(x + (e - type_end - 0.24).max(0.0)).max(0.96);
    let xp = x * 1.8 / pull0.max(1e-3);

    // 1. blob -> box (zoom about the box centre), 2. push in on the text corner
    let blob_s = keys(e, &[(0.0, 0.652), (0.04, 0.796), (0.08, 0.853), (0.12, 0.891), (0.16, 0.919), (0.2, 0.939), (0.24, 0.955), (0.28, 0.969), (0.32, 0.979), (0.36, 0.988), (0.44, 1.0)], |t| t);
    let push_s = keys(
        e,
        &[(0.44, 1.0), (0.52, 1.02), (0.6, 1.045), (0.64, 1.086), (0.68, 1.134), (0.72, 1.226), (0.76, 1.507), (0.8, 1.754), (0.84, 1.868), (0.88, 1.959), (0.92, 2.027), (0.96, 2.073), (1.0, 2.103), (1.08, 2.174), (1.2, 2.238), (1.32, 2.281), (1.48, 2.25)],
        |t| t,
    ) / 2.25
        * c.hold_s;
    let s_hold = if e < 0.44 { blob_s } else { push_s.max(1.0) };
    let w = smooth(seg(e, 0.36, 0.6));
    let fx = lerp(BOX_C.0, CORNER.0, w);
    let fy = lerp(BOX_C.1, CORNER.1, w);
    let mut ex = fx * (1.0 - s_hold);
    let fy_ = fy * (1.0 - s_hold);
    // follow cam: the camera wants the caret at pan_x on screen and follows it with a lag
    // (exponential, tau 0.1 s), so it trails while the prompt is typed fast and keeps
    // drifting a little after the last key, like the reference
    if e > c.t0 {
        let (mut acc, mut wsum) = (0.0, 0.0);
        for k in 0..16 {
            let ek = e - 0.025 * k as f32;
            let wk = (-0.025 * k as f32 / 0.1).exp();
            let n = typed(c, ek) as usize;
            let target = if ek > c.t0 { c.pan_x - s_hold * caret_x(c, n, frame, ctx) } else { ex };
            acc += wk * target.min(fx * (1.0 - s_hold));
            wsum += wk;
        }
        ex = acc / wsum;
    }
    if xp >= 1.8 {
        return (s_hold, ex, fy_);
    }
    // 3. pull back to the whole box, centred, and keep easing out to the cut
    let s_pull = keys(
        xp,
        &[(0.0, 0.86), (0.04, 0.878), (0.12, 0.913), (0.2, 0.936), (0.28, 0.951), (0.36, 0.963), (0.44, 0.975), (0.52, 0.988), (0.6, 0.998), (0.68, 1.011), (0.76, 1.029), (0.84, 1.057), (0.92, 1.108), (0.96, 1.149), (1.0, 1.21), (1.04, 1.29), (1.08, 1.39), (1.12, 1.51), (1.16, 1.62), (1.24, 1.80), (1.32, 1.93), (1.4, 2.03), (1.48, 2.10), (1.56, 2.15), (1.64, 2.19), (1.72, 2.22), (1.8, 2.247)],
        |t| t,
    );
    let q = clamp01((2.247 - s_pull) / (2.247 - 1.149));
    let s = if xp >= 0.96 { lerp(s_hold, 1.149, q) } else { s_pull };
    // box centre on screen: from where the hold camera had it to the frame centre
    let a = (s_hold * BOX_C.0 + ex, s_hold * BOX_C.1 + fy_);
    let b = (lerp(662.7, 648.5, seg(xp, 0.0, 0.96)), lerp(363.8, 373.5, seg(xp, 0.0, 0.96)));
    let pc = (lerp(a.0, b.0, q), lerp(a.1, b.1, q));
    (s, pc.0 - s * BOX_C.0, pc.1 - s * BOX_C.1)
}

fn hex(c: [f32; 3]) -> String {
    format!("#{:02x}{:02x}{:02x}", (c[0] * 255.0).round() as u8, (c[1] * 255.0).round() as u8, (c[2] * 255.0).round() as u8)
}

fn mix(a: [f32; 3], b: [f32; 3], t: f32) -> [f32; 3] {
    [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
}

/// The typed text (fresh characters fade from a pale blue-grey to the ink colour) + caret.
fn typed_text<'a>(c: &Cfg, e: f32, frame: &mut Frame, ctx: &FFramesContext<'a, '_>) -> Svgr<'a> {
    let n = typed(c, e) as usize;
    let fresh = [0.77, 0.81, 0.89];
    let ink = kit::hex3(kit::pal().ink);
    let ui = kit::look().ui.to_string();
    let mut spans = vec![];
    let mut x = TEXT_X;
    for (i, ch) in c.text.chars().take(n).enumerate() {
        let t = smooth(seg(e, typed_at(c, i) - 0.02, typed_at(c, i) + 0.08));
        let fill = hex(mix(fresh, ink, t));
        let st = ch.to_string();
        let fam = ui.clone();
        spans.push(fframes::svgr!(
            <text x={x} y={TEXT_Y} font-family={fam} font-size={c.size} font-weight="400" fill={fill}>{st}</text>
        ));
        // advance by the prefix width so kerning matches the whole string
        let prefix: String = c.text.chars().take(i + 1).collect();
        x = TEXT_X + kit::text_w(frame, ctx, &ui, c.size, 400, &prefix);
    }
    // caret: on once the push lands, solid while typing, then blinks (0.24 s on / off)
    let type_end = c.t0 + c.dur;
    let on = if e < 0.72 {
        false
    } else if e < type_end + 0.28 {
        !(e > c.t0 - 0.06 && e < c.t0)
    } else {
        (((e - type_end - 0.28) / 0.24) as i32) % 2 == 1
    };
    let caret_col = hex(mix(kit::hex3(kit::pal().accent), [0.29, 0.44, 0.82], 0.6));
    let caret = if on {
        let cx = x + if n > 0 { 3.0 } else { 0.0 };
        let h = c.size * 1.13;
        fframes::svgr!(<rect x={cx} y={TEXT_Y - c.size * 0.9} width="2.2" height={h} fill={caret_col} />)
    } else {
        Svgr::empty()
    };
    fframes::svgr!(<g>{spans}{caret}</g>)
}

fn chevrons(cx: f32) -> Svgr<'static> {
    let up = format!("M{} 424 L{} 418.3 L{} 424", cx - 5.6, cx, cx + 5.6);
    let dn = format!("M{} 432.5 L{} 438.2 L{} 432.5", cx - 5.6, cx, cx + 5.6);
    fframes::svgr!(
        <g fill="none" stroke="#8d8d8d" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <path d={up} />
            <path d={dn} />
        </g>
    )
}

/// The controls row: (+), mode, palette, bulb + plan, mic, send (press, flash, glow on x-clock).
fn controls(c: &Cfg, e: f32, x: f32, frame: &mut Frame, ctx: &FFramesContext) -> Svgr<'static> {
    let accent = kit::hex3(kit::pal().accent);
    let pale = mix(accent, [1.0, 1.0, 1.0], 0.45);
    let active = smooth(seg(e, c.t0 - 0.02, c.t0 + 0.04));
    let base = mix(pale, accent, active);
    let (press, flash, settle, glow_r, glow_a, arrow_a) = if c.click {
        (
            keys(-x, &[(-0.72, 0.0), (-0.68, 1.0), (-0.6, 0.0)], smooth),
            keys(-x, &[(-0.68, 0.0), (-0.6, 1.0), (-0.48, 0.8), (-0.2, 0.0)], smooth),
            smooth(seg(-x, -0.52, -0.2)),
            keys(-x, &[(-0.68, 30.0), (-0.56, 46.0), (-0.44, 56.0), (-0.2, 62.0)], ease_out),
            keys(-x, &[(-0.68, 0.0), (-0.6, 0.95), (-0.48, 0.85), (-0.32, 0.35), (-0.16, 0.0)], smooth),
            1.0 - 0.75 * keys(-x, &[(-0.64, 0.0), (-0.56, 1.0), (-0.44, 1.0), (-0.28, 0.3)], smooth),
        )
    } else {
        (0.0, 0.0, 0.0, 30.0, 0.0, 1.0)
    };
    // the exit clock falls as time runs: tables are keyed on -x
    let fill = hex(mix(mix(base, mix(accent, [0.55, 0.85, 1.0], 0.5), settle), [0.37, 0.86, 1.0], flash));
    let r = 26.5 * (1.0 - 0.1 * press);
    let ui = kit::look().ui.to_string();
    let mode = c.controls[0].to_string();
    let plan = c.controls[1].to_string();
    let mode_w = kit::text_w(frame, ctx, &ui, 22.0, 400, &mode);
    // the chevrons and palette follow the mode label's width ("Standard" = the reference)
    let shift = 348.0 + mode_w + 14.0 - 469.5;
    let chev1 = 469.5 + shift;
    let pal_t = format!("translate({shift:.2} 0)");
    let chev2 = 579.0 + shift;
    let (ui2, ui3) = (ui.clone(), ui.clone());
    fframes::svgr!(
        <g>
            <defs>
                <radialGradient id="pglow">
                    <stop offset="0" stop-color="#9ff2ff" stop-opacity="0.95" />
                    <stop offset="0.55" stop-color="#7fe0ff" stop-opacity="0.6" />
                    <stop offset="1" stop-color="#7fe0ff" stop-opacity="0" />
                </radialGradient>
            </defs>
            <circle cx="291" cy="428.5" r="28.5" fill="none" stroke="#5f5f5f" stroke-width="1.4" />
            <path d="M291 417.5 L291 439.5 M280 428.5 L302 428.5" stroke="#2c2c2c" stroke-width="1.9" stroke-linecap="round" />
            <text x="348" y="437" font-family={ui2} font-size="22" font-weight="400" fill="#9a9a9a">{mode}</text>
            {chevrons(chev1)}
            <g transform={pal_t}>
                <g fill="none" stroke="#8d8d8d" stroke-width="1.6" stroke-linejoin="round">
                    <path d="M540 416.5 C 533 416.5 528.5 421.5 528.5 427.5 C 528.5 433.8 533.5 438.8 539.5 438.8 C 541.8 438.8 542.6 437.4 542.2 435.6 C 541.6 433.1 542.9 431.4 545.4 431.4 L 547.8 431.4 C 550.3 431.4 551.8 429.6 551.8 427.2 C 551.8 421.2 546.6 416.5 540 416.5 Z" />
                </g>
                <circle cx="534.2" cy="428.4" r="1.6" fill="#8d8d8d" />
                <circle cx="536.6" cy="422.4" r="1.6" fill="#8d8d8d" />
                <circle cx="542.6" cy="421.0" r="1.6" fill="#8d8d8d" />
                <circle cx="547.4" cy="424.6" r="1.6" fill="#8d8d8d" />
            </g>
            {chevrons(chev2)}
            <g fill="none" stroke="#8d8d8d" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                <path d="M819 436 L819 432.5 C 815.5 430.5 813.5 427 813.5 423.5 C 813.5 418 818 414 823.5 414 C 829 414 833.5 418 833.5 423.5 C 833.5 427 831.5 430.5 828 432.5 L 828 436 Z" />
                <path d="M819.5 440.5 L827.5 440.5" />
            </g>
            <text x="849" y="436.5" font-family={ui3} font-size="22" font-weight="400" fill="#9a9a9a">{plan}</text>
            <g fill="none" stroke="#8d8d8d" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                <rect x="937.2" y="414" width="9.6" height="17" rx="4.8" />
                <path d="M932.5 426 C 932.5 431.8 936.8 435.6 942 435.6 C 947.2 435.6 951.5 431.8 951.5 426" />
                <path d="M942 435.6 L942 441" />
            </g>
            <circle cx="1020" cy="428.5" r={r} fill={fill} />
            <path d="M1020 439.5 L1020 418 M1011.5 426.5 L1020 418 L1028.5 426.5" fill="none" stroke="#ffffff" stroke-opacity={arrow_a} stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
            <circle cx="1020" cy="428.5" r={glow_r} fill="url(#pglow)" opacity={glow_a} />
        </g>
    )
}

/// The whole box in layer coordinates.
fn prompt_box<'a>(c: &Cfg, tm: &T, frame: &mut Frame, ctx: &FFramesContext<'a, '_>) -> Svgr<'a> {
    let e = tm.e();
    let ui = kit::look().ui.to_string();
    let placeholder = if e < 0.72 {
        let ph = c.placeholder.to_string();
        fframes::svgr!(<text x="281" y="310" font-family={ui} font-size="26" font-weight="400" fill="#999999">{ph}</text>)
    } else {
        Svgr::empty()
    };
    let text = typed_text(c, e, frame, ctx);
    let row = controls(c, e, tm.x(), frame, ctx);
    let panel = kit::pal().panel;
    let frost = kit::pal().frost;
    let edge = hex(mix(kit::hex3(kit::pal().highlight), kit::hex3(panel), 0.25));
    fframes::svgr!(
        <g>
            <rect x={OUT_X} y={OUT_Y} width={OUT_W} height={OUT_H} rx="42" fill={frost} fill-opacity="0.5" />
            <rect x={OUT_X + 0.75} y={OUT_Y + 0.75} width={OUT_W - 1.5} height={OUT_H - 1.5} rx="41.3" fill="none" stroke="#ffffff" stroke-opacity="0.4" stroke-width="1.5" />
            <rect x={IN_X} y={IN_Y} width={IN_W} height={IN_H} rx="28" fill={panel} />
            <rect x={IN_X + 1.2} y={IN_Y + 1.2} width={IN_W - 2.4} height={IN_H - 2.4} rx="27" fill="none" stroke={edge} stroke-width="2.4" />
            {placeholder}
            {text}
            {row}
        </g>
    )
}

/// The 3D cursor (navy arrow, thick white rim, pale extruded side), tip at (x, y).
pub fn cursor3d(x: f32, y: f32, s: f32, rot: f32, squash: f32, opacity: f32) -> Svgr<'static> {
    if opacity <= 0.01 {
        return Svgr::empty();
    }
    let t = format!("translate({x:.2} {y:.2}) rotate({rot:.2}) scale({:.4} {s:.4})", s * squash);
    let arrow = "M0 0 L0 33 L7.6 25.6 L13 38.2 L19.2 35.5 L13.9 23.2 L24.6 23.2 Z";
    fframes::svgr!(
        <g transform={t} opacity={opacity}>
            <g transform="translate(3.2 3.6)">
                <path d={arrow} fill="#c7cfe0" stroke="#c7cfe0" stroke-width="7" stroke-linejoin="round" />
            </g>
            <path d={arrow} fill="#ffffff" stroke="#ffffff" stroke-width="7" stroke-linejoin="round" />
            <path d={arrow} fill="#1b3170" />
        </g>
    )
}

pub fn render<'a>(p: P<'a>, tm: &T, frame: &mut Frame, ctx: &FFramesContext<'a, '_>) -> Svgr<'a> {
    let bg = kit::bg(frame, &kit::backdrop(p, tm, "prompt"));
    let c = cfg(p, frame, ctx);
    let (s, ex, fy) = camera(&c, tm, frame, ctx);
    let m = format!("matrix({s:.5} 0 0 {s:.5} {ex:.3} {fy:.3})");
    let body = prompt_box(&c, tm, frame, ctx);
    let (e, x) = (tm.e(), tm.x());
    // cursor: path relative to the send button's live screen position, on the exit clock
    let cur = if c.click && x <= 1.04 {
        let bx = s * SEND.0 + ex;
        let by = s * SEND.1 + fy;
        let ox = keys(-x, &[(-1.04, 162.0), (-1.0, 132.0), (-0.96, 106.0), (-0.92, 90.0), (-0.88, 72.0), (-0.84, 54.0), (-0.8, 42.0), (-0.76, 31.0), (-0.72, 23.0), (-0.68, 15.5), (-0.64, 9.0), (-0.6, 4.0), (-0.56, 0.0), (-0.48, -5.0), (-0.4, -7.0), (-0.24, -8.5), (-0.12, -8.0), (-0.04, -4.0)], |t| t);
        let oy = keys(-x, &[(-1.04, 78.0), (-1.0, 50.0), (-0.96, 27.0), (-0.92, 11.0), (-0.88, 7.0), (-0.84, 1.0), (-0.8, -3.0), (-0.76, -4.0), (-0.72, -5.5), (-0.68, -6.0), (-0.56, -5.0), (-0.48, -8.0), (-0.4, -9.0), (-0.12, -8.0), (-0.04, -7.5)], |t| t);
        let cs = 1.24 * keys(-x, &[(-1.0, 1.75), (-0.76, 1.70), (-0.72, 1.70), (-0.64, 1.30), (-0.52, 1.26), (-0.44, 1.45), (-0.36, 1.50), (-0.2, 1.47)], |t| t);
        let rot = keys(-x, &[(-1.04, 28.0), (-0.92, 14.0), (-0.8, 0.0)], |t| t);
        let sq = keys(-x, &[(-1.04, 0.35), (-0.96, 0.55), (-0.88, 0.85), (-0.8, 1.0)], |t| t);
        let cb = keys(-x, &[(-1.04, 9.0), (-0.96, 6.0), (-0.88, 2.0), (-0.8, 0.0)], |t| t);
        kit::blurred("pcurb", cb, cursor3d(bx + ox, by + oy, cs, rot, sq, 1.0))
    } else {
        Svgr::empty()
    };
    // blob sharpening in, blur out into the cut
    let blur = keys(e, &[(0.0, 17.0), (0.04, 12.5), (0.08, 9.0), (0.12, 6.0), (0.16, 3.6), (0.2, 2.0), (0.24, 0.9), (0.28, 0.0)], |t| t)
        + keys(-x, &[(-0.12, 0.0), (-0.08, 2.5), (-0.04, 10.0), (0.0, 14.0)], |t| t);
    let layer = fframes::svgr!(<g><g transform={m}>{body}</g>{cur}</g>);
    let layer = kit::blurred("pblur", blur, layer);
    fframes::svgr!(<g>{bg}{layer}</g>)
}

/// Drawn above the letterbox.
#[allow(dead_code)]
pub fn overlay(_p: P, _t: f32, _len: f32) -> Svgr<'static> {
    Svgr::empty()
}
