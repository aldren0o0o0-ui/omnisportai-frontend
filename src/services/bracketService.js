import api from "../api/axios";

export const getFacilitatorTournaments = async () => {
  const res = await api.get("/brackets/facilitator/tournaments");
  return res.data;
};

export const getBrackets = async (tournamentId = null) => {
  const res = await api.get("/brackets", {
    params: tournamentId ? { tournament_id: Number(tournamentId) } : undefined,
  });
  return res.data;
};

export const getBracketRequirements = async (bracketType) => {
  const res = await api.get("/brackets/requirements", {
    params: bracketType ? { bracket_type: bracketType } : undefined
  });
  return res.data;
};

export const getBracketConfiguration = async (tournamentId, sportId) => {
  const res = await api.get("/brackets/configuration", {
    params: {
      tournament_id: tournamentId,
      ...(sportId ? { sport_id: sportId } : {})
    }
  });
  return res.data;
};

export const getManualSeedingCandidates = async (
  tournamentId,
  sportId,
  tournamentSportEventId = null
) => {
  const res = await api.get("/brackets/manual-seeding-candidates", {
    params: {
      tournament_id: tournamentId,
      ...(sportId ? { sport_id: sportId } : {}),
      ...(tournamentSportEventId ? { tournament_sport_event_id: Number(tournamentSportEventId) } : {}),
    },
  });
  return res.data;
};

export const getBracketConfigurationWithAutoSport = async ({
  tournamentId,
  sportId,
}) => {
  if (!sportId) {
    const error = new Error("sport_id is required");
    error.response = {
      status: 400,
      data: { detail: "sport_id is required. Select a sport explicitly." },
    };
    throw error;
  }

  const config = await getBracketConfiguration(tournamentId, sportId);
  return {
    config,
    sport_id: Number(sportId || config?.sport_id || 0) || null,
    auto_selected: false,
    auto_selected_sport_name: null,
  };
};

export const upsertBracketConfiguration = async (payload) => {
  const res = await api.put("/brackets/configuration", payload);
  return res.data;
};

export const getTrashedBrackets = async () => {
  const res = await api.get("/brackets/trash");
  return res.data;
};

export const getBracketMatches = async (bracketId) => {
  const res = await api.get(`/brackets/${bracketId}/matches`);
  return res.data;
};

export const generateBracket = async (payload) => {
  const res = await api.post("/brackets/generate", payload);
  return res.data;
};

export const previewBracket = async (payload) => {
  const res = await api.post("/brackets/preview", payload);
  return res.data;
};

export const generateAllBrackets = async (payload) => {
  const res = await api.post("/brackets/generate-all", payload);
  return res.data;
};

export const getBracketGenerationReadiness = async (tournamentId) => {
  const res = await api.get("/brackets/generate-readiness", {
    params: { tournament_id: tournamentId },
  });
  return res.data;
};

export const finalizeBracket = async (bracketId) => {
  const res = await api.patch(`/brackets/${bracketId}/finalize`, { status: "ACTIVE" });
  return res.data;
};

export const updateBracketStatus = async (bracketId, status) => {
  const res = await api.patch(`/brackets/${bracketId}/status`, { status });
  return res.data;
};

export const moveBracketToTrash = async (bracketId) => {
  const res = await api.patch(`/brackets/${bracketId}/trash`);
  return res.data;
};

export const restoreBracketFromTrash = async (bracketId) => {
  const res = await api.patch(`/brackets/${bracketId}/restore`);
  return res.data;
};

export const deleteBracketPermanently = async (bracketId) => {
  const res = await api.delete(`/brackets/${bracketId}`);
  return res.data;
};

export const getBracketStandings = async (bracketId) => {
  const res = await api.get(`/brackets/${bracketId}/standings`);
  return res.data;
};

export const updateMatchResult = async (matchId, winnerTeamId, scoreTeam1, scoreTeam2) => {
  const payload = {
    winner_team_id: winnerTeamId
  };
  if (Number.isFinite(scoreTeam1)) payload.score_team1 = scoreTeam1;
  if (Number.isFinite(scoreTeam2)) payload.score_team2 = scoreTeam2;

  const res = await api.patch(`/brackets/matches/${matchId}/result`, {
    ...payload
  });
  return res.data;
};

// ---------------------------------------------------------------------------
// Coordinator activation functions
// ---------------------------------------------------------------------------

/**
 * Activate a single bracket by ID.
 *
 * Allowed for Sports Coordinator (globally) and Sports Facilitator
 * (within their assigned sport). Idempotent if already active.
 * This calls the clean /activate alias — does NOT touch /finalize.
 */
export const activateBracket = async (bracketId) => {
  const res = await api.patch(`/brackets/${bracketId}/activate`);
  return res.data;
};

/**
 * Coordinator-only: activate all eligible DRAFT/GENERATED brackets.
 *
 * @param {number|null} sportId  Optional sport filter. When provided,
 *   only brackets belonging to that sport are considered.
 *
 * Returns an activation summary:
 *   { activated_count, already_active_count, skipped_count, skipped[] }
 */
export const activateAllBrackets = async ({ sportId = null, tournamentId = null } = {}) => {
  const params = {};
  if (sportId) params.sport_id = sportId;
  if (tournamentId) params.tournament_id = tournamentId;
  const res = await api.patch("/brackets/activate-all", null, { params });
  return res.data;
};

