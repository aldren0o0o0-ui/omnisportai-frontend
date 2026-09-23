import React, { useCallback } from 'react';
import { CalendarDays } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import useIntramuralList from '../../hooks/useIntramuralList';
import {
  broadcastDashboardTournamentSelection,
  writeStoredDashboardTournamentSelection,
} from '../../utils/dashboardTournamentSelection';
import IntramuralStatusBadge from './IntramuralStatusBadge';
import { semesterLabel } from './intramuralStatus';

// Sidebar "Current Intramural" panel + "Select Intramural" dropdown.
//
// Shows the SELECTED (viewing) intramural — the single source every page reads
// from WorkspaceContext. Any authenticated role may change the selection to
// browse another season; this is frontend-only and does NOT activate a season
// in the backend (only a coordinator activating a workspace does that).
//
// Bridge: the data pages (standings/schedules/teams/dashboard, etc.) already
// listen for the tournament-selection event and key off a tournament id. So on
// selection we (1) update the context via selectIntramural and (2) broadcast
// the existing selection event mapped from workspace_id → its tournament id.
// No new event system is introduced and no data page needs rewriting.
const SidebarIntramuralPanel = ({ collapsed = false }) => {
  const { selectedIntramural, workspace: activeIntramural, selectIntramural, loading } = useWorkspace();
  const { intramurals, tournamentByWorkspace } = useIntramuralList();

  const handleSelect = useCallback(
    (event) => {
      const wsId = Number(event.target.value || 0);
      const chosen = intramurals.find((row) => Number(row.id) === wsId) || null;
      selectIntramural(chosen);

      // Bridge to the existing tournament-selection channel so every data page
      // refreshes. Map the chosen intramural (workspace) to its tournament.
      const tournament = chosen ? tournamentByWorkspace[Number(chosen.id)] : null;
      const payload = tournament
        ? { id: String(tournament.id), name: chosen?.name || tournament.tournament_name || '' }
        : { id: '', name: chosen?.name || '' };
      writeStoredDashboardTournamentSelection(payload);
      broadcastDashboardTournamentSelection({ ...payload, source: 'sidebar' });
    },
    [intramurals, selectIntramural, tournamentByWorkspace]
  );

  if (collapsed) return null;

  const viewing = selectedIntramural || activeIntramural || null;

  return (
    <div className="os-sidebar-intramural">
      <p className="os-sidebar-section-label">Current Intramural</p>

      {loading ? (
        <div className="os-sidebar-intramural-card text-[var(--text-muted)]">
          <span className="text-xs">Loading…</span>
        </div>
      ) : viewing ? (
        <div className="os-sidebar-intramural-card">
          <div className="flex items-start justify-between gap-2">
            <span className="min-w-0 truncate text-sm font-semibold text-[var(--text-main)]">
              {viewing.name}
            </span>
            <IntramuralStatusBadge status={viewing.status} />
          </div>
          <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
            <CalendarDays size={11} />
            {viewing.school_year}
            {viewing.semester ? ` · ${semesterLabel(viewing.semester)}` : ''}
          </p>
        </div>
      ) : (
        <div className="os-sidebar-intramural-card">
          <span className="text-xs font-medium text-[var(--text-muted)]">No active intramural</span>
        </div>
      )}

      {intramurals.length > 0 ? (
        <div className="mt-2">
          <label htmlFor="os-select-intramural" className="sr-only">
            Select intramural to view
          </label>
          <select
            id="os-select-intramural"
            value={viewing?.id || ''}
            onChange={handleSelect}
            className="w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-main)] outline-none"
            title="Select an intramural to view"
          >
            {intramurals.map((row) => (
              <option key={`select-intramural-${row.id}`} value={row.id}>
                {row.name}
                {row.is_active ? ' (Active)' : ''}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
};

export default SidebarIntramuralPanel;
