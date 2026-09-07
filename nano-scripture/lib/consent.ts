/**
 * הסכמה לעוגיות.
 *
 * ------------------------------------------------------------------
 * מה באמת רץ באתר הזה כרגע.
 *
 * אין גוגל אנליטיקס, אין פיקסל של מטא, ואין אף סקריפט צד־שלישי. מה
 * שכן נשמר בדפדפן הוא העגלה ובחירות התצוגה - אחסון מקומי, לא עוגיות,
 * ותפקודי לחלוטין. לכן הבאנר אינו מבקש רשות למה שכבר רץ, אלא קובע
 * את התשובה מראש למה שייכנס: ברגע שיתווסף פיקסל, הוא ייבדק מול
 * hasConsent('marketing') ולא ייטען למי שסירב.
 *
 * זה ההפך מהסדר הרגיל, שבו הבאנר מותקן אחרי שהמעקב כבר עובד וכל
 * מטרתו היא לגהץ בדיעבד משהו שכבר קרה.
 * ------------------------------------------------------------------
 */
export type ConsentLevel = 'all' | 'essential';

export type Consent = { level: ConsentLevel; at: string };

export const CONSENT_KEY = 'mikra:consent';

export function readConsent(): Consent | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Consent;
    return parsed.level === 'all' || parsed.level === 'essential' ? parsed : null;
  } catch {
    // גלישה פרטית, או אחסון חסום. אין הסכמה, ולכן אין מדידה
    return null;
  }
}

export function writeConsent(level: ConsentLevel) {
  const value: Consent = { level, at: new Date().toISOString() };
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(value));
  } catch {
    /* בלי אחסון אין מה לזכור, והברירה נשארת המחמירה */
  }
  window.dispatchEvent(new CustomEvent('mikra:consent', { detail: value }));
  return value;
}

/**
 * השער לכל סקריפט מדידה עתידי.
 *
 * ברירת המחדל היא false - כל עוד לא נאמר "כן" מפורשות, התשובה היא
 * לא. באנר שברירת המחדל שלו היא הסכמה אינו באנר הסכמה.
 */
export function hasConsent(kind: 'analytics' | 'marketing') {
  void kind;
  return readConsent()?.level === 'all';
}
