
/**
 * לקוח WooCommerce.
 *
 * המפתחות הם אישורי חנות מלאים - מי שמחזיק בהם יכול לקרוא הזמנות
 * ולשנות מוצרים. הם נקראים מהסביבה בלבד, והייבוא של `server-only`
 * הופך כל ניסיון לייבא את הקובץ הזה לרכיב לקוח לשגיאת בנייה, ולא
 * לדליפה שמתגלה בפרודקשן.
 *
 * ווקומרס לא מוגדר עדיין. עד שיהיה, כל קריאה כאן נכשלת בשקט ומחזירה
 * null - כדי שהאתר ימשיך לעבוד כקטלוג בזמן שהחנות מוקמת.
 */
const WC_URL = (process.env.NEXT_PUBLIC_WC_URL || '').replace(/\/$/, '');
const WC_KEY = process.env.WC_CONSUMER_KEY || '';
const WC_SECRET = process.env.WC_CONSUMER_SECRET || '';

export const wcReady = Boolean(WC_URL && WC_KEY && WC_SECRET);

const auth = () =>
  'Basic ' + Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64');

async function call<T>(
  method: 'GET' | 'POST' | 'PUT',
  path: string,
  body?: unknown,
  params?: Record<string, string | number>,
): Promise<T> {
  if (!wcReady) throw new Error('WooCommerce אינו מוגדר');

  const url = new URL(`${WC_URL}/wp-json/wc/v3${path}`);
  for (const [k, v] of Object.entries(params ?? {})) {
    url.searchParams.set(k, String(v));
  }

  const res = await fetch(url, {
    method,
    headers: { Authorization: auth(), 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    // הזמנה חייבת להיכשל מהר ובאופן גלוי, ולא להשאיר את הלקוח תלוי
    signal: AbortSignal.timeout(15_000),
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`WC ${method} ${path} → ${res.status} ${text.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

export const wcGet = <T>(path: string, params?: Record<string, string | number>) =>
  call<T>('GET', path, undefined, params);
export const wcPost = <T>(path: string, body: unknown) => call<T>('POST', path, body);
export const wcPut = <T>(path: string, body: unknown) => call<T>('PUT', path, body);

/* ---------- מיפוי מק״ט למזהה ווקומרס ---------- */

type WcProduct = { id: number; sku: string; name: string };

let skuCache: Map<string, number> | null = null;

/**
 * ווקומרס יוצר הזמנה לפי product_id, לא לפי מק״ט.
 *
 * המיפוי נקרא מהחנות ולא נשמר בקובץ בקוד: קובץ כזה מתיישן ברגע
 * שמוצר נמחק ונוצר מחדש בוורדפרס, וזה נכשל בשקט - ההזמנה נוצרת
 * ומצביעה למוצר שלא קיים.
 */
export async function skuToId(): Promise<Map<string, number>> {
  if (skuCache) return skuCache;

  const map = new Map<string, number>();
  for (let page = 1; page <= 5; page++) {
    const batch = await wcGet<WcProduct[]>('/products', {
      per_page: 100,
      page,
      status: 'any',
    });
    for (const p of batch) if (p.sku) map.set(p.sku, p.id);
    if (batch.length < 100) break;
  }

  skuCache = map;
  return map;
}

/** אחרי הזרמת קטלוג, כדי שהמיפוי לא יישאר על ערכים ישנים */
export function clearSkuCache() {
  skuCache = null;
}
