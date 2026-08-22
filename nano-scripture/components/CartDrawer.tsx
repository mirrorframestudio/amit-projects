'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart, cartTotals, lineKey } from '@/lib/cart';
import { getProduct, formatPrice, ACTIVE_CATEGORIES, PRODUCTS } from '@/lib/catalog';
import { getBlessing } from '@/lib/blessings';
import { PROMO, saleOf, isPromoCode, normalizeCode } from '@/lib/promo';
import { GIFT_BOX, INSTALLMENTS, perInstallment } from '@/lib/extras';

const FREE_SHIPPING = 450;

/**
 * שדה קוד ההנחה.
 *
 * ההנחה אינה מחושבת מראש לתוך המחירים - היא ניתנת כאן, למי שמזין קוד.
 * הקוד המוזן נשמר בעגלה ולא ב־state מקומי, כדי שרענון באמצע הקנייה
 * לא יבטל אותו בשקט אחרי שהלקוח כבר ראה את ההנחה.
 */
function CodeField() {
  const { code, setCode } = useCart();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState(false);
  const applied = Boolean(code);

  if (applied) {
    return (
      <div
        className="mb-3 flex items-center justify-between gap-3 px-3 py-2"
        style={{
          borderRadius: 'var(--radius)',
          border: '1px solid var(--sale)',
          background: 'color-mix(in oklab, var(--sale) 7%, transparent)',
        }}
      >
        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--sale-deep)', fontWeight: 500 }}>
          הקוד <span className="num">{code}</span> הופעל
        </span>
        <button
          type="button"
          onClick={() => { setCode(null); setDraft(''); }}
          className="link-u tap"
          style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-3)' }}
        >
          הסרה
        </button>
      </div>
    );
  }

  const submit = () => {
    if (isPromoCode(draft)) {
      setCode(normalizeCode(draft));
      setError(false);
    } else {
      setError(true);
    }
  };

  return (
    <div className="mb-3">
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => { setDraft(e.target.value); setError(false); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
          placeholder="קוד הנחה"
          aria-label="קוד הנחה"
          aria-invalid={error || undefined}
          className="num min-w-0 flex-1 px-3"
          style={{
            height: 44,
            fontSize: 'var(--fs-sm)',
            letterSpacing: '.06em',
            borderRadius: 'var(--radius)',
            border: `1px solid ${error ? 'var(--sale)' : 'var(--line-strong)'}`,
            background: 'var(--surface)',
            color: 'var(--ink)',
            textAlign: 'start',
          }}
        />
        <button
          type="button"
          onClick={submit}
          disabled={!draft.trim()}
          className="btn tap"
          style={{ ['--pad' as string]: '0 1.1rem', height: 44, fontSize: 'var(--fs-sm)', opacity: draft.trim() ? 1 : 0.45 }}
        >
          החלה
        </button>
      </div>

      <p className="mt-1.5" style={{ fontSize: 'var(--fs-xs)', color: error ? 'var(--sale)' : 'var(--ink-3)' }}>
        {error ? 'הקוד אינו מזוהה. בדקו את הכתיב ונסו שוב.' : PROMO.sub}
      </p>
    </div>
  );
}

/** מדרגת כמות עם שטח נגיעה אמיתי - הקודמת הייתה תווי טקסט בגודל 14px */
function Stepper({
  qty,
  onChange,
}: {
  qty: number;
  onChange: (next: number) => void;
}) {
  const btn: React.CSSProperties = {
    width: 42,
    height: 42,
    display: 'grid',
    placeItems: 'center',
    color: 'var(--ink-2)',
    fontSize: 'var(--fs-md)',
    lineHeight: 1,
  };

  return (
    <div
      className="flex items-center"
      style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius)' }}
    >
      <button onClick={() => onChange(qty - 1)} aria-label="הפחתת כמות" style={btn}>
        −
      </button>
      <span
        className="num"
        aria-live="polite"
        style={{ fontSize: 'var(--fs-sm)', minWidth: 22, textAlign: 'center' }}
      >
        {qty}
      </span>
      <button onClick={() => onChange(qty + 1)} aria-label="הוספת כמות" style={btn}>
        +
      </button>
    </div>
  );
}

