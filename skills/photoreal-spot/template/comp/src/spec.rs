//! The spec: one `spot.json` describes a whole spot (size, shots, sources, plates, snap
//! beats, the comp's finish, QA). The Python tools read the same file. This module reads the
//! keys the comp uses; every key and its default is in `references/spot.md`.
use serde::Deserialize;
use std::path::{Path, PathBuf};

#[derive(Debug, Deserialize)]
pub struct Spot {
    pub fps: usize,
    pub width: usize,
    pub height: usize,
    #[serde(default)]
    pub look: Look,
    pub shots: Vec<Shot>,
    #[serde(default)]
    pub comp: Comp,
    /// Folder that holds spot.json; runtime media load from `<dir>/runtime`.
    #[serde(skip)]
    pub dir: PathBuf,
}

#[derive(Debug, Deserialize)]
pub struct Shot {
    pub id: String,
    pub start: usize,
    pub end: usize,
    /// video | snaps | render | comp. Shots before the first `comp` shot are plates.
    pub src: String,
}

#[derive(Debug, Deserialize)]
#[serde(default)]
pub struct Look {
    /// Backdrop gradient, left to right: [offset, colour] pairs.
    pub gradient: Vec<(f32, String)>,
    /// Crush the blacks and keep blue in the shadows on the plates.
    pub grade: bool,
    pub grain: f32,
    pub vignette: f32,
}

impl Default for Look {
    fn default() -> Self {
        Look {
            gradient: vec![
                (0.0, "#000528".into()),
                (0.25, "#001154".into()),
                (0.5, "#02288b".into()),
                (0.75, "#2f5adb".into()),
                (1.0, "#889dfa".into()),
            ],
            grade: true,
            grain: 0.14,
            vignette: 0.45,
        }
    }
}

#[derive(Debug, Default, Deserialize)]
#[serde(default)]
pub struct Comp {
    pub audio: Vec<Audio>,
    /// Frames that get a 4-frame chromatic-aberration kick (the main cuts).
    pub kicks: Vec<usize>,
    pub whips: Vec<Whip>,
    /// [frame, opacity] of a white flash.
    pub flashes: Vec<(usize, f32)>,
    pub hud: Option<Hud>,
    pub tagline: Option<Tagline>,
    pub end: Option<End>,
}

#[derive(Debug, Deserialize)]
pub struct Audio {
    /// A file in `<spot>/runtime`.
    pub file: String,
    /// Start on the timeline, seconds.
    #[serde(default)]
    pub at: f32,
    #[serde(default)]
    pub gain_db: f32,
}

/// The plate slides sideways under a hard horizontal blur over the backdrop.
#[derive(Debug, Deserialize)]
pub struct Whip {
    pub from: usize,
    pub to: usize,
    /// Pixels travelled by the end of the whip; negative goes left.
    pub travel: f32,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Img {
    /// A file in `<spot>/runtime`.
    pub image: String,
    pub w: f32,
    pub h: f32,
    /// Vertical nudge, design px.
    #[serde(default)]
    pub dy: f32,
    /// Logo flashes on the end card: how long this one holds.
    #[serde(default = "eight")]
    pub frames: usize,
}

fn eight() -> usize {
    8
}

#[derive(Debug, Deserialize)]
#[serde(default)]
pub struct Hud {
    pub mark: Option<Img>,
    pub title: String,
    pub subtitle: String,
    pub footer: String,
    /// Frames that start a new numbered shot in the bottom-right counter (empty: no counter).
    pub counter: Vec<usize>,
    pub total: usize,
    /// First frame of the fade-in.
    pub from: usize,
}

impl Default for Hud {
    fn default() -> Self {
        Hud { mark: None, title: String::new(), subtitle: String::new(), footer: String::new(), counter: vec![], total: 0, from: 6 }
    }
}

#[derive(Debug, Deserialize)]
pub struct Tagline {
    /// The `comp` shot this plays in.
    pub shot: String,
    pub lines: Vec<Line>,
    #[serde(default = "tag_font")]
    pub font: String,
    #[serde(default = "tag_weight")]
    pub weight: u32,
    #[serde(default = "yes")]
    pub italic: bool,
    /// Font size in design px (1080 wide).
    #[serde(default = "tag_size")]
    pub size: f32,
}

fn tag_font() -> String {
    "Barlow Condensed".into()
}
fn tag_weight() -> u32 {
    800
}
fn tag_size() -> f32 {
    212.0
}
fn yes() -> bool {
    true
}

#[derive(Debug, Deserialize)]
pub struct Line {
    pub text: String,
    /// Local frame the line slams in.
    pub at: f32,
    /// Set to draw the line as an outline that fills from this local frame.
    #[serde(default)]
    pub outline_until: Option<f32>,
}

#[derive(Debug, Deserialize)]
pub struct End {
    pub shot: String,
    /// Logos that flash full size one after another, each for its `frames`.
    #[serde(default)]
    pub logos: Vec<Img>,
    /// The mark that lands, lifts and gets the row, rule and tag under it.
    pub mark: Option<Img>,
    #[serde(default)]
    pub row: Vec<Img>,
    #[serde(default)]
    pub tag: String,
    /// Fade to black over the last `fade` frames.
    #[serde(default = "twelve")]
    pub fade: f32,
}

fn twelve() -> f32 {
    12.0
}

impl Spot {
    pub fn load(path: &Path) -> Result<Spot, String> {
        let text = std::fs::read_to_string(path).map_err(|e| format!("{}: {e}", path.display()))?;
        let mut spot: Spot = serde_json::from_str(&text).map_err(|e| format!("{}: {e}", path.display()))?;
        spot.dir = path.canonicalize().map_err(|e| e.to_string())?.parent().unwrap().to_path_buf();
        Ok(spot)
    }

    /// First frame of the first `comp` shot: the plates run up to here.
    pub fn plates_end(&self) -> usize {
        self.shots.iter().find(|s| s.src == "comp").map(|s| s.start).unwrap_or_else(|| self.total())
    }

    pub fn total(&self) -> usize {
        self.shots.iter().map(|s| s.end).max().unwrap_or(0)
    }

    pub fn shot(&self, id: &str) -> Option<&Shot> {
        self.shots.iter().find(|s| s.id == id)
    }
}
