'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import NanoLoupe from './NanoLoupe';
import { PROMO, saleOf } from '@/lib/promo';
import { BLESSINGS, getBlessing, type BlessingId } from '@/lib/blessings';
import {
  CATEGORIES,
  FINISHES,
  MATERIALS,
  CHIP_SPEC,
  BOX_SPEC,
  CARE_SPEC,
  FINISH_SWATCH,
  finishSiblings,
  formatPrice,
  sceneFocus,
  type Product,
} from '@/lib/catalog';
import { useCart } from '@/lib/cart';
import { GIFT_BOX, INSTALLMENTS, perInstallment } from '@/lib/extras';
import { wornFor, wornFocus } from '@/lib/worn';
import GiftTags from './GiftTags';
import ScaleCompare from './ScaleCompare';

type View = 'jewel' | 'worn' | 'chip' | 'scale' | `scene-${number}`;

const BASE_VIEWS: { id: View; label: string }[] = [
  { id: 'jewel', label: 'התכשיט' },
  { id: 'chip', label: 'הברכה על השבב' },
  { id: 'scale', label: 'קנה מידה' },
];

/* שורת הביטחון שמתחת לכפתור. אייקון נקרא לפני שהעין מגיעה למילה */
const ASSURANCE = [
  {
    label: 'משלוח חינם מעל ₪450',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <path
          d="M3 7h11v9H3V7Zm11 3h4l3 3v3h-7v-6ZM7 19a1.6 1.6 0 1 0 0-3.2A1.6 1.6 0 0 0 7 19Zm10 0a1.6 1.6 0 1 0 0-3.2A1.6 1.6 0 0 0 17 19Z"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    label: 'שנה אחריות',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 3.5 19 6v5.6c0 4-2.9 7.2-7 8.9-4.1-1.7-7-4.9-7-8.9V6l7-2.5Z"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: 'החזרה תוך 30 יום',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <path
          d="M4.5 12a7.5 7.5 0 1 1 2.3 5.4"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <path d="M4 7.5V12h4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export default function ProductView({ product }: { product: Product }) {
  const available = BLESSINGS.filter((b) => product.blessings.includes(b.id));

  const [blessing, setBlessing] = useState<BlessingId>(available[0].id);
  const [view, setView] = useState<View>('jewel');
  const [qty, setQty] = useState(1);
  const [openSpec, setOpenSpec] = useState<number | null>(null);
  const add = useCart((s) => s.add);
  const gift = useCart((s) => s.gift);
  const setGift = useCart((s) => s.setGift);

  const worn = wornFor(product.slug);
  // בצילום עם שני תכשיטים, המרכז הוא הרווח ביניהם ולא אחד מהם
  const wornAt = wornFocus(worn, product.slug);
  // הצילום על הדגם נכנס מיד אחרי פאק־שוט המוצר, אם קיים כזה
  const VIEWS = [
    BASE_VIEWS[0],
    ...(worn ? [{ id: 'worn' as View, label: 'על הדגם' }] : []),
    ...(product.scenes ?? []).map((_, i) => ({
      id: `scene-${i}` as View,
      label: (product.scenes?.length ?? 0) > 1 ? `בסצנה ${i + 1}` : 'בסצנה',
    })),
    ...BASE_VIEWS.slice(1),
  ];

  const one = available.length === 1;
  const b = getBlessing(blessing);
  const cat = CATEGORIES[product.category];
  const sale = saleOf(product.price);
  // התצוגה הנוכחית כשהיא סצנה - האינדקס נגזר מהמזהה
  const sceneIndex = view.startsWith('scene-') ? Number(view.slice(6)) : -1;
  const siblings = finishSiblings(product);

  // הפס הדביק מופיע רק כשהכפתור האמיתי יצא מהמסך, אחרת שני כפתורים
  // זהים מתחרים זה בזה על אותה פעולה
  const buyRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);

  // מדידה ישירה בגלילה ולא IntersectionObserver: המיקום הנדרש כאן הוא
  // "הכפתור נשאר מאחור למעלה", וזו השוואה אחת. גם קל לאמת אותה.
  useEffect(() => {
    let ticking = false;
    const check = () => {
      ticking = false;
      const el = buyRef.current;
      if (!el) return;
      // התחתית מעל קצה המסך = עברנו את הכפתור. מתחתיו - עוד לא הגענו
      setStuck(el.getBoundingClientRect().bottom < 0);
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(check);
    };
    check();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  // המק״ט, החומר והברכה הנבחרת נגזרים מהנתונים ומצטרפים למפרט הדגם
  const productRows = [
    { label: 'מק״ט', value: product.sku },
    { label: 'חומר', value: MATERIALS[product.material].label },
    ...product.specs,
    { label: 'סוג פריט', value: cat.singular },
    { label: 'הברכה שנבחרה', value: `${b.plain} · ${b.words} מילים · ${b.sources}` },
  ];

  return (
    <>
      <div className="shell grid gap-14 pt-32 lg:grid-cols-[1.06fr_.94fr] lg:gap-20 lg:pt-36">
      {/* ================= גלריה ================= */}
      {/* מתחת ל־lg הפריסה נערמת, ובלי תקרה התמונה מותחת לכל רוחב ה־shell
          ומגיעה ל־845px על חלון של 918 — ריבוע ענק שבולע את העמוד */}
      <div className="mx-auto w-full max-w-[540px] lg:mx-0 lg:max-w-none lg:sticky lg:top-28 lg:self-start">
        <div
          className={view === 'chip' || view === 'worn' || sceneIndex >= 0 ? '' : 'tile'}
          style={{
            position: 'relative',
            aspectRatio: '1',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}
        >
          {view === 'jewel' && (
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(max-width: 1024px) 92vw, 46vw"
              priority
              className="object-contain p-[18%]"
              style={{ filter: 'drop-shadow(0 18px 24px rgb(70 55 20 / .14))' }}
            />
          )}
          {view === 'worn' && worn && (
            <Image
              src={worn.file}
              alt={worn.alt}
              fill
              sizes="(max-width: 1024px) 92vw, 46vw"
              style={{ objectPosition: wornAt }}
              className="object-cover"
            />
          )}
          {sceneIndex >= 0 && product.scenes?.[sceneIndex] && (
            <Image
              src={product.scenes[sceneIndex]}
              alt={product.name}
              fill
              sizes="(max-width: 1024px) 92vw, 46vw"
              style={{ objectPosition: sceneFocus(product.scenes[sceneIndex]) }}
              className="object-cover"
            />
          )}
          {view === 'chip' && (
            <div className="absolute inset-0">
              <NanoLoupe blessing={blessing} height="100%" zoom={12} radius={104} />
            </div>
          )}
          {view === 'scale' && <ScaleCompare accent={b.accent} />}
        </div>

        {/* תמונות ממוזערות — כמו בכל חנות, ולא כפתורי טקסט */}
        <div className="mt-4 flex gap-3">
          {VIEWS.map((v) => {
            const on = v.id === view;
            return (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                aria-label={v.label}
                aria-pressed={on}
                className={v.id === 'chip' || v.id === 'worn' || v.id.startsWith('scene-') ? '' : 'tile'}
                style={{
                  position: 'relative',
                  width: 84,
                  height: 84,
                  flexShrink: 0,
                  overflow: 'hidden',
                  borderRadius: 'var(--radius)',
                  border: `1px solid ${on ? 'var(--accent)' : 'var(--line)'}`,
                  background: v.id === 'chip' ? '#05070a' : undefined,
                  transition: 'border-color .3s var(--ease)',
                }}
              >
                {v.id === 'jewel' && (
                  <Image src={product.image} alt="" fill sizes="84px" className="object-contain p-1.5" />
                )}
                {v.id === 'worn' && worn && (
                  <Image
                    src={worn.file}
                    alt=""
                    fill
                    sizes="84px"
                    style={{ objectPosition: wornAt }}
                    className="object-cover"
                  />
                )}
                {v.id.startsWith('scene-') && (
                  <Image
                    src={product.scenes?.[Number(v.id.slice(6))] ?? ''}
                    alt=""
                    fill
                    sizes="84px"
                    style={{ objectPosition: sceneFocus(product.scenes?.[Number(v.id.slice(6))] ?? '') }}
                    className="object-cover"
                  />
                )}
                {v.id === 'chip' && (
                  <span
                    aria-hidden
                    className="nano-grid absolute inset-2"
                    style={{ ['--accent' as string]: b.accentSoft }}
                  />
                )}
                {v.id === 'scale' && (
                  <span
                    aria-hidden
                    className="absolute inset-0 flex items-center justify-center gap-1.5"
                  >
                    <span style={{ width: 30, height: 10, borderRadius: 5, background: 'var(--line-strong)' }} />
                    <span style={{ width: 12, height: 12, borderRadius: 6, background: 'var(--line-strong)' }} />
                    <span style={{ width: 5, height: 5, background: b.accent }} />
                  </span>
                )}
              </button>
            );
          })}

          <p
            className="flex-1 self-center ps-1"
            style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-3)', lineHeight: 1.6 }}
          >
            {VIEWS.find((v) => v.id === view)?.label}
          </p>
        </div>
      </div>

      {/* ================= מידע ורכישה ================= */}
      <div className="pb-16">
        <nav className="mb-6 flex items-center gap-3" style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-3)' }}>
          <Link href="/" className="link-u">בית</Link>
          <span>/</span>
          <Link href={`/categories/${product.category}`} className="link-u">{cat.title}</Link>
          <span>/</span>
          <span style={{ color: 'var(--accent)' }}>{product.name}</span>
        </nav>

        {product.badge && (
          <span
            className="mb-4 inline-block"
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

        <h1
          className="display"
          style={{ fontSize: 'var(--ds-1)', fontWeight: 500, lineHeight: 1.1 }}
        >
          {product.name}
        </h1>

        {/* מקור השם. זה מה שהופך שם לציטוט, וציטוט אי אפשר להמציא */}
        {product.source ? (
          <figure className="mt-4">
            <blockquote
              className="display"
              style={{
                fontSize: 'var(--fs-md)',
                fontWeight: 400,
                lineHeight: 1.7,
                color: 'var(--accent-deep)',
                borderInlineStart: '2px solid var(--accent)',
                paddingInlineStart: '.9rem',
              }}
            >
              {product.source.phrase}
            </blockquote>
            <figcaption
              className="mt-1.5"
              style={{
                fontSize: 'var(--fs-xs)',
                letterSpacing: '.14em',
                color: 'var(--ink-3)',
                paddingInlineStart: '.9rem',
              }}
            >
              {product.source.ref} · {product.nameLatin}
            </figcaption>
          </figure>
        ) : (
          <p className="mt-3 flex items-center gap-3">
            <span aria-hidden style={{ width: 26, height: 1, background: 'var(--accent)', flexShrink: 0 }} />
            <span className="ltr" style={{ fontSize: 'var(--fs-2xs)', letterSpacing: '.32em', color: 'var(--accent)' }}>
              {product.nameLatin}
            </span>
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <span
            className="num display"
            style={{ fontSize: 'var(--fs-2xl)', fontWeight: sale.discounted ? 500 : undefined, color: sale.discounted ? 'var(--sale)' : undefined }}
          >
            {formatPrice(sale.now)}
          </span>
          {(sale.discounted || product.compareAt) && (
            <span className="num" style={{ fontSize: 'var(--fs-md)', color: 'var(--ink-3)', textDecoration: 'line-through' }}>
              {formatPrice(product.compareAt ?? sale.was)}
            </span>
          )}
          {sale.discounted && (
            <span
              className="num"
              style={{
                fontSize: 'var(--fs-xs)',
                fontWeight: 700,
                letterSpacing: '.04em',
                padding: '.3rem .72rem',
                borderRadius: 99,
                color: 'var(--on-sale)',
                background: 'var(--sale)',
                boxShadow: '0 4px 14px -4px rgb(216 31 42 / .5)',
              }}
            >
              {PROMO.pill} · חיסכון {formatPrice(sale.saved)}
            </span>
          )}
          <span
            style={{
              fontSize: 'var(--fs-xs)',
              letterSpacing: '.06em',
              color: 'var(--ink-2)',
              border: '1px solid var(--line)',
              borderRadius: 99,
              padding: '.28rem .7rem',
            }}
          >
            {MATERIALS[product.material].label} · {FINISHES[product.finish]}
          </span>
        </div>

        <p className="mt-2" style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-2)' }}>
          או עד {INSTALLMENTS} תשלומים של כ־
          <span className="num" style={{ color: 'var(--ink)' }}>
            {formatPrice(perInstallment(sale.now))}
          </span>
        </p>

        {siblings.length > 1 && (
          <div className="mt-7">
            <p className="mb-3" style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-3)' }}>
              גימור:{' '}
              <span style={{ color: 'var(--ink)' }}>{FINISHES[product.finish]}</span>
            </p>
            <div className="flex items-center gap-3">
              {siblings.map((sib) => {
                const on = sib.slug === product.slug;
                return (
                  <Link
                    key={sib.slug}
                    href={`/products/${sib.slug}`}
                    aria-label={FINISHES[sib.finish]}
                    aria-current={on ? 'page' : undefined}
                    title={`${FINISHES[sib.finish]} · ${formatPrice(saleOf(sib.price).now)}`}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 99,
                      background: FINISH_SWATCH[sib.finish],
                      boxShadow: on
                        ? '0 0 0 2px var(--bg), 0 0 0 4px var(--accent)'
                        : 'inset 0 0 0 1px rgb(0 0 0 / .16)',
                      transition: 'box-shadow .3s var(--ease)',
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}

        <p className="lede mt-7">{product.story}</p>

        <hr className="rule my-10" />

        {/* ---------- בחירת הברכה ---------- */}
        <div>
          <div className="mb-1 flex items-baseline justify-between gap-4">
            <p className="eyebrow" style={{ color: b.accentInk }}>
              {one ? 'הברכה שנצרבת' : 'הברכה שתיצרב'}
            </p>
            <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-3)' }}>
              {one ? 'נוסח אחד' : `${available.length} נוסחים לבחירה`}
            </span>
          </div>
          <p className="mb-5" style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-3)' }}>
            {one
              ? 'בדגם הזה נצרב נוסח אחד, והוא נבחר לפי אופי התכשיט.'
              : 'אותו תכשיט, נוסח אחר. הבחירה משנה רק את מה שנצרב על השבב.'}
          </p>

          <div className="flex flex-col gap-2.5">
            {available.map((item) => {
              const on = item.id === blessing;
              const row = (
                <>
                  {/* שדרה בצבע הברכה — הצבע הוא הסימן הראשון, לא הטקסט */}
                  <span
                    aria-hidden
                    style={{
                      position: 'absolute',
                      insetBlock: 0,
                      insetInlineStart: 0,
                      width: on ? 6 : 3,
                      background: item.accent,
                      transition: 'width .3s var(--ease)',
                    }}
                  />

                  <span
                    aria-hidden
                    style={{
                      width: 34,
                      height: 34,
                      flexShrink: 0,
                      borderRadius: 4,
                      background: `linear-gradient(145deg, ${item.accentSoft}, ${item.accent} 58%, ${item.accentInk})`,
                      boxShadow: on
                        ? `0 0 0 3px color-mix(in oklab, ${item.accent} 24%, transparent)`
                        : 'inset 0 0 0 1px rgb(0 0 0 / .08)',
                      transition: 'box-shadow .3s var(--ease)',
                    }}
                  />

                  <span className="flex-1">
                    <span className="flex items-baseline justify-between gap-3">
                      <span
                        className="display"
                        style={{ fontSize: 'var(--fs-md)', color: on ? item.accentInk : 'var(--ink)' }}
                      >
                        {item.title}
                      </span>
                      <span
                        className="num"
                        style={{
                          fontSize: 'var(--fs-xs)',
                          color: on ? item.accentInk : 'var(--ink-3)',
                          flexShrink: 0,
                        }}
                      >
                        {item.words} מילים
                      </span>
                    </span>

                    <span className="mt-0.5 block" style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-3)' }}>
                      {item.forWhom}
                    </span>

                    {/* מתאים ל — כאן ההחלטה נופלת, ולא בעמוד הברכה הפנימי */}
                    <span className="mt-2 block">
                      <GiftTags blessing={item} muted={!on && !one} />
                    </span>
                  </span>
                </>
              );

              const skin: React.CSSProperties = {
                position: 'relative',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '.95rem',
                overflow: 'hidden',
                padding: '.95rem 1.15rem .95rem 1.4rem',
                paddingInlineStart: '1.5rem',
                borderRadius: 'var(--radius)',
                border: `1px solid ${on ? item.accent : 'var(--line)'}`,
                background: on
                  ? `color-mix(in oklab, ${item.accent} 9%, var(--surface))`
                  : 'var(--surface)',
                transition: 'border-color .3s var(--ease), background-color .3s var(--ease)',
              };

              // נוסח יחיד אינו בחירה — כפתור שאי אפשר לשנות בו כלום מטעה
              return one ? (
                <div key={item.id} style={skin}>
                  {row}
                </div>
              ) : (
                <button
                  key={item.id}
                  onClick={() => setBlessing(item.id)}
                  aria-pressed={on}
                  className="text-start"
                  style={skin}
                >
                  {row}
                </button>
              );
            })}
          </div>
        </div>

        {/* ---------- כמות והוספה ---------- */}
        <div ref={buyRef} className="mt-8 flex gap-3">
          {/* הכפתורים היו תווי טקסט ברוחב 8px. באצבע אי אפשר לפגוע בהם */}
          <div
            className="flex items-center"
            style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius)' }}
          >
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              aria-label="הפחתת כמות"
              className="tap"
              style={{ color: 'var(--ink-2)', fontSize: 'var(--fs-md)' }}
            >
              −
            </button>
            <span className="num" style={{ minWidth: 26, textAlign: 'center' }}>
              {qty}
            </span>
            <button
              onClick={() => setQty((q) => q + 1)}
              aria-label="הוספת כמות"
              className="tap"
              style={{ color: 'var(--ink-2)', fontSize: 'var(--fs-md)' }}
            >
              +
            </button>
          </div>
          <button onClick={() => add(product.slug, blessing, qty)} className="btn btn-solid flex-1">
            הוספה לעגלה · {formatPrice(sale.now * qty)}
          </button>
        </div>

        {/* ---------- שדרוג אריזה ---------- */}
        <button
          onClick={() => setGift(!gift)}
          role="switch"
          aria-checked={gift}
          className="mt-4 flex w-full items-center gap-4 p-4 text-start"
          style={{
            borderRadius: 'var(--radius)',
            border: `1px solid ${gift ? 'var(--accent)' : 'var(--line)'}`,
            background: gift ? 'color-mix(in oklab, var(--accent) 7%, var(--surface))' : 'var(--surface)',
            transition: 'border-color .3s var(--ease), background-color .3s var(--ease)',
          }}
        >
          <span
            aria-hidden
            style={{
              width: 42,
              height: 24,
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
                width: 18,
                height: 18,
                borderRadius: 99,
                background: '#fff',
                transform: gift ? 'translateX(-18px)' : 'none',
                transition: 'transform .3s var(--ease)',
              }}
            />
          </span>

          <span className="flex-1">
            <span className="display block" style={{ fontSize: 'var(--fs-base)' }}>
              {GIFT_BOX.title}
              <span className="num" style={{ marginInlineStart: '.5rem', color: 'var(--accent)' }}>
                +{formatPrice(GIFT_BOX.price)}
              </span>
            </span>
            <span className="mt-0.5 block" style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-3)', lineHeight: 1.6 }}>
              {GIFT_BOX.note}
            </span>
          </span>
        </button>

        {/* ---------- שורת ביטחון ---------- */}
        <ul className="mt-7 grid grid-cols-3 gap-3 text-center">
          {ASSURANCE.map((a) => (
            <li key={a.label} className="flex flex-col items-center gap-2">
              <span aria-hidden style={{ color: 'var(--accent)' }}>
                {a.icon}
              </span>
              <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-2)', lineHeight: 1.5 }}>
                {a.label}
              </span>
            </li>
          ))}
        </ul>

        {/* ---------- מה נצרב בפועל ---------- */}
        <div
          className="mt-5 p-6"
          style={{
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--line)',
            borderColor: `color-mix(in oklab, ${b.accent} 26%, var(--line))`,
            borderInlineStartWidth: 4,
            borderInlineStartColor: b.accent,
            background: `color-mix(in oklab, ${b.accentSoft} 26%, var(--surface))`,
          }}
        >
          <p style={{ fontSize: 'var(--fs-2xs)', letterSpacing: '.22em', color: b.accentInk }}>
            {b.sources}
          </p>

          <p className="display mt-4" style={{ fontSize: 'var(--fs-lg)', lineHeight: 1.7, color: 'var(--ink)' }}>
            {b.opening}
          </p>
          <p className="mt-1.5" style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-3)' }}>{b.openingSource}</p>

          <p className="mt-4" style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-2)', lineHeight: 1.8 }}>
            {b.blurb}
          </p>

          <div
            className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 pt-4"
            style={{ borderTop: '1px solid var(--line)', fontSize: 'var(--fs-xs)', color: 'var(--ink-3)' }}
          >
            <span className="num">{b.words} מילים</span>
            <span className="num">{b.chars.toLocaleString('he-IL')} תווים</span>
            <button onClick={() => setView('chip')} className="link-u" style={{ color: b.accentInk }}>
              להביט בשבב
            </button>
            <Link href={`/blessings/${b.id}`} className="link-u" style={{ color: b.accentInk }}>
              לנוסח המלא ←
            </Link>
          </div>
        </div>

        {/* ---------- מפרט ---------- */}
        <div className="mt-14">
          <p className="eyebrow mb-2">מפרט מלא</p>

          {[
            { title: 'התכשיט', rows: productRows },
            { title: 'השבב', rows: CHIP_SPEC },
            { title: 'מה מגיע בקופסה', rows: BOX_SPEC },
            { title: 'טיפוח ואחריות', rows: CARE_SPEC },
          ].map((group, i) => {
            const open = openSpec === i;
            return (
              <section key={group.title} style={{ borderTop: '1px solid var(--line)' }}>
                <button
                  onClick={() => setOpenSpec(open ? null : i)}
                  aria-expanded={open}
                  className="flex w-full items-center justify-between gap-6 py-5 text-start"
                >
                  <span className="display" style={{ fontSize: 'var(--fs-md)' }}>
                    {group.title}
                  </span>
                  <span
                    aria-hidden
                    style={{
                      color: 'var(--accent)',
                      flexShrink: 0,
                      fontSize: 'var(--fs-lg)',
                      lineHeight: 1,
                      transform: open ? 'rotate(45deg)' : 'none',
                      transition: 'transform .4s var(--ease)',
                    }}
                  >
                    +
                  </span>
                </button>

                {/* grid-rows במקום height: נפתח לגובה האמיתי בלי למדוד */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateRows: open ? '1fr' : '0fr',
                    transition: 'grid-template-rows .45s var(--ease)',
                  }}
                >
                  <dl style={{ overflow: 'hidden' }}>
                    {group.rows.map((row) => (
                      <div
                        key={row.label + row.value}
                        className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:gap-6"
                      >
                        <dt
                          className="sm:w-40 sm:shrink-0"
                          style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-3)' }}
                        >
                          {row.label}
                        </dt>
                        <dd style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-2)', lineHeight: 1.65 }}>
                          {row.value}
                        </dd>
                      </div>
                    ))}
                    <div className="pb-4" />
                  </dl>
                </div>
              </section>
            );
          })}
        </div>
        </div>
      </div>

      {/* ---------- פס קנייה דביק ---------- */}
      <div
        aria-hidden={!stuck}
        style={{
          position: 'fixed',
          insetInline: 0,
          bottom: 0,
          zIndex: 80,
          background: 'var(--bg)',
          borderTop: '1px solid var(--line)',
          boxShadow: '0 -14px 40px -28px rgb(60 45 15 / .5)',
          transform: stuck ? 'none' : 'translateY(105%)',
          transition: 'transform .45s var(--ease)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="shell flex items-center gap-4 py-3">
          <span
            className="tile relative hidden sm:block"
            style={{
              width: 52,
              height: 52,
              flexShrink: 0,
              borderRadius: 'var(--radius)',
              border: '1px solid var(--line)',
              overflow: 'hidden',
            }}
          >
            <Image src={product.image} alt="" fill sizes="52px" className="object-contain p-1.5" />
          </span>

          <span className="hidden min-w-0 flex-1 sm:block">
            <span className="display block truncate" style={{ fontSize: 'var(--fs-base)' }}>
              {product.name}
            </span>
            <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-2)' }}>{b.plain}</span>
          </span>

          <span className="flex items-baseline gap-2 sm:flex-shrink-0">
            {sale.discounted && (
              <span
                className="num"
                style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-3)', textDecoration: 'line-through' }}
              >
                {formatPrice(product.price)}
              </span>
            )}
            <span
              className="num display"
              style={{ fontSize: 'var(--fs-lg)', color: sale.discounted ? 'var(--sale)' : undefined }}
            >
              {formatPrice(sale.now)}
            </span>
          </span>

          <button
            onClick={() => add(product.slug, blessing, qty)}
            className="btn btn-solid flex-1 sm:max-w-xs"
            style={{ ['--pad' as string]: '.85rem 1.6rem', fontSize: 'var(--fs-sm)' }}
          >
            הוספה לעגלה
          </button>
        </div>
      </div>
    </>
  );
}
