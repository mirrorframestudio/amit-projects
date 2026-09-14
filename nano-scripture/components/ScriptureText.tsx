import { toVerses } from '@/lib/scripture';

/**
 * נוסח מקראי מלא.
 *
 * הגרסה הקודמת הייתה פסקה אחת מיושרת לשני הצדדים - קיר של 1,457 תווים.
 * יישור דו־צדדי בעמודה צרה פותח נהרות לבנים בין המילים, ומשקל 700 על
 * טקסט ארוך מעייף את העין תוך שורה. פסוק בשורה משלו הוא איך שמקרא
 * נקרא ממילא, וזה גם מה שנותן לעמוד קצב.
 *
 * ובגופן הספר, לא בגופן הממשק. זה הטקסט שכל האתר קיים בשבילו, והוא
 * נקרא כמו שקוראים אותו בספר - סריף, משקל רגיל, ניקוד שיושב במקומו.
 */
export default function ScriptureText({
  text,
  accent,
  size = '1.12rem',
}: {
  text: string;
  accent: string;
  size?: string;
}) {
  const verses = toVerses(text);
  const single = verses.length === 1;

  return (
    <div
      style={{
        fontFamily: 'var(--font-display)',
        fontSize: size,
        fontWeight: 400,
        lineHeight: single ? 2 : 1.95,
        color: 'var(--ink)',
        textAlign: 'start',
      }}
    >
      {verses.map((v, i) => (
        <p
          key={i}
          style={{
            marginTop: i === 0 ? 0 : '.75em',
            // המספור יושב בשוליים ולא נכנס לזרימת הפסוק
            position: 'relative',
            paddingInlineStart: single ? 0 : '2.1rem',
          }}
        >
          {/* right ולא insetInlineStart: ל-.num יש direction: ltr, ולכן
              inline-start שלו הוא שמאל - והמספור ישב בקצה השמאלי של
              השורה בעוד הריפוד פינה לו מקום מימין. נמדד: 73px משמאל,
              בתוך עמודה שמתחילה ב-833 מימין */}
          {!single && (
            <span
              aria-hidden
              className="num"
              style={{
                position: 'absolute',
                right: 0,
                top: '.42em',
                fontSize: 'var(--fs-2xs)',
                letterSpacing: '.04em',
                color: accent,
                opacity: 0.65,
              }}
            >
              {i + 1}
            </span>
          )}
          {v}
        </p>
      ))}
    </div>
  );
}
