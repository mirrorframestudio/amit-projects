import Link from 'next/link';
import { POLICY, deliveryLine } from '@/lib/policy';

export default function Closing() {
  return (
    <section className="relative overflow-hidden py-10 md:py-28" style={{ borderTop: '1px solid var(--line)' }}>
      {/* משפט סיום, וזהו. קודם ישב מאחוריו תליון ענק בשקיפות 22% ומעליו
          תווית "מתנה שנשארת" - שני קישוטים שכל תבנית מוסיפה לסיום */}
      <div className="shell relative text-center">
        <h2 className="display t-hero">
          <span className="mask-line">
            <span>מה נותנים למי</span>
          </span>
          <span className="mask-line">
            <span className="accent-text" style={{ ['--d' as string]: '130ms' }}>
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

        <p className="reveal mt-9" style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-3)' }}>
          משלוח {deliveryLine} · החזרה תוך {POLICY.returnDays} יום · תשלום מאובטח
        </p>
      </div>
    </section>
  );
}
