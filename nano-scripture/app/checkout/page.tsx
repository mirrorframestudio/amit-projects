import type { Metadata } from 'next';
import CheckoutForm from './CheckoutForm';

export const metadata: Metadata = {
  title: 'תשלום',
  // עמוד שנוצר בשביל הקונה, לא בשביל גוגל
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <section className="pb-32 pt-40">
      <div className="shell">
        <CheckoutForm />
      </div>
    </section>
  );
}
