import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CalendarDays, ChevronRight, Layers } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { intramuralStatusLabel } from '../intramural/intramuralStatus';

const STATUS_STYLES = {
  ACTIVE:    'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-300',
  READY:     'bg-slate-50 border-slate-200 text-slate-600 dark:bg-[var(--surface-soft)] dark:border-slate-700 dark:text-slate-300',
  PLANNING:  'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-300',
  DRAFT:     'bg-slate-50 border-slate-200 text-slate-600 dark:bg-[var(--surface-soft)] dark:border-slate-700 dark:text-slate-400',
  COMPLETED: 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-[var(--surface-soft)] dark:border-slate-700 dark:text-slate-400',
  CANCELLED: 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-[var(--surface-soft)] dark:border-slate-700 dark:text-slate-400',
  ARCHIVED:  'bg-slate-50 border-slate-200 text-slate-500 dark:bg-[var(--surface-soft)] dark:border-slate-700 dark:text-slate-500',
};

const SEMESTER_LABEL = { FIRST: '1st Semester', SECOND: '2nd Semester', SUMMER: 'Summer' };

const rolePrefixFromPath = (pathname) => {
  if (pathname.startsWith('/coordinator')) return 'coordinator';
  if (pathname.startsWith('/department')) return 'department';
  if (pathname.startsWith('/sport-facilitator')) return 'sport-facilitator';
  if (pathname.startsWith('/coach')) return 'coach';
  return 'viewer';
};

const WorkspaceBanner = ({ className = '' }) => {
  const { workspace, loading, error } = useWorkspace();
  const location = useLocation();
  const rolePrefix = rolePrefixFromPath(location.pathname);
  const isCoordinator = rolePrefix === 'coordinator';

  if (loading) {
    return (
      <div className={`flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-400 dark:border-slate-700 dark:bg-[var(--surface-soft)] ${className}`}>
        <Layers size={13} className="shrink-0 opacity-50" />
        <span>Loading intramural...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400 ${className}`}>
        <Layers size={13} className="shrink-0" />
        <span>Intramural unavailable</span>
      </div>
    );
  }

  if (!workspace) {
    if (!isCoordinator) return null;
    return (
      <div className={`flex items-center justify-between gap-2 rounded-xl border border-dashed border-amber-300 bg-amber-50 px-3 py-2 dark:border-amber-500/30 dark:bg-amber-500/10 ${className}`}>
        <div className="flex items-center gap-2">
          <Layers size={13} className="shrink-0 text-amber-600 dark:text-amber-400" />
          <span className="text-xs font-medium text-amber-700 dark:text-amber-300">No active intramural</span>
        </div>
        <Link
          to="/coordinator/intramurals"
          className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:underline dark:text-amber-300"
        >
          Manage <ChevronRight size={11} />
        </Link>
      </div>
    );
  }

  const statusKey = String(workspace.status || '').toUpperCase();
  const statusStyle = STATUS_STYLES[statusKey] || STATUS_STYLES.DRAFT;
  const semesterLabel = SEMESTER_LABEL[String(workspace.semester || '').toUpperCase()] || workspace.semester;

  return (
    <div className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 ${statusStyle} ${className}`}>
      <div className="flex min-w-0 items-center gap-2">
        <Layers size={13} className="shrink-0" />
        <span className="truncate text-xs font-semibold">{workspace.name}</span>
        <span className="hidden items-center gap-1 text-xs opacity-70 sm:inline-flex">
          <CalendarDays size={11} />
          {workspace.school_year}{semesterLabel ? ` · ${semesterLabel}` : ''}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
          {intramuralStatusLabel(statusKey)}
        </span>
        {isCoordinator && (
          <Link
            to="/coordinator/intramurals"
            className="inline-flex items-center gap-0.5 text-[11px] font-semibold opacity-70 hover:opacity-100"
          >
            Manage <ChevronRight size={10} />
          </Link>
        )}
      </div>
    </div>
  );
};

export default WorkspaceBanner;
