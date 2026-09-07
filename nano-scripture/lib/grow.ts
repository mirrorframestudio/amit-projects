import 'server-only';
import { POLICY } from './policy';

/**
 * סליקה דרך Grow (מְשׁוּלָם).
 *
 * ------------------------------------------------------------------
 * זו הנקודה היחידה בקוד שיודעת משהו על הסולק.
 *
 * כאן ישבה טרנזילה, והטרמינל שלה מעולם לא נפתח. אם יוחלט מחר על
 * סולק שלישי, זה הקובץ היחיד שמוחלף - הצ'קאאוט מדבר רק דרך
 * `paymentReady` ו-`createPayment`.
 * ------------------------------------------------------------------
 *
 * הזרימה של Grow, לפי התיעוד שלהם:
 *   1. השרת שלנו קורא ל-createPaymentProcess ומקבל קישור
 *   2. הלקוח מופנה לקישור ומשלם
 *   3. השרת של Grow מודיע ל-notifyUrl שלנו
 *   4. אנחנו חייבים לקרוא ל-approveTransaction כדי לאשר
 *   5. הלקוח נוחת ב-successUrl עם response=success
 *
 * שלב 4 אינו רשות. בלעדיו העסקה אינה מאושרת, ולכן הוא מתבצע
 * ב-app/api/payment/callback.
 *
 * הגוף נשלח כ-multipart/form-data ולא כ-JSON. זו דרישה מפורשת
 * בתיעוד, ולכן נבנה כאן FormData אמיתי בלי לקבוע Content-Type ביד -
 * הגבול (boundary) חייב להיקבע ע"י הריצה, ומי שכותב את הכותרת בעצמו
 * שולח גוף שהשרת לא יודע לפרק.
 */

const USER_ID = process.env.GROW_USER_ID || '';
const PAGE_CODE = process.env.GROW_PAGE_CODE || '';
/** ברירת המחדל היא הסביבה החיה. ארגז החול נדלק במפורש בלבד */
const SANDBOX = process.env.GROW_SANDBOX === '1';

const BASE = SANDBOX ? 'https://sandbox.meshulam.co.il' : 'https://secure.meshulam.co.il';
const API = `${BASE}/api/light/server/1.0`;

export const paymentReady = Boolean(USER_ID && PAGE_CODE);
export const paymentSandbox = SANDBOX;

export type PaymentRequest = {
  orderId: number;
  orderNumber: string;
  amount: number;
  customer: { firstName: string; lastName: string; email: string; phone: string };
  siteUrl: string;
};

type GrowResponse = {
  status?: number;
  err?: { message?: string };
  data?: Record<string, string>;
};

async function call(method: string, fields: Record<string, string>) {
  const body = new FormData();
  body.append('pageCode', PAGE_CODE);
  body.append('userId', USER_ID);
  for (const [k, v] of Object.entries(fields)) body.append(k, v);

  const res = await fetch(`${API}/${method}`, { method: 'POST', body, cache: 'no-store' });
  const raw = await res.text();

  let data: GrowResponse | null = null;
  try {
    data = JSON.parse(raw) as GrowResponse;
  } catch {
    // גוף שאינו JSON כמעט תמיד אומר שהבקשה לא הגיעה לנתיב הנכון.
    // 300 תווים מספיקים כדי לזהות את זה בלוג בלי להציף אותו
    throw new Error(`Grow ${method} החזיר תשובה שאינה JSON: ${raw.slice(0, 300)}`);
  }

  // Grow מחזיר 200 גם על כישלון עסקי, והסטטוס האמיתי יושב בגוף
  if (!res.ok || data.status !== 1) {
    throw new Error(data.err?.message || `Grow ${method} נכשל (HTTP ${res.status})`);
  }
  return data.data ?? {};
}

/**
 * יוצר תהליך תשלום ומחזיר את הקישור שאליו מפנים את הלקוח.
 *
 * מזהה ההזמנה נוסע ב-cField1 וחוזר אלינו בהודעת השרת, כדי שנדע
 * לאיזו הזמנה לשייך את התשלום. בלעדיו אין דרך לקשור בין השניים.
 */
export async function createPayment(req: PaymentRequest): Promise<string> {
  if (!paymentReady) throw new Error('הסליקה טרם הוגדרה');

  const data = await call('createPaymentProcess', {
    sum: req.amount.toFixed(2),
    description: `הזמנה ${req.orderNumber} · מִקְרָא`,
    // הסכום נוסע בכתובת כדי שעמוד התודה יוכל למדוד את הרכישה
    // בערך שנגבה בפועל, ולא בשחזור מהעגלה
    successUrl: `${req.siteUrl}/checkout/success?order=${req.orderId}&sum=${req.amount.toFixed(2)}`,
    cancelUrl: `${req.siteUrl}/checkout?order=${req.orderId}&cancelled=1`,
    notifyUrl: `${req.siteUrl}/api/payment/callback`,
    maxPaymentNum: String(POLICY.maxInstallments ?? 1),
    'pageField[fullName]': `${req.customer.firstName} ${req.customer.lastName}`.trim(),
    'pageField[phone]': req.customer.phone,
    'pageField[email]': req.customer.email,
    cField1: String(req.orderId),
  });

  // מבנה התשובה אינו מתועד, ולכן נבדקים כמה שמות מקובלים ובכישלון
  // נרשמים המפתחות שכן חזרו - זה ההבדל בין תקלה שמאבחנים בדקה
  // לבין "Grow לא החזיר קישור" בלי שום רמז
  const url = data.url || data.authCode || data.paymentUrl || data.link;
  if (!url) {
    throw new Error(`Grow לא החזיר קישור תשלום. שדות שחזרו: ${Object.keys(data).join(', ')}`);
  }
  return url;
}

/**
 * אישור העסקה. חובה, ולא נקודה טכנית.
 *
 * עד שהקריאה הזו רצה, הכסף לא נגבה. קריאה שנכשלת בשקט פירושה לקוח
 * שקיבל מסך "שולם" ותשלום שלא הושלם.
 */
export async function approveTransaction(fields: Record<string, string>) {
  return call('approveTransaction', fields);
}
