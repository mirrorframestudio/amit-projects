'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRef } from 'react';
import { FINISHES, MATERIALS, formatPrice, type Product } from '@/lib/catalog';
import { BLESSINGS } from '@/lib/blessings';
import { PROMO, saleOf } from '@/lib/promo';

export default function ProductCard({
  product,
  index = 0,
  priority = false,
}: {
  product: Product;
  index?: number;
  priority?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // אלומת אור שעוקבת אחרי הסמן — נכתבת ישירות ל־style, בלי state
  const track = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--gx', `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty('--gy', `${((e.clientY - r.top) / r.height) * 100}%`);
  };

  // הדגימות מציגות את הברכות שבאמת זמינות לדגם, לא את חמש הראשונות
  const available = BLESSINGS.filter((b) => product.blessings.includes(b.id));
  const sale = saleOf(product.price);

  return (
    <article className="reveal" style={{ ['--d' as string]: `${(index % 3) * 90}ms` }}>
      <div ref={ref} onPointerMove={track} className="h-full">
        <Link href={`/products/${product.slug}`} className="card group flex h-full flex-col">
          <div className="tile relative" style={{ aspectRatio: '1' }}>
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              style={{
                background:
                  'radial-gradient(42% 36% at var(--gx,50%) var(--gy,45%), rgb(201 166 87 / .22), transparent 72%)',
              }}
            />

            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 88vw, (max-width: 1024px) 44vw, 28vw"
              priority={priority}
              className="object-contain p-[16%] transition-transform duration-[850ms] group-hover:scale-[1.07]"
              style={{ filter: 'drop-shadow(0 14px 18px rgb(70 55 20 / .16))' }}
            />

            {product.badge && (
              <span
                style={{
                  position: 'absolute',
                  insetInlineStart: 14,
                  top: 14,
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

            {/* דגימות הברכות — מסמן מיד שיש כאן בחירה */}
            <span
              aria-hidden
              className="absolute flex gap-1.5"
              style={{ insetInlineEnd: 14, bottom: 14 }}
            >
              {available.map((b) => (
                <span
                  key={b.id}
                  style={{ width: 7, height: 7, borderRadius: 2, background: b.accent, opacity: 0.85 }}
                />
              ))}
            </span>
          </div>

          <div className="card-body flex flex-1 flex-col px-6 pb-6 pt-5">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="display" style={{ fontSize: 'var(--fs-lg)' }}>
                {product.name}
              </h3>
              <span className="flex shrink-0 items-baseline gap-2">
                {sale.discounted && (
                  <span
                    className="num"
                    style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-3)', textDecoration: 'line-through' }}
                  >
                    {formatPrice(sale.was)}
                  </span>
                )}
                <span
                  className="num display"
                  style={{ fontSize: 'var(--fs-md)', fontWeight: sale.discounted ? 500 : undefined, color: sale.discounted ? 'var(--sale)' : undefined }}
                >
                  {formatPrice(sale.now)}
                </span>
              </span>
            </div>

            {product.source && (
              <p className="mt-1" style={{ fontSize: 'var(--fs-xs)', letterSpacing: '.06em', color: 'var(--accent)' }}>
                {product.source.ref}
              </p>
            )}

            <p className="mt-1.5" style={{ fontSize: 'var(--fs-xs)', letterSpacing: '.1em', color: 'var(--ink-3)' }}>
              {MATERIALS[product.material].label} · {FINISHES[product.finish]}
            </p>

            <p className="mt-3 flex-1" style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-3)', lineHeight: 1.65 }}>
              {product.short}
            </p>

            <div
              className="mt-5 flex items-center justify-between pt-4"
              style={{ borderTop: '1px solid var(--line)' }}
            >
              <span className="num" style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-3)' }}>
                {available.length === 1 ? available[0].plain : `${available.length} ברכות לבחירה`}
              </span>
              <span
                className="link-u"
                style={{ fontSize: 'var(--fs-sm)', color: 'var(--accent)', letterSpacing: '.03em' }}
              >
                לפריט ←
              </span>
            </div>
          </div>
        </Link>
      </div>
    </article>
  );
}
