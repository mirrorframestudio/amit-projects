#!/usr/bin/env bash
# Convert AVIF (or any) images to JPG.
# Usage: ./01_convert_avif.sh <out_dir> <img1> [img2 ...]
#    or: ./01_convert_avif.sh <out_dir> ~/Downloads/*.avif
set -euo pipefail
out="${1:?usage: 01_convert_avif.sh OUT_DIR IMG...}"; shift
mkdir -p "$out"; i=1
for f in "$@"; do
  ffmpeg -y -loglevel error -i "$f" "$out/img$i.jpg"
  echo "img$i.jpg <- $f"
  i=$((i+1))
done
