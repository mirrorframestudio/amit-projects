'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

/**
 * תפריט הנגישות.
 *
 * ------------------------------------------------------------------
 * למה זה מוגדר כ־data על אלמנט ה־html ולא כ־state בריאקט.
 *
 * ההעדפות האלה חייבות לחול על כל האתר בבת אחת - על הכותרת, על
 * הפוטר, על העגלה ועל הפופאפ - וכולם עצמאיים זה מזה. תכונה אחת על
 * השורש עושה את זה בשורת CSS אחת, ומה שחשוב יותר: היא מוחלת לפני
 * הציור הראשון בטעינה הבאה, ולכן מי שהגדיל את הגופן לא רואה הבהוב
 * של הגודל הקטן בכל מעבר עמוד.
 * ------------------------------------------------------------------
 *
 * זה אינו תחליף לנגישות של האתר עצמו - הניגודיות, סדר הכותרות,
 * שמות הכפתורים ולכידת המיקוד נבנו בעמודים עצמם. תפריט כזה שמותקן
 * על אתר לא נגיש רק מסתיר את הבעיה.
 */
type Prefs = {
  font: 0 | 1 | 2 | 3;
  contrast: boolean;
  links: boolean;
  motion: boolean;
  readable: boolean;
};

const EMPTY: Prefs = { font: 0, contrast: false, links: false, motion: false, readable: false };
const KEY = 'mikra:a11y';

function apply(p: Prefs) {
  const el = document.documentElement;
  // הסרה ולא השמת מחרוזת ריקה: `dataset.x = ''` משאיר את התכונה
  // על האלמנט, ובורר כמו `html[data-a11y-contrast]` היה ממשיך
  // להתאים גם כשההעדפה כבויה
  const set = (k: string, v: string | null) => {
    if (v) el.setAttribute(k, v);
    else el.removeAttribute(k);
  };
  set('data-a11y-font', p.font ? String(p.font) : null);
  set('data-a11y-contrast', p.contrast ? 'on' : null);
  set('data-a11y-links', p.links ? 'on' : null);
  set('data-a11y-motion', p.motion ? 'off' : null);
  set('data-a11y-readable', p.readable ? 'on' : null);
}

export default function A11yWidget() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(EMPTY);
  const [ready, setReady] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setPrefs({ ...EMPTY, ...(JSON.parse(raw) as Partial<Prefs>) });
    } catch {
      /* אחסון חסום. האתר עובד בהעדפות ברירת המחדל */
    }
    setReady(true);
  }, []);

  /**
   * ההחלה והשמירה תלויות במצב, ולא בפעולה שגרמה לו.
   *
   * קודם הן ישבו בתוך המטפל בלחיצה, וזה היה באג אמיתי: שתי לחיצות
   * ברצף מהיר קראו את אותו `prefs` מהרנדר הקודם, והשנייה דרסה את
   * הראשונה. מדדתי שלוש לחיצות רצופות - שתי הגדרות נעלמו.
   */
  useEffect(() => {
    if (!ready) return;
    apply(prefs);
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs));
    } catch {
      /* לא קריטי */
    }
  }, [prefs, ready]);

  /** עדכון על בסיס המצב העדכני, לא על בסיס מה שהרנדר הזה ראה */
  const update = useCallback((patch: (cur: Prefs) => Prefs) => setPrefs(patch), []);

  const close = useCallback(() => {
    setOpen(false);
    launcher.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!panel.current?.contains(t) && !launcher.current?.contains(t)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open, close]);

  const toggle = (k: 'contrast' | 'links' | 'motion' | 'readable') => (
    <button
      type="button"
      role="switch"
      aria-checked={prefs[k]}
      onClick={() => update((cur) => ({ ...cur, [k]: !cur[k] }))}
      className="a11y-row"
    >
      <span>{LABELS[k]}</span>
      <span className="a11y-pill" aria-hidden>
        {prefs[k] ? 'פועל' : 'כבוי'}
      </span>
    </button>
  );

  return (
    <>
      <button
        ref={launcher}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="a11y-panel"
        aria-label="תפריט נגישות"
        className="a11y-launcher"
      >
        {/* סמל הנגישות הבינלאומי */}
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden focusable="false">
          <circle cx="12" cy="4.2" r="1.9" fill="currentColor" />
          <path
            d="M4.4 7.6c2.4.8 4.9 1.2 7.6 1.2s5.2-.4 7.6-1.2M12 8.8v5.4m0 0 -2.6 6.4M12 14.2l2.6 6.4"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </button>

      {open && (
        <div ref={panel} id="a11y-panel" role="dialog" aria-label="הגדרות נגישות" className="a11y-panel">
          <p className="eyebrow" style={{ color: 'var(--accent)' }}>
            נגישות
          </p>

          <div className="mt-4">
            <p style={{ fontSize: 'var(--fs-2xs)', color: 'var(--ink-2)' }}>גודל הטקסט</p>
            <div className="a11y-steps mt-2" role="group" aria-label="גודל הטקסט">
              {([0, 1, 2, 3] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => update((cur) => ({ ...cur, font: n }))}
                  aria-pressed={prefs.font === n}
                  className="a11y-step"
                  data-on={prefs.font === n ? 'true' : undefined}
                >
                  {n === 0 ? 'רגיל' : `+${n}`}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-col">
            {toggle('contrast')}
            {toggle('links')}
            {toggle('readable')}
            {toggle('motion')}
          </div>

          <button
            type="button"
            onClick={() => update(() => EMPTY)}
            className="a11y-row"
            style={{ color: 'var(--ink-3)' }}
          >
            <span>איפוס ההגדרות</span>
          </button>

          <Link href="/legal/accessibility" className="a11y-row" style={{ color: 'var(--accent)' }}>
            הצהרת הנגישות
          </Link>
        </div>
      )}
    </>
  );
}

const LABELS = {
  contrast: 'ניגודיות גבוהה',
  links: 'הדגשת קישורים',
  readable: 'גופן קריא',
  motion: 'עצירת אנימציות',
} as const;
