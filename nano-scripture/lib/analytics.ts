import { getProduct, type Product } from './catalog';
import { getBlessing, type BlessingId } from './blessings';
import { hasConsent } from './consent';
import type { CartLine } from './cart';

/**
 * מדידה: גוגל אנליטיקס ופיקסל של מטא.
 *
 * ------------------------------------------------------------------
 * עד כאן לא רצה באתר שום מדידה. בכלל.
 *
 * לא כמה אנשים נכנסו, לא איפה הם נטשו, ולא אילו דגמים נצפו. מודעה
 * שרצה מול אתר כזה היא הימור: מטא לא יכולה לאופטם על רכישות שהיא
 * לא רואה, ואי אפשר לבנות ממנו קהל רימרקטינג אחד.
 * ------------------------------------------------------------------
 *
 * שני כללים שקובעים את כל מה שכתוב כאן:
 *
 * 1. בלי מזהה - אין קוד. `analyticsOn` כבוי כשאין מזהים בסביבה,
 *    ואז אף סקריפט לא נטען ואף אירוע לא נורה. אותו דפוס בדיוק כמו
 *    `paymentReady` בסליקה: תכונה שמופעלת בהגדרה, ולא בפריסה.
 *
 * 2. בלי הסכמה - אין מדידה. `hasConsent` הוא השער, וברירת המחדל שלו
 *    היא "לא". באנר שמותקן אחרי שהמעקב כבר עובד מגהץ בדיעבד משהו
 *    שכבר קרה, וזה בדיוק מה שנמנע כאן.
 */

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || '';
export const PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID || '';

/** נדלק רק כשיש מה להפעיל. בלי מזהים האתר מתנהג כאילו הקובץ לא קיים */
export const analyticsOn = Boolean(GA_ID || PIXEL_ID);

type Params = Record<string, unknown>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: ((...args: unknown[]) => void) & { loaded?: boolean };
    dataLayer?: unknown[];
  }
}

/** האם מותר לירות עכשיו. נבדק בכל אירוע ולא פעם אחת בטעינה */
function allowed() {
  return typeof window !== 'undefined' && analyticsOn && hasConsent('analytics');
}

/**
 * שמות האירועים אינם זהים בשתי המערכות, והערכים כן.
 *
 * זה המקום היחיד שיודע את שני המילונים. כל שאר הקוד יורה אירוע אחד
 * בשם עסקי, ולא זוכר איך קוראים לו אצל מי - אחרת כל אירוע חדש הוא
 * הזדמנות לשלוח ל-GA שם של מטא.
 */
const NAMES: Record<string, { ga: string; fb: string; custom?: boolean }> = {
  viewItem: { ga: 'view_item', fb: 'ViewContent' },
  addToCart: { ga: 'add_to_cart', fb: 'AddToCart' },
  viewCart: { ga: 'view_cart', fb: 'ViewCart', custom: true },
  beginCheckout: { ga: 'begin_checkout', fb: 'InitiateCheckout' },
  purchase: { ga: 'purchase', fb: 'Purchase' },
  lead: { ga: 'generate_lead', fb: 'CompleteRegistration' },
};

/**
 * תור המתנה לסקריפטים שטרם נטענו.
 *
 * ------------------------------------------------------------------
 * בלי זה אירוע הרכישה אובד, וזה נמדד.
 *
 * הסקריפטים נטענים ב-afterInteractive, כלומר אחרי ההידרציה. אירוע
 * שנורה מתוך אפקט שרץ בטעינת העמוד - וזה בדיוק מה שעמוד התודה
 * עושה - מקדים אותם. `window.gtag?.()` על פונקציה שטרם קיימת אינו
 * שגיאה: הוא פשוט לא עושה כלום, בשקט.
 *
 * התוצאה הייתה עמוד תודה שנטען, אירוע purchase שנורה, ו-dataLayer
 * שבו יש js ו-config ואין רכישה.
 * ------------------------------------------------------------------
 *
 * לכן קריאה שמגיעה מוקדם מדי ממתינה, ונשלחת ברגע שהסקריפט מוכן.
 * החלון תחום: אחרי עשר שניות מוותרים, כי אירוע שמגיע באיחור כזה
 * כבר לא ישויך לביקור הנכון ממילא.
 */
type Vendor = 'gtag' | 'fbq';
const waiting: Record<Vendor, (() => void)[]> = { gtag: [], fbq: [] };
let flusher: number | null = null;

function enqueue(vendor: Vendor, fire: () => void) {
  if (window[vendor]) {
    fire();
    return;
  }
  waiting[vendor].push(fire);

  if (flusher !== null) return;
  let waited = 0;
  flusher = window.setInterval(() => {
    waited += 200;
    for (const v of ['gtag', 'fbq'] as const) {
      if (window[v] && waiting[v].length) waiting[v].splice(0).forEach((f) => f());
    }
    if ((!waiting.gtag.length && !waiting.fbq.length) || waited >= 10_000) {
      window.clearInterval(flusher!);
      flusher = null;
      waiting.gtag.length = 0;
      waiting.fbq.length = 0;
    }
  }, 200);
}

