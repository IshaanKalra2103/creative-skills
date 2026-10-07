# kawaii-pink template

A 5.5 s, 1080x1080 @ 30 fps logo sting made with [fframes](https://github.com/dmtrKovalenko/fframes),
rendered with the Skia (Metal) backend. See `../SKILL.md`.

```sh
cargo run --release -- --word MOCHI frame 2.5s          # the hold frame
cargo run --release -- --word MOCHI strip -n 36 --columns 6 --width 270
cargo run --release -- --word MOCHI --ink "#ee17bc" --seat 0.56 render -o out.mp4
cargo run --release -- preview                          # real-time window with sound
cargo run --release -- audio analyze                    # loudness
cargo test --release                                    # every frame, default word + A-Z
uv run --with numpy python tools/gen_audio.py media     # regenerate sounds, then touch src/lib.rs
```

| file | what |
| --- | --- |
| `src/lib.rs` | beat sheet, word layout, stars, slurp, echo and boil, audio map |
| `src/glyphs.rs` | the bubble alphabet |
| `src/mascot.rs` | the mascot's states and drawing |
| `src/geom.rs` | easing, springs, splines, path helpers |
| `media/` | synthesized sounds (embedded at compile time) |
