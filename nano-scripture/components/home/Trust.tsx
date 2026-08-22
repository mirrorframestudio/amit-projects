const ITEMS = [
  {
    title: 'משלוח חינם מעל ₪450',
    note: '2-3 ימי עסקים, מבוטח',
    icon: <path d="M3 7h11v8H3zM14 10h4l3 3v2h-7zM7.5 18a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2ZM17.5 18a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Z" />,
  },
  {
    title: 'שנה אחריות',
    note: 'שנה מלאה גם על הסוגר והחוליות',
    icon: (
      <>
        <path d="M12 3 4.6 6.3v5.1c0 4.4 3 8.1 7.4 9.2 4.4-1.1 7.4-4.8 7.4-9.2V6.3Z" />
        <path d="m9 12 2.2 2.2L15.5 10" />
      </>
    ),
  },
  {
    title: 'החזרה תוך 30 יום',
    note: 'בלי לשאול שאלות',
    icon: (
      <>
        <path d="M3.5 12a8.5 8.5 0 1 1 2.8 6.3" />
        <path d="M3 7v5h5" />
      </>
    ),
  },
  {
    title: 'הנוסח המלא',
    note: 'לא ציטוט, לא קטע',
    icon: (
      <>
        <path d="M5 4.5h9l5 5v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-14a1 1 0 0 1 1-1Z" />
        <path d="M14 4.5v5h5M7.5 13h9M7.5 16.5h6" />
      </>
    ),
  },
];

/** רצועת ביטחון מתחת להירו — עונה על ההתנגדויות לפני שהן עולות */
export default function Trust() {
  return (
    <section style={{ borderBottom: '1px solid var(--line)', background: 'var(--surface)' }}>
      <div className="shell grid gap-6 py-8 sm:grid-cols-2 lg:grid-cols-4">
        {ITEMS.map((it, i) => (
          <div
            key={it.title}
            className="reveal flex items-center gap-3.5"
            style={{ ['--d' as string]: `${i * 70}ms` }}
          >
            <span style={{ color: 'var(--accent)', flexShrink: 0 }}>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.1"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                {it.icon}
              </svg>
            </span>
            <span>
              <span className="block" style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink)' }}>
                {it.title}
              </span>
              <span className="block" style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-3)' }}>
                {it.note}
              </span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
