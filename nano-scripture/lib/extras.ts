/**
 * תוספות בתשלום ופריסת תשלומים.
 *
 * האריזה הרגילה - קופסה מרופדת, כרטיס ברכה וזכוכית מגדלת - נשארת כלולה
 * בכל הזמנה. זו שדרוג ולא תחליף, אחרת האתר גובה על מה שהוא מבטיח בחינם.
 */
export const GIFT_BOX = {
  price: 49,
  title: 'אריזת מתנה',
  note: 'קופסה קשיחה עטופה בבד, עם סרט וכרטיס חתום. מגיעה סגורה ומוכנה למסירה.',
} as const;

export const INSTALLMENTS = 5;

/** התשלום החודשי בפריסה, מעוגל לשקל */
export function perInstallment(total: number) {
  return Math.round(total / INSTALLMENTS);
}
