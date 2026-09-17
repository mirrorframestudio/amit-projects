import { NextResponse, type NextRequest } from 'next/server';

/**
 * החנות הקודמת שישבה על הדומיין.
 *
 * ------------------------------------------------------------------
 * `site:mikra.shop` בגוגל (17.9.2026) מחזיר את הבעלים הקודם: "Domain
 * Name For Sale | Dan.com" כעמוד הבית, ועמודי ספאם של חנות Shopify -
 * `/de-adl`, `/ro-lmny/products/glucometro-senza-puntura`,
 * `/collections/multifunctional-rechargeable-drill-...`. זה מה שגוגל
 * "יודע" על הדומיין, וזו הסיבה שהאתר לא נמצא בחיפוש.
 * ------------------------------------------------------------------
 *
 * הנתיבים האלה מחזירים 410 (Gone) ולא 404: 404 אומר "לא מצאתי, אולי
 * יחזור", ו-410 אומר "נמחק, אל תחזור" - וגוגל מוריד אותו מהאינדקס
 * מהר יותר. הדפוסים: מבנה של Shopify, וקידומות שפה כמו de-adl.
 * לאתר שלנו אין אף נתיב שמתחיל בשתי אותיות ומקף.
 */
const GONE = [
  /^\/(collections|pages|blogs|cart|account|checkouts)(\/|$)/,
  /^\/[a-z]{2}-[a-z]{2,5}(\/|$)/,
];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (GONE.some((re) => re.test(pathname))) {
    return new NextResponse('Gone', { status: 410, headers: { 'X-Robots-Tag': 'noindex' } });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|api|products|categories|blessings|guides|legal|craft|checkout|feed.xml|sitemap.xml|robots.txt).*)'],
};
