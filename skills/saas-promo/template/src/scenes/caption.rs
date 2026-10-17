//! `caption`: one to three lines of glass words on the backdrop. Words arrive one by one as
//! frosted glass (blurred, see-through, bright rim), rise a little into place and settle into
//! solid type; `[bracketed]` runs sit in a translucent box that pops in bright and grows out
//! from its centre. The whole group rides a camera move measured on the reference promo:
//!
//! - `settle` big and tilted -> flat, drifts up into the cut ("We're having a best ...")
//! - `push`   small -> grows in, shrinks and drifts up at the end ("Turn your idea ...")
//! - `drop`   huge drop-in, two-stage settle, grows and blurs out ("and you could win ...")
//! - `glide`  gentle settle, soft word blur, shrinks and blurs out ("New and improved ...")
//! - `lift`   a fast pull back from very close, one line, shrinks and blurs out (the
//!   "Bolt is free this weekend" headline of `tiles`)
//!
//! A move carries its whole measured treatment (camera, word look, rise, layout); every
//! number can be overridden from the spec (see references/kinds/caption.md). Entrances run
//! on the entry clock (`tm.e()`), exits on the exit clock (`tm.x()`), so a longer `dur` only
//! holds longer.
use crate::kit::{self, Look, Persp, T, Tok, clamp01, ease_in, ease_out, keys, seg, smooth};
use crate::spec::P;
use fframes::{FFramesContext, Frame, Svgr};

/// A measured caption treatment. Entry keys are on the entry clock (s since the scene
/// started), exit keys on the exit clock (s left before the cut), both ascending.
pub struct Move {
    pub name: &'static str,
    /// Camera scale about the frame centre, vertical offset (px), yaw (degrees).
    pub s: &'static [(f32, f32)],
    pub dy: &'static [(f32, f32)],
    pub ry: &'static [(f32, f32)],
    /// Exit: scale multiplier and vertical offset keyed on the exit clock.
    pub xs: &'static [(f32, f32)],
    pub xdy: &'static [(f32, f32)],
    /// Exit blur: (starts at x, ends at x, max blur px); start <= end = none.
    pub xblur: (f32, f32, f32),
    // layout at camera scale 1
    pub size: f32,
    pub gap: f32,
    pub pad: f32,
    pub leading: f32,
    /// First line's baseline.
    pub y: f32,
    pub glyph_scale: f32,
    pub box_top: f32,
    pub box_bot: f32,
    // word look
    /// Rise (px below its place when a word arrives) and its decay per second, per line.
    pub rise: [f32; 2],
    pub rise_k: [f32; 2],
    /// Blur at arrival per line (line 2+ uses the second), seconds to sharpen.
    pub blur0: [f32; 2],
    pub blur_dur: f32,
    /// Glass -> solid starts this long after arrival and lasts `glass_dur`.
    pub glass_from: f32,
    pub glass_dur: f32,
    // timing
    /// First word, gap between words, extra wait at a new line.
    pub start: f32,
    pub stagger: f32,
    pub line_wait: f32,
}

const NO_BLUR: (f32, f32, f32) = (0.0, 0.0, 0.0);
/// Having's exit: the group drifts up, accelerating, over the last 0.2 s.
const DRIFT_UP: &[(f32, f32)] = &[(0.0, -36.0), (0.04, -23.7), (0.08, -14.0), (0.12, -8.0), (0.16, -3.0), (0.2, 0.0)];
/// New's exit blur window.
const BLUR_OUT: (f32, f32, f32) = (0.104, 0.024, 16.0);

