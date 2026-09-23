/**
 * Sport Template Registry (v1) — Frontend Mirror
 * ================================================
 * Read-only JS mirror of the backend SportTemplateRegistry.
 *
 * PURPOSE:
 *   - Used by validateEventConfig.js for strict pre-render assertions
 *   - Used by controlResolver.js to assert control/event_type referential integrity
 *   - NOT used for rendering — rendering reads from the API response
 *
 * RULES:
 *   ❌ Do NOT import this to drive UI rendering
 *   ❌ Do NOT mutate these objects (Object.freeze enforced)
 *   ✅ DO use this to validate that the API response matches a registered template
 *   ✅ DO use this to assert sport_id is registered before rendering
 */

const pointGameTemplate = ({
  sport_id,
  scoreEventType,
  scoreLabel,
  violationEventType,
  violationLabel,
  periodLabel,
  playerRequired,
}) => Object.freeze({
  template_version: "1.0.0",
  sport_id,
  sport_profile: "POINT_GAME",
  match_type: "SCORE",
  controls: Object.freeze([
    Object.freeze({ id: `ctrl-${scoreEventType.toLowerCase().replace(/_/g, "-")}`, label: scoreLabel, event_type: scoreEventType, requires_team: true, requires_player: playerRequired, provides_value: true, value: 1, style: "success" }),
    Object.freeze({ id: `ctrl-${violationEventType.toLowerCase().replace(/_/g, "-")}`, label: violationLabel, event_type: violationEventType, requires_team: true, requires_player: playerRequired, provides_value: false, style: "warn" }),
  ]),
  event_types: Object.freeze([
    Object.freeze({ name: scoreEventType, has_team: true, has_player: playerRequired, has_value: true, value_type: "integer", counts_for_score: true, category: "score" }),
    Object.freeze({ name: violationEventType, has_team: true, has_player: playerRequired, has_value: false, value_type: "json", counts_for_score: false, category: "violation" }),
  ]),
  scoring_rules: Object.freeze([
    Object.freeze({ event_type: scoreEventType, points: 1 }),
  ]),
  ui_spec: Object.freeze({
    composer_mode: "SINGLE_CONTROL",
    requires_team_by_default: true,
    requires_player_by_default: playerRequired,
    render_rules: Object.freeze({ show_team_selector: true, show_player_selector: playerRequired, show_value_input: false }),
    layout: "GRID",
    display: Object.freeze({ show_periods: true, period_label: periodLabel, widgets: Object.freeze(["score", "timeline"]) }),
  }),
});

const setMatchTemplate = ({
  sport_id,
  scoreEventType,
  scoreLabel,
  violationEventType,
  violationLabel,
  playerRequired,
}) => Object.freeze({
  template_version: "1.0.0",
  sport_id,
  sport_profile: "SET_MATCH",
  match_type: "SETS",
  controls: Object.freeze([
    Object.freeze({ id: `ctrl-${scoreEventType.toLowerCase().replace(/_/g, "-")}`, label: scoreLabel, event_type: scoreEventType, requires_team: true, requires_player: playerRequired, provides_value: true, value: 1, style: "success" }),
    Object.freeze({ id: `ctrl-${violationEventType.toLowerCase().replace(/_/g, "-")}`, label: violationLabel, event_type: violationEventType, requires_team: true, requires_player: playerRequired, provides_value: false, style: "warn" }),
  ]),
  event_types: Object.freeze([
    Object.freeze({ name: scoreEventType, has_team: true, has_player: playerRequired, has_value: true, value_type: "integer", counts_for_score: true, category: "score" }),
    Object.freeze({ name: violationEventType, has_team: true, has_player: playerRequired, has_value: false, value_type: "json", counts_for_score: false, category: "violation" }),
  ]),
  scoring_rules: Object.freeze([
    Object.freeze({ event_type: scoreEventType, points: 1 }),
  ]),
  ui_spec: Object.freeze({
    composer_mode: "SINGLE_CONTROL",
    requires_team_by_default: true,
    requires_player_by_default: playerRequired,
    render_rules: Object.freeze({ show_team_selector: true, show_player_selector: playerRequired, show_value_input: false }),
    layout: "GRID",
    display: Object.freeze({ show_periods: true, period_label: "Set", widgets: Object.freeze(["score", "sets", "timeline"]) }),
  }),
});

