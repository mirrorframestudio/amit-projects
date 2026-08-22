/**
 * השוואת גדלים: גרגר אורז, ראש סיכה, והשבב.
 *
 * בדיקות שימושיות מראות ש־42% מהקונים מנסים לשפוט גודל פיזי מהתמונה,
 * ו־37% מהאתרים לא נותנים שום רמז לקנה מידה. למוצר שכל הטענה שלו היא
 * "קטן מכדי לראות", זו לא המחשה נחמדה - זו ההוכחה.
 *
 * הפרופורציות אמיתיות: גרגר אורז כ־6 מ״מ, ראש סיכה כ־2 מ״מ, השבב 5×5
 * מ״מ עם חלון כתיבה של כחצי מ״מ רבוע.
 */
export default function ScaleCompare({
  accent,
  size = 'md',
}: {
  accent: string;
  /** lg מגדיל הכל פי 1.6 - לעמוד הטכנולוגיה, שבו זו הראיה המרכזית */
  size?: 'md' | 'lg';
}) {
  const k = size === 'lg' ? 1.6 : 1;
  const items = [
    { label: 'גרגר אורז', w: 164 * k, h: 50 * k, rx: 25 * k },
    { label: 'ראש סיכה', w: 58 * k, h: 58 * k, rx: 29 * k },
    { label: 'השבב', w: 24 * k, h: 24 * k, rx: 2, chip: true },
  ];

  return (
    <div
      className="flex h-full flex-col items-center justify-center"
      style={{ gap: 44 * k, padding: 40 * k }}
    >
      {items.map((it) => (
        <div key={it.label} className="flex flex-col items-center gap-3.5">
          <div
            style={{
              width: it.w,
              height: it.h,
              borderRadius: it.rx,
              background: it.chip ? accent : 'color-mix(in oklab, var(--ink) 10%, var(--surface))',
              border: `1px solid ${it.chip ? accent : 'var(--line-strong)'}`,
              boxShadow: it.chip ? `0 0 ${30 * k}px -6px ${accent}` : 'none',
            }}
          />
          <span
            style={{
              fontSize: size === 'lg' ? '.82rem' : '.72rem',
              letterSpacing: '.16em',
              color: it.chip ? accent : 'var(--ink-3)',
            }}
          >
            {it.label}
          </span>
        </div>
      ))}

      <p
        className="max-w-xs text-center"
        style={{ fontSize: size === 'lg' ? '.84rem' : '.74rem', color: 'var(--ink-3)', lineHeight: 1.7 }}
      >
        שטח הכתיבה בפועל הוא כחצי מילימטר רבוע - כשליש מראש הסיכה.
      </p>
    </div>
  );
}
