//! The video spec: one TOML file describes a whole promo (palette, look, music, scenes).
//! See `references/spec.md` for the format and `references/kinds.md` for every scene kind.
use std::path::{Path, PathBuf};
use std::sync::LazyLock;
use toml::{Table, Value};

// ── typed access to a scene's params ────────────────────────────────────────────────────

/// Typed, defaulted access to a TOML table: a scene's params or a nested table inside them.
/// Every getter returns the default when the key is missing or has the wrong type, so a
/// spec only names what it changes.
#[derive(Clone, Copy)]
pub struct P<'a>(pub &'a Table);

static EMPTY: LazyLock<Table> = LazyLock::new(Table::new);

pub fn num(v: Option<&Value>) -> Option<f32> {
    match v {
        Some(Value::Float(x)) => Some(*x as f32),
        Some(Value::Integer(i)) => Some(*i as f32),
        _ => None,
    }
}

impl<'a> P<'a> {
    pub fn empty() -> P<'static> {
        P(&EMPTY)
    }
    pub fn has(&self, k: &str) -> bool {
        self.0.contains_key(k)
    }
    pub fn f(&self, k: &str, d: f32) -> f32 {
        num(self.0.get(k)).unwrap_or(d)
    }
    pub fn i(&self, k: &str, d: i64) -> i64 {
        match self.0.get(k) {
            Some(Value::Integer(i)) => *i,
            Some(Value::Float(x)) => *x as i64,
            _ => d,
        }
    }
    pub fn b(&self, k: &str, d: bool) -> bool {
        match self.0.get(k) {
            Some(Value::Boolean(b)) => *b,
            _ => d,
        }
    }
    pub fn s(&self, k: &str, d: &'a str) -> &'a str {
        self.opt(k).unwrap_or(d)
    }
    pub fn opt(&self, k: &str) -> Option<&'a str> {
        match self.0.get(k) {
            Some(Value::String(s)) => Some(s.as_str()),
            _ => None,
        }
    }
    /// A string or an array of strings (`"a"` and `["a"]` both give `["a"]`).
    pub fn strs(&self, k: &str) -> Vec<&'a str> {
        match self.0.get(k) {
            Some(Value::String(s)) => vec![s.as_str()],
            Some(Value::Array(a)) => a.iter().filter_map(|v| v.as_str()).collect(),
            _ => vec![],
        }
    }
    /// A number or an array of numbers.
    pub fn fs(&self, k: &str) -> Vec<f32> {
        match self.0.get(k) {
            Some(Value::Array(a)) => a.iter().filter_map(|v| num(Some(v))).collect(),
            v => num(v).into_iter().collect(),
        }
    }
    /// An array of number arrays, e.g. keyframes `[[t, x, y, zoom], ...]`.
    pub fn rows(&self, k: &str) -> Vec<Vec<f32>> {
        match self.0.get(k) {
            Some(Value::Array(a)) => a
                .iter()
                .filter_map(|r| r.as_array().map(|r| r.iter().filter_map(|v| num(Some(v))).collect()))
                .collect(),
            _ => vec![],
        }
    }
    /// A nested table (empty when missing).
    pub fn sub(&self, k: &str) -> P<'a> {
        match self.0.get(k) {
            Some(Value::Table(t)) => P(t),
            _ => P(&EMPTY),
        }
    }
    /// An array of tables, e.g. `cards = [{ image = "a.png" }, ...]`.
    pub fn list(&self, k: &str) -> Vec<P<'a>> {
        match self.0.get(k) {
            Some(Value::Array(a)) => a.iter().filter_map(|v| v.as_table().map(P)).collect(),
            _ => vec![],
        }
    }
}

// ── the spec ────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone)]
pub struct SceneSpec {
    pub kind: String,
    /// Start and end in seconds (the next scene's start).
    pub t0: f32,
    pub t1: f32,
    pub params: Table,
}

#[derive(Debug, Clone)]
pub struct AudioSpec {
    pub file: String,
    pub gain: f32,
    pub at: f32,
}

#[derive(Debug)]
pub struct Spec {
    /// Folder of the spec file: images and fonts load from `<dir>/assets`, music from `<dir>/audio`.
    pub dir: PathBuf,
    pub palette: Table,
    pub look: Table,
    pub scenes: Vec<SceneSpec>,
    pub end: f32,
    pub audio: Vec<AudioSpec>,
}

/// Beat times (seconds) from `build/beats.json` (written by `tools/beats.py`).
fn read_beats(dir: &Path) -> Vec<f32> {
    let Ok(text) = std::fs::read_to_string(dir.join("build/beats.json")) else { return vec![] };
    let Ok(v) = serde_json::from_str::<serde_json::Value>(&text) else { return vec![] };
    let arr = v.get("beats").and_then(|b| b.as_array()).cloned().or_else(|| v.as_array().cloned()).unwrap_or_default();
    arr.iter().filter_map(|x| x.as_f64().map(|x| x as f32)).collect()
}

