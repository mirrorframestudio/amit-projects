#!/usr/bin/env bash
# Generate ONE Kling 3.0 pro bridge clip: camera flies from START image to END image.
# Usage: ./03_bridge.sh START.jpg END.jpg OUT.mp4 [DURATION=5] ["PROMPT"]
set -euo pipefail
. "$(dirname "$0")/lib.sh"

start="${1:?START.jpg}"; end="${2:?END.jpg}"; out="${3:?OUT.mp4}"; dur="${4:-5}"
prompt="${5:-Smooth cinematic drone flythrough gliding steadily forward from one space into the next, continuous steady camera motion, photorealistic, no people, no cuts}"

id=$(gen "$start" "$end" "$prompt" "$dur") || exit 1
echo "job: $id"
waitdl "$id" "$out"
