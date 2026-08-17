'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * מנוע חשיפה יחיד לכל האתר: IntersectionObserver אחד במקום עשרות מאזינים.
 * בנוסף לו רץ מעבר ביטחון שמשחרר אלמנטים שנעקפו בקפיצת גלילה מהירה
 * (עוגן, Home/End) — אחרת הם היו נשארים שקופים לצמיתות.
 */
export default function RevealEngine() {
  const pathname = usePathname();

  useEffect(() => {
    const targets = new Set(
      document.querySelectorAll<HTMLElement>('.reveal, .reveal-x, .mask-line'),
    );
    if (!targets.size) return;

    const show = (el: HTMLElement, instant = false) => {
      if (instant) el.style.transitionDuration = '0ms';
      el.classList.add('in');
      targets.delete(el);
      io.unobserve(el);
      // ניקוי will-change אחרי סיום המעבר — שומר על שכבות ה־GPU רזות
      window.setTimeout(() => {
        el.classList.add('done');
        el.style.transitionDuration = '';
      }, instant ? 60 : 1400);
    };

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      targets.forEach((el) => el.classList.add('in', 'done'));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) show(entry.target as HTMLElement);
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.12 },
    );

    targets.forEach((el) => io.observe(el));

    // מעבר ביטחון: כל מה שכבר עבר מעל קצה המסך נחשף מיד
    let ticking = false;
    const sweep = () => {
      ticking = false;
      for (const el of targets) {
        if (el.getBoundingClientRect().bottom < 0) show(el, true);
      }
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(sweep);
    };

    // סריקה ראשונה מיד עם ההרכבה: הדפדפן משחזר מיקום גלילה לפני שהמאזין
    // קיים, וגם קישור עוגן נוחת באמצע העמוד — בלי זה כל מה שמעל נשאר שקוף
    // בלשונית מוסתרת אין rAF ואין דיווחי IntersectionObserver, אז סורקים
    // שוב ברגע שחוזרים אליה
    const onVisible = () => document.visibilityState === 'visible' && sweep();

    sweep();
    requestAnimationFrame(sweep);
    window.addEventListener('load', sweep);
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      io.disconnect();
      window.removeEventListener('load', sweep);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [pathname]);

  return null;
}
