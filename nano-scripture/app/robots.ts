import type { MetadataRoute } from 'next';
import { SITE_URL, IS_LIVE_DOMAIN } from '@/lib/site';

/**
 * עד שיש דומיין אמיתי, האתר חסום לאינדוקס.
 *
 * דומיין זמני שנכנס לגוגל יוצר תוכן כפול מול הדומיין הסופי, ואת זה
 * קשה לנקות אחר כך. החסימה מתבטלת לבד ברגע ש־NEXT_PUBLIC_SITE_URL
 * מצביע לדומיין אמיתי.
 */
export default function robots(): MetadataRoute.Robots {
  if (!IS_LIVE_DOMAIN) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }
  // הצ'קאאוט וה-API אינם עמודים. הם כבר noindex, אבל אין סיבה לזחול בהם
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/checkout'] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
