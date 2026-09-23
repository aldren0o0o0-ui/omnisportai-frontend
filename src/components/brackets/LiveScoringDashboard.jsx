import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getMatchEventConfig,
  getMatchReplay,
  getMatchTimeline,
  getMatchLiveState
} from "../../services/matchEventService";
import { getTeamRoster } from "../../services/teamService";
import { useAuth } from "../../context/AuthContext";
import AppModal from "../common/AppModal";
import useLiveScoringSession from "./live-scoring/hooks/useLiveScoringSession";
import TallyBoardShell from "./live-scoring/TallyBoardShell";
import TimedTeamSurface from "./live-scoring/TimedTeamSurface";
import BoxingScorecardSurface from "./live-scoring/BoxingScorecardSurface";
import ParticipantPlayerStrip from "./live-scoring/ParticipantPlayerStrip";
import { buildSubstitutionSubmission } from "./live-scoring/substitutionPayload";
import { resolveLiveScoringSurface } from "./live-scoring/tallyBoardSurfaceResolver";

import { validateEventConfig } from "./eventComposer/config/validateEventConfig";
import { useEventComposerState } from "./eventComposer/state/useEventComposerState";
import { controlResolver } from "./eventComposer/core/controlResolver";
import { buildEventPayload } from "./eventComposer/core/buildEventPayload";
import { useComposerReset } from "./eventComposer/core/useComposerReset";

import ScoreboardDisplay from "./components/ScoreboardDisplay";
import LiveTimeline from "./components/LiveTimeline";
import MatchSummaryPanel from "./components/MatchSummaryPanel";
import ComposerUI from "./components/ComposerUI";
import LiveStatusIndicator from "./components/LiveStatusIndicator";
import AdvancedDebugPanel from "./components/AdvancedDebugPanel";
import RulesSummaryPanel from "./components/RulesSummaryPanel";
import SpecializedScoringPanel from "./components/SpecializedScoringPanel";
import ResultCorrectionPanel from "./components/ResultCorrectionPanel";
import SportActionPanel from "./components/SportActionPanel";
import PlayerPerformanceTable from "./components/PlayerPerformanceTable";
import MatchCompletionPanel from "./components/MatchCompletionPanel";
import { getSecondaryClockConfig, getSecondaryClockSuggestion } from "./utils/secondaryClockConfig";
import {
  resolveActionAttributionPolicy,
  resolveMatchParticipants,
} from "../../features/live-scoring/statistics/index.js";
import {
  buildCanonicalPlayerOptions,
  buildCanonicalPlayerStatsTable,
  findResolvedParticipant,
  shouldClearSelectedPlayer,
} from "./utils/tallyBoardCanonicalView.js";
import {
  buildSportEventLabel,
  getActionDisplayLabel,
  getActionTooltip,
  getCompetitionTypeLabel,
  getShortTeamName,
  getStateEffectForAction,
  isStateOverrideControl,
} from "./utils/displayLabels";
import { getSportUiProfile, normalizeSportKey } from "./utils/sportUiProfile";
import {
  getMatchParticipantTarget,
  hasResolvedMatchParticipants,
} from "./utils/bracketTargets";
import {
  isDedicatedEntryEngine,
  resolveSpecializedEngine,
} from "./utils/specializedScoringUi";
import {
  buildConnectionStatus,
  buildMatchCompletionPresentation,
  buildLiveScoreboardPresentation,
  getActionPresentation,
  isCompletionAction,
  isMatchCompleted,
  isStaleMatchError,
  getStatisticsPresentation,
  needsDetailedComposer,
} from "./utils/liveScoringPresentation";

const writableStatuses = new Set(["PENDING", "SCHEDULED", "ONGOING"]);
const defaultSafeDisplay = {
  allow_scoreboard: true,
  allow_timeline: true,
  allow_composer: true,
};
const CLOCK_HARD_SYNC_EVENT_TYPES = new Set([
  "CLOCK_RESET",
  "CLOCK_SET",
  "PERIOD_ADVANCE",
  "QUARTER_ADVANCE",
  "ROUND_ADVANCE",
  "SET_ADVANCE",
  "HALF_ADVANCE",
  "INNING_ADVANCE",
]);

const asInt = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
};

const resolveBracketParticipantLabel = (participant, fallbackPrimary = "", fallbackSecondary = "") => {
  const shape = String(participant?.participant_shape || "").trim().toUpperCase();
  const teamName = String(participant?.team_name || "").trim();
  const departmentName = String(participant?.department_name || "").trim();
  const displayName = String(participant?.display_name || "").trim();
  const primary = String(fallbackPrimary || "").trim();
  const secondary = String(fallbackSecondary || "").trim();

  if (shape === "TEAM") {
    return teamName || primary || displayName || secondary;
  }
  if (shape === "SOLO" || shape === "DUO") {
    return displayName || primary || secondary || teamName || departmentName;
  }
  return primary || secondary || displayName || teamName || departmentName;
};

const normalizeRuleSnapshotMeta = (configResponse, match) => {
  const response = configResponse && typeof configResponse === "object" ? configResponse : {};
  const ruleSnapshot = response?.rule_snapshot && typeof response.rule_snapshot === "object"
    ? response.rule_snapshot
    : {};
  const eventConfig = response?.event_config && typeof response.event_config === "object"
    ? response.event_config
    : {};
  const profileMeta = eventConfig?.rule_profile_meta && typeof eventConfig.rule_profile_meta === "object"
    ? eventConfig.rule_profile_meta
    : {};
  const id = asInt(ruleSnapshot?.id ?? response?.match_rule_snapshot_id);
  const isLocked = ruleSnapshot?.locked ?? response?.match_rule_snapshot_locked;
  const source = String(ruleSnapshot?.source || "").trim()
    || (id ? "match_rule_snapshot" : "matches.template_snapshot");

  return {
    id,
    isLocked: isLocked === true,
    source,
    profileName: String(ruleSnapshot?.profile_name || profileMeta?.profile_name || "").trim(),
    profileVersion: asInt(ruleSnapshot?.profile_version ?? profileMeta?.profile_version),
    sport: String(response?.sport_key || match?.sport_name || "").trim(),
    rulesHash: String(ruleSnapshot?.rules_hash || "").trim(),
    templateHash: String(response?.current_template_hash || response?.match_template_hash || "").trim(),
    templateVersion: String(response?.current_template_version || response?.match_template_version || "").trim(),
    status: String(response?.status || response?.config_status || "").trim().toUpperCase(),
  };
};

const scoreForTeam = (scoreMap, teamId) => {
  if (!scoreMap || !teamId) return 0;
  if (Object.prototype.hasOwnProperty.call(scoreMap, String(teamId))) {
    return Number(scoreMap[String(teamId)] ?? 0);
  }
  return Number(scoreMap[teamId] ?? 0);
};

