'use client';

import { useId, useState } from 'react';

export type { QA } from '@/lib/faq';
import type { QA } from '@/lib/faq';

export default function Accordion({ items }: { items: QA[] }) {
  const [open, setOpen] = useState<number | null>(0);
  // מזהה יציב בין שרת ללקוח, כדי ש-aria-controls יצביע על אותו אלמנט
  const uid = useId();

  return (
    <div>
      {items.map((item, i) => (
        <div key={item.q} style={{ borderTop: '1px solid var(--line)' }}>
          <button
            id={`${uid}-q${i}`}
            onClick={() => setOpen(open === i ? null : i)}
            aria-expanded={open === i}
            aria-controls={`${uid}-a${i}`}
            className="flex w-full items-start justify-between gap-6 py-6 text-start"
          >
            <span className="display" style={{ fontSize: 'var(--fs-md)', lineHeight: 1.5 }}>
              {item.q}
            </span>
            <span
              style={{
                color: 'var(--accent)',
                flexShrink: 0,
                marginTop: 4,
                transform: open === i ? 'rotate(45deg)' : 'none',
                transition: 'transform .45s var(--ease)',
                fontSize: 'var(--fs-lg)',
                lineHeight: 1,
              }}
              aria-hidden
            >
              +
            </span>
          </button>
          {/* פתיחה חלקה בלי לדעת גובה מראש */}
          {/* התשובה הסגורה בגובה אפס. היא נשארת ב-DOM בשביל המעבר,
              ולכן צריך להסתיר אותה מקורא מסך - אחרת הוא מקריא את תשע
              התשובות ברצף בזמן שהמסך מראה רק כותרות */}
          <div
            id={`${uid}-a${i}`}
            role="region"
            aria-labelledby={`${uid}-q${i}`}
            aria-hidden={open !== i}
            style={{
              display: 'grid',
              gridTemplateRows: open === i ? '1fr' : '0fr',
              transition: 'grid-template-rows .55s var(--ease)',
            }}
          >
            <div style={{ overflow: 'hidden' }}>
              <p className="lede pb-7" style={{ fontSize: 'var(--fs-base)', maxWidth: '62ch' }}>
                {item.a}
              </p>
            </div>
          </div>
        </div>
      ))}
      <div style={{ borderTop: '1px solid var(--line)' }} />
    </div>
  );
}
