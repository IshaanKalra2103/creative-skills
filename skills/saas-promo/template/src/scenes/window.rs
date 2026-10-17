//! `window`: an app window built up on the backdrop. Coming out of a `title`, the frosted
//! pill keeps rising, turns into lilac/blue glass and grows into a glass sheet that sweeps
//! across, goes solid, and the page comes up layer by layer (your screenshots, split into
//! layers) while a blue tint fades off it; the pill locks into the page as its prompt box.
//! The title stays behind as an outlined glass line at the top (`backtitle`). The window
//! drifts, then rises, shrinks and blurs out into the cut.
//!
//! Motion is the reference intro's measured window and pill tracks (frames 47-99 at 25 fps),
//! replayed through `title::vframe` (entrance at speed, hold stretches, exit at speed).
//! Params: references/kinds/window.md.
use super::title::{self, Line, REF_FPS, bg_hex, mix_hex, vframe};
use crate::kit::{self, T, lerp, seg, smooth};
use crate::spec::P;
use fframes::{FFramesContext, Frame, Svgr};

/// (frame, left x, right x, top y) of the reference window (994 window px wide).
const WIN: &[(f32, [f32; 3])] = &[
    (44.0, [118.0, 1162.0, 360.0]),
    (45.0, [118.0, 1162.0, 330.0]),
    (46.0, [110.0, 1170.0, 290.0]),
    (48.0, [130.0, 1156.0, 234.0]),
    (50.0, [134.0, 1146.0, 198.0]),
    (52.0, [136.0, 1144.0, 178.0]),
    (54.0, [136.0, 1144.0, 164.0]),
    (57.0, [136.0, 1144.0, 154.0]),
    (60.0, [138.0, 1141.0, 148.0]),
    (64.0, [139.0, 1139.0, 148.0]),
    (70.0, [141.0, 1137.0, 149.0]),
    (74.0, [143.0, 1135.0, 150.0]),
    (80.0, [147.0, 1131.0, 152.0]),
    (86.0, [153.0, 1126.0, 152.0]),
    (90.0, [158.0, 1120.0, 145.0]),
    (92.0, [161.0, 1117.0, 138.0]),
    (94.0, [165.0, 1113.0, 127.0]),
    (96.0, [169.0, 1109.0, 110.0]),
    (97.0, [171.0, 1107.0, 99.0]),
    (98.0, [174.0, 1105.0, 86.0]),
    (99.0, [177.0, 1103.0, 70.0]),
    (100.0, [180.0, 1101.0, 54.0]),
];

/// (frame, x0, y0, x1, y1) of the free pill, before it locks into the window.
const PILL: &[(f32, [f32; 4])] = &[
    (36.0, [380.0, 760.0, 900.0, 920.0]),
    (37.0, [380.0, 650.0, 940.0, 810.0]),
    (38.0, [382.0, 562.0, 980.0, 722.0]),
    (39.0, [392.0, 547.0, 995.0, 708.0]),
    (40.0, [403.0, 540.0, 1003.0, 703.0]),
    (41.0, [430.0, 538.0, 1035.0, 690.0]),
    (42.0, [451.0, 536.0, 1062.0, 675.0]),
    (43.0, [447.0, 533.0, 1052.0, 670.0]),
    (44.0, [442.0, 531.0, 1041.0, 666.0]),
    (45.0, [446.0, 528.0, 1030.0, 661.0]),
    (46.0, [451.0, 525.0, 1019.0, 657.0]),
    (47.0, [458.0, 520.0, 1012.0, 648.0]),
    (48.0, [466.0, 514.0, 1006.0, 638.0]),
    (49.0, [474.0, 503.0, 996.0, 623.0]),
    (50.0, [482.0, 492.0, 986.0, 608.0]),
    (51.0, [485.0, 488.0, 983.0, 603.0]),
    (52.0, [488.0, 484.0, 980.0, 598.0]),
    (54.0, [492.0, 480.0, 976.0, 592.0]),
    (57.0, [492.0, 476.0, 976.0, 588.0]),
];

/// Three colours from a param, or the defaults.
fn cols3(p: P, k: &str, d: [String; 3]) -> [String; 3] {
    let v = p.strs(k);
    if v.len() >= 3 { [v[0].to_string(), v[1].to_string(), v[2].to_string()] } else { d }
}

