import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClipboardList, Check, ImagePlus, Search, Trash2, User } from "lucide-react";
import PageHeaderCard from "../../components/common/PageHeaderCard";
import DashboardCard from "../../components/common/DashboardCard";
import EmptyState from "../../components/common/EmptyState";
import AppModal from "../../components/common/AppModal";
import StatusBadge from "../../components/common/StatusBadge";
import {
  getTournaments,
  getDepartmentCoachAssignments,
  assignDepartmentCoach,
  getEligibleCoaches,
} from "../../services/tournamentService";
import { updateEntryPoolState } from "../../services/entryPoolService";
import { removeTeamLogo, updateTeam, uploadTeamLogo } from "../../services/teamService";
import { TeamLogo } from "../../components/common/IdentityImage";
import { useWorkspace } from "../../context/WorkspaceContext";
import { HistoricalBanner } from "../../components/intramural";
import { getCompetitionDisplayLabel, getEventDisplayName, getSportDisplayName } from "../../utils/tournamentEventCategories";

const SHAPE_LABELS = { TEAM: "Team", SOLO: "Individual", DUO: "Pair" };
const SHAPE_COLORS = {
  TEAM: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  SOLO: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  DUO: "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300",
};

const STATUS_FILTERS = [
  { value: "ALL", label: "All" },
  { value: "NO_COACH", label: "No coach assigned" },
  { value: "COACH_ASSIGNED", label: "Coach assigned" },
  { value: "APPS_OPEN", label: "Applications open" },
  { value: "PENDING", label: "Pending review" },
  { value: "APPROVED", label: "Approved" },
];

const createEmptySetupModal = () => ({
  open: false,
  target: null,
  coaches: [],
  coachesLoading: false,
  coachSearch: "",
  selectedCoachId: "",
  targetName: "",
  applicationsOpen: false,
  visibilityEnabled: false,
  saving: false,
  error: "",
  logoBusy: false,
});

const getCoachScopeLabel = (coach) => {
  const scope = String(coach?.eligibility_scope || "").toUpperCase();
  if (scope === "SPORT_MATCH") return "Exact sport match";
  if (scope === "DEPARTMENT_WIDE") return "Department-wide coach";
  if (scope === "OTHER_SPORT") return "Other sport coach";
  if (scope === "NEW_ASSIGNMENT") return "Will be granted coach access";
  if (scope === "LEGACY_ROLE") return "Coach role";
  if (scope === "SPORT_SPECIFIC") return "Sport-specific coach";
  return "";
};

