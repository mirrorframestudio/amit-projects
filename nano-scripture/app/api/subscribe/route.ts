import { NextResponse, type NextRequest } from 'next/server';
import { validateLead, splitName, type Lead } from '@/lib/subscribe';
import { normalizePhone } from '@/lib/checkout';
import { wcGet, wcPost, wcPut, wcReady } from '@/lib/wc';
import { PROMO, promoOn } from '@/lib/promo';

export const dynamic = 'force-dynamic';

type WcCustomer = { id: number; email: string };

/**
 * POST /api/subscribe — מצרף לקוח לווקומרס ומחזיר את קוד ההנחה.
 *
 * ------------------------------------------------------------------
 * זה יוצר משתמש אמיתי בוורדפרס, ולכן הוא נקודת התורפה של האתר.
 *
 * כל בקשה כאן היא רשומה חדשה במסד. האימות מחמיר במכוון, וכתובת
 * דוא"ל שכבר קיימת מעדכנת את הרשומה הקיימת במקום ליצור שנייה -
 * ווקומרס ידחה כפילות ממילא, ועדיף להחזיר ללקוח את הקוד מאשר שגיאה
 * על כך שהוא כבר נרשם פעם.
 * ------------------------------------------------------------------
 */
export async function POST(req: NextRequest) {
  if (!wcReady) {
    return NextResponse.json({ error: 'ההרשמה אינה זמינה כרגע' }, { status: 503 });
  }
  if (!promoOn) {
    return NextResponse.json({ error: 'המבצע אינו פעיל' }, { status: 410 });
  }

  let body: Partial<Lead>;
  try {
    body = (await req.json()) as Partial<Lead>;
  } catch {
    return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
  }

  const lead: Lead = {
    name: String(body.name ?? '').slice(0, 80),
    phone: normalizePhone(String(body.phone ?? '')),
    email: String(body.email ?? '').trim().toLowerCase().slice(0, 120),
    // בוליאן מהרשת אינו בוליאן. ההסכמה לדיוור היא הדבר האחרון שכדאי
    // לקבל כ־truthy, כי היא ההגנה מפני קנס לפי סעיף 30א
    consent: body.consent === true,
  };

  const errors = validateLead(lead);
  if (Object.keys(errors).length) {
    return NextResponse.json({ error: 'פרטים חסרים', fields: errors }, { status: 400 });
  }

  const { first, last } = splitName(lead.name);
  const stamp = new Date().toISOString();
  const meta = [
    // בלי קו תחתון מוביל. ווקומרס מתייחס למפתחות שמתחילים ב-`_`
    // כמטא מוגן, בולע אותם בשקט ולא מחזיר אותם - הבדיקה הראשונה
    // יצרה לקוח שהמקור שלו נעלם
    { key: 'מקור', value: 'פופאפ מועדון' },
    { key: 'הסכמה לדיוור', value: `כן · ${stamp}` },
    { key: 'טלפון', value: lead.phone },
  ];

  try {
    const existing = await wcGet<WcCustomer[]>('/customers', {
      email: lead.email,
      per_page: 1,
      role: 'all',
    });

    if (existing.length) {
      // כבר רשום. מעדכנים את מה שהוא מילא עכשיו ומחזירים את הקוד -
      // שגיאה כאן הייתה מענישה אותו על כך שנרשם פעמיים
      await wcPut(`/customers/${existing[0].id}`, {
        first_name: first,
        last_name: last,
        billing: { first_name: first, last_name: last, phone: lead.phone, email: lead.email },
        meta_data: meta,
      });
      return NextResponse.json({ code: PROMO.code, percent: PROMO.percent, returning: true });
    }

    await wcPost<WcCustomer>('/customers', {
      email: lead.email,
      first_name: first,
      last_name: last,
      billing: { first_name: first, last_name: last, phone: lead.phone, email: lead.email },
      meta_data: meta,
    });

    return NextResponse.json({ code: PROMO.code, percent: PROMO.percent, returning: false });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    // ווקומרס מחזיר את זה כשהדוא"ל תפוס בין הבדיקה לבין הכתיבה
    if (/registered|exists/i.test(msg)) {
      return NextResponse.json({ code: PROMO.code, percent: PROMO.percent, returning: true });
    }
    console.error('subscribe failed', e);
    return NextResponse.json({ error: 'ההרשמה נכשלה. נסו שוב.' }, { status: 502 });
  }
}
