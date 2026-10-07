//! Every frame converts without problems, for the default word and for the whole alphabet.
use fframes::{Previewer, RenderOptions, StaticMediaProvider};
use kawaii_pink::{Config, KawaiiPinkMedia, KawaiiPinkVideo};

fn check(word: &str) {
    let media = KawaiiPinkMedia::prepare().unwrap();
    let video = KawaiiPinkVideo::new(&media, &Config { word: word.into(), ..Default::default() });
    let options = RenderOptions { media: Some(&media), ..Default::default() };
    let mut previewer = Previewer::new(&video, &options).unwrap();
    let duration = previewer.timeline().duration_in_frames;
    for frame in 0..duration {
        let report = previewer.inspect(frame).unwrap();
        let problems: Vec<_> = report
            .diagnostics
            .iter()
            .filter(|d| d.severity >= fframes::diagnostics::Severity::Warning)
            .map(|d| d.message.as_str())
            .collect();
        assert!(problems.is_empty(), "{word}: frame {frame} ({:.2}s): {problems:?}", report.seconds);
    }
}

#[test]
fn default_word() {
    check("MOCHI");
}

#[test]
fn alphabet() {
    check("ABCDEFGHIJKLM");
    check("NOPQRSTUVWXYZ!");
}
