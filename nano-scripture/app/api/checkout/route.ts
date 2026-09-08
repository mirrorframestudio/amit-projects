import { NextResponse, type NextRequest } from 'next/server';
import { validate, normalizePhone, type Customer } from '@/lib/checkout';
import { createOrder, orderTotal, type OrderLine } from '@/lib/wcOrder';
import { wcReady } from '@/lib/wc';
import { paymentReady, createPayment } from '@/lib/grow';
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
  const customer = {
    ...body.customer,
    phone: normalizePhone(body.customer?.phone ?? ''),
    // בוליאנים מהרשת אינם בוליאנים עד שכופים עליהם. אישור התקנון
    // הוא הדבר שהכי לא כדאי לקבל כ-"truthy"
    terms: body.customer?.terms === true,
    marketing: body.customer?.marketing === true,
    shipping: body.customer?.shipping === 'pickup' ? ('pickup' as const) : ('delivery' as const),
    // הבחירה לשלוח לנמען אחר עוברת את אותה כפייה: היא קובעת לאן
    // החבילה נוסעת, ולכן "truthy" אינו מספיק טוב בשבילה
    toRecipient: body.customer?.toRecipient === true,
    toPhone: normalizePhone(body.customer?.toPhone ?? ''),
  };
  const errors = validate(customer);
  if (Object.keys(errors).length) {
    return NextResponse.json({ error: 'פרטים חסרים או שגויים', fields: errors }, { status: 400 });
  }

  const gift = Boolean(body.gift);
  const code = typeof body.code === 'string' ? body.code : null;
  const totals = orderTotal({ lines, gift, code, shipping: customer.shipping });

  try {
    const order = await createOrder({
      lines,
      gift,
      code,
      customer,
      note: typeof body.note === 'string' ? body.note.slice(0, 500) : '',
    });

    /**
     * מסלול תשלום ידני.
     *
     * אין כאן תקלה: גישת ה-API של הסולק היא שירות בתשלום חודשי,
     * ובנפח נמוך היא לא משתלמת. ההזמנה נקלטת במלואה, ואנחנו שולחים
     * קישור תשלום ידנית.
     *
     * הניסוח חשוב. "הסליקה טרם הופעלה" מספר ללקוח שמשהו אצלנו לא
     * גמור, וזה בדיוק הרגע שבו הוא מתחרט. מה שהוא צריך לדעת זה מה
     * קורה עכשיו ומתי.
     */
    if (!paymentReady) {
      return NextResponse.json({
        orderId: order.id,
        orderNumber: order.number,
        total: totals.total,
        payment: null,
        message:
          'נשלח אליך קישור מאובטח לתשלום בוואטסאפ, בדרך כלל תוך שעה בשעות הפעילות. הפריט נשמר עבורך עד אז.',
      });
    }

    // הקישור נוצר מול Grow, ולכן זו קריאת רשת שיכולה להיכשל בנפרד
    // מיצירת ההזמנה. ההזמנה כבר קיימת בשלב הזה, ולכן כישלון כאן
    // מחזיר אותה עם הודעה במקום למחוק אותה
    let payment: string | null = null;
    try {
      payment = await createPayment({
        orderId: order.id,
        orderNumber: order.number,
        amount: totals.total,
        customer,
        siteUrl: SITE_URL,
      });
    } catch (e) {
      console.error('grow createPayment failed', e);
      return NextResponse.json({
        orderId: order.id,
        orderNumber: order.number,
        total: totals.total,
        payment: null,
        message: 'ההזמנה נשמרה, אך פתיחת דף התשלום נכשלה. ניצור איתך קשר.',
      });
    }

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.number,
      total: totals.total,
      payment,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';

    /**
     * קוד הנחה שנדחה - המקרה היחיד כאן שהלקוח יכול לתקן בעצמו.
     *
     * ------------------------------------------------------------------
     * MIKRA20 מוגבל לשימוש אחד ללקוח, וזה נכון: הוא ניתן על ההזמנה
     * הראשונה. אבל לקוח חוזר שהקוד עוד שמור לו בעגלה נדחה ע"י ווקומרס,
     * וקיבל "יצירת ההזמנה נכשלה. נסו שוב" - הודעה שמזמינה אותו ללחוץ
     * שוב על כפתור שייכשל שוב, בלי לרמוז מה לתקן.
     *
     * זה נמצא בבדיקה כאן: אותה כתובת דוא"ל בפעם השנייה, והצ'קאאוט
     * הפך למבוי סתום.
     * ------------------------------------------------------------------
     *
     * 400 ולא 502, כי זו אינה תקלת שרת אלא קלט שאפשר לתקן.
     */
    if (/invalid_coupon/i.test(msg)) {
      return NextResponse.json(
        {
          error:
            'קוד ההנחה כבר נוצל - הוא תקף להזמנה הראשונה בלבד. אפשר להסיר אותו בעגלה ולהמשיך בלעדיו.',
        },
        { status: 400 },
      );
    }

    console.error('checkout failed', e);
    return NextResponse.json({ error: 'יצירת ההזמנה נכשלה. נסו שוב או פנו אלינו.' }, { status: 502 });
  }
}
