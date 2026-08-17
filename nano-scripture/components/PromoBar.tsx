import { PROMO, promoOn } from '@/lib/promo';

/**
 * רצועת המבצע — יושבת בראש כל עמוד באתר, מעל הניווט.
 * spacer מרנדר את אותו גוף בדיוק אך שקוף, כדי לדחוף את התוכן
 * מתחת לרצועה הצפה בלי לנחש את גובהה (שמשתנה כשהטקסט נשבר).
 */
export default function PromoBar({ spacer = false }: { spacer?: boolean }) {
  if (!promoOn) return null;

  return (
    <div
      role={spacer ? undefined : 'status'}
      aria-hidden={spacer || undefined}
      className={spacer ? undefined : 'promo-sheen'}
      style={{
        ...(spacer ? { visibility: 'hidden' as const, pointerEvents: 'none' as const } : null),
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(100deg, var(--sale-deep), var(--sale) 46%, var(--sale-deep))',
        color: 'var(--on-sale)',
        borderBottom: '1px solid var(--sale-deep)',
      }}
    >
      <div
        className="shell relative flex items-center justify-center gap-2.5 py-2 text-center sm:gap-4"
        style={{ minHeight: 38, zIndex: 1 }}
      >
        <span aria-hidden style={{ opacity: 0.75, fontSize: '.7rem' }}>
          ✦
        </span>

        <p style={{ fontSize: '.85rem', fontWeight: 700, letterSpacing: '.02em' }}>
          {PROMO.headline}
        </p>

        <span
          className="hidden sm:inline"
          aria-hidden
          style={{ opacity: 0.42, fontSize: '.7rem' }}
        >
          ·
        </span>

        <p
          className="hidden sm:block"
          style={{ fontSize: '.75rem', opacity: 0.85, letterSpacing: '.02em' }}
        >
          {PROMO.sub}
        </p>

        <span aria-hidden style={{ opacity: 0.75, fontSize: '.7rem' }}>
          ✦
        </span>
      </div>
    </div>
  );
}
