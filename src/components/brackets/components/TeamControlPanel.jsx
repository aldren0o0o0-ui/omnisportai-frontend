import React, { useEffect, useMemo, useState } from "react";
import { getLineupRequirementLabel, getShortPlayerName, getShortTeamName } from "../utils/displayLabels";

const TeamControlPanel = ({
  participantState,
  rosterByTeamId,
  teamOptions,
  selectedTeamId,
  selectedPlayerId,
  onSelectTeam,
  onSelectPlayer,
  lineupUi,
  substitutionControl,
  onPrepareSubstitution,
  participantUnitType,
  sportStateMode,
  handleUndoLastEvent,
  canUndoEvents,
  isUndoing,
  eventCount,
}) => {
  const [substitutionMode, setSubstitutionMode] = useState(false);
  const [subOut, setSubOut] = useState(null);
  const [subIn, setSubIn] = useState(null);
  const [teamTabId, setTeamTabId] = useState("");
  const [showBenchPlayers, setShowBenchPlayers] = useState(false);

  const participantRows = useMemo(() => {
    const rows = [];
    const sides = participantState?.sides && typeof participantState.sides === "object" ? participantState.sides : {};
    Object.entries(sides).forEach(([sideKey, side]) => {
      const teamId = Number(side?.team_id);
      if (!Number.isFinite(teamId) || teamId <= 0) return;
      const teamName = teamOptions.find((row) => Number(row.id) === teamId)?.name || `Side ${sideKey}`;
      const activePlayers = Array.isArray(side?.active_players) ? side.active_players : [];
      const benchPlayersFromState = Array.isArray(side?.bench_players) ? side.bench_players : [];
      const roster = Array.isArray(rosterByTeamId?.[teamId]) ? rosterByTeamId[teamId] : [];
      const activeIds = new Set(activePlayers.map((row) => Number(row.id)));
      const fallbackBench = roster
        .filter((row) => !activeIds.has(Number(row.id)))
        .map((row) => ({ id: Number(row.id), name: row.full_name || [row.first_name, row.last_name].filter(Boolean).join(" ").trim() || "Unknown player" }));
      const benchPlayers = benchPlayersFromState.length > 0 ? benchPlayersFromState : fallbackBench;
      rows.push({
        sideKey,
        teamId,
        teamName,
        activePlayers: activePlayers.map((row) => ({ id: Number(row.id), name: row.name || "Unknown player" })),
        benchPlayers: benchPlayers.map((row) => ({ id: Number(row.id), name: row.name || "Unknown player" })),
      });
    });
    return rows;
  }, [participantState?.sides, rosterByTeamId, teamOptions]);

  useEffect(() => {
    if (selectedTeamId) {
      setTeamTabId(String(selectedTeamId));
      return;
    }
    if (!teamTabId && participantRows[0]?.teamId) setTeamTabId(String(participantRows[0].teamId));
  }, [participantRows, selectedTeamId, teamTabId]);

  const visibleRow = useMemo(
    () => participantRows.find((row) => String(row.teamId) === String(teamTabId)) || participantRows[0] || null,
    [participantRows, teamTabId]
  );

  const lineupCompletionRows = useMemo(() => {
    const expected = Number(lineupUi?.activePlayersPerSide || 0);
    if (!expected || !lineupUi?.requiresLineupSetup) return [];
    return participantRows.map((row) => ({
      teamId: row.teamId,
      teamName: row.teamName,
      active: row.activePlayers.length,
      expected,
    }));
  }, [lineupUi?.activePlayersPerSide, lineupUi?.requiresLineupSetup, participantRows]);

  const substitutionDisabledReason = useMemo(() => {
    if (!lineupUi?.supportsSubstitution) return "Substitution not supported for this sport.";
    if (!substitutionControl) return "No substitution action configured in backend controls.";
    return "";
  }, [lineupUi?.supportsSubstitution, substitutionControl]);

  const canConfirmSubstitution = Boolean(
    substitutionMode &&
      subOut?.teamId &&
      subIn?.teamId &&
      Number(subOut.teamId) === Number(subIn.teamId) &&
      Number(subOut.playerId) > 0 &&
      Number(subIn.playerId) > 0 &&
      !substitutionDisabledReason
  );

  const lineupTitle = getLineupRequirementLabel({
    activePlayersPerSide: lineupUi?.activePlayersPerSide,
    lineupLabel: lineupUi?.lineupLabel || "Active Lineup",
  });
  const controlTitle = sportStateMode === "athlete"
    ? "Athlete Control"
    : (sportStateMode === "server" && !lineupUi?.supportsSubstitution)
      ? "Participant Control"
    : participantUnitType === "TEAM"
      ? "Team Control"
      : "Participant Control";
  const benchVisible = participantUnitType === "TEAM" && sportStateMode !== "athlete" && Boolean(visibleRow?.benchPlayers?.length);
  const showSubstitutionToggle = lineupUi?.supportsSubstitution && participantUnitType === "TEAM";

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-slate-950/55 p-3.5">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">{controlTitle}</p>
          {showSubstitutionToggle && (
            <button
              type="button"
              onClick={() => {
                setSubstitutionMode((current) => !current);
                setSubOut(null);
                setSubIn(null);
              }}
              title={substitutionDisabledReason || "Toggle substitution mode"}
              className={`rounded-md border px-2 py-1 text-xs font-semibold transition ${
                substitutionMode
                  ? "border-cyan-500/65 bg-cyan-500/20 text-cyan-100"
                  : "border-slate-600/80 bg-slate-900/80 text-slate-300 hover:border-slate-500"
              } ${substitutionDisabledReason ? "opacity-60" : ""}`}
            >
              Substitution Mode
            </button>
          )}
        </div>

        <div className="mb-2.5 flex gap-2 overflow-x-auto pb-1">
          {participantRows.map((row) => (
            <button
              key={`team-tab-${row.teamId}`}
              type="button"
              onClick={() => {
                setTeamTabId(String(row.teamId));
                onSelectTeam(row.teamId);
              }}
              title={row.teamName}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                String(teamTabId) === String(row.teamId)
                  ? "border-amber-500/50 bg-amber-500/20 text-amber-100"
                  : "border-slate-700/90 bg-slate-900/85 text-slate-300 hover:border-slate-500"
              }`}
            >
              {getShortTeamName(row.teamName)}
            </button>
          ))}
        </div>

        {lineupCompletionRows.length > 0 && (
          <div className="mb-2 rounded-lg bg-slate-900/55 p-2 text-xs text-slate-300">
            <p className="mb-1 font-semibold text-slate-200">Lineup setup status</p>
            <div className="space-y-0.5">
              {lineupCompletionRows.map((row) => (
                <p key={`lineup-status-${row.teamId}`}>
                  {getShortTeamName(row.teamName)}: {row.active}/{row.expected}
                </p>
              ))}
            </div>
          </div>
        )}

        {lineupUi?.warningText && (
          <div className="mb-2 rounded-md border border-amber-500/35 bg-amber-500/10 p-2 text-xs text-amber-100">
            {lineupUi.warningText}
          </div>
        )}

        {visibleRow ? (
          <div className="rounded-lg bg-slate-900/65 p-2.5">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => onSelectTeam(visibleRow.teamId)}
                title={visibleRow.teamName}
                className={`rounded-md border px-2 py-1 text-xs font-semibold ${
                  Number(selectedTeamId) === Number(visibleRow.teamId)
                    ? "border-amber-500/50 bg-amber-500/20 text-amber-100"
                    : "border-slate-700 bg-slate-950 text-slate-300"
                }`}
              >
                {getShortTeamName(visibleRow.teamName)}
              </button>
              <span className="text-[11px] text-slate-400">
                {sportStateMode === "athlete" ? "Active athlete" : lineupTitle}
              </span>
            </div>

            {visibleRow.activePlayers.length > 0 && (
              <p className="mb-1 text-[11px] tracking-wide text-slate-400">{lineupUi?.lineupLabel || "Active Lineup"}</p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {visibleRow.activePlayers.map((player) => {
                const isSelectedPlayer = Number(selectedPlayerId) === Number(player.id);
                const isSubOut = substitutionMode && Number(subOut?.playerId) === Number(player.id);
                return (
                  <button
                    key={`active-${visibleRow.teamId}-${player.id}`}
                    type="button"
                    title={player.name}
                    onClick={() => {
                      onSelectPlayer({ teamId: visibleRow.teamId, playerId: player.id });
                      if (substitutionMode) setSubOut({ teamId: visibleRow.teamId, playerId: player.id, label: player.name });
                    }}
                    className={`rounded-full border px-2 py-1 text-xs font-semibold transition ${
                      isSubOut
                        ? "border-orange-400/60 bg-orange-500/20 text-orange-100"
                      : isSelectedPlayer
                          ? "border-amber-500/50 bg-amber-500/20 text-amber-100"
                          : "border-slate-700/90 bg-slate-950 text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    {getShortPlayerName(player.name)}
                  </button>
                );
              })}
            </div>

            {benchVisible && (
              <div className="mt-2">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="text-[11px] tracking-wide text-slate-400">
                    Bench {visibleRow.benchPlayers.length > 0 ? `(${visibleRow.benchPlayers.length})` : ""}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowBenchPlayers((current) => !current)}
                    className="rounded-md border border-slate-600/80 bg-slate-800 px-2 py-1 text-[11px] font-semibold text-slate-200"
                  >
                    {showBenchPlayers ? "Hide Bench" : "Show Bench"}
                  </button>
                </div>
                {showBenchPlayers && (
                  <div className="flex flex-wrap gap-1.5">
                    {visibleRow.benchPlayers.map((player) => {
                      const isSubIn = substitutionMode && Number(subIn?.playerId) === Number(player.id);
                      return (
                        <button
                          key={`bench-${visibleRow.teamId}-${player.id}`}
                          type="button"
                          title={player.name}
                          onClick={() => {
                            if (substitutionMode) setSubIn({ teamId: visibleRow.teamId, playerId: player.id, label: player.name });
                            else onSelectPlayer({ teamId: visibleRow.teamId, playerId: player.id });
                          }}
                          className={`rounded-full border px-2 py-1 text-xs font-semibold transition ${
                            isSubIn
                              ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-100"
                              : "border-slate-700/90 bg-slate-950 text-slate-300 hover:border-slate-500"
                          }`}
                        >
                          {getShortPlayerName(player.name)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-400">No lineup data available.</p>
        )}

        {substitutionMode && participantUnitType === "TEAM" && (
          <div className="mt-2 rounded-lg border border-cyan-700/50 bg-cyan-900/20 p-2.5 text-xs text-cyan-100">
            <p className="font-semibold">Substitution Mode</p>
            <p className="mt-1">OUT: {subOut?.label ? getShortPlayerName(subOut.label) : "-"}</p>
            <p>IN: {subIn?.label ? getShortPlayerName(subIn.label) : "-"}</p>
            {substitutionDisabledReason && <p className="mt-1 text-amber-200">{substitutionDisabledReason}</p>}
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                disabled={!canConfirmSubstitution}
                onClick={() => {
                  onPrepareSubstitution({
                    teamId: subOut.teamId,
                    outPlayerId: subOut.playerId,
                    inPlayerId: subIn.playerId,
                  });
                  setSubstitutionMode(false);
                  setSubOut(null);
                  setSubIn(null);
                }}
                className="rounded-md border border-cyan-400/60 bg-cyan-500/20 px-2 py-1 font-semibold text-cyan-100 disabled:opacity-60"
              >
                Prepare Substitution
              </button>
              <button
                type="button"
                onClick={() => {
                  setSubOut(null);
                  setSubIn(null);
                  setSubstitutionMode(false);
                }}
                className="rounded-md border border-slate-600 bg-slate-800 px-2 py-1 font-semibold text-slate-200"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleUndoLastEvent}
        disabled={!canUndoEvents || isUndoing || Number(eventCount || 0) === 0}
        className="min-h-[44px] w-full rounded-lg border border-amber-500/45 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isUndoing ? "Undoing..." : "Undo Last Event"}
      </button>
    </div>
  );
};

export default TeamControlPanel;
