use fframes::cli::clap; // the derive below expands to `clap::...`
use fframes::{EncoderOptions, RenderOptions, StaticMediaProvider, cli};
use fframes_skia_renderer::{
    SkiaFFramesRenderer, SkiaPipelineConcurrencyPolicy, SkiaPipelineConfig, metal::SkiaMetalCtx,
};
use kawaii_pink::{Config, HEIGHT, KawaiiPinkMedia, KawaiiPinkVideo, WIDTH};
use std::process::ExitCode;

/// Flags of this video next to the standard ones of `fframes::cli` (render, frame, strip,
/// inspect, audio, ...). Run `cargo run --release -- --help`.
#[derive(Debug, clap::Args)]
struct VideoArgs {
    /// The wordmark: A-Z, space and "!" (drawn uppercase)
    #[arg(long, default_value = "MOCHI", global = true)]
    word: String,
    /// Line colour
    #[arg(long, default_value = "#ee17bc", global = true)]
    ink: String,
    /// Where the mascot sits along the word, 0 (left) .. 1 (right)
    #[arg(long, default_value_t = 0.56, global = true)]
    seat: f32,
}

fn main() -> ExitCode {
    let args = cli::parse::<VideoArgs>();
    let config = Config { word: args.app.word.clone(), ink: args.app.ink.clone(), seat: args.app.seat };
    let media = KawaiiPinkMedia::prepare().expect("media");
    let video = KawaiiPinkVideo::new(&media, &config);
    let gpu = SkiaMetalCtx::new(WIDTH, HEIGHT).expect("GPU context");

    cli::new(
        &video,
        RenderOptions {
            media: Some(&media),
            video_encoder_options: EncoderOptions {
                preferred_encoder: Some("libx264"),
                codec_params: Some(&[("crf", "20"), ("preset", "medium"), ("tune", "animation")]),
                ..Default::default()
            },
            ..Default::default()
        },
    )
    .args(args)
    .backend(
        SkiaFFramesRenderer::new_metal(
            &gpu,
            SkiaPipelineConfig { concurrency_policy: SkiaPipelineConcurrencyPolicy::MaxPerformance, ..Default::default() },
        )
        .expect("skia renderer"),
    )
    .preview(fframes_native_player::cli_preview)
    .default_output("out.mp4")
    .run()
}
