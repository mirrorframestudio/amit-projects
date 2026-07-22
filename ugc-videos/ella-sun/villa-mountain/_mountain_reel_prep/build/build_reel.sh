#!/bin/bash
set -e
R=~/Downloads/ella-sun-final-videos/villa-mountain/prep/reel_9x16
SP=/private/tmp/claude-501/-Users-amitshechter-Projects-onezone-next/f4438cd2-b50f-425a-932e-8fcb6538b57f/scratchpad
OUT=~/Downloads/mountain_REEL_9x16_VO_v13.mp4
XF=0.25

FILES=(family_slow panorama_v2 pool_slow jacuzzi_couple sauna_couple_new outkitchen living_drone bedroom lounge_family couple_terrace_slow endcard_49)
LENS=(4.25 5.04 6.10 2.81 3.05 4.05 3.35 3.05 3.45 4.85 4.80)

INPUTS=""; FC=""; N=${#FILES[@]}
for i in $(seq 0 $((N-1))); do
  INPUTS+=" -i $R/${FILES[$i]}.mp4"
  L=${LENS[$i]}
  FC+="[$i:v]trim=0:$L,setpts=PTS-STARTPTS,scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:-1:-1:black,setsar=1,fps=24,format=yuv420p,settb=1/24[v$i];"
done
prev="v0"; acc=0
for k in $(seq 1 $((N-1))); do
  acc=$(echo "$acc + ${LENS[$((k-1))]}" | bc)
  off=$(echo "$acc - $k*$XF" | bc)
  FC+="[$prev][v$k]xfade=transition=fade:duration=$XF:offset=$off[x$k];"
  prev="x$k"
done
FC="${FC%;}"
ffmpeg -y -hide_banner -v error $INPUTS -filter_complex "$FC" -map "[$prev]" -r 24 -c:v libx264 -pix_fmt yuv420p -crf 18 "$SP/.v13vis.mp4"
echo "visual: $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$SP/.v13vis.mp4")s"

ffmpeg -y -hide_banner -v error \
 -i "$SP/.v13vis.mp4" \
 -i "$SP/L14.wav" -i "$SP/L21.wav" -i "$SP/L16.wav" -i "$SP/L22.wav" \
 -i "$SP/L17.wav" -i "$SP/L18.wav" -i "$SP/L19.wav" -i "$SP/L20.wav" \
 -filter_complex "[1:a]adelay=200|200,aformat=sample_rates=48000:channel_layouts=stereo[a0];[2:a]adelay=7600|7600,aformat=sample_rates=48000:channel_layouts=stereo[a1];[3:a]adelay=14640|14640,aformat=sample_rates=48000:channel_layouts=stereo[a2];[4:a]adelay=19910|19910,aformat=sample_rates=48000:channel_layouts=stereo[a3];[5:a]adelay=23840|23840,aformat=sample_rates=48000:channel_layouts=stereo[a4];[6:a]adelay=29720|29720,aformat=sample_rates=48000:channel_layouts=stereo[a5];[7:a]adelay=32970|32970,aformat=sample_rates=48000:channel_layouts=stereo[a6];[8:a]adelay=38970|38970,aformat=sample_rates=48000:channel_layouts=stereo[a7];[a0][a1][a2][a3][a4][a5][a6][a7]amix=inputs=8:normalize=0,volume=2.0[vo]" \
 -map 0:v -map "[vo]" -c:v libx264 -profile:v high -level 4.1 -pix_fmt yuv420p -r 24 -fps_mode cfr -g 48 -crf 18 \
 -c:a aac -b:a 192k -ar 48000 -movflags +faststart "$OUT"
rm -f "$SP/.v13vis.mp4"
echo "OUT: $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT")s | audio $(ffprobe -v error -select_streams a -show_entries stream=codec_name -of csv=p=0 "$OUT")"