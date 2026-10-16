//! chart: a matplotlib-style figure, a node graph (circles with letters, arrows) beside a bar
//! chart, under a serif title. The whole figure zooms out about the frame centre over the
//! first second (measured on the reference), the title fades in on the 4th tick, and the
//! bars can wobble tick to tick (`frames`) or grow in (`grow`). Data driven: bars, nodes and
//! edges come from the spec. Params: references/shots.md#chart.
use crate::kit::{self, T};
use crate::spec::P;
use fframes::{FFramesContext, Frame, Svgr};
use toml::Value;

/// Figure scale per tick (template-matched against the reference's last tick).
const SCALE: [f32; 13] = [1.66, 1.42, 1.30, 1.21, 1.15, 1.10, 1.07, 1.05, 1.03, 1.01, 1.01, 1.00, 1.00];
/// The rest layout below was measured where the scale is 1.01.
const MEASURED_AT: f32 = 1.01;
const FX: f32 = 360.0;
const FY: f32 = 638.0;

/// matplotlib tab10, cycled.
const TAB10: [&str; 10] = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf"];

/// Axes box (left, top, right, bottom) with and without a graph beside it.
const AXES_WITH_GRAPH: [f32; 4] = [385.0, 472.5, 676.0, 788.5];
const AXES_ALONE: [f32; 4] = [150.0, 472.5, 630.0, 788.5];
/// Graph box used by the automatic ring layout (left, top, right, bottom).
const GRAPH_BOX: [f32; 4] = [40.0, 480.0, 330.0, 780.0];

struct Node<'a> {
    x: f32,
    y: f32,
    r: f32,
    label: &'a str,
    color: &'a str,
}

fn arrow<'a>(a: (f32, f32, f32), b: (f32, f32, f32), ink: &'a str) -> Svgr<'a> {
    let (dx, dy) = (b.0 - a.0, b.1 - a.1);
    let len = (dx * dx + dy * dy).sqrt().max(1e-3);
    let (ux, uy) = (dx / len, dy / len);
    let (x1, y1) = (a.0 + ux * a.2, a.1 + uy * a.2);
    let (x2, y2) = (b.0 - ux * b.2, b.1 - uy * b.2);
    // arrowhead: tip on b's rim, 6 px long, 2.6 px half-width
    let (bx, by) = (x2 - ux * 6.0, y2 - uy * 6.0);
    let head = format!("M {x2:.2} {y2:.2} L {:.2} {:.2} L {:.2} {:.2} Z", bx - uy * 2.6, by + ux * 2.6, bx + uy * 2.6, by - ux * 2.6);
    fframes::svgr!(<g>
        <line x1={x1} y1={y1} x2={bx} y2={by} stroke={ink} stroke-width="0.9" />
        <path d={head} fill={ink} />
    </g>)
}

/// "Nice" axis step for a range (1, 2, 2.5 or 5 times a power of ten, about 8 ticks).
fn nice_step(range: f32) -> f32 {
    let raw = (range / 8.0).max(1e-9);
    let mag = 10f32.powf(raw.log10().floor());
    let n = raw / mag;
    let m = if n <= 1.0 { 1.0 } else if n <= 2.0 { 2.0 } else if n <= 2.5 { 2.5 } else if n <= 5.0 { 5.0 } else { 10.0 };
    m * mag
}

/// Digits after the point needed to print multiples of `step` (0.02 -> 2, 2.5 -> 1, 10 -> 0).
fn decimals(step: f32) -> usize {
    let s = format!("{step:.4}");
    s.trim_end_matches('0').split('.').nth(1).map(str::len).unwrap_or(0)
}

/// Edges as `[[from, to], ...]` with node indices (0-based) or labels.
fn edges(p: P, nodes: &[Node]) -> Vec<(usize, usize)> {
    let Some(Value::Array(rows)) = p.0.get("edges") else { return vec![] };
    let find = |v: &Value| -> Option<usize> {
        match v {
            Value::Integer(i) => usize::try_from(*i).ok().filter(|i| *i < nodes.len()),
            Value::String(s) => nodes.iter().position(|n| n.label == s),
            _ => None,
        }
    };
    rows.iter()
        .filter_map(|r| {
            let r = r.as_array()?;
            Some((find(r.first()?)?, find(r.get(1)?)?))
        })
        .collect()
}

