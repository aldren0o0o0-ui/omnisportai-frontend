import api from "../api/axios";
import { dispatchWorkspaceListChanged } from "./workspaceEvents";

export const INTRAMURAL_ASSIGNMENTS_CHANGED_EVENT = "omnisport:intramural-assignments-changed";

export const broadcastIntramuralAssignmentsChanged = (detail = {}) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(INTRAMURAL_ASSIGNMENTS_CHANGED_EVENT, { detail }));
};

// Phase 4 (frontend) client for the Phase 3 read-only Intramural/Competition API.
// Additive: does not touch the existing tournamentService.

/**
 * Intramural-first creation. Creates + activates the season workspace AND its
 * competition tournament in a single backend transaction, returning
 * { workspace, tournament }. The caller should dispatch WORKSPACE_CHANGED_EVENT
 * with the returned workspace so the active context updates without a manual
 * refresh.
 */
export const createIntramural = async (payload) => {
  const res = await api.post("/intramurals/", payload);
  dispatchWorkspaceListChanged(
    res.data?.workspace || null,
    res.data?.tournament || null
  );
  return res.data;
};

export const getIntramurals = async (options = {}) => {
  const params = {};
  if (options.includeArchived) params.include_archived = true;
  const res = await api.get("/intramurals/", { params });
  return res.data;
};

export const getIntramural = async (intramuralId) => {
  const res = await api.get(`/intramurals/${intramuralId}`);
  return res.data;
};

export const getAssignmentReadiness = async (workspaceId) => {
  const res = await api.get(`/intramurals/${workspaceId}/assignment-readiness`);
  return res.data;
};

export const getRoleCarryoverPreview = async (workspaceId) => {
  const res = await api.get(`/intramurals/${workspaceId}/role-carryover/preview`);
  return res.data;
};

export const confirmRoleCarryover = async (workspaceId, payload = {}) => {
  const res = await api.post(`/intramurals/${workspaceId}/role-carryover/confirm`, payload);
  broadcastIntramuralAssignmentsChanged({ workspaceId, action: "role-carryover-confirmed" });
  return res.data;
};

export const getLifecycleReadiness = async (workspaceId, action = null) => {
  const suffix = action ? `/${encodeURIComponent(action)}` : "";
  const res = await api.get(`/intramurals/${workspaceId}/lifecycle-readiness${suffix}`);
  return res.data;
};

export const getOperationalReadiness = async (workspaceId) => {
  const res = await api.get(`/intramurals/${workspaceId}/operational-readiness`);
  return res.data;
};

export const transitionIntramuralLifecycle = async (workspaceId, action, payload = {}) => {
  const res = await api.post(
    `/intramurals/${workspaceId}/lifecycle-transitions/${encodeURIComponent(action)}`,
    payload
  );
  return res.data;
};

export const getIntramuralClosurePreview = async (workspaceId) => {
  const res = await api.get(`/intramurals/${workspaceId}/closure-preview`);
  return res.data;
};

export const closeIntramuralAsCancelled = async (workspaceId, payload) => {
  const res = await api.post(`/intramurals/${workspaceId}/close-as-cancelled`, payload);
  dispatchWorkspaceListChanged(res.data?.workspace || null, null);
  return res.data;
};

export const getEligibleTournamentFacilitators = async (workspaceId, sportId) => {
  const res = await api.get(`/intramurals/${workspaceId}/sports/${sportId}/eligible-facilitators`);
  return res.data;
};

export const updateTournamentFacilitators = async (workspaceId, sportId, userIds) => {
  const res = await api.put(`/intramurals/${workspaceId}/sports/${sportId}/facilitators`, { user_ids: userIds });
  return res.data;
};

export const getIntramuralCompetitions = async (intramuralId) => {
  const res = await api.get(`/intramurals/${intramuralId}/competitions`);
  return res.data;
};

export const getCompetition = async (competitionId) => {
  const res = await api.get(`/competitions/${competitionId}`);
  return res.data;
};

export const getCompetitionBrackets = async (competitionId) => {
  const res = await api.get(`/competitions/${competitionId}/brackets`);
  return res.data;
};

export const getCompetitionMatches = async (competitionId) => {
  const res = await api.get(`/competitions/${competitionId}/matches`);
  return res.data;
};

export const getCompetitionStandings = async (competitionId) => {
  const res = await api.get(`/competitions/${competitionId}/standings`);
  return res.data;
};
