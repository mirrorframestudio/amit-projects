#!/usr/bin/env bash
# Add a background music track UNDER the voice-over, side-chain ducked so the VO stays clear.
# The video's existing audio (the VO) is kept; music is mixed below it.
#
# Usage: ./07_add_music.sh MASTER_VO.mp4 music.mp3 [OUT=final.mp4]
set -euo pipefail
. "$(dirname "$0")/lib.sh"

video="${1:?MASTER_VO.mp4}"; music="${2:?music.mp3}"; out="${3:-final.mp4}"
total=$(dur "$video")

# music base volume; it ducks further whenever the VO speaks and returns in the gaps
MUSIC_VOL="${MUSIC_VOL:-0.28}"

ffmpeg -y -loglevel error -i "$video" -i "$music" -filter_complex "\
[1:a]aresample=48000,volume=${MUSIC_VOL},atrim=0:${total},afade=t=in:d=2,afade=t=out:st=$(python3 -c "print(round($total-4,3))"):d=4[music];\
[0:a]aresample=48000,asplit=2[vomix][vosc];\
[music][vosc]sidechaincompress=threshold=0.045:ratio=6:attack=5:release=350[mduck];\
[mduck][vomix]amix=inputs=2:normalize=0,alimiter=limit=0.95[aout]" \
 -map 0:v -map "[aout]" -c:v copy -c:a aac -b:a 192k -movflags +faststart "$out"
echo "-> $out (VO + ducked music)"
