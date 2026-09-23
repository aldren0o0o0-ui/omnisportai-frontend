import React from 'react';
import AppModal from "../../../components/common/AppModal";

export default function ArchiveTeamModal({
  closeDeleteTeamModal,
  confirmDeleteTeam,
  deleteTeamModal
}) {
  return (
    <AppModal
        open={deleteTeamModal.open}
        onClose={closeDeleteTeamModal}
        title="Archive Team?"
        subtitle="Archiving hides this team from active workflows and preserves tournament history."
        maxWidthClass="max-w-xl"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            {deleteTeamModal.hasDependencies
              ? "This team has tournament or match history. Archive it instead to hide it from active workflows while preserving history."
              : "Archive this team? You can restore it later from the archived filter."}
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Team: <span className="font-semibold">{deleteTeamModal.teamName}</span>
          </p>
          {deleteTeamModal.deleteImpact?.counts ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-[var(--surface-soft)]/80 dark:text-slate-300">
              Linked records: Tournament Teams {deleteTeamModal.deleteImpact.counts.tournament_team || 0}
              {" | "}
              Tournament Roster {deleteTeamModal.deleteImpact.counts.tournament_team_player || 0}
              {" | "}
              Team Players {deleteTeamModal.deleteImpact.counts.team_player || 0}
              {" | "}
              Team Applications {deleteTeamModal.deleteImpact.counts.team_application || 0}
              {" | "}
              Matches {deleteTeamModal.deleteImpact.counts.match || 0}
            </div>
          ) : null}
          {deleteTeamModal.error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
              {deleteTeamModal.error}
            </div>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeDeleteTeamModal}
              disabled={deleteTeamModal.busy}
              className="min-h-10 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDeleteTeam}
              disabled={deleteTeamModal.busy}
              className="min-h-10 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-60"
            >
              {deleteTeamModal.busy ? "Archiving..." : "Archive Team"}
            </button>
          </div>
        </div>
      </AppModal>
  );
}
