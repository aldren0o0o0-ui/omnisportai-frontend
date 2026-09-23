// src/App.jsx
import { Suspense, createElement, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// import ProtectedRoute from './pages/router/ProtectedRoute';
import ProtectedRoute from './router/ProtectedRoute';
import TournamentAccessRoute from './router/TournamentAccessRoute';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { WorkspaceProvider } from './context/WorkspaceContext';
import AuthQueryCacheBoundary from './query/AuthQueryCacheBoundary';
import NotificationToggleBanner from './pages/shared/NotificationToggleBanner';
import CoordinatorLayout from './layouts/CoordinatorLayout';
import ViewerLayout from './layouts/ViewerLayout';
import DepartmentManagerLayout from './layouts/DepartmentManagerLayout';
import SportFacilitatorLayout from './layouts/SportFacilitatorLayout';
import CoachLayout from './layouts/CoachLayout';
import PageLoadingIndicator from './components/common/PageLoadingIndicator';
import RouteDataBoundary from './components/common/RouteDataBoundary';
import { ProfileDrawerProvider, UniversalProfileDrawer } from './components/profile';
const AuthPage = lazy(() => import('./pages/auth/AuthPage'));
const LandingPage = lazy(() => import('./pages/public_views/LandingPage'));

const Tournaments = lazy(() => import('./pages/coordinator/Tournaments'));
const Intramurals = lazy(() => import('./pages/coordinator/Intramurals'));
const TournamentCreateWizard = lazy(() => import('./pages/coordinator/TournamentCreateWizard'));
const TournamentSettingsVenues = lazy(() => import('./pages/coordinator/TournamentSettingsVenues'));
const RehearsalSetup = lazy(() => import('./pages/coordinator/RehearsalSetup'));
const Sports = lazy(() => import('./pages/coordinator/Sports'));
const Venues = lazy(() => import('./pages/coordinator/Venues'));
const Teams = lazy(() => import('./pages/coordinator/Teams'));
const Players = lazy(() => import('./pages/coordinator/Players'));
const Schedules = lazy(() => import('./pages/coordinator/Schedules'));
const Brackets = lazy(() => import('./pages/coordinator/Brackets'));
const ManagementUsers = lazy(() => import('./pages/coordinator/management/UsersPage'));
const ManagementDepartments = lazy(() => import('./pages/coordinator/management/DepartmentsPage'));
const LegacyManagementRedirect = lazy(() => import('./pages/coordinator/management/LegacyManagementRedirect'));
const Analytics = lazy(() => import('./pages/coordinator/Analytics'));
const CoordinatorSportStaff = lazy(() => import('./pages/coordinator/SportStaff'));
const CoordinatorStaffApplications = lazy(() => import('./pages/coordinator/StaffApplications'));

const ViewerSports = lazy(() => import('./pages/viewer/Sports'));
const ViewerTeams = lazy(() => import('./pages/viewer/Teams'));
const TeamApplicationWizard = lazy(() => import('./pages/viewer/TeamApplicationWizard'));
const ViewerTournaments = lazy(() => import('./pages/viewer/Tournaments'));
const ViewerSchedules = lazy(() => import('./pages/viewer/Schedules'));
const ViewerBrackets = lazy(() => import('./pages/viewer/Brackets'));
const ViewerStandings = lazy(() => import('./pages/viewer/Standings'));
const ViewerResults = lazy(() => import('./pages/viewer/Results'));

const DepartmentSports = lazy(() => import('./pages/department/Sports'));
const DepartmentTournaments = lazy(() => import('./pages/department/Tournaments'));
const SportFacilitator = lazy(() => import('./pages/department/SportsFacilitators'));
const DepartmentSchedules = lazy(() => import('./pages/department/Schedules'));
const DepartmentBrackets = lazy(() => import('./pages/department/Brackets'));
const TournamentCoachAssignments = lazy(() => import('./pages/department/TournamentCoachAssignments'));

const FacilitatorBrackets = lazy(() => import('./pages/sports_facilitator/Brackets'));
const MatchEventCenter = lazy(() => import('./pages/sports_facilitator/MatchEventCenter'));
const FacilitatorAssignedStaff = lazy(() => import('./pages/sports_facilitator/AssignedStaff'));
const FacilitatorSports = lazy(() => import('./pages/sports_facilitator/Sports'));
const FacilitatorTournaments = lazy(() => import('./pages/sports_facilitator/Tournaments'));
const LiveScoringPage = lazy(() => import('./pages/shared/LiveScoringPage'));
const LiveMatchViewerPage = lazy(() => import('./pages/shared/LiveMatchViewerPage'));
const RaceStageManagementPage = lazy(() => import('./pages/coordinator/RaceStageManagementPage'));
const RaceFacilitatorConsolePage = lazy(() => import('./pages/sports_facilitator/RaceFacilitatorConsolePage'));

const TeamRegistration = lazy(() => import('./pages/coach/TeamRegistration'));
const PlayerApplications = lazy(() => import('./pages/coach/PlayerApplications'));
const CoachSchedules = lazy(() => import('./pages/coach/Schedules'));
const CoachBrackets = lazy(() => import('./pages/coach/Brackets'));
const CoachSports = lazy(() => import('./pages/coach/Sports'));
const CoachTournaments = lazy(() => import('./pages/coach/Tournaments'));
const MyProfile = lazy(() => import('./pages/profile/MyProfile'));
const ProfileRouteRedirect = lazy(() => import('./pages/profile/ProfileRouteRedirect'));
const IntelligenceHub = lazy(() => import('./pages/shared/IntelligenceHub'));
const NotificationsPage = lazy(() => import('./pages/shared/NotificationsPage'));
const NotificationPreferences = lazy(() => import('./pages/shared/NotificationPreferences'));
const NotificationRedirector = lazy(() => import('./pages/shared/NotificationRedirector'));
const SharedStandings = lazy(() => import('./pages/shared/StandingsPage'));
const ResultCorrectionsPage = lazy(() => import('./pages/shared/ResultCorrectionsPage'));
const AnnouncementsPage = lazy(() => import('./pages/shared/AnnouncementsPage'));
const AnnouncementDetailPage = lazy(() => import('./pages/shared/AnnouncementDetailPage'));
const CreateAnnouncementPage = lazy(() => import('./pages/shared/CreateAnnouncementPage'));
const CompetitionDirectoryPage = lazy(() => import('./pages/shared/CompetitionDirectoryPage'));

const CoordinatorDashboard = lazy(() => import('./pages/coordinator/Dashboard'));
const DepartmentDashboard = lazy(() => import('./pages/department/Dashboard'));
const FacilitatorDashboard = lazy(() => import('./pages/sports_facilitator/Dashboard'));
const FacilitatorSchedules = lazy(() => import('./pages/sports_facilitator/Schedules'));
const CoachDashboard = lazy(() => import('./pages/coach/Dashboard'));
const ViewerDashboard = lazy(() => import('./pages/viewer/Dashboard'));

const routeLoadingFallback = <PageLoadingIndicator />;

const renderLazyRoute = (Component) => (
  <Suspense fallback={routeLoadingFallback}>
    <RouteDataBoundary>{createElement(Component)}</RouteDataBoundary>
  </Suspense>
);

const renderLazyDashboard = (Component) => (
  <Suspense fallback={routeLoadingFallback}>
    <RouteDataBoundary>{createElement(Component)}</RouteDataBoundary>
  </Suspense>
);

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthQueryCacheBoundary>
        <WorkspaceProvider>
        <NotificationToggleBanner />
        <Router>
          <ProfileDrawerProvider>
            <UniversalProfileDrawer />
            <Routes>
            {/* Public Routes */}
            <Route path='/' element={renderLazyRoute(LandingPage)} />
            <Route path="/login" element={renderLazyRoute(AuthPage)} />
            <Route path="/auth/postback/github" element={<Navigate to="/login" replace />} />
            <Route path="/notification-redirect" element={renderLazyRoute(NotificationRedirector)} />
            <Route element={<ProtectedRoute />}>
              <Route path="/profile" element={renderLazyRoute(ProfileRouteRedirect)} />
            </Route>

            {/* Private / Protected Route Logic */}
            <Route element={<ProtectedRoute allowRoles={["SPORTS_COORDINATOR"]} />}>
              <Route path="/dashboard" element={renderLazyDashboard(CoordinatorDashboard)} />
              <Route path="/coordinator" element={<CoordinatorLayout />}>
                <Route path="dashboard" element={renderLazyDashboard(CoordinatorDashboard)} />
                <Route path="profile" element={renderLazyRoute(MyProfile)} />
                <Route path="intelligence" element={renderLazyRoute(IntelligenceHub)} />
                <Route path="notifications" element={renderLazyRoute(NotificationsPage)} />
                <Route path="notification-settings" element={renderLazyRoute(NotificationPreferences)} />
                <Route path="announcements" element={renderLazyRoute(AnnouncementsPage)} />
                <Route path="announcements/new" element={renderLazyRoute(CreateAnnouncementPage)} />
                <Route path="announcements/:announcementId" element={renderLazyRoute(AnnouncementDetailPage)} />
                <Route path="sports" element={renderLazyRoute(Sports)} />
                <Route path="rule-standards" element={<Navigate to="/coordinator/sports" replace />} />
                <Route path="sports/:sportId/teams" element={<Navigate to="/coordinator/teams-and-players" replace />} />
                <Route path="venues" element={renderLazyRoute(Venues)} />
                <Route path="teams" element={<Navigate to="/coordinator/teams-and-players" replace />} />
                <Route path="teams-and-players" element={renderLazyRoute(CompetitionDirectoryPage)} />
                <Route path="players" element={renderLazyRoute(Players)} />
                <Route path="intramurals" element={renderLazyRoute(Tournaments)} />
                <Route path="tournaments" element={<Navigate to="/coordinator/intramurals" replace />} />
                <Route path="intramurals/read-only" element={renderLazyRoute(Intramurals)} />
                <Route path="intramurals/create" element={renderLazyRoute(TournamentCreateWizard)} />
                <Route path="intramurals/:tournamentId/settings/venues" element={renderLazyRoute(TournamentSettingsVenues)} />
                <Route path="rehearsal-setup" element={renderLazyRoute(RehearsalSetup)} />
                <Route path="tournaments/create" element={renderLazyRoute(TournamentCreateWizard)} />
                <Route path="tournaments/:tournamentId/settings/venues" element={renderLazyRoute(TournamentSettingsVenues)} />
                <Route path="schedules" element={renderLazyRoute(Schedules)} />
                <Route path="standings" element={renderLazyRoute(SharedStandings)} />
                <Route path="brackets" element={renderLazyRoute(Brackets)} />
                <Route path="matches/:matchId/live-scoring" element={renderLazyRoute(LiveScoringPage)} />
                <Route path="matches/:matchId" element={renderLazyRoute(LiveMatchViewerPage)} />
                <Route path="events/:eventId/stages" element={renderLazyRoute(RaceStageManagementPage)} />
                <Route path="contests/:contestId/timing" element={renderLazyRoute(RaceFacilitatorConsolePage)} />
                <Route path="result-corrections" element={renderLazyRoute(ResultCorrectionsPage)} />
                <Route path="management/users" element={renderLazyRoute(ManagementUsers)} />
                <Route path="management/departments" element={renderLazyRoute(ManagementDepartments)} />
                <Route path="users" element={renderLazyRoute(() => <LegacyManagementRedirect kind="users" />)} />
                <Route path="user-management" element={renderLazyRoute(LegacyManagementRedirect)} />
                <Route
                  path="sport-facilitators"
                  element={renderLazyRoute(() => <LegacyManagementRedirect kind="facilitators" />)}
                />
                <Route path="analytics" element={renderLazyRoute(Analytics)} />
                <Route
                  path="sport-staff"
                  element={renderLazyRoute(() => <LegacyManagementRedirect kind="staff" />)}
                />
                <Route path="staff-applications" element={renderLazyRoute(CoordinatorStaffApplications)} />
                <Route path="workspaces" element={<Navigate to="/coordinator/intramurals" replace />} />
              </Route>
            </Route>

            <Route element={<ProtectedRoute allowRoles={["DEPARTMENT_MANAGER", "SPORTS_COORDINATOR"]} />}>
              <Route
                element={
                  <TournamentAccessRoute
                    globalAllowedRoles={["DEPARTMENT_MANAGER", "SPORTS_COORDINATOR"]}
                    tournamentAllowedModes={["department_manager", "sports_coordinator"]}
                    allowWithoutTournamentSelection
                  />
                }
              >
                <Route path="/department" element={<DepartmentManagerLayout />}>
                  <Route path="dashboard" element={renderLazyDashboard(DepartmentDashboard)} />
                  <Route path="profile" element={renderLazyRoute(MyProfile)} />
                  <Route path="intelligence" element={renderLazyRoute(IntelligenceHub)} />
                  <Route path="notifications" element={renderLazyRoute(NotificationsPage)} />
                  <Route path="notification-settings" element={renderLazyRoute(NotificationPreferences)} />
                  <Route path="announcements" element={renderLazyRoute(AnnouncementsPage)} />
                  <Route path="announcements/new" element={renderLazyRoute(CreateAnnouncementPage)} />
                  <Route path="announcements/:announcementId" element={renderLazyRoute(AnnouncementDetailPage)} />
                  <Route path="teams" element={renderLazyRoute(CompetitionDirectoryPage)} />
                  <Route path="teams-and-players" element={<Navigate to="/department/teams" replace />} />
                  <Route path="coaches" element={renderLazyRoute(SportFacilitator)} />
                  <Route path="coach-assignments" element={renderLazyRoute(TournamentCoachAssignments)} />
                  <Route path="sports" element={renderLazyRoute(DepartmentSports)} />
                  <Route path="venues" element={renderLazyRoute(Venues)} />
                  <Route path="rules" element={<Navigate to="/department/sports" replace />} />
                  <Route path="sports/:sportId/teams" element={<Navigate to="/department/teams-and-players" replace />} />
                  <Route path="intramurals" element={renderLazyRoute(DepartmentTournaments)} />
                  <Route path="tournaments" element={<Navigate to="/department/intramurals" replace />} />
                  <Route path="schedules" element={renderLazyRoute(DepartmentSchedules)} />
                  <Route path="brackets" element={renderLazyRoute(DepartmentBrackets)} />
                  <Route path="standings" element={renderLazyRoute(ViewerStandings)} />
                  <Route path="results" element={renderLazyRoute(ViewerResults)} />
                  <Route path="matches/:matchId/live-scoring" element={renderLazyRoute(LiveMatchViewerPage)} />
                  <Route path="matches/:matchId" element={renderLazyRoute(LiveMatchViewerPage)} />
                </Route>
              </Route>
            </Route>

            <Route element={<ProtectedRoute allowRoles={["SPORTS_FACILITATOR", "SPORTS_COORDINATOR"]} />}>
              <Route
                element={
                  <TournamentAccessRoute
                    globalAllowedRoles={["SPORTS_FACILITATOR", "SPORTS_COORDINATOR"]}
                    tournamentAllowedModes={["sports_facilitator", "sports_coordinator"]}
                    allowWithoutTournamentSelection
                  />
                }
              >
                <Route path="/sport-facilitator" element={<SportFacilitatorLayout />}>
                  <Route index element={renderLazyDashboard(FacilitatorDashboard)} />
                  <Route path="dashboard" element={renderLazyDashboard(FacilitatorDashboard)} />
                  <Route path="profile" element={renderLazyRoute(MyProfile)} />
                  <Route path="intelligence" element={renderLazyRoute(IntelligenceHub)} />
                  <Route path="notifications" element={renderLazyRoute(NotificationsPage)} />
                  <Route path="notification-settings" element={renderLazyRoute(NotificationPreferences)} />
                  <Route path="announcements" element={renderLazyRoute(AnnouncementsPage)} />
                  <Route path="announcements/new" element={renderLazyRoute(CreateAnnouncementPage)} />
                  <Route path="announcements/:announcementId" element={renderLazyRoute(AnnouncementDetailPage)} />
                  <Route path="approvals" element={<Navigate to="/sport-facilitator/teams-and-players?status=PENDING_REVIEW" replace />} />
                  <Route path="assigned-staff" element={renderLazyRoute(FacilitatorAssignedStaff)} />
                  <Route path="teams-and-players" element={renderLazyRoute(CompetitionDirectoryPage)} />
                  <Route path="sports" element={renderLazyRoute(FacilitatorSports)} />
                  <Route path="venues" element={renderLazyRoute(Venues)} />
                  <Route path="rule-standards" element={<Navigate to="/sport-facilitator/sports" replace />} />
                  <Route path="sports/:sportId/teams" element={<Navigate to="/sport-facilitator/teams-and-players" replace />} />
                  <Route path="intramurals" element={renderLazyRoute(FacilitatorTournaments)} />
                  <Route path="tournaments" element={<Navigate to="/sport-facilitator/intramurals" replace />} />
                  <Route path="brackets" element={renderLazyRoute(FacilitatorBrackets)} />
                  <Route path="schedules" element={renderLazyRoute(FacilitatorSchedules)} />
                  <Route path="standings" element={renderLazyRoute(SharedStandings)} />
                  <Route path="brackets/trash" element={<Navigate to="/sport-facilitator/brackets" replace />} />
                  <Route path="match/:matchId" element={renderLazyRoute(MatchEventCenter)} />
                  <Route path="matches/:matchId/live-scoring" element={renderLazyRoute(LiveScoringPage)} />
                  <Route path="matches/:matchId" element={renderLazyRoute(LiveMatchViewerPage)} />
                  <Route path="events/:eventId/stages" element={renderLazyRoute(RaceStageManagementPage)} />
                  <Route path="contests/:contestId/timing" element={renderLazyRoute(RaceFacilitatorConsolePage)} />
                  <Route path="result-corrections" element={renderLazyRoute(ResultCorrectionsPage)} />
                </Route>
                <Route path="/facilitator/match/:matchId" element={renderLazyRoute(MatchEventCenter)} />
                <Route path="/facilitator/matches/:matchId/live-scoring" element={renderLazyRoute(LiveScoringPage)} />
                <Route path="/facilitator/matches/:matchId" element={renderLazyRoute(LiveMatchViewerPage)} />
                <Route path="/facilitator/events/:eventId/stages" element={renderLazyRoute(RaceStageManagementPage)} />
                <Route path="/facilitator/contests/:contestId/timing" element={renderLazyRoute(RaceFacilitatorConsolePage)} />
                <Route path="/facilitator/contests/:contestId" element={renderLazyRoute(RaceFacilitatorConsolePage)} />
              </Route>
            </Route>

            <Route element={<ProtectedRoute allowRoles={["COACH", "SPORTS_COORDINATOR"]} />}>
              <Route
                element={
                  <TournamentAccessRoute
                    globalAllowedRoles={["COACH", "SPORTS_COORDINATOR"]}
                    tournamentAllowedModes={["coach", "assistant_coach", "sports_coordinator"]}
                    allowWithoutTournamentSelection
                  />
                }
              >
                <Route path="/coach" element={<CoachLayout />}>
                  <Route index element={renderLazyDashboard(CoachDashboard)} />
                  <Route path="dashboard" element={renderLazyDashboard(CoachDashboard)} />
                  <Route path="profile" element={renderLazyRoute(MyProfile)} />
                  <Route path="intelligence" element={renderLazyRoute(IntelligenceHub)} />
                  <Route path="notifications" element={renderLazyRoute(NotificationsPage)} />
                  <Route path="notification-settings" element={renderLazyRoute(NotificationPreferences)} />
                  <Route path="announcements" element={renderLazyRoute(AnnouncementsPage)} />
                  <Route path="announcements/new" element={renderLazyRoute(CreateAnnouncementPage)} />
                  <Route path="announcements/:announcementId" element={renderLazyRoute(AnnouncementDetailPage)} />
                  <Route path="team-registration" element={renderLazyRoute(TeamRegistration)} />
                  <Route path="player-applications" element={renderLazyRoute(PlayerApplications)} />
                  <Route path="teams-and-players" element={renderLazyRoute(CompetitionDirectoryPage)} />
                  <Route path="applications" element={<Navigate to="/coach/player-applications" replace />} />
                  <Route path="teams" element={<Navigate to="/coach/teams-and-players" replace />} />
                  <Route path="sports" element={renderLazyRoute(CoachSports)} />
                  <Route path="venues" element={renderLazyRoute(Venues)} />
                  <Route path="rules" element={<Navigate to="/coach/sports" replace />} />
                  <Route path="sports/:sportId/teams" element={<Navigate to="/coach/teams-and-players" replace />} />
                  <Route path="intramurals" element={renderLazyRoute(CoachTournaments)} />
                  <Route path="tournaments" element={<Navigate to="/coach/intramurals" replace />} />
                  <Route path="brackets" element={renderLazyRoute(CoachBrackets)} />
                  <Route path="schedules" element={renderLazyRoute(CoachSchedules)} />
                  <Route path="matches/:matchId/live-scoring" element={renderLazyRoute(LiveMatchViewerPage)} />
                  <Route path="matches/:matchId" element={renderLazyRoute(LiveMatchViewerPage)} />
                  <Route path="standings" element={renderLazyRoute(SharedStandings)} />
                </Route>
              </Route>
            </Route>


            <Route element={<ProtectedRoute />}>
              <Route element={<TournamentAccessRoute tournamentAllowedModes={["viewer", "player"]} allowWithoutTournamentSelection />}>
              <Route path="/viewer" element={<ViewerLayout />}>
                <Route path="dashboard" element={renderLazyDashboard(ViewerDashboard)} />
                <Route path="profile" element={renderLazyRoute(MyProfile)} />
                <Route path="intelligence" element={renderLazyRoute(IntelligenceHub)} />
                <Route path="notifications" element={renderLazyRoute(NotificationsPage)} />
                <Route path="notification-settings" element={renderLazyRoute(NotificationPreferences)} />
                <Route path="announcements" element={renderLazyRoute(AnnouncementsPage)} />
                <Route path="announcements/:announcementId" element={renderLazyRoute(AnnouncementDetailPage)} />
                <Route path="sports" element={renderLazyRoute(ViewerSports)} />
                <Route path="venues" element={renderLazyRoute(Venues)} />
                <Route path="rules" element={<Navigate to="/viewer/sports" replace />} />
                <Route path="sports/:sportId/teams" element={<Navigate to="/viewer/teams-and-players" replace />} />
                <Route path="teams" element={renderLazyRoute(ViewerTeams)} />
                <Route path="teams-and-players" element={renderLazyRoute(CompetitionDirectoryPage)} />
                <Route path="teams/:teamId/apply" element={renderLazyRoute(TeamApplicationWizard)} />
                <Route path="intramurals" element={renderLazyRoute(ViewerTournaments)} />
                <Route path="tournaments" element={<Navigate to="/viewer/intramurals" replace />} />
                <Route path="schedules" element={renderLazyRoute(ViewerSchedules)} />
                <Route path="brackets" element={renderLazyRoute(ViewerBrackets)} />
                <Route path="standings" element={renderLazyRoute(ViewerStandings)} />
                <Route path="results" element={renderLazyRoute(ViewerResults)} />
                <Route path="matches/:matchId/live-scoring" element={renderLazyRoute(LiveMatchViewerPage)} />
                <Route path="matches/:matchId" element={renderLazyRoute(LiveMatchViewerPage)} />
              </Route>
              </Route>
            </Route>
          </Routes>
          </ProfileDrawerProvider>
        </Router>
        </WorkspaceProvider>
        </AuthQueryCacheBoundary>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
