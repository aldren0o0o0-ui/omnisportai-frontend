const PUBLIC_VISIBILITY = new Set(["PUBLIC", "AUTHORIZED"]);

export const columnsForMetricSchema = (schema, participantType = null) => {
  const scope = String(participantType || "").toUpperCase();
  return (Array.isArray(schema?.metrics) ? schema.metrics : [])
    .filter((metric) => PUBLIC_VISIBILITY.has(String(metric?.visibility || "PUBLIC").toUpperCase()))
    .filter((metric) => {
      if (!scope) return true;
      const scopes = Array.isArray(metric?.participant_scopes) ? metric.participant_scopes : [];
      if (scope === "SOLO" || scope === "DUO" || scope === "LANE") {
        return scopes.includes("ENTRY") || scopes.includes("PLAYER") || scopes.includes("TOURNAMENT");
      }
      return scopes.includes(scope) || scopes.includes("TOURNAMENT");
    })
    .filter((metric) => !["RESULT_REASON", "RESULT_STATUS"].includes(metric.code))
    .slice(0, 6);
};

export const rankingExplanation = (policy) => {
  const labels = Array.isArray(policy?.labels) ? policy.labels : [];
  if (!labels.length) return "The active competition rules determine this ranking.";
  return `Participants are ranked by:\n${labels.map((label, index) => `${index + 1}. ${label}`).join("\n")}`;
};

export const analyticsEmptyState = ({ rowCount = 0, provisional = false, stale = false } = {}) => {
  if (stale) {
    return {
      title: "Standings need to be refreshed",
      message: "Official results changed after the last calculation.",
    };
  }
  if (provisional && rowCount > 0) {
    return {
      title: "Standings are provisional",
      message: "Some Matches or Event results are still incomplete.",
    };
  }
  if (rowCount <= 0) {
    return {
      title: "No standings yet",
      message: "Standings will appear after official Match results are recorded.",
    };
  }
  return null;
};

export const formatMetricValue = (value, metric) => {
  if (value === null || value === undefined || value === "") return "—";
  if (metric?.unit === "seconds") {
    const seconds = Number(value);
    if (!Number.isFinite(seconds)) return String(value);
    const minutes = Math.floor(seconds / 60);
    const remainder = (seconds % 60).toFixed(2).padStart(5, "0");
    return minutes > 0 ? `${minutes}:${remainder}` : `${seconds.toFixed(2)} s`;
  }
  if (metric?.unit === "points" && Number.isFinite(Number(value))) {
    return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return String(value);
};

export const participantTypeLabel = (value) => {
  const normalized = String(value || "").toUpperCase();
  if (normalized === "DUO") return "Pair";
  if (normalized === "SOLO") return "Individual";
  if (normalized === "LANE") return "Lane participant";
  if (normalized === "PLAYER") return "Player";
  return "Team";
};

export const analyticsParticipantType = ({ sportCode, participantShape, playerMode = false } = {}) => {
  if (playerMode) return "PLAYER";
  const code = String(sportCode || "").toUpperCase();
  if (code === "ATHLETICS" || code === "SWIMMING") return "LANE";
  const shape = String(participantShape || "").toUpperCase();
  if (shape === "SOLO" || shape === "DUO") return shape;
  return "TEAM";
};

export const filterStandingRowsByDepartment = (rows, departmentId) => {
  const items = Array.isArray(rows) ? rows : [];
  if (departmentId === null || departmentId === undefined || departmentId === "") return items;
  const selectedId = Number(departmentId);
  if (Number.isFinite(selectedId) && selectedId > 0) {
    return items.filter((row) => Number(row?.department_id || 0) === selectedId);
  }
  return items.filter((row) => String(row?.department_name || "") === String(departmentId));
};
