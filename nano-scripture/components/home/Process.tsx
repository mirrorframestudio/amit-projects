/**
 * ארבעת השלבים.
 *
 * קודם: מספור 01/02/03/04 באותיות מרווחות, וקו התקדמות שמתמלא בזהב
 * עם הגלילה דרך framer-motion. שניהם תבנית - וקו שמתמלא בגלילה היה
 * גם התלות היחידה של האתר בספריית אנימציה שלמה.
 *
 * עכשיו: אותיות עבריות, כמו בכל רשימה אחרת באתר, וקו דק אחד.
 */
const LETTERS = ['א', 'ב', 'ג', 'ד'];

const STEPS = [
  {
    title: 'הכנת הפרוסה',
    body: 'פרוסת סיליקון מלוטשת עד לחספוס של פחות מננומטר אחד, ומצופה בשכבת זהב דקה. פגם בפני השטח יפסול את השבב בהמשך.',
  },
  {
    title: 'צריבת הכתב',
    body: 'קרן יונים ממוקדת חורטת את הטקסט אות אחר אות, בגובה אות של כתשעה מיקרון. התהליך מתבצע בחדר נקי בוואקום מלא.',
  },
  {
    title: 'אימות ובקרה',
    body: 'הכתב שעל השבב מושווה לנוסח המקור, תו אחר תו. שבב שסוטה ולו בתו אחד - נפסל.',
  },
  {
    title: 'שיבוץ וגימור',
    // "מספר סידורי ותעודה" ישב כאן, ודף האמת אומר שאין תעודה. ירד
    body: 'צורף משבץ את השבב בגוף התכשיט מתחת לחלון ספיר, אוטם אותו, ומלטש את המתכת ביד.',
  },
];

export default function Process() {
  return (
    <section className="py-9 md:py-28">
      <div className="shell grid gap-16 lg:grid-cols-[.85fr_1.15fr] lg:gap-24">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <h2 className="display t-1">
            <span className="mask-line">
              <span>אות אחת</span>
            </span>
            <span className="mask-line">
              <span className="accent-text" style={{ ['--d' as string]: '110ms' }}>
                בכל פעם
              </span>
            </span>
          </h2>
          <p className="lede reveal mt-7 max-w-sm" style={{ ['--d' as string]: '180ms' }}>
            ארבעה שלבים, אף אחד מהם לא ממוכן במלואו. השבב נולד במעבדה - התכשיט
            נולד על שולחן הצורף.
          </p>
        </div>

        <ol className="flex flex-col">
          {STEPS.map((s, i) => (
            <li
              key={s.title}
              className="reveal grid grid-cols-[2.4rem_1fr] gap-x-4 py-8 md:py-10"
              style={{ ['--d' as string]: `${i * 60}ms`, borderTop: '1px solid var(--line)' }}
            >
              <span
                aria-hidden
                className="display"
                style={{ fontSize: 'var(--ds-3)', lineHeight: 1.2, color: 'var(--accent-deep)' }}
              >
                {LETTERS[i]}
              </span>
              <div>
                <h3 className="display t-2">{s.title}</h3>
                <p className="lede mt-4 max-w-xl" style={{ fontSize: 'var(--fs-md)' }}>
                  {s.body}
                </p>
              </div>
            </li>
          ))}
          <li aria-hidden style={{ borderTop: '1px solid var(--line)' }} />
        </ol>
      </div>
    </section>
  );
}
