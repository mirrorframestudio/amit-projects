'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getBlessing, type BlessingId } from '@/lib/blessings';
import { blessingText, layoutNano, nanoFont, paintNano, type NanoLayout } from '@/lib/nanoText';

/**
 * לוח ננו אינטראקטיבי — הדמיה של פני השבב.
 *
 * שכבת הבסיס והעדשה מצוירות שתיהן ל־canvas מאותה פריסת שורות, ולכן
 * ההגדלה מציגה בדיוק את הטקסט שמתחתיה, והלוח מתמלא עד הקצה.
 */
export default function NanoLoupe({
  blessing,
  height = 420,
  zoom = 9,
  radius = 96,
  fontSize = 3.4,
  hint = true,
}: {
  blessing: BlessingId;
  height?: number | string;
  zoom?: number;
  radius?: number;
  fontSize?: number;
  hint?: boolean;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLCanvasElement>(null);
  const lensRef = useRef<HTMLCanvasElement>(null);
  const layoutRef = useRef<NanoLayout | null>(null);
  const posRef = useRef({ x: -999, y: -999 });
  const frame = useRef(0);
  const [active, setActive] = useState(false);

  const b = getBlessing(blessing);
  const source = blessingText(blessing);
  const ink = b.accentSoft;
  const back = '#05070a';

  /* ---------- ציור שכבת הבסיס ---------- */
  const paintBase = useCallback(() => {
    const el = wrap.current;
    const cv = baseRef.current;
    if (!el || !cv) return;

    const w = el.clientWidth;
    const h = el.clientHeight;
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

    const layout = layoutNano(ctx, source, w, h, fontSize, Math.max(8, w * 0.018));
    layoutRef.current = layout;
    paintNano(ctx, layout, ink);
  }, [fontSize, ink, source]);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;

    // הגופנים חייבים להיות טעונים לפני המדידה, אחרת הפריסה קופצת
    let alive = true;
    document.fonts.ready.then(() => alive && paintBase());
    paintBase();

    const ro = new ResizeObserver(() => paintBase());
    ro.observe(el);
    return () => {
      alive = false;
      ro.disconnect();
    };
  }, [paintBase]);

  /* ---------- ציור העדשה ---------- */
  const paintLens = useCallback(() => {
    frame.current = 0;
    const cv = lensRef.current;
    const layout = layoutRef.current;
    if (!cv || !layout) return;

    const ctx = cv.getContext('2d');
    if (!ctx) return;

    const { x, y } = posRef.current;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const size = radius * 2;

    if (cv.width !== size * dpr) {
      cv.width = size * dpr;
      cv.height = size * dpr;
      cv.style.width = `${size}px`;
      cv.style.height = `${size}px`;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    ctx.save();
    ctx.beginPath();
    ctx.arc(radius, radius, radius, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = back;
    ctx.fillRect(0, 0, size, size);

    // מעבר למערכת הקואורדינטות של הלוח, מוגדלת סביב נקודת הסמן
    ctx.translate(radius, radius);
    ctx.scale(zoom, zoom);
    ctx.translate(-x, -y);

    ctx.font = nanoFont(layout.fontSize);
    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    ctx.fillStyle = ink;

    // רק מה שנופל בתוך העדשה מצויר — כמה שורות, וכמה תווים בכל שורה.
    // בלי החיתוך הזה כל תזוזה הייתה מציירת אלפי גליפים שאיש לא רואה.
    const span = radius / zoom;
    const first = Math.max(0, Math.floor((y - span - layout.top) / layout.lineHeight) - 1);
    const last = Math.min(
      layout.lines.length - 1,
      Math.ceil((y + span - layout.top) / layout.lineHeight) + 1,
    );

    // השורה מצוירת במלואה. אחרי השבירה למילים אורכי השורות אינם אחידים,
    // וחיתוך לפי רוחב תו ממוצע היה מזיז את הטקסט. הנוסח מופיע פעם אחת,
    // ולכן שורה שלמה היא כמה עשרות גליפים - זול לצייר.
    for (let i = first; i <= last; i++) {
      ctx.fillText(
        layout.lines[i],
        layout.right,
        layout.top + layout.fontSize + i * layout.lineHeight,
      );
    }
    ctx.restore();
  }, [back, ink, radius, zoom]);

  const move = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const el = wrap.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      posRef.current = { x, y };
      el.style.setProperty('--mx', `${x}px`);
      el.style.setProperty('--my', `${y}px`);
      // ציור אחד לכל פריים גם אם הדפדפן שלח עשרות אירועים
      if (!frame.current) frame.current = requestAnimationFrame(paintLens);
    },
    [paintLens],
  );

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  return (
    <div
      ref={wrap}
      onPointerMove={move}
      onPointerEnter={() => setActive(true)}
      onPointerLeave={() => setActive(false)}
      style={{
        position: 'relative',
        height,
        overflow: 'hidden',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--line-strong)',
        background: `radial-gradient(120% 90% at 30% 0%, color-mix(in oklab, ${b.accent} 26%, ${back}), ${back})`,
        cursor: active ? 'none' : 'crosshair',
        touchAction: 'none',
        boxShadow: '0 30px 70px -46px rgb(20 15 5 / .8)',
      }}
    >
      <canvas ref={baseRef} className="absolute inset-0" aria-hidden />

      {/* מסלולי מוליכים על פני השבב */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <pattern id={`traces-${blessing}`} width="64" height="64" patternUnits="userSpaceOnUse">
            <path
              d="M0 32h18l8-8h20l8 8h10M32 0v14l8 8v20l-8 8v14"
              stroke={b.accent}
              strokeWidth="0.5"
              fill="none"
              opacity="0.3"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#traces-${blessing})`} />
      </svg>

      {/* העדשה — קנבס קטן שנצבע מחדש רק כשהסמן זז */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: 'var(--mx, 50%)',
          top: 'var(--my, 50%)',
          width: radius * 2,
          height: radius * 2,
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          overflow: 'hidden',
          border: `1px solid ${b.accent}`,
          boxShadow: `0 0 0 1px rgb(0 0 0 /.55), 0 24px 60px -16px rgb(0 0 0 /.85), inset 0 0 50px -18px ${b.accent}`,
          opacity: active ? 1 : 0,
          transition: 'opacity .18s linear',
          pointerEvents: 'none',
        }}
      >
        <canvas ref={lensRef} />
        <span
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(135deg, rgb(255 255 255 /.14) 0%, transparent 44%, rgb(255 255 255 /.06) 100%)',
          }}
        />
      </div>

      {hint && (
        <div
          style={{
            position: 'absolute',
            insetInline: 0,
            bottom: 16,
            textAlign: 'center',
            fontSize: '.72rem',
            letterSpacing: '.22em',
            color: b.accentSoft,
            opacity: active ? 0 : 0.8,
            transition: 'opacity .25s',
            pointerEvents: 'none',
            textShadow: '0 2px 10px rgb(0 0 0 / .8)',
          }}
        >
          העבירו את הסמן - הזכוכית המגדלת נפתחת
        </div>
      )}
    </div>
  );
}
