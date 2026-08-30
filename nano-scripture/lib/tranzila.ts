import 'server-only';
import { POLICY } from './policy';

/**
 * הפניה לסליקה בטרנזילה.
 *
 * הטרמינל טרם נפתח - מקרא היא עוסק נפרד מוואן זון, וטרמינל חדש הוא
 * תהליך של שבועות. עד שהוא יהיה, `tranzilaReady` הוא false והצ'קאאוט
 * עוצר אחרי יצירת ההזמנה עם הודעה ברורה, במקום לשלוח את הלקוח לדף
 * שבור.
 *
 * זו הנקודה היחידה בקוד שיודעת משהו על טרנזילה. כשהטרמינל ייפתח,
 * מה שנדרש הוא משתנה סביבה אחד - ואם יוחלט על סולק אחר, זה הקובץ
 * היחיד שמוחלף.
 *
 * הסכום נשלח בשקלים (currency=1). ההזמנה נוצרת ב-WooCommerce לפני
 * ההפניה ומזהה שלה נוסע בשדה חופשי, כדי שהחזרה מהסליקה תדע לאיזו
 * הזמנה לשייך את התשלום.
 */
const TERMINAL = process.env.TRANZILA_TERMINAL || '';

export const tranzilaReady = Boolean(TERMINAL);

export type PaymentRequest = {
  orderId: number;
  orderNumber: string;
  amount: number;
  customer: { firstName: string; lastName: string; email: string; phone: string };
  siteUrl: string;
};

export function paymentUrl(req: PaymentRequest): string {
  if (!tranzilaReady) throw new Error('טרמינל הסליקה טרם הוגדר');

  const p = new URLSearchParams({
    sum: req.amount.toFixed(2),
    currency: '1', // שקל
    cred_type: '1',
    maxpay: String(POLICY.maxInstallments ?? 1),
    contact: `${req.customer.firstName} ${req.customer.lastName}`.trim(),
    email: req.customer.email,
    phone: req.customer.phone,
    // חוזר אלינו בשובר - כך החזרה מהסליקה יודעת לאיזו הזמנה לשייך
    order_id: String(req.orderId),
    u71: '1', // אישור מיידי בחלון החוזר
    success_url_address: `${req.siteUrl}/checkout/success?order=${req.orderId}`,
    fail_url_address: `${req.siteUrl}/checkout/failed?order=${req.orderId}`,
    notify_url_address: `${req.siteUrl}/api/tranzila/webhook`,
    lang: 'il',
  });

  return `https://direct.tranzila.com/${TERMINAL}/iframenew.php?${p.toString()}`;
}
