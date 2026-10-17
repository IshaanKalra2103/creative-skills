//! The wall's centre card sequence: built-in animated cards and the colour-band wipe between
//! them. Card-local units: 326 x 184 (the centre card at camera scale 1).
//!
//! Item kinds (spec `center = [...]`):
//! - `{ image = "x.png" }`: a still card.
//! - `{ word = "OFFGRID", bg = "#ebe6d9", ink = "#1c1c1c", font = "Anton" }`: letters spring up
//!   one by one with a light halo; the word slides out before the next card.
//! - `{ poster = true, lines = ["MAKE", "SOME", "NOISE"], nav = "OFFGRID", dates = [...],
//!   color = "#e2232b" }`: a festival page that builds up piece by piece (type, an original
//!   paper-cutout collage, nav, a dates strip).
//!
//! Times are seconds from the item's reveal (when its band starts to wipe in).
use crate::kit::{self, clamp01, ease_out, keys, lerp, seg, smooth};
use crate::spec::P;
use fframes::{FFramesContext, Frame, Svgr};

pub const CW: f32 = 326.0;
pub const CH: f32 = 184.0;

const BLUE: &str = "#1b33c9";
const YELLOW: &str = "#ecd52c";
const INK: &str = "#161616";
const CREAM: &str = "#efe9dc";

/// Seconds per reference frame (the poster was measured at 25 fps).
const F: f32 = 1.0 / 25.0;

/// Damped spring 0 -> 1 with a little overshoot, `t` in seconds since start.
fn spring(t: f32, period: f32) -> f32 {
    if t <= 0.0 {
        return 0.0;
    }
    let tf = t / F;
    let w = std::f32::consts::TAU / (period / F);
    1.0 - (-tf * 0.42).exp() * (w * tf).cos()
}

/// Leading edge (fraction of the card) of a band that enters at `t0`: measured, the edge
/// crosses about 40 % of the card per reference frame and eases into the far side.
pub fn band_edge(t: f32, t0: f32) -> f32 {
    keys(t, &[(t0 - 0.3 * F, -0.12), (t0, 0.05), (t0 + F, 0.47), (t0 + 2.0 * F, 0.86), (t0 + 2.7 * F, 1.16)], |t| t)
}

/// Band path up to `frac` with a slanted leading edge (the top runs ahead of the bottom).
pub fn band_path(frac: f32) -> String {
    let slant = 22.0;
    let x = frac * CW - slant / 2.0;
    format!("M-10 -10 L{:.2} -10 L{:.2} {:.2} L-10 {:.2} Z", x + slant, x, CH + 10.0, CH + 10.0)
}

pub fn band(color: &str, frac: f32) -> Svgr<'static> {
    if frac <= -0.1 {
        return Svgr::empty();
    }
    let d = band_path(frac);
    let c = color.to_string();
    fframes::svgr!(<path d={d} fill={c} />)
}

/// Pop-in transform for a collage piece appearing at `at` around (cx, cy).
fn pop(t: f32, at: f32, cx: f32, cy: f32) -> Option<(String, f32)> {
    let u = (t - at) / F;
    if u < 0.0 {
        return None;
    }
    let s = lerp(0.55, 1.0, ease_out(seg(u, 0.0, 3.0))) + 0.06 * (1.0 - smooth(seg(u, 3.0, 6.0))) * smooth(seg(u, 1.0, 3.0));
    let o = smooth(seg(u, 0.0, 1.5));
    Some((format!("translate({cx:.2} {cy:.2}) scale({s:.4}) translate({:.2} {:.2})", -cx, -cy), o))
}

