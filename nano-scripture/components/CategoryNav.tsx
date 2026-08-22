import Link from 'next/link';
import { CATEGORIES, ACTIVE_CATEGORIES, productsByCategory, type CategoryId } from '@/lib/catalog';

/** שורת מעבר בין הקטגוריות — מופיעה בראש כל דף קטלוג */
export default function CategoryNav({ current }: { current?: CategoryId }) {
  return (
    <nav
      className="no-scrollbar flex gap-2 overflow-x-auto"
      aria-label="קטגוריות"
    >
      {ACTIVE_CATEGORIES.map((id) => {
        const cat = CATEGORIES[id];
        const active = id === current;
        return (
          <Link
            key={id}
            href={`/categories/${id}`}
            aria-current={active ? 'page' : undefined}
            style={{
              flexShrink: 0,
              padding: '.62rem 1.35rem',
              borderRadius: 99,
              fontSize: 'var(--fs-sm)',
              letterSpacing: '.03em',
              whiteSpace: 'nowrap',
              border: `1px solid ${active ? 'var(--accent)' : 'var(--line)'}`,
              background: active ? 'var(--accent)' : 'transparent',
              color: active ? 'var(--on-accent)' : 'var(--ink-2)',
              transition: 'all .35s var(--ease)',
            }}
          >
            {cat.title}
            <span className="num" style={{ opacity: 0.6, marginInlineStart: '.5rem', fontSize: 'var(--fs-xs)' }}>
              {productsByCategory(id).length}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
