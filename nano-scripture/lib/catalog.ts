import { salePrice } from './promo';
import { wornFor, wornFocus } from './worn';
import type { BlessingId } from './blessings';

/* ============================================================
   הקטלוג האמיתי — מבוסס על ה־PI מ־YIYA Jewelry (JW-20260803-1).
   המק״טים, המידות, החומרים והעלויות הם כפי שהם בהזמנה.
   ============================================================ */

export type CategoryId = 'necklaces' | 'bracelets' | 'rings' | 'pins';
export type Material = 'silver925' | 'steel';
export type Finish = 'silver' | 'gold' | 'black' | 'retro';
export type Audience = 'women' | 'men' | 'unisex';

export const MATERIALS: Record<Material, { label: string; note: string }> = {
  silver925: {
    label: 'כסף 925',
    note: 'כסף סטרלינג בציפוי רודיום, עם שיבוץ זירקוניה מסביב לשבב.',
  },
  steel: {
    label: 'פלדת אל־חלד',
    note: 'פלדה כירורגית 316L - לא מחלידה, לא משנה צבע, ולא מגיבה לעור.',
  },
};

export const FINISHES: Record<Finish, string> = {
  silver: 'כסף',
  gold: 'זהב',
  black: 'שחור',
  retro: 'כסף מושחר',
};

export type Category = {
  id: CategoryId;
  title: string;
  singular: string;
  subtitle: string;
  blurb: string;
};

export const CATEGORIES: Record<CategoryId, Category> = {
  necklaces: {
    id: 'necklaces',
    title: 'שרשראות',
    singular: 'שרשרת',
    subtitle: 'תליונים ומדליונים',
    blurb:
      'התליון נח על עצם הבריח, קרוב מספיק כדי להרגיש אותו. כל שרשרת מגיעה באורך מתכוונן, כך שאפשר לענוד אותה גבוה או להסתיר מתחת לחולצה.',
  },
  bracelets: {
    id: 'bracelets',
    title: 'צמידים',
    singular: 'צמיד',
    subtitle: 'שרשרת וקשיחים',
    blurb:
      'על פרק היד השבב נמצא בשדה הראייה שלכם כל היום. הצמידים בפרופיל נמוך, עם סוגר בטוח ושרשרת הארכה - כדי שיתאימו לכל היקף.',
  },
  rings: {
    id: 'rings',
    title: 'טבעות',
    singular: 'טבעת',
    subtitle: 'בקרוב',
    blurb: 'הסדרה הראשונה של הטבעות נמצאת בייצור.',
  },
  pins: {
    id: 'pins',
    title: 'סיכות',
    singular: 'סיכה',
    subtitle: 'לעגלה ולחדר התינוק',
    blurb:
      'סיכה נצמדת לעגלה, לשמיכה או לכיסא, ונשארת שם בשנים שבהן עוד אי אפשר לענוד כלום. הברכה נוסעת עם התינוק במקום לחכות במגירה.',
  },
};

export const CATEGORY_ORDER: CategoryId[] = ['necklaces', 'bracelets', 'pins', 'rings'];

export type Product = {
  /** מק״ט הספק — המזהה במלאי ובהזמנות */
  sku: string;
  slug: string;
  name: string;
  nameLatin: string;
  category: CategoryId;
  material: Material;
  finish: Finish;
  audience: Audience;
  /** מחיר לצרכן בשקלים, כולל מע״מ */
  price: number;
  compareAt?: number;
  /** עלות ליחידה בדולר, מתוך ה־PI. פנימי — לא מוצג באתר. */
  cost?: number;
  image: string;
  short: string;
  story: string;
  specs: { label: string; value: string }[];
  /** הברכות שאפשר לצרוב על הדגם, לפי קובץ ההתאמה */
  blessings: BlessingId[];
  /** הפסוק שממנו נגזר שם הדגם. מוצג לצד השם. */
  source?: { phrase: string; ref: string };
  /** צילומי הפריט בסביבה מסוגננת. כל אחד נכנס לגלריה כתצוגה נפרדת */
  scenes?: string[];
  badge?: string;
  featured?: boolean;
};

