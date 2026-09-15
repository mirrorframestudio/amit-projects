import type { BlessingId } from './blessings';

/**
 * מדריכי המתנה — העמודים שעונים לשאלות שאנשים מקלידים בגוגל.
 *
 * ------------------------------------------------------------------
 * למה זה קיים.
 *
 * אף אחד לא מחפש "תכשיט ננו". מחפשים "מתנה לאמא שיש לה הכול", "מתנה
 * לגיוס", "מה קונים ליולדת". עמודי הקטגוריה והמוצר לא עונים על השאלות
 * האלה, ולכן גוגל לא מביא אליהם את מי ששואל אותן. המדריך הוא העמוד
 * שעונה - ומקשר משם לנוסח ולדגמים.
 * ------------------------------------------------------------------
 *
 * הכללים כאן זהים לשאר האתר: כל טענה נגזרת מהקטלוג, מהמדיניות או
 * מדף האמת. אין ביקורות, אין דחיפות, אין מספרים על גודל האות. הדגמים
 * שמופיעים תחת מקטע חייבים לשאת את הנוסח שהמקטע מדבר עליו - זה נבדק
 * בזמן הבנייה ב-`assertGuides`.
 *
 * הטקסטים עצמם נמצאים ב-guides.data.ts ונוצרו מחוץ לקוד, אחרי בדיקת
 * עובדות; כאן רק הטיפוס והעזרים.
 */
export type GuideSection = {
  h: string;
  p: string[];
  /** דגמים להצגה ככרטיסים מתחת למקטע. חייבים לשאת את `blessing` */
  products: string[];
  /** הנוסח שהמקטע מדבר עליו, לקישור לעמוד הברכה */
  blessing: BlessingId | '';
};

export type Guide = {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  lede: string;
  sections: GuideSection[];
  faq: { q: string; a: string }[];
  relatedGuides: string[];
  /** תאריך פרסום, ISO. ל-sitemap ול-Article */
  published: string;
};

export { GUIDES } from './guides.data';
import { GUIDES } from './guides.data';

export function getGuide(slug: string) {
  return GUIDES.find((g) => g.slug === slug);
}
