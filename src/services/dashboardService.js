import api from "../api/axios";

export const getDashboardMetrics = async () => {
  const res = await api.get("/dashboard/metrics");
  return res.data;
};

export const getRoleDashboardData = async ({
  tournamentId = null,
  workspaceId = null,
  minRestMinutes = 30,
  background = false,
} = {}) => {
  const params = {
    min_rest_minutes: minRestMinutes,
    _live: Date.now(),
  };
  if (tournamentId !== null && tournamentId !== undefined && tournamentId !== "") {
    params.tournament_id = tournamentId;
  }
  if (workspaceId !== null && workspaceId !== undefined && workspaceId !== "") {
    params.workspace_id = workspaceId;
  }
  const res = await api.get("/dashboard/role-data", {
    params,
    headers: { "Cache-Control": "no-cache" },
    omnisportBackground: background,
  });
  return res.data;
};