/// Glass colours (lilac -> blue), the "cool" pass and the solid tint, from the palette
/// unless the spec names them (`sheet`, `cool`, `tint`).
fn colours(p: P) -> ([String; 3], [String; 3], [String; 2]) {
    let (cyan, peri, deep, glow) = (bg_hex(1), bg_hex(2), bg_hex(3), bg_hex(5));
    let frost = kit::pal().frost;
    let sheet = cols3(p, "sheet", [mix_hex(&glow, "#ffb8f4", 0.45), mix_hex(&glow, &peri, 0.45), mix_hex(&peri, "#ffffff", 0.15)]);
    let cool = cols3(p, "cool", [mix_hex(&peri, "#ffffff", 0.25), mix_hex(&cyan, "#ffffff", 0.55), mix_hex(frost, "#ffffff", 0.5)]);
    let t = p.strs("tint");
    let tint = if t.len() >= 2 { [t[0].to_string(), t[1].to_string()] } else { [mix_hex(&peri, &deep, 0.5), peri.clone()] };
    (sheet, cool, tint)
}

/// The window's own geometry (window px) and placement.
pub(crate) struct Win {
    /// Frame size in window px (the frame runs a little below the layer images).
    w: f32,
    h: f32,
    /// Size the layer images are drawn at (window px; the PNGs are usually 2x).
    lw: f32,
    lh: f32,
    /// The prompt box inside the window (x0, y0, x1, y1 window px) the pill locks into.
    prompt: [f32; 4],
    prompt_layer: String,
    /// Extra scale about the frame centre and vertical offset.
    scale: f32,
    dy: f32,
}

impl Win {
    fn from(p: P) -> Self {
        let ws = p.fs("window_size");
        let ls = p.fs("layer_size");
        let pr = p.fs("prompt_rect");
        let w = ws.first().copied().unwrap_or(994.0);
        Win {
            w,
            h: ws.get(1).copied().unwrap_or(602.0),
            lw: ls.first().copied().unwrap_or(w),
            lh: ls.get(1).copied().unwrap_or(585.0),
            prompt: if pr.len() >= 4 { [pr[0], pr[1], pr[2], pr[3]] } else { [354.0, 325.0, 826.0, 433.0] },
            prompt_layer: p.s("prompt_layer", "").to_string(),
            scale: p.f("window_scale", 1.0),
            dy: p.f("window_y", 0.0),
        }
    }
    /// (left x, top y, px per window px) at reference frame `f`. The reference window is
    /// 994 px wide; other widths keep its screen width and centre.
    fn geom(&self, f: f32) -> (f32, f32, f32) {
        let [x0, x1, top] = kit::track(f, WIN);
        let s0 = (x1 - x0) / 994.0 * self.scale * 994.0 / self.w;
        let cx = (x0 + x1) / 2.0;
        let w = self.w * s0;
        let top = 360.0 + (top - 360.0) * self.scale + self.dy;
        (cx - w / 2.0, top, s0)
    }
}

fn layer_img<'a>(ctx: &FFramesContext<'a, '_>, name: &str, w: f32, h: f32) -> Svgr<'a> {
    match ctx.get_image(name) {
        Some(i) => fframes::svgr!(<image href={i.href()} x="0" y="0" width={w} height={h} />),
        None => Svgr::empty(),
    }
}

