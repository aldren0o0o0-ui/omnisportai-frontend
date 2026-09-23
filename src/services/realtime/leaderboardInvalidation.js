export const acceptLeaderboardInvalidation = ({ message, sportId = null, seen, versions }) => {
  if (message?.event_type !== "leaderboard.invalidated" || !message?.event_id) return false;
  if (seen.has(message.event_id)) return false;
  const payload = message.payload || {};
  if (sportId && Number(payload.sport_id) !== Number(sportId)) return false;
  const scopeKey = `${payload.tournament_id || payload.workspace_id}:${payload.sport_id || 0}:${payload.event_id || 0}:${payload.reason || "STATE"}`;
  const incomingVersion = Number(payload.version ?? message.state_version ?? 0);
  if (incomingVersion < Number(versions.get(scopeKey) || 0)) return false;
  versions.set(scopeKey, incomingVersion);
  seen.set(message.event_id, Date.now());
  while (seen.size > 256) seen.delete(seen.keys().next().value);
  return true;
};
