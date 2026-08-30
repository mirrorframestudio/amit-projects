import 'server-only';

/** עטיפה שאוסרת ייבוא מהלקוח. הליבה ב-wcOrderCore, כדי שסקריפטים
 *  ובדיקות יוכלו להריץ אותה מחוץ ל-Next */
export * from './wcOrderCore';
