/**
 * צילומי הדגמים — תמונות אמיתיות של התכשיטים על אנשים.
 * תמונה אחת יכולה לשרת כמה דגמים (בצילום הזוג נראים שני צמידים),
 * ולכן המפתח הוא הקובץ והדגמים נגזרים ממנו.
 */
export type WornShot = {
  file: string;
  width: number;
  height: number;
  alt: string;
  /** הדגמים שנראים בפריים — הראשון הוא הנושא של הצילום */
  products: string[];
  /**
   * מוקד החיתוך לכל דגם, כערך object-position.
   *
   * בצילום שנראים בו שני תכשיטים, חיתוך למרכז מפספס את שניהם: ב־lev
   * הצמיד הגברי יושב ברבע השמאלי והנשי בשלושת־רבעים, והמרכז הוא
   * הרווח ביניהם. בלי המוקד, כרטיס ריבועי חותך בדיוק את מה שבאנו
   * להראות. דגם שאינו מופיע כאן נחתך למרכז.
   */
  focus?: Record<string, string>;
};

export const WORN: WornShot[] = [
  {
    file: '/worn/avot.jpg',
    width: 1254,
    height: 1254,
    alt: 'צמיד עבות בכסף על יד גבר, השבב הכחול בחוליה המרכזית',
    products: ['avot'],
  },
  {
    file: '/worn/libi-er.jpg',
    width: 1254,
    height: 1254,
    alt: 'צמיד לב בכסף על יד אישה, השבב הכחול לצד הלב',
    products: ['libi-er'],
  },
  {
    file: '/worn/libi-er-gold.jpg',
    width: 1254,
    height: 1254,
    alt: 'צמיד לב בזהב על יד אישה, השבב הכחול לצד הלב',
    products: ['libi-er-gold'],
  },
  {
    file: '/worn/ahavat-olam.jpg',
    width: 1254,
    height: 1254,
    alt: 'צמיד אהבת עולם בכסף על יד אישה, סמל האינסוף לצד השבב',
    products: ['ahavat-olam'],
  },
  {
    file: '/worn/etz-hachaim.jpg',
    width: 1120,
    height: 1400,
    alt: 'שרשרת עץ החיים בכסף 925 ענודה על הצוואר, השבב הכחול משובץ בין הענפים',
    products: ['toldot'],
  },
  {
    file: '/worn/tipat-or.jpg',
    width: 1050,
    height: 1400,
    alt: 'שרשרת טיפת אור - לולאת אינסוף ותליון השבב הכחול היורד ממנה',
    products: ['tipat-or'],
  },
  {
    file: '/worn/ein-sof.jpg',
    width: 1400,
    height: 1120,
    alt: 'צמיד אין סוף ושרשרת טיפת אור נענדים יחד',
    products: ['ahavat-olam', 'tipat-or'],
    focus: { 'ahavat-olam': '77% 62%', 'tipat-or': '38% 58%' },
  },
  {
    file: '/worn/lev.jpg',
    width: 1400,
    height: 1120,
    alt: 'צמיד עבות על יד גבר וצמיד לב על יד אישה, זה לצד זה',
    products: ['libi-er', 'avot'],
    focus: { 'libi-er': '75% 58%', avot: '28% 57%' },
  },
  {
    file: '/worn/luach.jpg',
    width: 1254,
    height: 1254,
    alt: 'תליון לוח בכסף עם השבב הכחול, וצמיד עבות על פרק היד',
    products: ['luach-libecha', 'avot'],
    focus: { 'luach-libecha': '56% 61%', avot: '8% 67%' },
  },
  {
    file: '/worn/avot-black.jpg',
    width: 1338,
    height: 1176,
    alt: 'צמיד עבות בגימור שחור מלא, השבב הכחול בחוליה המרכזית',
    products: ['avot-black'],
  },
];

/** הצילום שבו הדגם הוא הנושא, ואם אין כזה — הצילום הראשון שהוא מופיע בו */
export function wornFor(slug: string) {
  return (
    WORN.find((w) => w.products[0] === slug) ??
    WORN.find((w) => w.products.includes(slug))
  );
}

/** מוקד החיתוך של דגם בצילום נתון. ברירת המחדל היא מרכז הפריים */
export function wornFocus(shot: WornShot | undefined, slug: string) {
  return shot?.focus?.[slug] ?? '50% 50%';
}
