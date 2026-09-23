import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

// Reusable breadcrumb trail for the Intramural-first navigation model.
// Pass an array of segments: { label, to? }. Segments with `to` are links; the
// last (or any without `to`) render as plain current-location text. Designed to
// be passed straight into PageHeaderCard's `breadcrumbs` prop, e.g.
//   <Breadcrumbs trail={[{ label: 'Intramural', to: '/coordinator/dashboard' }, { label: 'Sports' }]} />
// renders "Intramural › Sports". Keeps the whole app consistent instead of the
// previous mix of slash-joined strings.
const Breadcrumbs = ({ trail = [] }) => {
  const items = Array.isArray(trail) ? trail.filter(Boolean) : [];
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="min-w-0 text-sm">
      <ol className="flex min-w-0 flex-wrap items-center gap-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const label = typeof item === 'string' ? item : item.label;
          const to = typeof item === 'string' ? null : item.to;
          return (
            <li key={`${label}-${index}`} className="inline-flex items-center gap-1">
              {to && !isLast ? (
                <Link
                  to={to}
                  className="rounded-sm text-[var(--text-muted)] transition-colors duration-150 hover:text-[var(--primary)] hover:underline motion-reduce:transition-none"
                >
                  {label}
                </Link>
              ) : (
                <span
                  className={isLast ? 'text-[var(--text-main)]' : 'text-[var(--text-soft)]'}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {label}
                </span>
              )}
              {!isLast ? (
                <ChevronRight size={12} className="shrink-0 text-[var(--text-soft)] opacity-60" aria-hidden="true" />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