pub fn render<'a>(p: P<'a>, tm: &T, frame: &mut Frame, ctx: &FFramesContext<'a, '_>) -> Svgr<'a> {
    let i = tm.tick.max(0) as usize;
    let s = if p.b("zoom", true) { SCALE[i.min(12)] / MEASURED_AT } else { 1.0 / MEASURED_AT };
    let zoom = kit::scale_about(FX, FY, s);
    let blur = if i == 0 && p.b("zoom", true) { "url(#b1)" } else { "" };
    let ink = p.s("ink", "#1e1e1e");
    let text_ink = p.s("text_color", "#262626");

    // title, fading in on `title_at` (0.35) and full one tick later
    let title_at = p.i("title_at", 3) as i32;
    let title_opacity = if tm.tick < title_at { 0.0 } else if tm.tick == title_at { 0.35 } else { 1.0 };
    let title = match p.opt("title") {
        Some(t) => fframes::svgr!(<g opacity={title_opacity}>
            {kit::serif(360.0, p.f("title_y", 406.0), p.f("title_size", 43.0), 0.5, p.s("title_color", "#151515"), "middle", "ink", t.to_string())}
        </g>),
        None => Svgr::empty(),
    };

    // graph
    let raw_nodes = p.list("nodes");
    let n_nodes = raw_nodes.len();
    let (gl, gt, gr, gb) = (GRAPH_BOX[0], GRAPH_BOX[1], GRAPH_BOX[2], GRAPH_BOX[3]);
    let (gcx, gcy) = ((gl + gr) / 2.0, (gt + gb) / 2.0);
    let ring = (gr - gl).min(gb - gt) * 0.38;
    let nodes: Vec<Node> = raw_nodes
        .iter()
        .enumerate()
        .map(|(n, q)| {
            let a = n as f32 / n_nodes.max(1) as f32 * std::f32::consts::TAU - std::f32::consts::FRAC_PI_2;
            Node {
                x: q.f("x", gcx + ring * a.cos()),
                y: q.f("y", gcy + ring * a.sin()),
                r: q.f("r", 12.0),
                label: q.s("label", ""),
                color: q.s("color", TAB10[n % 10]),
            }
        })
        .collect();
    let node_alpha = p.f("node_alpha", 0.74);
    let arrows: Vec<Svgr> = edges(p, &nodes)
        .iter()
        .map(|(a, b)| {
            let (na, nb) = (&nodes[*a], &nodes[*b]);
            arrow((na.x, na.y, na.r), (nb.x, nb.y, nb.r), ink)
        })
        .collect();
    let circles: Vec<Svgr> = nodes
        .iter()
        .map(|n| {
            let ty = n.y + 3.8;
            let label = n.label.to_string();
            fframes::svgr!(<g>
                <circle cx={n.x} cy={n.y} r={n.r} fill={n.color} fill-opacity={node_alpha} />
                <text x={n.x} y={ty} font-family={kit::SANS} font-size="10.5" fill="#202020" text-anchor="middle">{label}</text>
            </g>)
        })
        .collect();

    // bars: `bars = [{label, value, color}]`, or `values` / `labels` / `colors` arrays;
    // `frames = [[...], ...]` overrides the values per tick (a wobbling, converging chart)
    let bar_list = p.list("bars");
    let (labels, colors, base_values): (Vec<&str>, Vec<&str>, Vec<f32>) = if !bar_list.is_empty() {
        (
            bar_list.iter().map(|b| b.s("label", "")).collect(),
            bar_list.iter().enumerate().map(|(n, b)| b.s("color", TAB10[n % 10])).collect(),
            bar_list.iter().map(|b| b.f("value", 0.0)).collect(),
        )
    } else {
        let v = p.fs("values");
        let l = p.strs("labels");
        let c = p.strs("colors");
        let n = v.len().max(l.len()).max(p.rows("frames").first().map_or(0, Vec::len));
        (
            (0..n).map(|i| l.get(i).copied().unwrap_or("")).collect(),
            (0..n).map(|i| c.get(i).copied().unwrap_or(TAB10[i % 10])).collect(),
            v,
        )
    };
    let frames = p.rows("frames");
    let values: Vec<f32> = match frames.get(i.min(frames.len().saturating_sub(1))) {
        Some(row) if !frames.is_empty() => row.clone(),
        _ => base_values.clone(),
    };
    let nb = values.len().max(labels.len());
    let grow_ticks = p.f("grow", 0.0);
    let grow = if grow_ticks > 0.0 { kit::ease_out(tm.tick as f32 / grow_ticks) } else { 1.0 };

    let axes = p.fs("axes");
    let [al, at, ar, ab] = if axes.len() == 4 {
        [axes[0], axes[1], axes[2], axes[3]]
    } else if n_nodes > 0 {
        AXES_WITH_GRAPH
    } else {
        AXES_ALONE
    };
    let vmax = frames.iter().flatten().chain(base_values.iter()).fold(0f32, |m, v| m.max(*v));
    let ymax = p.f("ymax", if vmax > 0.0 { vmax * 1.04 } else { 1.0 });
    let px_per_unit = (ab - at) / ymax;
    // matplotlib layout: bars at 0..n-1, width 0.85 of a slot, 5% margins
    let bw_frac = p.f("bar_width", 0.85);
    let span = (nb as f32 - 1.0 + bw_frac).max(bw_frac);
    let pitch_default = (ar - al) / (span * 1.1);
    let first_default = al + (span * 0.05 + bw_frac / 2.0) * pitch_default;
    let lay = p.fs("bar_layout");
    let (x0, pitch, bw) = if lay.len() == 3 { (lay[0], lay[1], lay[2]) } else { (first_default, pitch_default, bw_frac * pitch_default) };
    let bar_alpha = p.f("bar_alpha", 0.85);
    let bars: Vec<Svgr> = (0..nb)
        .map(|n| {
            let v = values.get(n).copied().unwrap_or(0.0) * grow;
            let h = (v * px_per_unit).max(0.5);
            let cx = x0 + n as f32 * pitch;
            let x = cx - bw / 2.0;
            let ly = ab + 13.5;
            let label = labels.get(n).copied().unwrap_or("").to_string();
            let color = colors.get(n).copied().unwrap_or(TAB10[n % 10]);
            fframes::svgr!(<g>
                <rect x={x} y={ab - h} width={bw} height={h} fill={color} fill-opacity={bar_alpha} />
                <line x1={cx} y1={ab} x2={cx} y2={ab + 2.5} stroke="#222" stroke-width="0.7" />
                <text x={cx} y={ly} font-family={kit::SANS} font-size="10.5" fill={text_ink} text-anchor="middle">{label}</text>
            </g>)
        })
        .collect();
    let step = p.f("ystep", nice_step(ymax));
    let decimals = decimals(step);
    let nticks = ((ymax + 1e-6) / step).floor() as i32;
    let yticks: Vec<Svgr> = (0..=nticks)
        .map(|k| {
            let v = k as f32 * step;
            let y = ab - v * px_per_unit;
            let label = format!("{v:.decimals$}");
            fframes::svgr!(<g>
                <line x1={al - 2.5} y1={y} x2={al} y2={y} stroke="#222" stroke-width="0.7" />
                <text x={al - 4.5} y={y + 3.8} font-family={kit::SANS} font-size="10.5" fill={text_ink} text-anchor="end">{label}</text>
            </g>)
        })
        .collect();
    let ylabel = match p.opt("ylabel") {
        Some(l) => {
            let tf = format!("translate({:.1} {:.1}) rotate(-90)", al - 36.0, (at + ab) / 2.0 + 8.0);
            fframes::svgr!(<text transform={tf} font-family={kit::SANS} font-size="10.5" fill={text_ink} text-anchor="middle">{l.to_string()}</text>)
        }
        None => Svgr::empty(),
    };
    let _ = (frame, ctx);

    fframes::svgr!(<g>
        {kit::fill(p.s("bg", "#d6d6d6"))}
        <g transform={zoom} filter={blur}>
            {title}
            {arrows}
            {circles}
            <rect x={al} y={at} width={ar - al} height={ab - at} fill="none" stroke="#2a2a2a" stroke-width="0.8" />
            {bars}
            {yticks}
            {ylabel}
        </g>
    </g>)
}

/// A flat grey card on the reference: almost no halftone, no vignette.
pub fn look(_p: P) -> (f32, f32) {
    (0.2, 0.0)
}
