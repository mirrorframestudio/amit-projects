# Weavy.ai Workflow — Football Jersey Product Shots & Videos
# תהליך עבודה ב-Weavy.ai — חולצות כדורגל על דוגמנים + סרטונים

---

## שלב 1: הכנת קבצי מקור (Input Nodes)

### Node 1 — Upload: תמונת דוגמן
- העלה תמונת דוגמן (או השתמש ב-AI Generate)
- וודא שהרקע שקוף או נקי

### Node 2 — Upload: חולצת כדורגל
- העלה את תמונת החולצה (argentina_nobg.png / brazil_nobg.png / spain_nobg.png)
- וודא שהרקע שקוף (כבר מוכן בתיקייה)

---

## שלב 2: הלבשת החולצה על הדוגמן (Image Generation Nodes)

### Node 3 — Image Generation: Virtual Try-On / Product Placement
**Model:** Flux / SDXL (or Weavy's recommended model)
**Inputs:** Node 1 (model image) + Node 2 (jersey image)

**Prompt — Front View (חזית):**
```
Professional fashion photo of a male model wearing the exact football jersey from the reference image.
Front-facing pose, studio lighting, clean white background, high resolution,
e-commerce product photography style, natural fabric draping, sharp details.
The jersey must match the exact colors, logo placement, and design from the reference.
```

### Node 4 — Image Generation: 3/4 Angle View (זווית 3/4)
**Prompt:**
```
Professional fashion photo of a male model wearing the exact football jersey from the reference image.
3/4 angle pose, slight turn to the right, studio lighting, clean white background,
high resolution, e-commerce style, natural body posture, confident stance.
The jersey must match the exact colors, logo placement, and design from the reference.
```

### Node 5 — Image Generation: Side View (צד)
**Prompt:**
```
Professional fashion photo of a male model wearing the exact football jersey from the reference image.
Side profile view, studio lighting, clean white background, high resolution,
showing the sleeve design and side panel details, athletic build,
e-commerce product photography style.
```

### Node 6 — Image Generation: Back View (גב)
**Prompt:**
```
Professional fashion photo of a male model wearing the exact football jersey from the reference image.
Back view, showing the back of the jersey with number and name area,
studio lighting, clean white background, high resolution,
e-commerce product photography style, natural posture.
```

### Node 7 — Image Generation: Action/Lifestyle Shot (אקשן)
**Prompt:**
```
Dynamic action photo of a male model wearing the exact football jersey from the reference image.
Running or kicking pose on a football pitch, dramatic lighting, shallow depth of field,
sports photography style, motion blur on background, sharp focus on the jersey,
golden hour lighting, energetic and powerful mood.
```

### Node 8 — Image Generation: Lifestyle/Street (לייפסטייל)
**Prompt:**
```
Streetwear lifestyle photo of a young male model wearing the exact football jersey from the reference image.
Urban street background, casual confident pose, natural daylight,
editorial fashion photography, trendy and cool aesthetic,
slight color grading, bokeh background.
```

---

## שלב 3: שיפור התמונות (Enhancement Nodes)

### Node 9 — Upscale (כל תמונה)
- חבר כל אחד מ-Nodes 3-8 ל-Upscale node
- **Scale:** 2x
- **Model:** Real-ESRGAN או המודל המומלץ של Weavy

### Node 10 — Face Fix (אופציונלי)
- אם הפנים לא מושלמות, חבר ל-Face Restoration node
- **Model:** GFPGAN / CodeFormer

---

## שלב 4: יצירת סרטונים (Image-to-Video Nodes)

### Node 11 — Video: סיבוב מוצר (Product Spin)
**Input:** Node 3 (Front view image)
**Model:** Kling / Runway Gen-3 / Weavy Video Model
**Prompt:**
```
Smooth 360-degree rotation of the model wearing the football jersey,
studio lighting, white background, slow cinematic spin,
professional product showcase video, 4 seconds, seamless loop.
```
**Duration:** 4 seconds
**FPS:** 24

### Node 12 — Video: אקשן ספורטיבי (Action Video)
**Input:** Node 7 (Action shot image)
**Prompt:**
```
Dynamic sports video, the model starts running forward wearing the football jersey,
camera follows with slight shake, football stadium background,
dramatic slow motion, epic sports commercial feel,
crowd cheering in blurred background, 4 seconds.
```
**Duration:** 4 seconds
**FPS:** 24

### Node 13 — Video: לייפסטייל / רחוב (Lifestyle Video)
**Input:** Node 8 (Lifestyle image)
**Prompt:**
```
Cinematic lifestyle video, young model wearing the football jersey walking confidently
in urban street, slight wind moving the fabric,
natural camera movement, editorial fashion video style,
warm color grading, shallow depth of field, 4 seconds.
```
**Duration:** 4 seconds
**FPS:** 24

### Node 14 — Video: זום-אין על פרטי החולצה (Detail Zoom)
**Input:** Node 3 (Front view image)
**Prompt:**
```
Slow cinematic zoom into the football jersey details,
starting from full body shot to close-up on the chest logo and fabric texture,
studio lighting, professional product video,
smooth camera movement, 3 seconds.
```
**Duration:** 3 seconds
**FPS:** 24

### Node 15 — Video: דרמטי / הצגת מוצר (Dramatic Reveal)
**Input:** Node 4 (3/4 angle image)
**Prompt:**
```
Dramatic product reveal video, model standing in dark studio,
lights slowly illuminate from the sides revealing the football jersey,
cinematic lighting, smoke effects in background,
premium product commercial feel, slow motion, 4 seconds.
```
**Duration:** 4 seconds
**FPS:** 24

---

## שלב 5: פלט (Output Nodes)

### Node 16 — Export Images
- **Format:** PNG (לתמונות עם רקע שקוף) / JPG (לתמונות עם רקע)
- **Resolution:** 2048x2048 minimum
- חבר את כל תמונות ה-Upscale לכאן

### Node 17 — Export Videos
- **Format:** MP4
- **Resolution:** 1080x1080 (Instagram) / 1080x1920 (Stories/Reels)
- **Codec:** H.264
- חבר את כל הסרטונים לכאן

---

## סיכום מבנה ה-Workflow:

```
[דוגמן] ──┐
           ├──→ [חזית] ──→ [Upscale] ──→ [Export PNG]
           │                    └──→ [Video: סיבוב] ──→ [Export MP4]
           │                    └──→ [Video: זום] ──→ [Export MP4]
           ├──→ [3/4 זווית] ──→ [Upscale] ──→ [Export PNG]
           │                        └──→ [Video: דרמטי] ──→ [Export MP4]
           ├──→ [צד] ──→ [Upscale] ──→ [Export PNG]
           ├──→ [גב] ──→ [Upscale] ──→ [Export PNG]
           ├──→ [אקשן] ──→ [Upscale] ──→ [Export PNG]
           │                   └──→ [Video: אקשן] ──→ [Export MP4]
[חולצה] ──┘├──→ [לייפסטייל] ──→ [Upscale] ──→ [Export PNG]
                                     └──→ [Video: לייפסטייל] ──→ [Export MP4]
```

---

## חולצות זמינות בתיקייה:
| קובץ | נבחרת |
|-------|--------|
| argentina_nobg.png | ארגנטינה |
| brazil_nobg.png | ברזיל |
| spain_nobg.png | ספרד |

**טיפ:** הרץ את כל ה-Workflow פעם אחת לכל חולצה — פשוט החלף את ה-Input של Node 2.

---

## Negative Prompt (להוסיף לכל ה-Generation Nodes):
```
blurry, low quality, distorted, deformed hands, extra fingers,
wrong jersey colors, text artifacts, watermark, bad anatomy,
unrealistic proportions, oversaturated, cartoon style
```
