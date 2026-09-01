import { PROMO, promoOn } from '@/lib/promo';
import { POLICY, deliveryLine } from '@/lib/policy';
import { GIFT_BOX, INSTALLMENTS } from '@/lib/extras';

/**
 * רצועת ההצעות — שורה רצה בראש כל עמוד.
 *
 * קודם ישבה כאן הודעה אחת קבועה, וכל שאר ההצעות של החנות היו מפוזרות
 * בעמודים שצריך להגיע אליהם. רצועה רצה נותנת לכולן את אותו מקום בלי
 * לתפוס יותר גובה.
 *
 * כל פריט נשאב ממקור האמת שלו - PROMO, POLICY, GIFT_BOX - ולא נכתב
 * כאן ביד, כדי שרצועה שרצה בראש כל עמוד לא תבטיח משהו שכבר השתנה.
 *
 * spacer מרנדר את אותו גובה בדיוק אך שקוף, כדי לדחוף את התוכן מתחת
 * לרצועה הצפה בלי לנחש את גובהה. הוא מוותר על ההכפלה ועל האנימציה.
 */
const OFFERS = [
  ...(promoOn ? [`${PROMO.percent}% הנחה על ההזמנה הראשונה · קוד ${PROMO.code}`] : []),
  `עד ${INSTALLMENTS} תשלומים ללא ריבית`,
  `החזרה תוך ${POLICY.returnDays} יום`,
  `משלוח מבוטח · ${deliveryLine}`,
  'קופסה מרופדת וכרטיס ברכה בכל הזמנה',
  `אריזת מתנה ב־₪${GIFT_BOX.price}`,
  'שנה אחריות על גוף התכשיט',
];

function Row({ dim = false, hidden = false }: { dim?: boolean; hidden?: boolean }) {
  return (
    <div className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {OFFERS.map((offer, i) => (
        <span key={`${i}-${offer}`} className="flex items-center">
          <span aria-hidden style={{ opacity: 0.5, fontSize: 'var(--fs-2xs)', padding: '0 1.15rem' }}>
            ✦
          </span>
          <span
            style={{
              fontSize: 'var(--fs-xs)',
              fontWeight: dim ? 400 : 600,
              letterSpacing: '.02em',
              whiteSpace: 'nowrap',
            }}
          >
            {offer}
          </span>
        </span>
      ))}
    </div>
  );
}

export default function PromoBar({ spacer = false }: { spacer?: boolean }) {
  return (
    <div
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
      {/* לא flex: כילד של flex, ה־width:max-content של הרצועה מתכווץ
          לרוחב האב, והגלילה מפסיקה לזוז */}
      <div className="relative py-2" style={{ minHeight: 38, zIndex: 1 }}>
        {spacer ? (
          <Row dim />
        ) : (
          <div className="marquee" style={{ ['--dur' as string]: '54s' }}>
            {/* שני עותקים - הראשון גולל החוצה בזמן שהשני נכנס */}
            <Row />
            <Row hidden />
          </div>
        )}
      </div>
    </div>
  );
}
