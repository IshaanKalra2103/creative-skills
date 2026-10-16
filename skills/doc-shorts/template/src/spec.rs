//! The video spec: one TOML file describes a whole short (shots, timing, look, audio).
//! See `references/spec.md` for the format and `references/shots.md` for every shot kind.
use std::path::{Path, PathBuf};
use std::sync::LazyLock;
use toml::{Table, Value};

// ── typed access to a shot's params ─────────────────────────────────────────────────────

/// Typed, defaulted access to a TOML table: a shot's params or a nested table inside them.
/// Every getter returns the default when the key is missing or has the wrong type, so a
/// spec only names what it changes.
#[derive(Clone, Copy)]
pub struct P<'a>(pub &'a Table);

static EMPTY: LazyLock<Table> = LazyLock::new(Table::new);

fn num(v: Option<&Value>) -> Option<f32> {
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
    /// An array of tables, e.g. `cards = [{ image = "a.jpg", label = "A" }, ...]`.
    pub fn list(&self, k: &str) -> Vec<P<'a>> {
        match self.0.get(k) {
            Some(Value::Array(a)) => a.iter().filter_map(|v| v.as_table().map(P)).collect(),
            _ => vec![],
        }
    }
}

// ── the spec ────────────────────────────────────────────────────────────────────────────

/// One spoken word with its start/end in seconds (from `build/words.json`).
#[derive(Debug, Clone)]
pub struct Word {
    pub w: String,
    pub s: f32,
    pub e: f32,
}

#[derive(Debug, Clone)]
pub struct ShotSpec {
    pub kind: String,
    /// First tick (10 per second) and the tick where the next shot starts.
    pub k0: i32,
    pub k1: i32,
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
    /// Folder of the spec file: plates load from `<dir>/assets`, audio from `<dir>/audio`.
    pub dir: PathBuf,
    pub look: Table,
    pub shots: Vec<ShotSpec>,
    /// Exclusive end tick; the video is `tick_frame(end_tick)` frames long.
    pub end_tick: i32,
    pub audio: Vec<AudioSpec>,
    pub words: Vec<Word>,
}

fn norm(s: &str) -> String {
    s.chars().filter(|c| c.is_alphanumeric()).flat_map(|c| c.to_lowercase()).collect()
}

fn read_words(dir: &Path) -> Vec<Word> {
    let Ok(text) = std::fs::read_to_string(dir.join("build/words.json")) else { return vec![] };
    let Ok(serde_json::Value::Array(items)) = serde_json::from_str::<serde_json::Value>(&text) else { return vec![] };
    items
        .iter()
        .filter_map(|v| Some(Word { w: v.get("w")?.as_str()?.to_string(), s: v.get("s")?.as_f64()? as f32, e: v.get("e")?.as_f64()? as f32 }))
        .collect()
}

/// Time of a `cue`: a word (`"Stanford"`), or `{ word = "the", nth = 2, offset = -0.1 }`.
fn cue_time(cue: &Value, words: &[Word]) -> Result<f32, String> {
    let (word, nth, offset) = match cue {
        Value::String(w) => (w.as_str(), 1, 0.0),
        Value::Table(t) => (
            t.get("word").and_then(|v| v.as_str()).ok_or("cue table needs `word`")?,
            t.get("nth").and_then(|v| v.as_integer()).unwrap_or(1),
            num(t.get("offset")).unwrap_or(0.0),
        ),
        _ => return Err("cue must be a word or a table".into()),
    };
    if words.is_empty() {
        return Err(format!("cue \"{word}\" needs build/words.json (run tools/vo.py or tools/words.py)"));
    }
    let target = norm(word);
    words
        .iter()
        .filter(|w| norm(&w.w) == target)
        .nth((nth.max(1) - 1) as usize)
        .map(|w| w.s + offset)
        .ok_or_else(|| format!("cue word \"{word}\" (occurrence {nth}) is not in the voiceover"))
}

impl Spec {
    pub fn load(path: &Path) -> Result<Spec, String> {
        let dir = path.parent().map(Path::to_path_buf).unwrap_or_else(|| PathBuf::from("."));
        let text = std::fs::read_to_string(path).map_err(|e| format!("{}: {e}", path.display()))?;
        let root: Table = text.parse().map_err(|e: toml::de::Error| format!("{}: {e}", path.display()))?;
        let video = root.get("video").and_then(|v| v.as_table()).cloned().unwrap_or_default();
        let look = root.get("look").and_then(|v| v.as_table()).cloned().unwrap_or_default();
        let words = read_words(&dir);

        // shots: [[shot]] in the main file, plus every *.toml in `video.shots_dir`
        let mut raw: Vec<Table> = root
            .get("shot")
            .and_then(|v| v.as_array())
            .map(|a| a.iter().filter_map(|v| v.as_table().cloned()).collect())
            .unwrap_or_default();
        if let Some(sd) = video.get("shots_dir").and_then(|v| v.as_str()) {
            let mut files: Vec<PathBuf> = std::fs::read_dir(dir.join(sd))
                .map_err(|e| format!("shots_dir {sd}: {e}"))?
                .filter_map(|e| e.ok().map(|e| e.path()))
                .filter(|p| p.extension().is_some_and(|x| x == "toml"))
                .collect();
            files.sort();
            for f in files {
                let t: Table = std::fs::read_to_string(&f)
                    .map_err(|e| e.to_string())?
                    .parse()
                    .map_err(|e: toml::de::Error| format!("{}: {e}", f.display()))?;
                if let Some(a) = t.get("shot").and_then(|v| v.as_array()) {
                    raw.extend(a.iter().filter_map(|v| v.as_table().cloned()));
                }
            }
        }

        let mut shots = Vec::new();
        for (i, t) in raw.into_iter().enumerate() {
            let kind = t.get("kind").and_then(|v| v.as_str()).unwrap_or("stub").to_string();
            let at = match (num(t.get("at")), t.get("cue")) {
                (Some(at), _) => at,
                (None, Some(c)) => cue_time(c, &words).map_err(|e| format!("shot {i} ({kind}): {e}"))?,
                (None, None) => return Err(format!("shot {i} ({kind}) needs `at` (seconds) or `cue` (a word)")),
            };
            let k0 = if t.contains_key("at") { (at * 10.0).round() as i32 } else { (at * 10.0).floor() as i32 };
            shots.push(ShotSpec { kind, k0: k0.max(0), k1: 0, params: t });
        }
        shots.sort_by_key(|s| s.k0);
        if shots.is_empty() {
            return Err("the spec has no [[shot]]".into());
        }
        shots[0].k0 = 0;

        let end_tick = match num(video.get("end")) {
            Some(end) => (end * 10.0).round() as i32,
            None => match words.last() {
                Some(w) => ((w.e + num(video.get("tail")).unwrap_or(1.0)) * 10.0).ceil() as i32,
                None => return Err("set video.end (seconds), or provide build/words.json".into()),
            },
        };
        let n = shots.len();
        for i in 0..n {
            shots[i].k1 = if i + 1 < n { shots[i + 1].k0 } else { end_tick };
            if shots[i].k1 <= shots[i].k0 {
                return Err(format!("shot {i} ({}) starts at tick {} but has no length", shots[i].kind, shots[i].k0));
            }
        }

        let audio = match video.get("audio") {
            Some(Value::String(f)) => vec![AudioSpec { file: f.clone(), gain: 0.0, at: 0.0 }],
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

        Ok(Spec { dir, look, shots, end_tick, audio, words })
    }
}
