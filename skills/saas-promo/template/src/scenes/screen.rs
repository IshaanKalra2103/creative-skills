//! `screen`: an app window (a chrome image) swings in out of a blur with perspective, its
//! layers stream in (line-by-line wipes or fades), the camera pushes in while the content
//! image scrolls inside a viewport (down, hold, back up), then pulls back and blurs into the
//! cut. Optional sprites (a flipbook in page coordinates, e.g. a product turning) ride on the
//! content. Swing, push and scroll-down run on the entry clock; scroll-back, pull-back and
//! the exit blur on the exit clock. Curves measured on the reference promo (shot 369-449 at
//! 25 fps). Params: references/kinds/screen.md.
use crate::kit::{self, Persp, T, clamp01, ease_out, keys, lerp, seg, smooth};
use crate::spec::P;
use fframes::{FFramesContext, Frame, Svgr};

/// Default window size (layer px): the reference editor window.
const WIN_W: f32 = 1128.0;

/// Normalized scroll shapes (seconds, fraction of `to`), measured.
const DOWN: [(f32, f32); 10] = [(0.0, 0.0), (0.12, 0.062), (0.24, 0.205), (0.36, 0.488), (0.48, 0.69), (0.6, 0.805), (0.72, 0.882), (0.84, 0.934), (0.96, 0.974), (1.08, 1.0)];
const BACK: [(f32, f32); 12] = [(0.0, 1.0), (0.12, 0.97), (0.24, 0.858), (0.36, 0.581), (0.48, 0.374), (0.6, 0.262), (0.72, 0.19), (0.84, 0.141), (0.96, 0.106), (1.08, 0.082), (1.2, 0.064), (1.32, 0.05)];

struct Geo {
    w: f32,
    h: f32,
    vp: [f32; 4],
    page_h: f32,
}

fn geo(p: P, ctx: &FFramesContext) -> Geo {
    let size = p.fs("size");
    let (w, h) = if size.len() == 2 {
        (size[0], size[1])
    } else {
        match ctx.get_image(p.s("chrome", "")) {
            Some(i) => (WIN_W, WIN_W * i.metadata.height as f32 / i.metadata.width as f32),
            None => (WIN_W, 676.0),
        }
    };
    let v = p.fs("viewport");
    let vp = if v.len() == 4 { [v[0], v[1], v[2], v[3]] } else { [0.0, 0.0, w, h] };
    let page_h = p.f(
        "content_h",
        match ctx.get_image(p.s("content", "")) {
            Some(i) => vp[2] * i.metadata.height as f32 / i.metadata.width as f32,
            None => vp[3],
        },
    );
    Geo { w, h, vp, page_h }
}

fn img<'a>(ctx: &FFramesContext<'a, '_>, name: &str, x: f32, y: f32, w: f32, h: f32) -> Svgr<'a> {
    match ctx.get_image(name) {
        Some(i) => {
            let href = i.href();
            fframes::svgr!(<image href={href} x={x} y={y} width={w} height={h} preserveAspectRatio="none" />)
        }
        None => Svgr::empty(),
    }
}

/// Image at its natural aspect, height `h`, centred on (cx, cy), rotated `rot` degrees.
fn img_c<'a>(ctx: &FFramesContext<'a, '_>, name: &str, cx: f32, cy: f32, h: f32, rot: f32) -> Svgr<'a> {
    let Some(i) = ctx.get_image(name) else { return Svgr::empty() };
    let w = h * i.metadata.width as f32 / i.metadata.height as f32;
    let href = i.href();
    let t = format!("translate({cx:.2} {cy:.2}) rotate({rot:.2})");
    let (x, y) = (-w / 2.0, -h / 2.0);
    fframes::svgr!(<g transform={t}><image href={href} x={x} y={y} width={w} height={h} preserveAspectRatio="none" /></g>)
}

/// Scroll of the content (page px) at this instant.
fn scroll(p: P, tm: &T, g: &Geo) -> f32 {
    let rows = p.rows("scroll_keys");
    if rows.len() >= 2 {
        let k: Vec<(f32, f32)> = rows.iter().filter(|r| r.len() >= 2).map(|r| (r[0], r[1])).collect();
        return keys(tm.e(), &k, smooth);
    }
    let sc = p.sub("scroll");
    let to = sc.f("to", (g.page_h - g.vp[3]).max(0.0) * 0.6);
    let down_at = sc.f("down_at", 0.72);
    let back_at = sc.f("back_at", 1.32);
    let down = keys(tm.e() - down_at, &DOWN, |t| t);
    // the way back runs on the exit clock: it starts `back_at` s before the cut
    let back = if tm.x() < back_at { keys(back_at - tm.x(), &BACK, |t| t) } else { 1.0 };
    to * down.min(back)
}