const manualSetMatchTemplate = ({ sport_id, playerRequired }) => Object.freeze({
  template_version: "1.0.0",
  sport_id,
  sport_profile: "SET_MATCH",
  match_type: "SETS",
  controls: Object.freeze([
    Object.freeze({ id: "ctrl-set-win", label: "Win Set", event_type: "SET_WIN", requires_team: true, requires_player: playerRequired, provides_value: true, value: 1, style: "success" }),
    Object.freeze({ id: "ctrl-fault", label: "Fault", event_type: "FAULT", requires_team: true, requires_player: playerRequired, provides_value: false, style: "warn" }),
  ]),
  event_types: Object.freeze([
    Object.freeze({ name: "SET_WIN", has_team: true, has_player: playerRequired, has_value: true, value_type: "integer", counts_for_score: true, category: "score" }),
    Object.freeze({ name: "FAULT", has_team: true, has_player: playerRequired, has_value: false, value_type: "json", counts_for_score: false, category: "violation" }),
  ]),
  scoring_rules: Object.freeze([
    Object.freeze({ event_type: "SET_WIN", points: 1 }),
  ]),
  ui_spec: Object.freeze({
    composer_mode: "SINGLE_CONTROL",
    requires_team_by_default: true,
    requires_player_by_default: playerRequired,
    render_rules: Object.freeze({ show_team_selector: true, show_player_selector: playerRequired, show_value_input: false }),
    layout: "GRID",
    display: Object.freeze({ show_periods: true, period_label: "Set", widgets: Object.freeze(["score", "sets", "timeline"]) }),
  }),
});

const resultTemplate = ({ sport_id, sport_profile, playerRequired, events }) => Object.freeze({
  template_version: "1.0.0",
  sport_id,
  sport_profile,
  match_type: "RESULT",
  controls: Object.freeze(events.map(([id, label, eventType]) => Object.freeze({
    id,
    label,
    event_type: eventType,
    requires_team: true,
    requires_player: playerRequired,
    provides_value: false,
    style: "success",
  }))),
  event_types: Object.freeze(events.map(([, , eventType]) => Object.freeze({
    name: eventType,
    has_team: true,
    has_player: playerRequired,
    has_value: false,
    value_type: "json",
    counts_for_score: false,
    category: "event",
  }))),
  scoring_rules: Object.freeze(events.map(([, , eventType]) => Object.freeze({ event_type: eventType, points: 0 }))),
  ui_spec: Object.freeze({
    composer_mode: "SINGLE_CONTROL",
    requires_team_by_default: true,
    requires_player_by_default: playerRequired,
    render_rules: Object.freeze({ show_team_selector: true, show_player_selector: playerRequired, show_value_input: false }),
    layout: "GRID",
    display: Object.freeze({ show_periods: false, period_label: "Result", widgets: Object.freeze(["score", "timeline"]) }),
  }),
});

