import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';
import { PRODUCTS, ACTIVE_CATEGORIES } from '@/lib/catalog';
import { BLESSINGS } from '@/lib/blessings';
import { LEGAL } from '@/lib/legal';
import { GUIDES } from '@/lib/guides';

/**
 * נגזר מהנתונים. דגם חדש נכנס למפה בלי שאף אחד יזכור לעדכן.
 *
 * lastModified הוא תאריך קבוע לכל סוג עמוד ולא "עכשיו": מפה שבה כל
 * 30 הכתובות מתעדכנות בכל בקשה אומרת לגוגל שהתאריך חסר משמעות, והוא
 * מתעלם ממנו בכל הקובץ. התאריך מתעדכן ביד כשהתוכן של אותו סוג
 * משתנה - וזה נדיר מספיק כדי שזה יהיה נכון.
 */
const UPDATED = {
  home: '2026-09-15',
  catalog: '2026-09-15',
  blessings: '2026-09-08',
  craft: '2026-09-14',
  legal: '2026-09-03',
};

export default function sitemap(): MetadataRoute.Sitemap {
  const url = (path: string, priority: number, date: string) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(date),
    priority,
  });

  return [
    url('', 1, UPDATED.home),
    url('/blessings', 0.9, UPDATED.blessings),
    url('/craft', 0.7, UPDATED.craft),
    url('/guides', 0.6, GUIDES.reduce((m, g) => (g.published > m ? g.published : m), UPDATED.home)),
    ...ACTIVE_CATEGORIES.map((c) => url(`/categories/${c}`, 0.8, UPDATED.catalog)),
    ...PRODUCTS.map((p) => url(`/products/${p.slug}`, 0.9, UPDATED.catalog)),
    ...BLESSINGS.map((b) => url(`/blessings/${b.id}`, 0.7, UPDATED.blessings)),
    ...GUIDES.map((g) => url(`/guides/${g.slug}`, 0.7, g.published)),
    ...LEGAL.map((d) => url(`/legal/${d.slug}`, 0.3, UPDATED.legal)),
  ];
}
