'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { BRAND } from '@/lib/brand';

const MICRO = ['משלוח חינם מעל ₪450', 'שנתיים אחריות', 'החזרה תוך 30 יום'];

/** הירו: וידאו מלא־רוחב, וטקסט יושב על צעיף שמנת בצד ימין */
export default function Hero() {
  const video = useRef<HTMLVideoElement>(null);

  // מי שביקש פחות תנועה מקבל את פריים הפוסטר בלבד
  useEffect(() => {
    const el = video.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.removeAttribute('autoplay');
      el.pause();
    }
  }, []);

  return (
    <section className="relative overflow-hidden" style={{ minHeight: 'min(88vh, 780px)' }}>
      <video
        ref={video}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: '32% center' }}
        src="/hero/hero.mp4"
        poster="/hero/hero-poster.jpg"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden
      />

      {/* צעיף: אנכי במסך צר, אופקי מימין במסך רחב */}
      <div
        aria-hidden
        className="absolute inset-0 md:hidden"
        style={{
          background:
            'linear-gradient(to top, var(--bg) 40%, color-mix(in oklab, var(--bg) 86%, transparent) 60%, transparent 84%)',
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 hidden md:block"
        style={{
          background:
            'linear-gradient(to left, var(--bg) 40%, color-mix(in oklab, var(--bg) 78%, transparent) 58%, transparent 78%)',
        }}
      />

      <div className="shell relative flex min-h-[inherit] items-end pb-14 md:items-center md:pb-0">
        <div className="w-full py-16 md:w-[46%] md:py-24">
          <p className="eyebrow mask-line load">
            <span>כסף 925 · צריבת ננו · הנוסח המלא</span>
          </p>

          <h1
            className="display mt-4"
            style={{ fontSize: 'clamp(2.6rem, 5.4vw, 5rem)', fontWeight: 700, lineHeight: 1.05 }}
          >
            <span className="mask-line load">
              <span>ברכה שלמה</span>
            </span>
            <span className="mask-line load">
              <span style={{ ['--d' as string]: '120ms' }}>בתוך תכשיט</span>
            </span>
          </h1>

          <p
            className="reveal load mt-5"
            style={{
              ['--d' as string]: '300ms',
              fontSize: 'clamp(1.15rem, 2.2vw, 1.8rem)',
              fontWeight: 400,
              color: 'var(--ink-2)',
            }}
          >
            חמש ברכות לבחירה - אחת שלכם
          </p>

          <div
            className="reveal load mt-8 flex flex-wrap items-center gap-4"
            style={{ ['--d' as string]: '440ms' }}
          >
            <Link href="/blessings" className="btn btn-solid" style={{ ['--pad' as string]: '1.05rem 2.6rem', fontSize: '.95rem' }}>
              לבחירת הברכה
            </Link>
            <Link href="/categories/necklaces" className="btn">
              לקטלוג
            </Link>
          </div>

          <ul
            className="reveal load mt-9 flex flex-wrap gap-x-7 gap-y-2"
            style={{ ['--d' as string]: '580ms', fontSize: '.76rem', color: 'var(--ink-3)' }}
          >
            {MICRO.map((m) => (
              <li key={m} className="flex items-center gap-2">
                <span aria-hidden style={{ color: 'var(--accent)' }}>✦</span>
                {m}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
