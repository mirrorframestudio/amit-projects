import Link from 'next/link';
import Image from 'next/image';
import {
  CATEGORIES,
  ACTIVE_CATEGORIES,
  productsByCategory,
  priceRange,
  formatPrice,
} from '@/lib/catalog';
import SectionPhoto from '@/components/SectionPhoto';

/**
 * הקטגוריות הפעילות - נקודת הכניסה לקטלוג.
 *
 * במובייל הכרטיס הוא שורה אופקית ולא כרטיס אנכי. הגרסה האנכית
 * נמדדה בכ-490 פיקסלים לכרטיס - תמונה ביחס 4:3 ברוחב מלא, ריפוד
 * של 28 ותיאור בן שלוש שורות - כלומר במסך של 743 נכנסה קטגוריה
 * אחת בכל פעם, וצריך היה לגלול כדי לדעת שיש עוד. בשורה אופקית
 * הכרטיס יורד לכ-120 פיקסל ושלוש הקטגוריות נראות יחד.
 *
 * התיאור יורד במובייל. הוא השורה הכי יקרה בגובה והכי פחות נחוצה
 * ברשימת בחירה - מי שרוצה לדעת עוד נכנס לקטגוריה.
 */
export default function Categories() {
  return (
    <section className="on-photo relative py-9 md:py-32">
      <SectionPhoto src="/worn/scene-doorway.jpg" mode="band" flip veil={0.22} />

      <div className="shell relative">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow reveal">הקטלוג</p>
            <h2 className="display t-1 mt-4">
              <span className="mask-line">
                <span>איפה תרצו לענוד אותה</span>
              </span>
            </h2>
          </div>
          <p className="lede reveal max-w-sm" style={{ ['--d' as string]: '110ms' }}>
            אותו שבב, שתי דרכים לשאת אותו. ההבדל הוא בפרופיל, במשקל ובמקום שבו
            העין נופלת עליו.
          </p>
        </div>

        <div className="mt-8 grid gap-3 md:mt-14 md:grid-cols-2 md:gap-6">
          {ACTIVE_CATEGORIES.map((id, i) => {
            const cat = CATEGORIES[id];
            const products = productsByCategory(id);
            const hero = products.find((p) => p.featured) ?? products[0];
            const range = priceRange(id);

            return (
              <Link
                key={id}
                href={`/categories/${id}`}
                className="card reveal group flex flex-row items-stretch md:flex-col"
                style={{ ['--d' as string]: `${i * 110}ms` }}
              >
                <div
                  className="tile relative w-[112px] flex-shrink-0 md:w-auto"
                  style={{ aspectRatio: '1 / 1' }}
                >
                  {hero && (
                    <Image
                      src={hero.image}
                      alt={cat.title}
                      fill
                      sizes="(max-width: 768px) 112px, 46vw"
                      className="object-contain p-[7%] transition-transform duration-700 group-hover:scale-[1.05]"
                    />
                  )}
                </div>

                <div className="flex flex-1 flex-col justify-center p-4 md:justify-start md:p-7">
                  <div className="flex items-baseline justify-between">
                    <h3 className="display t-2">{cat.title}</h3>
                    <span className="num" style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-3)' }}>
                      {products.length} דגמים
                    </span>
                  </div>

                  <p className="mt-1" style={{ fontSize: 'var(--fs-xs)', letterSpacing: '.12em', color: 'var(--ink-3)' }}>
                    {cat.subtitle}
                  </p>

                  <p
                    className="mt-4 hidden flex-1 md:block"
                    style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-2)', lineHeight: 1.7 }}
                  >
                    {cat.blurb}
                  </p>

                  <div
                    className="mt-3 flex items-center justify-between md:mt-6 md:pt-5"
                    style={{ borderTop: '1px solid var(--line)', borderTopWidth: undefined }}
                  >
                    <span className="num" style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-3)' }}>
                      {formatPrice(range.min)} - {formatPrice(range.max)}
                    </span>
                    <span
                      className="link-u"
                      style={{ fontSize: 'var(--fs-sm)', color: 'var(--accent)', letterSpacing: '.03em' }}
                    >
                      לצפייה ←
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
