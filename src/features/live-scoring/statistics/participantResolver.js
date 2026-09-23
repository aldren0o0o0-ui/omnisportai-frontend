import { getMatchParticipantLabel, getMatchParticipantTarget } from "../../../components/brackets/utils/bracketTargets.js";

const positiveId = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};
const shapeOf = (value) => {
  const shape = String(value || "").trim().toUpperCase();
  return ["TEAM", "DUO", "SOLO"].includes(shape) ? shape : null;
};
const rows = (value) => Array.isArray(value) ? value : value && typeof value === "object" ? Object.values(value) : [];
const normalizeMember = (member) => {
  const playerId = positiveId(member?.playerId ?? member?.player_id ?? member?.id);
  if (!playerId) return null;
  return {
    playerId,
    userId: positiveId(member?.userId ?? member?.user_id),
    displayName: String(member?.displayName ?? member?.display_name ?? member?.name ?? member?.full_name ?? `Player #${playerId}`).trim(),
  };
};
const normalizeMembers = (value) => rows(value).map(normalizeMember).filter(Boolean);
const candidateMembers = (candidate, activePlayers) => activePlayers
  ? [...rows(candidate?.active_players), ...rows(candidate?.bench_players)]
  : candidate?.members;
const entryById = (entryData, entryId) => rows(entryData).find((entry) => positiveId(entry?.entry_id ?? entry?.id) === entryId) || null;
const rosterByTeam = (rosterData, teamId) => Array.isArray(rosterData?.[teamId])
  ? rosterData[teamId]
  : Array.isArray(rosterData?.[String(teamId)]) ? rosterData[String(teamId)] : [];

const baseParticipant = ({ side, target, shape, match }) => ({
  side,
  targetId: target?.id || null,
  targetType: target?.type || (shape === "TEAM" ? "TEAM" : "ENTRY"),
  participantShape: shape,
  entryId: shape === "TEAM" ? null : target?.id || null,
  teamId: shape === "TEAM" ? target?.id || null : null,
  displayName: getMatchParticipantLabel(match, side, `Participant ${side}`),
  logoUrl: match?.[`participant${side}`]?.effective_logo_url || match?.[`team${side}_logo_url`] || null,
  members: [],
  source: "unresolved",
  resolutionStatus: "participant_unavailable",
});

const validIdentity = (candidate, target, shape) => {
  const candidateShape = shapeOf(candidate?.participant_shape ?? candidate?.participantShape);
  if (candidateShape && candidateShape !== shape) return false;
  const entryId = positiveId(candidate?.entry_id ?? candidate?.entryId);
  const teamId = positiveId(candidate?.team_id ?? candidate?.teamId);
  if (shape === "TEAM") return target?.type === "TEAM" && teamId === target.id;
  return target?.type === "ENTRY" && entryId === target.id;
};

const validCandidate = (candidate, target, shape, activePlayers = false) => {
  if (!validIdentity(candidate, target, shape)) return false;
  const members = normalizeMembers(candidateMembers(candidate, activePlayers));
  if (shape === "SOLO") return members.length === 1;
  if (shape === "DUO") return members.length === 2;
  return members.length > 0;
};

const fromCandidate = ({ candidate, base, source, activePlayers = false }) => {
  const members = normalizeMembers(candidateMembers(candidate, activePlayers));
  const candidateShape = shapeOf(candidate?.participant_shape ?? candidate?.participantShape) || base.participantShape;
  const displayName = candidateShape === "TEAM"
    ? candidate?.team_name ?? candidate?.display_name ?? candidate?.entry_name
    : candidate?.entry_name ?? candidate?.display_name ?? candidate?.team_name;
  return {
    ...base,
    displayName: String(displayName ?? base.displayName).trim(),
    logoUrl: candidate?.effective_logo_url ?? candidate?.logo_url ?? candidate?.image_url ?? base.logoUrl,
    members,
    source,
    resolutionStatus: members.length > 0 ? "resolved" : "roster_unavailable",
  };
};

const resolveSide = ({ side, match, liveState, configuration, entryData, rosterData, bracketParticipants }) => {
  const matchParticipant = match?.[`participant${side}`] || null;
  const shape = shapeOf(
    matchParticipant?.participant_shape
    || match?.participant_shape
    || configuration?.participant_shape
    || configuration?.event_config?.participant_shape
    || liveState?.participant_state?.unit_type
  ) || (positiveId(match?.[`entry${side}_id`]) ? "SOLO" : "TEAM");
  const target = getMatchParticipantTarget({ ...match, participant_shape: shape }, side);
  const base = baseParticipant({ side, target, shape, match });
  if (!target) return base;

  const live = liveState?.participant_state?.sides?.[String(side)] ?? liveState?.participant_state?.sides?.[side];
  if (live && validCandidate(live, target, shape, true)) return fromCandidate({ candidate: live, base, source: "live_participant_state", activePlayers: true });

  const configCandidate = configuration?.participants?.[side === 1 ? "side_a" : "side_b"];
  if (configCandidate && validCandidate(configCandidate, target, shape)) return fromCandidate({ candidate: configCandidate, base, source: "configuration" });

  if (shape === "SOLO" || shape === "DUO") {
    const entry = entryById(entryData, target.id);
    if (entry && validCandidate({ ...entry, entry_id: target.id }, target, shape)) return fromCandidate({ candidate: entry, base, source: "competition_entry" });
  } else {
    const roster = rosterByTeam(rosterData, target.id);
    if (roster.length > 0) return fromCandidate({ candidate: { team_id: target.id, members: roster }, base, source: "team_roster" });
  }

  const bracket = bracketParticipants?.[side === 1 ? "participant1" : "participant2"] || matchParticipant;
  if (bracket && validCandidate(bracket, target, shape)) return fromCandidate({ candidate: bracket, base, source: "bracket_participant" });
  return { ...base, resolutionStatus: shape === "TEAM" ? "roster_unavailable" : "participant_unavailable" };
};

export const resolveMatchParticipants = (input = {}) => [1, 2].map((side) => resolveSide({ side, ...input }));
