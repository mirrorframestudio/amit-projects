'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart, cartTotals } from '@/lib/cart';
import { getProduct, formatPrice } from '@/lib/catalog';
import { getBlessing } from '@/lib/blessings';
import { GIFT_BOX } from '@/lib/extras';
import { PROMO } from '@/lib/promo';
import { SHIPPING, shippingMethod, shippingCost } from '@/lib/policy';
import { COMPANY, waHref } from '@/lib/company';
import { trackBeginCheckout } from '@/lib/analytics';
import { saveOrderDone } from '@/lib/orderDone';
import PaymentMarks from '@/components/PaymentMarks';
import { deliveryWindow, formatWindow } from '@/lib/delivery';
import {
  EMPTY_CUSTOMER,
  FIELDS,
  RECIPIENT_FIELDS,
  validate,
  type Customer,
  type FieldErrors,
} from '@/lib/checkout';

/**
 * טופס הצ'קאאוט.
 *
 * הסכומים כאן הם לתצוגה בלבד. השרת מחשב אותם מחדש מהקטלוג, כי העגלה
 * חיה בדפדפן וכל מה שמגיע ממנה הוא קלט של המשתמש - אחרת אפשר היה
 * לשלוח בקשה עם סכום של שקל.
 *
 * השגיאות מוצגות רק אחרי הניסיון הראשון לשלוח. שדה שנצבע באדום לפני
 * שהספיקו להקליד בו הוא נזיפה, לא עזרה.
 */
/** הפרטים שנשמרים בין רענון לחזרה מדף הסולק. לא ההסכמות - אותן מסמנים מחדש */
const DRAFT_KEY = 'mikra:checkout-draft';

/**
 * @param paymentReady האם הסולק מחובר. מגיע מהשרת (lib/grow.ts הוא
 * server-only), וקובע מה כתוב על הכפתור: מה שבאמת קורה בלחיצה.
 */
