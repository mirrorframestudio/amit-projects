import NanoLoupe from '@/components/NanoLoupe';
import { BLESSINGS, TOTAL_BLESSING_WORDS } from '@/lib/blessings';

/**
 * המספרים עומדים. קודם הם נספרו מאפס בכניסה למסך, בגרדיאנט זהב
 * מהבהב - מונה רץ הוא סימן היכר של עמוד מיוצר, ומספר שמתחלף לא נקרא
 * עד שהוא נעצר. מספר עומד נקרא מיד.
 */
const STATS = [
  { value: TOTAL_BLESSING_WORDS.toLocaleString('he-IL'), label: 'מילים בחמשת הנוסחים' },
  { value: '0.5', label: 'מ״מ רוחב שטח הכתיבה' },
  { value: '9', label: 'מיקרון גובה האות' },
  { value: '500', label: 'הגדלה נדרשת לקריאה' },
];

export default function Scale() {
  return (
    <section className="py-9 md:py-28">
      <div className="shell grid items-center gap-10 lg:grid-cols-[1fr_1.05fr] lg:gap-24">
        <div>
          <h2 className="display t-1">
            <span className="mask-line">
              <span>גדול מכדי להכיל.</span>
            </span>
            <span className="mask-line">
              <span className="accent-text" style={{ ['--d' as string]: '120ms' }}>
                קטן מכדי לראות.
              </span>
            </span>
          </h2>

          <p className="lede reveal mt-7 max-w-lg" style={{ ['--d' as string]: '160ms' }}>
            שבב הסיליקון שבליבת כל תכשיט קטן מראש סיכה. עליו נצרבות שורות הכתב
            בגובה של תשעה מיקרון - כשמינית מעובי שערת אדם. האות אינה מודפסת ואינה
            מצופה: היא חלק מהחומר עצמו, ולכן לא תדהה ולא תימחק.
          </p>

          <dl className="mt-12 grid grid-cols-2 gap-x-8 gap-y-8">
            {STATS.map((s, i) => (
              <div key={s.label} className="reveal" style={{ ['--d' as string]: `${i * 90}ms` }}>
                <dd
                  className="num display"
                  style={{ fontSize: 'var(--ds-2)', lineHeight: 1, color: 'var(--accent-deep)' }}
                >
                  {s.value}
                </dd>
                <dt className="mt-2" style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-3)' }}>
                  {s.label}
                </dt>
              </div>
            ))}
          </dl>
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