export const PRODUCTS: Product[] = [
  /* ---------- כסף 925 ---------- */
  {
    sku: 'YASNN004W',
    slug: 'toldot',
    scenes: ['/scene/toldot-wood.jpg', '/scene/toldot-dark.jpg', '/scene/toldot-1.jpg', '/scene/toldot-2.jpg', '/scene/toldot-3.jpg'],
    name: 'תּוֹלְדוֹת',
    nameLatin: 'TOLDOT',
    source: { phrase: 'אֵלֶּה תוֹלְדוֹת הַשָּׁמַיִם וְהָאָרֶץ', ref: 'בראשית ב׳, ד׳' },
    category: 'necklaces',
    material: 'silver925',
    finish: 'silver',
    audience: 'women',
    price: 749,
    cost: 31.9,
    image: '/products/YASNN004W.webp',
    blessings: ['bracha', 'parnasa', 'eshet-chayil'],
    short: 'מדליון עץ החיים בכסף 925, השבב משובץ בין הענפים',
    story:
      'הדגם הגדול והמושקע בקטלוג. מדליון בקוטר 29.2 מ״מ, עץ חיים מגולף בכסף סטרלינג, ובנקודה שבה הענפים נפגשים - השבב, בתוך מסגרת זירקוניה. זה הפריט שאנשים מבחינים בו מעבר לחדר.',
    specs: [
      { label: 'קוטר המדליון', value: '29.2 מ״מ' },
      { label: 'משבצת השבב', value: 'ריבוע משובץ זירקוניה במרכז המדליון' },
      { label: 'אורך השרשרת', value: '42 ס״מ + 5 ס״מ שרשרת הארכה' },
      { label: 'סוגר', value: 'קרבינה עם טבעת כוונון' },
      { label: 'גימור', value: 'כסף 925 בציפוי רודיום, מלוטש' },
    ],
    badge: 'הדגם המוביל',
    featured: true,
  },
  {
    sku: 'YASNN010W',
    slug: 'tipat-or',
    name: 'טִפַּת אוֹר',
    nameLatin: 'TIPAT OR',
    category: 'necklaces',
    material: 'silver925',
    finish: 'silver',
    audience: 'women',
    price: 549,
    cost: 16.5,
    image: '/products/YASNN010W.webp',
    blessings: ['bracha', 'shmira', 'eshet-chayil'],
    short: 'שרשרת לריאט בכסף 925 - סמל האינסוף, והשבב נופל ממנו',
    story:
      'שרשרת בצורת Y: סמל האינסוף יושב על עצם הבריח, וממנו יורדת שרשרת דקה שבקצה שלה השבב. התנועה של התליון בהליכה היא חלק מהעיצוב - הוא אף פעם לא נח באותו מקום.',
    specs: [
      { label: 'מידות התליון', value: '20 × 6.3 מ״מ' },
      { label: 'משבצת השבב', value: '8.4 מ״מ, משובצת זירקוניה' },
      { label: 'אורך השרשרת', value: '46 ס״מ + 5 ס״מ שרשרת הארכה' },
      { label: 'גזרה', value: 'לריאט - סמל האינסוף במרכז, התליון יורד ממנו' },
      { label: 'גימור', value: 'כסף 925 בציפוי רודיום, מלוטש' },
    ],
    featured: true,
  },
  {
    sku: 'YASNB001W',
    slug: 'ahavat-olam',
    scenes: ['/scene/ahavat-olam-tray.jpg'],
    name: 'אַהֲבַת עוֹלָם',
    nameLatin: 'AHAVAT OLAM',
    source: { phrase: 'וְאַהֲבַת עוֹלָם אֲהַבְתִּיךְ', ref: 'ירמיהו ל״א, ב׳' },
    category: 'bracelets',
    material: 'silver925',
    finish: 'silver',
    audience: 'women',
    price: 549,
    cost: 15.4,
    image: '/products/YASNB001W.webp',
    blessings: ['bracha', 'eshet-chayil'],
    short: 'צמיד כסף 925 עדין, סמל האינסוף לצד השבב',
    story:
      'צמיד שרשרת דק בכסף סטרלינג. בצד אחד סמל האינסוף, בצד השני השבב במסגרת זירקוניה, והם נחים משני עברי פרק היד. קליל מספיק כדי לשכוח ממנו, ובולט מספיק כדי שישאלו.',
    specs: [
      { label: 'מידות הלוחית', value: '22 × 12 מ״מ' },
      { label: 'משבצת השבב', value: '8.4 מ״מ, משובצת זירקוניה' },
      { label: 'היקף הצמיד', value: '16 ס״מ + 4 ס״מ שרשרת הארכה' },
      { label: 'סוגר', value: 'קרבינה עם טבעת כוונון' },
      { label: 'גימור', value: 'כסף 925 בציפוי רודיום, מלוטש' },
    ],
    featured: true,
  },

  /* ---------- פלדה · שרשראות ---------- */
  {
    sku: 'OYANN012S',
    slug: 'al-kapayim',
    scenes: ['/scene/al-kapayim-marble.jpg', '/scene/al-kapayim-linen.jpg', '/scene/al-kapayim-1.jpg', '/scene/al-kapayim-2.jpg'],
    name: 'עַל כַּפַּיִם',
    nameLatin: 'AL KAPAYIM',
    source: { phrase: 'הֵן עַל־כַּפַּיִם חַקֹּתִיךְ', ref: 'ישעיהו מ״ט, ט״ז' },
    category: 'necklaces',
    material: 'steel',
    finish: 'silver',
    audience: 'women',
    price: 299,
    cost: 6.0,
    image: '/products/OYANN012S.webp',
    blessings: ['eshet-chayil'],
    short: 'חמסה בקו נקי, השבב משובץ בכף היד',
    story:
      'חמסה בצללית פתוחה, בלי עומס דקורטיבי. השבב יושב בדיוק במרכז כף היד, במסגרת משובצת - הפרשנות המודרנית ביותר לקמע הישן ביותר.',
    specs: [
      { label: 'גזרה', value: 'חמסה בצללית פתוחה, השבב במרכז כף היד' },
      { label: 'משבצת השבב', value: 'משובצת זירקוניה מסביב' },
      { label: 'אורך השרשרת', value: '45 ס״מ + 5 ס״מ שרשרת הארכה' },
      { label: 'סוגר', value: 'קרבינה עם טבעת כוונון' },
      { label: 'גימור', value: 'פלדת אל־חלד 316L מלוטשת' },
    ],
    featured: true,
  },
  {
    sku: 'OYANN003S',
    slug: 'beseter',
    scenes: ['/scene/beseter-pair.jpg', '/scene/beseter-pair-marble.jpg', '/scene/beseter-1.jpg', '/scene/beseter-2.jpg', '/scene/beseter-3.jpg'],
    name: 'בְּסֵתֶר',
    nameLatin: 'BESETER',
    source: { phrase: 'יֹשֵׁב בְּסֵתֶר עֶלְיוֹן', ref: 'תהילים צ״א, א׳' },
    category: 'necklaces',
    material: 'steel',
    finish: 'silver',
    audience: 'men',
    price: 299,
    cost: 5.6,
    image: '/products/OYANN003S.webp',
    blessings: ['shmira'],
    short: 'מגן דוד בקווים חדים, השבב במרכז המשושה',
    story:
      'מגן דוד בגזרה גיאומטרית ונקייה, בלי עיטורים. השבב ממוקם בדיוק במרכז - בנקודה שבה שני המשולשים נפגשים.',
    specs: [
      { label: 'גזרה', value: 'מגן דוד גיאומטרי, השבב בנקודת המפגש' },
      { label: 'אורך השרשרת', value: '45 ס״מ + 5 ס״מ שרשרת הארכה' },
      { label: 'סוגר', value: 'קרבינה עם טבעת כוונון' },
      { label: 'גימור', value: 'פלדת אל־חלד 316L מלוטשת' },
    ],
  },
  {
    sku: 'OYANN003G',
    slug: 'beseter-gold',
    scenes: ['/scene/beseter-pair.jpg', '/scene/beseter-pair-marble.jpg'],
    name: 'בְּסֵתֶר',
    nameLatin: 'BESETER',
    source: { phrase: 'יֹשֵׁב בְּסֵתֶר עֶלְיוֹן', ref: 'תהילים צ״א, א׳' },
    category: 'necklaces',
    material: 'steel',
    finish: 'gold',
    audience: 'men',
    price: 329,
    cost: 6.5,
    image: '/products/OYANN003G.webp',
    blessings: ['shmira', 'parnasa'],
    short: 'אותו מגן דוד, בגימור זהב חם',
    story:
      'הגרסה המוזהבת של המגן דוד. ציפוי PVD בגוון זהב - עמיד הרבה יותר מציפוי חשמלי רגיל, ולא מתקלף בשימוש יומיומי.',
    specs: [
      { label: 'גזרה', value: 'מגן דוד גיאומטרי, השבב בנקודת המפגש' },
      { label: 'ציפוי', value: 'PVD בגוון זהב - עמיד לשחיקה יומיומית' },
      { label: 'אורך השרשרת', value: '45 ס״מ + 5 ס״מ שרשרת הארכה' },
      { label: 'סוגר', value: 'קרבינה עם טבעת כוונון' },
      { label: 'גימור', value: 'פלדת אל־חלד 316L' },
    ],
  },
  {
    sku: 'OYANN011S',
    slug: 'lo-yanum',
    scenes: ['/scene/lo-yanum-stone.jpg', '/scene/lo-yanum-wood.jpg', '/scene/lo-yanum-marble.jpg', '/scene/lo-yanum-1.jpg', '/scene/lo-yanum-2.jpg', '/scene/lo-yanum-3.jpg'],
    name: 'לֹא יָנוּם',
    nameLatin: 'LO YANUM',
    source: { phrase: 'הִנֵּה לֹא־יָנוּם וְלֹא יִישָׁן שׁוֹמֵר יִשְׂרָאֵל', ref: 'תהילים קכ״א, ד׳' },
    category: 'necklaces',
    material: 'steel',
    finish: 'silver',
    audience: 'women',
    price: 299,
    cost: 6.0,
    image: '/products/OYANN011S.webp',
    blessings: ['eshet-chayil'],
    short: 'תליון עין אופקי, השבב הוא האישון',
    story:
      'תליון עין שמונח לרוחב השרשרת ולא תלוי ממנה - גזרה שנחה שטוח על עצם הבריח. השבב, במסגרת משובצת, הוא האישון עצמו.',
    specs: [
      { label: 'גזרה', value: 'תליון עין אופקי, מחובר לשרשרת בשני צדדיו' },
      { label: 'משבצת השבב', value: 'משובצת זירקוניה, במרכז העין' },
      { label: 'אורך השרשרת', value: '45 ס״מ + 5 ס״מ שרשרת הארכה' },
      { label: 'סוגר', value: 'קרבינה עם טבעת כוונון' },
      { label: 'גימור', value: 'פלדת אל־חלד 316L מלוטשת' },
    ],
  },
  {
    sku: 'OYANN006S',
    slug: 'luach-libecha',
    name: 'לוּחַ לִבֶּךָ',
    nameLatin: 'LUACH LIBECHA',
    source: { phrase: 'כָּתְבֵם עַל־לוּחַ לִבֶּךָ', ref: 'משלי ג׳, ג׳' },
    category: 'necklaces',
    material: 'steel',
    finish: 'silver',
    audience: 'men',
    price: 279,
    cost: 5.6,
    image: '/products/OYANN006S.webp',
    blessings: ['shmira'],
    short: 'תליון מלבני אנכי, מינימלי לחלוטין',
    story:
      'מלבן אנכי חלק, בלי סמל ובלי קישוט. השבב יושב בקצה התחתון כמו חותמת. הדגם הנקי ביותר בקטלוג, ומי שקונה אותו בדרך כלל יודע בדיוק מה הוא רוצה.',
    specs: [
      { label: 'גזרה', value: 'מלבן אנכי חלק, השבב בקצה התחתון' },
      { label: 'אורך השרשרת', value: '45 ס״מ + 5 ס״מ שרשרת הארכה' },
      { label: 'סוגר', value: 'קרבינה עם טבעת כוונון' },
      { label: 'גימור', value: 'פלדת אל־חלד 316L מלוטשת' },
    ],
  },
  {
    sku: 'OYANN001G',
    slug: 'kachotam',
    scenes: ['/scene/kachotam-linen.jpg', '/scene/kachotam-stone.jpg', '/scene/kachotam-dark.jpg', '/scene/kachotam-1.jpg', '/scene/kachotam-2.jpg', '/scene/kachotam-3.jpg'],
    name: 'כַּחוֹתָם',
    nameLatin: 'KACHOTAM',
    source: { phrase: 'שִׂימֵנִי כַחוֹתָם עַל־לִבֶּךָ', ref: 'שיר השירים ח׳, ו׳' },
    category: 'necklaces',
    material: 'steel',
    finish: 'gold',
    audience: 'women',
    price: 329,
    cost: 6.8,
    image: '/products/OYANN001G.webp',
    blessings: ['shmira', 'eshet-chayil'],
    short: 'שרשרת זהב אסימטרית - לב תלוי, והשבב גבוה ממנו',
    story:
      'שני אלמנטים על שרשרת אחת: לב מלא בגימור זהב שתלוי במרכז, והשבב שיושב גבוה יותר על הצד. האסימטריה מכוונת - היא מה שהופך אותה למעניינת.',
    specs: [
      { label: 'גזרה', value: 'אסימטרית - לב מלא תלוי במרכז, השבב גבוה ממנו על השרשרת' },
      { label: 'ציפוי', value: 'PVD בגוון זהב - עמיד לשחיקה יומיומית' },
      { label: 'אורך השרשרת', value: '45 ס״מ + 5 ס״מ שרשרת הארכה' },
      { label: 'סוגר', value: 'קרבינה עם טבעת כוונון' },
      { label: 'גימור', value: 'פלדת אל־חלד 316L' },
    ],
  },

  /* ---------- פלדה · צמידים ---------- */
  {
    sku: 'OYANB007RS',
    slug: 'avot',
    scenes: ['/scene/avot-shelf.jpg'],
    name: 'עֲבוֹת',
    nameLatin: 'AVOT',
    source: { phrase: 'בְּחַבְלֵי אָדָם אֶמְשְׁכֵם בַּעֲבֹתוֹת אַהֲבָה', ref: 'הושע י״א, ד׳' },
    category: 'bracelets',
    material: 'steel',
    finish: 'retro',
    audience: 'men',
    price: 349,
    cost: 7.0,
    image: '/products/OYANB007RS.webp',
    blessings: ['shmira', 'parnasa'],
    short: 'צמיד גברי קלוע כבד, לוחית עם השבב במרכז',
    story:
      'שרשרת קלועה עבה בגימור כסף מושחר, ובמרכזה לוחית רחבה שנושאת את השבב. הדגם הכבד בקטלוג - 316L מלא, עם נוכחות אמיתית על היד.',
    specs: [
      { label: 'גזרה', value: 'שרשרת קלועה כבדה, לוחית רחבה במרכז' },
      { label: 'היקף הצמיד', value: '18 ס״מ + 4 ס״מ שרשרת הארכה' },
      { label: 'סוגר', value: 'קרבינה מוגברת' },
      { label: 'גימור', value: 'פלדת אל־חלד 316L בגוון כסף מושחר' },
    ],
    badge: 'לגברים',
    featured: true,
  },
  {
    sku: 'OYANB007B',
    scenes: ['/scene/avot-black.jpg'],
    slug: 'avot-black',
    name: 'עֲבוֹת',
    nameLatin: 'AVOT',
    source: { phrase: 'בְּחַבְלֵי אָדָם אֶמְשְׁכֵם בַּעֲבֹתוֹת אַהֲבָה', ref: 'הושע י״א, ד׳' },
    category: 'bracelets',
    material: 'steel',
    finish: 'black',
    audience: 'men',
    price: 349,
    cost: 7.5,
    image: '/products/OYANB007B.webp',
    blessings: ['bracha', 'parnasa'],
    short: 'אותו צמיד קלוע, בגימור שחור מלא',
    story:
      'הגרסה השחורה. ציפוי PVD שחור על כל הצמיד, כך שהשבב הכחול הוא הצבע היחיד עליו. הבחירה הפחות שגרתית, ובעינינו החזקה יותר.',
    specs: [
      { label: 'גזרה', value: 'שרשרת קלועה כבדה, לוחית רחבה במרכז' },
      { label: 'ציפוי', value: 'PVD שחור מלא' },
      { label: 'היקף הצמיד', value: '18 ס״מ + 4 ס״מ שרשרת הארכה' },
      { label: 'סוגר', value: 'קרבינה מוגברת' },
      { label: 'גימור', value: 'פלדת אל־חלד 316L' },
    ],
  },
  {
    sku: 'OYANB002S',
    slug: 'libi-er',
    scenes: ['/scene/libi-er-tray.jpg'],
    name: 'לִבִּי עֵר',
    nameLatin: 'LIBI ER',
    source: { phrase: 'אֲנִי יְשֵׁנָה וְלִבִּי עֵר', ref: 'שיר השירים ה׳, ב׳' },
    category: 'bracelets',
    material: 'steel',
    finish: 'silver',
    audience: 'women',
    price: 289,
    cost: 6.0,
    image: '/products/OYANB002S.webp',
    blessings: ['shmira', 'eshet-chayil'],
    short: 'צמיד שרשרת עדין עם לב חלק והשבב לצידו',
    story:
      'צמיד יומיומי: לב חלק בקצה אחד, השבב במסגרת משובצת בקצה השני. עדין מספיק לענידה בשכבות עם צמידים נוספים.',
    specs: [
      { label: 'גזרה', value: 'שרשרת עדינה - לב חלק בצד אחד, השבב בשני' },
      { label: 'משבצת השבב', value: 'משובצת זירקוניה' },
      { label: 'היקף הצמיד', value: '16 ס״מ + 5 ס״מ שרשרת הארכה' },
      { label: 'סוגר', value: 'קרבינה עם טבעת כוונון' },
      { label: 'גימור', value: 'פלדת אל־חלד 316L מלוטשת' },
    ],
  },
  {
    sku: 'OYANB002G',
    slug: 'libi-er-gold',
    scenes: ['/scene/libi-er-gold-tray.jpg'],
    name: 'לִבִּי עֵר',
    nameLatin: 'LIBI ER',
    source: { phrase: 'אֲנִי יְשֵׁנָה וְלִבִּי עֵר', ref: 'שיר השירים ה׳, ב׳' },
    category: 'bracelets',
    material: 'steel',
    finish: 'gold',
    audience: 'women',
    price: 319,
    cost: 6.8,
    image: '/products/OYANB002G.webp',
    blessings: ['bracha', 'eshet-chayil'],
    short: 'אותו צמיד לב, בגימור זהב',
    story:
      'הגרסה המוזהבת של הצמיד. הלב והשרשרת בציפוי PVD זהב, והשבב נשאר במסגרת בהירה - ניגוד שגורם לו לבלוט יותר.',
    specs: [
      { label: 'גזרה', value: 'שרשרת עדינה - לב חלק בצד אחד, השבב בשני' },
      { label: 'ציפוי', value: 'PVD בגוון זהב - עמיד לשחיקה יומיומית' },
      { label: 'היקף הצמיד', value: '16 ס״מ + 5 ס״מ שרשרת הארכה' },
      { label: 'סוגר', value: 'קרבינה עם טבעת כוונון' },
      { label: 'גימור', value: 'פלדת אל־חלד 316L' },
    ],
  },
  {
    sku: 'OYANB001S',
    slug: 'chishuk',
    name: 'חִשּׁוּק',
    nameLatin: 'CHISHUK',
    category: 'bracelets',
    material: 'steel',
    finish: 'silver',
    audience: 'men',
    price: 279,
    cost: 5.0,
    image: '/products/OYANB001S.webp',
    blessings: ['shmira', 'parnasa'],
    short: 'צמיד קשיח פתוח ברוחב 6 מ״מ, השבב בקצה',
    story:
      'צמיד קשיח בגזרה פתוחה, שנלבש בלחיצה קלה ומתאים כמעט לכל היקף יד. השבב יושב על אחד הקצוות, שם הוא נראה בכל פעם שמסתכלים על השעון.',
    specs: [
      { label: 'גזרה', value: 'צמיד קשיח פתוח, נלבש בלחיצה קלה' },
      { label: 'רוחב', value: '6 מ״מ' },
      { label: 'מידה', value: 'פתוח - מתאים כמעט לכל היקף יד' },
      { label: 'גימור', value: 'פלדת אל־חלד 316L מוברשת, קצוות מלוטשים' },
    ],
  },
  {
    // אין עדיין שורה ב־PI לפריט הזה — המק״ט והעלות ממתינים לספק
    sku: 'BABYPIN01',
    slug: 'tzel-knafayim',
    name: 'צֵל כְּנָפַיִם',
    nameLatin: 'TZEL KNAFAYIM',
    source: { phrase: 'בְּצֵל כְּנָפֶיךָ תַּסְתִּירֵנִי', ref: 'תהילים י״ז, ח׳' },
    category: 'pins',
    material: 'silver925',
    finish: 'silver',
    audience: 'unisex',
    price: 749,
    image: '/products/BABYPIN01.webp',
    blessings: ['tinok'],
    short: 'סיכת כסף 925 לעגלה, ארבעה תליונים וברכת התינוק על השבב',
    story:
      'סיכת ביטחון בכסף סטרלינג באורך 41 מ״מ, ועליה ארבעה תליונים: חמסה, מפתח, לב, והרביעי - הלוחית שנושאת את השבב. נצמדת לעגלה, לשמיכה או לכיסא, ונשארת שם דרך כל השנים שבהן עוד אי אפשר לענוד תכשיט.',
    specs: [
      { label: 'אורך הסיכה', value: '41 מ״מ' },
      { label: 'תליונים', value: 'חמסה 14×12 · לוחית שבב 16×16 · מפתח־לב 13×8 · לב משובץ 12×11 מ״מ' },
      { label: 'משבצת השבב', value: '16 × 16 מ״מ, עם חלון 5 × 5 מ״מ' },
      { label: 'משקל', value: 'כ־6.5 גרם' },
      { label: 'גימור', value: 'כסף 925 בציפוי רודיום, שיבוץ זירקוניה' },
    ],
    badge: 'מתנת לידה',
    featured: true,
  },
];