pub const MOVES: &[Move] = &[
    // "We're having a best / build competition" (reference frames 147-180)
    Move {
        name: "settle",
        s: &[(-0.04, 1.26), (0.04, 1.22), (0.12, 1.175), (0.24, 1.135), (0.32, 1.1185), (0.4, 1.0931), (0.48, 1.0733), (0.56, 1.0564), (0.64, 1.0423), (0.72, 1.031), (0.8, 1.0226), (0.88, 1.0141), (0.96, 1.0085), (1.04, 1.0042), (1.12, 1.0)],
        dy: &[(-0.04, 20.0), (0.24, 17.9), (0.32, 14.3), (0.4, 11.8), (0.48, 11.0), (0.56, 9.4), (0.64, 9.0), (0.8, 9.1), (0.88, 8.3), (0.96, 7.8), (1.0, 7.5), (1.04, 6.4), (1.08, 5.3), (1.12, 3.0), (1.16, 0.0)],
        ry: &[(-0.04, 12.0), (0.2, 7.0), (0.44, 2.0), (0.68, 0.0)],
        xs: &[],
        xdy: DRIFT_UP,
        xblur: NO_BLUR,
        size: 81.4,
        gap: 25.0,
        pad: 16.0,
        leading: 105.5,
        y: 325.0,
        glyph_scale: 0.96,
        box_top: 1.0,
        box_bot: 0.3,
        rise: [14.0, 21.0],
        rise_k: [11.25, 8.25],
        blur0: [12.0, 3.0],
        blur_dur: 0.28,
        glass_from: 0.04,
        glass_dur: 0.24,
        start: -0.02,
        stagger: 0.07,
        line_wait: 0.01,
    },
    // "Turn your idea / into a product" (frames 181-226)
    Move {
        name: "push",
        s: &[(-0.04, 0.85), (0.16, 0.8668), (0.2, 0.8699), (0.24, 0.873), (0.28, 0.8793), (0.32, 0.8918), (0.36, 0.9216), (0.4, 0.953), (0.44, 0.9655), (0.48, 0.9749), (0.52, 0.9796), (0.56, 0.9859), (0.6, 0.989), (0.64, 0.9922), (0.72, 0.9953), (0.8, 0.9984), (0.88, 1.0)],
        dy: &[(-0.04, 15.5), (0.08, 12.5), (0.16, 11.4), (0.2, 9.7), (0.24, 9.05), (0.28, 7.7), (0.32, 7.0), (0.36, 6.0), (0.4, 5.2), (0.44, 3.5), (0.48, 3.4), (0.52, 1.9), (0.56, 1.6), (0.64, 1.2), (0.72, 0.5), (0.8, 0.0)],
        ry: &[],
        xs: &[(0.0, 0.9013), (0.12, 0.9013), (0.2, 0.9028), (0.28, 0.906), (0.32, 0.9091), (0.36, 0.9122), (0.4, 0.9185), (0.44, 0.9279), (0.48, 0.9498), (0.52, 0.9734), (0.56, 0.9828), (0.6, 0.989), (0.64, 0.9922), (0.72, 0.9969), (0.8, 1.0)],
        xdy: &[(0.0, -42.0), (0.04, -29.1), (0.08, -20.1), (0.12, -15.1), (0.16, -11.1), (0.2, -6.9), (0.24, -4.75), (0.28, -3.6), (0.32, -2.3), (0.36, -1.0), (0.4, -0.4), (0.52, 0.0)],
        xblur: NO_BLUR,
        size: 97.2,
        gap: 33.0,
        pad: 19.0,
        leading: 130.5,
        y: 325.5,
        glyph_scale: 0.93,
        box_top: 0.97,
        box_bot: 0.31,
        rise: [24.0, 24.0],
        rise_k: [21.25, 18.75],
        blur0: [1.5, 1.5],
        blur_dur: 0.12,
        glass_from: 0.08,
        glass_dur: 0.24,
        start: -0.02,
        stagger: 0.08,
        line_wait: 0.0,
    },
    // "and you could / win $10,000" (frames 227-271)
    Move {
        name: "drop",
        s: &[(-0.04, 1.52), (0.0, 1.45), (0.04, 1.335), (0.08, 1.288), (0.12, 1.254), (0.16, 1.227), (0.2, 1.2004), (0.24, 1.185), (0.28, 1.1734), (0.32, 1.1618), (0.4, 1.1541), (0.44, 1.1503), (0.48, 1.1464), (0.52, 1.1426), (0.56, 1.1387), (0.6, 1.1329), (0.64, 1.1272), (0.68, 1.1214), (0.72, 1.1118), (0.76, 1.1002), (0.8, 1.0809), (0.84, 1.0578), (0.88, 1.0385), (0.92, 1.0289), (0.96, 1.0212), (1.0, 1.0154), (1.04, 1.0116), (1.08, 1.0077), (1.12, 1.0039), (1.2, 1.0)],
        dy: &[],
        ry: &[],
        xs: &[(0.0, 1.062), (0.08, 1.0462), (0.12, 1.0385), (0.16, 1.0308), (0.2, 1.0231), (0.24, 1.0173), (0.28, 1.0116), (0.32, 1.0077), (0.4, 1.0039), (0.44, 1.0)],
        xdy: &[],
        xblur: (0.096, 0.016, 14.0),
        size: 83.0,
        gap: 29.0,
        pad: 17.0,
        leading: 113.0,
        y: 332.0,
        glyph_scale: 0.90,
        box_top: 1.03,
        box_bot: 0.28,
        rise: [22.0, 40.0],
        rise_k: [17.5, 7.5],
        blur0: [1.5, 1.5],
        blur_dur: 0.12,
        glass_from: 0.08,
        glass_dur: 0.2,
        start: -0.02,
        stagger: 0.08,
        line_wait: 0.0,
    },
    // "New and improved / builds welcome" (frames 450-491)
    Move {
        name: "glide",
        s: &[(0.0, 1.15), (0.08, 1.13), (0.16, 1.115), (0.24, 1.10), (0.28, 1.088), (0.32, 1.076), (0.36, 1.064), (0.44, 1.054), (0.52, 1.040), (0.6, 1.028), (0.68, 1.020), (0.76, 1.014), (0.84, 1.008), (0.92, 1.004), (1.04, 1.0)],
        dy: &[(0.0, 0.5), (0.8, 0.5), (1.0, 0.0)],
        ry: &[],
        xs: &[(0.0, 0.74), (0.08, 0.831), (0.12, 0.877), (0.16, 0.906), (0.2, 0.928), (0.24, 0.945), (0.28, 0.957), (0.32, 0.968), (0.36, 0.975), (0.4, 0.982), (0.44, 0.986), (0.48, 0.989), (0.52, 0.993), (0.6, 0.997), (0.64, 1.0)],
        xdy: &[],
        xblur: BLUR_OUT,
        size: 82.5,
        gap: 30.0,
        pad: 13.0,
        leading: 91.5,
        y: 348.0,
        glyph_scale: 0.96,
        box_top: 1.0,
        box_bot: 0.3,
        rise: [10.0, 34.0],
        rise_k: [10.0, 8.25],
        blur0: [13.0, 2.5],
        blur_dur: 0.4,
        glass_from: 0.2,
        glass_dur: 0.24,
        start: 0.08,
        stagger: 0.026,
        line_wait: 0.12,
    },
    // "Bolt is free this weekend" headline over the date tiles (frames 100-146)
    Move {
        name: "lift",
        s: &[(-0.04, 1.48), (0.0, 1.40), (0.04, 1.24), (0.08, 1.16), (0.12, 1.115), (0.16, 1.0813), (0.2, 1.0639), (0.24, 1.0499), (0.28, 1.0395), (0.32, 1.0302), (0.36, 1.0232), (0.4, 1.0163), (0.44, 1.0116), (0.48, 1.007), (0.52, 1.0046), (0.56, 1.0023), (0.6, 1.0)],
        dy: &[(-0.04, 85.0), (0.0, 75.0), (0.04, 56.0), (0.08, 40.0), (0.12, 29.0), (0.16, 20.2), (0.2, 14.5), (0.24, 11.6), (0.28, 10.4), (0.32, 8.4), (0.36, 6.9), (0.4, 5.45), (0.44, 3.5), (0.48, 2.5), (0.52, 2.0), (0.56, 1.5), (0.6, 1.0), (0.64, 0.0)],
        ry: &[],
        xs: &[(0.0, 0.84), (0.08, 0.8897), (0.12, 0.9106), (0.16, 0.928), (0.2, 0.9419), (0.24, 0.9524), (0.28, 0.9628), (0.32, 0.971), (0.36, 0.9779), (0.4, 0.9837), (0.44, 0.9884), (0.48, 0.9907), (0.52, 0.9942), (0.56, 0.9965), (0.6, 0.9977), (0.64, 0.9988), (0.68, 1.0)],
        xdy: &[],
        xblur: (0.128, 0.02, 14.0),
        size: 80.0,
        gap: 19.0,
        pad: 15.0,
        leading: 104.0,
        y: 207.5,
        glyph_scale: 1.0,
        box_top: 0.95,
        box_bot: 0.33,
        rise: [0.0, 0.0],
        rise_k: [10.0, 10.0],
        blur0: [11.0, 2.5],
        blur_dur: 0.28,
        glass_from: 0.06,
        glass_dur: 0.16,
        start: -0.008,
        stagger: 0.056,
        line_wait: 0.0,
    },
];

