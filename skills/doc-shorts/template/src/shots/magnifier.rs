//! magnifier: a magnifying glass slides across a flat card; a word exists only inside the lens
//! and scrolls left through it, so the glass reads it a few letters at a time
//! ("Fin" → "nding" → "ling" on the reference). Lens path and scroll are measured per tick; the
//! scroll is re-based on the word's width so any word ends with its last letters in the lens.
//! Params: references/shots.md#magnifier.
use crate::kit::{self, T};
use crate::spec::P;
use fframes::{FFramesContext, Frame, Svgr};

/// Lens centre x per tick (ring measured on the reference; y stays at 616).
const LENS_X: [f32; 5] = [231.0, 272.0, 380.0, 424.0, 414.0];
/// How far the word has scrolled per tick (0 = hidden right of the lens, 1 = its end in view).
const SCROLL: [f32; 5] = [0.0, 50.0 / 299.0, 142.0 / 299.0, 228.5 / 299.0, 1.0];
/// The reference word and its left edge at the first and last tick.
const REF_WORD: &str = "Finding";
const X_START: f32 = 470.0;
const X_END: f32 = 171.0;

pub fn look(_p: P) -> (f32, f32) {
    (0.2, 0.0)
}

pub fn render<'a>(p: P<'a>, tm: &T, frame: &mut Frame, ctx: &FFramesContext<'a, '_>) -> Svgr<'a> {
    let i = tm.tick.max(0) as usize;
    let lens_x = p.fs("lens_x");
    let lens_x: &[f32] = if lens_x.is_empty() { &LENS_X } else { &lens_x };
    let lx = lens_x[i.min(lens_x.len() - 1)];
    let ly = p.f("lens_y", 616.0);
    let word = p.s("word", REF_WORD);
    let size = p.f("size", 115.0);
    let color = p.s("color", "#c8141e");
    // keep the word's END where the reference's ended, so the last letters finish in the lens
    let w_ref = kit::text_w(frame, ctx, kit::SERIF, 400, 115, REF_WORD) * size / 115.0;
    let w = kit::text_w(frame, ctx, kit::SERIF, 400, size as usize, word);
    let end = X_END + (w_ref - w) * p.f("end_align", 1.0);
    let k = SCROLL[i.min(SCROLL.len() - 1)];
    let tx = kit::lerp(X_START, end, k);
    let base = ly + 53.0 * size / 115.0;
    let lens = format!("translate({lx:.1} {ly:.1})");
    let stretch = format!("translate(0 {base:.1}) scale(1 1.08) translate(0 {:.1})", -base);
    fframes::svgr!(<g>
        {kit::fill(p.s("bg", "#d6d6d6"))}
        <defs>
            <clipPath id="magnifier_lens">
                <circle cx={lx} cy={ly} r="94" />
            </clipPath>
        </defs>
        // the word lives only inside the glass
        <g clip-path="url(#magnifier_lens)">
            // the reference glyphs stand ~8% taller than Instrument Serif at the same advance
            <g transform={stretch}>
            <text x={tx} y={base} font-family={kit::SERIF} font-size={size} fill={color} stroke={color}
                stroke-width={2.4 * size / 115.0} stroke-linejoin="round" filter="url(#ink)">{word.to_string()}</text>
            </g>
        </g>
        <g transform={lens} filter="url(#b1)">
            // handle along +x, rotated to point down-right
            <g transform="rotate(45)">
                <rect x="100" y="-5" width="18" height="10" fill="#b4b4b4" />
                <rect x="103" y="-3.4" width="13" height="2.6" fill="#f2f2f2" />
                <rect x="115" y="-12" width="10" height="24" rx="3" fill="#1d1d1d" />
                <rect x="121" y="-15.5" width="235" height="31" rx="15" fill="#141414" />
                <rect x="128" y="-10" width="218" height="5" rx="2.5" fill="#444444" opacity="0.8" />
                <rect x="130" y="1" width="214" height="2.5" rx="1.2" fill="#2e2e2e" />
            </g>
            <circle cx="0" cy="0" r="100.5" fill="none" stroke="#131313" stroke-width="6.5" />
            // inner rim seen in depth: offset up-right, so a pale crescent shows lower-left
            <circle cx="2.5" cy="-2.5" r="94.2" fill="none" stroke="#f3f3f3" stroke-width="2.4" opacity="0.9" />
            <circle cx="3" cy="-3" r="92.2" fill="none" stroke="#2c2c2c" stroke-width="1.6" />
            // a soft glint on the rim
            <path d="M -70 -70 A 99 99 0 0 1 -20 -97" fill="none" stroke="#6a6a6a" stroke-width="1.6" opacity="0.8" />
        </g>
    </g>)
}
