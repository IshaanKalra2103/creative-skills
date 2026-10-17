//! `end`: the end card. The logo writes on letter by letter out of a blur (each `<path>` of
//! your SVG is a letter, left to right) and rises; a glass tagline arrives word by word under
//! it and a frosted pill (the call to action) pops in. The group sinks, the tagline and pill
//! blur away, the logo drops to the centre and grows.
//!
//! Motion is the reference end card's measured tracks (frames 562-692 at 25 fps), replayed
//! through `title::vframe` (entrance at speed, the hold stretches, the exit at speed).
//! Params: references/kinds/end.md.
use super::title::{REF_FPS, vframe};
use crate::kit::{self, Look, Persp, T, keys, lerp, seg, smooth};
use crate::spec::P;
use fframes::{FFramesContext, Frame, Svgr};
use std::collections::HashMap;
use std::sync::{LazyLock, Mutex};

// ── the logo SVG ─────────────────────────────────────────────────────────────────────────

/// A parsed logo: viewBox and its paths (left to right).
#[derive(Debug, Clone)]
struct Logo {
    vb: [f32; 4],
    paths: Vec<&'static str>,
}

/// Numbers in a path string (for the leftmost-point sort).
fn nums(d: &str) -> Vec<f32> {
    let mut out = vec![];
    let mut cur = String::new();
    for c in d.chars() {
        if c.is_ascii_digit() || c == '.' || (c == '-' && cur.is_empty()) || (c == 'e' && !cur.is_empty()) {
            if c == '.' && cur.contains('.') {
                if let Ok(v) = cur.parse() {
                    out.push(v);
                }
                cur.clear();
            }
            if c == '-' && !cur.is_empty() {
                if let Ok(v) = cur.parse() {
                    out.push(v);
                }
                cur.clear();
            }
            cur.push(c);
        } else {
            if let Ok(v) = cur.parse() {
                out.push(v);
            }
            cur.clear();
            if c == '-' {
                cur.push(c);
            }
        }
    }
    if let Ok(v) = cur.parse() {
        out.push(v);
    }
    out
}

/// The value of attribute `name` in a tag's text.
fn attr<'s>(tag: &'s str, name: &str) -> Option<&'s str> {
    let key = format!(" {name}=\"");
    let i = tag.find(&key)? + key.len();
    let j = tag[i..].find('"')? + i;
    Some(&tag[i..j])
}

