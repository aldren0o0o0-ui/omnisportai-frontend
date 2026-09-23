import React from 'react';
import PageHeaderCard from '../common/PageHeaderCard';
import LoadingState from '../common/LoadingState';
import { useWorkspace } from '../../context/WorkspaceContext';
import IntramuralOverviewCard from './IntramuralOverviewCard';
import EmptyIntramuralState from './EmptyIntramuralState';

// Shared page shell for every role dashboard. Previously each role page
// repeated: header + error banner + loading gate + delegate-to-layout. This
// centralizes that, and makes every role Intramural-first:
//   - no active intramural  → role-specific EmptyIntramuralState (no blank page)
//   - active intramural     → IntramuralOverviewCard header, then role content
//
// Consumes useWorkspace() once here so individual pages don't each wire it.
// The dashboard data hook already re-fetches on WORKSPACE_CHANGED_EVENT, so
// switching the active intramural updates every role automatically.
const RoleDashboardShell = ({
  role,
  eyebrow,
  title,
  subtitle,
  icon,
  headerAction = null,
  loading = false,
  error = '',
  manageTo = null,
  overviewChildren = null,
  showOverviewCard = true,
  children,
}) => {
  const {
    selectedIntramural,
    workspace: activeIntramural,
    loading: intramuralLoading,
  } = useWorkspace();
  const viewingIntramural = selectedIntramural || activeIntramural || null;

  if (!intramuralLoading && !viewingIntramural) {
    return (
      <div className="os-page-shell w-full min-w-0 max-w-full overflow-hidden">
        <PageHeaderCard eyebrow={eyebrow} title={title} subtitle={subtitle} icon={icon} />
        <EmptyIntramuralState role={role} />
      </div>
    );
  }

  return (
    <div className="os-page-shell w-full min-w-0 max-w-full overflow-hidden">
      <PageHeaderCard
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        icon={icon}
        action={headerAction}
      />

      {viewingIntramural && showOverviewCard ? (
        <IntramuralOverviewCard intramural={viewingIntramural} manageTo={manageTo}>
          {overviewChildren}
        </IntramuralOverviewCard>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-400">
          {error}
        </div>
      ) : null}

      {loading ? <LoadingState message={`Loading ${title.toLowerCase()}...`} /> : children}
    </div>
  );
};

export default RoleDashboardShell;