/// Line-by-line wipe mask for a layer: rows of [x, y, w, h, at, dur] (window px, seconds).
fn stream<'a>(id: &str, rows: &[Vec<f32>], e: f32, g: &Geo, body: Svgr<'a>) -> Svgr<'a> {
    let mut grads = vec![];
    let mut rects = vec![];
    for (n, r) in rows.iter().enumerate() {
        if r.len() < 6 {
            continue;
        }
        let (x0, top, w, h, at, dur) = (r[0], r[1], r[2], r[3], r[4], r[5]);
        let p = (e - at) / dur.max(0.01);
        if p <= 0.0 || w <= 0.0 {
            continue;
        }
        let feather = 46.0;
        let edge = x0 + (w + feather) * ease_out(clamp01(p));
        let gid = format!("{id}g{n}");
        let fid = format!("url(#{id}g{n})");
        let e0 = edge - feather;
        grads.push(fframes::svgr!(
            <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1={e0} y1="0" x2={edge} y2="0">
                <stop offset="0" stop-color="#ffffff" />
                <stop offset="1" stop-color="#000000" />
            </linearGradient>
        ));
        let rw = edge - x0 + 8.0;
        let (rx, ry, rh) = (x0 - 6.0, top - 3.0, h + 6.0);
        rects.push(fframes::svgr!(<rect x={rx} y={ry} width={rw} height={rh} fill={fid} />));
    }
    let mid = format!("{id}m");
    let murl = format!("url(#{id}m)");
    let (w, h) = (g.w, g.h);
    fframes::svgr!(
        <g>
            <defs>
                {grads}
                <mask id={mid} maskUnits="userSpaceOnUse" x="0" y="0" width={w} height={h}>{rects}</mask>
            </defs>
            <g mask={murl}>{body}</g>
        </g>
    )
}

/// Flipbook sprite in page coordinates: frames [t, image, cx, cy, h, rot(, rot_from)].
fn sprite<'a>(p: P<'a>, e: f32, ctx: &FFramesContext<'a, '_>) -> Svgr<'a> {
    let sp = p.sub("sprite");
    let frames = sp.0.get("frames").and_then(|v| v.as_array()).cloned().unwrap_or_default();
    if frames.is_empty() {
        return Svgr::empty();
    }
    let num = |v: Option<&toml::Value>| crate::spec::num(v).unwrap_or(0.0);
    let mut cur = 0;
    for (i, f) in frames.iter().enumerate() {
        if num(f.get(0)) <= e {
            cur = i;
        }
    }
    let f = &frames[cur];
    let t0 = num(f.get(0));
    let name = f.get(1).and_then(|v| v.as_str()).unwrap_or("");
    let (cx, cy, h, rot) = (num(f.get(2)), num(f.get(3)), num(f.get(4)), num(f.get(5)));
    let rot = match f.get(6) {
        Some(v) => lerp(crate::spec::num(Some(v)).unwrap_or(rot), rot, ease_out(seg(e, t0, t0 + 0.16))),
        None => rot,
    };
    let float = ((e + 3.0) * 2.1).sin() * sp.f("float", 3.0);
    let shoe = img_c(ctx, name, cx, cy + float, h, rot);
    let sh = sp.fs("shadow");
    let shadow = if sh.len() >= 4 {
        let a = sp.f("shadow_alpha", 0.22) * smooth(seg(e, 0.28, 0.6));
        let col = sp.s("shadow_color", "#3d4a00").to_string();
        fframes::svgr!(<ellipse cx={sh[0]} cy={sh[1]} rx={sh[2]} ry={sh[3]} fill={col} opacity={a} />)
    } else {
        Svgr::empty()
    };
    // optional pixel dissolve: a pale copy of the first frame, eaten away cell by cell
    let dis = sp.fs("dissolve");
    if dis.len() == 2 && e < dis[1] + 0.1 && cur == 0 {
        let pale = img_c(ctx, name, cx, cy + float, h, rot);
        let cell = 22.0;
        let (x0, y0) = (cx - 260.0, cy - 170.0);
        let mut rects = vec![];
        for j in 0..16 {
            for i2 in 0..24 {
                let n = (j * 24 + i2) as u64;
                let at = dis[0] + (dis[1] - dis[0]) * kit::rnd(n, 7);
                let a = clamp01(1.0 - (e - at) / 0.05);
                if a <= 0.0 {
                    continue;
                }
                let x = x0 + i2 as f32 * cell;
                let y = y0 + j as f32 * cell;
                rects.push(fframes::svgr!(<rect x={x} y={y} width={cell + 0.4} height={cell + 0.4} fill="#ffffff" fill-opacity={a} />));
            }
        }
        return fframes::svgr!(
            <g>
                <defs>
                    <mask id="scr_px">{rects}</mask>
                    <filter id="scr_pale" color-interpolation-filters="sRGB">
                        <feColorMatrix type="matrix" values="0.3 0 0 0 0.68  0 0.3 0 0 0.69  0 0 0.3 0 0.66  0 0 0 1 0" />
                    </filter>
                </defs>
                {shadow}
                {shoe}
                <g mask="url(#scr_px)"><g filter="url(#scr_pale)">{pale}</g></g>
            </g>
        );
    }
    fframes::svgr!(<g>{shadow}{shoe}</g>)
}

