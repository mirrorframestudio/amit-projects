import Link from 'next/link';
import type { Blessing } from '@/lib/blessings';
import GiftTags from './GiftTags';

/** כרטיס ברכה — משמש בדף הבית, בדף הברכות ובהצלבות */
export default function BlessingCard({
  blessing: b,
  index = 0,
}: {
  blessing: Blessing;
  index?: number;
}) {
  return (
    <Link
      href={`/blessings/${b.id}`}
      className="card reveal group flex flex-col p-7"
      style={{ ['--d' as string]: `${(index % 3) * 90}ms` }}
    >
      <div className="flex items-start justify-between gap-4">
        <span
          aria-hidden
          style={{
            width: 34,
            height: 34,
            flexShrink: 0,
            borderRadius: 4,
            background: b.accent,
            boxShadow: `0 8px 22px -8px ${b.accent}`,
          }}
        />
        <span className="num" style={{ fontSize: '.68rem', color: 'var(--ink-3)', letterSpacing: '.1em' }}>
          {b.words} מילים
        </span>
      </div>

      <h3 className="display t-3 mt-5" style={{ color: b.accentInk }}>
        {b.title}
      </h3>
      <p className="mt-1" style={{ fontSize: '.75rem', letterSpacing: '.1em', color: 'var(--ink-3)' }}>
        {b.forWhom}
      </p>

      <p className="mt-4 flex-1" style={{ fontSize: '.87rem', color: 'var(--ink-2)', lineHeight: 1.7 }}>
        {b.blurb}
      </p>

      <div className="mt-4">
        <GiftTags blessing={b} />
      </div>

      <p
        className="display mt-5"
        style={{ fontSize: '1.02rem', lineHeight: 1.7, color: b.accentInk, opacity: 0.85 }}
      >
        {b.opening}
      </p>

      <div
        className="mt-5 flex items-center justify-between pt-4"
        style={{ borderTop: '1px solid var(--line)' }}
      >
        <span style={{ fontSize: '.72rem', color: 'var(--ink-3)' }}>{b.sources}</span>
        <span
          className="link-u"
          style={{ fontSize: '.8rem', color: b.accentInk, letterSpacing: '.03em', whiteSpace: 'nowrap' }}
        >
          ←
        </span>
      </div>
    </Link>
  );
}
