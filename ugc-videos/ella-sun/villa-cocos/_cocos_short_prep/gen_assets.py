#!/usr/bin/env python3
import os
from PIL import Image, ImageDraw, ImageFont
from bidi.algorithm import get_display

SP = "/private/tmp/claude-501/-Users-amitshechter-Projects-onezone-next/955b21ac-9f48-40a4-af74-5b4956f4f24a/scratchpad"
AST = os.path.join(SP, "assets"); os.makedirs(AST, exist_ok=True)
W, H = 1080, 1920
FONT = "/System/Library/Fonts/Supplemental/Arial Unicode.ttf"

def f(sz): return ImageFont.truetype(FONT, sz)
def shape(s): return get_display(s)

def measure(draw, txt, font, stroke=0):
    b = draw.textbbox((0,0), txt, font=font, stroke_width=stroke)
    return b[2]-b[0], b[3]-b[1]

def wrap(draw, txt, font, maxw):
    words = txt.split(' ')
    lines, cur = [], ''
    for w_ in words:
        t = (cur+' '+w_).strip()
        if measure(draw, shape(t), font)[0] <= maxw or not cur:
            cur = t
        else:
            lines.append(cur); cur = w_
    if cur: lines.append(cur)
    return lines

# ---------- 1. LOGO (crop from full-res end-card frame) ----------
src = Image.open(os.path.join(SP,"fullcard_137.png")).convert("RGB")
bg_color = src.getpixel((30,30))          # sample near-black bg
logo = src.crop((672, 100, 1258, 322))     # sun + ELLA wordmark
logo.save(os.path.join(AST,"logo.png"))

# ---------- 2. BOTTOM GRADIENT (hide old burned subs + caption bed) ----------
grad = Image.new("RGBA",(W,H),(0,0,0,0))
gd = grad.load()
for y in range(H):
    if y < 1360: a = 0
    else:
        t = (y-1360)/(H-1360)          # 0..1
        a = int(min(1.0, t*1.15)*235)  # ramp to strong black near bottom
    for x in range(W):
        gd[x,y] = (0,0,0,a)
grad.save(os.path.join(AST,"gradient.png"))

# ---------- 3. CAPTIONS (full-frame transparent, centered band) ----------
CAP_FONT = f(50)
CAP_Y = 1560          # vertical center of caption block
def make_caption(name, txt):
    img = Image.new("RGBA",(W,H),(0,0,0,0))
    d = ImageDraw.Draw(img)
    lines = wrap(d, txt, CAP_FONT, 980)
    shaped = [shape(l) for l in lines]
    lh = measure(d, "אבגדA", CAP_FONT, 4)[1] + 18
    total = lh*len(shaped)
    y = CAP_Y - total//2
    for sl in shaped:
        w_,_ = measure(d, sl, CAP_FONT, 4)
        x = (W-w_)//2
        d.text((x,y), sl, font=CAP_FONT, fill=(255,255,255,255),
               stroke_width=4, stroke_fill=(0,0,0,230))
        y += lh
    img.save(os.path.join(AST,f"{name}.png"))

captions = {
 "cap1":"וילה קוקוס — סוף סוף כל המשפחה ביחד",
 "cap2":"בריכה פרטית מגודרת, ננעלת ומחוממת גם בחורף",
 "cap3a":"מטבח חוץ מאובזר עד הסוף",
 "cap3b":"מנגל, מקרר, מכונת קרח, בר מים — ומקרר ארטיקים לילדים",
 "cap4":"גינה טרופית שלמה — פינג פונג, נדנדות ופינות משחק",
 "cap5a":"מטבח גדול ומאובזר, כולל מדיח כלים",
 "cap5b":"שולחן אחד גדול שכולם יושבים סביבו",
 "cap6":"7 חדרי שינה · עד 22 אורחים",
 "cap7":"חדרי מאסטר עם מרפסת פרטית ונוף להרי אילת",
 "cap8":"מנהל אירוח זמין 24/7",
 "cap9":"וילה קוקוס · כל מה שמשפחה צריכה, במקום אחד",
}
for k,v in captions.items(): make_caption(k,v)

# ---------- 4. END CARD 9:16 ----------
GOLD=(224,168,30,255); WHITE=(255,255,255,255); MUTE=(200,200,200,255)
card = Image.new("RGBA",(W,H), bg_color+(255,))
d = ImageDraw.Draw(card)

# logo centered
lw,lh = logo.size
scale = 620/lw
lg = logo.resize((620, int(lh*scale)))
card.paste(lg, ((W-620)//2, 300), lg if lg.mode=="RGBA" else None)

def center_text(y, txt, font, fill, stroke=0, sfill=(0,0,0,255)):
    s = shape(txt)
    w_,h_ = measure(d, s, font, stroke)
    d.text(((W-w_)//2, y), s, font=font, fill=fill, stroke_width=stroke, stroke_fill=sfill)
    return h_

y = 300 + lg.size[1] + 90
y += center_text(y, "מגה וילה קוקוס", f(76), WHITE, 2, (0,0,0,180)) + 34
# gold divider
d.rectangle([(W//2-70, y),(W//2+70, y+5)], fill=GOLD); y += 46
y += center_text(y, "להזמנות ופרטים", f(40), GOLD) + 60
y += center_text(y, "072-3457496", f(58), WHITE) + 34
y += center_text(y, "WhatsApp  052-586-6652", f(44), MUTE) + 34
y += center_text(y, "@Ella_Sun_official", f(44), MUTE) + 60

# website on LIGHT chip (per client request)
url = "www.ellasun.co.il"
uf = f(48)
uw,uh = measure(d, url, uf)
pad_x, pad_y = 46, 26
chip_w, chip_h = uw+pad_x*2, uh+pad_y*2
cx0 = (W-chip_w)//2
d.rounded_rectangle([(cx0,y),(cx0+chip_w,y+chip_h)], radius=chip_h//2, fill=(245,240,228,255))
d.text((cx0+pad_x, y+pad_y-4), url, font=uf, fill=(20,20,20,255))

card.convert("RGB").save(os.path.join(AST,"endcard.png"))
print("assets done. bg_color=", bg_color, "logo=", logo.size)
print(os.listdir(AST))
