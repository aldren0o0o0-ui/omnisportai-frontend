const normalize = (value) => String(value || "").trim().toUpperCase();

export const SPECIALIZED_ENGINE_TYPES = new Set([
  "GAME_SET_MATCH",
  "JUDGE_SCORECARD",
  "COUNT_OR_TARGET",
  "TIMED_RACE",
  "PLACEMENT",
  "INNING",
  "WIN_LOSS",
]);

export const resolveSpecializedEngine = (config) => {
  const engine = normalize(
    config?.runtime_model?.engine_type
    || config?.match_logic?.engine_type
    || config?.runtime_governance?.engine_type
  );
  return SPECIALIZED_ENGINE_TYPES.has(engine) ? engine : "";
};

export const controlsByEventType = (config) =>
  new Map(
    (Array.isArray(config?.controls) ? config.controls : [])
      .map((control) => [normalize(control?.event_type), control])
      .filter(([eventType]) => eventType)
  );

export const specializedStateForEngine = (engineType, liveState) => {
  const state = liveState && typeof liveState === "object" ? liveState : {};
  return {
    GAME_SET_MATCH: state.tennis_state || {},
    JUDGE_SCORECARD: state.boxing_state || {},
    COUNT_OR_TARGET: state.archery_state || {},
    TIMED_RACE: state.race_state || {},
    PLACEMENT: state.race_state || {},
    INNING: state.baseball_state || {},
    WIN_LOSS: state.chess_state || {},
  }[normalize(engineType)] || {};
};

export const isDedicatedEntryEngine = (engineType) =>
  new Set(["JUDGE_SCORECARD", "COUNT_OR_TARGET", "TIMED_RACE", "PLACEMENT", "WIN_LOSS"])
    .has(normalize(engineType));

export const specializedEngineTitle = (engineType) => ({
  GAME_SET_MATCH: "Tennis match state",
  JUDGE_SCORECARD: "Official scorecards",
  COUNT_OR_TARGET: "Archery scoring",
  TIMED_RACE: "Official race results",
  PLACEMENT: "Official results",
  INNING: "Inning and count",
  WIN_LOSS: "Chess result",
}[normalize(engineType)] || "Official result");