/// The word card: `t` seconds since the shot started; `out` = when the next band arrives.
pub fn word<'a>(p: P<'a>, t: f32, out: f32, frame: &mut Frame, ctx: &FFramesContext) -> Svgr<'a> {
    let text = p.s("word", "OFFGRID");
    let font = p.s("font", "Anton").to_string();
    let bg = p.s("bg", "#ebe6d9").to_string();
    let ink = p.s("ink", "#1c1c1c").to_string();
    // size: 49 px for a 7-letter word, smaller to fit 230 px
    let mut size = p.f("size", 49.0);
    let total = kit::text_w(frame, ctx, &font, size, 400, text) + 0.8 * text.chars().count() as f32;
    if total > 230.0 {
        size *= 230.0 / total;
    }
    let total = kit::text_w(frame, ctx, &font, size, 400, text) + 0.8 * text.chars().count() as f32;
    let base = CH / 2.0 + size * 0.43;
    // slides right out of the card while the first band comes in
    let slide = keys(t - out, &[(-0.214, 0.0), (-0.194, 5.0), (-0.154, 48.0), (-0.114, 190.0), (-0.074, 340.0)], |t| t);
    let mut x = (CW - total) / 2.0 + slide;
    let mut out_l = vec![];
    for (i, ch) in text.chars().enumerate() {
        let l = ch.to_string();
        let adv = kit::text_w(frame, ctx, &font, size, 400, &l);
        let at = -0.012 + i as f32 * 0.036;
        let k = spring(t - at, 5.0 * F);
        let dy = lerp(34.0, 0.0, k);
        let rot = lerp(24.0, 0.0, k);
        let o = smooth(seg(t, at - 0.18, at - 0.04));
        let cx = x + adv / 2.0;
        let tr = format!("translate(0 {dy:.2}) rotate({rot:.2} {cx:.2} {:.2})", base - 18.0);
        let (tx, f2, i2) = (x, font.clone(), ink.clone());
        out_l.push(fframes::svgr!(
            <g transform={tr} opacity={o}>
                <text x={tx} y={base} font-family={f2} font-size={size} fill={i2}>{l}</text>
            </g>
        ));
        x += adv + 0.8;
    }
    fframes::svgr!(
        <g>
            <defs>
                <filter id="wwHalo" x="-20%" y="-50%" width="140%" height="200%" color-interpolation-filters="sRGB">
                    <feMorphology in="SourceAlpha" operator="dilate" radius="1.2" result="fat" />
                    <feGaussianBlur in="fat" stdDeviation="3.2" result="soft" />
                    <feFlood flood-color="#ffffff" result="halocol" />
                    <feComposite in="halocol" in2="soft" operator="in" />
                </filter>
            </defs>
            <rect x="0" y="0" width="326" height="184" fill={bg} />
            <g filter="url(#wwHalo)" opacity="0.9">{out_l.clone()}</g>
            <g>{out_l}</g>
        </g>
    )
}

