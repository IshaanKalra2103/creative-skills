//! kawaii-pink: a 5.5 s hand-drawn logo sting. One magenta line on pale grey, a bubble-letter
//! wordmark, an original mascot that swallows the logo.
//!
//! Beat sheet (seconds):
//! 0.00 a stretched seed drops through the frame
//! 0.15 three smears whoosh in and snap into stars
//! 0.62 the mascot seed falls onto its seat on the word and splats
//! 0.92 the lower star smears into the pen that starts the first letter
//! 1.05 the letters inflate one after another, outline stars pop, the mascot grows a face
//! 1.70 hold: boiling lines, two blinks, a glance left
//! 2.95 anticipation, mouth opens
//! 3.30 the mascot slurps the whole logo
//! 4.40 it hops to the centre, splats flat, stretches tall, settles happy
//!
//! Everything is built from point lists so the slurp can warp every letter and star toward
//! the mouth. The frame is drawn twice: a faint 3.1x echo behind, the real thing in front,
//! both through a turbulence displacement that changes every other frame (line boil).
pub mod geom;
pub mod glyphs;
pub mod mascot;

use fframes::{AudioMap, Color, Duration, FFramesContext, Frame, Svgr, Video, include_media_dir};
use geom::*;
use mascot::MochiBeats;
use std::f32::consts::{PI, TAU};

include_media_dir!(pub struct KawaiiPinkMedia, "media");

pub const WIDTH: usize = 1080;
pub const HEIGHT: usize = 1080;
pub const FPS: usize = 30;
pub const LENGTH: f32 = 5.5;

const BG: &str = "#f0f0f0";
const ECHO_INK: &str = "#e8e8e8";
/// Outline weight of the wordmark.
pub const LINE: f32 = 14.0;
/// The echo: how much bigger, and how far behind in time.
const ECHO_SCALE: f32 = 3.1;
const ECHO_LAG: f32 = 0.1;

// beats
const DRAW_AT: f32 = 1.05;
const LETTER_DRAW: f32 = 0.32;
const SLURP_AT: f32 = 3.3;
const GULP_AT: f32 = 4.3;
const HOP_AT: f32 = 4.40;
const LAND_AT: f32 = 4.60;
const LAND: Pt = (540.0, 660.0);

#[derive(Clone, Copy)]
pub struct Pal {
    pub ink: &'static str,
    pub paper: &'static str,
}

pub struct Config {
    /// A-Z, space and "!" (lowercase is drawn as uppercase)
    pub word: String,
    /// line colour, any CSS colour
    pub ink: String,
    /// mascot seat along the word, 0 = left edge, 1 = right edge
    pub seat: f32,
}

impl Default for Config {
    fn default() -> Self {
        Self { word: "MOCHI".into(), ink: "#ee17bc".into(), seat: 0.56 }
    }
}

// ---------------------------------------------------------------- the slurp

/// Pulls points into the mouth: near points first, so shapes stretch into streaks.
struct Slurp {
    mouth: Pt,
    t: f32,
}

impl Slurp {
    fn pull(&self, p: Pt) -> f32 {
        let delay = 0.5 * (dist(p, self.mouth) / 650.0).min(1.0);
        let a = SLURP_AT + 0.05 + delay;
        ease_in(seg(self.t, a, a + 0.42))
    }
    fn apply(&self, p: Pt) -> (Pt, f32) {
        let a = self.pull(p);
        if a <= 0.0 {
            return (p, 0.0);
        }
        let v = rot(sub(p, self.mouth), -1.1 * a);
        (add(self.mouth, mul(v, 1.0 - a)), a)
    }
    /// Warps a polyline; returns the points, their mean pull and their smallest pull.
    fn warp(&self, pts: &[Pt]) -> (Vec<Pt>, f32, f32) {
        let mut sum = 0.0;
        let mut min = 1.0f32;
        let out = pts
            .iter()
            .map(|&p| {
                let (q, a) = self.apply(p);
                sum += a;
                min = min.min(a);
                q
            })
            .collect();
        (out, sum / pts.len().max(1) as f32, min)
    }
}