impl Spec {
    pub fn load(path: &Path) -> Result<Spec, String> {
        let dir = path.parent().map(Path::to_path_buf).unwrap_or_else(|| PathBuf::from("."));
        let text = std::fs::read_to_string(path).map_err(|e| format!("{}: {e}", path.display()))?;
        let root: Table = text.parse().map_err(|e: toml::de::Error| format!("{}: {e}", path.display()))?;
        let video = root.get("video").and_then(|v| v.as_table()).cloned().unwrap_or_default();
        let palette = root.get("palette").and_then(|v| v.as_table()).cloned().unwrap_or_default();
        let look = root.get("look").and_then(|v| v.as_table()).cloned().unwrap_or_default();
        let vp = P(&video);

        // music: a tempo turns `beats = n` into seconds; build/beats.json (tools/beats.py)
        // gives the real beat grid that scene starts snap to
        let bpm = vp.f("bpm", 0.0);
        let beat0 = vp.f("beat_offset", 0.0);
        let mut grid = read_beats(&dir);
        if grid.is_empty() && bpm > 0.0 {
            let step = 60.0 / bpm;
            grid = (0..2000).map(|i| beat0 + i as f32 * step).collect();
        }
        let snap = vp.b("snap", !grid.is_empty());
        let snap_tol = vp.f("snap_tolerance", 0.15);
        let beat_len = if bpm > 0.0 { 60.0 / bpm } else { 0.5 };

        let raw: Vec<Table> = root
            .get("scene")
            .and_then(|v| v.as_array())
            .map(|a| a.iter().filter_map(|v| v.as_table().cloned()).collect())
            .unwrap_or_default();
        if raw.is_empty() {
            return Err("the spec has no [[scene]]".into());
        }
        let pace = P(&look).f("pace", 1.0);
        let mut scenes = Vec::new();
        let mut t = 0.0f32;
        for (i, mut tb) in raw.into_iter().enumerate() {
            // image lists may name files directly: `center = ["a.png", "b.png"]` and
            // `layers = ["a.png"]` mean `[{ image = "a.png" }, ...]`
            for key in ["center", "layers", "content_layers"] {
                if let Some(Value::Array(a)) = tb.get_mut(key) {
                    for v in a.iter_mut() {
                        if let Value::String(f) = v {
                            let mut t = Table::new();
                            t.insert("image".into(), Value::String(f.clone()));
                            *v = Value::Table(t);
                        }
                    }
                }
            }
            let p = P(&tb);
            let kind = p.s("kind", "stub").to_string();
            let start = if p.has("at") { p.f("at", t) } else { t };
            let dur = if p.has("beats") {
                p.f("beats", 4.0) * beat_len
            } else if p.has("dur") {
                p.f("dur", 2.0)
            } else {
                return Err(format!("scene {i} ({kind}) needs `dur` (seconds) or `beats`"));
            } * if p.b("pace_dur", false) { pace } else { 1.0 };
            let mut s0 = start;
            if snap && i > 0 && !p.b("no_snap", false) {
                if let Some(b) = grid.iter().min_by(|a, b| (*a - start).abs().total_cmp(&(*b - start).abs())) {
                    if (b - start).abs() <= snap_tol {
                        s0 = *b;
                    }
                }
            }
            scenes.push(SceneSpec { kind, t0: s0.max(0.0), t1: 0.0, params: tb });
            t = s0 + dur;
        }
        scenes[0].t0 = 0.0;
        let end = vp.f("end", t);
        let n = scenes.len();
        for i in 0..n {
            scenes[i].t1 = if i + 1 < n { scenes[i + 1].t0 } else { end };
            if scenes[i].t1 <= scenes[i].t0 + 0.05 {
                return Err(format!("scene {i} ({}) starts at {:.2}s but has no length", scenes[i].kind, scenes[i].t0));
            }
        }

        let audio = match video.get("audio") {
            Some(Value::String(f)) => vec![AudioSpec { file: f.clone(), gain: 0.0, at: 0.0 }],
            Some(Value::Table(t)) => vec![AudioSpec {
                file: t.get("file").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                gain: num(t.get("gain")).unwrap_or(0.0),
                at: num(t.get("at")).unwrap_or(0.0),
            }],
            Some(Value::Array(a)) => a
                .iter()
                .filter_map(|v| match v {
                    Value::String(f) => Some(AudioSpec { file: f.clone(), gain: 0.0, at: 0.0 }),
                    Value::Table(t) => Some(AudioSpec {
                        file: t.get("file")?.as_str()?.to_string(),
                        gain: num(t.get("gain")).unwrap_or(0.0),
                        at: num(t.get("at")).unwrap_or(0.0),
                    }),
                    _ => None,
                })
                .collect(),
            _ => vec![],
        };
        // a track that isn't in audio/ is skipped (the film renders silent) instead of failing
        let audio = audio.into_iter().filter(|a| !a.file.is_empty() && dir.join("audio").join(&a.file).exists()).collect();

        Ok(Spec { dir, palette, look, scenes, end, audio })
    }
}
