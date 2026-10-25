//! photoreal-spot comp: the finish over the plates, driven by spot.json.
//!
//! Frames 0..plates_end come from `<spot>/runtime/plates.mp4` (written by tools/assemble.py
//! from the video plates, the snap cuts and any renders). On top of them: the grade, whips,
//! a lens kick on the main cuts, white flashes and the HUD. Then come the drawn `comp` shots
//! (tagline, end lockup), and over everything grain, vignette and the soundtrack. The layout is
//! authored 1080 px wide and scaled by `U`; every number below was measured or tuned on the
//! worked example (examples/adidas-nba).
#[allow(dead_code)]
mod fx;
pub mod spec;

use fframes::{
    AudioMap, AudioTimestamp, AudioTrack, Color, Duration, FFramesContext, Frame, Scene, Scenes, Svgr,
    FFramesSyncedVideoFrame, SyncVideoFrameInput, Video, include_media_dir,
};
use spec::{Img, Spot};
use std::sync::{LazyLock, OnceLock};

include_media_dir!(pub struct SpotMedia, "media");

/// Output size and rate. fframes needs them as constants: for another format (1080x1920 for
/// 9:16) change them here and in spot.json; main.rs refuses a spot whose size differs.
pub const WIDTH: usize = 1080;
pub const HEIGHT: usize = 1350;
pub const FPS: usize = 30;
const W: f32 = WIDTH as f32;
const H: f32 = HEIGHT as f32;
/// Design px to output px.
const U: f32 = W / 1080.0;

const MONO: &str = "IBM Plex Mono";
const WHITE: &str = "#ffffff";

static SPOT: OnceLock<Spot> = OnceLock::new();

fn spot() -> &'static Spot {
    SPOT.get().expect("spot not loaded")
}

static GRAIN: LazyLock<fx::Fx> =
    LazyLock::new(|| fx::Fx::parse("FilmGrainOverlay.sksl", include_str!("shaders/FilmGrainOverlay.sksl")).unwrap());
static VIGNETTE: LazyLock<fx::Fx> =
    LazyLock::new(|| fx::Fx::parse("VignetteOverlay.sksl", include_str!("shaders/VignetteOverlay.sksl")).unwrap());
static CA: LazyLock<fx::Fx> =
    LazyLock::new(|| fx::Fx::parse("ChromaticAberration.sksl", include_str!("shaders/ChromaticAberration.sksl")).unwrap());

fn clamp01(x: f32) -> f32 {
    x.clamp(0.0, 1.0)
}
fn ease_out(t: f32) -> f32 {
    1.0 - (1.0 - clamp01(t)).powi(3)
}
fn ease_io(t: f32) -> f32 {
    let t = clamp01(t);
    t * t * (3.0 - 2.0 * t)
}
/// Deterministic jitter in -1..1 (SplitMix64).
fn rnd(i: u64, salt: u64) -> f32 {
    let mut z = (salt << 32 | i).wrapping_add(0x9E3779B97F4A7C15);
    z = (z ^ (z >> 30)).wrapping_mul(0xBF58476D1CE4E5B9);
    z = (z ^ (z >> 27)).wrapping_mul(0x94D049BB133111EB);
    z ^= z >> 31;
    (z % 10_000) as f32 / 5_000.0 - 1.0
}
/// Scale about the frame centre.
fn about_centre(s: f32, dy: f32) -> String {
    format!("translate({} {}) scale({s}) translate({} {})", W / 2.0, H / 2.0 + dy, -W / 2.0, -H / 2.0)
}

/// The backdrop gradient (`#bg`), the plate grade and the whip blurs.
fn defs() -> Svgr<'static> {
    let stops: Vec<Svgr> = spot()
        .look
        .gradient
        .iter()
        .map(|(o, c)| fframes::svgr!(<stop offset={*o} stop-color={c.as_str()} />))
        .collect();
    fframes::svgr!(<defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="0">{stops}</linearGradient>
        // shared grade: crush the blacks, keep blue in the shadows
        <filter id="grade" filterUnits="userSpaceOnUse" x="-400" y="-400" width={W + 800.0} height={H + 800.0} color-interpolation-filters="sRGB">
            <feComponentTransfer>
                <feFuncR type="gamma" amplitude="1.05" exponent="1.16" offset="-0.006" />
                <feFuncG type="gamma" amplitude="1.05" exponent="1.13" offset="-0.006" />
                <feFuncB type="gamma" amplitude="1.03" exponent="1.02" offset="0.0" />
            </feComponentTransfer>
        </filter>
        <filter id="whiph" filterUnits="userSpaceOnUse" x="-600" y="-600" width={W + 1320.0} height={H + 1350.0}><feGaussianBlur stdDeviation={format!("{} 0", 70.0 * U)} /></filter>
    </defs>)
}

