const TYPE_BY_PREFIX = {
  coach: "COACH",
  department: "DEPARTMENT_MANAGER",
  "sport-facilitator": "SPORTS_FACILITATOR",
  viewer: "PLAYER",
};

export const getSidebarAssignmentContext = (user, rolePrefix, roleLabel = "") => {
  const normalizedLabel = String(roleLabel).toLowerCase();
  const type = normalizedLabel.includes("player") ? "PLAYER" : TYPE_BY_PREFIX[rolePrefix];
  if (!type) return "";
  const labels = (user?.assignment_contexts || [])
    .filter((row) => String(row?.type || "").toUpperCase() === type)
    .map((row) => String(row?.label || "").trim())
    .filter(Boolean);
  if (!labels.length) return "";
  if (labels.length === 1) return labels[0];
  return `${labels[0]} +${labels.length - 1}`;
};
