'use client';

import Link from 'next/link';
import { useState } from 'react';
import Logo from './Logo';
import { BRAND } from '@/lib/brand';
import { COMPANY, telHref, waHref } from '@/lib/company';
import { CATEGORIES, ACTIVE_CATEGORIES } from '@/lib/catalog';
import { BLESSINGS } from '@/lib/blessings';

const CONTACT = { fontSize: 'var(--fs-sm)', color: 'var(--ink-2)' } as const;

export default function Footer() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'sent' | 'failed'>('idle');

  /**
   * ההרשמה אמיתית. עד עכשיו הכפתור הציג "נרשמת" בלי לשלוח דבר -
   * כתובת שהוקלדה כאן נעלמה. עכשיו היא נכנסת לרשימת הלקוחות בווקומרס
   * דרך אותו נתיב שמשרת את הפופאפ, במסלול של דוא"ל בלבד ובלי קוד
   * הנחה - כאן לא הובטח אחד.
   */
  async function subscribe(e: React.FormEvent) {
    e.preventDefault();
    if (state === 'busy') return;
    setState('busy');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'footer', consent: true }),
      });
      setState(res.ok ? 'sent' : 'failed');
    } catch {
      setState('failed');
    }
  }

  return (
    <footer className="hairline relative mt-32 pt-24 pb-10">
      {/* כאן ישב שם המותג בגודל 22vw ובשקיפות 6% כסימן מים - הקישוט
          שכל תבנית שמה בפוטר. הפוטר עומד על מה שכתוב בו */}
      <div className="shell relative">
        <div className="grid gap-8 md:gap-14 md:grid-cols-[1.4fr_1fr_1fr_1.3fr]">
          <div>
            <Logo size={34} />
            <p className="lede mt-6 max-w-xs" style={{ fontSize: 'var(--fs-base)' }}>
              {BRAND.tagline}
            </p>
            {/* יצירת קשר. עד עכשיו לא הייתה באתר אף דרך להשיג בן אדם -
                לא טלפון, לא וואטסאפ, לא כתובת - וזו גם חובה לפי חוק
                הגנת הצרכן וגם מה שמותג לא מוכר הכי נמדד עליו */}
            <div className="mt-7 flex flex-col gap-2">
              {telHref && (
                <a href={telHref} className="tap-row link-u" style={CONTACT}>
                  <span className="ltr num">{COMPANY.phone}</span>
                </a>
              )}
              {waHref && (
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tap-row link-u"
                  style={CONTACT}
                >
                  וואטסאפ
                </a>
              )}
              <a href={`mailto:${COMPANY.email}`} className="tap-row link-u ltr" style={CONTACT}>
                {COMPANY.email}
              </a>
              <span style={{ ...CONTACT, color: 'var(--ink-3)' }}>{COMPANY.address}</span>
            </div>

            {/* אין כאן קישורים לרשתות. היו שלושה - אינסטגרם, טיקטוק,
                פינטרסט - וכולם הובילו ל-#. לחנות אין עדיין חשבון באף אחת,
                וקישור מת לרשת חברתית אומר לקונה בדיוק את זה */}
          </div>

          <nav className="grid grid-cols-2 gap-x-4 gap-y-2.5 md:flex md:flex-col md:gap-3">
            <p className="eyebrow col-span-2 mb-0 md:mb-2">הקטלוג</p>
            {ACTIVE_CATEGORIES.map((id) => (
              <Link key={id} href={`/categories/${id}`} className="tap-row link-u" style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-2)' }}>
                {CATEGORIES[id].title}
              </Link>
            ))}
            <Link href="/blessings" className="tap-row link-u" style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-2)' }}>
              כל הברכות
            </Link>
            <Link href="/guides" className="tap-row link-u" style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-2)' }}>
              מדריכי מתנה
            </Link>
          </nav>

          <nav className="grid grid-cols-2 gap-x-4 gap-y-2.5 md:flex md:flex-col md:gap-3">
            <p className="eyebrow col-span-2 mb-0 md:mb-2">הברכות</p>
            {BLESSINGS.map((b) => [`/blessings/${b.id}`, b.plain]).map(([href, label]) => (
              <Link key={label} href={href} className="tap-row link-u" style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-2)' }}>
                {label}
              </Link>
            ))}
          </nav>

          <div>
            <p className="eyebrow mb-3">מכתב הבית</p>
            <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-2)' }}>
              דגמים חדשים, סדרות מוגבלות, ומעט מאוד דואר.
            </p>
            <form className="mt-5 flex" onSubmit={subscribe}>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (state !== 'busy') setState('idle');
                }}
                disabled={state === 'sent'}
                placeholder="כתובת אימייל"
                aria-label="כתובת אימייל"
                style={{
                  flex: 1,
                  background: 'transparent',
                  borderBottom: '1px solid var(--line-strong)',
                  padding: '.55rem .2rem',
                  fontSize: 'var(--fs-sm)',
                  color: 'var(--ink)',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                className="link-u px-3"
                disabled={state === 'busy' || state === 'sent'}
                style={{ fontSize: 'var(--fs-sm)', color: 'var(--accent)' }}
              >
                {state === 'sent' ? 'נרשמת' : state === 'busy' ? 'רגע…' : 'הרשמה'}
              </button>
            </form>
            {/* סעיף 30א לחוק התקשורת: ההסכמה לדיוור נאמרת במפורש ליד הכפתור */}
            <p
              className="mt-2"
              aria-live="polite"
              style={{ fontSize: 'var(--fs-2xs)', color: state === 'failed' ? 'var(--sale)' : 'var(--ink-3)' }}
            >
              {state === 'failed'
                ? 'לא הצלחנו לרשום. נסו שוב.'
                : state === 'sent'
                  ? 'הכתובת נשמרה.'
                  : 'בלחיצה על הרשמה מאשרים קבלת דיוור מהחנות.'}
            </p>
          </div>
        </div>

        <hr className="rule mt-16" />

        <div
          className="flex flex-col gap-3 pt-6 md:flex-row md:items-center md:justify-between"
          style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-3)' }}
        >
          <p>
            © {new Date().getFullYear()} {BRAND.name} · {BRAND.nameLatin} - כל הזכויות שמורות
          </p>
          <div className="flex gap-6">
            <Link href="/legal/terms" className="tap-row link-u">תנאי שימוש</Link>
            <Link href="/legal/privacy" className="tap-row link-u">פרטיות</Link>
            <Link href="/legal/accessibility" className="tap-row link-u">נגישות</Link>
            <Link href="/legal/shipping-returns" className="tap-row link-u">משלוחים והחזרות</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