// ------------------------------------------------------------------ the video
#[derive(Debug, Clone, Copy)]
enum Kind {
    Plates,
    Tagline,
    End,
    /// A `comp` shot with nothing assigned to it: the bare backdrop.
    Backdrop,
}

#[derive(Debug)]
struct Part {
    name: &'static str,
    len: usize,
    kind: Kind,
}

impl Scene for Part {
    fn name(&self) -> &'static str {
        self.name
    }

    fn duration(&self) -> Duration<'_> {
        Duration::Frames(self.len)
    }

    fn render_frame<'a>(&'a self, frame: Frame, ctx: &FFramesContext<'a, '_>) -> Svgr<'a> {
        let c = &spot().comp;
        match self.kind {
            Kind::Plates => plates(frame, ctx),
            Kind::Tagline => tagline(frame, c.tagline.as_ref().unwrap(), self.len),
            Kind::End => end_card(frame, ctx, c.end.as_ref().unwrap(), self.len),
            Kind::Backdrop => fframes::svgr!(<rect width={W} height={H} fill="url(#bg)" />),
        }
    }
}

pub struct SpotVideo {
    parts: Vec<Part>,
}

impl SpotVideo {
    /// Check the spot against the constants and lay out the scenes: the plates, then each
    /// `comp` shot in order.
    pub fn new(spot: Spot) -> Result<Self, String> {
        if (spot.width, spot.height, spot.fps) != (WIDTH, HEIGHT, FPS) {
            return Err(format!(
                "spot.json is {}x{} at {} fps but the comp is built for {WIDTH}x{HEIGHT} at {FPS}; change the constants in comp/src/lib.rs",
                spot.width, spot.height, spot.fps
            ));
        }
        let mut parts = vec![Part { name: "plates", len: spot.plates_end(), kind: Kind::Plates }];
        let mut t = spot.plates_end();
        for s in spot.shots.iter().filter(|s| s.src == "comp") {
            if s.start != t {
                return Err(format!("comp shot `{}` starts at {} but the shot before it ends at {t}", s.id, s.start));
            }
            let kind = if spot.comp.tagline.as_ref().is_some_and(|x| x.shot == s.id) {
                Kind::Tagline
            } else if spot.comp.end.as_ref().is_some_and(|x| x.shot == s.id) {
                Kind::End
            } else {
                Kind::Backdrop
            };
            parts.push(Part { name: Box::leak(s.id.clone().into_boxed_str()), len: s.end - s.start, kind });
            t = s.end;
        }
        SPOT.set(spot).map_err(|_| "spot already loaded".to_string())?;
        Ok(Self { parts })
    }
}

impl std::fmt::Debug for SpotVideo {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("SpotVideo").field("parts", &self.parts).finish()
    }
}

impl Video for SpotVideo {
    const FPS: usize = FPS;
    const WIDTH: usize = WIDTH;
    const HEIGHT: usize = HEIGHT;
    const BACKGROUND_COLOR: Color = Color::BLACK;

