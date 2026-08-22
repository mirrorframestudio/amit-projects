import type { Metadata } from 'next';
import { BLESSINGS, TOTAL_BLESSING_WORDS } from '@/lib/blessings';
import BlessingCard from '@/components/BlessingCard';
import { blessingPhotos } from '@/lib/catalog';
import NanoLoupe from '@/components/NanoLoupe';

export const metadata: Metadata = {
  title: 'חמש הברכות',
  description:
    'חמישה נוסחים שנצרבים על השבב: ברכת התינוק, ברכת הפרנסה, הברכה שלך, שמירה והגנה, ואשת חיל. כל נוסח במלואו, ללא קיצור.',
};

export default function BlessingsPage() {
  const photos = blessingPhotos(BLESSINGS.map((b) => b.id));

  return (
    <>
      <section className="pt-40 pb-14">
        <div className="shell">
          <p className="eyebrow reveal load">מה נצרב על השבב</p>
          <h1 className="display t-hero mt-5">
            <span className="mask-line load">
              <span>חמש ברכות.</span>
            </span>
            <span className="mask-line load">
              <span className="gold-text" style={{ ['--d' as string]: '130ms' }}>
                אחת שלכם.
              </span>
            </span>
          </h1>
          <p className="lede reveal load mt-8 max-w-2xl" style={{ ['--d' as string]: '280ms' }}>
            כל תכשיט בקטלוג יכול לשאת כל אחת מהחמש - הבחירה נעשית בעמוד המוצר,
            והשבב נצרב אחרי ההזמנה. הנוסחים מובאים במלואם, מילה במילה, בלי קיצור
            ובלי עריכה.
          </p>

          <div className="mt-10 flex flex-wrap gap-x-12 gap-y-6">
            {[
              { v: BLESSINGS.length, l: 'נוסחים' },
              { v: TOTAL_BLESSING_WORDS.toLocaleString('he-IL'), l: 'מילים בסך הכול' },
              { v: '0.5 מ״מ²', l: 'שטח הצריבה' },
            ].map((s, i) => (
              <div key={s.l} className="reveal load" style={{ ['--d' as string]: `${380 + i * 70}ms` }}>
                <p className="num display" style={{ fontSize: 'var(--fs-2xl)', lineHeight: 1 }}>{s.v}</p>
                <p className="mt-1.5" style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-3)' }}>{s.l}</p>
              </div>
            ))}
          </div>
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

      <section className="pb-32">
        <div className="shell grid gap-6 md:grid-cols-2 lg:grid-cols-6">
          {BLESSINGS.map((b, i) => (
            <div
              key={b.id}
              className={i === 3 ? 'lg:col-span-2 lg:col-start-2' : 'lg:col-span-2'}
            >
              <BlessingCard blessing={b} index={i} photo={photos[b.id]} />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
