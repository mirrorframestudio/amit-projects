#!/usr/bin/env bash
# Center-crop images to 16:9 and scale to 1280x720.
# Handles both landscape and portrait sources (portrait keeps the middle band).
# Usage: ./02_crop_16x9.sh <out_dir> <img1> [img2 ...]
set -euo pipefail
out="${1:?usage: 02_crop_16x9.sh OUT_DIR IMG...}"; shift
mkdir -p "$out"; i=1
for f in "$@"; do
  # crop=iw:iw*9/16 keeps full width and a centered 16:9-tall band; if the image is
  # too tall this always fits, if too wide we instead crop height-limited.
  ffmpeg -y -loglevel error -i "$f" \
    -vf "crop='min(iw,ih*16/9)':'min(ih,iw*9/16)',scale=1280:720" \
    "$out/$(basename "${f%.*}").jpg"
  echo "cropped $(basename "$f")"
  i=$((i+1))
done
