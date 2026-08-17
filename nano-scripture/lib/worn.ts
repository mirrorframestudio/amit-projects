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
};

export const WORN: WornShot[] = [
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
  },
  {
    file: '/worn/luach.jpg',
    width: 1254,
    height: 1254,
    alt: 'תליון לוח בכסף עם השבב הכחול, וצמיד חישוק על פרק היד',
    products: ['luach-libecha', 'chishuk'],
  },
  {
    file: '/worn/lev.jpg',
    width: 1400,
    height: 1120,
    alt: 'צמיד חישוק על יד גבר וצמיד לב על יד אישה, זה לצד זה',
    products: ['libi-er', 'chishuk'],
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
