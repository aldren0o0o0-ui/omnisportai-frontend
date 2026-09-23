export const buildTournamentByWorkspace = (tournaments = []) => {
  const byWorkspace = {};

  (Array.isArray(tournaments) ? tournaments : []).forEach((tournament) => {
    const workspaceId = Number(tournament?.workspace_id || 0);
    if (!workspaceId) return;
    if (byWorkspace[workspaceId]) {
      throw new Error(
        `Workspace ${workspaceId} has multiple operational tournaments.`,
      );
    }
    byWorkspace[workspaceId] = tournament;
  });

  return byWorkspace;
};
