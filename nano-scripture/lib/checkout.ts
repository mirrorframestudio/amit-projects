/**
 * אימות פרטי ההזמנה.
 *
 * אותו קובץ רץ בטופס ובשרת, וזה לא נוחות אלא נחיצות: אימות שקיים רק
 * בדפדפן אינו אימות. כל בקשה ל-API יכולה להגיע ישירות, בלי הטופס.
 *
 * ההודעות בעברית ומיועדות להיות מוצגות כמו שהן ליד השדה, ולא להיות
 * מתורגמות במקום אחר - תרגום כפול הוא איך שהודעות שגיאה מתיישנות.
 */
import type { ShippingMethodId } from './policy';

export type Customer = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postcode: string;
  shipping: ShippingMethodId;
  /**
   * משלוח לנמען אחר.
   *
   * ------------------------------------------------------------------
   * זה עסק של מתנות שעד עכשיו יכול היה לשלוח רק לקונה.
   *
   * מי שקנה את ברכת התינוק לנכד שנולד קיבל את החבילה לכתובת שלו,
   * וכדי שהיא תגיע ליעד היה עליו לארוז ולשלוח שוב. הכתובת שנשלחת
   * לחברת המשלוחים היא כתובת הנמען, והחיוב נשאר על שם הקונה.
   * ------------------------------------------------------------------
   *
   * השדות שטוחים ולא מקוננים, כדי ש-`set` בטופס, `FieldErrors`
   * ומערך השדות ימשיכו לעבוד בדיוק כמו לשאר הטופס.
   */
  toRecipient: boolean;
  toName: string;
  toPhone: string;
  toAddress: string;
  toCity: string;
  toPostcode: string;
  /**
   * אישור תקנון. חובה, ולא מסומן מראש.
   *
   * תיבה מסומנת מראש אינה הסכמה - היא הנחה. וברגע שמישהו יטען
   * שלא ראה את התנאים, מה שיקבע הוא אם הייתה פעולה אקטיבית.
   */
  terms: boolean;
  /**
   * הסכמה לדיוור. רשות, ולא מסומן מראש.
   *
   * סעיף 30א לחוק התקשורת אוסר משלוח דבר פרסומת בלי הסכמה מפורשת
   * מראש. תיבה מסומנת מראש אינה הסכמה מפורשת, והקנס הוא עד 1,000
   * שקל לכל הודעה, בלי הוכחת נזק.
   */
  marketing: boolean;
};

export const EMPTY_CUSTOMER: Customer = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  postcode: '',
  shipping: 'delivery',
  toRecipient: false,
  toName: '',
  toPhone: '',
  toAddress: '',
  toCity: '',
  toPostcode: '',
  terms: false,
  marketing: false,
};

export type FieldErrors = Partial<Record<keyof Customer, string>>;

/**
 * טלפון ישראלי. מקבל 05X-XXXXXXX על כל וריאציות ההפרדה, וגם +972.
 * הספרות בלבד נשמרות, כי זה מה שצריך להגיע לחברת המשלוחים.
 */
export function normalizePhone(raw: string) {
  const digits = (raw || '').replace(/[^\d+]/g, '');
  if (digits.startsWith('+972')) return '0' + digits.slice(4);
  if (digits.startsWith('972')) return '0' + digits.slice(3);
  return digits;
}

/** קו נייח או נייד ישראלי, אחרי נרמול לספרות בלבד */
const IL_PHONE = /^0(5\d|[2-4,8-9])\d{7}$/;

/** מיקוד ישראלי - חמש ספרות, או שבע בפורמט המורחב */
const IL_ZIP = /^\d{5}(\d{2})?$/;

