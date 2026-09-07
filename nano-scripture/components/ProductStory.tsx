import Image from 'next/image';
import type { Blessing } from '@/lib/blessings';
import { photoFor, sceneFocus, MATERIALS, CHIP_SPEC, type Product } from '@/lib/catalog';
import { wornFor, wornFocus } from '@/lib/worn';

/**
 * התוכן המסביר בעמוד המוצר: פסקה, תמונה, פסקה, תמונה.
 *
 * התוכן הזה היה קיים - אבל ב־/craft, כלומר בעמוד שצריך לנווט אליו.
 * מי שנוחת על דף מוצר מפרסומת לא יגיע לשם. בסריקה של החנות המובילה
 * בקטגוריה יושבים חמישה בלוקים מאוירים כאלה בתוך דף המוצר עצמו,
 * מתחת לקופסת הקנייה ומעל השאלות הנפוצות.
 *
 * שבעת הבלוקים עונים על ההתנגדויות בסדר שבו הן עולות: מה בעצם
 * קניתי, למי זה מתאים, כמה זה קטן, איך אני יודע שזה שם, ממה זה
 * עשוי, איך חיים איתו ומה יגיע אליי. אין כאן טענה שלא נבדקה - כל
 * מספר נגזר מהנוסח עצמו, מהמפרט של הדגם או מהמדיניות.
 *
 * התמונות נפרסות במרווחים ולא במחזוריות: לדגם אחד יש שש ולאחר
 * אחת, ומודולו היה גורם לאותה תמונה להופיע שלוש פעמים באותו עמוד.
 * בלוק שלא נפלה בו תמונה נפרס לרוחב, במידת קריאה ממורכזת.
 */
