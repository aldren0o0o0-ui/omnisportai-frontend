import React, { useMemo } from "react";

const mismatchStatuses = new Set(["CONFIG_MISMATCH", "REVIEW"]);

const normalizeSecondsToClock = (secondsValue) => {
  const value = Number(secondsValue);
  if (!Number.isFinite(value) || value <= 0) return "";
  const totalSeconds = Math.max(0, Math.round(value));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
};

const boolLabel = (value) => (value === true ? "Yes" : value === false ? "No" : "");

const sourceLabel = (source) => {
  const normalized = String(source || "").trim();
  if (!normalized) return "";
  if (normalized === "match_rule_snapshot") return "Match Rule Snapshot";
  if (normalized === "adopted_rule_profile") return "Approved Intramural Profile";
  if (normalized === "protected_standard_profile") return "Protected Standard Profile";
  if (normalized === "matches.template_snapshot") return "Legacy Match Template";
  if (normalized === "canonical_template") return "Canonical Sport Template";
  return normalized.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
};

const RulesSummaryPanel = ({
  snapshot,
  configStatus,
  validatedConfig,
  rawEventConfig,
  sportName,
  liveState,
  serviceOwnerLabel,
}) => {
  const status = String(configStatus || "").toUpperCase();
  const config = useMemo(
    () => (
      rawEventConfig && typeof rawEventConfig === "object"
        ? rawEventConfig
        : (
          validatedConfig && typeof validatedConfig === "object"
            ? validatedConfig
            : {}
        )
    ),
    [rawEventConfig, validatedConfig],
  );
  const uiSpec = useMemo(
    () => (
      config?.ui_spec && typeof config.ui_spec === "object"
        ? config.ui_spec
        : {}
    ),
    [config],
  );
  const rules = config?.rules && typeof config.rules === "object" ? config.rules : {};
  const display = config?.display && typeof config.display === "object" ? config.display : {};
  const sportDefinition = config?.sport_definition && typeof config.sport_definition === "object"
    ? config.sport_definition
    : {};
  const profileMeta = config?.rule_profile_meta && typeof config.rule_profile_meta === "object"
    ? config.rule_profile_meta
    : {};
  const profileSettings = useMemo(
    () => (
      config?.rule_profile_settings && typeof config.rule_profile_settings === "object"
        ? config.rule_profile_settings
        : {}
    ),
    [config],
  );
  const stateModel = uiSpec?.state_model && typeof uiSpec.state_model === "object"
    ? uiSpec.state_model
    : (profileSettings?.state && typeof profileSettings.state === "object" ? profileSettings.state : {});
  const serviceModel = uiSpec?.service_model && typeof uiSpec.service_model === "object"
    ? uiSpec.service_model
    : (profileSettings?.service && typeof profileSettings.service === "object" ? profileSettings.service : {});
  const secondaryClockModel = uiSpec?.secondary_clock && typeof uiSpec.secondary_clock === "object"
    ? uiSpec.secondary_clock
    : (profileSettings?.secondaryClock && typeof profileSettings.secondaryClock === "object" ? profileSettings.secondaryClock : {});
  const suggestedDefaults = useMemo(
    () => (
      Array.isArray(uiSpec?.suggested_actions)
        ? uiSpec.suggested_actions
        : (
          Array.isArray(profileSettings?.actions?.suggestedDefaults)
            ? profileSettings.actions.suggestedDefaults
            : []
        )
    ),
    [profileSettings, uiSpec],
  );
  const matchLogic = config?.match_logic && typeof config.match_logic === "object"
    ? config.match_logic
    : {};
  const runtimeRules = config?.runtime_rules && typeof config.runtime_rules === "object"
    ? config.runtime_rules
    : {};
  const regularSetTarget = Number(
    matchLogic.regular_set_target ?? runtimeRules.regular_set_target ?? 0
  ) || null;
  const decidingSetTarget = Number(
    matchLogic.deciding_set_target ?? runtimeRules.deciding_set_target ?? 0
  ) || null;
  const winBy = Number(matchLogic.win_by ?? runtimeRules.win_by ?? 0) || null;
  const scoreCap = Number(matchLogic.score_cap ?? runtimeRules.score_cap ?? 0) || null;
  const currentSet = Number(liveState?.set_state?.current_set ?? 0) || null;

  const activePlayersPerSide = Number(
    uiSpec?.activePlayersPerSide
      ?? config?.participant_profile?.active_players_per_side
      ?? profileSettings?.lineup?.activePlayersPerSide
      ?? sportDefinition?.players_per_team
      ?? 0
  ) || null;
  const supportsSubstitution = uiSpec?.supportsSubstitution
    ?? config?.participant_profile?.supports_substitution
    ?? profileSettings?.lineup?.supportsSubstitution;
  const clockEnabled = display?.clock?.enabled ?? profileSettings?.clock?.hasGameClock;
  const periodType = display?.period?.type || profileSettings?.clock?.periodType || "";
  const periodCount = Number(display?.period?.count ?? profileSettings?.clock?.periodCount ?? 0) || null;
  const clockInitialSeconds = Number(
    display?.clock?.initial_seconds
      ?? profileSettings?.clock?.periodLengthSeconds
      ?? (Number.isFinite(Number(rules?.time_limit_minutes)) ? Number(rules.time_limit_minutes) * 60 : 0)
  ) || null;
  const secondaryClockEnabled = secondaryClockModel?.enabled;
  const secondaryClockDefaultSeconds = Number(
    secondaryClockModel?.default_seconds ?? secondaryClockModel?.defaultSeconds ?? 0
  ) || null;
  const stateType = String(stateModel?.type || "").trim() || "";
  const serviceEnabled = serviceModel?.enabled;
  const servesPerTurn = Number(serviceModel?.serves_per_turn ?? serviceModel?.servesPerTurn ?? 0) || null;

  const rows = useMemo(() => {
    const list = [
      { label: "Profile Name", value: snapshot?.profileName || profileMeta?.profile_name || "" },
      {
        label: "Profile Version",
        value: snapshot?.profileVersion || profileMeta?.profile_version
          ? `v${snapshot?.profileVersion || profileMeta?.profile_version}`
          : "",
      },
      { label: "Snapshot ID", value: snapshot?.id ? `#${snapshot.id}` : "" },
      { label: "Locked", value: snapshot?.isLocked === true || snapshot?.locked === true ? "Yes" : "No" },
      { label: "Sport", value: sportName || sportDefinition?.sport || "" },
      { label: "Rule Source", value: sourceLabel(snapshot?.source) },
      { label: "Active Players Per Side", value: activePlayersPerSide ? String(activePlayersPerSide) : "" },
      { label: "Substitution Enabled", value: boolLabel(supportsSubstitution) },
      { label: "Game Clock Enabled", value: boolLabel(clockEnabled) },
      { label: "Period Type", value: periodType ? String(periodType).replace(/_/g, " ") : "" },
      { label: "Period Count", value: periodCount ? String(periodCount) : "" },
      { label: "Period Length", value: normalizeSecondsToClock(clockInitialSeconds) },
      { label: "Secondary Clock Enabled", value: boolLabel(secondaryClockEnabled) },
      { label: "Secondary Clock Duration", value: normalizeSecondsToClock(secondaryClockDefaultSeconds) },
      { label: "State Type", value: stateType || "" },
      { label: "Service Enabled", value: boolLabel(serviceEnabled) },
      { label: "Serves Per Turn", value: servesPerTurn ? String(servesPerTurn) : "" },
      { label: "Current Set", value: currentSet ? String(currentSet) : "" },
      { label: "Regular Set Target", value: regularSetTarget ? String(regularSetTarget) : "" },
      { label: "Deciding Set Target", value: decidingSetTarget ? String(decidingSetTarget) : "" },
      { label: "Win By", value: winBy ? String(winBy) : "" },
      {
        label: "Score Cap",
        value: regularSetTarget ? (scoreCap ? String(scoreCap) : "No cap") : "",
      },
      {
        label: "Serving Side",
        value: liveState?.service_state?.server_team_id ? serviceOwnerLabel : "",
      },
      { label: "Suggested Defaults", value: suggestedDefaults.length > 0 ? suggestedDefaults.join(", ") : "" },
    ];
    return list.filter((row) => String(row.value || "").trim());
  }, [
    activePlayersPerSide,
    clockEnabled,
    clockInitialSeconds,
    currentSet,
    decidingSetTarget,
    liveState?.service_state?.server_team_id,
    periodCount,
    periodType,
    profileMeta?.profile_name,
    profileMeta?.profile_version,
    secondaryClockDefaultSeconds,
    secondaryClockEnabled,
    scoreCap,
    serviceOwnerLabel,
    servesPerTurn,
    serviceEnabled,
    snapshot?.id,
    snapshot?.isLocked,
    snapshot?.locked,
    snapshot?.profileName,
    snapshot?.profileVersion,
    snapshot?.source,
    sportDefinition?.sport,
    sportName,
    stateType,
    suggestedDefaults,
    supportsSubstitution,
    regularSetTarget,
    winBy,
  ]);

  const isLegacy = snapshot?.source === "matches.template_snapshot" || snapshot?.source === "canonical_template" || !snapshot?.id;
  const isOutOfSync = mismatchStatuses.has(status);
  const technicalRows = useMemo(
    () =>
      [
        { label: "Rules Hash", value: snapshot?.rulesHash || "" },
        { label: "Template Hash", value: snapshot?.templateHash || "" },
      ].filter((row) => String(row.value || "").trim()),
    [snapshot?.rulesHash, snapshot?.templateHash]
  );

  return (
    <details className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
      <summary className="cursor-pointer text-sm font-semibold text-slate-100">Rules Summary</summary>
      <div className="mt-2 space-y-2">
        {isOutOfSync && (
          <div className="rounded-md border border-rose-500/40 bg-rose-500/10 p-2 text-xs text-rose-100">
            Scoring rules are out of sync. Refresh match rules or contact admin.
          </div>
        )}
        {isLegacy && !isOutOfSync && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-100">
            Using legacy sport template. Scoring can continue.
          </div>
        )}
        <div className="grid gap-1.5 text-xs text-slate-300">
          {rows.map((row) => (
            <div key={row.label} className="flex items-start justify-between gap-3 rounded-md border border-slate-800/70 bg-slate-900/50 px-2 py-1.5">
              <span className="text-slate-400">{row.label}</span>
              <span className="max-w-[62%] text-right font-medium text-slate-100 break-words">{row.value}</span>
            </div>
          ))}
        </div>
        {technicalRows.length > 0 && (
          <details className="rounded-md border border-slate-800/80 bg-slate-900/40 p-2">
            <summary className="cursor-pointer text-xs font-semibold text-slate-300">Advanced Details</summary>
            <div className="mt-2 grid gap-1.5 text-xs text-slate-300">
              {technicalRows.map((row) => (
                <div key={row.label} className="flex items-start justify-between gap-3 rounded-md border border-slate-800/70 bg-slate-900/60 px-2 py-1.5">
                  <span className="text-slate-400">{row.label}</span>
                  <span className="max-w-[62%] text-right font-medium text-slate-100 break-words">{row.value}</span>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </details>
  );
};

export default RulesSummaryPanel;
