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
import ProductStory from './ProductStory';
import PairedWith from './PairedWith';
import DeliveryEstimate from './DeliveryEstimate';
import Accordion from './Accordion';
import { POLICY, SHIPPING, deliveryLine, shippingNote } from '@/lib/policy';
import { waHref } from '@/lib/company';
import { SITE_URL } from '@/lib/site';
import { productFaq } from '@/lib/faq';
import { trackViewItem } from '@/lib/analytics';
import PaymentMarks from '@/components/PaymentMarks';

type View = 'jewel' | 'worn' | 'chip' | `scene-${number}`;

const BASE_VIEWS: { id: View; label: string }[] = [
  { id: 'jewel', label: 'התכשיט' },
  { id: 'chip', label: 'הברכה על השבב' },
];

/* שורת הביטחון שמתחת לכפתור. שורה אחת של טקסט, כמו שורת המקורות
   בהירו. קודם שלוש עמודות עם אייקון קו מעל כל מילה - הרשת של תבנית */
const ASSURANCE = [`משלוח מבוטח · ${deliveryLine}`, 'שנה אחריות', `החזרה תוך ${POLICY.returnDays} יום`];

/**
 * כמה עולה להגיע, ליד מתי מגיע.
 *
 * דמי המשלוח והסף ישבו רק בתוך שאלה מקופלת בתחתית העמוד, ומחקר
 * השימושיות של Baymard מוצא שרוב הקונים מחפשים אותם בעמוד המוצר לפני
 * ההוספה לעגלה, ושעלות שמתגלה בצ'קאאוט היא הסיבה הראשונה לנטישה.
 * הכול מ-POLICY: משתנה שם - משתנה כאן.
 */
const pickup = SHIPPING.find((m) => m.id === 'pickup');
const SHIPPING_LINE = [
  POLICY.shippingFlat === null ? 'דמי המשלוח מוצגים בתשלום' : `משלוח ${shippingNote}`,
  ...(POLICY.freeShippingOver !== null ? [`חינם מ־₪${POLICY.freeShippingOver}`] : []),
  ...(pickup ? [`או ${pickup.label} ללא עלות`] : []),
].join(' · ');

