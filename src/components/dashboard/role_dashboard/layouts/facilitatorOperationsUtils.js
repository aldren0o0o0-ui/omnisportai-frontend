const normalizedText = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");

const rowIdentityKeys = (row) => {
  const keys = [];
  const kind = normalizedText(row?.kind || row?.participant_shape || row?.type);
  const isCompetitionEntry = kind === "entry" || kind === "solo" || kind === "duo";
  const entryId = row?.entry_id ?? row?.entryId ?? (isCompetitionEntry ? row?.approval_id : null) ?? (row?.type === "entry" ? row?.id : null);
  // A competition entry may reference its owning team, but that does not make
  // it the same approval as the team's tournament registration.
  const teamId = isCompetitionEntry
    ? null
    : row?.team_id ?? row?.teamId ?? (kind === "team" ? row?.approval_id : null) ?? (row?.type === "team" ? row?.id : null);
  if (entryId) keys.push(`entry:${entryId}`);
  if (teamId) keys.push(`team:${teamId}`);

  const name = normalizedText(row?.display_name || row?.entry_name || row?.team_name || row?.name);
  const sport = row?.sport_id || normalizedText(row?.sport_name || row?.sport);
  const department = row?.department_id || normalizedText(row?.department_code || row?.department_name || row?.department);
  const event = row?.tournament_sport_event_id || row?.event_id || normalizedText(row?.event_name);
  const shape = normalizedText(row?.participant_shape || row?.shape);
  if (name && sport && department) keys.push(`submission:${name}|${sport}|${department}|${event || "-"}|${shape || "-"}`);
  return keys;
};

export const mergeApprovalRows = (pendingRows = [], entries = []) => {
  const merged = [];
  const keyToIndex = new Map();
  const competitionTeamIds = new Set(
    entries
      .filter((row) => ["entry", "solo", "duo"].includes(normalizedText(row?.type || row?.participant_shape || row?.kind)))
      .map((row) => Number(row?.teamId ?? row?.team_id))
      .filter((id) => Number.isFinite(id) && id > 0)
  );
  const displayEntries = entries.filter((row) => {
    const kind = normalizedText(row?.type || row?.participant_shape || row?.kind);
    const teamId = Number(row?.teamId ?? row?.team_id);
    return !(kind === "team" && competitionTeamIds.has(teamId));
  });

  [...displayEntries, ...pendingRows].forEach((row) => {
    const pendingKind = normalizedText(row?.kind);
    const pendingTeamId = Number(row?.team_id ?? row?.teamId);
    if (pendingKind === "team" && competitionTeamIds.has(pendingTeamId)) return;
    const keys = rowIdentityKeys(row);
    const existingIndex = keys.map((key) => keyToIndex.get(key)).find((index) => index !== undefined);
    if (existingIndex === undefined) {
      const index = merged.length;
      merged.push(row);
      keys.forEach((key) => keyToIndex.set(key, index));
      return;
    }
    const canonical = merged[existingIndex];
    // The role-dashboard summary refreshes in the background, so its current
    // labels/status should win. Keep the canonical entry's roster and IDs.
    merged[existingIndex] = {
      ...canonical,
      ...row,
      entryId: canonical?.entryId ?? row?.entryId ?? row?.entry_id,
      teamId: canonical?.teamId ?? row?.teamId ?? row?.team_id,
      members: Array.isArray(canonical?.members) ? canonical.members : row?.members,
      member_count: canonical?.member_count ?? row?.member_count,
      player_count: canonical?.player_count ?? row?.player_count,
    };
    rowIdentityKeys(merged[existingIndex]).forEach((key) => keyToIndex.set(key, existingIndex));
  });
  return merged;
};

export const approvalMemberCount = (row) => {
  if (Array.isArray(row?.members)) return row.members.length;
  for (const value of [row?.member_count, row?.player_count, row?.roster_count, row?.expected_roster_size]) {
    const count = Number(value);
    if (Number.isFinite(count) && count >= 0) return count;
  }
  return 0;
};
