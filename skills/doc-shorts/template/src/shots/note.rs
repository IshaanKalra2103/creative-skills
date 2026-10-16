//! note: a grid of soft dots on black. The camera tilts up with a focus pull, one dot lights
//! up and blooms, the note's words appear one by one in handwriting (Homemade Apple) and an
//! arrow draws down from the last word to the dot; then the camera pulls back about the dot.
//! Grid, glow, words and arrow are one layer anchored on the lit dot, so per tick it is an
//! anchor y and a scale (measured on the reference: lattice phase + spacing fitted to the dot
//! centroids). Params: references/shots.md#note.
use crate::kit::{self, T};
use crate::spec::P;
use fframes::{FFramesContext, Frame, Svgr};

/// Grid spacing at scale 1, ref px.
const STEP: f32 = 105.0;
/// Screen y of the lit dot per tick (x is always 360), measured.
const ANCHOR_Y: [f32; 11] = [329.0, 450.0, 527.0, 581.0, 581.0, 621.0, 644.0, 663.0, 674.0, 680.0, 677.0];
/// Measured grid spacing per tick; scale = spacing / STEP.
const SPACING: [f32; 11] = [104.74, 105.11, 105.04, 104.91, 105.0, 104.38, 103.1, 101.69, 99.08, 94.39, 82.81];
/// Bloom strength per tick (sampled glow brightness half a cell from the dot).
const GLOW: [f32; 11] = [0.0, 0.0, 0.12, 0.2, 0.2, 0.58, 0.94, 1.0, 1.0, 1.0, 1.0];
/// Arrow, layer coordinates (origin = the dot): a curve from under the last word to the dot.
const ARROW: [(f32, f32); 8] = [
    (50.6, -272.7), (62.0, -240.7), (74.4, -199.4), (77.5, -163.2),
    (70.2, -121.9), (51.7, -87.8), (31.0, -65.1), (13.4, -48.6),
];
const BARBS: [(f32, f32); 2] = [(10.3, -79.5), (49.6, -65.1)];
/// Baseline of the words (layer coordinates) and their size.
const WORD_Y: f32 = -292.7;
const SIZE: f32 = 56.2;

/// Arrow points with the start pulled by `dx` (fading to 0 at the head), cut at `frac`.
fn arrow_points(frac: f32, dx: f32) -> String {
    let n = ARROW.len();
    let arrow: Vec<(f32, f32)> = ARROW.iter().enumerate().map(|(i, (x, y))| (x + dx * (1.0 - i as f32 / (n - 1) as f32), *y)).collect();
    let mut pts: Vec<(f32, f32)> = Vec::new();
    for i in 0..n - 1 {
        let p0 = arrow[i.saturating_sub(1)];
        let p1 = arrow[i];
        let p2 = arrow[i + 1];
        let p3 = arrow[(i + 2).min(n - 1)];
        for s in 0..8 {
            let t = s as f32 / 8.0;
            let (t2, t3) = (t * t, t * t * t);
            let f = |a: f32, b: f32, c: f32, d: f32| {
                0.5 * (2.0 * b + (-a + c) * t + (2.0 * a - 5.0 * b + 4.0 * c - d) * t2 + (-a + 3.0 * b - 3.0 * c + d) * t3)
            };
            pts.push((f(p0.0, p1.0, p2.0, p3.0), f(p0.1, p1.1, p2.1, p3.1)));
        }
    }
    pts.push(arrow[n - 1]);
    let k = ((pts.len() as f32 * kit::clamp01(frac)).ceil() as usize).min(pts.len());
    pts[..k].iter().map(|(x, y)| format!("{x:.1},{y:.1}")).collect::<Vec<_>>().join(" ")
}

/// A per-tick table from the spec (`key`), else the measured default; clamped at the end.
fn table(p: P, key: &str, def: &[f32], i: usize) -> f32 {
    let v = p.fs(key);
    let v: &[f32] = if v.is_empty() { def } else { &v };
    v[i.min(v.len() - 1)]
}