/// Parse `assets/<file>` next to the spec: the viewBox and every `<path d>`; paths are sorted
/// by their first point's x so they write on left to right. Cached per file.
fn logo(file: &str) -> Option<Logo> {
    static CACHE: LazyLock<Mutex<HashMap<String, Option<Logo>>>> = LazyLock::new(Default::default);
    let mut c = CACHE.lock().unwrap();
    if let Some(l) = c.get(file) {
        return l.clone();
    }
    let dir = kit::spec_dir();
    let parsed = std::fs::read_to_string(dir.join("assets").join(file)).ok().map(|text| {
        let vb = text
            .find("<svg")
            .and_then(|i| attr(&text[i..text[i..].find('>').map(|j| i + j).unwrap_or(text.len())], "viewBox"))
            .map(nums)
            .filter(|v| v.len() == 4)
            .map(|v| [v[0], v[1], v[2], v[3]])
            .unwrap_or([0.0, 0.0, 100.0, 30.0]);
        let mut paths: Vec<(f32, &'static str)> = vec![];
        let mut rest = text.as_str();
        while let Some(i) = rest.find("<path") {
            let end = rest[i..].find('>').map(|j| i + j).unwrap_or(rest.len());
            let tag = &rest[i..end];
            if let Some(d) = attr(tag, "d") {
                // sort key: the x of the path's first point (its `M`)
                let x = nums(d).first().copied().unwrap_or(0.0);
                paths.push((x, kit::intern(d)));
            }
            rest = &rest[end.min(rest.len())..];
            if end >= rest.len() && rest.is_empty() {
                break;
            }
        }
        paths.sort_by(|a, b| a.0.total_cmp(&b.0));
        Logo { vb, paths: paths.into_iter().map(|p| p.1).collect() }
    });
    c.insert(file.to_string(), parsed.clone());
    parsed
}

// ── measured tracks (reference frames) ───────────────────────────────────────────────────

/// Top of the logo (screen y) when a tagline/pill stack sits under it.
fn logo_top(f: f32) -> f32 {
    keys(
        f,
        &[
            (561.0, 352.0),
            (562.0, 345.0),
            (564.0, 335.0),
            (566.0, 326.0),
            (568.0, 321.0),
            (570.0, 317.0),
            (572.0, 311.0),
            (574.0, 302.0),
            (576.0, 282.0),
            (578.0, 234.0),
            (580.0, 213.0),
            (582.0, 204.0),
            (584.0, 198.0),
            (586.0, 195.0),
            (588.0, 193.5),
            (590.0, 193.0),
            (620.0, 193.0),
            (622.0, 194.0),
            (624.0, 195.0),
            (626.0, 196.0),
            (628.0, 197.0),
            (630.0, 199.0),
            (632.0, 201.0),
            (634.0, 205.0),
            (636.0, 209.0),
            (638.0, 216.0),
            (640.0, 230.0),
            (641.0, 247.0),
            (642.0, 267.0),
            (643.0, 283.0),
            (644.0, 295.0),
            (646.0, 305.0),
            (648.0, 311.0),
            (650.0, 315.0),
            (652.0, 318.0),
            (654.0, 320.0),
            (656.0, 322.0),
            (658.0, 323.0),
            (660.0, 324.0),
            (692.0, 324.0),
        ],
        |t| t,
    )
}

/// The final grow about the logo's centre.
fn logo_scale(f: f32) -> f32 {
    keys(
        f,
        &[
            (662.0, 1.0),
            (663.0, 1.03),
            (664.0, 1.085),
            (666.0, 1.144),
            (667.0, 1.23),
            (668.0, 1.318),
            (670.0, 1.411),
            (672.0, 1.462),
            (674.0, 1.496),
            (676.0, 1.521),
            (678.0, 1.538),
            (680.0, 1.551),
            (682.0, 1.564),
            (684.0, 1.568),
            (686.0, 1.576),
            (688.0, 1.58),
        ],
        |t| t,
    )
}

/// Motion blur of the drop and the grow.
fn logo_blur(f: f32) -> f32 {
    keys(f, &[(638.0, 0.0), (640.0, 1.5), (641.0, 4.5), (642.0, 8.0), (643.0, 6.5), (644.0, 3.0), (645.0, 1.2), (646.5, 0.0), (665.0, 0.0), (667.0, 1.5), (669.0, 0.0)], |t| t)
}

/// Extra drop of the tagline / pill as the group sinks (beyond the logo's).
fn text_extra(f: f32) -> f32 {
    keys(f, &[(628.0, 0.0), (630.0, 1.0), (632.0, 2.0), (634.0, 3.5), (636.0, 7.0), (638.0, 11.0), (640.0, 24.0), (642.0, 50.0)], |t| t)
}
fn pill_extra(f: f32) -> f32 {
    keys(f, &[(628.0, 0.0), (630.0, 2.0), (632.0, 4.0), (634.0, 6.0), (636.0, 12.0), (638.0, 23.0), (640.0, 40.0)], |t| t)
}

/// Halo around the logo, in the palette's text colour.
fn halo<'a>(id: &str, r: f32, body: Svgr<'a>) -> Svgr<'a> {
    let [tr, tg, tb] = kit::hex3(kit::pal().text);
    let [gr, gg, gb] = kit::pal().bg[5];
    let m = format!("0 0 0 0 {:.3}  0 0 0 0 {:.3}  0 0 0 0 {:.3}  0 0 0 0.4 0", lerp(gr, tr, 0.6), lerp(gg, tg, 0.6), lerp(gb, tb, 0.6));
    let fid = format!("url(#{id})");
    let id = id.to_string();
    fframes::svgr!(
        <g>
            <defs>
                <filter id={id} x="-30%" y="-80%" width="160%" height="260%" color-interpolation-filters="sRGB">
                    <feGaussianBlur in="SourceAlpha" stdDeviation={r} result="halosrc" />
                    <feColorMatrix in="halosrc" type="matrix" values={m} result="halo" />
                    <feMerge>
                        <feMergeNode in="halo" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>
            <g filter={fid}>{body}</g>
        </g>
    )
}