export function validate(c: Customer): FieldErrors {
  const e: FieldErrors = {};
  const t = (s: string) => (s || '').trim();

  if (t(c.firstName).length < 2) e.firstName = 'שם פרטי חסר';
  if (t(c.lastName).length < 2) e.lastName = 'שם משפחה חסר';

  // לא regex מחמיר: כתובות אמיתיות שוברות כל דפוס, ובדיקה קפדנית
  // מדי חוסמת לקוחות אמיתיים יותר משהיא מונעת שגיאות
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(t(c.email))) e.email = 'כתובת דוא״ל לא תקינה';

  const phone = normalizePhone(c.phone);
  if (!IL_PHONE.test(phone)) e.phone = 'מספר טלפון ישראלי לא תקין';

  // באיסוף עצמי אין למה לשלוח, ולכן הכתובת אינה נדרשת
  if (c.shipping !== 'pickup') {
    if (t(c.address).length < 4) e.address = 'רחוב ומספר בית';
    if (t(c.city).length < 2) e.city = 'עיר חסרה';

    /**
     * כתובת הנמען נבדקת באותה חומרה כמו של הקונה, ולא בפחות.
     *
     * זו הכתובת שהחבילה נוסעת אליה. שגיאה בה אינה טופס שחוזר, אלא
     * מתנה שמגיעה לכתובת לא נכונה - ואת זה מגלים אחרי המסירה.
     *
     * הטלפון חובה ולא רשות: חברת המשלוחים מתקשרת לנמען, ולא לקונה.
     * בלעדיו החבילה חוזרת למחסן.
     */
    if (c.toRecipient) {
      if (t(c.toName).length < 2) e.toName = 'שם הנמען';
      if (!IL_PHONE.test(normalizePhone(c.toPhone))) e.toPhone = 'טלפון הנמען, למשלוח';
      if (t(c.toAddress).length < 4) e.toAddress = 'רחוב ומספר בית';
      if (t(c.toCity).length < 2) e.toCity = 'עיר חסרה';

      const toZip = t(c.toPostcode);
      if (toZip && !IL_ZIP.test(toZip)) e.toPostcode = 'מיקוד בן 5 או 7 ספרות';
    }
  }

  if (!c.terms) e.terms = 'יש לאשר את תנאי השימוש';

  // מיקוד אינו חובה בישראל לצורך משלוח, ולכן נבדק רק אם הוזן
  const zip = t(c.postcode);
  if (zip && !IL_ZIP.test(zip)) e.postcode = 'מיקוד בן 5 או 7 ספרות';

  return e;
}

export const isValid = (c: Customer) => Object.keys(validate(c)).length === 0;

/** שדות הטופס, בסדר שבו הם מוצגים */
export const FIELDS: {
  key: keyof Customer;
  label: string;
  type: string;
  autoComplete: string;
  half?: boolean;
  optional?: boolean;
}[] = [
  { key: 'firstName', label: 'שם פרטי', type: 'text', autoComplete: 'given-name', half: true },
  { key: 'lastName', label: 'שם משפחה', type: 'text', autoComplete: 'family-name', half: true },
  { key: 'email', label: 'דוא״ל', type: 'email', autoComplete: 'email' },
  { key: 'phone', label: 'טלפון', type: 'tel', autoComplete: 'tel' },
  { key: 'address', label: 'רחוב ומספר', type: 'text', autoComplete: 'street-address' },
  { key: 'city', label: 'עיר', type: 'text', autoComplete: 'address-level2', half: true },
  { key: 'postcode', label: 'מיקוד', type: 'text', autoComplete: 'postal-code', half: true, optional: true },
];

/**
 * שדות הנמען, כשהמשלוח יוצא לכתובת אחרת.
 *
 * `autoComplete` כאן הוא "off" בכוונה. המילוי האוטומטי של הדפדפן
 * שמור לבעל הכרטיס, והוא ישמח למלא את שם ואת הכתובת של הקונה בשדות
 * של הנמען - כלומר לשלוח את המתנה בחזרה אל מי ששלח אותה, בלי שאיש
 * ישים לב.
 */
export const RECIPIENT_FIELDS: typeof FIELDS = [
  { key: 'toName', label: 'שם הנמען', type: 'text', autoComplete: 'off' },
  { key: 'toPhone', label: 'טלפון הנמען', type: 'tel', autoComplete: 'off' },
  { key: 'toAddress', label: 'רחוב ומספר', type: 'text', autoComplete: 'off' },
  { key: 'toCity', label: 'עיר', type: 'text', autoComplete: 'off', half: true },
  { key: 'toPostcode', label: 'מיקוד', type: 'text', autoComplete: 'off', half: true, optional: true },
];
