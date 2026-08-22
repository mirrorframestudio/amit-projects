import type { Metadata } from 'next';
import Link from 'next/link';
import Process from '@/components/home/Process';
import NanoLoupe from '@/components/NanoLoupe';
import ScaleCompare from '@/components/ScaleCompare';
import { BLESSINGS, LONGEST_BLESSING_CHARS } from '@/lib/blessings';
import Counter from '@/components/Counter';
import Accordion, { type QA } from '@/components/Accordion';

export const metadata: Metadata = {
  title: 'הטכנולוגיה',
  description:
    'כיצד נצרבת ברכה שלמה על שטח של חצי מילימטר: ליתוגרפיית קרן יונים, השוואה תו־אחר־תו לנוסח המקור, ושיבוץ בתכשיט.',
};

const SPECS = [
  ['טכנולוגיית צריבה', 'ליתוגרפיית קרן יונים ממוקדת (FIB)'],
  ['גובה אות', 'כ־9 מיקרון (אלפית מילימטר בקירוב)'],
  ['שטח כתיבה', '0.5 מ״מ² (700 × 700 מיקרון)'],
  ['מצע', 'סיליקון מונו־קריסטלי'],
  ['חלון מגן', 'ספיר סינתטי, קשיות 9 מוס'],
  ['אטימה', 'הרמטית - הכתב מוגן מזיעה וממגע מים אקראי'],
  ['בקרת איכות', 'השוואה תו־אחר־תו לנוסח המקור'],
];

const FAQ: QA[] = [
  {
    q: 'אפשר באמת לקרוא את הטקסט?',
    a: 'לא בעין. נדרשת הגדלה של פי 500 לפחות - מיקרוסקופ מעבדתי. הזכוכית המגדלת שמגיעה בקופסה מאפשרת לראות את מרקם השורות ואת גבולות השבב, אבל לא את האותיות עצמן. זו בדיוק הנקודה: הטקסט קיים שם במלואו, בין אם רואים אותו ובין אם לא.',
  },
  {
    q: 'איך אתם מוודאים שהנוסח מדויק?',
    a: 'אחרי הצריבה מושווה הכתב שעל השבב לקובץ המקור, תו אחר תו. שבב עם ולו סטייה אחת נפסל ואינו יוצא מהמעבדה.',
  },
  {
    q: 'מאיזה נוסח נלקח הטקסט?',
    a: 'הנוסחים המסורתיים, כפי שהם: פרקי תהילים, פרשיות התורה, משלי ל״א ותפילת הדרך. המקורות המדויקים של כל ברכה מופיעים בעמוד שלה, וגם על כרטיס הברכה שמגיע בקופסה.',
  },
  {
    q: 'השבב יכול להימחק או להישרט?',
    a: 'הכתב אינו מודפס על פני השטח - הוא חרוט לתוך החומר. גם שריטה בזכוכית המגנה לא תפגע בטקסט. השבב עצמו אטום ואינו נפגע מזיעה או ממגע מים. גוף התכשיט הוא סיפור אחר - את המתכת והציפוי כן יש להרחיק ממים ומתמרוקים.',
  },
  {
    q: 'כמה זמן לוקח לקבל את התכשיט?',
    a: 'החבילה יוצאת תוך יום עסקים מרגע ההזמנה ומגיעה תוך 2-3 ימי עסקים.',
  },
  {
    q: 'מה כוללת האחריות?',
    a: 'שנה מיום הרכישה על פגמי ייצור: שחרור השבב ממשבצתו, פתיחת הלחמה, ניתוק סוגר או פתיחת חוליה. תיקון בתקופה הזו ללא עלות. שבר, עיקום או נזק שנגרמו משימוש אינם באחריות, ואותם נתקן במחיר עלות.',
  },
];

const CARE = [
  'להסיר לפני מקלחת, ים ובריכה - לא בגלל השבב, אלא בגלל המתכת.',
  'לנגב בבד מיקרופייבר יבש. להימנע מחומרי ניקוי תכשיטים אגרסיביים.',
  'לאחסן בקופסה המקורית, רחוק מתכשיטים אחרים שעלולים לשרוט.',
  'לשלוח אלינו לליטוש חינם אחת לשנה - אנחנו מחזירים תוך שבוע.',
];

