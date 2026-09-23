const loadLandingPage = () => import("../pages/public_views/LandingPage");
const loadAuthPage = () => import("../pages/auth/AuthPage");

const loadCoordinatorDashboard = () => import("../pages/coordinator/Dashboard");
const loadCoordinatorSports = () => import("../pages/coordinator/Sports");
const loadCoordinatorVenues = () => import("../pages/coordinator/Venues");
const loadCoordinatorTeams = () => import("../pages/coordinator/Teams");
const loadCoordinatorTournaments = () => import("../pages/coordinator/Tournaments");
const loadCoordinatorTournamentCreate = () =>
  import("../pages/coordinator/TournamentCreateWizard");
const loadCoordinatorTournamentSettingsVenues = () =>
  import("../pages/coordinator/TournamentSettingsVenues");
const loadCoordinatorRehearsalSetup = () => import("../pages/coordinator/RehearsalSetup");
const loadCoordinatorSchedules = () => import("../pages/coordinator/Schedules");
const loadCoordinatorBrackets = () => import("../pages/coordinator/Brackets");
const loadCoordinatorUserManagement = () =>
  import("../pages/coordinator/UserManagement");
const loadCoordinatorAnalytics = () => import("../pages/coordinator/Analytics");
const loadCoordinatorStaffApplications = () =>
  import("../pages/coordinator/StaffApplications");

const loadDepartmentDashboard = () => import("../pages/department/Dashboard");
const loadDepartmentTeams = () => import("../pages/shared/CompetitionDirectoryPage");
const loadDepartmentSports = () => import("../pages/department/Sports");
const loadDepartmentTournaments = () => import("../pages/department/Tournaments");
const loadDepartmentCoaches = () => import("../pages/department/SportsFacilitators");
const loadDepartmentBrackets = () => import("../pages/department/Brackets");

const loadViewerDashboard = () => import("../pages/viewer/Dashboard");
const loadViewerSports = () => import("../pages/viewer/Sports");
const loadViewerTeams = () => import("../pages/viewer/Teams");
const loadViewerTournaments = () => import("../pages/viewer/Tournaments");
const loadViewerSchedules = () => import("../pages/viewer/Schedules");
const loadViewerBrackets = () => import("../pages/viewer/Brackets");
const loadViewerStandings = () => import("../pages/viewer/Standings");
const loadViewerResults = () => import("../pages/viewer/Results");

const loadSportFacilitatorDashboard = () =>
  import("../pages/sports_facilitator/Dashboard");
const loadSportFacilitatorBrackets = () =>
  import("../pages/sports_facilitator/Brackets");
const loadSportFacilitatorMatchCenter = () =>
  import("../pages/sports_facilitator/MatchEventCenter");
const loadSportFacilitatorAssignedStaff = () =>
  import("../pages/sports_facilitator/AssignedStaff");
const loadSportFacilitatorSchedules = () =>
  import("../pages/sports_facilitator/Schedules");
const loadSportFacilitatorSports = () =>
  import("../pages/sports_facilitator/Sports");
const loadSportFacilitatorTournaments = () =>
  import("../pages/sports_facilitator/Tournaments");

const loadCoachDashboard = () => import("../pages/coach/Dashboard");
const loadCoachTeamRegistration = () => import("../pages/coach/TeamRegistration");
const loadCoachPlayerApplications = () =>
  import("../pages/coach/PlayerApplications");
const loadCoachSchedules = () => import("../pages/coach/Schedules");
const loadCoachBrackets = () => import("../pages/coach/Brackets");
const loadCoachSports = () => import("../pages/coach/Sports");
const loadCoachTournaments = () => import("../pages/coach/Tournaments");

const loadProfilePage = () => import("../pages/shared/ProfilePage");
const loadIntelligenceHub = () => import("../pages/shared/IntelligenceHub");

