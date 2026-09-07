import { NextResponse, type NextRequest } from 'next/server';
import { approveTransaction, paymentReady } from '@/lib/grow';
import { wcPut, wcReady } from '@/lib/wc';

export const dynamic = 'force-dynamic';

/**
 * POST /api/payment/callback — הודעת השרת של Grow אחרי תשלום.
 *
 * ------------------------------------------------------------------
 * שני דברים חייבים לקרות כאן, ובסדר הזה.
 *
 * ראשית approveTransaction. עד שהקריאה הזו רצה הכסף לא נגבה, ולכן
 * אם היא נכשלת אסור לסמן את ההזמנה כשולמה - לקוח שרואה "שולם" מול
 * תשלום שלא הושלם הוא הכשל היקר ביותר בצ'קאאוט.
 *
 * ורק אחר כך עדכון ההזמנה בווקומרס. מזהה ההזמנה חוזר ב-cField1,
 * בדיוק כפי ששלחנו אותו.
 * ------------------------------------------------------------------
 *
 * Grow שולח FormData, לא JSON.
 */
export async function POST(req: NextRequest) {
  if (!paymentReady) {
    return NextResponse.json({ error: 'הסליקה אינה מוגדרת' }, { status: 503 });
  }

  let fields: Record<string, string> = {};
  try {
    const form = await req.formData();
    for (const [k, v] of form.entries()) fields[k] = String(v);
  } catch {
    return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
  }

  const orderId = Number(fields.cField1 || fields['data[cField1]'] || 0);

  try {
    // חובה. בלי זה העסקה נשארת לא מאושרת אצל הסולק
    await approveTransaction(fields);
  } catch (e) {
    console.error('grow approveTransaction failed', { orderId, e });
    // 500 מסמן ל-Grow שהאישור לא עבר, והם ינסו שוב
    return NextResponse.json({ error: 'האישור נכשל' }, { status: 500 });
  }

  if (orderId && wcReady) {
    try {
      await wcPut(`/orders/${orderId}`, {
        status: 'processing',
        set_paid: true,
        transaction_id: fields.transactionId || fields.asmachta || '',
        payment_method: 'grow',
        payment_method_title: 'Grow · כרטיס אשראי',
      });
    } catch (e) {
      // התשלום כבר אושר, ולכן זו אינה שגיאה שמחזירים ל-Grow: חזרה
      // על הקריאה תאשר פעמיים. נרשם, ומטפלים ידנית
      console.error('grow paid but order update failed', { orderId, e });
    }
  }

  return NextResponse.json({ status: 1 });
}