/* ---------- נגזרות ---------- */

/** גימור -> הצבע שמייצג אותו בעיגול הבחירה */
export const FINISH_SWATCH: Record<Finish, string> = {
  silver: 'linear-gradient(145deg, #f2f3f5, #b9bcc1 58%, #86898f)',
  gold: 'linear-gradient(145deg, #f3e3b4, #c9a24b 58%, #8d6c22)',
  black: 'linear-gradient(145deg, #55565b, #2b2b2e 58%, #141416)',
  retro: 'linear-gradient(145deg, #dcd6c8, #a8a093 58%, #6f6a5e)',
};

/**
 * אותו עיצוב בגימורים שונים. הם נבדלים במק״ט ובמחיר אבל נושאים שם אחד,
 * ולכן השם הוא המפתח: שני כרטיסים באותה כותרת נראים כמו תקלה.
 */
export function finishSiblings(product: Product) {
  return PRODUCTS.filter((p) => p.name === product.name);
}

/**
 * צילומי הקטגוריה, לפס השבירה שבאמצע העמוד.
 *
 * צילום אחד לכל דגם. הרשימה הגולמית מסודרת לפי מוצר, ולכן שני
 * הראשונים בה תמיד מאותו תכשיט - ופס שבירה עם אותו דגם פעמיים,
 * בשני צילומים כהים, נראה כמו טעות ולא כמו בחירה.
 */