export default function CraftPage() {
  return (
    <>
      {/* ---- כותרת ---- */}
      <section className="relative overflow-hidden pt-44 pb-14">
        <div className="shell">
          <p className="eyebrow reveal">הטכנולוגיה</p>
          <h1 className="display mt-6" style={{ fontSize: 'var(--ds-hero)' }}>
            <span className="mask-line load">
              <span>איך מכניסים ברכה</span>
            </span>
            <span className="mask-line load">
              <span className="gold-text" style={{ ['--d' as string]: '130ms' }}>
                לתוך גרגר?
              </span>
            </span>
          </h1>
          <p className="lede reveal mt-9 max-w-2xl" style={{ ['--d' as string]: '300ms' }}>
            התשובה הקצרה: לא מכניסים - חורטים. קרן יונים ממוקדת מסירה אטומים
            ממשטח השבב ויוצרת את צורת האות בתוך החומר עצמו. מה שנשאר הוא לא
            הדפסה ולא ציפוי, אלא הכתב כחלק בלתי נפרד מהחומר.
          </p>
        </div>
      </section>

      {/* ---- לוח ננו ענק ---- */}
      <section className="pb-10">
        <div className="shell">
          <NanoLoupe blessing={BLESSINGS[0].id} height={480} zoom={13} radius={112} />
        </div>
      </section>

      {/* ---- קנה מידה ---- */}
      {/* 42% מהקונים מנסים לשפוט גודל פיזי מהתמונה ו־37% מהאתרים לא
          נותנים שום רמז. בעמוד שכל טענתו היא "קטן מכדי לראות", זו הראיה */}
      <section className="py-24">
        <div className="shell grid items-center gap-12 lg:grid-cols-[.9fr_1.1fr]">
          <div>
            <p className="eyebrow reveal">קנה מידה</p>
            <h2 className="display t-1 mt-4">
              <span className="mask-line">
                <span>כמה זה באמת קטן</span>
              </span>
            </h2>
            <p className="lede reveal mt-6 max-w-md" style={{ ['--d' as string]: '160ms' }}>
              קל להגיד חצי מילימטר רבוע. קשה יותר לתפוס את זה. שלושת הגופים
              כאן הם ביחס הגודל האמיתי ביניהם - וכל הנוסח נכנס לריבוע הקטן.
            </p>
          </div>

          <div
            className="reveal"
            style={{
              ['--d' as string]: '260ms',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--surface)',
            }}
          >
            <ScaleCompare accent={BLESSINGS[0].accent} size="lg" />
          </div>
        </div>
      </section>

      {/* ---- מספרים ---- */}
      <section className="py-24">
        <div className="shell grid gap-10 border-y py-14 sm:grid-cols-3" style={{ borderColor: 'var(--line)' }}>
          {[
            { v: LONGEST_BLESSING_CHARS, l: 'תווים בנוסח הארוך ביותר', s: '', d: 0 },
            { v: 0.5, l: 'מ״מ רבוע - כל שטח הכתיבה', s: '', d: 1 },
            { v: 500, l: 'הגדלה נדרשת כדי לקרוא', s: '', d: 0 },
          ].map((s, i) => (
            <div key={s.l} className="reveal text-center" style={{ ['--d' as string]: `${i * 90}ms` }}>
              <p className="display gold-text" style={{ fontSize: 'var(--ds-1)', lineHeight: 1 }}>
                <Counter to={s.v} suffix={s.s} decimals={s.d} />
              </p>
              <p className="mt-3" style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-3)' }}>{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      <Process />

      {/* ---- מפרט טכני ---- */}
      <section className="py-24" style={{ background: 'var(--bg-2)', borderBlock: '1px solid var(--line)' }}>
        <div className="shell grid gap-14 lg:grid-cols-[.8fr_1.2fr]">
          <div>
            <p className="eyebrow reveal">מפרט</p>
            <h2 className="display t-1 mt-4">
              <span className="mask-line">
                <span>המספרים היבשים</span>
              </span>
            </h2>
          </div>
          <div>
            {SPECS.map(([k, v], i) => (
              <div
                key={k}
                className="reveal flex flex-col justify-between gap-1 py-5 sm:flex-row sm:items-baseline"
                style={{ borderTop: '1px solid var(--line)', ['--d' as string]: `${i * 45}ms` }}
              >
                <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-3)', letterSpacing: '.06em' }}>{k}</span>
                <span className="num" style={{ fontSize: 'var(--fs-base)', textAlign: 'start' }}>{v}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px solid var(--line)' }} />
          </div>
        </div>
      </section>

      {/* ---- שאלות נפוצות ---- */}
      <section id="faq" className="py-32" style={{ scrollMarginTop: 120 }}>
        <div className="shell grid gap-14 lg:grid-cols-[.75fr_1.25fr]">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <p className="eyebrow reveal">שאלות נפוצות</p>
            <h2 className="display t-1 mt-4">
              <span className="mask-line">
                <span>מה ששואלים</span>
              </span>
              <span className="mask-line">
                <span>הכי הרבה</span>
              </span>
            </h2>
            <p className="lede reveal mt-6 max-w-xs">
              לא מצאתם תשובה? כתבו לנו - עונים באותו יום.
            </p>
          </div>
          <Accordion items={FAQ} />
        </div>
      </section>

      {/* ---- טיפוח ---- */}
      <section id="care" className="pb-32" style={{ scrollMarginTop: 120 }}>
        <div className="shell">
          <div
            className="reveal p-10 md:p-14"
            style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', background: 'var(--surface)' }}
          >
            <p className="eyebrow">טיפוח ואחריות</p>
            <h2 className="display t-2 mt-4">ארבעה כללים, וזהו</h2>
            <ol className="mt-9 grid gap-6 sm:grid-cols-2">
              {CARE.map((c, i) => (
                <li key={c} className="flex gap-4">
                  <span className="num display" style={{ color: 'var(--accent)', fontSize: 'var(--fs-md)', lineHeight: 1.7 }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span style={{ fontSize: 'var(--fs-base)', color: 'var(--ink-2)', lineHeight: 1.8 }}>{c}</span>
                </li>
              ))}
            </ol>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link href="/categories/necklaces" className="btn btn-solid">לקטלוג</Link>
              <Link href="/brand" className="btn">שפת המותג</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
