/**
 * מבצע רוחבי — מקור אמת יחיד.
 * כיבוי המבצע = active:false, וכל המחירים באתר חוזרים למחירון בלי נגיעה נוספת.
 */
export const PROMO = {
  active: true,
  percent: 20,
  headline: '20% הנחה על כל התכשיטים',
  sub: 'ההנחה כבר מחושבת במחיר שמוצג',
  badge: '20%-',
  pill: '20% הנחה',
} as const;

export const promoOn = PROMO.active && PROMO.percent > 0;

/** מעוגל לשקל שלם — 749 ← 599, 329 ← 263 */
export function salePrice(price: number) {
  return promoOn ? Math.round(price * (1 - PROMO.percent / 100)) : price;
}

export function saleOf(price: number) {
  const now = salePrice(price);
  return { was: price, now, saved: price - now, discounted: now < price };
}
