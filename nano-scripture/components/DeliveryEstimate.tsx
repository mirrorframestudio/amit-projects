'use client';

import { useEffect, useState } from 'react';
import { deliveryLine } from '@/lib/policy';
import { deliveryWindow, formatWindow } from '@/lib/delivery';

/**
 * חלון ההגעה, כתאריכים ולא כמספר ימים.
 *
 * "1-4 ימי עסקים" מחייב את הקורא לפתוח לוח שנה ולספור. "מגיע 27-31
 * באוגוסט" הוא התשובה עצמה. החנות המובילה בקטגוריה מציגה תאריכים
 * בתוך קופסת הקנייה, וזה ההבדל בין הבטחה למידע.
 *
 * התאריך מחושב אחרי ההרכבה בלבד: השרת מרנדר סטטית ולא יודע מתי הדף
 * ייצפה, וחישוב בזמן הרינדור היה נותן תאריך שגוי לכל מבקר אחרי היום
 * שבו נבנה האתר. עד שהוא מחושב מוצג נוסח הימים, כך שאין קפיצה ריקה.
 *
 * החישוב עצמו ב-lib/delivery.ts - אותו חישוב משמש גם את הצ'קאאוט,
 * והוא מדלג על חגים וערבי חג ולא רק על שישי ושבת.
 */

export default function DeliveryEstimate({ color }: { color?: string }) {
  const [window, setWindow] = useState<string | null>(null);

  useEffect(() => {
    setWindow(formatWindow(deliveryWindow()));
  }, []);

  return (
    <p
      className="mt-3 flex items-center justify-center gap-2"
      style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-2)' }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden style={{ color: color ?? 'var(--accent)' }}>
        <path
          d="M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17ZM12 7.4v5l3.2 2"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {window ? (
        <span>
          מגיע אליכם <span className="num">{window}</span>
        </span>
      ) : (
        <span>
          משלוח <span className="num">{deliveryLine}</span>
        </span>
      )}
    </p>
  );
}
