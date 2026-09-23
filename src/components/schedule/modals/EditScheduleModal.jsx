import React from 'react';
import AppModal from "../../../components/common/AppModal";
import { AlertTriangle, MapPin } from "lucide-react";
import { isMeaningfulEventName } from "../../../utils/tournamentAccess";

export default function EditScheduleModal({
  editError,
  editForm,
  editModalOpen,
  editSubmitting,
  handleCloseEditModal,
  handleEditDateChange,
  handleEditEndChange,
  handleEditStartChange,
  handleEditVenueChange,
  handleSubmitEditModal,
  venues
}) {
  return (
    <AppModal open={editModalOpen} onClose={handleCloseEditModal} title={editForm.matchId ? "Edit Schedule - Selected Match" : "Edit Schedule"} subtitle="Move this match to a valid venue/time slot." maxWidthClass="max-w-2xl">
        <form className="space-y-4" onSubmit={handleSubmitEditModal}>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-[var(--surface-soft)]/50 dark:text-slate-300">
            <p className="font-semibold text-slate-800 dark:text-slate-100">{editForm.sportName || "Match"}</p>
            {isMeaningfulEventName(editForm.eventName, editForm.sportName) ? <p className="mt-1">Event Category: {editForm.eventName}</p> : null}
            {editForm.competitionTypeLabel ? <p className="mt-1">Competition Type: {editForm.competitionTypeLabel}</p> : null}
            <p className="mt-1">{editForm.matchLabel || "Match details unavailable."}</p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Venue
              <select value={editForm.venueId} onChange={e => handleEditVenueChange(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-[var(--surface)] dark:text-slate-100" required>
                <option value="">Select venue</option>
                {(Array.isArray(venues) ? venues : []).slice().sort((a, b) => String(a.name || a.venue_name || "").localeCompare(String(b.name || b.venue_name || ""))).map(venue => <option key={`edit-venue-${venue.id}`} value={String(venue.id)}>
                      {venue.name || venue.venue_name || "Unassigned venue"}
                    </option>)}
              </select>
            </label>

            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Date
              <input type="date" value={editForm.date} onChange={e => handleEditDateChange(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-[var(--surface)] dark:text-slate-100" required />
            </label>

            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Start Time
              <input type="time" value={editForm.startTime} onChange={e => handleEditStartChange(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-[var(--surface)] dark:text-slate-100" required />
            </label>

            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              End Time
              <input type="time" value={editForm.endTime} onChange={e => handleEditEndChange(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-[var(--surface)] dark:text-slate-100" required />
            </label>
          </div>

          {editError ? <p className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
              {editError}
            </p> : null}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={handleCloseEditModal} disabled={editSubmitting} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-200 dark:hover:bg-slate-700">
              Cancel
            </button>
            <button type="submit" disabled={editSubmitting} className="rounded-lg border border-blue-400 bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60 dark:border-cyan-400 dark:bg-cyan-600 dark:hover:bg-cyan-700">
              {editSubmitting ? "Saving..." : "Save Schedule"}
            </button>
          </div>
        </form>
      </AppModal>
  );
}
