'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FINISHES, formatPrice } from '@/lib/catalog';
import { pairFor } from '@/lib/pairs';
import { saleOf } from '@/lib/promo';
import { useCart } from '@/lib/cart';

/**
 * "נענדים יחד" - הדגמים שנראים עם זה בצילום אחד.
 *
 * זה המודול שהעמוד לא ידע להציע: הזמנה שנייה באותה עגלה. הוא נבנה
 * על צילום קיים בלבד, כלומר אין כאן המלצה שהומצאה - אם אין תמונה
 * שבה שני הדגמים באמת נענדים יחד, הבלוק פשוט לא מוצג.
 *
 * ההוספה היא ישירה מכאן, בלי לעזוב את העמוד, כי כל ניווט נוסף בדרך
 * לעגלה הוא מקום לנשור בו.
 */
export default function PairedWith({ slug, accent }: { slug: string; accent: string }) {
  const pair = pairFor(slug);
  const add = useCart((s) => s.add);
  if (!pair) return null;

  return (
    <section className="pb-20 pt-4" style={{ borderTop: '1px solid var(--line)' }}>
      <div className="shell pt-14">
        <div className="story-row" style={{ paddingBlock: 0 }}>
          <div
            className="reveal relative overflow-hidden"
            style={{ aspectRatio: '1 / 1', borderRadius: 'var(--radius-lg)' }}
          >
            <Image
              src={pair.photo}
              alt=""
              fill
              sizes="(max-width: 768px) 92vw, 46vw"
              className="object-cover"
            />
          </div>

          <div className="reveal" style={{ ['--d' as string]: '120ms' }}>
            <p className="eyebrow" style={{ color: accent }}>
              נענדים יחד
            </p>
            <h2 className="display mt-3" style={{ fontSize: 'var(--ds-3)', lineHeight: 1.35 }}>
              {pair.title}
            </h2>
            <p className="mt-4" style={{ fontSize: 'var(--fs-base)', color: 'var(--ink-2)', lineHeight: 1.85 }}>
              {pair.note}
            </p>

            <ul className="mt-8">
              {pair.others.map((p) => {
                const sale = saleOf(p.price);
                return (
                  <li
                    key={p.slug}
                    className="flex items-center gap-4 py-4"
                    style={{ borderTop: '1px solid var(--line)' }}
                  >
                    <Link
                      href={`/products/${p.slug}`}
                      className="tile relative shrink-0"
                      style={{ width: 62, height: 62, borderRadius: 'var(--radius)' }}
                    >
                      <Image src={p.image} alt={p.name} fill sizes="62px" className="object-contain p-1.5" />
                    </Link>

                    <span className="min-w-0 flex-1">
                      <Link href={`/products/${p.slug}`} className="display link-u block" style={{ fontSize: 'var(--fs-base)' }}>
                        {p.name}
                      </Link>
                      <span className="mt-0.5 block" style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-3)' }}>
                        {FINISHES[p.finish]} · <span className="num">{formatPrice(sale.now)}</span>
                      </span>
                    </span>

                    <button
                      onClick={() => add(p.slug, p.blessings[0], 1)}
                      className="btn shrink-0"
                      style={{ ['--pad' as string]: '.62rem 1.1rem', fontSize: 'var(--fs-xs)' }}
                    >
                      הוספה
                    </button>
                  </li>
                );
              })}
              <li style={{ borderTop: '1px solid var(--line)' }} />
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
