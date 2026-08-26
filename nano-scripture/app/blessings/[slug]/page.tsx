import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import NanoLoupe from '@/components/NanoLoupe';
import ProductCard from '@/components/ProductCard';
import BlessingCard from '@/components/BlessingCard';
import { BLESSINGS, getBlessing, isBlessingId } from '@/lib/blessings';
import { PRODUCTS } from '@/lib/catalog';
import ScriptureText from '@/components/ScriptureText';

export function generateStaticParams() {
  return BLESSINGS.map((b) => ({ slug: b.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!isBlessingId(slug)) return {};
  const b = getBlessing(slug);
  return {
    title: b.plain,
    description: `${b.blurb} ${b.sources}. ${b.words} מילים שנצרבות על שבב אחד.`,
  };
}

export default async function BlessingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isBlessingId(slug)) notFound();

  const b = getBlessing(slug);
  const carriers = PRODUCTS.filter((p) => p.blessings.includes(b.id));
  const others = BLESSINGS.filter((x) => x.id !== b.id);

  return (
    <>
      {/* ---- כותרת ---- */}
      <section
        className="relative overflow-hidden pt-40 pb-16"
        style={{
          background: `radial-gradient(72% 58% at 50% -12%, color-mix(in oklab, ${b.accent} 20%, transparent), transparent 70%)`,
        }}
      >
        <div className="shell">
          <nav className="mb-8 flex items-center gap-3" style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-3)' }}>
            <Link href="/" className="link-u">בית</Link>
            <span>/</span>
            <Link href="/blessings" className="link-u">הברכות</Link>
            <span>/</span>
            <span style={{ color: b.accentInk }}>{b.plain}</span>
          </nav>

          <p className="eyebrow reveal load" style={{ color: b.accentInk }}>{b.forWhom}</p>

          <h1 className="display mt-4" style={{ fontSize: 'var(--ds-hero)' }}>
            <span className="mask-line load">
              <span style={{ color: b.accentInk }}>{b.title}</span>
            </span>
          </h1>

          <p className="mt-4" style={{ fontSize: 'var(--fs-sm)', letterSpacing: '.14em', color: 'var(--ink-2)' }}>
            {b.sources}
          </p>

          <p className="lede reveal load mt-8 max-w-2xl" style={{ ['--d' as string]: '240ms' }}>
            {b.blurb}
          </p>

          <div className="mt-10 flex flex-wrap gap-x-12 gap-y-6">
            {[
              { v: String(b.words), l: 'מילים' },
              { v: b.chars.toLocaleString('he-IL'), l: 'תווים' },
              { v: b.gift, l: 'מתאים ל' },
            ].map((s, i) => (
              <div key={s.l} className="reveal load" style={{ ['--d' as string]: `${320 + i * 70}ms` }}>
                <p className="num display" style={{ fontSize: 'var(--fs-xl)', lineHeight: 1.3, color: 'var(--ink)' }}>
                  {s.v}
                </p>
                <p className="mt-1.5" style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-3)' }}>{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- השבב ---- */}
      <section className="pb-20">
        <div className="shell">
          <NanoLoupe blessing={b.id} height={440} radius={62} />
          <p className="mt-4 text-center" style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-3)' }}>
            זהו בדיוק הנוסח שנצרב - העבירו את הסמן כדי לקרוא אותו
          </p>
        </div>
      </section>

      {/* ---- הנוסח המלא ---- */}
      <section className="py-24" style={{ background: 'var(--bg-2)', borderBlock: '1px solid var(--line)' }}>
        <div className="shell grid gap-12 lg:grid-cols-[.72fr_1.28fr]">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <p className="eyebrow reveal" style={{ color: b.accentInk }}>הנוסח המלא</p>
            <h2 className="display t-2 mt-4">
              <span className="mask-line">
                <span>מילה במילה</span>
              </span>
            </h2>
            <p className="lede reveal mt-5 max-w-xs" style={{ fontSize: 'var(--fs-base)' }}>
              בלי קיצור ובלי השמטה. מה שכתוב כאן, בניקוד מלא, הוא בדיוק מה
              שנצרב על השבב.
            </p>
          </div>

          <article
            className="reveal p-8 md:p-10"
            style={{
              background: 'var(--surface)',
              border: `1px solid ${b.accent}`,
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <ScriptureText text={b.text} accent={b.accentInk} />
          </article>
        </div>
      </section>

      {/* ---- על אילו תכשיטים ---- */}
      {carriers.length > 0 && (
        <section className="py-24">
          <div className="shell">
            <div className="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="eyebrow reveal">איפה לענוד אותה</p>
                <h2 className="display t-1 mt-4">
                  <span className="mask-line">
                    <span>הברכה הזו על</span>
                  </span>
                </h2>
              </div>
              <p className="lede reveal max-w-sm" style={{ fontSize: 'var(--fs-base)' }}>
                כל דגם בקטלוג יכול לשאת את {b.plain} - בוחרים את התכשיט, ואז את הנוסח.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {carriers.slice(0, 6).map((p, i) => (
                <ProductCard key={p.slug} product={p} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---- ברכות נוספות ---- */}
      <section className="pb-32">
        <div className="shell">
          <h2 className="display t-2 mb-10">ברכות נוספות</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {others.map((o, i) => (
              <BlessingCard key={o.id} blessing={o} index={i} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
