import { stripTaamim } from './scripture';
import { getBlessing, type BlessingId } from './blessings';

export type NanoLayout = {
  /**
   * השורות. כל שורה: המילים, רוחב כל מילה בגודל הגופן הסופי, והרווח
   * בין מילים שמותח אותה עד קצה הרוחב (שורה אחרונה נשארת ברווח טבעי).
   */
  rows: { words: string[]; widths: number[]; gap: number }[];
  fontSize: number;
  lineHeight: number;
  pad: number;
  /** קצה ימני להתחלת הכתיבה (RTL) */
  right: number;
  /** קצה עליון של גוש הטקסט - ממורכז אנכית בתוך הלוח */
  top: number;
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

/**
 * שבירה למילים שלמות לפי רוחב מדוד. בעדשה קוראים את הטקסט, ומילה חתוכה
 * נראית כמו שגיאה. `ww` הוא רוחב כל מילה לפיקסל גופן אחד, `sp` רוחב רווח.
 */
function wrap(ww: number[], sp: number, fs: number, usableW: number, limit: number) {
  const rows: number[][] = [];
  let cur: number[] = [];
  let curW = 0;
  for (let i = 0; i < ww.length; i++) {
    const w = ww[i] * fs;
    if (w > usableW) return null;
    if (!cur.length) {
      cur = [i];
      curW = w;
    } else if (curW + sp * fs + w <= usableW) {
      cur.push(i);
      curW += sp * fs + w;
    } else {
      rows.push(cur);
      if (rows.length >= limit) return null;
      cur = [i];
      curW = w;
    }
  }
  if (cur.length) rows.push(cur);
  return rows.length <= limit ? rows : null;
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
 *
 * עמית (24.9.2026): "תמרכז את הכתב לאמצע ותגדיל אותו שיתפוס את כל
 * המשבצת". קודם השבירה נאמדה לפי רוחב תו ממוצע, הטקסט נצמד לפינה
 * הימנית-עליונה והשוליים השמאלי והתחתון נשארו ריקים. עכשיו: רוחב כל
 * מילה נמדד, כל שורה נמתחת עד הקצה (יישור לשני הצדדים), והגוש ממורכז
 * אנכית.
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

  // רוחב המילים ליניארי בגודל הגופן, ולכן נמדד פעם אחת בגודל דגימה
  const probe = 10;
  ctx.font = nanoFont(probe);
  const ww = words.map((w) => ctx.measureText(w).width / probe);
  const sp = ctx.measureText(' ').width / probe || 0.25;

  const fit = (fs: number) => {
    const limit = Math.floor(usableH / (fs * LINE_RATIO));
    if (limit < 1) return null;
    return wrap(ww, sp, fs, usableW, limit);
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
  const lineHeight = fontSize * LINE_RATIO;
  const idx = best ?? [words.map((_, i) => i)];
  const rows = idx.map((line, li) => {
    const widths = line.map((i) => ww[i] * fontSize);
    const sum = widths.reduce((a, b) => a + b, 0);
    const natural = sp * fontSize;
    const last = li === idx.length - 1;
    // מתיחה עד הקצה, אבל לא יותר מפי 3 מרווח טבעי - שורה של שתי מילים
    // לא צריכה להיראות כמו שני איים
    const gap =
      line.length > 1 && !last
        ? Math.min(natural * 3, (usableW - sum) / (line.length - 1))
        : natural;
    return { words: line.map((i) => words[i]), widths, gap };
  });

  return {
    rows,
    fontSize,
    lineHeight,
    pad,
    right: width - pad,
    top: pad + Math.max(0, (usableH - rows.length * lineHeight) / 2),
  };
}

/** מצייר שורה אחת מילה-מילה, מימין לשמאל, ברווחים שנמדדו בפריסה */
export function paintLine(ctx: CanvasRenderingContext2D, layout: NanoLayout, i: number) {
  const row = layout.rows[i];
  if (!row) return;
  const y = layout.top + layout.fontSize + i * layout.lineHeight;
  let x = layout.right;
  for (let k = 0; k < row.words.length; k++) {
    ctx.fillText(row.words[k], x, y);
    x -= row.widths[k] + row.gap;
  }
}

/** מצייר את שכבת הבסיס — הכתב הזעיר שממלא את כל הלוח */
export function paintNano(ctx: CanvasRenderingContext2D, layout: NanoLayout, color: string) {
  ctx.fillStyle = color;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  for (let i = 0; i < layout.rows.length; i++) paintLine(ctx, layout, i);
}
