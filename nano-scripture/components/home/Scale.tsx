import Counter from '@/components/Counter';
import NanoLoupe from '@/components/NanoLoupe';
import { BLESSINGS, TOTAL_BLESSING_WORDS } from '@/lib/blessings';

const STATS = [
  { value: TOTAL_BLESSING_WORDS, label: 'מילים בחמשת הנוסחים', decimals: 0 },
  { value: 0.5, label: 'מ״מ רוחב שטח הכתיבה', decimals: 1 },
  { value: 9, label: 'מיקרון גובה האות', decimals: 0 },
  { value: 500, label: 'הגדלה נדרשת לקריאה', decimals: 0 },
];

export default function Scale() {
  return (
    <section className="py-32 md:py-40">
      <div className="shell grid items-center gap-16 lg:grid-cols-[1fr_1.05fr] lg:gap-24">
        <div>
          <p className="eyebrow reveal">קנה המידה</p>

          <h2 className="display t-1 mt-5">
            <span className="mask-line">
              <span>גדול מכדי להכיל.</span>
            </span>
            <span className="mask-line">
              <span className="gold-text" style={{ ['--d' as string]: '120ms' }}>
                קטן מכדי לראות.
              </span>
            </span>
          </h2>

          <p className="lede reveal mt-7 max-w-lg" style={{ ['--d' as string]: '160ms' }}>
            שבב הסיליקון שבליבת כל תכשיט קטן מראש סיכה. עליו נצרבות שורות הכתב
            בגובה של תשעה מיקרון - כשמינית מעובי שערת אדם. האות אינה מודפסת ואינה
            מצופה: היא חלק מהחומר עצמו, ולכן לא תדהה ולא תימחק.
          </p>

          <div className="mt-12 grid grid-cols-2 gap-x-8 gap-y-10">
            {STATS.map((s, i) => (
              <div key={s.label} className="reveal" style={{ ['--d' as string]: `${i * 90}ms` }}>
                <p
                  className="display gold-text"
                  style={{ fontSize: 'var(--ds-2)', lineHeight: 1 }}
                >
                  <Counter to={s.value} decimals={s.decimals} />
                </p>
                <p className="mt-2" style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-3)', letterSpacing: '.04em' }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="reveal-x">
          <NanoLoupe blessing={BLESSINGS[0].id} height={520} />
          <p className="mt-5 text-center" style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-3)' }}>
            הדמיית פני השבב · הגדלה פי 9
          </p>
        </div>
      </div>
    </section>
  );
}