    fn duration(&self) -> Duration<'_> {
        Duration::Auto
    }

    fn audio(&self) -> AudioMap<'_> {
        AudioMap::from(
            spot()
                .comp
                .audio
                .iter()
                .map(|a| AudioTrack::new(&a.file, AudioTimestamp::Second(a.at)..AudioTimestamp::Eof).gain_db(a.gain_db))
                .collect::<Vec<_>>(),
        )
    }

    fn define_scenes(&self) -> Scenes<'_> {
        Scenes::from(self.parts.iter().map(|p| p as &dyn Scene).collect::<Vec<_>>())
    }

    fn render_frame<'a>(&'a self, frame: Frame, ctx: &FFramesContext<'a, '_>) -> Svgr<'a> {
        let s = spot();
        let g = frame.global_index;
        let grain = GRAIN.draw(&frame, &[("uStrength", fx::Uniform::Float(s.look.grain)), ("uSize", fx::Uniform::Float(1.5))]);
        let vig = VIGNETTE.draw(
            &frame,
            &[("uRadius", fx::Uniform::Float(0.62)), ("uFalloff", fx::Uniform::Float(0.6)), ("uIntensity", fx::Uniform::Float(s.look.vignette))],
        );
        let flash = s.comp.flashes.iter().filter(|(f, _)| *f == g).map(|(_, o)| *o).fold(0.0_f32, f32::max);
        // the HUD stays two frames into the first comp shot, under its flash
        let hud = match &s.comp.hud {
            Some(h) if g < s.plates_end() + 2 => hud(h, ctx, g),
            _ => Svgr::empty(),
        };
        fframes::svgr!(
            <svg xmlns="http://www.w3.org/2000/svg" width={WIDTH} height={HEIGHT} viewBox={format!("0 0 {WIDTH} {HEIGHT}")}>
                {defs()}
                {ctx.render_scenes(&frame)}
                {hud}
                <g style="mix-blend-mode:normal"><image href={vig.href()} x="0" y="0" width={W} height={H} /></g>
                <g style="mix-blend-mode:overlay"><image href={grain.href()} x="0" y="0" width={W} height={H} /></g>
                <rect width={W} height={H} fill="#ffffff" opacity={flash} />
            </svg>
        )
    }
}

// ------------------------------------------------------------------ HUD
/// Mono type in the corners: mark and title top left, a hairline and footer at the bottom, and
/// a shot counter bottom right that steps on `counter` frames.
fn hud<'a>(h: &'static spec::Hud, ctx: &FFramesContext<'a, '_>, g: usize) -> Svgr<'a> {
    let on = ease_out((g as f32 - h.from as f32) / 8.0);
    if on <= 0.0 {
        return Svgr::empty();
    }
    let m = 56.0 * U;
    let (mark, tx) = match h.mark.as_ref().and_then(|i| ctx.get_image(&i.image).map(|img| (i, img))) {
        Some((i, img)) => (
            fframes::svgr!(<image href={img.href()} x={m} y={m} width={i.w * U} height={i.h * U} />),
            m + (i.w + 16.0) * U,
        ),
        None => (Svgr::empty(), m),
    };
    let base = H - 56.0 * U;
    let counter = if h.counter.is_empty() {
        Svgr::empty()
    } else {
        let n = h.counter.iter().filter(|&&c| c <= g).count() + 1;
        fframes::svgr!(<text x={W - m} y={base} text-anchor="end" font-family={MONO} font-weight="500" font-size={14.0 * U} letter-spacing={2.5 * U} fill={WHITE} opacity="0.75">{format!("{n:02} / {:02}", h.total)}</text>)
    };
    let rule = if h.footer.is_empty() && h.counter.is_empty() {
        Svgr::empty()
    } else {
        fframes::svgr!(<rect x={m} y={H - 88.0 * U} width={W - 2.0 * m} height="1" fill={WHITE} opacity="0.35" />)
    };
    fframes::svgr!(<g opacity={on}>
        {mark}
        <text x={tx} y={80.0 * U} font-family={MONO} font-weight="500" font-size={17.0 * U} letter-spacing={3.0 * U} fill={WHITE} opacity="0.9">{h.title.as_str()}</text>
        <text x={m} y={116.0 * U} font-family={MONO} font-weight="500" font-size={13.0 * U} letter-spacing={2.5 * U} fill={WHITE} opacity="0.55">{h.subtitle.as_str()}</text>
        {rule}
        <text x={m} y={base} font-family={MONO} font-weight="500" font-size={14.0 * U} letter-spacing={2.5 * U} fill={WHITE} opacity="0.75">{h.footer.as_str()}</text>
        {counter}
    </g>)
}

