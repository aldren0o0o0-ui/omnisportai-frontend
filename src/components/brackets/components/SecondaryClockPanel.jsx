import React from "react";

const formatSecondaryClock = (milliseconds) => {
  const safeMs = Math.max(0, Number(milliseconds || 0));
  const seconds = Math.floor(safeMs / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const ms = safeMs % 1000;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
};

const SecondaryClockPanel = ({
  config,
  state,
  suggestion,
  disabled,
  disabledReason,
  onStart,
  onPause,
  onResetDefault,
  onResetAlternate,
  onAdjust,
  onApplySuggestion,
  onDismissSuggestion,
}) => {
  if (!config?.enabled) return null;

  const remainingMs = Number(state?.valueMs || 0);
  const remainingSeconds = Math.floor(remainingMs / 1000);
  const isLow = remainingSeconds <= 5;
  const isExpired = remainingSeconds <= 0;
  const resolvedDisabledReason = disabled ? disabledReason || "Clock is unavailable." : "";

  return (
    <section className={`rounded-xl border px-3 py-2.5 ${
      isExpired
        ? "border-rose-500/55 bg-rose-900/15"
        : isLow
          ? "border-amber-500/55 bg-amber-900/15"
          : "border-cyan-700/50 bg-cyan-900/10"
    }`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200">{config.label}</p>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
          state?.isRunning ? "bg-emerald-500/20 text-emerald-200" : "bg-slate-700 text-slate-200"
        }`}>
          {state?.isRunning ? "Running" : "Stopped"}
        </span>
      </div>

      <div className="mt-1.5 flex flex-wrap items-end justify-between gap-2">
        <p className={`font-mono text-2xl font-semibold ${isExpired ? "text-rose-200" : isLow ? "text-amber-200" : "text-cyan-100"}`}>
          {formatSecondaryClock(remainingMs)}
        </p>
        {state?.isLocalOnly && (
          <span className="text-[11px] text-slate-400" title="Not persisted to backend yet">
            Local
          </span>
        )}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <button
          type="button"
          onClick={state?.isRunning ? onPause : onStart}
          disabled={disabled}
          title={resolvedDisabledReason || (state?.isRunning ? "Stop shot clock" : "Continue shot clock")}
          aria-label={state?.isRunning ? "Stop shot clock" : "Continue shot clock"}
          className="h-9 rounded-lg border border-slate-600 bg-slate-800 text-sm font-semibold text-slate-100 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {state?.isRunning ? "Stop" : "Continue"}
        </button>

        <button
          type="button"
          onClick={onResetDefault}
          disabled={disabled}
          title={resolvedDisabledReason || `Reset ${config.label} to ${config.defaultSeconds} seconds`}
          aria-label={`Reset ${config.label} to ${config.defaultSeconds} seconds`}
          className="h-9 rounded-lg border border-amber-500/50 bg-amber-500/15 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {config.defaultSeconds}
        </button>

        {Number(config.alternateSeconds) !== Number(config.defaultSeconds) && (
          <button
            type="button"
            onClick={onResetAlternate}
            disabled={disabled}
            title={resolvedDisabledReason || `Reset ${config.label} to ${config.alternateSeconds} seconds`}
            aria-label={`Reset ${config.label} to ${config.alternateSeconds} seconds`}
            className="h-9 rounded-lg border border-amber-500/40 bg-amber-500/10 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {config.alternateSeconds}
          </button>
        )}

        <button
          type="button"
          onClick={() => onAdjust(-1)}
          disabled={disabled}
          title={resolvedDisabledReason || "Decrease by 1 second"}
          aria-label="Decrease secondary clock by 1 second"
          className="h-9 rounded-lg border border-slate-600 bg-slate-800 text-sm font-semibold text-slate-100 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          -1
        </button>

        <button
          type="button"
          onClick={() => onAdjust(1)}
          disabled={disabled}
          title={resolvedDisabledReason || "Increase by 1 second"}
          aria-label="Increase secondary clock by 1 second"
          className="h-9 rounded-lg border border-slate-600 bg-slate-800 text-sm font-semibold text-slate-100 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          +1
        </button>
      </div>

      {suggestion && (
        <div className="mt-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-100">
          <p>{config.label} suggestion: reset to {suggestion.seconds}?</p>
          <div className="mt-1.5 flex gap-2">
            <button
              type="button"
              onClick={onApplySuggestion}
              className="rounded-md border border-amber-400/50 bg-amber-500/20 px-2 py-1 font-semibold text-amber-100"
            >
              Apply {suggestion.seconds}
            </button>
            <button
              type="button"
              onClick={onDismissSuggestion}
              className="rounded-md border border-slate-600 bg-slate-800 px-2 py-1 font-semibold text-slate-200"
            >
              Keep Current
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default SecondaryClockPanel;
