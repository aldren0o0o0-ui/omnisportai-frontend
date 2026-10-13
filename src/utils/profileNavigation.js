/**
 * profileNavigation.js
 * Canonical route resolution for profile, edit profile, and account security.
 */

export const resolveMyProfilePath = (roleNames = [], isViewerOnly = false) => {
  if (roleNames.includes("SPORTS_COORDINATOR")) return "/coordinator/profile";
  if (roleNames.includes("DEPARTMENT_MANAGER")) return "/department/profile";
  if (roleNames.includes("SPORTS_FACILITATOR")) return "/sport-facilitator/profile";
  if (roleNames.includes("COACH")) return "/coach/profile";
  if (isViewerOnly || roleNames.includes("VIEWER")) return "/viewer/profile";
  return "/viewer/profile";
};

export const resolveBackProfileRoute = (pathname = "", roleNames = []) => {
  if (pathname.startsWith("/coordinator")) return "/coordinator/profile";
  if (pathname.startsWith("/department")) return "/department/profile";
  if (pathname.startsWith("/sport-facilitator")) return "/sport-facilitator/profile";
  if (pathname.startsWith("/coach")) return "/coach/profile";
  if (pathname.startsWith("/viewer")) return "/viewer/profile";

  if (roleNames.includes("SPORTS_COORDINATOR")) return "/coordinator/profile";
  if (roleNames.includes("DEPARTMENT_MANAGER")) return "/department/profile";
  if (roleNames.includes("SPORTS_FACILITATOR")) return "/sport-facilitator/profile";
  if (roleNames.includes("COACH")) return "/coach/profile";
  return "/viewer/profile";
};
