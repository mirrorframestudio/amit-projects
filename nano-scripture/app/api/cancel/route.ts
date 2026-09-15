import { NextResponse } from 'next/server';
import { wcReady, wcGet, wcPost, wcPut } from '@/lib/wc';
import { normalizePhone } from '@/lib/checkout';

/**
 * הודעת ביטול עסקה - /api/cancel
 *
 * ------------------------------------------------------------------
 * סעיף 14ט לחוק הגנת הצרכן: עסק שמאפשר לצרכן להתקשר דרך האתר חייב
 * לאפשר לו גם לבטל דרכו, ולתת אסמכתא עם מועד קבלת ההודעה.
 * ------------------------------------------------------------------
 *
 * אין כאן דוא"ל יוצא (אין כזה באתר), ולכן ההודעה נרשמת במקום היחיד
 * שבו מסתכלים על הזמנות - ההזמנה עצמה בווקומרס: הערה עם כל הפרטים
 * וחותמת זמן, וסטטוס "בוטלה" כשההזמנה טרם נשלחה. המעבר לסטטוס הזה
 * הוא גם מה שגורם לווקומרס לשלוח למנהל "הזמנה בוטלה".
 *
 * מי רשאי לבטל: מי שיודע את מספר ההזמנה *וגם* את הטלפון או הדוא"ל
 * שאיתם היא בוצעה. מספר הזמנה לבדו הוא מספר רץ שאפשר לנחש.
 */

type Body = { name?: string; idNumber?: string; orderNumber?: string; contact?: string };
type WcOrderLite = {
  id: number;
  status: string;
  billing?: { phone?: string; email?: string };
};

/** תעודת זהות ישראלית: תשע ספרות וספרת ביקורת. רק כדי לתפוס הקלדה שגויה */
function validIsraeliId(raw: string) {
  const s = raw.replace(/\D/g, '').padStart(9, '0');
  if (s.length !== 9) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let n = Number(s[i]) * ((i % 2) + 1);
    if (n > 9) n -= 9;
    sum += n;
  }
  return sum % 10 === 0;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
  }

  const name = (body.name ?? '').trim();
  const idNumber = (body.idNumber ?? '').trim();
  const orderNumber = (body.orderNumber ?? '').trim().replace(/^#/, '');
  const contact = (body.contact ?? '').trim();

  const fields: Record<string, string> = {};
  if (name.length < 2) fields.name = 'שם מלא';
  if (!validIsraeliId(idNumber)) fields.idNumber = 'מספר זהות בן 9 ספרות';
  if (!/^\d{1,8}$/.test(orderNumber)) fields.orderNumber = 'מספר ההזמנה, ספרות בלבד';
  if (contact.length < 5) fields.contact = 'הטלפון או הדוא״ל שאיתם בוצעה ההזמנה';
  if (Object.keys(fields).length) {
    return NextResponse.json({ error: 'פרטים חסרים או שגויים', fields }, { status: 400 });
  }

  if (!wcReady) {
    return NextResponse.json({ error: 'החנות אינה מחוברת כרגע. אפשר לבטל בוואטסאפ או בדוא״ל.' }, { status: 503 });
  }

  let order: WcOrderLite;
  try {
    order = await wcGet<WcOrderLite>(`/orders/${orderNumber}`);
  } catch {
    return NextResponse.json(
      { error: 'לא מצאנו הזמנה במספר הזה. המספר מופיע בעמוד התודה ובהודעת הוואטסאפ.', fields: { orderNumber: 'לא נמצאה' } },
      { status: 404 },
    );
  }

  // זיהוי: הטלפון או הדוא"ל של ההזמנה. בלי זה כל מספר רץ הוא הזמנה של מישהו
  const contactPhone = normalizePhone(contact);
  const orderPhone = normalizePhone(order.billing?.phone ?? '');
  const matches =
    (contactPhone.length >= 9 && contactPhone === orderPhone) ||
    (contact.includes('@') && contact.toLowerCase() === (order.billing?.email ?? '').toLowerCase());
  if (!matches) {
    return NextResponse.json(
      { error: 'הטלפון או הדוא״ל אינם תואמים להזמנה הזו.', fields: { contact: 'לא תואם להזמנה' } },
      { status: 403 },
    );
  }

  const received = new Date();
  const stamp = received.toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', dateStyle: 'short', timeStyle: 'short' });
  const text = `הודעת ביטול עסקה דרך האתר · ${stamp}\nשם: ${name}\nת.ז.: ${idNumber}\nזיהוי: ${contact}\nסטטוס בזמן ההודעה: ${order.status}`;

  try {
    await wcPost(`/orders/${order.id}/notes`, { note: text, customer_note: false });
    // טרם שולם או טרם נשלח - ההזמנה מתבטלת מיד. אחרי המשלוח ההחזרה
    // מתואמת ידנית, וההזמנה נשארת עד שהפריט חוזר
    if (['pending', 'on-hold', 'processing'].includes(order.status)) {
      await wcPut(`/orders/${order.id}`, { status: 'cancelled' });
    }
  } catch (e) {
    console.error('cancel: WC write failed', e);
    return NextResponse.json({ error: 'לא הצלחנו לרשום את ההודעה. אפשר לבטל בוואטסאפ או בדוא״ל.' }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    orderNumber,
    received: received.toISOString(),
    stamp,
    // ההזמנה כבר בדרך: ההחזרה מתואמת, לא מתבטלת מעצמה
    shipped: !['pending', 'on-hold', 'processing'].includes(order.status),
  });
}
