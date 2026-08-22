import { stripTaamim } from './scripture';
import { getBlessing, type BlessingId } from './blessings';

export type NanoLayout = {
  lines: string[];
  fontSize: number;
  lineHeight: number;
  pad: number;
  /** קצה ימני להתחלת הכתיבה (RTL) */
  right: number;
  top: number;
  /** רוחב תו ממוצע — משמש את העדשה כדי לצייר רק את המקטע הנראה */
  avg: number;
};

/** הנוסח שנצרב על השבב — בדיוק כפי שהוא בקובץ המקור */
export function blessingText(id: BlessingId) {
  return stripTaamim(getBlessing(id).text);
}

/**
 * ctx.font לא מפענח משתני CSS, ו־next/font מייצר שם משפחה מגובב.
 * לכן שולפים את השם האמיתי מהמשתנה על שורש המסמך.
 */
export function nanoFont(size: number) {
  const cs = getComputedStyle(document.documentElement);
  const family = cs.getPropertyValue('--font-app').trim();
  return `${size}px ${family || 'sans-serif'}, sans-serif`;
}

const LINE_RATIO = 1.46;

/** שבירה למילים שלמות. בעדשה קוראים את הטקסט, ומילה חתוכה נראית כמו שגיאה */
function wrap(words: string[], perLine: number, limit: number) {
  const lines: string[] = [];
  let cur = '';
  for (const word of words) {
    if (!cur.length) {
      cur = word;
    } else if (cur.length + 1 + word.length <= perLine) {
      cur += ' ' + word;
    } else {
      lines.push(cur);
      if (lines.length > limit) return null;
      cur = word;
    }
  }
  if (cur.length) lines.push(cur);
  return lines.length <= limit ? lines : null;
}

/**
 * פורס את הנוסח כך שהוא ממלא את המלבן **פעם אחת**.
 *
 * הגרסה הקודמת קיבלה גודל גופן קבוע וחזרה על הטקסט עשרות פעמים עד
 * שהלוח התמלא. זה גם נראה כמו מילוי חלל וגם ייצג את המוצר לא נכון:
 * על השבב צרוב נוסח אחד, לא ארבעים עותקים שלו.
 *
 * לכן הכיוון הפוך - מחפשים את הגופן הגדול ביותר שבו הנוסח כולו עדיין
 * נכנס. חיפוש בינארי, ובכל צעד שוברים באמת למילים ובודקים אם מספר
 * השורות נכנס בגובה. הקיבולת יורדת כריבוע הגופן, ולכן ההתכנסות מהירה.
 */
export function layoutNano(
  ctx: CanvasRenderingContext2D,
  source: string,
  width: number,
  height: number,
  _fontSize: number,
  pad = 10,
): NanoLayout {
  const usableW = width - pad * 2;
  const usableH = height - pad * 2;
  const words = source.split(/\s+/).filter(Boolean);

  // יחס רוחב־תו לגודל גופן, נמדד פעם אחת. הוא ליניארי, ולכן די בדגימה
  const probe = 10;
  ctx.font = nanoFont(probe);
  const sample = source.slice(0, 400);
  const ratio = ctx.measureText(sample).width / sample.length / probe || 0.5;

  const fit = (fs: number) => {
    const rows = Math.floor(usableH / (fs * LINE_RATIO));
    const perLine = Math.floor(usableW / (fs * ratio));
    if (rows < 1 || perLine < 4) return null;
    return wrap(words, perLine, rows);
  };

  let lo = 0.4;
  let hi = 64;
  let best = fit(lo);
  for (let i = 0; i < 22; i++) {
    const mid = (lo + hi) / 2;
    const attempt = fit(mid);
    if (attempt) {
      lo = mid;
      best = attempt;
    } else {
      hi = mid;
    }
  }

  const fontSize = lo;
  const lines = best ?? [source];
  const avg = fontSize * ratio;

  return {
    lines,
    fontSize,
    lineHeight: fontSize * LINE_RATIO,
    pad,
    right: width - pad,
    top: pad,
    avg,
  };
}

/** מצייר את שכבת הבסיס — הכתב הזעיר שממלא את כל הלוח */
export function paintNano(ctx: CanvasRenderingContext2D, layout: NanoLayout, color: string) {
  ctx.fillStyle = color;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  const { lines, lineHeight, right, top, fontSize } = layout;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], right, top + fontSize + i * lineHeight);
  }
}