/// The pill and the prompt box it becomes, at reference frame `f` (36-99.5). With `win` it
/// locks into the window's prompt box from frame 52.
pub fn pill<'a>(p: P<'a>, f: f32, win: Option<&Win>, ctx: &FFramesContext<'a, '_>) -> Svgr<'a> {
    if !(36.0..=99.5).contains(&f) {
        return Svgr::empty();
    }
    let free = kit::track(f, PILL);
    let wd = Win::from(p);
    let w = win.unwrap_or(&wd);
    let [px0, py0, px1, py1] = w.prompt;
    let [x0, y0, x1, y1] = match win {
        Some(wn) => {
            let (wx, wt, s) = wn.geom(f.max(57.0));
            let locked = [wx + px0 * s, wt + py0 * s, wx + px1 * s, wt + py1 * s];
            let k = smooth(seg(f, 52.0, 60.0));
            let mut r = [0.0; 4];
            for i in 0..4 {
                r[i] = lerp(free[i], locked[i], k);
            }
            r
        }
        None => free,
    };
    let (w_, h_) = (x1 - x0, y1 - y0);
    let sx = w_ / (px1 - px0);
    let sy = h_ / (py1 - py0);
    let rr = 14.0 * sx;
    // phases: frosted -> cool glass -> lilac/blue glass -> the prompt box with its content
    let frost = 1.0 - smooth(seg(f, 38.5, 40.0));
    let cool = smooth(seg(f, 38.5, 40.0)) * (1.0 - smooth(seg(f, 40.8, 42.3)));
    let glass = smooth(seg(f, 40.8, 42.3)) * (1.0 - smooth(seg(f, 47.0, 51.0)));
    let content = if win.is_some() { smooth(seg(f, 47.0, 51.5)) } else { 0.0 };
    let blur = lerp(16.0, 0.0, smooth(seg(f, 36.0, 42.5)));
    let fade_in = smooth(seg(f, 36.3, 38.5));
    let m = format!("matrix({sx:.5} 0 0 {sy:.5} {:.3} {:.3})", x0 - px0 * sx, y0 - py0 * sy);
    let layer = if w.prompt_layer.is_empty() {
        // no screenshot of the prompt box: a plain white box with the accent send button
        let (bx, by, bw, bh) = (px0, py0, px1 - px0, py1 - py0);
        let (cx, cy) = (px1 - 24.0, py1 - 20.0);
        let panel = kit::pal().panel.to_string();
        let accent = kit::pal().accent.to_string();
        fframes::svgr!(<g>
            <rect x={bx} y={by} width={bw} height={bh} rx="14" fill={panel} />
            <circle cx={cx} cy={cy} r="9" fill={accent} />
        </g>)
    } else {
        layer_img(ctx, &w.prompt_layer, w.lw, w.lh)
    };
    let (sheet, cool_c, _) = colours(p);
    let frost_c = kit::pal().frost.to_string();
    let ga = glass * 0.96;
    let ca = cool * 0.95;
    let fa = frost * 0.62;
    let (s0, s1, s2) = (sheet[0].clone(), sheet[1].clone(), sheet[2].clone());
    let (c0, c1, c2) = (cool_c[0].clone(), cool_c[1].clone(), cool_c[2].clone());
    let body = fframes::svgr!(
        <g opacity={fade_in}>
            <defs>
                <linearGradient id="wpillg" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stop-color={s0} />
                    <stop offset="0.45" stop-color={s1} />
                    <stop offset="1" stop-color={s2} />
                </linearGradient>
                <linearGradient id="wpillcool" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stop-color={c0} />
                    <stop offset="0.55" stop-color={c1} />
                    <stop offset="1" stop-color={c2} />
                </linearGradient>
                <linearGradient id="wpillsheen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stop-color="#ffffff" stop-opacity="0.35" />
                    <stop offset="0.5" stop-color="#ffffff" stop-opacity="0.05" />
                    <stop offset="1" stop-color="#ffffff" stop-opacity="0.18" />
                </linearGradient>
            </defs>
            <rect x={x0} y={y0} width={w_} height={h_} rx={rr} fill={frost_c} opacity={fa} />
            <rect x={x0} y={y0} width={w_} height={h_} rx={rr} fill="url(#wpillcool)" opacity={ca} />
            <g opacity={ga}>
                <rect x={x0} y={y0} width={w_} height={h_} rx={rr} fill="url(#wpillg)" />
                <rect x={x0} y={y0} width={w_} height={h_} rx={rr} fill="url(#wpillsheen)" />
                <rect x={x0 + 0.75} y={y0 + 0.75} width={w_ - 1.5} height={h_ - 1.5} rx={rr} fill="none" stroke="#ffffff" stroke-opacity="0.45" stroke-width="1.5" />
            </g>
            <g opacity={content} transform={m}>{layer}</g>
        </g>
    );
    kit::blurred("wpillb", blur, body)
}

