import React from "react";

const AdvancedDebugPanel = ({
  isReplayLoading,
  replayError,
  replaySnapshot,
  replayUntilSequence,
  setReplayUntilSequence,
  handleReplaySequenceSubmit,
  handleReplayRebuild,
  replayTimeline,
  resolveTeamName,
  formatTimelineTime,
  summarizeScoreMap,
  summarizeScoreDelta
}) => {
  return (
    <div className="rounded-2xl border border-cyan-700/30 bg-cyan-950/20 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-cyan-100">Advanced Replay</p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="1"
            placeholder="Until seq"
            value={replayUntilSequence}
            onChange={(event) => setReplayUntilSequence(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleReplaySequenceSubmit();
            }}
            className="w-28 rounded-lg border border-cyan-700/40 bg-slate-900 px-2 py-1.5 text-xs text-slate-100"
          />
          <button
            type="button"
            onClick={handleReplaySequenceSubmit}
            disabled={isReplayLoading}
            className="rounded-lg border border-cyan-600/50 bg-cyan-600/20 px-3 py-1.5 text-xs font-semibold text-cyan-100 disabled:opacity-60"
          >
            Rebuild
          </button>
          <button
            type="button"
            onClick={async () => {
              setReplayUntilSequence("");
              await handleReplayRebuild(null);
            }}
            disabled={isReplayLoading}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-100 disabled:opacity-60"
          >
            Latest
          </button>
        </div>
      </div>

      {replayError && (
        <p className="mb-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-2 py-1.5 text-xs text-rose-200">
          {replayError}
        </p>
      )}
      {isReplayLoading && !replayError && <p className="mb-2 text-xs text-cyan-200">Replaying events...</p>}

      {!isReplayLoading && replaySnapshot && (
        <>
          <div className="mb-3 grid gap-1 rounded-lg border border-cyan-700/20 bg-slate-900/70 p-3 text-xs text-slate-200">
            <p>Processed: {Number(replaySnapshot?.processed_events || 0)} / {Number(replaySnapshot?.total_events || 0)}</p>
            <p>Until Sequence: {replaySnapshot?.until_sequence || "Latest"}</p>
            <p>Derived Score: {summarizeScoreMap(replaySnapshot?.state?.score, resolveTeamName)}</p>
            <p>Status: {String(replaySnapshot?.state?.match_result?.status || "ONGOING").toUpperCase()}</p>
          </div>

          {Array.isArray(replaySnapshot?.validation_issues) && replaySnapshot.validation_issues.length > 0 && (
            <div className="mb-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-100">
              {replaySnapshot.validation_issues.join(" | ")}
            </div>
          )}
          {Array.isArray(replaySnapshot?.timeline_validation_issues) && replaySnapshot.timeline_validation_issues.length > 0 && (
            <div className="mb-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-100">
              Timeline: {replaySnapshot.timeline_validation_issues.join(" | ")}
            </div>
          )}

          <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
            {replayTimeline.length === 0 && <p className="text-xs text-cyan-200">No replay events.</p>}
            {replayTimeline.map((row) => (
              <div key={`${row.id || "event"}-${row.sequence}`} className="rounded-lg border border-cyan-700/20 bg-slate-900/80 p-2 text-xs text-slate-200">
                <p className="font-semibold text-cyan-100">
                  #{row.sequence} {String(row.event_type || "").replace(/_/g, " ")}
                </p>
                <p>{row.team_id ? resolveTeamName(row.team_id) : "No team"} | {formatTimelineTime(row.timestamp)}</p>
                <p>{summarizeScoreDelta(row.event_delta, resolveTeamName)}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default AdvancedDebugPanel;
