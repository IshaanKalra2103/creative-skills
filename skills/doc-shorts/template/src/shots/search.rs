//! search: a search pill (logo, query, caret, mic) slides in from the right and keeps travelling
//! left while the query types into it; the typed text stays centred 198 px right of the logo.
//! Pill path and typing are measured per tick on the reference. Params: references/shots.md#search.
use crate::kit::{self, T};
use crate::spec::P;
use fframes::{FFramesContext, Frame, Svgr};

/// Left edge of the logo per tick (measured; the last is solved from the centred text and the
/// pill's right end at x 682).
const G_X: [f32; 7] = [566.0, 290.0, 220.0, 182.0, 154.0, 108.0, -31.0];
const SIZE: f32 = 39.0;
const TOP: f32 = 596.0;
const HEIGHT: f32 = 82.0;

pub fn look(_p: P) -> (f32, f32) {
    (0.2, 0.0)
}

/// Characters of `query` typed at tick `i`: `reveal` (per tick) or `rate` per tick from tick 1.
fn typed_count(p: P, i: usize, n: usize) -> usize {
    let r = p.fs("reveal");
    let c = if !r.is_empty() {
        r[i.min(r.len() - 1)]
    } else {
        let k = i as f32 - p.f("delay", 1.0);
        if k < 0.0 { 0.0 } else { 2.0 + p.f("rate", 2.0) * k }
    };
    (c.max(0.0) as usize).min(n)
}

/// The four-colour G mark, 48 units square.
fn g_logo<'a>(t: String) -> Svgr<'a> {
    fframes::svgr!(<g transform={t}>
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.570-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.650z" />
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.930-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </g>)
}

pub fn render<'a>(p: P<'a>, tm: &T, frame: &mut Frame, ctx: &FFramesContext<'a, '_>) -> Svgr<'a> {
    let i = tm.tick.max(0) as usize;
    let gx = p.fs("logo_x");
    let gx: &[f32] = if gx.is_empty() { &G_X } else { &gx };
    let g = gx[i.min(gx.len() - 1)];
    let query = p.s("query", "");
    let n = query.chars().count();
    let typed = kit::prefix(query, typed_count(p, i, n));
    let size = p.f("size", SIZE);
    let pill_w = p.f("width", 735.0);
    let left = g - 22.0;
    let adv = kit::text_w(frame, ctx, kit::SANS, 400, size as usize, &typed);
    // centred 198 px right of the logo, but kept on screen and inside the pill for long queries
    let text_x = (g + 198.0 - adv / 2.0).max(left + 60.0).max(24.0).min(700.0 - adv).max(24.0);
    let caret_x = text_x + adv + 3.0;
    let mic = format!("translate({:.1} 619)", left + pill_w - 53.0);
    let caret = if typed.is_empty() && i == 0 {
        Svgr::empty()
    } else {
        fframes::svgr!(<rect x={caret_x} y="617" width="1.8" height="37" fill="#3a3a3a" />)
    };
    let logo = match p.s("logo", "google") {
        "google" => g_logo(format!("translate({g:.1} 618) scale(0.79)")),
        "none" => Svgr::empty(),
        // any other value: a magnifier glyph in the logo slot
        _ => {
            let t = format!("translate({:.1} 637)", g + 18.0);
            fframes::svgr!(<g transform={t}>
                <circle cx="-3" cy="-3" r="11" fill="none" stroke="#6a6a6a" stroke-width="3" />
                <line x1="5" y1="5" x2="13" y2="13" stroke="#6a6a6a" stroke-width="3.4" stroke-linecap="round" />
            </g>)
        }
    };
    let mic_svg = if p.b("mic", true) {
        fframes::svgr!(<g transform={mic}>
            // capsule, two-colour cradle, stem
            <rect x="-6" y="-2" width="12" height="25" rx="6" fill="#4285F4" />
            <path d="M -11 14 A 11 11 0 0 0 0 25" fill="none" stroke="#FBBC05" stroke-width="3.2" />
            <path d="M 11 14 A 11 11 0 0 1 0 25" fill="none" stroke="#EA4335" stroke-width="3.2" />
            <rect x="-1.6" y="25" width="3.2" height="9" fill="#34A853" />
        </g>)
    } else {
        Svgr::empty()
    };
    let bg = p.s("bg", "#d6d6d6");
    fframes::svgr!(<g>
        {kit::fill(bg)}
        <defs>
            <filter id="search_shadow" x="-5%" y="-30%" width="110%" height="160%">
                <feGaussianBlur stdDeviation="1.6" />
            </filter>
        </defs>
        <rect x={left + 3.0} y={TOP + 6.0} width={pill_w - 3.0} height={HEIGHT} rx={HEIGHT / 2.0} fill="#6e6e6e" filter="url(#search_shadow)" />
        <rect x={left} y={TOP} width={pill_w} height={HEIGHT} rx={HEIGHT / 2.0} fill={p.s("pill", bg)} stroke="#9c9c9c" stroke-width="1.2" />
        {logo}
        <text x={text_x} y="653" font-family={kit::SANS} font-size={size} fill={p.s("color", "#5c5c5c")}>{typed}</text>
        {caret}
        {mic_svg}
    </g>)
}