/// One `[[scene.layers]]` entry drawn at `lt` seconds (reference speed) after the window
/// scene's reference start.
fn layer<'a>(lp: P<'a>, n: usize, lt: f32, win: &Win, ctx: &FFramesContext<'a, '_>) -> Svgr<'a> {
    let name = lp.s("image", "");
    let at = lp.f("at", 0.25);
    let fade = lp.f("fade", 0.08).max(0.001);
    let rise = lp.f("rise", 0.0);
    let cols = lp.sub("cols");
    if cols.has("n") {
        // revealed in columns, one after another (icon rows)
        let count = cols.i("n", 4) as usize;
        let (x, cw, y, ch) = (cols.f("x", 0.0), cols.f("w", 54.0), cols.f("y", 0.0), cols.f("h", 90.0));
        let step = cols.f("step", 0.044);
        let mut out = vec![];
        for i in 0..count {
            let a0 = at + i as f32 * step;
            let pr = smooth(seg(lt, a0, a0 + fade));
            if pr <= 0.0 {
                continue;
            }
            let id = format!("wcol{n}_{i}");
            let url = format!("url(#{id})");
            let ty = format!("translate(0 {:.2})", (1.0 - pr) * rise);
            let cx = x + cw * i as f32;
            let img = layer_img(ctx, name, win.lw, win.lh);
            out.push(fframes::svgr!(
                <g opacity={pr}>
                    <defs><clipPath id={id}><rect x={cx} y={y} width={cw} height={ch} /></clipPath></defs>
                    <g clip-path={url}><g transform={ty}>{img}</g></g>
                </g>
            ));
        }
        return fframes::svgr!(<g>{out}</g>);
    }
    let pr = smooth(seg(lt, at, at + fade));
    if pr <= 0.0 {
        return Svgr::empty();
    }
    let ty = format!("translate(0 {:.2})", (1.0 - pr) * rise);
    let img = layer_img(ctx, name, win.lw, win.lh);
    let wipe = lp.sub("wipe");
    if wipe.has("w") {
        // wiped in from the left: a clip that grows from `from` to `w` px over `dur` s
        let ww = lerp(wipe.f("from", 20.0), wipe.f("w", 360.0), smooth(seg(lt, at, at + wipe.f("dur", 0.1))));
        let (x, y, h) = (wipe.f("x", 0.0), wipe.f("y", 0.0), wipe.f("h", 40.0));
        let id = format!("wwipe{n}");
        let url = format!("url(#{id})");
        return fframes::svgr!(
            <g opacity={pr} transform={ty}>
                <defs><clipPath id={id}><rect x={x} y={y} width={ww} height={h} /></clipPath></defs>
                <g clip-path={url}>{img}</g>
            </g>
        );
    }
    fframes::svgr!(<g opacity={pr} transform={ty}>{img}</g>)
}

/// The window at reference frame `f`: glass sheet -> solid tint -> the page coming up under
/// a fading tint. `f0` is the reference frame the scene started on (layer times count from it).
fn window<'a>(p: P<'a>, win: &Win, f: f32, f0: f32, ctx: &FFramesContext<'a, '_>) -> Svgr<'a> {
    if f < 44.0 {
        return Svgr::empty();
    }
    let (x0, top, s) = win.geom(f);
    let t = format!("translate({x0:.3} {top:.3}) scale({s:.5})");
    let (ww, wh) = (win.w, win.h);
    // glass sheet (44-52): lilac/blue, sweeping in from the left
    let sheet_a = 0.92 * smooth(seg(f, 44.3, 45.5)) * (1.0 - smooth(seg(f, 50.5, 52.0))) + 0.08 * smooth(seg(f, 47.0, 50.5));
    let sweep = smooth(seg(f, 44.3, 48.0));
    let k = smooth(seg(f, 48.0, 50.0));
    let blue_a = smooth(seg(f, 50.5, 52.0));
    let tint = 1.0 - smooth(seg(f, 53.0, 60.0));
    let content_a = smooth(seg(f, 52.5, 54.0));
    let glow_a = 0.32 * smooth(seg(f, 52.0, 58.0));
    let edge_blur = lerp(9.0, 0.0, smooth(seg(f, 45.5, 50.5)));
    let mask_x = lerp(-0.25, 1.3, sweep);
    let mask_x2 = mask_x + 0.18;
    let early = 1.0 - smooth(seg(f, 46.3, 47.8));
    let lt = (f - f0) / REF_FPS;

    let mut layers = vec![];
    if let Some(base) = p.opt("base") {
        layers.push(layer_img(ctx, base, win.lw, win.lh));
    }
    for (n, lp) in p.list("layers").into_iter().enumerate() {
        layers.push(layer(lp, n, lt, win, ctx));
    }

    let (sheet, _, tint_c) = colours(p);
    let page = p.s("page", "#efecf3").to_string();
    let soft = p.f("soften", 0.45).max(0.01);
    let (sa0, sa1, sa2) = (sheet[0].clone(), sheet[1].clone(), sheet[2].clone());
    let (sb0, sb1, sb2) = (sheet[2].clone(), mix_hex(&sheet[1], &sheet[2], 0.4), sheet[0].clone());
    let (e0, e1) = (mix_hex(&sheet[2], &bg_hex(1), 0.3), mix_hex(&sheet[2], "#ffffff", 0.3));
    let (t0, t1) = (tint_c[0].clone(), tint_c[1].clone());
    let gw = ww + 16.0;
    let gh = wh + 16.0;
    let sw = ww;
    let sh = wh;
    let body = fframes::svgr!(
        <g transform={t}>
            <defs>
                <linearGradient id="wsheetA" x1="0" y1="1" x2="1" y2="0">
                    <stop offset="0" stop-color={sa0} />
                    <stop offset="0.5" stop-color={sa1} />
                    <stop offset="1" stop-color={sa2} />
                </linearGradient>
                <linearGradient id="wsheetB" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stop-color={sb0} />
                    <stop offset="0.5" stop-color={sb1} />
                    <stop offset="1" stop-color={sb2} />
                </linearGradient>
                <linearGradient id="wsheet0" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stop-color={e0} />
                    <stop offset="1" stop-color={e1} />
                </linearGradient>
                <linearGradient id="wsweep" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={sw} y2={sh}>
                    <stop offset={mask_x.clamp(0.0, 1.0)} stop-color="#ffffff" stop-opacity="1" />
                    <stop offset={mask_x2.clamp(0.0, 1.0)} stop-color="#ffffff" stop-opacity="0" />
                </linearGradient>
                <mask id="wmask" maskUnits="userSpaceOnUse" x="-20" y="-20" width={sw + 40.0} height={sh + 40.0}>
                    <rect x="0" y="0" width={sw} height={sh} fill="url(#wsweep)" />
                </mask>
                <linearGradient id="wtint" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stop-color={t0} />
                    <stop offset="1" stop-color={t1} />
                </linearGradient>
                <filter id="wsoft" x="-2%" y="-2%" width="104%" height="104%">
                    <feGaussianBlur stdDeviation={soft} />
                </filter>
                <filter id="wglowf" x="-10%" y="-10%" width="120%" height="120%">
                    <feGaussianBlur stdDeviation="9" />
                </filter>
            </defs>
            // soft white glow around the window
            <rect x="-8" y="-8" width={gw} height={gh} rx="22" fill="#ffffff" opacity={glow_a} filter="url(#wglowf)" />
            // glass sheet
            <g opacity={sheet_a} mask="url(#wmask)">
                <rect x="0" y="0" width={sw} height={sh} rx="16" fill="url(#wsheetA)" opacity={1.0 - k} />
                <rect x="0" y="0" width={sw} height={sh} rx="16" fill="url(#wsheet0)" opacity={early} />
                <rect x="0" y="0" width={sw} height={sh} rx="16" fill="url(#wsheetB)" opacity={k} />
                <rect x="0.75" y="0.75" width={sw - 1.5} height={sh - 1.5} rx="16" fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-width="1.5" />
            </g>
            // the page (slightly soft, like the reference's video)
            <g opacity={content_a} filter="url(#wsoft)">
                <rect x="0" y="0" width={sw} height={sh} rx="16" fill={page} />
                {layers}
            </g>
            // solid tint, then fading off the page
            <rect x="0" y="0" width={sw} height={sh} rx="16" fill="url(#wtint)" opacity={blue_a * tint} />
        </g>
    );
    kit::blurred("wwinb", edge_blur, body)
}

