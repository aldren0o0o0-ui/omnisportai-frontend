import React from "react";
import { getShortTeamName } from "../utils/displayLabels";
import RuleSnapshotBadge from "./RuleSnapshotBadge";

const MatchHeader = ({
  match,
  matchPhaseLabel,
  liveStatusMode,
  clockLabel,
  ruleSnapshotMeta,
  configStatus,
  soundFeedbackEnabled,
  onToggleSound,
  debugMode,
  onToggleDebug,
  onSave,
  onClose
}) => {
  const teamA = match?.team1_name || "Unnamed team";
  const teamB = match?.team2_name || (match?.team2_id ? "Unnamed team" : "BYE");
  const shortTeamA = getShortTeamName(teamA);
  const shortTeamB = getShortTeamName(teamB);
  const sportName = String(match?.sport_name || match?.sport || "Sport").trim();
  const matchLabel = "Match details unavailable";
  const liveTone = liveStatusMode === "live"
    ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-100"
    : liveStatusMode === "stale" || liveStatusMode === "reconnecting"
      ? "border-amber-500/50 bg-amber-500/15 text-amber-100"
      : "border-rose-500/50 bg-rose-500/15 text-rose-100";

  return (
    <header className="rounded-2xl border border-slate-700/80 bg-[linear-gradient(118deg,_rgba(7,18,43,0.97),_rgba(5,10,22,0.98))] px-3 py-2.5 shadow-lg shadow-slate-950/35">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold tracking-wide text-cyan-300">OmniSport AI — Live Scoring</p>
          <p className="mt-0.5 truncate text-sm font-semibold text-slate-100" title={`${matchLabel} — ${teamA} vs ${teamB}`}>
            {matchLabel} — {shortTeamA} vs {shortTeamB}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${liveTone}`}>
            {liveStatusMode === "live" ? "LIVE" : liveStatusMode.toUpperCase()}
          </span>
          <button
            type="button"
            onClick={() => onToggleSound(!soundFeedbackEnabled)}
            aria-label="Toggle sound"
            title="Toggle sound"
            className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
              soundFeedbackEnabled
                ? "border-cyan-500/50 bg-cyan-500/20 text-cyan-100"
                : "border-slate-700 bg-slate-900/80 text-slate-300 hover:border-slate-500"
            }`}
          >
            Sound
          </button>
          <button
            type="button"
            onClick={onSave}
            title="Save live scoring state"
            className="rounded-lg border border-blue-500/50 bg-blue-500/15 px-2.5 py-1.5 text-xs font-semibold text-blue-100 transition hover:bg-blue-500/25"
          >
            Save
          </button>
          <label className="flex items-center gap-1.5 rounded-lg border border-cyan-700/50 bg-cyan-900/25 px-2 py-1.5 text-xs font-semibold text-cyan-100">
            <input type="checkbox" checked={debugMode} onChange={(event) => onToggleDebug(event.target.checked)} aria-label="Toggle advanced tools" />
            Advanced
          </label>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-600 bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-slate-700"
          >
            Exit
          </button>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="rounded-full border border-slate-700 bg-slate-900/70 px-2 py-0.5 text-slate-200" title={sportName}>
          {sportName}
        </span>
        <span className="rounded-full border border-slate-700 bg-slate-900/70 px-2 py-0.5 text-slate-200">
          {matchPhaseLabel}
        </span>
        {clockLabel && (
          <span className="rounded-full border border-cyan-700/70 bg-cyan-900/20 px-2 py-0.5 font-medium text-cyan-100">
            {clockLabel}
          </span>
        )}
        <RuleSnapshotBadge snapshot={ruleSnapshotMeta} configStatus={configStatus} />
      </div>
    </header>
  );
};

export default MatchHeader;
