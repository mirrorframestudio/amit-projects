/**
 * סימון מובנה (JSON-LD).
 *
 * לפני הקובץ הזה היו באתר אפס בלוקים כאלה, בכל סוגי העמודים. גוגל
 * ידע שיש כאן דפים, ולא ידע שיש כאן חנות: לא מחיר, לא זמינות, לא
 * מותג, ולא ש-135 השאלות בעמודי המוצר הן שאלות.
 *
 * ------------------------------------------------------------------
 * מה שאין כאן, ולא במקרה.
 *
 * אין aggregateRating ואין review. שדות הכוכבים הם הפיתוי הגדול של
 * הסימון המובנה - הם מה שמצייר את הכוכבים הצהובים בתוצאות החיפוש -
 * ולחנות הזו אין ולו ביקורת אחת. סימון דירוג בלי דירוג אמיתי הוא
 * הפרה מפורשת של הנחיות גוגל, והעונש עליה הוא הסרת כל התוצאות
 * העשירות של האתר, לא רק של השדה השקרי.
 *
 * contactPoint נכנס רק כשיש טלפון ב-lib/company.ts - סימון ערוץ קשר
 * שאינו קיים גרוע מלא לסמן כלום.
 * ------------------------------------------------------------------
 *
 * כל מספר כאן נגזר מ-POLICY ומהקטלוג, ולכן שינוי מדיניות מעדכן גם
 * את מה שגוגל רואה. סימון שמתיישן בשקט הוא איך שחנויות מבטיחות
 * בתוצאות החיפוש דברים שהאתר כבר לא מקיים.
 */
import { BRAND } from './brand';
import { SITE_URL } from './site';
import { POLICY, shippingCost } from './policy';
import { MATERIALS, FINISHES, CATEGORIES, type Product } from './catalog';
import { COMPANY } from './company';
import { distinctName } from './seo';
import type { QA } from './faq';

// '/' הופך ל-SITE_URL בלי סלאש, כדי שהבית יופיע בצורה אחת בלבד - כמו
// בקנוניקל ובמפת האתר
const abs = (path: string) => (path.startsWith('http') ? path : path === '/' ? SITE_URL : `${SITE_URL}${path}`);

/** מזהי הגראף, כדי שהישויות יצביעו זו על זו ולא ישוכפלו בכל עמוד */
const ORG_ID = `${SITE_URL}/#organization`;
const SITE_ID = `${SITE_URL}/#website`;

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORG_ID,
    name: BRAND.name,
    alternateName: [BRAND.plain, BRAND.nameLatin],
    url: SITE_URL,
    // הסמל, לא צילום הירו: לוגו לפאנל הידע צריך להיות סימן המותג
    logo: abs('/icon.svg'),
    description: BRAND.manifesto,
    slogan: BRAND.tagline,
    areaServed: { '@type': 'Country', name: 'IL' },
    // יש עכשיו טלפון ודוא"ל פומביים (lib/company.ts), אז מסמנים אותם
    ...(COMPANY.phone
      ? {
          contactPoint: {
            '@type': 'ContactPoint',
            telephone: `+972-${COMPANY.phone.replace(/\D/g, '').replace(/^0/, '')}`,
            email: COMPANY.email,
            contactType: 'customer service',
            availableLanguage: 'he',
            areaServed: 'IL',
          },
        }
      : {}),
  };
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': SITE_ID,
    url: SITE_URL,
    name: BRAND.name,
    inLanguage: 'he-IL',
    publisher: { '@id': ORG_ID },
  };
}

/**
 * מדיניות ההחזרה, כפי שהיא כתובה בתקנון ולא כפי שנעים לסמן.
 *
 * ההחזרה אינה חינם - התכשיט מוחזר על חשבון הלקוח ועל אחריותו, למעט
 * במקרה של פגם. ReturnShippingFees הוא בדיוק זה, ולסמן FreeReturn
 * היה יוצר בתוצאות החיפוש הבטחה שהתקנון סותר.
 */
function returnPolicy() {
  return {
    '@type': 'MerchantReturnPolicy',
    applicableCountry: 'IL',
    returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
    merchantReturnDays: POLICY.returnDays,
    returnMethod: 'https://schema.org/ReturnByMail',
    returnFees: 'https://schema.org/ReturnShippingFees',
  };
}

/** דמי המשלוח להזמנה של הפריט לבדו - כמו בעגלה, ולא התעריף הקבוע לכולם */
function shippingDetails(product: Product) {
  return {
    '@type': 'OfferShippingDetails',
    shippingRate: {
      '@type': 'MonetaryAmount',
      value: shippingCost('delivery', product.price),
      currency: 'ILS',
    },
    shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'IL' },
    deliveryTime: {
      '@type': 'ShippingDeliveryTime',
      // יוצא ביום העסקים הבא; אחרי שעת הסגירה - יום נוסף
      handlingTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 2, unitCode: 'DAY' },
      transitTime: {
        '@type': 'QuantitativeValue',
        minValue: POLICY.deliveryMinDays,
        maxValue: POLICY.deliveryMaxDays,
        unitCode: 'DAY',
      },
    },
  };
}

export function productSchema(product: Product, photos: string[] = []) {
  const images = [product.image, ...photos].filter(Boolean).map(abs);

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${SITE_URL}/products/${product.slug}#product`,
    name: distinctName(product),
    alternateName: product.nameLatin,
    sku: product.sku,
    description: `${product.short}. ${product.story}`,
    image: [...new Set(images)],
    material: MATERIALS[product.material].label,
    color: FINISHES[product.finish],
    category: CATEGORIES[product.category].title,
    brand: { '@type': 'Brand', name: BRAND.name },
    // הברכות אינן וריאנט ואינן משנות מחיר, ולכן הן מאפיין ולא הצעה נפרדת
    additionalProperty: product.specs.map((s) => ({
      '@type': 'PropertyValue',
      name: s.label,
      value: s.value,
    })),
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}/products/${product.slug}`,
      priceCurrency: 'ILS',
      price: product.price,
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@id': ORG_ID },
      hasMerchantReturnPolicy: returnPolicy(),
      shippingDetails: shippingDetails(product),
    },
  };
}

export function faqSchema(items: QA[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((x) => ({
      '@type': 'Question',
      name: x.q,
      acceptedAnswer: { '@type': 'Answer', text: x.a },
    })),
  };
}

export function breadcrumbSchema(trail: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: t.name,
      item: abs(t.path),
    })),
  };
}

export function itemListSchema(products: Product[], path: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `${abs(path)}#list`,
    numberOfItems: products.length,
    itemListElement: products.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE_URL}/products/${p.slug}`,
      name: p.name,
    })),
  };
}

/**
 * מדריך = מאמר. Article ולא BlogPosting: אין כאן מחבר בשם ואין תגובות,
 * יש עמוד תוכן של החנות. datePublished נדרש כדי שגוגל יציג תאריך.
 */
export function articleSchema(g: {
  slug: string;
  title: string;
  metaDescription: string;
  published: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${SITE_URL}/guides/${g.slug}#article`,
    headline: g.title,
    description: g.metaDescription,
    inLanguage: 'he-IL',
    datePublished: g.published,
    dateModified: g.published,
    author: { '@id': ORG_ID },
    publisher: { '@id': ORG_ID },
    mainEntityOfPage: `${SITE_URL}/guides/${g.slug}`,
    image: abs('/hero/hero-landscape.jpg'),
  };
}
