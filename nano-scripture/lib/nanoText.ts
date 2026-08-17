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

/**
 * פורס את הטקסט לשורות שממלאות בדיוק את המלבן.
 * הפריסה מחושבת פעם אחת ומשמשת גם את שכבת הבסיס וגם את העדשה,
 * ולכן ההגדלה תמיד מציגה בדיוק את מה שנמצא מתחתיה.
 */
export function layoutNano(
  ctx: CanvasRenderingContext2D,
  source: string,
  width: number,
  height: number,
  fontSize: number,
  pad = 10,
): NanoLayout {
  const lineHeight = fontSize * 1.46;
  const usableW = width - pad * 2;
  const rows = Math.max(1, Math.floor((height - pad * 2) / lineHeight));

  // רוחב תו ממוצע מדגימה אחת — מדידה תו־אחר־תו על עשרות אלפי תווים יקרה מדי
  const sample = source.slice(0, 200);
  const avg = ctx.measureText(sample).width / sample.length || fontSize * 0.5;
  const perLine = Math.max(8, Math.floor(usableW / avg));

  const needed = rows * perLine;
  // הברכות קצרות מהלוח, ולכן הנוסח חוזר על עצמו עד שהוא ממלא אותו
  const body = source.repeat(Math.ceil(needed / source.length) + 1);

  const lines: string[] = new Array(rows);
  for (let i = 0; i < rows; i++) lines[i] = body.substr(i * perLine, perLine);

  return { lines, fontSize, lineHeight, pad, right: width - pad, top: pad, avg };
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
