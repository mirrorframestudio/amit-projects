import Link from 'next/link';
import type { Blessing } from '@/lib/blessings';

/**
 * שורת ברכה - רשומה באינדקס, ולא כרטיס.
 *
 * ------------------------------------------------------------------
 * הגרסה הקודמת הייתה כרטיס: כותרת צבעונית עם צילום דהוי, מונה מילים
 * בפינה, גלולות של "מתאים ל", חץ, ורשת של שלושה ואז שניים ממורכזים.
 * כל אחד מהם לבדו סביר; יחד הם התבנית שכל אתר מיוצר מקבל, והעין
 * מזהה אותה לפני שהיא קוראת מילה.
 *
 * וזה היה חבל דווקא כאן, כי בעמוד הזה המילים עצמן הן הדבר היפה
 * ביותר - פסוקים מנוקדים, שכל אחד מהם נבחר - והעיצוב קבר אותן מתחת
 * לקופסאות.
 * ------------------------------------------------------------------
 *
 * עכשיו: אות עברית כמספור, השם, ומתחתיו פסוק הפתיחה בגודל של כותרת.
 * אין קופסה, אין צבע רקע, אין גלולות. הצבע של הברכה מופיע פעם אחת,
 * באות המספור - די בזה. הכל יושב על קו אחד דק, כמו תוכן עניינים.
 */

const LETTERS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י'];

export default function BlessingCard({
  blessing: b,
  index = 0,
  compact = false,
}: {
  blessing: Blessing;
  index?: number;
  /** לרשימת "ברכות נוספות" בעמוד ברכה - בלי הפסוק ובלי התיאור */
  compact?: boolean;
}) {
  const letter = LETTERS[index] ?? String(index + 1);

  if (compact) {
    return (
      <Link
        href={`/blessings/${b.id}`}
        className="group flex items-baseline gap-4 py-5"
        style={{ borderTop: '1px solid var(--line)' }}
      >
        <span
          aria-hidden
          className="display flex-shrink-0"
          style={{ fontSize: 'var(--fs-sm)', color: b.accentInk, width: '1.2em' }}
        >
          {letter}
        </span>
        <span className="min-w-0 flex-1">
          <span className="display block" style={{ fontSize: 'var(--fs-lg)', lineHeight: 1.3 }}>
            {b.title}
          </span>
          <span className="mt-1 block" style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-3)' }}>
            {b.forWhom}
          </span>
        </span>
        <span
          aria-hidden
          className="num flex-shrink-0"
          style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-3)' }}
        >
          {b.words} מילים
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={`/blessings/${b.id}`}
      className="reveal group grid gap-x-12 gap-y-6 py-12 md:grid-cols-[minmax(0,.9fr)_minmax(0,1.6fr)] md:py-16"
      style={{ borderTop: '1px solid var(--line)', ['--d' as string]: `${index * 70}ms` }}
    >
      {/* ---------- ימין: מספור, שם, למי ---------- */}
      <div className="flex items-start gap-5">
        <span
          aria-hidden
          className="display flex-shrink-0"
          style={{
            fontSize: 'var(--fs-md)',
            lineHeight: 1,
            color: b.accentInk,
            marginTop: '.55em',
            width: '1.1em',
            textAlign: 'center',
          }}
        >
          {letter}
        </span>
        <div>
          <h2
            className="display"
            style={{
              fontSize: 'var(--ds-2)',
              lineHeight: 1.15,
              transition: 'color .3s var(--ease)',
            }}
          >
            <span className="group-hover:[color:var(--accent-deep)]" style={{ transition: 'color .3s var(--ease)' }}>
              {b.title}
            </span>
          </h2>
          <p className="mt-3" style={{ fontSize: 'var(--fs-base)', color: 'var(--ink-2)' }}>
            {b.forWhom}
          </p>
          <p
            className="mt-6"
            style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-3)', letterSpacing: '.02em', lineHeight: 1.7 }}
          >
            {b.sources}
          </p>
        </div>
      </div>

      {/* ---------- שמאל: הפסוק, ואז המילים ---------- */}
      <div>
        {/* פסוק הפתיחה בגודל של כותרת. זה מה שקוראים, וזה מה שבוחרים */}
        <p
          className="display"
          style={{
            fontSize: 'var(--ds-3)',
            lineHeight: 1.55,
            color: 'var(--ink)',
          }}
        >
          {b.opening}
        </p>
        <p className="mt-2" style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-3)' }}>
          {b.openingSource}
        </p>

        <p
          className="mt-7 max-w-prose"
          style={{ fontSize: 'var(--fs-base)', lineHeight: 1.85, color: 'var(--ink-2)' }}
        >
          {b.blurb}
        </p>

        <p
          className="mt-6 flex flex-wrap items-baseline gap-x-5 gap-y-1"
          style={{ fontSize: 'var(--fs-sm)' }}
        >
          <span className="num" style={{ color: 'var(--ink-3)' }}>
            {b.words} מילים
          </span>
          <span
            className="link-u"
            style={{ color: b.accentInk }}
          >
            לקריאת הנוסח המלא
          </span>
        </p>
      </div>
    </Link>
  );
}
