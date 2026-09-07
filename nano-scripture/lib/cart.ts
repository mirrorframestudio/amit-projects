'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getProduct } from './catalog';
import { codeDiscount } from './promo';
import { isBlessingId } from './blessings';
import type { BlessingId } from './blessings';
import { trackAddToCart } from './analytics';

/** אותו תכשיט עם ברכה אחרת הוא שורה נפרדת בעגלה */
export type CartLine = { slug: string; blessing: BlessingId; qty: number };

export const lineKey = (slug: string, blessing: BlessingId) => `${slug}::${blessing}`;

type CartState = {
  lines: CartLine[];
  /** אריזת המתנה היא תוספת להזמנה, לא לשורה - ולכן היא חיה ברמת העגלה */
  gift: boolean;
  /** קוד ההנחה כפי שהוזן. נשמר כדי שלא יאבד ברענון באמצע הקנייה */
  code: string | null;
  open: boolean;
  add: (slug: string, blessing: BlessingId, qty?: number) => void;
  remove: (key: string) => void;
  setQty: (key: string, qty: number) => void;
  setGift: (gift: boolean) => void;
  setCode: (code: string | null) => void;
  setOpen: (open: boolean) => void;
  /** ריקון אחרי תשלום מוצלח. עגלה ששורדת קנייה מזמינה קנייה כפולה */
  clear: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      gift: false,
      code: null,
      open: false,
      add: (slug, blessing, qty = 1) => {
        // שער אחרון לפני העגלה.
        //
        // הפריט נעשה בהזמנה והנוסח נצרב - אין דרך חזרה. שני כפתורי
        // קרוס־סל העבירו לכאן את p.blessings[0], כלומר את הברכה
        // שסודרה ראשונה, על סמך כלום. הם תוקנו, אבל הבדיקה יושבת
        // כאן ולא בהם: קורא חדש שייכתב מחר לא יידע להיזהר.
        //
        // הבדיקה יצאה מתוך `set`: מעדכן מצב צריך להיות פונקציה טהורה,
        // ואירוע מדידה בתוכו היה נורה פעמיים במצב פיתוח.
        const product = getProduct(slug);
        if (!product || !isBlessingId(blessing) || !product.blessings.includes(blessing)) {
          if (process.env.NODE_ENV !== 'production') {
            console.error(`[cart] סירוב: ${slug} אינו נושא את ${blessing}`);
          }
          return;
        }

        set((s) => {
          const key = lineKey(slug, blessing);
          const exists = s.lines.some((l) => lineKey(l.slug, l.blessing) === key);
          const lines = exists
            ? s.lines.map((l) =>
                lineKey(l.slug, l.blessing) === key ? { ...l, qty: l.qty + qty } : l,
              )
            : [...s.lines, { slug, blessing, qty }];
          return { lines, open: true };
        });

        // המדידה יושבת כאן ולא בכפתורים. שלושה מקומות באתר מוסיפים
        // לעגלה, ואירוע שנתלה בהם היה מפספס את הרביעי שייכתב מחר
        trackAddToCart(product, blessing, qty);
      },
      remove: (key) =>
        set((s) => ({ lines: s.lines.filter((l) => lineKey(l.slug, l.blessing) !== key) })),
      setQty: (key, qty) =>
        set((s) => ({
          lines:
            qty <= 0
              ? s.lines.filter((l) => lineKey(l.slug, l.blessing) !== key)
              : s.lines.map((l) =>
                  lineKey(l.slug, l.blessing) === key ? { ...l, qty } : l,
                ),
        })),
      setGift: (gift) => set({ gift }),
      setCode: (code) => set({ code }),
      setOpen: (open) => set({ open }),
      clear: () => set({ lines: [], gift: false, code: null, open: false }),
    }),
    {
      name: 'ns-cart',
      version: 4,
      partialize: (s) => ({ lines: s.lines, gift: s.gift, code: s.code }) as CartState,
      // ההידרציה נדחית לאפקט כדי שהשרת והלקוח יצבעו אותו דבר בסיבוב הראשון
      skipHydration: true,
      // גרסה 1 לא הכילה ברכה — עגלות ישנות נזרקות במקום לשבור את התצוגה
      migrate: () => ({ lines: [], gift: false, code: null }) as unknown as CartState,
    },
  ),
);

export function cartTotals(lines: CartLine[], code: string | null = null) {
  let items = 0;
  let listTotal = 0;
  for (const line of lines) {
    const product = getProduct(line.slug);
    if (!product) continue;
    items += line.qty;
    listTotal += product.price * line.qty;
  }
  // ההנחה מגיעה מקוד שהוזן, ולא מחושבת מראש לתוך המחירים.
  // listTotal הוא מה שנגבה בלי קוד; subtotal הוא מה שמשלמים איתו.
  const discount = codeDiscount(listTotal, code);
  return { items, listTotal, discount, subtotal: listTotal - discount };
}
