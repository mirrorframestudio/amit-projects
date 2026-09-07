import type { Metadata } from 'next';
import Link from 'next/link';
import { POLICY, deliveryLine } from '@/lib/policy';
import { COMPANY, telHref, waHref } from '@/lib/company';
import ClearCart from './ClearCart';

export const metadata: Metadata = {
  title: 'ההזמנה התקבלה',
  // עמוד אישי שנוצר אחרי תשלום. אין לו מה לחפש בתוצאות החיפוש
  robots: { index: false, follow: false },
};

/**
 * העמוד שאליו Grow מחזיר אחרי תשלום מוצלח.
 *
 * ------------------------------------------------------------------
 * הוא לא היה קיים, וזה היה 404 ברגע הכי גרוע שאפשר.
 *
 * ה-successUrl שנשלח לסולק הצביע על נתיב שלא נבנה. כלומר לקוח היה
 * מזין אשראי, משלם, ונוחת על דף שגיאה - בלי אישור, בלי מספר הזמנה,
 * ובלי לדעת אם הכסף ירד. זו החוויה שמייצרת פנייה לחברת האשראי.
 * ------------------------------------------------------------------
 *
 * מה שכתוב כאן נזהר בניסוח: הדף מאשר שההזמנה התקבלה, ולא מצהיר
 * שהכסף נגבה. הגבייה מאושרת בשרת מול Grow, ולא בדפדפן של הלקוח.
 */
export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; sum?: string }>;
}) {
  const { order, sum } = await searchParams;
  // הסכום מגיע מהסולק, ומשמש למדידת הרכישה בלבד
  const paid = Number(sum);

  return (
    <section className="pb-32 pt-40">
      <ClearCart order={order} sum={Number.isFinite(paid) && paid > 0 ? paid : undefined} />
      <div className="shell max-w-2xl">
        <p className="eyebrow" style={{ color: 'var(--accent)' }}>
          תודה
        </p>
        <h1 className="display t-hero mt-4">ההזמנה התקבלה.</h1>

        {order && (
          <p className="mt-6" style={{ fontSize: 'var(--fs-md)', color: 'var(--ink-2)' }}>
            מספר ההזמנה שלך: <span className="num" style={{ color: 'var(--ink)' }}>#{order}</span>
          </p>
        )}

        <p className="lede mt-6">
          אישור נשלח אליך בדוא״ל. אם הוא לא הגיע תוך כמה דקות, שווה להציץ בתיקיית הספאם.
        </p>

        <ol className="mt-10 flex flex-col gap-5">
          {[
            ['הנוסח נצרב', 'השבב נצרב לפי ההזמנה ומושווה לקובץ המקור תו אחר תו לפני שהוא משובץ.'],
            ['הפריט נארז', 'בקופסה מרופדת, עם כרטיס שנושא את שם הנוסח, מקורותיו והנוסח המלא.'],
            ['יוצא למשלוח', `החבילה יוצאת תוך יום עסקים ומגיעה תוך ${deliveryLine}, מבוטחת.`],
          ].map(([h, p], i) => (
            <li key={h} className="flex gap-4">
              <span
                className="num flex-shrink-0"
                style={{
                  width: 30,
                  height: 30,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: 999,
                  border: '1px solid var(--line-strong)',
                  fontSize: 'var(--fs-xs)',
                  color: 'var(--ink-3)',
                }}
              >
                {i + 1}
              </span>
              <span>
                <span className="display block" style={{ fontSize: 'var(--fs-md)' }}>
                  {h}
                </span>
                <span className="mt-1 block" style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-2)' }}>
                  {p}
                </span>
              </span>
            </li>
          ))}
        </ol>

        <div
          className="mt-10 pt-8"
          style={{ borderTop: '1px solid var(--line)', fontSize: 'var(--fs-sm)', color: 'var(--ink-2)' }}
        >
          <p>
            רוצה לשנות את הנוסח? אפשר כל עוד ההזמנה לא נשלחה — כתוב לנו עם מספר ההזמנה ונחליף.
            אחרי המשלוח חלה מדיניות ההחזרה: {POLICY.returnDays} יום.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {waHref && (
              <a href={waHref} target="_blank" rel="noopener noreferrer" className="btn">
                וואטסאפ
              </a>
            )}
            {telHref && (
              <a href={telHref} className="btn">
                <span className="ltr num">{COMPANY.phone}</span>
              </a>
            )}
            <Link href="/categories/necklaces" className="btn btn-solid">
              המשך לקטלוג
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
