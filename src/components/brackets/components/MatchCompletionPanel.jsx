import React from "react";

export default function MatchCompletionPanel({ presentation }) {
  if (!presentation?.completed) return null;
  return (
    <section
      className="rounded-2xl border border-emerald-300 bg-emerald-50/90 p-5 text-center shadow-sm dark:border-emerald-500/40 dark:bg-emerald-500/10"
      aria-live="polite"
      role="status"
    >
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">Official Result</p>
      <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{presentation.title}</h2>
      {presentation.hasWinner ? (
        <>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Congratulations,</p>
          <p className="mt-1 text-xl font-extrabold text-emerald-800 dark:text-emerald-100">{presentation.winnerLabel}!</p>
          {presentation.winnerDepartment ? <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{presentation.winnerDepartment}</p> : null}
        </>
      ) : null}
      <div className="mx-auto mt-4 max-w-sm rounded-xl bg-white/80 px-4 py-3 dark:bg-slate-950/50">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Final</p>
        <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{presentation.resultLabel}</p>
      </div>
      <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">{presentation.nextStep?.message}</p>
    </section>
  );
}
