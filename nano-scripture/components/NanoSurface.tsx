'use client';

import { useCallback, useEffect, useRef } from 'react';
import { getBlessing, type BlessingId } from '@/lib/blessings';
import { blessingText, layoutNano, nanoFont, paintNano } from '@/lib/nanoText';

/**
 * פני שבב סטטיים — הכתב הזעיר שממלא את כל המשטח.
 * canvas ולא DOM: עשרות אלפי תווים כטקסט אמיתי היו הופכים כל
 * אנימציה שמוחלת על ההורה לכבדה מדי.
 */
export default function NanoSurface({
  blessing,
  fontSize = 3.4,
  className = '',
}: {
  blessing: BlessingId;
  fontSize?: number;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const b = getBlessing(blessing);

  const paint = useCallback(() => {
    const cv = ref.current;
    const parent = cv?.parentElement;
    if (!cv || !parent) return;

    const w = parent.clientWidth;
    const h = parent.clientHeight;
    if (!w || !h) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    cv.style.width = `${w}px`;
    cv.style.height = `${h}px`;

    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.font = nanoFont(fontSize);
    ctx.direction = 'rtl';

    paintNano(ctx, layoutNano(ctx, blessingText(blessing), w, h, fontSize, w * 0.05), b.accentSoft);
  }, [b.accentSoft, blessing, fontSize]);

  useEffect(() => {
    const parent = ref.current?.parentElement;
    if (!parent) return;
    let alive = true;
    document.fonts.ready.then(() => alive && paint());
    paint();
    const ro = new ResizeObserver(() => paint());
    ro.observe(parent);
    return () => {
      alive = false;
      ro.disconnect();
    };
  }, [paint]);

  return <canvas ref={ref} className={className} aria-hidden />;
}
