//! `SPOT=path/to/spot.json spot <fframes command>` (default ./spot.json), e.g. `render -o out.mp4`.
//! Runtime media (plates.mp4, the soundtrack, logos) load from `<spot dir>/runtime`; the fonts
//! are built in from `media/`.
use fframes::{CombinedMediaProvider, EncoderOptions, MediaDirectory, MediaProvider, RenderOptions, cli};
use fframes_skia_renderer::{SkiaFFramesRenderer, SkiaPipelineConcurrencyPolicy, SkiaPipelineConfig, metal::SkiaMetalCtx};
use spot::{HEIGHT, SpotMedia, SpotVideo, WIDTH, spec::Spot};
use std::path::PathBuf;
use std::process::ExitCode;

fn main() -> ExitCode {
    let path = PathBuf::from(std::env::var("SPOT").unwrap_or_else(|_| "spot.json".into()));
    let spot = match Spot::load(&path) {
        Ok(s) => s,
        Err(e) => {
            eprintln!("spot error: {e}");
            return ExitCode::FAILURE;
        }
    };
    let runtime = spot.dir.join("runtime");
    let media = SpotMedia::new().expect("media");
    let dir = MediaDirectory::read_folder(&runtime).unwrap_or_else(|e| panic!("{}: {e:?}", runtime.display()));
    let rt = dir.process_media_source().expect("runtime media");
    let all = CombinedMediaProvider::from([&media as &dyn MediaProvider, &rt]);
    let video = match SpotVideo::new(spot) {
        Ok(v) => v,
        Err(e) => {
            eprintln!("spot error: {e}");
            return ExitCode::FAILURE;
        }
    };
    let gpu = SkiaMetalCtx::new(WIDTH, HEIGHT).expect("GPU context");

    cli::new(
        &video,
        RenderOptions {
            media: Some(&all),
            audio_mix: fframes::AudioMixOptions { master_gain_db: 0.0, ..Default::default() },
            video_encoder_options: EncoderOptions {
                preferred_encoder: Some("libx264"),
                codec_params: Some(&[("crf", "14"), ("preset", "slow")]),
                ..Default::default()
            },
            ..Default::default()
        },
    )
    .backend(
        SkiaFFramesRenderer::new_metal(
            &gpu,
            SkiaPipelineConfig { concurrency_policy: SkiaPipelineConcurrencyPolicy::MaxPerformance, ..Default::default() },
        )
        .expect("skia renderer"),
    )
    .preview(fframes_native_player::cli_preview)
    .run()
}