pub fn find_move(name: &str) -> &'static Move {
    MOVES.iter().find(|m| m.name == name).unwrap_or(&MOVES[0])
}

/// A caption's resolved parameters: the move's measured values with the spec's overrides.
pub struct Style {
    pub mv: &'static Move,
    pub size: f32,
    /// Weight the layout is measured at, and the weight the glyphs are drawn at (a lighter
    /// `ink_weight` keeps every word's advance: the reference strokes are about Light).
    pub weight: u16,
    pub ink_weight: u16,
    pub gap: f32,
    pub pad: f32,
    pub leading: f32,
    pub y: f32,
    pub cx: f32,
    pub glyph_scale: f32,
    pub box_top: f32,
    pub box_bot: f32,
    pub rise: [f32; 2],
    pub rise_k: [f32; 2],
    pub blur0: [f32; 2],
    pub blur_dur: f32,
    pub glass_from: f32,
    pub glass_dur: f32,
    /// Camera strength: scales (s - 1), dy and yaw of the entry; `cam = false` = still.
    pub zoom: f32,
    pub tilt: f32,
    /// Exit treatment: "move" (the move's own), "drift", "blur", "cut".
    pub exit: String,
    pub glow: f32,
}

impl Style {
    pub fn from(p: P) -> Self {
        Self::from_with(p, "settle")
    }