/**
 * שדר אירוע לשתי המערכות.
 *
 * `eventId` נשלח למטא כ-eventID. הוא מה שמונע ספירה כפולה כשאותה
 * רכישה נורית פעמיים - למשל לקוח שמרענן את עמוד התודה, או שחוזר
 * אליו מההיסטוריה. בלעדיו ה-ROAS שמטא מציגה גבוה מהאמת.
 */
function send(
  key: keyof typeof NAMES,
  ga: Params,
  fb: Params,
  eventId?: string,
) {
  if (!allowed()) return;
  const name = NAMES[key];

  if (GA_ID) enqueue('gtag', () => window.gtag!('event', name.ga, ga));

  if (PIXEL_ID) {
    const verb = name.custom ? 'trackCustom' : 'track';
    enqueue('fbq', () =>
      window.fbq!(verb, name.fb, fb, eventId ? { eventID: eventId } : undefined),
    );
  }
}

/* ============================================================
   המרת פריטים לשני הפורמטים.
   ============================================================ */

const price = (p: Product) => p.price;

function gaItem(p: Product, blessing: BlessingId, qty = 1) {
  return {
    item_id: p.sku,
    item_name: p.name,
    item_category: p.category,
    // הברכה אינה וריאנט במחיר, אבל היא כן מה שהלקוח בחר - ובלעדיה
    // הדוח מראה חמישה־עשר דגמים ולא מה שנמכר בפועל
    item_variant: getBlessing(blessing).plain,
    price: price(p),
    quantity: qty,
  };
}

function fbContent(p: Product, qty = 1) {
  return { id: p.sku, quantity: qty, item_price: price(p) };
}

/** שורות עגלה -> פריטים, סכום ומזהים. מדלג על דגם שנמחק מהקטלוג */
function fromLines(lines: CartLine[]) {
  const rows = lines
    .map((l) => ({ p: getProduct(l.slug), l }))
    .filter((r): r is { p: Product; l: CartLine } => Boolean(r.p));

  return {
    value: rows.reduce((s, r) => s + price(r.p) * r.l.qty, 0),
    items: rows.map((r) => gaItem(r.p, r.l.blessing, r.l.qty)),
    contents: rows.map((r) => fbContent(r.p, r.l.qty)),
    ids: rows.map((r) => r.p.sku),
  };
}

const CURRENCY = 'ILS';

/* ============================================================
   האירועים עצמם.
   ============================================================ */

export function trackPageView(path: string) {
  if (!allowed()) return;
  if (GA_ID) enqueue('gtag', () => window.gtag!('event', 'page_view', { page_path: path }));
  // מטא סופרת PageView בנפרד, וללא זה כל ניווט פנימי נעלם ממנה:
  // האתר הוא אפליקציית עמוד יחיד, והסקריפט נטען פעם אחת בלבד
  if (PIXEL_ID) enqueue('fbq', () => window.fbq!('track', 'PageView'));
}

export function trackViewItem(p: Product, blessing: BlessingId) {
  send(
    'viewItem',
    { currency: CURRENCY, value: price(p), items: [gaItem(p, blessing)] },
    {
      content_type: 'product',
      content_ids: [p.sku],
      content_name: p.name,
      contents: [fbContent(p)],
      currency: CURRENCY,
      value: price(p),
    },
  );
}

export function trackAddToCart(p: Product, blessing: BlessingId, qty: number) {
  send(
    'addToCart',
    { currency: CURRENCY, value: price(p) * qty, items: [gaItem(p, blessing, qty)] },
    {
      content_type: 'product',
      content_ids: [p.sku],
      content_name: p.name,
      contents: [fbContent(p, qty)],
      currency: CURRENCY,
      value: price(p) * qty,
    },
  );
}

export function trackBeginCheckout(lines: CartLine[]) {
  const c = fromLines(lines);
  if (!c.items.length) return;
  send(
    'beginCheckout',
    { currency: CURRENCY, value: c.value, items: c.items },
    {
      content_type: 'product',
      content_ids: c.ids,
      contents: c.contents,
      currency: CURRENCY,
      value: c.value,
      num_items: c.items.length,
    },
  );
}

/**
 * רכישה.
 *
 * ------------------------------------------------------------------
 * מתי זו "רכישה", כשהסליקה עוד ידנית.
 *
 * במסלול הידני הלקוח לא מגיע לעמוד תשלום - הוא משאיר הזמנה ומקבל
 * קישור בוואטסאפ. ההמרה העסקית היא לכן רגע יצירת ההזמנה, וזה מה
 * שנמדד. כשהסליקה תעבוד, אותו אירוע ייורה מעמוד התודה עם אותו
 * מזהה הזמנה - ו-eventID ידאג שהיא לא תיספר פעמיים.
 * ------------------------------------------------------------------
 */
export function trackPurchase(orderNumber: string, value: number, lines: CartLine[]) {
  const c = fromLines(lines);
  send(
    'purchase',
    { transaction_id: orderNumber, currency: CURRENCY, value, items: c.items },
    {
      content_type: 'product',
      content_ids: c.ids,
      contents: c.contents,
      currency: CURRENCY,
      value,
      order_id: orderNumber,
    },
    orderNumber,
  );
}

/** הצטרפות למועדון מהפופאפ. זה ליד, ולא רכישה, ולכן ערך אין לו */
export function trackLead() {
  send('lead', { method: 'popup' }, { content_name: 'club' });
}
