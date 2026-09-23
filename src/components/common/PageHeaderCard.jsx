import React from 'react';

const PageHeaderCard = ({ eyebrow, title, subtitle, action, icon: Icon, leading = null }) => {
  return (
    <header className="mb-2 flex min-w-0 flex-col justify-between gap-[var(--space-4)] md:flex-row md:items-center">
      <div className="flex min-w-0 items-start gap-[var(--space-4)]">
        {leading || (Icon && (
          <div className="os-page-header-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12 sm:rounded-2xl">
            <Icon size={24} />
          </div>
        ))}
        <div className="min-w-0">
          {eyebrow ? (
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="os-page-title">{title}</h1>
          {subtitle && (
            <p className="os-page-subtitle">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div className="flex w-full min-w-0 flex-wrap items-center justify-start gap-[var(--space-2)] md:w-auto md:justify-end [&>button]:min-h-11 [&>a]:min-h-11">{action}</div>}
    </header>
  );
};

export default PageHeaderCard;
