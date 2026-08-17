import { BRAND } from '@/lib/brand';

/**
 * הסמל: ריבוע חרוט שבתוכו רשת נקודות ננו — הצורה של השבב עצמו.
 * הנקודות דוהות מהמרכז החוצה, כמו כתב שנמוג בשוליים.
 */
export function BrandMark({ size = 34 }: { size?: number }) {
  const dots = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const d = Math.max(Math.abs(r - 2), Math.abs(c - 2));
      dots.push(
        <rect
          key={`${r}-${c}`}
          x={9 + c * 4}
          y={9 + r * 4}
          width={1.7}
          height={1.7}
          fill="currentColor"
          opacity={0.95 - d * 0.19}
        />,
      );
    }
  }

  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden fill="none">
      <rect x="1" y="1" width="38" height="38" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <rect x="6" y="6" width="28" height="28" stroke="currentColor" strokeWidth="0.6" opacity="0.7" />
      {dots}
    </svg>
  );
}

/** הנעילה המלאה: סמל + שם + שם לטיני מתחתיו */
export default function Logo({ size = 32, stacked = false }: { size?: number; stacked?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-3 ${stacked ? 'flex-col gap-2' : ''}`}
      style={{ color: 'var(--accent)' }}
    >
      <BrandMark size={size} />
      <span className={`flex flex-col ${stacked ? 'items-center' : 'items-start'} leading-none`}>
        <span
          className="display"
          style={{ fontSize: size * 0.72, letterSpacing: '0.02em', color: 'var(--ink)' }}
        >
          {BRAND.name}
        </span>
        <span
          className="ltr mt-1"
          style={{
            fontSize: Math.max(7.5, size * 0.235),
            letterSpacing: '0.42em',
            color: 'var(--accent)',
            opacity: 0.85,
          }}
        >
          {BRAND.nameLatin}
        </span>
      </span>
    </span>
  );
}