// ---------------------------------------------------------------- wordmark

struct Stroke {
    pts: Vec<Pt>,
    w: f32,
    len: f32,
    seam: bool,
}
struct Letter {
    strokes: Vec<Stroke>,
    len: f32,
    dot: Option<(Pt, f32)>,
}

pub struct Word {
    letters: Vec<Letter>,
    /// outline bounds in the frame: x0, y0, x1, y1
    bbox: (f32, f32, f32, f32),
    /// where the mascot sits: bottom centre
    sit: Pt,
    stagger: f32,
}

const WORD_CENTER: Pt = (540.0, 590.0);
const WORD_MAX_W: f32 = 800.0;
const WORD_MAX_H: f32 = 300.0;
const WORD_TILT: f32 = -0.06;
/// Per-letter bounce: baseline offset and scale, cycling.
const BOUNCE: [(f32, f32); 7] = [(0.0, 1.0), (-14.0, 0.95), (4.0, 1.0), (0.0, 1.0), (-10.0, 1.0), (6.0, 0.97), (-6.0, 1.0)];

impl Word {
    pub fn build(text: &str, seat: f32) -> Self {
        // lay glyphs out left to right in design space
        let mut placed: Vec<(glyphs::Glyph, f32, f32, f32)> = Vec::new();
        let mut x = 0.0;
        for (i, ch) in text.chars().enumerate() {
            let Some(g) = glyphs::glyph(ch) else { continue };
            let (oy, s) = BOUNCE[i % BOUNCE.len()];
            let w = g.width;
            if !g.strokes.is_empty() {
                placed.push((g, x, oy, s));
            }
            x += (w + glyphs::GAP) * s;
        }
        assert!(!placed.is_empty(), "no drawable letters in {text:?}");

        // fit: bounding box including half stroke widths and the outline
        let (mut x0, mut x1, mut y0, mut y1) = (f32::MAX, f32::MIN, f32::MAX, f32::MIN);
        for (g, ox, oy, s) in &placed {
            for st in &g.strokes {
                let h = st.w * s / 2.0 + LINE;
                for (px, py) in &st.pts {
                    let (px, py) = (ox + px * s, oy + py * s);
                    x0 = x0.min(px - h);
                    x1 = x1.max(px + h);
                    y0 = y0.min(py - h);
                    y1 = y1.max(py + h);
                }
            }
        }
        let f = (WORD_MAX_W / (x1 - x0)).min(WORD_MAX_H / (y1 - y0));
        let mid = ((x0 + x1) / 2.0, (y0 + y1) / 2.0);
        let place = |p: Pt| -> Pt {
            let q = add(WORD_CENTER, mul(sub(p, mid), f));
            add(WORD_CENTER, rot(sub(q, WORD_CENTER), WORD_TILT))
        };

        let letters: Vec<Letter> = placed
            .into_iter()
            .map(|(g, ox, oy, s)| {
                let strokes: Vec<Stroke> = g
                    .strokes
                    .into_iter()
                    .map(|st| {
                        let pts: Vec<Pt> = st.pts.into_iter().map(|(x, y)| place((ox + x * s, oy + y * s))).collect();
                        let len = polylen(&pts).max(0.5);
                        Stroke { pts, w: st.w * s * f, len, seam: st.seam }
                    })
                    .collect();
                let len = strokes.iter().map(|s| s.len).sum();
                let dot = g.dot.map(|((x, y), r)| (place((ox + x * s, oy + y * s)), r * f));
                Letter { strokes, len, dot }
            })
            .collect();

        // bounds in the frame and the mascot's seat (highest outline point near the seat)
        let mut bbox = (f32::MAX, f32::MAX, f32::MIN, f32::MIN);
        for st in letters.iter().flat_map(|l| l.strokes.iter()) {
            let h = st.w / 2.0 + LINE;
            for p in &st.pts {
                bbox = (bbox.0.min(p.0 - h), bbox.1.min(p.1 - h), bbox.2.max(p.0 + h), bbox.3.max(p.1 + h));
            }
        }
        let sit_x = lerp(bbox.0, bbox.2, seat.clamp(0.1, 0.9));
        let top = letters
            .iter()
            .flat_map(|l| l.strokes.iter())
            .flat_map(|s| s.pts.iter().filter(|p| (p.0 - sit_x).abs() < 40.0).map(move |p| p.1 - s.w / 2.0 - LINE))
            .fold(f32::MAX, f32::min);
        let top = if top == f32::MAX { bbox.1 } else { top };
        let stagger = if letters.len() > 1 { (0.45 / (letters.len() - 1) as f32).min(0.09) } else { 0.0 };
        Word { letters, bbox, sit: (sit_x, top + 16.0), stagger }
    }

