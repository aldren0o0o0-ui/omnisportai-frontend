export const buildEventPayload = ({ selectedControl, formState, validatedConfig, liveStateVersion }) => {
  if (!selectedControl || !validatedConfig) {
    return { payload: null, error: "Missing control or config context" };
  }

  const { selectedTeamId, selectedPlayerId, inputValue, inputBoolean } = formState;

  const eventDef = validatedConfig.event_types.find(
    et => String(et.name || "").toUpperCase() === selectedControl.event_type
  );

  if (!eventDef) {
    return { payload: null, error: "Event definition not found for control" };
  }

  const payload = {
    event_type: selectedControl.event_type
  };

  if (selectedControl.requires_team) {
    const teamId = Number(selectedTeamId);
    if (!Number.isFinite(teamId) || teamId <= 0) {
      return { payload: null, error: "Please select a team." };
    }
    payload.team_id = teamId;
  }

  if (selectedControl.requires_player) {
    const playerId = Number(selectedPlayerId);
    if (!Number.isFinite(playerId) || playerId <= 0) {
      return { payload: null, error: "Please select a player." };
    }
    payload.player_id = playerId;
  } else {
    // Player attribution is optional for team-level controls. When the tally-board
    // operator selected an athlete, preserve that context without changing scoring.
    const playerId = Number(selectedPlayerId);
    if (Number.isFinite(playerId) && playerId > 0) payload.player_id = playerId;
  }

  if (selectedControl.provides_value) {
    if (selectedControl.value !== undefined) {
      payload.value = selectedControl.value;
    } else {
      const valueType = eventDef.value_type || "text";
      if (valueType === "boolean") {
        payload.value = Boolean(inputBoolean);
      } else {
        const trimmed = String(inputValue || "").trim();
        if (!trimmed) {
          return { payload: null, error: "Value is required." };
        }
        if (valueType === "integer") {
          const parsed = Number(trimmed);
          if (!Number.isFinite(parsed)) return { payload: null, error: "Value must be an integer." };
          payload.value = Math.trunc(parsed);
        } else if (valueType === "float") {
          const parsed = Number(trimmed);
          if (!Number.isFinite(parsed)) return { payload: null, error: "Value must be a number." };
          payload.value = parsed;
        } else if (valueType === "json") {
          try {
            payload.value = JSON.parse(trimmed);
          } catch {
            return { payload: null, error: "Value must be valid JSON." };
          }
        } else {
          payload.value = trimmed;
        }
      }
    }
  }

  if (selectedControl.metadata && typeof selectedControl.metadata === "object") {
    payload.metadata = selectedControl.metadata;
  }

  payload.client_event_id = window.crypto?.randomUUID?.() || `evt-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  payload.expected_state_version = Number(liveStateVersion || validatedConfig.state_version || 0);

  return { payload, error: null };
};