/// The window in layer (window) coordinates.
fn window<'a>(p: P<'a>, tm: &T, g: &Geo, ctx: &FFramesContext<'a, '_>, tag: &str) -> Svgr<'a> {
    let e = tm.e();
    let [vx, vy, vw, vh] = g.vp;
    let site_y = vy - scroll(p, tm, g);
    // content: fill, page (fades up), extra page layers
    let fade = p.rows("content_fade");
    let page_a = if fade.len() >= 2 {
        let k: Vec<(f32, f32)> = fade.iter().map(|r| (r[0], r[1])).collect();
        keys(e, &k, smooth)
    } else {
        keys(e, &[(0.0, 0.25), (0.16, 0.55), (0.32, 1.0)], smooth)
    };
    let page = img(ctx, p.s("content", ""), vx, site_y, vw, g.page_h);
    let mut extra = vec![];
    for l in p.list("content_layers") {
        let at = l.f("at", 0.0);
        let a = smooth(seg(e, at, at + l.f("fade", 0.2)));
        let im = img(ctx, l.s("image", ""), vx, site_y, vw, g.page_h);
        extra.push(fframes::svgr!(<g opacity={a}>{im}</g>));
    }
    let bgc = p.s("content_bg", "#ffffff").to_string();
    let spr_t = format!("translate({vx} {site_y})");
    let spr = sprite(p, e, ctx);
    let clip_id = format!("scrvp{tag}");
    let clip_url = format!("url(#scrvp{tag})");
    let content = fframes::svgr!(
        <g>
            <defs><clipPath id={clip_id}><rect x={vx} y={vy} width={vw} height={vh} /></clipPath></defs>
            <g clip-path={clip_url}>
                <rect x={vx} y={vy} width={vw} height={vh} fill={bgc} />
                <g opacity={page_a}>{page}</g>
                {extra}
                <g transform={spr_t}>{spr}</g>
            </g>
        </g>
    );
    // chrome + layers over it
    let chrome = img(ctx, p.s("chrome", ""), 0.0, 0.0, g.w, g.h);
    let mut layers = vec![];
    for (i, l) in p.list("layers").iter().enumerate() {
        let body = img(ctx, l.s("image", ""), 0.0, 0.0, g.w, g.h);
        let rows = l.rows("stream");
        if !rows.is_empty() {
            layers.push(stream(&format!("scs{tag}{i}"), &rows, e, g, body));
        } else {
            let at = l.f("at", 0.0);
            let a = smooth(seg(e, at, at + l.f("fade", 0.12)));
            layers.push(fframes::svgr!(<g opacity={a}>{body}</g>));
        }
    }
    let (w, h) = (g.w, g.h);
    let frost = kit::pal().frost;
    fframes::svgr!(
        <g>
            <defs>
                <filter id="scr_halo" x="-10%" y="-10%" width="120%" height="120%">
                    <feGaussianBlur stdDeviation="9" />
                </filter>
            </defs>
            <rect x="-12" y="-12" width={w + 24.0} height={h + 24.0} rx="18" fill={frost} fill-opacity="0.45" filter="url(#scr_halo)" />
            <rect x="-7" y="-7" width={w + 14.0} height={h + 14.0} rx="15" fill={frost} fill-opacity="0.42" />
            <rect x="-6.3" y="-6.3" width={w + 12.6} height={h + 12.6} rx="14.4" fill="none" stroke="#ffffff" stroke-opacity="0.5" stroke-width="1.4" />
            {chrome}
            {layers}
            {content}
        </g>
    )
}

