//! fx.rs: load fframes-fx effects with the defaults documented in their headers.
//!
//! Copy this file next to your video's `lib.rs` (`mod fx;`) and the effects you use into
//! `src/shaders/`. An effect file starts with a comment header:
//!
//! ```text
//! // fx: Aurora
//! // kind: generator            generator | overlay | filter | mask
//! // blend: screen              overlays: the mix-blend-mode to composite with
//! // src: shape.png             filters in the gallery: which test image feeds uSrc
//! // uniform: uSpeed float 5
//! // uniform: uColorA color #a533f8
//! ```
//!
//! ```rust
//! static AURORA: LazyLock<fx::Fx> = LazyLock::new(|| fx::Fx::parse("Aurora.sksl", include_str!("shaders/Aurora.sksl")).unwrap());
//! // in render_frame: defaults, with overrides by name
//! let layer = AURORA.draw(&frame, &[("uSpeed", fx::Uniform::Float(2.0))]);
//! fframes::svgr!(<image href={layer.href()} x="0" y="0" width="1920" height="1080" />)
//! ```
use fframes::media::ImageData;
use fframes::{Color, Frame, Shader, ShaderUniforms};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Kind {
    Generator,
    Overlay,
    Filter,
    Mask,
}

#[derive(Debug, Clone)]
pub enum Uniform {
    Float(f32),
    Float2(f32, f32),
    Float3(f32, f32, f32),
    Float4(f32, f32, f32, f32),
    Int(i32),
    Color(Color),
}

#[derive(Debug)]
pub struct Fx {
    pub name: &'static str,
    pub kind: Kind,
    /// Overlays: the CSS mix-blend-mode the effect was designed for.
    pub blend: String,
    /// Filters in the gallery: image in `media/` bound to `uSrc`.
    pub src: &'static str,
    pub shader: Shader,
    /// Header defaults, in declaration order.
    pub uniforms: Vec<(String, Uniform)>,
}

fn nums(parts: &[&str]) -> Vec<f32> {
    parts.iter().filter_map(|p| p.parse().ok()).collect()
}

impl Fx {
    /// Parse the header of an effect file. Unknown header lines are ignored.
    pub fn parse(file_name: &str, source: &str) -> Result<Fx, String> {
        let mut name = file_name.trim_end_matches(".sksl").to_string();
        let mut kind = Kind::Generator;
        let mut blend = "normal".to_string();
        let mut src = "test.png".to_string();
        let mut uniforms = Vec::new();
        for line in source.lines().take_while(|l| l.trim_start().starts_with("//")) {
            let line = line.trim_start().trim_start_matches("//").trim();
            let Some((key, value)) = line.split_once(':') else { continue };
            let value = value.trim();
            let first = value.split_whitespace().next().unwrap_or("");
            match key.trim() {
                "fx" => name = value.to_string(),
                "kind" => {
                    kind = match first {
                        "generator" => Kind::Generator,
                        "overlay" => Kind::Overlay,
                        "filter" => Kind::Filter,
                        "mask" => Kind::Mask,
                        other => return Err(format!("{file_name}: unknown kind `{other}`")),
                    }
                }
                "blend" => blend = first.to_string(),
                "src" => src = first.to_string(),
                "uniform" => {
                    let parts: Vec<&str> = value.split_whitespace().collect();
                    let (Some(uname), Some(ty)) = (parts.first(), parts.get(1)) else {
                        return Err(format!("{file_name}: bad uniform line `{line}`"));
                    };
                    let n = nums(&parts[2..]);
                    let get = |i: usize| n.get(i).copied().unwrap_or(0.0);
                    let u = match *ty {
                        "float" => Uniform::Float(get(0)),
                        "float2" => Uniform::Float2(get(0), get(1)),
                        "float3" => Uniform::Float3(get(0), get(1), get(2)),
                        "float4" => Uniform::Float4(get(0), get(1), get(2), get(3)),
                        "int" => Uniform::Int(get(0) as i32),
                        "color" => Uniform::Color(Color::hex(parts.get(2).copied().unwrap_or("#ffffff"))),
                        other => return Err(format!("{file_name}: unknown uniform type `{other}`")),
                    };
                    uniforms.push((uname.to_string(), u));
                }
                _ => {}
            }
        }
        Ok(Fx {
            name: Box::leak(name.into_boxed_str()),
            kind,
            blend,
            src: Box::leak(src.into_boxed_str()),
            shader: Shader::sksl(source.to_string()),
            uniforms,
        })
    }

    /// Header defaults with `overrides` swapped in by name.
    pub fn uniforms(&self, overrides: &[(&str, Uniform)]) -> ShaderUniforms {
        let mut u = ShaderUniforms::new();
        let set = |u: ShaderUniforms, name: String, value: &Uniform| match *value {
            Uniform::Float(a) => u.float(name, a),
            Uniform::Float2(a, b) => u.float2(name, a, b),
            Uniform::Float3(a, b, c) => u.float3(name, a, b, c),
            Uniform::Float4(a, b, c, d) => u.float4(name, a, b, c, d),
            Uniform::Int(a) => u.int(name, a),
            Uniform::Color(c) => u.color(name, c),
        };
        for (name, value) in &self.uniforms {
            let value = overrides.iter().find(|(n, _)| n == name).map(|(_, v)| v).unwrap_or(value);
            u = set(u, name.clone(), value);
        }
        for (name, value) in overrides {
            if !self.uniforms.iter().any(|(n, _)| n == name) {
                u = set(u, name.to_string(), value);
            }
        }
        u
    }

    /// Draw a generator, overlay or mask. Place the result with `<image href={layer.href()} ...>`.
    pub fn draw(&self, frame: &Frame, overrides: &[(&str, Uniform)]) -> ImageData<'static> {
        self.shader.draw(frame, self.uniforms(overrides))
    }

    /// Draw a filter over `src` (an image, or a synced video frame via `into_image()`).
    pub fn filter(&self, frame: &Frame, src: &ImageData<'_>, src_w: f32, src_h: f32, overrides: &[(&str, Uniform)]) -> ImageData<'static> {
        self.shader.draw(frame, self.uniforms(overrides).image("uSrc", src).float2("uSrcSize", src_w, src_h))
    }
}

/// Load every `*.sksl` in `dir`, sorted by file name; `only` keeps the listed effect names.
pub fn load_dir(dir: &std::path::Path, only: &[String]) -> Result<Vec<Fx>, String> {
    let mut entries: Vec<_> = std::fs::read_dir(dir)
        .map_err(|e| format!("{}: {e}", dir.display()))?
        .filter_map(|e| e.ok())
        .map(|e| e.path())
        .filter(|p| p.extension().is_some_and(|x| x == "sksl"))
        .collect();
    entries.sort();
    let mut out = Vec::new();
    for path in entries {
        let file_name = path.file_name().unwrap().to_string_lossy().to_string();
        let source = std::fs::read_to_string(&path).map_err(|e| format!("{file_name}: {e}"))?;
        let fx = Fx::parse(&file_name, &source)?;
        if only.is_empty() || only.iter().any(|o| o.eq_ignore_ascii_case(fx.name)) {
            out.push(fx);
        }
    }
    Ok(out)
}
