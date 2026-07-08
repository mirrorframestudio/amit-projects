#!/usr/bin/env bash
# Place per-line voice-over clips onto the master video, synced to each visual section.
# Generate ONE TTS clip per script line (vo1.wav, vo2.wav, ...) and drop them in VO_DIR.
# Set TARGETS to the second each line should START (aligned to when its section appears).
#
# Usage: ./06_place_vo.sh MASTER.mp4 VO_DIR [OUT=master_vo.mp4]
set -euo pipefail
. "$(dirname "$0")/lib.sh"

master="${1:?MASTER.mp4}"; vodir="${2:?VO_DIR}"; out="${3:-master_vo.mp4}"
total=$(dur "$master")

# ---- EDIT: one start-time (seconds) per line, in order ----
TARGETS=(1 19.5 27.5 42 51.5 56.5 66 81 91.5 98)
# -----------------------------------------------------------

# clean each line to a consistent level
tmp=$(mktemp -d); i=1; inputs=(); filters=""; labels=""
for t in "${TARGETS[@]}"; do
  src="$vodir/vo$i.wav"
  [ -f "$src" ] || { echo "missing $src"; exit 1; }
  clean_vo "$src" "$tmp/c$i.wav"
  ms=$(python3 -c "print(int($t*1000))")
  inputs+=(-i "$tmp/c$i.wav")
  filters+="[$((i-1))]adelay=${ms}|${ms}[a$i];"
  labels+="[a$i]"
  i=$((i+1))
done
n=$((i-1))

ffmpeg -y -loglevel error "${inputs[@]}" -filter_complex \
  "${filters}${labels}amix=inputs=${n}:normalize=0,apad=whole_dur=${total},atrim=0:${total},alimiter=limit=0.95[vo]" \
  -map "[vo]" "$tmp/vo_timed.wav"

ffmpeg -y -loglevel error -i "$master" -i "$tmp/vo_timed.wav" \
  -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "$out"
echo "-> $out (VO synced, no music)"
echo "placed $n lines. Verify: ffmpeg -i $tmp/vo_timed.wav -af silencedetect=noise=-40dB:d=0.7 -f null -"
