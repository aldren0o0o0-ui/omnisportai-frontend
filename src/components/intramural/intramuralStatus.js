// Single source of truth for Intramural (season) status presentation.
// Reused by IntramuralStatusBadge, IntramuralOverviewCard, and WorkspaceBanner
// so the season lifecycle looks identical everywhere. "Workspace" stays an
// internal backend detail — this module only speaks "Intramural".

export const INTRAMURAL_STATUS_STYLES = {
  ACTIVE:    'bg-[var(--success-soft)] border-[var(--success)] text-[var(--success)]',
  READY:     'bg-[var(--info-soft)] border-[var(--info)] text-[var(--info)]',
  PLANNING:  'bg-[var(--warning-soft)] border-[var(--warning)] text-[var(--warning)]',
  DRAFT:     'bg-[var(--surface-muted)] border-[var(--border-soft)] text-[var(--text-muted)]',
  COMPLETED: 'bg-[var(--surface-muted)] border-[var(--border-soft)] text-[var(--text-muted)]',
  ARCHIVED:  'bg-[var(--surface-muted)] border-[var(--border-soft)] text-[var(--text-soft)]',
};

export const SEMESTER_LABEL = {
  FIRST: '1st Semester',
  SECOND: '2nd Semester',
  SUMMER: 'Summer',
};

export const intramuralStatusStyle = (status) =>
  INTRAMURAL_STATUS_STYLES[String(status || '').toUpperCase()] || INTRAMURAL_STATUS_STYLES.DRAFT;

export const intramuralStatusLabel = (status) => {
  const key = String(status || 'DRAFT').toUpperCase();
  if (key === 'DRAFT') return 'Planning';
  if (key === 'PLANNING') return 'Registration Open';
  return key.replaceAll('_', ' ');
};

export const semesterLabel = (semester) =>
  SEMESTER_LABEL[String(semester || '').toUpperCase()] || semester || '';

// Map a role path prefix to the intramural management route for that role.
// Only the coordinator manages intramurals; everyone else lands on their
// dashboard (they consume the active intramural, they don't switch it).
export const intramuralManagePath = (basePath = '/coordinator') =>
  basePath === '/coordinator' ? '/coordinator/intramurals' : `${basePath}/dashboard`;