    /// Like `from`, with another default move.
    pub fn from_with(p: P, default_move: &str) -> Self {
        let mv = find_move(p.s("move", default_move));
        let pair = |k: &str, d: [f32; 2]| -> [f32; 2] {
            let v = p.fs(k);
            match v.len() {
                0 => d,
                1 => [v[0], v[0]],
                _ => [v[0], v[1]],
            }
        };
        let size = p.f("size", mv.size);
        // layout numbers scale with a changed size unless set explicitly
        let k = size / mv.size;
        let still = !p.b("cam", true);
        let weight = p.i("weight", kit::look().weight as i64) as u16;
        Style {
            mv,
            size,
            weight,
            ink_weight: p.i("ink_weight", weight as i64) as u16,
            gap: p.f("gap", mv.gap * k),
            pad: p.f("pad", mv.pad * k),
            leading: p.f("leading", mv.leading * k),
            y: p.f("y", mv.y),
            cx: p.f("x", 640.0),
            glyph_scale: p.f("glyph_scale", mv.glyph_scale),
            box_top: p.f("box_top", mv.box_top),
            box_bot: p.f("box_bot", mv.box_bot),
            rise: pair("rise", mv.rise),
            rise_k: pair("rise_k", mv.rise_k),
            blur0: pair("blur", mv.blur0),
            blur_dur: p.f("blur_dur", mv.blur_dur),
            glass_from: p.f("glass_from", mv.glass_from),
            glass_dur: p.f("glass_dur", mv.glass_dur),
            zoom: if still { 0.0 } else { p.f("zoom", 1.0) },
            tilt: if still { 0.0 } else { p.f("tilt", 1.0) },
            exit: p.s("exit", "move").to_string(),
            glow: p.f("glow", kit::look().glow),
        }
    }

