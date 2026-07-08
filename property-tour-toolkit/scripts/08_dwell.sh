#!/usr/bin/env bash
# Generate "dwell" clips — a slow, lingering shot of ONE room (for the LONG cut).
# Unlike the chained flythrough bridges, dwell clips are INDEPENDENT (single image),
# so they parallelize perfectly — launch up to the plan's concurrent-job limit at once.
#
# Usage: ./08_dwell.sh OUT_DIR img1.jpg [img2.jpg ...]
# Output: OUT_DIR/dwell_<name>.mp4 for each image.
#
# DUR default 10s (slow dwell). PROMPT can be overridden per run.
set -uo pipefail
. "$(dirname "$0")/lib.sh"

out="${1:?usage: 08_dwell.sh OUT_DIR img...}"; shift
mkdir -p "$out"
DUR="${DUR:-10}"
MAXPAR="${MAXPAR:-8}"     # concurrent-job cap (Ultra=8, Plus=6)
PROMPT="${PROMPT:-Slow cinematic camera very gently pushing in and drifting across the room, lingering on the space and its details, calm steady motion, photorealistic, no people, no cuts}"

ids=(); names=()
running=0
for img in "$@"; do
  name=$(basename "${img%.*}")
  # simple concurrency throttle
  while [ "$running" -ge "$MAXPAR" ]; do sleep 8; running=$(jobs -rp | wc -l); done
  id=$(gen_single "$img" "$PROMPT" "$DUR") || { echo "skip $name"; continue; }
  echo "launched dwell:$name -> $id"
  ids+=("$id"); names+=("$name")
  running=$((running+1))
done

# download all
for i in "${!ids[@]}"; do
  waitdl "${ids[$i]}" "$out/dwell_${names[$i]}.mp4"
done
echo "done: ${#ids[@]} dwell clips in $out"
