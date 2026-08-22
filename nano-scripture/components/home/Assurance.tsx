import Link from 'next/link';
const PILLARS = [
  {
    title: 'תעודת אותנטיות',
    body: 'בקופסה מגיע כרטיס עם שם הברכה, המקורות שממנה היא לקוחה, והנוסח המלא - כדי שמי שמקבל ידע בדיוק מה הוא נושא.',
    icon: (
      <>
        <path d="M12 3 4.5 6.4v5.2c0 4.5 3.1 8.3 7.5 9.4 4.4-1.1 7.5-4.9 7.5-9.4V6.4Z" />
        <path d="m9 12 2.2 2.2L15.5 10" />
      </>
    ),
  },
  {
    title: 'אריזת בית',
    body: 'קופסה מרופדת עם זכוכית מגדלת, כך שאפשר לראות את השבב מקרוב ברגע הפתיחה.',
    icon: (
      <>
        <path d="M3 8.5 12 4l9 4.5v7L12 20l-9-4.5Z" />
        <path d="M3 8.5 12 13l9-4.5M12 13v7" />
      </>
    ),
  },
  {
    title: 'שנה אחריות',
    body: 'שנה על פגמי ייצור - השבב במשבצתו, ההלחמות, הסוגר והחוליות. תיקון בתקופה הזו ללא עלות.',
    icon: (
      <>
        <circle cx="12" cy="12" r="8.2" />
        <path d="M12 7.4v5l3.2 2" />
      </>
    ),
  },
];

export default function Assurance() {
  return (
    <section className="py-32 md:py-40">
      <div className="shell grid gap-16 lg:grid-cols-[1fr_1.1fr] lg:gap-24">
        {/* אמירת המותג */}
        <figure className="reveal relative self-start">
          <span
            aria-hidden
            className="display pointer-events-none absolute select-none"
            style={{
              insetInlineStart: -12,
              top: -46,
              fontSize: '9rem',
              lineHeight: 1,
              color: 'var(--accent)',
              opacity: 0.14,
            }}
          >
            ״
          </span>
          <blockquote className="display relative" style={{ fontSize: 'var(--ds-2)', lineHeight: 1.55 }}>
            הטקסט על השבב הוא הנוסח המלא, מילה במילה, בלי קיצור ובלי השמטה.
            אפשר לקרוא אותו כאן באתר לפני שקונים, ולהשוות למקור.
          </blockquote>
          <figcaption className="mt-7 flex items-center gap-4">
            <span style={{ width: 34, height: 1, background: 'var(--accent)' }} />
            <Link
              href="/blessings"
              className="link-u"
              style={{ fontSize: 'var(--fs-sm)', color: 'var(--accent-deep)' }}
            >
              לקריאת חמשת הנוסחים ←
            </Link>
          </figcaption>
        </figure>

        {/* עמודי ביטחון */}
        <div className="flex flex-col">
          {PILLARS.map((p, i) => (
            <div
              key={p.title}
              className="reveal flex gap-6 py-8"
              style={{
                ['--d' as string]: `${i * 90}ms`,
                borderTop: '1px solid var(--line)',
                borderBottom: i === PILLARS.length - 1 ? '1px solid var(--line)' : undefined,
              }}
            >
              <span style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 3 }}>
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.15"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  {p.icon}
                </svg>
              </span>
              <div>
                <h3 className="display t-3">{p.title}</h3>
                <p className="mt-2" style={{ fontSize: 'var(--fs-base)', color: 'var(--ink-2)', lineHeight: 1.75 }}>
                  {p.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
