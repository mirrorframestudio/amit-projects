#!/usr/bin/env bash
# Build ONE seamless segment from an ordered list of photos.
# Generates a Kling pro bridge between each consecutive pair, chaining each bridge's
# start image to the PREVIOUS bridge's rendered last frame -> invisible seams.
#
# Usage: ./04_chain.sh NAME img1.jpg img2.jpg img3.jpg [...]
# Output: out/NAME.mp4  (+ per-bridge clips in out/NAME_bridges/)
#
# Tip: order the photos so each is "ahead" of the previous (forward walk or steady orbit).
# Tip: for a big move (pull-back / stair climb) bump DUR to 10 for that bridge, then speed
#      it 2x later if it outpaces the narration:  ffmpeg -i b.mp4 -vf setpts=0.5*PTS -an f.mp4
set -euo pipefail
. "$(dirname "$0")/lib.sh"

name="${1:?usage: 04_chain.sh NAME img1 img2 ...}"; shift
imgs=("$@")
[ "${#imgs[@]}" -ge 2 ] || { echo "need >=2 images"; exit 1; }

DUR="${DUR:-5}"
PROMPT="${PROMPT:-Smooth cinematic drone flythrough gliding steadily forward through the space, revealing the room and its surroundings, continuous steady camera motion, photorealistic, no people, no cuts}"

bdir="out/${name}_bridges"; mkdir -p "$bdir"
start="${imgs[0]}"
inputs=()
for i in $(seq 1 $((${#imgs[@]}-1))); do
  end="${imgs[$i]}"
  echo "== bridge $i: $(basename "$start") -> $(basename "$end") =="
  id=$(gen "$start" "$end" "$PROMPT" "$DUR") || exit 1
  waitdl "$id" "$bdir/b$i.mp4"
  last_frame "$bdir/b$i.mp4" "$bdir/b${i}_last.png"
  start="$bdir/b${i}_last.png"          # chain: next bridge starts from this rendered frame
  inputs+=("$bdir/b$i.mp4")
done

# plain concat (seams are frame-matched -> invisible)
mkdir -p out
: > "$bdir/list.txt"
for f in "${inputs[@]}"; do echo "file '$(cd "$(dirname "$f")" && pwd)/$(basename "$f")'" >> "$bdir/list.txt"; done
ffmpeg -y -loglevel error -f concat -safe 0 -i "$bdir/list.txt" \
  -c:v libx264 -pix_fmt yuv420p -crf 20 -preset medium -movflags +faststart "out/$name.mp4"
echo "-> out/$name.mp4 ($(dur "out/$name.mp4")s)"
