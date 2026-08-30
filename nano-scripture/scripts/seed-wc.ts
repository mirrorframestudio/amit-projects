/**
 * הזרמת הקטלוג לווקומרס.
 *
 *   npx tsx scripts/seed-wc.ts          — הרצה יבשה, לא כותב כלום
 *   npx tsx scripts/seed-wc.ts --write  — יוצר ומעדכן בפועל
 *
 * הסקריפט אידמפוטנטי: הוא מזהה מוצר לפי מק״ט. הרצה שנייה מעדכנת
 * את הקיימים במקום ליצור כפילויות, ולכן אפשר להריץ אותו שוב אחרי
 * כל שינוי מחיר בקוד.
 *
 * ------------------------------------------------------------------
 * הברכה איננה וריאנט, וזו החלטה ולא קיצור דרך.
 *
 * חמש־עשרה דגמים כפול חמש ברכות הם שבעים וחמישה צירופים. כווריאנטים
 * הם היו מכפילים את הקטלוג פי חמש, מפצלים את המלאי ומחייבים לתחזק
 * שבעים וחמישה מחירים זהים. הברכה אינה משנה מחיר, משקל או מלאי -
 * היא הוראת ייצור, ולכן היא נוסעת כ־meta על שורת ההזמנה.
 * ------------------------------------------------------------------
 *
 * תמונות אינן מועלות. הן מוגשות מהחזית, וווקומרס כאן הוא בק־אנד
 * להזמנות ולא קטלוג לתצוגה. העלאה למדיה של וורדפרס דורשת Application
 * Password נפרד, וזה לא שווה את זה בשביל תמונה ממוזערת בפאנל.
 */
import { PRODUCTS, CATEGORIES, MATERIALS, FINISHES } from '../lib/catalog';
import { getBlessing } from '../lib/blessings';
import { wcGet, wcPost, wcPut, wcReady } from '../lib/wcClient';

const WRITE = process.argv.includes('--write');

type WcProduct = { id: number; sku: string; name: string };
type WcCategory = { id: number; name: string; slug: string };

async function ensureCategories() {
  const existing = await wcGet<WcCategory[]>('/products/categories', { per_page: 100 });
  const bySlug = new Map(existing.map((c) => [c.slug, c.id]));

  for (const cat of Object.values(CATEGORIES)) {
    if (bySlug.has(cat.id)) continue;
    console.log(`  קטגוריה חסרה: ${cat.title} (${cat.id})`);
    if (!WRITE) continue;
    const made = await wcPost<WcCategory>('/products/categories', {
      name: cat.title,
      slug: cat.id,
      description: cat.blurb,
    });
    bySlug.set(made.slug, made.id);
  }
  return bySlug;
}

function payloadFor(p: (typeof PRODUCTS)[number], categoryId?: number) {
  const blessings = p.blessings.map((id) => getBlessing(id).plain).join(' · ');

  return {
    name: p.name,
    slug: p.slug,
    type: 'simple',
    status: 'publish',
    catalog_visibility: 'hidden', // החנות אינה מוצגת בוורדפרס
    sku: p.sku,
    regular_price: String(p.price),
    description: p.short,
    short_description: p.short,
    manage_stock: false,
    categories: categoryId ? [{ id: categoryId }] : [],
    meta_data: [
      { key: '_mikra_material', value: MATERIALS[p.material].label },
      { key: '_mikra_finish', value: FINISHES[p.finish] },
      // אילו ברכות מותרות לדגם. הבדיקה נעשית בחזית, וזה כאן כדי
      // שמי שמסתכל על ההזמנה בפאנל יראה מה היה אפשר לבחור
      { key: '_mikra_blessings', value: blessings },
    ],
  };
}

async function main() {
  if (!wcReady) {
    console.error('חסרים NEXT_PUBLIC_WC_URL / WC_CONSUMER_KEY / WC_CONSUMER_SECRET ב-.env.local');
    process.exit(1);
  }

  console.log(WRITE ? '— כותב לווקומרס —' : '— הרצה יבשה, לא נכתב דבר —\n');

  const cats = await ensureCategories();

  const existing = await wcGet<WcProduct[]>('/products', { per_page: 100, status: 'any' });
  const bySku = new Map(existing.filter((p) => p.sku).map((p) => [p.sku, p.id]));

  let created = 0;
  let updated = 0;

  for (const p of PRODUCTS) {
    const body = payloadFor(p, cats.get(p.category));
    const id = bySku.get(p.sku);

    if (id) {
      console.log(`עדכון  ${p.sku.padEnd(12)} ${p.name}`);
      if (WRITE) await wcPut(`/products/${id}`, body);
      updated++;
    } else {
      console.log(`יצירה  ${p.sku.padEnd(12)} ${p.name}  ₪${p.price}`);
      if (WRITE) await wcPost('/products', body);
      created++;
    }
  }

  console.log(`\nנוצרו ${created}, עודכנו ${updated}, סה״כ ${PRODUCTS.length}`);
  if (!WRITE) console.log('להרצה אמיתית: npx tsx scripts/seed-wc.ts --write');
}

main().catch((e) => {
  console.error('נכשל:', e.message);
  process.exit(1);
});
