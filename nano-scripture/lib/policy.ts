/**
 * מספרי המדיניות. מקור אמת יחיד.
 *
 * הם היו מפוזרים בשתים־עשרה מחרוזות - בתקנון, ברצועת האמון, בטיקר,
 * בשאלות הנפוצות ובדף המוצר - וכל שינוי חייב לזכור את כולן. אחרי
 * ששיניתי את אחריות הסוגר ואת זמן המשלוח, זה כבר לא ריאלי ביד.
 */
export const POLICY = {
  /** גוף התכשיט: הלחמות, שיבוץ השבב, שיבוץ האבן */
  warrantyMonths: 12,
  /** הסוגר בנפרד. החלק הנע, ולכן תקופה קצרה יותר */
  claspMonths: 2,
  platingGoldMonths: 3,
  platingRhodiumMonths: 6,

  deliveryMinDays: 1,
  deliveryMaxDays: 4,
  returnDays: 30,
  freeShippingOver: 450,
} as const;

/** "1-4 ימי עסקים" - הניסוח היחיד. ה־num עוטף במקומות שצריך LTR */
export const deliveryDays = `${POLICY.deliveryMinDays}-${POLICY.deliveryMaxDays}`;
export const deliveryLine = `${deliveryDays} ימי עסקים`;

export const warrantyTitle = 'שנה אחריות';
export const warrantyNote = `על גוף התכשיט · ${POLICY.claspMonths} חודשים על הסוגר`;