pub fn render<'a>(p: P<'a>, tm: &T, frame: &mut Frame, ctx: &FFramesContext<'a, '_>) -> Svgr<'a> {
    let bg = kit::bg(frame, &kit::backdrop(p, tm, "end"));
    // reference shot: entrance 562-590, hold 590-620, exit 620-692
    let f = vframe(tm, 562.0, 590.0, 620.0, 692.0);
    let pal = kit::pal();
    let text_c = pal.text.to_string();
    let tagline = p.s("tagline", "");
    let pill_text = p.s("pill", "");
    let stack = !tagline.is_empty() || !pill_text.is_empty();
    let logo_h = p.f("logo_h", 66.5);
    let cx = p.f("x", 640.0);
    // without a stack the logo writes on where it ends: the centre
    // without a tagline or pill the logo writes on where it ends: the centre
    let top_of = |f: f32| if stack { logo_top(f) } else { 324.0 };
    let gap_t = p.f("tagline_dy", 105.5);
    let gap_p = p.f("pill_dy", 152.0);

    // ── logo ──
    // the final grow, scaled to the spec's `grow` (the reference grows 1.58x)
    let k_grow = 1.0 + (logo_scale(f) - 1.0) * (p.f("grow", 1.58) - 1.0).max(0.0) / 0.58;
    let top0 = top_of(f) - 1.5;
    let cy = top0 + logo_h / 2.0;
    let mut letters = vec![];
    let step = p.f("letter_step", 0.0343) * REF_FPS;
    let logo_body = match p.opt("logo").and_then(logo) {
        Some(lg) => {
            let k = logo_h / lg.vb[3] * k_grow;
            let x0 = cx - lg.vb[2] * k / 2.0 - lg.vb[0] * k;
            let y0 = cy - lg.vb[3] * k / 2.0 - lg.vb[1] * k;
            for (i, d) in lg.paths.iter().enumerate() {
                let age = f - (561.4 + i as f32 * step);
                if age < -0.3 {
                    continue;
                }
                let op = smooth(seg(age, -0.3, 0.9));
                let b = 7.0 * (1.0 - kit::ease_out(seg(age, 0.0, 4.5))) / k;
                let id = format!("elp{i}");
                let fid = format!("url(#{id})");
                let d: &'static str = d;
                let c = text_c.clone();
                letters.push(fframes::svgr!(
                    <g opacity={op}>
                        <defs>
                            <filter id={id} x="-100%" y="-100%" width="300%" height="300%">
                                <feGaussianBlur in="SourceGraphic" stdDeviation={b.max(0.001)} />
                            </filter>
                        </defs>
                        <path d={d} fill={c} filter={fid} />
                    </g>
                ));
            }
            let t = format!("translate({x0:.3} {y0:.3}) scale({k:.5})");
            fframes::svgr!(<g transform={t}>{letters}</g>)
        }
        None => {
            // a word mark set in heavy italic, written on character by character
            let word = p.s("logo_text", "logo");
            let fam = kit::look().display;
            let size = logo_h * 1.25 * k_grow;
            let wt = p.i("logo_weight", 800) as u16;
            let total = kit::text_w(frame, ctx, fam, size, wt, word);
            let x0 = cx - total / 2.0;
            let base = cy + size * 0.36;
            let mut prefix = String::new();
            for (i, ch) in word.chars().enumerate() {
                let x = x0 + kit::text_w(frame, ctx, fam, size, wt, &prefix);
                prefix.push(ch);
                let age = f - (561.4 + i as f32 * step);
                if age < -0.3 {
                    continue;
                }
                let op = smooth(seg(age, -0.3, 0.9));
                let b = 7.0 * (1.0 - kit::ease_out(seg(age, 0.0, 4.5)));
                let id = format!("elc{i}");
                let fid = format!("url(#{id})");
                let skew = format!("translate({x:.2} {base:.2}) skewX(-11)");
                let s = ch.to_string();
                let (c, fam, wts) = (text_c.clone(), fam.to_string(), wt.to_string());
                letters.push(fframes::svgr!(
                    <g opacity={op}>
                        <defs>
                            <filter id={id} x="-100%" y="-100%" width="300%" height="300%">
                                <feGaussianBlur in="SourceGraphic" stdDeviation={b.max(0.001)} />
                            </filter>
                        </defs>
                        <g transform={skew} filter={fid}>
                            <text x="0" y="0" font-family={fam} font-size={size} font-weight={wts} fill={c}>{s}</text>
                        </g>
                    </g>
                ));
            }
            fframes::svgr!(<g>{letters}</g>)
        }
    };
    let mb = logo_blur(f);
    let logo = kit::blurred("elmb", mb, halo("elglow", 5.0 + mb, logo_body));

    // ── tagline (persistent glass) ──
    let mut line = vec![];
    if !tagline.is_empty() {
        let words: Vec<&str> = tagline.split_whitespace().collect();
        let size = p.f("tagline_size", 82.5);
        let wt = p.i("tagline_weight", 500) as u16;
        let gap = p.f("tagline_gap", 16.0);
        let fam = kit::look().display;
        let ws: Vec<f32> = words.iter().map(|w| kit::text_w(frame, ctx, fam, size, wt, w)).collect();
        let total: f32 = ws.iter().sum::<f32>() + gap * (ws.len() as f32 - 1.0);
        let mut x = cx - total / 2.0;
        let base = top_of(f) + logo_h + gap_t + text_extra(f);
        // vanish: blur up and fade as it sinks away
        let vb = keys(f, &[(638.5, 0.0), (640.0, 2.0), (641.0, 4.0), (642.0, 9.0)], |t| t);
        let vop = 1.0 - smooth(seg(f, 641.0, 642.0));
        let cam = Persp::flat();
        let wstep = p.f("tagline_stagger", 0.078) * REF_FPS;
        let wat = 562.0 + p.f("tagline_at", 0.616) * REF_FPS;
        for (i, w) in words.iter().enumerate() {
            let age = f - (wat + i as f32 * wstep);
            let rise = if age < 0.0 { 14.0 } else { 14.0 * (-0.33 * age).exp() };
            let look = Look {
                blur: 2.5 * (1.0 - kit::ease_out(seg(age, 0.0, 3.0))) + vb,
                glass: p.f("tagline_glass", 1.0),
                opacity: smooth(seg(age, -0.5, 0.8)) * vop,
                glow: 0.4,
            };
            if age >= -0.5 {
                line.push(kit::glass_word(&format!("elw{i}"), w, fam, x, base + rise, size, wt, 0.0, ws[i], &look, &cam));
            }
            x += ws[i] + gap;
        }
    }

    // ── the pill ──
    let pill = if pill_text.is_empty() {
        Svgr::empty()
    } else {
        let age = f - (562.0 + p.f("pill_at", 0.848) * REF_FPS);
        let size = p.f("pill_size", 29.0);
        let ui = kit::look().ui;
        let tw = kit::text_w(frame, ctx, ui, size, 500, pill_text);
        let w = tw + 2.0 * p.f("pill_pad", 37.0);
        let h = size * 2.14;
        let rise = if age < 0.0 { 10.0 } else { 10.0 * (-0.45 * age).exp() };
        let top = top_of(f) + logo_h + gap_t + gap_p + rise + pill_extra(f);
        let op = smooth(seg(age, -0.5, 0.6)) * (1.0 - smooth(seg(f, 638.4, 639.4)));
        if age < -0.5 || op <= 0.0 {
            Svgr::empty()
        } else {
            let blur = 1.5 * (1.0 - kit::ease_out(seg(age, 0.0, 1.5))) + keys(f, &[(638.0, 0.0), (639.5, 5.0)], |t| t);
            let tb = top + h * 0.61;
            // pops in with the flash colour, settles into frost
            let flash = 1.0 - smooth(seg(age, 0.8, 4.0));
            let [fr, fg, fb] = kit::hex3(pal.frost);
            let [lr, lg, lb] = kit::hex3(pal.flash);
            let fill = fframes::Color::rgb((lerp(fr, lr * 0.55, flash) * 255.0) as u8, (lerp(fg, lg * 0.9, flash) * 255.0) as u8, (lerp(fb, lb, flash) * 255.0) as u8);
            let fa = lerp(p.f("pill_alpha", 0.30), 0.85, flash);
            let x = cx - w / 2.0;
            let label = pill_text.to_string();
            let (ui, c) = (ui.to_string(), text_c.clone());
            let content = fframes::svgr!(
                <g opacity={op}>
                    <rect x={x} y={top} width={w} height={h} rx="12" fill={fill} fill-opacity={fa} />
                    <text x={cx + 0.5} y={tb} text-anchor="middle" font-family={ui} font-size={size} font-weight="500" letter-spacing="0.3" fill={c}>{label}</text>
                </g>
            );
            kit::blurred("elpill", blur, content)
        }
    };

    fframes::svgr!(
        <g>
            {bg}
            {pill}
            {line}
            {logo}
        </g>
    )
}

/// Drawn above the letterbox.
#[allow(dead_code)]
pub fn overlay(_p: P, _t: f32, _len: f32) -> Svgr<'static> {
    Svgr::empty()
}
