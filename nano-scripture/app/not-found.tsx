import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="flex min-h-[76vh] items-center justify-center px-6 pt-32 text-center">
      <div>
        <p className="display gold-text" style={{ fontSize: 'var(--ds-mega)', lineHeight: 1 }}>
          404
        </p>
        <h1 className="display t-2 mt-4">הדף הזה לא נצרב</h1>
        <p className="lede mx-auto mt-5 max-w-md">
          יכול להיות שהקישור השתנה, או שהדגם ירד מהמדף. אפשר להתחיל מהקטלוג.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-4">
          <Link href="/" className="btn btn-solid">לדף הבית</Link>
          <Link href="/categories/necklaces" className="btn">לקטלוג</Link>
        </div>
      </div>
    </section>
  );
}
