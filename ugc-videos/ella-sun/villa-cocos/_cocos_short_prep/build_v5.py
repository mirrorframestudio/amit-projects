#!/usr/bin/env python3
import os, subprocess
SP="/private/tmp/claude-501/-Users-amitshechter-Projects-onezone-next/955b21ac-9f48-40a4-af74-5b4956f4f24a/scratchpad"
AST=os.path.join(SP,"assets"); VOD=os.path.join(SP,"vo_lines")
SRC="/Users/amitshechter/Downloads/villa_cocos_FAMILY_VO.MP4"
WORK=os.path.join(SP,"v5_work"); os.makedirs(WORK, exist_ok=True)
CW=608; IW=1920; RANGE=IW-CW
VENC=["-c:v","libx264","-preset","medium","-crf","19","-pix_fmt","yuv420p","-r","30","-video_track_timescale","15360"]

def run(cmd):
    r=subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    if r.returncode!=0: print("ERR:",r.stderr.decode()[-1500:]); raise SystemExit(1)

def dur(f):
    return float(subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","default=noprint_wrappers=1:nokey=1",f],
                capture_output=True,text=True).stdout.strip())

# VO line durations
D=[dur(os.path.join(VOD,f"s{i}.wav")) for i in range(1,8)]
S3=D[2]/3.0; S6=D[5]/3.0
HOLD=1.2; DUSK=3.0; ECARD=D[6]+HOLD-DUSK

# video segments: (src_in, duration, mode, frac)
SEGS=[
 (0.5,   D[0], 'lr', 0.7),      # 1 exterior
 (11.0,  D[1], 'rl', 1.0),      # 2 pool
 (24.0,  S3,   'center',0),     # 3a outdoor kitchen
 (45.0,  S3,   'center',0),     # 3b jacuzzi
 (50.5,  S3,   'center',0),     # 3c garden/pingpong
 (59.0,  D[3], 'lr', 0.8),      # 4 living
 (78.5,  D[4], 'center',0),     # 5 kitchen
 (89.0,  S6,   'center',0),     # 6a master
 (95.0,  S6,   'center',0),     # 6b double
 (101.5, S6,   'center',0),     # 6c bathroom
 (124.5, DUSK, 'rl', 0.7),      # 7 dusk
]

def xexpr(mode,frac,Dt):
    if mode=='center': return str(RANGE//2)
    P=f"(t/{Dt})"; e=f"({P}*{P}*(3-2*{P}))"
    base=RANGE*(1-frac)/2.0
    if mode=='lr': return f"{base}+{RANGE*frac}*{e}"
    return f"{base}+{RANGE*frac}*(1-{e})"

# ---- build video-only segments ----
parts=[]
for i,(IN,DU,MODE,FR) in enumerate(SEGS):
    out=os.path.join(WORK,f"seg{i:02d}.mp4")
    fc=f"[0:v]crop={CW}:1080:x='{xexpr(MODE,FR,DU)}':y=0,scale=1080:1920,setsar=1,fps=30[v]"
    run(["ffmpeg","-y","-ss",str(IN),"-t",f"{DU:.4f}","-i",SRC,"-filter_complex",fc,"-map","[v]","-an",
         "-t",f"{DU:.4f}"]+VENC+[out])
    parts.append(out)
# end card (video only)
ec=os.path.join(WORK,"seg99.mp4")
run(["ffmpeg","-y","-loop","1","-t",f"{ECARD:.4f}","-i",os.path.join(AST,"endcard.png"),
     "-filter_complex","[0:v]scale=1080:1920,setsar=1,fps=30[v]","-map","[v]","-an","-t",f"{ECARD:.4f}"]+VENC+[ec])
parts.append(ec)

# concat video
vlist=os.path.join(WORK,"vlist.txt"); open(vlist,"w").write("".join(f"file '{p}'\n" for p in parts))
vsilent=os.path.join(WORK,"video_silent.mp4")
run(["ffmpeg","-y","-f","concat","-safe","0","-i",vlist,"-c","copy",vsilent])

# ---- build master audio: concat s1..s7 + 1.2s silence ----
ain=[]; fparts=[]
for i in range(7):
    ain+=["-i",os.path.join(VOD,f"s{i+1}.wav")]
    fparts.append(f"[{i}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo[a{i}]")
ain+=["-f","lavfi","-t",str(HOLD),"-i","anullsrc=r=48000:cl=stereo"]
fparts.append(f"[7:a]anull[a7]")
concat="".join(f"[a{i}]" for i in range(8))+"concat=n=8:v=0:a=1[a]"
fc=";".join(fparts)+";"+concat
maud=os.path.join(WORK,"master_audio.m4a")
run(["ffmpeg","-y"]+ain+["-filter_complex",fc,"-map","[a]","-c:a","aac","-b:a","192k",maud])

# ---- mux ----
final=os.path.join(SP,"villa_cocos_SHORT_9x16_VO.mp4")
run(["ffmpeg","-y","-i",vsilent,"-i",maud,"-map","0:v","-map","1:a","-c:v","copy","-c:a","aac","-b:a","192k",
     "-shortest","-movflags","+faststart",final])
print("FINAL:",final)
subprocess.run(["ffprobe","-v","error","-show_entries","format=duration,size:stream=codec_name,width,height",
                "-of","default=noprint_wrappers=1",final])
