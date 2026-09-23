import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { getFacilitatorTournaments } from "../../services/bracketService";
import { getDepartments } from "../../services/departmentService";
import { getSports } from "../../services/sportService";
import { getTeams } from "../../services/teamService";
import { getTournaments } from "../../services/tournamentService";
import { useWorkspace } from "../../context/WorkspaceContext";
import { createAnnouncement, previewAnnouncementRecipients } from "../../services/announcementService";
import { resolveRoleKeyFromRoles } from "../../utils/notificationRouting";
import useTournamentAccess from "../../hooks/useTournamentAccess";
import { getCoachEntryPools } from "../../services/entryPoolService";

const ROLE_OPTIONS = [
  { id: 3, label: "Sports Facilitator" },
  { id: 2, label: "Department Manager" },
  { id: 5, label: "Coach" },
  { id: 6, label: "Viewer / Player" },
];

const numberOrNull = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.trunc(parsed);
};

const normalizeIdList = (rawValues) => {
  if (!Array.isArray(rawValues)) return [];
  const values = [];
  const seen = new Set();
  rawValues.forEach((rawValue) => {
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    const next = Math.trunc(parsed);
    if (seen.has(next)) return;
    seen.add(next);
    values.push(next);
  });
  return values;
};

const parseRecipientIds = (rawValue) =>
  String(rawValue || "")
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((value) => Number.isFinite(value) && value > 0)
    .map((value) => Math.trunc(value));

const normalizeTournaments = (rows) => {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => {
      const id = Number(row?.id);
      const label = String(row?.tournament_name || "").trim();
      if (!Number.isFinite(id) || id <= 0 || !label) return null;
      const sportIds = Array.isArray(row?.sport_ids)
        ? row.sport_ids.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0).map((value) => Math.trunc(value))
        : [];
      const teamIds = Array.isArray(row?.team_ids)
        ? row.team_ids.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0).map((value) => Math.trunc(value))
        : [];
      return {
        id: Math.trunc(id),
        label,
        sportIds,
        teamIds,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.label.localeCompare(b.label));
};

const normalizeSports = (rows) => {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => {
      const id = Number(row?.id);
      const label = String(row?.sport_name || "").trim();
      if (!Number.isFinite(id) || id <= 0 || !label) return null;
      return { id: Math.trunc(id), label };
    })
    .filter(Boolean)
    .sort((a, b) => a.label.localeCompare(b.label));
};

const normalizeDepartments = (rows) => {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => {
      const id = Number(row?.id);
      const label = String(row?.department_name || "").trim();
      if (!Number.isFinite(id) || id <= 0 || !label) return null;
      return { id: Math.trunc(id), label };
    })
    .filter(Boolean)
    .sort((a, b) => a.label.localeCompare(b.label));
};

const normalizeTeams = (rows) => {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => {
      const id = Number(row?.id);
      const label = String(row?.team_name || "").trim();
      if (!Number.isFinite(id) || id <= 0 || !label) return null;
      return {
        id: Math.trunc(id),
        label,
        sportId: numberOrNull(row?.sport_id),
        departmentId: numberOrNull(row?.department_id),
        coachId: numberOrNull(row?.coach_id),
        managerId: numberOrNull(row?.manager_id),
        createdBy: numberOrNull(row?.created_by),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.label.localeCompare(b.label));
};

const MultiSelectField = ({
  label,
  values,
  onChange,
  options,
  noun,
  helper,
}) => {
  const safeValues = Array.isArray(values) ? values : [];
  const selectedValues = new Set(safeValues.map((value) => String(value)));

  const toggleValue = (nextValue) => {
    const valueAsString = String(nextValue);
    const next = new Set(selectedValues);
    if (next.has(valueAsString)) {
      next.delete(valueAsString);
    } else {
      next.add(valueAsString);
    }
    onChange(Array.from(next));
  };

  return (
    <div className="grid gap-1 text-sm">
      <span className="font-medium text-slate-700 dark:text-slate-200">{label}</span>
      <div className="grid max-h-72 grid-cols-2 gap-2 overflow-auto pr-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {options.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">No options available.</p>
        ) : null}
        {options.map((option) => {
          const optionValue = String(option.id);
          const isSelected = selectedValues.has(optionValue);
          return (
            <button
              key={`${label}-${option.id}`}
              type="button"
              onClick={() => toggleValue(optionValue)}
              aria-pressed={isSelected}
              className={`rounded-lg border px-2.5 py-2 text-left text-xs transition ${
                isSelected
                  ? "border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
                  : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-[var(--surface)] dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-[var(--surface)]"
              }`}
            >
              <span className="block truncate text-[11px] font-medium">{option.label}</span>
              <span className={`mt-1 block text-xs ${isSelected ? "text-emerald-700 dark:text-emerald-300" : "text-slate-500 dark:text-slate-400"}`}>
                {isSelected ? "Selected" : "Click to select"}
              </span>
            </button>
          );
        })}
      </div>
      <small className="text-xs text-slate-500 dark:text-slate-400">
        {safeValues.length} selected / {options.length} {noun}
        {options.length === 1 ? "" : "s"} available
      </small>
      {helper ? <small className="text-xs text-slate-500 dark:text-slate-400">{helper}</small> : null}
    </div>
  );
};

