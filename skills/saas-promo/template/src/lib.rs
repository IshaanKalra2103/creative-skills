//! saaspromo: snappy SaaS / product promo films (16:9, 15-60 s) rendered with fframes from one
//! TOML spec. The look (a fitted blue-gradient screen with a dot texture, words that blur in as
//! frosted glass and settle, translucent highlight boxes, UI windows that rise and swing in,
//! a card wall with depth of field, a logo end card) and the motion timings were measured on
//! a reference promo; each scene `kind` is a parametric version of one of its shots. Palette,
//! fonts, flow (the scene list), progression (durations or beats) and music come from the
//! spec. See SKILL.md.
pub mod kit;
pub mod spec;
mod scenes;

use fframes::{AudioMap, AudioTimestamp, AudioTrack, Color, Duration, FFramesContext, Frame, Scene, Scenes, Svgr, Video};
use spec::{P, Spec};
use toml::Table;

fframes::include_media_dir!(pub struct PromoMedia, "media");

pub const WIDTH: usize = 1920;
pub const HEIGHT: usize = 1080;
pub const FPS: usize = 30;
/// Scenes are authored in 1280x720 and scaled up by this factor.
pub const UP: f32 = 1.5;

fn frame_of(t: f32) -> usize {
    (t * FPS as f32).round() as usize
}

#[derive(Debug)]
pub struct Shot {
    kind: String,
    name: &'static str,
    t0: f32,
    t1: f32,
    params: Table,
}

impl Scene for Shot {
    fn name(&self) -> &'static str {
        self.name
    }
    fn duration(&self) -> Duration<'_> {
        Duration::Frames(frame_of(self.t1) - frame_of(self.t0))
    }
    fn render_frame<'a>(&'a self, mut frame: Frame, ctx: &FFramesContext<'a, '_>) -> Svgr<'a> {
        let g = frame.global_index as f32 / FPS as f32;
        let f0 = frame_of(self.t0) as f32 / FPS as f32;
        let f1 = frame_of(self.t1) as f32 / FPS as f32;
        let tm = kit::T { t: g - f0, len: f1 - f0, g, pace: kit::look().pace };
        scenes::render(&self.kind, P(&self.params), &tm, &mut frame, ctx)
    }
}

pub struct Promo {
    shots: Vec<Shot>,
    audio: Vec<spec::AudioSpec>,
}

impl Promo {
    pub fn new(spec: Spec) -> Self {
        kit::init(&spec.palette, &spec.look);
        kit::set_spec_dir(&spec.dir);
        let shots = spec
            .scenes
            .into_iter()
            .enumerate()
            .map(|(i, s)| Shot { name: kit::intern(&format!("{:02}_{}", i, s.kind)), kind: s.kind, t0: s.t0, t1: s.t1, params: s.params })
            .collect();
        Self { shots, audio: spec.audio }
    }

    fn shot_at(&self, frame: usize) -> (usize, &Shot) {
        self.shots.iter().enumerate().rev().find(|(_, s)| frame_of(s.t0) <= frame).unwrap_or((0, &self.shots[0]))
    }
}

impl std::fmt::Debug for Promo {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Promo").field("scenes", &self.shots.len()).finish()
    }
}

impl Video for Promo {
    const FPS: usize = FPS;
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
        let (i, shot) = self.shot_at(frame.global_index);
        let g = frame.global_index as f32 / FPS as f32;
        let scene = ctx.render_scenes(&frame);
        // letterbox: a scene with `letterbox = true` closes the bars over its last 0.3 s and
        // the next scene opens them over its first 0.9 s (measured)
        let bars = {
            let close = |s: &Shot| P(&s.params).b("letterbox", false);
            let mut h = 0.0f32;
            if close(shot) {
                let left = shot.t1 - g;
                let into = left.min(0.9);
                h = h.max(kit::keys(0.9 - into, &[(0.0, 0.0), (0.08, 5.0), (0.16, 34.0), (0.24, 60.0), (0.32, 64.5), (0.48, 68.5), (0.64, 70.5), (0.9, 71.0)], |t| t));
            }
            if i > 0 && close(&self.shots[i - 1]) {
                let t = g - shot.t0;
                h = h.max(kit::keys(t, &[(0.0, 66.0), (0.24, 64.0), (0.4, 61.0), (0.48, 56.0), (0.56, 50.0), (0.64, 18.0), (0.72, 8.0), (0.8, 4.0), (0.88, 0.0)], |t| t));
            }
            kit::letterbox(h)
        };
        let over = scenes::overlay(&shot.kind, P(&shot.params), g - shot.t0, shot.t1 - shot.t0);
        fframes::svgr!(
            <svg xmlns="http://www.w3.org/2000/svg" width={WIDTH} height={HEIGHT} viewBox="0 0 1920 1080">
                <rect x="0" y="0" width="1920" height="1080" fill="#000000" />
                <g transform="scale(1.5)">
                    {scene}
                    {bars}
                    {over}
                </g>
            </svg>
        )
    }
}
