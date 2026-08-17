const WORDS = [
  'כסף 925 ופלדת אל־חלד',
  '✦',
  'ליתוגרפיית קרן יונים',
  '✦',
  '5 ננומטר',
  '✦',
  'חמישה נוסחי ברכה',
  '✦',
  'כרטיס ברכה בקופסה',
  '✦',
  'שנתיים אחריות',
  '✦',
  'משלוח מבוטח',
  '✦',
];

/** רצועה נעה בין ההירו לתוכן — נותנת קצב ומכריזה על הערכים */
export default function Ticker() {
  return (
    <div
      className="hairline overflow-hidden py-5"
      style={{ borderBottom: '1px solid var(--line)', background: 'var(--bg-2)' }}
    >
      <div className="marquee" style={{ ['--dur' as string]: '46s' }}>
        {[0, 1].map((rep) => (
          <div key={rep} className="flex shrink-0 items-center">
            {WORDS.map((w, i) => (
              <span
                key={`${rep}-${i}`}
                style={{
                  padding: '0 1.6rem',
                  fontSize: '.74rem',
                  letterSpacing: '.24em',
                  whiteSpace: 'nowrap',
                  color: w === '✦' ? 'var(--accent)' : 'var(--ink-3)',
                }}
              >
                {w}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
