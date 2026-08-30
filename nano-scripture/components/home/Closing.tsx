import Link from 'next/link';
import Image from 'next/image';

export default function Closing() {
  return (
    <section className="relative overflow-hidden py-32 md:py-40" style={{ borderTop: '1px solid var(--line)' }}>
      {/* תכשיט ענק, כמעט שקוף, חותך את החלק התחתון */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        style={{ opacity: 0.22 }}
      >
        <Image src="/products/YASNN004W.webp" alt="" width={900} height={900} className="h-[128%] w-auto object-contain" />
      </div>

      <div className="shell relative text-center">
        <p className="eyebrow reveal">מתנה שנשארת</p>

        <h2 className="display mt-6" style={{ fontSize: 'var(--ds-hero)' }}>
          <span className="mask-line">
            <span>מה נותנים למי</span>
          </span>
          <span className="mask-line">
            <span className="gold-text" style={{ ['--d' as string]: '130ms' }}>
              שיש לו הכול?
            </span>
          </span>
        </h2>

        <p className="lede reveal mx-auto mt-8 max-w-lg" style={{ ['--d' as string]: '280ms' }}>
          את הספר שממנו הכול התחיל - בגודל שאפשר לענוד מתחת לחולצה,
          ולזכור שהוא שם.
        </p>

        <div
          className="reveal mt-12 flex flex-wrap items-center justify-center gap-4"
          style={{ ['--d' as string]: '380ms' }}
        >
          <Link href="/categories/necklaces" className="btn btn-solid">
            בחירת תכשיט
          </Link>
          <Link href="/blessings" className="btn">
            לקריאת הברכות
          </Link>
        </div>

        <p className="reveal mt-9" style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-3)', letterSpacing: '.08em' }}>
          משלוח 1-4 ימי עסקים · החזרה חינם תוך 30 יום · תשלום מאובטח
        </p>
      </div>
    </section>
  );
}
