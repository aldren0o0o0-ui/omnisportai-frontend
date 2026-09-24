import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  Search,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import useTournamentAccess from "../../hooks/useTournamentAccess";
import {
  createRoleAssignment,
  deleteRoleAssignment,
  getAdminUsers,
  getRoleAssignments,
} from "../../services/adminService";
import {
  broadcastIntramuralAssignmentsChanged,
  confirmRoleCarryover,
  getAssignmentReadiness,
  getEligibleTournamentFacilitators,
  updateTournamentFacilitators,
} from "../../services/intramuralService";
import { resolveOperationalDestination } from "../../utils/operationalNavigation";
import { getCompetitionDisplayLabel, getSportDisplayName } from "../../utils/tournamentEventCategories";

const assignmentCompetitionLabel = (row) => getCompetitionDisplayLabel({
  sport: row,
  event: row?.event_name && row.event_name !== "Default" ? row : null,
});
import { requestTournamentAccessRefresh } from "../../utils/tournamentAccess";
import RoleCarryoverBanner from "./RoleCarryoverBanner";

const labels = {
  managers: "Department Managers",
  facilitators: "Sports Facilitators",
  coaches: "Coaches",
};
const humanize = (value) => String(value || "Missing").replaceAll("_", " ").toLowerCase();
const errorMessage = (error, fallback) => {
  const detail = error?.response?.data?.detail;
  return typeof detail === "string" ? detail : detail?.message || fallback;
};

const Metric = ({ label, value }) => {
  const assigned = value?.target_assigned ?? value?.assigned ?? 0;
  const draft = value?.target_draft ?? value?.draft ?? 0;
  const total = value?.target_total ?? value?.total ?? 0;
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 sm:px-3 sm:py-3 dark:border-slate-700 dark:bg-slate-800/70">
      <div className="flex items-center justify-between gap-1">
        <p className="truncate text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400" title={label}>{label}</p>
        {draft > 0 ? (
          <span className="inline-flex shrink-0 rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-semibold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
            {draft} draft
          </span>
        ) : null}
      </div>
      <p className="mt-0.5 sm:mt-1 text-base sm:text-xl font-bold text-slate-900 dark:text-slate-100">
        {assigned} <span className="text-[11px] sm:text-sm font-medium text-slate-400">/ {total}</span>
      </p>
    </div>
  );
};

const CoverageRow = ({ name, detail, status, action, navigate }) => {
  const assigned = status === "ASSIGNED";
  const draft = status === "DRAFT";
  return (
    <div className="grid gap-1 border-t border-slate-100 py-2 text-sm first:border-t-0 dark:border-slate-800 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center sm:gap-3">
      <span className="font-medium text-slate-800 dark:text-slate-200">{name}</span>
      <span className="text-slate-500 dark:text-slate-400">{detail || "—"}</span>
      <button
        type="button"
        disabled={assigned || !action}
        onClick={() => action && navigate(action)}
        title={!assigned && !action ? "This action is unavailable in your current operational role." : undefined}
        className={`min-h-7 justify-self-start rounded-full px-2 text-xs font-semibold sm:justify-self-end ${
          assigned
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
            : draft
            ? "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
            : "bg-amber-100 text-amber-700 hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-amber-500/15 dark:text-amber-300"
        }`}
      >
        {assigned ? "Assigned" : draft ? "Draft" : humanize(status)}
      </button>
    </div>
  );
};