export function categoryPhotos(id: CategoryId) {
  return PRODUCTS.filter((p) => p.category === id)
    .map((p) => p.scenes?.[0])
    .filter((src): src is string => Boolean(src));
}

/** כל הצילומים בקטגוריה, בלי סינון - לבחירת הבאנר */
function allCategoryPhotos(id: CategoryId) {
  return PRODUCTS.filter((p) => p.category === id).flatMap((p) => p.scenes ?? []);
}

/**
 * הצילום שמותר להניח מתחת לכותרת הקטגוריה.
 *
 * לא כל צילום מתאים לזה. הכותרת בדיו כהה יושבת עליו, ונמדד שצילום
 * כהה מפיל אותה מתחת לתקן: avot-black נתן 3.08:1 בצעיף 40%, ואילו
 * beseter-2 נותן 8.79:1 באותו צעיף. לכן הרשימה סגורה ומבוססת מדידה,
 * וקטגוריה בלי צילום מאושר מקבלת כותרת על קרם - שזה עדיף על כותרת
 * שאי אפשר לקרוא.
 */
const APPROVED_BANNERS = [
  '/scene/beseter-2.jpg',
  '/scene/al-kapayim-1.jpg',
  '/scene/al-kapayim-2.jpg',
  '/scene/lo-yanum-2.jpg',
];

