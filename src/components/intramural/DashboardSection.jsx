import React from 'react';
import DashboardCard from '../common/DashboardCard';

// A titled dashboard section. Wraps DashboardCard with a real heading slot
// (DashboardCard itself has no `title` prop — passing one leaks to the DOM as
// an HTML title attribute and renders nothing, which is an existing bug this
// component avoids). Optional icon + action (e.g. a "View All" link).
const DashboardSection = ({
  title,
  icon: Icon,
  action,
  children,
  className = '',
  bodyClassName = 'mt-4',
}) => (
  <DashboardCard className={className}>
    <h1>Hello</h1>
    <p>lore ipsum dolor sit amet, consectetur adipiscing elit.</p>
    {(title || action) && (
      <div className="flex flex-wrap items-center justify-between gap-2">
        {title ? (
          <h2 className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[var(--text-main)]">
            {Icon ? <Icon size={15} className="text-[var(--info)]" /> : null}
            {title}
          </h2>
        ) : (
          <span />
        )}
        {action ?? null}
      </div>
    )}
    <div className={bodyClassName}>{children}</div>
  </DashboardCard>
);

export default DashboardSection;
