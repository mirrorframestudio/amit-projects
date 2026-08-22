'use client';

import Link from 'next/link';
import { useState } from 'react';
import Logo from './Logo';
import { BRAND } from '@/lib/brand';
import { CATEGORIES, ACTIVE_CATEGORIES } from '@/lib/catalog';
import { BLESSINGS } from '@/lib/blessings';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  return (
    <footer className="hairline relative mt-32 overflow-hidden pt-24 pb-10">
      {/* חתימת ענק ברקע — קו אחד של טיפוגרפיה שחותם את העמוד */}
      <div
        aria-hidden
        className="display pointer-events-none absolute inset-x-0 bottom-0 select-none text-center leading-none"
        style={{
          fontSize: 'clamp(5rem, 22vw, 20rem)',
          color: 'var(--ink)',
          opacity: 0.06,
          transform: 'translateY(24%)',
        }}
      >
        {BRAND.name}
      </div>

      <div className="shell relative">
        <div className="grid gap-14 md:grid-cols-[1.4fr_1fr_1fr_1.3fr]">
          <div>
            <Logo size={34} />
            <p className="lede mt-6 max-w-xs" style={{ fontSize: 'var(--fs-base)' }}>
              {BRAND.tagline}
            </p>
            <div className="mt-7 flex gap-4">
              {['Instagram', 'TikTok', 'Pinterest'].map((s) => (
                <a
                  key={s}
                  href="#"
                  className="tap-row link-u ltr"
                  style={{ fontSize: 'var(--fs-xs)', letterSpacing: '.14em', color: 'var(--ink-3)' }}
                >
                  {s}
                </a>
              ))}
            </div>
          </div>

          <nav className="flex flex-col gap-3">
            <p className="eyebrow mb-2">הקטלוג</p>
            {ACTIVE_CATEGORIES.map((id) => (
              <Link key={id} href={`/categories/${id}`} className="tap-row link-u" style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-2)' }}>
                {CATEGORIES[id].title}
              </Link>
            ))}
            <Link href="/blessings" className="tap-row link-u" style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-2)' }}>
              כל הברכות
            </Link>
          </nav>

          <nav className="flex flex-col gap-3">
            <p className="eyebrow mb-2">הברכות</p>
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
            <form
              className="mt-5 flex"
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
              }}
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                style={{ fontSize: 'var(--fs-sm)', color: 'var(--accent)' }}
              >
                {sent ? 'נרשמת ✦' : 'הרשמה'}
              </button>
            </form>
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
