import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import ProductCard from '@/components/ProductCard';
import FeaturedCard from '@/components/FeaturedCard';
import CategoryNav from '@/components/CategoryNav';
import SectionPhoto from '@/components/SectionPhoto';
import {
  CATEGORIES,
  ACTIVE_CATEGORIES,
  productsByCategory,
  categoryPhotos,
  categoryBanner,
  priceRange,
  formatPrice,
  type CategoryId,
} from '@/lib/catalog';
import { BLESSINGS } from '@/lib/blessings';

export function generateStaticParams() {
  return ACTIVE_CATEGORIES.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cat = CATEGORIES[slug as CategoryId];
  if (!cat || !ACTIVE_CATEGORIES.includes(cat.id)) return {};
  return { title: cat.title, description: cat.blurb };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const id = slug as CategoryId;
  const cat = CATEGORIES[id];
  if (!cat || !ACTIVE_CATEGORIES.includes(id)) notFound();

  const products = productsByCategory(id);
  const range = priceRange(id);
  const photos = categoryPhotos(id);
  const banner = categoryBanner(id);
  // הבאנר כבר מוצג למעלה; פס השבירה לוקח צילומים אחרים
  const breakPhotos = photos.filter((src) => src !== banner);

  // הדגם המוביל יוצא מהרשת ומקבל כרטיס כפול. השאר נשארים אחידים.
  const featured = products.find((p) => p.featured) ?? products[0];
  const rest = products.filter((p) => p.slug !== featured?.slug);

  // שבירה אחרי השורה הראשונה: רצף של שתים־עשרה משבצות זהות מאבד את העין
  const BREAK_AFTER = 3;
  const beforeBreak = rest.slice(0, BREAK_AFTER);
  const afterBreak = rest.slice(BREAK_AFTER);

  return (
    <>
      {/* ---------- כותרת הקטגוריה, על צילום ---------- */}
      <section className="relative overflow-hidden pt-36 pb-14">
        {banner && <SectionPhoto src={banner} mode="band" ratio="16 / 7" veil={0.4} />}

        <div className="shell relative">
          <nav className="mb-8 flex items-center gap-3" style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-3)' }}>
            <Link href="/" className="link-u">בית</Link>
            <span>/</span>
            <span style={{ color: 'var(--accent)' }}>{cat.title}</span>
          </nav>

          <div className="max-w-2xl">
            <p className="eyebrow reveal load">{cat.subtitle}</p>
            <h1 className="display t-hero mt-4">
              <span className="mask-line load">
                <span>{cat.title}</span>
              </span>
            </h1>
            <p className="lede reveal load mt-7 max-w-xl" style={{ ['--d' as string]: '220ms' }}>
              {cat.blurb}
            </p>
            <p className="reveal load mt-6" style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-2)' }}>
              <span className="num">{products.length}</span> דגמים · מ־
              <span className="num">{formatPrice(range.min)}</span> עד{' '}
              <span className="num">{formatPrice(range.max)}</span> · כל דגם עם כל אחת מ־
              <span className="num">{BLESSINGS.length}</span> הברכות
            </p>
          </div>

          <div className="mt-12">
            <CategoryNav current={id} />
          </div>
        </div>
      </section>

      {/* ---------- הדגם המוביל והשורה הראשונה ---------- */}
      <section className="pb-4">
        <div className="shell">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured && <FeaturedCard product={featured} />}
            {beforeBreak.map((p, i) => (
              <ProductCard key={p.slug} product={p} index={i} priority />
            ))}
          </div>
        </div>
      </section>

      {/* ---------- שבירה: זוג צילומים ושורת ברכה ---------- */}
      {breakPhotos.length >= 2 && (
        <section className="py-16 md:py-24">
          <div className="shell grid items-center gap-8 md:grid-cols-[1fr_.85fr_1fr]">
            <div
              className="reveal relative overflow-hidden"
              style={{ aspectRatio: '4/5', borderRadius: 'var(--radius-lg)' }}
            >
              <Image src={breakPhotos[0]} alt="" fill sizes="30vw" className="object-cover" />
            </div>

            <div className="reveal text-center" style={{ ['--d' as string]: '120ms' }}>
              <p className="eyebrow">אותו תכשיט</p>
              <p className="display t-3 mt-4" style={{ lineHeight: 1.4 }}>
                מה שמשתנה הוא הנוסח שנצרב, לא הדגם.
              </p>
              <div className="mt-6 flex items-center justify-center gap-2">
                {BLESSINGS.map((b) => (
                  <span
                    key={b.id}
                    aria-hidden
                    style={{ width: 22, height: 4, borderRadius: 2, background: b.accent }}
                  />
                ))}
              </div>
              <Link
                href="/blessings"
                className="link-u mt-6 inline-block"
                style={{ fontSize: 'var(--fs-sm)', color: 'var(--accent-deep)' }}
              >
                לחמש הברכות ←
              </Link>
            </div>

            <div
              className="reveal relative hidden overflow-hidden md:block"
              style={{ aspectRatio: '4/5', borderRadius: 'var(--radius-lg)', ['--d' as string]: '240ms' }}
            >
              <Image src={breakPhotos[1]} alt="" fill sizes="30vw" className="object-cover" />
            </div>
          </div>
        </section>
      )}

      {/* ---------- שאר הדגמים ---------- */}
      {afterBreak.length > 0 && (
        <section className="pb-32">
          <div className="shell">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {afterBreak.map((p, i) => (
                <ProductCard key={p.slug} product={p} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
