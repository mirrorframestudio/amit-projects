import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import { PRODUCTS, ACTIVE_CATEGORIES, uniqueDesigns } from '@/lib/catalog';
import SectionPhoto from '@/components/SectionPhoto';

/**
 * שורת מוצרים מיד אחרי ההירו.
 * מבקר שמגיע מפרסום צריך לראות מחירים תוך שנייה, לא אחרי חמישה מסכים.
 */
export default function Bestsellers() {
  const picks = uniqueDesigns([
    ...PRODUCTS.filter((p) => p.featured),
    ...PRODUCTS.filter((p) => !p.featured),
  ]).slice(0, 8);

  return (
    <section className="on-photo relative py-20 md:py-24">
      <SectionPhoto src="/worn/scene-window.jpg" mode="band" veil={0.22} />

      <div className="shell relative">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow reveal">הנמכרים ביותר</p>
            <h2 className="display t-1 mt-3">
              <span className="mask-line">
                <span>מאיפה מתחילים</span>
              </span>
            </h2>
          </div>
          <Link
            href={`/categories/${ACTIVE_CATEGORIES[0]}`}
            className="btn-ghost link-u reveal"
            style={{ fontSize: '.86rem' }}
          >
            לכל הדגמים ←
          </Link>
        </div>

        {/* במסך צר זו רצועה נגללת, בשולחני זו רשת */}
        <div
          className="no-scrollbar -mx-[4vw] flex snap-x snap-mandatory gap-4 overflow-x-auto px-[4vw] md:mx-0 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0 lg:grid-cols-4"
        >
          {picks.map((p, i) => (
            <div key={p.slug} className="w-[76vw] flex-shrink-0 snap-start sm:w-[46vw] md:w-auto">
              <ProductCard product={p} index={i} priority={i < 4} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
