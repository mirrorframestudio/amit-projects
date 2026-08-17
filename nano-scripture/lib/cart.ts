'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getProduct } from './catalog';
import { salePrice } from './promo';
import type { BlessingId } from './blessings';

/** אותו תכשיט עם ברכה אחרת הוא שורה נפרדת בעגלה */
export type CartLine = { slug: string; blessing: BlessingId; qty: number };

export const lineKey = (slug: string, blessing: BlessingId) => `${slug}::${blessing}`;

type CartState = {
  lines: CartLine[];
  /** אריזת המתנה היא תוספת להזמנה, לא לשורה - ולכן היא חיה ברמת העגלה */
  gift: boolean;
  open: boolean;
  add: (slug: string, blessing: BlessingId, qty?: number) => void;
  remove: (key: string) => void;
  setQty: (key: string, qty: number) => void;
  setGift: (gift: boolean) => void;
  setOpen: (open: boolean) => void;
};

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      gift: false,
      open: false,
      add: (slug, blessing, qty = 1) =>
        set((s) => {
          const key = lineKey(slug, blessing);
          const exists = s.lines.some((l) => lineKey(l.slug, l.blessing) === key);
          const lines = exists
            ? s.lines.map((l) =>
                lineKey(l.slug, l.blessing) === key ? { ...l, qty: l.qty + qty } : l,
              )
            : [...s.lines, { slug, blessing, qty }];
          return { lines, open: true };
        }),
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
      setOpen: (open) => set({ open }),
    }),
    {
      name: 'ns-cart',
      version: 3,
      partialize: (s) => ({ lines: s.lines, gift: s.gift }) as CartState,
      // ההידרציה נדחית לאפקט כדי שהשרת והלקוח יצבעו אותו דבר בסיבוב הראשון
      skipHydration: true,
      // גרסה 1 לא הכילה ברכה — עגלות ישנות נזרקות במקום לשבור את התצוגה
      migrate: () => ({ lines: [], gift: false }) as unknown as CartState,
    },
  ),
);

export function cartTotals(lines: CartLine[]) {
  let items = 0;
  let subtotal = 0;
  let listTotal = 0;
  for (const line of lines) {
    const product = getProduct(line.slug);
    if (!product) continue;
    items += line.qty;
    listTotal += product.price * line.qty;
    subtotal += salePrice(product.price) * line.qty;
  }
  // subtotal הוא מה שמשלמים בפועל; discount הוא מה שנחסך מול המחירון
  return { items, subtotal, listTotal, discount: listTotal - subtotal };
}