const _templates = Object.freeze({

  // =========================================================
  // BASKETBALL
  // =========================================================
  basketball: Object.freeze({
    template_version: "1.0.0",
    sport_id: "basketball",
    sport_profile: "POINT_GAME",
    match_type: "SCORE",
    controls: Object.freeze([
      Object.freeze({ id: "ctrl-free-throw", label: "1 PT", event_type: "FREE_THROW", requires_team: true, requires_player: true, provides_value: true, value: 1, style: "neutral" }),
      Object.freeze({ id: "ctrl-2pt", label: "2 PT", event_type: "TWO_PT_MADE", requires_team: true, requires_player: true, provides_value: true, value: 2, style: "success" }),
      Object.freeze({ id: "ctrl-3pt", label: "3 PT", event_type: "THREE_PT_MADE", requires_team: true, requires_player: true, provides_value: true, value: 3, style: "success" }),
      Object.freeze({ id: "ctrl-foul", label: "Foul", event_type: "FOUL", requires_team: true, requires_player: true, provides_value: false, style: "danger" }),
    ]),
    event_types: Object.freeze([
      Object.freeze({ name: "FREE_THROW", has_team: true, has_player: true, has_value: true, value_type: "integer", counts_for_score: true, category: "score" }),
      Object.freeze({ name: "TWO_PT_MADE", has_team: true, has_player: true, has_value: true, value_type: "integer", counts_for_score: true, category: "score" }),
      Object.freeze({ name: "THREE_PT_MADE", has_team: true, has_player: true, has_value: true, value_type: "integer", counts_for_score: true, category: "score" }),
      Object.freeze({ name: "FOUL", has_team: true, has_player: true, has_value: false, value_type: "json", counts_for_score: false, category: "violation" }),
    ]),
    scoring_rules: Object.freeze([
      Object.freeze({ event_type: "FREE_THROW", points: 1 }),
      Object.freeze({ event_type: "TWO_PT_MADE", points: 2 }),
      Object.freeze({ event_type: "THREE_PT_MADE", points: 3 }),
    ]),
    ui_spec: Object.freeze({
      composer_mode: "SINGLE_CONTROL",
      requires_team_by_default: true,
      requires_player_by_default: true,
      render_rules: Object.freeze({ show_team_selector: true, show_player_selector: true, show_value_input: false }),
      layout: "GRID",
      display: Object.freeze({ show_periods: true, period_label: "Quarter", widgets: Object.freeze(["score", "timeline"]) }),
    }),
  }),

  // =========================================================
  // BADMINTON
  // =========================================================
  badminton: Object.freeze({
    template_version: "1.0.0",
    sport_id: "badminton",
    sport_profile: "SET_MATCH",
    match_type: "SETS",
    controls: Object.freeze([
      Object.freeze({ id: "ctrl-rally-win", label: "+1 Rally", event_type: "RALLY_WIN", requires_team: true, requires_player: false, provides_value: true, value: 1, style: "success" }),
      Object.freeze({ id: "ctrl-serve-fault", label: "Serve Fault", event_type: "SERVE_FAULT", requires_team: true, requires_player: false, provides_value: false, style: "warn" }),
    ]),
    event_types: Object.freeze([
      Object.freeze({ name: "RALLY_WIN", has_team: true, has_player: false, has_value: true, value_type: "integer", counts_for_score: true, category: "score" }),
      Object.freeze({ name: "SERVE_FAULT", has_team: true, has_player: false, has_value: false, value_type: "json", counts_for_score: false, category: "violation" }),
    ]),
    scoring_rules: Object.freeze([
      Object.freeze({ event_type: "RALLY_WIN", points: 1 }),
    ]),
    ui_spec: Object.freeze({
      composer_mode: "SINGLE_CONTROL",
      requires_team_by_default: true,
      requires_player_by_default: false,
      render_rules: Object.freeze({ show_team_selector: true, show_player_selector: false, show_value_input: false }),
      layout: "GRID",
      display: Object.freeze({ show_periods: true, period_label: "Set", widgets: Object.freeze(["score", "sets", "timeline"]) }),
    }),
  }),

  // =========================================================
  // VOLLEYBALL
  // =========================================================
  volleyball: Object.freeze({
    template_version: "1.0.0",
    sport_id: "volleyball",
    sport_profile: "SET_MATCH",
    match_type: "SETS",
    controls: Object.freeze([
      Object.freeze({ id: "ctrl-rally-win", label: "Rally Win", event_type: "RALLY_WIN", requires_team: true, requires_player: false, provides_value: true, value: 1, style: "success" }),
      Object.freeze({ id: "ctrl-service-ace", label: "Service Ace", event_type: "SERVICE_ACE", requires_team: true, requires_player: true, provides_value: true, value: 1, style: "success" }),
      Object.freeze({ id: "ctrl-net-fault", label: "Net Fault", event_type: "NET_FAULT", requires_team: true, requires_player: false, provides_value: false, style: "danger" }),
    ]),
    event_types: Object.freeze([
      Object.freeze({ name: "RALLY_WIN", has_team: true, has_player: false, has_value: true, value_type: "integer", counts_for_score: true, category: "score" }),
      Object.freeze({ name: "SERVICE_ACE", has_team: true, has_player: true, has_value: true, value_type: "integer", counts_for_score: true, category: "score" }),
      Object.freeze({ name: "NET_FAULT", has_team: true, has_player: false, has_value: false, value_type: "json", counts_for_score: false, category: "violation" }),
    ]),
    scoring_rules: Object.freeze([
      Object.freeze({ event_type: "RALLY_WIN", points: 1 }),
      Object.freeze({ event_type: "SERVICE_ACE", points: 1 }),
    ]),
    ui_spec: Object.freeze({
      composer_mode: "SINGLE_CONTROL",
      requires_team_by_default: true,
      requires_player_by_default: false,
      render_rules: Object.freeze({ show_team_selector: true, show_player_selector: false, show_value_input: false }),
      layout: "GRID",
      display: Object.freeze({ show_periods: true, period_label: "Set", widgets: Object.freeze(["score", "sets", "timeline"]) }),
    }),
  }),

  // =========================================================
  // BOXING
  // =========================================================
  boxing: Object.freeze({
    template_version: "1.0.0",
    sport_id: "boxing",
    sport_profile: "ROUND_BASED",
    match_type: "ROUND_BASED",
    controls: Object.freeze([
      Object.freeze({ id: "ctrl-punch", label: "Punch Landed", event_type: "PUNCH", requires_team: false, requires_player: true, provides_value: true, value: 1, style: "neutral" }),
      Object.freeze({ id: "ctrl-knockdown", label: "Knockdown", event_type: "KNOCKDOWN", requires_team: false, requires_player: true, provides_value: false, style: "danger" }),
      Object.freeze({ id: "ctrl-warning", label: "Warning", event_type: "WARNING", requires_team: false, requires_player: true, provides_value: false, style: "warn" }),
    ]),
    event_types: Object.freeze([
      Object.freeze({ name: "PUNCH", has_team: false, has_player: true, has_value: true, value_type: "integer", counts_for_score: true, category: "score" }),
      Object.freeze({ name: "KNOCKDOWN", has_team: false, has_player: true, has_value: false, value_type: "json", counts_for_score: false, category: "event" }),
      Object.freeze({ name: "WARNING", has_team: false, has_player: true, has_value: false, value_type: "json", counts_for_score: false, category: "violation" }),
    ]),
    scoring_rules: Object.freeze([
      Object.freeze({ event_type: "PUNCH", points: 1 }),
    ]),
    ui_spec: Object.freeze({
      composer_mode: "SINGLE_CONTROL",
      requires_team_by_default: false,
      requires_player_by_default: true,
      render_rules: Object.freeze({ show_team_selector: false, show_player_selector: true, show_value_input: false }),
      layout: "GRID",
      display: Object.freeze({ show_periods: true, period_label: "Round", widgets: Object.freeze(["score", "timeline"]) }),
    }),
  }),

  // =========================================================
  // SEPAK TAKRAW
  // =========================================================
  takraw: Object.freeze({
    template_version: "1.0.0",
    sport_id: "takraw",
    sport_profile: "SET_MATCH",
    match_type: "SETS",
    controls: Object.freeze([
      Object.freeze({ id: "ctrl-rally-win", label: "Rally Win", event_type: "RALLY_WIN", requires_team: true, requires_player: false, provides_value: true, value: 1, style: "success" }),
      Object.freeze({ id: "ctrl-net-fault", label: "Net Fault", event_type: "NET_FAULT", requires_team: true, requires_player: false, provides_value: false, style: "danger" }),
    ]),
    event_types: Object.freeze([
      Object.freeze({ name: "RALLY_WIN", has_team: true, has_player: false, has_value: true, value_type: "integer", counts_for_score: true, category: "score" }),
      Object.freeze({ name: "NET_FAULT", has_team: true, has_player: false, has_value: false, value_type: "json", counts_for_score: false, category: "violation" }),
    ]),
    scoring_rules: Object.freeze([
      Object.freeze({ event_type: "RALLY_WIN", points: 1 }),
    ]),
    ui_spec: Object.freeze({
      composer_mode: "SINGLE_CONTROL",
      requires_team_by_default: true,
      requires_player_by_default: false,
      render_rules: Object.freeze({ show_team_selector: true, show_player_selector: false, show_value_input: false }),
      layout: "GRID",
      display: Object.freeze({ show_periods: true, period_label: "Set", widgets: Object.freeze(["score", "sets", "timeline"]) }),
    }),
  }),
  chess: resultTemplate({
    sport_id: "chess",
    sport_profile: "TURN_BASED",
    playerRequired: true,
    events: [["ctrl-checkmate", "Checkmate", "CHECKMATE"], ["ctrl-resignation", "Resignation", "RESIGNATION"], ["ctrl-time-forfeit", "Time Forfeit", "TIME_FORFEIT"]],
  }),
  archery_recurve_individual: resultTemplate({
    sport_id: "archery_recurve_individual",
    sport_profile: "TURN_BASED",
    playerRequired: true,
    events: [["ctrl-higher-score", "Higher Score", "HIGHER_SCORE"], ["ctrl-tie-break-win", "Tie Break Win", "TIE_BREAK_WIN"]],
  }),
  athletics_100m_sprint: resultTemplate({
    sport_id: "athletics_100m_sprint",
    sport_profile: "TIME_BASED",
    playerRequired: true,
    events: [["ctrl-finish-first", "Finish First", "FINISH_FIRST"], ["ctrl-photo-finish", "Photo Finish", "PHOTO_FINISH_WIN"], ["ctrl-disqualification", "DQ Win", "DISQUALIFICATION_WIN"]],
  }),
  swimming_100m_freestyle: resultTemplate({
    sport_id: "swimming_100m_freestyle",
    sport_profile: "TIME_BASED",
    playerRequired: true,
    events: [["ctrl-finish-first", "Finish First", "FINISH_FIRST"], ["ctrl-touch-first", "Touch First", "TOUCH_FIRST"], ["ctrl-disqualification", "DQ Win", "DISQUALIFICATION_WIN"]],
  }),
  tennis_doubles: manualSetMatchTemplate({ sport_id: "tennis_doubles", playerRequired: true }),
  table_tennis_doubles: setMatchTemplate({
    sport_id: "table_tennis_doubles",
    scoreEventType: "RALLY_WIN",
    scoreLabel: "Rally Win",
    violationEventType: "FAULT",
    violationLabel: "Fault",
    playerRequired: true,
  }),
  beach_volleyball_2v2: setMatchTemplate({
    sport_id: "beach_volleyball_2v2",
    scoreEventType: "RALLY_WIN",
    scoreLabel: "Rally Win",
    violationEventType: "SERVICE_FAULT",
    violationLabel: "Service Fault",
    playerRequired: true,
  }),
  football_11v11: pointGameTemplate({
    sport_id: "football_11v11",
    scoreEventType: "GOAL",
    scoreLabel: "Goal",
    violationEventType: "FOUL",
    violationLabel: "Foul",
    periodLabel: "Half",
    playerRequired: true,
  }),
  handball_7v7: pointGameTemplate({
    sport_id: "handball_7v7",
    scoreEventType: "GOAL",
    scoreLabel: "Goal",
    violationEventType: "FOUL",
    violationLabel: "Foul",
    periodLabel: "Half",
    playerRequired: true,
  }),
  baseball_9v9: pointGameTemplate({
    sport_id: "baseball_9v9",
    scoreEventType: "RUN_SCORED",
    scoreLabel: "Run Scored",
    violationEventType: "ERROR",
    violationLabel: "Error",
    periodLabel: "Inning",
    playerRequired: true,
  }),
});

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Return the frozen template for sport_id (lowercase), or null. */
export const getSportTemplate = (sportId) => {
  if (!sportId || typeof sportId !== 'string') return null;
  return _templates[sportId.trim().toLowerCase()] ?? null;
};

/** Return true if sport_id has a registered v1 template. */
export const isSportRegistered = (sportId) => getSportTemplate(sportId) !== null;

/** Return sorted list of all registered sport IDs. */
export const listSportIds = () => Object.keys(_templates).sort();

/** Get the declared event_type names for a sport. Returns a Set<string>. */
export const getEventTypeNames = (sportId) => {
  const t = getSportTemplate(sportId);
  if (!t) return new Set();
  return new Set(Array.from(t.event_types).map(et => String(et.name || '').toUpperCase()));
};

/** Get score_event_types derived from scoring_rules (single source of truth). */
export const getScoreEventTypes = (sportId) => {
  const t = getSportTemplate(sportId);
  if (!t) return [];
  return Array.from(t.scoring_rules).map(r => r.event_type);
};

export default _templates;
