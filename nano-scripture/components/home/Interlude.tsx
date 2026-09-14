import Image from 'next/image';
import Link from 'next/link';

/**
 * צילום בין שני נושאים בעמוד הבית.
 *
 * רצועה ברוחב המסך, ומתחתיה - על הנייר, לא על הצילום - שם הדגם
 * וקישור אליו. כמו כיתוב לצילום בעיתון: הצילום נקי, והמילים במקומן.
 *
 * אין כאן שכבת הכהיה, אין טקסט על התמונה ואין כפתור. הצילום הוא
 * הנושא, והשורה שמתחתיו היא הדרך היחידה ממנו אל הדגם.
 *
 * הגובה נגזר מרוחב המסך ולא מיחס התמונה: בטלפון רצועה ביחס 2.4:1
 * הייתה 150 פיקסל - פס ולא תמונה. clamp נותן ~240 בטלפון ו-560
 * במסך רחב, ו-object-position שומר על התכשיט בפריים בשני החיתוכים.
 */
export type InterludeShot = {
  src: string;
  /** object-position - איפה התכשיט יושב, כדי שהחיתוך לא יאבד אותו */
  position: string;
  href: string;
  /** שם הדגם או הקטגוריה, כפי שהוא בקטלוג */
  caption: string;
  alt: string;
};

export default function Interlude({
  shot,
  eager = false,
}: {
  shot: InterludeShot;
  /** לרצועה הראשונה, שעלולה להיות בתוך המסך הראשון */
  eager?: boolean;
}) {
  return (
    <figure>
      <div className="relative w-full overflow-hidden" style={{ height: 'clamp(240px, 38vw, 560px)' }}>
        <Image
          src={shot.src}
          alt={shot.alt}
          fill
          sizes="100vw"
          loading={eager ? 'eager' : 'lazy'}
          className="object-cover"
          style={{ objectPosition: shot.position }}
        />
      </div>
      <figcaption className="shell flex items-baseline gap-3 pt-3" style={{ fontSize: 'var(--fs-sm)' }}>
        <span className="display" style={{ fontSize: 'var(--fs-md)' }}>
          {shot.caption}
        </span>
        <Link href={shot.href} className="link-u" style={{ color: 'var(--accent-deep)' }}>
          {shot.href.startsWith('/products/') ? 'לפריט ←' : 'לקטגוריה ←'}
        </Link>
      </figcaption>
    </figure>
  );
}
