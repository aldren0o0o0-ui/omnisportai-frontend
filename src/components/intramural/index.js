// Shared Intramural-first UI primitives. Compose these in role dashboards
// instead of duplicating layout/empty-state/header markup.
export { default as RoleDashboardShell } from './RoleDashboardShell';
export { default as IntramuralOverviewCard } from './IntramuralOverviewCard';
export { default as IntramuralStatusBadge } from './IntramuralStatusBadge';
export { default as IntramuralCard } from './IntramuralCard';
export { default as IntramuralGallery } from './IntramuralGallery';
export { default as EmptyIntramuralState } from './EmptyIntramuralState';
export { default as SetupProgressChecklist } from './SetupProgressChecklist';
export { default as DashboardSection } from './DashboardSection';
export { default as StatisticsGrid } from './StatisticsGrid';
export { default as HistoricalBanner } from './HistoricalBanner';
export { default as ReadOnlyBadge } from './ReadOnlyBadge';
export { default as IntramuralPage, useIntramuralPage } from './IntramuralPage';
export * from './intramuralStatus';
