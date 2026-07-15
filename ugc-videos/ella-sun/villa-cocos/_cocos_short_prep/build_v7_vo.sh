#!/bin/zsh
# Villa Cocos 9:16 short — assemble 12 shots + endcard with VO synced per-shot (no music yet)
# Blocks fit each VO line (line+pad); 3 long lines slow their shot slightly so visuals hold the audio.
cd "$(dirname "$0")" || exit 1
S=ai_shots_9x16; V=vo_lines_v2

ffmpeg -y -hide_banner -v error \
  -i $S/01_exterior.mp4 -i $S/02_pool.mp4 -i $S/03_outdoor_kitchen.mp4 \
  -i $S/04_jacuzzi.mp4 -i $S/05_garden_pingpong.mp4 -i $S/06_living.mp4 \
  -i $S/07_kitchen.mp4 -i $S/12_family_dinner.mp4 -i $S/08_master.mp4 \
  -i $S/09_double_bedroom.mp4 -i $S/10_bathroom.mp4 -i $S/11_dusk.mp4 \
  -loop 1 -t 7.43 -i assets/endcard.png \
  -i $V/s1.wav -i $V/s2.wav -i $V/s3.wav -i $V/s4.wav -i $V/s5.wav -i $V/s6.wav \
  -i $V/s7.wav -i $V/s8.wav -i $V/s9.wav -i $V/s10.wav -i $V/s11.wav -i $V/s12.wav -i $V/s13.wav \
  -filter_complex "
[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=24,trim=duration=4.80,setpts=PTS-STARTPTS[v0];
[1:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,setpts=1.2278*PTS,fps=24,trim=duration=6.19,setpts=PTS-STARTPTS[v1];
[2:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,setpts=1.2159*PTS,fps=24,trim=duration=6.13,setpts=PTS-STARTPTS[v2];
[3:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=24,trim=duration=4.50,setpts=PTS-STARTPTS[v3];
[4:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=24,trim=duration=5.04,setpts=PTS-STARTPTS[v4];
[5:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,setpts=1.1425*PTS,fps=24,trim=duration=5.76,setpts=PTS-STARTPTS[v5];
[6:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=24,trim=duration=4.68,setpts=PTS-STARTPTS[v6];
[7:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=24,trim=duration=4.68,setpts=PTS-STARTPTS[v7];
[8:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=24,trim=duration=4.62,setpts=PTS-STARTPTS[v8];
[9:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=24,trim=duration=3.70,setpts=PTS-STARTPTS[v9];
[10:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=24,trim=duration=4.74,setpts=PTS-STARTPTS[v10];
[11:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=24,trim=duration=4.38,setpts=PTS-STARTPTS[v11];
[12:v]scale=1080:1920,setsar=1,fps=24,trim=duration=7.43,setpts=PTS-STARTPTS,fade=t=in:st=0:d=0.6[v12];
[v0][v1][v2][v3][v4][v5][v6][v7][v8][v9][v10][v11][v12]concat=n=13:v=1:a=0[v];
[13:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=300:all=1[a1];
[14:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=5100:all=1[a2];
[15:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=11290:all=1[a3];
[16:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=17420:all=1[a4];
[17:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=21680:all=1[a5];
[18:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=26960:all=1[a6];
[19:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=32720:all=1[a7];
[20:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=37400:all=1[a8];
[21:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=42080:all=1[a9];
[22:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=46700:all=1[a10];
[23:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=50400:all=1[a11];
[24:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=55140:all=1[a12];
[25:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=59520:all=1[a13];
[a1][a2][a3][a4][a5][a6][a7][a8][a9][a10][a11][a12][a13]amix=inputs=13:duration=longest:normalize=0,apad[a]
" \
  -map "[v]" -map "[a]" \
  -c:v libx264 -crf 19 -preset medium -pix_fmt yuv420p \
  -c:a aac -b:a 192k -t 66.65 \
  cocos_short_WITH_VO.mp4