    /// A point around the word: u, v are 0..1 across the bounds (outside is fine).
    fn around(&self, (u, v): Pt) -> Pt {
        let (x0, y0, x1, y1) = self.bbox;
        (lerp(x0, x1, u), lerp(y0, y1, v))
    }

    fn letter_start(&self, i: usize) -> f32 {
        DRAW_AT + self.stagger * i as f32
    }
    fn done_at(&self) -> f32 {
        self.letter_start(self.letters.len() - 1) + LETTER_DRAW
    }
    fn pen_target(&self) -> Pt {
        self.letters[0].strokes[0].pts[0]
    }
    fn beats(&self) -> MochiBeats {
        MochiBeats { sit: self.sit, land: LAND, slurp_at: SLURP_AT, gulp_at: GULP_AT, hop_at: HOP_AT, land_at: LAND_AT }
    }
}

fn word(w: &Word, t: f32, pal: Pal, slurp: &Slurp) -> Vec<Svgr<'static>> {
    let mut out = Vec::new();
    for (i, letter) in w.letters.iter().enumerate() {
        let start = w.letter_start(i);
        let prog = ease_out(seg(t, start, start + LETTER_DRAW));
        if prog <= 0.0 {
            continue;
        }
        // stroke width puffs up with an overshoot as the letter draws
        let puff = 0.45 + 0.55 * spring(t - start, 15.0, 6.5);
        let mut left = prog * letter.len;
        // parts: runs of strokes that merge; a seam starts a new outlined part
        let mut parts: Vec<Vec<(Vec<Pt>, f32)>> = vec![Vec::new()];
        for stroke in &letter.strokes {
            if left <= 0.0 {
                break;
            }
            let pts = partial(&stroke.pts, left.min(stroke.len));
            left -= stroke.len;
            let (pts, mean, min) = slurp.warp(&pts);
            if stroke.seam {
                parts.push(Vec::new());
            }
            if min > 0.97 {
                continue;
            }
            parts.last_mut().unwrap().push((pts, stroke.w * puff * (1.0 - 0.75 * mean)));
        }
        for part in &parts {
            for (pts, w) in part {
                out.push(line(pts, pal.ink, w + 2.0 * LINE));
            }
            for (pts, w) in part {
                out.push(line(pts, pal.paper, *w));
            }
        }
        if let Some((c, r)) = letter.dot {
            let at = start + LETTER_DRAW * 0.7;
            if t > at {
                let s = spring(t - at, 18.0, 7.0);
                let spin = 0.7 * (1.0 - s) + 0.08 * (t * 1.9).sin();
                let pts = star_points(c, r * s.max(0.02), spin, 0.0, 0.0, 0.0);
                let (pts, _, min) = slurp.warp(&pts);
                if min < 0.97 {
                    out.push(shape(&pts, pal.ink, pal.ink, 4.0));
                }
            }
        }
    }
    out
}

// ---------------------------------------------------------------- stars

