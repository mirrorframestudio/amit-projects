import { PRODUCTS, CATEGORIES, MATERIALS, FINISHES, type Product } from '@/lib/catalog';
import { BRAND } from '@/lib/brand';
import { SITE_URL } from '@/lib/site';
import { SHIPPING } from '@/lib/policy';

/**
 * פיד מוצרים — /feed.xml
 *
 * ------------------------------------------------------------------
 * בלי הקובץ הזה אין קטלוג במטא ואין Google Shopping.
 *
 * זה חוסם משפחה שלמה של קמפיינים: מודעות קטלוג, Advantage+,
 * ורימרקטינג דינמי שמראה לגולש את הדגם שהוא בדיוק צפה בו. בתכשיטים
 * אלה בדרך כלל הפורמטים החזקים ביותר.
 * ------------------------------------------------------------------
 *
 * פורמט RSS 2.0 עם מרחב השמות של גוגל. שתי הפלטפורמות קוראות אותו,
 * ולכן יש כאן קובץ אחד ולא שניים שיתפצלו.
 *
 * הכל נגזר מהקטלוג ומ-POLICY. דגם חדש נכנס לפיד בלי שאיש יזכור.
 */

export const dynamic = 'force-static';
export const revalidate = 3600;

/** ניקוד וטעמים יורדים מהכותרת. הפיד מזין מנועי התאמה, לא קורא אנושי */
const plain = (s: string) => s.replace(/[֑-ׇ]/g, '');

const esc = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const abs = (path: string) => (path.startsWith('http') ? path : `${SITE_URL}${path}`);

/**
 * הטקסונומיה של גוגל, בנתיב מילולי ולא במזהה מספרי.
 * מזהה שגוי נדחה בשקט; נתיב שגוי מדווח כשגיאה שאפשר לתקן.
 */
const TAXONOMY: Record<string, string> = {
  necklaces: 'Apparel & Accessories > Jewelry > Necklaces',
  bracelets: 'Apparel & Accessories > Jewelry > Bracelets',
  rings: 'Apparel & Accessories > Jewelry > Rings',
  pins: 'Apparel & Accessories > Jewelry > Brooches & Lapel Pins',
};

/**
 * דגמים שהם אותו עיצוב בגימור אחר מקובצים יחד.
 *
 * בלי item_group_id, לִבִּי עֵר בכסף ולִבִּי עֵר בזהב מתחרים זה בזה
 * על אותה חשיפה כשני מוצרים זרים. עם המזהה הם וריאנטים של אחד.
 */
function groupId(p: Product) {
  const siblings = PRODUCTS.filter((x) => x.name === p.name);
  return siblings.length > 1 ? plain(p.name).replace(/\s+/g, '-') : null;
}

function item(p: Product) {
  const delivery = SHIPPING.find((m) => m.id === 'delivery');
  const group = groupId(p);

  /**
   * הגימור נכנס לכותרת רק כשיש אח.
   *
   * בְּסֵתֶר בכסף ובְּסֵתֶר בזהב הם שני מוצרים בפיד עם אותו שם בדיוק,
   * וזה מייצר שתי מודעות שנראות זהות ומתחרות זו בזו. לדגם יחיד
   * התוספת מיותרת ורק מאריכה כותרת.
   */
  const title = group
    ? `${plain(p.name)} · ${p.nameLatin} · ${FINISHES[p.finish]}`
    : `${plain(p.name)} · ${p.nameLatin}`;

  const rows = [
    ['g:id', p.sku],
    ['g:mpn', p.sku],
    ['title', title],
    ['description', `${p.short}. ${p.story}`],
    ['link', `${SITE_URL}/products/${p.slug}`],
    ['g:image_link', abs(p.image)],
    ['g:availability', 'in_stock'],
    ['g:condition', 'new'],
    ['g:price', `${p.price.toFixed(2)} ILS`],
    ['g:brand', BRAND.plain],
    // אין ברקוד לפריטים שנעשים בהזמנה, וזו התשובה התקנית לכך
    ['g:identifier_exists', 'no'],
    ['g:google_product_category', TAXONOMY[p.category] ?? TAXONOMY.necklaces],
    ['g:product_type', CATEGORIES[p.category].title],
    ['g:material', MATERIALS[p.material].label],
    ['g:color', FINISHES[p.finish]],
    ...(group ? [['g:item_group_id', group]] : []),
  ];

  const extras = (p.scenes ?? [])
    .slice(0, 10)
    .map((src) => `      <g:additional_image_link>${esc(abs(src))}</g:additional_image_link>`)
    .join('\n');

  return `    <item>
${rows.map(([k, v]) => `      <${k}>${esc(String(v))}</${k}>`).join('\n')}
${extras}
      <g:shipping>
        <g:country>IL</g:country>
        <g:service>${esc(delivery?.label ?? 'משלוח')}</g:service>
        <g:price>${(delivery?.price ?? 0).toFixed(2)} ILS</g:price>
      </g:shipping>
    </item>`;
}

export function GET() {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${esc(BRAND.plain)}</title>
    <link>${SITE_URL}</link>
    <description>${esc(BRAND.tagline)}</description>
${PRODUCTS.map(item).join('\n')}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
