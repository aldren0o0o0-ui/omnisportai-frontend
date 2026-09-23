import React from 'react';
import { History } from 'lucide-react';
import IntramuralStatusBadge from './IntramuralStatusBadge';
import ReadOnlyBadge from './ReadOnlyBadge';
import { semesterLabel } from './intramuralStatus';

// Banner shown when viewing a historical (COMPLETED / ARCHIVED) intramural.
// Makes the read-only, non-active context explicit: "Viewing 2024 University
// Intramurals" + status + read-only badge. Everything remains readable;
// editing controls should be disabled by the surrounding page.
const HistoricalBanner = ({ intramural, className = '' }) => {
  if (!intramural) return null;
  const semester = semesterLabel(intramural.semester);

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10 ${className}`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <History size={16} className="shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-amber-900 dark:text-amber-200">
            Viewing {intramural.name}
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300/80">
            {intramural.school_year}
            {semester ? ` · ${semester}` : ''}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <IntramuralStatusBadge status={intramural.status} />
        <ReadOnlyBadge />
      </div>
    </div>
  );
};

export default HistoricalBanner;
