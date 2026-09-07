/**
 * הצטרפות למועדון: אימות הפרטים.
 *
 * אותו קובץ רץ בפופאפ ובשרת, מאותה סיבה שבגללה זה נכון בצ'קאאוט -
 * אימות שקיים רק בדפדפן אינו אימות, וה-API הזה יוצר משתמש אמיתי
 * בוורדפרס.
 */
import { normalizePhone } from './checkout';

export type Lead = { name: string; phone: string; email: string; consent: boolean };

export const EMPTY_LEAD: Lead = { name: '', phone: '', email: '', consent: false };

export type LeadErrors = Partial<Record<keyof Lead, string>>;

export function validateLead(l: Lead): LeadErrors {
  const e: LeadErrors = {};
  const t = (s: string) => (s || '').trim();

  // שם מלא בשדה אחד: מי שממלא פופאפ לא רוצה שני שדות לשם
  if (t(l.name).length < 2) e.name = 'שם מלא';

  const phone = normalizePhone(l.phone);
  if (!/^0(5\d|[2-4,8-9])\d{7}$/.test(phone)) e.phone = 'מספר טלפון ישראלי';

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(t(l.email))) e.email = 'כתובת דוא״ל תקינה';

  /**
   * ההסכמה לדיוור.
   *
   * סעיף 30א לחוק התקשורת דורש הסכמה מפורשת מראש לפני משלוח דבר
   * פרסומת. הטופס הזה נותן הנחה בתמורה לפרטים, כלומר כל תכליתו היא
   * דיוור - ולכן ההסכמה חייבת להיות פעולה אקטיבית ולא הנחה שנגזרת
   * מהלחיצה. הקנס הוא עד 1,000 שקל להודעה, בלי הוכחת נזק.
   */
  if (!l.consent) e.consent = 'יש לאשר קבלת דיוור';

  return e;
}

export const isValidLead = (l: Lead) => Object.keys(validateLead(l)).length === 0;

/** "ישראל ישראלי" -> ["ישראל", "ישראלי"]. שם יחיד נשאר שם פרטי */
export function splitName(full: string) {
  const parts = full.trim().split(/\s+/);
  return { first: parts[0] ?? '', last: parts.slice(1).join(' ') };
}