export function categoryBanner(id: CategoryId) {
  return allCategoryPhotos(id).find((src) => APPROVED_BANNERS.includes(src)) ?? null;
}

/**
 * צילום לכרטיס הברכה: תכשיט שבאמת נושא את הנוסח הזה.
 *
 * הבחירה נעשית פעם אחת לכל הברכות יחד ולא לכל אחת בנפרד, כדי שאותו
 * צילום לא יופיע בשני כרטיסים סמוכים - ארבע מתוך חמש הברכות נישאות
 * על אותם דגמים מצולמים, ובחירה עצמאית הייתה מחזירה את תולדות שלוש
 * פעמים.
 *
 * ברכת התינוק נישאת על הסיכה בלבד, ולה אין צילום סצנה. היא מקבלת
 * null והכרטיס נופל בחזרה לפס צבע נקי.
 */
export function blessingPhotos(order: string[]): Record<string, string | null> {
  const used = new Set<string>();
  const out: Record<string, string | null> = {};

  for (const id of order) {
    const carrier = PRODUCTS.find(
      (p) => p.blessings.includes(id as never) && p.scenes?.[0] && !used.has(p.scenes[0]),
    );
    const photo = carrier?.scenes?.[0] ?? null;
    if (photo) used.add(photo);
    out[id] = photo;
  }
  return out;
}

