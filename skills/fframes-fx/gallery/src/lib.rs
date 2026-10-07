//! fx gallery: every `.sksl` effect in `../shaders` becomes a one-second scene named after it,
//! so `strip`, `frame Aurora@0.5s` and `inspect` address effects by name.
//!
//! An effect file starts with a comment header the gallery (and humans) read:
//!
//! ```text
//! // fx: Aurora
//! // kind: generator            generator | overlay | filter | mask
//! // blend: screen              overlays only: any SVG mix-blend-mode
//! // from: shader-effects-inc/shaders packages/core/src/shaders/Aurora (MIT)
//! // uniform: uSpeed float 0.6
//! // uniform: uColorA color #22d3ee
//! // uniform: uCenter float2 0.5 0.5
//! ```
//!
//! Filters get `uniform shader uSrc; uniform float2 uSrcSize;` bound to `media/test.png`, or to the
//! file named by a `// src: shape.png` header line (white shapes on transparent, for alpha-driven
//! shape effects like Heatmap or Neon).
use fframes::{
    AudioMap, Color, Duration, FFramesContext, Frame, Scene, Scenes, Svgr, Video, include_media_dir,
};

include_media_dir!(pub struct GalleryMedia, "media");

pub const WIDTH: usize = 1280;
pub const HEIGHT: usize = 720;
pub const SECONDS_PER_FX: f32 = 2.0;

#[path = "../../templates/fx.rs"]
pub mod fx;
pub use fx::{Fx, Kind, Uniform, load_dir};

#[derive(Debug)]
pub struct FxScene {
    pub fx: Fx,
}

impl Scene for FxScene {
    fn name(&self) -> &'static str {
        self.fx.name
    }

    fn duration(&self) -> Duration<'_> {
        Duration::Seconds(SECONDS_PER_FX)
    }

    fn render_frame<'a>(&'a self, frame: Frame, ctx: &FFramesContext<'a, '_>) -> Svgr<'a> {
        let fx = &self.fx;
        let mut uniforms = fx.uniforms(&[]);
        if fx.kind == Kind::Filter {
            let Some(src) = ctx.get_image(fx.src) else { return Svgr::empty() };
            uniforms = uniforms.image("uSrc", &src).float2("uSrcSize", 1280.0, 720.0);
        }
        let layer = fx.shader.draw(&frame, uniforms);
        let label = format!("{} · {:?}", fx.name, fx.kind).to_lowercase();

        let body = match fx.kind {
            // Overlays sit on a sample composition so their blend mode is visible.
            Kind::Overlay => {
                let style = format!("mix-blend-mode:{}", fx.blend);
                fframes::svgr!(<g>
                    <rect width="1280" height="720" fill="#e9e5dc" />
                    <rect x="0" y="0" width="640" height="720" fill="#141414" />
                    <circle cx="640" cy="360" r="190" fill="#e0412b" />
                    <text x="96" y="380" font-family="DM Sans" font-weight="500" font-size="72" fill="#e9e5dc">"overlay"</text>
                    <g style={style}>
                        <image href={layer.href()} x="0" y="0" width="1280" height="720" />
                    </g>
                </g>)
            }
            Kind::Mask => fframes::svgr!(<g>
                <rect width="1280" height="720" fill="#e0412b" />
                <image href={layer.href()} x="0" y="0" width="1280" height="720" />
            </g>),
            Kind::Generator | Kind::Filter => fframes::svgr!(<g>
                <rect width="1280" height="720" fill="#000000" />
                <image href={layer.href()} x="0" y="0" width="1280" height="720" />
            </g>),
        };

        fframes::svgr!(<g>
            {body}
            <rect x="0" y="672" width="1280" height="48" fill="#000000" fill-opacity="0.55" />
            <text x="20" y="704" font-family="DM Sans" font-weight="500" font-size="24" fill="#ffffff">{label}</text>
        </g>)
    }
}

pub struct GalleryVideo<'a> {
    pub media: &'a GalleryMedia,
    pub scenes: Vec<FxScene>,
}

impl std::fmt::Debug for GalleryVideo<'_> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("GalleryVideo").field("effects", &self.scenes.len()).finish()
    }
}

impl Video for GalleryVideo<'_> {
    const FPS: usize = 24;
    const WIDTH: usize = WIDTH;
    const HEIGHT: usize = HEIGHT;
    const BACKGROUND_COLOR: Color = Color::BLACK;

    fn duration(&self) -> Duration<'_> {
        Duration::Auto
    }

    fn audio(&self) -> AudioMap<'_> {
        AudioMap::none()
    }

    fn define_scenes(&self) -> Scenes<'_> {
        Scenes::from(self.scenes.iter().map(|s| s as &dyn Scene).collect::<Vec<_>>())
    }

    fn render_frame<'a>(&'a self, frame: Frame, ctx: &FFramesContext<'a, '_>) -> Svgr<'a> {
        fframes::svgr!(
            <svg xmlns="http://www.w3.org/2000/svg" width={WIDTH} height={HEIGHT} viewBox="0 0 1280 720">
                {ctx.render_scenes(&frame)}
            </svg>
        )
    }
}