export default function ProductStory({
  product,
  blessing: b,
}: {
  product: Product;
  blessing: Blessing;
}) {
  const worn = wornFor(product.slug);
  const lead = photoFor(product);

  // בריכת התמונות לבלוקים, בלי כפילות ובלי להסתמך על מה שאין
  const pool: { src: string; focus: string }[] = [];
  const push = (src?: string | null, focus = '50% 50%') => {
    if (src && !pool.some((p) => p.src === src)) pool.push({ src, focus });
  };
  push(worn?.file, wornFocus(worn, product.slug));
  push(lead?.src, lead?.focus);
  for (const s of product.scenes ?? []) push(s, sceneFocus(s, product.slug));
  // מוצא אחרון: צילום המוצר עצמו. לשני דגמים אין עדיין שום צילום
  // אחר, ובלי זה העמוד שלהם היה טקסט בלבד
  push(product.image);

  const spec = (label: string) => product.specs.find((x) => x.label === label)?.value;
  const mat = MATERIALS[product.material];

  const BLOCKS = [
    {
      eyebrow: 'מה נצרב',
      title: 'הנוסח השלם, לא שורה ממנו',
      body: [
        `על השבב שבתוך ${product.name} נצרב הנוסח המלא של ${b.plain} - ${b.chars.toLocaleString('he-IL')} תווים, ${b.words} מילים - בלי קיצור ובלי השמטה.`,
        `הנוסח מלוקט מ${b.sources}, ונפתח במילים "${b.opening}" (${b.openingSource}).`,
        'אפשר לקרוא אותו כאן במלואו לפני הרכישה ולהשוות אותו למקור. זה לא ציטוט שנבחר כדי להיכנס לשטח - זה הנוסח כפי שהוא.',
      ],
    },
    {
      eyebrow: 'למי זה מתאים',
      title: b.forWhom,
      body: [
        b.blurb,
        `הנוסח הזה נבחר בעיקר ל${b.gift.split(' · ').join(', ל')}.`,
        'אותו דגם נושא נוסחים אחרים, וכל אחד מהם משנה למי הפריט מדבר. הבחירה נעשית לפני הצריבה, ואפשר לקרוא את כולם ולהשוות.',
      ],
    },
    {
      eyebrow: 'קנה מידה',
      title: 'חצי מילימטר רבוע',
      body: [
        `השבב עצמו הוא ${CHIP_SPEC[0].value.split(' · ')[0]}, ושטח הכתיבה בפועל הוא כחצי מילימטר רבוע - כשליש מראש סיכה.`,
        'גובה האות הוא כתשעה מיקרון, כשמינית מעובי שערת אדם. הכתב אינו מודפס על פני השטח אלא חרוט לתוך החומר, ולכן לא ידהה ולא יימחק.',
      ],
    },
    {
      eyebrow: 'איך יודעים',
      title: 'הטקסט שם גם כשלא רואים אותו',
      body: [
        'את האותיות אי אפשר לראות בעין, וגם לא בזכוכית מגדלת רגילה. בגובה תשעה מיקרון נדרשת הגדלה של פי 500 לפחות - כלומר מיקרוסקופ.',
        'זו בדיוק הנקודה, ולכן אנחנו לא מבקשים להאמין לנו: הנוסח מוצג כאן במלואו לפני שקונים, המקורות שלו נקובים בשמם, וכל שבב מושווה לקובץ המקור תו אחר תו לפני שהוא משובץ.',
        'הזכוכית המגדלת שבעמוד הזה מראה איך פני השבב נראים תחת הגדלה כזו.',
      ],
    },
    {
      eyebrow: 'החומר',
      title: mat.label,
      body: [
        mat.note,
        [
          spec('גימור') && `הגימור: ${spec('גימור')}.`,
          spec('סוגר') && `הסוגר: ${spec('סוגר')}.`,
        ]
          .filter(Boolean)
          .join(' '),
        'השבב מוגן בחלון אטום שעמיד למים, לזיעה ולתמרוקים. גוף התכשיט הוא סיפור אחר - את המתכת והציפוי כן צריך להרחיק מהם.',
      ].filter(Boolean),
    },
    {
      eyebrow: 'ביומיום',
      title: 'איך זה נלבש',
      body: [
        [spec('אורך השרשרת') && `אורך השרשרת ${spec('אורך השרשרת')}.`, spec('היקף הצמיד') && `היקף הצמיד ${spec('היקף הצמיד')}.`]
          .filter(Boolean)
          .join(' ') || 'הפריט נלבש כמו שהוא, בלי התאמות.',
        'להסיר לפני מקלחת, ים ובריכה - לא בגלל השבב אלא בגלל המתכת. לנקות בבד מיקרופייבר יבש, ולאחסן בקופסה המקורית בנפרד מתכשיטים אחרים.',
        'שנה אחריות על פגמי ייצור והלחמות, וחודשיים על הסוגר שהוא החלק הנע. שבר משימוש אינו באחריות, אבל נשמח לתקן גם אותו - נודיע מראש על העלות.',
      ],
    },
    {
      eyebrow: 'מה מגיע',
      title: 'הקופסה והכרטיס',
      body: [
        'התכשיט מגיע בקופסה מרופדת שמגנה עליו בדרך, לצד כרטיס שנושא את שם הנוסח, את המקורות שממנו הוא לקוח, ואת הנוסח המלא.',
        'שניהם כלולים בכל הזמנה. אריזת מתנה קשיחה, עטופה בבד ועם סרט, היא תוספת בתשלום - מגיעה סגורה ומוכנה למסירה.',
      ],
    },
  ];

  /* תמונה אחת לכל בלוק לכל היותר, פרוסות במרווח שווה על פני הבלוקים */
  const slots = new Map<number, { src: string; focus: string }>();
  const step = BLOCKS.length / Math.max(pool.length, 1);
  pool.forEach((ph, k) => slots.set(Math.min(BLOCKS.length - 1, Math.round(k * step)), ph));

  return (
    <section className="pb-8 pt-4">
      <div className="shell">
        {BLOCKS.map((block, i) => {
          const photo = slots.get(i) ?? null;

          return (
            <div
              key={block.title}
              className="story-row reveal"
              data-flip={photo && i % 2 === 1 ? 'true' : undefined}
              data-wide={photo ? undefined : 'true'}
              style={{
                borderTop: i === 0 || !photo ? undefined : '1px solid var(--line)',
                // בלוק בלי תמונה מקבל משטח משלו. לדגם עם צילום אחד
                // יש חמישה כאלה ברצף, ובלי הבחנה זה קיר טקסט אחד
                background: photo ? undefined : `color-mix(in srgb, ${b.accentSoft} 42%, var(--bg))`,
                borderRadius: photo ? undefined : 'var(--radius-lg)',
                paddingInline: photo ? undefined : '1.5rem',
                marginBlock: photo ? undefined : '.75rem',
              }}
            >
              <div>
                <p className="eyebrow" style={{ color: b.accentInk }}>
                  {block.eyebrow}
                </p>
                <h2 className="display mt-3" style={{ fontSize: 'var(--ds-3)', lineHeight: 1.35 }}>
                  {block.title}
                </h2>
                {block.body.map((line) => (
                  <p
                    key={line}
                    className="mt-4"
                    style={{ fontSize: 'var(--fs-base)', color: 'var(--ink-2)', lineHeight: 1.85 }}
                  >
                    {line}
                  </p>
                ))}
              </div>

              {photo && (
                <div
                  className="relative overflow-hidden"
                  style={{ aspectRatio: '4 / 3', borderRadius: 'var(--radius-lg)' }}
                >
                  <Image
                    src={photo.src}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 92vw, 46vw"
                    style={{ objectPosition: photo.focus }}
                    className="object-cover"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
