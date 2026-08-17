import Image from 'next/image';

/**
 * צילום שיושב מאחורי מקטע שלם.
 *
 * שני מצבים, והבחירה נגזרת מיחס הצילום:
 * - cover ממלא את כל המקטע. מתאים לצילום לאורך או ריבועי.
 * - band מצמיד את הצילום לראש המקטע ביחס המקורי שלו, ומדהה ממנו לקרם.
 *   זה המצב לצילום 16:9: מקטע כמעט ריבועי היה חותך ממנו את שני
 *   השלישים החיצוניים — כלומר בדיוק את הדוגמנים ואת השטח הריק.
 *
 * הצעיף נקבע במדידה: נדגם האזור שמתחת לכותרת, והורכב מולו הדיו.
 * צילום מפתח־גבוה סובל צעיף נמוך בהרבה מצילום שיש בו שיער כהה.
 */
export default function SectionPhoto({
  src,
  position = 'center',
  mode = 'cover',
  ratio = '16 / 9',
  flip = false,
  /** 0–1: כמה קרם מונח מעל. גבוה יותר = הצילום דהוי יותר */
  veil = 0.62,
}: {
  src: string;
  position?: string;
  mode?: 'cover' | 'band';
  ratio?: string;
  /** היפוך אופקי — כדי שהשדה הריק ינחת מתחת לעמודת הטקסט */
  flip?: boolean;
  veil?: number;
}) {
  const cream = `color-mix(in oklab, var(--bg) ${veil * 100}%, transparent)`;

  const photo = (
    <>
      <Image
        src={src}
        alt=""
        fill
        sizes="100vw"
        className="object-cover"
        style={{
          objectPosition: position,
          // ההגדלה בולעת את שולי הטשטוש, אחרת נראית מסגרת בהירה בקצוות
          transform: [flip ? 'scaleX(-1)' : '', mode === 'band' ? '' : 'scale(1.08)']
            .filter(Boolean)
            .join(' ') || undefined,
          filter: mode === 'band' ? 'saturate(.92)' : 'blur(3px) saturate(.82)',
        }}
      />
      <div className="absolute inset-0" style={{ background: cream }} />
    </>
  );

  if (mode === 'band') {
    return (
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-x-0 top-0" style={{ aspectRatio: ratio }}>
          {photo}
          {/* הפס נגמר באמצע המקטע, ולכן הוא חייב להיבלע בקרם ולא להיחתך */}
          <div
            className="absolute inset-x-0 bottom-0"
            style={{
              height: '38%',
              background: 'linear-gradient(to bottom, transparent, var(--bg))',
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {photo}
      {/* דהייה לקרם מלא בתפרים, כדי שהמקטע לא ייחתך בקו חד מול השכן */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to bottom,
            var(--bg) 0%,
            color-mix(in oklab, var(--bg) 30%, transparent) 22%,
            color-mix(in oklab, var(--bg) 30%, transparent) 78%,
            var(--bg) 100%)`,
        }}
      />
    </div>
  );
}
