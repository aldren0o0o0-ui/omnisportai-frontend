import React from 'react';
import AppModal from "../../../components/common/AppModal";
import { Info } from "lucide-react";

export default function GenerationHelpModal({
  generationHelpOpen,
  setGenerationHelpOpen
}) {
  return (
    <AppModal open={generationHelpOpen} onClose={() => setGenerationHelpOpen(false)} title="How schedule generation works" subtitle="A guided flow keeps scheduling safer and easier to use." maxWidthClass="max-w-2xl">
        <div className="space-y-3 text-sm text-slate-700 dark:text-slate-200">
          <ol className="list-decimal space-y-2 pl-5">
            <li>The system checks if tournament setup is ready.</li>
            <li>It runs an exact feasibility check with venue, time, team, player, and program-block rules.</li>
            <li>If feasible, it generates the schedule automatically.</li>
            <li>If issues are found, they appear on the calendar and in the Schedule Issues drawer.</li>
            <li>Regenerating can replace existing match times, venue assignments, and manual adjustments.</li>
          </ol>
          <div className="flex justify-end">
            <button type="button" onClick={() => setGenerationHelpOpen(false)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-200 dark:hover:bg-slate-700">
              Close
            </button>
          </div>
        </div>
      </AppModal>
  );
}
