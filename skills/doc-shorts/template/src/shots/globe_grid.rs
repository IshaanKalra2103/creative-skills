//! globe_grid: a scribbly wireframe globe rises from the bottom and settles (ticks 0-5), then
//! the camera pulls back over a frame-shaped grid of copies until it reads as a dense field of
//! dots (ticks 6-12). The rise and pull-back tables were measured tick by tick on the
//! reference; `size`, `zoom_end`, `hold` and `speed` reshape them for other shots.
//!
//! `wire_globe` and `spin` are shared with `browser` (the globe in the retro window).
//! Params: references/shots.md#globe_grid.
use crate::kit::{self, T};
use crate::spec::P;
use fframes::{Color, FFramesContext, Frame, Shader, ShaderUniforms, Svgr};
use std::sync::LazyLock;

static WIRE: LazyLock<Shader> = LazyLock::new(|| Shader::sksl(include_str!("../shaders/globe_grid_wire.sksl")));

/// Draw the wireframe globe with centre `(cx, cy)` and diameter `d` (ref px), spun by `rot`
/// radians. `band` is the meridian band half-width (fraction of spacing), `n` the meridian
/// count (keep it even and >= 8; 12 can collapse into a solid disc at some spins).
#[allow(clippy::too_many_arguments)]
pub fn wire_globe<'a>(frame: &Frame, cx: f32, cy: f32, d: f32, rot: f32, ink: &str, band: f32, seed: f32, n: f32) -> Svgr<'a> {
    let layer = WIRE.draw(
        frame,
        ShaderUniforms::new()
            .float("uRot", rot)
            .color("uInk", Color::hex(ink))
            .float("uBand", band)
            .float("uBack", band)
            .float("uN", n)
            .float("uLat", 0.034)
            .float("uSpeck", 0.8)
            .float("uSeed", seed)
            .float("uSoft", 0.012),
    );
    let (x, y) = (cx - d / 2.0, cy - d / 2.0);
    fframes::svgr!(<image href={layer.href()} x={x} y={y} width={d} height={d} />)
}

/// Spin for tick `k` with `n` meridians. Front and back meridians stay half a spacing apart
/// (so the slot pattern and ink coverage hold steady); each tick advances half a spacing,
/// which reads as the globe turning on threes.
pub fn spin(k: i32, n: f32) -> f32 {
    let step = std::f32::consts::TAU / n;
    step * 0.25 + k as f32 * step * 0.5
}

/// Rise: (diameter, centre y) per tick, measured. The globe settles at 391 px, y 681.5.
const RISE: [(f32, f32); 6] = [(566.0, 1189.0), (510.0, 926.0), (480.0, 810.0), (460.0, 749.0), (435.0, 708.0), (391.0, 681.5)];
const REST_D: f32 = 391.0;
const REST_Y: f32 = 681.5;
/// Pull-back: (tile scale z, centre-row y) per tick, measured. Tiles are frame-shaped.
const PULL: [(f32, f32); 7] = [(0.5875, 661.0), (0.374, 651.0), (0.275, 646.0), (0.22, 645.0), (0.186, 640.0), (0.168, 640.0), (0.158, 640.0)];
/// Zoom blur on the pull-back (base, extra toward the edges) per pull tick, measured by eye.
const PULL_BLUR: [(f32, f32); 7] = [(0.0, 1.5), (0.0, 4.0), (0.0, 1.5), (1.0, 3.0), (1.0, 1.0), (1.0, 2.5), (2.0, 2.0)];

pub fn render<'a>(p: P<'a>, tm: &T, frame: &mut Frame, _ctx: &FFramesContext<'a, '_>) -> Svgr<'a> {
    let color = p.s("color", "#57cc1c");
    let bg = p.s("bg", "#060806");
    let n = p.f("meridians", 10.0);
    let band = p.f("band", 0.2);
    let speed = p.f("speed", 1.0).max(0.05);
    let hold = p.i("hold", 0).max(0) as i32;
    let rise = p.b("rise", true);
    let grid = p.b("grid", true);
    let size = p.f("size", REST_D);
    let grow = size / REST_D;
    let zoom_end = p.f("zoom_end", PULL[6].0).clamp(0.02, PULL[0].0);
    let tile = p.fs("tile");
    let (tw, th) = if tile.len() == 2 { (tile[0], tile[1]) } else { (720.0, 1280.0) };
    // remap the measured pull-back so it ends at `zoom_end` (identity at the default)
    let zexp = (zoom_end / PULL[0].0).ln() / (PULL[6].0 / PULL[0].0).ln();
    let zmap = |z: f32| PULL[0].0 * (z / PULL[0].0).powf(zexp);

    let k = (tm.tick as f32 * speed).floor() as i32;
    let rot = spin(tm.tick, n);
    let seed = tm.tick as f32;
    // timeline in table ticks: rise 0..5, optional hold, pull-back 6..12
    let rk = if rise { k } else { k + 5 };
    let body = if rk <= 5 + hold || !grid {
        let (d, cy) = RISE[rk.clamp(0, 5) as usize];
        // scale the measured rise about the rest pose
        let (d, cy) = (d * grow, REST_Y + (cy - REST_Y) * grow.max(1.0));
        wire_globe(frame, 360.0, cy, d, rot, color, band, seed, n)
    } else {
        let pk = (rk - 6 - hold).clamp(0, 6) as usize;
        let (z, row) = PULL[pk];
        let z = zmap(z);
        let (sx, sy) = (tw * z, th * z);
        let d = 0.675 * 720.0 * z * grow;
        let nx = (360.0 / sx).ceil() as i32 + 1;
        let ny = (700.0 / sy).ceil() as i32 + 1;
        let (base, edge) = PULL_BLUR[pk];
        let mut globes = Vec::new();
        for j in -ny..=ny {
            for i in -nx..=nx {
                let (cx, cy) = (360.0 + i as f32 * sx, row + j as f32 * sy);
                if cx + d < -10.0 || cx - d > 730.0 || cy + d < -10.0 || cy - d > 1290.0 {
                    continue;
                }
                // zoom blur on the pull-back: stronger away from the centre
                let dist = ((cx - 360.0).powi(2) + (cy - 640.0).powi(2)).sqrt() / 400.0;
                let r = base + edge * dist.min(1.5);
                let blur = if r < 0.75 { "" } else if r < 1.5 { "url(#b1)" } else if r < 3.0 { "url(#b2)" } else { "url(#b4)" };
                let g = wire_globe(frame, cx, cy, d, rot, color, band, seed + (i * 7 + j * 13) as f32, n);
                globes.push(fframes::svgr!(<g filter={blur}>{g}</g>));
            }
        }
        fframes::svgr!(<g>{globes}</g>)
    };
    fframes::svgr!(<g>
        {kit::fill(bg)}
        {body}
    </g>)
}

pub fn look(_p: P) -> (f32, f32) {
    (1.0, 1.0)
}
