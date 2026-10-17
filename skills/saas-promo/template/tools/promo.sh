#!/bin/zsh
# Run the engine on a spec:  tools/promo.sh path/to/video.toml <fframes command...>
#   tools/promo.sh examples/bolt-weekend/video.toml render -o out.mp4
#   tools/promo.sh examples/bolt-weekend/video.toml frame 4.2s,7s -o frames
set -e
here=${0:A:h}/..
spec=${1:A}; shift
[ -x $here/target/release/saaspromo ] || (cd $here && cargo build --release)
SPEC=$spec exec $here/target/release/saaspromo "$@"
