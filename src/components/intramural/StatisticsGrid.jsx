import React from 'react';
import MetricCard from '../common/MetricCard';

// Responsive grid of stat tiles. Each stat is
// { id, title, value, icon?, color?, trend?, trendLabel? } and renders via the
// existing MetricCard primitive, so styling stays consistent with the rest of
// the app. `columns` controls the responsive column count.
const COLUMN_CLASS = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 xl:grid-cols-4',
  6: 'sm:grid-cols-3 xl:grid-cols-6',
};

const StatisticsGrid = ({ stats = [], columns = 4, className = '' }) => {
  if (!Array.isArray(stats) || stats.length === 0) return null;
  return (
    <section className={`grid gap-3 ${COLUMN_CLASS[columns] || COLUMN_CLASS[4]} ${className}`}>
      {stats.map((stat) => (
        <MetricCard
          key={stat.id}
          title={stat.title}
          value={stat.value}
          icon={stat.icon}
          color={stat.color || 'blue'}
          trend={stat.trend}
          trendLabel={stat.trendLabel}
        />
      ))}
    </section>
  );
};

export default StatisticsGrid;
