import Image from 'next/image';
import type { Blessing } from '@/lib/blessings';
import { photoFor, sceneFocus, type Product } from '@/lib/catalog';
import { wornFor, wornFocus } from '@/lib/worn';

/**
 * התוכן המסביר בעמוד המוצר: פסקה, תמונה, פסקה, תמונה.
 *
 * התוכן הזה היה קיים - אבל ב־/craft, כלומר בעמוד שצריך לנווט אליו.
 * מי שנוחת על דף מוצר מפרסומת לא יגיע לשם. בסריקה של החנות המובילה
 * בקטגוריה יושבים חמישה בלוקים מאוירים כאלה בתוך דף המוצר עצמו,
 * מתחת לקופסת הקנייה ומעל השאלות הנפוצות.
 *
 * ארבעת הבלוקים עונים על ההתנגדויות בסדר שבו הן עולות: מה בעצם
 * קניתי, כמה זה קטן, איך אני יודע שזה שם, ומה יגיע אליי. אין כאן
 * טענה שלא נבדקה - כל מספר נגזר מהנוסח עצמו או מהמפרט.
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
  for (const s of product.scenes ?? []) push(s, sceneFocus(s));

  const BLOCKS = [
    {
      eyebrow: 'מה נצרב',
      title: 'הנוסח השלם, לא שורה ממנו',
      body: [
        `על השבב נצרב הנוסח המלא של ${b.plain} - ${b.chars.toLocaleString('he-IL')} תווים, ${b.words} מילים - בלי קיצור ובלי השמטה.`,
        'אפשר לקרוא אותו במלואו כאן באתר לפני הרכישה, ולהשוות אותו למקור.',
      ],
    },
    {
      eyebrow: 'קנה מידה',
      title: 'חצי מילימטר רבוע',
      body: [
        'שטח הכתיבה בפועל הוא כחצי מילימטר רבוע, כשליש מראש סיכה. גובה האות הוא כתשעה מיקרון - כשמינית מעובי שערת אדם.',
        'הכתב אינו מודפס על פני השטח אלא חרוט לתוך החומר, ולכן לא ידהה ולא יימחק.',
      ],
    },
    {
      eyebrow: 'איך יודעים',
      title: 'הטקסט שם גם כשלא רואים אותו',
      body: [
        'הזכוכית המגדלת שבקופסה מראה את מרקם השורות ואת גבולות השבב, אבל לא את האותיות עצמן - לשם נדרשת הגדלה של פי 500 לפחות.',
        'זו בדיוק הנקודה. הנוסח מוצג כאן במלואו לפני שקונים, וכל שבב מושווה לקובץ המקור תו אחר תו לפני שהוא יוצא.',
      ],
    },
    {
      eyebrow: 'מה מגיע',
      title: 'הקופסה, הכרטיס והזכוכית',
      body: [
        'התכשיט מגיע בקופסה מרופדת, לצד כרטיס שנושא את שם הנוסח ואת המקורות שממנו הוא לקוח.',
        'זכוכית מגדלת כלולה בכל הזמנה, כדי שאפשר יהיה להביט בשבב מקרוב ברגע הפתיחה.',
      ],
    },
  ];

  return (
    <section className="pb-8 pt-4">
      <div className="shell">
        {BLOCKS.map((block, i) => {
          const photo = pool.length ? pool[i % pool.length] : null;

          return (
            <div
              key={block.title}
              className="story-row reveal"
              data-flip={i % 2 === 1 ? 'true' : undefined}
              style={{ borderTop: i === 0 ? undefined : '1px solid var(--line)' }}
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
