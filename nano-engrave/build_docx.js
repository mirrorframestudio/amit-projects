/**
 * בונה מסמך Word עם נוסח המקרא המלא, מנוקד ומוטעם.
 *
 * שתי נקודות קריטיות לעברית ב-Word:
 *  1. bidirectional על הפסקה + rightToLeft על ה-run, אחרת סדר המילים מתהפך.
 *  2. הגופן והגודל חייבים להיקבע גם ב"מסלול הכתב המורכב" (cs / sizeComplexScript) —
 *     Word מנתב עברית מנוקדת דרכו, ובלעדיו הוא מחליף גופן ושובר את הניקוד.
 */
const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, AlignmentType, PageOrientation } = require('docx');

const OUT = path.join(__dirname, 'out');

const args = process.argv.slice(2);
const opt = (k, d) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : d;
};

// ברירת מחדל David: סריף עברי קלאסי, מותקן בכל Windows, כיסוי מלא של
// ניקוד וטעמים. כך המפעל רואה בדיוק את מה שאנחנו רואים, בלי להתקין דבר.
const FONT = opt('font', 'David');
const only = opt('only', null);              // שם ספר יחיד, לדוגמה Genesis
const ptSize = parseFloat(opt('pt', '9'));   // גודל גופן בנקודות
const outName = opt('out', 'tanakh.docx');
const marginTw = Math.round(parseFloat(opt('margin-cm', '1.0')) * 566.93);
const headings = opt('headings', 'yes') === 'yes';

const books = JSON.parse(fs.readFileSync(path.join(OUT, 'tanakh.json'), 'utf8'));
const selected = only ? books.filter((b) => b.id === only) : books;
if (!selected.length) {
  console.error(`לא נמצא ספר בשם ${only}`);
  process.exit(1);
}

const half = Math.round(ptSize * 2); // Word מודד ביחידות של חצי נקודה

const run = (text, opts = {}) =>
  new TextRun({
    text,
    rightToLeft: true,
    font: { ascii: FONT, hAnsi: FONT, cs: FONT },
    size: half,
    sizeComplexScript: half,
    ...opts,
  });

const children = [];
for (const book of selected) {
  if (headings) {
    children.push(
      new Paragraph({
        bidirectional: true,
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 120 },
        children: [
          run(book.he, {
            bold: true,
            size: Math.round(half * 1.6),
            sizeComplexScript: Math.round(half * 1.6),
          }),
        ],
      }),
    );
  }
  for (const chapter of book.chapters) {
    children.push(
      new Paragraph({
        bidirectional: true,
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 0, line: 240, lineRule: 'auto' },
        children: [run(chapter)],
      }),
    );
  }
}

const doc = new Document({
  styles: {
    default: {
      document: {
        run: {
          font: { ascii: FONT, hAnsi: FONT, cs: FONT },
          size: half,
          sizeComplexScript: half,
        },
      },
    },
  },
  sections: [
    {
      properties: {
        page: {
          size: { orientation: PageOrientation.PORTRAIT },
          margin: {
            top: marginTw,
            bottom: marginTw,
            left: marginTw,
            right: marginTw,
          },
        },
        bidi: true,
      },
      children,
    },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  const dest = path.join(OUT, outName);
  fs.writeFileSync(dest, buf);
  const chars = selected.reduce(
    (n, b) => n + b.chapters.reduce((m, c) => m + c.length, 0),
    0,
  );
  console.log(`נשמר: ${dest}`);
  console.log(`ספרים: ${selected.length}  פסקאות: ${children.length}  תווים: ${chars.toLocaleString()}`);
  console.log(`גודל קובץ: ${(buf.length / 1024 / 1024).toFixed(2)} MB  |  גופן ${ptSize}pt  |  שוליים ${(marginTw / 566.93).toFixed(1)} ס״מ`);
});
