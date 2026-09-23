import { getSportDisplayName } from "../../../utils/tournamentEventCategories.js";

const clean = (value) => String(value || "").trim();
const normalizedRole = (value) => clean(value).toUpperCase();

const roleScopeLabel = (assignment) => {
  const role = normalizedRole(assignment?.role_name);
  if (role === "SPORTS_COORDINATOR") return "Coordinator · All departments and sports";
  if (role === "DEPARTMENT_MANAGER") return `Manager · ${clean(assignment?.department_name) || "Department not specified"}`;
  if (role === "SPORTS_FACILITATOR") return `Facilitator · ${getSportDisplayName(assignment, "Sport not specified")}`;
  if (["COACH", "TEAM_MANAGER"].includes(role)) {
    return `Coach · ${clean(assignment?.team_name) || getSportDisplayName(assignment, "Team not specified")}`;
  }
  return null;
};

export const buildUserAssignmentLabels = (user) => {
  const labels = [];
  (user?.role_assignments || []).forEach((assignment) => {
    const label = roleScopeLabel(assignment);
    if (label) labels.push(label);
  });
  (user?.staff_assignments || []).forEach((assignment) => {
    const role = clean(assignment?.assigned_role).replaceAll("_", " ").toLowerCase();
    const roleLabel = role ? role.replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Staff";
    labels.push(`${roleLabel} · ${getSportDisplayName(assignment, "Sport not specified")}`);
  });
  (user?.player_assignments || []).forEach((assignment) => {
    labels.push(`Player · ${clean(assignment?.team_name) || "Team not specified"}`);
  });

  const baseRole = normalizedRole(user?.base_role?.role_name);
  if (baseRole === "SPORTS_COORDINATOR" && !labels.some((label) => label.startsWith("Coordinator ·"))) {
    labels.unshift("Coordinator · All departments and sports");
  }

  return [...new Set(labels)];
};
