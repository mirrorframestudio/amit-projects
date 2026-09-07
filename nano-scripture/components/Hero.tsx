import Link from 'next/link';
import { BRAND } from '@/lib/brand';
import { BLESSINGS, LONGEST_BLESSING_CHARS } from '@/lib/blessings';

/**
 * המקורות, ולא המדיניות.
 *
 * כאן ישבו קודם משלוח, אחריות והחזרה - בדיוק שלושת הפריטים שרצועת
 * האמון שמתחת להירו כבר אומרת, כלומר חזרה ולא תוספת. הסקיל דורש
 * אלמנט של הוכחה מעל הקיפול, ולמותג בלי לקוחות עדיין אין ביקורות.
 * מה שכן יש הוא סמכות המקור: הנוסחים אינם כתובים כאן, הם מצוטטים.
 */
const SOURCES = BLESSINGS.map((b) => {
  const parts = b.sources.split(' · ');
  // המקור הראשון אינו תמיד ציטוט. בברכת התינוק הוא "ברכה לתינוק",
  // תיאור ולא מקור, וברצועה שכל תפקידה סמכות זה מחליש. נבחר החלק
  // שנושא מספר פרק בגרשיים - כלומר הפניה אמיתית
  return parts.find((x) => /[׳״]/.test(x)) ?? parts[parts.length - 1];
});

/**
 * הירו: צילום מלא־רוחב, וטקסט יושב על צעיף שמנת בצד ימין.
 *
 * ------------------------------------------------------------------
 * כאן ישב סרטון, והוא הוחלף בצילום.
 *
 * הסרטון היה דחיפה אל תוך השבב, ומעבר לשנייה השלישית לא היה לו
 * חומר: הצילומים נופחו פי 2 עד פי 39, והדבר היחיד שנשאר חד היה
 * שכבת טקסט מסונתזת. צילום של שני אנשים שעונדים שלושה מוצרים
 * אומר יותר, ונטען בשליש מהמשקל.
 *
 * שני קבצים ולא אחד שנחתך: 16:9 לרוחב ו-9:16 לטלפון. בקובץ יחיד
 * object-cover זרק 70% מהפריים באייפון 14 - נמדד. source עם media
 * מגיש לכל מסך את מה שנבנה בשבילו, והבחירה נעשית לפני ההורדה.
 * ------------------------------------------------------------------
 */
export default function Hero() {
  return (
    <section className="relative overflow-hidden" style={{ minHeight: 'min(88vh, 780px)' }}>
      {/* picture ולא Image של Next: המקור נבחר לפי media, כך שטלפון
          לא מוריד את הקובץ הרחב בכלל. הדפדפן בוחר לפני ההורדה */}
      <picture>
        <source
          media="(max-width: 767px)"
          srcSet="/hero/hero-portrait.webp"
          type="image/webp"
        />
        <source media="(max-width: 767px)" srcSet="/hero/hero-portrait.jpg" />
        <source srcSet="/hero/hero-landscape.webp" type="image/webp" />
        <img
          src="/hero/hero-landscape.jpg"
          alt=""
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
          aria-hidden
        />
      </picture>

      {/* צעיף: אנכי במסך צר, אופקי מימין במסך רחב */}
      <div
        aria-hidden
        className="absolute inset-0 md:hidden"
        style={{
          background:
            // 56% היו נכונים לסרטון, שבו התליון ישב גבוה בפריים.
            // בצילום הזוג התכשיטים יושבים ב-44% עד 62% מהגובה, ומדדתי
            // שהצעיף הישן בלע את שלושתם - בטלפון לא נראה ולו תכשיט
            // אחד. 42% משאירים את שני התליונים גלויים ועדיין נותנים
            // לטקסט 58% מהגובה. הצמיד נופל מתחת לצעיף, וזו הפשרה
            // שאין ממנה מנוס בפריים 9:16 שנושא גם כותרת
            'linear-gradient(to top, var(--bg) 42%, color-mix(in oklab, var(--bg) 80%, transparent) 62%, transparent 80%)',
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 hidden md:block"
        style={{
          background:
            'linear-gradient(to left, var(--bg) 40%, color-mix(in oklab, var(--bg) 78%, transparent) 58%, transparent 78%)',
        }}
      />

      <div className="shell relative flex min-h-[inherit] items-end pb-14 md:items-center md:pb-0">
        <div className="w-full py-16 md:w-[46%] md:py-24">
          <p className="eyebrow mask-line load" style={{ color: 'var(--accent-deep)' }}>
            <span>כסף 925 · צריבת ננו · הנוסח המלא</span>
          </p>

          <h1
            className="display mt-4"
            style={{ fontSize: 'var(--ds-hero)', fontWeight: 700, lineHeight: 1.05 }}
          >
            <span className="mask-line load">
              <span>כל הנוסח.</span>
            </span>
            <span className="mask-line load">
              <span style={{ ['--d' as string]: '120ms' }}>לא שורה ממנו.</span>
            </span>
          </h1>

          <p
            className="reveal load mt-5"
            style={{
              ['--d' as string]: '300ms',
              fontSize: 'var(--ds-3)',
              fontWeight: 400,
              color: 'var(--ink-2)',
            }}
          >
            עד <span className="num">{LONGEST_BLESSING_CHARS.toLocaleString('he-IL')}</span> תווים
            נצרבים על שטח של חצי מילימטר רבוע. חמישה נוסחים - אחד שלכם.
          </p>

          <div
            className="reveal load mt-8 flex flex-wrap items-center gap-4"
            style={{ ['--d' as string]: '440ms' }}
          >
            <Link href="/blessings" className="btn btn-solid" style={{ ['--pad' as string]: '1.05rem 2.6rem', fontSize: 'var(--fs-base)' }}>
              לבחירת הברכה
            </Link>
            <Link href="/categories/necklaces" className="btn">
              לקטלוג
            </Link>
          </div>

          <ul
            className="reveal load mt-9 flex flex-wrap gap-x-7 gap-y-2"
            style={{ ['--d' as string]: '580ms', fontSize: 'var(--fs-xs)', color: 'var(--ink-3)' }}
          >
            {SOURCES.map((m) => (
              <li key={m} className="flex items-center gap-2">
                <span aria-hidden style={{ color: 'var(--accent)' }}>✦</span>
                {m}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
