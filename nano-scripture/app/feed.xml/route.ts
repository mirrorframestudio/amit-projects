import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { PRODUCTS, CATEGORIES, MATERIALS, FINISHES, type Product, type Audience } from '@/lib/catalog';
import { BLESSING_BY_ID } from '@/lib/blessings';
import { BRAND } from '@/lib/brand';
import { SITE_URL } from '@/lib/site';
import { POLICY, SHIPPING, shippingCost } from '@/lib/policy';
import { productTitle } from '@/lib/seo';

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
 * ולכן יש כאן קובץ אחד ולא שניים שיתפצלו. במטא, כשמחברים את הפיד,
 * בוחרים "Google Merchant Center" בשאלה לאיזו פלטפורמה הקובץ מעוצב -
 * אחרת מטא מצפה ל-`in stock` עם רווח ודוחה את הזמינות.
 *
 * הכל נגזר מהקטלוג ומ-POLICY. דגם חדש נכנס לפיד בלי שאיש יזכור.
 *
 * נבדק מול המפרט של גוגל ושל מטא ב-15 בספטמבר 2026, לפני החיבור
 * ל-Merchant Center. מה שהשתנה אז ולמה - ליד כל שדה.
 */

export const dynamic = 'force-static';
export const revalidate = 3600;

/**
 * ניקוד וטעמים יורדים מהכותרת. הפיד מזין מנועי התאמה, לא קורא אנושי.
 *
 * הטווח מדלג על המקף העברי (U+05BE) ועל סימני הפיסוק, אחרת
 * "פלדת אל־חלד" הופך ל"פלדת אלחלד" בכל כותרת של דגם פלדה.
 */
const plain = (s: string) => s.replace(/[֑-ׇֽֿׁׂׅׄ]/g, '');

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
 * מגדר וקבוצת גיל. גוגל דורש את שניהם ברישומים החינמיים לכל מה
 * שתחת "Apparel & Accessories", והתכשיטים שם. הערכים כבר בקטלוג -
 * `audience` לכל דגם, `ageGroup` רק לסיכת התינוק.
 */
const GENDER: Record<Audience, string> = { women: 'female', men: 'male', unisex: 'unisex' };

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

/**
 * תמונת הפיד: JPEG על רקע לבן, לא ה-WebP השקוף של האתר.
 *
 * מטא מקבל לפיד רק JPEG או PNG, וגוגל מזהיר על חיתוכים בהירים על
 * רקע שקוף. ה-JPEG נוצר מה-WebP ב-`scripts/feed-images.py` (רקע
 * `#ffffff`, כמו מאחורי הכרטיסים באתר). דגם חדש בלי JPEG נופל
 * ל-WebP במקום להישבר - וזו התזכורת להריץ את הסקריפט.
 */
function feedImage(p: Product) {
  const jpg = p.image.replace(/\.webp$/, '.jpg');
  return existsSync(join(process.cwd(), 'public', jpg)) ? jpg : p.image;
}

/**
 * התיאור אומר שהנוסח נבחר. גוגל מבקש להצהיר על מוצר מותאם אישית
 * בכותרת ובתיאור, וזה מה שהתכשיט הוא. הרשימה מהקטלוג, לא טקסט חדש.
 */
function description(p: Product) {
  const names = p.blessings.map((id) => BLESSING_BY_ID[id].plain);
  const chip =
    names.length > 1
      ? `הנוסח שנצרב על השבב נבחר בהזמנה: ${names.join(' / ')}.`
      : `על השבב נצרב הנוסח: ${names[0]}.`;
  return `${p.short}. ${p.story} ${chip}`;
}

function item(p: Product) {
  const group = groupId(p);

  /**
   * אותה כותרת כמו עמוד המוצר: "בסתר זהב · שרשרת פלדת אל־חלד עם ברכה
   * על שבב". השם לבד לא אומר מה המוצר, והגימור נכנס רק כשיש אח -
   * אחרת בְּסֵתֶר בכסף ובזהב הן שתי מודעות זהות שמתחרות זו בזו.
   */
  const title = plain(productTitle(p));

  /**
   * דמי המשלוח להזמנה של הפריט לבדו - אותה פונקציה שהעגלה, הצ'קאאוט
   * וההזמנה בווקומרס קוראים לה. דגם שחוצה את סף המשלוח החינם מצהיר
   * 0, ולא ₪29 שהאתר לא גובה.
   */
  const delivery = SHIPPING.find((m) => m.id === 'delivery');
  const shipping = shippingCost('delivery', p.price);

  const rows = [
    ['g:id', p.sku],
    /**
     * מותג + מק״ט הם המזהה הייחודי שגוגל מבקש ממותג פרטי בלי ברקוד:
     * "מספר לבחירתכם, למשל המק״ט, ושם החנות כמותג". לא מצרפים
     * `identifier_exists=no` - הוא סותר את שניהם ומקבל אזהרה.
     */
    ['g:mpn', p.sku],
    ['title', title],
    ['description', description(p)],
    ['link', `${SITE_URL}/products/${p.slug}`],
    ['g:image_link', abs(feedImage(p))],
    ['g:availability', 'in_stock'],
    ['g:condition', 'new'],
    ['g:price', `${p.price.toFixed(2)} ILS`],
    ['g:brand', BRAND.plain],
    ['g:google_product_category', TAXONOMY[p.category] ?? TAXONOMY.necklaces],
    ['g:product_type', CATEGORIES[p.category].title],
    ['g:material', MATERIALS[p.material].label],
    ['g:color', FINISHES[p.finish]],
    ['g:gender', GENDER[p.audience]],
    ['g:age_group', p.ageGroup ?? 'adult'],
    ...(group ? [['g:item_group_id', group]] : []),
  ];

  const extras = (p.scenes ?? [])
    .slice(0, 10)
    .map((src) => `      <g:additional_image_link>${esc(abs(src))}</g:additional_image_link>`)
    .join('\n');

  const threshold =
    POLICY.freeShippingOver === null
      ? ''
      : `
      <g:free_shipping_threshold>
        <g:country>IL</g:country>
        <g:price_threshold>${POLICY.freeShippingOver.toFixed(2)} ILS</g:price_threshold>
      </g:free_shipping_threshold>`;

  return `    <item>
${rows.map(([k, v]) => `      <${k}>${esc(String(v))}</${k}>`).join('\n')}
${extras}
      <g:shipping>
        <g:country>IL</g:country>
        <g:service>${esc(delivery?.label ?? 'משלוח')}</g:service>
        <g:price>${shipping.toFixed(2)} ILS</g:price>
      </g:shipping>${threshold}
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
