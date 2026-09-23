import AppModal from "../../common/AppModal";

const FORMAT_COPY = {
  single_elimination: {
    label: "Single Elimination",
    description: "Knockout format",
  },
  double_elimination: {
    label: "Double Elimination",
    description: "Eliminated after two losses",
  },
  round_robin: {
    label: "Round Robin",
    description: "Every participant faces the others",
  },
};

const ManualSeedingModal = ({
  open,
  sectionRef,
  title,
  helpText,
  targetLabel,
  participantShapeLabel,
  bracketFormatLabel,
  supportedFormats,
  selectedFormat,
  onFormatChange,
  bracketPreview,
  bracketPreviewBusy,
  bracketPreviewError,
  seedingModeLabel,
  selectedSeedMode,
  seedStatusReady,
  manualCandidates,
  orderedManualCandidates,
  missingManualCandidates,
  manualConfigSeedIds,
  manualMissingTeamId,
  manualSeedingBusy,
  manualSeedingSaveBusy,
  generationBusy,
  manualSeedingError,
  seedModalError,
  selectedSportGenerationLocked,
  generationControlHint,
  isEliminationSeedingPreview,
  localManualFirstRoundPreview,
  manualSeedingValidationErrors,
  generationReady,
  generationBlockers,
  isSeedOrderReadOnly,
  getSeedSourceLabel,
  onClose,
  onResetSeedOrder,
  onSaveSeedOrder,
  onRegenerateRandomPreview,
  onMoveSeedOrder,
  onRemoveFromSeedOrder,
  onMissingTeamChange,
  onAddToSeedOrder,
  onGenerate,
  showSeedSaveActions = true,
}) => {
  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={helpText}
      maxWidthClass="max-w-4xl"
    >
      <div className="flex flex-col max-h-[80vh]">
        <div className="flex-1 overflow-y-auto px-1 py-2 sm:px-2" ref={sectionRef}>
          <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800/50">
              <p className="text-slate-500 dark:text-slate-400">Bracket Target</p>
              <p className="font-semibold text-slate-800 dark:text-slate-100">{targetLabel || "Unassigned sport"}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800/50">
              <p className="text-slate-500 dark:text-slate-400">Competition Type</p>
              <p className="font-semibold text-slate-800 dark:text-slate-100">{participantShapeLabel || "Bracket target"}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800/50">
              <p className="text-slate-500 dark:text-slate-400">Seeding</p>
              <p className="font-semibold text-slate-800 dark:text-slate-100">{seedingModeLabel}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800/50">
              <p className="text-slate-500 dark:text-slate-400">Teams</p>
              <p className="font-semibold text-slate-800 dark:text-slate-100">{manualCandidates.length}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800/50">
              <p className="text-slate-500 dark:text-slate-400">Status</p>
              <p className={`font-semibold ${seedStatusReady ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>
                {seedStatusReady ? "Ready" : "Needs Setup"}
              </p>
            </div>
          </div>

          <fieldset className="mb-4">
            <legend className="text-sm font-semibold text-slate-900 dark:text-slate-100">Format</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {(supportedFormats || []).map((format) => {
                const copy = FORMAT_COPY[format] || {
                  label: bracketFormatLabel || format,
                  description: "Competition format",
                };
                const checked = selectedFormat === format;
                return (
                  <label
                    key={`bracket-format-${format}`}
                    className={`flex min-h-20 cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                      checked
                        ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-500/10"
                        : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900"
                    } ${selectedSportGenerationLocked ? "cursor-not-allowed opacity-60" : ""}`}
                  >
                    <input
                      type="radio"
                      name="bracket-format"
                      value={format}
                      checked={checked}
                      disabled={selectedSportGenerationLocked || generationBusy}
                      onChange={() => onFormatChange(format)}
                      className="mt-1 h-4 w-4 shrink-0"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">{copy.label}</span>
                      <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{copy.description}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <section className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/40" aria-live="polite">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Preview</p>
              {bracketPreviewBusy ? <span className="text-xs text-blue-600 dark:text-blue-300">Updating...</span> : null}
            </div>
            {bracketPreviewError ? (
              <p className="mt-2 text-xs text-rose-700 dark:text-rose-300">{bracketPreviewError}</p>
            ) : bracketPreview ? (
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                <p><span className="block text-slate-500 dark:text-slate-400">Participants</span><strong>{bracketPreview.approved_participant_count ?? 0}</strong></p>
                <p><span className="block text-slate-500 dark:text-slate-400">Matches</span><strong>{bracketPreview.estimated_match_count ?? 0}</strong></p>
                <p><span className="block text-slate-500 dark:text-slate-400">Rounds</span><strong>{bracketPreview.estimated_round_count ?? 0}</strong></p>
                <p><span className="block text-slate-500 dark:text-slate-400">BYEs</span><strong>{bracketPreview.bye_count ?? 0}</strong></p>
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Choose a supported format to preview its structure.</p>
            )}
            {Array.isArray(bracketPreview?.warnings) && bracketPreview.warnings.length > 0 ? (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{bracketPreview.warnings[0]}</p>
            ) : null}
          </section>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onResetSeedOrder}
              disabled={manualSeedingBusy || generationBusy}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Reset Order
            </button>
            {selectedSeedMode === "RANDOM" ? (
              <button
                type="button"
                onClick={onRegenerateRandomPreview}
                disabled={manualSeedingBusy || generationBusy || manualCandidates.length < 2}
                className="rounded-lg border border-indigo-300 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-60 dark:border-indigo-500/40 dark:bg-slate-800 dark:text-indigo-300 dark:hover:bg-slate-700"
              >
                Regenerate Random Preview
              </button>
            ) : null}
            {showSeedSaveActions ? (
              <button
                type="button"
                onClick={onSaveSeedOrder}
                disabled={manualSeedingSaveBusy || manualSeedingBusy || manualSeedingValidationErrors.length > 0}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
              >
                {manualSeedingSaveBusy ? "Saving..." : "Save Seed Order"}
              </button>
            ) : null}
          </div>

          {manualSeedingBusy ? <p className="mt-3 text-xs text-blue-700 dark:text-blue-300">Loading eligible teams...</p> : null}
          {manualSeedingError ? <p className="mt-3 text-xs text-rose-700 dark:text-rose-300">{manualSeedingError}</p> : null}
          {seedModalError ? <p className="mt-3 text-xs text-rose-700 dark:text-rose-300">{seedModalError}</p> : null}
          {selectedSportGenerationLocked ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">{generationControlHint || "Generation is disabled for this sport."}</div>
          ) : null}
          {isEliminationSeedingPreview && localManualFirstRoundPreview.length > 0 ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/40">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Expected First Round</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Seed order ranks teams from highest to lowest. The bracket separates top seeds so they do not meet too early.</p>
              <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-slate-700 dark:text-slate-200">
                {localManualFirstRoundPreview.map((row, index) => <li key={`manual-first-round-preview-${index}`}>{row}</li>)}
              </ol>
            </div>
          ) : null}
          {manualSeedingValidationErrors.length > 0 ? (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-500/40 dark:bg-rose-500/10">
              <p className="text-sm font-semibold text-rose-800 dark:text-rose-200">Needs Setup</p>
              <ul className="mt-2 space-y-1 text-xs text-rose-700 dark:text-rose-300">
                {manualSeedingValidationErrors.map((issue, index) => <li key={`manual-seed-issue-${index}`}>• {issue}</li>)}
              </ul>
            </div>
          ) : null}
          {!generationReady && generationBlockers.length > 0 ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/40 dark:bg-amber-500/10">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Generation is blocked</p>
              <ul className="mt-2 space-y-1 text-xs text-amber-700 dark:text-amber-300">
                {generationBlockers.map((issue, index) => <li key={`seed-readiness-blocker-${index}`}>• {issue}</li>)}
              </ul>
            </div>
          ) : null}

          {manualCandidates.length > 0 ? (
            <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
              <table className="w-full min-w-[400px] text-xs">
                <thead className="bg-slate-50 text-left text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                  <tr><th className="px-3 py-2">Seed #</th><th className="px-3 py-2">Team</th><th className="px-3 py-2">Department</th><th className="px-3 py-2">Source</th><th className="px-3 py-2">Actions</th></tr>
                </thead>
                <tbody>
                  {orderedManualCandidates.map((row, index) => (
                    <tr key={`manual-seed-row-${row.team_id}`} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-200">{index + 1}</td>
                      <td className="px-3 py-2 text-slate-800 dark:text-slate-100">{row.team_name || "Unnamed team"}</td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{row.department_name || "-"}</td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{getSeedSourceLabel(row.team_id)}</td>
                      <td className="px-3 py-2">
                        {isSeedOrderReadOnly ? <span className="text-[11px] text-slate-500 dark:text-slate-400">Read-only</span> : (
                          <div className="flex flex-wrap gap-1">
                            <button type="button" onClick={() => onMoveSeedOrder(row.team_id, "up")} disabled={index === 0} className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">Up</button>
                            <button type="button" onClick={() => onMoveSeedOrder(row.team_id, "down")} disabled={index === orderedManualCandidates.length - 1} className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">Down</button>
                            <button type="button" onClick={() => onRemoveFromSeedOrder(row.team_id)} className="rounded border border-rose-300 bg-white px-2 py-1 text-[11px] font-semibold text-rose-700 dark:border-rose-500/50 dark:bg-slate-800 dark:text-rose-300">Remove</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {missingManualCandidates.length > 0 ? (
            <div className="mt-4 flex flex-wrap items-end gap-2">
              <div className="min-w-[240px] flex-1">
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">Add Missing Team</label>
                <select value={manualMissingTeamId} onChange={(event) => onMissingTeamChange(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                  <option value="">Select missing team</option>
                  {missingManualCandidates.map((row) => <option key={`missing-seed-team-${row.team_id}`} value={row.team_id}>{row.team_name}</option>)}
                </select>
              </div>
              <button type="button" onClick={() => onAddToSeedOrder(manualMissingTeamId)} disabled={!manualMissingTeamId} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">Add Team</button>
            </div>
          ) : null}
          {manualConfigSeedIds.length > 0 ? <p className="mt-4 text-[11px] text-slate-500 dark:text-slate-400">Saved configuration includes {manualConfigSeedIds.length} seeded team(s).</p> : null}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-[var(--border-soft)] pt-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="min-h-10 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] px-4 py-2 text-sm font-semibold text-[var(--text-main)] hover:bg-[var(--surface-muted)] transition-colors">Cancel</button>
          {showSeedSaveActions ? (
            <button type="button" onClick={onSaveSeedOrder} disabled={manualSeedingSaveBusy || manualSeedingBusy || manualSeedingValidationErrors.length > 0} className="min-h-10 rounded-xl border border-[var(--primary)]/30 bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--primary-soft)] disabled:opacity-60 transition-colors">{manualSeedingSaveBusy ? "Saving..." : "Save Seed Order"}</button>
          ) : null}
          <button type="button" onClick={onGenerate} disabled={generationBusy || bracketPreviewBusy || !bracketPreview?.can_generate || manualSeedingBusy || selectedSportGenerationLocked || manualSeedingValidationErrors.length > 0} className="min-h-10 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60 transition-opacity" title={selectedSportGenerationLocked ? generationControlHint || "Generation is disabled for this sport." : ""}>
            {generationBusy ? "Generating..." : selectedSportGenerationLocked ? "Generate Disabled" : generationReady ? "Generate Final Bracket" : "Generate Draft Plan"}
          </button>
        </div>
      </div>
    </AppModal>
  );
};

export default ManualSeedingModal;
