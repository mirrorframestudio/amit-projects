import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProductView from '@/components/ProductView';
import ProductCard from '@/components/ProductCard';
import { PRODUCTS, getProduct, productsByCategory, CATEGORIES } from '@/lib/catalog';

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = getProduct(slug);
  if (!p) return {};
  return {
    title: p.name,
    description: `${p.short}. ${p.story.slice(0, 120)}`,
    openGraph: { images: [p.image] },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

  // דגמים קרובים מאותה קטגוריה — זה מה שרלוונטי למי שכבר בחר סוג תכשיט
  const related = productsByCategory(product.category)
    .filter((p) => p.slug !== product.slug)
    .slice(0, 3);

  return (
    <>
      <ProductView product={product} />

      {related.length > 0 && (
        <section className="py-24" style={{ borderTop: '1px solid var(--line)', background: 'var(--bg-2)' }}>
          <div className="shell">
            <h2 className="display t-2 mb-12">עוד {CATEGORIES[product.category].title}</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p, i) => (
                <ProductCard key={p.slug} product={p} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
