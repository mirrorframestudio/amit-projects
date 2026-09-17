import type { Metadata, Viewport } from 'next';
import { SITE_URL } from '@/lib/site';
import { Heebo } from 'next/font/google';
import './globals.css';

import SmoothScroll from '@/components/SmoothScroll';
import Reveal from '@/components/RevealEngine';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import PromoBar from '@/components/PromoBar';
import JsonLd from '@/components/JsonLd';
import A11yWidget from '@/components/A11yWidget';
import Analytics from '@/components/Analytics';
import CookieBanner from '@/components/CookieBanner';
import SignupPopup from '@/components/SignupPopup';
import WhatsAppFab from '@/components/WhatsAppFab';
import { organizationSchema, websiteSchema } from '@/lib/schema';

// Heebo לכל האתר - בחירת בעל החנות (14 בספטמבר 2026). לפניו היו
// Assistant, ואחריו יום אחד של Frank Ruhl Libre לכותרות שהוחזר לבקשתו.
// נבדק בקובץ הגופן: נושא את כל סימני הניקוד, דגש, שין ושמאלית, גרש
// וגרשיים, ומיקום סימנים (GPOS) - שמות הדגמים המנוקדים יושבים נכון
const heebo = Heebo({
  subsets: ['hebrew', 'latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-app',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'מִקְרָא · תכשיטי ננו - ברכה שלמה על שבב אחד',
    template: '%s · מִקְרָא',
  },
  description:
    'שרשראות וצמידים בכסף 925 ובפלדת אל־חלד, ובליבת כל אחד מהם שבב שנושא ברכה שלמה - לתינוק, לפרנסה, לשמירה, לאשת חיל. חמישה נוסחים, אחד שלכם.',
  keywords: ['תכשיטי ננו', 'ברכת התינוק', 'ברכת הפרנסה', 'אשת חיל', 'שמירה והגנה', 'מתנה יהודית'],
  // הכתובת הקנונית. בלעדיה `?b=shmira` ו-`?b=parnasa` הם שני עמודים
  // נפרדים בעיני גוגל עם אותו תוכן בדיוק - חמישה־עשר דגמים כפול חמש
  // ברכות הם עד 75 כתובות שמתחרות זו בזו על אותו דירוג
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'he_IL',
    url: '/',
    siteName: 'מִקְרָא',
    title: 'מִקְרָא · כל הכתוב. בגודל של גרגר.',
    description: 'שבב אחד של חמישה מילימטרים נושא ברכה שלמה. חמישה נוסחים לבחירה.',
    // שיתוף בוואטסאפ בלי תמונה הוא שורת טקסט אפורה. בישראל זו רוב
    // התנועה המשותפת, ולתכשיט זה ההבדל בין קליק לבין גלילה הלאה
    images: [{ url: '/hero/hero-landscape.jpg', width: 2400, height: 1357, alt: 'מִקְרָא' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'מִקְרָא · כל הכתוב. בגודל של גרגר.',
    images: ['/hero/hero-landscape.jpg'],
  },
  // אימות Search Console: הטוקן יושב בוורסל (NEXT_PUBLIC_GSC_TOKEN),
  // לא בקוד. בלי הטוקן התג פשוט לא מרונדר
  verification: process.env.NEXT_PUBLIC_GSC_TOKEN ? { google: process.env.NEXT_PUBLIC_GSC_TOKEN } : undefined,
};

export const viewport: Viewport = {
  themeColor: '#faf8f3',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={heebo.variable}
      suppressHydrationWarning
    >
      <body>
        <JsonLd data={[organizationSchema(), websiteSchema()]} />
        <SmoothScroll />
        <Reveal />
        <a href="#main" className="sr-only focus:not-sr-only">
          דילוג לתוכן
        </a>
        <Header />
        <PromoBar spacer />
        <main id="main">{children}</main>
        <Footer />
        <CartDrawer />
        <WhatsAppFab />
        <A11yWidget />
        <CookieBanner />
        <SignupPopup />
        <Analytics />
      </body>
    </html>
  );
}
