'use client';

import { useEffect, useState } from 'react';
import { POLICY, deliveryLine } from '@/lib/policy';

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
 */
function addBusinessDays(from: Date, days: number) {
  const d = new Date(from);
  let left = days;
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    // שישי ושבת אינם ימי עסקים בישראל
    const day = d.getDay();
    if (day !== 5 && day !== 6) left--;
  }
  return d;
}

export default function DeliveryEstimate({ color }: { color?: string }) {
  const [window, setWindow] = useState<string | null>(null);

  useEffect(() => {
    const now = new Date();
    const from = addBusinessDays(now, POLICY.deliveryMinDays);
    const to = addBusinessDays(now, POLICY.deliveryMaxDays);
    const fmt = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'long' });
    const sameMonth = from.getMonth() === to.getMonth();
    setWindow(
      sameMonth
        ? `${from.getDate()}-${fmt.format(to)}`
        : `${fmt.format(from)} - ${fmt.format(to)}`,
    );
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
