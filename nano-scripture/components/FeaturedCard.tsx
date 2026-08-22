import Link from 'next/link';
import Image from 'next/image';
import { FINISHES, MATERIALS, formatPrice, type Product } from '@/lib/catalog';
import { PROMO, saleOf } from '@/lib/promo';
import { BLESSINGS } from '@/lib/blessings';

/**
 * הדגם המוביל, ברוחב כפול.
 *
 * ברשת אחידה דגם ב־749 ש״ח נראה בדיוק כמו דגם ב־223, ולעין אין למה
 * להיתפס. כאן הוא מקבל צילום סצנה גדול במקום חיתוך על אריח, ואת
 * הברכות שלו בשמן - כלומר סיבה להיכנס דווקא אליו.
 */
export default function FeaturedCard({ product }: { product: Product }) {
  const sale = saleOf(product.price);
  const photo = product.scenes?.[0];
  const available = BLESSINGS.filter((b) => product.blessings.includes(b.id));

  return (
    <article className="reveal sm:col-span-2">
      <Link
        href={`/products/${product.slug}`}
        className="card group grid h-full overflow-hidden sm:grid-cols-2"
      >
        <span className={photo ? 'relative block' : 'tile relative block'} style={{ minHeight: 300 }}>
          <Image
            src={photo ?? product.image}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 92vw, 46vw"
            priority
            className={
              photo
                ? 'object-cover transition-transform duration-[900ms] group-hover:scale-[1.04]'
                : 'object-contain p-[14%]'
            }
          />

          {sale.discounted && (
            <span
              style={{
                position: 'absolute',
                insetInlineEnd: 14,
                top: 14,
                fontSize: 'var(--fs-xs)',
                fontWeight: 700,
                letterSpacing: '.04em',
                padding: '.32rem .62rem',
                borderRadius: 99,
                color: 'var(--on-sale)',
                background: 'var(--sale)',
                boxShadow: '0 4px 14px -4px rgb(216 31 42 / .55)',
              }}
            >
              <span className="num">{PROMO.badge}</span>
            </span>
          )}
        </span>

        <span className="flex flex-col justify-center p-8 md:p-10">
          {product.badge && (
            <span
              className="mb-4 w-fit"
              style={{
                fontSize: 'var(--fs-xs)',
                letterSpacing: '.14em',
                padding: '.34rem .72rem',
                borderRadius: 99,
                color: 'var(--on-accent)',
                background: 'var(--accent)',
              }}
            >
              {product.badge}
            </span>
          )}

          <span className="display block" style={{ fontSize: 'var(--ds-2)' }}>
            {product.name}
          </span>

          {product.source && (
            <span
              className="mt-3 block"
              style={{
                fontSize: 'var(--fs-base)',
                lineHeight: 1.7,
                color: 'var(--accent-deep)',
                borderInlineStart: '2px solid var(--accent)',
                paddingInlineStart: '.8rem',
              }}
            >
              {product.source.phrase}
              <span className="mt-1 block" style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-3)' }}>
                {product.source.ref}
              </span>
            </span>
          )}

          <span className="mt-5 block" style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-2)', lineHeight: 1.7 }}>
            {product.short}
          </span>

          <span className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            {sale.discounted && (
              <span
                className="num"
                style={{ fontSize: 'var(--fs-base)', color: 'var(--ink-3)', textDecoration: 'line-through' }}
              >
                {formatPrice(sale.was)}
              </span>
            )}
            <span
              className="num display"
              style={{
                fontSize: 'var(--fs-xl)',
                fontWeight: sale.discounted ? 500 : undefined,
                color: sale.discounted ? 'var(--sale)' : undefined,
              }}
            >
              {formatPrice(sale.now)}
            </span>
          </span>

          <span
            className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 pt-5"
            style={{ borderTop: '1px solid var(--line)', fontSize: 'var(--fs-xs)', color: 'var(--ink-3)' }}
          >
            <span>
              {MATERIALS[product.material].label} · {FINISHES[product.finish]}
            </span>
            <span className="flex items-center gap-1.5">
              {available.map((b) => (
                <span
                  key={b.id}
                  aria-hidden
                  style={{ width: 8, height: 8, borderRadius: 2, background: b.accent }}
                />
              ))}
              {available.length === 1 ? available[0].plain : `${available.length} ברכות`}
            </span>
          </span>
        </span>
      </Link>
    </article>
  );
}
