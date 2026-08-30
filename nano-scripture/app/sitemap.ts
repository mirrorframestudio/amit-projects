import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';
import { PRODUCTS, ACTIVE_CATEGORIES } from '@/lib/catalog';
import { BLESSINGS } from '@/lib/blessings';
import { LEGAL } from '@/lib/legal';

/** נגזר מהנתונים. דגם חדש נכנס למפה בלי שאף אחד יזכור לעדכן */
export default function sitemap(): MetadataRoute.Sitemap {
  const url = (path: string, priority: number) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    priority,
  });

  return [
    url('', 1),
    url('/blessings', 0.9),
    url('/craft', 0.7),
    url('/brand', 0.5),
    ...ACTIVE_CATEGORIES.map((c) => url(`/categories/${c}`, 0.8)),
    ...PRODUCTS.map((p) => url(`/products/${p.slug}`, 0.9)),
    ...BLESSINGS.map((b) => url(`/blessings/${b.id}`, 0.7)),
    ...LEGAL.map((d) => url(`/legal/${d.slug}`, 0.3)),
  ];
}