    fn xs(&self) -> &'static [(f32, f32)] {
        match self.exit.as_str() {
            "move" => self.mv.xs,
            _ => &[],
        }
    }
    fn xdy(&self) -> &'static [(f32, f32)] {
        match self.exit.as_str() {
            "move" => self.mv.xdy,
            "drift" => DRIFT_UP,
            _ => &[],
        }
    }
    pub fn xblur(&self) -> (f32, f32, f32) {
        match self.exit.as_str() {
            "move" => self.mv.xblur,
            "blur" => BLUR_OUT,
            _ => NO_BLUR,
        }
    }

    /// Camera at entry clock `e`, exit clock `x`.
    pub fn cam(&self, e: f32, x: f32) -> Persp {
        let mv = self.mv;
        let mut c = Persp::flat();
        let s_in = if mv.s.is_empty() { 1.0 } else { keys(e, mv.s, |t| t) };
        let s_out = if self.xs().is_empty() { 1.0 } else { keys(x, self.xs(), |t| t) };
        c.s = (1.0 + (s_in - 1.0) * self.zoom) * s_out;
        let dy_in = if mv.dy.is_empty() { 0.0 } else { keys(e, mv.dy, |t| t) };
        let dy_out = if self.xdy().is_empty() { 0.0 } else { keys(x, self.xdy(), |t| t) };
        c.dy = dy_in * self.zoom + dy_out;
        let ry = if mv.ry.is_empty() { 0.0 } else { keys(e, mv.ry, |t| t) };
        c.ry = (ry * self.tilt).to_radians();
        c
    }

    /// The exit blur's progress 0..1 at exit clock `x`.
    pub fn exit_p(&self, x: f32) -> f32 {
        let (a, b, _) = self.xblur();
        if a > b { clamp01((a - x) / (a - b)) } else { 0.0 }
    }

    /// A word's look `age` seconds after it starts to arrive (line 0 or later).
    pub fn word_look(&self, age: f32, hl: bool, line: usize) -> Look {
        let li = line.min(1);
        let blur = self.blur0[li] * (1.0 - ease_out(seg(age, 0.0, self.blur_dur)));
        let glass = if hl { 1.0 - smooth(seg(age, -0.02, 0.02)) } else { 1.0 - smooth(seg(age, self.glass_from, self.glass_from + self.glass_dur)) };
        Look { blur, glass, opacity: smooth(seg(age, -0.024, 0.032)), glow: if hl { self.glow * 1.7 } else { self.glow } }
    }

    /// The exit blur applied on top of a look.
    pub fn exit_look(&self, x: f32, mut l: Look) -> Look {
        let (_, _, mx) = self.xblur();
        let p = self.exit_p(x);
        if p > 0.0 {
            l.blur += mx * ease_in(clamp01(p * 1.2)).max(p * 0.6);
            l.glass = l.glass.max(smooth(seg(p, 0.0, 0.5)) * 0.6);
            l.opacity *= 1.0 - smooth(seg(p, 0.3, 1.0));
        }
        l
    }

    /// Opacity of boxes during the exit.
    pub fn exit_op(&self, x: f32) -> f32 {
        1.0 - smooth(seg(self.exit_p(x), 0.3, 1.0))
    }
}

