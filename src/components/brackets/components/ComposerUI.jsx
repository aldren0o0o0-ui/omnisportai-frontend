import React, { useEffect, useMemo, useState } from "react";
import SafeModePanel from "./SafeModePanel";
import {
  getActionDisplayLabel,
  getActionTooltip,
  getContextPlayersForState,
  getActionCategory,
  normalizeActionGroup,
  getPlayerListChipLabel,
  getShortPlayerName,
  getShortTeamName,
  getSuggestedActionsForSport,
  getSportStateLabel,
  isStateOverrideControl,
} from "../utils/displayLabels";

const controlStyleClassMap = {
  score: "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-500/45 dark:bg-blue-500/15 dark:text-blue-100 dark:hover:bg-blue-500/25",
  success: "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/45 dark:bg-emerald-500/15 dark:text-emerald-100 dark:hover:bg-emerald-500/25",
  primary: "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-500/45 dark:bg-blue-500/15 dark:text-blue-100 dark:hover:bg-blue-500/25",
  secondary: "border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-slate-600/85 dark:bg-slate-800/95 dark:text-slate-200 dark:hover:bg-slate-700",
  warning: "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-500/45 dark:bg-amber-500/15 dark:text-amber-100 dark:hover:bg-amber-500/25",
  warn: "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-500/45 dark:bg-amber-500/15 dark:text-amber-100 dark:hover:bg-amber-500/25",
  danger: "border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-500/45 dark:bg-rose-500/15 dark:text-rose-100 dark:hover:bg-rose-500/25",
  neutral: "border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700/90 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:bg-slate-800"
};

const groupPriority = ["scoring", "stats", "clock", "phase", "violations", "match", "possession", "substitutions", "other"];

const inferGroupFromControl = (control = {}, sportKey = "", validatedConfig = null) =>
  getActionCategory(control, sportKey, validatedConfig);

const groupLabelMap = {
  clock: "Clock",
  phase: "Period",
  possession: "State",
  scoring: "Scoring",
  stats: "Stats",
  violations: "Fouls",
  substitutions: "Players",
  match: "Match",
  other: "Other"
};

const sportAwareGroupLabel = (group, sportKey) => {
  const key = String(sportKey || "").toLowerCase();
  if (group === "phase") {
    if (key.includes("boxing") || key.includes("judo") || key.includes("karate")) return "Round";
    if (key.includes("baseball") || key.includes("softball")) return "Inning";
    if (key.includes("tennis")) return "Set/Game";
    return "Period";
  }
  if (group === "violations") {
    if (key.includes("tennis") || key.includes("badminton")) return "Faults";
    if (key.includes("boxing")) return "Penalties";
    return "Fouls";
  }
  if (group === "possession") {
    if (key.includes("tennis") || key.includes("badminton")) return "Service";
    if (key.includes("baseball") || key.includes("softball")) return "Batting";
    return "State";
  }
  if (group === "substitutions") {
    if (key.includes("baseball") || key.includes("softball")) return "Lineup";
    return "Players";
  }
  if (group === "stats") return "Stats";
  if (groupLabelMap[group]) return groupLabelMap[group];
  return humanizeGroup(group);
};

