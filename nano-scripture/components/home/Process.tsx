'use client';

import { useRef } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';

const STEPS = [
  {
    n: '01',
    title: 'הכנת הפרוסה',
    body: 'פרוסת סיליקון מלוטשת עד לחספוס של פחות מננומטר אחד, ומצופה בשכבת זהב דקה. פגם בפני השטח יפסול את השבב בהמשך.',
  },
  {
    n: '02',
    title: 'צריבת הכתב',
    body: 'קרן יונים ממוקדת חורטת את הטקסט אות אחר אות, בגובה אות של כתשעה מיקרון. התהליך מתבצע בחדר נקי בוואקום מלא.',
  },
  {
    n: '03',
    title: 'אימות ובקרה',
    body: 'הכתב שעל השבב מושווה לנוסח המקור, תו אחר תו. שבב שסוטה ולו בתו אחד - נפסל.',
  },
  {
    n: '04',
    title: 'שיבוץ וגימור',
    body: 'צורף משבץ את השבב בגוף התכשיט מתחת לחלון ספיר, אוטם אותו, ומלטש את המתכת ביד. כל פריט יוצא עם מספר סידורי ותעודה.',
  },
];

export default function Process() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 65%', 'end 60%'] });
  const scaleY = useSpring(scrollYProgress, { stiffness: 90, damping: 26, restDelta: 0.001 });

  return (
    <section className="py-28 md:py-40">
      <div className="shell grid gap-16 lg:grid-cols-[.85fr_1.15fr] lg:gap-24">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <p className="eyebrow reveal">מהתהליך</p>
          <h2 className="display t-1 mt-5">
            <span className="mask-line">
              <span>אות אחת</span>
            </span>
            <span className="mask-line">
              <span className="gold-text" style={{ ['--d' as string]: '110ms' }}>
                בכל פעם
              </span>
            </span>
          </h2>
          <p className="lede reveal mt-7 max-w-sm" style={{ ['--d' as string]: '180ms' }}>
            ארבעה שלבים, אף אחד מהם לא ממוכן במלואו. השבב נולד במעבדה - התכשיט
            נולד על שולחן הצורף.
          </p>
        </div>

        <div ref={ref} className="relative">
          {/* קו התקדמות שנמתח יחד עם הגלילה */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              insetInlineStart: 0,
              top: 8,
              bottom: 8,
              width: 1,
              background: 'var(--line)',
            }}
          >
            <motion.div
              style={{
                scaleY,
                transformOrigin: 'top',
                width: '100%',
                height: '100%',
                background: 'linear-gradient(to bottom, var(--accent), var(--spark))',
              }}
            />
          </div>

          <div className="flex flex-col gap-14 ps-10 md:gap-20 md:ps-16">
            {STEPS.map((s, i) => (
              <div key={s.n} className="reveal relative" style={{ ['--d' as string]: `${i * 60}ms` }}>
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    insetInlineStart: -41,
                    top: 12,
                    width: 7,
                    height: 7,
                    borderRadius: 99,
                    background: 'var(--accent)',
                    boxShadow: '0 0 0 4px var(--bg)',
                  }}
                />
                <p
                  className="num display"
                  style={{ fontSize: 'var(--fs-base)', letterSpacing: '.3em', color: 'var(--accent)' }}
                >
                  {s.n}
                </p>
                <h3 className="display t-2 mt-3">{s.title}</h3>
                <p className="lede mt-4 max-w-xl" style={{ fontSize: 'var(--fs-md)' }}>
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