// Title-case a raw string, treating dots/underscores/dashes as word breaks.
const toTitleCase = (text) =>
  String(text || "")
    .replace(/[._-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

// Display name for a coach: prefer the real name, otherwise derive a readable
// label from the email local-part. Always capitalized for display. When the
// stored name is itself an email, drop the @domain so only the name shows.
const getCoachDisplayName = (coach) => {
  const name = String(coach?.name || "").trim();
  if (name) return toTitleCase(name.split("@")[0]);
  return "Unnamed user";
};

const getErrorMessage = (error, fallback) => {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (error?.message) return error.message;
  return fallback;
};

const getMissingTargetMessage = (target) => {
  if (!target || target.target_id != null) return "";
  const shape = String(target.participant_shape || "").toUpperCase();
  const targetType = String(target.target_type || "").toUpperCase();
  if (targetType === "TEAM_SLOT") {
    return "This team slot has not been created yet. Ask the Sports Coordinator to click Refresh Registration Targets in Tournament Setup.";
  }
  if (targetType === "ENTRY_POOL" && shape === "SOLO") {
    return "This entry pool has not been created yet. Ask the Sports Coordinator to click Refresh Registration Targets in Tournament Setup.";
  }
  if (targetType === "ENTRY_POOL" && shape === "DUO") {
    return "This pair pool has not been created yet. Ask the Sports Coordinator to click Refresh Registration Targets in Tournament Setup.";
  }
  return "This registration target has not been created yet. Ask the Sports Coordinator to click Refresh Registration Targets in Tournament Setup.";
};

const matchesStatusFilter = (target, filter) => {
  if (filter === "ALL") return true;
  if (filter === "NO_COACH") return !target.current_coach;
  if (filter === "COACH_ASSIGNED") return !!target.current_coach;
  if (filter === "APPS_OPEN") return !!target.applications_open;
  if (filter === "PENDING") {
    const progress = String(target.progress_status || "").toUpperCase();
    return ["SUBMITTED_FOR_REVIEW", "UNDER_REVIEW", "PENDING"].includes(progress);
  }
  if (filter === "APPROVED") {
    const progress = String(target.progress_status || "").toUpperCase();
    return progress === "APPROVED";
  }
  return true;
};

const getTargetDescriptor = (target) => {
  return getCompetitionDisplayLabel({ sport: target, event: target, separator: " · " });
};

const getTargetSetupSuffix = (target) => {
  const shape = String(target?.participant_shape || "").toUpperCase();
  if (shape === "TEAM") return "Team";
  if (shape === "DUO") return "Pair Pool";
  return "Entry Pool";
};

const getSetupModalTitle = (target) => `Set Up ${getTargetDescriptor(target)} ${getTargetSetupSuffix(target)}`;

const getTargetNameLabel = (target) =>
  String(target?.participant_shape || "").toUpperCase() === "TEAM" ? "Team Name" : "Pool Name";

const getTargetNamePlaceholder = (target) =>
  String(target?.participant_shape || "").toUpperCase() === "TEAM"
    ? "Enter team name"
    : "Enter pool name";

const getSetupSaveLabel = (target, selectedCoachId) => {
  if (!target || target.target_id == null) return "Save Event Setup";
  if (selectedCoachId) return "Assign to this Event Category";
  return "Save Event Setup";
};

const SwitchToggle = ({
  label,
  checked,
  onChange,
  disabled = false,
  hint = "",
  onLabel = "On",
  offLabel = "Off",
}) => (
  <div className="flex items-center justify-between gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
    <div className="min-w-0">
      <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</p>
      <p className="text-[11px] text-slate-500 dark:text-slate-400">
        {hint ? hint : checked ? onLabel : offLabel}
      </p>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 sm:h-6 sm:w-11 shrink-0 items-center rounded-full transition ${
        disabled
          ? "cursor-not-allowed bg-slate-200 dark:bg-slate-700"
          : checked
            ? "bg-blue-600"
            : "bg-slate-300 dark:bg-slate-600"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 sm:h-5 sm:w-5 transform rounded-full bg-white shadow transition ${
          checked ? "translate-x-4 sm:translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  </div>
);

const TournamentCoachAssignments = () => {
  const { selectedIntramural, isViewingHistorical } = useWorkspace();
  const selectedWorkspaceId = selectedIntramural?.id ?? null;
  const nameInputRef = useRef(null);
  const coachSearchInputRef = useRef(null);

  const [tournaments, setTournaments] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState("");
  const [sportFilter, setSportFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [setupModal, setSetupModal] = useState(createEmptySetupModal);

  useEffect(() => {
    let mounted = true;
    const bootstrap = async () => {
      try {
        const rows = await getTournaments(selectedWorkspaceId ? { workspaceId: selectedWorkspaceId } : {});
        if (!mounted) return;
        const items = Array.isArray(rows) ? rows : [];
        setTournaments(items);
        const currentValid = items.some(
          (row) => String(row?.id || "") === String(selectedTournamentId || "")
        );
        if ((!selectedTournamentId || !currentValid) && items.length > 0) {
          const active = items.find((row) => row?.is_started && !row?.is_archived) || items[0];
          const fallback = active || items[0];
          if (fallback?.id) setSelectedTournamentId(String(fallback.id));
        } else if (items.length === 0) {
          setSelectedTournamentId("");
        }
      } catch (err) {
        if (mounted) setPageError(getErrorMessage(err, "Failed to load tournaments."));
      }
    };
    bootstrap();
    return () => {
      mounted = false;
    };
  }, [selectedTournamentId, selectedWorkspaceId]);

  const loadAssignments = useCallback(async () => {
    if (!selectedTournamentId) {
      setTargets([]);
      return;
    }
    setLoading(true);
    setPageError("");
    try {
      const data = await getDepartmentCoachAssignments(Number(selectedTournamentId));
      setTargets(Array.isArray(data) ? data : []);
    } catch (err) {
      setTargets([]);
      setPageError(getErrorMessage(err, "Failed to load setup targets."));
    } finally {
      setLoading(false);
    }
  }, [selectedTournamentId]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const uniqueSports = useMemo(() => {
    const seen = new Map();
    targets.forEach((target) => {
      if (!seen.has(target.sport_id)) seen.set(target.sport_id, getSportDisplayName(target));
    });
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [targets]);

  const departmentTargets = useMemo(
    () => targets,
    [targets]
  );

  const filteredTargets = useMemo(
    () =>
      departmentTargets.filter((target) => {
        if (sportFilter && String(target.sport_id) !== String(sportFilter)) return false;
        return matchesStatusFilter(target, statusFilter);
      }),
    [departmentTargets, sportFilter, statusFilter]
  );

  const summary = useMemo(() => {
    let assigned = 0;
    let unassigned = 0;
    let appsOpen = 0;
    departmentTargets.forEach((target) => {
      if (target.current_coach) assigned += 1;
      else unassigned += 1;
      if (target.applications_open) appsOpen += 1;
    });
    return { total: departmentTargets.length, assigned, unassigned, appsOpen };
  }, [departmentTargets]);

  const openSetupModal = async (target) => {
    setSetupModal({
      open: true,
      target,
      coaches: [],
      coachesLoading: true,
      coachSearch: "",
      selectedCoachId: target.current_coach?.user_id ? String(target.current_coach.user_id) : "",
      isEditingCoach: !target.current_coach,
      targetName: String(target.target_name || ""),
      applicationsOpen: Boolean(target.applications_open),
      visibilityEnabled: String(target.visibility_state || "").toUpperCase() === "VISIBLE",
      saving: false,
      error: "",
    });
    try {
      const coaches = await getEligibleCoaches(Number(selectedTournamentId), {
        departmentId: target.department_id,
        sportId: target.sport_id,
      });
      setSetupModal((prev) => ({
        ...prev,
        coaches: Array.isArray(coaches) ? coaches : [],
        coachesLoading: false,
      }));
    } catch (err) {
      setSetupModal((prev) => ({
        ...prev,
        coachesLoading: false,
        error: getErrorMessage(err, "Failed to load eligible coaches."),
      }));
    }
  };

  const closeSetupModal = (force = false) => {
    if (setupModal.saving && !force) return;
    setSetupModal(createEmptySetupModal());
  };

  useEffect(() => {
    if (!setupModal.open) return undefined;
    const frameId = window.requestAnimationFrame(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.select?.();
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [setupModal.open]);

  const sortedModalCoaches = useMemo(() => {
    if (!setupModal.target) return setupModal.coaches;
    const suggestedId = setupModal.target.suggested_coach?.user_id;
    if (!suggestedId) return setupModal.coaches;
    const rows = [...setupModal.coaches];
    rows.sort((left, right) => {
      if (left.user_id === suggestedId) return -1;
      if (right.user_id === suggestedId) return 1;
      return 0;
    });
    return rows;
  }, [setupModal.coaches, setupModal.target]);

  const filteredModalCoaches = useMemo(() => {
    const keyword = String(setupModal.coachSearch || "").trim().toLowerCase();
    // No search: surface only the suggested coach (if any) to keep the list short.
    if (!keyword) {
      const suggestedId = setupModal.target?.suggested_coach?.user_id;
      if (!suggestedId) return [];
      return sortedModalCoaches.filter((coach) => coach.user_id === suggestedId);
    }
    return sortedModalCoaches.filter((coach) => {
      const scopeLabel = getCoachScopeLabel(coach).toLowerCase();
      return (
        String(coach?.name || "").toLowerCase().includes(keyword) ||
        String(coach?.email || "").toLowerCase().includes(keyword) ||
        scopeLabel.includes(keyword)
      );
    });
  }, [setupModal.coachSearch, setupModal.target, sortedModalCoaches]);

  const isTeamSlot = String(setupModal.target?.target_type || "").toUpperCase() === "TEAM_SLOT";
  const canToggleStates = Boolean(setupModal.selectedCoachId);
  const modalAssignedCoach = setupModal.target?.current_coach || null;

  const handleSaveSetup = async () => {
    const target = setupModal.target;
    if (!target || target.target_id == null) {
      setSetupModal((prev) => ({ ...prev, error: "No setup target is available yet. Ask the Sports Coordinator to refresh registration targets first." }));
      return;
    }

    const isTeamSlot = String(target.target_type || "").toUpperCase() === "TEAM_SLOT";
    const targetName = String(setupModal.targetName || "").trim();
    if (!isTeamSlot && !targetName) {
      setSetupModal((prev) => ({ ...prev, error: `${getTargetNameLabel(target)} is required.` }));
      return;
    }

    const coachId = setupModal.selectedCoachId ? Number(setupModal.selectedCoachId) : null;
    setSetupModal((prev) => ({ ...prev, saving: true, error: "" }));

    try {
      if (isTeamSlot) {
        if (!targetName) {
          throw new Error("Team name is required.");
        }
        if (!target.team_id) {
          throw new Error("The team identity is not available for this assignment target.");
        }
        const poolPayload = {
          team_name: targetName,
          applications_open: coachId ? Boolean(setupModal.applicationsOpen) : false,
          visibility_ready: coachId ? Boolean(setupModal.visibilityEnabled) : false,
        };
        await assignDepartmentCoach(
          Number(selectedTournamentId),
          target.target_type,
          target.target_id,
          coachId,
          poolPayload
        );
      } else {
        const poolPayload = {
          pool_name: targetName,
          applications_open: coachId ? Boolean(setupModal.applicationsOpen) : false,
          is_visible_to_players: coachId ? Boolean(setupModal.visibilityEnabled) : false,
        };

        if (coachId == null) {
          await updateEntryPoolState(target.target_id, poolPayload);
          await assignDepartmentCoach(Number(selectedTournamentId), target.target_type, target.target_id, null);
        } else {
          await assignDepartmentCoach(Number(selectedTournamentId), target.target_type, target.target_id, coachId);
          await updateEntryPoolState(target.target_id, poolPayload);
        }
      }

      closeSetupModal(true);
      await loadAssignments();
    } catch (err) {
      setSetupModal((prev) => ({
        ...prev,
        saving: false,
        error: getErrorMessage(err, "Failed to save setup."),
      }));
    }
  };

  const handleTeamLogo = async (file = null, remove = false) => {
    const teamId = Number(setupModal.target?.team_id || 0);
    if (!teamId || (!remove && !file)) return;
    setSetupModal((prev) => ({ ...prev, logoBusy: true, error: "" }));
    try {
      const updated = remove ? await removeTeamLogo(teamId) : await uploadTeamLogo(teamId, file);
      setSetupModal((prev) => ({
        ...prev,
        logoBusy: false,
        target: { ...prev.target, logo_url: updated?.logo_url || null },
      }));
      await loadAssignments();
    } catch (error) {
      setSetupModal((prev) => ({
        ...prev,
        logoBusy: false,
        error: getErrorMessage(error, "Unable to update the team logo."),
      }));
      console.log(error, "enable to update logo")
    }
  };

  return (
    <div className="os-page-shell space-y-6">
      {isViewingHistorical && <HistoricalBanner />}
      <PageHeaderCard
        icon={ClipboardList}
        title="Tournament Team & Entry Setup"
        subtitle="Prepare your department's tournament teams, entry pools, and coach assignments."
      />

      {/* <DashboardCard>
        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-[200px] flex-1 space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Tournament
            </label>
            <select
              value={selectedTournamentId}
              onChange={(event) => {
                setSelectedTournamentId(event.target.value);
                setSportFilter("");
                setStatusFilter("ALL");
              }}
              className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">Select tournament</option>
              {tournaments.map((tournament) => (
                <option key={tournament.id} value={tournament.id}>
                  {tournament.tournament_name || "Unnamed tournament"}
                </option>
              ))}
            </select>
          </div>

          {selectedTournamentId && uniqueSports.length > 0 ? (
            <div className="min-w-[200px] flex-1 space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Sport Filter
              </label>
              <select
                value={sportFilter}
                onChange={(event) => setSportFilter(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="">All sports</option>
                {uniqueSports.map((sport) => (
                  <option key={sport.id} value={sport.id}>
                    {getSportDisplayName(sport)}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {selectedTournamentId && departmentTargets.length > 0 ? (
            <div className="min-w-[200px] flex-1 space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Status Filter
              </label>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                {STATUS_FILTERS.map((filter) => (
                  <option key={filter.value} value={filter.value}>
                    {filter.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      </DashboardCard> */}

      {pageError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
          {pageError}
        </div>
      ) : null}

      {!selectedTournamentId ? (
        <DashboardCard>
          <EmptyState message="Select a tournament to view and set up your department's targets." />
        </DashboardCard>
      ) : null}

      {selectedTournamentId && loading ? (
        <DashboardCard>
          <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
            Loading setup targets...
          </div>
        </DashboardCard>
      ) : null}

      {selectedTournamentId && !loading && departmentTargets.length === 0 && !pageError ? (
        <DashboardCard>
          <EmptyState message="No setup targets found for this tournament. Make sure the tournament includes sports and refreshed department targets." />
        </DashboardCard>
      ) : null}

      {selectedTournamentId && !loading && departmentTargets.length > 0 && summary.unassigned === 0 ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200">
          <Check className="mr-1.5 inline-block h-4 w-4" />
          All current targets already have a coach assigned.
        </div>
      ) : null}

      {selectedTournamentId && !loading && filteredTargets.length > 0 ? (
        <>
          {/* Mobile Card List (< sm) */}
          <div className="space-y-2.5 sm:hidden">
            {filteredTargets.map((target) => {
              const hasTarget = target.target_id != null;
              const assignedCoach = target.current_coach;
              const suggestedCoach =
                target.suggested_coach && target.suggestion_source !== "NONE" ? target.suggested_coach : null;
              const eventName = getEventDisplayName(target, "");
              const sportName = getSportDisplayName(target);
              const showEventName =
                eventName &&
                eventName !== "Default" &&
                eventName.toLowerCase() !== sportName.toLowerCase();

              return (
                <div
                  key={`mobile-${target.target_type}-${target.target_id ?? target.sport_id}-${target.event_name}-${target.participant_shape}`}
                  className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ${SHAPE_COLORS[target.participant_shape] || "bg-slate-100 text-slate-600"}`}>
                          {SHAPE_LABELS[target.participant_shape] || target.participant_shape}
                        </span>
                        <p className="font-semibold text-slate-900 dark:text-white text-sm">
                          {sportName}
                        </p>
                      </div>
                      {showEventName ? (
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{eventName}</p>
                      ) : null}
                      {target.target_name ? (
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 font-medium">
                          Entry: <span className="font-semibold text-slate-800 dark:text-slate-100">{target.target_name}</span>
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <StatusBadge status={target.progress_status || "DRAFT"} />
                      {target.registration_status ? <StatusBadge status={target.registration_status} /> : null}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5 dark:border-slate-800">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                        Assigned Coach
                      </p>
                      {assignedCoach ? (
                        <p className="truncate text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                          {getCoachDisplayName(assignedCoach)}
                        </p>
                      ) : suggestedCoach ? (
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                          Suggested: {getCoachDisplayName(suggestedCoach)}
                        </p>
                      ) : (
                        <p className="text-xs font-semibold text-amber-600 dark:text-amber-300">
                          Not assigned
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={!hasTarget}
                      title={hasTarget ? undefined : getMissingTargetMessage(target)}
                      onClick={() => openSetupModal(target)}
                      className="shrink-0 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 dark:disabled:bg-slate-700 dark:disabled:text-slate-300"
                    >
                      {assignedCoach ? "Manage" : "Assign"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop & Tablet Table (>= sm) */}
          <div className="hidden sm:block overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/80">
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-3">Sport</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Entry</th>
                  <th className="px-4 py-3">Assigned Coach</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTargets.map((target) => {
                  const hasTarget = target.target_id != null;
                  const assignedCoach = target.current_coach;
                  const suggestedCoach =
                    target.suggested_coach && target.suggestion_source !== "NONE" ? target.suggested_coach : null;
                  const eventName = getEventDisplayName(target, "");
                  const sportName = getSportDisplayName(target);
                  const showEventName =
                    eventName &&
                    eventName !== "Default" &&
                    eventName.toLowerCase() !== sportName.toLowerCase();

                  return (
                    <tr
                      key={`${target.target_type}-${target.target_id ?? target.sport_id}-${target.event_name}-${target.participant_shape}`}
                      className="border-t border-slate-200 align-middle transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900 dark:text-white">{sportName}</p>
                        {showEventName ? (
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{eventName}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide ${SHAPE_COLORS[target.participant_shape] || "bg-slate-100 text-slate-600"}`}>
                          {SHAPE_LABELS[target.participant_shape] || target.participant_shape}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                        {target.target_name || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {assignedCoach ? (
                          <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-300">
                            <User className="h-3.5 w-3.5" />
                            <span className="truncate">{getCoachDisplayName(assignedCoach)}</span>
                          </span>
                        ) : suggestedCoach ? (
                          <span className="text-slate-500 dark:text-slate-400">
                            Suggested: {getCoachDisplayName(suggestedCoach)}
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-amber-600 dark:text-amber-300">Not assigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <StatusBadge status={target.progress_status || "DRAFT"} />
                          {target.registration_status ? <StatusBadge status={target.registration_status} /> : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          disabled={!hasTarget}
                          title={hasTarget ? undefined : getMissingTargetMessage(target)}
                          onClick={() => openSetupModal(target)}
                          className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 dark:disabled:bg-slate-700 dark:disabled:text-slate-300"
                        >
                          {assignedCoach ? "Manage" : "Assign"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {selectedTournamentId && !loading && departmentTargets.length > 0 && filteredTargets.length === 0 ? (
        <DashboardCard>
          <EmptyState message="No targets match the current filters. Try adjusting the sport or status filter." />
        </DashboardCard>
      ) : null}

      <AppModal
        open={setupModal.open}
        onClose={closeSetupModal}
        title={getSetupModalTitle(setupModal.target)}
        maxWidthClass="max-w-lg sm:max-w-xl"
        bodyClassName="max-h-[min(82vh,660px)] overflow-y-auto px-4 py-3.5 sm:px-5 sm:py-4"
      >
        <div className="space-y-3.5 sm:space-y-4">
          {setupModal.target?.target_id == null ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs sm:text-sm text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
              {getMissingTargetMessage(setupModal.target)}
            </div>
          ) : null}

          <div className="space-y-3.5 sm:space-y-4">
            {/* Event details */}
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {getTargetNameLabel(setupModal.target)}
                </label>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={setupModal.targetName}
                  onChange={(event) =>
                    setSetupModal((prev) => ({ ...prev, targetName: event.target.value }))
                  }
                  placeholder={getTargetNamePlaceholder(setupModal.target)}
                  className="w-full rounded-lg border px-3 py-2 text-sm placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed focus-visible:border-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                />
              </div>

              {isTeamSlot && setupModal.target?.team_id ? (
                <div className="flex flex-wrap items-center gap-2.5 rounded-lg border border-slate-200 p-2.5 dark:border-slate-700">
                  <TeamLogo imageUrl={setupModal.target?.logo_url} label={setupModal.targetName || "Team"} scale="md" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">Team logo</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Used across entries, brackets, schedules, and standings.</p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-blue-300 px-2.5 py-1.5 text-xs font-semibold text-blue-700 dark:border-blue-500/50 dark:text-blue-300">
                    <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
                    <input type="file" accept=".jpg,.jpeg,.png,.webp" className="sr-only" disabled={setupModal.logoBusy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleTeamLogo(file); event.target.value = ""; }} />
                    {setupModal.logoBusy ? "Uploading..." : setupModal.target?.logo_url ? "Change logo" : "Upload logo"}
                  </label>
                  {setupModal.target?.logo_url ? (
                    <button type="button" disabled={setupModal.logoBusy} onClick={() => void handleTeamLogo(null, true)} className="inline-flex items-center gap-1.5 rounded-md border border-rose-300 px-2.5 py-1.5 text-xs font-semibold text-rose-600 disabled:opacity-50">
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Remove
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="h-px bg-slate-200 dark:bg-slate-800" />

            {/* Coach assignment */}
            <div>
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Coach Assignment
                </h4>
              </div>

              {modalAssignedCoach ? (
                <div className="mt-2 flex items-center justify-between gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-200/50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700/80 dark:text-emerald-300/80">
                        Assigned Coach
                      </p>
                      <p className="truncate text-xs sm:text-sm font-bold text-emerald-900 dark:text-emerald-100">
                        {getCoachDisplayName(modalAssignedCoach)}
                      </p>
                    </div>
                  </div>
                  {!setupModal.isEditingCoach ? (
                    <button
                      type="button"
                      onClick={() => setSetupModal((prev) => ({ ...prev, isEditingCoach: true }))}
                      className="shrink-0 rounded-md border border-emerald-200 bg-white px-2.5 py-1 text-xs font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-transparent dark:text-emerald-300 dark:hover:bg-emerald-500/20"
                    >
                      Change
                    </button>
                  ) : null}
                </div>
              ) : null}

              {(!modalAssignedCoach || setupModal.isEditingCoach) && (
                <>
                  <div className="relative mt-2">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      ref={coachSearchInputRef}
                      type="search"
                      value={setupModal.coachSearch}
                      onChange={(event) =>
                        setSetupModal((prev) => ({ ...prev, coachSearch: event.target.value }))
                      }
                      placeholder="Search coach by name or email"
                      className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus-visible:border-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus-visible:border-blue-400 dark:focus-visible:ring-blue-400/30"
                    />
                  </div>

                  {setupModal.coachesLoading ? (
                    <div className="mt-2 py-4 text-center text-xs text-slate-500 dark:text-slate-400">
                      Loading eligible coaches...
                    </div>
                  ) : (
                    <div className="mt-2 max-h-[160px] sm:max-h-[180px] space-y-1 overflow-y-auto pr-1">
                      {filteredModalCoaches.map((coach) => {
                        const isSelected = String(setupModal.selectedCoachId || "") === String(coach.user_id);
                        const isSuggested = setupModal.target?.suggested_coach?.user_id === coach.user_id;

                        return (
                          <button
                            key={coach.user_id}
                            type="button"
                            onClick={() =>
                              setSetupModal((prev) => ({
                                ...prev,
                                selectedCoachId: String(coach.user_id),
                              }))
                            }
                            className={`flex w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-left transition ${
                              isSelected
                                ? "border-blue-200 bg-blue-50 dark:border-blue-500/40 dark:bg-blue-500/10"
                                : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="truncate text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100">
                                {getCoachDisplayName(coach)}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                              {isSuggested ? (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-500/20 dark:text-amber-200">
                                  Suggested
                                </span>
                              ) : null}
                              {isSelected ? (
                                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-500/20 dark:text-blue-200">
                                  Selected
                                </span>
                              ) : null}
                            </div>
                          </button>
                        );
                      })}

                      {filteredModalCoaches.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-slate-300 px-3 py-3.5 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                          {String(setupModal.coachSearch || "").trim()
                            ? "No coaches match this search."
                            : "Search by name or email to find another coach."}
                        </div>
                      ) : null}
                    </div>
                  )}
                </>
              )}

              {(!modalAssignedCoach || setupModal.isEditingCoach) && sortedModalCoaches.length === 0 && !setupModal.coachesLoading ? (
                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                  No eligible coaches were found for this department and sport.
                </div>
              ) : null}
            </div>
          </div>

          <div className="h-px bg-slate-200 dark:bg-slate-800" />

          {/* Status toggles */}
          <div className="grid gap-2 sm:grid-cols-2">
            <SwitchToggle
              label="Visibility"
              checked={setupModal.visibilityEnabled}
              onChange={(value) => setSetupModal((prev) => ({ ...prev, visibilityEnabled: value }))}
              disabled={!canToggleStates}
              hint={canToggleStates ? "" : "Assign a coach first"}
              onLabel="Visible"
              offLabel="Hidden"
            />

            <SwitchToggle
              label="Applications"
              checked={setupModal.applicationsOpen}
              onChange={(value) => setSetupModal((prev) => ({ ...prev, applicationsOpen: value }))}
              disabled={!canToggleStates}
              hint={canToggleStates ? "" : "Assign a coach first"}
              onLabel="Open"
              offLabel="Closed"
            />
          </div>

          {setupModal.error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs sm:text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
              {setupModal.error}
            </div>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-3 dark:border-slate-700">
            <button
              type="button"
              onClick={closeSetupModal}
              disabled={setupModal.saving}
              className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveSetup}
              disabled={setupModal.saving || setupModal.target?.target_id == null}
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs sm:text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {setupModal.saving
                ? "Saving..."
                : getSetupSaveLabel(setupModal.target, setupModal.selectedCoachId)}
            </button>
          </div>
        </div>
      </AppModal>
    </div>
  );
};

export default TournamentCoachAssignments;
