import {
  getSportStatisticsProfile,
  normalizePlayerStatistics,
} from "../../../features/live-scoring/statistics/index.js";

const positiveId = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export const findResolvedParticipant = (participants, targetId) => (
  (Array.isArray(participants) ? participants : [])
    .find((participant) => Number(participant?.targetId) === Number(targetId)) || null
);

export const buildCanonicalPlayerOptions = ({ participants, selectedTargetId = null } = {}) => {
  const rows = Array.isArray(participants) ? participants : [];
  const targetId = positiveId(selectedTargetId);
  const candidates = targetId
    ? rows.filter((participant) => Number(participant?.targetId) === targetId)
    : rows;
  return candidates.flatMap((participant) => (participant.members || []).map((member) => ({
    id: Number(member.playerId),
    label: targetId ? member.displayName : `${member.displayName} (${participant.displayName})`,
    teamId: Number(participant.targetId),
    side: participant.side,
  })));
};

export const shouldClearSelectedPlayer = ({ selectedPlayerId, participant } = {}) => {
  const playerId = positiveId(selectedPlayerId);
  if (!playerId) return false;
  return !(participant?.members || []).some((member) => Number(member.playerId) === playerId);
};

export const buildCanonicalPlayerStatsTable = ({
  sportKey,
  playerStats,
  participants,
  runtimeConfig,
  engineType,
} = {}) => {
  const profile = getSportStatisticsProfile(sportKey);
  if (!profile) return { columns: [], secondaryColumns: [], rows: [], scoreColumnKey: null };
  const rawPlayerStats = playerStats && typeof playerStats === "object" ? playerStats : {};
  const columns = profile.primaryMetrics.map((key) => profile.metrics[key]);
  const secondaryColumns = profile.secondaryMetrics
    .filter((key) => !profile.primaryMetrics.includes(key))
    .map((key) => profile.metrics[key]);
  const participantRows = Array.isArray(participants) ? participants : [];
  const rows = participantRows.flatMap((participant) => (participant.members || []).map((member, memberOrder) => {
    const playerId = positiveId(member.playerId);
    const rawStats = rawPlayerStats?.[String(playerId)] || rawPlayerStats?.[playerId] || {};
    const normalized = normalizePlayerStatistics({
      sportKey,
      rawStats,
      runtimeConfig,
      engineType,
      participantResolved: participant.resolutionStatus === "resolved",
    });
    const hasRecordedStats = [...normalized.primary, ...normalized.secondary]
      .some((metric) => Array.isArray(metric.sourceKeys) && metric.sourceKeys.length > 0);
    const hasActivity = [...normalized.primary, ...normalized.secondary]
      .some((metric) => metric.status === "tracked" && typeof metric.value === "number" && metric.value !== 0);
    return {
      playerId,
      teamId: participant.targetId,
      playerName: member.displayName,
      teamLabel: participant.displayName,
      metrics: normalized.metrics,
      hasRecordedStats,
      hasActivity,
      participantOrder: participant.side,
      memberOrder,
    };
  }));
  const scoreColumnKey = profile.sortKey;
  const direction = profile.metrics?.[scoreColumnKey]?.sortDirection || "desc";
  rows.sort((a, b) => {
    if (!scoreColumnKey || direction === "none") return a.participantOrder - b.participantOrder || a.memberOrder - b.memberOrder;
    const aMetric = a.metrics?.[scoreColumnKey];
    const bMetric = b.metrics?.[scoreColumnKey];
    const aTracked = aMetric?.status === "tracked" && Number.isFinite(Number(aMetric?.value));
    const bTracked = bMetric?.status === "tracked" && Number.isFinite(Number(bMetric?.value));
    if (aTracked !== bTracked) return bTracked ? 1 : -1;
    if (aTracked && bTracked && Number(aMetric.value) !== Number(bMetric.value)) {
      return direction === "asc" ? Number(aMetric.value) - Number(bMetric.value) : Number(bMetric.value) - Number(aMetric.value);
    }
    return a.participantOrder - b.participantOrder || a.memberOrder - b.memberOrder;
  });
  return { columns, secondaryColumns, rows, scoreColumnKey };
};