/** דגם אחד לכל עיצוב - לרשימות. הגימורים נבחרים בתוך עמוד המוצר */
export function uniqueDesigns(list: Product[]) {
  const seen = new Set<string>();
  return list.filter((p) => (seen.has(p.name) ? false : seen.add(p.name)));
}

export function productsByCategory(id: CategoryId) {
  return uniqueDesigns(PRODUCTS.filter((p) => p.category === id));
}

export function getProduct(slug: string) {
  return PRODUCTS.find((p) => p.slug === slug);
}

export function getProductBySku(sku: string) {
  return PRODUCTS.find((p) => p.sku === sku);
}

/** קטגוריות שיש בהן לפחות דגם אחד — טבעות ייעלמו מעצמן עד שיגיעו */
export const ACTIVE_CATEGORIES = CATEGORY_ORDER.filter((id) =>
  PRODUCTS.some((p) => p.category === id),
);

export const featuredProducts = uniqueDesigns([
  ...PRODUCTS.filter((p) => p.featured),
  ...PRODUCTS.filter((p) => !p.featured),
]).slice(0, 4);

export function formatPrice(value: number) {
  return `₪${value.toLocaleString('he-IL')}`;
}

/** טווח המחירים בקטגוריה — מוצג בכרטיסי הקטגוריות */
export function priceRange(id: CategoryId) {
  const prices = productsByCategory(id).map((p) => salePrice(p.price));
  return { min: Math.min(...prices), max: Math.max(...prices) };
}