/// The festival poster, `t` seconds since its reveal (the moment its band starts).
pub fn poster<'a>(p: P<'a>, t: f32, ctx: &FFramesContext) -> Svgr<'a> {
    // reference frame offsets from the reveal (frame 511.85)
    let f = |fr: f32| (fr - 511.85) * F;
    let red = p.s("color", "#e2232b").to_string();
    let lines = p.strs("lines");
    let l0 = lines.first().copied().unwrap_or("MAKE").to_string();
    let l1 = lines.get(1).copied().unwrap_or("SOME").to_string();
    let l2 = lines.get(2).copied().unwrap_or("NOISE").to_string();
    let nav = p.s("nav", "OFFGRID").to_string();
    let dates = p.strs("dates");
    let d = |i: usize, dflt: &str| dates.get(i).copied().unwrap_or(dflt).to_string();
    let (da, db, dc) = (d(0, "APR 12"), d(1, "APR 13"), d(2, "APR 14"));
    let sky = ctx.get_image(p.s("sky", "card_sky.jpg"));
    let paper = ctx.get_image(p.s("paper", "card_paper.png"));

    // the type colours flicker for two frames, like the reference
    let (make_c, some_c, noise_c, some_bg) = if (f(520.5)..f(521.5)).contains(&t) {
        (YELLOW.to_string(), BLUE.to_string(), YELLOW.to_string(), "#ffffff".to_string())
    } else if (f(521.5)..f(523.0)).contains(&t) {
        ("#ffffff".to_string(), red.clone(), "#ffffff".to_string(), "#ffffff".to_string())
    } else {
        (BLUE.to_string(), INK.to_string(), BLUE.to_string(), "#ebe6d9".to_string())
    };
    let make_o = smooth(seg(t, f(512.0), f(512.8)));
    let make_x = lerp(-60.0, 10.0, ease_out(seg(t, f(511.9), f(513.3))));
    let strip_p = ease_out(seg(t, f(513.5), f(516.0)));
    let some_o = smooth(seg(t, f(515.8), f(517.2)));
    let some_x = lerp(-30.0, 0.0, ease_out(seg(t, f(515.6), f(517.6))));
    let noise_y = lerp(48.0, 0.0, ease_out(seg(t, f(517.0), f(520.0))));
    let noise_o = smooth(seg(t, f(517.0), f(518.0)));
    let strip_w = lerp(20.0, 100.0, strip_p);
    let strip_h = lerp(26.0, 46.0, strip_p);
    let strip_tr = format!("rotate(-2.2 {:.2} 74)", 12.0 + strip_w / 2.0);

    // the collage: original paper-cutout pieces, each popping in at its own time
    let mut pieces = vec![];
    if let Some((tr, o)) = pop(t, f(520.8), 214.0, 96.0) {
        pieces.push(fframes::svgr!(
            <g transform={tr} opacity={o}>
                <path d="M128 64 L150 58 L176 66 L204 56 L232 64 L246 60 L248 132 L226 138 L198 130 L170 140 L140 132 L126 136 Z" fill="#efe7d6" />
                <path d="M134 74 L240 70 M134 84 L240 82 M134 94 L240 92 M134 104 L240 104 M134 114 L240 116" stroke="#d9cfba" stroke-width="0.8" />
            </g>
        ));
    }
    if let Some((tr, o)) = pop(t, f(519.6), 266.0, 50.0) {
        let mut st = vec![];
        for i in 0..9 {
            let y = 8.0 + i as f32 * 9.0;
            st.push(fframes::svgr!(<rect x="248" y={y} width="38" height="4.5" fill="#111111" />));
        }
        pieces.push(fframes::svgr!(
            <g transform={tr} opacity={o}>
                <g transform="rotate(4 266 50)">
                    <rect x="248" y="6" width="38" height="84" fill="#f4f1ea" />
                    {st}
                </g>
            </g>
        ));
    }
    if let Some((tr, o)) = pop(t, f(521.6), 166.0, 90.0) {
        let sky_img = match sky {
            Some(i) => fframes::svgr!(<image href={i.href()} x="120" y="20" width="110" height="140" preserveAspectRatio="xMidYMid slice" />),
            None => fframes::svgr!(<rect x="120" y="20" width="110" height="140" fill="#7fb6f0" />),
        };
        pieces.push(fframes::svgr!(
            <g transform={tr} opacity={o}>
                <path d="M140 160 L140 52 Q140 22 166 22 Q192 22 192 52 L192 160 Z" fill={CREAM} />
                <clipPath id="wpArch"><path d="M148 156 L148 56 Q148 32 166 32 Q184 32 184 56 L184 156 Z" /></clipPath>
                <g clip-path="url(#wpArch)">{sky_img}</g>
            </g>
        ));
    }
    if let Some((tr, o)) = pop(t, f(522.8), 222.0, 82.0) {
        pieces.push(fframes::svgr!(
            <g transform={tr} opacity={o}>
                <path d="M196 30 L232 14 L262 40 L254 92 L270 138 L224 150 L204 118 L188 74 Z" fill={BLUE} />
                <path d="M206 44 L230 30 L246 52 L222 70 Z" fill="#3552e6" opacity="0.8" />
                <path d="M214 96 L244 104 L238 132 L218 124 Z" fill="#0f229e" />
            </g>
        ));
    }
    if let Some((tr, o)) = pop(t, f(523.6), 200.0, 140.0) {
        pieces.push(fframes::svgr!(
            <g transform={tr} opacity={o}>
                <path d="M150 168 L150 156 L170 156 L170 146 L190 146 L190 136 L210 136 L210 126 L230 126 L230 116 L250 116 L250 168 Z" fill={YELLOW} />
                <path d="M150 168 L250 168 L250 172 L150 172 Z" fill="#c9a915" />
            </g>
        ));
    }
    if let Some((tr, o)) = pop(t, f(523.0), 118.0, 30.0) {
        pieces.push(fframes::svgr!(
            <g transform={tr} opacity={o}>
                <path d="M106 40 Q110 18 114 36 Q118 16 122 34 Q126 14 130 32" fill="none" stroke={BLUE} stroke-width="3.2" stroke-linecap="round" />
            </g>
        ));
    }
    if let Some((tr, o)) = pop(t, f(524.4), 140.0, 120.0) {
        pieces.push(fframes::svgr!(
            <g transform={tr} opacity={o}>
                <path d="M118 150 A24 24 0 0 1 166 150 Z" fill={BLUE} />
                <path d="M120 112 L128 104 L136 112 L144 104 L152 112 L160 104" fill="none" stroke="#111111" stroke-width="2.2" />
            </g>
        ));
    }
    if let Some((tr, o)) = pop(t, f(525.0), 184.0, 138.0) {
        if let Some(i) = paper {
            pieces.push(fframes::svgr!(
                <g transform={tr} opacity={o}>
                    <image href={i.href()} x="158" y="112" width="52" height="52" />
                </g>
            ));
        }
    }
    if let Some((tr, o)) = pop(t, f(526.4), 296.0, 96.0) {
        pieces.push(fframes::svgr!(
            <g transform={tr} opacity={o}>
                <rect x="280" y="40" width="32" height="118" fill="#c8151d" />
                <path d="M286 150 L286 96 Q286 82 296 82 Q306 82 306 96 L306 150 Z" fill={CREAM} />
                <path d="M290 150 L290 100 Q290 90 296 90 Q302 90 302 100 L302 150 Z" fill={BLUE} />
            </g>
        ));
    }
    if let Some((tr, o)) = pop(t, f(527.2), 268.0, 140.0) {
        let mut ck = vec![];
        for i in 0..4 {
            for j in 0..4 {
                if (i + j) % 2 == 0 {
                    let (x, y) = (258.0 + i as f32 * 6.0, 120.0 + j as f32 * 6.0);
                    ck.push(fframes::svgr!(<rect x={x} y={y} width="6" height="6" fill="#ffffff" />));
                }
            }
        }
        pieces.push(fframes::svgr!(
            <g transform={tr} opacity={o}>
                <rect x="258" y="120" width="24" height="24" fill="#c8151d" />
                {ck}
                <path d="M230 52 L250 30 L254 58 Z" fill={YELLOW} />
            </g>
        ));
    }
    if let Some((tr, o)) = pop(t, f(528.0), 252.0, 120.0) {
        pieces.push(fframes::svgr!(
            <g transform={tr} opacity={o}>
                <path d="M238 160 L238 112 Q238 96 252 96 Q266 96 266 112 L266 160 Z" fill="#f2ede2" />
                <path d="M244 160 L244 116 Q244 104 252 104 Q260 104 260 116 L260 160 Z" fill="#111111" />
                <circle cx="132" cy="150" r="2.4" fill="#111111" />
                <circle cx="140" cy="156" r="1.8" fill="#111111" />
            </g>
        ));
    }
    if let Some((tr, o)) = pop(t, f(533.0), 300.0, 30.0) {
        pieces.push(fframes::svgr!(
            <g transform={tr} opacity={o}>
                <circle cx="300" cy="30" r="20" fill={YELLOW} />
            </g>
        ));
    }

    let nav_o = smooth(seg(t, f(536.5), f(538.0)));
    let tag_o = smooth(seg(t, f(541.5), f(543.0)));
    let strip_y = lerp(CH + 2.0, 146.0, ease_out(seg(t, f(544.5), f(549.0))));
    let d1 = smooth(seg(t, f(547.5), f(549.5)));
    let d2 = smooth(seg(t, f(549.0), f(551.0)));
    let d3 = smooth(seg(t, f(550.5), f(552.5)));
    let thumbs = smooth(seg(t, f(551.5), f(555.0)));
    let blurb_o = smooth(seg(t, f(544.0), f(546.0)));
    let txt_y = strip_y + 22.0;
    let thumb_y = strip_y + 8.0;
    let red2 = red.clone();
    fframes::svgr!(
        <g>
            <rect x="0" y="0" width="326" height="184" fill={red} />
            {pieces}
            <g opacity={make_o}>
                <text x={make_x} y="52" font-family="Anton" font-size="44" fill={make_c}>{l0}</text>
            </g>
            <g transform={strip_tr}>
                <rect x="10" y={74.0 - strip_h / 2.0} width={strip_w} height={strip_h} fill={some_bg} opacity={clamp01(strip_p * 3.0)} />
            </g>
            <g opacity={some_o}>
                <text x={18.0 + some_x} y="91" font-family="Anton" font-size="38" fill={some_c}>{l1}</text>
            </g>
            <g opacity={noise_o}>
                <text x="10" y={137.0 + noise_y} font-family="Anton" font-size="44" fill={noise_c}>{l2}</text>
            </g>
            <g opacity={blurb_o}>
                <rect x="104" y="128" width="30" height="2" fill="#f6e9d8" />
                <rect x="104" y="133" width="24" height="2" fill="#f6e9d8" />
                <rect x="104" y="138" width="28" height="2" fill="#f6e9d8" />
            </g>
            <g opacity={nav_o}>
                <text x="8" y="10" font-family="Anton" font-size="7" fill="#f6e9d8">{nav}</text>
                <text x="150" y="9.5" font-family="Inter Text" font-size="4.6" fill="#f6e9d8">"Lineup"</text>
                <text x="178" y="9.5" font-family="Inter Text" font-size="4.6" fill="#f6e9d8">"Tickets"</text>
                <text x="207" y="9.5" font-family="Inter Text" font-size="4.6" fill="#f6e9d8">"Info"</text>
            </g>
            <g opacity={tag_o}>
                <rect x="292" y="4" width="26" height="8" rx="4" fill={YELLOW} />
                <text x="297" y="10" font-family="Inter Text" font-size="4.4" font-weight="600" fill="#161616">"Tickets"</text>
            </g>
            <rect x="0" y={strip_y} width="326" height="40" fill="#f1ebdd" />
            <g opacity={d1}><text x="10" y={txt_y} font-family="Anton" font-size="12" fill="#161616">{da}</text></g>
            <g opacity={d2}><text x="116" y={txt_y} font-family="Anton" font-size="12" fill="#161616">{db}</text></g>
            <g opacity={d3}><text x="222" y={txt_y} font-family="Anton" font-size="12" fill="#161616">{dc}</text></g>
            <g opacity={thumbs}>
                <rect x="60" y={thumb_y} width="20" height="20" fill={BLUE} />
                <rect x="166" y={thumb_y} width="20" height="20" fill={red2} />
                <rect x="272" y={thumb_y} width="20" height="20" fill={YELLOW} />
                <circle cx="70" cy={thumb_y + 10.0} r="5" fill="#f1ebdd" />
            </g>
        </g>
    )
}

/// The background colour an item reveals with (its reveal band's colour).
pub fn item_color<'a>(p: P<'a>) -> &'a str {
    if p.has("poster") {
        p.s("color", "#e2232b")
    } else if p.has("word") {
        p.s("bg", "#ebe6d9")
    } else {
        p.s("color", "#ffffff")
    }
}

/// One item's content, `t` seconds since the shot started, `reveal` its reveal time,
/// `out` the next item's reveal time.
pub fn item<'a>(p: P<'a>, t: f32, reveal: f32, out: f32, frame: &mut Frame, ctx: &FFramesContext) -> Svgr<'a> {
    if p.has("word") {
        word(p, t - reveal, out - reveal, frame, ctx)
    } else if p.has("poster") {
        poster(p, t - reveal, ctx)
    } else {
        match ctx.get_image(p.s("image", "")) {
            Some(i) => fframes::svgr!(<image href={i.href()} x="0" y="0" width="326" height="184" preserveAspectRatio="xMidYMid slice" />),
            None => fframes::svgr!(<rect x="0" y="0" width="326" height="184" fill="#ffffff" />),
        }
    }
}
