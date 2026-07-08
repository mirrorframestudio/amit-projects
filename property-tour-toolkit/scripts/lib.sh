#!/usr/bin/env bash
# Shared helpers for the AI property-tour toolkit.
# Requires: higgsfield CLI (authed), ffmpeg, ffprobe, python3, curl.
# source this from the other scripts:  . "$(dirname "$0")/lib.sh"

set -uo pipefail

# ---- Kling 3.0 pro bridge generation -------------------------------------------------
# gen START_IMG END_IMG "PROMPT" [DURATION=5]  -> prints the job id
gen() {
  local start="$1" end="$2" prompt="$3" dur="${4:-5}" out id tries=0
  while [ "$tries" -lt 6 ]; do
    out=$(higgsfield generate create kling3_0 --mode pro \
            --start-image "$start" --end-image "$end" \
            --prompt "$prompt" --duration "$dur" \
            --aspect_ratio 16:9 --sound off --json 2>&1)
    if echo "$out" | grep -q rate_limit; then sleep 15; tries=$((tries+1)); continue; fi
    # create returns a JSON array ["id"]  (not an object)
    id=$(echo "$out" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d[0] if isinstance(d,list) else d.get('id',''))" 2>/dev/null)
    [ -n "$id" ] && { echo "$id"; return 0; }
    echo "gen ERROR: $out" >&2; return 1
  done
  echo "gen: gave up (rate limited)" >&2; return 1
}

# gen_single START_IMG "PROMPT" [DURATION=5]  -> single-image motion (no end frame)
gen_single() {
  local start="$1" prompt="$2" dur="${3:-5}" out id tries=0
  while [ "$tries" -lt 6 ]; do
    out=$(higgsfield generate create kling3_0 --mode pro \
            --start-image "$start" --prompt "$prompt" --duration "$dur" \
            --aspect_ratio 16:9 --sound off --json 2>&1)
    if echo "$out" | grep -q rate_limit; then sleep 15; tries=$((tries+1)); continue; fi
    id=$(echo "$out" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d[0] if isinstance(d,list) else d.get('id',''))" 2>/dev/null)
    [ -n "$id" ] && { echo "$id"; return 0; }
    echo "gen_single ERROR: $out" >&2; return 1
  done; return 1
}

# waitdl JOB_ID OUT.mp4  -> polls until completed, downloads the result
waitdl() {
  local id="$1" out="$2" s u
  for _ in $(seq 1 60); do
    s=$(higgsfield generate get "$id" --json 2>/dev/null | python3 -c "import sys,json;print(json.load(sys.stdin).get('status',''))")
    [ "$s" = "completed" ] && break
    [ "$s" = "failed" ] && { echo "waitdl: job $id FAILED" >&2; return 1; }
    sleep 12
  done
  u=$(higgsfield generate get "$id" --json 2>/dev/null | python3 -c "import sys,json;print(json.load(sys.stdin)['result_url'])")
  curl -s -o "$out" "$u"
  echo "downloaded $out ($(dur "$out")s)"
}

# last_frame IN.mp4 OUT.png  -> extract the last frame (for chaining bridges)
last_frame() { ffmpeg -y -loglevel error -sseof -0.05 -i "$1" -vframes 1 "$2"; }

# dur FILE  -> duration in seconds
dur() { ffprobe -v error -show_entries format=duration -of csv=p=0 "$1"; }

# clean_vo IN.wav OUT.wav  -> high-pass + compress + loudnorm to -16 LUFS, stereo 48k
clean_vo() {
  ffmpeg -y -loglevel error -i "$1" \
    -af "highpass=f=90,acompressor=threshold=-18dB:ratio=3:attack=5:release=120,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000" \
    -ac 2 "$2"
}
