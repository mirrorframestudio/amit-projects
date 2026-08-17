import Link from 'next/link';
import BlessingCard from '@/components/BlessingCard';
import { BLESSINGS } from '@/lib/blessings';

/** חמש הברכות — ציר התוכן של האתר */
export default function Blessings() {
  return (
    <section
      className="py-24 md:py-36"
      style={{ background: 'var(--bg-2)', borderBlock: '1px solid var(--line)' }}
    >
      <div className="shell">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow reveal">חמש ברכות</p>
            <h2 className="display t-1 mt-4">
              <span className="mask-line">
                <span>מה תרצו לבקש?</span>
              </span>
            </h2>
          </div>
          <p className="lede reveal max-w-md" style={{ ['--d' as string]: '120ms' }}>
            הברכה היא הבחירה האמיתית כאן, לא התכשיט. בוחרים את הנוסח שמתאים
            לאדם ולרגע, ואז את הדגם שיישא אותו.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {BLESSINGS.slice(0, 3).map((b, i) => (
            <BlessingCard key={b.id} blessing={b} index={i} />
          ))}
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {BLESSINGS.slice(3).map((b, i) => (
            <BlessingCard key={b.id} blessing={b} index={i} />
          ))}
        </div>

        <div className="reveal mt-12 text-center">
          <Link href="/blessings" className="btn">
            לקריאת כל הנוסחים במלואם
          </Link>
        </div>
      </div>
    </section>
  );
}
