'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { BRAND } from '@/lib/brand';
import { BLESSINGS, LONGEST_BLESSING_CHARS } from '@/lib/blessings';

/**
 * המקורות, ולא המדיניות.
 *
 * כאן ישבו קודם משלוח, אחריות והחזרה - בדיוק שלושת הפריטים שרצועת
 * האמון שמתחת להירו כבר אומרת, כלומר חזרה ולא תוספת. הסקיל דורש
 * אלמנט של הוכחה מעל הקיפול, ולמותג בלי לקוחות עדיין אין ביקורות.
 * מה שכן יש הוא סמכות המקור: הנוסחים אינם כתובים כאן, הם מצוטטים.
 */
const SOURCES = BLESSINGS.map((b) => {
  const parts = b.sources.split(' · ');
  // המקור הראשון אינו תמיד ציטוט. בברכת התינוק הוא "ברכה לתינוק",
  // תיאור ולא מקור, וברצועה שכל תפקידה סמכות זה מחליש. נבחר החלק
  // שנושא מספר פרק בגרשיים - כלומר הפניה אמיתית
  return parts.find((x) => /[׳״]/.test(x)) ?? parts[parts.length - 1];
});

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
            // הצעיף הישן נגמר ב-40% אטימות, ובגובה שבו יושבת שורת
            // המקורות הקרם היה שקוף ב-47% בלבד. מדידה על הפריים
            // שמאחוריה נתנה 2.15:1 מול הזהב - כלומר השורה הראשונה
            // בעמוד הייתה בלתי קריאה בטלפון. ההרמה ל-56% משאירה את
            // השרשרת נראית ומביאה את היחס לכ-5.6:1
            'linear-gradient(to top, var(--bg) 56%, color-mix(in oklab, var(--bg) 80%, transparent) 76%, transparent 92%)',
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
          <p className="eyebrow mask-line load" style={{ color: 'var(--accent-deep)' }}>
            <span>כסף 925 · צריבת ננו · הנוסח המלא</span>
          </p>

          <h1
            className="display mt-4"
            style={{ fontSize: 'var(--ds-hero)', fontWeight: 700, lineHeight: 1.05 }}
          >
            <span className="mask-line load">
              <span>כל הנוסח.</span>
            </span>
            <span className="mask-line load">
              <span style={{ ['--d' as string]: '120ms' }}>לא שורה ממנו.</span>
            </span>
          </h1>

          <p
            className="reveal load mt-5"
            style={{
              ['--d' as string]: '300ms',
              fontSize: 'var(--ds-3)',
              fontWeight: 400,
              color: 'var(--ink-2)',
            }}
          >
            עד <span className="num">{LONGEST_BLESSING_CHARS.toLocaleString('he-IL')}</span> תווים
            נצרבים על שטח של חצי מילימטר רבוע. חמישה נוסחים - אחד שלכם.
          </p>

          <div
            className="reveal load mt-8 flex flex-wrap items-center gap-4"
            style={{ ['--d' as string]: '440ms' }}
          >
            <Link href="/blessings" className="btn btn-solid" style={{ ['--pad' as string]: '1.05rem 2.6rem', fontSize: 'var(--fs-base)' }}>
              לבחירת הברכה
            </Link>
            <Link href="/categories/necklaces" className="btn">
              לקטלוג
            </Link>
          </div>

          <ul
            className="reveal load mt-9 flex flex-wrap gap-x-7 gap-y-2"
            style={{ ['--d' as string]: '580ms', fontSize: 'var(--fs-xs)', color: 'var(--ink-3)' }}
          >
            {SOURCES.map((m) => (
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
