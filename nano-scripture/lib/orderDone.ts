import type { CartLine } from './cart';
import type { ShippingMethodId } from './policy';

/**
 * ההזמנה שהרגע נסגרה, בדרך מהצ'קאאוט לעמוד התודה.
 *
 * ------------------------------------------------------------------
 * למה לא פשוט לשלוף את ההזמנה מווקומרס לפי המספר שבכתובת.
 *
 * כי אז כל אחד שינחש מספר יראה הזמנה של מישהו אחר - שם, כתובת
 * ומה נקנה. מספרי הזמנה רצים, וניחוש כאן הוא הקלדה של מספר אחר.
 * ------------------------------------------------------------------
 *
 * לכן הסיכום נוסע בדפדפן של הקונה עצמו, ב-sessionStorage: הוא נמחק
 * בסגירת הלשונית, אינו נשלח לשרת, ואינו נגיש למי שלא ביצע את ההזמנה.
 *
 * נשמרים מזהים בלבד - הדגם, הברכה והכמות. השמות והמחירים נגזרים
 * מהקטלוג בצד הלקוח, כך שסיכום ישן לא יציג מחיר שכבר לא קיים.
 */
export const DONE_KEY = 'mikra:order-done';

export type OrderDone = {
  /** מספר ההזמנה כפי שווקומרס נתן אותו */
  number: string;
  /** מזהה ההזמנה, לשיוך אירוע הרכישה */
  id: string;
  /** הסכום שחושב בשרת. זה מה שייגבה, ולא מה שהטופס הציג */
  total: number;
  /** הודעת המסלול הידני, כשאין סליקה אוטומטית */
  message?: string;
  lines: CartLine[];
  gift: boolean;
  code: string | null;
  shipping: ShippingMethodId;
  /** שם הנמען, כשהמשלוח יוצא לכתובת אחרת */
  toName?: string;
};

export function saveOrderDone(order: OrderDone) {
  try {
    sessionStorage.setItem(DONE_KEY, JSON.stringify(order));
  } catch {
    /* גלישה פרטית או אחסון חסום. עמוד התודה יציג את המספר בלבד */
  }
}

export function readOrderDone(): OrderDone | null {
  try {
    const raw = sessionStorage.getItem(DONE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OrderDone;
    return parsed && Array.isArray(parsed.lines) ? parsed : null;
  } catch {
    return null;
  }
}

export function clearOrderDone() {
  try {
    sessionStorage.removeItem(DONE_KEY);
  } catch {
    /* אין מה לנקות */
  }
}
