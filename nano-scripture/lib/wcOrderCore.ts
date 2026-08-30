import { wcPost, skuToId } from './wcClient';
import { getProduct } from './catalog';
import { getBlessing, isBlessingId, type BlessingId } from './blessings';
import { GIFT_BOX } from './extras';
import { POLICY } from './policy';
import { PROMO, isPromoCode, codeDiscount } from './promo';

/**
 * בניית הזמנה בווקומרס מתוך העגלה.
 *
 * ------------------------------------------------------------------
 * הברכה היא לב העניין, ולא פרט נוסף.
 *
 * תולדות עם ברכת הפרנסה ותולדות עם אשת חיל הם אותו מק״ט, אותו מחיר
 * ואותו מלאי. מה שמבדיל ביניהם הוא שדה אחד בשורת ההזמנה - וזה השדה
 * שאומר מה לצרוב על השבב. בלעדיו ההזמנה חסרת משמעות לייצור.
 *
 * זה בדיוק מה שנכשל בוואן זון: מפתחות meta נשמרו בכמה צורות לפי
 * הדרך שבה נוצרה ההזמנה, והסנכרון התאים צורה אחת בלבד. התוצאה הייתה
 * הזמנה של ארבע חולצות שהגיעה לספק בלי מידה ובלי הדפסה, והלקוח קיבל
 * סחורה שגויה.
 *
 * שתי הגנות כאן:
 *   1. מפתח אחד קבוע, BLESSING_KEY, ושום מקום אחר לא כותב אותו.
 *   2. הזמנה בלי ברכה תקינה נזרקת לפני שהיא נשלחת. עדיף שהקנייה
 *      תיכשל בגלוי מאשר שתגיע הזמנה שאי אפשר לייצר.
 * ------------------------------------------------------------------
 */
export const BLESSING_KEY = 'הברכה';

export type OrderLine = { slug: string; blessing: BlessingId; qty: number };

export type OrderInput = {
  lines: OrderLine[];
  gift: boolean;
  code: string | null;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    postcode?: string;
  };
  /** הערת לקוח, אם נמסרה */
  note?: string;
};

export type WcOrder = { id: number; number: string; total: string };

export function buildOrderPayload(input: OrderInput, ids: Map<string, number>) {
  if (!input.lines.length) throw new Error('עגלה ריקה');

  const line_items = input.lines.map((line) => {
    const product = getProduct(line.slug);
    if (!product) throw new Error(`דגם לא מוכר: ${line.slug}`);

    if (!isBlessingId(line.blessing) || !product.blessings.includes(line.blessing)) {
      throw new Error(`ברכה לא תקינה לדגם ${line.slug}: ${line.blessing}`);
    }

    const id = ids.get(product.sku);
    if (!id) throw new Error(`המק״ט ${product.sku} אינו קיים בווקומרס`);

    const b = getBlessing(line.blessing);
    return {
      product_id: id,
      quantity: Math.max(1, Math.round(line.qty)),
      meta_data: [
        // מה שנצרב. הערך הוא השם הקריא, כדי שההזמנה תהיה מובנת
        // בפאנל בלי לתרגם מזהים
        { key: BLESSING_KEY, value: b.plain },
        // המזהה היציב, לכל סנכרון אוטומטי בהמשך
        { key: '_mikra_blessing_id', value: b.id },
      ],
    };
  });

  const itemsTotal = input.lines.reduce((sum, l) => {
    const p = getProduct(l.slug);
    return sum + (p ? p.price * l.qty : 0);
  }, 0);

  const fee_lines = input.gift
    ? [{ name: GIFT_BOX.title, total: String(GIFT_BOX.price), tax_status: 'taxable' }]
    : [];

  const shippingFree =
    POLICY.freeShippingOver !== null && itemsTotal >= POLICY.freeShippingOver;
  const coupon_lines =
    input.code && isPromoCode(input.code) ? [{ code: PROMO.code.toLowerCase() }] : [];

  const c = input.customer;
  const billing = {
    first_name: c.firstName,
    last_name: c.lastName,
    email: c.email,
    phone: c.phone,
    address_1: c.address,
    city: c.city,
    postcode: c.postcode ?? '',
    country: 'IL',
  };

  return {
    payment_method: 'tranzila',
    payment_method_title: 'כרטיס אשראי',
    // ההזמנה נוצרת ממתינה לתשלום. רק הוובהוק של הסולק מעביר אותה
    // ל"בתהליך" - אחרת הזמנה שנטשה באמצע התשלום נראית כמשולמת
    set_paid: false,
    status: 'pending',
    currency: 'ILS',
    billing,
    shipping: { ...billing, email: undefined, phone: undefined },
    line_items,
    fee_lines,
    coupon_lines,
    shipping_lines: [
      {
        method_id: shippingFree ? 'free_shipping' : 'flat_rate',
        method_title: shippingFree ? 'משלוח חינם' : 'משלוח מבוטח',
        total: shippingFree ? '0' : '',
      },
    ],
    customer_note: input.note ?? '',
    meta_data: [{ key: '_mikra_source', value: 'storefront' }],
  };
}

/** יוצר את ההזמנה בפועל. נזרק אם משהו חסר - ולא יוצר הזמנה חלקית */
export async function createOrder(input: OrderInput): Promise<WcOrder> {
  const ids = await skuToId();
  const payload = buildOrderPayload(input, ids);
  return wcPost<WcOrder>('/orders', payload);
}

/** הסכום שהלקוח ישלם, לפי אותם כללים שהעגלה מציגה */
export function orderTotal(input: Pick<OrderInput, 'lines' | 'gift' | 'code'>) {
  const items = input.lines.reduce((sum, l) => {
    const p = getProduct(l.slug);
    return sum + (p ? p.price * l.qty : 0);
  }, 0);
  const discount = codeDiscount(items, input.code);
  const gift = input.gift ? GIFT_BOX.price : 0;
  return { items, discount, gift, total: items - discount + gift };
}
