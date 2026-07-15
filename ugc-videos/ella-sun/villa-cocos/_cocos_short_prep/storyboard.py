#!/usr/bin/env python3
import os, subprocess
from PIL import Image, ImageDraw, ImageFont
from bidi.algorithm import get_display
SP="/private/tmp/claude-501/-Users-amitshechter-Projects-onezone-next/955b21ac-9f48-40a4-af74-5b4956f4f24a/scratchpad"
AST=os.path.join(SP,"assets")
SRC="/Users/amitshechter/Downloads/villa_cocos_FAMILY_VO.MP4"
FONT="/System/Library/Fonts/Supplemental/Arial Unicode.ttf"

# (num, timestamp or 'endcard', label)
SHOTS=[
 (1, 1.5,  "חוץ · ווילה + בריכה"),
 (2, 12.5, "בריכה מגודרת ומחוממת"),
 (3, 26.0, "מטבח חוץ מאובזר"),
 (4, 46.0, "ג'קוזי"),
 (5, 51.0, "גינה טרופית · פינג-פונג"),
 (6, 60.0, "סלון"),
 (7, 80.0, "מטבח"),
 (8, 90.0, "חדר מאסטר (חדר 1)"),
 (9, 96.0, "חדר זוגי (חדר 2)"),
 (10,102.0,"מקלחת (אחת)"),
 (11,125.0,"דמדומים + כיתוב כמויות"),
 (12,"endcard","כרטיס סיום ELLA"),
]
CW,CH=440,247   # 16:9 cell for frame
PADX,PADY=18,16
LBL=40
cols=3
rows=(len(SHOTS)+cols-1)//cols
GW=cols*CW+(cols+1)*PADX
GH=rows*(CH+LBL)+(rows+1)*PADY
grid=Image.new("RGB",(GW,GH),(22,22,26))
d=ImageDraw.Draw(grid)
f=ImageFont.truetype(FONT,26); fn=ImageFont.truetype(FONT,30)

for idx,(num,ts,label) in enumerate(SHOTS):
    r,c=divmod(idx,cols)
    x=PADX+c*(CW+PADX); y=PADY+r*(CH+LBL+PADY)
    tmp=os.path.join(SP,f"sb_{num}.png")
    if ts=="endcard":
        im=Image.open(os.path.join(AST,"endcard.png")).convert("RGB").resize((int(CH*9/16),CH))
        cell=Image.new("RGB",(CW,CH),(0,0,0)); cell.paste(im,((CW-im.width)//2,0))
    else:
        subprocess.run(["ffmpeg","-y","-ss",str(ts),"-i",SRC,"-frames:v","1","-vf",f"scale={CW}:{CH}",tmp],
                       stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        cell=Image.open(tmp).convert("RGB")
    grid.paste(cell,(x,y))
    # number badge
    d.ellipse([x+6,y+6,x+42,y+42],fill=(224,168,30))
    d.text((x+16 if num<10 else x+11,y+9),str(num),font=fn,fill=(20,20,20))
    # label below
    s=get_display(label)
    w=d.textbbox((0,0),s,font=f)[2]
    d.text((x+CW-w, y+CH+6), s, font=f, fill=(235,235,235))

out=os.path.join(SP,"storyboard.png")
grid.save(out); print("saved",out, grid.size)