const PreviewGroup = ({ title, items }) => {
  const entries = Object.entries(items || {}).sort((a, b) => (b[1] || 0) - (a[1] || 0));
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">{title}</p>
      {entries.length === 0 ? (
        <p className="mt-2 text-xs text-emerald-800/80 dark:text-emerald-200/80">No recipients in this group.</p>
      ) : (
        <div className="mt-2 space-y-1 text-sm text-emerald-900 dark:text-emerald-100">
          {entries.slice(0, 6).map(([key, count]) => (
            <p key={`${title}-${key}`} className="flex items-center justify-between gap-2">
              <span className="truncate">{key}</span>
              <span className="font-semibold">{count}</span>
            </p>
          ))}
          {entries.length > 6 ? <p className="text-xs opacity-80">+{entries.length - 6} more</p> : null}
        </div>
      )}
    </div>
  );
};

const CreateAnnouncementPage = () => {
  const navigate = useNavigate();
  const { user, roleNames, isViewerOnly } = useAuth();
  const { selectedIntramural } = useWorkspace();
  const tournamentAccess = useTournamentAccess();
  const selectedWorkspaceId = selectedIntramural?.id ?? null;
  const roleKey = resolveRoleKeyFromRoles({ roleNames, isViewerOnly });

  const hasCoordinator = tournamentAccess.hasSelectedTournament
    ? tournamentAccess.isCoordinatorMode
    : roleNames.includes("SPORTS_COORDINATOR");
  const hasFacilitator = tournamentAccess.isFacilitatorMode;
  const hasDepartmentManager = tournamentAccess.hasSelectedTournament
    ? tournamentAccess.isDepartmentManagerMode
    : roleNames.includes("DEPARTMENT_MANAGER");
  const hasCoach = tournamentAccess.isCoachMode;
  const exactRoleContexts = tournamentAccess.roleContexts;

  const roleAssignments = useMemo(
    () => (Array.isArray(user?.roles) ? user.roles : []),
    [user?.roles]
  );

  const managerDepartmentIds = useMemo(() => {
    const values = new Set();
    roleAssignments.forEach((row) => {
      if (String(row?.role_name || "").toUpperCase() !== "DEPARTMENT_MANAGER") return;
      const departmentId = numberOrNull(row?.department_id);
      if (departmentId) values.add(departmentId);
    });
    if (values.size === 0) {
      const fallbackDepartmentId = numberOrNull(user?.department_id);
      if (fallbackDepartmentId) values.add(fallbackDepartmentId);
    }
    return values;
  }, [roleAssignments, user?.department_id]);

  const facilitatorSportIds = useMemo(() => {
    const values = new Set();
    exactRoleContexts.forEach((row) => {
      if (String(row?.role || "").toLowerCase() !== "sports_facilitator") return;
      const sportId = numberOrNull(row?.sport_id);
      if (sportId) values.add(sportId);
    });
    return values;
  }, [exactRoleContexts]);

  const facilitatorDepartmentIds = useMemo(() => {
    const values = new Set();
    roleAssignments.forEach((row) => {
      if (String(row?.role_name || "").toUpperCase() !== "SPORTS_FACILITATOR") return;
      const departmentId = numberOrNull(row?.department_id);
      if (departmentId) values.add(departmentId);
    });
    return values;
  }, [roleAssignments]);

  const coachAssignmentTeamIds = useMemo(() => {
    const values = new Set();
    exactRoleContexts.forEach((row) => {
      if (String(row?.role || "").toLowerCase() !== "coach") return;
      const teamId = numberOrNull(row?.team_id);
      if (teamId) values.add(teamId);
    });
    return values;
  }, [exactRoleContexts]);

  const coachEntryPoolIds = useMemo(() => new Set(
    exactRoleContexts
      .filter((row) => String(row?.role || "").toLowerCase() === "coach")
      .map((row) => numberOrNull(row?.entry_pool_id))
      .filter(Boolean)
  ), [exactRoleContexts]);

  const scopeOptions = useMemo(() => {
    const allowed = new Set();
    if (hasCoordinator) {
      ["GLOBAL", "TOURNAMENT", "SPORT", "DEPARTMENT", "TEAM", "ROLE", "CUSTOM"].forEach((value) => allowed.add(value));
    }
    if (hasFacilitator) {
      ["TOURNAMENT", "SPORT", "TEAM", "ROLE"].forEach((value) => allowed.add(value));
    }
    if (hasDepartmentManager) {
      ["DEPARTMENT", "SPORT", "TEAM", "ROLE"].forEach((value) => allowed.add(value));
    }
    if (hasCoach) {
      ["TEAM", "ENTRY_POOL"].forEach((value) => allowed.add(value));
    }
    const displayOrder = ["GLOBAL", "TOURNAMENT", "SPORT", "DEPARTMENT", "TEAM", "ENTRY_POOL", "ROLE", "CUSTOM"];
    return displayOrder.filter((value) => allowed.has(value));
  }, [hasCoach, hasCoordinator, hasDepartmentManager, hasFacilitator]);

  const [form, setForm] = useState({
    title: "",
    body: "",
    priority: "NORMAL",
    category: "GENERAL",
    target_scope_type: scopeOptions[0] || "TEAM",
    target_scope_id: "",
    target_role_id: "",
    tournament_ids: [],
    sport_ids: [],
    department_ids: [],
    team_ids: [],
    include_players: true,
    recipient_user_ids_csv: "",
  });
  const [preview, setPreview] = useState(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [optionError, setOptionError] = useState("");
  const [loadingOptions, setLoadingOptions] = useState(false);

  const [tournamentOptions, setTournamentOptions] = useState([]);
  const [sportOptions, setSportOptions] = useState([]);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [teamOptions, setTeamOptions] = useState([]);
  const [entryPoolOptions, setEntryPoolOptions] = useState([]);
  const [facilitatorScopeRows, setFacilitatorScopeRows] = useState([]);
  const [facilitatorScopeLoaded, setFacilitatorScopeLoaded] = useState(false);

  useEffect(() => {
    setLoadingOptions(true);
    setOptionError("");
    const loadOptions = async () => {
      try {
        const [tournamentRows, sportRows, departmentRows, teamRows] = await Promise.all([
          getTournaments(selectedWorkspaceId ? { workspaceId: selectedWorkspaceId } : {}),
          getSports(),
          getDepartments(),
          getTeams(),
        ]);
        let nextFacilitatorRows = [];
        let nextFacilitatorLoaded = false;
        if (hasFacilitator) {
          try {
            const rows = await getFacilitatorTournaments();
            nextFacilitatorRows = Array.isArray(rows) ? rows : [];
            nextFacilitatorLoaded = true;
          } catch {
            nextFacilitatorRows = [];
            nextFacilitatorLoaded = false;
          }
        }
        setTournamentOptions(normalizeTournaments(tournamentRows));
        setSportOptions(normalizeSports(sportRows));
        setDepartmentOptions(normalizeDepartments(departmentRows));
        setTeamOptions(normalizeTeams(teamRows));
        if (hasCoach && tournamentAccess.selectedTournamentId) {
          const pools = await getCoachEntryPools(Number(tournamentAccess.selectedTournamentId));
          setEntryPoolOptions((Array.isArray(pools) ? pools : []).map((pool) => ({
            id: Number(pool.id),
            label: String(pool.pool_name || `Entry Pool #${pool.id}`),
          })).filter((pool) => Number.isFinite(pool.id) && coachEntryPoolIds.has(pool.id)));
        } else {
          setEntryPoolOptions([]);
        }
        setFacilitatorScopeRows(nextFacilitatorRows);
        setFacilitatorScopeLoaded(nextFacilitatorLoaded);
      } catch (apiError) {
        setOptionError(apiError?.response?.data?.detail || "Some selector options failed to load.");
      } finally {
        setLoadingOptions(false);
      }
    };
    void loadOptions();
  }, [coachEntryPoolIds, hasCoach, hasFacilitator, selectedWorkspaceId, tournamentAccess.selectedTournamentId]);

  const facilitatorTournamentIds = useMemo(() => {
    const values = new Set();
    facilitatorScopeRows.forEach((row) => {
      const tournamentId = numberOrNull(row?.id);
      if (tournamentId) values.add(tournamentId);
    });
    return values;
  }, [facilitatorScopeRows]);

  const facilitatorScopedSportIds = useMemo(() => {
    const values = new Set(facilitatorSportIds);
    facilitatorScopeRows.forEach((row) => {
      const sportId = numberOrNull(row?.sport_id);
      if (sportId) values.add(sportId);
    });
    return values;
  }, [facilitatorScopeRows, facilitatorSportIds]);

  const coachTeamIds = useMemo(() => {
    return new Set(coachAssignmentTeamIds);
  }, [coachAssignmentTeamIds]);

  const scopedDepartmentOptions = useMemo(() => {
    if (hasCoordinator) return departmentOptions;
    if (hasDepartmentManager) {
      return departmentOptions.filter((option) => managerDepartmentIds.has(option.id));
    }
    if (hasFacilitator && facilitatorDepartmentIds.size > 0) {
      return departmentOptions.filter((option) => facilitatorDepartmentIds.has(option.id));
    }
    if (hasCoach && coachTeamIds.size > 0) {
      const departmentIds = new Set();
      teamOptions.forEach((team) => {
        if (!coachTeamIds.has(team.id)) return;
        if (team.departmentId) departmentIds.add(team.departmentId);
      });
      return departmentOptions.filter((option) => departmentIds.has(option.id));
    }
    return departmentOptions;
  }, [
    coachTeamIds,
    departmentOptions,
    facilitatorDepartmentIds,
    hasCoach,
    hasCoordinator,
    hasDepartmentManager,
    hasFacilitator,
    managerDepartmentIds,
    teamOptions,
  ]);

  const scopedSportOptions = useMemo(() => {
    if (hasCoordinator) return sportOptions;
    if (hasFacilitator) {
      if (facilitatorScopedSportIds.size === 0) return [];
      return sportOptions.filter((option) => facilitatorScopedSportIds.has(option.id));
    }
    if (hasDepartmentManager) {
      const sportIds = new Set();
      teamOptions.forEach((team) => {
        if (!team.sportId || !team.departmentId) return;
        if (managerDepartmentIds.has(team.departmentId)) sportIds.add(team.sportId);
      });
      return sportOptions.filter((option) => sportIds.has(option.id));
    }
    if (hasCoach) {
      const sportIds = new Set();
      teamOptions.forEach((team) => {
        if (!coachTeamIds.has(team.id) || !team.sportId) return;
        sportIds.add(team.sportId);
      });
      return sportOptions.filter((option) => sportIds.has(option.id));
    }
    return sportOptions;
  }, [
    coachTeamIds,
    facilitatorScopedSportIds,
    hasCoach,
    hasCoordinator,
    hasDepartmentManager,
    hasFacilitator,
    managerDepartmentIds,
    sportOptions,
    teamOptions,
  ]);

  const scopedTournamentOptions = useMemo(() => {
    if (hasCoordinator) return tournamentOptions;
    if (hasFacilitator) {
      if (facilitatorScopeLoaded) {
        return tournamentOptions.filter((option) => facilitatorTournamentIds.has(option.id));
      }
      if (facilitatorScopedSportIds.size === 0) return [];
      return tournamentOptions.filter((option) =>
        option.sportIds.some((sportId) => facilitatorScopedSportIds.has(sportId))
      );
    }
    if (hasCoach) {
      const coachTeamIdValues = new Set([...coachTeamIds]);
      return tournamentOptions.filter((option) =>
        option.teamIds.some((teamId) => coachTeamIdValues.has(teamId))
      );
    }
    return tournamentOptions;
  }, [
    coachTeamIds,
    facilitatorScopedSportIds,
    facilitatorTournamentIds,
    hasCoach,
    hasCoordinator,
    hasFacilitator,
    facilitatorScopeLoaded,
    tournamentOptions,
  ]);

  const scopedTeamOptions = useMemo(() => {
    if (hasCoordinator) return teamOptions;
    if (hasCoach) {
      return teamOptions.filter((option) => coachTeamIds.has(option.id));
    }
    if (hasDepartmentManager) {
      return teamOptions.filter((option) => option.departmentId && managerDepartmentIds.has(option.departmentId));
    }
    if (hasFacilitator) {
      return teamOptions.filter((option) => option.sportId && facilitatorScopedSportIds.has(option.sportId));
    }
    return [];
  }, [
    coachTeamIds,
    facilitatorScopedSportIds,
    hasCoach,
    hasCoordinator,
    hasDepartmentManager,
    hasFacilitator,
    managerDepartmentIds,
    teamOptions,
  ]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateMultiField = (key, nextValues) => {
    const normalized = normalizeIdList(nextValues).map((value) => String(value));
    setForm((prev) => ({ ...prev, [key]: normalized }));
  };

  const clearScopeTargets = () => {
    setForm((prev) => ({
      ...prev,
      target_role_id: "",
      target_scope_id: "",
      tournament_ids: [],
      sport_ids: [],
      department_ids: [],
      team_ids: [],
      recipient_user_ids_csv: "",
    }));
  };

  useEffect(() => {
    if (scopeOptions.length === 0) return;
    if (scopeOptions.includes(form.target_scope_type)) return;
    setForm((prev) => ({
      ...prev,
      target_scope_type: scopeOptions[0],
      target_role_id: "",
      target_scope_id: "",
      tournament_ids: [],
      sport_ids: [],
      department_ids: [],
      team_ids: [],
      recipient_user_ids_csv: "",
    }));
    setPreview(null);
  }, [form.target_scope_type, scopeOptions]);

  const pruneSelections = (key, options) => {
    const allowedIds = new Set(options.map((option) => String(option.id)));
    setForm((prev) => {
      const current = Array.isArray(prev[key]) ? prev[key] : [];
      const next = current.filter((value) => allowedIds.has(String(value)));
      if (next.length === current.length) return prev;
      return { ...prev, [key]: next };
    });
  };

  useEffect(() => {
    pruneSelections("tournament_ids", scopedTournamentOptions);
  }, [scopedTournamentOptions]);

  useEffect(() => {
    pruneSelections("sport_ids", scopedSportOptions);
  }, [scopedSportOptions]);

  useEffect(() => {
    pruneSelections("department_ids", scopedDepartmentOptions);
  }, [scopedDepartmentOptions]);

  useEffect(() => {
    pruneSelections("team_ids", scopedTeamOptions);
  }, [scopedTeamOptions]);

  useEffect(() => {
    if (!hasDepartmentManager) return;
    if (form.department_ids.length > 0) return;
    if (!["DEPARTMENT", "SPORT", "TOURNAMENT", "ROLE"].includes(form.target_scope_type)) return;
    if (scopedDepartmentOptions.length !== 1) return;
    updateMultiField("department_ids", [String(scopedDepartmentOptions[0].id)]);
  }, [scopedDepartmentOptions, form.department_ids, form.target_scope_type, hasDepartmentManager]);

  useEffect(() => {
    if (!hasCoach) return;
    if (form.target_scope_type !== "TEAM") return;
    if (form.team_ids.length > 0) return;
    if (scopedTeamOptions.length !== 1) return;
    updateMultiField("team_ids", [String(scopedTeamOptions[0].id)]);
  }, [scopedTeamOptions, form.target_scope_type, form.team_ids, hasCoach]);

  const selectedTournamentIds = useMemo(() => normalizeIdList(form.tournament_ids), [form.tournament_ids]);
  const selectedSportIds = useMemo(() => normalizeIdList(form.sport_ids), [form.sport_ids]);
  const selectedDepartmentIds = useMemo(() => normalizeIdList(form.department_ids), [form.department_ids]);
  const selectedTeamIds = useMemo(() => normalizeIdList(form.team_ids), [form.team_ids]);

  const buildPayload = ({ publishNow = false } = {}) => {
    const targetScope = String(form.target_scope_type || "TEAM").toUpperCase();
    const targetScopeMap = {
      TOURNAMENT: selectedTournamentIds[0] || null,
      SPORT: selectedSportIds[0] || null,
      DEPARTMENT: selectedDepartmentIds[0] || null,
      TEAM: selectedTeamIds[0] || null,
      ENTRY_POOL: numberOrNull(form.target_scope_id),
      ROLE: numberOrNull(form.target_role_id),
      GLOBAL: null,
      CUSTOM: null,
    };

    return {
      title: String(form.title || "").trim(),
      body: String(form.body || "").trim(),
      priority: form.priority,
      category: form.category,
      target_scope_type: targetScope,
      target_scope_id: targetScopeMap[targetScope] ?? null,
      target_role_id: numberOrNull(form.target_role_id),
      tournament_id: targetScope === "ENTRY_POOL"
        ? numberOrNull(tournamentAccess.selectedTournamentId)
        : selectedTournamentIds[0] || null,
      tournament_ids: targetScope === "ENTRY_POOL"
        ? [numberOrNull(tournamentAccess.selectedTournamentId)].filter(Boolean)
        : selectedTournamentIds,
      sport_id: selectedSportIds[0] || null,
      sport_ids: selectedSportIds,
      department_id: selectedDepartmentIds[0] || null,
      department_ids: selectedDepartmentIds,
      team_id: selectedTeamIds[0] || null,
      team_ids: selectedTeamIds,
      include_players: Boolean(form.include_players),
      recipient_user_ids: targetScope === "CUSTOM" ? parseRecipientIds(form.recipient_user_ids_csv) : [],
      publish_now: Boolean(publishNow),
    };
  };

  const handlePreview = async () => {
    setError("");
    setPreview(null);
    try {
      const payload = buildPayload({ publishNow: false });
      const result = await previewAnnouncementRecipients(payload);
      setPreview(result);
      return result;
    } catch (apiError) {
      setError(apiError?.response?.data?.detail || "Failed to preview recipients.");
      return null;
    }
  };

  const handleSaveDraft = async (event) => {
    event.preventDefault();
    setSavingDraft(true);
    setError("");
    try {
      const payload = buildPayload({ publishNow: false });
      const result = await createAnnouncement(payload);
      const announcementId = Number(result?.announcement?.id || 0);
      if (Number.isFinite(announcementId) && announcementId > 0) {
        navigate(`/${roleKey}/announcements/${announcementId}`);
        return;
      }
      navigate(`/${roleKey}/announcements`);
    } catch (apiError) {
      setError(apiError?.response?.data?.detail || "Failed to create announcement.");
    } finally {
      setSavingDraft(false);
    }
  };

  const handlePublishAnnouncement = async () => {
    setPublishing(true);
    setError("");
    try {
      if (!String(form.title || "").trim() || !String(form.body || "").trim()) {
        setError("Title and body are required before publishing.");
        return;
      }
      const previewResult = await handlePreview();
      if (!previewResult) return;

      const totalRecipients = Number(previewResult?.total_recipients || 0);
      if (totalRecipients <= 0) {
        setError("No eligible recipients found for this audience.");
        return;
      }
      if (!window.confirm(`Publish this announcement to ${totalRecipients} users?`)) {
        return;
      }

      const payload = buildPayload({ publishNow: true });
      const result = await createAnnouncement(payload);
      const announcementId = Number(result?.announcement?.id || 0);
      if (Number.isFinite(announcementId) && announcementId > 0) {
        navigate(`/${roleKey}/announcements/${announcementId}`);
        return;
      }
      navigate(`/${roleKey}/announcements`);
    } catch (apiError) {
      setError(apiError?.response?.data?.detail || "Failed to publish announcement.");
    } finally {
      setPublishing(false);
    }
  };

  const isWorking = savingDraft || publishing;
  const hasRequiredContent = Boolean(String(form.title || "").trim() && String(form.body || "").trim());
  const hasPreview = preview !== null;
  const canPublish = Number(preview?.total_recipients || 0) > 0;

  const tournamentMap = useMemo(() => new Map(tournamentOptions.map((item) => [item.id, item.label])), [tournamentOptions]);
  const sportMap = useMemo(() => new Map(sportOptions.map((item) => [item.id, item.label])), [sportOptions]);
  const departmentMap = useMemo(() => new Map(departmentOptions.map((item) => [item.id, item.label])), [departmentOptions]);
  const teamMap = useMemo(() => new Map(teamOptions.map((item) => [item.id, item.label])), [teamOptions]);

  const buildSelectionSummary = (ids, map, noun) => {
    if (!ids.length) return `No ${noun} selected`;
    const labels = ids.map((id) => map.get(id) || `${noun} #${id}`);
    if (labels.length <= 3) return labels.join(", ");
    return `${labels.slice(0, 3).join(", ")} +${labels.length - 3} more`;
  };

  if (scopeOptions.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 dark:border-slate-800 dark:bg-[var(--surface)] dark:text-slate-300">
        You do not have permission to create announcements.
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-[1320px] space-y-4 px-4 pb-10 md:px-6 lg:px-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-[var(--surface)]">
        <button
          type="button"
          onClick={() => navigate(`/${roleKey}/announcements`)}
          className="mb-3 inline-flex items-center rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-[var(--surface)]"
        >
          Back to Announcements
        </button>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Create Announcement</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Send official updates to users within your assigned scope.
        </p>
      </div>

      <form onSubmit={handleSaveDraft} className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-[var(--surface)]">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Message Details</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Write a clear announcement title and message for your selected audience.
          </p>

          <div className="mt-4 max-w-3xl space-y-3">
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-200">Title</span>
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-[var(--surface-soft)]"
                value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
                maxLength={150}
                required
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-200">Body</span>
              <textarea
                className="min-h-[140px] max-h-[360px] rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-[var(--surface-soft)]"
                value={form.body}
                onChange={(event) => updateField("body", event.target.value)}
                maxLength={5000}
                required
              />
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">Priority</span>
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-[var(--surface-soft)]"
                  value={form.priority}
                  onChange={(event) => updateField("priority", event.target.value)}
                >
                  <option value="LOW">LOW</option>
                  <option value="NORMAL">NORMAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="URGENT">URGENT</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">Category</span>
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-[var(--surface-soft)]"
                  value={form.category}
                  onChange={(event) => updateField("category", event.target.value)}
                >
                  {["GENERAL", "SCHEDULE", "VENUE", "BRACKET", "RESULT", "REMINDER", "POLICY"].map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-[var(--surface)]">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Audience Targeting</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Select one or more valid targets. Backend permissions still enforce final access.
          </p>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-200">Target Scope</span>
              <select
                className="rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-[var(--surface-soft)]"
                value={form.target_scope_type}
                onChange={(event) => {
                  updateField("target_scope_type", event.target.value);
                  clearScopeTargets();
                  setPreview(null);
                }}
              >
                {scopeOptions.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </label>

            <label className="inline-flex items-center gap-2 self-end text-sm text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={form.include_players}
                onChange={(event) => updateField("include_players", Boolean(event.target.checked))}
              />
              Include players
            </label>

            {form.target_scope_type === "ROLE" ? (
              <label className="grid gap-1 text-sm lg:col-span-2">
                <span className="font-medium text-slate-700 dark:text-slate-200">Target Role</span>
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-[var(--surface-soft)]"
                  value={form.target_role_id}
                  onChange={(event) => updateField("target_role_id", event.target.value)}
                >
                  <option value="">Select role...</option>
                  {ROLE_OPTIONS.map((option) => (
                    <option key={`role-${option.id}`} value={String(option.id)}>{option.label}</option>
                  ))}
                </select>
              </label>
            ) : null}

            {form.target_scope_type === "TOURNAMENT" ? (
              <div className="lg:col-span-2">
                <MultiSelectField
                  label="Tournaments"
                  values={form.tournament_ids}
                  onChange={(nextValues) => updateMultiField("tournament_ids", nextValues)}
                  options={scopedTournamentOptions}
                  noun="tournament"
                />
              </div>
            ) : null}

            {form.target_scope_type === "SPORT" ? (
              <>
                <div className="lg:col-span-2">
                  <MultiSelectField
                    label="Sports"
                    values={form.sport_ids}
                    onChange={(nextValues) => updateMultiField("sport_ids", nextValues)}
                    options={scopedSportOptions}
                    noun="sport"
                  />
                </div>
                <div className="lg:col-span-2">
                  <MultiSelectField
                    label="Limit to departments"
                    values={form.department_ids}
                    onChange={(nextValues) => updateMultiField("department_ids", nextValues)}
                    options={scopedDepartmentOptions}
                    noun="department"
                    helper="Optional"
                  />
                </div>
                <div className="lg:col-span-2">
                  <MultiSelectField
                    label="Limit to tournaments"
                    values={form.tournament_ids}
                    onChange={(nextValues) => updateMultiField("tournament_ids", nextValues)}
                    options={scopedTournamentOptions}
                    noun="tournament"
                    helper="Optional"
                  />
                </div>
              </>
            ) : null}

            {form.target_scope_type === "DEPARTMENT" ? (
              <div className="lg:col-span-2">
                <MultiSelectField
                  label="Departments"
                  values={form.department_ids}
                  onChange={(nextValues) => updateMultiField("department_ids", nextValues)}
                  options={scopedDepartmentOptions}
                  noun="department"
                />
              </div>
            ) : null}

            {form.target_scope_type === "TEAM" ? (
              <>
                <div className="lg:col-span-2">
                  <MultiSelectField
                    label="Teams"
                    values={form.team_ids}
                    onChange={(nextValues) => updateMultiField("team_ids", nextValues)}
                    options={scopedTeamOptions}
                    noun="team"
                  />
                </div>
                <div className="lg:col-span-2">
                  <MultiSelectField
                    label="Limit to tournaments"
                    values={form.tournament_ids}
                    onChange={(nextValues) => updateMultiField("tournament_ids", nextValues)}
                    options={scopedTournamentOptions}
                    noun="tournament"
                    helper="Optional"
                  />
                </div>
              </>
            ) : null}

            {form.target_scope_type === "ENTRY_POOL" ? (
              <label className="grid gap-1 text-sm lg:col-span-2">
                <span className="font-medium text-slate-700 dark:text-slate-200">Assigned entry pool</span>
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-[var(--surface-soft)]"
                  value={form.target_scope_id}
                  onChange={(event) => updateField("target_scope_id", event.target.value)}
                >
                  <option value="">Select an entry pool</option>
                  {entryPoolOptions.map((option) => (
                    <option key={`entry-pool-${option.id}`} value={option.id}>{option.label}</option>
                  ))}
                </select>
                <small className="text-xs text-slate-500 dark:text-slate-400">
                  Only pools assigned to you in the selected Intramural are listed.
                </small>
              </label>
            ) : null}

            {form.target_scope_type === "ROLE" ? (
              <>
                <MultiSelectField
                  label="Limit to departments"
                  values={form.department_ids}
                  onChange={(nextValues) => updateMultiField("department_ids", nextValues)}
                  options={scopedDepartmentOptions}
                  noun="department"
                  helper="Optional"
                />
                <MultiSelectField
                  label="Limit to sports"
                  values={form.sport_ids}
                  onChange={(nextValues) => updateMultiField("sport_ids", nextValues)}
                  options={scopedSportOptions}
                  noun="sport"
                  helper="Optional"
                />
                <MultiSelectField
                  label="Limit to teams"
                  values={form.team_ids}
                  onChange={(nextValues) => updateMultiField("team_ids", nextValues)}
                  options={scopedTeamOptions}
                  noun="team"
                  helper="Optional"
                />
                <MultiSelectField
                  label="Limit to tournaments"
                  values={form.tournament_ids}
                  onChange={(nextValues) => updateMultiField("tournament_ids", nextValues)}
                  options={scopedTournamentOptions}
                  noun="tournament"
                  helper="Optional"
                />
              </>
            ) : null}

            {form.target_scope_type === "CUSTOM" ? (
              <label className="grid gap-1 text-sm lg:col-span-2">
                <span className="font-medium text-slate-700 dark:text-slate-200">Recipient User IDs (comma-separated)</span>
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-[var(--surface-soft)]"
                  value={form.recipient_user_ids_csv}
                  onChange={(event) => updateField("recipient_user_ids_csv", event.target.value)}
                  placeholder="e.g. 5, 12, 44"
                />
              </label>
            ) : null}

            {loadingOptions ? <p className="text-sm text-slate-500 dark:text-slate-400 lg:col-span-2">Loading selector options...</p> : null}
            {optionError ? <p className="text-sm text-amber-600 lg:col-span-2">{optionError}</p> : null}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-[var(--surface)]">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Recipient Preview</h2>
          {!hasPreview ? (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Preview recipients before publishing this announcement.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
                <p className="font-semibold">
                  Total recipients: {preview.total_recipients}
                </p>
                {Number(preview.total_recipients || 0) === 0 ? (
                  <p className="mt-1 text-sm text-amber-700 dark:text-amber-200">No eligible recipients found for this scope.</p>
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <PreviewGroup title="By Role" items={preview.by_role || {}} />
                <PreviewGroup title="By Department" items={preview.by_department || {}} />
                <PreviewGroup title="By Team" items={preview.by_team || {}} />
                <PreviewGroup title="By Sport" items={preview.by_sport || {}} />
              </div>
            </div>
          )}

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-[var(--surface-soft)]/60 dark:text-slate-300">
            <p className="font-semibold">Target Summary</p>
            <p className="mt-1">Scope: {form.target_scope_type}</p>
            <p>Tournaments: {buildSelectionSummary(selectedTournamentIds, tournamentMap, "tournament")}</p>
            <p>Sports: {buildSelectionSummary(selectedSportIds, sportMap, "sport")}</p>
            <p>Departments: {buildSelectionSummary(selectedDepartmentIds, departmentMap, "department")}</p>
            <p>Teams: {buildSelectionSummary(selectedTeamIds, teamMap, "team")}</p>
            <p>Include players: {form.include_players ? "Yes" : "No"}</p>
          </div>
        </div>

        <div className="z-10 rounded-2xl border border-slate-200 bg-white/95 p-3 backdrop-blur md:sticky md:bottom-4 md:p-4 dark:border-slate-800 dark:bg-[var(--surface)]/95">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={handlePreview}
              disabled={isWorking}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 sm:w-auto dark:border-slate-700 dark:text-slate-200 dark:hover:bg-[var(--surface)]"
            >
              Preview Recipients
            </button>
            <button
              type="submit"
              disabled={isWorking}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 sm:w-auto dark:border-slate-700 dark:text-slate-200 dark:hover:bg-[var(--surface)]"
            >
              {savingDraft ? "Saving Draft..." : "Save Draft"}
            </button>
            <button
              type="button"
              onClick={handlePublishAnnouncement}
              disabled={isWorking || !hasRequiredContent}
              className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-60 sm:w-auto ${
                canPublish
                  ? "bg-emerald-600 text-white hover:bg-emerald-500"
                  : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-[var(--surface)] dark:text-slate-300 dark:hover:bg-[var(--surface)]"
              }`}
            >
              {publishing ? "Publishing..." : "Publish Announcement"}
            </button>
          </div>
        </div>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      </form>
    </section>
  );
};

export default CreateAnnouncementPage;
