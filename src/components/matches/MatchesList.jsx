import React from "react";
import ConfigStatusBadge from "./ConfigStatusBadge";
import { getSportDisplayName } from "../../utils/tournamentEventCategories";

const MatchesList = ({
  matches = [],
  onOpenScoring,
  onViewDetails,
  title = "Match Configuration Health",
}) => {
  const rows = Array.isArray(matches) ? matches : [];

  return (
    <section className="rounded-2xl border border-slate-800/80 bg-slate-900/45 p-4 backdrop-blur-md">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-200">{title}</h2>
        <span className="text-xs text-slate-400">{rows.length} matches</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-left text-slate-400">
              <th className="py-2">Match</th>
              <th className="py-2">Sport</th>
              <th className="py-2">Teams</th>
              <th className="py-2">Status</th>
              <th className="py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-4 text-center text-slate-500">
                  No scoped matches available.
                </td>
              </tr>
            ) : (
              rows.map((match) => {
                const matchId = Number(match?.match_id || 0);
                const visibilityStatus = String(match?.visibility_status || match?.config_status || "UNKNOWN").toUpperCase();
                const isLocked = visibilityStatus === "CONFIG_LOCKED" || visibilityStatus === "CONFIG_MISMATCH";
                const teamA = match?.team1_name || "Team A";
                const teamB = match?.team2_name || "Team B";

                return (
                  <tr key={`health-${matchId}`} className="border-b border-slate-800 last:border-0">
                    <td className="py-2 text-slate-100">
                      Match {match?.match_number || matchId || "details unavailable"}
                    </td>
                    <td className="py-2 text-slate-300">{getSportDisplayName(match, "Unassigned")}</td>
                    <td className="py-2 text-slate-300">{teamA} vs {teamB}</td>
                    <td className="py-2">
                      <ConfigStatusBadge status={visibilityStatus} />
                    </td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenScoring?.(match)}
                          className={`rounded border px-2 py-1 text-xs font-semibold transition ${
                            isLocked
                              ? "border-rose-500/40 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20"
                              : "border-cyan-500/40 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20"
                          }`}
                        >
                          {isLocked ? "Scoring Blocked" : "Open Live Scoring"}
                        </button>
                        <button
                          type="button"
                          onClick={() => onViewDetails?.(match)}
                          className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-200 transition hover:bg-slate-700"
                        >
                          View Details
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default MatchesList;
