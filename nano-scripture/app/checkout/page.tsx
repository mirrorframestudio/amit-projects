import type { Metadata } from 'next';
import CheckoutForm from './CheckoutForm';
import { paymentReady } from '@/lib/grow';

export const metadata: Metadata = {
  title: 'תשלום',
  alternates: { canonical: '/checkout' },
  // עמוד שנוצר בשביל הקונה, לא בשביל גוגל
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <section className="pb-32 pt-40">
      <div className="shell">
        {/* grow.ts הוא server-only; הטופס לומד ממנו רק דרך הפרופ */}
        <CheckoutForm paymentReady={paymentReady} />
      </div>
    </section>
  );
}
