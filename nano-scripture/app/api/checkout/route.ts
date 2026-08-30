import { NextResponse, type NextRequest } from 'next/server';
import { validate, normalizePhone, type Customer } from '@/lib/checkout';
import { createOrder, orderTotal, type OrderLine } from '@/lib/wcOrder';
import { wcReady } from '@/lib/wc';
import { tranzilaReady, paymentUrl } from '@/lib/tranzila';
import { isBlessingId } from '@/lib/blessings';
import { getProduct } from '@/lib/catalog';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-dynamic';

/**
 * POST /api/checkout — יוצר הזמנה ומחזיר לאן להפנות לתשלום.
 *
 * ------------------------------------------------------------------
 * הסכום מחושב כאן מחדש, ולא נלקח מהבקשה.
 *
 * העגלה חיה בדפדפן, ולכן כל מה שמגיע ממנה הוא קלט של המשתמש. אם
 * השרת היה סומך על סכום שנשלח אליו, אפשר היה לשלוח בקשה עם סכום
 * 1 שקל ולקבל תכשיט. מה שמגיע מהלקוח הוא רק *מה* הוא רוצה - כמה
 * זה עולה נקבע כאן, מתוך הקטלוג.
 * ------------------------------------------------------------------
 */
type Body = { customer: Customer; lines: OrderLine[]; gift?: boolean; code?: string | null; note?: string };

export async function POST(req: NextRequest) {
  if (!wcReady) {
    return NextResponse.json({ error: 'החנות אינה מחוברת עדיין' }, { status: 503 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
  }

  // --- הפריטים ---
  const lines = Array.isArray(body.lines) ? body.lines : [];
  if (!lines.length) {
    return NextResponse.json({ error: 'העגלה ריקה' }, { status: 400 });
  }
  if (lines.length > 20) {
    return NextResponse.json({ error: 'יותר מדי פריטים בהזמנה' }, { status: 400 });
  }

  for (const l of lines) {
    const product = getProduct(l.slug);
    if (!product) {
      return NextResponse.json({ error: `דגם לא מוכר: ${l.slug}` }, { status: 400 });
    }
    // הברכה היא מה שנצרב. הזמנה בלי ברכה תקינה אי אפשר לייצר,
    // ועדיף להיכשל כאן מאשר להגיע לפאנל בלי לדעת מה לחרוט
    if (!isBlessingId(l.blessing) || !product.blessings.includes(l.blessing)) {
      return NextResponse.json({ error: 'ברכה לא תקינה לאחד הדגמים' }, { status: 400 });
    }
    if (!Number.isFinite(l.qty) || l.qty < 1 || l.qty > 20) {
      return NextResponse.json({ error: 'כמות לא תקינה' }, { status: 400 });
    }
  }

  // --- הפרטים ---
  const customer = { ...body.customer, phone: normalizePhone(body.customer?.phone ?? '') };
  const errors = validate(customer);
  if (Object.keys(errors).length) {
    return NextResponse.json({ error: 'פרטים חסרים או שגויים', fields: errors }, { status: 400 });
  }

  const gift = Boolean(body.gift);
  const code = typeof body.code === 'string' ? body.code : null;
  const totals = orderTotal({ lines, gift, code });

  try {
    const order = await createOrder({
      lines,
      gift,
      code,
      customer,
      note: typeof body.note === 'string' ? body.note.slice(0, 500) : '',
    });

    // הסליקה טרם הוגדרה: ההזמנה נשמרה ואפשר ליצור איתה קשר, אבל
    // אין לאן להפנות. עדיף לומר את זה מפורשות מאשר להפיל את הלקוח
    // על דף שבור
    if (!tranzilaReady) {
      return NextResponse.json({
        orderId: order.id,
        orderNumber: order.number,
        total: totals.total,
        payment: null,
        message: 'ההזמנה נשמרה. הסליקה טרם הופעלה - ניצור איתך קשר להשלמת התשלום.',
      });
    }

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.number,
      total: totals.total,
      payment: paymentUrl({
        orderId: order.id,
        orderNumber: order.number,
        amount: totals.total,
        customer,
        siteUrl: SITE_URL,
      }),
    });
  } catch (e) {
    console.error('checkout failed', e);
    return NextResponse.json({ error: 'יצירת ההזמנה נכשלה. נסו שוב או פנו אלינו.' }, { status: 502 });
  }
}
