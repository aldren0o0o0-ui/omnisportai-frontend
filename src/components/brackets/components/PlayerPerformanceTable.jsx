import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

import { getShortPlayerName } from "../utils/displayLabels";

const metricHeader = (column) => (
  <th
    key={column.key}
    scope="col"
    className="whitespace-nowrap px-3 py-2 text-right font-semibold"
    title={column.fullLabel || column.hint || column.label}
  >
    <span aria-hidden="true">{column.label}</span>
    <span className="sr-only">{column.fullLabel || column.label}</span>
  </th>
);

export default function PlayerPerformanceTable({
  columns = [],
  secondaryColumns = [],
  rows = [],
  participantLabel = "Team",
  emptyMessage = "No recorded player activity.",
}) {
  const [showMoreStats, setShowMoreStats] = useState(false);
  const visibleColumns = showMoreStats ? [...columns, ...secondaryColumns] : columns;

  if (rows.length === 0) {
    return <p className="py-5 text-sm text-[var(--text-muted)]">{emptyMessage}</p>;
  }

  return (
    <div>
      <div className="overflow-x-auto border-y border-[var(--border-soft)]">
        <table className="min-w-full text-sm text-[var(--text-main)]">
          <caption className="sr-only">Player performance statistics</caption>
          <thead className="bg-[var(--surface-soft)] text-xs uppercase tracking-wide text-[var(--text-muted)]">
            <tr>
              <th scope="col" className="sticky left-0 z-10 min-w-36 bg-[var(--surface-soft)] px-3 py-2 text-left font-semibold">Player</th>
              <th scope="col" className="whitespace-nowrap px-3 py-2 text-left font-semibold">{participantLabel}</th>
              {visibleColumns.map(metricHeader)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.playerId || row.playerName} className="border-t border-[var(--border-soft)]">
                <th scope="row" className="sticky left-0 z-10 whitespace-nowrap bg-[var(--surface)] px-3 py-2.5 text-left font-semibold">
                  {getShortPlayerName(row.playerName)}
                </th>
                <td className="whitespace-nowrap px-3 py-2.5 text-[var(--text-muted)]">{row.teamLabel}</td>
                {visibleColumns.map((column) => (
                  <td key={`${row.playerId || row.playerName}-${column.key}`} className="px-3 py-2.5 text-right font-mono tabular-nums">
                    {row.metrics?.[column.key]?.displayValue ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {secondaryColumns.length > 0 ? (
        <button
          type="button"
          aria-expanded={showMoreStats}
          onClick={() => setShowMoreStats((current) => !current)}
          className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-cyan-700 hover:bg-cyan-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:text-cyan-300 dark:hover:bg-cyan-500/10"
        >
          {showMoreStats ? "Fewer stats" : "More stats"}
          <ChevronDown aria-hidden="true" className={`h-4 w-4 transition ${showMoreStats ? "rotate-180" : ""}`} />
        </button>
      ) : null}
    </div>
  );
}
