/**
 * settingsNavigation.js
 * Canonical route resolution for Settings and related sub-pages.
 */

export const resolveRolePrefix = (roleNames = [], isViewerOnly = false) => {
  if (roleNames.includes("SPORTS_COORDINATOR")) return "coordinator";
  if (roleNames.includes("DEPARTMENT_MANAGER")) return "department";
  if (roleNames.includes("SPORTS_FACILITATOR")) return "sport-facilitator";
  if (roleNames.includes("COACH")) return "coach";
  if (isViewerOnly || roleNames.includes("VIEWER")) return "viewer";
  return "viewer";
};

export const resolveMySettingsPath = (roleNames = [], isViewerOnly = false) => {
  const role = resolveRolePrefix(roleNames, isViewerOnly);
  return `/${role}/settings`;
};

export const resolveBackSettingsRoute = (pathname = "", roleNames = []) => {
  if (pathname.startsWith("/coordinator")) return "/coordinator/settings";
  if (pathname.startsWith("/department")) return "/department/settings";
  if (pathname.startsWith("/sport-facilitator")) return "/sport-facilitator/settings";
  if (pathname.startsWith("/coach")) return "/coach/settings";
  if (pathname.startsWith("/viewer")) return "/viewer/settings";

  const role = resolveRolePrefix(roleNames);
  return `/${role}/settings`;
};
