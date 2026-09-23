import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import DashboardCard from '../common/DashboardCard';
import IntramuralStatusBadge from './IntramuralStatusBadge';
import { semesterLabel } from './intramuralStatus';

// Shared "Current Active Intramural" header shown at the top of every role
// dashboard. Displays name, academic year, semester, and status. An optional
// `children` slot renders role-specific content beneath the header (e.g. the
// coordinator's setup-progress checklist, or a statistics grid). `manageTo`
// adds a contextual link (coordinators manage; other roles usually omit it).
const IntramuralOverviewCard = ({
  intramural,
  manageTo = null,
  manageLabel = 'Manage Intramural',
  children,
}) => {
  if (!intramural) return null;

  const semester = semesterLabel(intramural.semester);
  const startedLabel = intramural.started_at
    ? `Started ${new Date(intramural.started_at).toLocaleDateString()}`
    : '';
  const dateRange = intramural.start_date
    ? `${new Date(intramural.start_date).toLocaleDateString()}${intramural.end_date ? ` – ${new Date(intramural.end_date).toLocaleDateString()}` : ''}`
    : '';

  return (
    <DashboardCard className="border-l-4 border-l-[var(--primary)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-[var(--text-main)]">{intramural.name}</h1>
            <IntramuralStatusBadge status={intramural.status || 'ACTIVE'} />
          </div>
          <p className="mt-1 inline-flex flex-wrap items-center gap-1 text-sm text-[var(--text-muted)]">
            <CalendarDays size={13} className="text-[var(--text-muted)]" />
            {intramural.school_year}
            {semester ? ` · ${semester}` : ''}
            {startedLabel ? ` · ${startedLabel}` : ''}
          </p>
          {dateRange ? <p className="mt-1 text-sm text-[var(--text-muted)]">Event dates: {dateRange}</p> : null}
          {intramural.description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-muted)]">{intramural.description}</p> : null}
        </div>
        {manageTo ? (
          <Link to={manageTo} className="text-xs font-semibold text-[var(--primary)] hover:underline">
            {manageLabel}
          </Link>
        ) : null}
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </DashboardCard>
  );
};

export default IntramuralOverviewCard;
