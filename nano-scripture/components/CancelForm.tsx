'use client';

import { useState } from 'react';
import { COMPANY, waHref } from '@/lib/company';

/**
 * טופס ביטול עסקה - החלק שסעיף 14ט דורש שיהיה "באמצעות האתר".
 *
 * ארבעה שדות: שם, מספר זהות ומספר הזמנה (הפרטים שהחוק מונה), והטלפון
 * או הדוא"ל של ההזמנה - הזיהוי שמונע ממי שמנחש מספר רץ לבטל הזמנה של
 * מישהו אחר. האסמכתא מוצגת על המסך עם מועד הקבלה.
 */
type Fields = { name: string; idNumber: string; orderNumber: string; contact: string };
type Done = { orderNumber: string; stamp: string; shipped: boolean };

const LABELS: { key: keyof Fields; label: string; hint?: string; inputMode?: 'numeric' | 'text' }[] = [
  { key: 'name', label: 'שם מלא' },
  { key: 'idNumber', label: 'מספר זהות', hint: 'נדרש לפי חוק הגנת הצרכן, סעיף 14ט(ג)', inputMode: 'numeric' },
  { key: 'orderNumber', label: 'מספר ההזמנה', hint: 'מופיע בעמוד התודה ובהודעת הוואטסאפ', inputMode: 'numeric' },
  { key: 'contact', label: 'הטלפון או הדוא״ל שאיתם בוצעה ההזמנה' },
];

export default function CancelForm() {
  const [v, setV] = useState<Fields>({ name: '', idNumber: '', orderNumber: '', contact: '' });
  const [errors, setErrors] = useState<Partial<Fields>>({});
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFailed(null);
    try {
      const res = await fetch('/api/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(v),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors(data.fields ?? {});
        setFailed(data.error ?? 'משהו השתבש');
        return;
      }
      setDone(data);
    } catch {
      setFailed('אין חיבור לשרת. נסו שוב, או בטלו בוואטסאפ.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div
        role="status"
        className="mt-10 p-6"
        style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--line-strong)', background: 'var(--surface-2)' }}
      >
        <p className="display" style={{ fontSize: 'var(--fs-lg)' }}>הודעת הביטול התקבלה</p>
        <p className="mt-3" style={{ fontSize: 'var(--fs-base)', lineHeight: 1.8, color: 'var(--ink-2)' }}>
          הזמנה <span className="num">#{done.orderNumber}</span> · התקבל ב-<span className="num">{done.stamp}</span>.
          שמרו את המסך הזה כאסמכתא.
        </p>
        <p className="mt-3" style={{ fontSize: 'var(--fs-sm)', lineHeight: 1.8, color: 'var(--ink-2)' }}>
          {done.shipped
            ? 'החבילה כבר יצאה, ולכן נתאם איתכם את ההחזרה. ההחזר הכספי מבוצע בתוך 14 ימים מקבלת הפריט אצלנו.'
            : 'ההזמנה בוטלה. אם כבר שולם, ההחזר הכספי מבוצע לאמצעי התשלום המקורי בתוך 14 ימים.'}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="mt-10">
      <p className="display" style={{ fontSize: 'var(--fs-lg)' }}>ביטול דרך האתר</p>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        {LABELS.map((f) => (
          <label key={f.key} className={f.key === 'contact' ? 'sm:col-span-2' : ''}>
            <span className="block" style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-2)' }}>
              {f.label} <span aria-hidden style={{ color: 'var(--ink-3)' }}>*</span>
            </span>
            <input
              type="text"
              inputMode={f.inputMode}
              required
              value={v[f.key]}
              onChange={(e) => setV({ ...v, [f.key]: e.target.value })}
              aria-invalid={errors[f.key] ? 'true' : undefined}
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
            <span className="mt-1 block" style={{ fontSize: 'var(--fs-2xs)', color: errors[f.key] ? 'var(--sale)' : 'var(--ink-3)' }}>
              {errors[f.key] ?? f.hint ?? ''}
            </span>
          </label>
        ))}
      </div>

      {failed && (
        <p
          role="alert"
          className="mt-5 p-4"
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

      <button
        type="submit"
        disabled={busy}
        className="btn btn-solid mt-6"
        style={{ ['--pad' as string]: '1rem 2.4rem', opacity: busy ? 0.6 : 1 }}
      >
        {busy ? 'רגע…' : 'שליחת הודעת ביטול'}
      </button>

      <p className="mt-6" style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-3)', lineHeight: 1.8 }}>
        אפשר גם{' '}
        {waHref && (
          <>
            <a href={waHref} target="_blank" rel="noopener noreferrer" className="link-u">בוואטסאפ</a>
            {', '}
          </>
        )}
        בדוא״ל <a href={`mailto:${COMPANY.email}?subject=${encodeURIComponent('ביטול עסקה')}`} className="link-u">{COMPANY.email}</a>
        {COMPANY.phone ? `, בטלפון ${COMPANY.phone}` : ''} או בדואר רשום ל{COMPANY.address}. בכל ערוץ מציינים שם, מספר זהות ומספר הזמנה.
      </p>
    </form>
  );
}
