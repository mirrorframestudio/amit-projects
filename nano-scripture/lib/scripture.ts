/**
 * הכנת נוסח מקראי לתצוגה.
 *
 * קובצי המקור נושאים טעמי מקרא מלאים. הם יפים בחומש, אבל אף פונט עברי
 * לממשק - לא Assistant ולא Heebo - מצייר אותם, והם יוצאים כסימנים
 * זרים שנראים כמו סוגריים תלושות באמצע הפסוק.
 *
 * הניקוד נשאר. גם סוף־פסוק נשאר, כי הוא מה שמאפשר לחלק לפסוקים.
 */

/** טעמי מקרא, מתג, פסק ונון הפוכה. הניקוד (05B0-05BC, 05C1, 05C2, 05C7) לא נוגעים בו */
const TAAMIM = /[֑-ֽ֯׀׆]/g;

export function stripTaamim(text: string) {
  return text.replace(TAAMIM, '');
}

/**
 * חלוקה לפסוקים לפי סוף־פסוק.
 * נוסח שאין בו סוף־פסוק (תפילה, ולא מקרא) חוזר כגוש אחד.
 */
export function toVerses(text: string) {
  const clean = stripTaamim(text).trim();
  const parts = clean
    .split('׃')
    .map((v) => v.trim())
    .filter(Boolean);

  if (parts.length < 2) return [clean];
  return parts.map((v) => v + '׃');
}

/** אורך הנוסח כפי שהוא נצרב בפועל, בלי הסימנים שהוסרו */
export function burnedChars(text: string) {
  return stripTaamim(text).length;
}