// ------------------------------------------------------------------ plates
fn plates<'a>(frame: Frame, ctx: &FFramesContext<'a, '_>) -> Svgr<'a> {
    let s = spot();
    let g = frame.global_index;
    let input = SyncVideoFrameInput { start_from: 0., looping: false, editor_fallback_image: None };
    let Some(clip) = frame.get_synced_video_frame(ctx, "plates.mp4", &input) else {
        return Svgr::empty();
    };
    let (cw, ch) = (clip.width() as f32, clip.height() as f32);
    let img = clip.into_image();
    // lens kick for 4 frames after each main cut
    let kick = s.comp.kicks.iter().filter(|&&c| g >= c && g < c + 4).map(|&c| 1.0 - (g - c) as f32 / 4.0).fold(0.0_f32, f32::max);
    let base = if kick > 0.0 {
        let ca = CA.filter(&frame, &img, cw, ch, &[("uStrength", fx::Uniform::Float(0.035 * kick)), ("uAngle", fx::Uniform::Float(0.3))]);
        fframes::svgr!(<image href={ca.href()} x="0" y="0" width={W} height={H} />)
    } else {
        fframes::svgr!(<image href={img.href()} x="0" y="0" width={W} height={H} />)
    };
    // whip: the plate slides off over the backdrop under a hard horizontal blur
    let base = match s.comp.whips.iter().find(|w| (w.from..=w.to).contains(&g)) {
        Some(w) => {
            let t = (g - w.from) as f32 / (w.to - w.from + 1) as f32;
            fframes::svgr!(<g>
                <rect x="-200" y="-200" width={W + 400.0} height={H + 400.0} fill="url(#bg)" />
                <g transform={format!("translate({} 0)", w.travel * U * t)} filter="url(#whiph)">{base}</g>
            </g>)
        }
        None => base,
    };
    if s.look.grade { fframes::svgr!(<g filter="url(#grade)">{base}</g>) } else { base }
}

