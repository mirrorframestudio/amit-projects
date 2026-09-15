/**
 * אמצעי התשלום שהחנות מקבלת.
 *
 * ------------------------------------------------------------------
 * הרשימה הזו חייבת להיות זהה למה שדולק בטרמינל של Grow.
 *
 * סימן של אמצעי תשלום שלא עובד בפועל הוא הבטחה שנשברת בדיוק ברגע
 * התשלום - הרגע הכי רגיש בקנייה. אמצעי שכובה בטרמינל - מוחקים
 * מכאן באותו יום. עמית (15 בספטמבר 2026): "אני הולך לקבל את כל
 * אמצעי התשלום" - זו הרשימה שנפתחת.
 * ------------------------------------------------------------------
 *
 * הסדר הוא סדר התצוגה: הכרטיסים הנפוצים בישראל, ואז הארנקים.
 */
export type PaymentId =
  | 'visa'
  | 'mastercard'
  | 'amex'
  | 'isracard'
  | 'diners'
  | 'bit'
  | 'applepay'
  | 'googlepay'
  | 'paypal';

export const PAYMENT_METHODS: { id: PaymentId; label: string }[] = [
  { id: 'visa', label: 'ויזה' },
  { id: 'mastercard', label: 'מאסטרקארד' },
  { id: 'amex', label: 'אמריקן אקספרס' },
  { id: 'isracard', label: 'ישראכרט' },
  { id: 'diners', label: 'דיינרס' },
  { id: 'bit', label: 'ביט' },
  { id: 'applepay', label: 'Apple Pay' },
  { id: 'googlepay', label: 'Google Pay' },
  { id: 'paypal', label: 'PayPal' },
];
