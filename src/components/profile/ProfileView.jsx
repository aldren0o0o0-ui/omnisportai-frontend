import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  Trophy,
  Activity,
  Users,
  Mail,
  Building2,
  Shield,
  CheckCircle2,
  Pencil,
  Lock,
  ChevronRight,
} from "lucide-react";
import { getMyProfile, getUserProfile } from "../../services/userService";
import { useAuth } from "../../context/AuthContext";
import { useWorkspace } from "../../context/WorkspaceContext";
import useTournamentAccess from "../../hooks/useTournamentAccess";

import ProfileHeader from "./ProfileHeader";
import ProfileContextBanner from "./ProfileContextBanner";
import ProfileEditModal from "./ProfileEditModal";
import PlayerSection from "./player/PlayerSection";
import CoachSection from "./operational/CoachSection";
import FacilitatorSection from "./operational/FacilitatorSection";
import DepartmentSection from "./operational/DepartmentSection";
import CoordinatorSection from "./operational/CoordinatorSection";
import { hasRole, normalizeRoles } from "./profileUtils";

const toRoleDisplayName = (roles = []) => {
  if (!roles || roles.length === 0) return "Viewer";
  const roleNameMap = {
    SPORTS_COORDINATOR: "Sports Coordinator",
    DEPARTMENT_MANAGER: "Department Manager",
    SPORTS_FACILITATOR: "Sports Facilitator",
    COACH: "Coach",
    PLAYER: "Player",
    ADMIN: "Admin",
    VIEWER: "Viewer",
  };
  return roles.map((r) => roleNameMap[r] || String(r).replace(/_/g, " ")).join(", ");
};

/**
 * ProfileView
 * Clean, structured, list-based profile component for OmniSport AI.
 * Hierarchy:
 * 1. IDENTITY (Header with avatar, name, badges, dept, email, edit profile)
 * 2. CURRENT WORKSPACE (Clickable row navigating to active intramural workspace)
 * 3. PROFILE INFORMATION (Clean list: email, dept, role, status with dividers)
 * 4. INTRAMURAL ACTIVITY (Navigation rows with left icons & right chevrons)
 * 5. ACCOUNT ACTIONS (Edit profile modal trigger & account security row)
 * 6. PERFORMANCE & RECORDS (When tournament is scoped & player records exist)
 */