const humanizeGroup = (group) => {
  if (groupLabelMap[group]) return groupLabelMap[group];
  return String(group || "Other Controls")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const getContextLabel = (sportStateMode, sportKey) => {
  const mode = String(sportStateMode || "").toLowerCase();
  const key = String(sportKey || "").toLowerCase();
  if (mode === "none") return "Participant";
  if (mode === "server") {
    if (key.includes("badminton") || key.includes("tennis")) return "Service Side";
    return "Server Team";
  }
  if (mode === "batting") return "Batting Team";
  if (mode === "athlete") return "Athlete";
  if (mode === "possession") return "Possession Team";
  return "Participant";
};

const groupControls = (controls = [], sportKey = "", validatedConfig = null) => {
  const buckets = new Map();
  controls.forEach((control) => {
    const group = inferGroupFromControl(control, sportKey, validatedConfig);
    if (!buckets.has(group)) buckets.set(group, []);
    buckets.get(group).push(control);
  });
  return Array.from(buckets.entries())
    .sort((a, b) => {
      const aPriority = groupPriority.indexOf(a[0]);
      const bPriority = groupPriority.indexOf(b[0]);
      return (aPriority === -1 ? 999 : aPriority) - (bPriority === -1 ? 999 : bPriority);
    })
    .map(([group, rows]) => ({ group, label: humanizeGroup(group), controls: rows }));
};

const sortControlsByPriority = (rows = []) =>
  [...rows].sort((a, b) => {
    const aPriority = Number(a?.priority);
    const bPriority = Number(b?.priority);
    const safeA = Number.isFinite(aPriority) ? aPriority : 9999;
    const safeB = Number.isFinite(bPriority) ? bPriority : 9999;
    return safeA - safeB;
  });

const mergeDedupedGroups = (groups = []) => {
  const rows = Array.isArray(groups) ? groups.filter((row) => row && typeof row === "object") : [];
  const byGroup = new Map();

  rows.forEach((groupRow, groupIndex) => {
    const groupKey = normalizeActionGroup(groupRow?.group || groupRow?.id || groupRow?.label || "") || "other";
    if (!byGroup.has(groupKey)) {
      byGroup.set(groupKey, {
        group: groupKey,
        label: String(groupRow?.label || humanizeGroup(groupKey)).trim() || humanizeGroup(groupKey),
        priority: Number(groupRow?.priority),
        controls: [],
        _controlKeys: new Set(),
        _firstSeenOrder: groupIndex,
      });
    }

    const target = byGroup.get(groupKey);
    const incomingPriority = Number(groupRow?.priority);
    const currentPriority = Number(target.priority);
    if (Number.isFinite(incomingPriority) && (!Number.isFinite(currentPriority) || incomingPriority < currentPriority)) {
      target.priority = incomingPriority;
    }

    const controls = Array.isArray(groupRow?.controls) ? groupRow.controls : [];
    controls.forEach((controlRow, controlIndex) => {
      if (!controlRow || typeof controlRow !== "object") return;
      const eventTypeKey = String(controlRow?.event_type || controlRow?.type || "").trim().toUpperCase();
      const idKey = String(controlRow?.id || "").trim();
      const controlKey = idKey || eventTypeKey || `idx-${groupIndex}-${controlIndex}`;
      if (target._controlKeys.has(controlKey)) return;
      target._controlKeys.add(controlKey);
      target.controls.push(controlRow);
    });
  });

  return Array.from(byGroup.values())
    .map((row) => ({
      group: row.group,
      label: row.label,
      priority: row.priority,
      controls: sortControlsByPriority(row.controls),
      _firstSeenOrder: row._firstSeenOrder,
    }))
    .sort((a, b) => {
      const safeA = Number.isFinite(a.priority) ? a.priority : 9999;
      const safeB = Number.isFinite(b.priority) ? b.priority : 9999;
      if (safeA !== safeB) return safeA - safeB;
      const priorityA = groupPriority.indexOf(a.group);
      const priorityB = groupPriority.indexOf(b.group);
      if (priorityA !== priorityB) {
        return (priorityA === -1 ? 999 : priorityA) - (priorityB === -1 ? 999 : priorityB);
      }
      return Number(a._firstSeenOrder || 0) - Number(b._firstSeenOrder || 0);
    })
    .map(({ _firstSeenOrder, ...row }) => row);
};

const groupedControlsFromBackend = (controls = [], validatedConfig = null, sportKey = "") => {
  const normalizedControls = Array.isArray(controls)
    ? controls.filter((row) => row && typeof row === "object")
    : [];
  const actionGroups = Array.isArray(validatedConfig?.action_groups)
    ? validatedConfig.action_groups
    : Array.isArray(validatedConfig?.ui_spec?.action_groups)
      ? validatedConfig.ui_spec.action_groups
      : [];
  if (actionGroups.length === 0) return [];

  const controlById = new Map(
    normalizedControls
      .map((row) => [String(row.id || "").trim().toLowerCase(), row])
      .filter(([id]) => id)
  );

  const assignedControlIds = new Set();
  const reassignedFallbackBuckets = new Map();
  const groups = actionGroups
    .filter((row) => row && typeof row === "object")
    .map((groupRow, index) => {
      const rawGroupId = String(groupRow.id || groupRow.group || `group-${index}`).trim().toLowerCase();
      const groupId = normalizeActionGroup(rawGroupId) || rawGroupId;
      const label = String(groupRow.label || humanizeGroup(groupId)).trim();
      const controlsInGroup = Array.isArray(groupRow.controls)
        ? groupRow.controls
          .map((controlId) => controlById.get(String(controlId || "").trim().toLowerCase()))
          .filter(Boolean)
          .filter((controlRow) => {
            const fallbackGroup = inferGroupFromControl(controlRow, sportKey, validatedConfig);
            const shouldReassignOutOfOther = groupId === "other" && fallbackGroup !== "other";
            if (shouldReassignOutOfOther) {
              if (!reassignedFallbackBuckets.has(fallbackGroup)) reassignedFallbackBuckets.set(fallbackGroup, []);
              reassignedFallbackBuckets.get(fallbackGroup).push(controlRow);
              return false;
            }
            return true;
          })
        : [];
      controlsInGroup.forEach((controlRow) => assignedControlIds.add(String(controlRow?.id || "")));
      return {
        group: groupId || `group-${index}`,
        label: label || "Controls",
        priority: Number(groupRow.priority),
        controls: sortControlsByPriority(controlsInGroup)
      };
    })
    .filter((row) => row.controls.length > 0);

  const fallbackBuckets = new Map();
  normalizedControls
    .forEach((controlRow) => {
      const controlId = String(controlRow?.id || "");
      if (!controlId || assignedControlIds.has(controlId)) return;
      const fallbackGroup = inferGroupFromControl(controlRow, sportKey, validatedConfig);
      if (!fallbackBuckets.has(fallbackGroup)) fallbackBuckets.set(fallbackGroup, []);
      fallbackBuckets.get(fallbackGroup).push(controlRow);
    });

  reassignedFallbackBuckets.forEach((rows, groupKey) => {
    const existing = fallbackBuckets.get(groupKey) || [];
    fallbackBuckets.set(groupKey, [...existing, ...rows]);
  });

  fallbackBuckets.forEach((rows, groupKey) => {
    groups.push({
      group: groupKey,
      label: humanizeGroup(groupKey),
      priority: 9999,
      controls: sortControlsByPriority(rows),
    });
  });

  return mergeDedupedGroups(groups);
};

const RECENT_ACTION_LIMIT = 8;
const SUGGESTED_VISIBLE_LIMIT = 5;

const ComposerUI = ({
  validatedConfig,
  isLoading,
  selectedControlId,
  handleControlSelect,
  selectedControl,
  selectedEventDefinition,
  uiRules,
  teamOptions,
  playerOptions,
  isRosterLoading,
  formState,
  formActions,
  handleSubmitEvent,
  isSubmitting,
  canWrite,
  isRoleReadOnly,
  quickControlDisabledReason,
  configStatus,
  safeModeResponse,
  onRefreshConfig,
  onReloadState,
  lineupUi,
  sportStateMode,
  sportStateTeamId,
  scoringMode,
  sportKey,
  participantState,
  rosterByTeamId,
  participantUnitType,
  recentEventTypes,
  suggestedActionPreferenceKey,
  onStateOverrideApply,
  pendingStateSuggestion,
  onApplyPendingStateSuggestion,
  onDismissPendingStateSuggestion,
  isApplyingStateOverride,
  substitutionControl,
  onPrepareSubstitution,
  handleUndoLastEvent,
  canUndoEvents,
  isUndoing,
  eventCount,
  embedded = false,
}) => {
  const normalizedStatus = String(configStatus || "").toUpperCase();
  const normalizedScoringMode = String(scoringMode || "HEAD_TO_HEAD").toUpperCase();
  const isBoardGameMode = normalizedScoringMode === "BOARD_GAME";

  const safeUiRules = uiRules && typeof uiRules === "object" ? uiRules : {};
  const shouldShowTeamSelector = Boolean(safeUiRules.shouldShowTeamSelector);
  const shouldShowPlayerSelector = Boolean(safeUiRules.shouldShowPlayerSelector);
  const shouldShowValueInput = Boolean(safeUiRules.shouldShowValueInput);
  const { selectedTeamId, selectedPlayerId } = formState;
  const { setSelectedTeamId, setSelectedPlayerId } = formActions;

  const quickControls = useMemo(
    () => validatedConfig?.controls || [],
    [validatedConfig?.controls]
  );
  const stateOverrideControls = useMemo(() => {
    const mode = String(sportStateMode || "none").toLowerCase();
    if (mode === "none" || mode === "athlete") return [];
    if (mode === "server") return quickControls.filter((control) => isStateOverrideControl(control, "server"));
    if (mode === "batting") return quickControls.filter((control) => isStateOverrideControl(control, "batting"));
    return quickControls.filter((control) => isStateOverrideControl(control, "possession"));
  }, [quickControls, sportStateMode]);
  const hasStateOverrideControl = stateOverrideControls.length > 0;

  const stateOverrideControlIds = useMemo(
    () => new Set(stateOverrideControls.map((control) => String(control?.id || ""))),
    [stateOverrideControls]
  );
  const actionControls = useMemo(
    () =>
      quickControls.filter((control) => {
        if (stateOverrideControlIds.has(String(control?.id || ""))) return false;
        const group = inferGroupFromControl(control, sportKey, validatedConfig);
        return group !== "clock";
      }),
    [quickControls, sportKey, stateOverrideControlIds, validatedConfig]
  );
  const groupedControls = useMemo(() => {
    const backendGroups = groupedControlsFromBackend(actionControls, validatedConfig, sportKey);
    const sourceGroups = backendGroups.length > 0
      ? backendGroups
      : groupControls(sortControlsByPriority(actionControls), sportKey, validatedConfig);
    const deduped = mergeDedupedGroups(sourceGroups);
    return deduped.map((groupRow) => ({
      ...groupRow,
      label: sportAwareGroupLabel(groupRow.group, sportKey)
    }));
  }, [actionControls, sportKey, validatedConfig]);

  const controlToGroup = useMemo(() => {
    const map = new Map();
    groupedControls.forEach((groupRow) => {
      groupRow.controls.forEach((control) => {
        map.set(String(control.id || ""), groupRow.group);
      });
    });
    return map;
  }, [groupedControls]);

  const selectedGroup = controlToGroup.get(String(selectedControlId || "")) || "";
  const [activeGroupId, setActiveGroupId] = useState("");
  const [showBenchPlayers, setShowBenchPlayers] = useState(false);
  const [showCustomizeSuggestedActions, setShowCustomizeSuggestedActions] = useState(false);
  const [showAllSuggestedActions, setShowAllSuggestedActions] = useState(false);
  const [contextTeamOverrideId, setContextTeamOverrideId] = useState("");
  const [manualComposerOpen, setManualComposerOpen] = useState(false);
  const [pinnedSuggestedEventTypes, setPinnedSuggestedEventTypes] = useState([]);
  const [preferredActiveGroupId, setPreferredActiveGroupId] = useState("");
  const [substitutionMode, setSubstitutionMode] = useState(false);
  const [subOut, setSubOut] = useState(null);
  const [subIn, setSubIn] = useState(null);
  const storageKey = useMemo(() => {
    const sport = String(sportKey || "generic").toLowerCase() || "generic";
    const identity = String(suggestedActionPreferenceKey || "anonymous").trim() || "anonymous";
    return `liveScoringSuggestedActions:${sport}:${identity}`;
  }, [sportKey, suggestedActionPreferenceKey]);
  const activeGroupStorageKey = useMemo(() => {
    const sport = String(sportKey || "generic").toLowerCase() || "generic";
    const identity = String(suggestedActionPreferenceKey || "anonymous").trim() || "anonymous";
    return `liveScoringActiveTab:${sport}:${identity}`;
  }, [sportKey, suggestedActionPreferenceKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        setPinnedSuggestedEventTypes([]);
        return;
      }
      const parsed = JSON.parse(raw);
      const normalized = Array.isArray(parsed)
        ? parsed.map((row) => String(row || "").toUpperCase()).filter(Boolean).slice(0, RECENT_ACTION_LIMIT)
        : [];
      setPinnedSuggestedEventTypes(normalized);
    } catch {
      setPinnedSuggestedEventTypes([]);
    }
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = String(window.localStorage.getItem(activeGroupStorageKey) || "").trim().toLowerCase();
      setPreferredActiveGroupId(stored);
    } catch {
      setPreferredActiveGroupId("");
    }
  }, [activeGroupStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(pinnedSuggestedEventTypes.slice(0, RECENT_ACTION_LIMIT)));
    } catch {
      // Ignore storage errors in private mode/quota limits.
    }
  }, [pinnedSuggestedEventTypes, storageKey]);

  useEffect(() => {
    if (!activeGroupId || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(activeGroupStorageKey, String(activeGroupId).toLowerCase());
    } catch {
      // Ignore storage errors in private mode/quota limits.
    }
  }, [activeGroupId, activeGroupStorageKey]);

  const activeNonSuggestedGroup = groupedControls.find((row) => row.group === activeGroupId) || groupedControls[0] || null;
  const suggestedActions = useMemo(
    () =>
      getSuggestedActionsForSport({
        sportKey,
        controls: actionControls,
        backendRecommendedEventTypes: validatedConfig?.ui_spec?.suggested_actions || validatedConfig?.recommended_actions || [],
        pinnedEventTypes: pinnedSuggestedEventTypes,
        recentlyUsedEventTypes: Array.isArray(recentEventTypes) ? recentEventTypes : [],
        activeGroupControls: activeNonSuggestedGroup?.controls || [],
        limit: 6
      }),
    [actionControls, activeNonSuggestedGroup?.controls, pinnedSuggestedEventTypes, recentEventTypes, sportKey, validatedConfig?.recommended_actions, validatedConfig?.ui_spec?.suggested_actions]
  );
  useEffect(() => {
    const hasSuggestedGroup = suggestedActions.length > 0;
    const isActiveGroupValid =
      (activeGroupId === "suggested" && hasSuggestedGroup) ||
      groupedControls.some((row) => row.group === activeGroupId);
    if (activeGroupId && isActiveGroupValid) return;

    const isPreferredGroupValid =
      (preferredActiveGroupId === "suggested" && hasSuggestedGroup) ||
      groupedControls.some((row) => row.group === preferredActiveGroupId);
    if (preferredActiveGroupId && isPreferredGroupValid) {
      setActiveGroupId(preferredActiveGroupId);
      return;
    }
    if (selectedGroup && groupedControls.some((row) => row.group === selectedGroup)) {
      setActiveGroupId(selectedGroup);
      return;
    }
    if (groupedControls.some((row) => row.group === "scoring")) {
      setActiveGroupId("scoring");
      return;
    }
    if (groupedControls.some((row) => row.group === "other")) {
      setActiveGroupId("other");
      return;
    }
    setActiveGroupId(groupedControls[0]?.group || "");
  }, [activeGroupId, groupedControls, preferredActiveGroupId, selectedGroup, suggestedActions.length]);
  const availableSuggestedOptions = useMemo(
    () =>
      sortControlsByPriority(actionControls).map((control) => ({
        id: String(control?.id || ""),
        eventType: String(control?.event_type || "").toUpperCase(),
        label: getActionDisplayLabel(control),
        tooltip: getActionTooltip(control),
      })),
    [actionControls]
  );

  const defaultContextTeamId = useMemo(() => {
    const stateDrivenModes = new Set(["possession", "server", "batting"]);
    const mode = String(sportStateMode || "").toLowerCase();
    const stateTeam = Number(sportStateTeamId || 0);
    if (stateDrivenModes.has(mode) && stateTeam > 0) return stateTeam;
    const selectedTeam = Number(selectedTeamId || 0);
    if (selectedTeam > 0) return selectedTeam;
    if (stateTeam > 0) return stateTeam;
    const firstTeam = Number(teamOptions?.[0]?.id || 0);
    return firstTeam > 0 ? firstTeam : 0;
  }, [selectedTeamId, sportStateMode, sportStateTeamId, teamOptions]);
  const contextTeamId = useMemo(() => {
    const overrideId = Number(contextTeamOverrideId || 0);
    if (overrideId > 0 && teamOptions.some((row) => Number(row.id) === overrideId)) return overrideId;
    return Number(defaultContextTeamId || 0);
  }, [contextTeamOverrideId, defaultContextTeamId, teamOptions]);
  useEffect(() => {
    const mode = String(sportStateMode || "").toLowerCase();
    if (!["possession", "server", "batting"].includes(mode)) return;
    setContextTeamOverrideId("");
  }, [sportStateMode, sportStateTeamId]);
  const contextPlayers = useMemo(
    () =>
      getContextPlayersForState({
        participantState,
        rosterByTeamId,
        teamId: contextTeamId,
        includeBench: showBenchPlayers
      }),
    [contextTeamId, participantState, rosterByTeamId, showBenchPlayers]
  );
  const showingLabel = useMemo(() => {
    const mode = String(sportStateMode || "").toLowerCase();
    if (mode === "athlete") return "Athlete";
    if ((mode === "possession" || mode === "server" || mode === "batting") && Number(sportStateTeamId || 0) > 0) {
      return getContextLabel(sportStateMode, sportKey);
    }
    if (Number(selectedTeamId || 0) > 0) return "Selected Team";
    return "Current Team";
  }, [selectedTeamId, sportKey, sportStateMode, sportStateTeamId]);
  const substitutionDisabledReason = useMemo(() => {
    if (!lineupUi?.supportsSubstitution) return "Substitution not supported for this sport.";
    if (!substitutionControl) return "No substitution action configured.";
    return "";
  }, [lineupUi?.supportsSubstitution, substitutionControl]);
  const canConfirmSubstitution = Boolean(
    substitutionMode &&
    !substitutionDisabledReason &&
    Number(subOut?.teamId) > 0 &&
    Number(subIn?.teamId) > 0 &&
    Number(subOut?.teamId) === Number(subIn?.teamId) &&
    Number(subOut?.playerId) > 0 &&
    Number(subIn?.playerId) > 0
  );
  const suggestedControlIds = useMemo(
    () => new Set(suggestedActions.map((row) => String(row?.id || "")).filter(Boolean)),
    [suggestedActions]
  );
  const visibleSuggestedActions = useMemo(
    () => (showAllSuggestedActions ? suggestedActions : suggestedActions.slice(0, SUGGESTED_VISIBLE_LIMIT)),
    [showAllSuggestedActions, suggestedActions]
  );
  const hasMoreSuggestedActions = suggestedActions.length > SUGGESTED_VISIBLE_LIMIT;
  const tabGroups = useMemo(() => {
    if (suggestedActions.length === 0) return [...groupedControls];
    return [
      {
        group: "suggested",
        label: "Suggested",
        controls: visibleSuggestedActions,
        priority: -1,
      },
      ...groupedControls,
    ];
  }, [groupedControls, suggestedActions.length, visibleSuggestedActions]);
  const activeGroup = tabGroups.find((row) => row.group === activeGroupId) || tabGroups[0] || null;
  const selectedTeamName = useMemo(
    () => teamOptions.find((row) => Number(row.id) === Number(selectedTeamId || 0))?.name || "",
    [selectedTeamId, teamOptions]
  );
  const selectedPlayerName = useMemo(() => {
    const playerId = Number(selectedPlayerId || 0);
    if (!playerId) return "";
    const fromPlayerOptions = playerOptions.find((row) => Number(row?.id) === playerId)?.label || "";
    if (fromPlayerOptions) return fromPlayerOptions;
    const fromContextPlayers = [...contextPlayers.activePlayers, ...contextPlayers.benchPlayers]
      .find((row) => Number(row?.id) === playerId)?.name || "";
    if (fromContextPlayers) return fromContextPlayers;
    return "Unknown player";
  }, [contextPlayers.activePlayers, contextPlayers.benchPlayers, playerOptions, selectedPlayerId]);
  const selectedEventValueType = String(selectedEventDefinition?.value_type || "text").toLowerCase();
  const hasMissingRequiredDetails = Boolean(
    shouldShowValueInput ||
      (shouldShowTeamSelector && !selectedTeamId) ||
      (shouldShowPlayerSelector && !selectedPlayerId)
  );
  const canUseCompactRecord = Boolean(
    selectedControl &&
      !shouldShowValueInput &&
      (!shouldShowTeamSelector || selectedTeamId) &&
      (!shouldShowPlayerSelector || selectedPlayerId)
  );
  const recordDisabledReason = useMemo(() => {
    if (isSubmitting) return "Recording this event...";
    if (!canWrite) return "Scoring is not available for this match.";
    if (!selectedControl) return "Choose an action first.";
    if (shouldShowTeamSelector && !selectedTeamId) {
      return participantUnitType === "TEAM"
        ? "Select a team first."
        : "Select the participant who receives this event.";
    }
    if (shouldShowPlayerSelector && !selectedPlayerId) return "Select a player first.";
    if (shouldShowValueInput) return "Enter the required event value first.";
    return "";
  }, [
    canWrite,
    isSubmitting,
    participantUnitType,
    selectedControl,
    selectedPlayerId,
    selectedTeamId,
    shouldShowPlayerSelector,
    shouldShowTeamSelector,
    shouldShowValueInput,
  ]);
  useEffect(() => {
    if (!selectedControl) {
      setManualComposerOpen(false);
    }
  }, [selectedControl]);

  const selectControlKeepingContext = (controlId) => {
    const targetGroup = controlToGroup.get(String(controlId || ""));
    const currentTeamId = selectedTeamId;
    const currentPlayerId = selectedPlayerId;
    const isFromSuggestedTab = activeGroupId === "suggested";
    handleControlSelect(controlId);
    if (currentTeamId) setSelectedTeamId(currentTeamId);
    if (currentPlayerId) setSelectedPlayerId(currentPlayerId);
    if (targetGroup && !isFromSuggestedTab) setActiveGroupId(targetGroup);
  };
  const togglePinnedSuggestedAction = (eventType) => {
    const normalizedEventType = String(eventType || "").toUpperCase();
    if (!normalizedEventType) return;
    setPinnedSuggestedEventTypes((current) => {
      const exists = current.includes(normalizedEventType);
      if (exists) return current.filter((row) => row !== normalizedEventType);
      return [normalizedEventType, ...current].slice(0, RECENT_ACTION_LIMIT);
    });
  };
  const renderControlButton = (control, options = {}) => {
    const { isCompact = false, deEmphasize = false } = options;
    const disabledReason = quickControlDisabledReason(control);
    const isDisabled = Boolean(disabledReason);
    const isSelected = selectedControlId === control.id;
    const styleKey = String(control.style || control.intent || "neutral").toLowerCase();
    const styleClass = controlStyleClassMap[styleKey] || controlStyleClassMap.neutral;
    const actionDisplayLabel = getActionDisplayLabel(control);
    const actionTooltip = getActionTooltip(control);
    return (
      <button
        key={options.renderKey || String(control?.id || control?.event_type || control?.type || actionDisplayLabel || "control")}
        type="button"
        aria-label={actionTooltip}
        title={disabledReason || actionTooltip}
        onClick={() => selectControlKeepingContext(control.id)}
        disabled={isDisabled}
        className={`min-h-[44px] rounded-xl border px-2.5 py-2 text-left font-semibold leading-tight transition ${
          isCompact ? "text-sm" : "text-sm"
        } ${styleClass} ${deEmphasize ? "opacity-75" : ""} disabled:cursor-not-allowed disabled:opacity-60 ${
          isSelected ? "ring-2 ring-cyan-400/70 shadow-[0_0_0_1px_rgba(34,211,238,0.25)]" : ""
        }`}
      >
        <span className="line-clamp-1 block">{actionDisplayLabel}</span>
      </button>
    );
  };

  if (!validatedConfig || normalizedStatus !== "VALID") {
    return <SafeModePanel response={safeModeResponse} onRefreshConfig={onRefreshConfig} onReloadState={onReloadState} />;
  }

  if (isRoleReadOnly) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white/85 p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Read-Only Event Timeline</h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Controls are hidden because your role is read-only for this sport. You can still monitor live updates in real time.
        </p>
      </div>
    );
  }

  return (
    <section className={embedded ? "" : "rounded-2xl border border-slate-200 bg-[linear-gradient(124deg,_rgba(248,250,252,0.97),_rgba(241,245,249,0.96))] p-3.5 shadow-md shadow-slate-300/35 dark:border-slate-700/80 dark:bg-[linear-gradient(124deg,_rgba(9,20,44,0.9),_rgba(7,12,26,0.95))] dark:shadow-lg dark:shadow-slate-950/30"}>
      {!embedded ? <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Action Console</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">Select context, choose an action, then record.</p>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && <span className="text-xs text-slate-600 dark:text-slate-400">Loading...</span>}
          <button
            type="button"
            onClick={handleUndoLastEvent}
            disabled={!canUndoEvents || isUndoing || Number(eventCount || 0) === 0}
            className="min-h-[34px] rounded-lg border border-amber-300 bg-amber-50 px-2.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-500/45 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/20"
            title="Undo latest event"
          >
            {isUndoing ? "Undoing..." : "Undo Last"}
          </button>
        </div>
      </div> : null}

      {groupedControls.length > 0 ? (
        <>
          {lineupUi?.warningText && (
            <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-700 dark:border-amber-500/35 dark:bg-amber-500/10 dark:text-amber-100">
              {lineupUi.warningText}
            </div>
          )}

          {pendingStateSuggestion?.mode === "suggest" && (
            <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-700 dark:border-amber-500/35 dark:bg-amber-500/10 dark:text-amber-100">
              <p className="font-semibold">
                Suggested {getSportStateLabel(sportKey, sportStateMode)}:{" "}
                {pendingStateSuggestion?.nextTeamId
                  ? getShortTeamName(teamOptions.find((row) => Number(row.id) === Number(pendingStateSuggestion.nextTeamId))?.name || "-")
                  : "Review state"}
              </p>
              {!hasStateOverrideControl && (
                <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-200">
                  Manual {String(getSportStateLabel(sportKey, sportStateMode) || "state").toLowerCase()} override is unavailable for this sport configuration.
                </p>
              )}
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={onApplyPendingStateSuggestion}
                  disabled={!hasStateOverrideControl || isApplyingStateOverride}
                  className="rounded-md border border-amber-300 bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-800 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-400/60 dark:bg-amber-500/20 dark:text-amber-100"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={onDismissPendingStateSuggestion}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                >
                  Keep Current
                </button>
              </div>
            </div>
          )}

          {sportStateMode !== "athlete" && participantUnitType === "TEAM" && (
            <div className="mb-2 rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 dark:border-slate-800 dark:bg-slate-950/55">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  {teamOptions.map((teamOption) => {
                    const isSelectedTeam = Number(contextTeamId || 0) === Number(teamOption.id);
                    return (
                      <button
                        key={`context-team-${teamOption.id}`}
                        type="button"
                        title={teamOption.name}
                        onClick={() => {
                          setContextTeamOverrideId(String(teamOption.id));
                          setSelectedTeamId(String(teamOption.id));
                          setSelectedPlayerId("");
                          setSubOut(null);
                          setSubIn(null);
                        }}
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                          isSelectedTeam
                            ? "border-cyan-500/70 bg-cyan-500/20 text-cyan-800 dark:text-cyan-100"
                            : "border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                        }`}
                      >
                        {getShortTeamName(teamOption.name)}
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  {!isBoardGameMode && (
                    <button
                      type="button"
                      onClick={() => {
                        setSubstitutionMode((current) => {
                          const next = !current;
                          if (!next) {
                            setSubOut(null);
                            setSubIn(null);
                          } else {
                            setShowBenchPlayers(true);
                          }
                          return next;
                        });
                      }}
                      disabled={Boolean(substitutionDisabledReason)}
                      title={substitutionDisabledReason || "Toggle substitution mode"}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                    >
                      {substitutionMode ? "Cancel Subs" : "Substitutions"}
                    </button>
                  )}
                  {!isBoardGameMode && (
                    <button
                      type="button"
                      onClick={() => setShowBenchPlayers((current) => !current)}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                    >
                      {showBenchPlayers ? "Hide Bench" : "Bench"}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto pr-1">
                {contextPlayers.activePlayers.map((player) => {
                  const isSelected = Number(selectedPlayerId || 0) === Number(player.id);
                  const isSubOut = substitutionMode && Number(subOut?.playerId) === Number(player.id);
                  return (
                    <button
                      key={`context-active-${contextTeamId}-${player.id}`}
                      type="button"
                      title={player.name}
                      onClick={() => {
                        setSelectedTeamId(String(contextTeamId));
                        setSelectedPlayerId(String(player.id));
                        if (substitutionMode) {
                          setSubOut({
                            teamId: Number(contextTeamId || 0),
                            playerId: Number(player.id),
                            label: player.name,
                          });
                        }
                      }}
                      className={`rounded-full border px-2 py-1 text-xs font-semibold ${
                        isSubOut
                          ? "border-orange-400/70 bg-orange-500/20 text-orange-800 dark:text-orange-100"
                        : isSelected
                          ? "border-blue-500/70 bg-blue-500/20 text-blue-800 dark:text-blue-100"
                          : "border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                      }`}
                    >
                      {getPlayerListChipLabel(player)}
                    </button>
                  );
                })}
                {!isBoardGameMode && (showBenchPlayers || substitutionMode) && contextPlayers.benchPlayers.map((player) => {
                  const isSelected = Number(selectedPlayerId || 0) === Number(player.id);
                  const isSubIn = substitutionMode && Number(subIn?.playerId) === Number(player.id);
                  return (
                    <button
                      key={`context-bench-${contextTeamId}-${player.id}`}
                      type="button"
                      title={player.name}
                      onClick={() => {
                        setSelectedTeamId(String(contextTeamId));
                        setSelectedPlayerId(String(player.id));
                        if (substitutionMode) {
                          setSubIn({
                            teamId: Number(contextTeamId || 0),
                            playerId: Number(player.id),
                            label: player.name,
                          });
                        }
                      }}
                      className={`rounded-full border px-2 py-1 text-xs font-semibold ${
                        isSubIn
                          ? "border-emerald-500/70 bg-emerald-500/20 text-emerald-800 dark:text-emerald-100"
                        : isSelected
                          ? "border-emerald-500/70 bg-emerald-500/20 text-emerald-800 dark:text-emerald-100"
                          : "border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                      }`}
                    >
                      {getPlayerListChipLabel(player)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {sportStateMode === "athlete" && (
            <div className="mb-2 rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 dark:border-slate-800 dark:bg-slate-950/55">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Athlete Context</p>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {teamOptions.map((teamOption) => {
                  const isSelectedTeam = Number(selectedTeamId || 0) === Number(teamOption.id);
                  return (
                    <button
                      key={`athlete-team-${teamOption.id}`}
                      type="button"
                      title={teamOption.name}
                      onClick={() => setSelectedTeamId(String(teamOption.id))}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        isSelectedTeam
                          ? "border-rose-500/60 bg-rose-500/20 text-rose-800 dark:text-rose-100"
                          : "border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                      }`}
                    >
                      {getShortTeamName(teamOption.name)}
                    </button>
                  );
                })}
              </div>
              {shouldShowPlayerSelector && playerOptions.length > 0 && (
                <div className="flex max-h-20 flex-wrap gap-1.5 overflow-y-auto pr-1">
                  {playerOptions.map((option) => {
                    const isSelected = Number(selectedPlayerId || 0) === Number(option.id);
                    return (
                      <button
                        key={`athlete-player-${option.id}`}
                        type="button"
                        title={option.label}
                      onClick={() => {
                          if (option.teamId) setSelectedTeamId(String(option.teamId));
                          else if (!selectedTeamId && teamOptions[0]?.id) setSelectedTeamId(String(teamOptions[0].id));
                          setSelectedPlayerId(String(option.id));
                        }}
                        className={`rounded-full border px-2 py-1 text-xs font-semibold ${
                          isSelected
                            ? "border-blue-500/70 bg-blue-500/20 text-blue-800 dark:text-blue-100"
                            : "border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                        }`}
                      >
                        {getShortPlayerName(option.label)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {sportStateMode !== "athlete" && participantUnitType !== "TEAM" && (shouldShowTeamSelector || shouldShowPlayerSelector) && (
            <div className="mb-2 rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 dark:border-slate-800 dark:bg-slate-950/55">
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <p className="text-slate-700 dark:text-slate-300">
                  Context:{" "}
                  <span className="font-semibold text-cyan-700 dark:text-cyan-200">{getContextLabel(sportStateMode, sportKey)}</span>
                </p>
              </div>
              {shouldShowTeamSelector && (
                <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto pr-1">
                  {teamOptions.map((option) => {
                    const isSelected = Number(selectedTeamId || 0) === Number(option.id);
                    return (
                      <button
                        key={`context-entry-${option.id}`}
                        type="button"
                        title={option.name}
                        onClick={() => {
                          setSelectedTeamId(String(option.id));
                          setSelectedPlayerId("");
                        }}
                        className={`rounded-full border px-2 py-1 text-xs font-semibold ${
                          isSelected
                            ? "border-cyan-500/70 bg-cyan-500/20 text-cyan-800 dark:text-cyan-100"
                            : "border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                        }`}
                      >
                        {getShortTeamName(option.name)}
                      </button>
                    );
                  })}
                </div>
              )}
              {shouldShowPlayerSelector && playerOptions.length > 0 && (
                <div className={`${shouldShowTeamSelector ? "mt-2" : ""} flex max-h-24 flex-wrap gap-1.5 overflow-y-auto pr-1`}>
                  {playerOptions.map((option) => {
                    const isSelected = Number(selectedPlayerId || 0) === Number(option.id);
                    return (
                      <button
                        key={`context-participant-${option.id}`}
                        type="button"
                        title={option.label}
                        onClick={() => {
                          if (option.teamId) setSelectedTeamId(String(option.teamId));
                          setSelectedPlayerId(String(option.id));
                        }}
                        className={`rounded-full border px-2 py-1 text-xs font-semibold ${
                          isSelected
                            ? "border-blue-500/70 bg-blue-500/20 text-blue-800 dark:text-blue-100"
                            : "border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                        }`}
                      >
                        {getShortPlayerName(option.label)}
                      </button>
                    );
                  })}
                </div>
              )}
              {shouldShowPlayerSelector && playerOptions.length === 0 && (
                <p className="mt-2 text-xs text-amber-700 dark:text-amber-200">
                  No eligible players are available for the selected participant.
                </p>
              )}
              {substitutionMode && (
                <div className="mt-2 rounded-lg border border-cyan-200 bg-cyan-50 p-2 text-xs text-cyan-800 dark:border-cyan-700/50 dark:bg-cyan-900/20 dark:text-cyan-100">
                  <p>OUT: {subOut?.label ? getShortPlayerName(subOut.label) : "-"}</p>
                  <p>IN: {subIn?.label ? getShortPlayerName(subIn.label) : "-"}</p>
                  {substitutionDisabledReason && <p className="mt-1 text-amber-700 dark:text-amber-200">{substitutionDisabledReason}</p>}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      disabled={!canConfirmSubstitution}
                      onClick={() => {
                        if (!canConfirmSubstitution || typeof onPrepareSubstitution !== "function") return;
                        onPrepareSubstitution({
                          teamId: subOut.teamId,
                          outPlayerId: subOut.playerId,
                          inPlayerId: subIn.playerId,
                        });
                        setSubstitutionMode(false);
                        setSubOut(null);
                        setSubIn(null);
                      }}
                      className="rounded-md border border-cyan-300 bg-cyan-100 px-2 py-1 font-semibold text-cyan-800 disabled:cursor-not-allowed disabled:opacity-60 dark:border-cyan-400/60 dark:bg-cyan-500/20 dark:text-cyan-100"
                    >
                      Prepare Substitution
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSubstitutionMode(false);
                        setSubOut(null);
                        setSubIn(null);
                      }}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mb-2 overflow-x-auto pb-1">
            <div className="flex min-w-max gap-1.5">
              {tabGroups.map((groupRow) => {
                const isActive = activeGroup?.group === groupRow.group;
                return (
                  <button
                    key={`chip-${groupRow.group}`}
                    type="button"
                    aria-label={`Action group: ${groupRow.label}`}
                    title={groupRow.label}
                    onClick={() => {
                      setActiveGroupId(groupRow.group);
                    }}
                    className={`inline-flex min-h-[34px] shrink-0 items-center justify-center rounded-full border px-3 text-xs font-semibold transition ${
                      isActive
                        ? "border-cyan-500/65 bg-cyan-500/18 text-cyan-800 dark:text-cyan-100"
                        : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-500"
                    }`}
                  >
                    {groupRow.label}
                  </button>
                );
              })}
            </div>
          </div>

          {activeGroup && (
            <section className="rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 dark:border-slate-800 dark:bg-slate-950/55">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-200">{activeGroup.label}</p>
                <span className="text-xs text-slate-500" title={activeGroup.label}>
                  {activeGroup.controls.length} items
                </span>
              </div>
              {activeGroup.group === "suggested" && (
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {hasMoreSuggestedActions && (
                      <button
                        type="button"
                        onClick={() => setShowAllSuggestedActions((current) => !current)}
                        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                      >
                        {showAllSuggestedActions ? "Less" : `More (${suggestedActions.length - SUGGESTED_VISIBLE_LIMIT})`}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowCustomizeSuggestedActions((current) => !current)}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                    >
                      {showCustomizeSuggestedActions ? "Close" : pinnedSuggestedEventTypes.length > 0 ? "Customize" : "+ Add"}
                    </button>
                  </div>
                </div>
              )}
              <div className={`${activeGroup.group === "other" ? "max-h-32 overflow-y-auto pr-1" : ""} grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4`}>
                {activeGroup.controls.map((control, index) =>
                  renderControlButton(control, {
                    isCompact: activeGroup.group === "suggested",
                    deEmphasize: activeGroup.group === "suggested" ? false : suggestedControlIds.has(String(control?.id || "")),
                    renderKey: `action-${activeGroup.group}-${String(control?.id || control?.event_type || "control")}-${index}`,
                  })
                )}
              </div>
              {activeGroup.group === "suggested" && showCustomizeSuggestedActions && (
                <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-md border border-slate-200 bg-white/85 p-2 pr-1 dark:border-slate-800 dark:bg-slate-950/70">
                  {availableSuggestedOptions.map((option) => {
                    const isPinned = pinnedSuggestedEventTypes.includes(option.eventType);
                    return (
                      <button
                        key={`pin-${option.id || option.eventType}`}
                        type="button"
                        title={option.tooltip}
                        onClick={() => togglePinnedSuggestedAction(option.eventType)}
                        className={`flex w-full items-center justify-between rounded-md border px-2 py-1.5 text-left text-xs font-semibold ${
                          isPinned
                            ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-800 dark:text-cyan-100"
                            : "border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                        }`}
                      >
                        <span>{option.label}</span>
                        <span>{isPinned ? "Pinned" : "Pin"}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50/80 p-2 dark:border-slate-800 dark:bg-slate-950/55">
            <button
              type="button"
              onClick={() => setManualComposerOpen((current) => !current)}
              className="flex w-full items-center justify-between text-left text-xs font-semibold text-slate-800 dark:text-slate-200"
            >
              <span>Manual Composer</span>
              <span className="text-slate-500 dark:text-slate-400">{manualComposerOpen ? "Hide" : "Show"}</span>
            </button>
            {manualComposerOpen && (
              <div className="mt-2 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                <p>Selected Team: <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedTeamName ? getShortTeamName(selectedTeamName) : "-"}</span></p>
                <p>Selected Player: <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedPlayerName ? getShortPlayerName(selectedPlayerName) : "-"}</span></p>
                <p>Selected Action: <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedControl ? getActionDisplayLabel(selectedControl) : "-"}</span></p>
                {hasMissingRequiredDetails && (
                  <p className="text-amber-700 dark:text-amber-200">Some required context is missing. Select required fields before recording.</p>
                )}
                {selectedEventValueType !== "boolean" && shouldShowValueInput && (
                  <p className="text-amber-700 dark:text-amber-200">This action requires value input in advanced composer config.</p>
                )}
              </div>
            )}
          </div> */}

          <button
            type="button"
            onClick={handleSubmitEvent}
            disabled={!canUseCompactRecord || !canWrite || isSubmitting}
            title={recordDisabledReason || "Record the selected event"}
            className="mt-3 min-h-[46px] w-full rounded-xl border border-blue-500/60 bg-blue-600 px-5 text-sm font-semibold text-white shadow-lg shadow-blue-900/25 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Recording..." : "Record Event"}
          </button>
          {recordDisabledReason && !isSubmitting && (
            <p className="mt-1.5 text-center text-xs text-amber-700 dark:text-amber-200">
              {recordDisabledReason}
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-slate-600 dark:text-slate-500">No event controls configured.</p>
      )}
    </section>
  );
};

export default ComposerUI;
