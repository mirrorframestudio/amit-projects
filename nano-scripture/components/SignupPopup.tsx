'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useCart } from '@/lib/cart';
import { PROMO, promoOn } from '@/lib/promo';
import { validateLead, EMPTY_LEAD, type Lead, type LeadErrors } from '@/lib/subscribe';
import { trackLead } from '@/lib/analytics';

const SEEN = 'mikra:club';
const DELAY_MS = 18_000;
const SCROLL_TRIGGER = 0.35;

/**
 * הצטרפות למועדון, בתמורה לקוד ההנחה.
 *
 * ------------------------------------------------------------------
 * הפופאפ נפתח פעם אחת בחיי המבקר, ולא פעם אחת בכל ביקור.
 *
 * localStorage שורד סגירת לשונית, ולכן מי שסירב לא ייתקל בזה שוב.
 * פופאפ שחוזר הוא הסיבה מספר אחת לכך שמבקרים חוסמים אותם, ומאז
 * 2017 גוגל גם מוריד בדירוג עמודי מובייל שחוסמים תוכן בכניסה - ולכן
 * הוא גם ממתין 18 שניות או שליש גלילה, ולא קופץ מיד.
 *
 * הוא גם לא נפתח בצ'קאאוט. לחסום טופס תשלום בפופאפ הנחה זה לשלם
 * בהמרה בשביל ליד.
 * ------------------------------------------------------------------
 */