const routeLoaderByPath = new Map([
  ["/", loadLandingPage],
  ["/login", loadAuthPage],

  ["/dashboard", loadCoordinatorDashboard],
  ["/coordinator/dashboard", loadCoordinatorDashboard],
  ["/coordinator/sports", loadCoordinatorSports],
  ["/coordinator/venues", loadCoordinatorVenues],
  ["/coordinator/teams", loadCoordinatorTeams],
  ["/coordinator/teams-and-players", loadDepartmentTeams],
  ["/coordinator/intramurals", loadCoordinatorTournaments],
  ["/coordinator/intramurals/create", loadCoordinatorTournamentCreate],
  ["/coordinator/intramurals/:tournamentId/settings/venues", loadCoordinatorTournamentSettingsVenues],
  ["/coordinator/rehearsal-setup", loadCoordinatorRehearsalSetup],
  ["/coordinator/tournaments", loadCoordinatorTournaments],
  ["/coordinator/tournaments/create", loadCoordinatorTournamentCreate],
  ["/coordinator/tournaments/:tournamentId/settings/venues", loadCoordinatorTournamentSettingsVenues],
  ["/coordinator/schedules", loadCoordinatorSchedules],
  ["/coordinator/brackets", loadCoordinatorBrackets],
  ["/coordinator/user-management", loadCoordinatorUserManagement],
  ["/coordinator/management/users", loadCoordinatorUserManagement],
  ["/coordinator/management/departments", loadCoordinatorUserManagement],
  ["/coordinator/users", loadCoordinatorUserManagement],
  ["/coordinator/sport-facilitators", loadCoordinatorUserManagement],
  ["/coordinator/sport-staff", loadCoordinatorUserManagement],
  ["/coordinator/staff-applications", loadCoordinatorStaffApplications],
  ["/coordinator/profile", loadProfilePage],
  ["/coordinator/intelligence", loadIntelligenceHub],
  ["/coordinator/analytics", loadCoordinatorAnalytics],

  ["/department/dashboard", loadDepartmentDashboard],
  ["/department/teams", loadDepartmentTeams],
  ["/department/coaches", loadDepartmentCoaches],
  ["/department/sports", loadDepartmentSports],
  ["/department/intramurals", loadDepartmentTournaments],
  ["/department/tournaments", loadDepartmentTournaments],
  ["/department/schedules", () => import("../pages/department/Schedules")],
  ["/department/brackets", loadDepartmentBrackets],
  ["/department/standings", loadViewerStandings],
  ["/department/results", loadViewerResults],
  ["/department/profile", loadProfilePage],
  ["/department/intelligence", loadIntelligenceHub],

  ["/sport-facilitator/dashboard", loadSportFacilitatorDashboard],
  ["/sport-facilitator/approvals", loadDepartmentTeams],
  ["/sport-facilitator/teams-and-players", loadDepartmentTeams],
  ["/sport-facilitator/sports", loadSportFacilitatorSports],
  ["/sport-facilitator/intramurals", loadSportFacilitatorTournaments],
  ["/sport-facilitator/tournaments", loadSportFacilitatorTournaments],
  ["/sport-facilitator/brackets", loadSportFacilitatorBrackets],
  ["/sport-facilitator/schedules", loadSportFacilitatorSchedules],
  ["/sport-facilitator/brackets/trash", loadSportFacilitatorBrackets],
  ["/sport-facilitator/match/:matchId", loadSportFacilitatorMatchCenter],
  ["/sport-facilitator/assigned-staff", loadSportFacilitatorAssignedStaff],
  ["/facilitator/match/:matchId", loadSportFacilitatorMatchCenter],
  ["/sport-facilitator/profile", loadProfilePage],
  ["/sport-facilitator/intelligence", loadIntelligenceHub],

  ["/coach/dashboard", loadCoachDashboard],
  ["/coach/team-registration", loadCoachTeamRegistration],
  ["/coach/teams-and-players", loadDepartmentTeams],
  ["/coach/player-applications", loadCoachPlayerApplications],
  ["/coach/sports", loadCoachSports],
  ["/coach/intramurals", loadCoachTournaments],
  ["/coach/tournaments", loadCoachTournaments],
  ["/coach/brackets", loadCoachBrackets],
  ["/coach/schedules", loadCoachSchedules],
  ["/coach/profile", loadProfilePage],
  ["/coach/intelligence", loadIntelligenceHub],

  ["/viewer/dashboard", loadViewerDashboard],
  ["/viewer/sports", loadViewerSports],
  ["/viewer/teams", loadViewerTeams],
  ["/viewer/teams-and-players", loadDepartmentTeams],
  ["/viewer/intramurals", loadViewerTournaments],
  ["/viewer/tournaments", loadViewerTournaments],
  ["/viewer/schedules", loadViewerSchedules],
  ["/viewer/brackets", loadViewerBrackets],
  ["/viewer/standings", loadViewerStandings],
  ["/viewer/results", loadViewerResults],
  ["/viewer/profile", loadProfilePage],
  ["/viewer/intelligence", loadIntelligenceHub],
]);

const resolvedLoaders = new WeakSet();
const pendingLoaders = new WeakMap();

export const normalizeRoutePath = (path) => {
  if (typeof path !== "string") return "";
  const withoutHash = path.split("#")[0] || "";
  const withoutQuery = withoutHash.split("?")[0] || "";
  let normalized = withoutQuery.trim();
  if (!normalized) return "";
  if (normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
};

const prefetchLoader = async (loader) => {
  if (!loader) return false;
  if (resolvedLoaders.has(loader)) return true;

  const pendingPromise = pendingLoaders.get(loader);
  if (pendingPromise) return pendingPromise;

  const nextPromise = loader()
    .then(() => {
      resolvedLoaders.add(loader);
      pendingLoaders.delete(loader);
      return true;
    })
    .catch(() => {
      pendingLoaders.delete(loader);
      return false;
    });

  pendingLoaders.set(loader, nextPromise);
  return nextPromise;
};

export const prefetchRouteByPath = (path) => {
  const normalizedPath = normalizeRoutePath(path);
  const loader = routeLoaderByPath.get(normalizedPath);
  if (!loader) return Promise.resolve(false);
  return prefetchLoader(loader);
};

export const prefetchRoutesByPath = (paths = []) => {
  const uniquePaths = Array.from(
    new Set(paths.map((path) => normalizeRoutePath(path)).filter(Boolean))
  );
  return Promise.all(uniquePaths.map((path) => prefetchRouteByPath(path)));
};

export const scheduleRoutePrefetch = (paths = [], timeout = 1200) => {
  if (typeof window === "undefined") return;
  const kickoff = () => {
    void prefetchRoutesByPath(paths);
  };

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(kickoff, { timeout });
    return;
  }
  window.setTimeout(kickoff, 120);
};