/// A chubby five point star, morphed toward a motion smear by `smear` (0 star .. 1 smear).
/// `stretch` lengthens the smear along `dir` (radians).
fn star_points(c: Pt, r: f32, spin: f32, smear: f32, stretch: f32, dir: f32) -> Vec<Pt> {
    const N: usize = 90;
    (0..N)
        .map(|k| {
            let th = TAU * k as f32 / N as f32;
            let tip = (0.5 + 0.5 * (5.0 * (th - spin + PI / 2.0)).cos()).powf(1.7);
            let rs = r * (0.5 + 0.5 * tip);
            let star = (rs * th.cos(), rs * th.sin());
            // smear: a lumpy ellipse along `dir`, longer behind
            let local = th - dir;
            let mut u = r * (1.0 + stretch) * local.cos();
            if u < 0.0 {
                u *= 1.0 + 0.7 * stretch;
            }
            let v = r * 0.85 * local.sin() * (1.0 + 0.22 * (3.0 * local + 1.3).sin() + 0.1 * (7.0 * local).sin());
            let blob = rot((u, v), dir);
            add(c, lerp2(star, blob, smear))
        })
        .collect()
}

fn filled_star(pts: &[Pt], pal: Pal) -> Svgr<'static> {
    shape(pts, pal.ink, pal.ink, 4.0)
}
fn outline_star(pts: &[Pt], pal: Pal) -> Svgr<'static> {
    shape(pts, pal.paper, pal.ink, 6.5)
}

/// Decorative stars of the finished logo, placed around the word bounds:
/// ((u, v) across the bounds, radius, filled, pop delay after the first letter starts).
const LOGO_STARS: [(Pt, f32, bool, f32); 9] = [
    ((0.12, -0.25), 22.0, false, 0.11),
    ((0.23, -0.48), 12.0, true, 0.17),
    ((0.52, -0.55), 19.0, false, 0.25),
    ((-0.07, 0.25), 17.0, false, 0.21),
    ((0.41, 1.10), 13.0, true, 0.37),
    ((1.06, 0.62), 20.0, false, 0.31),
    ((0.20, 1.30), 18.0, false, 0.43),
    ((0.77, 1.18), 16.0, false, 0.47),
    ((1.04, -0.30), 11.0, false, 0.39),
];

/// The three big stars: fly-in direction, landing spot, radius, timing, and where they go in
/// the logo (u, v around the word; None = becomes the pen).
struct BigStar {
    from_dir: f32,
    at: Pt,
    r: f32,
    start: f32,
    land: f32,
    logo: Option<(Pt, f32)>,
}
const BIG_STARS: [BigStar; 3] = [
    BigStar { from_dir: -0.55, at: (790.0, 215.0), r: 72.0, start: 0.15, land: 0.50, logo: Some(((0.70, -0.40), 34.0)) },
    BigStar { from_dir: -0.62, at: (455.0, 185.0), r: 30.0, start: 0.22, land: 0.53, logo: Some(((0.49, 1.25), 28.0)) },
    BigStar { from_dir: -0.5, at: (300.0, 430.0), r: 44.0, start: 0.18, land: 0.56, logo: None },
];

