#!/bin/zsh
# Villa Cocos 9:16 short — assemble 12 AI shots + endcard with VO (no music yet)
# Shot order: 01,02,03,04,05,06,07,12,08,09,10,11 → endcard
# VO starts (ms): s1=600 s2=5400 s3=10500 s4=25600 s5=30700 s6=40700 s7=55900
cd "$(dirname "$0")" || exit 1
S=ai_shots_9x16

ffmpeg -y \
  -i $S/01_exterior.mp4 \
  -i $S/02_pool.mp4 \
  -i $S/03_outdoor_kitchen.mp4 \
  -i $S/04_jacuzzi.mp4 \
  -i $S/05_garden_pingpong.mp4 \
  -i $S/06_living.mp4 \
  -i $S/07_kitchen.mp4 \
  -i $S/12_family_dinner.mp4 \
  -i $S/08_master.mp4 \
  -i $S/09_double_bedroom.mp4 \
  -i $S/10_bathroom.mp4 \
  -i $S/11_dusk.mp4 \
  -loop 1 -t 5 -i assets/endcard.png \
  -i vo_lines/s1.wav -i vo_lines/s2.wav -i vo_lines/s3.wav -i vo_lines/s4.wav \
  -i vo_lines/s5.wav -i vo_lines/s6.wav -i vo_lines/s7.wav \
  -filter_complex "
[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=24,setsar=1[v0];
[1:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=24,setsar=1[v1];
[2:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=24,setsar=1[v2];
[3:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=24,setsar=1[v3];
[4:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=24,setsar=1[v4];
[5:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=24,setsar=1[v5];
[6:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=24,setsar=1[v6];
[7:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=24,setsar=1[v7];
[8:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=24,setsar=1[v8];
[9:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=24,setsar=1[v9];
[10:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=24,setsar=1[v10];
[11:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=24,setsar=1[v11];
[12:v]scale=1080:1920,setsar=1,fps=24,fade=t=in:st=0:d=0.6[v12];
[v0][v1][v2][v3][v4][v5][v6][v7][v8][v9][v10][v11][v12]concat=n=13:v=1:a=0[v];
[13:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=600:all=1[a1];
[14:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=5400:all=1[a2];
[15:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=10500:all=1[a3];
[16:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=25600:all=1[a4];
[17:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=30700:all=1[a5];
[18:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=40700:all=1[a6];
[19:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=55900:all=1[a7];
[a1][a2][a3][a4][a5][a6][a7]amix=inputs=7:duration=longest:normalize=0,apad[a]
" \
  -map "[v]" -map "[a]" \
  -c:v libx264 -crf 19 -preset medium -pix_fmt yuv420p \
  -c:a aac -b:a 192k \
  -t 65.5 \
  cocos_short_DRAFT_v6_noMusic.mp4
