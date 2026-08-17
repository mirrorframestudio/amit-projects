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
const NAV = [
  ...ACTIVE_CATEGORIES.map((id) => ({
    href: `/categories/${id}`,
    label: CATEGORIES[id].title,
  })),
  { href: '/blessings', label: 'הברכות' },
  { href: '/craft', label: 'הטכנולוגיה' },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const pathname = usePathname();
  const lines = useCart((s) => s.lines);
  const setOpen = useCart((s) => s.setOpen);
  const { items } = cartTotals(lines);

  useEffect(() => setMenu(false), [pathname]);

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

        <div
          className="shell flex items-center justify-between"
          style={{ height: scrolled ? 68 : 92, transition: 'height .45s var(--ease)' }}
        >
          <Link href="/" aria-label="דף הבית">
            <Logo size={scrolled ? 26 : 32} />
          </Link>

          <nav className="hidden items-center gap-9 lg:flex">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="link-u"
                style={{
                  fontSize: '.88rem',
                  letterSpacing: '.03em',
                  color: pathname === n.href ? 'var(--accent)' : 'var(--ink-2)',
                }}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-5">
            <button
              onClick={() => setOpen(true)}
              className="tap relative flex items-center gap-2"
              style={{ color: 'var(--ink-2)', fontSize: '.85rem' }}
              aria-label={`עגלת קניות, ${items} פריטים`}
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden>
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

            <button
              className="tap lg:hidden"
              onClick={() => setMenu((m) => !m)}
              aria-label="תפריט"
              aria-expanded={menu}
              style={{ color: 'var(--ink)' }}
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
          </div>
        </div>
      </header>

      {/* תפריט מובייל — נפתח מלמעלה בשכבה מלאה */}
      <div
        className="glass lg:hidden"
        style={{
          position: 'fixed',
          insetInline: 0,
          top: 0,
          zIndex: 89,
          paddingTop: 108,
          paddingBottom: 36,
          borderBottom: '1px solid var(--line)',
          transform: menu ? 'none' : 'translateY(-102%)',
          transition: 'transform .6s var(--ease)',
        }}
      >
        <nav className="shell flex flex-col gap-1">
          {ACTIVE_CATEGORIES.map((id, i) => (
            <Link
              key={id}
              href={`/categories/${id}`}
              className="tap-row display t-2 py-2"
              style={{ transitionDelay: `${i * 40}ms` }}
            >
              {CATEGORIES[id].title}
            </Link>
          ))}
          <hr className="rule my-4" />
          {BLESSINGS.map((b) => (
            <Link key={b.id} href={`/blessings/${b.id}`} className="tap-row" style={{ color: 'var(--ink-2)', padding: '.35rem 0' }}>
              {b.plain}
            </Link>
          ))}
          <hr className="rule my-4" />
          <Link href="/craft" className="tap-row" style={{ color: 'var(--ink-2)', padding: '.35rem 0' }}>
            הטכנולוגיה
          </Link>
          <Link href="/brand" className="tap-row" style={{ color: 'var(--ink-2)', padding: '.35rem 0' }}>
            שפת המותג
          </Link>
        </nav>
      </div>
    </>
  );
}
