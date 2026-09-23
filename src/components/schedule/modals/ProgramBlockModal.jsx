import React from 'react';
import AppModal from "../../../components/common/AppModal";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

export default function ProgramBlockModal({
  editingProgramBlockId,
  formatProgramBlockTypeLabel,
  getProgramBlockTypeTone,
  handleCloseProgramBlockManager,
  handleDeleteProgramBlock,
  handleEditProgramBlock,
  handleSaveProgramBlockEdit,
  isProgramBlockModalOpen,
  isSportsCoordinator,
  navigate,
  programBlockDraft,
  programBlockSubmitting,
  programBlocks,
  resetProgramBlockDraft,
  setProgramBlockDraft,
  setupMode = false,
  setupRows = [],
  setupErrors = {},
  setupLocked = false,
  onSetupRowChange,
  onSetupBack,
  onSetupContinue
}) {
  if (setupMode) {
    return (
      <AppModal
        open={isProgramBlockModalOpen}
        onClose={programBlockSubmitting ? undefined : handleCloseProgramBlockManager}
        title="Configure Intramural Program"
        subtitle="Programs are optional. Enabled programs reserve time across every sports venue."
        maxWidthClass="max-w-4xl"
      >
        <div className="space-y-3">
          {setupErrors.FORM?.length ? <div role="alert" className="rounded-lg bg-rose-50 p-3 text-sm font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">{setupErrors.FORM.join(" ")}</div> : null}
          <div className="hidden grid-cols-[minmax(10rem,1fr)_minmax(9rem,0.9fr)_minmax(8rem,0.75fr)_minmax(8rem,0.75fr)] gap-3 px-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid dark:text-slate-400">
            <span>Program</span><span>Date</span><span>Start time</span><span>End time</span>
          </div>
          {setupRows.map((row) => {
            const rowErrors = setupErrors[row.type] || [];
            const prefix = row.type.toLowerCase().replaceAll("_", "-");
            return (
              <fieldset key={row.type} disabled={setupLocked || programBlockSubmitting} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <legend className="sr-only">{row.label}</legend>
                <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-[minmax(10rem,1fr)_minmax(9rem,0.9fr)_minmax(8rem,0.75fr)_minmax(8rem,0.75fr)]">
                  <label className="flex min-h-10 items-center gap-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    <input
                      type="checkbox"
                      checked={Boolean(row.enabled)}
                      onChange={(event) => onSetupRowChange(row.type, "enabled", event.target.checked)}
                      className="h-5 w-5 rounded border-slate-300"
                    />
                    {row.label}
                  </label>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300" htmlFor={`${prefix}-date`}>
                    <span className="mb-1 block md:sr-only">{row.label} date</span>
                    <input id={`${prefix}-date`} aria-label={`${row.label} date`} type="date" value={row.date} disabled={!row.enabled || setupLocked || programBlockSubmitting} onChange={(event) => onSetupRowChange(row.type, "date", event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:opacity-50 dark:border-slate-700 dark:bg-[var(--surface)] dark:text-slate-100" />
                  </label>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300" htmlFor={`${prefix}-start`}>
                    <span className="mb-1 block md:sr-only">{row.label} start time</span>
                    <input id={`${prefix}-start`} aria-label={`${row.label} start time`} type="time" value={row.startTime} disabled={!row.enabled || setupLocked || programBlockSubmitting} onChange={(event) => onSetupRowChange(row.type, "startTime", event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:opacity-50 dark:border-slate-700 dark:bg-[var(--surface)] dark:text-slate-100" />
                  </label>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300" htmlFor={`${prefix}-end`}>
                    <span className="mb-1 block md:sr-only">{row.label} end time</span>
                    <input id={`${prefix}-end`} aria-label={`${row.label} end time`} type="time" value={row.endTime} disabled={!row.enabled || setupLocked || programBlockSubmitting} onChange={(event) => onSetupRowChange(row.type, "endTime", event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:opacity-50 dark:border-slate-700 dark:bg-[var(--surface)] dark:text-slate-100" />
                  </label>
                </div>
                {rowErrors.length ? <div role="alert" className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-300">{rowErrors.join(" ")}</div> : null}
              </fieldset>
            );
          })}
          {setupLocked ? <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">Program schedule is locked because the official schedule is published or the Intramural has started.</p> : null}
          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end dark:border-slate-700">
            <button type="button" onClick={onSetupBack || handleCloseProgramBlockManager} disabled={programBlockSubmitting} className="min-h-11 rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60 dark:text-slate-200 dark:hover:bg-slate-800">Back</button>
            {!setupLocked ? <button type="button" onClick={onSetupContinue} disabled={programBlockSubmitting} className="min-h-11 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60 dark:bg-cyan-600 dark:hover:bg-cyan-500">{programBlockSubmitting ? "Saving…" : "Save and Check Schedule"}</button> : null}
          </div>
        </div>
      </AppModal>
    );
  }

  return (
    <AppModal open={isProgramBlockModalOpen} onClose={handleCloseProgramBlockManager} title="Manage Program Blocks" subtitle="Program block creation is primarily in Tournament Create/Edit. Use this panel for quick updates." maxWidthClass="max-w-3xl">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select an existing block to edit or delete, or open Tournament Setup for full planning.
            </p>
            <button type="button" onClick={() => navigate("/coordinator/tournaments")} className="rounded-md border border-blue-300 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 dark:border-blue-500/40 dark:text-blue-300 dark:hover:bg-blue-500/10">
              Open Tournament Setup
            </button>
          </div>

          {!programBlocks || programBlocks.length === 0 ? <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-[var(--surface-soft)]/50 dark:text-slate-300">
              No program blocks configured for this tournament yet.
            </p> : <ul className="space-y-2">
              {programBlocks.map(block => <li key={`program-block-manage-${block.id}`} className="rounded-lg border border-slate-200 bg-white px-3 py-3 dark:border-slate-700 dark:bg-[var(--surface)]">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${getProgramBlockTypeTone(block.block_type)}`}>
                          {formatProgramBlockTypeLabel(block.block_type)}
                        </span>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {block.title || "Program Block"}
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {block.is_recurring_daily ? "Daily" : block.date || "Date required"} | {block.start_time} - {block.end_time}
                      </p>
                      {block.description ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{block.description}</p> : null}
                    </div>
                    {isSportsCoordinator ? <div className="flex gap-1.5">
                        <button type="button" onClick={() => handleEditProgramBlock(block)} className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                          Edit
                        </button>
                        <button type="button" onClick={() => handleDeleteProgramBlock(block.id)} disabled={programBlockSubmitting} className="rounded-md border border-rose-300 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60 dark:border-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-500/10">
                          Delete
                        </button>
                      </div> : null}
                  </div>
                </li>)}
            </ul>}

          {editingProgramBlockId ? <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-[var(--surface-soft)]/60">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                Edit Block #{editingProgramBlockId}
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <input type="text" value={programBlockDraft.title} onChange={event => setProgramBlockDraft(prev => ({
              ...prev,
              title: event.target.value
            }))} placeholder="Title" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-[var(--surface)] dark:text-slate-100" />
                <select value={programBlockDraft.block_type} onChange={event => setProgramBlockDraft(prev => ({
              ...prev,
              block_type: event.target.value
            }))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-[var(--surface)] dark:text-slate-100">
                  <option value="OPENING_PROGRAM">Opening Program</option>
                  <option value="LUNCH_BREAK">Lunch Break</option>
                  <option value="CLOSING_CEREMONY">Closing Ceremony</option>
                  <option value="AWARDING">Awarding</option>
                  <option value="PREPARATION">Preparation</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="CUSTOM">Custom</option>
                </select>
                <input type="date" value={programBlockDraft.date} onChange={event => setProgramBlockDraft(prev => ({
              ...prev,
              date: event.target.value
            }))} disabled={programBlockDraft.is_recurring_daily} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 disabled:opacity-60 dark:border-slate-700 dark:bg-[var(--surface)] dark:text-slate-100" />
                <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-[var(--surface)] dark:text-slate-300">
                  <input type="checkbox" checked={Boolean(programBlockDraft.is_recurring_daily)} onChange={event => setProgramBlockDraft(prev => ({
                ...prev,
                is_recurring_daily: event.target.checked
              }))} />
                  Recurring Daily
                </label>
                <input type="time" value={programBlockDraft.start_time} onChange={event => setProgramBlockDraft(prev => ({
              ...prev,
              start_time: event.target.value
            }))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-[var(--surface)] dark:text-slate-100" />
                <input type="time" value={programBlockDraft.end_time} onChange={event => setProgramBlockDraft(prev => ({
              ...prev,
              end_time: event.target.value
            }))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-[var(--surface)] dark:text-slate-100" />
              </div>
              <textarea value={programBlockDraft.description} onChange={event => setProgramBlockDraft(prev => ({
            ...prev,
            description: event.target.value
          }))} placeholder="Description" className="mt-3 min-h-16 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-[var(--surface)] dark:text-slate-100" />
              <div className="mt-3 flex justify-end gap-2">
                <button type="button" onClick={resetProgramBlockDraft} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                  Cancel
                </button>
                <button type="button" onClick={handleSaveProgramBlockEdit} disabled={programBlockSubmitting} className="rounded-md border border-blue-400 bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60 dark:border-cyan-400 dark:bg-cyan-600 dark:hover:bg-cyan-700">
                  {programBlockSubmitting ? "Saving..." : "Save Block"}
                </button>
              </div>
            </div> : null}
        </div>
      </AppModal>
  );
}
