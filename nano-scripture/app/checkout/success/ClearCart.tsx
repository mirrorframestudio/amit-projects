'use client';

import { useEffect, useRef } from 'react';
import { useCart, cartTotals } from '@/lib/cart';
import { GIFT_BOX } from '@/lib/extras';
import { trackPurchase } from '@/lib/analytics';

/**
 * סוף המסע: מדידת הרכישה, ואז ריקון העגלה.
 *
 * העגלה חיה ב-localStorage ושורדת ניווט, ולכן בלי הריקון הזה הלקוח
 * חוזר לאתר עם אותם פריטים בעגלה אחרי שכבר שילם עליהם - וזו הזמנה
 * כפולה שמחכה לקרות.
 *
 * ------------------------------------------------------------------
 * הסדר בין השניים אינו שרירותי.
 *
 * אירוע הרכישה נושא את הפריטים שנקנו, והם קיימים רק כל עוד העגלה
 * לא רוקנה. ריקון לפני מדידה שולח למטא רכישה בלי תוכן - כלומר בלי
 * מה לאופטם עליו ובלי קטלוג לרימרקטינג.
 * ------------------------------------------------------------------
 *
 * רץ באפקט ולא ברינדור: החנות מוגדרת skipHydration, והיא זמינה רק
 * אחרי ההרכבה.
 */
export default function ClearCart({ order, sum }: { order?: string; sum?: number }) {
  const clear = useCart((s) => s.clear);
  // React מריץ אפקטים פעמיים בפיתוח, ורכישה אינה דבר שנמדד פעמיים
  const once = useRef(false);

  useEffect(() => {
    if (once.current) return;
    once.current = true;

    useCart.persist.rehydrate();

    const { lines, gift, code } = useCart.getState();
    if (order && lines.length) {
      // הסכום מגיע מהסולק דרך הכתובת. אם אינו שם, נגזר מהעגלה - עדיף
      // ערך שמחושב מהמחירון על פני רכישה בלי ערך בכלל
      const value = sum ?? cartTotals(lines, code).subtotal + (gift ? GIFT_BOX.price : 0);
      trackPurchase(order, value, lines);
    }

    clear();
  }, [clear, order, sum]);

  return null;
}
