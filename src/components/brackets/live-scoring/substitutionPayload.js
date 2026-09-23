export const buildSubstitutionSubmission = ({ control, eventDefinition, teamId, outPlayerId, inPlayerId }) => {
  if (!control || !Number(teamId) || !Number(outPlayerId) || !Number(inPlayerId)) return null;
  const metadata = {
    player_out_id: Number(outPlayerId),
    player_in_id: Number(inPlayerId),
    out_player_id: Number(outPlayerId),
    in_player_id: Number(inPlayerId),
  };
  const valueType = String(eventDefinition?.value_type || "").toLowerCase();
  const inputValueOverride = control.provides_value
    ? valueType === "json" ? JSON.stringify(metadata) : String(inPlayerId)
    : undefined;
  return { teamIdOverride: Number(teamId), playerIdOverride: Number(outPlayerId), inputValueOverride, metadataOverride: metadata };
};
