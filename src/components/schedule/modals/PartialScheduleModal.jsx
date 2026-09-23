import React from 'react';
import AppModal from "../../../components/common/AppModal";
import { AlertTriangle } from "lucide-react";

export default function PartialScheduleModal({
  exactFeasibilityBlockingConflictCount,
  generating,
  partialScheduleConfirmData,
  partialScheduleConfirmOpen,
  setPartialScheduleConfirmData,
  setPartialScheduleConfirmOpen
}) {
  return (
    <AppModal open={partialScheduleConfirmOpen} onClose={() => {
      setPartialScheduleConfirmOpen(false);
      setPartialScheduleConfirmData(null);
    }} title="Generate Partial Schedule?" subtitle="Exact check found unresolved real matches or blocking conflicts." maxWidthClass="max-w-2xl">
        <div className="space-y-4">
          <section className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-sm dark:border-amber-500/30 dark:bg-amber-500/10">
            <p className="font-semibold text-amber-800 dark:text-amber-200">
              Exact check found {partialScheduleConfirmData?.realUnscheduledCount || 0} real match{(partialScheduleConfirmData?.realUnscheduledCount || 0) !== 1 ? "es" : ""} or {exactFeasibilityBlockingConflictCount} blocking issue{exactFeasibilityBlockingConflictCount !== 1 ? "s" : ""}. A partial schedule may require manual repair.
            </p>
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
              The system will generate a schedule with unresolved matches excluded. You can repair remaining issues after generation.
            </p>
          </section>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-[var(--surface-soft)]/60 dark:text-slate-300">
            <p className="font-semibold">What happens next:</p>
            <ul className="mt-1.5 ml-3 space-y-1 list-disc text-slate-600 dark:text-slate-400">
              <li>Schedulable matches will be assigned time slots and venues</li>
              <li>Unscheduled matches will be flagged for manual review</li>
              <li>You can manually reschedule unscheduled matches after generation</li>
              <li>The schedule can then be finalized or regenerated</li>
            </ul>
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => {
            setPartialScheduleConfirmOpen(false);
            setPartialScheduleConfirmData(null);
          }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-200 dark:hover:bg-slate-700">
              Cancel
            </button>
            <button type="button" onClick={async () => {
            setPartialScheduleConfirmOpen(false);
            if (partialScheduleConfirmData?.onConfirm) {
              await partialScheduleConfirmData.onConfirm();
            }
            setPartialScheduleConfirmData(null);
          }} disabled={generating} className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-60 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20">
              {generating ? "Generating..." : "Generate Partial Schedule"}
            </button>
          </div>
        </div>
      </AppModal>
  );
}
