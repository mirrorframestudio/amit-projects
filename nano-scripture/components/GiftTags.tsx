import type { Blessing } from '@/lib/blessings';

/**
 * "מתאים ל" — האירועים שבשבילם קונים את הברכה.
 *
 * הנתון נשמר כמחרוזת אחת מופרדת בנקודות, אבל שורה רצה נקראת לאט:
 * הקונה מחפש את המקרה שלו, לא קורא רשימה. תגיות נפרדות מאפשרות לסרוק,
 * וגם מכניסות את צבע הברכה לעוד מקום בעמוד.
 */
export default function GiftTags({
  blessing: b,
  muted = false,
  label = true,
}: {
  blessing: Blessing;
  /** מונמך — לשורה שאינה הנבחרת בבורר */
  muted?: boolean;
  label?: boolean;
}) {
  const items = b.gift.split('·').map((s) => s.trim()).filter(Boolean);
  if (!items.length) return null;

  return (
    <span className="flex flex-wrap items-center gap-1.5" style={{ opacity: muted ? 0.62 : 1 }}>
      {label && (
        <span
          style={{
            fontSize: 'var(--fs-2xs)',
            letterSpacing: '.12em',
            color: 'var(--ink-3)',
            marginInlineEnd: '.15rem',
          }}
        >
          מתאים ל
        </span>
      )}

      {items.map((item) => (
        <span
          key={item}
          style={{
            fontSize: 'var(--fs-xs)',
            lineHeight: 1.4,
            padding: '.16rem .5rem',
            borderRadius: 99,
            whiteSpace: 'nowrap',
            color: b.accentInk,
            background: `color-mix(in oklab, ${b.accent} 13%, transparent)`,
            border: `1px solid color-mix(in oklab, ${b.accent} 22%, transparent)`,
          }}
        >
          {item}
        </span>
      ))}
    </span>
  );
}
