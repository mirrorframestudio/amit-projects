import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ProductCard from '@/components/ProductCard';
import JsonLd from '@/components/JsonLd';
import { GUIDES, getGuide } from '@/lib/guides';
import { getProduct } from '@/lib/catalog';
import { getBlessing } from '@/lib/blessings';
import { faqSchema, breadcrumbSchema, articleSchema } from '@/lib/schema';

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const g = getGuide(slug);
  if (!g) return {};
  return {
    title: g.metaTitle,
    description: g.metaDescription,
    alternates: { canonical: `/guides/${g.slug}` },
    openGraph: {
      type: 'article',
      url: `/guides/${g.slug}`,
      title: `${g.metaTitle} · מִקְרָא`,
      description: g.metaDescription,
      images: [{ url: '/hero/hero-landscape.jpg', alt: g.title }],
    },
  };
}

/**
 * עמוד מדריך: כותרת, פתיח, מקטעים עם כרטיסי דגמים, שאלות, ומדריכים
 * נוספים. אותה פריסה של עמוד המסמכים - עמודת קריאה אחת - כי זה טקסט
 * שקוראים, לא קטלוג שסורקים.
 */
export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const g = getGuide(slug);
  if (!g) notFound();

  const related = g.relatedGuides.map(getGuide).filter((x): x is NonNullable<typeof x> => Boolean(x));

  return (
    <>
      <JsonLd
        data={[
          articleSchema(g),
          faqSchema(g.faq),
          breadcrumbSchema([
            { name: 'מִקְרָא', path: '/' },
            { name: 'מדריכים', path: '/guides' },
            { name: g.title, path: `/guides/${g.slug}` },
          ]),
        ]}
      />

      <article className="shell pb-28 pt-36">
        <div className="mx-auto max-w-2xl">
          <nav className="mb-8 flex items-center gap-3" style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-3)' }}>
            <Link href="/" className="link-u">בית</Link>
            <span>/</span>
            <Link href="/guides" className="link-u">מדריכים</Link>
          </nav>

          <h1 className="display t-1">{g.title}</h1>
          <p className="lede mt-5">{g.lede}</p>
        </div>

        <div className="mx-auto mt-14 max-w-2xl">
          {g.sections.map((sec, i) => {
            const products = sec.products.map(getProduct).filter((p): p is NonNullable<typeof p> => Boolean(p));
            const b = sec.blessing ? getBlessing(sec.blessing) : null;
            return (
              <section key={sec.h} className="reveal mb-12" style={{ ['--d' as string]: `${i * 40}ms` }}>
                <h2 className="display" style={{ fontSize: 'var(--ds-3)', lineHeight: 1.35 }}>
                  {sec.h}
                </h2>
                {sec.p.map((line, j) => (
                  <p key={j} className="mt-3" style={{ fontSize: 'var(--fs-base)', lineHeight: 1.85, color: 'var(--ink-2)' }}>
                    {line}
                  </p>
                ))}

                {b && (
                  <p className="mt-4" style={{ fontSize: 'var(--fs-sm)' }}>
                    <Link href={`/blessings/${b.id}`} className="link-u" style={{ color: b.accentInk }}>
                      לקריאת הנוסח המלא של {b.plain} ←
                    </Link>
                  </p>
                )}

                {products.length > 0 && (
                  <div className={`mt-7 grid gap-3 sm:gap-5 ${products.length === 1 ? 'sm:grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
                    {products.map((p, k) => (
                      <ProductCard key={p.slug} product={p} index={k} />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        {/* ---------- שאלות ---------- */}
        <div className="mx-auto max-w-2xl pt-6" style={{ borderTop: '1px solid var(--line)' }}>
          <h2 className="display t-2 mt-6">שאלות שחוזרות</h2>
          <dl className="mt-6">
            {g.faq.map((x) => (
              <div key={x.q} className="py-5" style={{ borderTop: '1px solid var(--line)' }}>
                <dt className="display" style={{ fontSize: 'var(--fs-md)', lineHeight: 1.5 }}>{x.q}</dt>
                <dd className="mt-2" style={{ fontSize: 'var(--fs-base)', lineHeight: 1.8, color: 'var(--ink-2)' }}>{x.a}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* ---------- מדריכים נוספים ---------- */}
        {related.length > 0 && (
          <nav className="mx-auto mt-14 max-w-2xl pt-8" style={{ borderTop: '1px solid var(--line)' }} aria-label="מדריכים נוספים">
            <p className="display" style={{ fontSize: 'var(--fs-md)' }}>מדריכים נוספים</p>
            <ul className="mt-4 flex flex-col gap-3">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link href={`/guides/${r.slug}`} className="link-u" style={{ fontSize: 'var(--fs-base)', color: 'var(--accent-deep)' }}>
                    {r.title} ←
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </article>
    </>
  );
}
