import { POLICY } from './policy';

/**
 * חלון ההגעה, בתאריכים.
 *
 * ------------------------------------------------------------------
 * "2-4 ימי עסקים" הבטיח תאריך דרך יום כיפור.
 *
 * החישוב הקודם דילג על שישי ושבת בלבד, בעוד שעמוד המשלוחים אומר
 * "ימי עסקים אינם כוללים שבתות, חגים וערבי חג". בשבוע של החגים זה
 * הפרש של ימים שלמים - והתאריך שהוצג בעמוד המוצר היה הבטחה שאף
 * שליח לא מקיים.
 * ------------------------------------------------------------------
 *
 * הרשימה למטה היא חגים וערבי חג לפי לוח ישראל (hebcal.com, i=on),
 * ויום העצמאות. **לעדכן פעם בשנה** - כשהשנה הבאה חסרה, החישוב חוזר
 * בשקט להתעלם מהחגים, בלי לשבור דבר.
 *
 * הקובץ הזה רץ גם בדפדפן וגם בשרת; אין בו server-only.
 */
export const NON_BUSINESS_DAYS: ReadonlySet<string> = new Set([
  // תשפ״ז
  '2026-09-20', '2026-09-21', // ערב יום כיפור, יום כיפור
  '2026-09-25', '2026-09-26', // ערב סוכות, סוכות
  '2026-10-02', '2026-10-03', // הושענא רבה, שמיני עצרת
  '2027-04-21', '2027-04-22', // ערב פסח, פסח
  '2027-04-27', '2027-04-28', // ערב שביעי של פסח, שביעי של פסח
  '2027-05-12', // יום העצמאות
  '2027-06-10', '2027-06-11', // ערב שבועות, שבועות
  // תשפ״ח
  '2027-10-01', '2027-10-02', '2027-10-03', // ערב ראש השנה, ראש השנה
  '2027-10-10', '2027-10-11', // ערב יום כיפור, יום כיפור
  '2027-10-15', '2027-10-16', // ערב סוכות, סוכות
  '2027-10-22', '2027-10-23', // הושענא רבה, שמיני עצרת
]);

/** YYYY-MM-DD בזמן מקומי. לא toISOString - הוא מזיז ל-UTC וחוצה חצות */
function localKey(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function isBusinessDay(d: Date) {
  const day = d.getDay();
  // שישי ושבת אינם ימי עסקים בישראל
  if (day === 5 || day === 6) return false;
  return !NON_BUSINESS_DAYS.has(localKey(d));
}

export function addBusinessDays(from: Date, days: number) {
  const d = new Date(from);
  let left = days;
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    if (isBusinessDay(d)) left--;
  }
  return d;
}

/** מתי חבילה שמוזמנת עכשיו מגיעה, לפי המדיניות */
export function deliveryWindow(from: Date = new Date()) {
  return {
    from: addBusinessDays(from, POLICY.deliveryMinDays),
    to: addBusinessDays(from, POLICY.deliveryMaxDays),
  };
}

/** "17-21 בספטמבר", או "29 בספטמבר - 4 באוקטובר" כשהחלון חוצה חודש */
export function formatWindow({ from, to }: { from: Date; to: Date }) {
  const fmt = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'long' });
  return from.getMonth() === to.getMonth()
    ? `${from.getDate()}-${fmt.format(to)}`
    : `${fmt.format(from)} - ${fmt.format(to)}`;
}
