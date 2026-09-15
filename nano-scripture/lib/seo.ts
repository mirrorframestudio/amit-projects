import { FINISHES, MATERIALS, CATEGORIES, PRODUCTS, type Product } from './catalog';

/**
 * עזרי כותרת ותיאור לתוצאות החיפוש.
 *
 * ------------------------------------------------------------------
 * שלושה דברים שנמדדו באתר החי ותוקנו כאן:
 *
 * 1. שישה מחמישה-עשר עמודי המוצר חלקו כותרת זהה - בְּסֵתֶר בכסף
 *    ובְּסֵתֶר בזהב הם "בְּסֵתֶר · מִקְרָא" שניהם. גוגל רואה כפילות
 *    בין כתובות שונות ומאחד או משכתב. הפיד כבר הבדיל ביניהם לפי
 *    הגימור; העמודים לא.
 * 2. התיאור נחתך ב-120 תווים באמצע מילה ("...בתוך מסג"). החיתוך
 *    כאן הוא ברווח האחרון לפני הגבול.
 * 3. הכותרות היו 16-20 תווים - שם הדגם והמותג בלבד - ולא אמרו מה
 *    המוצר. "תּוֹלְדוֹת" לבד לא מתחרה על "שרשרת עם ברכה".
 * ------------------------------------------------------------------
 */

/** חיתוך במילה שלמה. שלוש נקודות רק אם נחתך */
export function clampWords(s: string, max = 150) {
  const t = s.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const at = cut.lastIndexOf(' ');
  return `${(at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[,.·\-–]+$/, '')}…`;
}

/** האם לדגם יש אח באותו שם בגימור אחר */
export function hasFinishSibling(p: Product) {
  return PRODUCTS.some((x) => x.name === p.name && x.slug !== p.slug);
}

/** השם כפי שהוא מזוהה בין אחים: "בְּסֵתֶר זהב" רק כשיש בְּסֵתֶר אחר */
export function distinctName(p: Product) {
  return hasFinishSibling(p) ? `${p.name} ${FINISHES[p.finish]}` : p.name;
}

/** כותרת עמוד מוצר: שם · מה זה. המותג מתווסף בתבנית של ה-layout */
export function productTitle(p: Product) {
  return `${distinctName(p)} · ${CATEGORIES[p.category].singular} ${MATERIALS[p.material].label} עם ברכה על שבב`;
}

export function productDescription(p: Product) {
  return clampWords(`${p.short}. ${p.story}`);
}
