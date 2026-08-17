'use client';

import { useEffect } from 'react';

/**
 * גלילה חלקה בסגנון בוטיק. Lenis נטען דינמית כדי לא להיכנס ל־bundle הראשוני,
 * ומכובה לגמרי כשהמשתמש ביקש פחות תנועה או במכשירי מגע (שם הגלילה הטבעית טובה יותר).
 */
export default function SmoothScroll() {
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    if (reduce || coarse) return;

    let raf = 0;
    let lenis: { raf: (t: number) => void; destroy: () => void } | null = null;
    let cancelled = false;

    import('lenis').then(({ default: Lenis }) => {
      if (cancelled) return;
      const instance = new Lenis({
        // 1.05 שניות החלקה גרמו לדף לרדוף אחרי הגלגלת במקום לעקוב אחריה
        duration: 0.6,
        easing: (t: number) => 1 - Math.pow(1 - t, 3),
        wheelMultiplier: 1,
      });
      lenis = instance as unknown as { raf: (t: number) => void; destroy: () => void };
      const loop = (time: number) => {
        instance.raf(time);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      lenis?.destroy();
    };
  }, []);

  return null;
}
