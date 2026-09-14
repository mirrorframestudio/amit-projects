import Link from 'next/link';

/**
 * שלוש הבטחות, כשלוש שורות.
 *
 * קודם ישבו כאן שלושה אייקוני קו גנריים - מגן, קופסה, שעון - וגרש
 * ענק בשקיפות 14% מעל הציטוט. אייקון קו ליד כל פסקה הוא הרשת של
 * "שלושת היתרונות" שכל תבנית מגיעה איתה. השורות עומדות בזכות המילים.
 */
const PILLARS = [
  {
    title: 'כרטיס הנוסח',
    body: 'בקופסה מגיע כרטיס עם שם הברכה, המקורות שממנה היא לקוחה, והנוסח המלא - כדי שמי שמקבל ידע בדיוק מה הוא נושא.',
  },
  {
    title: 'אריזת בית',
    body: 'קופסה מרופדת שמגנה על התכשיט בדרך, ומוכנה למסירה כמו שהיא.',
  },
  {
    title: 'שנה אחריות',
    body: 'שנה על פגמי ייצור בגוף התכשיט - השבב במשבצתו, ההלחמות והחוליות. על הסוגר, שהוא חלק נע, חודשיים. תיקון בתקופה ללא עלות.',
  },
];

export default function Assurance() {
  return (
    <section className="py-9 md:py-28">
      <div className="shell grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-24">
        <figure className="reveal self-start">
          <blockquote
            className="display"
            style={{ fontSize: 'var(--ds-2)', lineHeight: 1.55, fontWeight: 500 }}
          >
            הטקסט על השבב הוא הנוסח המלא, מילה במילה, בלי קיצור ובלי השמטה.
            אפשר לקרוא אותו כאן באתר לפני שקונים, ולהשוות למקור.
          </blockquote>
          <figcaption className="mt-7">
            <Link
              href="/blessings"
              className="link-u"
              style={{ fontSize: 'var(--fs-sm)', color: 'var(--accent-deep)' }}
            >
              לקריאת חמשת הנוסחים ←
            </Link>
          </figcaption>
        </figure>

        <dl className="flex flex-col">
          {PILLARS.map((p, i) => (
            <div
              key={p.title}
              className="reveal grid gap-x-8 gap-y-2 py-7 sm:grid-cols-[9rem_1fr]"
              style={{
                ['--d' as string]: `${i * 90}ms`,
                borderTop: '1px solid var(--line)',
                borderBottom: i === PILLARS.length - 1 ? '1px solid var(--line)' : undefined,
              }}
            >
              <dt className="display t-3">{p.title}</dt>
              <dd style={{ fontSize: 'var(--fs-base)', color: 'var(--ink-2)', lineHeight: 1.75 }}>
                {p.body}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