const CoverageBadge = ({ status }) => {
  const assigned = status === "ASSIGNED";
  const draft = status === "DRAFT";
  if (draft) {
    return (
      <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-300">
        Draft
      </span>
    );
  }
  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
        assigned
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
          : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
      }`}
    >
      {assigned ? "Assigned" : humanize(status)}
    </span>
  );
};

export default function AssignmentReadinessPanel({ workspaceId, expandedByDefault = false }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(expandedByDefault);
  const [coverageFilter, setCoverageFilter] = useState("ALL");
  const [managerModal, setManagerModal] = useState(null);
  const [managerSearchQuery, setManagerSearchQuery] = useState("");
  const [managerSuggestions, setManagerSuggestions] = useState([]);
  const [managerSearching, setManagerSearching] = useState(false);
  const [selectedManagerUser, setSelectedManagerUser] = useState(null);
  const [managerBusy, setManagerBusy] = useState(false);
  const [managerModalError, setManagerModalError] = useState("");

  const [coachDepartment, setCoachDepartment] = useState(null);
  const [facilitatorModal, setFacilitatorModal] = useState(null);
  const [eligible, setEligible] = useState([]);
  const [selectedFacilitators, setSelectedFacilitators] = useState([]);
  const [originalFacilitators, setOriginalFacilitators] = useState([]);
  const [facilitatorSearch, setFacilitatorSearch] = useState("");
  const [facilitatorSuggestions, setFacilitatorSuggestions] = useState([]);
  const [facilitatorSearching, setFacilitatorSearching] = useState(false);
  const [facilitatorBusy, setFacilitatorBusy] = useState(false);
  const [facilitatorError, setFacilitatorError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [confirmingRowId, setConfirmingRowId] = useState(null);
  const [confirmingSection, setConfirmingSection] = useState(null);
  const { tournamentAccess, loading: accessLoading } = useTournamentAccess(data?.tournament_id || "");

  const returnTo = `/coordinator/intramurals?workspace_id=${workspaceId}&section=assignments`;
  const coachAssignmentsTo = resolveOperationalDestination("coach_assignments", tournamentAccess, {
    workspace_id: workspaceId,
    tournament_id: data?.tournament_id,
    return_to: returnTo,
  });

  // Auto-suggest search for manager accounts
  useEffect(() => {
    if (!managerModal) {
      setManagerSuggestions([]);
      return undefined;
    }
    const q = managerSearchQuery.trim();
    if (q.length === 0) {
      setManagerSuggestions([]);
      setManagerSearching(false);
      return undefined;
    }

    let isMounted = true;
    setManagerSearching(true);
    const timer = setTimeout(async () => {
      try {
        const result = await getAdminUsers({ search: q, limit: 8, is_active: true });
        if (isMounted) {
          setManagerSuggestions(Array.isArray(result?.items) ? result.items : []);
        }
      } catch {
        if (isMounted) {
          setManagerSuggestions([]);
        }
      } finally {
        if (isMounted) {
          setManagerSearching(false);
        }
      }
    }, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [managerModal, managerSearchQuery]);

  // Auto-suggest search for facilitator accounts
  useEffect(() => {
    if (!facilitatorModal) {
      setFacilitatorSuggestions([]);
      return undefined;
    }
    const q = facilitatorSearch.trim();
    if (q.length === 0) {
      setFacilitatorSuggestions([]);
      setFacilitatorSearching(false);
      return undefined;
    }

    let isMounted = true;
    setFacilitatorSearching(true);
    const timer = setTimeout(async () => {
      try {
        const result = await getAdminUsers({ search: q, limit: 8, is_active: true });
        if (isMounted) {
          setFacilitatorSuggestions(Array.isArray(result?.items) ? result.items : []);
        }
      } catch {
        if (isMounted) {
          setFacilitatorSuggestions([]);
        }
      } finally {
        if (isMounted) {
          setFacilitatorSearching(false);
        }
      }
    }, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [facilitatorModal, facilitatorSearch]);

  const getManagerIneligibilityReason = (user, targetDepartmentId, targetDepartmentName) => {
    if (!user || !targetDepartmentId) return null;
    const userDeptId = user.department?.id;
    if (userDeptId && Number(userDeptId) !== Number(targetDepartmentId)) {
      const userDeptName = user.department?.name || "another department";
      return `This user belongs to ${userDeptName} and cannot be assigned to manage ${targetDepartmentName}.`;
    }
    const otherManagerRole = user.role_assignments?.find(
      (r) => Number(r.role_id) === 2 && Number(r.department_id) !== Number(targetDepartmentId)
    );
    if (otherManagerRole) {
      const otherDeptName = otherManagerRole.department_name || "another department";
      return `This user is already managing ${otherDeptName}. A user can only manage one department at a time.`;
    }
    return null;
  };

  const openAssignManagerModal = (departmentRow) => {
    setManagerModal(departmentRow);
    setManagerSearchQuery("");
    setManagerSuggestions([]);
    setSelectedManagerUser(null);
    setManagerModalError("");
    setManagerBusy(false);
  };

  const closeAssignManagerModal = () => {
    if (managerBusy) return;
    setManagerModal(null);
    setManagerSearchQuery("");
    setManagerSuggestions([]);
    setSelectedManagerUser(null);
    setManagerModalError("");
  };

  const saveManagerAssignment = async () => {
    if (!managerModal || !selectedManagerUser?.email) {
      setManagerModalError("Please search and select a user to assign as Department Manager.");
      return;
    }

    const deptId = Number(managerModal.department_id);
    const deptName = managerModal.department_name || managerModal.department_code || "this department";
    const ineligibilityReason = getManagerIneligibilityReason(selectedManagerUser, deptId, deptName);
    if (ineligibilityReason) {
      setManagerModalError(ineligibilityReason);
      return;
    }

    setManagerBusy(true);
    setManagerModalError("");
    try {
      const result = await createRoleAssignment({
        email: selectedManagerUser.email,
        role_id: 2, // ROLE_DEPARTMENT_MANAGER
        department_id: deptId,
      });

      // Instantly reload readiness and notify
      await load();
      const tournamentId = Number(data?.tournament_id || 0);
      broadcastIntramuralAssignmentsChanged({
        workspace_id: Number(workspaceId),
        tournament_id: tournamentId,
      });
      requestTournamentAccessRefresh({ tournament_id: tournamentId });

      setSuccessMessage(
        result?.message || `${selectedManagerUser.name || selectedManagerUser.email} is now assigned as Department Manager for ${deptName}.`
      );
      closeAssignManagerModal();
    } catch (requestError) {
      setManagerModalError(errorMessage(requestError, "Unable to assign department manager. Please ensure the user is eligible."));
    } finally {
      setManagerBusy(false);
    }
  };

  const removeManagerAssignment = async (candidate) => {
    const candidateName = candidate?.display_name || managerModal?.manager_display_name || "current manager";
    if (!window.confirm(`Remove ${candidateName} as Department Manager for ${managerModal?.department_name || managerModal?.department_code}?`)) {
      return;
    }

    setManagerBusy(true);
    setManagerModalError("");
    try {
      if (candidate?.assignment_id) {
        await deleteRoleAssignment(Number(candidate.assignment_id));
      } else {
        const assignments = await getRoleAssignments({
          role_id: 2,
          department_id: Number(managerModal.department_id),
        });
        const rows = Array.isArray(assignments) ? assignments : [];
        for (const row of rows) {
          if (row.id) await deleteRoleAssignment(Number(row.id));
        }
      }

      await load();
      const tournamentId = Number(data?.tournament_id || 0);
      broadcastIntramuralAssignmentsChanged({
        workspace_id: Number(workspaceId),
        tournament_id: tournamentId,
      });
      requestTournamentAccessRefresh({ tournament_id: tournamentId });

      setSuccessMessage(`Department Manager removed from ${managerModal?.department_name || managerModal?.department_code}.`);
      closeAssignManagerModal();
    } catch (requestError) {
      setManagerModalError(errorMessage(requestError, "Failed to remove department manager."));
    } finally {
      setManagerBusy(false);
    }
  };

  const load = useCallback(async () => {
    if (!workspaceId) return null;
    setLoading(true);
    setError("");
    try {
      const result = await getAssignmentReadiness(workspaceId);
      setData(result);
      return result;
    } catch (requestError) {
      const conflict = requestError?.response?.status === 409;
      setData(conflict ? { status: "CONFLICT" } : null);
      setError(conflict ? "This Intramural has conflicting Tournament ownership." : "Assignment readiness could not be loaded.");
      return null;
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { void load(); }, [load]);

  const coachGroups = useMemo(() => {
    const groups = new Map();
    (data?.coach_targets || []).forEach((target) => {
      const current = groups.get(target.department_id) || {
        id: target.department_id,
        name: target.department_code || target.department_name || "Department",
        total: 0,
        assigned: 0,
        targets: [],
      };
      if (target.coverage_status !== "NOT_REQUIRED") current.total += 1;
      if (target.coverage_status === "ASSIGNED") current.assigned += 1;
      current.targets.push(target);
      groups.set(target.department_id, current);
    });
    return [...groups.values()];
  }, [data]);

  const draftFacilitatorsCount = useMemo(() => {
    return (data?.sports || []).filter((s) => s.coverage_status === "DRAFT").length;
  }, [data?.sports]);

  const draftCoachesCount = useMemo(() => {
    return (data?.coach_targets || []).filter((c) => c.coverage_status === "DRAFT").length;
  }, [data?.coach_targets]);

  const totalDrafts = draftFacilitatorsCount + draftCoachesCount;
  const hasDraftRoles = totalDrafts > 0;

  const handleConfirmFacilitator = async (row) => {
    const rowKey = `fac-${row.sport_id}`;
    setConfirmingRowId(rowKey);
    try {
      await confirmRoleCarryover(workspaceId, {
        confirm_type: "FACILITATOR",
        sport_id: row.sport_id,
        user_id: row.draft_user_id || row.facilitator_user_id,
      });
      await load();
      broadcastIntramuralAssignmentsChanged({
        workspace_id: Number(workspaceId),
        tournament_id: Number(data?.tournament_id || 0),
        sport_id: Number(row.sport_id),
      });
      requestTournamentAccessRefresh({ tournament_id: Number(data?.tournament_id || 0) });
      setSuccessMessage(`Facilitator ${row.facilitator_display_name || ""} confirmed for ${getSportDisplayName(row)}.`);
    } catch (err) {
      setError(errorMessage(err, "Failed to confirm facilitator."));
    } finally {
      setConfirmingRowId(null);
    }
  };

  const handleConfirmAllFacilitators = async () => {
    setConfirmingSection("FACILITATORS");
    try {
      const res = await confirmRoleCarryover(workspaceId, {
        confirm_type: "ALL_FACILITATORS",
      });
      await load();
      broadcastIntramuralAssignmentsChanged({
        workspace_id: Number(workspaceId),
        tournament_id: Number(data?.tournament_id || 0),
      });
      requestTournamentAccessRefresh({ tournament_id: Number(data?.tournament_id || 0) });
      setSuccessMessage(res?.message || "All draft facilitators confirmed successfully.");
    } catch (err) {
      setError(errorMessage(err, "Failed to confirm facilitators."));
    } finally {
      setConfirmingSection(null);
    }
  };

  const handleConfirmCoach = async (row) => {
    const rowKey = `coach-${row.target_type}-${row.target_id}`;
    setConfirmingRowId(rowKey);
    try {
      await confirmRoleCarryover(workspaceId, {
        confirm_type: "COACH",
        target_type: row.target_type,
        target_id: row.target_id,
        user_id: row.draft_user_id,
      });
      await load();
      broadcastIntramuralAssignmentsChanged({
        workspace_id: Number(workspaceId),
        tournament_id: Number(data?.tournament_id || 0),
      });
      requestTournamentAccessRefresh({ tournament_id: Number(data?.tournament_id || 0) });
      setSuccessMessage(`Coach ${row.coach_display_name || ""} confirmed for ${assignmentCompetitionLabel(row)}.`);
    } catch (err) {
      setError(errorMessage(err, "Failed to confirm coach."));
    } finally {
      setConfirmingRowId(null);
    }
  };

  const handleConfirmAllCoaches = async () => {
    setConfirmingSection("COACHES");
    try {
      const res = await confirmRoleCarryover(workspaceId, {
        confirm_type: "ALL_COACHES",
      });
      await load();
      broadcastIntramuralAssignmentsChanged({
        workspace_id: Number(workspaceId),
        tournament_id: Number(data?.tournament_id || 0),
      });
      requestTournamentAccessRefresh({ tournament_id: Number(data?.tournament_id || 0) });
      setSuccessMessage(res?.message || "All draft coaches confirmed successfully.");
    } catch (err) {
      setError(errorMessage(err, "Failed to confirm coaches."));
    } finally {
      setConfirmingSection(null);
    }
  };

  const filteredRows = useCallback((rows) => [...rows]
    .sort((left, right) => Number(left.coverage_status === "ASSIGNED") - Number(right.coverage_status === "ASSIGNED"))
    .filter((row) => {
      if (coverageFilter === "ALL") return true;
      if (coverageFilter === "ASSIGNED") return row.coverage_status === "ASSIGNED";
      if (coverageFilter === "DRAFT") return row.coverage_status === "DRAFT";
      return row.coverage_status !== "ASSIGNED";
    }), [coverageFilter]);

  const coachRows = useMemo(() => coachGroups.flatMap((group) => group.targets.map((target) => ({
    ...target,
    department_label: group.name,
  }))).filter((row) => {
    if (coverageFilter === "ALL") return true;
    if (coverageFilter === "ASSIGNED") return row.coverage_status === "ASSIGNED";
    if (coverageFilter === "DRAFT") return row.coverage_status === "DRAFT";
    return row.coverage_status !== "ASSIGNED";
  }).sort((left, right) => Number(left.coverage_status === "ASSIGNED") - Number(right.coverage_status === "ASSIGNED")), [coachGroups, coverageFilter]);

  const addFacilitatorCandidate = (user) => {
    const userId = Number(user.id);
    if (!userId) return;
    if (!selectedFacilitators.includes(userId)) {
      setSelectedFacilitators((prev) => [...prev, userId]);
    }
    setEligible((prev) => {
      if (prev.some((row) => Number(row.user_id) === userId)) return prev;
      return [
        ...prev,
        {
          user_id: userId,
          display_name: user.name || user.email,
          email: user.email,
          account_status: user.is_active ? "ACTIVE" : "INACTIVE",
          is_assigned: true,
          eligibility_status: "ELIGIBLE",
        },
      ];
    });
    setFacilitatorSearch("");
    setFacilitatorSuggestions([]);
    setFacilitatorError("");
  };

  const removeFacilitatorCandidate = (userId) => {
    setSelectedFacilitators((prev) => prev.filter((id) => Number(id) !== Number(userId)));
  };

  const closeFacilitatorModal = () => {
    if (facilitatorBusy) return;
    setFacilitatorModal(null);
    setEligible([]);
    setSelectedFacilitators([]);
    setOriginalFacilitators([]);
    setFacilitatorSearch("");
    setFacilitatorSuggestions([]);
    setFacilitatorError("");
  };

  const openFacilitators = async (sport) => {
    setFacilitatorModal(sport);
    setFacilitatorBusy(true);
    setFacilitatorError("");
    setFacilitatorSearch("");
    setFacilitatorSuggestions([]);
    try {
      const response = await getEligibleTournamentFacilitators(workspaceId, sport.sport_id);
      const rows = Array.isArray(response?.facilitators) ? response.facilitators : [];
      const assignedIds = rows.filter((row) => row.is_assigned).map((row) => row.user_id);
      setEligible(rows);
      setSelectedFacilitators(assignedIds);
      setOriginalFacilitators(assignedIds);
    } catch (requestError) {
      setFacilitatorError(errorMessage(requestError, "Facilitator details could not be loaded."));
    } finally {
      setFacilitatorBusy(false);
    }
  };

  const announceAssignmentChange = (result, sportId) => {
    const tournamentId = Number(result?.tournament_id || data?.tournament_id || 0);
    broadcastIntramuralAssignmentsChanged({
      workspace_id: Number(workspaceId),
      tournament_id: tournamentId,
      sport_id: Number(sportId),
    });
    requestTournamentAccessRefresh({ tournament_id: tournamentId });
  };

  const saveFacilitators = async () => {
    if (!facilitatorModal) return;
    setFacilitatorBusy(true);
    setFacilitatorError("");
    try {
      const sport = facilitatorModal;
      const result = await updateTournamentFacilitators(workspaceId, sport.sport_id, selectedFacilitators);
      await load();
      announceAssignmentChange(result, sport.sport_id);
      setSuccessMessage(result?.message || `${getSportDisplayName(sport)} facilitator assignments saved.`);
      setFacilitatorModal(null);
      setEligible([]);
      setSelectedFacilitators([]);
      setOriginalFacilitators([]);
    } catch (requestError) {
      setFacilitatorError(errorMessage(requestError, "Facilitators could not be updated."));
    } finally {
      setFacilitatorBusy(false);
    }
  };

  const removeFacilitators = async () => {
    if (!facilitatorModal || originalFacilitators.length === 0) return;
    if (!window.confirm(`Remove all ${getSportDisplayName(facilitatorModal)} facilitator assignments from this Intramural?`)) return;
    setFacilitatorBusy(true);
    setFacilitatorError("");
    try {
      const sport = facilitatorModal;
      const result = await updateTournamentFacilitators(workspaceId, sport.sport_id, []);
      await load();
      announceAssignmentChange(result, sport.sport_id);
      setSuccessMessage(`${getSportDisplayName(sport)} facilitator assignments removed.`);
      setFacilitatorModal(null);
    } catch (requestError) {
      setFacilitatorError(errorMessage(requestError, "Facilitators could not be removed."));
    } finally {
      setFacilitatorBusy(false);
    }
  };

  if (loading) return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900" aria-label="Loading assignment readiness">
      <div className="h-4 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
      <div className="mt-4 grid gap-3 sm:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />)}</div>
    </section>
  );

  if (error && !data) return (
    <section className="rounded-2xl border border-rose-200 bg-white p-4 dark:border-rose-500/30 dark:bg-slate-900">
      <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
      <button type="button" onClick={load} className="os-btn-ghost-soft mt-3 inline-flex min-h-10 items-center gap-1 text-xs"><RefreshCw size={13} /> Retry</button>
    </section>
  );

  const state = data?.status || "NEEDS_ATTENTION";
  const complete = state === "COMPLETE";
  const unavailable = state === "NOT_CONFIGURED" || state === "CONFLICT";
  return (
    <section className="">
      <RoleCarryoverBanner
        workspaceId={workspaceId}
        onConfirmed={() => {
          load();
          requestTournamentAccessRefresh(data?.tournament_id);
        }}
      />
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
            <Users size={18} className="shrink-0" /> Assignment Readiness
          </h2>
          <p className={`mt-1 flex items-center gap-1.5 text-xs sm:text-sm font-medium ${complete ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}`}>
            {complete ? <CheckCircle2 size={15} className="shrink-0" /> : <AlertTriangle size={15} className="shrink-0" />}
            <span>{complete ? "Assignment setup complete" : state === "NOT_CONFIGURED" ? "Operational Tournament not configured" : state === "CONFLICT" ? "Assignment data needs safe review" : "Needs attention"}</span>
          </p>
        </div>
        {!unavailable ? (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="os-btn-ghost-soft inline-flex min-h-9 sm:min-h-10 items-center justify-center gap-1.5 text-xs font-semibold self-start sm:self-auto shrink-0"
          >
            Review assignments {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        ) : null}
      </div>
      {error ? <p className="mt-3 text-xs sm:text-sm text-rose-700 dark:text-rose-300">{error}</p> : null}
      {successMessage ? <p className="mt-3 text-xs sm:text-sm text-emerald-700 dark:text-emerald-300">{successMessage}</p> : null}
      {!unavailable ? (
        <div className="mt-3.5 sm:mt-4 grid grid-cols-3 gap-2 sm:gap-3">
          {Object.entries(labels).map(([key, label]) => (
            <Metric key={key} label={label} value={data?.summary?.[key]} />
          ))}
        </div>
      ) : null}
      {!unavailable && !complete ? (
        <ul className="mt-3 space-y-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
          {(data?.issues || []).slice(0, 3).map((issue, index) => (
            <li key={`${issue.code}-${issue.entity_id}-${index}`}>• {issue.message}</li>
          ))}
        </ul>
      ) : null}

      {expanded ? (
        <div className="mt-5 space-y-5 sm:space-y-6 border-t border-slate-200 pt-5 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Missing and draft assignments are shown first.
            </p>
            <div className="flex flex-wrap gap-1.5 overflow-x-auto max-w-full pb-0.5" aria-label="Coverage filter">
              {[
                ["ALL", "All"],
                ...(hasDraftRoles ? [["DRAFT", `Drafts (${totalDrafts})`]] : []),
                ["ATTENTION", "Needs attention"],
                ["ASSIGNED", "Assigned"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCoverageFilter(value)}
                  className={`min-h-8 sm:min-h-9 whitespace-nowrap rounded-lg px-2.5 sm:px-3 text-xs font-semibold transition ${
                    coverageFilter === value
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <section id="assignment-departments">
            <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100">
              Department managers
            </h3>

            {/* Mobile Cards for Department Managers (< sm) */}
            <div className="mt-2.5 space-y-2 sm:hidden">
              {filteredRows(data?.departments || []).map((row) => (
                <div
                  key={`card-${row.department_id}`}
                  className="rounded-xl border border-slate-200 bg-white p-3 sm:p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {row.department_code || row.department_name}
                      </p>
                      {row.department_name && row.department_code ? (
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                          {row.department_name}
                        </p>
                      ) : null}
                    </div>
                    <CoverageBadge status={row.coverage_status} />
                  </div>
                  <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5 dark:border-slate-800">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                        Manager
                      </p>
                      <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {row.manager_display_name ||
                          (row.coverage_status === "MULTIPLE_ACTIVE_MANAGERS"
                            ? `${row.manager_candidates?.length || 0} active managers`
                            : "Not assigned")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openAssignManagerModal(row)}
                      className="os-btn-primary-soft shrink-0 min-h-8 px-3 text-xs font-semibold"
                    >
                      {row.coverage_status === "ASSIGNED" ? "Reassign" : "Assign"}
                    </button>
                  </div>
                </div>
              ))}
              {filteredRows(data?.departments || []).length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400 dark:border-slate-800">
                  No departments match the current filter.
                </div>
              ) : null}
            </div>

            {/* Desktop & Tablet Table for Department Managers (>= sm) */}
            <div className="mt-2 hidden overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 sm:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[580px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3">Manager</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {filteredRows(data?.departments || []).map((row) => (
                      <tr key={`table-${row.department_id}`}>
                        <th scope="row" className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                          {row.department_code || row.department_name}
                        </th>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {row.manager_display_name ||
                            (row.coverage_status === "MULTIPLE_ACTIVE_MANAGERS"
                              ? `${row.manager_candidates?.length || 0} active managers`
                              : "Not assigned")}
                        </td>
                        <td className="px-4 py-3">
                          <CoverageBadge status={row.coverage_status} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => openAssignManagerModal(row)}
                            className="os-btn-primary-soft min-h-8 px-3 text-xs font-semibold"
                          >
                            {row.coverage_status === "ASSIGNED" ? "Reassign" : "Assign"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section id="assignment-sports">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
              <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100">
                Sports facilitators
              </h3>
              {draftFacilitatorsCount > 0 && (
                <button
                  type="button"
                  disabled={Boolean(confirmingSection || confirmingRowId)}
                  onClick={handleConfirmAllFacilitators}
                  className="inline-flex min-h-8 sm:min-h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 self-start sm:self-auto"
                >
                  {confirmingSection === "FACILITATORS" ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  Confirm All Facilitators ({draftFacilitatorsCount})
                </button>
              )}
            </div>

            {/* Mobile Cards for Facilitators (< sm) */}
            <div className="mt-2.5 space-y-2 sm:hidden">
              {filteredRows(data?.sports || []).map((row) => {
                const isDraft = row.coverage_status === "DRAFT";
                const rowKey = `fac-${row.sport_id}`;
                const isBusy = confirmingRowId === rowKey || confirmingSection === "FACILITATORS";
                const facilitatorNames =
                  row.facilitators?.length > 0
                    ? row.facilitators.map((item) => item.display_name).join(", ")
                    : row.facilitator_display_name
                    ? `${row.facilitator_display_name} ${isDraft ? "(Draft)" : ""}`
                    : "Not assigned";

                return (
                  <div
                    key={`fac-card-${row.sport_id}`}
                    className="rounded-xl border border-slate-200 bg-white p-3 sm:p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {getSportDisplayName(row)}
                      </p>
                      <CoverageBadge status={row.coverage_status} />
                    </div>
                    <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5 dark:border-slate-800">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                          Facilitator
                        </p>
                        <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {facilitatorNames}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {isDraft && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleConfirmFacilitator(row)}
                            className="inline-flex min-h-8 items-center gap-1 rounded-lg bg-emerald-600 px-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {confirmingRowId === rowKey ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                            Confirm
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openFacilitators(row)}
                          className="os-btn-primary-soft min-h-8 px-2.5 text-xs font-semibold"
                        >
                          Manage
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredRows(data?.sports || []).length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400 dark:border-slate-800">
                  No sports match the current filter.
                </div>
              ) : null}
            </div>

            {/* Desktop & Tablet Table for Facilitators (>= sm) */}
            <div className="mt-2 hidden overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 sm:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[580px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Sport</th>
                      <th className="px-4 py-3">Facilitator</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {filteredRows(data?.sports || []).map((row) => {
                      const isDraft = row.coverage_status === "DRAFT";
                      const rowKey = `fac-${row.sport_id}`;
                      const isBusy = confirmingRowId === rowKey || confirmingSection === "FACILITATORS";
                      return (
                        <tr key={`table-${row.sport_id}`}>
                          <th scope="row" className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                            {getSportDisplayName(row)}
                          </th>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                            {row.facilitators?.length > 0
                              ? row.facilitators.map((item) => item.display_name).join(", ")
                              : row.facilitator_display_name
                              ? `${row.facilitator_display_name} ${isDraft ? "(Draft)" : ""}`
                              : "Not assigned"}
                          </td>
                          <td className="px-4 py-3">
                            <CoverageBadge status={row.coverage_status} />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {isDraft && (
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleConfirmFacilitator(row)}
                                  className="inline-flex min-h-8 items-center gap-1 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                                >
                                  {confirmingRowId === rowKey ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                  Confirm
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => openFacilitators(row)}
                                className="os-btn-primary-soft min-h-8 text-xs font-semibold"
                              >
                                Manage
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section id="assignment-coaches">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
              <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100">Coaches</h3>
              <div className="flex flex-wrap items-center gap-2">
                {draftCoachesCount > 0 && (
                  <button
                    type="button"
                    disabled={Boolean(confirmingSection || confirmingRowId)}
                    onClick={handleConfirmAllCoaches}
                    className="inline-flex min-h-8 sm:min-h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {confirmingSection === "COACHES" ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                    Confirm All Coaches ({draftCoachesCount})
                  </button>
                )}
                {coachAssignmentsTo ? (
                  <button
                    type="button"
                    onClick={() => navigate(coachAssignmentsTo)}
                    className="os-btn-ghost-soft min-h-8 sm:min-h-9 px-3 text-xs font-semibold"
                  >
                    Manage coaches
                  </button>
                ) : null}
              </div>
            </div>

            {/* Mobile Cards for Coaches (< sm) */}
            <div className="mt-2.5 space-y-2 sm:hidden">
              {coachRows.map((row, index) => {
                const action = resolveOperationalDestination("coach_assignments", tournamentAccess, {
                  workspace_id: workspaceId,
                  tournament_id: data?.tournament_id,
                  department_id: row.department_id,
                  sport_id: row.sport_id,
                  return_to: returnTo,
                });
                const isDraft = row.coverage_status === "DRAFT";
                const rowKey = `coach-${row.target_type}-${row.target_id}`;
                const isBusy = confirmingRowId === rowKey || confirmingSection === "COACHES";

                return (
                  <div
                    key={`coach-card-${row.target_type}-${row.target_id}-${index}`}
                    className="rounded-xl border border-slate-200 bg-white p-3 sm:p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                            {row.department_label}
                          </span>
                          <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 break-words">
                            {assignmentCompetitionLabel(row)}
                          </p>
                        </div>
                      </div>
                      <CoverageBadge status={row.coverage_status} />
                    </div>
                    <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5 dark:border-slate-800">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Coach</p>
                        <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {row.coach_display_name ? `${row.coach_display_name} ${isDraft ? "(Draft)" : ""}` : "Not assigned"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {isDraft && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleConfirmCoach(row)}
                            className="inline-flex min-h-8 items-center gap-1 rounded-lg bg-emerald-600 px-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {confirmingRowId === rowKey ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                            Confirm
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={!action}
                          onClick={() => action && navigate(action)}
                          className="os-btn-ghost-soft min-h-8 px-2.5 text-xs font-semibold disabled:opacity-50"
                        >
                          {row.coverage_status === "ASSIGNED" ? "View" : "Assign"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {coachRows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400 dark:border-slate-800">
                  No coaches match the current filter.
                </div>
              ) : null}
            </div>

            {/* Desktop & Tablet Table for Coaches (>= sm) */}
            <div className="mt-2 hidden overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 sm:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3">Sport / Event</th>
                      <th className="px-4 py-3">Coach</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {coachRows.map((row, index) => {
                      const action = resolveOperationalDestination("coach_assignments", tournamentAccess, {
                        workspace_id: workspaceId,
                        tournament_id: data?.tournament_id,
                        department_id: row.department_id,
                        sport_id: row.sport_id,
                        return_to: returnTo,
                      });
                      const isDraft = row.coverage_status === "DRAFT";
                      const rowKey = `coach-${row.target_type}-${row.target_id}`;
                      const isBusy = confirmingRowId === rowKey || confirmingSection === "COACHES";
                      return (
                        <tr key={`coach-table-${row.target_type}-${row.target_id}-${index}`}>
                          <th scope="row" className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                            {row.department_label}
                          </th>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                            {assignmentCompetitionLabel(row)}
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                            {row.coach_display_name ? `${row.coach_display_name} ${isDraft ? "(Draft)" : ""}` : "Not assigned"}
                          </td>
                          <td className="px-4 py-3">
                            <CoverageBadge status={row.coverage_status} />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {isDraft && (
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleConfirmCoach(row)}
                                  className="inline-flex min-h-8 items-center gap-1 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                                >
                                  {confirmingRowId === rowKey ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                  Confirm
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={!action}
                                onClick={() => action && navigate(action)}
                                className="os-btn-ghost-soft min-h-8 text-xs font-semibold disabled:opacity-50"
                              >
                                {row.coverage_status === "ASSIGNED" ? "View" : "Assign"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {facilitatorModal && typeof document !== "undefined" ? createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-3 sm:p-4 md:p-6 backdrop-blur-md transition-all"
          role="dialog"
          aria-modal="true"
          aria-labelledby="facilitator-dialog-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeFacilitatorModal();
          }}
        >
          <div className="relative max-h-[min(90vh,680px)] w-full max-w-lg overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id="facilitator-dialog-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Assign Sports Facilitator — {getSportDisplayName(facilitatorModal)}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Search and assign facilitators for {getSportDisplayName(facilitatorModal)} in this intramural event.
                </p>
              </div>
              <button
                type="button"
                disabled={facilitatorBusy}
                onClick={closeFacilitatorModal}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Currently Selected / Assigned Facilitators */}
            <div className="mt-4 space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Assigned Facilitators ({selectedFacilitators.length})
              </label>
              {selectedFacilitators.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedFacilitators.map((userId) => {
                    const row = eligible.find((e) => Number(e.user_id) === Number(userId));
                    const displayName = row?.display_name || row?.email || `User #${userId}`;
                    return (
                      <div
                        key={userId}
                        className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 py-1 pl-2.5 pr-1.5 text-xs font-semibold text-blue-900 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200 shadow-sm"
                      >
                        <span>{displayName}</span>
                        <button
                          type="button"
                          disabled={facilitatorBusy}
                          onClick={() => removeFacilitatorCandidate(userId)}
                          className="rounded-full p-0.5 text-blue-500 hover:bg-blue-200/60 hover:text-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/80 transition"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-3 text-center text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-900/40">
                  No facilitators assigned yet. Search below to add.
                </p>
              )}
            </div>

            {/* User Search & Autosuggest Box */}
            <div className="mt-4 space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Find Account by Name or Email
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  {facilitatorSearching ? <Loader2 size={16} className="animate-spin text-blue-500" /> : <Search size={16} />}
                </div>
                <input
                  type="text"
                  value={facilitatorSearch}
                  onChange={(e) => {
                    setFacilitatorSearch(e.target.value);
                    setFacilitatorError("");
                  }}
                  placeholder="Type user name (e.g. Maria Santos) or email..."
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Autosuggest Dropdown List */}
              {facilitatorSuggestions.length > 0 && (
                <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700/50">
                  {facilitatorSuggestions.map((user) => {
                    const isAlreadySelected = selectedFacilitators.includes(Number(user.id));
                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => {
                          if (isAlreadySelected) {
                            removeFacilitatorCandidate(user.id);
                          } else {
                            addFacilitatorCandidate(user);
                          }
                        }}
                        className={`flex w-full items-center justify-between gap-3 p-2.5 text-left transition ${
                          isAlreadySelected
                            ? "bg-blue-50/50 dark:bg-blue-950/20"
                            : "hover:bg-slate-50 dark:hover:bg-slate-700/50"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-900/60 dark:text-blue-200">
                            {(user.name || user.email || "U").slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0 truncate">
                            <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
                              {user.name || "Unnamed User"}
                            </p>
                            <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                              {user.email}
                            </p>
                          </div>
                        </div>
                        <span className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                          isAlreadySelected
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                        }`}>
                          {isAlreadySelected ? "Added" : "+ Add"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {facilitatorSearch.trim() && !facilitatorSearching && facilitatorSuggestions.length === 0 && (
                <p className="rounded-lg bg-slate-50 p-2.5 text-center text-xs text-slate-500 dark:bg-slate-800/40 dark:text-slate-400">
                  No active accounts found matching "{facilitatorSearch}".
                </p>
              )}
            </div>

            {/* Error message if any */}
            {facilitatorError ? (
              <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                {facilitatorError}
              </div>
            ) : null}

            {/* Modal Actions */}
            <div className="mt-5 sm:mt-6 flex flex-col-reverse gap-2 border-t border-slate-100 pt-3.5 sm:pt-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
              <div>
                {originalFacilitators.length > 0 ? (
                  <button
                    type="button"
                    disabled={facilitatorBusy}
                    onClick={removeFacilitators}
                    className="w-full sm:w-auto rounded-lg px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60 dark:text-rose-300 dark:hover:bg-rose-500/10 transition"
                  >
                    Remove all assignments
                  </button>
                ) : null}
              </div>
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
                <button
                  type="button"
                  disabled={facilitatorBusy}
                  onClick={closeFacilitatorModal}
                  className="w-full sm:w-auto rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={facilitatorBusy}
                  onClick={saveFacilitators}
                  className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-60"
                >
                  {facilitatorBusy ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Facilitator Assignments"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      ) : null}

      {/* Direct Assign Department Manager Modal */}
      {managerModal && typeof document !== "undefined" ? createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-3 sm:p-4 md:p-6 backdrop-blur-md transition-all"
          role="dialog"
          aria-modal="true"
          aria-labelledby="manager-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeAssignManagerModal();
          }}
        >
          <div className="relative max-h-[min(90vh,680px)] w-full max-w-lg overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id="manager-modal-title" className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  Assign Department Manager
                </h3>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {managerModal.department_name || managerModal.department_code}
                </p>
              </div>
              <button
                type="button"
                disabled={managerBusy}
                onClick={closeAssignManagerModal}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Current Manager Banner (if any) */}
            {managerModal.manager_display_name ? (
              <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700/80 dark:bg-slate-800/50">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Current Manager
                  </p>
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {managerModal.manager_display_name}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={managerBusy}
                  onClick={() => removeManagerAssignment(managerModal.manager_candidates?.[0])}
                  className="rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60 dark:border-rose-500/30 dark:bg-slate-900 dark:text-rose-400 transition"
                >
                  Unassign
                </button>
              </div>
            ) : null}

            {/* User Search & Autosuggest Box */}
            <div className="mt-4 space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Find an account by Name or Email
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  {managerSearching ? <Loader2 size={16} className="animate-spin text-blue-500" /> : <Search size={16} />}
                </div>
                <input
                  type="text"
                  value={managerSearchQuery}
                  onChange={(e) => {
                    setManagerSearchQuery(e.target.value);
                    setManagerModalError("");
                    if (selectedManagerUser && e.target.value !== selectedManagerUser.name && e.target.value !== selectedManagerUser.email) {
                      setSelectedManagerUser(null);
                    }
                  }}
                  placeholder="Type name (e.g. Juan dela Cruz) or email..."
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Autosuggest Dropdown List */}
              {managerSuggestions.length > 0 && !selectedManagerUser && (
                <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700/50">
                  {managerSuggestions.map((user) => {
                    const ineligibility = getManagerIneligibilityReason(
                      user,
                      managerModal.department_id,
                      managerModal.department_name || managerModal.department_code
                    );
                    const isDifferentDept = user.department?.id && Number(user.department.id) !== Number(managerModal.department_id);

                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => {
                          if (ineligibility) {
                            setManagerModalError(ineligibility);
                            return;
                          }
                          setSelectedManagerUser(user);
                          setManagerSearchQuery(user.name || user.email);
                          setManagerSuggestions([]);
                          setManagerModalError("");
                        }}
                        className={`flex w-full items-center justify-between gap-3 p-3 text-left transition ${
                          ineligibility
                            ? "bg-slate-50/70 opacity-70 hover:bg-rose-50/50 hover:opacity-100 dark:bg-slate-800/50 dark:hover:bg-rose-950/20"
                            : "hover:bg-blue-50/60 dark:hover:bg-slate-700/60"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            ineligibility
                              ? "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-200"
                          }`}>
                            {(user.name || user.email || "U").slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0 truncate">
                            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {user.name || "Unnamed User"}
                            </p>
                            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                              {user.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-0.5 shrink-0">
                          <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
                            isDifferentDept
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300"
                          }`}>
                            {user.department?.name || user.base_role?.role_name || "Account"}
                          </span>
                          {ineligibility ? (
                            <span className="text-[10px] font-medium text-rose-600 dark:text-rose-400">
                              Not eligible
                            </span>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {managerSearchQuery.trim() && !managerSearching && managerSuggestions.length === 0 && !selectedManagerUser && (
                <p className="rounded-lg bg-slate-50 p-3 text-center text-xs text-slate-500 dark:bg-slate-800/40 dark:text-slate-400">
                  No active accounts found matching "{managerSearchQuery}".
                </p>
              )}
            </div>

            {/* Selected User Preview Card */}
            {selectedManagerUser && (
              <div className="mt-4 flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/60 p-3.5 dark:border-blue-500/30 dark:bg-blue-950/30">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white shadow-sm">
                    {(selectedManagerUser.name || selectedManagerUser.email || "U").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-blue-950 dark:text-blue-100">
                      {selectedManagerUser.name || selectedManagerUser.email}
                    </p>
                    <p className="truncate text-xs text-blue-700/80 dark:text-blue-300/80">
                      {selectedManagerUser.email} {selectedManagerUser.department?.name ? `· ${selectedManagerUser.department.name}` : ""}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedManagerUser(null);
                    setManagerSearchQuery("");
                    setManagerModalError("");
                  }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Change
                </button>
              </div>
            )}

            {/* Error Message */}
            {managerModalError && (
              <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs leading-relaxed text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                {managerModalError}
              </div>
            )}

            {/* Modal Actions */}
            <div className="mt-5 sm:mt-6 flex flex-col-reverse gap-2 border-t border-slate-100 pt-3.5 sm:pt-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                disabled={managerBusy}
                onClick={closeAssignManagerModal}
                className="w-full sm:w-auto min-h-10 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={managerBusy || !selectedManagerUser || Boolean(getManagerIneligibilityReason(selectedManagerUser, managerModal.department_id, managerModal.department_name || managerModal.department_code))}
                onClick={saveManagerAssignment}
                className="inline-flex w-full sm:w-auto min-h-10 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {managerBusy ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    Assigning...
                  </>
                ) : (
                  "Confirm Assignment"
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </section>
  );
}
