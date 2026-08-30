/**
 * כתובת האתר. מקור אמת יחיד ל־metadataBase, ל־sitemap ול־robots.
 *
 * נקראת מהסביבה כדי שהמעבר מהדומיין הזמני לדומיין האמיתי יהיה
 * שינוי של משתנה אחד בוורסל, ולא חיפוש מחרוזת בקוד. ברירת המחדל
 * היא הדומיין הזמני, ולא placeholder שישבור כל קישור שישותף.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://mikra.vercel.app'
).replace(/\/$/, '');

/** האם זו כבר הכתובת הסופית. עד אז אין טעם שגוגל יאנדקס */
export const IS_LIVE_DOMAIN = !/vercel\.app$|pages\.dev$|localhost/.test(SITE_URL);
