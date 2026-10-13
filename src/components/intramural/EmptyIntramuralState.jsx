import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  ChevronRight,
  FolderPlus,
  Plus,
  Trophy,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import useIntramuralList from '../../hooks/useIntramuralList';
import IntramuralStatusBadge from './IntramuralStatusBadge';
import { semesterLabel } from './intramuralStatus';
import {
  getDisplayName,
  getEmptyIntramuralPresentation,
} from './emptyIntramuralPresentation';

const ROLE_LABELS = {
  coordinator: 'Sports Coordinator',
  department: 'Department Manager',
  coach: 'Coach',
  'sport-facilitator': 'Sports Facilitator',
  viewer: 'OmniSport Portal',
};

const EmptyIntramuralState = ({ role = 'viewer' }) => {
  const navigate = useNavigate();
  const { user, isSportsCoordinator: authIsCoordinator, roleNames } = useAuth();
  const { selectIntramural } = useWorkspace();
  const { intramurals, loading: listLoading } = useIntramuralList();

  const isCoordinator =
    Boolean(authIsCoordinator) ||
    role === 'coordinator' ||
    (Array.isArray(roleNames) && roleNames.includes('SPORTS_COORDINATOR'));

  const hasAvailableIntramurals = Array.isArray(intramurals) && intramurals.length > 0;
  const displayName = useMemo(() => getDisplayName(user), [user]);
  const roleBadgeText = ROLE_LABELS[role] || (isCoordinator ? 'Sports Coordinator' : 'Tournament Portal');

  const presentation = useMemo(
    () => getEmptyIntramuralPresentation({ isCoordinator, hasAvailableIntramurals }),
    [isCoordinator, hasAvailableIntramurals]
  );
  const descriptionText = presentation.description;

  return (
    <div className="mx-auto w-full max-w-5xl py-6 sm:py-8 lg:py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8 lg:p-10 dark:border-slate-800 dark:bg-slate-900">
        {/* Top Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300">
            {roleBadgeText}
          </span>
          {hasAvailableIntramurals ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400">
              <Trophy size={13} className="text-amber-500" />
              {intramurals.length} {intramurals.length === 1 ? 'Intramural' : 'Intramurals'} available
            </span>
          ) : null}
        </div>

        {/* Welcome Heading & Context Description */}
        <div className="mt-5 max-w-4xl">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl dark:text-white">
            Welcome{displayName ? `, ${displayName}` : ''}!
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base lg:text-lg dark:text-slate-300">
            {descriptionText}
          </p>
        </div>

        {/* Coordinator Actions */}
        {isCoordinator ? (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/coordinator/intramurals/create')}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-blue-700 active:scale-[0.98]"
            >
              <Plus size={16} strokeWidth={2.5} />
              Create New Intramural
            </button>

            {hasAvailableIntramurals ? (
              <button
                type="button"
                onClick={() => navigate('/coordinator/intramurals')}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <FolderPlus size={16} className="text-slate-500 dark:text-slate-400" />
                View All Intramurals
              </button>
            ) : null}
          </div>
        ) : null}

        {/* Quick-Select Tournament Grid when available */}
        {hasAvailableIntramurals ? (
          <div className="mt-8 border-t border-slate-100 pt-8 dark:border-slate-800">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Select an Intramural to Load Dashboard
              </h2>
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {intramurals.length} available
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {intramurals.slice(0, 6).map((intra) => {
                const semesterText = intra.semester ? semesterLabel(intra.semester) : '';
                return (
                  <div
                    key={intra.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 transition-all hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-800/30 dark:hover:border-slate-700 dark:hover:bg-slate-800/70"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {intra.name}
                        </span>
                        <IntramuralStatusBadge status={intra.status} />
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        {intra.school_year ? <span>{intra.school_year}</span> : null}
                        {semesterText ? <span>· {semesterText}</span> : null}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => selectIntramural(intra)}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:border-slate-400 hover:bg-slate-50 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      <span>Select</span>
                      <ChevronRight size={14} className="text-slate-400" />
                    </button>
                  </div>
                );
              })}
            </div>

            <p className="mt-5 text-xs text-slate-400 dark:text-slate-500">
              Tip: You can also switch active tournaments anytime using the selector in the top navigation bar.
            </p>
          </div>
        ) : !isCoordinator ? (
          <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50/50 p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-800/30">
            <div className="flex items-start gap-3.5">
              <CalendarDays size={20} className="mt-0.5 text-slate-400 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  No active tournament season
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  When an intramural event is published by the coordinator, live schedules, match scores, brackets, and standings will automatically populate here.
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default EmptyIntramuralState;