/// Markup for one line: `[...]` marks a highlight run. Like `kit::parse_line`, but a closing
/// bracket may be followed by punctuation (`"[backlog], cleared"`): the punctuation stays on
/// the word and the run ends there.
pub fn parse_line(s: &str) -> Vec<Tok> {
    let mut out = vec![];
    let mut hl = false;
    for raw in s.split_whitespace() {
        let mut w = raw.to_string();
        if w.starts_with('[') {
            w.remove(0);
            hl = true;
        }
        let close = w.contains(']');
        let w = w.replace(']', "");
        if !w.is_empty() {
            out.push(Tok { text: w, hl });
        }
        if close {
            hl = false;
        }
    }
    out
}

/// One placed word.
pub struct Placed {
    pub text: String,
    pub line: usize,
    pub hl: bool,
    /// Left edge and advance at the layout size.
    pub x: f32,
    pub w: f32,
    /// Seconds (entry clock) it starts to arrive.
    pub at: f32,
    /// Extra letter spacing (px).
    pub ls: f32,
}

/// A highlight run's box: line, left and right edge, pop time, index of its first word.
pub struct Run {
    pub line: usize,
    pub x0: f32,
    pub x1: f32,
    pub at: f32,
    pub first: usize,
}

/// Lay out `lines` (markup) and time every word. Overrides from `p`: `at` (seconds per word),
/// `box_at` (seconds per run), `gaps` and `ls` (`[[word index, px], ...]`), `start`,
/// `stagger`, `line_wait`.
pub fn layout(st: &Style, lines: &[Vec<Tok>], p: P, frame: &mut Frame, ctx: &FFramesContext) -> (Vec<Placed>, Vec<Run>) {
    let fam = kit::look().display;
    let at_over = p.fs("at");
    let box_over = p.fs("box_at");
    let gap_over = p.rows("gaps");
    let ls_over = p.rows("ls");
    let over = |rows: &Vec<Vec<f32>>, i: usize| rows.iter().find(|r| r.len() >= 2 && r[0] as usize == i).map(|r| r[1]);
    let start = p.f("start", st.mv.start);
    let stagger = p.f("stagger", st.mv.stagger);
    let line_wait = p.f("line_wait", st.mv.line_wait);
    let run_wait = p.f("run_wait", 0.0);

    let mut words: Vec<Placed> = vec![];
    let mut runs: Vec<Run> = vec![];
    let mut t = start;
    let mut idx = 0usize;
    for (li, toks) in lines.iter().enumerate() {
        if li > 0 {
            t += line_wait;
        }
        let first_in_line = words.len();
        let mut x = 0.0f32;
        let mut prev_hl = false;
        for (n, tok) in toks.iter().enumerate() {
            let ls = over(&ls_over, idx).unwrap_or(0.0);
            let w = kit::text_w(frame, ctx, fam, st.size, st.weight, &tok.text) + ls * tok.text.chars().count() as f32;
            if n > 0 {
                x += over(&gap_over, idx).unwrap_or(st.gap);
            }
            // a word that continues a highlight run arrives with the run's first word
            let joins = tok.hl && prev_hl;
            if idx > 0 {
                t += if joins { 0.002 } else { stagger };
                if tok.hl && !prev_hl {
                    t += run_wait;
                }
            }
            let at = at_over.get(idx).copied().unwrap_or(t);
            if tok.hl && !prev_hl {
                x += st.pad;
                runs.push(Run { line: li, x0: x - st.pad, x1: 0.0, at, first: words.len() });
            }
            words.push(Placed { text: tok.text.clone(), line: li, hl: tok.hl, x, w, at, ls });
            x += w;
            let next_hl = toks.get(n + 1).map(|t| t.hl).unwrap_or(false);
            if tok.hl && !next_hl {
                x += st.pad;
                if let Some(r) = runs.last_mut() {
                    r.x1 = x;
                }
            }
            prev_hl = tok.hl;
            idx += 1;
        }
        // centre the line (boxes included) on cx
        let shift = st.cx - x / 2.0;
        for w in &mut words[first_in_line..] {
            w.x += shift;
        }
        for r in runs.iter_mut().filter(|r| r.line == li) {
            if r.first >= first_in_line {
                r.x0 += shift;
                r.x1 += shift;
            }
        }
    }
    for (i, r) in runs.iter_mut().enumerate() {
        if let Some(b) = box_over.get(i) {
            r.at = *b;
        }
    }
    (words, runs)
}

