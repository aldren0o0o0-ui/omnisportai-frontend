import React, { createContext, useContext, useMemo } from 'react';
import PageHeaderCard from '../common/PageHeaderCard';
import LoadingState from '../common/LoadingState';
import ErrorState from '../common/ErrorState';
import Breadcrumbs from '../common/Breadcrumbs';
import { useWorkspace } from '../../context/WorkspaceContext';
import EmptyIntramuralState from './EmptyIntramuralState';
import HistoricalBanner from './HistoricalBanner';
import IntramuralOverviewCard from './IntramuralOverviewCard';

// ---------------------------------------------------------------------------
// IntramuralPage — the standard entry point for every intramural-dependent page.
//
// It owns the whole page lifecycle so individual pages only render content:
//
//   WorkspaceContext initializes
//     → loading state (context or page-supplied)
//     → no active intramural?      → standardized EmptyIntramuralState (role-aware)
//     → error?                     → shared ErrorState (+ retry)
//     → permission denied?         → shared permission message
//     → historical intramural?     → HistoricalBanner + read-only mode
//     → render page content
//
// Read-only/historical state is exposed via useIntramuralPage() so nested
// controls can disable mutations without prop-drilling. Refresh-after-
// WORKSPACE_CHANGED_EVENT is already handled by WorkspaceContext + the data
// hooks, so switching the active intramural re-renders every page automatically.
// ---------------------------------------------------------------------------

const HISTORICAL_STATUSES = new Set(['COMPLETED', 'ARCHIVED']);

const IntramuralPageContext = createContext({
  intramural: null,
  isHistorical: false,
  readOnly: false,
});

// Nested components (tables, action bars) call this to respect read-only mode.
export const useIntramuralPage = () => useContext(IntramuralPageContext);

const IntramuralPage = ({
  // Header
  title,
  subtitle,
  icon,
  breadcrumbs,              // array of {label,to} segments, or a node; auto-prefixed with "Intramural"
  headerAction = null,

  // Role (drives the empty-state copy + CTA)
  role = 'viewer',

  // Page data state (page owns fetching; wrapper owns presentation)
  loading = false,
  error = '',
  onRetry = null,

  // Gating
  requireActive = true,     // when false, page renders even with no active intramural
  canAccess = true,         // permission-aware rendering (RBAC decided by caller)
  permissionMessage = 'You do not have permission to view this page.',

  // Optional overview header card (name / year / semester / status)
  showOverview = false,
  manageTo = null,

  shellClassName = '',      // extra classes appended to the os-page-shell container

  children,                 // node, or ({ intramural, isHistorical, readOnly }) => node
}) => {
  const {
    workspace: activeIntramural,
    selectedIntramural,
    loading: intramuralLoading,
  } = useWorkspace();

  // The page operates on the SELECTED (viewing) intramural — the single source.
  // Falls back to the active one (selected defaults to active until the user
  // picks another to browse).
  const intramural = selectedIntramural || activeIntramural || null;

  const isHistorical = intramural
    ? HISTORICAL_STATUSES.has(String(intramural.status || '').toUpperCase())
    : false;
  const readOnly = isHistorical || !canAccess;

  const ctxValue = useMemo(
    () => ({ intramural, isHistorical, readOnly }),
    [intramural, isHistorical, readOnly]
  );

  // Breadcrumbs: accept an array (auto-prefixed with the "Intramural" root) or a node.
  const breadcrumbNode = Array.isArray(breadcrumbs)
    ? <Breadcrumbs trail={[{ label: 'Intramural' }, ...breadcrumbs]} />
    : breadcrumbs;

  const shellClass = `os-page-shell ${shellClassName}`.trim();

  const header = (
    <PageHeaderCard
      title={title}
      subtitle={subtitle}
      icon={icon}
      breadcrumbs={breadcrumbNode}
      action={headerAction}
    />
  );

  // 1. Still initializing the active-intramural context → single shared loader.
  if (intramuralLoading) {
    return (
      <div className={shellClass}>
        {header}
        <LoadingState message="Loading intramural..." />
      </div>
    );
  }

  // 2. No intramural to view and the page requires one → standardized empty page.
  if (requireActive && !intramural) {
    return (
      <div className={shellClass}>
        {header}
        <EmptyIntramuralState role={role} />
      </div>
    );
  }

  // 3. Permission gate (RBAC decision is the caller's; presentation is shared).
  if (!canAccess) {
    return (
      <div className={shellClass}>
        {header}
        <ErrorState
          title="Access restricted"
          message={permissionMessage}
        />
      </div>
    );
  }

  // 4. Error state → shared component with optional retry.
  if (error) {
    return (
      <div className={shellClass}>
        {header}
        <ErrorState message={typeof error === 'string' ? error : 'Unable to load intramural data.'} onRetry={onRetry || undefined} />
      </div>
    );
  }

  const content = typeof children === 'function' ? children(ctxValue) : children;

  return (
    <IntramuralPageContext.Provider value={ctxValue}>
      <div className={shellClass}>
        {header}

        {/* Historical (selected) intramural → read-only banner above content. */}
        {isHistorical && intramural ? (
          <HistoricalBanner intramural={intramural} className="mb-1" />
        ) : null}

        {/* Optional overview header card (name / year / semester / status). */}
        {showOverview && intramural ? (
          <IntramuralOverviewCard intramural={intramural} manageTo={manageTo} />
        ) : null}

        {loading ? <LoadingState message={`Loading ${String(title || 'data').toLowerCase()}...`} /> : content}
      </div>
    </IntramuralPageContext.Provider>
  );
};

export default IntramuralPage;
