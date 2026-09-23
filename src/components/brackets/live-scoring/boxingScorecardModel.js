const asPositiveInt = (value, fallback) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const BOXING_SCORE_PRESETS = Object.freeze([
  { id: "10-9", red: 10, blue: 9 },
  { id: "10-8", red: 10, blue: 8 },
  { id: "10-7", red: 10, blue: 7 },
  { id: "9-10", red: 9, blue: 10 },
  { id: "8-10", red: 8, blue: 10 },
  { id: "7-10", red: 7, blue: 10 },
]);

export const resolveBoxingRules = (config = {}) => {
  const matchLogic = config?.match_logic && typeof config.match_logic === "object" ? config.match_logic : {};
  const specialized = matchLogic?.specialized_rules && typeof matchLogic.specialized_rules === "object" ? matchLogic.specialized_rules : {};
  const runtime = config?.runtime_rules && typeof config.runtime_rules === "object" ? config.runtime_rules : {};
  const rules = { ...matchLogic, ...runtime, ...specialized };
  return {
    rounds: asPositiveInt(rules.rounds, 1),
    judgeCount: asPositiveInt(rules.judge_count, 3),
    roundDurationMinutes: asPositiveInt(rules.round_duration_minutes, null),
    scoringSystem: String(rules.scoring_system || "TEN_POINT_MUST").replaceAll("_", " "),
  };
};

export const isValidBoxingCard = ({ red, blue }) => {
  const values = [Number(red), Number(blue)];
  return values.filter((value) => value === 10).length === 1
    && values.some((value) => [7, 8, 9].includes(value));
};

export const buildBoxingJudgePayload = ({ judge, round, redId, blueId, red, blue }) => ({
  event_type: "JUDGE_SCORE_SUBMITTED",
  metadata: {
    judge_id: Number(judge),
    round: Number(round),
    scores: { [String(redId)]: Number(red), [String(blueId)]: Number(blue) },
  },
});

export const buildBoxingCornerPayload = ({ eventType, participant, value, metadata }) => {
  const teamId = Number(participant?.teamId || 0);
  const playerId = Number(participant?.activePlayers?.[0]?.id || 0);
  return {
    event_type: String(eventType || "").trim().toUpperCase(),
    ...(teamId > 0 ? { team_id: teamId } : {}),
    ...(playerId > 0 ? { player_id: playerId } : {}),
    ...(value !== undefined ? { value } : {}),
    ...(metadata && typeof metadata === "object" ? { metadata } : {}),
  };
};

export const buildBoxingScorecardRows = ({ scorecards = {}, judgeCount = 3, rounds = 1, redId, blueId }) => (
  Array.from({ length: judgeCount }, (_, index) => {
    const judge = String(index + 1);
    const cards = Array.from({ length: rounds }, (__, roundIndex) => {
      const card = scorecards?.[String(roundIndex + 1)]?.[judge] || null;
      return card ? { red: Number(card[String(redId)] ?? 0), blue: Number(card[String(blueId)] ?? 0) } : null;
    });
    return {
      judge: index + 1,
      cards,
      redTotal: cards.reduce((sum, card) => sum + Number(card?.red || 0), 0),
      blueTotal: cards.reduce((sum, card) => sum + Number(card?.blue || 0), 0),
    };
  })
);

export const submitBoxingRoundSequentially = async ({ cards, acceptedCards = {}, judgeCount, round, rounds, redId, blueId, submit }) => {
  for (let judge = 1; judge <= judgeCount; judge += 1) {
    if (!cards[judge]) return { ok: false, error: `Judge ${judge} score is missing for Round ${round}.` };
    if (!isValidBoxingCard(cards[judge])) return { ok: false, error: `Judge ${judge} score is not accepted by the current Boxing runtime.` };
  }
  for (let judge = 1; judge <= judgeCount; judge += 1) {
    if (acceptedCards[String(judge)]) continue;
    const saved = await submit(buildBoxingJudgePayload({ judge, round, redId, blueId, ...cards[judge] }));
    if (saved === false) return { ok: false, error: `Judge ${judge} could not be saved. Accepted judge cards were kept; retry to submit only the missing cards.` };
  }
  if (Number(round) < Number(rounds)) {
    const advanced = await submit({ event_type: "ROUND_END", metadata: { round: Number(round) } });
    if (advanced === false) return { ok: false, error: "All judge cards were saved, but the round could not advance. Refresh and try again." };
  }
  return { ok: true, error: "" };
};
