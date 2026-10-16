//! file_icon: a file icon (After Effects "Ae / AEP" style: dark tile, light border, folded
//! corner, big label, small extension) on dark stacked-paper ribbons; a white hand cursor climbs
//! from the bottom-left to the icon while the camera slowly pulls back, then pans up-left.
//! Camera and cursor are measured per tick on the reference. Params: references/shots.md#file_icon.
use crate::kit::{self, T};
use crate::spec::P;
use fframes::{FFramesContext, Frame, Shader, ShaderUniforms, Svgr};
use std::sync::LazyLock;

static LINES: LazyLock<Shader> = LazyLock::new(|| Shader::sksl(include_str!("../shaders/file_icon_lines.sksl")));

/// Icon width (px) and centre on screen per tick; the world is tick 0's frame (scale 1).
const ICON: [(f32, f32, f32); 19] = [
    (156.0, 362.0, 640.0), (134.0, 361.0, 639.0), (122.0, 361.0, 640.0), (113.0, 360.5, 641.0),
    (108.0, 360.0, 641.0), (102.0, 361.0, 641.0), (100.0, 362.0, 639.5), (97.0, 362.5, 640.0),
    (94.0, 361.0, 641.0), (94.0, 361.0, 639.0), (93.0, 360.5, 640.0), (90.0, 361.0, 640.5),
    (86.0, 361.0, 642.0), (82.0, 361.0, 640.0), (78.0, 361.0, 640.0), (77.0, 358.5, 640.0),
    (78.0, 351.0, 636.0), (78.0, 337.0, 630.0), (76.0, 298.0, 616.0),
];
/// Cursor centre on screen, rotation (deg) and blur per tick.
const CURSOR: [(f32, f32, f32, f32); 19] = [
    (14.0, 1052.0, 50.0, 4.0), (250.0, 1062.0, 72.0, 1.0), (342.0, 940.0, 34.0, 0.6), (375.0, 869.0, 14.0, 0.0),
    (388.0, 816.0, 8.0, 0.0), (391.0, 778.0, 5.0, 0.0), (392.5, 751.5, 3.0, 0.0), (391.0, 732.5, 2.0, 0.0),
    (387.0, 720.0, 1.0, 0.0), (386.5, 710.5, 0.0, 0.0), (384.5, 705.0, 0.0, 0.0), (383.0, 700.5, 0.0, 0.0),
    (381.0, 695.5, 0.0, 0.0), (379.5, 691.0, 0.0, 0.0), (378.5, 689.0, 0.0, 0.0), (376.0, 689.0, 0.0, 0.0),
    (369.0, 684.5, 0.0, 0.0), (354.5, 679.5, 0.0, 0.0), (315.5, 664.5, 0.0, 0.0),
];

pub fn look(_p: P) -> (f32, f32) {
    (1.0, 1.0)
}

fn hand<'a>(x: f32, y: f32, size: f32, rot: f32, blur: f32) -> Svgr<'a> {
    // a 22x28 pointing hand, centred on (10.5, 14)
    let t = format!("translate({x:.1} {y:.1}) rotate({rot:.1}) scale({:.3}) translate(-10.5 -14)", size / 28.0);
    let f = if blur > 0.5 { "url(#b2)" } else { "" };
    fframes::svgr!(<g transform={t} filter={f}>
        <path d="M 8 2.2 Q 10 -0.6 12 2.2 L 12 11 Q 13.6 9.4 15.2 11.2 Q 16.8 9.9 18.4 12 Q 20 11 21.4 13.2 L 21.4 21 Q 21 26.6 16 27.6 L 10.2 27.6 Q 6 26.8 4.2 22.4 L 0.9 16.4 Q 0.4 13.4 3.2 14.2 L 8 18 Z"
            fill="#e9e9e9" stroke="#3c3c3c" stroke-width="0.9" stroke-linejoin="round" />
        <path d="M 12 11 L 12 17 M 15.2 11.2 L 15.2 17 M 18.4 12 L 18.4 17" stroke="#8a8a8a" stroke-width="0.8" fill="none" />
    </g>)
}

pub fn render<'a>(p: P<'a>, tm: &T, frame: &mut Frame, ctx: &FFramesContext<'a, '_>) -> Svgr<'a> {
    let i = tm.tick.max(0) as usize;
    let (w, cx, cy) = ICON[i.min(ICON.len() - 1)];
    let s = w / 156.0;
    let cam = format!("translate({cx:.2} {cy:.2}) scale({s:.4}) translate(-362 -640)");
    // ribbons drawn in world space so the pull-back reveals more of them
    let (ox, oy, bw, bh) = (-700.0, -800.0, 2200.0, 3000.0);
    let lines = LINES.draw(frame, ShaderUniforms::new().float2("uOff", ox, oy).float("uDensity", p.f("density", 2.0)));
    let (hx, hy, rot, blur) = CURSOR[i.min(CURSOR.len() - 1)];
    // the hand is about 92 px tall at full scale (it shrinks with the pull-back)
    let hsize = 92.0 * s;
    let label = kit::intern(p.s("label", "Ae"));
    let ext = kit::intern(p.s("ext", "AEP"));
    let fill = p.s("fill", "#00005b");
    let accent = p.s("accent", "#9999ff");
    let ext_color = p.s("ext_color", "#d4d4ff");
    // labels shrink to stay inside the tile (Ae at 84 px is the reference's size)
    let lw = kit::text_w(frame, ctx, kit::SANS, 700, 84, label) * 0.98;
    let lsize = if lw > 128.0 { 84.0 * 128.0 / lw } else { 84.0 };
    let ew = kit::text_w(frame, ctx, kit::SANS, 700, 31, ext);
    let esize = if ew > 128.0 { 31.0 * 128.0 / ew } else { 31.0 };
    let cursor = if p.b("cursor", true) { hand(hx, hy, hsize, rot, blur) } else { Svgr::empty() };
    fframes::svgr!(<g>
        {kit::fill("#050505")}
        <g transform={cam}>
            <image href={lines.href()} x={ox} y={oy} width={bw} height={bh} />
            // the file icon
            <g>
                <path d="M 296 546 L 412 546 L 438 572 L 438 722 Q 438 734 426 734 L 296 734 Q 284 734 284 722 L 284 558 Q 284 546 296 546 Z"
                    fill={fill} stroke={accent} stroke-width="4.2" stroke-linejoin="round" />
                <path d="M 412 546 L 412 562 Q 412 572 422 572 L 438 572" fill="none" stroke={accent} stroke-width="3.6" stroke-linejoin="round" />
                <text x="361" y={646.0 - (84.0 - lsize) * 0.35} font-family={kit::SANS} font-weight="700" font-size={lsize} fill={accent} text-anchor="middle" letter-spacing="-0.02em">{label}</text>
                <text x="361" y="708" font-family={kit::SANS} font-weight="700" font-size={esize} fill={ext_color} text-anchor="middle">{ext}</text>
            </g>
        </g>
        {cursor}
    </g>)
}
