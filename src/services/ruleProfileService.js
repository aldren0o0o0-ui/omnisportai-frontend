import api from "../api/axios";

export const getSportRuleProfiles = async ({ sportId, includeInactive = false } = {}) => {
  const params = {};
  if (sportId) params.sport_id = Number(sportId);
  if (includeInactive) params.include_inactive = true;
  const res = await api.get("/sport-rule-profiles/", { params });
  return Array.isArray(res.data) ? res.data : [];
};

export const getGovernanceStandards = async ({ tournamentId = null } = {}) => {
  const params = {};
  if (tournamentId) params.tournament_id = Number(tournamentId);
  const res = await api.get("/sport-rule-profiles/governance/standards", { params });
  return Array.isArray(res.data) ? res.data : [];
};

export const getApprovedRuleSummaries = async ({
  tournamentId = null,
  sportId = null,
} = {}) => {
  const params = {};
  if (tournamentId) params.tournament_id = Number(tournamentId);
  if (sportId) params.sport_id = Number(sportId);
  const res = await api.get("/sport-rule-profiles/governance/summaries", { params });
  return Array.isArray(res.data) ? res.data : [];
};

export const getIntramuralRuleProfiles = async (tournamentId) => {
  const res = await api.get(
    `/sport-rule-profiles/governance/intramurals/${Number(tournamentId)}`
  );
  return Array.isArray(res.data) ? res.data : [];
};

export const getRuleProfileEvents = async (tournamentId, sportId) => {
  const res = await api.get(
    `/sport-rule-profiles/governance/intramurals/${Number(
      tournamentId
    )}/sports/${Number(sportId)}/events`
  );
  return Array.isArray(res.data) ? res.data : [];
};

export const createIntramuralRuleProfile = async (tournamentId, payload) => {
  const res = await api.post(
    `/sport-rule-profiles/governance/intramurals/${Number(tournamentId)}`,
    { ...payload, tournament_id: Number(tournamentId) }
  );
  return res.data;
};

export const updateRuleProfileDraft = async (profileId, payload) => {
  const res = await api.patch(
    `/sport-rule-profiles/governance/profiles/${Number(profileId)}/draft`,
    payload
  );
  return res.data;
};

export const resetRuleProfileDraft = async (profileId, payload) => {
  const res = await api.post(
    `/sport-rule-profiles/governance/profiles/${Number(profileId)}/reset`,
    payload
  );
  return res.data;
};

export const transitionRuleProfile = async (profileId, action, payload) => {
  const res = await api.post(
    `/sport-rule-profiles/governance/profiles/${Number(profileId)}/${action}`,
    payload
  );
  return res.data;
};

export const getRuleProfileVersions = async (profileId) => {
  const res = await api.get(
    `/sport-rule-profiles/governance/profiles/${Number(profileId)}/versions`
  );
  return Array.isArray(res.data) ? res.data : [];
};

export const getRuleProfileHistory = async (profileId) => {
  const res = await api.get(
    `/sport-rule-profiles/governance/profiles/${Number(profileId)}/history`
  );
  return Array.isArray(res.data) ? res.data : [];
};

export const getInstitutionalConfirmation = async ({
  tournamentId,
  sportId,
  eventId = null,
}) => {
  const params = eventId ? { tournament_sport_event_id: Number(eventId) } : {};
  const res = await api.get(
    `/sport-rule-profiles/governance/intramurals/${Number(
      tournamentId
    )}/sports/${Number(sportId)}/confirmation`,
    { params }
  );
  return res.data;
};

export const saveInstitutionalConfirmation = async ({
  tournamentId,
  sportId,
  payload,
}) => {
  const res = await api.post(
    `/sport-rule-profiles/governance/intramurals/${Number(
      tournamentId
    )}/sports/${Number(sportId)}/confirmation`,
    payload
  );
  return res.data;
};

export const previewRuleProfileAdoption = async (profileId) => {
  const res = await api.get(
    `/sport-rule-profiles/governance/profiles/${Number(
      profileId
    )}/adoption-preview`
  );
  return res.data;
};

export const adoptRuleProfile = async (profileId, payload) => {
  const res = await api.post(
    `/sport-rule-profiles/governance/profiles/${Number(profileId)}/adopt`,
    payload
  );
  return res.data;
};

export const setInstitutionalRuleDefault = async (profileId, payload) => {
  const res = await api.post(
    `/sport-rule-profiles/governance/profiles/${Number(profileId)}/set-institutional-default`,
    payload
  );
  return res.data;
};

export const getInstitutionalSportRules = async (sportId) => {
  const res = await api.get(
    `/sport-rule-profiles/governance/institution/sports/${Number(sportId)}`
  );
  return res.data;
};

export const publishInstitutionalSportRules = async (sportId, payload) => {
  const res = await api.post(
    `/sport-rule-profiles/governance/institution/sports/${Number(sportId)}`,
    payload
  );
  return res.data;
};
