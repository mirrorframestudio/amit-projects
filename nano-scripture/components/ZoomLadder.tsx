import Image from 'next/image';

/**
 * סולם ההתקרבות: מהתכשיט שעל הגוף עד האותיות.
 *
 * כאן ישבו שלושה גופים אפורים מופשטים - מלבן מעוגל בשם "גרגר אורז",
 * עיגול בשם "ראש סיכה" וריבוע קטן. הם היו ביחס גודל נכון, אבל צורה
 * אפורה אינה גרגר אורז, והמסך לא מסר שום תחושה של קוטן.
 *
 * במקום זה, שלושה שלבים. שניים הראשונים הם אותו צילום בשתי דרגות
 * התקרבות - כלומר לא הדמיה אלא זום - והשלישי הוא פני השבב.
 *
 * היה כאן שלב רביעי בהגדלה של פי תשעה, והוא ירד: לצילום אין רזולוציה
 * לכך, והתוצאה נראתה כתמונה מטושטשת ולא כחלון כתיבה. עדיף שלושה
 * שלבים אמיתיים מארבעה שאחד מהם מזייף.
 *
 * המידות אמיתיות: התכשיט כ־20 מ״מ, השבב 5 מ״מ, האות 0.009 מ״מ.
 */
const STEPS = [
  { label: 'התכשיט', size: 'כ־20 מ״מ', scale: 1, x: '50%', y: '50%' },
  { label: 'המשבצת', size: 'כ־5 מ״מ', scale: 3.2, x: '50%', y: '52%' },
];

/**
 * טאיל בודד: הצילום מוגדל אל המשבצת, עם מסגרת וכיתוב מידה.
 * לגלריה הריבועית בדף המוצר, שאין בה מקום לשלושה שלבים.
 */
export function ZoomTile({ photo, accent }: { photo: string; accent: string }) {
  return (
    <figure className="relative h-full w-full overflow-hidden">
      <Image
        src={photo}
        alt=""
        fill
        sizes="(max-width: 1024px) 92vw, 46vw"
        className="object-cover"
        style={{ objectPosition: '50% 52%', transform: 'scale(3.2)', transformOrigin: '50% 52%' }}
      />
      <figcaption
        className="absolute inset-x-0 bottom-0 flex items-baseline justify-between px-5 py-3.5"
        style={{ background: 'linear-gradient(to top, rgb(22 21 15 / .82), transparent)', color: '#fff' }}
      >
        <span style={{ fontSize: 'var(--fs-sm)' }}>השבב במשבצת</span>
        <span className="num" style={{ fontSize: 'var(--fs-xs)', opacity: 0.85 }}>
          5 מ״מ · הכתב על 0.7 מ״מ ממנו
        </span>
      </figcaption>
      <span
        aria-hidden
        className="absolute"
        style={{
          left: '50%',
          top: '52%',
          width: '14%',
          height: '14%',
          transform: 'translate(-50%, -50%)',
          border: `1.5px solid ${accent}`,
          borderRadius: 2,
        }}
      />
    </figure>
  );
}

export default function ZoomLadder({
  photo,
  focus = '50% 50%',
  accent,
  children,
}: {
  photo: string;
  focus?: string;
  accent: string;
  /** השלב האחרון - פני השבב, שאינו צילום אלא רינדור */
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
      {STEPS.map((step, i) => (
        <figure
          key={step.label}
          className="reveal relative overflow-hidden"
          style={{
            ['--d' as string]: `${i * 90}ms`,
            aspectRatio: '1 / 1',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--line)',
          }}
        >
          <Image
            src={photo}
            alt=""
            fill
            sizes="(max-width: 640px) 46vw, 25vw"
            className="object-cover"
            style={{
              objectPosition: i === 0 ? focus : `${step.x} ${step.y}`,
              transform: `scale(${step.scale})`,
              transformOrigin: `${step.x} ${step.y}`,
            }}
          />

          {/* מסגרת שמסמנת לאן נכנסים בשלב הבא */}
          {i < STEPS.length - 1 && (
            <span
              aria-hidden
              className="absolute"
              style={{
                left: '50%',
                top: '52%',
                width: '31%',
                height: '31%',
                transform: 'translate(-50%, -50%)',
                border: `1.5px solid ${accent}`,
                borderRadius: 2,
                boxShadow: '0 0 0 9999px rgb(22 21 15 / .28)',
              }}
            />
          )}

          <figcaption
            className="absolute inset-x-0 bottom-0 flex items-baseline justify-between px-3.5 py-2.5"
            style={{
              background: 'linear-gradient(to top, rgb(22 21 15 / .82), transparent)',
              color: '#fff',
            }}
          >
            <span style={{ fontSize: 'var(--fs-xs)' }}>{step.label}</span>
            <span className="num" style={{ fontSize: 'var(--fs-2xs)', opacity: 0.85 }}>
              {step.size}
            </span>
          </figcaption>
        </figure>
      ))}

      {/* השלב הרביעי: כאן כבר יש כתב */}
      <figure
        className="reveal relative overflow-hidden"
        style={{
          ['--d' as string]: '270ms',
          aspectRatio: '1 / 1',
          borderRadius: 'var(--radius-lg)',
          border: `1px solid ${accent}`,
        }}
      >
        {children}
        <figcaption
          className="pointer-events-none absolute inset-x-0 bottom-0 flex items-baseline justify-between px-3.5 py-2.5"
          style={{
            background: 'linear-gradient(to top, rgb(22 21 15 / .88), transparent)',
            color: '#fff',
          }}
        >
          <span style={{ fontSize: 'var(--fs-xs)' }}>הכתב · העבירו את הסמן</span>
          <span className="num" style={{ fontSize: 'var(--fs-2xs)', opacity: 0.85 }}>
            0.009 מ״מ
          </span>
        </figcaption>
      </figure>
    </div>
  );
}