/// Camera: a Persp (swing in) whose scale follows the measured push and pull.
fn camera(p: P, tm: &T, g: &Geo) -> Persp {
    let (e, x) = (tm.e(), tm.x());
    let base = WIN_W / g.w * p.f("zoom", 1.0);
    let push = keys(
        e,
        &[(0.32, 0.725), (0.48, 0.725), (0.6, 0.734), (0.68, 0.75), (0.76, 0.782), (0.84, 0.832), (0.92, 0.871), (1.04, 0.903), (1.16, 0.922), (1.28, 0.934), (1.4, 0.945), (1.52, 0.957), (1.64, 0.977), (1.76, 0.993), (1.88, 1.001), (2.0, 1.007), (2.12, 1.011), (2.24, 1.013)],
        |t| t,
    );
    let pull = keys(-x, &[(-0.76, 1.013), (-0.64, 1.011), (-0.52, 1.005), (-0.4, 0.994), (-0.28, 0.976), (-0.16, 0.939), (-0.04, 0.888), (0.0, 0.87)], |t| t);
    let s = if x < 0.76 { pull.min(push) } else { push };
    // the swing in: yawed, pitched and rolled, settling flat by 0.32 s
    let ry = keys(e, &[(0.0, 26.0), (0.04, 12.0), (0.08, 7.0), (0.12, 4.5), (0.16, 3.0), (0.24, 1.0), (0.32, 0.0)], |t| t);
    let rx = keys(e, &[(0.0, -10.0), (0.04, -3.0), (0.12, -1.0), (0.32, 0.0)], |t| t);
    let rz = keys(e, &[(0.0, -3.0), (0.04, -0.8), (0.16, 0.0)], |t| t);
    let s_in = keys(e, &[(0.0, 0.95), (0.04, 0.87), (0.08, 0.83), (0.12, 0.80), (0.16, 0.78), (0.24, 0.755), (0.32, 0.725)], |t| t);
    let s = if e < 0.32 { s_in } else { s };
    let mut c = Persp::flat();
    c.px = g.w / 2.0;
    c.py = g.h / 2.0;
    c.dx = 639.5 - g.w / 2.0;
    c.dy = 360.0 - g.h / 2.0;
    c.s = s * base;
    c.ry = ry.to_radians();
    c.rx = rx.to_radians();
    c.rz = rz.to_radians();
    c
}

pub fn render<'a>(p: P<'a>, tm: &T, frame: &mut Frame, ctx: &FFramesContext<'a, '_>) -> Svgr<'a> {
    let bg = kit::bg(frame, &kit::backdrop(p, tm, "prompt2"));
    let g = geo(p, ctx);
    let cam = camera(p, tm, &g);
    let flat = cam.ry.abs() < 1e-4 && cam.rx.abs() < 1e-4 && cam.rz.abs() < 1e-4;
    let layer = if flat {
        let m = cam.m(0.0, 0.0, g.w, g.h);
        let win = window(p, tm, &g, ctx, "");
        fframes::svgr!(<g transform={m}>{win}</g>)
    } else {
        // perspective: vertical strips, each drawn with the affine that matches the camera
        let n = 10;
        let mut strips = vec![];
        for i in 0..n {
            let x0 = -12.0 + (g.w + 24.0) * i as f32 / n as f32;
            let x1 = -12.0 + (g.w + 24.0) * (i + 1) as f32 / n as f32;
            let m = cam.m(x0, -12.0, x1 - x0, g.h + 24.0);
            let id = format!("scrst{i}");
            let url = format!("url(#scrst{i})");
            let (cx, cw) = (x0 - 0.6, x1 - x0 + 1.2);
            let hh = g.h + 24.0;
            let win = window(p, tm, &g, ctx, &i.to_string());
            strips.push(fframes::svgr!(
                <g transform={m}>
                    <defs><clipPath id={id}><rect x={cx} y="-12" width={cw} height={hh} /></clipPath></defs>
                    <g clip-path={url}>{win}</g>
                </g>
            ));
        }
        fframes::svgr!(<g>{strips}</g>)
    };
    let blur = keys(tm.e(), &[(0.0, 14.0), (0.04, 9.0), (0.08, 6.0), (0.12, 3.5), (0.16, 1.8), (0.2, 0.6), (0.24, 0.0)], |t| t)
        + keys(-tm.x(), &[(-0.08, 0.0), (-0.04, 7.0), (0.0, 10.0)], |t| t);
    let layer = kit::blurred("scrblur", blur, layer);
    fframes::svgr!(<g>{bg}{layer}</g>)
}

/// Drawn above the letterbox.
#[allow(dead_code)]
pub fn overlay(_p: P, _t: f32, _len: f32) -> Svgr<'static> {
    Svgr::empty()
}
