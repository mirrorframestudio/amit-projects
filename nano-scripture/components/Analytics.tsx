'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Script from 'next/script';
import { GA_ID, PIXEL_ID, analyticsOn, trackPageView } from '@/lib/analytics';
import { hasConsent } from '@/lib/consent';

/**
 * טעינת סקריפטי המדידה - אחרי הסכמה, ולא לפניה.
 *
 * ------------------------------------------------------------------
 * הסדר כאן הוא ההפך מהמקובל.
 *
 * ברוב האתרים הפיקסל נטען עם העמוד, והבאנר מבקש רשות למשהו שכבר
 * קרה. כאן הרכיב פשוט לא מרנדר את הסקריפטים עד שיש "אישור הכל" -
 * מי שבחר "רק הכרחיות" לא מוריד את הקוד בכלל, לא רק שלא נמדד.
 * ------------------------------------------------------------------
 *
 * הרכיב מאזין ל-`mikra:consent`, ולכן לחיצה על "אישור הכל" מתחילה
 * למדוד מיד ולא רק אחרי רענון - אחרת הביקור הראשון, זה שהגיע
 * מהמודעה, הוא בדיוק זה שאובד.
 */
export default function Analytics() {
  const pathname = usePathname();
  const [granted, setGranted] = useState(false);
  /**
   * הצפייה הראשונה נספרת על ידי `config` של גוגל ועל ידי `PageView`
   * של מטא, בתוך קוד האתחול. בלי הדילוג הזה כל כניסה נספרת פעמיים.
   */
  const counted = useRef(false);

  useEffect(() => {
    if (!analyticsOn) return;
    const sync = () => setGranted(hasConsent('analytics'));
    sync();
    window.addEventListener('mikra:consent', sync);
    return () => window.removeEventListener('mikra:consent', sync);
  }, []);

  // ניווט פנימי. האתר הוא אפליקציית עמוד יחיד, והסקריפטים נטענים
  // פעם אחת - בלי זה כל המסע אחרי העמוד הראשון לא מתועד
  useEffect(() => {
    if (!granted) return;
    if (!counted.current) {
      counted.current = true;
      return;
    }
    trackPageView(pathname ?? '/');
  }, [granted, pathname]);

  if (!analyticsOn || !granted) return null;

  return (
    <>
      {GA_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments)}
window.gtag=gtag;
gtag('js',new Date());
gtag('config','${GA_ID}');`}
          </Script>
        </>
      )}

      {PIXEL_ID && (
        <Script id="fb-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${PIXEL_ID}');
fbq('track','PageView');`}
        </Script>
      )}
    </>
  );
}
