# fframes-fx gallery

Every `../shaders/*.sksl` becomes a 2 s scene named after its `fx:` header, so the fframes CLI
addresses effects by name. Filters get `media/test.png` (or the `src:` header's file) as `uSrc`.

```bash
cargo run --release -q -- --check                     # compile every effect with Skia
cargo run --release -q -- --check --only Aurora,Plasma
cargo run --release -q -- frame "Aurora@1s" --only Aurora
cargo run --release -q -- strip Aurora -n 6 --only Aurora
../scripts/compare.sh Aurora                          # compare/Aurora.png: upstream cover | port
```

The effect loader is shared with videos: `src/lib.rs` includes `../templates/fx.rs`.