export default function SignupPopup() {
  const pathname = usePathname();
  // מגירת העגלה יושבת על 120 ו-121, בדיוק כמו הפופאפ. אם שתיהן
  // נפתחות יחד, העגלה מצוירת מעל הפופאפ בזמן שהפופאפ לוכד את המיקוד
  // ונועל את הגלילה - והמבקר תקוע מול עגלה שאי אפשר לצאת ממנה
  const cartOpen = useCart((s) => s.open);
  const [open, setOpen] = useState(false);
  const [lead, setLead] = useState<Lead>(EMPTY_LEAD);
  const [errors, setErrors] = useState<LeadErrors>({});
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [failed, setFailed] = useState('');
  const [copied, setCopied] = useState(false);

  const panel = useRef<HTMLDivElement>(null);
  const firstField = useRef<HTMLInputElement>(null);
  // לאן להחזיר את המיקוד בסגירה. בלי זה הפוקוס קופץ לתחילת העמוד
  const opener = useRef<Element | null>(null);

  const dismiss = useCallback(() => {
    setOpen(false);
    try {
      localStorage.setItem(SEEN, '1');
    } catch {
      /* מצב פרטי, או אחסון חסום. אין מה לעשות ואין מה להפיל */
    }
    if (opener.current instanceof HTMLElement) opener.current.focus();
  }, []);

  /* ---------- מתי להיפתח ---------- */
  useEffect(() => {
    if (!promoOn || pathname?.startsWith('/checkout')) return;
    try {
      if (localStorage.getItem(SEEN)) return;
    } catch {
      return;
    }

    let done = false;
    const fire = () => {
      if (done) return;
      // מי שכבר בעגלה נמצא צעד לפני התשלום. פופאפ הנחה שם קוטע
      // כוונת קנייה בשביל ליד, וזו עסקה גרועה
      if (useCart.getState().open) return;
      done = true;
      opener.current = document.activeElement;
      setOpen(true);
    };
    const timer = window.setTimeout(fire, DELAY_MS);
    const onScroll = () => {
      const max = document.body.scrollHeight - window.innerHeight;
      if (max > 0 && window.scrollY / max > SCROLL_TRIGGER) fire();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
    };
  }, [pathname]);

  // אם העגלה נפתחה בזמן שהפופאפ מוצג, הפופאפ מתקפל
  useEffect(() => {
    if (cartOpen && open) setOpen(false);
  }, [cartOpen, open]);

  /* ---------- מקלדת ולכידת מיקוד ---------- */
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    firstField.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dismiss();
        return;
      }
      if (e.key !== 'Tab' || !panel.current) return;
      // חלון מודאלי חייב ללכוד את הטאב. בלעדי זה המיקוד בורח לעמוד
      // שמאחור, והמשתמש בטאב לבדו לא יכול לא למלא ולא לסגור
      const items = panel.current.querySelectorAll<HTMLElement>(
        'button, input, a[href], [tabindex]:not([tabindex="-1"])',
      );
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [open, dismiss, code]);

  if (!open) return null;

  const set = <K extends keyof Lead>(k: K, v: Lead[K]) => {
    setLead((c) => ({ ...c, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
    setFailed('');
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const found = validateLead(lead);
    if (Object.keys(found).length) {
      setErrors(found);
      return;
    }
    setBusy(true);
    setFailed('');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.fields) setErrors(data.fields);
        setFailed(data.error ?? 'ההרשמה נכשלה');
        return;
      }
      setCode(data.code);
      trackLead();
      try {
        localStorage.setItem(SEEN, '1');
      } catch {
        /* לא קריטי */
      }
    } catch {
      setFailed('אין חיבור לשרת. נסו שוב.');
    } finally {
      setBusy(false);
    }
  }

  const field = (
    k: 'name' | 'phone' | 'email',
    label: string,
    type: string,
    autoComplete: string,
    ref?: React.Ref<HTMLInputElement>,
  ) => (
    <label className="block">
      <span className="block" style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-2)' }}>
        {label}
      </span>
      <input
        ref={ref}
        type={type}
        value={lead[k]}
        onChange={(e) => set(k, e.target.value)}
        autoComplete={autoComplete}
        required
        aria-invalid={errors[k] ? 'true' : undefined}
        aria-describedby={errors[k] ? `club-err-${k}` : undefined}
        className="mt-1.5 w-full px-3.5"
        style={{
          height: 46,
          fontSize: 'var(--fs-base)',
          borderRadius: 'var(--radius)',
          border: `1px solid ${errors[k] ? 'var(--sale)' : 'var(--line-strong)'}`,
          background: 'var(--surface)',
          color: 'var(--ink)',
        }}
      />
      {errors[k] && (
        <span
          id={`club-err-${k}`}
          className="mt-1 block"
          style={{ fontSize: 'var(--fs-2xs)', color: 'var(--sale)' }}
        >
          {errors[k]}
        </span>
      )}
    </label>
  );

  return (
    <div
      className="fixed inset-0 flex items-end justify-center sm:items-center"
      style={{ zIndex: 118, background: 'rgb(20 18 12 / .52)' }}
      onClick={(e) => e.target === e.currentTarget && dismiss()}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="club-title"
        className="w-full sm:max-w-[440px]"
        style={{
          background: 'var(--bg)',
          borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
          border: '1px solid var(--line)',
          padding: '1.75rem 1.5rem 1.5rem',
          maxHeight: '92vh',
          overflowY: 'auto',
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <p className="eyebrow" style={{ color: 'var(--accent)' }}>
            מועדון מִקְרָא
          </p>
          <button
            type="button"
            onClick={dismiss}
            aria-label="סגירה"
            style={{
              width: 32,
              height: 32,
              flexShrink: 0,
              fontSize: 'var(--fs-lg)',
              lineHeight: 1,
              color: 'var(--ink-3)',
            }}
          >
            ×
          </button>
        </div>

        {code ? (
          <>
            <h2 id="club-title" className="display mt-3" style={{ fontSize: 'var(--ds-3)' }}>
              הקוד שלך מוכן
            </h2>
            <p className="mt-3" style={{ fontSize: 'var(--fs-base)', color: 'var(--ink-2)' }}>
              מזינים אותו בעגלה. {PROMO.percent}% על סכום הפריטים, בהזמנה אחת ללקוח.
            </p>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(code).then(
                  () => setCopied(true),
                  () => setCopied(false),
                );
              }}
              className="mt-5 w-full"
              style={{
                border: '1px dashed var(--accent)',
                borderRadius: 'var(--radius)',
                padding: '.9rem',
                fontSize: 'var(--fs-lg)',
                letterSpacing: '.18em',
                color: 'var(--accent)',
                background: 'var(--surface)',
              }}
            >
              {code}
            </button>
            <p
              className="mt-2 text-center"
              style={{ fontSize: 'var(--fs-2xs)', color: 'var(--ink-3)' }}
              aria-live="polite"
            >
              {copied ? 'הועתק' : 'לחיצה מעתיקה'}
            </p>
            <button type="button" onClick={dismiss} className="btn btn-solid mt-5 w-full">
              להמשך הגלישה
            </button>
          </>
        ) : (
          <form onSubmit={submit} noValidate>
            <h2 id="club-title" className="display mt-3" style={{ fontSize: 'var(--ds-3)' }}>
              {PROMO.percent}% על ההזמנה הראשונה
            </h2>
            <p className="mt-3" style={{ fontSize: 'var(--fs-base)', color: 'var(--ink-2)' }}>
              משאירים שם, טלפון ודוא״ל - והקוד נפתח כאן על המסך.
            </p>

            <div className="mt-6 flex flex-col gap-4">
              {field('name', 'שם מלא', 'text', 'name', firstField)}
              {field('phone', 'טלפון', 'tel', 'tel')}
              {field('email', 'דוא״ל', 'email', 'email')}
            </div>

            {/* הסכמה מפורשת, לא מסומנת מראש. סעיף 30א לחוק התקשורת */}
            <label className="mt-5 flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={lead.consent}
                onChange={(e) => set('consent', e.target.checked)}
                aria-invalid={errors.consent ? 'true' : undefined}
                style={{ marginTop: 3 }}
              />
              <span style={{ fontSize: 'var(--fs-2xs)', color: 'var(--ink-2)', lineHeight: 1.6 }}>
                אני מאשר/ת קבלת דיוור פרסומי בדוא״ל ובמסרון. אפשר להסיר בכל עת.
                {errors.consent && (
                  <span className="block" style={{ color: 'var(--sale)' }}>
                    {errors.consent}
                  </span>
                )}
              </span>
            </label>

            {failed && (
              <p className="mt-4" style={{ fontSize: 'var(--fs-xs)', color: 'var(--sale)' }} role="alert">
                {failed}
              </p>
            )}

            <button type="submit" disabled={busy} className="btn btn-solid mt-5 w-full">
              {busy ? 'רגע…' : `קבלת הקוד`}
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="mt-3 w-full"
              style={{ fontSize: 'var(--fs-2xs)', color: 'var(--ink-3)', padding: '.5rem' }}
            >
              לא תודה
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
