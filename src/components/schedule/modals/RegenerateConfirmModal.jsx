import React from 'react';
import AppModal from "../../../components/common/AppModal";
import { AlertTriangle } from "lucide-react";

export default function RegenerateConfirmModal({
  analytics,
  guidedGenerationBusy,
  guidedGenerationBusyLabel,
  handleGuidedScheduleGeneration,
  normalizedEvents,
  regenerateConfirmOpen,
  schedulingMode,
  setRegenerateConfirmOpen,
  validationResult
}) {
  return (
    <AppModal open={regenerateConfirmOpen} onClose={() => setRegenerateConfirmOpen(false)} title="Regenerate Draft Schedule?" subtitle="This Intramural already has an unpublished schedule." maxWidthClass="max-w-2xl">
        <div className="space-y-4">
          <p className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            This will replace the current unpublished match times and venue assignments. Brackets, entries, participants, and results will not change.
          </p>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-[var(--surface-soft)]/50 dark:text-slate-300">
            <p className="font-semibold">Impact summary</p>
            <ul className="mt-1 list-disc space-y-1 pl-4">
              <li>Scheduled matches: {normalizedEvents?.length || 0}</li>
              <li>
                Manual edits detected: {Number.isFinite(Number(analytics?.manual_edit_count)) ? Number(analytics?.manual_edit_count) : "Not detected"}
              </li>
              <li>Blocking issues: {Math.max(0, Number(validationResult?.blocking_count || 0))}</li>
            </ul>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setRegenerateConfirmOpen(false)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-200 dark:hover:bg-slate-700">
              Cancel
            </button>
            <button type="button" onClick={() => {
            void handleGuidedScheduleGeneration({
              mode: "regenerate",
              confirmRegenerate: true,
              schedulingMode
            });
          }} disabled={guidedGenerationBusy} className="rounded-lg border border-blue-400 bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60 dark:border-cyan-400 dark:bg-cyan-600 dark:hover:bg-cyan-700">
              {guidedGenerationBusy ? guidedGenerationBusyLabel : "Run Safety Check & Regenerate"}
            </button>
          </div>
        </div>
      </AppModal>
  );
}