/* ============================================================
   מפרטים שנכונים לכל הקטלוג — מוצגים בעמוד המוצר לצד
   המפרט הייחודי של הדגם.
   ============================================================ */

/** מודול הננו — זהה בכל הפריטים */
export const CHIP_SPEC: { label: string; value: string }[] = [
  { label: 'חלון הצריבה', value: '5 × 5 מ״מ · שטח כתיבה כ־0.5 מ״מ²' },
  { label: 'טכנולוגיה', value: 'ליתוגרפיית קרן יונים ממוקדת' },
  { label: 'גובה האות', value: 'כ־9 מיקרון' },
  { label: 'מצע', value: 'סיליקון מונו־קריסטלי' },
  { label: 'הגנה', value: 'חלון אטום, עמיד למים, לזיעה ולתמרוקים' },
  { label: 'בקרה', value: 'השוואה לנוסח המקור לפני השיבוץ' },
];

export const BOX_SPEC: { label: string; value: string }[] = [
  { label: 'אריזה', value: 'קופסה מרופדת - כלולה. אריזת מתנה קשיחה בתוספת ₪49' },
  { label: 'כרטיס ברכה', value: 'שם הברכה, המקורות שלה והנוסח המלא' },
  { label: 'משלוח', value: 'מבוטח · 1-4 ימי עסקים' },
];