pub fn look(_p: P) -> (f32, f32) {
    (1.0, 1.0)
}

pub fn render<'a>(p: P<'a>, tm: &T, frame: &mut Frame, ctx: &FFramesContext<'a, '_>) -> Svgr<'a> {
    let i = tm.tick.max(0) as usize;
    let ay = table(p, "anchor_y", &ANCHOR_Y, i);
    let sc = table(p, "spacing", &SPACING, i) / STEP;
    let glow = table(p, "glow", &GLOW, i);
    let layer = format!("translate(360 {ay:.2}) scale({sc:.5})");
    let ink = p.s("ink", "#dad7d0");
    let light = p.s("color", "#ffd21c");
    let core_fill = p.s("core", "#e9c824");
    let grid_fill = p.s("grid", "#262624");
    let size = p.f("size", SIZE);

    // grid (the lit dot's cell is drawn by the core)
    let mut dots: Vec<Svgr> = Vec::new();
    for gy in -9..=9 {
        for gx in -5..=5 {
            if gx == 0 && gy == 0 {
                continue;
            }
            dots.push(fframes::svgr!(<circle cx={gx as f32 * STEP} cy={gy as f32 * STEP} r="35.5" fill={grid_fill} />));
        }
    }
    let focus = if i == 0 { "url(#b4)" } else { "url(#note_soft)" };

    let core = if glow > 0.0 {
        fframes::svgr!(<g style="mix-blend-mode:screen" opacity={glow}>
            <circle cx="0" cy="0" r="420" fill="url(#note_bloom)" />
            // a faint wide wash: the reference tints the whole frame once the dot is lit
            <circle cx="0" cy="0" r="900" fill="url(#note_wash)" />
            <circle cx="0" cy="0" r="36" fill={core_fill} filter="url(#note_soft)" />
        </g>)
    } else {
        Svgr::empty()
    };

    // words: laid out left to right, the line centred on the dot (or `word_x` per word);
    // each lands on its `word_at` tick (default 3, 5, 7, ...)
    let words: Vec<&str> = p.s("text", "Simple idea").split_whitespace().collect();
    let at = p.fs("word_at");
    let stretch = p.fs("stretch");
    let wx = p.fs("word_x");
    let st = |k: usize| if stretch.is_empty() { 1.18 } else { stretch[k.min(stretch.len() - 1)] };
    let ww: Vec<f32> = words.iter().enumerate().map(|(k, w)| kit::text_w(frame, ctx, kit::SCRIPT, 400, size as usize, w) * st(k)).collect();
    let space = size * 0.55;
    let total: f32 = ww.iter().sum::<f32>() + space * (words.len().saturating_sub(1)) as f32;
    let mut lefts: Vec<f32> = Vec::new();
    let mut x = p.f("text_x", 0.0) - total / 2.0;
    for (k, w) in ww.iter().enumerate() {
        lefts.push(if k < wx.len() { wx[k] } else { x });
        x += w + space;
    }
    let tick_of = |k: usize| -> i32 { if k < at.len() { at[k] as i32 } else { 3 + 2 * k as i32 } };
    let mut texts: Vec<Svgr> = Vec::new();
    for (k, w) in words.iter().enumerate() {
        let t0 = tick_of(k);
        if (i as i32) < t0 {
            continue;
        }
        let first_tick = i as i32 == t0;
        let next = tick_of(k + 1);
        // the first word is a touch small and faint until the next lands; later words fade in over a tick
        let (s, op) = if k == 0 && words.len() > 1 && (i as i32) < next { (0.94, 0.8) } else if k > 0 && first_tick { (1.0, 0.3) } else { (1.0, 1.0) };
        let t = format!("translate({:.1} {WORD_Y}) scale({:.3} 1)", lefts[k], st(k));
        let word = w.to_string();
        let txt = fframes::svgr!(<text transform={t} x="0" y="0" font-family={kit::SCRIPT} font-size={size} fill={ink} filter="url(#cap)">{word}</text>);
        // `clip_swash`: cut the first word at its left edge (the font's "S" swash reaches left,
        // the reference's doesn't); off by default since it also cuts other capitals
        let clipped = if k == 0 && p.b("clip_swash", false) {
            let cid = "url(#note_notail)";
            fframes::svgr!(<g clip-path={cid}>{txt}</g>)
        } else {
            txt
        };
        texts.push(fframes::svgr!(<g transform={kit::scale_about(-100.0, -300.0, s)} opacity={op}>{clipped}</g>));
    }
    let clip_x = lefts.first().copied().unwrap_or(-215.0) - 4.0;

    // arrow: draws from under the last word down to the dot over three ticks once it lands
    let last = tick_of(words.len().saturating_sub(1));
    let a0 = p.i("arrow_at", last as i64) as i32;
    let draw = match i as i32 - a0 {
        d if d < 0 => 0.0,
        0 => 0.5,
        1 => 0.95,
        _ => 1.0,
    };
    let dx = lefts.last().copied().unwrap_or(51.0) - 51.0;
    let arrow = if draw > 0.0 && p.b("arrow", true) {
        let head = if draw >= 1.0 {
            let (t, a, b) = (ARROW[7], BARBS[0], BARBS[1]);
            let pts = format!("{:.1},{:.1} {:.1},{:.1} {:.1},{:.1}", a.0, a.1, t.0, t.1, b.0, b.1);
            fframes::svgr!(<polyline points={pts} fill="none" stroke={ink} stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />)
        } else {
            Svgr::empty()
        };
        fframes::svgr!(<g filter="url(#cap)">
            <polyline points={arrow_points(draw, dx)} fill="none" stroke={ink} stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
            {head}
        </g>)
    } else {
        Svgr::empty()
    };
    let soft_end = if i >= 10 { "url(#b1)" } else { "" };

    fframes::svgr!(<g>
        <defs>
            <filter id="note_soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.6" /></filter>
            <clipPath id="note_notail"><rect x={clip_x} y="-420" width="900" height="400" /></clipPath>
            // bloom falloff sampled on the reference: 150 at r52, 100 at r74, ~60 at r105, 29 at r210, 15 at r315
            <radialGradient id="note_wash" cx="0.5" cy="0.5" r="0.5">
                <stop offset="0" stop-color={light} stop-opacity="0.07" />
                <stop offset="0.6" stop-color={light} stop-opacity="0.035" />
                <stop offset="1" stop-color={light} stop-opacity="0" />
            </radialGradient>
            <radialGradient id="note_bloom" cx="0.5" cy="0.5" r="0.5">
                <stop offset="0" stop-color={light} stop-opacity="0.95" />
                <stop offset="0.124" stop-color={light} stop-opacity="0.66" />
                <stop offset="0.176" stop-color={light} stop-opacity="0.42" />
                <stop offset="0.25" stop-color={light} stop-opacity="0.24" />
                <stop offset="0.5" stop-color={light} stop-opacity="0.12" />
                <stop offset="0.75" stop-color={light} stop-opacity="0.075" />
                <stop offset="1" stop-color={light} stop-opacity="0" />
            </radialGradient>
        </defs>
        {kit::fill("#090909")}
        <g transform={layer.clone()} filter={soft_end}>
            <g filter={focus}>{dots}</g>
            {core}
        </g>
        // once lit, the reference is graded warm (blue drops ~25% on the grey dots); the
        // white words and arrow stay neutral, so they go on top
        <g style="mix-blend-mode:multiply" opacity={glow * p.f("grade", 1.0)}>
            <rect x="-40" y="-40" width="800" height="1360" fill={p.s("grade_color", "#fff4bc")} />
        </g>
        <g transform={layer.clone()} filter={soft_end}>
            {texts}
            {arrow}
        </g>
    </g>)
}
