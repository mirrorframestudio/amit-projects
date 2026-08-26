import { getProduct } from './catalog';

/**
 * צימודים: דגמים שיש להם צילום משותף שבו הם נענדים יחד.
 *
 * הצילומים האלה כבר צולמו ולא היה להם מקום באתר. הם מאפשרים את
 * הדבר היחיד שהאתר לא ידע להציע - הזמנה שנייה באותה עגלה - והם
 * גם עונים על שאלה שקונה שואל בעצמו: איך זה נראה עם עוד משהו.
 *
 * החוק כאן הוא שהצילום קובע. אין צימוד בלי תמונה שבה שני הדגמים
 * באמת נראים יחד, כי אחרת זו המלצה שהומצאה.
 */
export type Pair = {
  photo: string;
  /** הכיתוב מעל הבלוק */
  title: string;
  note: string;
  /** הדגמים שנראים בצילום. הראשון הוא הדגם שהעמוד שלו מציג אותו */
  members: string[];
};

export const PAIRS: Pair[] = [
  {
    photo: '/scene/pair-libi-er.jpg',
    title: 'הזוג, בכסף ובזהב',
    note: 'אותו דגם בשני הגימורים. נענד יחד, או אחד לכל אחד.',
    members: ['libi-er', 'libi-er-gold'],
  },
  {
    photo: '/scene/pair-ein-sof.jpg',
    title: 'הצמיד והשרשרת',
    note: 'סמל האינסוף חוזר בשניהם, וכל אחד נושא נוסח משלו.',
    members: ['ahavat-olam', 'tipat-or'],
  },
  {
    photo: '/scene/pair-trio.jpg',
    title: 'שלוש שרשראות, שכבה על שכבה',
    note: 'אורכים שונים ונוסחים שונים - הם לא מתחרים על אותו מקום.',
    members: ['al-kapayim', 'toldot', 'tipat-or'],
  },
];

/** הצימוד שבו הדגם מופיע, והדגמים האחרים שבו */
export function pairFor(slug: string) {
  const pair = PAIRS.find((p) => p.members.includes(slug));
  if (!pair) return null;

  const others = pair.members
    .filter((s) => s !== slug)
    .map(getProduct)
    .filter((p): p is NonNullable<ReturnType<typeof getProduct>> => Boolean(p));

  return others.length ? { ...pair, others } : null;
}
