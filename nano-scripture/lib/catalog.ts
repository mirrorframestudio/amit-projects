import { salePrice } from './promo';
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
  /** צילום מסוגנן של הפריט בסביבה - נכנס לגלריה כתצוגה נוספת */
  scene?: string;
  badge?: string;
  featured?: boolean;
};

export const PRODUCTS: Product[] = [
  /* ---------- כסף 925 ---------- */
  {
    sku: 'YASNN004W',
    slug: 'toldot',
    name: 'תּוֹלְדוֹת',
    nameLatin: 'TOLDOT',
    source: { phrase: 'אֵלֶּה תוֹלְדוֹת הַשָּׁמַיִם וְהָאָרֶץ', ref: 'בראשית ב׳, ד׳' },
    category: 'necklaces',
    material: 'silver925',
    finish: 'silver',
    audience: 'women',
    price: 749,
    cost: 31.9,
    image: '/products/YASNN004W.png',
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
    image: '/products/YASNN010W.png',
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
    name: 'אַהֲבַת עוֹלָם',
    nameLatin: 'AHAVAT OLAM',
    source: { phrase: 'וְאַהֲבַת עוֹלָם אֲהַבְתִּיךְ', ref: 'ירמיהו ל״א, ב׳' },
    category: 'bracelets',
    material: 'silver925',
    finish: 'silver',
    audience: 'women',
    price: 549,
    cost: 15.4,
    image: '/products/YASNB001W.png',
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
    name: 'עַל כַּפַּיִם',
    nameLatin: 'AL KAPAYIM',
    source: { phrase: 'הֵן עַל־כַּפַּיִם חַקֹּתִיךְ', ref: 'ישעיהו מ״ט, ט״ז' },
    category: 'necklaces',
    material: 'steel',
    finish: 'silver',
    audience: 'women',
    price: 299,
    cost: 6.0,
    image: '/products/OYANN012S.png',
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
    name: 'בְּסֵתֶר',
    nameLatin: 'BESETER',
    source: { phrase: 'יֹשֵׁב בְּסֵתֶר עֶלְיוֹן', ref: 'תהילים צ״א, א׳' },
    category: 'necklaces',
    material: 'steel',
    finish: 'silver',
    audience: 'men',
    price: 299,
    cost: 5.6,
    image: '/products/OYANN003S.png',
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
    name: 'בְּסֵתֶר',
    nameLatin: 'BESETER',
    source: { phrase: 'יֹשֵׁב בְּסֵתֶר עֶלְיוֹן', ref: 'תהילים צ״א, א׳' },
    category: 'necklaces',
    material: 'steel',
    finish: 'gold',
    audience: 'men',
    price: 329,
    cost: 6.5,
    image: '/products/OYANN003G.png',
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
    name: 'לֹא יָנוּם',
    nameLatin: 'LO YANUM',
    source: { phrase: 'הִנֵּה לֹא־יָנוּם וְלֹא יִישָׁן שׁוֹמֵר יִשְׂרָאֵל', ref: 'תהילים קכ״א, ד׳' },
    category: 'necklaces',
    material: 'steel',
    finish: 'silver',
    audience: 'women',
    price: 299,
    cost: 6.0,
    image: '/products/OYANN011S.png',
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
    image: '/products/OYANN006S.png',
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
    name: 'כַּחוֹתָם',
    nameLatin: 'KACHOTAM',
    source: { phrase: 'שִׂימֵנִי כַחוֹתָם עַל־לִבֶּךָ', ref: 'שיר השירים ח׳, ו׳' },
    category: 'necklaces',
    material: 'steel',
    finish: 'gold',
    audience: 'women',
    price: 329,
    cost: 6.8,
    image: '/products/OYANN001G.png',
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
    name: 'עֲבוֹת',
    nameLatin: 'AVOT',
    source: { phrase: 'בְּחַבְלֵי אָדָם אֶמְשְׁכֵם בַּעֲבֹתוֹת אַהֲבָה', ref: 'הושע י״א, ד׳' },
    category: 'bracelets',
    material: 'steel',
    finish: 'retro',
    audience: 'men',
    price: 349,
    cost: 7.0,
    image: '/products/OYANB007RS.png',
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
    scene: '/scene/avot-black.jpg',
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
    image: '/products/OYANB007B.png',
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
    name: 'לִבִּי עֵר',
    nameLatin: 'LIBI ER',
    source: { phrase: 'אֲנִי יְשֵׁנָה וְלִבִּי עֵר', ref: 'שיר השירים ה׳, ב׳' },
    category: 'bracelets',
    material: 'steel',
    finish: 'silver',
    audience: 'women',
    price: 289,
    cost: 6.0,
    image: '/products/OYANB002S.png',
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
    name: 'לִבִּי עֵר',
    nameLatin: 'LIBI ER',
    source: { phrase: 'אֲנִי יְשֵׁנָה וְלִבִּי עֵר', ref: 'שיר השירים ה׳, ב׳' },
    category: 'bracelets',
    material: 'steel',
    finish: 'gold',
    audience: 'women',
    price: 319,
    cost: 6.8,
    image: '/products/OYANB002G.png',
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
    image: '/products/OYANB001S.png',
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
    image: '/products/BABYPIN01.png',
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
  { label: 'עובי האות', value: '5 ננומטר' },
  { label: 'מצע', value: 'סיליקון מונו־קריסטלי' },
  { label: 'הגנה', value: 'חלון אטום, עמיד למים, לזיעה ולתמרוקים' },
  { label: 'בקרה', value: 'השוואה לנוסח המקור לפני השיבוץ' },
];

export const BOX_SPEC: { label: string; value: string }[] = [
  { label: 'אריזה', value: 'קופסה מרופדת - כלולה. אריזת מתנה קשיחה בתוספת ₪49' },
  { label: 'כרטיס ברכה', value: 'שם הברכה, המקורות שלה והנוסח המלא' },
  { label: 'זכוכית מגדלת', value: 'כלולה - לראות את פני השבב מקרוב' },
  { label: 'משלוח', value: 'מבוטח · חינם בהזמנה מעל ₪450' },
];

export const CARE_SPEC: { label: string; value: string }[] = [
  { label: 'שימוש יומיומי', value: 'להסיר לפני מקלחת, ים ובריכה' },
  { label: 'ניקוי', value: 'בד מיקרופייבר יבש, בלי חומרי ניקוי אגרסיביים' },
  { label: 'אחסון', value: 'בקופסה המקורית, בנפרד מתכשיטים אחרים' },
  { label: 'אחריות', value: 'שנתיים על השבב, השיבוץ והסוגר' },
  { label: 'החזרה', value: '30 יום, ללא תנאי' },
];