const formatClock = (seconds) => {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  const mins = Math.floor(safeSeconds / 60);
  const secs = Math.floor(safeSeconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

const formatTimelineTime = (value) => {
  if (!value) return "--:--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--:--";
  return parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const formatMatchHeaderTime = (match) => {
  const scheduleLabel = String(match?.schedule_label || match?.scheduledAt || "").trim();
  if (scheduleLabel) return scheduleLabel;

  const scheduledAt = String(match?.scheduled_at || "").trim();
  if (scheduledAt) {
    const parsed = new Date(scheduledAt);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleString([], {
        month: "short",
        day: "2-digit",
        hour: "numeric",
        minute: "2-digit",
      });
    }
    return scheduledAt;
  }

  const matchDate = String(match?.match_date || "").trim();
  const startTime = String(match?.start_time || "").trim();
  if (matchDate && startTime) return `${matchDate} · ${startTime}`;
  if (matchDate) return matchDate;
  return "";
};

const summarizeScoreMap = (scoreMap, resolveTeamName) => {
  if (!scoreMap || typeof scoreMap !== "object") return "No score";
  const rows = Object.entries(scoreMap);
  if (rows.length === 0) return "No score";
  return rows
    .map(([teamId, score]) => `${resolveTeamName(teamId)}: ${Number(score || 0)}`)
    .join(" | ");
};

const summarizeScoreDelta = (deltaPayload, resolveTeamName) => {
  const scoreDelta = deltaPayload?.score_delta;
  if (!scoreDelta || typeof scoreDelta !== "object") return "No score delta";
  const rows = Object.entries(scoreDelta).filter(([, value]) => Number(value || 0) !== 0);
  if (rows.length === 0) return "No score delta";
  return rows
    .map(([teamId, value]) => `${resolveTeamName(teamId)} ${Number(value) > 0 ? "+" : ""}${Number(value || 0)}`)
    .join(" | ");
};

const humanizeStatKey = (key) =>
  String(key || "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const extractApiErrorMessage = (error, fallback) => {
  const detail = error?.response?.data?.detail;
  const code = String(
    (detail && typeof detail === "object" ? detail.code || detail.issue_code : detail)
    || error?.response?.data?.code
    || ""
  ).trim().toUpperCase();
  const friendlyByCode = {
    UNSUPPORTED_SCORING_ACTION: "This action is not available for the current rules.",
    RULE_PROFILE_NOT_SCORING_READY: "The Match rules are not ready for live scoring.",
    MATCH_RULE_SNAPSHOT_MISSING: "The Match rules are not ready for live scoring.",
    MATCH_ALREADY_COMPLETED: "This Match is already complete.",
    STALE_MATCH_STATE: "The Match was updated on another device. The latest state has been loaded.",
    INVALID_SERVICE_STATE: "The serving order is not valid. Refresh the Match before continuing.",
    INCOMPLETE_OFFICIAL_RESULT: "Complete every required result before confirming the Match.",
  };
  if (code === "MATCH_NOT_READY" && detail && typeof detail === "object") {
    const blocker = Array.isArray(detail.blockers)
      ? detail.blockers.find((row) => String(row?.message || "").trim())
      : null;
    if (blocker?.message) return String(blocker.message).trim();
  }
  if (friendlyByCode[code]) return friendlyByCode[code];
  if (Number(error?.response?.status) === 403) return "You no longer have permission to score this Match.";
  if (!error?.response && error?.request) return "The Match could not be updated. Check your connection and try again.";
  if (typeof detail === "string" && detail.trim()) return detail.trim();
  if (detail && typeof detail === "object") {
    const message = String(detail.message || detail.reason || "").trim();
    if (message) return message;
    const issues = Array.isArray(detail.issues) ? detail.issues.map((row) => String(row || "").trim()).filter(Boolean) : [];
    if (issues.length > 0) return issues.join(" | ");
  }
  return String(error?.message || fallback || "Request failed.");
};

const LiveScoringDashboard = ({ match, onExit, onLiveState }) => {
  const { roleNames, user } = useAuth();
  const configRecoveryNeededRef = useRef(false);
  const audioContextRef = useRef(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRosterLoading, setIsRosterLoading] = useState(false);
  const [error, setError] = useState("");
  const [feedbackToasts, setFeedbackToasts] = useState([]);
  const [soundFeedbackEnabled] = useState(false);

  const [configStatus, setConfigStatus] = useState("LOADING");
  const [safeModeResponse, setSafeModeResponse] = useState(null);
  const [safeDisplay, setSafeDisplay] = useState(defaultSafeDisplay);
  const [validatedConfig, setValidatedConfig] = useState(null);
  const [configHash, setConfigHash] = useState(null);
  const [configResponseSnapshot, setConfigResponseSnapshot] = useState(null);
  const [ruleSnapshotMeta, setRuleSnapshotMeta] = useState(null);
  
  const [capabilities, setCapabilities] = useState({});
  const [rosterByTeamId, setRosterByTeamId] = useState({});
  const [debugMode, setDebugMode] = useState(false);
  const [isReplayLoading, setIsReplayLoading] = useState(false);
  const [replayError, setReplayError] = useState("");
  const [replaySnapshot, setReplaySnapshot] = useState(null);
  const [replayUntilSequence, setReplayUntilSequence] = useState("");
  const [clockTick, setClockTick] = useState(0);
  const [configReloadKey, setConfigReloadKey] = useState(0);
  const [gameClockLocalState, setGameClockLocalState] = useState(null);
  const [secondaryClockLocalState, setSecondaryClockLocalState] = useState(null);
  const [secondaryClockSuggestion, setSecondaryClockSuggestion] = useState(null);
  const [pendingStateSuggestion, setPendingStateSuggestion] = useState(null);
  const [isApplyingStateOverride, setIsApplyingStateOverride] = useState(false);
  const [localStateOverrideTeamId, setLocalStateOverrideTeamId] = useState(null);
  const [statsViewMode, setStatsViewMode] = useState("team");
  const [playerStatsTeamFilterId, setPlayerStatsTeamFilterId] = useState("");
  const [showAllPlayerStatRows, setShowAllPlayerStatRows] = useState(false);
  const [showDetailedComposer, setShowDetailedComposer] = useState(false);
  const [pendingCompletion, setPendingCompletion] = useState(null);
  const [isUndoConfirmationOpen, setIsUndoConfirmationOpen] = useState(false);

  const handleRealtimeConfigRecovery = useCallback(() => {
    if (configRecoveryNeededRef.current) {
      setConfigReloadKey((current) => current + 1);
    }
  }, []);
  const {
    liveState,
    liveStateRef,
    lastLiveSyncAt,
    socketStatus,
    isAuthenticatedForScoring,
    blockingSessionError,
    isSubmitting,
    isUndoing,
    replaceAuthoritativeState: pushLiveState,
    refresh: refreshLiveSession,
    reconnect: reconnectLiveSession,
    submitEvent: submitSessionEvent,
    undoLastAction: undoSessionAction,
  } = useLiveScoringSession({
    matchId: Number(match?.id || 0) || null,
    onLiveState,
    onConfigRecovery: handleRealtimeConfigRecovery,
  });

  const { state: formState, actions: formActions } = useEventComposerState();
  const { selectedControlId } = formState;

  useComposerReset({
    match,
    configHash,
    validatedConfig,
    resetComposerState: formActions.resetComposerState
  });

  const { selectedControl, selectedEventDefinition, uiRules } = useMemo(
    () => controlResolver(validatedConfig, selectedControlId),
    [validatedConfig, selectedControlId]
  );
  const substitutionControl = useMemo(
    () =>
      (validatedConfig?.controls || []).find((control) => {
        const group = String(control?.group || control?.category || "").toLowerCase();
        const type = String(control?.event_type || "").toUpperCase();
        return group.includes("sub") || type.includes("SUB");
      }) || null,
    [validatedConfig?.controls]
  );
  const substitutionEventDefinition = useMemo(
    () =>
      substitutionControl
        ? (validatedConfig?.event_types || []).find(
            (row) => String(row?.name || "").toUpperCase() === String(substitutionControl.event_type || "").toUpperCase()
          ) || null
        : null,
    [substitutionControl, validatedConfig?.event_types]
  );

  const roleCanWrite = useMemo(() => Boolean(capabilities?.can_create_event), [capabilities?.can_create_event]);
  const operationalReadiness = useMemo(
    () => configResponseSnapshot?.match_readiness
      || configResponseSnapshot?.event_config?.match_readiness
      || null,
    [configResponseSnapshot]
  );
  const operationalReadinessMessage = useMemo(() => {
    const messages = Array.isArray(operationalReadiness?.blockers)
      ? operationalReadiness.blockers
        .map((row) => String(row?.message || "").trim())
        .filter(Boolean)
      : [];
    return [...new Set(messages)].join(" ");
  }, [operationalReadiness]);
  const scheduleReadinessBlocker = useMemo(
    () => (Array.isArray(operationalReadiness?.blockers)
      ? operationalReadiness.blockers.find(
          (row) => String(row?.code || "").trim().toUpperCase() === "SCHEDULE_NOT_ASSIGNED"
        ) || null
      : null),
    [operationalReadiness]
  );
  const isCoordinator = useMemo(
    () => (Array.isArray(roleNames) ? roleNames : []).some((role) => {
      const normalized = String(role || "").trim().toUpperCase().replaceAll("-", "_").replaceAll(" ", "_");
      return normalized === "SPORTS_COORDINATOR" || normalized === "COORDINATOR";
    }),
    [roleNames]
  );
  const isOperationallyReady = operationalReadiness?.ready !== false;
  const canWrite = useMemo(() => {
    const status = String(match?.status || "").toUpperCase();
    const resolvedEntryMatch =
      status === "WAITING_OPPONENT"
      && hasResolvedMatchParticipants(match);
    return roleCanWrite && (writableStatuses.has(status) || resolvedEntryMatch);
  }, [match, roleCanWrite]);

  const canComposerSubmit = useMemo(() => {
    const status = String(configStatus || "").toUpperCase();
    const canonicalCompleted = isMatchCompleted({
      match_status: liveState?.match_status,
      status: liveState?.match_status || liveState?.match_result?.status || match?.status,
    });
    return canWrite
      && isAuthenticatedForScoring
      && !canonicalCompleted
      && status === "VALID"
      && isOperationallyReady
      && Boolean(safeDisplay?.allow_composer)
      && liveState?.safe_display?.allow_composer !== false;
  }, [canWrite, configStatus, isAuthenticatedForScoring, isOperationallyReady, liveState?.match_result?.status, liveState?.match_status, liveState?.safe_display?.allow_composer, match?.status, safeDisplay?.allow_composer]);

  const completedMatch = useMemo(
    () => isMatchCompleted({
      match_status: liveState?.match_status || liveState?.status,
      status: liveState?.match_status || liveState?.match_result?.status || match?.status,
    }),
    [liveState?.match_result?.status, liveState?.match_status, liveState?.status, match?.status]
  );

  const canUndoEvents = useMemo(
    () => !completedMatch && Boolean(capabilities?.can_undo_event ?? roleCanWrite) && canComposerSubmit,
    [capabilities?.can_undo_event, canComposerSubmit, completedMatch, roleCanWrite]
  );
  const isRoleReadOnly = !roleCanWrite;

  const resolvedParticipants = useMemo(
    () => resolveMatchParticipants({
      match,
      liveState,
      configuration: configResponseSnapshot,
      rosterData: rosterByTeamId,
      bracketParticipants: {
        participant1: match?.participant1,
        participant2: match?.participant2,
      },
    }),
    [configResponseSnapshot, liveState, match, rosterByTeamId]
  );
  const teamOptions = useMemo(
    () => resolvedParticipants
      .filter((participant) => Number(participant?.targetId || 0) > 0)
      .map((participant) => ({
        id: Number(participant.targetId),
        targetType: participant.targetType,
        side: participant.side,
        name: participant.displayName || `Participant ${participant.side}`,
        logoUrl: participant.logoUrl || null,
        resolved: {
          participant_shape: participant.participantShape,
          entry_id: participant.entryId,
          team_id: participant.teamId,
          display_name: participant.displayName,
          members: participant.members.map((member) => ({ id: member.playerId, name: member.displayName })),
        },
      })),
    [resolvedParticipants]
  );
  const applyParticipantTargetToPayload = useCallback((payload, targetId) => {
    const nextPayload = { ...(payload || {}) };
    const selectedTarget = teamOptions.find(
      (row) => Number(row.id) === Number(targetId)
    );
    if (selectedTarget?.targetType === "ENTRY") {
      delete nextPayload.team_id;
      nextPayload.side = Number(selectedTarget.side);
    }
    return nextPayload;
  }, [teamOptions]);
  const liveScoringSportLabel = useMemo(() => buildSportEventLabel(match), [match]);
  const competitionTypeLabel = useMemo(() => getCompetitionTypeLabel(match), [match]);
  const liveScoringMatchupLabel = useMemo(() => {
    const left = resolveBracketParticipantLabel(
      match?.participant1,
      match?.team1_name,
      match?.participant1_label,
    );
    const right = resolveBracketParticipantLabel(
      match?.participant2,
      match?.team2_name,
      match?.participant2_label,
    );
    if (left && right) return `${left} vs ${right}`;
    return left || right || "";
  }, [
    match?.participant1,
    match?.participant1_label,
    match?.participant2,
    match?.participant2_label,
    match?.team1_name,
    match?.team2_name,
  ]);
  const liveScoringMetaLine = useMemo(() => {
    const venueName = String(
      match?.venue_name
      || match?.venue
      || match?.court_name
      || match?.field_name
      || match?.pool_name
      || ""
    ).trim();
    const venueLocation = String(match?.venue_location || match?.venue?.location || "").trim();
    const venue = [venueName, venueLocation]
      .filter((value, index, rows) => value && rows.indexOf(value) === index)
      .join(" — ");
    const timeLabel = formatMatchHeaderTime(match);
    return [venue, timeLabel].filter(Boolean).join(" · ");
  }, [match]);

  const resolveTeamName = useCallback(
    (teamId) => teamOptions.find((t) => Number(t.id) === Number(teamId))?.name || (teamId ? "Unnamed team" : "-"),
    [teamOptions]
  );
  
  const participantState = useMemo(() => (liveState?.participant_state && typeof liveState.participant_state === "object" ? liveState.participant_state : {}), [liveState]);
  const participantUnitType = String(participantState?.unit_type || validatedConfig?.participant_profile?.unit_type || "TEAM").toUpperCase();
  const statisticsPresentation = useMemo(
    () => getStatisticsPresentation(participantUnitType),
    [participantUnitType]
  );
  useEffect(() => {
    setStatsViewMode(statisticsPresentation.aggregate ? "team" : "player");
  }, [statisticsPresentation.aggregate]);
  const sportDefinition = validatedConfig?.sport_definition || {};
  const sportKey = String(
    configResponseSnapshot?.sport_key
    || validatedConfig?.sport_id
    || sportDefinition?.sport
    || match?.sport_name
    || ""
  ).trim().toLowerCase();
  const specializedEngineType = resolveSpecializedEngine(validatedConfig);
  const useBoxingScorecardSurface = specializedEngineType === "JUDGE_SCORECARD";
  const sportUiProfile = useMemo(
    () => getSportUiProfile(
      sportKey,
      ruleSnapshotMeta,
      configResponseSnapshot?.event_config || validatedConfig || null,
      liveState
    ),
    [configResponseSnapshot?.event_config, liveState, ruleSnapshotMeta, sportKey, validatedConfig]
  );
  const useTimedTeamSurface = resolveLiveScoringSurface({
    profileFamily: sportUiProfile?.profileFamily,
    sportKey,
  }) === "BASKETBALL_TIMED_TEAM";
  const secondaryClockConfig = useMemo(
    () => getSecondaryClockConfig({ sportKey, validatedConfig }),
    [sportKey, validatedConfig]
  );

  const lineupUi = useMemo(() => {
    const uiSpec = validatedConfig?.ui_spec || {};
    const profile = validatedConfig?.participant_profile || {};
    const requiresLineupSetup = Boolean(
      uiSpec.requiresLineupSetup
      ?? profile.requires_lineup_setup
      ?? (participantUnitType === "TEAM" && Boolean(sportUiProfile?.supportsLineup))
    );
    const activePlayersPerSide = Number(
      uiSpec.activePlayersPerSide
      ?? profile.active_players_per_side
      ?? sportUiProfile?.activePlayersPerSide
      ?? 0
    );
    const supportsSubstitution = Boolean(
      uiSpec.supportsSubstitution
      ?? profile.supports_substitution
      ?? sportUiProfile?.supportsSubstitution
      ?? false
    );
    const lineupLabel = String(
      uiSpec.lineupName
      || profile.lineup_name
      || sportUiProfile?.lineupLabel
      || "Active Lineup"
    );

    const incompleteTeams = [];
    if (requiresLineupSetup && activePlayersPerSide > 0) {
      const sides = participantState?.sides && typeof participantState.sides === "object" ? participantState.sides : {};
      Object.values(sides).forEach((side) => {
        const activeCount = Array.isArray(side?.active_players) ? side.active_players.length : 0;
        const sideTeamId = asInt(side?.team_id);
        if (sideTeamId && activeCount < activePlayersPerSide) {
          const teamName = teamOptions.find((row) => Number(row.id) === Number(sideTeamId))?.name || "Unnamed team";
          incompleteTeams.push(teamName);
        }
      });
    }

    return {
      requiresLineupSetup,
      activePlayersPerSide,
      supportsSubstitution,
      lineupLabel,
      incompleteTeams,
      hasIncompleteLineup: incompleteTeams.length > 0,
      warningText:
        requiresLineupSetup && activePlayersPerSide > 0 && incompleteTeams.length > 0
          ? `Select ${activePlayersPerSide} active players for ${incompleteTeams.join(" and ")} before starting the clock.`
          : "",
    };
  }, [participantState?.sides, participantUnitType, sportUiProfile?.activePlayersPerSide, sportUiProfile?.lineupLabel, sportUiProfile?.supportsLineup, sportUiProfile?.supportsSubstitution, teamOptions, validatedConfig?.participant_profile, validatedConfig?.ui_spec]);

  const playerOptions = useMemo(() => {
    if (!uiRules.shouldShowPlayerSelector) return [];
    return buildCanonicalPlayerOptions({ participants: resolvedParticipants, selectedTargetId: formState.selectedTeamId });
  }, [formState.selectedTeamId, resolvedParticipants, uiRules.shouldShowPlayerSelector]);

  const selectedParticipant = useMemo(() => {
    const selectedTargetId = asInt(formState.selectedTeamId) || asInt(teamOptions?.[0]?.id);
    return findResolvedParticipant(resolvedParticipants, selectedTargetId);
  }, [formState.selectedTeamId, resolvedParticipants, teamOptions]);
  useEffect(() => {
    if (shouldClearSelectedPlayer({ selectedPlayerId: formState.selectedPlayerId, participant: selectedParticipant })) {
      formActions.setSelectedPlayerId("");
    }
  }, [formActions, formState.selectedPlayerId, selectedParticipant]);

  const participant1TargetId = getMatchParticipantTarget(match, 1)?.id || null;
  const participant2TargetId = getMatchParticipantTarget(match, 2)?.id || null;
  const rawTeam1Score = useMemo(
    () => scoreForTeam(liveState?.score, participant1TargetId),
    [liveState, participant1TargetId]
  );
  const rawTeam2Score = useMemo(
    () => scoreForTeam(liveState?.score, participant2TargetId),
    [liveState, participant2TargetId]
  );
  const setPointScoreByTeam = useMemo(
    () => (liveState?.set_state && typeof liveState.set_state === "object" && typeof liveState.set_state.set_points === "object"
      ? liveState.set_state.set_points
      : null),
    [liveState?.set_state]
  );
  const hasSetPointScore = useMemo(() => {
    if (String(validatedConfig?.sport_profile || "").toLowerCase() !== "set_match") return false;
    if (!setPointScoreByTeam || typeof setPointScoreByTeam !== "object") return false;
    return true;
  }, [setPointScoreByTeam, validatedConfig?.sport_profile]);
  const team1LiveScore = useMemo(
    () => (hasSetPointScore ? scoreForTeam(setPointScoreByTeam, participant1TargetId) : rawTeam1Score),
    [hasSetPointScore, participant1TargetId, rawTeam1Score, setPointScoreByTeam]
  );
  const team2LiveScore = useMemo(
    () => (hasSetPointScore ? scoreForTeam(setPointScoreByTeam, participant2TargetId) : rawTeam2Score),
    [hasSetPointScore, participant2TargetId, rawTeam2Score, setPointScoreByTeam]
  );

  const displayState = useMemo(() => (liveState?.display_state && typeof liveState.display_state === "object" ? liveState.display_state : {}), [liveState]);
  const displayWidgets = useMemo(() => new Set((Array.isArray(displayState.widgets) ? displayState.widgets : []).map((w) => String(w || "").toLowerCase()).filter(Boolean)), [displayState.widgets]);
  const displayEnabled = displayState.enabled || {};

  const isClockEnabled = Boolean(displayEnabled.clock ?? displayWidgets.has("clock"));
  const isPeriodEnabled = Boolean(displayEnabled.period ?? displayWidgets.has("period"));
  const isPossessionEnabled = Boolean(displayEnabled.possession ?? displayWidgets.has("possession"));
  const isServerEnabled = Boolean(displayEnabled.server ?? displayWidgets.has("server"));
  const isBattingEnabled = Boolean(displayEnabled.batting ?? displayWidgets.has("batting"));
  const currentPeriod = Number(displayState?.period?.current || 1);
  
  const sportProfile = String(validatedConfig?.sport_profile || "").toLowerCase();
  const matchPhaseLabel = useMemo(() => {
    const pLabel = displayState?.period?.label || "Phase";
    if (sportProfile === "set_match") return `Set ${Number(liveState?.set_state?.current_set || currentPeriod || 1)}`;
    if (sportProfile === "round_based") return `Round ${Number(liveState?.round_state?.current_round || currentPeriod || 1)}`;
    return `${pLabel} ${currentPeriod}`;
  }, [currentPeriod, liveState?.round_state?.current_round, liveState?.set_state?.current_set, displayState?.period?.label, sportProfile]);

  const teamCounters = useMemo(() => {
    const rawCounters = displayState?.team_counters;
    if (!rawCounters || typeof rawCounters !== "object") return [];
    return Object.entries(rawCounters)
      .filter(([, v]) => v && typeof v === "object")
      .map(([key, v]) => ({ key, label: String(v.label || key.replace(/_/g, " ")), values: v.values || {} }));
  }, [displayState?.team_counters]);
  const teamStatsTableRows = useMemo(
    () =>
      teamCounters.map((counter) => ({
        key: counter.key,
        label: counter.label || humanizeStatKey(counter.key),
        values: counter.values && typeof counter.values === "object" ? counter.values : {},
      })),
    [teamCounters]
  );
  const playerStatsTable = useMemo(() => {
    return buildCanonicalPlayerStatsTable({
      sportKey,
      playerStats: liveState?.player_stats,
      participants: resolvedParticipants,
      runtimeConfig: validatedConfig,
      engineType: specializedEngineType,
    });
  }, [liveState?.player_stats, resolvedParticipants, sportKey, specializedEngineType, validatedConfig]);
  const activePlayerStatsTeamId = useMemo(() => {
    const preferred = asInt(playerStatsTeamFilterId);
    if (preferred && teamOptions.some((team) => Number(team.id) === Number(preferred))) return preferred;
    return asInt(teamOptions?.[0]?.id) || null;
  }, [playerStatsTeamFilterId, teamOptions]);
  const filteredPlayerStatsRows = useMemo(() => {
    if (!activePlayerStatsTeamId) return playerStatsTable.rows;
    return playerStatsTable.rows.filter((row) => Number(row.teamId || 0) === Number(activePlayerStatsTeamId));
  }, [activePlayerStatsTeamId, playerStatsTable.rows]);
  const playerStatsRowsWithRoster = filteredPlayerStatsRows;
  const playerStatsRowsCollapsed = useMemo(
    () => playerStatsRowsWithRoster.filter((row) => Boolean(row.hasActivity || row.hasRecordedStats)),
    [playerStatsRowsWithRoster]
  );
  const visiblePlayerStatsRows = useMemo(
    () => (showAllPlayerStatRows ? playerStatsRowsWithRoster : playerStatsRowsCollapsed),
    [playerStatsRowsCollapsed, playerStatsRowsWithRoster, showAllPlayerStatRows]
  );
  useEffect(() => {
    setShowAllPlayerStatRows(false);
  }, [activePlayerStatsTeamId]);
  const backendGameClockState = useMemo(() => {
    const clock = displayState?.clock;
    if (!clock || typeof clock !== "object") return null;
    const remainingMs = Number(clock.remaining_milliseconds ?? clock.milliseconds);
    if (Number.isFinite(remainingMs)) {
      return {
        valueMs: Math.max(0, Math.round(remainingMs)),
        isRunning: Boolean(clock.running),
      };
    }
    const remainingSeconds = Number(clock.effective_remaining_seconds ?? clock.remaining_seconds ?? clock.seconds ?? clock.value_seconds);
    if (!Number.isFinite(remainingSeconds)) return null;
    return {
      valueMs: Math.max(0, Math.round(remainingSeconds * 1000)),
      isRunning: Boolean(clock.running),
    };
  }, [displayState?.clock]);
  const effectiveGameClockState = useMemo(() => {
    if (!isClockEnabled) return null;
    if (gameClockLocalState) return gameClockLocalState;
    return backendGameClockState;
  }, [backendGameClockState, gameClockLocalState, isClockEnabled]);
  const effectiveGameClockMs = Math.max(0, Number(effectiveGameClockState?.valueMs || 0));
  const effectiveGameClockSeconds = effectiveGameClockMs / 1000;
  const effectiveGameClockMilliseconds = effectiveGameClockMs % 1000;
  const isGameClockRunning = Boolean(effectiveGameClockState?.isRunning);
  const backendSecondaryClockState = useMemo(() => {
    const candidates = [
      displayState?.secondary_clock,
      displayState?.shot_clock,
      displayState?.play_clock,
      displayState?.possession_clock
    ].filter((row) => row && typeof row === "object");
    const selected = candidates[0];
    if (!selected) return null;
    const remainingSeconds = Number(selected.remaining_seconds ?? selected.seconds ?? selected.value_seconds);
    const remainingMsRaw = Number(selected.remaining_milliseconds ?? selected.milliseconds);
    const valueMs = Number.isFinite(remainingMsRaw)
      ? Math.max(0, Math.round(remainingMsRaw))
      : Number.isFinite(remainingSeconds)
        ? Math.max(0, Math.round(remainingSeconds * 1000))
        : null;
    if (valueMs === null) return null;
    return {
      valueMs,
      isRunning: Boolean(selected.running ?? selected.is_running),
      isLocalOnly: false,
    };
  }, [displayState?.play_clock, displayState?.possession_clock, displayState?.secondary_clock, displayState?.shot_clock]);

  const secondaryClockState = useMemo(() => {
    if (!secondaryClockConfig.enabled) return null;
    if (secondaryClockConfig.isLocalOnly) return secondaryClockLocalState;
    return backendSecondaryClockState;
  }, [backendSecondaryClockState, secondaryClockConfig.enabled, secondaryClockConfig.isLocalOnly, secondaryClockLocalState]);

  const sportStateMode = useMemo(() => {
    const stateLabel = String(sportUiProfile?.stateLabel || "None").toLowerCase();
    if (stateLabel === "batting" || isBattingEnabled) return "batting";
    if (stateLabel === "server" || isServerEnabled) return "server";
    if (stateLabel === "round") return "athlete";
    if (stateLabel === "possession" || isPossessionEnabled) return "possession";
    return "none";
  }, [isBattingEnabled, isPossessionEnabled, isServerEnabled, sportUiProfile?.stateLabel]);

  const backendSportStateTeamId = useMemo(() => {
    if (sportStateMode === "batting") return asInt(displayState?.batting_team_id ?? displayState?.possession_team_id);
    if (sportStateMode === "server") return asInt(displayState?.server_team_id ?? displayState?.service_team_id ?? displayState?.possession_team_id);
    if (sportStateMode === "possession") return asInt(displayState?.possession_team_id);
    return null;
  }, [displayState?.batting_team_id, displayState?.possession_team_id, displayState?.server_team_id, displayState?.service_team_id, sportStateMode]);
  const sportStateTeamId = useMemo(
    () => asInt(backendSportStateTeamId) || asInt(localStateOverrideTeamId),
    [backendSportStateTeamId, localStateOverrideTeamId]
  );

  const sportStateLabel = useMemo(() => {
    const label = String(sportUiProfile?.stateLabel || "None");
    return label === "None" ? "State" : label;
  }, [sportUiProfile?.stateLabel]);
  const primaryClockControls = useMemo(() => {
    const controls = Array.isArray(validatedConfig?.controls) ? validatedConfig.controls : [];
    const priority = {
      CLOCK_START: 0,
      CLOCK_RESUME: 1,
      CLOCK_STOP: 2,
      CLOCK_PAUSE: 3,
      CLOCK_RESET: 4,
    };
    return controls
      .filter((control) => {
        const type = String(control?.event_type || "").toUpperCase();
        return type.includes("CLOCK_");
      })
      .sort((a, b) => {
        const aType = String(a?.event_type || "").toUpperCase();
        const bType = String(b?.event_type || "").toUpperCase();
        const aPriority = Object.prototype.hasOwnProperty.call(priority, aType) ? priority[aType] : 99;
        const bPriority = Object.prototype.hasOwnProperty.call(priority, bType) ? priority[bType] : 99;
        if (aPriority !== bPriority) return aPriority - bPriority;
        const aOrder = Number(a?.priority);
        const bOrder = Number(b?.priority);
        const safeA = Number.isFinite(aOrder) ? aOrder : 9999;
        const safeB = Number.isFinite(bOrder) ? bOrder : 9999;
        return safeA - safeB;
      })
      .slice(0, 4);
  }, [validatedConfig?.controls]);

  const isLiveStateStale = useMemo(() => {
    void clockTick;
    if (!lastLiveSyncAt) return false;
    const ageMs = Date.now() - new Date(lastLiveSyncAt).getTime();
    return Number.isFinite(ageMs) && ageMs > 15000;
  }, [clockTick, lastLiveSyncAt]);

  const liveStatusMode = useMemo(() => {
    if (socketStatus === "auth_required") return "token_expired";
    if (socketStatus === "connecting" || socketStatus === "reconnecting") return "reconnecting";
    if (socketStatus === "live") return isLiveStateStale ? "stale" : "live";
    if (socketStatus === "refresh_mode") return "refresh_mode";
    if (socketStatus === "offline" || socketStatus === "disconnected") return "offline";
    return "offline";
  }, [isLiveStateStale, socketStatus]);

  const timeline = useMemo(() => [...(liveState?.timeline || [])].sort((a, b) => (b.event_index || 0) - (a.event_index || 0)), [liveState]);
  const latestTimelineEventType = useMemo(
    () => String(timeline?.[0]?.event_type || "").toUpperCase(),
    [timeline]
  );
  const recentEventTypes = useMemo(
    () =>
      timeline
        .slice(0, 20)
        .map((row) => String(row?.event_type || "").toUpperCase())
        .filter(Boolean),
    [timeline]
  );

  const timelineWithEffects = useMemo(() => timeline.map((eventRow) => {
    const eventType = String(eventRow?.event_type || "").toUpperCase();
    const isViolation = validatedConfig?.violations?.some(v => String(v.name || v.event_type || "").toUpperCase() === eventType);
    const isScore = validatedConfig?.score_event_types?.some(set => String(set || "").toUpperCase() === eventType);
    const scoreDelta = eventRow?.score_delta && typeof eventRow.score_delta === "object" ? eventRow.score_delta : eventRow?.step?.score_delta;
    const scoreImpact = scoreDelta && typeof scoreDelta === "object"
      ? Object.entries(scoreDelta)
          .filter(([, value]) => Number(value || 0) !== 0)
          .map(([teamId, value]) => `${getShortTeamName(resolveTeamName(teamId))} ${Number(value) > 0 ? "+" : ""}${Number(value || 0)}`)
          .join(" | ")
      : "";
    let effect = "";
    if (scoreImpact) effect = scoreImpact;
    else if (isViolation && eventRow.team_id) effect = `Violation | ${getShortTeamName(resolveTeamName(eventRow.team_id))}`;
    else if (isScore && eventRow.team_id) effect = `Score | ${getShortTeamName(resolveTeamName(eventRow.team_id))}`;

    return {
      ...eventRow,
      team_name: eventRow?.team_name || (eventRow?.team_id ? resolveTeamName(eventRow.team_id) : ""),
      participant_name: eventRow?.player_name || (eventRow?.team_id ? resolveTeamName(eventRow.team_id) : ""),
      eventType,
      effect,
      at: formatTimelineTime(eventRow?.occurred_at || eventRow?.created_at),
      category: isViolation ? "violation" : isScore ? "score" : "neutral"
    };
  }), [timeline, validatedConfig, resolveTeamName]);

  const latestViolation = useMemo(() => timelineWithEffects.find((row) => row.category === "violation") || null, [timelineWithEffects]);
  const replayTimeline = useMemo(
    () => [...(Array.isArray(replaySnapshot?.timeline) ? replaySnapshot.timeline : [])].sort((a, b) => (b.sequence || 0) - (a.sequence || 0)),
    [replaySnapshot?.timeline]
  );

  const playFeedbackTone = useCallback((kind) => {
    if (!soundFeedbackEnabled || typeof window === "undefined") return;
    try {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return;
      if (!audioContextRef.current) audioContextRef.current = new Context();
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = { score: 880, violation: 440, penalty: 330, neutral: 520 }[kind] || 520;
      gain.gain.value = 0.001;
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      gain.gain.exponentialRampToValueAtTime(0.06, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      oscillator.start(now);
      oscillator.stop(now + 0.18);
    } catch { /* ignore audio errors */ }
  }, [soundFeedbackEnabled]);

  const pushToast = useCallback(({ title, detail, kind = "neutral" }) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setFeedbackToasts((c) => [{ id, title, detail, kind }, ...c].slice(0, 5));
    window.setTimeout(() => setFeedbackToasts((c) => c.filter((t) => t.id !== id)), 3200);
    playFeedbackTone(kind);
  }, [playFeedbackTone]);

  const fetchReplayPayload = useCallback(
    async (untilSequence = null) => {
      if (!match?.id) return null;
      const parsedUntil = Number(untilSequence);
      const replayParams = {
        include_steps: true,
        ...(Number.isFinite(parsedUntil) && parsedUntil > 0 ? { until_sequence: Math.trunc(parsedUntil) } : {}),
      };
      const [replayResponse, timelineResponse] = await Promise.all([
        getMatchReplay(match.id, replayParams),
        getMatchTimeline(match.id, { include_steps: true }),
      ]);

      return {
        ...replayResponse,
        total_events: Number(timelineResponse?.total_events || replayResponse?.processed_events || 0),
        full_timeline: Array.isArray(timelineResponse?.events) ? timelineResponse.events : [],
        timeline_validation_issues: Array.isArray(timelineResponse?.validation_issues)
          ? timelineResponse.validation_issues
          : [],
        fetched_at: new Date().toISOString(),
      };
    },
    [match?.id]
  );

  useEffect(() => {
    configRecoveryNeededRef.current = configStatus === "BLOCKED";
  }, [configStatus]);

  useEffect(() => {
    if (!match?.id) return;
    let active = true;
    setIsLoading(true);
    setError(null);
    setConfigStatus("LOADING");
    setSafeModeResponse(null);
    setSafeDisplay(defaultSafeDisplay);
    setValidatedConfig(null);
    setConfigHash(null);
    setConfigResponseSnapshot(null);
    setRuleSnapshotMeta(null);
    setCapabilities({});
    setRosterByTeamId({});
    setDebugMode(false);
    setIsReplayLoading(false);
    setReplayError("");
    setReplaySnapshot(null);
    setReplayUntilSequence("");
    setShowDetailedComposer(false);
    setPendingCompletion(null);
    setIsUndoConfirmationOpen(false);

    const load = async () => {
      try {
        const [configResponse, liveResponse] = await Promise.all([getMatchEventConfig(match.id), getMatchLiveState(match.id)]);
        if (!active) return;

        const normalizedStatus = String(configResponse?.status || "VALID").toUpperCase();
        setConfigResponseSnapshot(configResponse);
        setRuleSnapshotMeta(normalizeRuleSnapshotMeta(configResponse, match));
        const incomingSafeDisplay = configResponse?.safe_display && typeof configResponse.safe_display === "object"
          ? configResponse.safe_display
          : {};
        const normalizedSafeDisplay = {
          allow_scoreboard: incomingSafeDisplay.allow_scoreboard !== false,
          allow_timeline: incomingSafeDisplay.allow_timeline !== false,
          allow_composer:
            (["BLOCKED", "REVIEW", "CONFIG_LOCKED", "CONFIG_MISMATCH"].includes(normalizedStatus) || configResponse?.match_validation?.status === "BLOCKED" || configResponse?.match_validation?.status === "REVIEW")
              ? false
              : incomingSafeDisplay.allow_composer !== false,
        };
        setSafeDisplay(normalizedSafeDisplay);
        setCapabilities(configResponse?.capabilities || {});
        pushLiveState(liveResponse);

        const validation = validateEventConfig(configResponse);
        const matchDecision = configResponse?.match_validation;
        const kernelStatus = String(matchDecision?.status || "VALID").toUpperCase();

        const isBlockedByKernel = kernelStatus === "BLOCKED" || kernelStatus === "REVIEW";
        const isLegacyBlocked = ["CONFIG_LOCKED", "CONFIG_MISMATCH"].includes(normalizedStatus);

        if (isBlockedByKernel || isLegacyBlocked || !validation.validatedConfig) {
          const finalStatus = isBlockedByKernel ? kernelStatus : normalizedStatus;
          const defaultReason = finalStatus === "REVIEW" || finalStatus === "CONFIG_MISMATCH"
            ? "Template has changed since match creation"
            : "Invalid sport template configuration";

          const kernelReasons = Array.isArray(matchDecision?.reason) && matchDecision.reason.length > 0
            ? matchDecision.reason
            : [];

          const lockedPayload = {
            status: finalStatus,
            mode: String(configResponse?.mode || "READ_ONLY"),
            reason: String(configResponse?.reason || validation.error || kernelReasons[0] || defaultReason),
            issues: kernelReasons.length > 0
              ? kernelReasons
              : (Array.isArray(configResponse?.issues) && configResponse.issues.length > 0 ? configResponse.issues : validation.issues),
            event_config: null,
            safe_display: normalizedSafeDisplay,
          };
          console.warn("[SAFE MODE ACTIVATED]", lockedPayload);
          setConfigStatus(finalStatus);
          setSafeModeResponse(lockedPayload);
          setValidatedConfig(null);
          setConfigHash(null);
        } else {
          setConfigStatus("VALID");
          setSafeModeResponse(null);
          setValidatedConfig(validation.validatedConfig);
          setConfigHash(validation.configHash);
        }

        const teamIds = [match.team1_id, match.team2_id].map(Number).filter(v => Number.isFinite(v) && v > 0);
        if (teamIds.length > 0) {
          setIsRosterLoading(true);
          const tournamentId = Number(configResponse?.tournament_id || match?.tournament_id || 0) || null;
          const rosterResults = await Promise.allSettled(teamIds.map((tid) => getTeamRoster(tid, tournamentId)));
          if (!active) return;
          const nextRoster = {};
          rosterResults.forEach((res, i) => {
            nextRoster[teamIds[i]] = res.status === "fulfilled" && Array.isArray(res.value?.players)
              ? res.value.players
              : [];
          });
          setRosterByTeamId(nextRoster);
        }
      } catch (err) {
        if (!active) return;
        setError(extractApiErrorMessage(err, "Failed to load configuration."));
        const lockedPayload = {
          status: "BLOCKED",
          mode: "READ_ONLY",
          reason: "Invalid sport template configuration",
          issues: [extractApiErrorMessage(err, "Failed to load configuration.")],
          event_config: null,
          safe_display: { ...defaultSafeDisplay, allow_composer: false },
        };
        console.warn("[SAFE MODE ACTIVATED]", lockedPayload);
        setConfigStatus("BLOCKED");
        setSafeModeResponse(lockedPayload);
        setSafeDisplay({ ...defaultSafeDisplay, allow_composer: false });
      } finally {
        if (active) { setIsRosterLoading(false); setIsLoading(false); }
      }
    };
    load();
    return () => { active = false; };
  }, [configReloadKey, match, pushLiveState]);

  useEffect(() => {
    if (!match?.id || !debugMode) return;
    let active = true;
    const refreshReplay = async () => {
      setIsReplayLoading(true);
      setReplayError("");
      try {
        const payload = await fetchReplayPayload(null);
        if (!active) return;
        setReplaySnapshot(payload);
      } catch (err) {
        if (!active) return;
        setReplayError(extractApiErrorMessage(err, "Failed to compute replay snapshot."));
      } finally {
        if (active) setIsReplayLoading(false);
      }
    };
    refreshReplay();
    return () => { active = false; };
  }, [debugMode, fetchReplayPayload, liveState?.state_version, match?.id]);

  useEffect(() => {
    const timer = window.setInterval(() => setClockTick((current) => current + 1), 5000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isClockEnabled) {
      setGameClockLocalState(null);
      return;
    }
    if (!backendGameClockState) return;
    const backendMs = Math.max(0, Number(backendGameClockState.valueMs || 0));
    const backendRunning = Boolean(backendGameClockState.isRunning);
    const hasHardSyncEvent = CLOCK_HARD_SYNC_EVENT_TYPES.has(latestTimelineEventType);
    setGameClockLocalState((current) => {
      const now = Date.now();
      if (!current) {
        return {
          valueMs: backendMs,
          isRunning: backendRunning,
          lastTickAt: now,
        };
      }

      const localRunning = Boolean(current.isRunning);

      if (hasHardSyncEvent) {
        return {
          valueMs: backendMs,
          isRunning: backendRunning,
          lastTickAt: now,
        };
      }

      if (backendRunning !== localRunning) {
        return {
          ...current,
          isRunning: backendRunning,
          lastTickAt: now,
        };
      }

      return current;
    });
  }, [backendGameClockState, isClockEnabled, latestTimelineEventType]);

  useEffect(() => {
    if (!isClockEnabled || !gameClockLocalState?.isRunning) return;
    const timer = window.setInterval(() => {
      setGameClockLocalState((current) => {
        if (!current?.isRunning) return current;
        const now = Date.now();
        const elapsedMs = Math.max(0, now - Number(current.lastTickAt || now));
        const nextValueMs = Math.max(0, Number(current.valueMs || 0) - elapsedMs);
        return {
          ...current,
          valueMs: nextValueMs,
          isRunning: nextValueMs > 0 && current.isRunning,
          lastTickAt: now,
        };
      });
    }, 100);
    return () => window.clearInterval(timer);
  }, [gameClockLocalState?.isRunning, isClockEnabled]);

  useEffect(() => {
    if (!secondaryClockConfig.enabled) {
      setSecondaryClockLocalState(null);
      setSecondaryClockSuggestion(null);
      return;
    }
    if (!secondaryClockConfig.isLocalOnly) return;
    setSecondaryClockLocalState((current) => {
      const nextDefaultMs = Math.max(0, Math.round(Number(secondaryClockConfig.defaultSeconds || 24) * 1000));
      if (current && typeof current === "object") {
        return { ...current, isLocalOnly: true };
      }
      return {
        valueMs: nextDefaultMs,
        isRunning: false,
        isLocalOnly: true,
        manualPaused: false,
        lastResetReason: "Initial",
      };
    });
  }, [secondaryClockConfig.defaultSeconds, secondaryClockConfig.enabled, secondaryClockConfig.isLocalOnly]);

  useEffect(() => {
    if (!secondaryClockConfig.enabled || !secondaryClockConfig.isLocalOnly || !secondaryClockConfig.syncWithGameClock) return;
    setSecondaryClockLocalState((current) => {
      if (!current) return current;
      const gameClockRunning = Boolean(displayState?.clock?.running);
      if (!gameClockRunning) {
        if (!current.isRunning) return current;
        return { ...current, isRunning: false };
      }
      if (current.manualPaused) return current;
      if (current.isRunning) return current;
      return { ...current, isRunning: true };
    });
  }, [displayState?.clock?.running, secondaryClockConfig.enabled, secondaryClockConfig.isLocalOnly, secondaryClockConfig.syncWithGameClock]);

  useEffect(() => {
    if (!secondaryClockConfig.enabled || !secondaryClockConfig.isLocalOnly) return;
    if (!secondaryClockLocalState?.isRunning) return;
    const timer = window.setInterval(() => {
      setSecondaryClockLocalState((current) => {
        if (!current?.isRunning) return current;
        const nextValue = Math.max(0, Number(current.valueMs || 0) - 100);
        return { ...current, valueMs: nextValue, isRunning: nextValue > 0 && current.isRunning };
      });
    }, 100);
    return () => window.clearInterval(timer);
  }, [secondaryClockConfig.enabled, secondaryClockConfig.isLocalOnly, secondaryClockLocalState?.isRunning]);

  useEffect(() => {
    const backendTeamId = asInt(backendSportStateTeamId);
    const localTeamId = asInt(localStateOverrideTeamId);
    if (!backendTeamId || !localTeamId) return;
    if (backendTeamId === localTeamId) setLocalStateOverrideTeamId(null);
  }, [backendSportStateTeamId, localStateOverrideTeamId]);

  const stateOverrideControl = useMemo(() => {
    const controls = Array.isArray(validatedConfig?.controls) ? validatedConfig.controls : [];
    if (sportStateMode === "server") {
      return controls.find((control) => isStateOverrideControl(control, "server")) || null;
    }
    if (sportStateMode === "batting") {
      return controls.find((control) => isStateOverrideControl(control, "batting")) || null;
    }
    if (sportStateMode === "possession") {
      return controls.find((control) => isStateOverrideControl(control, "possession")) || null;
    }
    return null;
  }, [sportStateMode, validatedConfig?.controls]);

  const handleStateOverrideApply = useCallback(
    async ({ teamId, control, label, silent = false, source = "manual" } = {}) => {
      const resolvedTeamId = Number(teamId || 0);
      if (!resolvedTeamId) return false;
      const resolvedControl = control || stateOverrideControl;
      const resolvedLabel = String(label || sportStateLabel || "State");
      setLocalStateOverrideTeamId(resolvedTeamId);

      if (resolvedControl && canComposerSubmit) {
        let payload = {
          event_type: resolvedControl.event_type,
          team_id: resolvedTeamId,
          client_event_id: window.crypto?.randomUUID?.() || `evt-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          expected_state_version: Number(liveStateRef.current?.state_version || validatedConfig?.state_version || 0),
        };
        if (resolvedControl.provides_value && resolvedControl.value !== undefined) payload.value = resolvedControl.value;
        if (resolvedControl.metadata && typeof resolvedControl.metadata === "object") payload.metadata = resolvedControl.metadata;
        payload = applyParticipantTargetToPayload(payload, resolvedTeamId);

        setIsApplyingStateOverride(true);
        try {
          await submitSessionEvent(payload);
          setPendingStateSuggestion(null);
          if (!silent) {
            pushToast({
              kind: "neutral",
              title: `${resolvedLabel} updated`,
              detail: `${getShortTeamName(resolveTeamName(resolvedTeamId))} (${source === "assisted_auto" ? "assisted" : "manual"})`
            });
          }
          return true;
        } catch {
          setLocalStateOverrideTeamId(resolvedTeamId);
          if (!silent) {
            pushToast({
              kind: "neutral",
              title: `${resolvedLabel} changed locally`,
              detail: `${getShortTeamName(resolveTeamName(resolvedTeamId))}`
            });
          }
          return false;
        } finally {
          setIsApplyingStateOverride(false);
        }
      }

      setLocalStateOverrideTeamId(resolvedTeamId);
      setPendingStateSuggestion(null);
      if (!silent) {
        pushToast({
          kind: "neutral",
          title: `${resolvedLabel} changed locally`,
          detail: `${getShortTeamName(resolveTeamName(resolvedTeamId))} (backend state control unavailable)`
        });
      }
      return false;
    },
    [applyParticipantTargetToPayload, canComposerSubmit, liveStateRef, pushToast, resolveTeamName, sportStateLabel, stateOverrideControl, submitSessionEvent, validatedConfig?.state_version]
  );

  const applyPendingStateSuggestion = useCallback(async () => {
    if (!pendingStateSuggestion?.nextTeamId) return;
    await handleStateOverrideApply({
      teamId: pendingStateSuggestion.nextTeamId,
      control: stateOverrideControl,
      label: sportStateLabel,
      source: "assisted_suggested",
    });
    setPendingStateSuggestion(null);
  }, [handleStateOverrideApply, pendingStateSuggestion?.nextTeamId, sportStateLabel, stateOverrideControl]);

  const dismissPendingStateSuggestion = useCallback(() => {
    setPendingStateSuggestion(null);
  }, []);

  const handleRefreshLiveState = useCallback(async () => {
    if (!match?.id) return;
    setError("");
    try {
      await refreshLiveSession();
    } catch (err) {
      setError(extractApiErrorMessage(err, "Failed to refresh live state."));
    }
  }, [match?.id, refreshLiveSession]);

  const handleRefreshConfig = useCallback(() => {
    setConfigReloadKey((current) => current + 1);
  }, []);

  const handleReconnectSocket = useCallback(() => {
    reconnectLiveSession();
  }, [reconnectLiveSession]);

  const applySecondaryClockReset = useCallback((seconds, reason = "Manual reset") => {
    if (!secondaryClockConfig.enabled || !secondaryClockConfig.isLocalOnly) return;
    const parsedSeconds = Number(seconds);
    if (!Number.isFinite(parsedSeconds)) return;
    setSecondaryClockLocalState((current) => {
      if (!current) return current;
      const isAutomatic = reason === "Automatic reset";
      return {
        ...current,
        valueMs: Math.max(0, Math.round(parsedSeconds * 1000)),
        isRunning: isAutomatic ? Boolean(isGameClockRunning) : current.isRunning,
        manualPaused: isAutomatic ? false : current.manualPaused,
        lastResetReason: reason,
      };
    });
    setSecondaryClockSuggestion(null);
  }, [isGameClockRunning, secondaryClockConfig.enabled, secondaryClockConfig.isLocalOnly]);

  const handleSecondaryClockStart = useCallback(() => {
    if (!secondaryClockConfig.enabled || !secondaryClockConfig.isLocalOnly) return;
    setSecondaryClockLocalState((current) => (current ? { ...current, isRunning: true, manualPaused: false } : current));
  }, [secondaryClockConfig.enabled, secondaryClockConfig.isLocalOnly]);

  const handleSecondaryClockPause = useCallback(() => {
    if (!secondaryClockConfig.enabled || !secondaryClockConfig.isLocalOnly) return;
    setSecondaryClockLocalState((current) => (current ? { ...current, isRunning: false, manualPaused: true } : current));
  }, [secondaryClockConfig.enabled, secondaryClockConfig.isLocalOnly]);

  const handleSecondaryClockAdjust = useCallback((deltaSeconds) => {
    if (!secondaryClockConfig.enabled || !secondaryClockConfig.isLocalOnly) return;
    const delta = Number(deltaSeconds);
    if (!Number.isFinite(delta) || delta === 0) return;
    setSecondaryClockLocalState((current) => {
      if (!current) return current;
      return {
        ...current,
        valueMs: Math.max(0, Number(current.valueMs || 0) + Math.round(delta * 1000)),
      };
    });
  }, [secondaryClockConfig.enabled, secondaryClockConfig.isLocalOnly]);

  const handlePrepareSubstitution = useCallback(
    ({ teamId, outPlayerId, inPlayerId }) => {
      if (!substitutionControl) {
        pushToast({ kind: "neutral", title: "Substitution", detail: "No substitution action is configured for this sport." });
        return;
      }
      formActions.handleControlSelect(substitutionControl.id);
      formActions.setSelectedTeamId(String(teamId || ""));
      formActions.setSelectedPlayerId(String(outPlayerId || ""));
      if (substitutionControl.provides_value && substitutionEventDefinition) {
        const valueType = String(substitutionEventDefinition.value_type || "text").toLowerCase();
        if (valueType === "json") {
          formActions.setInputValue(
            JSON.stringify({ out_player_id: Number(outPlayerId), in_player_id: Number(inPlayerId) })
          );
        } else if (valueType === "integer" || valueType === "float" || valueType === "text") {
          formActions.setInputValue(String(inPlayerId || ""));
        } else if (valueType === "boolean") {
          formActions.setInputBoolean(true);
        }
      }
      pushToast({ kind: "neutral", title: "Substitution prepared", detail: "Review and tap Record Event." });
    },
    [formActions, pushToast, substitutionControl, substitutionEventDefinition]
  );
  const normalizedConfigStatus = String(configStatus || "").toUpperCase();
  const isConfigBlocked = ["BLOCKED", "REVIEW", "CONFIG_LOCKED", "CONFIG_MISMATCH"].includes(normalizedConfigStatus);
  const scoringSportCode = String(
    validatedConfig?.runtime_governance?.sport_code
    || validatedConfig?.sport_code
    || validatedConfig?.sport_id
    || sportDefinition?.sport
    || match?.sport_name
    || sportKey
    || ""
  ).trim().toUpperCase().replaceAll(" ", "_");
  const scoringParticipants = useMemo(
    () => teamOptions.map((team) => ({
      key: `score-participant-${team.id}`,
      teamId: team.id,
      label: team.name,
      side: team.side,
      participantModel: participantUnitType,
      resolved: team.resolved,
    })),
    [participantUnitType, teamOptions]
  );
  const scoreboardPresentation = useMemo(
    () => buildLiveScoreboardPresentation({
      config: validatedConfig,
      liveState,
      participants: scoringParticipants,
      participantModel: participantUnitType,
      sportCode: sportKey,
    }),
    [liveState, participantUnitType, scoringParticipants, sportKey, validatedConfig]
  );
  const completionPresentation = useMemo(
    () => buildMatchCompletionPresentation({
      match,
      liveState,
      participants: scoringParticipants,
      scoreboard: scoreboardPresentation,
    }),
    [liveState, match, scoreboardPresentation, scoringParticipants]
  );

  const handleSubmitEvent = useCallback(async (options = {}) => {
    const {
      controlOverride = null,
      eventDefinitionOverride = null,
      teamIdOverride = undefined,
      playerIdOverride = undefined,
      inputValueOverride = undefined,
      inputBooleanOverride = undefined,
      metadataOverride = undefined,
    } = options || {};

    setError("");
    if (!validatedConfig || !canComposerSubmit) {
      setError(
        ["REVIEW", "CONFIG_MISMATCH"].includes(normalizedConfigStatus)
          ? "Scoring is locked because this match template no longer matches the current sport template."
          : "Scoring is locked because the sport template configuration is invalid."
      );
      return;
    }
    const effectiveControl = controlOverride || selectedControl;
    if (!effectiveControl) {
      setError("Select an action to continue.");
      return;
    }
    const resolvedEventDefinition =
      eventDefinitionOverride
      || (Array.isArray(validatedConfig?.event_types)
        ? validatedConfig.event_types.find(
            (row) => String(row?.name || "").toUpperCase() === String(effectiveControl?.event_type || "").toUpperCase()
          ) || null
        : null)
      || selectedEventDefinition
      || null;

    const effectiveFormState = {
      ...formState,
      ...(teamIdOverride !== undefined ? { selectedTeamId: String(teamIdOverride || "") } : {}),
      ...(playerIdOverride !== undefined ? { selectedPlayerId: String(playerIdOverride || "") } : {}),
      ...(inputValueOverride !== undefined ? { inputValue: String(inputValueOverride ?? "") } : {}),
      ...(inputBooleanOverride !== undefined ? { inputBoolean: Boolean(inputBooleanOverride) } : {}),
    };

    const { payload, error: payloadErr } = buildEventPayload({
      selectedControl: effectiveControl,
      formState: effectiveFormState,
      validatedConfig,
      liveStateVersion: liveStateRef.current?.state_version
    });
    
    if (payloadErr) { setError(payloadErr); return false; }
    const selectedParticipantId = Number(
      teamIdOverride !== undefined
        ? teamIdOverride
        : effectiveFormState.selectedTeamId
    );
    const eventPayload = applyParticipantTargetToPayload(payload, selectedParticipantId);
    if (metadataOverride && typeof metadataOverride === "object") {
      eventPayload.metadata = {
        ...(eventPayload.metadata || {}),
        ...metadataOverride,
      };
    }
    const selectedSide = Number(teamOptions[0]?.id) === selectedParticipantId ? "A" : "B";
    const isPotentialFinalPoint = scoreboardPresentation?.indicators?.some(
      (indicator) => indicator?.code === "MATCH_POINT"
        && (!indicator.side || indicator.side === selectedSide)
    );

    if (isPotentialFinalPoint) {
      pushToast({
        kind: "neutral",
        title: "Finalizing Match result…",
        detail: "Waiting for canonical confirmation.",
      });
    }
    try {
      const response = await submitSessionEvent(eventPayload);
      
      const createdEvent = response?.event || null;
      const normalizedEventType = String(createdEvent?.event_type || eventPayload.event_type || "").toUpperCase();
      const isScoreEvent = validatedConfig?.score_event_types?.some(set => String(set || "").toUpperCase() === normalizedEventType);
      const isViolation = validatedConfig?.violations?.some(v => String(v.name || v.event_type || "").toUpperCase() === normalizedEventType);
      
      pushToast({
        kind: isScoreEvent ? "score" : isViolation ? "violation" : "neutral",
        title: `${normalizedEventType} Recorded`,
        detail: resolveTeamName(selectedParticipantId)
      });

      try {
        const actingTeamId = selectedParticipantId;
        const opponentTeamId = teamOptions.find((row) => Number(row.id) !== actingTeamId)?.id || null;
        const stateEffect = getStateEffectForAction({
          sportStateMode,
          sportKey,
          eventType: normalizedEventType,
          actingTeamId,
          opponentTeamId
        });

        if (stateEffect.mode === "auto" && Number(stateEffect.nextTeamId || 0) > 0) {
          const nextTeamId = Number(stateEffect.nextTeamId);
          if (Number(sportStateTeamId || 0) !== nextTeamId) {
            const applied = await handleStateOverrideApply({
              teamId: nextTeamId,
              control: stateOverrideControl,
              label: sportStateLabel,
              silent: true,
              source: "assisted_auto",
            });
            pushToast({
              kind: "neutral",
              title: `${sportStateLabel} changed`,
              detail: `${getShortTeamName(resolveTeamName(Number(sportStateTeamId || actingTeamId || 0)))} -> ${getShortTeamName(resolveTeamName(nextTeamId))}${applied ? "" : " (local)"}`
            });
          }
          setPendingStateSuggestion(null);
        } else if (stateEffect.mode === "suggest") {
          setPendingStateSuggestion({
            mode: "suggest",
            nextTeamId: Number(stateEffect.nextTeamId || 0) || null,
            eventType: normalizedEventType,
            stateLabel: sportStateLabel,
            createdAt: Date.now()
          });
          if (stateEffect.nextTeamId) {
            pushToast({
              kind: "neutral",
              title: `${sportStateLabel} suggestion`,
              detail: `Suggested ${sportStateLabel.toLowerCase()}: ${getShortTeamName(resolveTeamName(stateEffect.nextTeamId))}`
            });
          } else {
            pushToast({
              kind: "neutral",
              title: `${sportStateLabel} suggestion`,
              detail: `Review ${sportStateLabel.toLowerCase()} and apply manual override if needed.`
            });
          }
        } else if (stateEffect.mode === "none") {
          setPendingStateSuggestion(null);
        }
      } catch {
        // Assisted state updates must never block scoring submission.
      }

      try {
        const eventCategory = String(resolvedEventDefinition?.category || "").trim().toLowerCase();
        const stopsShotClock = eventCategory === "violation" || eventCategory === "penalty";
        if (secondaryClockConfig.enabled && secondaryClockConfig.isLocalOnly && stopsShotClock) {
          handleSecondaryClockPause();
          pushToast({
            kind: "neutral",
            title: `${secondaryClockConfig.label} stopped`,
            detail: "Review the violation, then reset or continue the shot clock.",
          });
        }
        const shotClockDecision = getSecondaryClockSuggestion({
          profile: secondaryClockConfig,
          eventType: normalizedEventType
        });
        if (secondaryClockConfig.enabled && shotClockDecision) {
          if (secondaryClockConfig.isLocalOnly) {
            if (shotClockDecision.mode === "auto") {
              applySecondaryClockReset(shotClockDecision.seconds, "Automatic reset");
              pushToast({
                kind: "neutral",
                title: `${secondaryClockConfig.label} reset`,
                detail: `${shotClockDecision.seconds}s (local only)`
              });
            } else {
              setSecondaryClockSuggestion({
                seconds: shotClockDecision.seconds,
                reason: shotClockDecision.reason || "Suggested reset"
              });
            }
          } else {
            setSecondaryClockSuggestion({
              seconds: shotClockDecision.seconds,
              reason: "Use backend clock control to apply reset."
            });
          }
        }
      } catch {
        // Secondary clock is assistive UI only; it must never block scoring.
      }
      
      if (resolvedEventDefinition?.has_value) {
        if (resolvedEventDefinition.value_type === "boolean") formActions.setInputBoolean(true);
        else formActions.setInputValue("");
      }
      return true;
    } catch (err) {
      if (isStaleMatchError(err)) {
        await handleRefreshLiveState();
        setError("The Match changed on another device. The latest score has been loaded. Review it before continuing.");
      } else {
        if (isPotentialFinalPoint) await handleRefreshLiveState();
        setError(extractApiErrorMessage(err, "This action could not be recorded. Review the Match and try again."));
      }
      return false;
    } finally {
      // Pending state is owned by the live-scoring session.
    }
  }, [
    applyParticipantTargetToPayload,
    applySecondaryClockReset,
    canComposerSubmit,
    formActions,
    formState,
    handleStateOverrideApply,
    handleRefreshLiveState,
    handleSecondaryClockPause,
    liveStateRef,
    normalizedConfigStatus,
    pushToast,
    resolveTeamName,
    secondaryClockConfig,
    scoreboardPresentation?.indicators,
    selectedControl,
    selectedEventDefinition,
    sportStateLabel,
    sportKey,
    sportStateMode,
    sportStateTeamId,
    stateOverrideControl,
    submitSessionEvent,
    teamOptions,
    validatedConfig,
  ]);

  const commitSpecializedEvent = useCallback(async (specializedPayload = {}) => {
    if (!match?.id || !canComposerSubmit || isSubmitting || isUndoing) return false;
    const eventType = String(specializedPayload?.event_type || "").trim().toUpperCase();
    if (!eventType) {
      setError("Choose an official result action.");
      return false;
    }
    const selectedTargetId = asInt(specializedPayload?.team_id);
    let payload = {
      event_type: eventType,
      ...(selectedTargetId ? { team_id: selectedTargetId } : {}),
      ...(specializedPayload?.value !== undefined ? { value: specializedPayload.value } : {}),
      ...(specializedPayload?.metadata && typeof specializedPayload.metadata === "object"
        ? { metadata: specializedPayload.metadata }
        : {}),
      client_event_id: window.crypto?.randomUUID?.()
        || `evt-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      expected_state_version: Number(
        liveStateRef.current?.state_version || validatedConfig?.state_version || 0
      ),
    };
    payload = applyParticipantTargetToPayload(payload, selectedTargetId);
    setError("");
    try {
      await submitSessionEvent(payload);
      pushToast({
        kind: "neutral",
        title: "Official Match state updated",
        detail: eventType.replaceAll("_", " ").toLowerCase(),
      });
      return true;
    } catch (err) {
      if (isStaleMatchError(err)) {
        await handleRefreshLiveState();
        setError("The Match changed on another device. The latest state has been loaded. Review it before continuing.");
      } else {
        setError(extractApiErrorMessage(err, "The official Match result could not be updated."));
      }
      return false;
    } finally {
      // Pending state is owned by the live-scoring session.
    }
  }, [
    applyParticipantTargetToPayload,
    canComposerSubmit,
    handleRefreshLiveState,
    isSubmitting,
    isUndoing,
    liveStateRef,
    match?.id,
    pushToast,
    submitSessionEvent,
    validatedConfig?.state_version,
  ]);

  const handleSpecializedEventRequest = useCallback((specializedPayload = {}) => {
    const eventType = String(specializedPayload?.event_type || "").trim().toUpperCase();
    if (isCompletionAction(eventType)) {
      setPendingCompletion({ kind: "specialized", payload: specializedPayload, eventType });
      return;
    }
    void commitSpecializedEvent(specializedPayload);
  }, [commitSpecializedEvent]);


  const handleUndoLastEvent = async () => {
    if (!match?.id || !canComposerSubmit) return;
    setError("");
    try {
      await undoSessionAction();
      pushToast({ kind: "neutral", title: "Last event undone" });
    } catch (err) {
      setError(extractApiErrorMessage(err, "Failed to undo last event."));
    } finally {
      // Pending state is owned by the live-scoring session.
    }
  };

  const requestUndoLastEvent = () => {
    if (!canUndoEvents || isUndoing) return;
    setIsUndoConfirmationOpen(true);
  };

  const confirmUndoLastEvent = async () => {
    setIsUndoConfirmationOpen(false);
    await handleUndoLastEvent();
  };

  const handleReplayRebuild = async (untilSequence = null) => {
    if (!match?.id || !debugMode) return;
    setIsReplayLoading(true);
    setReplayError("");
    try {
      const payload = await fetchReplayPayload(untilSequence);
      setReplaySnapshot(payload);
    } catch (err) {
      setReplayError(extractApiErrorMessage(err, "Failed to rebuild replay state."));
    } finally {
      setIsReplayLoading(false);
    }
  };

  const handleReplaySequenceSubmit = async () => {
    const parsed = Number(replayUntilSequence);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      await handleReplayRebuild(null);
      return;
    }
    await handleReplayRebuild(Math.trunc(parsed));
  };

  const quickControlDisabledReason = useCallback(
    (control) => {
      if (!control?.enabled) return "Disabled by config";
      const type = String(control?.event_type || "").toUpperCase();
      if (!isOperationallyReady) return operationalReadinessMessage || "Complete the Match setup before using scoring controls";
      if (type.includes("CLOCK_START") && lineupUi.hasIncompleteLineup) return lineupUi.warningText || "Lineup setup required";
      if ((type.includes("CLOCK_START") || type.includes("CLOCK_RESUME")) && isGameClockRunning) return "Clock already running";
      if ((type.includes("CLOCK_STOP") || type.includes("CLOCK_PAUSE")) && !isGameClockRunning) return "Clock already stopped";
      if (!canComposerSubmit) return "Scoring is locked";
      if (isSubmitting || isUndoing) return "Processing";
      return "";
    },
    [canComposerSubmit, isGameClockRunning, isOperationallyReady, isSubmitting, isUndoing, lineupUi.hasIncompleteLineup, lineupUi.warningText, operationalReadinessMessage]
  );
  const handleClockControlSubmit = useCallback(async (control) => {
    if (!control) return false;
    const disabledReason = quickControlDisabledReason(control);
    if (disabledReason) return false;
    const fallbackTeamId = asInt(formState.selectedTeamId) || asInt(sportStateTeamId) || asInt(teamOptions?.[0]?.id);
    return handleSubmitEvent({
      controlOverride: control,
      teamIdOverride: fallbackTeamId || undefined,
      playerIdOverride: "",
      inputValueOverride: "",
      inputBooleanOverride: false,
    });
  }, [formState.selectedTeamId, handleSubmitEvent, quickControlDisabledReason, sportStateTeamId, teamOptions]);

  const scoringMode = String(sportUiProfile?.scoringMode || "HEAD_TO_HEAD").toUpperCase();
  const isHeadToHeadLike = scoringMode === "HEAD_TO_HEAD" || scoringMode === "SET_BASED";
  const isCombatMode = scoringMode === "COMBAT";
  const isMultiParticipantResultMode = scoringMode === "MULTI_PARTICIPANT_RESULT";
  const isBoardGameMode = scoringMode === "BOARD_GAME";
  const hasDedicatedSpecializedEntry = isDedicatedEntryEngine(specializedEngineType);

  const modeActionControls = useMemo(() => {
    const controls = Array.isArray(validatedConfig?.controls) ? validatedConfig.controls : [];
    const resultPattern = /(FINISH|DNS|DNF|DQ|DISQUAL|CHECKMATE|RESIGN|DRAW|TIME_FORFEIT|ILLEGAL_MOVE|MATCH_END|RESULT)/;
    if (isBoardGameMode) {
      return controls.filter((control) => {
        const type = String(control?.event_type || "").toUpperCase();
        return /(CHECKMATE|RESIGN|DRAW|TIME_FORFEIT|ILLEGAL_MOVE|STALEMATE|MATCH_END)/.test(type);
      });
    }
    if (isCombatMode) {
      return controls.filter((control) => {
        const type = String(control?.event_type || "").toUpperCase();
        return /(KNOCKDOWN|WARNING|DEDUCTION|ROUND|RESULT|MATCH_END|KO|TKO|DQ|DECISION)/.test(type);
      });
    }
    if (isMultiParticipantResultMode) {
      return controls.filter((control) => resultPattern.test(String(control?.event_type || "").toUpperCase()));
    }
    return [];
  }, [isBoardGameMode, isCombatMode, isMultiParticipantResultMode, validatedConfig?.controls]);

  const participantRowsForResultMode = useMemo(() => {
    return resolvedParticipants
      .filter((participant) => Number(participant.targetId || 0) > 0)
      .map((participant) => ({
        key: `participant-${participant.side}-${participant.targetId}`,
        label: participant.displayName || `Participant ${participant.side}`,
        teamId: asInt(participant.targetId),
        side: participant.side,
        activePlayers: participant.members.map((member) => ({ id: member.playerId, name: member.displayName })),
      }));
  }, [resolvedParticipants]);

  const handleModeActionSubmit = useCallback(async (control, participant = null) => {
    if (!control || !canComposerSubmit || isSubmitting || isUndoing) return;
    const teamIdFromParticipant = asInt(participant?.teamId);
    const fallbackTeamId = teamIdFromParticipant || asInt(formState.selectedTeamId) || asInt(teamOptions?.[0]?.id);
    const eventDefinition = (validatedConfig?.event_types || []).find(
      (row) => String(row?.name || "").toUpperCase() === String(control?.event_type || "").toUpperCase()
    );
    const attributionPolicy = resolveActionAttributionPolicy({ control, eventDefinition });
    const targetParticipant = resolvedParticipants.find(
      (row) => Number(row.targetId) === Number(fallbackTeamId)
    );
    const soleParticipantMemberId = targetParticipant?.members?.length === 1
      ? asInt(targetParticipant.members[0]?.playerId)
      : null;
    const selectedPlayerId = asInt(formState.selectedPlayerId) || soleParticipantMemberId;
    const validMemberIds = new Set((targetParticipant?.members || []).map((member) => Number(member.playerId)));
    if (selectedPlayerId && !validMemberIds.has(selectedPlayerId)) {
      setError("The selected player is no longer available for this participant.");
      return;
    }
    if (attributionPolicy === "REQUIRED_EXISTING_ONLY" && !selectedPlayerId) {
      setError("Select the player involved before recording this action.");
      return;
    }
    await handleSubmitEvent({
      controlOverride: control,
      teamIdOverride: fallbackTeamId || undefined,
      playerIdOverride: attributionPolicy === "NONE" ? "" : selectedPlayerId || "",
      inputValueOverride: "",
      inputBooleanOverride: false,
    });
  }, [canComposerSubmit, formState.selectedPlayerId, formState.selectedTeamId, handleSubmitEvent, isSubmitting, isUndoing, resolvedParticipants, teamOptions, validatedConfig?.event_types]);

  const handleTimedTeamActionSubmit = useCallback(async (control, targetId, selectedPlayerId = "") => {
    if (!control || !canComposerSubmit || isSubmitting || isUndoing) return;
    const eventDefinition = (validatedConfig?.event_types || []).find(
      (row) => String(row?.name || "").toUpperCase() === String(control?.event_type || "").toUpperCase()
    );
    const attributionPolicy = resolveActionAttributionPolicy({ control, eventDefinition });
    const participant = resolvedParticipants.find((row) => Number(row.targetId) === Number(targetId));
    const selectedId = asInt(selectedPlayerId);
    const validMemberIds = new Set((participant?.members || []).map((member) => Number(member.playerId)));
    if (selectedId && !validMemberIds.has(selectedId)) {
      setError("The selected player is no longer available for this participant.");
      return;
    }
    if (attributionPolicy === "REQUIRED_EXISTING_ONLY" && !selectedId) {
      setError(`Select a player for ${participant?.displayName || "this participant"} before recording this action.`);
      return;
    }
    setError("");
    await handleSubmitEvent({
      controlOverride: control,
      teamIdOverride: asInt(targetId) || undefined,
      playerIdOverride: attributionPolicy === "NONE" ? "" : selectedId || "",
      inputValueOverride: "",
      inputBooleanOverride: false,
    });
  }, [canComposerSubmit, handleSubmitEvent, isSubmitting, isUndoing, resolvedParticipants, validatedConfig?.event_types]);

  const handleTimedTeamSubstitution = useCallback(async ({ teamId, outPlayerId, inPlayerId }) => {
    if (!substitutionControl) {
      setError("Substitution is not available in this Match's scoring configuration.");
      return false;
    }
    const submission = buildSubstitutionSubmission({
      control: substitutionControl,
      eventDefinition: substitutionEventDefinition,
      teamId,
      outPlayerId,
      inPlayerId,
    });
    if (!submission) return false;
    return handleSubmitEvent({
      controlOverride: substitutionControl,
      ...submission,
      inputBooleanOverride: false,
    });
  }, [handleSubmitEvent, substitutionControl, substitutionEventDefinition]);

  const timedTeamParticipants = useMemo(() => teamOptions.slice(0, 2).map((team) => {
    const resolved = resolvedParticipants.find((row) => Number(row.targetId) === Number(team.id));
    const sideState = Object.values(participantState?.sides || {}).find(
      (row) => Number(row?.team_id) === Number(team.id)
    );
    const allMembers = resolved?.members || [];
    const byId = new Map(allMembers.map((member) => [Number(member.playerId), member]));
    const activeMembers = (sideState?.active_players || [])
      .map((member) => byId.get(Number(member?.id)) || { playerId: Number(member?.id), displayName: member?.name })
      .filter((member) => Number(member?.playerId) > 0);
    const benchMembers = (sideState?.bench_players || [])
      .map((member) => byId.get(Number(member?.id)) || { playerId: Number(member?.id), displayName: member?.name })
      .filter((member) => Number(member?.playerId) > 0);
    const configuredActiveLimit = Number(lineupUi.activePlayersPerSide || 0);
    const fallbackLimit = sportKey === "basketball" ? 5 : configuredActiveLimit || allMembers.length;
    const displayedActive = activeMembers.length > 0
      ? activeMembers
      : allMembers.slice(0, fallbackLimit);
    const activeIds = new Set(displayedActive.map((member) => Number(member.playerId)));
    return {
      ...team,
      shortName: getShortTeamName(team.name),
      members: displayedActive,
      benchMembers: benchMembers.length > 0
        ? benchMembers
        : allMembers.filter((member) => !activeIds.has(Number(member.playerId))),
    };
  }), [lineupUi.activePlayersPerSide, participantState?.sides, resolvedParticipants, sportKey, teamOptions]);

  const detailedControls = useMemo(
    () => (validatedConfig?.controls || []).filter(needsDetailedComposer),
    [validatedConfig?.controls]
  );
  const detailedValidatedConfig = useMemo(() => {
    if (!validatedConfig || detailedControls.length === 0) return null;
    const ids = new Set(detailedControls.map((control) => String(control?.id || "").toLowerCase()));
    return {
      ...validatedConfig,
      controls: detailedControls,
      action_groups: (validatedConfig.action_groups || [])
        .map((group) => ({
          ...group,
          controls: (group?.controls || []).filter((control) => {
            const id = typeof control === "object" ? control?.id : control;
            return ids.has(String(id || "").toLowerCase());
          }),
        }))
        .filter((group) => group.controls.length > 0),
    };
  }, [detailedControls, validatedConfig]);
  const connectionPresentation = useMemo(
    () => buildConnectionStatus(liveStatusMode),
    [liveStatusMode]
  );

  const handleSportActionRequest = useCallback((control, participant = null) => {
    const eventType = String(control?.event_type || "").trim().toUpperCase();
    if (isCompletionAction(eventType)) {
      setPendingCompletion({ kind: "control", control, participant, eventType });
      return;
    }
    void handleModeActionSubmit(control, participant);
  }, [handleModeActionSubmit]);

  const openDetailedControls = useCallback(() => {
    const first = detailedControls[0];
    if (first?.id) formActions.handleControlSelect(first.id);
    setShowDetailedComposer(true);
  }, [detailedControls, formActions]);

  const confirmCompletion = useCallback(async () => {
    const pending = pendingCompletion;
    setPendingCompletion(null);
    if (!pending) return;
    if (pending.kind === "specialized") {
      await commitSpecializedEvent(pending.payload);
      return;
    }
    await handleModeActionSubmit(pending.control, pending.participant);
  }, [commitSpecializedEvent, handleModeActionSubmit, pendingCompletion]);

  const defaultSafeReason = ["REVIEW", "CONFIG_MISMATCH"].includes(normalizedConfigStatus)
    ? "Template has changed since match creation."
    : "Invalid sport template configuration";
  const safeModePayload = safeModeResponse || {
    status: isConfigBlocked ? normalizedConfigStatus : "BLOCKED",
    mode: "READ_ONLY",
    reason: defaultSafeReason,
    issues: [defaultSafeReason],
    event_config: null,
    safe_display: { ...defaultSafeDisplay, allow_composer: false },
  };

  const handleSaveAndRefresh = useCallback(async () => {
    await handleRefreshLiveState();
    pushToast({ kind: "neutral", title: "Saved", detail: "Live state synced." });
  }, [handleRefreshLiveState, pushToast]);

  const suggestedActionPreferenceKey = useMemo(() => {
    const userId = user?.id ? `u${user.id}` : "";
    if (userId) return userId;
    if (Array.isArray(roleNames) && roleNames.length > 0) return `r${roleNames.slice().sort().join("_")}`;
    return "anonymous";
  }, [roleNames, user?.id]);

  if (!match) return null;

  if (isLoading && !liveState) {
    return (
      <div className="min-h-[65vh] p-4 sm:p-6" aria-busy="true" aria-label="Loading live scoring">
        <div className="mx-auto max-w-[1500px] animate-pulse space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="h-5 w-32 rounded bg-[var(--surface-muted)]" />
              <div className="h-8 w-72 max-w-[70vw] rounded bg-[var(--surface-muted)]" />
            </div>
            <div className="h-9 w-24 rounded-xl bg-[var(--surface-muted)]" />
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <div className="h-44 rounded-2xl bg-[var(--surface-soft)]" />
            <div className="mx-auto h-8 w-12 rounded-full bg-[var(--surface-muted)]" />
            <div className="h-44 rounded-2xl bg-[var(--surface-soft)]" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((row) => (
              <div key={row} className="h-14 rounded-xl bg-[var(--surface-soft)]" />
            ))}
          </div>
          <span className="sr-only">Loading Match rules and current score.</span>
        </div>
      </div>
    );
  }

  const secondaryClockDisabled = !canComposerSubmit || isConfigBlocked || !secondaryClockConfig.enabled || !secondaryClockConfig.isLocalOnly;
  const secondaryClockDisabledReason = !secondaryClockConfig.enabled
    ? "Secondary clock is unavailable for this sport."
    : !secondaryClockConfig.isLocalOnly
      ? "Secondary clock backend controls are not yet wired for this environment."
    : !canComposerSubmit || isConfigBlocked
      ? "Scoring controls are currently locked."
      : "";

  const systemStatusCard = (
    <details className="rounded-2xl border border-slate-200 bg-white/85 p-3.5 shadow-md shadow-slate-300/30 dark:border-slate-700/80 dark:bg-slate-950/60 dark:shadow-lg dark:shadow-slate-950/20">
      <summary className="cursor-pointer list-none">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">System Status</h3>
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            liveStatusMode === "live"
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200"
              : liveStatusMode === "stale" || liveStatusMode === "reconnecting"
                ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200"
                : "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200"
          }`}>
            {liveStatusMode.toUpperCase()}
          </span>
        </div>
      </summary>
      <div className="mt-2 space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
        <p>Last Sync: {lastLiveSyncAt ? new Date(lastLiveSyncAt).toLocaleTimeString() : "-"}</p>
        <p>Config: {normalizedConfigStatus}</p>
        <p>Server: Live scoring engine</p>
      </div>
    </details>
  );

  return (
    <div className="min-h-screen p-2.5 text-slate-900 sm:p-4 lg:p-5 dark:text-slate-100">
      <div className="mx-auto max-w-[1750px] space-y-3">
        {feedbackToasts.length > 0 && (
          <div className="pointer-events-none fixed right-4 top-4 z-[80] flex w-[320px] max-w-[92vw] flex-col gap-2">
            {feedbackToasts.map((toast) => (
              <div key={toast.id} className={`rounded-lg border px-3 py-2 text-xs shadow-md dark:shadow-lg ${
                toast.kind === "score" ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-100" :
                toast.kind === "violation" ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-100" :
                "border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800/95 dark:text-slate-100"
              }`}>
                <p className="font-semibold">{toast.title}</p>
                {toast.detail && <p className="mt-0.5 text-xs opacity-90">{toast.detail}</p>}
              </div>
            ))}
          </div>
        )}

        {liveStatusMode !== "live" && (
          <LiveStatusIndicator
            mode={liveStatusMode}
            lastSyncedAt={lastLiveSyncAt}
            onRefresh={handleRefreshLiveState}
            onReconnect={handleReconnectSocket}
            isRefreshing={isLoading}
          />
        )}

        {(error || (!useTimedTeamSurface && !useBoxingScorecardSurface && blockingSessionError)) && <div className="rounded-lg border border-rose-300 bg-rose-50 p-2 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">{error || blockingSessionError}</div>}

        {scheduleReadinessBlocker ? (
          <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950 shadow-sm dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-50" role="status" aria-labelledby="match-scheduling-required-title">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">Scoring unavailable</p>
            <h1 id="match-scheduling-required-title" className="mt-1 text-xl font-bold">Scheduling required</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6">
              This match has its participants, but it has not been scheduled yet. A date, start and end time, and venue must be assigned before live scoring can begin.
            </p>
            {isCoordinator ? (
              <a href={`/coordinator/schedules${match?.id ? `?match_id=${Number(match.id)}` : ""}`} className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-amber-700 px-4 text-sm font-bold text-white transition hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400">
                Schedule Match
              </a>
            ) : (
              <p className="mt-3 text-sm font-semibold">Contact the Sports Coordinator to schedule this match.</p>
            )}
          </section>
        ) : useTimedTeamSurface ? (
          <TallyBoardShell
            title={[liveScoringSportLabel, competitionTypeLabel].filter(Boolean).join(" · ")}
            matchup={liveScoringMatchupLabel}
            meta={liveScoringMetaLine}
            matchStatus={completedMatch ? "COMPLETED" : String(liveState?.match_status || match?.status || "LIVE").toUpperCase()}
            connection={connectionPresentation}
            blockingMessage={!canComposerSubmit ? (operationalReadinessMessage || blockingSessionError || (completedMatch ? "This Match is complete." : "Your current session cannot record Match actions.")) : ""}
            onRefresh={handleSaveAndRefresh}
            onExit={onExit}
            recentAction={timelineWithEffects[0]
              ? `${resolveTeamName(timelineWithEffects[0].team_id)} · ${getActionPresentation(timelineWithEffects[0].event_type).label} · ${formatTimelineTime(timelineWithEffects[0].created_at)}`
              : "No actions recorded yet"}
            canUndo={canUndoEvents && Number(liveState?.event_count || 0) > 0}
            isUndoing={isUndoing}
            onUndo={requestUndoLastEvent}
            secondaryPanels={(
              <>
                {safeDisplay.allow_timeline ? <details className="rounded-xl bg-[var(--surface-soft)] p-3"><summary className="cursor-pointer text-sm font-semibold">Timeline</summary><div className="mt-3"><LiveTimeline timelineWithEffects={timelineWithEffects} canDeleteEvents={false} isDeletingById={{}} handleDeleteEvent={() => {}} /></div></details> : null}
                {ruleSnapshotMeta ? <details className="rounded-xl bg-[var(--surface-soft)] p-3"><summary className="cursor-pointer text-sm font-semibold">Rules</summary><div className="mt-3"><RulesSummaryPanel snapshot={ruleSnapshotMeta} configStatus={normalizedConfigStatus} validatedConfig={validatedConfig} rawEventConfig={configResponseSnapshot?.event_config} sportName={sportDefinition?.sport || match?.sport_name || ""} liveState={liveState} serviceOwnerLabel={resolveTeamName(liveState?.service_state?.server_team_id)} /></div></details> : null}
                <details className="rounded-xl bg-[var(--surface-soft)] p-3"><summary className="cursor-pointer text-sm font-semibold">Match details</summary><div className="mt-3"><MatchSummaryPanel match={match} liveState={liveState} sportProfile={sportProfile} isRoleReadOnly={isRoleReadOnly || isConfigBlocked} canWrite={canComposerSubmit} latestViolation={latestViolation} sportDefinition={validatedConfig?.sport_definition} /></div></details>
              </>
            )}
          >
            <TimedTeamSurface
              participants={timedTeamParticipants}
              scores={[team1LiveScore, team2LiveScore]}
              controls={validatedConfig?.controls || []}
              clockValue={formatClock(effectiveGameClockSeconds)}
              clockRunning={isGameClockRunning}
              periodLabel={matchPhaseLabel}
              possessionTeamId={sportStateTeamId}
              canSubmit={canComposerSubmit}
              isPending={isSubmitting || isUndoing}
              disabledReason={operationalReadinessMessage || blockingSessionError || (!canComposerSubmit ? "Scoring actions are unavailable for this Match." : "")}
              onAction={handleTimedTeamActionSubmit}
              onClockAction={handleClockControlSubmit}
              onUtilityAction={(control, targetId) => handleTimedTeamActionSubmit(control, targetId || teamOptions[0]?.id, "")}
              substitutionControl={lineupUi.supportsSubstitution ? substitutionControl : null}
              onSubstitute={handleTimedTeamSubstitution}
            />
            {completedMatch ? <div className="mt-3 space-y-3"><MatchCompletionPanel presentation={completionPresentation} /><ResultCorrectionPanel match={match} completed={completedMatch} /></div> : null}
          </TallyBoardShell>
        ) : useBoxingScorecardSurface ? (
          <TallyBoardShell
            title={[liveScoringSportLabel, competitionTypeLabel].filter(Boolean).join(" · ")}
            matchup={liveScoringMatchupLabel}
            meta={liveScoringMetaLine}
            matchStatus={completedMatch ? "COMPLETED" : String(liveState?.match_status || match?.status || "LIVE").toUpperCase()}
            connection={connectionPresentation}
            blockingMessage={!canComposerSubmit ? (operationalReadinessMessage || blockingSessionError || (completedMatch ? "This bout is complete." : "Your current session cannot record Boxing actions.")) : ""}
            onRefresh={handleSaveAndRefresh}
            onExit={onExit}
            recentAction={timelineWithEffects[0]
              ? `${resolveTeamName(timelineWithEffects[0].team_id)} · ${getActionPresentation(timelineWithEffects[0].event_type).label} · ${formatTimelineTime(timelineWithEffects[0].created_at)}`
              : "No actions recorded yet"}
            canUndo={canUndoEvents && Number(liveState?.event_count || 0) > 0}
            isUndoing={isUndoing}
            onUndo={requestUndoLastEvent}
            secondaryPanels={(
              <>
                {safeDisplay.allow_timeline ? <details className="rounded-xl bg-[var(--surface-soft)] p-3"><summary className="cursor-pointer text-sm font-semibold">Timeline</summary><div className="mt-3"><LiveTimeline timelineWithEffects={timelineWithEffects} canDeleteEvents={false} isDeletingById={{}} handleDeleteEvent={() => {}} /></div></details> : null}
                <details className="rounded-xl bg-[var(--surface-soft)] p-3"><summary className="cursor-pointer text-sm font-semibold">Rules</summary><div className="mt-3"><RulesSummaryPanel snapshot={ruleSnapshotMeta} configStatus={normalizedConfigStatus} validatedConfig={validatedConfig} rawEventConfig={configResponseSnapshot?.event_config} sportName={sportDefinition?.sport || match?.sport_name || "Boxing"} liveState={liveState} serviceOwnerLabel="" /></div></details>
                <details className="rounded-xl bg-[var(--surface-soft)] p-3"><summary className="cursor-pointer text-sm font-semibold">Match details</summary><div className="mt-3"><MatchSummaryPanel match={match} liveState={liveState} sportProfile={sportProfile} isRoleReadOnly={isRoleReadOnly || isConfigBlocked} canWrite={canComposerSubmit} latestViolation={latestViolation} sportDefinition={validatedConfig?.sport_definition} /></div></details>
              </>
            )}
          >
            <BoxingScorecardSurface
              config={validatedConfig}
              liveState={liveState}
              participants={participantRowsForResultMode}
              canWrite={canComposerSubmit}
              isSubmitting={isSubmitting || isUndoing}
              blockingMessage={operationalReadinessMessage || blockingSessionError}
              onSubmitEvent={commitSpecializedEvent}
            />
            {completedMatch ? <div className="mt-3 space-y-3"><MatchCompletionPanel presentation={completionPresentation} /><ResultCorrectionPanel match={match} completed={completedMatch} /></div> : null}
          </TallyBoardShell>
        ) : (
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
          <main className="space-y-3">
            <header className="flex flex-wrap items-start justify-between gap-3 px-1 py-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-cyan-700 dark:text-cyan-300">Live Scoring</p>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 sm:text-xl">
                    {liveScoringSportLabel}
                  </h1>
                  {competitionTypeLabel && (
                    <span className="rounded-full border border-cyan-300 bg-cyan-50 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-700 dark:border-cyan-500/40 dark:bg-cyan-500/15 dark:text-cyan-100">
                      {competitionTypeLabel}
                    </span>
                  )}
                </div>
                {liveScoringMatchupLabel && (
                  <p className="mt-1 text-base font-semibold text-slate-700 dark:text-slate-200 sm:text-lg">
                    {liveScoringMatchupLabel}
                  </p>
                )}
                {liveScoringMetaLine && (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {liveScoringMetaLine}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  connectionPresentation.tone === "success"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200"
                    : connectionPresentation.tone === "warning"
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200"
                      : connectionPresentation.tone === "danger"
                        ? "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200"
                        : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                }`} role="status">
                  <span className={`h-2 w-2 rounded-full ${connectionPresentation.tone === "success" ? "bg-emerald-500" : "bg-amber-500"}`} />
                  {connectionPresentation.label}
                </span>
                <button
                  type="button"
                  onClick={handleSaveAndRefresh}
                  className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-200 dark:hover:bg-[var(--surface)]"
                >
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={onExit}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                >
                  Exit
                </button>
              </div>
            </header>

            {safeDisplay.allow_scoreboard && (isHeadToHeadLike || isCombatMode) && (
              <div className="py-3 sm:py-5">
                <ScoreboardDisplay
                  match={match}
                  sportProfile={sportProfile}
                  matchPhaseLabel={matchPhaseLabel}
                  presentation={scoreboardPresentation}
                  team1LiveScore={team1LiveScore}
                  team2LiveScore={team2LiveScore}
                  winnerTeamId={asInt(liveState?.match_result?.winner_team_id) || asInt(match?.winner_team_id)}
                  isClockEnabled={isClockEnabled}
                  clockValue={formatClock(effectiveGameClockSeconds)}
                  clockRunning={isGameClockRunning}
                  clockMilliseconds={effectiveGameClockMilliseconds}
                  clockControls={primaryClockControls}
                  onClockControlSubmit={handleClockControlSubmit}
                  getClockControlDisabledReason={quickControlDisabledReason}
                  isPeriodEnabled={isPeriodEnabled}
                  sportStateMode={sportStateMode}
                  sportStateLabel={sportStateLabel}
                  sportStateTeamId={sportStateTeamId}
                  onStateOverrideApply={(teamId) =>
                    handleStateOverrideApply({
                      teamId,
                      control: stateOverrideControl,
                      label: sportStateLabel,
                      source: "scoreboard",
                    })
                  }
                  isApplyingStateOverride={isApplyingStateOverride}
                  canApplyStateOverride={Boolean(canComposerSubmit && stateOverrideControl)}
                  teamOptions={teamOptions}
                  secondaryClock={secondaryClockConfig.enabled && canComposerSubmit ? {
                    config: secondaryClockConfig,
                    state: secondaryClockState,
                    suggestion: secondaryClockSuggestion,
                    disabled: secondaryClockDisabled,
                    disabledReason: secondaryClockDisabledReason,
                    onStart: handleSecondaryClockStart,
                    onPause: handleSecondaryClockPause,
                    onResetDefault: () => applySecondaryClockReset(secondaryClockConfig.defaultSeconds, "Full reset"),
                    onResetAlternate: () => applySecondaryClockReset(secondaryClockConfig.alternateSeconds, "Short reset"),
                    onAdjust: handleSecondaryClockAdjust,
                    onApplySuggestion: () => applySecondaryClockReset(
                      secondaryClockSuggestion?.seconds,
                      secondaryClockSuggestion?.reason || "Suggested reset applied"
                    ),
                    onDismissSuggestion: () => setSecondaryClockSuggestion(null),
                  } : null}
                />
              </div>
            )}

            {!completedMatch && specializedEngineType && (
              <SpecializedScoringPanel
                engineType={specializedEngineType}
                config={validatedConfig}
                liveState={liveState}
                participants={participantRowsForResultMode}
                canWrite={canComposerSubmit}
                isSubmitting={isSubmitting || isUndoing}
                onSubmit={handleSpecializedEventRequest}
              />
            )}

            {completedMatch ? (
              <ResultCorrectionPanel match={match} completed={completedMatch} />
            ) : null}

            {completedMatch ? (
              <MatchCompletionPanel presentation={completionPresentation} />
            ) : hasDedicatedSpecializedEntry ? null : isHeadToHeadLike ? (
              <div className="grid gap-3">
                {completedMatch ? (
                  null
                ) : isRoleReadOnly ? (
                  <p className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
                    Live score is available in read-only mode.
                  </p>
                ) : !canComposerSubmit ? (
                  <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
                    {isConfigBlocked
                      ? "The Match rules are not ready for live scoring. Review and approve the rule profile before continuing."
                      : "Scoring is not available for the current Match status."}
                  </p>
                ) : (
                  <>
                    {teamOptions.length > 0 && resolvedParticipants.some((participant) => participant.members.length > 0) ? (
                      <ParticipantPlayerStrip
                        participants={timedTeamParticipants}
                        selectedTeamId={formState.selectedTeamId}
                        selectedPlayerId={formState.selectedPlayerId}
                        onSelectPlayer={({ teamId, playerId }) => {
                          formActions.setSelectedTeamId(String(teamId));
                          formActions.setSelectedPlayerId(String(playerId));
                        }}
                        substitutionControl={lineupUi.supportsSubstitution ? substitutionControl : null}
                        onSubstitute={handleTimedTeamSubstitution}
                        disabled={!canComposerSubmit || isSubmitting || isUndoing}
                      />
                    ) : null}
                    {/* Legacy global participant/player selector retained temporarily for reference.
                      <section className="border-b border-[var(--border-soft)] pb-4" aria-labelledby="action-player-title">
                        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] sm:items-end">
                          <div>
                            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Participant</p>
                            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Participant for next action">
                              {teamOptions.map((team) => {
                                const selected = Number(actionContextTeamId) === Number(team.id);
                                return <button key={`action-team-${team.id}`} type="button" aria-pressed={selected} onClick={() => { formActions.setSelectedTeamId(String(team.id)); formActions.setSelectedPlayerId(""); }} className={`min-h-10 rounded-lg border px-3 py-2 text-sm font-semibold transition ${selected ? "border-cyan-600 bg-cyan-50 text-cyan-800 ring-1 ring-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-100" : "border-[var(--border-soft)] bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--text-main)]"}`}>{getShortTeamName(team.name)}</button>;
                              })}
                            </div>
                          </div>
                          <div>
                            <label id="action-player-title" htmlFor="action-player-select" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Player involved</label>
                            <select
                              id="action-player-select"
                              value={formState.selectedPlayerId || ""}
                              onChange={(event) => formActions.setSelectedPlayerId(event.target.value)}
                              className="min-h-11 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--text-main)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                            >
                              <option value="">No player selected</option>
                              {actionContextPlayers.map((player) => <option key={`action-player-${actionContextTeamId}-${player.id}`} value={String(player.id)}>{playerDisplayName(player)}</option>)}
                            </select>
                          </div>
                        </div>
                        <p className="mt-2 text-sm font-medium text-[var(--text-main)]" aria-live="polite">
                          {formState.selectedPlayerId
                            ? `Recording for: ${playerDisplayName(actionContextPlayers.find((player) => Number(player.id) === Number(formState.selectedPlayerId)))}`
                            : "No player selected — optional actions can still be recorded."}
                        </p>
                      </section>
                    */}
                    <SportActionPanel
                      config={validatedConfig}
                      sportCode={scoringSportCode}
                      participants={scoringParticipants}
                      selectedParticipantId={formState.selectedTeamId}
                      selectedPlayerId={formState.selectedPlayerId}
                      selectedPlayerLabel={formState.selectedPlayerId
                        ? selectedParticipant?.members?.find((player) => Number(player.playerId) === Number(formState.selectedPlayerId))?.displayName || ""
                        : ""}
                      canWrite={canComposerSubmit}
                      isSubmitting={isSubmitting || isUndoing}
                      getDisabledReason={quickControlDisabledReason}
                      onAction={handleSportActionRequest}
                      onOpenDetailedControls={openDetailedControls}
                    />
                  </>
                )}
                {showDetailedComposer && detailedValidatedConfig && !completedMatch && !isRoleReadOnly && !normalizeSportKey(sportKey || "").includes("volleyball") && !normalizeSportKey(sportKey || "").includes("takraw") ? (
                  <details open className="rounded-2xl bg-[var(--surface-soft)] p-3">
                    <summary className="cursor-pointer text-sm font-semibold text-[var(--text-main)]">Player and substitution controls</summary>
                    <div className="mt-3">
                  <ComposerUI
                    embedded
                    validatedConfig={detailedValidatedConfig}
                    isLoading={isLoading}
                    selectedControlId={selectedControlId}
                    handleControlSelect={formActions.handleControlSelect}
                    selectedControl={selectedControl}
                    selectedEventDefinition={selectedEventDefinition}
                    uiRules={uiRules}
                    teamOptions={teamOptions}
                    playerOptions={playerOptions}
                    isRosterLoading={isRosterLoading}
                    formState={formState}
                    formActions={formActions}
                    handleSubmitEvent={handleSubmitEvent}
                    isSubmitting={isSubmitting}
                    canWrite={canComposerSubmit}
                    isRoleReadOnly={isRoleReadOnly || isConfigBlocked}
                    quickControlDisabledReason={quickControlDisabledReason}
                    configStatus={normalizedConfigStatus}
                    safeModeResponse={safeModePayload}
                    onRefreshConfig={handleRefreshConfig}
                    onReloadState={handleRefreshLiveState}
                    lineupUi={lineupUi}
                    sportStateMode={sportStateMode}
                    sportStateTeamId={sportStateTeamId}
                    scoringMode={scoringMode}
                    sportKey={sportKey}
                    participantState={participantState}
                    rosterByTeamId={rosterByTeamId}
                    participantUnitType={participantUnitType}
                    recentEventTypes={recentEventTypes}
                    suggestedActionPreferenceKey={suggestedActionPreferenceKey}
                    onStateOverrideApply={handleStateOverrideApply}
                    pendingStateSuggestion={pendingStateSuggestion}
                    onApplyPendingStateSuggestion={applyPendingStateSuggestion}
                    onDismissPendingStateSuggestion={dismissPendingStateSuggestion}
                    isApplyingStateOverride={isApplyingStateOverride}
                    substitutionControl={substitutionControl}
                    onPrepareSubstitution={handlePrepareSubstitution}
                    handleUndoLastEvent={requestUndoLastEvent}
                    canUndoEvents={canUndoEvents}
                    isUndoing={isUndoing}
                    eventCount={liveState?.event_count}
                  />
                    </div>
                  </details>
                ) : null}
              </div>
            ) : (
              <>
                <div className="rounded-2xl border border-slate-200 bg-white/85 p-3.5 shadow-md shadow-slate-300/30 dark:border-slate-700/80 dark:bg-slate-950/60 dark:shadow-lg dark:shadow-slate-950/25">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5 dark:border-slate-800">
                    <div>
                      <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
                        <span>{isCombatMode ? "Combat Console" : isMultiParticipantResultMode ? "Result Entry Mode" : "Board Game Mode"}</span>
                        {isCombatMode && (
                          <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-extrabold uppercase text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200">
                            {matchPhaseLabel || "Round"}
                          </span>
                        )}
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                        {isCombatMode
                          ? "Ringside operator console with corner-targeted actions, round advance, and stoppage controls."
                          : isMultiParticipantResultMode
                          ? "This sport uses result-entry flow. Team-vs-team controls are hidden by design."
                          : "Sport-specific action mode is active. Lineup and possession controls are hidden for this profile."}
                      </p>
                    </div>
                  </div>

                  {isCombatMode && participantRowsForResultMode.length >= 2 ? (
                    <div className="mt-3 space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        {/* RED CORNER (Side 1) */}
                        {(() => {
                          const red = participantRowsForResultMode[0];
                          const redStats = liveState?.team_stats?.[String(red?.teamId)] || {};
                          const redKnockdowns = Number(redStats?.KNOCKDOWN || 0);
                          const redWarnings = Number(redStats?.WARNING || 0);
                          return (
                            <div className="rounded-xl border border-red-300/80 bg-red-50/40 p-3 dark:border-red-800/50 dark:bg-red-950/20">
                              <div className="flex items-center justify-between gap-2">
                                <span className="rounded-full bg-red-600 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                                  Red Corner
                                </span>
                                <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                                  <span>KD: <strong className="font-mono text-red-600 dark:text-red-400">{redKnockdowns}</strong></span>
                                  <span>Warn: <strong className="font-mono text-amber-600 dark:text-amber-400">{redWarnings}</strong></span>
                                </div>
                              </div>
                              <p className="mt-2 text-sm font-bold text-slate-900 dark:text-slate-100">{red.label}</p>
                              {Array.isArray(red.activePlayers) && red.activePlayers.length > 0 && (
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  Athlete: {red.activePlayers.map((p) => String(p?.name || `#${p?.id || "-"}`)).join(", ")}
                                </p>
                              )}

                              <div className="mt-3 grid grid-cols-2 gap-1.5">
                                {modeActionControls
                                  .filter((c) => ["KNOCKDOWN", "WARNING", "ROUND_WARNING", "ROUND_WIN", "PUNCH"].includes(String(c.event_type || "").toUpperCase()))
                                  .slice(0, 4)
                                  .map((control) => {
                                    const disabled = !canComposerSubmit || isSubmitting || isUndoing || control?.enabled === false;
                                    const isKnockdown = String(control.event_type).toUpperCase() === "KNOCKDOWN";
                                    const isRoundWin = String(control.event_type).toUpperCase() === "ROUND_WIN";
                                    return (
                                      <button
                                        key={`red-${control.id || control.event_type}`}
                                        type="button"
                                        disabled={disabled}
                                        onClick={() => handleModeActionSubmit(control, red)}
                                        className={`rounded-lg px-2.5 py-2 text-xs font-bold transition disabled:opacity-50 ${
                                          isKnockdown
                                            ? "bg-red-600 text-white hover:bg-red-500 shadow-xs"
                                            : isRoundWin
                                            ? "bg-emerald-600 text-white hover:bg-emerald-500"
                                            : "border border-red-200 bg-white text-red-900 hover:bg-red-100 dark:border-red-900/60 dark:bg-slate-900 dark:text-red-200 dark:hover:bg-red-950/40"
                                        }`}
                                      >
                                        {getActionDisplayLabel(control)}
                                      </button>
                                    );
                                  })}
                              </div>
                            </div>
                          );
                        })()}

                        {/* BLUE CORNER (Side 2) */}
                        {(() => {
                          const blue = participantRowsForResultMode[1];
                          const blueStats = liveState?.team_stats?.[String(blue?.teamId)] || {};
                          const blueKnockdowns = Number(blueStats?.KNOCKDOWN || 0);
                          const blueWarnings = Number(blueStats?.WARNING || 0);
                          return (
                            <div className="rounded-xl border border-blue-300/80 bg-blue-50/40 p-3 dark:border-blue-800/50 dark:bg-blue-950/20">
                              <div className="flex items-center justify-between gap-2">
                                <span className="rounded-full bg-blue-600 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                                  Blue Corner
                                </span>
                                <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                                  <span>KD: <strong className="font-mono text-blue-600 dark:text-blue-400">{blueKnockdowns}</strong></span>
                                  <span>Warn: <strong className="font-mono text-amber-600 dark:text-amber-400">{blueWarnings}</strong></span>
                                </div>
                              </div>
                              <p className="mt-2 text-sm font-bold text-slate-900 dark:text-slate-100">{blue.label}</p>
                              {Array.isArray(blue.activePlayers) && blue.activePlayers.length > 0 && (
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  Athlete: {blue.activePlayers.map((p) => String(p?.name || `#${p?.id || "-"}`)).join(", ")}
                                </p>
                              )}

                              <div className="mt-3 grid grid-cols-2 gap-1.5">
                                {modeActionControls
                                  .filter((c) => ["KNOCKDOWN", "WARNING", "ROUND_WARNING", "ROUND_WIN", "PUNCH"].includes(String(c.event_type || "").toUpperCase()))
                                  .slice(0, 4)
                                  .map((control) => {
                                    const disabled = !canComposerSubmit || isSubmitting || isUndoing || control?.enabled === false;
                                    const isKnockdown = String(control.event_type).toUpperCase() === "KNOCKDOWN";
                                    const isRoundWin = String(control.event_type).toUpperCase() === "ROUND_WIN";
                                    return (
                                      <button
                                        key={`blue-${control.id || control.event_type}`}
                                        type="button"
                                        disabled={disabled}
                                        onClick={() => handleModeActionSubmit(control, blue)}
                                        className={`rounded-lg px-2.5 py-2 text-xs font-bold transition disabled:opacity-50 ${
                                          isKnockdown
                                            ? "bg-blue-600 text-white hover:bg-blue-500 shadow-xs"
                                            : isRoundWin
                                            ? "bg-emerald-600 text-white hover:bg-emerald-500"
                                            : "border border-blue-200 bg-white text-blue-900 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-slate-900 dark:text-blue-200 dark:hover:bg-blue-950/40"
                                        }`}
                                      >
                                        {getActionDisplayLabel(control)}
                                      </button>
                                    );
                                  })}
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Bout / Round Advancement & Stoppage Controls */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-2.5 dark:border-slate-800">
                        <div className="flex flex-wrap items-center gap-2">
                          {modeActionControls
                            .filter((c) => ["ROUND_ADVANCE", "ROUND_END"].includes(String(c.event_type || "").toUpperCase()))
                            .map((control) => (
                              <button
                                key={control.id || control.event_type}
                                type="button"
                                disabled={!canComposerSubmit || isSubmitting || isUndoing}
                                onClick={() => handleModeActionSubmit(control, null)}
                                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-xs hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                              >
                                Advance to Next Round →
                              </button>
                            ))}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {modeActionControls
                            .filter((c) => ["KO", "TKO", "DQ_WIN", "KNOCKOUT", "TECHNICAL_KNOCKOUT"].includes(String(c.event_type || "").toUpperCase()))
                            .map((control) => (
                              <button
                                key={control.id || control.event_type}
                                type="button"
                                disabled={!canComposerSubmit || isSubmitting || isUndoing}
                                onClick={() => handleSportActionRequest(control, participantRowsForResultMode[0])}
                                className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800 hover:bg-rose-100 disabled:opacity-50 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200 dark:hover:bg-rose-900/40"
                              >
                                End Bout ({getActionDisplayLabel(control)})
                              </button>
                            ))}
                        </div>
                      </div>
                    </div>
                  ) : participantRowsForResultMode.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {participantRowsForResultMode.map((row) => (
                        <div key={row.key} className="rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-2 dark:border-slate-800 dark:bg-slate-900/70">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{row.label}</p>
                            <div className="flex items-center gap-2">
                              {isBoardGameMode ? (
                                <span className="text-xl font-black tabular-nums text-slate-900 dark:text-white" aria-label={`${row.label} result points`}>
                                  {Number(row.side) === 1 ? scoreboardPresentation.score.sideA : scoreboardPresentation.score.sideB}
                                </span>
                              ) : null}
                              <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                {sportUiProfile?.participantModel === "LANE" ? `Lane ${row.side}` : `Side ${row.side}`}
                              </span>
                            </div>
                          </div>
                          {Array.isArray(row.activePlayers) && row.activePlayers.length > 0 && (
                            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                              Active: {row.activePlayers.map((p) => String(p?.name || `#${p?.id || "-"}`)).join(", ")}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                      Result-entry layout is available, but this sport needs participant/heat data to enable full scoring.
                    </div>
                  )}

                  {!isCombatMode && modeActionControls.length > 0 ? (
                    <div className="mt-3">
                      <p className="mb-1 text-xs font-semibold tracking-wide text-slate-600 dark:text-slate-400">Quick Actions</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {modeActionControls.slice(0, 8).flatMap((control) => {
                          const disabled = !canComposerSubmit || isSubmitting || isUndoing || control?.enabled === false;
                          const label = getActionDisplayLabel(control);
                          const tooltip = getActionTooltip(control);
                          const targets = isBoardGameMode && control?.requires_team
                            ? participantRowsForResultMode
                            : [participantRowsForResultMode[0]];
                          return targets.map((target) => (
                            <button
                              key={`${String(control?.id || control?.event_type)}-${target?.teamId || "match"}`}
                              type="button"
                              disabled={disabled}
                              title={tooltip}
                              onClick={() => handleModeActionSubmit(control, target)}
                              className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-left text-xs font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:border-slate-500"
                            >
                              {label}{isBoardGameMode && control?.requires_team && target?.label ? `: ${target.label}` : ""}
                            </button>
                          ));
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
                {!isMultiParticipantResultMode && (
                  <ComposerUI
                    validatedConfig={validatedConfig}
                    isLoading={isLoading}
                    selectedControlId={selectedControlId}
                    handleControlSelect={formActions.handleControlSelect}
                    selectedControl={selectedControl}
                    selectedEventDefinition={selectedEventDefinition}
                    uiRules={uiRules}
                    teamOptions={teamOptions}
                    playerOptions={playerOptions}
                    isRosterLoading={isRosterLoading}
                    formState={formState}
                    formActions={formActions}
                    handleSubmitEvent={handleSubmitEvent}
                    isSubmitting={isSubmitting}
                    canWrite={canComposerSubmit}
                    isRoleReadOnly={isRoleReadOnly || isConfigBlocked}
                    quickControlDisabledReason={quickControlDisabledReason}
                    configStatus={normalizedConfigStatus}
                    safeModeResponse={safeModePayload}
                    onRefreshConfig={handleRefreshConfig}
                    onReloadState={handleRefreshLiveState}
                    lineupUi={lineupUi}
                    sportStateMode={sportStateMode}
                    sportStateTeamId={sportStateTeamId}
                    scoringMode={scoringMode}
                    sportKey={sportKey}
                    participantState={participantState}
                    rosterByTeamId={rosterByTeamId}
                    participantUnitType={participantUnitType}
                    recentEventTypes={recentEventTypes}
                    suggestedActionPreferenceKey={suggestedActionPreferenceKey}
                    onStateOverrideApply={handleStateOverrideApply}
                    pendingStateSuggestion={pendingStateSuggestion}
                    onApplyPendingStateSuggestion={applyPendingStateSuggestion}
                    onDismissPendingStateSuggestion={dismissPendingStateSuggestion}
                    isApplyingStateOverride={isApplyingStateOverride}
                    substitutionControl={substitutionControl}
                    onPrepareSubstitution={handlePrepareSubstitution}
                    handleUndoLastEvent={requestUndoLastEvent}
                    canUndoEvents={canUndoEvents}
                    isUndoing={isUndoing}
                    eventCount={liveState?.event_count}
                  />
                )}
              </>
            )}

            {(isHeadToHeadLike || isCombatMode) && (!specializedEngineType || statisticsPresentation.aggregate) && (
              <section className="border-t border-[var(--border-soft)] pt-4" aria-labelledby="performance-title">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 id="performance-title" className="text-base font-semibold text-[var(--text-main)]">Performance</h2>
                  <div className="inline-flex rounded-lg border border-slate-300 bg-slate-100/80 p-0.5 dark:border-slate-700 dark:bg-slate-900/70">
                    {statisticsPresentation.aggregate ? <button
                      type="button"
                      onClick={() => setStatsViewMode("team")}
                      className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                        statsViewMode === "team"
                          ? "bg-cyan-500/20 text-cyan-800 dark:text-cyan-100"
                          : "text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                      }`}
                    >
                      {statisticsPresentation.aggregate}
                    </button> : null}
                    {statisticsPresentation.individual && !specializedEngineType ? <button
                      type="button"
                      onClick={() => setStatsViewMode("player")}
                      className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                        statsViewMode === "player"
                          ? "bg-cyan-500/20 text-cyan-800 dark:text-cyan-100"
                          : "text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                      }`}
                    >
                      {statisticsPresentation.individual}
                    </button> : null}
                  </div>
                </div>

                {statsViewMode === "team" || Boolean(specializedEngineType) ? (
                  teamStatsTableRows.length > 0 ? (
                    <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800/80">
                      <table className="min-w-full text-sm text-slate-700 dark:text-slate-200">
                        <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-900/80 dark:text-slate-400">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold">Metric</th>
                            {teamOptions.map((teamOption) => (
                              <th key={`team-stats-head-${teamOption.id}`} className="px-3 py-2 text-right font-semibold" title={teamOption.name}>
                                {getShortTeamName(teamOption.name)}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {teamStatsTableRows.map((row) => (
                            <tr key={`team-stats-row-${row.key}`} className="border-t border-slate-200 dark:border-slate-800/70">
                              <td className="px-3 py-2 text-left text-slate-700 dark:text-slate-300">{row.label}</td>
                              {teamOptions.map((teamOption) => (
                                <td key={`team-stats-value-${row.key}-${teamOption.id}`} className="px-3 py-2 text-right font-mono">
                                  {Number(row.values?.[String(teamOption.id)] || 0)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">No team stats available yet.</p>
                  )
                ) : (
                  <>
                    {teamOptions.length > 1 && (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {teamOptions.map((teamOption) => {
                          const isActive = Number(teamOption.id) === Number(activePlayerStatsTeamId || 0);
                          return (
                            <button
                              key={`player-stats-team-toggle-${teamOption.id}`}
                              type="button"
                              title={teamOption.name}
                              onClick={() => setPlayerStatsTeamFilterId(String(teamOption.id))}
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
                                isActive
                                  ? "border-cyan-500/70 bg-cyan-500/20 text-cyan-800 dark:text-cyan-100"
                                  : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-500"
                              }`}
                            >
                              {getShortTeamName(teamOption.name)}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {showAllPlayerStatRows
                          ? `Showing all players (${playerStatsRowsWithRoster.length})`
                          : `Showing players with activity (${playerStatsRowsCollapsed.length})`}
                      </p>
                      {playerStatsRowsWithRoster.length > playerStatsRowsCollapsed.length && (
                        <button
                          type="button"
                          onClick={() => setShowAllPlayerStatRows((current) => !current)}
                          className="text-xs font-semibold text-cyan-700 underline underline-offset-2 hover:text-cyan-600 dark:text-cyan-300 dark:hover:text-cyan-200"
                        >
                          {showAllPlayerStatRows ? "Show less players" : "Show all players"}
                        </button>
                      )}
                    </div>
                    <div className="mt-2">
                      <PlayerPerformanceTable
                        columns={playerStatsTable.columns}
                        secondaryColumns={playerStatsTable.secondaryColumns}
                        rows={visiblePlayerStatsRows}
                        participantLabel={participantUnitType === "DUO" ? "Duo" : participantUnitType === "TEAM" ? "Team" : "Participant"}
                        emptyMessage={selectedParticipant?.resolutionStatus !== "resolved"
                          ? "Participant unavailable."
                          : playerStatsRowsWithRoster.length > 0
                            ? "No recorded player activity. Show all players to view the full roster."
                            : "Player statistics unavailable for this scoring mode."}
                      />
                    </div>
                  </>
                )}
              </section>
            )}

          </main>

          <aside className="space-y-3">
            <details className="rounded-2xl bg-[var(--surface-soft)] p-3.5">
              <summary className="cursor-pointer text-sm font-semibold text-slate-900 dark:text-slate-100">Match Overview</summary>
              <div className="mt-3">
                <MatchSummaryPanel
                  match={match}
                  liveState={liveState}
                  sportProfile={sportProfile}
                  isRoleReadOnly={isRoleReadOnly || isConfigBlocked}
                  canWrite={canComposerSubmit}
                  latestViolation={latestViolation}
                  sportDefinition={validatedConfig?.sport_definition}
                />
              </div>
            </details>

            {safeDisplay.allow_timeline && (
              <section className="rounded-2xl bg-[var(--surface-soft)] p-3.5" aria-labelledby="recent-actions-title">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 id="recent-actions-title" className="text-base font-semibold text-slate-900 dark:text-slate-100">Recent actions</h3>
                  {canUndoEvents ? (
                    <button
                      type="button"
                      onClick={requestUndoLastEvent}
                      disabled={isUndoing || Number(liveState?.event_count || 0) <= 0}
                      className="min-h-9 rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] px-2.5 text-xs font-semibold text-[var(--text-main)] transition hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isUndoing ? "Undoing…" : "Undo last action"}
                    </button>
                  ) : null}
                </div>
                <LiveTimeline
                  timelineWithEffects={timelineWithEffects}
                  canDeleteEvents={false}
                  isDeletingById={{}}
                  handleDeleteEvent={() => {}}
                />
              </section>
            )}
            {systemStatusCard}
            <RulesSummaryPanel
              snapshot={ruleSnapshotMeta}
              configStatus={normalizedConfigStatus}
              validatedConfig={validatedConfig}
              rawEventConfig={configResponseSnapshot?.event_config}
              sportName={sportDefinition?.sport || match?.sport_name || ""}
              liveState={liveState}
              serviceOwnerLabel={resolveTeamName(liveState?.service_state?.server_team_id)}
            />

            {debugMode && (
              <AdvancedDebugPanel
                isReplayLoading={isReplayLoading}
                replayError={replayError}
                replaySnapshot={replaySnapshot}
                replayUntilSequence={replayUntilSequence}
                setReplayUntilSequence={setReplayUntilSequence}
                handleReplaySequenceSubmit={handleReplaySequenceSubmit}
                handleReplayRebuild={handleReplayRebuild}
                replayTimeline={replayTimeline}
                resolveTeamName={resolveTeamName}
                formatTimelineTime={formatTimelineTime}
                summarizeScoreMap={summarizeScoreMap}
                summarizeScoreDelta={summarizeScoreDelta}
              />
            )}
          </aside>
        </div>
        )}
      </div>

      <AppModal
        open={Boolean(pendingCompletion)}
        onClose={() => !isSubmitting && setPendingCompletion(null)}
        title="Confirm result"
        subtitle="This action will complete the Match and update the bracket and standings."
        maxWidthClass="max-w-md"
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-[var(--surface-soft)] px-4 py-3">
            <p className="text-sm font-semibold text-[var(--text-main)]">
              {getActionPresentation(pendingCompletion?.eventType).label}
            </p>
            {pendingCompletion?.participant?.label ? (
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Result for {pendingCompletion.participant.label}
              </p>
            ) : null}
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPendingCompletion(null)}
              disabled={isSubmitting}
              className="min-h-11 rounded-xl border border-[var(--border-soft)] px-4 text-sm font-semibold text-[var(--text-main)] hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmCompletion}
              disabled={isSubmitting}
              className="min-h-11 rounded-xl bg-cyan-600 px-4 text-sm font-semibold text-white hover:bg-cyan-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:opacity-50"
            >
              {isSubmitting ? "Confirming…" : "Confirm"}
            </button>
          </div>
        </div>
      </AppModal>

      <AppModal
        open={isUndoConfirmationOpen}
        onClose={() => !isUndoing && setIsUndoConfirmationOpen(false)}
        title="Undo last action?"
        subtitle="The Match state will be rebuilt from the remaining recorded actions."
        maxWidthClass="max-w-md"
      >
        <div className="space-y-4">
          <p className="rounded-xl bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--text-main)]">
            {timelineWithEffects[0]
              ? `${getActionPresentation(timelineWithEffects[0].event_type).label}${timelineWithEffects[0].team_name ? ` — ${timelineWithEffects[0].team_name}` : ""}`
              : "No recorded action is available to undo."}
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsUndoConfirmationOpen(false)}
              disabled={isUndoing}
              className="min-h-11 rounded-xl border border-[var(--border-soft)] px-4 text-sm font-semibold text-[var(--text-main)] hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmUndoLastEvent}
              disabled={isUndoing || !timelineWithEffects[0]}
              className="min-h-11 rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 disabled:opacity-50"
            >
              {isUndoing ? "Undoing…" : "Undo action"}
            </button>
          </div>
        </div>
      </AppModal>
    </div>
  );
};

export default LiveScoringDashboard;
