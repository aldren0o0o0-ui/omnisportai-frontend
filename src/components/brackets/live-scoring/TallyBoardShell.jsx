import React from "react";

const toneClasses = {
  success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200",
  danger: "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200",
  neutral: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

export default function TallyBoardShell({
  title,
  matchup,
  meta,
  matchStatus,
  connection,
  blockingMessage,
  onRefresh,
  onExit,
  children,
  recentAction,
  canUndo,
  isUndoing,
  onUndo,
  secondaryPanels,
}) {
  const blockedDescriptionId = blockingMessage ? "tally-board-blocked-reason" : undefined;
  return (
    <div className="text-[var(--text-main)]">
      <div className="mx-auto max-w-[1600px] space-y-3">
        <header className="flex flex-wrap items-start justify-between gap-3 px-1 py-1">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold sm:text-xl">{title}</h1>
              {matchStatus ? <span className="rounded-full bg-cyan-500/15 px-2.5 py-1 text-xs font-bold text-cyan-800 dark:text-cyan-200">{matchStatus}</span> : null}
            </div>
            {matchup ? <p className="mt-0.5 font-semibold text-[var(--text-main)]">{matchup}</p> : null}
            {meta ? <p className="mt-0.5 text-xs text-[var(--text-muted)]">{meta}</p> : null}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${toneClasses[connection?.tone] || toneClasses.neutral}`} role="status">
              {connection?.label || "Connecting"}
            </span>
            <button type="button" onClick={onRefresh} className="min-h-10 rounded-lg border border-[var(--border-soft)] px-3 text-xs font-semibold hover:bg-[var(--surface-muted)]">Refresh</button>
            <button type="button" onClick={onExit} className="min-h-10 rounded-lg border border-[var(--border-soft)] px-3 text-xs font-semibold hover:bg-[var(--surface-muted)]">Exit</button>
          </div>
        </header>

        {blockingMessage ? (
          <div id={blockedDescriptionId} role="alert" className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100">
            <strong>Scoring is unavailable.</strong> {blockingMessage} The current Match remains visible in read-only mode.
          </div>
        ) : null}

        <main aria-describedby={blockedDescriptionId}>{children}</main>

        <section className="flex flex-col gap-3 rounded-xl bg-[var(--surface-soft)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between" aria-label="Most recent action">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Last action</p>
            <p className="truncate text-sm font-semibold">{recentAction || "No actions recorded yet"}</p>
          </div>
          {canUndo ? (
            <button type="button" onClick={onUndo} disabled={isUndoing} className="min-h-11 shrink-0 rounded-xl border border-[var(--border-soft)] px-4 text-sm font-semibold hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-50">
              {isUndoing ? "Undoing…" : "Undo last action"}
            </button>
          ) : null}
        </section>

        {secondaryPanels ? <section className="grid gap-2 md:grid-cols-2 xl:grid-cols-4" aria-label="Match information and additional controls">{secondaryPanels}</section> : null}
      </div>
    </div>
  );
}
