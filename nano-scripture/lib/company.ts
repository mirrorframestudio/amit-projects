/**
 * פרטי העוסק. מקור אמת יחיד למסמכים המשפטיים.
 *
 * שדה שעדיין לא ידוע נשאר null ולא מחרוזת ממלאת־מקום, כדי שהמסמך
 * ידלג עליו בשקט במקום להדפיס סימן שאלה באמצע משפט משפטי.
 */
export const COMPANY = {
  legalName: 'מקרא',
  /** מספר עוסק ליחיד, או ח.פ. לחברה */
  regNumber: 'עוסק מורשה 324082478',
  address: 'גולדה מאיר 112, מודיעין',
  email: 'mikrajewelry@gmail.com',
  /** חוק הגנת הצרכן מחייב אמצעי קשר טלפוני */
  phone: null as string | null,
  /** ערוץ הביטול הרשמי. ללא מספר אי אפשר לממש אותו בפועל */
  whatsapp: null as string | null,
  /** ממונה נגישות - נדרש בהצהרת הנגישות */
  accessibilityContact: null as string | null,
  updated: 'אוגוסט 2026',
};

/** מה שעדיין חסר וחובה על פי דין. ריק = אפשר לפרסם */
export const MISSING: string[] = [
  ...(COMPANY.phone ? [] : ['טלפון ליצירת קשר']),
  ...(COMPANY.whatsapp ? [] : ['מספר וואטסאפ - ערוץ הביטול שהוגדר בתקנון']),
  ...(COMPANY.accessibilityContact ? [] : ['שם ואמצעי קשר של ממונה נגישות']),
];

/** שורת יצירת הקשר, בלי פסיק תלוי כשאין טלפון */
export const contactLine = [COMPANY.email, COMPANY.phone].filter(Boolean).join(' · ');
