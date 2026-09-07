/**
 * פליטת JSON-LD.
 *
 * `<` מוחלף ברצף בריחה. בלי זה, מחרוזת שמכילה `</script>` - למשל
 * בתיאור של דגם - הייתה סוגרת את התגית מוקדם והופכת את שאר הסכימה
 * ל-HTML גלוי בעמוד. זה גם הווקטור הקלאסי להזרקת סקריפט דרך תוכן.
 */
export default function JsonLd({ data }: { data: object | object[] }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