fn big_stars(w: &Word, t: f32, pal: Pal, slurp: &Slurp) -> Vec<Svgr<'static>> {
    let pen_from = 0.92;
    let pen_to = DRAW_AT + 0.04;
    let pen = w.pen_target();
    let mut out = Vec::new();
    for (i, s) in BIG_STARS.iter().enumerate() {
        if t < s.start {
            continue;
        }
        let k = seg(t, s.start, s.land);
        // fly in from far behind along the smear direction
        let from = sub(s.at, mul((s.from_dir.cos(), s.from_dir.sin()), 1300.0));
        let mut c = lerp2(from, s.at, expo_out(k));
        let mut stretch = 5.0 * (1.0 - k).powf(1.6);
        let mut smear = 1.0 - ease_out(seg(t, s.land - 0.06, s.land + 0.1));
        // landing pop and a gentle float
        let pop = 1.0 + 0.25 * wobble(t - s.land, 20.0, 9.0) * seg(t, s.land - 0.01, s.land);
        let mut r = s.r * pop;
        let mut spin = 0.25 * (1.0 - expo_out(seg(t, s.land, s.land + 0.4))) + 0.05 * (t * 2.0 + i as f32).sin();
        let mut dir = s.from_dir;
        match s.logo {
            None => {
                if t > pen_to {
                    continue;
                }
                // smear toward the first letter and shrink into the pen tip
                let p = ease_in(seg(t, pen_from, pen_to));
                let to = sub(pen, s.at);
                dir = to.1.atan2(to.0);
                c = lerp2(s.at, pen, p);
                smear = smear.max(ease_out(seg(t, pen_from, pen_from + 0.08)));
                stretch = stretch.max(4.0 * (p * PI).sin());
                r *= 1.0 - 0.6 * p;
            }
            Some((uv, logo_r)) => {
                let m = spring(t - (1.18 + 0.1 * i as f32), 14.0, 7.0);
                c = lerp2(c, w.around(uv), m);
                r = lerp(r, logo_r, m.min(1.0));
                spin += 0.3 * m;
            }
        }
        let pts = star_points(c, r, spin, smear, stretch, dir);
        let (pts, _, min) = slurp.warp(&pts);
        if min < 0.97 {
            out.push(filled_star(&pts, pal));
        }
    }
    out
}

fn logo_stars(w: &Word, t: f32, pal: Pal, slurp: &Slurp) -> Vec<Svgr<'static>> {
    LOGO_STARS
        .iter()
        .enumerate()
        .filter_map(|(i, &(uv, r, filled, delay))| {
            let pop = DRAW_AT + delay;
            if t < pop {
                return None;
            }
            let s = spring(t - pop, 18.0, 8.0);
            let at = w.around(uv);
            let bob = (t * 2.6 + i as f32 * 1.7).sin() * 5.0;
            let spin = 0.6 * (1.0 - s) + 0.12 * (t * 1.4 + i as f32).sin();
            let pts = star_points((at.0, at.1 + bob), r * s.max(0.02), spin, 0.0, 0.0, 0.0);
            let (pts, _, min) = slurp.warp(&pts);
            if min > 0.97 {
                return None;
            }
            Some(if filled { filled_star(&pts, pal) } else { outline_star(&pts, pal) })
        })
        .collect()
}

/// Tiny outline dots in the opening frames, so frame 0 is never empty.
fn opening_dots(t: f32, pal: Pal) -> Vec<Svgr<'static>> {
    let k = 1.0 - seg(t, 0.4, 0.55);
    if k <= 0.0 {
        return Vec::new();
    }
    [((600.0, 74.0), 7.0), ((708.0, 132.0), 5.0), ((935.0, 470.0), 6.0)]
        .iter()
        .map(|&((x, y), r)| {
            fframes::svgr!(<circle cx={x} cy={y} r={r * k} fill={pal.paper} stroke={pal.ink} stroke-width="4.5" />)
        })
        .collect()
}

// ---------------------------------------------------------------- slurp wind + landing burst

fn wind(t: f32, pal: Pal, mouth: Pt) -> Vec<Svgr<'static>> {
    let on = seg(t, SLURP_AT, SLURP_AT + 0.1) * (1.0 - seg(t, 3.95, 4.12));
    if on <= 0.0 {
        return Vec::new();
    }
    (0..7)
        .filter_map(|i| {
            let fi = i as f32;
            let ang = PI + (fi / 6.0 - 0.5) * 2.0 + 0.1 * (fi * 7.3).sin();
            let cycle = ((t - SLURP_AT) * 2.6 + fi * 0.37).fract();
            let r0 = lerp(400.0, 70.0, ease_in(cycle));
            let len = 30.0 + 70.0 * (1.0 - cycle);
            let dir = (ang.cos(), ang.sin());
            let a = add(mouth, mul(dir, r0));
            let b = add(mouth, mul(dir, r0 + len));
            (cycle < 0.95).then(|| line(&[a, b], pal.ink, 5.0 * on * (1.0 - cycle * 0.5)))
        })
        .collect()
}