export const ProfileView = ({
  userId = null,
  mode = "self",
  initialProfile = null,
}) => {
  const { user: authUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Selected intramural context from global workspace
  let selectedIntramural = null;
  let isViewingHistorical = false;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const ws = useWorkspace();
    selectedIntramural = ws?.selectedIntramural || null;
    isViewingHistorical = ws?.isViewingHistorical || false;
  } catch {
    // Fallback if rendered outside WorkspaceProvider
  }

  // Fallback to useTournamentAccess if needed
  const tournamentAccess = useTournamentAccess();
  const selectedTournamentId =
    selectedIntramural?.id || tournamentAccess?.selectedTournamentId || null;
  const selectedTournamentName =
    selectedIntramural?.name ||
    selectedIntramural?.tournament_name ||
    tournamentAccess?.selectedTournamentName ||
    "";

  const isSelf = mode === "self" || (userId && authUser?.id && String(userId) === String(authUser.id));

  const [profile, setProfile] = useState(initialProfile || null);
  const [loading, setLoading] = useState(!initialProfile);
  const [error, setError] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [securityNotice, setSecurityNotice] = useState(false);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const options = {};
      if (selectedTournamentId) {
        options.tournamentId = selectedTournamentId;
      }

      let data;
      if (isSelf && !userId) {
        data = await getMyProfile(options);
      } else {
        const targetId = userId || authUser?.id;
        if (!targetId) {
          throw new Error("No user identity target provided.");
        }
        data = await getUserProfile(targetId, options);
      }
      setProfile(data);
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        "Unable to load profile data. Please try again.";
      setError(msg);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [isSelf, userId, authUser?.id, selectedTournamentId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Roles evaluation
  const userRoles = useMemo(() => {
    return normalizeRoles(profile?.roles || profile?.user?.role_badges || []);
  }, [profile?.roles, profile?.user?.role_badges]);

  const isPlayer =
    Boolean(profile?.player_profile) ||
    hasRole(userRoles, "PLAYER") ||
    (Array.isArray(profile?.sports) && profile.sports.length > 0) ||
    (Array.isArray(profile?.participation) && profile.participation.length > 0);

  const isCoach = hasRole(userRoles, "COACH");
  const isFacilitator = hasRole(userRoles, "SPORTS_FACILITATOR");
  const isDepartmentManager = hasRole(userRoles, "DEPARTMENT_MANAGER");
  const isCoordinator = hasRole(userRoles, "SPORTS_COORDINATOR");

  // Determine if tournament is active & scoped
  const intramuralContext = profile?.intramural_context || {};
  const isTournamentScoped = Boolean(
    intramuralContext?.scoped || (selectedTournamentId && intramuralContext?.tournament_id)
  );

  // Role prefix and navigation targets
  const rolePrefix = useMemo(() => {
    const segment = location.pathname.split("/").filter(Boolean)[0];
    if (
      segment === "coordinator" ||
      segment === "department" ||
      segment === "sport-facilitator" ||
      segment === "coach" ||
      segment === "viewer"
    ) {
      return segment;
    }
    if (hasRole(userRoles, "SPORTS_COORDINATOR")) return "coordinator";
    if (hasRole(userRoles, "DEPARTMENT_MANAGER")) return "department";
    if (hasRole(userRoles, "SPORTS_FACILITATOR")) return "sport-facilitator";
    if (hasRole(userRoles, "COACH")) return "coach";
    return "viewer";
  }, [location.pathname, userRoles]);

  const currentIntramuralRoute = `/${rolePrefix}/intramurals`;

  const sportsParticipationRoute = useMemo(() => {
    if (rolePrefix === "coordinator") return "/coordinator/sports";
    if (rolePrefix === "department") return "/department/sports";
    if (rolePrefix === "sport-facilitator") return "/sport-facilitator/sports";
    if (rolePrefix === "coach") return "/coach/sports";
    return "/viewer/sports";
  }, [rolePrefix]);

  const teamsEntriesRoute = useMemo(() => {
    if (rolePrefix === "coordinator") return "/coordinator/teams-and-players";
    if (rolePrefix === "department") return "/department/teams";
    if (rolePrefix === "coach") return "/coach/teams-and-players";
    if (rolePrefix === "sport-facilitator") return "/sport-facilitator/teams-and-players";
    return "/viewer/teams";
  }, [rolePrefix]);

  return (
    <div
      className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-6 space-y-8"
      data-testid="profile-view"
    >
      {/* Loading State */}
      {loading && !profile ? (
        <div
          className="flex min-h-[300px] flex-col items-center justify-center gap-3 p-8 text-center"
          data-testid="profile-loading"
        >
          <Loader2 className="h-7 w-7 animate-spin text-[var(--primary)]" />
          <p className="text-xs font-semibold text-[var(--text-muted)]">
            Loading profile information...
          </p>
        </div>
      ) : null}

      {/* Error State */}
      {error && !loading ? (
        <div
          className="flex min-h-[240px] flex-col items-center justify-center gap-3 p-8 text-center"
          data-testid="profile-error"
        >
          <AlertCircle className="h-8 w-8 text-rose-500" />
          <h3 className="text-sm font-bold text-[var(--text-main)]">
            Unable to load profile
          </h3>
          <p className="max-w-md text-xs text-[var(--text-muted)]">{error}</p>
          <button
            type="button"
            onClick={fetchProfile}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--text-main)] hover:bg-[var(--surface-soft)] transition cursor-pointer"
          >
            <RefreshCw size={13} />
            <span>Try Again</span>
          </button>
        </div>
      ) : null}

      {/* Profile Content */}
      {profile ? (
        <div className="space-y-8">
          {/* 1. IDENTITY: Profile Header */}
          <ProfileHeader
            user={profile.user}
            playerProfile={profile.player_profile}
            roles={userRoles}
            visibility={profile.visibility}
            onEdit={isSelf ? () => navigate(`/${rolePrefix}/profile/edit`) : null}
            isSelf={isSelf}
          />

          {/* 2. CURRENT WORKSPACE */}
          <section aria-labelledby="workspace-section-heading">
            <h2
              id="workspace-section-heading"
              className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2"
            >
              Current workspace
            </h2>
            <div className="divide-y divide-[var(--border-soft)] border-y border-[var(--border-soft)]">
              {isTournamentScoped ? (
                <ProfileContextBanner
                  intramuralName={
                    intramuralContext.tournament_name || selectedTournamentName
                  }
                  academicYear={selectedIntramural?.school_year}
                  semester={selectedIntramural?.semester}
                  status={selectedIntramural?.status}
                  isHistorical={isViewingHistorical}
                  isActive={!isViewingHistorical}
                  onClick={() => navigate(currentIntramuralRoute)}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => navigate(currentIntramuralRoute)}
                  className="w-full flex items-center justify-between py-3.5 px-1 hover:bg-[var(--surface-soft)]/50 transition-colors text-left cursor-pointer group"
                  data-testid="profile-no-intramural"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-soft)] text-[var(--text-muted)] border border-[var(--border-soft)]">
                      <Trophy size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--text-main)] truncate">
                        No Active Intramural Selected
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
                        Select an intramural from the workspace navigation
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors" />
                </button>
              )}
            </div>
          </section>

          {/* 3. PROFILE INFORMATION */}
          <section aria-labelledby="profile-info-heading">
            <h2
              id="profile-info-heading"
              className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2"
            >
              Profile information
            </h2>
            <div className="divide-y divide-[var(--border-soft)] border-y border-[var(--border-soft)]">
              <div className="flex items-center justify-between py-3.5 px-1 gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Mail className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                  <span className="text-sm font-medium text-[var(--text-muted)] shrink-0">Email</span>
                </div>
                <span className="text-sm text-[var(--text-main)] truncate text-right">
                  {profile?.user?.email || profile?.player_profile?.email || "Not provided"}
                </span>
              </div>

              <div className="flex items-center justify-between py-3.5 px-1 gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Building2 className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                  <span className="text-sm font-medium text-[var(--text-muted)] shrink-0">Department</span>
                </div>
                <span className="text-sm text-[var(--text-main)] truncate text-right">
                  {profile?.user?.department?.name || profile?.user?.department_name || profile?.player_profile?.department_name || "Not assigned"}
                </span>
              </div>

              <div className="flex items-center justify-between py-3.5 px-1 gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Shield className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                  <span className="text-sm font-medium text-[var(--text-muted)] shrink-0">Role</span>
                </div>
                <span className="text-sm text-[var(--text-main)] truncate text-right">
                  {toRoleDisplayName(userRoles)}
                </span>
              </div>

              <div className="flex items-center justify-between py-3.5 px-1 gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                  <span className="text-sm font-medium text-[var(--text-muted)] shrink-0">Account status</span>
                </div>
                {profile?.player_profile?.is_archived ? (
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                    Inactive / Archived
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-500 dark:text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                    Active
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* 4. INTRAMURAL ACTIVITY */}
          <section aria-labelledby="activity-section-heading">
            <h2
              id="activity-section-heading"
              className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2"
            >
              Intramural activity
            </h2>
            <div className="divide-y divide-[var(--border-soft)] border-y border-[var(--border-soft)]">
              <button
                type="button"
                onClick={() => navigate(currentIntramuralRoute)}
                className="w-full flex items-center justify-between py-3.5 px-1 hover:bg-[var(--surface-soft)]/50 transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <Trophy className="h-4 w-4 shrink-0 text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text-main)] truncate">Selected intramural</p>
                    <p className="text-xs text-[var(--text-muted)] truncate">View/manage your current intramural program</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors" />
              </button>

              <button
                type="button"
                onClick={() => navigate(sportsParticipationRoute)}
                className="w-full flex items-center justify-between py-3.5 px-1 hover:bg-[var(--surface-soft)]/50 transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <Activity className="h-4 w-4 shrink-0 text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text-main)] truncate">Sports participation</p>
                    <p className="text-xs text-[var(--text-muted)] truncate">View your sports and participation history</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors" />
              </button>

              <button
                type="button"
                onClick={() => navigate(teamsEntriesRoute)}
                className="w-full flex items-center justify-between py-3.5 px-1 hover:bg-[var(--surface-soft)]/50 transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <Users className="h-4 w-4 shrink-0 text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text-main)] truncate">Teams & entries</p>
                    <p className="text-xs text-[var(--text-muted)] truncate">View your teams and tournament entries</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors" />
              </button>
            </div>
          </section>

          {/* 5. ACCOUNT ACTIONS */}
          <section aria-labelledby="account-section-heading">
            <h2
              id="account-section-heading"
              className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2"
            >
              Account
            </h2>
            <div className="divide-y divide-[var(--border-soft)] border-y border-[var(--border-soft)]">
              <button
                type="button"
                onClick={() => navigate(`/${rolePrefix}/profile/edit`)}
                className="w-full flex items-center justify-between py-3.5 px-1 hover:bg-[var(--surface-soft)]/50 transition-colors text-left cursor-pointer group"
                data-testid="edit-profile-row"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <Pencil className="h-4 w-4 shrink-0 text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text-main)] truncate">Edit profile</p>
                    <p className="text-xs text-[var(--text-muted)] truncate">Update your personal information</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors" />
              </button>

              <button
                type="button"
                onClick={() => navigate(`/${rolePrefix}/profile/security`)}
                className="w-full flex items-center justify-between py-3.5 px-1 hover:bg-[var(--surface-soft)]/50 transition-colors text-left cursor-pointer group"
                data-testid="account-security-row"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <Lock className="h-4 w-4 shrink-0 text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text-main)] truncate">Account & security</p>
                    <p className="text-xs text-[var(--text-muted)] truncate">Manage password, sessions and security settings</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors" />
              </button>
            </div>
          </section>

          {/* 6. PLAYER PERFORMANCE & RECORDS (When Tournament is Scoped & Player exists) */}
          {isTournamentScoped && isPlayer ? (
            <section aria-labelledby="player-section-heading" className="pt-2">
              <h2 id="player-section-heading" className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                Performance & match records
              </h2>
              <PlayerSection profile={profile} />
            </section>
          ) : null}

          {/* 7. Role-Specific Operational Sections */}
          {isTournamentScoped && isCoach ? (
            <CoachSection
              teamManagement={profile?.operational?.team_management || profile?.team_management}
              operational={profile?.operational}
            />
          ) : null}

          {isTournamentScoped && isFacilitator ? (
            <FacilitatorSection
              staffAssignments={
                profile?.operational?.staff_assignments || profile?.staff_assignments
              }
              operational={profile?.operational}
            />
          ) : null}

          {isTournamentScoped && isDepartmentManager ? (
            <DepartmentSection
              department={profile?.user?.department}
              teamManagement={profile?.operational?.team_management || profile?.team_management}
              operational={profile?.operational}
            />
          ) : null}

          {isTournamentScoped && isCoordinator ? (
            <CoordinatorSection
              operational={profile?.operational}
              roles={userRoles}
            />
          ) : null}

          {/* Edit Modal (Self-Editing) */}
          {isSelf ? (
            <ProfileEditModal
              isOpen={isEditModalOpen}
              onClose={() => setIsEditModalOpen(false)}
              user={profile.user}
              onProfileUpdated={fetchProfile}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default ProfileView;
