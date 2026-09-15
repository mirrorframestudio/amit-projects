"""
תמונות הפיד: JPEG על רקע לבן לצד כל WebP שקוף ב-public/products.

האתר מציג את החיתוכים כ-WebP שקוף על רקע לבן. מטא מקבל לקטלוג רק
JPEG או PNG, וגוגל מזהיר על חיתוכים בהירים על רקע שקוף - אז הפיד
(app/feed.xml/route.ts) מצביע על ה-JPEG הזה כשהוא קיים, ונופל ל-WebP
כשלא. להריץ אחרי כל דגם חדש:

    python scripts/feed-images.py

הרקע #ffffff - --surface ב-app/globals.css, מה שכבר יושב מאחורי
הכרטיסים באתר. שקט: לא נוגע בקובץ שכבר קיים ומעודכן.
"""
import os
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent / 'public' / 'products'
WHITE = (255, 255, 255, 255)


def main() -> int:
    sys.stdout.reconfigure(encoding='utf-8')
    made = skipped = 0
    for src in sorted(ROOT.glob('*.webp')):
        dst = src.with_suffix('.jpg')
        if dst.exists() and dst.stat().st_mtime >= src.stat().st_mtime:
            skipped += 1
            continue
        im = Image.open(src).convert('RGBA')
        flat = Image.alpha_composite(Image.new('RGBA', im.size, WHITE), im).convert('RGB')
        flat.save(dst, 'JPEG', quality=92, optimize=True, progressive=True)
        print(f'{dst.name}  {im.size[0]}x{im.size[1]}  {os.path.getsize(dst) // 1024} KB')
        made += 1
    print(f'{made} נוצרו, {skipped} כבר עדכניים')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
