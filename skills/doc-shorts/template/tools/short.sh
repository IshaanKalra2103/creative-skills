#!/bin/zsh
# Run the engine on a spec:  tools/short.sh path/to/video.toml <fframes command...>
#   tools/short.sh examples/google-origin/video.toml render -o out.mp4
#   tools/short.sh examples/google-origin/video.toml frame 4.2s -o frames
set -e
here=${0:A:h}/..
spec=${1:A}; shift
[ -x $here/target/release/docshort ] || (cd $here && cargo build --release)
SPEC=$spec exec $here/target/release/docshort "$@"
