'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Logo from './Logo';
import PromoBar from './PromoBar';
import { useCart, cartTotals } from '@/lib/cart';
import { CATEGORIES, ACTIVE_CATEGORIES } from '@/lib/catalog';
import { BLESSINGS } from '@/lib/blessings';

// הניווט נגזר מהקטגוריות הפעילות — קטגוריה ריקה נעלמת מכאן מאליה
const CAT_NAV = ACTIVE_CATEGORIES.map((id) => ({
  href: `/categories/${id}`,
  label: CATEGORIES[id].title,
}));
const PAGE_NAV = [
  { href: '/blessings', label: 'הברכות' },
  { href: '/craft', label: 'הטכנולוגיה' },
];
const NAV = [...CAT_NAV, ...PAGE_NAV];

/**
 * קישור בניווט העליון.
 *
 * האותיות היו קטנות ואפורות, והעמוד הנוכחי נצבע אך לא סומן. עכשיו
 * הן בגודל טקסט, במשקל בינוני, והעמוד הנוכחי נושא קו בצבע המבטא -
 * כך שרואים איפה נמצאים גם בלי לקרוא.
 */
function navLink(n: { href: string; label: string }, active: boolean) {
  return (
    <Link
      key={n.href}
      href={n.href}
      aria-current={active ? 'page' : undefined}
      className="relative py-1"
      style={{
        fontSize: 'var(--fs-base)',
        fontWeight: 500,
        letterSpacing: '.04em',
        color: active ? 'var(--ink)' : 'var(--ink-2)',
        transition: 'color .25s var(--ease)',
      }}
    >
      {n.label}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          insetInline: 0,
          bottom: -2,
          height: 1.5,
          background: 'var(--accent)',
          transform: active ? 'scaleX(1)' : 'scaleX(0)',
          transformOrigin: 'center',
          transition: 'transform .3s var(--ease)',
        }}
      />
    </Link>
  );
}

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const pathname = usePathname();
  const lines = useCart((s) => s.lines);
  const setOpen = useCart((s) => s.setOpen);
  const { items } = cartTotals(lines);

  useEffect(() => setMenu(false), [pathname]);

  // כשהמגירה פתוחה, גלילה על העמוד שמאחוריה מבלבלת. ו-Escape הוא
  // הדרך שבה אנשים סוגרים שכבות, גם כשאיש לא אמר להם
  useEffect(() => {
    if (!menu) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false);
    window.addEventListener('keydown', esc);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', esc);
    };
  }, [menu]);

  // הכותרת נשארת גלויה תמיד. היא רק מתכווצת בגלילה, כדי לפנות גובה
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      {/* רקע אטום ולא זכוכית: ההירו מפוצל לבהיר וכהה, וכל שקיפות
          גורמת לפאנל הכהה להציץ מבעד לכותרת ולצבוע את חציה באפור. */}
      <header
        style={{
          position: 'fixed',
          insetInline: 0,
          top: 0,
          zIndex: 90,
          background: 'var(--bg)',
          borderBottom: '1px solid var(--line)',
          transition: 'background-color .4s, border-color .4s',
        }}
      >
        <PromoBar />

        {/*
          לוגו במרכז, וניווט משני צדדיו.

          קודם הלוגו ישב בקצה הימני, הניווט צף באמצע-שמאל באותיות קטנות,
          והעגלה בקצה השמאלי - שלושה דברים בשלושה משקלים, בלי ציר. זה
          מה שנקרא "לא מסודר".

          עכשיו יש ציר: הלוגו באמצע, הקטגוריות מימינו, עמודי התוכן
          והעגלה משמאלו. במובייל אותה רשת - המבורגר, לוגו, עגלה.
        */}
        <div
          className="shell grid grid-cols-[auto_1fr_auto] items-center lg:grid-cols-[1fr_auto_1fr]"
          style={{ height: scrolled ? 68 : 96, transition: 'height .45s var(--ease)' }}
        >
          {/* ימין: המבורגר במובייל, קטגוריות בדסקטופ. בעברית האגודל
              נח בצד ימין, ושם צריך לשבת מה שפותחים הכי הרבה */}
          <div className="flex items-center justify-start">
            {/* העטיפה היא זו שנעלמת בדסקטופ, ולא הכפתור.
                `.tap` קובע display: inline-grid ודורס את lg:hidden -
                שני כללי display על אותו אלמנט, והמאוחר מנצח. על עטיפה
                בלי .tap אין התנגשות. זו הסיבה שההמבורגר הופיע ליד
                ניווט מלא במסך רחב */}
            <span className="lg:hidden">
              <button
                className="tap"
                onClick={() => setMenu((m) => !m)}
                aria-label={menu ? 'סגירת התפריט' : 'תפריט'}
                aria-expanded={menu}
                style={{ color: 'var(--ink)', marginInlineStart: -10 }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d={menu ? 'M6 6l12 12M18 6L6 18' : 'M4 8h16M4 16h16'}
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </span>
            <nav className="hidden items-center gap-9 lg:flex" aria-label="קטגוריות">
              {CAT_NAV.map((n) => navLink(n, pathname === n.href))}
            </nav>
          </div>

          {/* מרכז */}
          <Link href="/" aria-label="דף הבית" className="justify-self-center">
            <Logo size={scrolled ? 26 : 34} />
          </Link>

          {/* שמאל: עמודי התוכן, ואז העגלה בקצה */}
          <div className="flex items-center justify-end gap-9">
            <nav className="hidden items-center gap-9 lg:flex" aria-label="עמודים">
              {PAGE_NAV.map((n) => navLink(n, pathname === n.href))}
            </nav>

            <button
              onClick={() => setOpen(true)}
              className="tap relative flex items-center gap-2"
              style={{ color: 'var(--ink-2)', fontSize: 'var(--fs-sm)' }}
              aria-label={`עגלת קניות, ${items} פריטים`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M6 8h12l-1 12H7L6 8Zm3 0V6a3 3 0 0 1 6 0v2"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="num">{items}</span>
              {items > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    insetInlineStart: -6,
                    top: -4,
                    width: 6,
                    height: 6,
                    borderRadius: 99,
                    background: 'var(--accent)',
                  }}
                />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ---------- תפריט מובייל ---------- */}

      {/* וילון. סוגר בלחיצה, ומונע מהעמוד שמאחור להיראות לחיץ */}
      <button
        aria-hidden={!menu}
        tabIndex={-1}
        onClick={() => setMenu(false)}
        className="lg:hidden"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 88,
          background: 'rgb(22 21 15 / .38)',
          opacity: menu ? 1 : 0,
          pointerEvents: menu ? 'auto' : 'none',
          transition: 'opacity .4s var(--ease)',
        }}
      />

      {/* המגירה נכנסת מימין - מאותו צד שבו יושב הכפתור שפתח אותה.
          מגירה שנפתחת מלמעלה או מהצד הנגדי מנתקת את התנועה מהמגע */}
      <div
        id="mobile-menu"
        className="lg:hidden"
        style={{
          position: 'fixed',
          insetBlock: 0,
          insetInlineStart: 0,
          width: 'min(86vw, 360px)',
          zIndex: 90,
          background: 'var(--bg)',
          borderInlineEnd: '1px solid var(--line)',
          boxShadow: menu ? '0 0 60px -12px rgb(60 45 15 / .45)' : 'none',
          transform: menu ? 'none' : 'translateX(102%)',
          transition: 'transform .52s var(--ease)',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
        }}
      >
        <div className="flex items-center justify-between px-7 pb-5 pt-6" style={{ borderBottom: '1px solid var(--line)' }}>
          <Logo size={26} />
          <button onClick={() => setMenu(false)} aria-label="סגירה" className="tap" style={{ color: 'var(--ink-2)', marginInlineEnd: -10 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <nav className="px-7 pb-16 pt-7">
          {/* שלושה מקטעים עם כותרות, ולא רשימה שטוחה של אחת־עשרה שורות.
              הסדר הוא סדר הכוונה: לקנות, לבחור נוסח, להבין מה זה */}
          <p className="eyebrow" style={{ color: 'var(--ink-3)' }}>הקטלוג</p>
          <div className="mt-3 flex flex-col">
            {ACTIVE_CATEGORIES.map((id) => (
              <Link key={id} href={`/categories/${id}`} className="tap-row display" style={{ fontSize: 'var(--fs-lg)', padding: '.42rem 0' }}>
                {CATEGORIES[id].title}
              </Link>
            ))}
          </div>

          <hr className="rule my-7" />

          <p className="eyebrow" style={{ color: 'var(--ink-3)' }}>חמשת הנוסחים</p>
          <div className="mt-3 flex flex-col">
            {BLESSINGS.map((b) => (
              <Link
                key={b.id}
                href={`/blessings/${b.id}`}
                className="tap-row flex items-center gap-3"
                style={{ color: 'var(--ink-2)', fontSize: 'var(--fs-base)', padding: '.34rem 0' }}
              >
                {/* אותו קידוד צבע שמופיע בכרטיסים ובבורר */}
                <span aria-hidden style={{ width: 9, height: 9, borderRadius: 2, background: b.accent, flexShrink: 0 }} />
                {b.plain}
              </Link>
            ))}
          </div>

          <hr className="rule my-7" />

          <p className="eyebrow" style={{ color: 'var(--ink-3)' }}>להכיר</p>
          <div className="mt-3 flex flex-col">
            <Link href="/craft" className="tap-row" style={{ color: 'var(--ink-2)', fontSize: 'var(--fs-base)', padding: '.34rem 0' }}>
              הטכנולוגיה
            </Link>
            <Link href="/legal/shipping-returns" className="tap-row" style={{ color: 'var(--ink-2)', fontSize: 'var(--fs-base)', padding: '.34rem 0' }}>
              משלוחים והחזרות
            </Link>
          </div>
        </nav>
      </div>

    </>
  );
}
