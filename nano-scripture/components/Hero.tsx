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
 *
 * בטלפון הצילום והטקסט לא יושבים זה על זה.
 *
 * הגרסה הקודמת הניחה את הטקסט על החלק התחתון של הצילום מאחורי צעיף
 * שמנת. עמית ואחיו ראו בשני טלפונים שונים שלא רואים את הפנים של
 * הגבר ואת התכשיטים - ומדידה אישרה: התליונים יושבים ב-44% מגובה
 * הפריים, בדיוק איפה שהצעיף כבר אטום ב-90%. אין נקודה שבה גם הטקסט
 * קריא וגם התכשיטים גלויים בפריים 9:16 שנושא כותרת.
 *
 * לכן בטלפון הצילום הוא ריבוע - חתך שמראה את שני הפנים, שני
 * התליונים והצמיד (נמדד ב-360, 375, 390 ו-430 פיקסלים) - והטקסט
 * מתחתיו על הרקע, בלי צעיף. הכפתור יושב על קו הקיפול ב-375×812
 * ומעליו בטלפונים גדולים יותר; זה המחיר של צילום שרואים.
 * ------------------------------------------------------------------
 */
export default function Hero() {
  return (
    <section
      // pt-24 בטלפון: הכותרת הקבועה (96px) יושבת מעל התוכן, ובלי הריווח
      // היא מכסה בדיוק את הפנים. במסך רחב הצילום ממלא הכול וזה רצוי
      className="relative overflow-hidden pt-24 md:min-h-[var(--hero-h)] md:pt-0"
      style={{ ['--hero-h' as string]: 'min(88vh, 780px)' }}
    >
      {/* בטלפון: ריבוע בזרימה. במסך רחב: ממלא את המקטע מאחורי הטקסט */}
      <div className="relative aspect-square w-full md:absolute md:inset-0 md:aspect-auto">
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
            alt="זוג עונד שרשרת עץ החיים, שרשרת מגן דוד וצמיד - כולם עם השבב הכחול"
            fetchPriority="high"
            decoding="async"
            // 18%: הפנים בשליש העליון של הפריים, הצמיד ב-62%. החתך
            // מתחיל מעט מתחת לקצה כדי ששניהם ייכנסו
            className="absolute inset-0 h-full w-full object-cover object-[50%_18%] md:object-center"
          />
        </picture>

        {/* צעיף אופקי מימין, רק במסך רחב */}
        <div
          aria-hidden
          className="absolute inset-0 hidden md:block"
          style={{
            background:
              'linear-gradient(to left, var(--bg) 40%, color-mix(in oklab, var(--bg) 78%, transparent) 58%, transparent 78%)',
          }}
        />
      </div>

      <div className="shell relative md:flex md:min-h-[inherit] md:items-center">
        <div className="w-full pb-14 pt-7 md:w-[46%] md:py-24">
          {/* בלי תווית מעל הכותרת. "כסף 925 · צריבת ננו · הנוסח המלא"
              ישבה כאן באותיות מרווחות, והכותרת אומרת את זה טוב יותר */}
          <h1
            className="display"
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

          {/* המקורות בשורה אחת עם נקודות, ולא ברשימה עם כוכביות.
              הכוכבית היא סימן היכר של עיצוב מיוצר, ורשימה של חמישה
              פריטים בשתי עמודות תפסה גובה של פסקה כדי לומר משפט אחד */}
          <p
            className="reveal load mt-6"
            style={{
              ['--d' as string]: '580ms',
              fontSize: 'var(--fs-xs)',
              color: 'var(--ink-3)',
              lineHeight: 1.9,
              letterSpacing: '.02em',
            }}
          >
            {SOURCES.join(' · ')}
          </p>
        </div>
      </div>
    </section>
  );
}
