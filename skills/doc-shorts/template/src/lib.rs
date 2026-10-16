//! docshort: documentary + infographic shorts (9:16, ~20-60 s) rendered with fframes from one
//! TOML spec. The look (retro scanlines, halftone, grain, captions with a colour fringe) and the
//! motion (animated on threes: the picture changes every 3rd frame, cuts land on that grid)
//! were measured shot by shot on a reference reel; each shot `kind` is a parametric version of
//! one of its shots. See SKILL.md.
pub mod kit;
pub mod spec;
mod shots;

use fframes::{AudioMap, AudioTimestamp, AudioTrack, Color, Duration, FFramesContext, Frame, Scene, Scenes, Svgr, Video};
use spec::{P, Spec};
use toml::Table;

fframes::include_media_dir!(pub struct DocMedia, "media");

pub const WIDTH: usize = 1080;
pub const HEIGHT: usize = 1920;
/// Shots are authored in 720x1280 "ref px" and scaled up by this factor.
pub const UP: f32 = 1.5;

/// First frame of tick `k` (10 ticks per second; tick k starts at frame 3k-1, as on the
/// reference, so tick 0 is two frames long).
pub fn tick_frame(k: i32) -> usize {
    if k <= 0 { 0 } else { (3 * k - 1) as usize }
}

#[derive(Debug)]
pub struct Shot {
    kind: String,
    name: &'static str,
    k0: i32,
    k1: i32,
    params: Table,
}

impl Scene for Shot {
    fn name(&self) -> &'static str {
        self.name
    }
    fn duration(&self) -> Duration<'_> {
        Duration::Frames(tick_frame(self.k1) - tick_frame(self.k0))
    }
    fn render_frame<'a>(&'a self, mut frame: Frame, ctx: &FFramesContext<'a, '_>) -> Svgr<'a> {
        let tm = kit::T::new(frame.global_index, self.k0, self.k1);
        shots::render(&self.kind, P(&self.params), &tm, &mut frame, ctx)
    }
}

pub struct DocShort {
    shots: Vec<Shot>,
    look: kit::Look,
    audio: Vec<spec::AudioSpec>,
}

impl DocShort {
    pub fn new(spec: Spec) -> Self {
        let shots = spec
            .shots
            .into_iter()
            .enumerate()
            .map(|(i, s)| Shot {
                name: kit::intern(&format!("{:02}_{}", i, s.kind)),
                kind: s.kind,
                k0: s.k0,
                k1: s.k1,
                params: s.params,
            })
            .collect();
        Self { shots, look: kit::Look::from(P(&spec.look)), audio: spec.audio }
    }

    fn shot_at(&self, frame: usize) -> &Shot {
        self.shots.iter().rev().find(|s| tick_frame(s.k0) <= frame).unwrap_or(&self.shots[0])
    }
}

impl std::fmt::Debug for DocShort {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("DocShort").field("shots", &self.shots.len()).finish()
    }
}

impl Video for DocShort {
    const FPS: usize = 30;
    const WIDTH: usize = WIDTH;
    const HEIGHT: usize = HEIGHT;
    const BACKGROUND_COLOR: Color = Color::BLACK;

    fn duration(&self) -> Duration<'_> {
        Duration::Auto
    }

    fn audio(&self) -> AudioMap<'_> {
        AudioMap::from(
            self.audio
                .iter()
                .map(|a| AudioTrack::new(&a.file, AudioTimestamp::Second(a.at)..AudioTimestamp::Eof).gain_db(a.gain))
                .collect::<Vec<_>>(),
        )
    }

    fn define_scenes(&self) -> Scenes<'_> {
        Scenes::from(self.shots.iter().map(|s| s as &dyn Scene).collect::<Vec<_>>())
    }

    fn render_frame<'a>(&'a self, frame: Frame, ctx: &FFramesContext<'a, '_>) -> Svgr<'a> {
        let shot = self.shot_at(frame.global_index);
        let p = P(&shot.params);
        let (dots, vig) = shots::look_defaults(&shot.kind, p);
        let scene = ctx.render_scenes(&frame);
        let look = kit::look_layer(&frame, &self.look, p.f("dots", dots), p.f("vignette", vig));
        let grain = kit::grain_layer(&frame, &self.look);
        fframes::svgr!(
            <svg xmlns="http://www.w3.org/2000/svg" width={WIDTH} height={HEIGHT} viewBox="0 0 1080 1920">
                {kit::defs()}
                <rect x="0" y="0" width="1080" height="1920" fill="#000000" />
                <g transform="scale(1.5)">{scene}</g>
                // scanlines, halftone screen and vignette
                <g style="mix-blend-mode:multiply">{look}</g>
                <g style="mix-blend-mode:overlay" opacity="0.5">{grain}</g>
            </svg>
        )
    }
}
