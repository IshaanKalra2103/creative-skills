use fframes::cli::{self, clap};
use fframes::{EncoderOptions, RenderOptions, StaticMediaProvider};
use fframes_skia_renderer::{
    SkiaFFramesRenderer, SkiaPipelineConcurrencyPolicy, SkiaPipelineConfig, metal::SkiaMetalCtx,
};
use gallery::{FxScene, GalleryMedia, GalleryVideo, HEIGHT, WIDTH, load_dir};
use std::process::ExitCode;

#[derive(Debug, clap::Args)]
struct GalleryArgs {
    /// Folder with the `.sksl` effects.
    #[arg(long, default_value = "../shaders", global = true)]
    shaders: std::path::PathBuf,
    /// Only these effects (comma separated names from the `fx:` header).
    #[arg(long, value_delimiter = ',', global = true)]
    only: Vec<String>,
    /// Compile every effect with Skia, print errors and exit.
    #[arg(long, global = true)]
    check: bool,
}

fn main() -> ExitCode {
    let args = cli::parse::<GalleryArgs>();
    let effects = match load_dir(&args.app.shaders, &args.app.only) {
        Ok(fx) if !fx.is_empty() => fx,
        Ok(_) => {
            eprintln!("no effects found in {}", args.app.shaders.display());
            return ExitCode::from(2);
        }
        Err(err) => {
            eprintln!("{err}");
            return ExitCode::from(2);
        }
    };

    if args.app.check {
        let mut failed = 0;
        for fx in &effects {
            match fframes_skia_renderer::render::compile_shader(&fx.shader) {
                Ok(_) => println!("ok    {}", fx.name),
                Err(err) => {
                    failed += 1;
                    println!("FAIL  {}\n{}", fx.name, err.trim_end());
                }
            }
        }
        println!("{} effects, {failed} failed", effects.len());
        return if failed == 0 { ExitCode::SUCCESS } else { ExitCode::from(1) };
    }

    let media = GalleryMedia::prepare().expect("media");
    let video = GalleryVideo {
        media: &media,
        scenes: effects.into_iter().map(|fx| FxScene { fx }).collect(),
    };
    let gpu = SkiaMetalCtx::new(WIDTH, HEIGHT).expect("GPU context");

    cli::new(
        &video,
        RenderOptions {
            media: Some(&media),
            video_encoder_options: EncoderOptions {
                preferred_encoder: Some("libx264"),
                codec_params: Some(&[("crf", "18"), ("preset", "medium")]),
                ..Default::default()
            },
            ..Default::default()
        },
    )
    .args(args)
    .backend(
        SkiaFFramesRenderer::new_metal(
            &gpu,
            SkiaPipelineConfig {
                concurrency_policy: SkiaPipelineConcurrencyPolicy::MaxPerformance,
                ..Default::default()
            },
        )
        .expect("skia renderer"),
    )
    .preview(fframes_native_player::cli_preview)
    .default_output("gallery.mp4")
    .run()
}