/// Draw placed words and their boxes at entry clock `e` / exit clock `x` through `cam`.
/// `rise_of(word)` gives each word's vertical offset; `id` prefixes filter ids.
#[allow(clippy::too_many_arguments)]
pub fn draw<'a>(
    st: &Style,
    words: &[Placed],
    runs: &[Run],
    e: f32,
    x: f32,
    cam: &Persp,
    id: &str,
    rise_of: &dyn Fn(&Placed) -> f32,
    frame: &mut Frame,
    ctx: &FFramesContext<'a, '_>,
) -> (Vec<Svgr<'static>>, Vec<Svgr<'static>>) {
    let fam = kit::look().display;
    let exit_op = st.exit_op(x);
    let mut boxes = vec![];
    for r in runs {
        let base = st.y + r.line as f32 * st.leading + rise_of(&words[r.first]);
        let top = base - st.size * st.box_top;
        let h = st.size * (st.box_top + st.box_bot);
        boxes.push(kit::hl_box(r.x0, r.x1, top, h, e - r.at, exit_op, cam));
    }
    let mut out = vec![];
    for (n, w) in words.iter().enumerate() {
        let age = e - w.at;
        if age < -0.024 {
            continue;
        }
        let y = st.y + w.line as f32 * st.leading + rise_of(w);
        let look = st.exit_look(x, st.word_look(age, w.hl, w.line));
        // glyphs are drawn a little smaller than the layout size and tracked out so each word
        // keeps its advance: the reference type is lighter and more open than Inter at the
        // size its word widths imply
        let gsize = st.size * st.glyph_scale;
        let n_ch = w.text.chars().count().max(1) as f32;
        let extra = (kit::text_w(frame, ctx, fam, st.size, st.weight, &w.text) - kit::text_w(frame, ctx, fam, gsize, st.ink_weight, &w.text)) / n_ch;
        out.push(kit::glass_word(&format!("{id}w{n}"), &w.text, fam, w.x, y, gsize, st.ink_weight, w.ls + extra, w.w, &look, cam));
    }
    (boxes, out)
}

pub fn render<'a>(p: P<'a>, tm: &T, frame: &mut Frame, ctx: &FFramesContext<'a, '_>) -> Svgr<'a> {
    let bg = kit::bg(frame, &kit::backdrop(p, tm, "turn"));
    let st = Style::from(p);
    let lines: Vec<Vec<Tok>> = p.strs("lines").iter().map(|l| parse_line(l)).collect();
    let mut st = st;
    // the moves are measured on two lines; centre any other count on the same middle
    if !p.has("y") {
        st.y += (2.0 - lines.len().max(1) as f32) * st.leading / 2.0;
    }
    let st = st;
    let (words, runs) = layout(&st, &lines, p, frame, ctx);
    let (e, x) = (tm.e(), tm.x());
    let cam = st.cam(e, x);
    let rise_of = |w: &Placed| -> f32 {
        let li = w.line.min(1);
        st.rise[li] * (-st.rise_k[li] * (e - w.at).max(0.0)).exp()
    };
    let id = format!("cap{}", (tm.g * 100.0) as i64);
    let (boxes, ws) = draw(&st, &words, &runs, e, x, &cam, &id, &rise_of, frame, ctx);
    fframes::svgr!(
        <g>
            {bg}
            {boxes}
            {ws}
        </g>
    )
}

/// Drawn above the letterbox.
#[allow(dead_code)]
pub fn overlay(_p: P, _t: f32, _len: f32) -> Svgr<'static> {
    Svgr::empty()
}