export const CARE_SPEC: { label: string; value: string }[] = [
  { label: 'שימוש יומיומי', value: 'להסיר לפני מקלחת, ים ובריכה' },
  { label: 'ניקוי', value: 'בד מיקרופייבר יבש, בלי חומרי ניקוי אגרסיביים' },
  { label: 'אחסון', value: 'בקופסה המקורית, בנפרד מתכשיטים אחרים' },
  { label: 'אחריות', value: 'שנה על פגמי ייצור והלחמות. אינה חלה על שבר משימוש' },
  { label: 'החזרה', value: '30 יום, ללא תנאי' },
];

/**
 * הצילום הטוב ביותר שיש לדגם, לפי סדר יורד של כוח שכנוע.
 *
 * בדיקות שימושיות מראות שתכשיטים הם בין הקטגוריות שבהן חיתוך על רקע
 * לבן אינו מספיק: בלי לראות את הפריט על גוף אי אפשר לשפוט את גודלו
 * ואת נפילתו. הרשת ממשיכה להציג את החיתוך כדי שתישאר סרוקה והשוואתית,
 * והצילום נחשף עליו - ולכן הסדר כאן הוא מה שגובר על החיתוך, לא מה
 * שמחליף אותו.
 */
export function photoFor(
  product: Product,
): { src: string; kind: 'worn' | 'scene'; focus: string } | null {
  const shot = wornFor(product.slug);
  if (shot) {
    return { src: shot.file, kind: 'worn', focus: wornFocus(shot, product.slug) };
  }
  const scene = product.scenes?.[0];
  return scene ? { src: scene, kind: 'scene', focus: sceneFocus(scene, product.slug) } : null;
}

/**
 * מוקד החיתוך של צילומי הסצנה, כערך object-position.
 *
 * הגלריה בדף המוצר היא ריבוע. צילום לרוחב מאבד בו רבע מכל צד וזה
 * נסבל, אבל שלושת הצילומים לגובה (788x1400) מאבדים 44% מהגובה, ובכולם
 * התכשיט יושב בשני־שלישים התחתונים - כלומר חיתוך למרכז דוחף אותו
 * לשפה. שלושתם נמדדו בנפרד ולא הוערכו לפי דפוס.
 */
const SCENE_FOCUS: Record<string, string> = {
  '/scene/toldot-3.jpg': '50% 67%',
  '/scene/lo-yanum-3.jpg': '49% 65%',
};

/**
 * מוקד לכל דגם בנפרד, כשאותו צילום משרת כמה דגמים.
 *
 * בצילום מגן דוד נראים שני הגימורים יחד: הזהב ב-40%/70% והכסף
 * ב-55%/77%. בלי הבחנה, שני עמודי המוצר הציגו את אותה תמונה בדיוק
 * ובשניהם נראה גם הפריט שלא קונים - כלומר עמוד הזהב מכר כסף.
 * המפתח הוא "slug|src", כי המוקד תלוי בשניהם.
 */
const SCENE_FOCUS_BY_PRODUCT: Record<string, string> = {
  'beseter-gold|/scene/beseter-pair.jpg': '40% 70%',
  'beseter|/scene/beseter-pair.jpg': '55% 77%',
  'beseter-gold|/scene/beseter-pair-marble.jpg': '40% 70%',
  'beseter|/scene/beseter-pair-marble.jpg': '55% 77%',
};

export function sceneFocus(src: string, slug?: string) {
  if (slug) {
    const perProduct = SCENE_FOCUS_BY_PRODUCT[`${slug}|${src}`];
    if (perProduct) return perProduct;
  }
  return SCENE_FOCUS[src] ?? '50% 50%';
}

/**
 * המידה של הדגם, לשורת המטא בכרטיס.
 *
 * 42% מהקונים מנסים לשפוט גודל פיזי מהתמונה ו-37% מהאתרים לא נותנים
 * שום רמז. בכרטיס שהצילום בו הוא חיתוך על לבן אין שום קנה מידה, ולכן
 * המידה נשלפת מהמפרט - הערך הראשון שנקוב במילימטרים או בסנטימטרים.
 * מוצג מקוצר: "29.2 מ״מ", בלי שרשראות ההארכה שמאריכות את השורה.
 */
export function sizeCue(product: Product): string | null {
  const spec = product.specs.find((s) => /מ״מ|ס״מ/.test(s.value));
  if (!spec) return null;
  return spec.value.split(' + ')[0].trim();
}
