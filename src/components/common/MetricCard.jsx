import React from 'react';
import DashboardCard from './DashboardCard';

const MetricCard = ({ title, value, icon: Icon, color = 'blue', trend, trendLabel }) => {
  const colorMap = {
    blue: 'text-[var(--info)] bg-[var(--info-soft)]',
    green: 'text-[var(--success)] bg-[var(--success-soft)]',
    orange: 'text-[var(--warning)] bg-[var(--warning-soft)]',
    red: 'text-[var(--danger)] bg-[var(--danger-soft)]',
    slate: 'text-[var(--text-muted)] bg-[var(--surface-muted)]',
  };

  const iconClasses = colorMap[color] || colorMap.blue;

  return (
    <DashboardCard className="flex items-center gap-4 !py-4">
      {Icon && (
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] ${iconClasses}`} aria-hidden="true">
          <Icon size={20} />
        </div>
      )}
      <div className="flex-1 overflow-hidden">
        <p className="truncate text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
          {title}
        </p>
        <div className="flex items-baseline gap-2">
          <h3 className="truncate text-2xl font-bold text-[var(--text-main)]">{value}</h3>
          {(trend !== undefined || trendLabel) && (
            <span className={`text-xs font-semibold ${trend > 0 ? 'text-[var(--success)]' : trend < 0 ? 'text-[var(--danger)]' : 'text-[var(--text-soft)]'}`}>
              {trend > 0 ? '+' : ''}{trend}{trendLabel || '%'}
            </span>
          )}
        </div>
      </div>
    </DashboardCard>
  );
};

export default MetricCard;
