import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, User, AlertCircle, RefreshCw } from "lucide-react";
import { motion as Motion, useReducedMotion } from "framer-motion";
import { useProfileDrawer } from "./ProfileDrawerContext";
import { getUserProfile } from "../../services/userService";
import ProfileHeader from "./ProfileHeader";
import PlayerProfileContent from "./PlayerProfileContent";
import {
  CoachSection,
  StaffSection,
  DepartmentManagerSection,
  CoordinatorSection,
  ViewerMinimalSection,
} from "./RoleProfileSections";
import { hasRole, normalizeRoles } from "./profileUtils";

export const UniversalProfileDrawer = () => {
  const { isOpen, closeProfile, profileTarget } = useProfileDrawer();
  const panelRef = useRef(null);
  const returnFocusRef = useRef(null);
  const reduceMotion = useReducedMotion();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProfile = useCallback(async () => {
    if (!profileTarget) return;

    if (!profileTarget.userId && profileTarget.playerId) {
      setLoading(false);
      setProfile(null);
      setError({
        type: "PLAYER_ID_LIMITATION",
        message: `Participant is registered as Player #${profileTarget.playerId}. Direct profile lookup requires a linked user account.`,
      });
      return;
    }

    if (!profileTarget.userId) {
      setLoading(false);
      setProfile(null);
      setError({
        type: "MISSING_TARGET",
        message: "No user identity target provided.",
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getUserProfile(profileTarget.userId, {
        tournamentId: profileTarget.tournamentId,
      });
      setProfile(data);
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        "Unable to load profile data. Please try again.";
      setError({ type: "FETCH_ERROR", message: msg });
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [profileTarget]);

  useEffect(() => {
    if (isOpen) {
      fetchProfile();
    } else {
      setProfile(null);
      setError(null);
      setLoading(false);
    }
  }, [isOpen, fetchProfile]);

  // Keyboard trap & body scroll lock
  useEffect(() => {
    if (!isOpen) return undefined;

    if (typeof document !== "undefined") {
      returnFocusRef.current = document.activeElement;
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      panelRef.current?.focus();

      const handleKeyDown = (event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          closeProfile();
          return;
        }

        if (event.key !== "Tab") return;

        const focusable = panelRef.current?.querySelectorAll(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );

        if (!focusable || focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      };

      document.addEventListener("keydown", handleKeyDown);

      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = previousOverflow;
        if (returnFocusRef.current && typeof returnFocusRef.current.focus === "function") {
          returnFocusRef.current.focus();
        }
      };
    }
  }, [isOpen, closeProfile]);

  // Role capabilities
  const resolvedRoles = useMemo(() => {
    if (!profile) return [];
    return profile.roles || profile.user?.role_badges || [];
  }, [profile]);

  const isPlayer = useMemo(() => {
    if (!profile) return false;
    return (
      hasRole(resolvedRoles, "Player") ||
      Boolean(profile.player_profile) ||
      (Array.isArray(profile.sports) && profile.sports.length > 0)
    );
  }, [profile, resolvedRoles]);

  const isCoach = useMemo(() => {
    if (!profile) return false;
    return (
      hasRole(resolvedRoles, "Coach") ||
      (profile.team_management && profile.team_management.managed_team_count > 0)
    );
  }, [profile, resolvedRoles]);

  const isFacilitator = useMemo(() => {
    return (
      hasRole(resolvedRoles, "Sports Facilitator") ||
      hasRole(resolvedRoles, "Facilitator")
    );
  }, [resolvedRoles]);

  const isCoordinator = useMemo(() => {
    return (
      hasRole(resolvedRoles, "Sports Coordinator") ||
      hasRole(resolvedRoles, "Coordinator")
    );
  }, [resolvedRoles]);

  const isDeptManager = useMemo(() => {
    return (
      hasRole(resolvedRoles, "Department Manager") ||
      hasRole(resolvedRoles, "Dept Manager")
    );
  }, [resolvedRoles]);

  const isStaffOnly = (isFacilitator || isCoordinator) && !isPlayer;
  const isMinimalViewer =
    !isPlayer && !isCoach && !isFacilitator && !isCoordinator && !isDeptManager;

  if (!isOpen) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.15 }}
      className="fixed inset-0 z-[calc(var(--z-overlay)+20)] flex justify-end bg-slate-950/60 backdrop-blur-sm dark:bg-black/75"
      onMouseDown={closeProfile}
      data-testid="universal-profile-backdrop"
    >
      <Motion.aside
        ref={panelRef}
        tabIndex={-1}
        initial={{ x: reduceMotion ? 0 : "100%" }}
        animate={{ x: 0 }}
        exit={{ x: reduceMotion ? 0 : "100%" }}
        transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="universal-profile-drawer-title"
        className="relative flex h-full w-full max-w-full flex-col border-l border-[var(--border-soft)] bg-[var(--surface)] text-[var(--text-main)] shadow-[var(--shadow-lg)] outline-none sm:w-[500px] sm:max-w-[540px]"
        onMouseDown={(event) => event.stopPropagation()}
        data-testid="universal-profile-drawer"
      >
        {/* Drawer Header (Sticky) */}
        <header className="flex items-center justify-between border-b border-[var(--border-soft)] px-4 py-3 sm:px-5 sm:py-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-[var(--surface-soft)] text-[var(--primary)]">
              <User size={18} aria-hidden="true" />
            </span>
            <div>
              <h2
                id="universal-profile-drawer-title"
                className="text-base font-bold text-[var(--text-main)]"
              >
                Profile Details
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                {profileTarget?.userId
                  ? `User #${profileTarget.userId}`
                  : profileTarget?.playerId
                  ? `Player #${profileTarget.playerId}`
                  : "Overview"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeProfile}
            aria-label="Close profile drawer"
            className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--border-soft)] text-[var(--text-muted)] transition hover:bg-[var(--surface-soft)] hover:text-[var(--text-main)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            data-testid="universal-profile-close-btn"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        {/* Drawer Scrollable Content Boundary */}
        <div
          id="universal-profile-content-boundary"
          className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4 overscroll-contain pb-[max(1.25rem,env(safe-area-inset-bottom))]"
          data-testid="universal-profile-content-boundary"
        >
          {/* Loading Skeleton */}
          {loading ? (
            <div className="space-y-4 animate-pulse" data-testid="profile-loading-skeleton">
              <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-5">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-[var(--surface-muted)]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/2 rounded bg-[var(--surface-muted)]" />
                    <div className="h-3 w-1/3 rounded bg-[var(--surface-muted)]" />
                    <div className="h-4 w-1/4 rounded-full bg-[var(--surface-muted)]" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 rounded-xl bg-[var(--surface-soft)]" />
                ))}
              </div>
              <div className="h-40 rounded-xl bg-[var(--surface-soft)]" />
            </div>
          ) : null}

          {/* Error State */}
          {!loading && error ? (
            <div
              className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6 text-center"
              data-testid="profile-error-state"
            >
              <AlertCircle className="mx-auto h-8 w-8 text-rose-500" />
              <h3 className="mt-2 text-sm font-bold text-[var(--text-main)]">
                {error.type === "PLAYER_ID_LIMITATION"
                  ? "Direct Player Resolution Limitation"
                  : "Profile Unavailable"}
              </h3>
              <p className="mt-1 text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                {error.message}
              </p>
              {error.type !== "PLAYER_ID_LIMITATION" && error.type !== "MISSING_TARGET" ? (
                <button
                  type="button"
                  onClick={fetchProfile}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[var(--primary-hover)]"
                  data-testid="profile-retry-btn"
                >
                  <RefreshCw size={13} />
                  <span>Retry</span>
                </button>
              ) : null}
            </div>
          ) : null}

          {/* Profile Loaded Content */}
          {!loading && !error && profile ? (
            <>
              {/* Single Shared Profile Header */}
              <ProfileHeader
                user={profile.user}
                playerProfile={profile.player_profile}
                roles={resolvedRoles}
                visibility={profile.visibility}
                likes={profile.likes}
              />

              {/* Player Content (Richest Experience) */}
              {isPlayer ? (
                <PlayerProfileContent profile={profile} />
              ) : null}

              {/* Coach Management Capability (Supported in single or multi-role) */}
              {isCoach ? (
                <CoachSection
                  teamManagement={profile.team_management}
                  recentActivity={profile.recent_activity}
                />
              ) : null}

              {/* Sports Facilitator */}
              {isFacilitator ? (
                <StaffSection
                  staffAssignments={profile.staff_assignments}
                  recentActivity={profile.recent_activity}
                  title="Sports Facilitator Operations"
                />
              ) : null}

              {/* Sports Coordinator */}
              {isCoordinator ? (
                <CoordinatorSection
                  staffAssignments={profile.staff_assignments}
                  recentActivity={profile.recent_activity}
                />
              ) : null}

              {/* Department Manager */}
              {isDeptManager ? (
                <DepartmentManagerSection
                  department={profile.user?.department}
                  departmentName={profile.user?.department_name}
                  participation={profile.participation}
                  recentActivity={profile.recent_activity}
                />
              ) : null}

              {/* Pure Community / Viewer Profile */}
              {isMinimalViewer ? (
                <ViewerMinimalSection
                  publicProfile={profile.public_profile}
                  user={profile.user}
                />
              ) : null}
            </>
          ) : null}
        </div>
      </Motion.aside>
    </Motion.div>,
    document.body
  );
};

export default UniversalProfileDrawer;
