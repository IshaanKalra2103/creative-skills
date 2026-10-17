//! Scene kinds. Each module exposes `render(p, tm, frame, ctx)`: one frame of the scene in
//! the 1280x720 design space, backdrop included, from its spec params `p`. A kind may also
//! expose `overlay(p, t, len)` for things drawn above the letterbox. `references/kinds.md`
//! documents every kind's params.
use crate::kit::{self, T};
use crate::spec::P;
use fframes::{FFramesContext, Frame, Svgr};

mod caption;
mod end;
mod prompt;
mod screen;
mod tiles;
mod title;
mod wall;
mod window;

/// Every kind with a one-line description.
#[allow(dead_code)]
pub const KINDS: &[(&str, &str)] = &[
    ("title", "huge glowing glass words that arrive one by one while the camera pulls back"),
    ("window", "a frosted pill rises (optional halftone sweep) and grows into an app window built up layer by layer"),
    ("tiles", "a headline with a highlight over a row of frosted tiles that slides; chosen tiles light up"),
    ("caption", "one or two lines of glass words with highlight boxes, tilted in and settling flat"),
    ("prompt", "a prompt box: blur in, camera pushes in, text typed with a caret, pull back, cursor clicks send"),
    ("screen", "an app window swings in from blur; its content image scrolls inside a viewport"),
    ("wall", "a wall of cards with depth of field; the centre card swaps through colour wipes; a button is clicked"),
    ("end", "a logo writes on letter by letter, a glass tagline and a pill; the rest blurs away and the logo grows"),
];

pub fn render<'a>(kind: &str, p: P<'a>, tm: &T, frame: &mut Frame, ctx: &FFramesContext<'a, '_>) -> Svgr<'a> {
    match kind {
        "title" => title::render(p, tm, frame, ctx),
        "window" => window::render(p, tm, frame, ctx),
        "tiles" => tiles::render(p, tm, frame, ctx),
        "caption" => caption::render(p, tm, frame, ctx),
        "prompt" => prompt::render(p, tm, frame, ctx),
        "screen" => screen::render(p, tm, frame, ctx),
        "wall" => wall::render(p, tm, frame, ctx),
        "end" => end::render(p, tm, frame, ctx),
        other => stub(other, p, tm, frame),
    }
}

/// Things drawn above the letterbox (e.g. the cursor at the end of a wall).
pub fn overlay(kind: &str, p: P, t: f32, len: f32) -> Svgr<'static> {
    match kind {
        "title" => title::overlay(p, t, len),
        "window" => window::overlay(p, t, len),
        "tiles" => tiles::overlay(p, t, len),
        "caption" => caption::overlay(p, t, len),
        "prompt" => prompt::overlay(p, t, len),
        "screen" => screen::overlay(p, t, len),
        "wall" => wall::overlay(p, t, len),
        "end" => end::overlay(p, t, len),
        _ => Svgr::empty(),
    }
}

/// Unknown kinds render the backdrop and a label so the timeline still plays.
fn stub<'a>(kind: &str, p: P, tm: &T, frame: &mut Frame) -> Svgr<'a> {
    let bg = kit::bg(frame, &kit::backdrop(p, tm, "turn"));
    let label = format!("{kind} {:.2}s", tm.t);
    fframes::svgr!(<g>
        {bg}
        <text x="640" y="380" text-anchor="middle" font-family="Inter Display" font-size="48" fill="#ffffff">{label}</text>
    </g>)
}
