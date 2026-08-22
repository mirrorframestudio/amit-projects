import { toVerses } from '@/lib/scripture';

/**
 * נוסח מקראי מלא.
 *
 * הגרסה הקודמת הייתה פסקה אחת מיושרת לשני הצדדים - קיר של 1,457 תווים.
 * יישור דו־צדדי בעמודה צרה פותח נהרות לבנים בין המילים, ומשקל 700 על
 * טקסט ארוך מעייף את העין תוך שורה. פסוק בשורה משלו הוא איך שמקרא
 * נקרא ממילא, וזה גם מה שנותן לעמוד קצב.
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
          {!single && (
            <span
              aria-hidden
              className="num"
              style={{
                position: 'absolute',
                insetInlineStart: 0,
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
