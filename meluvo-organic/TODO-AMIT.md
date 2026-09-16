# מה אמית צריך לעשות (לפי סדר חשיבות)

הכול דברים שדורשים גישה/חשבון/החלטה שלך ואי אפשר לעשות דרך ה-API.

## קודם כל — 5 דקות שהופכות את המאמר השבועי לאוטומטי לגמרי

### 0. טוקן Shopify לסוכן השבועי
רוטינה בענן כותבת מאמר כל שבוע (ראה README → "מאמר שבועי"). בלי טוקן היא רק פותחת PR
עם המאמר; עם טוקן היא מפרסמת לבד.
1. Shopify Admin → Settings → **Apps and sales channels** → **Develop apps** → Create an app →
   שם: `Blog publisher`.
2. Configuration → Admin API integration → סמן **`write_content`** ו-**`read_content`** בלבד → Save.
3. Install app → **Reveal token once** → העתק את ה-`shpat_...`.
4. https://claude.ai/code/environments → הסביבה **Amit** → Environment variables → הוסף
   `SHOPIFY_ADMIN_TOKEN` = הטוקן. (רק שם. לא לשלוח לי בצ'אט.)

## השבוע — 30 דקות סה"כ, הכי משפיע

### 1. Google Search Console (10 דק')
בלי זה גוגל לא יודע שהאתר השתנה, ואין לנו נתונים על מה מדורג.
1. https://search.google.com/search-console → Add property → **Domain** → `mymeluvo.com`
2. אימות דרך DNS (TXT record) אצל רשם הדומיין.
3. אחרי האימות: Sitemaps → הוסף `https://mymeluvo.com/sitemap.xml`.
4. URL Inspection → הדבק את עמוד המשקפיים ואת `/blogs/news` → **Request Indexing**.

### 2. כותרת + תיאור דף הבית (3 דק')
Shopify Admin → Online Store → Preferences → **Title and meta description**:
- Title: `משקפיים לחסימת אור כחול ליום וללילה | Meluvo`
- Description: `משקפי אור כחול של Meluvo – הבחירה של ספורטאים מקצועיים בישראל. עדשה צהובה ליום ועדשה אדומה ללילה לשינה טובה יותר. 14 ימי ניסיון, משלוח חינם לכל הארץ.`

### 3. Google Business Profile (10 דק')
https://business.google.com → עסק אונליין (בלי כתובת פיזית) → קטגוריה "חנות משקפיים" /
"חנות מקוונת". מקבל כרטיס בגוגל + מפות + מקום לביקורות. חינם.

### 4. Google Merchant Center = הופעה חינמית ב-Google Shopping (10 דק')
Shopify Admin → Apps → התקן **"Google & YouTube"** (של Shopify) → חבר חשבון Google →
Merchant Center → אשר "Free listings". המוצר יופיע בטאב Shopping בלי לשלם.
> לפני זה: Products → משקפיים → **Description** — הדבק פסקה של 3-4 שורות (הפיד לוקח משדה
> ה-description שריק כרגע). זה עלול להופיע גם ב-PDP — בדוק שהת'ים לא מציג אותו כפול.

## בשבועיים הקרובים

### 5. ביקורות אמיתיות
Judge.me מותקן עם **ביקורת אחת — שלך**. זה גם מה שגוגל רואה ב-rich snippets.
- Judge.me → Settings → Review Requests → הפעל מייל אוטומטי 14 יום אחרי משלוח.
- שלח ידנית לינק לביקורת ל-20 הלקוחות האחרונים (וואטסאפ עובד הכי טוב).
- יעד: 15+ ביקורות תוך חודש. עם 5+ ביקורות גוגל מתחיל להציג כוכבים בתוצאות.

### 6. קישור לבלוג בתפריט ובפוטר
Online Store → Navigation → Main menu → הוסף "המגזין" → `/blogs/news`. גם בפוטר.
כרגע אין שום קישור לבלוג מהאתר — גוגל ימצא דרך ה-sitemap, אבל גולשים לא.

### 7. עמוד "מאמר" (`/pages/מאמר`)
ה-PDP מקשר אליו ("יותר ממשקפיים: למה ספורטאים..." → "לקריאת המאמר") אבל ה-body ריק
(הטקסט חי ב-sections). שקול: להעביר את התוכן למאמר בבלוג ולהפנות את הקישור לשם.

### 8. הכרעה: handle באנגלית למוצר?
ראה README. אני ממליץ לא עכשיו. אם כן — תגיד לי ואני מריץ עם redirect.

## מתמשך

### 9. מאמר אחד בשבוע — אוטומטי
רוטינה בענן רצה כל יום ראשון בבוקר, לוקחת את הנושא הבא מ-`TOPICS.md`, כותבת לפי `BRIEF.md`
ומפרסמת (או פותחת PR אם אין טוקן — סעיף 0). לשנות נושאים/סדר: לערוך את `TOPICS.md`.

### 10. סושיאל אורגני — `SOCIAL-CALENDAR.md`
הסושיאל הוא המקור מס' 1 שלכם כבר עכשיו (1,234 סשנים). הלוח שם הוא 4 שבועות של
פורמטים חוזרים שאפשר לצלם בטלפון בשעה.

### 11. אחרי 4-6 שבועות
Search Console → Performance → תגיד לי ואני מנתח אילו שאילתות מביאות impressions בלי
clicks (= כותרות לשפר) ואילו מאמרים בעמוד 2 (= לחזק).