fn burst(t: f32, pal: Pal) -> Vec<Svgr<'static>> {
    let at = LAND_AT + 0.02;
    if t < at {
        return Vec::new();
    }
    let k = expo_out(seg(t, at, at + 0.55));
    let c = (LAND.0, LAND.1 - 95.0);
    let mut out = Vec::new();
    for i in 0..7 {
        let fi = i as f32;
        let ang = -PI / 2.0 + (fi - 3.0) * 0.62 + 0.15 * (fi * 3.1).sin();
        let reach = [250.0, 285.0, 320.0, 345.0, 310.0, 275.0, 240.0][i];
        let p = add(c, mul((ang.cos(), ang.sin()), lerp(60.0, reach, k)));
        let p = (p.0, p.1 + 4.0 * (t * 3.0 + fi).sin());
        let pop = spring(t - at - 0.02 * fi, 16.0, 7.0);
        if i % 3 == 1 {
            let r = 7.0 * pop.max(0.01);
            out.push(fframes::svgr!(<circle cx={p.0} cy={p.1} r={r} fill={pal.paper} stroke={pal.ink} stroke-width="4.5" />));
        } else {
            let r = [17.0, 0.0, 14.0, 20.0, 0.0, 15.0, 18.0][i] * pop.max(0.01);
            let spin = 0.5 * (1.0 - pop) + 0.1 * (t * 1.7 + fi).sin();
            out.push(outline_star(&star_points(p, r, spin, 0.0, 0.0, 0.0), pal));
        }
    }
    out
}

// ---------------------------------------------------------------- composition

/// Everything at time `t` in one palette.
fn compose(w: &Word, t: f32, pal: Pal) -> Svgr<'static> {
    let t = t.max(0.0);
    let m = mascot::state(t, &w.beats());
    let mouth = m.as_ref().map(mascot::mouth).unwrap_or(w.sit);
    let slurp = Slurp { mouth, t };
    let mut layers: Vec<Svgr<'static>> = Vec::new();
    layers.extend(opening_dots(t, pal));
    layers.extend(logo_stars(w, t, pal, &slurp));
    layers.extend(word(w, t, pal, &slurp));
    layers.extend(big_stars(w, t, pal, &slurp));
    layers.extend(wind(t, pal, mouth));
    layers.extend(burst(t, pal));
    if let Some(m) = &m {
        layers.extend(mascot::draw(m, pal));
    }
    fframes::svgr!(<g>{layers}</g>)
}

pub struct KawaiiPinkVideo<'a> {
    pub media: &'a KawaiiPinkMedia,
    word: Word,
    front: Pal,
    echo: Pal,
}

impl<'a> KawaiiPinkVideo<'a> {
    pub fn new(media: &'a KawaiiPinkMedia, config: &Config) -> Self {
        // palette strings live for the whole program
        let ink: &'static str = Box::leak(config.ink.clone().into_boxed_str());
        Self {
            media,
            word: Word::build(&config.word, config.seat),
            front: Pal { ink, paper: BG },
            echo: Pal { ink: ECHO_INK, paper: BG },
        }
    }
}

impl std::fmt::Debug for KawaiiPinkVideo<'_> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("KawaiiPinkVideo").finish()
    }
}

