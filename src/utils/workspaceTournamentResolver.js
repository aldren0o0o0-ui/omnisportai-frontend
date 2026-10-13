export const buildTournamentByWorkspace = (tournaments = []) => {
  const byWorkspace = {};

  (Array.isArray(tournaments) ? tournaments : []).forEach((tournament) => {
    const workspaceId = Number(tournament?.workspace_id || 0);
    if (!workspaceId) return;
    const existing = byWorkspace[workspaceId];
    if (!existing) {
      byWorkspace[workspaceId] = tournament;
    } else {
      const existingStarted = Boolean(existing?.is_started);
      const nextStarted = Boolean(tournament?.is_started);
      if (!existingStarted && nextStarted) {
        byWorkspace[workspaceId] = tournament;
      } else if (Number(tournament?.id || 0) > Number(existing?.id || 0)) {
        byWorkspace[workspaceId] = tournament;
      }
    }
  });

  return byWorkspace;
};

