//! Shot kinds. Each module exposes `render(p, tm, frame, ctx)` (draws one frame of the shot
//! in 720x1280 ref px from its spec params `p`) and `look(p) -> (dots, vignette)` (how much
//! halftone screen and vignette the global look applies over it). `references/shots.md`
//! indexes every kind; `references/kinds/<kind>.md` documents its params.
use crate::kit::{self, T};
use crate::spec::P;
use fframes::{FFramesContext, Frame, Svgr};

mod note;
mod browser;
mod card;
mod photo;
mod frame_card;
mod faces;
mod magnifier;
mod search;
mod hypno;
mod chart;
mod globe_grid;
mod earth;
mod tunnel;
mod file_icon;
mod site;

/// Every kind with a one-line description.
#[allow(dead_code)]
pub const KINDS: &[(&str, &str)] = &[
    ("note", "dot-grid background, a glowing dot, a handwritten note and an arrow drawn to the dot"),
    ("browser", "a background image, a retro browser window with a spinning wireframe globe, condensed caps title"),
    ("card", "a text card: typed, popped, slid or zoomed words on black, grey, paper or any colour"),
    ("photo", "a photo plate with a camera move (whip, push, zoom-blur, keyframes) and a caption"),
    ("frame_card", "a framed photo on a flat field that slides in and keeps growing, with a big caption"),
    ("faces", "cut-out portrait cards with name labels on a colour field, zooming out from huge"),
    ("magnifier", "a magnifying glass that reveals a red word inside the lens"),
    ("search", "a search pill that slides in while a query is typed"),
    ("hypno", "hypnotic concentric rings, a zoom burst and a cut-out collage head, with a caption"),
    ("chart", "a node graph and a bar chart that zoom out under a title"),
    ("globe_grid", "a wireframe globe rises, multiplies into a grid and zooms out to a dot field"),
    ("earth", "a night Earth with glowing coastlines, city lights and network arcs, with a typed caption"),
    ("tunnel", "a tunnel of thumbnails rushing at the camera"),
    ("file_icon", "flowing ribbons, a file icon and a hand cursor that reaches it"),
    ("site", "a blurred website slides in; a sharp search pill types a URL (the call to action)"),
];

pub fn render<'a>(kind: &str, p: P<'a>, tm: &T, frame: &mut Frame, ctx: &FFramesContext<'a, '_>) -> Svgr<'a> {
    match kind {
        "note" => note::render(p, tm, frame, ctx),
        "browser" => browser::render(p, tm, frame, ctx),
        "card" => card::render(p, tm, frame, ctx),
        "photo" => photo::render(p, tm, frame, ctx),
        "frame_card" => frame_card::render(p, tm, frame, ctx),
        "faces" => faces::render(p, tm, frame, ctx),
        "magnifier" => magnifier::render(p, tm, frame, ctx),
        "search" => search::render(p, tm, frame, ctx),
        "hypno" => hypno::render(p, tm, frame, ctx),
        "chart" => chart::render(p, tm, frame, ctx),
        "globe_grid" => globe_grid::render(p, tm, frame, ctx),
        "earth" => earth::render(p, tm, frame, ctx),
        "tunnel" => tunnel::render(p, tm, frame, ctx),
        "file_icon" => file_icon::render(p, tm, frame, ctx),
        "site" => site::render(p, tm, frame, ctx),
        other => stub(other, tm),
    }
}

/// (halftone, vignette) multipliers for the global look while this shot is on screen; the
/// spec can override both per shot with `dots = ..` and `vignette = ..`.
pub fn look_defaults(kind: &str, p: P) -> (f32, f32) {
    match kind {
        "note" => note::look(p),
        "browser" => browser::look(p),
        "card" => card::look(p),
        "photo" => photo::look(p),
        "frame_card" => frame_card::look(p),
        "faces" => faces::look(p),
        "magnifier" => magnifier::look(p),
        "search" => search::look(p),
        "hypno" => hypno::look(p),
        "chart" => chart::look(p),
        "globe_grid" => globe_grid::look(p),
        "earth" => earth::look(p),
        "tunnel" => tunnel::look(p),
        "file_icon" => file_icon::look(p),
        "site" => site::look(p),
        _ => (1.0, 1.0),
    }
}

/// Unknown kinds render a labelled placeholder so the timeline still plays.
fn stub<'a>(kind: &str, tm: &T) -> Svgr<'a> {
    let label = format!("{kind} {}", tm.tick);
    fframes::svgr!(<g>
        {kit::fill("#202020")}
        {kit::serif(360.0, 640.0, 48.0, 0.0, "#ffffff", "middle", "cap", label)}
    </g>)
}