impl Video for KawaiiPinkVideo<'_> {
    const FPS: usize = FPS;
    const WIDTH: usize = WIDTH;
    const HEIGHT: usize = HEIGHT;
    const BACKGROUND_COLOR: Color = Color::WHITE;

    fn duration(&self) -> Duration<'_> {
        Duration::Frames((LENGTH * FPS as f32).round() as usize)
    }

    fn audio(&self) -> AudioMap<'_> {
        use fframes::{AudioTimestamp::*, AudioTrack};
        // every cue comes from the constants that drive the animation;
        // +6 dB lifts the mix to about -14 LUFS
        let at = |name: &'static str, s: f32, gain: f32| AudioTrack::new(name, Second(s.max(0.0))..Eof).gain_db(gain + 6.0);
        let pan_x = |x: f32| ((x - 540.0) / 540.0 * 0.6).clamp(-0.8, 0.8);
        let w = &self.word;
        let mut tracks = vec![
            at("bed.wav", 0.0, -15.0).fade_out(0.6),
            at("whoosh.wav", BIG_STARS[0].start - 0.08, -9.0),
            at("whoosh.wav", 0.86, -14.0).pan(-0.4),
            at("splat.wav", 0.95, -11.0).pan(pan_x(w.sit.0)),
            at("sparkle.wav", w.done_at(), -17.0),
            at("slurp.wav", SLURP_AT, -7.0),
            at("gulp.wav", GULP_AT, -7.0),
            at("whoosh.wav", HOP_AT - 0.05, -13.0),
            at("splat.wav", LAND_AT, -9.0),
            at("boing.wav", LAND_AT + 0.03, -9.0),
            at("sparkle.wav", LAND_AT + 0.06, -12.0),
        ];
        for s in &BIG_STARS {
            tracks.push(at("pop.wav", s.land, -10.0).pan(pan_x(s.at.0)));
        }
        const BLOOPS: [&str; 5] = ["bloop0.wav", "bloop1.wav", "bloop2.wav", "bloop3.wav", "bloop4.wav"];
        for (i, letter) in w.letters.iter().enumerate() {
            let x = letter.strokes[0].pts[0].0;
            tracks.push(at(BLOOPS[i % BLOOPS.len()], w.letter_start(i), -9.0).pan(pan_x(x)));
        }
        for &(uv, _, _, delay) in &LOGO_STARS {
            tracks.push(at("pop.wav", DRAW_AT + delay, -18.0).pan(pan_x(w.around(uv).0)));
        }
        AudioMap::from(tracks)
    }

    fn render_frame<'a>(&'a self, frame: Frame, _ctx: &FFramesContext<'a, '_>) -> Svgr<'a> {
        let t = frame.seconds();
        // the line boils on twos, cycling three drawings
        let seed = ((frame.index / 2) % 3) as i32 * 11 + 3;
        let e = ECHO_SCALE;
        let echo_tf = format!("matrix({e} 0 0 {e} {} {})", 540.0 * (1.0 - e), 540.0 * (1.0 - e));
        let front = compose(&self.word, t, self.front);
        let echo = compose(&self.word, t - ECHO_LAG, self.echo);

        fframes::svgr!(
            <svg xmlns="http://www.w3.org/2000/svg" viewBox={format!("0 0 {WIDTH} {HEIGHT}")} width={WIDTH} height={HEIGHT}>
                <defs>
                    <filter id="boil" filterUnits="userSpaceOnUse" x="-300" y="-300" width="1680" height="1680">
                        <feTurbulence type="fractalNoise" baseFrequency="0.011" numOctaves="1" seed={seed} result="noise" />
                        <feDisplacementMap in="SourceGraphic" in2="noise" scale="9" xChannelSelector="R" yChannelSelector="G" />
                    </filter>
                    <filter id="boilecho" filterUnits="userSpaceOnUse" x="-300" y="-300" width="1680" height="1680">
                        <feTurbulence type="fractalNoise" baseFrequency="0.014" numOctaves="1" seed={seed + 5} result="noise" />
                        <feDisplacementMap in="SourceGraphic" in2="noise" scale="4" xChannelSelector="R" yChannelSelector="G" />
                    </filter>
                </defs>
                <rect width={WIDTH} height={HEIGHT} fill={BG} />
                <g transform={echo_tf}>
                    <g filter="url(#boilecho)">{echo}</g>
                </g>
                <g filter="url(#boil)">{front}</g>
            </svg>
        )
    }
}
