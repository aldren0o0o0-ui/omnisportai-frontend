import React from 'react';
import AppModal from "../../../components/common/AppModal";

export default function RemoveFromRosterModal({
  closeRemoveRosterModal,
  confirmRemoveFromRoster,
  removeRosterModal
}) {
  return (
    <AppModal
        open={removeRosterModal.open}
        onClose={closeRemoveRosterModal}
        title="Remove from roster?"
        subtitle="This removes the tournament roster assignment only. The player record will be preserved."
        maxWidthClass="max-w-xl"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Remove <span className="font-semibold">{removeRosterModal.player?.full_name || `${removeRosterModal.player?.first_name || ""} ${removeRosterModal.player?.last_name || ""}`.trim()}</span> from this tournament roster?
          </p>
          {removeRosterModal.error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
              {removeRosterModal.error}
            </div>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeRemoveRosterModal}
              disabled={removeRosterModal.busy}
              className="min-h-10 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmRemoveFromRoster}
              disabled={removeRosterModal.busy}
              className="min-h-10 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-60"
            >
              {removeRosterModal.busy ? "Removing..." : "Remove from Roster"}
            </button>
          </div>
        </div>
      </AppModal>
  );
}