export default function CheckoutForm({ paymentReady = false }: { paymentReady?: boolean }) {
  const { lines, gift, code, setOpen } = useCart();
  const [customer, setCustomer] = useState<Customer>(EMPTY_CUSTOMER);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  /** הקדשה לכרטיס שבקופסה. נשלחת כהערת ההזמנה */
  const [note, setNote] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
  /** מספר ההזמנה כשחוזרים מדף הסולק בלי לשלם */
  const [cancelled, setCancelled] = useState<string | null>(null);

  // ההידרציה נדחית, אחרת השרת והלקוח מציירים עגלות שונות
  useEffect(() => {
    useCart.persist.rehydrate();
    setReady(true);
    setOpen(false);

    /**
     * טיוטת הפרטים חוזרת אחרי רענון או חזרה מדף התשלום.
     *
     * מי שמילא שבעה שדות, יצא לדף הסולק וחזר בלי לשלם, מצא טופס ריק -
     * וזה הרגע שבו סוגרים את הלשונית. sessionStorage כמו סיכום ההזמנה:
     * נמחק עם הלשונית, לא נשלח לשום מקום.
     */
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as Partial<Customer> & { note?: string };
        const { note: savedNote, ...rest } = draft;
        setCustomer((c) => ({ ...c, ...rest, terms: false, marketing: false }));
        if (savedNote) {
          setNote(savedNote);
          setNoteOpen(true);
        }
      }
    } catch {
      /* אחסון חסום - הטופס פשוט מתחיל ריק */
    }

    const q = new URLSearchParams(window.location.search);
    if (q.get('cancelled') === '1') setCancelled(q.get('order'));
  }, [setOpen]);

  // שמירת הטיוטה בכל שינוי. ההסכמות לא נשמרות בכוונה
  useEffect(() => {
    if (!ready) return;
    try {
      // undefined נופל ב-JSON, וכך ההסכמות לא נשמרות
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...customer, terms: undefined, marketing: undefined, note }));
    } catch {
      /* אין אחסון - אין טיוטה */
    }
  }, [customer, note, ready]);

  /**
   * תחילת צ'קאאוט. נורה פעם אחת, ורק אחרי ההידרציה - לפניה העגלה
   * עדיין ריקה, ואירוע בלי פריטים אינו שווה דבר לאופטימיזציה.
   */
  const begun = useRef(false);
  useEffect(() => {
    if (!ready || begun.current || !lines.length) return;
    begun.current = true;
    trackBeginCheckout(lines);
  }, [ready, lines]);

  const totals = cartTotals(lines, code);
  const giftFee = gift ? GIFT_BOX.price : 0;
  const ship = shippingMethod(customer.shipping);
  // הסף נמדד על המחירון, כמו בשרת. listTotal ולא subtotal
  const shipCost = shippingCost(customer.shipping, totals.listTotal);
  const total = totals.subtotal + giftFee + shipCost;

  const set = (key: keyof Customer, value: string | boolean) => {
    const next = { ...customer, [key]: value };
    setCustomer(next);
    if (tried) setErrors(validate(next));
  };

  /**
   * שדה טקסט אחד. אותו רינדור לכתובת הקונה ולכתובת הנמען - שני
   * העתקים של אותו קלט היו נפרדים ברגע שמשהו בו משתנה.
   */
  const field = (f: (typeof FIELDS)[number]) => (
    <label key={f.key} className={f.half ? '' : 'sm:col-span-2'}>
      <span className="block" style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-2)' }}>
        {f.label}
        {/* חובה מסומן, ולא רק "לא חובה": Baymard מודד שכשרק הרשות מסומנת,
            שליש מהמשתמשים נתקלים בשגיאת אימות על שדה שדילגו עליו */}
        {f.optional ? (
          <span style={{ color: 'var(--ink-3)' }}> (לא חובה)</span>
        ) : (
          <span aria-hidden style={{ color: 'var(--ink-3)' }}> *</span>
        )}
      </span>
      <input
        type={f.type}
        inputMode={f.inputMode}
        required={!f.optional}
        value={String(customer[f.key] ?? '')}
        onChange={(e) => set(f.key, e.target.value)}
        autoComplete={f.autoComplete}
        aria-invalid={errors[f.key] ? 'true' : undefined}
        aria-describedby={errors[f.key] ? `err-${f.key}` : f.hint ? `hint-${f.key}` : undefined}
        className="mt-1.5 w-full px-3.5"
        style={{
          height: 46,
          fontSize: 'var(--fs-base)',
          borderRadius: 'var(--radius)',
          border: `1px solid ${errors[f.key] ? 'var(--sale)' : 'var(--line-strong)'}`,
          background: 'var(--surface)',
          color: 'var(--ink)',
        }}
      />
      {errors[f.key] ? (
        <span
          id={`err-${f.key}`}
          className="mt-1 block"
          style={{ fontSize: 'var(--fs-2xs)', color: 'var(--sale)' }}
        >
          {errors[f.key]}
        </span>
      ) : (
        f.hint && (
          <span id={`hint-${f.key}`} className="mt-1 block" style={{ fontSize: 'var(--fs-2xs)', color: 'var(--ink-3)' }}>
            {f.hint}
          </span>
        )
      )}
    </label>
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTried(true);
    const found = validate(customer);
    setErrors(found);
    if (Object.keys(found).length) {
      const first = document.querySelector<HTMLInputElement>('[aria-invalid="true"]');
      first?.focus();
      return;
    }

    setBusy(true);
    setFailed(null);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer, lines, gift, code, note: note.trim().slice(0, 500) }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.fields) setErrors(data.fields);
        setFailed(data.error ?? 'משהו השתבש');
        return;
      }
      /**
       * הסיכום נשמר לפני כל הפניה, ולשני המסלולים.
       *
       * גם מי שיוצא לדף התשלום של הסולק חוזר אחר כך לעמוד התודה,
       * ובלי השמירה כאן הוא היה חוזר לעמוד שאינו יודע מה נקנה.
       * הסכום נלקח מהשרת ולא מהטופס - השרת מחשב אותו מחדש מהקטלוג,
       * וזה מה שייגבה בפועל.
       */
      saveOrderDone({
        number: String(data.orderNumber),
        id: String(data.orderId ?? data.orderNumber),
        total: Number(data.total ?? total),
        message: data.message,
        lines,
        gift,
        code,
        shipping: customer.shipping,
        toName:
          customer.toRecipient && customer.shipping !== 'pickup'
            ? customer.toName.trim() || undefined
            : undefined,
      });

      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        /* אין אחסון */
      }

      if (data.payment) {
        window.location.href = data.payment;
        return;
      }
      // עמוד תודה אחד לשני המסלולים, ולא מסך שמצויר בתוך הטופס
      window.location.href = `/checkout/success?order=${encodeURIComponent(String(data.orderNumber))}`;
    } catch {
      setFailed('אין חיבור לשרת. בדקו את האינטרנט ונסו שוב.');
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return null;

  if (!lines.length) {
    return (
      <div className="card mx-auto max-w-xl p-10 text-center">
        <h1 className="display t-2">העגלה ריקה</h1>
        <p className="lede mt-4">אין מה לשלם עליו עדיין.</p>
        <Link href="/categories/necklaces" className="btn btn-solid mt-8 inline-block">לקטלוג</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-12 lg:grid-cols-[1.15fr_.85fr] lg:gap-20" noValidate>
      {/* ---------- הפרטים ---------- */}
      <div>
        <h1 className="display t-2">פרטי המשלוח</h1>
        <p className="mt-2" style={{ fontSize: 'var(--fs-2xs)', color: 'var(--ink-3)' }}>* שדה חובה</p>

        {cancelled && (
          <p
            role="status"
            className="mt-6 p-4"
            style={{
              fontSize: 'var(--fs-sm)',
              lineHeight: 1.7,
              borderRadius: 'var(--radius)',
              border: '1px solid var(--line-strong)',
              background: 'var(--surface-2)',
              color: 'var(--ink-2)',
            }}
          >
            התשלום לא הושלם. ההזמנה <span className="num">#{cancelled}</span> נשמרה, והפרטים כאן.
            אפשר לשלוח שוב{waHref ? ', או ' : '.'}
            {waHref && (
              <a
                href={`${waHref}?text=${encodeURIComponent(`שלום, לא הצלחתי להשלים את התשלום להזמנה #${cancelled}. אפשר קישור?`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="link-u"
                style={{ color: 'var(--accent-deep)' }}
              >
                לבקש קישור לתשלום בוואטסאפ
              </a>
            )}
          </p>
        )}

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {FIELDS.filter(
            (f) => customer.shipping !== 'pickup' || !['address', 'city', 'postcode'].includes(f.key),
          ).map(field)}
        </div>

        {/* המשלוח אחרי הפרטים, לא לפניהם.

            הוא ישב למעלה כי הבחירה קובעת אם שדות הכתובת נדרשים. עמית
            ביקש להפוך: קודם ממלאים מי ומאיפה, ואז איך מקבלים - הסדר
            שמכירים מכל חנות. מי שבוחר איסוף אחרי שמילא כתובת רואה את
            שדות הכתובת נסגרים, וזה בסדר - השרת ממילא מתעלם מהם */}
        <fieldset className="mt-10">
          <legend style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-2)' }}>איך לקבל</legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {SHIPPING.map((m) => {
              const on = customer.shipping === m.id;
              return (
                <label
                  key={m.id}
                  className="flex cursor-pointer items-start gap-3 p-4"
                  style={{
                    borderRadius: 'var(--radius)',
                    border: `1px solid ${on ? 'var(--accent)' : 'var(--line)'}`,
                    background: on ? 'color-mix(in oklab, var(--accent) 6%, var(--surface))' : 'var(--surface)',
                  }}
                >
                  <input
                    type="radio"
                    name="shipping"
                    checked={on}
                    onChange={() => set('shipping', m.id)}
                    style={{ marginTop: 3, accentColor: 'var(--accent)' }}
                  />
                  <span className="min-w-0">
                    <span className="flex items-baseline justify-between gap-2">
                      <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink)' }}>{m.label}</span>
                      <span className="num shrink-0" style={{ fontSize: 'var(--fs-sm)', color: m.price ? 'var(--ink-2)' : 'var(--accent-deep)' }}>
                        {m.price ? formatPrice(m.price) : 'חינם'}
                      </span>
                    </span>
                    <span className="mt-0.5 block" style={{ fontSize: 'var(--fs-2xs)', color: 'var(--ink-3)' }}>
                      {/* התאריך עצמו, כמו בעמוד המוצר. הטופס מצויר רק אחרי
                          ההידרציה, אז החישוב כאן הוא של הדפדפן */}
                      {m.id === 'delivery' ? `מבוטח · מגיע ${formatWindow(deliveryWindow())}` : m.note}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          {customer.shipping === 'pickup' && (
            <p className="mt-3" style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-2)', lineHeight: 1.7 }}>
              האיסוף מ{COMPANY.address}, בתיאום מראש.{' '}
              {/* קישור ולא "ניצור קשר": מי שבוחר איסוף רוצה לדעת מתי,
                  והמתנה להודעה שתגיע מתישהו היא בדיוק מה שמצנן קנייה */}
              {waHref && (
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-u"
                  style={{ color: 'var(--accent-deep)' }}
                >
                  לתיאום המועד בוואטסאפ
                </a>
              )}
            </p>
          )}
        </fieldset>


        {/* ---------- משלוח לנמען אחר ---------- */}
        {/* רק במשלוח. באיסוף עצמי אין חבילה שיוצאת לשום מקום, והצעה
            לשלוח למישהו אחר שם היא רק שאלה מבלבלת */}
        {customer.shipping !== 'pickup' && (
          <div className="mt-8">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={customer.toRecipient}
                onChange={(e) => set('toRecipient', e.target.checked)}
                style={{ marginTop: 3, accentColor: 'var(--accent)' }}
              />
              <span>
                <span className="block" style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink)' }}>
                  זו מתנה — לשלוח היישר לנמען
                </span>
                <span
                  className="mt-0.5 block"
                  style={{ fontSize: 'var(--fs-2xs)', color: 'var(--ink-3)', lineHeight: 1.6 }}
                >
                  החבילה תגיע לכתובת שלו, והחשבונית נשארת על שמך.
                </span>
              </span>
            </label>

            {customer.toRecipient && (
              <div
                className="mt-5 grid gap-5 p-5 sm:grid-cols-2 sm:p-6"
                style={{
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--line)',
                  background: 'var(--surface-2)',
                }}
              >
                {RECIPIENT_FIELDS.map(field)}
              </div>
            )}
          </div>
        )}

        {/* ---------- הקדשה ---------- */}
        {/*
          מה שהמקבל קורא ראשון הוא לא הנוסח - זה מי שלח. הקדשה קצרה
          עונה על "יבינו שזה ממני?", השאלה השנייה של מי שקונה מתנה
          מרחוק. נשלחת כהערת ההזמנה (customer_note) ונכתבת ביד בכרטיס.
          פתוחה כשזו מתנה; אחרת קישור אחד.
        */}
        {(gift || customer.toRecipient || noteOpen) ? (
          <label className="mt-8 block">
            <span className="block" style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-2)' }}>
              הקדשה לכרטיס שבקופסה <span style={{ color: 'var(--ink-3)' }}>(לא חובה)</span>
            </span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 500))}
              rows={3}
              maxLength={500}
              className="mt-1.5 w-full px-3.5 py-3"
              style={{
                fontSize: 'var(--fs-base)',
                lineHeight: 1.6,
                borderRadius: 'var(--radius)',
                border: '1px solid var(--line-strong)',
                background: 'var(--surface)',
                color: 'var(--ink)',
                resize: 'vertical',
              }}
            />
            <span className="mt-1 block" style={{ fontSize: 'var(--fs-2xs)', color: 'var(--ink-3)' }}>
              נכתבת ביד על כרטיס הנוסח שבקופסה. עד 500 תווים.
            </span>
          </label>
        ) : (
          <button
            type="button"
            onClick={() => setNoteOpen(true)}
            className="link-u mt-8 block"
            style={{ fontSize: 'var(--fs-sm)', color: 'var(--accent-deep)' }}
          >
            להוסיף הקדשה לכרטיס שבקופסה ←
          </button>
        )}

        {/* אישור התקנון: חובה, לא מסומן מראש, ועם קישור שנפתח בלשונית
            נפרדת כדי שהטופס לא יאבד. דיוור: רשות, ובנפרד - סעיף 30א
            דורש הסכמה מפורשת ונפרדת, לא כרוכה באישור התנאים */}
        <div className="mt-8 flex flex-col gap-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={customer.terms}
              onChange={(e) => set('terms', e.target.checked)}
              aria-invalid={errors.terms ? 'true' : undefined}
              style={{ marginTop: 3, accentColor: 'var(--accent)' }}
            />
            <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-2)', lineHeight: 1.65 }}>
              קראתי ואני מאשר/ת את{' '}
              <Link
                href="/legal/terms"
                target="_blank"
                className="link-u"
                style={{ color: 'var(--accent-deep)' }}
              >
                תנאי השימוש
              </Link>
              {' '}ואת{' '}
              <Link
                href="/legal/privacy"
                target="_blank"
                className="link-u"
                style={{ color: 'var(--accent-deep)' }}
              >
                מדיניות הפרטיות
              </Link>
              .
            </span>
          </label>
          {errors.terms && (
            <span style={{ fontSize: 'var(--fs-2xs)', color: 'var(--sale)', marginTop: -8 }}>
              {errors.terms}
            </span>
          )}

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={customer.marketing}
              onChange={(e) => set('marketing', e.target.checked)}
              style={{ marginTop: 3, accentColor: 'var(--accent)' }}
            />
            <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-2)', lineHeight: 1.65 }}>
              אשמח לקבל עדכונים על דגמים חדשים ומבצעים. אפשר להסיר בכל עת.
            </span>
          </label>
        </div>

        {failed && (
          <p
            role="alert"
            className="mt-7 p-4"
            style={{
              fontSize: 'var(--fs-sm)',
              lineHeight: 1.7,
              borderRadius: 'var(--radius)',
              border: '1px solid var(--sale)',
              background: 'color-mix(in oklab, var(--sale) 7%, transparent)',
              color: 'var(--sale-deep)',
            }}
          >
            {failed}
          </p>
        )}

        {/*
          הכפתור אומר מה קורה בלחיצה.

          "לתשלום" הבטיח דף תשלום, ובמסלול הידני הלחיצה שולחת הזמנה
          ומחכה לקישור בוואטסאפ - הפער הזה התגלה רק בעמוד התודה.
          המשפט שמעל מגיע מ-app/api/checkout/route.ts, אותו מסלול.
        */}
        <p className="mt-8" style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-2)', lineHeight: 1.7 }}>
          {paymentReady
            ? 'התשלום מתבצע בדף המאובטח של Grow. פרטי הכרטיס לא עוברים דרך האתר, ופריסה לתשלומים נבחרת שם.'
            : 'לא נגבה עכשיו דבר. אחרי שליחת ההזמנה נשלח לך בוואטסאפ, למספר שמילאת, קישור מאובטח לתשלום - בדרך כלל תוך שעה בשעות הפעילות.'}
        </p>
        <button
          type="submit"
          disabled={busy}
          className="btn btn-solid mt-3 w-full"
          style={{ ['--pad' as string]: '1.15rem 2rem', fontSize: 'var(--fs-base)', opacity: busy ? 0.6 : 1 }}
        >
          {busy ? 'רגע…' : paymentReady ? `המשך לתשלום המאובטח · ${formatPrice(total)}` : `שליחת ההזמנה · ${formatPrice(total)}`}
        </button>

        {/* הסימנים בצבעי המותגים, כאן בלבד: זה הרגע שבו שואלים
            "במה אפשר לשלם", והתשובה צריכה להיות מזוהה בעין */}
        <PaymentMarks tone="brand" size={32} className="mt-5 justify-center" />
        <p className="mt-3 text-center" style={{ fontSize: 'var(--fs-2xs)', color: 'var(--ink-3)' }}>
          הפרטים נשלחים מוצפנים. פרטי האשראי נמסרים ישירות לחברת הסליקה ואינם נשמרים אצלנו.
        </p>
      </div>

      {/* ---------- סיכום ---------- */}
      <aside className="lg:sticky lg:top-32 lg:self-start">
        <div className="card p-7">
          <p className="display" style={{ fontSize: 'var(--fs-lg)' }}>
            ההזמנה
          </p>

          <ul className="mt-5">
            {lines.map((l) => {
              const p = getProduct(l.slug);
              const b = getBlessing(l.blessing);
              if (!p) return null;
              return (
                <li
                  key={`${l.slug}-${l.blessing}`}
                  className="flex gap-3.5 py-4"
                  style={{ borderTop: '1px solid var(--line)' }}
                >
                  <span className="tile relative shrink-0" style={{ width: 54, height: 54, borderRadius: 'var(--radius)' }}>
                    <Image src={p.image} alt="" fill sizes="54px" className="object-contain p-1" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="display block" style={{ fontSize: 'var(--fs-sm)' }}>{p.name}</span>
                    <span className="block" style={{ fontSize: 'var(--fs-2xs)', color: b.accentInk }}>
                      {b.plain}
                    </span>
                    <span className="num block" style={{ fontSize: 'var(--fs-2xs)', color: 'var(--ink-3)' }}>
                      {l.qty} × {formatPrice(p.price)}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>

          <div style={{ borderTop: '1px solid var(--line)' }} className="pt-4">
            {totals.discount > 0 && (
              <div className="mb-2 flex justify-between" style={{ fontSize: 'var(--fs-sm)' }}>
                <span style={{ color: 'var(--sale)' }}>{PROMO.pill} · {PROMO.code}</span>
                <span className="num" style={{ color: 'var(--sale)' }}>−{formatPrice(totals.discount)}</span>
              </div>
            )}
            {giftFee > 0 && (
              <div className="mb-2 flex justify-between" style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-2)' }}>
                <span>{GIFT_BOX.title}</span>
                <span className="num">{formatPrice(giftFee)}</span>
              </div>
            )}
            <div className="mb-3 flex justify-between" style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-2)' }}>
              <span>{ship.label}</span>
              <span className={shipCost ? 'num' : undefined} style={{ color: shipCost ? undefined : 'var(--accent-deep)' }}>
                {shipCost ? formatPrice(shipCost) : 'חינם'}
              </span>
            </div>
            <div
              className="flex items-baseline justify-between pt-3"
              style={{ borderTop: '1px solid var(--line)' }}
            >
              <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-2)' }}>סה״כ</span>
              <span className="num display" style={{ fontSize: 'var(--fs-xl)' }}>{formatPrice(total)}</span>
            </div>
          </div>
        </div>

        <Link href="/" className="link-u mt-5 inline-block" style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-3)' }}>
          ← חזרה לחנות
        </Link>
      </aside>
    </form>
  );
}
