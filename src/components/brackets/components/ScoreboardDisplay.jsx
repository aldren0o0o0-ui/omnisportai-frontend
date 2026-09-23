import React from "react";
import { getActionDisplayLabel, getActionTooltip, getShortTeamName } from "../utils/displayLabels";
import { TeamLogo } from "../../common/IdentityImage";
import {
  getMatchParticipantLabel,
  getMatchParticipantTarget,
} from "../utils/bracketTargets";
import SecondaryClockPanel from "./SecondaryClockPanel";

const ScoreboardDisplay = ({
  match,
  sportProfile,
  matchPhaseLabel,
  presentation,
  team1LiveScore,
  team2LiveScore,
  winnerTeamId,
  isClockEnabled,
  clockValue,
  clockRunning,
  sportStateMode,
  sportStateLabel,
  sportStateTeamId,
  onStateOverrideApply,
  isApplyingStateOverride,
  canApplyStateOverride,
  clockMilliseconds,
  clockControls,
  onClockControlSubmit,
  getClockControlDisabledReason,
  teamOptions,
  secondaryClock,
}) => {
  const activeWinnerTeamId = Number(winnerTeamId || match?.winner_team_id || 0) || null;
  const useResultConsole = sportProfile === "turn_based" || sportProfile === "time_based";

  const team1Name = getMatchParticipantLabel(match, 1, "Participant 1");
  const team2Name = getMatchParticipantLabel(match, 2, "Participant 2");
  const team1DisplayName = team1Name || "Participant 1";
  const team2DisplayName = team2Name || "Participant 2";

  const shortTeam1 = getShortTeamName(team1DisplayName);
  const shortTeam2 = getShortTeamName(team2DisplayName);
  const team1Logo =
    match?.participant1?.effective_logo_url ||
    match?.team1_logo_url ||
    teamOptions.find((team) => team?.side === 1)?.logoUrl ||
    null;
  const team2Logo =
    match?.participant2?.effective_logo_url ||
    match?.team2_logo_url ||
    teamOptions.find((team) => team?.side === 2)?.logoUrl ||
    null;
  const shouldHighlightState = sportStateMode === "possession" || sportStateMode === "server" || sportStateMode === "batting";
  const isTeam1State = shouldHighlightState && Number(sportStateTeamId) === Number(match?.team1_id);
  const isTeam2State = shouldHighlightState && Number(sportStateTeamId) === Number(match?.team2_id);
  const normalizedMs = Number.isFinite(Number(clockMilliseconds))
    ? String(Math.max(0, Math.min(999, Number(clockMilliseconds)))).padStart(3, "0")
    : "000";
  const compactClockControls = Array.isArray(clockControls) ? clockControls : [];
  const team1Id = Number(getMatchParticipantTarget(match, 1)?.id || teamOptions?.[0]?.id || 0);
  const team2Id = Number(getMatchParticipantTarget(match, 2)?.id || teamOptions?.[1]?.id || 0);
  const hasStateToggle = shouldHighlightState && canApplyStateOverride && team1Id > 0 && team2Id > 0 && typeof onStateOverrideApply === "function";
  const normalizedStateTeamId = Number(sportStateTeamId || 0);
  const activeStateTeamId = normalizedStateTeamId === team1Id || normalizedStateTeamId === team2Id ? normalizedStateTeamId : null;
  const leftTeamName = teamOptions.find((team) => Number(team.id) === team1Id)?.name || team1Name;
  const rightTeamName = teamOptions.find((team) => Number(team.id) === team2Id)?.name || team2Name;
  const isLeftActive = activeStateTeamId === team1Id;
  const isRightActive = activeStateTeamId === team2Id;
  const setPresentation = presentation?.engine === "SETS" ? presentation : null;
  const phaseText = setPresentation
    ? `${setPresentation.phase?.deciding ? "Deciding " : ""}${setPresentation.phase?.label || "Set"} ${setPresentation.phase?.current || 1}${setPresentation.phase?.bestOf ? ` of ${setPresentation.phase.bestOf}` : ""}`
    : matchPhaseLabel;
  const targetBits = setPresentation
    ? [
        setPresentation.target?.points ? `Target ${setPresentation.target.points}` : "",
        setPresentation.target?.winBy ? `Win by ${setPresentation.target.winBy}` : "",
        setPresentation.target?.cap ? `Cap ${setPresentation.target.cap}` : "",
      ].filter(Boolean)
    : [];
  const stateToggleDisabled = !canApplyStateOverride || isApplyingStateOverride;
  const venueName = String(
    match?.venue_name
    || match?.venue
    || match?.court_name
    || match?.field_name
    || match?.pool_name
    || ""
  ).trim();
  const venueLocation = String(match?.venue_location || match?.venue?.location || "").trim();
  const venueLabel = [venueName, venueLocation]
    .filter((value, index, rows) => value && rows.indexOf(value) === index)
    .join(" — ");

  const cleanVenueLabel = venueLabel.replace(/[^\x20-\x7E]+/g, " — ");

  const isCombatOrBoxing =
    sportProfile === "COMBAT" ||
    sportProfile === "combat" ||
    String(match?.sport_name || "").toLowerCase().includes("boxing") ||
    String(match?.sport_id) === "6";

  return (
    <section className="space-y-3">
      {useResultConsole ? (
        <div className="rounded-2xl  bg-white p-4 shadow-md shadow-slate-300/30 dark:border-slate-700/80 dark:bg-[linear-gradient(122deg,_rgba(13,28,58,0.92),_rgba(8,14,28,0.96))] dark:shadow-xl dark:shadow-slate-950/35">
          <p className="text-xs font-semibold tracking-wide text-cyan-700 dark:text-cyan-200">Result Console</p>
          <p className="mt-2 text-base text-slate-900 dark:text-slate-100">
            Winner: {activeWinnerTeamId ? (teamOptions.find((t) => t.id === activeWinnerTeamId)?.name || "-") : "-"}
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Result-focused sport mode is active. Team scoreboard is minimized by design.</p>
        </div>
      ) : (
        <div className="">
          {(phaseText || targetBits.length > 0 || setPresentation?.indicators?.length > 0) && (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700/80 dark:bg-slate-900/60">
              <div>
                {phaseText && <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{phaseText}</p>}
                {targetBits.length > 0 && <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">{targetBits.join(" · ")}</p>}
              </div>
              {setPresentation?.indicators?.length > 0 && (
                <div className="flex flex-wrap gap-1.5" aria-live="polite">
                  {setPresentation.indicators.map((indicator, index) => (
                    <span key={`${indicator.code}-${indicator.side || "match"}-${index}`} className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 dark:border-amber-500/50 dark:bg-amber-500/15 dark:text-amber-100">
                      {indicator.label}{indicator.side ? ` · ${indicator.side === "A" ? shortTeam1 : shortTeam2}` : ""}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="mb-3">
            {cleanVenueLabel && (
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
                  Venue: {cleanVenueLabel}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-1.5 sm:gap-2.5">
            {/* first container score */}
            <div className={`min-w-0 rounded-xl bg-white px-2 py-3 text-center shadow-sm shadow-slate-300/35 sm:px-3 sm:py-3.5 dark:bg-slate-950/45 dark:shadow-lg dark:shadow-slate-950/40 ${
              isCombatOrBoxing
                ? "border border-red-300/80 bg-red-50/30 dark:border-red-800/50 dark:bg-red-950/20"
                : isTeam1State ? "ring-2 ring-amber-400/40" : ""
            }`}>
              {isCombatOrBoxing && (
                <div className="mb-1.5">
                  <span className="inline-block rounded-full bg-red-600 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-xs">
                    Red Corner
                  </span>
                </div>
              )}
              <div className="flex items-center justify-center gap-2">
                <TeamLogo imageUrl={team1Logo} label={team1Name} scale="sm" />
                <p className="min-w-0 break-words text-sm font-extrabold leading-tight tracking-wide text-slate-900 sm:text-xl dark:text-slate-100" title={team1Name}>{shortTeam1}</p>
              </div>
              {isTeam1State && <p className="mt-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-200">{sportStateLabel || "State"}</p>}
              {setPresentation?.service?.side === "A" && <p className="mt-0.5 text-[11px] font-bold text-cyan-700 dark:text-cyan-200">Serving</p>}
              <p className="mt-2 font-mono text-5xl font-black leading-none text-slate-900 sm:text-7xl lg:text-8xl dark:text-slate-100">{team1LiveScore}</p>
              {isCombatOrBoxing && (
                <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Rounds Won
                </p>
              )}
              {setPresentation?.series?.visible && <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">{setPresentation.series.label}: {setPresentation.series.sideA}</p>}
            </div>

            <div className="flex min-w-16 flex-col items-center justify-center gap-2 sm:min-w-[102px]">
              <span className="rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-semibold tracking-wide text-slate-700 dark:border-slate-600 dark:bg-slate-900/80 dark:text-slate-200">VS</span>
              {isClockEnabled && (
                <div className="rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-1.5 text-center dark:border-cyan-700/45 dark:bg-cyan-950/25">
                  <p className="font-mono text-lg font-semibold text-cyan-800 dark:text-cyan-100">
                    {clockValue}<span className="text-sm">.{normalizedMs}</span>
                  </p>
                  <p className="text-[11px] text-cyan-700 dark:text-cyan-300">{clockRunning ? "Running" : "Stopped"}</p>
                </div>
              )}
              {hasStateToggle && (
                <>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      aria-label={`Set ${sportStateLabel || "state"} to ${leftTeamName}`}
                      title={`${sportStateLabel || "State"}: ${leftTeamName}`}
                      onClick={() => onStateOverrideApply?.(team1Id)}
                      disabled={stateToggleDisabled}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold transition ${
                        stateToggleDisabled
                          ? "cursor-not-allowed border-slate-300 bg-slate-100 text-slate-400 opacity-70 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-500"
                          : isLeftActive
                            ? "border-cyan-500/70 bg-cyan-500/20 text-cyan-800 dark:text-cyan-100"
                            : "border-slate-300 bg-slate-100 text-slate-700 hover:border-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-400"
                      }`}
                    >
                      A
                    </button>
                    <button
                      type="button"
                      aria-label={`Set ${sportStateLabel || "state"} to ${rightTeamName}`}
                      title={`${sportStateLabel || "State"}: ${rightTeamName}`}
                      onClick={() => onStateOverrideApply?.(team2Id)}
                      disabled={stateToggleDisabled}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold transition ${
                        stateToggleDisabled
                          ? "cursor-not-allowed border-slate-300 bg-slate-100 text-slate-400 opacity-70 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-500"
                          : isRightActive
                            ? "border-cyan-500/70 bg-cyan-500/20 text-cyan-800 dark:text-cyan-100"
                            : "border-slate-300 bg-slate-100 text-slate-700 hover:border-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-400"
                      }`}
                    >
                      B
                    </button>
                  </div>
                  {/* <p className="text-[10px] font-semibold text-slate-400">
                    {sportStateLabel || "State"}: <span className="text-cyan-200">{stateTeamShort}</span>
                  </p> */}
                </>
              )}
              {shouldHighlightState && !activeStateTeamId && (
                <p className="text-center text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {sportStateMode === "server" ? "Service not assigned" : `${sportStateLabel || "State"} not assigned`}
                </p>
              )}
            </div>

            {/* second container score */}
            <div className={`min-w-0 rounded-xl bg-white px-2 py-3 text-center shadow-sm shadow-slate-300/35 sm:px-3 sm:py-3.5 dark:bg-slate-950/45 dark:shadow-lg dark:shadow-slate-950/40 ${
              isCombatOrBoxing
                ? "border border-blue-300/80 bg-blue-50/30 dark:border-blue-800/50 dark:bg-blue-950/20"
                : isTeam2State ? "ring-2 ring-amber-400/40" : ""
            }`}>
              {isCombatOrBoxing && (
                <div className="mb-1.5">
                  <span className="inline-block rounded-full bg-blue-600 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-xs">
                    Blue Corner
                  </span>
                </div>
              )}
              <div className="flex items-center justify-center gap-2">
                <TeamLogo imageUrl={team2Logo} label={team2Name} scale="sm" />
                <p className="min-w-0 break-words text-sm font-extrabold leading-tight tracking-wide text-slate-900 sm:text-xl dark:text-slate-100" title={team2Name}>{shortTeam2}</p>
              </div>
              {isTeam2State && <p className="mt-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-200">{sportStateLabel || "State"}</p>}
              {setPresentation?.service?.side === "B" && <p className="mt-0.5 text-[11px] font-bold text-cyan-700 dark:text-cyan-200">Serving</p>}
              <p className="mt-2 font-mono text-5xl font-black leading-none text-slate-900 sm:text-7xl lg:text-8xl dark:text-slate-100">{team2LiveScore}</p>
              {isCombatOrBoxing && (
                <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Rounds Won
                </p>
              )}
              {setPresentation?.series?.visible && <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">{setPresentation.series.label}: {setPresentation.series.sideB}</p>}
            </div>
          </div>

          {setPresentation && !setPresentation.service?.assigned && (
            <p className="mt-2 text-center text-xs font-medium text-slate-500 dark:text-slate-400">Service not assigned</p>
          )}

          {compactClockControls.length > 0 && (
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {compactClockControls.map((control) => {
                const disabledReason = typeof getClockControlDisabledReason === "function"
                  ? getClockControlDisabledReason(control)
                  : "";
                const isDisabled = Boolean(disabledReason);
                const label = getActionDisplayLabel(control);
                const tooltip = getActionTooltip(control);
                return (
                  <button
                    key={`clock-control-${control.id}`}
                    type="button"
                    aria-label={tooltip}
                    title={disabledReason || tooltip}
                    disabled={isDisabled}
                    onClick={() => onClockControlSubmit?.(control)}
                    className="min-h-[30px] rounded-md border border-cyan-300 bg-cyan-50 px-2.5 py-1 text-[11px] font-semibold text-cyan-700 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-cyan-500/40 dark:bg-cyan-500/12 dark:text-cyan-100 dark:hover:bg-cyan-500/25"
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
          {secondaryClock?.config?.enabled ? (
            <div className="mt-3">
              <SecondaryClockPanel {...secondaryClock} />
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
};

export default ScoreboardDisplay;