pub fn render<'a>(p: P<'a>, tm: &T, frame: &mut Frame, ctx: &FFramesContext<'a, '_>) -> Svgr<'a> {
    let bg = kit::bg(frame, &kit::backdrop(p, tm, "window"));
    let from_pill = p.b("from_pill", true);
    // reference shot: from the title cut (47) or, alone, from the glass sheet (44);
    // settled by 66, drifting until 86, rising away into 100
    let f0 = if from_pill { 47.0 } else { 44.0 };
    let f = vframe(tm, f0, 66.0, 86.0, 100.0);
    let win = Win::from(p);

    // the title line, now an outlined glass line at the top
    let back = if p.has("backtitle") {
        let sub = p.sub("backtitle");
        let ln = if sub.has("words") { Line::from(sub, "words") } else { Line::from(p, "backtitle") };
        title::draw(&ln, f, None, (0.0, 0.0), frame, ctx, "wbt")
    } else {
        Svgr::empty()
    };
    let ring = if from_pill && p.b("halftone", false) { title::halftone(frame, f, p.f("ring_x", 660.0), p.f("ring_y", 380.0)) } else { Svgr::empty() };
    let window = window(p, &win, f, f0, ctx);
    let pill = if from_pill { pill(p, f, Some(&win), ctx) } else { Svgr::empty() };
    let scene = fframes::svgr!(
        <g>
            {ring}
            {back}
            {window}
            {pill}
        </g>
    );
    // exit defocus over the last 4 reference frames
    let exit = kit::keys(f, &[(96.0, 0.0), (97.0, 1.5), (98.0, 4.0), (99.0, 7.0), (100.0, 9.0)], |t| t) * p.f("exit_blur", 1.0);
    let scene = kit::blurred("wexit", exit, scene);
    fframes::svgr!(
        <g>
            {bg}
            {scene}
        </g>
    )
}

/// Drawn above the letterbox.
#[allow(dead_code)]
pub fn overlay(_p: P, _t: f32, _len: f32) -> Svgr<'static> {
    Svgr::empty()
}
