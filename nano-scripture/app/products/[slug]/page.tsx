import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProductView from '@/components/ProductView';
import ProductCard from '@/components/ProductCard';
import { PRODUCTS, getProduct, productsByCategory, CATEGORIES } from '@/lib/catalog';
import { getBlessing } from '@/lib/blessings';
import { productFaq } from '@/lib/faq';
import JsonLd from '@/components/JsonLd';
import { productSchema, faqSchema, breadcrumbSchema } from '@/lib/schema';

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
    // `?b=` בוחר נוסח ואינו משנה את הדגם, את המחיר או את התיאור.
    // בלי קנוניקל כל בחירת נוסח היא כתובת נוספת עם אותו תוכן
    alternates: { canonical: `/products/${p.slug}` },
    openGraph: {
      type: 'website',
      url: `/products/${p.slug}`,
      title: p.name,
      description: p.short,
      images: [{ url: p.image, alt: p.name }],
    },
    twitter: { card: 'summary_large_image', images: [p.image] },
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

  // הנוסח הראשון הוא מה שהעמוד מציג בטעינה, ולכן הוא מה שהסכימה
  // מצטטת. סימון שמתאר מצב אחר מזה שהמבקר רואה הוא סימון שגוי
  const defaultBlessing = getBlessing(product.blessings[0]);

  return (
    <>
      <JsonLd
        data={[
          productSchema(product, product.scenes ?? []),
          faqSchema(productFaq(product, defaultBlessing)),
          breadcrumbSchema([
            { name: 'מִקְרָא', path: '/' },
            { name: CATEGORIES[product.category].title, path: `/categories/${product.category}` },
            { name: product.name, path: `/products/${product.slug}` },
          ]),
        ]}
      />
      <ProductView product={product} />

      {related.length > 0 && (
        <section className="py-24" style={{ borderTop: '1px solid var(--line)', background: 'var(--bg-2)' }}>
          <div className="shell">
            <h2 className="display t-2 mb-12">עוד {CATEGORIES[product.category].title}</h2>
            <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
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
