import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LEGAL, getLegalDoc } from '@/lib/legal';
import { COMPANY, MISSING } from '@/lib/company';

export function generateStaticParams() {
  return LEGAL.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = getLegalDoc(slug);
  if (!doc) return {};
  return { title: doc.title, description: doc.lede };
}

export default async function LegalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = getLegalDoc(slug);
  if (!doc) notFound();

  return (
    <div className="shell pb-28 pt-36">
      <div className="mx-auto max-w-2xl">
        <p className="eyebrow reveal">מסמכי החנות</p>
        <h1 className="display t-1 mt-4">{doc.title}</h1>
        <p className="lede mt-5">{doc.lede}</p>

        <p className="mt-4" style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-3)' }}>
          עודכן לאחרונה: {COMPANY.updated}
        </p>

        {/* פרטי העוסק חובה בחנות מקוונת. כל עוד הם חסרים, המסמך אומר
            במפורש מה חסר - אזהרה כללית לא ניתנת לפעולה */}
        {MISSING.length > 0 && (
          <div
            className="mt-8 p-5"
            style={{
              borderRadius: 'var(--radius)',
              border: '1px solid var(--sale)',
              background: 'color-mix(in oklab, var(--sale) 8%, transparent)',
            }}
          >
            <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--sale-deep)', lineHeight: 1.7 }}>
              <strong>טיוטה - לא לפרסום.</strong> חסר עדיין:{' '}
              {MISSING.join(' · ')}. בנוסף, הנוסח טרם נבדק על ידי עורך דין. יש
              להשלים את שניהם לפני שהאתר עולה לאוויר.
            </p>
          </div>
        )}

        <div className="mt-14">
          {doc.sections.map((sec, i) => (
            <section key={sec.h} className="reveal mb-11" style={{ ['--d' as string]: `${i * 50}ms` }}>
              <h2 className="display" style={{ fontSize: 'var(--fs-lg)' }}>
                {sec.h}
              </h2>
              {sec.p.map((line, j) => (
                <p
                  key={j}
                  className="mt-3"
                  style={{ fontSize: 'var(--fs-base)', lineHeight: 1.85, color: 'var(--ink-2)' }}
                >
                  {line}
                </p>
              ))}
            </section>
          ))}
        </div>

        <nav
          className="flex flex-wrap gap-x-7 gap-y-3 pt-8"
          style={{ borderTop: '1px solid var(--line)' }}
        >
          {LEGAL.filter((d) => d.slug !== doc.slug).map((d) => (
            <Link
              key={d.slug}
              href={`/legal/${d.slug}`}
              className="tap-row link-u"
              style={{ fontSize: 'var(--fs-sm)', color: 'var(--accent-deep)' }}
            >
              {d.title}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
