#!/usr/bin/env bash
# Assemble segments into one master video.
# - Frame-matched segments (a segment chained from the previous one's last frame) -> plain concat.
# - Disconnected areas (garden<->interior, indoor<->outdoor) -> 1s dissolve (xfade).
#
# EDIT the SEGMENTS array and the dissolve points below for your project, then run.
# This is a template — the offsets must be computed from your segment durations.
#
# xfade offset rule: when crossfading A (dur a) into B with transition T,
#   offset = a - T ; and the combined duration becomes a + b - T.
set -euo pipefail
. "$(dirname "$0")/lib.sh"

# ---- EDIT THESE ----------------------------------------------------------------------
SEGMENTS=(
  garden.mp4          # 0
  interior.mp4        # 1
  living_to_stairs.mp4# 2  (chained into bedrooms -> seamless)
  bedrooms.mp4        # 3
  outdoor.mp4         # 4
  dusk.mp4            # 5  (final; gets a hold via tpad)
)
T=1.0                 # dissolve length (s)
DUSK_HOLD=3.5         # extra freeze on the last frame (s) so a closing line can breathe
OUT=master.mp4
# --------------------------------------------------------------------------------------

# helper: numeric add
add() { python3 -c "print(round($1+$2,6))"; }
sub() { python3 -c "print(round($1-$2,6))"; }

d0=$(dur "${SEGMENTS[0]}"); d1=$(dur "${SEGMENTS[1]}"); d2=$(dur "${SEGMENTS[2]}")
d3=$(dur "${SEGMENTS[3]}"); d4=$(dur "${SEGMENTS[4]}"); d5=$(dur "${SEGMENTS[5]}")

# seg23 = living_to_stairs + bedrooms (seamless concat)
seg23=$(add "$d2" "$d3")
o1=$(sub "$d0" "$T")                              # garden -> interior
A=$(sub "$(add "$d0" "$d1")" "$T")
o2=$(sub "$A" "$T")                               # A -> seg23
B=$(sub "$(add "$A" "$seg23")" "$T")
o3=$(sub "$B" "$T")                               # B -> outdoor
C=$(sub "$(add "$B" "$d4")" "$T")
o4=$(sub "$C" "$T")                               # C -> dusk

echo "offsets: $o1 $o2 $o3 $o4  (dusk hold ${DUSK_HOLD}s)"

ffmpeg -y -loglevel error \
 -i "${SEGMENTS[0]}" -i "${SEGMENTS[1]}" -i "${SEGMENTS[2]}" -i "${SEGMENTS[3]}" -i "${SEGMENTS[4]}" -i "${SEGMENTS[5]}" \
 -filter_complex "\
[0:v]fps=24,settb=1/24,setpts=PTS-STARTPTS[v0];[1:v]fps=24,settb=1/24,setpts=PTS-STARTPTS[v1];\
[2:v]fps=24,settb=1/24,setpts=PTS-STARTPTS[v2];[3:v]fps=24,settb=1/24,setpts=PTS-STARTPTS[v3];\
[4:v]fps=24,settb=1/24,setpts=PTS-STARTPTS[v4];[5:v]fps=24,settb=1/24,setpts=PTS-STARTPTS,tpad=stop_duration=${DUSK_HOLD}:stop_mode=clone[v5];\
[v2][v3]concat=n=2:v=1:a=0,settb=1/24[s23];\
[v0][v1]xfade=transition=fade:duration=${T}:offset=${o1},settb=1/24[a];\
[a][s23]xfade=transition=fade:duration=${T}:offset=${o2},settb=1/24[b];\
[b][v4]xfade=transition=fade:duration=${T}:offset=${o3},settb=1/24[c];\
[c][v5]xfade=transition=fade:duration=${T}:offset=${o4}[v]" \
 -map "[v]" -c:v libx264 -pix_fmt yuv420p -crf 20 -preset medium -movflags +faststart "$OUT"
echo "-> $OUT ($(dur "$OUT")s)"
