import React, { useMemo } from "react";
import { isMetricRenderable, formatMetricValue } from "../profileUtils";

/**
 * PlayerMetricCards
 * Renders sport-specific metrics strictly from the backend catalog.
 * Invariant: Never transforms unrecorded metrics (null/available:false) into zeros.
 */
export const PlayerMetricCards = ({ metrics = [], title = "Sport Metrics" }) => {
  if (!Array.isArray(metrics)) {
    return null;
  }

  // Strictly filter according to Phase 1/Phase 2 non-fabrication rules:
  // available === true && value !== null && value !== undefined
  // NEVER transform available:false + value:null into 0!
  const validMetrics = useMemo(() => {
    return metrics.filter(isMetricRenderable);
  }, [metrics]);

  if (validMetrics.length === 0) {
    return (
      <div
        className="rounded-xl border border-dashed border-[var(--border-soft)] bg-[var(--surface-soft)] p-4 text-center"
        data-testid="player-metrics-empty"
      >
        <p className="text-xs text-[var(--text-muted)]">
          No additional sport-specific metrics recorded for this participant.
        </p>
      </div>
    );
  }

  const renderMetricCard = (m) => {
    const displayVal = formatMetricValue(m.value, m.format);
    const label = m.label || m.key || "Metric";
    const unit = m.unit ? ` ${m.unit}` : "";
    const testIdKey = String(m.key || label).toLowerCase();

    return (
      <div
        key={m.key || label}
        className="flex flex-col justify-between rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-3 transition hover:border-[var(--primary)]/40"
        data-testid={`player-metric-${testIdKey}`}
      >
        <span
          className="truncate text-[11px] font-medium text-[var(--text-muted)]"
          title={label}
        >
          {label}
        </span>
        <div className="mt-1.5 flex items-baseline gap-1">
          <span className="text-lg font-extrabold tracking-tight text-[var(--text-main)]">
            {displayVal}
          </span>
          {unit ? (
            <span className="text-[10px] font-medium text-[var(--text-muted)]">
              {unit}
            </span>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2.5" data-testid="player-metrics-container">
      {title ? (
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            {title}
          </h4>
          <span className="text-[10px] text-[var(--text-soft)]">
            {validMetrics.length}{" "}
            {validMetrics.length === 1 ? "metric tracked" : "metrics tracked"}
          </span>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {validMetrics.map(renderMetricCard)}
      </div>
    </div>
  );
};

export default PlayerMetricCards;
