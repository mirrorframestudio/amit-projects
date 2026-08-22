import Link from 'next/link';
import Image from 'next/image';
import type { Blessing } from '@/lib/blessings';
import GiftTags from './GiftTags';

/**
 * כרטיס ברכה.
 *
 * הצבע היה ריבוע של 34 פיקסל בפינה, וזה כל מה שהוא עשה - חמישה
 * כרטיסים בקרם שנבדלים בנקודה. כאן הוא כותרת: פס בגוון הברכה נושא את
 * השם, וכל השאר יושב מתחתיו. מהמרחק שממנו סורקים רשת, הצבע הוא
 * הדבר היחיד שנקרא.
 */
export default function BlessingCard({
  blessing: b,
  index = 0,
  photo = null,
}: {
  blessing: Blessing;
  index?: number;
  /** תכשיט שנושא את הנוסח. הצבע נשאר מעליו כדי שהכותרת תישאר קריאה */
  photo?: string | null;
}) {
  return (
    <Link
      href={`/blessings/${b.id}`}
      className="card reveal group flex flex-col overflow-hidden"
      style={{ ['--d' as string]: `${(index % 3) * 90}ms` }}
    >
      {/* הכותרת על גוון הברכה */}
      <span
        className="relative block overflow-hidden px-6 pb-5 pt-6"
        style={{ color: '#fff' }}
      >
        {photo && (
          <Image
            src={photo}
            alt=""
            fill
            sizes="(max-width: 1024px) 92vw, 32vw"
            className="object-cover transition-transform duration-[900ms] group-hover:scale-[1.06]"
          />
        )}

        {/* גוון הברכה מעל הצילום.
            נמדד מול הפיקסל הבהיר ביותר בכל פס: עם הגוון הבהיר ב־96%
            "הברכה שלך" עדיין נפלה ל־4.38:1, מתחת לתקן לטקסט הקטן.
            הגוון הכהה ב־90% מרים אותה ל־5.88 והגרוע ביותר בסט ל־5.68. */}
        <span
          aria-hidden
          className="absolute inset-0"
          style={{
            background: photo
              ? `linear-gradient(150deg, color-mix(in oklab, ${b.accentInk} 90%, transparent), color-mix(in oklab, ${b.accentInk} 96%, transparent))`
              : `linear-gradient(150deg, ${b.accent}, ${b.accentInk})`,
          }}
        />

        <span className="relative block">
        <span className="flex items-start justify-between gap-3">
          <span className="display block" style={{ fontSize: '1.3rem', lineHeight: 1.3 }}>
            {b.title}
          </span>
          <span
            className="num shrink-0"
            style={{ fontSize: '.7rem', letterSpacing: '.08em', opacity: 0.9, marginTop: '.3rem' }}
          >
            {b.words} מילים
          </span>
        </span>

        <span className="mt-1.5 block" style={{ fontSize: '.8rem', opacity: 0.94 }}>
          {b.forWhom}
        </span>
        </span>
      </span>

      <span className="flex flex-1 flex-col px-6 pb-6 pt-5">
        <span className="block" style={{ fontSize: '.86rem', color: 'var(--ink-2)', lineHeight: 1.7 }}>
          {b.blurb}
        </span>

        <span className="mt-4 block">
          <GiftTags blessing={b} />
        </span>

        <span
          className="display mt-5 block"
          style={{ fontSize: '.98rem', lineHeight: 1.7, color: b.accentInk }}
        >
          {b.opening}
        </span>

        <span
          className="mt-auto flex items-center justify-between gap-3 pt-5"
          style={{ borderTop: '1px solid var(--line)' }}
        >
          <span style={{ fontSize: '.7rem', color: 'var(--ink-3)', lineHeight: 1.5 }}>
            {b.sources}
          </span>
          <span
            aria-hidden
            className="shrink-0"
            style={{ fontSize: '.9rem', color: b.accentInk }}
          >
            ←
          </span>
        </span>
      </span>
    </Link>
  );
}