export default function CartDrawer() {
  const { lines, open, setOpen, setQty, remove, add, gift, setGift, code } = useCart();
  const { items, subtotal, listTotal, discount } = cartTotals(lines, code);
  const giftFee = gift ? GIFT_BOX.price : 0;
  const total = subtotal + giftFee;
  const gap = FREE_SHIPPING - subtotal;
  const progress = Math.min(1, subtotal / FREE_SHIPPING);

  // השלמה למשלוח חינם: הפריטים הזולים שאינם כבר בעגלה
  const inCart = new Set(lines.map((l) => l.slug));
  const fillers =
    gap > 0 && lines.length
      ? [...PRODUCTS]
          .filter((p) => !inCart.has(p.slug))
          .sort((a, b) => saleOf(a.price).now - saleOf(b.price).now)
          .slice(0, 2)
      : [];

  // שחזור העגלה מהאחסון המקומי - נדחה עד לאחר ההידרציה
  useEffect(() => {
    const t = setTimeout(() => void useCart.persist.rehydrate(), 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setOpen]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <div
        onClick={() => setOpen(false)}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 120,
          background: 'rgb(30 24 10 / .38)',
          backdropFilter: 'blur(3px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity .5s var(--ease)',
        }}
        aria-hidden
      />

      <aside
        aria-label="עגלת קניות"
        aria-hidden={!open}
        style={{
          position: 'fixed',
          insetBlock: 0,
          insetInlineStart: 0,
          zIndex: 121,
          width: 'min(440px, 92vw)',
          background: 'var(--bg)',
          borderInlineEnd: '1px solid var(--line)',
          transform: open ? 'none' : 'translateX(100%)',
          transition: 'transform .62s var(--ease)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          className="flex items-center justify-between px-7 py-6"
          style={{ borderBottom: '1px solid var(--line)' }}
        >
          <span className="display" style={{ fontSize: 'var(--fs-lg)' }}>
            העגלה{' '}
            <span className="num" style={{ color: 'var(--accent)' }}>
              ({items})
            </span>
          </span>
          <button onClick={() => setOpen(false)} aria-label="סגירה" className="tap" style={{ color: 'var(--ink-2)' }}>
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {lines.length > 0 && (
          <div className="px-7 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
            <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-2)' }}>
              {gap <= 0 ? (
                <span style={{ color: 'var(--accent-deep)', fontWeight: 500 }}>המשלוח עלינו ✦</span>
              ) : (
                <>
                  עוד <span className="num">{formatPrice(gap)}</span> למשלוח חינם
                </>
              )}
            </p>
            <div style={{ height: 2, background: 'var(--line)', marginTop: 10, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${progress * 100}%`,
                  background: 'linear-gradient(to left, var(--accent), var(--spark))',
                  transition: 'width .7s var(--ease)',
                }}
              />
            </div>
          </div>
        )}

        <div className="no-scrollbar flex-1 overflow-y-auto px-7">
          {lines.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
              <p className="lede">העגלה עדיין ריקה.</p>
              <Link href={`/categories/${ACTIVE_CATEGORIES[0]}`} className="btn" onClick={() => setOpen(false)}>
                לקטלוג
              </Link>
            </div>
          )}

          {lines.map((line) => {
            const p = getProduct(line.slug);
            if (!p) return null;
            const b = getBlessing(line.blessing);
            const key = lineKey(line.slug, line.blessing);
            const sale = saleOf(p.price);

            return (
              <div key={key} className="flex gap-4 py-6" style={{ borderBottom: '1px solid var(--line)' }}>
                <Link
                  href={`/products/${p.slug}`}
                  onClick={() => setOpen(false)}
                  className="tile relative"
                  style={{
                    width: 96,
                    height: 96,
                    flexShrink: 0,
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--radius)',
                    overflow: 'hidden',
                  }}
                >
                  <Image src={p.image} alt={p.name} fill sizes="96px" className="object-contain p-2" />
                </Link>

                <div className="flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`/products/${p.slug}`}
                      onClick={() => setOpen(false)}
                      className="display"
                      style={{ fontSize: 'var(--fs-md)' }}
                    >
                      {p.name}
                    </Link>
                    <button
                      onClick={() => remove(key)}
                      aria-label={`הסרת ${p.name}`}
                      className="tap -mt-2.5 -me-2.5"
                      style={{ color: 'var(--ink-3)', flexShrink: 0 }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>

                  {/* הברכה היא מה שמבדיל שתי שורות של אותו דגם - היא חייבת להיות מפורשת */}
                  <span
                    className="mt-1.5 inline-flex w-fit items-center gap-1.5"
                    style={{
                      fontSize: 'var(--fs-xs)',
                      padding: '.14rem .5rem',
                      borderRadius: 99,
                      color: b.accentInk,
                      background: `color-mix(in oklab, ${b.accent} 13%, transparent)`,
                      border: `1px solid color-mix(in oklab, ${b.accent} 22%, transparent)`,
                    }}
                  >
                    <span
                      aria-hidden
                      style={{ width: 8, height: 8, borderRadius: 2, background: b.accent }}
                    />
                    {b.plain}
                  </span>

                  <p className="num mt-2" style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-2)' }}>
                    {formatPrice(sale.now)} ליחידה
                  </p>

                  <div className="mt-auto flex items-center justify-between pt-3">
                    <Stepper qty={line.qty} onChange={(n) => setQty(key, n)} />
                    <span className="flex items-baseline gap-2">
                      {sale.discounted && (
                        <span
                          className="num"
                          style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-3)', textDecoration: 'line-through' }}
                        >
                          {formatPrice(p.price * line.qty)}
                        </span>
                      )}
                      <span className="num" style={{ fontSize: 'var(--fs-md)', fontWeight: 500 }}>
                        {formatPrice(sale.now * line.qty)}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {lines.length > 0 && (
            <button
              onClick={() => setGift(!gift)}
              role="switch"
              aria-checked={gift}
              className="mt-6 flex w-full items-center gap-3 p-3 text-start"
              style={{
                borderRadius: 'var(--radius)',
                border: `1px dashed ${gift ? 'var(--accent)' : 'var(--line-strong)'}`,
                background: gift ? 'color-mix(in oklab, var(--accent) 7%, transparent)' : 'transparent',
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 38,
                  height: 22,
                  flexShrink: 0,
                  borderRadius: 99,
                  padding: 3,
                  background: gift ? 'var(--accent)' : 'var(--line-strong)',
                  transition: 'background-color .3s var(--ease)',
                }}
              >
                <span
                  style={{
                    display: 'block',
                    width: 16,
                    height: 16,
                    borderRadius: 99,
                    background: '#fff',
                    transform: gift ? 'translateX(-16px)' : 'none',
                    transition: 'transform .3s var(--ease)',
                  }}
                />
              </span>
              <span className="flex-1">
                <span className="display block" style={{ fontSize: 'var(--fs-base)' }}>
                  {GIFT_BOX.title}
                </span>
                <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-3)' }}>
                  מגיעה סגורה ומוכנה למסירה
                </span>
              </span>
              <span className="num" style={{ fontSize: 'var(--fs-sm)', color: 'var(--accent)' }}>
                +{formatPrice(GIFT_BOX.price)}
              </span>
            </button>
          )}

          {fillers.length > 0 && (
            <div className="py-7">
              <p style={{ fontSize: 'var(--fs-xs)', fontWeight: 500, color: 'var(--accent-deep)' }}>
                להשלמה למשלוח חינם
              </p>

              <div className="mt-4 flex flex-col gap-3">
                {fillers.map((p) => {
                  const sale = saleOf(p.price);
                  return (
                    <div
                      key={p.slug}
                      className="flex items-center gap-3 p-2"
                      style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius)' }}
                    >
                      <span
                        className="tile relative"
                        style={{ width: 52, height: 52, flexShrink: 0, borderRadius: 3, overflow: 'hidden' }}
                      >
                        <Image src={p.image} alt="" fill sizes="52px" className="object-contain p-1" />
                      </span>

                      <span className="flex-1">
                        <span className="display block" style={{ fontSize: 'var(--fs-base)' }}>
                          {p.name}
                        </span>
                        <span className="num" style={{ fontSize: 'var(--fs-xs)', color: 'var(--sale)' }}>
                          {formatPrice(sale.now)}
                        </span>
                      </span>

                      <button
                        onClick={() => add(p.slug, p.blessings[0])}
                        className="btn"
                        style={{ ['--pad' as string]: '.5rem 1rem', fontSize: 'var(--fs-xs)' }}
                      >
                        הוספה
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {lines.length > 0 && (
          <div className="px-7 py-6" style={{ borderTop: '1px solid var(--line)' }}>
            {/* מחירון ואז הנחה ואז סכום. בלי שורת המחירון ההנחה נראית כאילו
                היא יורדת מהסכום שכבר מוצג, ומספרים שלא מסתדרים שוברים אמון */}
            {discount > 0 && (
              <>
                <div className="mb-2 flex items-center justify-between">
                  <span style={{ color: 'var(--ink-2)', fontSize: 'var(--fs-sm)' }}>סכום הפריטים</span>
                  <span className="num" style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-2)' }}>
                    {formatPrice(listTotal)}
                  </span>
                </div>
                <div className="mb-2 flex items-center justify-between">
                  <span style={{ color: 'var(--sale)', fontSize: 'var(--fs-sm)', fontWeight: 500 }}>
                    {PROMO.pill} · {PROMO.code}
                  </span>
                  <span className="num" style={{ fontSize: 'var(--fs-sm)', fontWeight: 500, color: 'var(--sale)' }}>
                    −{formatPrice(discount)}
                  </span>
                </div>
              </>
            )}

            <CodeField />

            <div className="mb-3 flex items-center justify-between">
              <span style={{ color: 'var(--ink-2)', fontSize: 'var(--fs-sm)' }}>משלוח</span>
              <span style={{ fontSize: 'var(--fs-sm)', fontWeight: gap <= 0 ? 500 : 400, color: gap <= 0 ? 'var(--accent-deep)' : 'var(--ink-2)' }}>
                {gap <= 0 ? 'חינם' : 'מחושב בתשלום'}
              </span>
            </div>

            {giftFee > 0 && (
              <div className="mb-3 flex items-center justify-between">
                <span style={{ color: 'var(--ink-2)', fontSize: 'var(--fs-sm)' }}>{GIFT_BOX.title}</span>
                <span className="num" style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink)' }}>
                  {formatPrice(giftFee)}
                </span>
              </div>
            )}

            <div
              className="flex items-baseline justify-between pt-3"
              style={{ borderTop: '1px solid var(--line)' }}
            >
              <span style={{ color: 'var(--ink-2)', fontSize: 'var(--fs-sm)' }}>סה״כ ביניים</span>
              <span className="num display" style={{ fontSize: 'var(--fs-xl)' }}>
                {formatPrice(total)}
              </span>
            </div>

            <p className="mb-4 mt-1 text-end" style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-2)' }}>
              או עד {INSTALLMENTS} תשלומים של כ־
              <span className="num">{formatPrice(perInstallment(total))}</span>
            </p>

            <button
              className="btn btn-solid w-full"
              style={{ ['--pad' as string]: '1.15rem 2rem', fontSize: 'var(--fs-base)' }}
            >
              מעבר לתשלום מאובטח
            </button>

            {/* המשלוח לא נכלל כאן. ההבטחה הזו סותרת את הפס שלמעלה */}
            <p className="mt-3 text-center" style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-3)' }}>
              קופסה מרופדת, כרטיס ברכה וזכוכית מגדלת - כלולים בכל הזמנה
            </p>
          </div>
        )}
      </aside>
    </>
  );
}
