import Image from 'next/image';
import Link from 'next/link';
import { WORN } from '@/lib/worn';
import { getProduct } from '@/lib/catalog';

/**
 * צילומי הדגמים — פס נגלל אופקית.
 * הצילומים באים ביחסי גובה־רוחב שונים (לאורך, לרוחב, ריבוע), ולכן
 * הגובה קבוע והרוחב נגזר מהיחס: כל תמונה נשארת בקומפוזיציה שלה
 * במקום להיחתך לתבנית אחידה.
 */
export default function Worn() {
  const shots = WORN.map((w) => ({ shot: w, product: getProduct(w.products[0]) })).filter(
    (x) => x.product,
  );

  return (
    <section className="py-24 md:py-32" style={{ borderTop: '1px solid var(--line)' }}>
      <div className="shell flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow reveal">על הגוף</p>
          <h2 className="display t-2 mt-4">
            <span className="mask-line">
              <span>ככה זה נראה כשעונדים</span>
            </span>
          </h2>
        </div>
        <p
          className="lede reveal max-w-sm"
          style={{ ['--d' as string]: '160ms', fontSize: '.95rem' }}
        >
          השבב הכחול הוא הסימן - בכל דגם הוא יושב במקום אחר, ותמיד הוא מה שקולט את
          האור ראשון.
        </p>
      </div>

      {/* גלילה אופקית עם עצירות — נוח באצבע במובייל, בעכבר בדסקטופ */}
      <div
        className="reveal mt-12 flex gap-4 overflow-x-auto pb-4"
        style={{
          ['--d' as string]: '260ms',
          scrollSnapType: 'x mandatory',
          paddingInline: 'max(calc((100vw - var(--shell)) / 2), 1rem)',
        }}
      >
        {shots.map(({ shot, product }, i) => (
          <Link
            key={shot.file}
            href={`/products/${product!.slug}`}
            className="group relative shrink-0 overflow-hidden"
            style={{
              height: 'clamp(300px, 42vw, 460px)',
              aspectRatio: `${shot.width} / ${shot.height}`,
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--line)',
              scrollSnapAlign: 'center',
            }}
          >
            <Image
              src={shot.file}
              alt={shot.alt}
              fill
              sizes="(max-width: 768px) 80vw, 40vw"
              loading={i < 2 ? 'eager' : 'lazy'}
              className="object-cover transition-transform duration-[900ms] group-hover:scale-[1.05]"
            />

            {/* שם הדגם נקרא רק אם יש מתחתיו כהות — הצילומים בהירים בקצוות */}
            <span
              aria-hidden
              className="absolute inset-x-0 bottom-0"
              style={{
                height: '46%',
                background: 'linear-gradient(to top, rgb(10 8 4 / .68), transparent)',
              }}
            />
            <span
              className="absolute bottom-5 flex items-baseline gap-2.5"
              style={{ insetInlineStart: 20, color: '#fff' }}
            >
              <span className="display" style={{ fontSize: '1.15rem' }}>
                {product!.name}
              </span>
              <span style={{ fontSize: '.72rem', opacity: 0.72 }}>
                {shot.products.length > 1 ? `+${shot.products.length - 1} בפריים` : 'לפריט ←'}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
