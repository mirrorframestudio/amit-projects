/**
 * מייצר קובץ Word לכל דגם בספרייה.
 * מריצים אחרי src/build_library.py.
 */
const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, AlignmentType } = require('docx');

const LIB = path.join(__dirname, 'library');
const FONT = 'David';
const catalog = JSON.parse(fs.readFileSync(path.join(LIB, 'catalog.json'), 'utf8'));

const run = (text, size, opts = {}) =>
  new TextRun({
    text,
    rightToLeft: true,
    font: { ascii: FONT, hAnsi: FONT, cs: FONT },
    size,
    sizeComplexScript: size,
    ...opts,
  });

const para = (children, opts = {}) =>
  new Paragraph({ bidirectional: true, children, ...opts });

(async () => {
  for (const m of catalog) {
    const doc = new Document({
      styles: {
        default: {
          document: {
            run: { font: { ascii: FONT, hAnsi: FONT, cs: FONT }, size: 22, sizeComplexScript: 22 },
          },
        },
      },
      sections: [
        {
          properties: {
            page: { margin: { top: 720, bottom: 720, left: 720, right: 720 } },
            bidi: true,
          },
          children: [
            para([run(m.title, 40, { bold: true })], {
              alignment: AlignmentType.CENTER,
              spacing: { after: 80 },
            }),
            para([run(m.ref, 20, { color: '777777' })], {
              alignment: AlignmentType.CENTER,
              spacing: { after: 360 },
            }),
            // כל קטע כפסקה נפרדת — כך הוא נצרב, וכך הוא נראה
            ...(m.segments && m.segments.length ? m.segments : [m.text]).map((seg) =>
              para([run(seg, 22)], {
                alignment: AlignmentType.JUSTIFIED,
                spacing: { line: 300, lineRule: 'auto', after: 140 },
              }),
            ),
          ],
        },
      ],
    });

    const buf = await Packer.toBuffer(doc);
    fs.writeFileSync(path.join(LIB, m.dir, `${m.slug}.docx`), buf);
    console.log(`  ${String(m.index).padStart(2, '0')} ${m.slug}.docx  (${m.chars.toLocaleString()} תווים)`);
  }
  console.log(`\nנבנו ${catalog.length} קבצי Word.`);
})();