// ------------------------------------------------------------------ tagline
/// Lines slam in on their frames (5 frames from 135% with a shake), the whole block pushes in
/// slowly, and an outline line fills from `outline_until`.
fn tagline(frame: Frame, t: &'static spec::Tagline, len: usize) -> Svgr<'static> {
    let f = frame.index as f32;
    let slam = |start: f32| {
        let k = (f - start) / 5.0;
        if k < 0.0 { (0.0, 1.0) } else { (clamp01(k * 2.5), 1.0 + 0.35 * (1.0 - ease_out(k))) }
    };
    let shake = |start: f32, salt: u64| {
        let k = f - start;
        if (0.0..6.0).contains(&k) { rnd(f as u64, salt) * 9.0 * U * (1.0 - k / 6.0) } else { 0.0 }
    };
    let (mut sx, mut sy) = (0.0, 0.0);
    for (i, l) in t.lines.iter().enumerate() {
        sx += shake(l.at, 2 * i as u64 + 1);
        sy += shake(l.at, 2 * i as u64 + 2);
    }
    let size = t.size * U;
    let gap = size * 220.0 / 212.0;
    let mid = H / 2.0 + 45.0 * U;
    let n = t.lines.len() as f32;
    let lines: Vec<Svgr> = t
        .lines
        .iter()
        .enumerate()
        .map(|(i, l)| {
            let cy = mid + (i as f32 - (n - 1.0) / 2.0) * gap;
            let (o, s) = slam(l.at);
            let tr = format!("translate({} {}) scale({s}) translate({} {})", W / 2.0 + sx, cy + sy, -W / 2.0, -cy);
            let y = cy + size * 70.0 / 212.0;
            match l.outline_until {
                Some(u) => fframes::svgr!(<g transform={tr} opacity={o}>
                    <text x={W / 2.0} y={y} font-size={size} letter-spacing={-2.0 * U} fill={WHITE} fill-opacity={ease_io((f - u) / 10.0)} stroke={WHITE} stroke-width={3.0 * U}>{l.text.as_str()}</text>
                </g>),
                None => fframes::svgr!(<g transform={tr} opacity={o}>
                    <text x={W / 2.0} y={y} font-size={size} letter-spacing={-2.0 * U} fill={WHITE}>{l.text.as_str()}</text>
                </g>),
            }
        })
        .collect();
    let push = 1.0 + 0.035 * ease_io(f / len as f32);
    fframes::svgr!(<g>
        <rect width={W} height={H} fill="url(#bg)" />
        <g transform={about_centre(push, 0.0)} font-family={t.font.as_str()} font-weight={t.weight} font-style={if t.italic { "italic" } else { "normal" }} text-anchor="middle">{lines}</g>
    </g>)
}

// ------------------------------------------------------------------ end lockup
/// Logo flashes, one per hit, then the mark lands with an overshoot and lifts; a row of
/// partner logos, a hairline and the tag follow under it, and the card fades to black.
fn end_card<'a>(frame: Frame, ctx: &FFramesContext<'a, '_>, e: &'static spec::End, len: usize) -> Svgr<'a> {
    let f = frame.index;
    let ff = f as f32;
    let img = |i: &Img, x: f32, y: f32| -> Svgr<'a> {
        match ctx.get_image(&i.image) {
            Some(m) => fframes::svgr!(<image href={m.href()} x={x} y={y} width={i.w * U} height={i.h * U} />),
            None => Svgr::empty(),
        }
    };
    let centred = |i: &Img| img(i, (W - i.w * U) / 2.0, (H - i.h * U) / 2.0 + i.dy * U);
    let mut t0 = 0;
    let mut flash = None;
    for l in &e.logos {
        if f < t0 + l.frames {
            let s = 1.0 + 0.04 * (f - t0) as f32 / l.frames as f32;
            flash = Some(fframes::svgr!(<g transform={about_centre(s, 0.0)}>{centred(l)}</g>));
            break;
        }
        t0 += l.frames;
    }
    let body = match flash {
        Some(b) => b,
        None => {
            let k = ff - t0 as f32;
            let land = 1.0 + 0.14 * (1.0 - ease_out(k / 6.0));
            let lift = -110.0 * U * ease_io((k - 14.0) / 12.0);
            let row = ease_out((k - 20.0) / 10.0);
            let line = ease_out((k - 28.0) / 12.0);
            let tag = ease_out((k - 32.0) / 10.0);
            let mark = match &e.mark {
                Some(m) => fframes::svgr!(<g transform={about_centre(land, lift)}>{centred(m)}</g>),
                None => Svgr::empty(),
            };
            // the row: logos centred on one line, hairline dividers between them
            let gap = 31.5 * U;
            let ry = H / 2.0 + 182.0 * U;
            let total: f32 = e.row.iter().map(|i| i.w * U).sum::<f32>() + (e.row.len().max(1) - 1) as f32 * (2.0 * gap + 1.0);
            let mut x = (W - total) / 2.0;
            let mut items = Vec::new();
            for (n, i) in e.row.iter().enumerate() {
                if n > 0 {
                    items.push(fframes::svgr!(<rect x={x + gap} y={ry - 35.0 * U} width="1" height={70.0 * U} fill={WHITE} opacity="0.6" />));
                    x += 2.0 * gap + 1.0;
                }
                items.push(img(i, x, ry - i.h * U / 2.0 + i.dy * U));
                x += i.w * U;
            }
            fframes::svgr!(<g>
                {mark}
                <g opacity={row} transform={format!("translate(0 {})", 24.0 * U * (1.0 - row))}>{items}</g>
                <rect x={W / 2.0 - 240.0 * U * line} y={H / 2.0 + 325.0 * U} width={(480.0 * U * line).max(0.5)} height="1" fill={WHITE} opacity="0.5" />
                <text x={W / 2.0} y={H / 2.0 + 371.0 * U} text-anchor="middle" font-family={MONO} font-weight="500" font-size={17.0 * U} letter-spacing={7.0 * U} fill={WHITE} opacity={tag}>{e.tag.as_str()}</text>
            </g>)
        }
    };
    let fade = 1.0 - ease_io((ff - (len as f32 - e.fade)) / e.fade);
    fframes::svgr!(<g>
        <rect width={W} height={H} fill="url(#bg)" />
        {body}
        <rect width={W} height={H} fill="#000000" opacity={1.0 - fade} />
    </g>)
}
