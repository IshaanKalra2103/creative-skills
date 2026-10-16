//! `SPEC=path/to/video.toml docshort <fframes command>` (default spec: ./video.toml).
//! Plates load from `<spec dir>/assets`, audio from `<spec dir>/audio`.
use docshort::{DocMedia, DocShort, HEIGHT, WIDTH, spec::Spec};
use fframes::{EncoderOptions, RenderOptions, cli};
use fframes_skia_renderer::{SkiaFFramesRenderer, SkiaPipelineConcurrencyPolicy, SkiaPipelineConfig, metal::SkiaMetalCtx};
use std::path::PathBuf;
use std::process::ExitCode;

fn folder(dir: &std::path::Path, name: &str) -> fframes::MediaDirectory {
    let path = dir.join(name);
    if !path.exists() {
        let _ = std::fs::create_dir_all(&path);
    }
    fframes::MediaDirectory::read_folder(&path).unwrap_or_else(|e| panic!("{}: {e:?}", path.display()))
}

fn main() -> ExitCode {
    let spec_path = PathBuf::from(std::env::var("SPEC").unwrap_or_else(|_| "video.toml".into()));
    let spec = match Spec::load(&spec_path) {
        Ok(s) => s,
        Err(e) => {
            eprintln!("spec error: {e}");
            return ExitCode::FAILURE;
        }
    };
    let media = DocMedia::new().expect("media");
    let plates_dir = folder(&spec.dir, "assets");
    let plates = plates_dir.process_media_source().expect("assets");
    let audio_dir = folder(&spec.dir, "audio");
    let audio = audio_dir.process_media_source().expect("audio");
    let all_media = fframes::CombinedMediaProvider::from([&media as &dyn fframes::MediaProvider, &plates, &audio]);
    let video = DocShort::new(spec);
    let gpu = SkiaMetalCtx::new(WIDTH, HEIGHT).expect("GPU context");

    cli::new(
        &video,
        RenderOptions {
            media: Some(&all_media),
            video_encoder_options: EncoderOptions {
                preferred_encoder: Some("libx264"),
                codec_params: Some(&[("crf", "16"), ("preset", "slow"), ("tune", "grain")]),
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
