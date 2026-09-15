import type { Metadata } from 'next';
import { BLESSINGS } from '@/lib/blessings';
import BlessingCard from '@/components/BlessingCard';
import NanoLoupe from '@/components/NanoLoupe';

export const metadata: Metadata = {
  title: 'חמש הברכות',
  alternates: { canonical: '/blessings' },
  description:
    'חמישה נוסחים שנצרבים על השבב: ברכת התינוק, ברכת הפרנסה, הברכה שלך, שמירה והגנה, ואשת חיל. כל נוסח במלואו, ללא קיצור.',
  openGraph: {
    type: 'website',
    url: '/blessings',
    title: 'חמש הברכות · מִקְרָא',
    description: 'חמישה נוסחים שנצרבים על השבב, כל אחד במלואו. הבחירה נעשית בעמוד המוצר.',
    images: [{ url: '/scene/pair-trio.jpg', alt: 'שלושה תליונים של מִקְרָא' }],
  },
};

export default function BlessingsPage() {
  return (
    <>
      <section className="pt-40 pb-14">
        <div className="shell">
          <h1 className="display t-hero">
            <span className="mask-line load">
              <span>חמש ברכות.</span>
            </span>
            <span className="mask-line load">
              <span className="accent-text" style={{ ['--d' as string]: '130ms' }}>
                אחת שלכם.
              </span>
            </span>
          </h1>
          {/* בלי שורת מספרים. "5 נוסחים" הוא מה שהכותרת אומרת, וסך המילים
              ושטח הצריבה כבר יושבים בעמוד הבית - כאן זו הייתה חזרה בתבנית */}
          <p className="lede reveal load mt-8 max-w-2xl" style={{ ['--d' as string]: '280ms' }}>
            כל דגם נושא נוסח אחד או יותר מתוך החמש - אילו, כתוב בעמוד המוצר, ושם
            גם בוחרים. השבב נצרב אחרי ההזמנה. הנוסחים מובאים במלואם, מילה במילה,
            בלי קיצור ובלי עריכה.
          </p>
        </div>
      </section>

      <section className="pb-20">
        <div className="shell">
          <NanoLoupe blessing={BLESSINGS[0].id} height={360} />
          <p className="mt-4 text-center" style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-3)' }}>
            הדמיית פני השבב · {BLESSINGS[0].plain} · הגדלה פי 9
          </p>
        </div>
      </section>

      {/* אינדקס, לא רשת. חמש שורות על קו אחד, כמו תוכן עניינים -
          המילים הן הגיבור, ולא הקופסה שסביבן */}
      <section className="pb-32">
        <div className="shell" style={{ borderBottom: '1px solid var(--line)' }}>
          {BLESSINGS.map((b, i) => (
            <BlessingCard key={b.id} blessing={b} index={i} />
          ))}
        </div>
      </section>
    </>
  );
}
