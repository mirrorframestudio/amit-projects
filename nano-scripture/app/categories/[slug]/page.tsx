import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import ProductCard from '@/components/ProductCard';
import CategoryNav from '@/components/CategoryNav';
import {
  CATEGORIES,
  ACTIVE_CATEGORIES,
  productsByCategory,
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
  const hero = products.find((p) => p.featured) ?? products[0];

  return (
    <>
      <section className="relative overflow-hidden pt-36 pb-12">
        <div className="shell">
          <nav className="mb-8 flex items-center gap-3" style={{ fontSize: '.74rem', color: 'var(--ink-3)' }}>
            <Link href="/" className="link-u">בית</Link>
            <span>/</span>
            <span style={{ color: 'var(--accent)' }}>{cat.title}</span>
          </nav>

          <div className="grid items-end gap-10 lg:grid-cols-[1.25fr_.75fr]">
            <div>
              <p className="eyebrow reveal load">{cat.subtitle}</p>
              <h1 className="display t-hero mt-4">
                <span className="mask-line load">
                  <span>{cat.title}</span>
                </span>
              </h1>
              <p className="lede reveal load mt-7 max-w-xl" style={{ ['--d' as string]: '220ms' }}>
                {cat.blurb}
              </p>
              <p className="reveal load mt-6" style={{ fontSize: '.86rem', color: 'var(--ink-3)' }}>
                <span className="num">{products.length}</span> דגמים · מ־
                <span className="num">{formatPrice(range.min)}</span> עד{' '}
                <span className="num">{formatPrice(range.max)}</span> · כל דגם עם כל אחת מ־
                <span className="num">{BLESSINGS.length}</span> הברכות
              </p>
            </div>

            {hero && (
              <div
                className="tile reveal load relative hidden lg:block"
                style={{
                  aspectRatio: '4/3',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--line)',
                  ['--d' as string]: '320ms',
                }}
              >
                <Image
                  src={hero.image}
                  alt={hero.name}
                  fill
                  sizes="30vw"
                  className="object-contain p-[6%]"
                />
              </div>
            )}
          </div>

          <div className="mt-12">
            <CategoryNav current={id} />
          </div>
        </div>
      </section>

      <section className="pb-32">
        <div className="shell">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p, i) => (
              <ProductCard key={p.slug} product={p} index={i} priority={i < 3} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