export default function ProductView({ product }: { product: Product }) {
  const available = BLESSINGS.filter((b) => product.blessings.includes(b.id));

  const [blessing, setBlessing] = useState<BlessingId>(available[0].id);
  /**
   * האם הברכה נבחרה בפועל, ולא רק ברירת המחדל.
   *
   * עשרה מתוך חמישה־עשר הדגמים נושאים יותר מנוסח אחד, וברירת המחדל
   * היא הראשון ברשימה. הפס הדביק מופיע עכשיו גם לפני שמגיעים לבורר,
   * ובלי הדגל הזה אפשר היה להוסיף לעגלה ולצרוב נוסח שאיש לא בחר.
   */
  const [picked, setPicked] = useState(false);
  const chooserRef = useRef<HTMLDivElement>(null);
  const mustChoose = available.length > 1 && !picked;
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

  /**
   * צפייה בדגם. נורה גם כשמחליפים ברכה, כי זו בחירה אחרת של
   * אותו פריט - ובלעדיה הדוח לא מראה איזה נוסח באמת נבחן.
   *
   * המפתח האחרון נשמר כדי שהרכבה חוזרת לא תיספר כצפייה שנייה:
   * במצב פיתוח React מריץ כל אפקט פעמיים, וזה נמדד ונראה בבירור.
   * החלפת ברכה משנה את המפתח, ולכן היא כן נספרת.
   */
  const seen = useRef('');
  useEffect(() => {
    const key = `${product.slug}::${blessing}`;
    if (seen.current === key) return;
    seen.current = key;
    trackViewItem(product, blessing);
  }, [product, blessing]);
  const cat = CATEGORIES[product.category];
  const sale = saleOf(product.price);
  // התצוגה הנוכחית כשהיא סצנה - האינדקס נגזר מהמזהה
  const sceneIndex = view.startsWith('scene-') ? Number(view.slice(6)) : -1;
  const siblings = finishSiblings(product);

  // הפס הדביק מופיע רק כשהכפתור האמיתי יצא מהמסך, אחרת שני כפתורים
  // זהים מתחרים זה בזה על אותה פעולה
  const buyRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);

  /**
   * הפס הדביק מופיע כשהכפתור האמיתי אינו על המסך - לא רק אחרי שעברנו
   * אותו.
   *
   * קודם התנאי היה bottom < 0 בלבד, כלומר "הכפתור נשאר מאחור". אבל
   * במובייל הכפתור יושב אחרי הגלריה, פירורי הלחם, הכותרת, המקור,
   * המחיר, התשלומים, התיאור ובחירת הברכה - וכל הדרך הזאת נגללה בלי
   * שום אפשרות לקנות. הפער הזה הוא בדיוק המקום שבו מבקר מתייאש.
   *
   * עכשיו הוא מופיע גם כשהכפתור עוד מתחת לקיפול, ונעלם רק כשהוא
   * באמת על המסך - אז הוא מיותר. סף הגלילה מונע ממנו לקפוץ בראש
   * העמוד, שם הגלריה עצמה עושה את העבודה.
   */
  useEffect(() => {
    let ticking = false;
    const check = () => {
      ticking = false;
      const el = buyRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const passed = r.bottom < 0;
      const notReached = r.top > window.innerHeight;
      setStuck((passed || notReached) && window.scrollY > 320);
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

  const faq = productFaq(product, b);

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
      <div className="shell grid gap-8 pt-32 sm:gap-14 lg:grid-cols-[1.06fr_.94fr] lg:gap-20 lg:pt-36">
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
              style={{ objectPosition: sceneFocus(product.scenes[sceneIndex], product.slug) }}
              className="object-cover"
            />
          )}
          {view === 'chip' && (
            <div className="absolute inset-0">
              <NanoLoupe blessing={blessing} height="100%" radius={62} />
            </div>
          )}
        </div>

        {/* תמונות ממוזערות — כמו בכל חנות, ולא כפתורי טקסט.
            overflow-x-auto ולא visible: לדגם עם שמונה תצוגות הרצועה
            רחבה 812 בתוך טור של 345, וחמש מהן היו מחוץ למסך ובלתי
            נגישות. זה קורה בכל רוחב ולא רק בטלפון - גם ב-1440 הטור
            צר מדי - ולכן אין תנאי רספונסיבי */}
        <div className="mt-4 flex gap-3 overflow-x-auto">
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
                    style={{ objectPosition: sceneFocus(product.scenes?.[Number(v.id.slice(6))] ?? '', product.slug) }}
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
              </button>
            );
          })}

        </div>

        <p
          className="mt-2 ps-1"
          style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-3)', lineHeight: 1.6 }}
        >
          {VIEWS.find((v) => v.id === view)?.label}
        </p>
      </div>

      {/* ================= מידע ורכישה ================= */}
      <div className="pb-16">
        {/* לא במובייל. שורה שדוחפת את כל העמוד למטה כדי להודיע
            "בית / שרשראות" - מי שהגיע ממודעה לא הגיע דרך הבית, והוא
            משלם עליה בגובה דווקא במסך שבו כל פיקסל נחשב. בדסקטופ יש
            מקום, והיא כן משרתת ניווט */}
        <nav className="mb-6 hidden items-center gap-3 sm:flex" style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-3)' }}>
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
              fontWeight: 600,
              padding: '.3rem .6rem',
              borderRadius: 'var(--radius)',
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
                padding: '.3rem .6rem',
                borderRadius: 'var(--radius)',
                color: 'var(--on-sale)',
                background: 'var(--sale)',
              }}
            >
              {PROMO.pill} · חיסכון {formatPrice(sale.saved)}
            </span>
          )}
          <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-3)' }}>
            {MATERIALS[product.material].label} · {FINISHES[product.finish]}
          </span>
        </div>

        <p className="mt-2" style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-2)' }}>
          או עד {INSTALLMENTS} תשלומים ללא ריבית, כ־
          <span className="num" style={{ color: 'var(--ink)' }}>
            {formatPrice(perInstallment(sale.now))}
          </span>{' '}
          לחודש
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

        {/* my-10 הם 80 פיקסלים של הפרדה במסך שבו הכפתור נאבק על
            כל פיקסל. בדסקטופ יש מקום, במובייל אין */}
        <hr className="rule my-5 sm:my-10" />

        {/* ---------- בחירת הברכה ---------- */}
        {/*
          מקום אחד לבחור, מקום אחד לקרוא.

          הברכה הופיעה בעמוד הזה שלוש פעמים: בבורר מתקפל, בקופסת "מה
          נצרב" עם מקורות ומונים, ובמקטע ההוכחה. שלוש גרסאות של אותו
          דבר אינן הסבר - הן רעש. עכשיו יש כאן כרטיסים לבחירה, שורת
          הפתיחה של הנוסח שנבחר, וקישור אחד לעמוד שבו קוראים אותו במלואו.

          הכרטיסים גלויים תמיד. הבורר המתקפל חסך גובה, אבל הסתיר את
          העובדה שיש בכלל מה לבחור - וזה בדיוק מה שנקרא "מבולגן".
        */}
        <div ref={chooserRef} style={{ scrollMarginTop: 96 }}>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <p className="display" style={{ fontSize: 'var(--fs-md)', letterSpacing: 0 }}>
              {one ? 'הברכה שנצרבת על השבב' : 'איזו ברכה תיצרב על השבב?'}
            </p>
            <Link
              href="/blessings"
              className="link-u flex-shrink-0"
              style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-3)' }}
            >
              לכל הנוסחים ←
            </Link>
          </div>

          <div
            className={`grid gap-2.5 grid-cols-2 ${available.length >= 3 ? 'sm:grid-cols-3' : ''}`}
            role={one ? undefined : 'radiogroup'}
            aria-label="הברכה שתיצרב"
          >
            {available.map((item) => {
              const on = item.id === blessing;
              return (
                <button
                  key={item.id}
                  type="button"
                  role={one ? undefined : 'radio'}
                  aria-checked={one ? undefined : on}
                  disabled={one}
                  onClick={() => {
                    setBlessing(item.id);
                    setPicked(true);
                  }}
                  className="relative flex items-start gap-2.5 p-3 text-start"
                  style={{
                    borderRadius: 'var(--radius)',
                    border: `1.5px solid ${on ? item.accent : 'var(--line)'}`,
                    background: on
                      ? `color-mix(in oklab, ${item.accentSoft} 55%, var(--surface))`
                      : 'var(--surface)',
                    boxShadow: on ? `0 0 0 3px color-mix(in oklab, ${item.accent} 18%, transparent)` : 'none',
                    transition:
                      'border-color .25s var(--ease), background-color .25s var(--ease), box-shadow .25s var(--ease)',
                    cursor: one ? 'default' : 'pointer',
                  }}
                >
                  {/* הצבע הוא הסימן הראשון, לפני המילה. הוא יושב לצד
                      השם ולא מעליו - שורה אחת פחות בכל כרטיס */}
                  <span
                    aria-hidden
                    className="flex-shrink-0"
                    style={{
                      width: 20,
                      height: 20,
                      marginTop: 1,
                      borderRadius: 5,
                      background: `linear-gradient(145deg, ${item.accentSoft}, ${item.accent} 58%, ${item.accentInk})`,
                    }}
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className="display block"
                      style={{ fontSize: 'var(--fs-sm)', lineHeight: 1.3, color: on ? item.accentInk : 'var(--ink)' }}
                    >
                      {item.plain}
                    </span>
                    <span
                      className="mt-0.5 block"
                      style={{ fontSize: 'var(--fs-2xs)', lineHeight: 1.45, color: 'var(--ink-3)' }}
                    >
                      {item.forWhom}
                    </span>
                  </span>
                  {on && !one && (
                    <span aria-hidden className="absolute" style={{ top: 8, insetInlineEnd: 8, color: item.accentInk }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="m5 12 4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* שורת הפתיחה של הנוסח שנבחר. הטעימה שנשארת, במקום קופסה
              שלמה עם מקורות, מונים ושלושה קישורים */}
          <div className="mt-4 flex flex-col gap-1.5 px-1">
            <p className="display" style={{ fontSize: 'var(--fs-md)', lineHeight: 1.6, color: 'var(--ink)' }}>
              {b.opening}
            </p>
            <p
              className="flex flex-wrap items-center gap-x-3 gap-y-1"
              style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-3)' }}
            >
              <span>{b.openingSource}</span>
              <span className="num">{b.words} מילים</span>
              <Link href={`/blessings/${b.id}`} className="link-u" style={{ color: b.accentInk }}>
                לקריאת הנוסח המלא ←
              </Link>
            </p>

            {/* הבחירה הפיכה, ויש למי לשאול.

                מחקר המתנות (Gino & Flynn; Flynn & Adams) מוצא שהחשש הגדול
                של מי שקונה מתנה הוא לבחור לא נכון - וכאן הבחירה היא מילים.
                שני הדברים שמורידים את החשש: לדעת שאפשר לשנות, ודרך לשאול
                את מי שמקבל. שניהם היו קיימים ולא נאמרו כאן. העובדות
                מ-lib/faq.ts; מוצג רק כשיש באמת מבין מה לבחור */}
            {!one && (
              <p className="mt-1" style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-3)', lineHeight: 1.8 }}>
                אפשר לשנות את הנוסח בוואטסאפ עד שהחבילה יוצאת.{' '}
                {waHref && (
                  <>
                    לא בטוחים מה מתאים?{' '}
                    <a
                      href={`${waHref}?text=${encodeURIComponent(`שלום, אני מתלבט/ת איזה נוסח לבחור ל${product.name}. המתנה ל…`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-u"
                      style={{ color: 'var(--accent-deep)' }}
                    >
                      כתבו לנו ←
                    </a>
                    {' · '}
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`איזה נוסח היית רוצה על התכשיט? אפשר לקרוא את כולם כאן: ${SITE_URL}/blessings`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-u"
                      style={{ color: 'var(--accent-deep)' }}
                    >
                      לשלוח למי שמקבל, שיבחר ←
                    </a>
                  </>
                )}
              </p>
            )}
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

        <DeliveryEstimate color={b.accentInk} />
        <p className="mt-1.5 text-center" style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-3)' }}>
          {SHIPPING_LINE}
        </p>

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
            {/* flex עם gap, ולא marginInlineStart.
                הכותרת עברית והמחיר מספר, וזה גבול דו-כיווני - שם
                מרווח אינליין נבלע, והתוצאה הייתה "אריזת מתנה+₪49"
                דבוק. gap נמדד בפריסה ולא בזרימת הטקסט, ולכן הוא
                מחזיק בשני הכיוונים. */}
            <span
              className="display flex flex-wrap items-baseline gap-x-2"
              style={{ fontSize: 'var(--fs-base)' }}
            >
              {GIFT_BOX.title}
              <span className="num" style={{ color: 'var(--accent)' }}>
                +{formatPrice(GIFT_BOX.price)}
              </span>
            </span>
            <span className="mt-0.5 block" style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-3)', lineHeight: 1.6 }}>
              {GIFT_BOX.note}
            </span>
          </span>
        </button>

        {/* ---------- שורת ביטחון ---------- */}
        <p
          className="mt-6 text-center"
          style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-2)', lineHeight: 1.7 }}
        >
          {ASSURANCE.join(' · ')}
        </p>
        <PaymentMarks size={26} className="mt-3 justify-center" />

        {/* ---------- "איך אני יודע שזה באמת שם" ---------- */}
        {/*
          ההתנגדות הגדולה במוצר הזה היא שאי אפשר לראות את המוצר.
          כל מתחרה שנבדק עונה עליה במפורש, ואנחנו לא ענינו בכלל.

          היא יושבת כאן ולא בשאלות הנפוצות שבתחתית העמוד, כי זו
          הנקודה שבה היא נולדת - מיד אחרי הכפתור, כשכבר החלטת לקנות
          משהו שאתה לא יכול לבדוק בעין.

          כל טענה כאן ניתנת לבדיקה ע"י הקונה, ואין בה מספר שטרם הוכרע.
        */}
        <div
          className="mt-8 p-5 sm:p-6"
          style={{
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--line-strong)',
            background: 'var(--surface-2)',
          }}
        >
          <p className="display" style={{ fontSize: 'var(--fs-md)' }}>
            איך אפשר לדעת שהנוסח באמת שם?
          </p>

          <ul className="mt-4 flex flex-col gap-3">
            {[
              [
                'קראו אותו לפני שאתם קונים',
                `הנוסח המלא של ${b.plain} פתוח כאן באתר, מילה במילה. אנחנו לא מבקשים להאמין לנו - אפשר להשוות אותו למקור.`,
              ],
              [
                'המקור נקוב בשם',
                'Westminster Leningrad Codex, נחלת הכלל. לא נוסח שערכנו, ולא קיצור שנבחר כדי להיכנס לשטח.',
              ],
              [
                'עם ניקוד',
                'הניקוד נצרב יחד עם האותיות, ולא מושמט כדי לחסוך מקום. זה מה שנראה מתחת למיקרוסקופ.',
              ],
            ].map(([h, t]) => (
              // כותרת רצה לתוך הפסקה, כמו בטקסט ערוך - ולא ריבוע צבעוני
              // לפני כל שורה
              <li key={h} style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-2)', lineHeight: 1.7 }}>
                <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>{h}.</strong> {t}
              </li>
            ))}
          </ul>

          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 pt-4" style={{ borderTop: '1px solid var(--line)' }}>
            <Link
              href={`/blessings/${b.id}`}
              className="link-u"
              style={{ fontSize: 'var(--fs-sm)', color: b.accentInk }}
            >
              לקריאת הנוסח המלא ←
            </Link>
            <Link href="/craft" className="link-u" style={{ fontSize: 'var(--fs-sm)', color: b.accentInk }}>
              איך זה נצרב ←
            </Link>
          </div>
        </div>

        {/* ---------- התיאור ---------- */}
        {/*
          הוא ישב בין המחיר לכפתור, וזו הייתה הסיבה העיקרית לכך
          שכפתור ההוספה לעגלה נחת 901 פיקסלים מתחת לגלריה במובייל -
          יותר ממסך שלם של קריאה לפני שאפשר בכלל לקנות.

          כל האתרים בקטגוריה שנסקרו שמים את התוכן הארוך אחרי הכפתור.
          מי שכבר יודע מה הוא רוצה לא צריך לקרוא כדי להגיע אליו, ומי
          שכן רוצה לקרוא - התוכן ממתין לו בדיוק כאן.
        */}
        <p className="lede mt-8">{product.story}</p>

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

      {/* ---------- התוכן המסביר ---------- */}
      <ProductStory product={product} blessing={b} />

      {/* ---------- נענדים יחד ---------- */}
      <PairedWith slug={product.slug} />

      {/* ---------- שאלות נפוצות ----------
          הסקיל מציב את השאלות כקו ההגנה האחרון לפני ההמרה, ומורה
          לבנות אותן סביב ההתנגדויות ולא סביב מה שנוח לענות עליו.
          התשע כאן הן ההתנגדויות של הקטגוריה, בסדר שבו הן עולות */}
      <section className="pb-24 pt-4" style={{ borderTop: '1px solid var(--line)' }}>
        <div className="shell grid gap-10 pt-14 lg:grid-cols-[.7fr_1.3fr] lg:gap-16">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <h2 className="display t-2">שאלות שחוזרות</h2>
          </div>
          <Accordion items={faq} />
        </div>
      </section>

      {/* ---------- פס קנייה דביק ---------- */}
      {/* מסמן לפוטר שיש פס שעלול לכסות אותו. סימון ולא מדידה, כי
          הפוטר אינו יודע דבר על דף המוצר */}
      <span className="buybar-space hidden" aria-hidden />
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
            onClick={() => {
              // בלי בחירה מודעת הפס לא קונה - הוא מגלגל אל הבורר.
              // צריבה של נוסח שלא נבחר אינה שגיאה שאפשר לתקן אחרי
              // המשלוח, כי התכשיט כבר נצרב
              if (mustChoose) {
                chooserRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                return;
              }
              add(product.slug, blessing, qty);
            }}
            className="btn btn-solid flex-1 sm:max-w-xs"
            style={{ ['--pad' as string]: '.85rem 1.6rem', fontSize: 'var(--fs-sm)' }}
          >
            {mustChoose ? 'בחירת הנוסח' : 'הוספה לעגלה'}
          </button>
        </div>
      </div>
    </>
  );
}
