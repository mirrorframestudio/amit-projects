'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { readConsent, writeConsent, type ConsentLevel } from '@/lib/consent';
import { analyticsOn } from '@/lib/analytics';

/**
 * באנר העוגיות.
 *
 * שני הכפתורים באותו משקל ויזואלי. באנר שבו "אישור הכל" הוא כפתור
 * מלא ו"רק הכרחיות" הוא קישור אפור קטן אינו בקשת הסכמה אלא הכוונה
 * לתשובה אחת - וזה בדיוק מה שרשויות באירופה קונסות עליו.
 *
 * הוא יושב בתחתית ואינו חוסם את העמוד: אין רקע כהה ואין לכידת מיקוד,
 * כי אפשר להתעלם ממנו ולהמשיך לגלוש.
 *
 * הנוסח נגזר מ-`analyticsOn` ולא נכתב ביד. כשאין מזהי מדידה בסביבה
 * באמת לא רץ כאן כלום, וכשהם נוספים המשפט מתעדכן מעצמו - באנר
 * שמצהיר "לא מודדים" בזמן שהפיקסל טעון הוא בדיוק ההצהרה שקונסים
 * עליה.
 */
export default function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // נבדק אחרי ההרכבה: בשרת אין localStorage, ובדיקה בזמן רינדור
    // הייתה מייצרת חוסר התאמה בין מה שהשרת שלח למה שהלקוח ציפה לו
    if (!readConsent()) setShow(true);
  }, []);

  if (!show) return null;

  const choose = (level: ConsentLevel) => {
    writeConsent(level);
    setShow(false);
  };

  return (
    <div
      role="region"
      aria-label="הודעת עוגיות"
      className="fixed inset-x-0 bottom-0"
      style={{ zIndex: 110, padding: '0 .75rem .75rem' }}
    >
      <div
        className="mx-auto flex max-w-[820px] flex-col gap-4 sm:flex-row sm:items-center"
        style={{
          background: 'var(--bg)',
          border: '1px solid var(--line-strong)',
          borderRadius: 'var(--radius-lg)',
          padding: '1rem 1.15rem',
          boxShadow: '0 14px 40px rgb(20 18 12 / .14)',
        }}
      >
        <p style={{ fontSize: 'var(--fs-2xs)', color: 'var(--ink-2)', lineHeight: 1.65 }}>
          אנחנו שומרים בדפדפן את העגלה ואת בחירות התצוגה שלכם - זה נחוץ כדי שהאתר יעבוד.{' '}
          {analyticsOn
            ? 'כלי מדידה ופרסום - Google Analytics ופיקסל של מטא - נטענים רק אחרי אישור, ולא לפניו.'
            : 'מדידה ופרסום לא פועלים כאן כרגע, וייכנסו רק אם תאשרו.'}{' '}
          <Link href="/legal/privacy" className="link-u">
            מדיניות הפרטיות
          </Link>
        </p>
        <div className="flex flex-shrink-0 gap-2.5">
          <button
            type="button"
            onClick={() => choose('essential')}
            className="btn"
            style={{ fontSize: 'var(--fs-2xs)', padding: '.6rem 1rem', whiteSpace: 'nowrap' }}
          >
            רק הכרחיות
          </button>
          <button
            type="button"
            onClick={() => choose('all')}
            className="btn btn-solid"
            style={{ fontSize: 'var(--fs-2xs)', padding: '.6rem 1rem', whiteSpace: 'nowrap' }}
          >
            אישור הכל
          </button>
        </div>
      </div>
    </div>
  );
}
