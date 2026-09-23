import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Building2, FolderOpen, UserCog, UserPlus } from "lucide-react";
import AppModal from "../../components/common/AppModal";
import CollapsibleFilterPanel from "../../components/common/CollapsibleFilterPanel";
import DashboardCard from "../../components/common/DashboardCard";
import DataTable from "../../components/common/DataTable";
import EmptyState from "../../components/common/EmptyState";
import LoadingState from "../../components/common/LoadingState";
import MetricCard from "../../components/common/MetricCard";
import PageHeaderCard from "../../components/common/PageHeaderCard";
import SectionTabs from "../../components/common/SectionTabs";
import StatusBadge from "../../components/common/StatusBadge";
import { assignSportFacilitator, createRoleAssignment, deleteRoleAssignment, getAdminUsers, getInviteCodeStatus, getRoleAssignments, getUserManagementAuditLogs, updateAdminUserStatus, updateInviteCode } from "../../services/adminService";
import { createDepartment, deleteDepartment, getDepartments, updateDepartment } from "../../services/departmentService";
import { getSports } from "../../services/sportService";
import { getSportDisplayName } from "../../utils/tournamentEventCategories";
import { getTeams, getTeamPlayers, getTeamRoster } from "../../services/teamService";
import { getTournaments } from "../../services/tournamentService";
import { listEntries } from "../../services/competitionEntryService";
import { addSportStaff, getSportStaff, removeSportStaff, searchSportStaffCandidates } from "../../services/sportStaffService";
import { useAuth } from "../../context/AuthContext";
import { useWorkspace } from "../../context/WorkspaceContext";
import useTournamentAccess from "../../hooks/useTournamentAccess";
import InlineAlert from "./user_management/InlineAlert";
import { useProfileDrawer } from "../../components/profile";
import { buildUserAssignmentLabels } from "./management/userAssignmentPresentation";

const ROLE_DEPARTMENT_MANAGER = 2;
const ROLE_SPORT_FACILITATOR = 3;

const USER_SECTIONS = [
  { id: "all_accounts", label: "Accounts" },
  { id: "role_coverage", label: "Role Coverage" },
  { id: "staff_officials", label: "Staff & Officials" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active only" },
  { value: "inactive", label: "Inactive only" },
];

const STAFF_ROLE_OPTIONS = ["Official", "Referee", "Scorer", "Timekeeper", "Marshal", "Event Staff"];

const INPUT_CLS =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500";
const BTN_PRIMARY =
  "rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60";
const BTN_GHOST =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700";

const roleLabel = (value) => String(value || "").replace(/_/g, " ").trim() || "Unassigned";
const statusClass = (isActive) =>
  isActive
    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700";
const assignmentStatusClass = (isAssigned) =>
  isAssigned
    ? "border border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
    : "border border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
const accountStatusText = (isActive) => (isActive ? "Active account" : "Inactive account");
const fmtDateTime = (value) => {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "-";
  }
};
const getErrorMessage = (error, fallback = "Request failed.") => {
  if (typeof error === "string" && error.trim()) return error;
  if (error instanceof Error && typeof error.message === "string" && error.message.trim()) return error.message;

  const status = Number(error?.response?.status || 0);
  const detail = error?.response?.data?.detail ?? error?.detail;

  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0];
    if (typeof first === "string" && first.trim()) return `Invalid request: ${first}`;
    if (first && typeof first === "object") {
      if (typeof first.msg === "string" && first.msg.trim()) return `Invalid request: ${first.msg}`;
      if (typeof first.message === "string" && first.message.trim()) return `Invalid request: ${first.message}`;
    }
  }
  if (typeof detail === "string" && detail.trim()) return detail;
  if (detail && typeof detail === "object") {
    if (typeof detail.message === "string" && detail.message.trim()) return detail.message;
    if (typeof detail.msg === "string" && detail.msg.trim()) return detail.msg;
  }

  const data = error?.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  if (data && typeof data === "object") {
    if (typeof data.message === "string" && data.message.trim()) return data.message;
    if (typeof data.error === "string" && data.error.trim()) return data.error;
  }

  if (status === 422) {
    return fallback || "Unable to process request. Please check filters and try again.";
  }
  return fallback || "Request failed.";
};
const inferMessageTone = (message) => {
  const value = String(message || "").trim().toLowerCase();
  if (!value) return "neutral";
  if (
    value.includes("unable")
    || value.includes("failed")
    || value.includes("error")
    || value.includes("cannot")
    || value.includes("required")
    || value.includes("must")
    || value.includes("invalid")
    || value.includes("blocked")
  ) {
    return "error";
  }
  if (
    value.includes("created")
    || value.includes("updated")
    || value.includes("removed")
    || value.includes("assigned")
    || value.includes("replaced")
    || value.includes("reactivate")
    || value.includes("deactivate")
    || value.includes("saved")
  ) {
    return "success";
  }
  return "neutral";
};

const getAccountStatusLabel = (isAssigned, isActive) => {
  if (!isAssigned) return "Not assigned";
  if (isActive === true) return "Active account";
  if (isActive === false) return "Assigned user is inactive";
  return "Account status unavailable";
};
const renderAssignmentStatusChip = (isAssigned) => (
  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${assignmentStatusClass(isAssigned)}`}>
    {isAssigned ? "Assigned" : "Missing"}
  </span>
);
const inviteStatusLabel = (statusPayload) => {
  if (!statusPayload) return "Not configured";
  if (!statusPayload.configured) return "Not configured";
  if (statusPayload.source === "db") return "Configured (database)";
  if (statusPayload.source === "env") return "Configured (environment)";
  return "Configured";
};
const generateInviteCode = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const length = 12;
  const values = new Uint32Array(length);
  window.crypto.getRandomValues(values);
  let code = "";
  for (let index = 0; index < length; index += 1) {
    code += alphabet[values[index] % alphabet.length];
  }
  return code;
};
const UserManagement = ({ managementPage = "users" }) => {
  const { user } = useAuth();
  const { selectedIntramural } = useWorkspace();
  const { selectedTournamentId } = useTournamentAccess();
  const { openProfile } = useProfileDrawer();
  const navigate = useNavigate();
  const currentUserId = Number(user?.id || user?.user_id || 0);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("all_accounts");
  const [coverageType, setCoverageType] = useState("manager");

  const [departments, setDepartments] = useState([]);
  const [sports, setSports] = useState([]);
  const [refsLoading, setRefsLoading] = useState(false);
  const [refsError, setRefsError] = useState("");

  const [accounts, setAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountsError, setAccountsError] = useState("");
  const [searchInput, setSearchInput] = useState(() => searchParams.get("q") || "");
  const [search, setSearch] = useState(() => searchParams.get("q") || "");
  const [roleFilter, setRoleFilter] = useState(() => searchParams.get("role") || "");
  const [departmentFilter, setDepartmentFilter] = useState(() => searchParams.get("department") || "");
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get("status") || "all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [roleOptions, setRoleOptions] = useState([]);
  const [accountSummary, setAccountSummary] = useState({ users: 0, active: 0, inactive: 0 });

  const [selectedUser, setSelectedUser] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [, setUserActivityRows] = useState([]);
  const [, setUserActivityLoading] = useState(false);
  const [, setUserActivityError] = useState("");

  const [managerAssignments, setManagerAssignments] = useState([]);
  const [managerLoading, setManagerLoading] = useState(false);
  const [managerError, setManagerError] = useState("");
  const [managerMessage, setManagerMessage] = useState("");
  const [managerStatusWarning, setManagerStatusWarning] = useState("");

  const [facilitatorAssignments, setFacilitatorAssignments] = useState([]);
  const [facilitatorLoading, setFacilitatorLoading] = useState(false);
  const [facilitatorError, setFacilitatorError] = useState("");
  const [facilitatorMessage, setFacilitatorMessage] = useState("");
  const [facilitatorStatusWarning, setFacilitatorStatusWarning] = useState("");

  const [staffBySport, setStaffBySport] = useState({});
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState("");
  const [staffMessage, setStaffMessage] = useState("");
  const [selectedStaffSportId, setSelectedStaffSportId] = useState("");
  const [staffSearch, setStaffSearch] = useState("");
  const [staffSportFilter, setStaffSportFilter] = useState("");
  const [staffRoleFilter, setStaffRoleFilter] = useState("");

  const [departmentsMessage, setDepartmentsMessage] = useState("");
  const [departmentForm, setDepartmentForm] = useState({ department_code: "", department_name: "" });
  const [departmentEditingId, setDepartmentEditingId] = useState(null);
  const [departmentEditForm, setDepartmentEditForm] = useState({ department_code: "", department_name: "" });
  const [departmentDeleteTarget, setDepartmentDeleteTarget] = useState(null);
  const [departmentBusy, setDepartmentBusy] = useState(false);
  const [departmentDetail, setDepartmentDetail] = useState({
    open: false,
    department: null,
    tab: "teams",
    teams: [],
    entries: [],
    players: [],
    teamPage: 1,
    entryPage: 1,
    playerPage: 1,
    loading: false,
    error: "",
    tournamentId: "",
    search: "",
  });
  const [departmentTournaments, setDepartmentTournaments] = useState([]);

  const [inviteStatus, setInviteStatus] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteSaving, setInviteSaving] = useState(false);
  const [inviteConfirmOpen, setInviteConfirmOpen] = useState(false);

  const [assignModal, setAssignModal] = useState({
    open: false,
    kind: "",
    mode: "assign",
    departmentId: null,
    sportId: null,
    existingAssignmentIds: [],
    email: "",
    busy: false,
    error: "",
  });

  const [staffAssignModalOpen, setStaffAssignModalOpen] = useState(false);
  const [staffAssignForm, setStaffAssignForm] = useState({
    sportId: "",
    assignedRole: "Official",
    userId: "",
    search: "",
    note: "",
  });
  const [staffAssignBusy, setStaffAssignBusy] = useState(false);
  const [staffCandidates, setStaffCandidates] = useState([]);
  const [staffCandidatesLoading, setStaffCandidatesLoading] = useState(false);
  const [staffCandidatesError, setStaffCandidatesError] = useState("");

  const [confirmModal, setConfirmModal] = useState({
    open: false,
    type: "",
    roleScope: "",
    assignmentIds: [],
    sportId: null,
    userId: null,
    busy: false,
  });
  const [accountStatusModal, setAccountStatusModal] = useState({
    open: false,
    userId: null,
    userName: "",
    nextIsActive: true,
    busy: false,
  });

  const departmentById = useMemo(
    () => Object.fromEntries(departments.map((department) => [Number(department.id), department.department_name])),
    [departments]
  );

  const sportById = useMemo(
    () => Object.fromEntries(sports.map((sport) => [Number(sport.id), getSportDisplayName(sport)])),
    [sports]
  );

  const selectedUserDetails = useMemo(() => {
    if (!selectedUser) return null;
    return accounts.find((item) => Number(item.id) === Number(selectedUser.id)) || selectedUser;
  }, [accounts, selectedUser]);

  const managerAssignmentsByDepartment = useMemo(() => {
    const map = {};
    for (const row of managerAssignments) {
      const key = Number(row.department_id || 0);
      if (!key) continue;
      if (!map[key]) map[key] = [];
      map[key].push(row);
    }
    return map;
  }, [managerAssignments]);

  const facilitatorAssignmentsBySport = useMemo(() => {
    const map = {};
    for (const row of facilitatorAssignments) {
      const sportId = Number(row.sport_id || 0);
      if (!sportId) continue;
      if (!map[sportId]) map[sportId] = [];
      map[sportId].push(row);
    }
    return map;
  }, [facilitatorAssignments]);

  const departmentManagerRows = useMemo(() => {
    return departments.map((department) => {
      const assignments = managerAssignmentsByDepartment[Number(department.id)] || [];
      const first = assignments[0] || null;
      const currentLabel = first ? `${first.name || "Unknown user"} (${first.email || "-"})` : "No manager assigned";
      const isAssigned = assignments.length > 0;
      return {
        department_id: Number(department.id),
        department_name: department.department_name,
        assignments,
        managerIsActive: typeof first?.is_active === "boolean" ? Boolean(first.is_active) : null,
        currentLabel,
        isAssigned,
      };
    });
  }, [departments, managerAssignmentsByDepartment]);

  const facilitatorScopeRows = useMemo(() => {
    return sports.map((sport) => {
      const sportId = Number(sport.id);
      const assignments = facilitatorAssignmentsBySport[sportId] || [];
      const activeAssignments = assignments.filter((item) => item?.is_active === true);
      const first = activeAssignments[0] || assignments[0] || null;
      const displayAssignments = assignments.slice(0, 2);
      const remainingCount = Math.max(0, assignments.length - displayAssignments.length);
      const labels = displayAssignments.map(
        (item) => `${item.name || "Unknown user"} (${item.email || "-"})`
      );
      if (remainingCount > 0) {
        labels.push(`+${remainingCount} more`);
      }
      let facilitatorIsActive = null;
      if (assignments.length > 0) {
        if (activeAssignments.length > 0) {
          facilitatorIsActive = true;
        } else {
          const hasBooleanStatus = assignments.every((item) => typeof item?.is_active === "boolean");
          facilitatorIsActive = hasBooleanStatus ? false : null;
        }
      }
      return {
        key: `sport-${sportId}`,
        sport_id: sportId,
        sport_name: sport.sport_name || sport.name || "Unassigned sport",
        assignments,
        assignmentCount: assignments.length,
        facilitatorIsActive,
        isAssigned: assignments.length > 0,
        currentLabel: labels.length > 0 ? labels.join(", ") : "No eligible facilitator",
        primaryDepartmentName:
          first && first.department_id
            ? departmentById[Number(first.department_id)] || "Unknown department"
            : "-",
      };
    });
  }, [departmentById, sports, facilitatorAssignmentsBySport]);

  const departmentsWithoutManagers = useMemo(
    () => departmentManagerRows.filter((row) => !row.isAssigned),
    [departmentManagerRows]
  );

  const sportsWithoutFacilitators = useMemo(
    () => facilitatorScopeRows.filter((row) => !row.isAssigned),
    [facilitatorScopeRows]
  );

  const managerCompletenessMessage = useMemo(() => {
    if (departmentManagerRows.length === 0) return "No departments found.";
    if (departmentsWithoutManagers.length === 0) return "All departments have assigned managers.";
    if (departmentsWithoutManagers.length === 1) {
      return `${departmentsWithoutManagers[0].department_name} still needs a manager.`;
    }
    return `${departmentsWithoutManagers.length} departments still need managers.`;
  }, [departmentManagerRows, departmentsWithoutManagers]);

  const facilitatorCompletenessMessage = useMemo(() => {
    if (sports.length === 0) return "No sports found.";
    if (sportsWithoutFacilitators.length === 0) return "All sports have eligible facilitator candidates.";
    if (sportsWithoutFacilitators.length === 1) {
      const row = sportsWithoutFacilitators[0];
      return `${getSportDisplayName(row)} has no eligible facilitator candidate.`;
    }
    return `${sportsWithoutFacilitators.length} sports have no eligible facilitator candidates.`;
  }, [sports, sportsWithoutFacilitators]);

  const staffCountsBySport = useMemo(() => {
    const summary = {};
    for (const sport of sports) {
      const sportId = Number(sport.id);
      const rows = staffBySport[sportId] || [];
      const roles = {};
      for (const row of rows) {
        const assignedRole = String(row.assigned_role || row.role || "Staff").trim() || "Staff";
        roles[assignedRole] = (roles[assignedRole] || 0) + 1;
      }
      summary[sportId] = {
        count: rows.length,
        roles,
      };
    }
    return summary;
  }, [sports, staffBySport]);

  const selectedStaffRows = useMemo(
    () => staffBySport[Number(selectedStaffSportId)] || [],
    [staffBySport, selectedStaffSportId]
  );
  const totalAssignedStaff = useMemo(
    () => Object.values(staffCountsBySport).reduce((totalSoFar, item) => totalSoFar + Number(item?.count || 0), 0),
    [staffCountsBySport]
  );
  const sportsCoveredCount = useMemo(
    () => Object.values(staffCountsBySport).filter((item) => Number(item?.count || 0) > 0).length,
    [staffCountsBySport]
  );
  const sportsWithoutStaffCount = Math.max(0, sports.length - sportsCoveredCount);
  const staffAssignmentRows = useMemo(() => Object.entries(staffBySport).flatMap(([sportId, rows]) =>
    (rows || []).map((row) => ({ ...row, sport_id: Number(sportId), sport_name: sportById[Number(sportId)] || "—" }))
  ).filter((row) => {
    const query = staffSearch.trim().toLowerCase();
    if (query && !`${row.name || ""} ${row.email || ""}`.toLowerCase().includes(query)) return false;
    if (staffSportFilter && Number(row.sport_id) !== Number(staffSportFilter)) return false;
    if (staffRoleFilter && String(row.assigned_role || row.role || "") !== staffRoleFilter) return false;
    return true;
  }), [sportById, staffBySport, staffRoleFilter, staffSearch, staffSportFilter]);

  const selectedStaffRole = String(staffAssignForm.assignedRole || "").trim().toLowerCase();
  useEffect(() => {
    if (managementPage === "departments") {
      setActiveTab("departments");
      return;
    }
    const section = String(searchParams.get("section") || "accounts").toLowerCase();
    const requested = section === "staff" ? "staff_officials" : section === "role-coverage" ? "role_coverage" : "all_accounts";
    setActiveTab((previous) => (previous === requested ? previous : requested));
    setCoverageType(searchParams.get("type") === "facilitator" ? "facilitator" : "manager");
  }, [managementPage, searchParams]);

  useEffect(() => {
    if (managementPage === "departments") return;
    const expectedSection = activeTab === "staff_officials" ? "staff" : activeTab === "role_coverage" ? "role-coverage" : "accounts";
    if (searchParams.get("section") === expectedSection && (activeTab !== "role_coverage" || searchParams.get("type") === coverageType)) return;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("tab");
    nextParams.set("section", expectedSection);
    if (activeTab === "role_coverage") nextParams.set("type", coverageType);
    else nextParams.delete("type");
    setSearchParams(nextParams, { replace: true });
  }, [activeTab, coverageType, managementPage, searchParams, setSearchParams]);

  const loadRefs = useCallback(async () => {
    setRefsLoading(true);
    setRefsError("");
    try {
      const [departmentPayload, sportPayload] = await Promise.all([getDepartments(), getSports()]);
      const departmentRows = Array.isArray(departmentPayload) ? departmentPayload : [];
      const sportRows = Array.isArray(sportPayload) ? sportPayload : [];
      setDepartments(departmentRows);
      setSports(sportRows);
      setSelectedStaffSportId((previous) => {
        if (previous && sportRows.some((sport) => Number(sport.id) === Number(previous))) return previous;
        if (sportRows[0]?.id) return String(sportRows[0].id);
        return "";
      });
    } catch (error) {
      setDepartments([]);
      setSports([]);
      setRefsError(getErrorMessage(error, "Unable to load departments and sports."));
    } finally {
      setRefsLoading(false);
    }
  }, []);

  const loadAccounts = useCallback(async () => {
    setAccountsLoading(true);
    setAccountsError("");
    try {
      const params = { page, limit };
      if (search.trim()) params.search = search.trim();
      if (roleFilter) params.role_id = Number(roleFilter);
      if (departmentFilter) params.department_id = Number(departmentFilter);
      if (statusFilter === "active") params.is_active = true;
      if (statusFilter === "inactive") params.is_active = false;
      const payload = await getAdminUsers(params);
      setAccounts(Array.isArray(payload?.items) ? payload.items : []);
      setRoleOptions(Array.isArray(payload?.filters?.roles) ? payload.filters.roles : []);
      setTotal(Number(payload?.pagination?.total || 0));
      setTotalPages(Math.max(1, Number(payload?.pagination?.total_pages || 1)));
    } catch (error) {
      setAccounts([]);
      setAccountsError(getErrorMessage(error, "Unable to load user account details. Please check filters and try again."));
    } finally {
      setAccountsLoading(false);
    }
  }, [departmentFilter, limit, page, roleFilter, search, statusFilter]);

  const loadAccountSummary = useCallback(async () => {
    try {
      const [all, active, inactive] = await Promise.all([
        getAdminUsers({ page: 1, limit: 1 }),
        getAdminUsers({ page: 1, limit: 1, is_active: true }),
        getAdminUsers({ page: 1, limit: 1, is_active: false }),
      ]);
      setAccountSummary({
        users: Number(all?.pagination?.total || 0),
        active: Number(active?.pagination?.total || 0),
        inactive: Number(inactive?.pagination?.total || 0),
      });
    } catch { /* Main account request owns visible error handling. */ }
  }, []);

  const refreshSelectedUserDetails = useCallback(async () => {
    if (!selectedUser?.email) return;
    try {
      const payload = await getAdminUsers({
        search: String(selectedUser.email),
        page: 1,
        limit: 25,
      });
      const rows = Array.isArray(payload?.items) ? payload.items : [];
      const matched =
        rows.find((item) => Number(item.id) === Number(selectedUser.id))
        || rows.find((item) => String(item.email || "").toLowerCase() === String(selectedUser.email || "").toLowerCase());
      if (!matched) return;
      setSelectedUser(matched);
      setAccounts((previous) => {
        const exists = previous.some((item) => Number(item.id) === Number(matched.id));
        if (!exists) return previous;
        return previous.map((item) => (Number(item.id) === Number(matched.id) ? matched : item));
      });
    } catch {
      // Keep drawer resilient even if refresh request fails.
    }
  }, [selectedUser]);

  const loadUserActivity = useCallback(async (userId) => {
    if (!userId) {
      setUserActivityRows([]);
      return;
    }
    setUserActivityLoading(true);
    setUserActivityError("");
    try {
      const payload = await getUserManagementAuditLogs({
        target_user_id: Number(userId),
        page: 1,
        limit: 12,
      });
      setUserActivityRows(Array.isArray(payload?.items) ? payload.items : []);
    } catch (error) {
      setUserActivityRows([]);
      setUserActivityError(getErrorMessage(error, "Unable to load user activity."));
    } finally {
      setUserActivityLoading(false);
    }
  }, []);

  const loadManagers = useCallback(async () => {
    setManagerLoading(true);
    setManagerError("");
    setManagerStatusWarning("");
    try {
      const assignmentRows = await getRoleAssignments({ role_id: ROLE_DEPARTMENT_MANAGER });
      const rows = Array.isArray(assignmentRows) ? assignmentRows : [];
      setManagerAssignments(rows);
      const missingStatus = rows.some((row) => typeof row?.is_active !== "boolean");
      if (missingStatus && rows.length > 0) {
        setManagerStatusWarning("Some account status details could not be loaded.");
      }
    } catch (error) {
      setManagerAssignments([]);
      setManagerStatusWarning("");
      setManagerError(getErrorMessage(error, "Unable to load department manager assignments."));
    } finally {
      setManagerLoading(false);
    }
  }, []);

  const loadFacilitators = useCallback(async () => {
    setFacilitatorLoading(true);
    setFacilitatorError("");
    setFacilitatorStatusWarning("");
    try {
      const assignmentRows = await getRoleAssignments({ role_id: ROLE_SPORT_FACILITATOR });
      const rows = Array.isArray(assignmentRows) ? assignmentRows : [];
      setFacilitatorAssignments(rows);
      const missingStatus = rows.some((row) => typeof row?.is_active !== "boolean");
      if (missingStatus && rows.length > 0) {
        setFacilitatorStatusWarning("Some account status details could not be loaded.");
      }
    } catch (error) {
      setFacilitatorAssignments([]);
      setFacilitatorStatusWarning("");
      setFacilitatorError(getErrorMessage(error, "Unable to load sports facilitator assignments."));
    } finally {
      setFacilitatorLoading(false);
    }
  }, []);

  const loadStaffAssignments = useCallback(async () => {
    if (sports.length === 0) {
      setStaffBySport({});
      return;
    }
    setStaffLoading(true);
    setStaffError("");
    try {
      const results = await Promise.all(
        sports.map(async (sport) => {
          const payload = await getSportStaff(Number(sport.id));
          return {
            sportId: Number(sport.id),
            rows: Array.isArray(payload?.items) ? payload.items : [],
          };
        })
      );
      const next = {};
      for (const result of results) {
        next[result.sportId] = result.rows;
      }
      setStaffBySport(next);
    } catch (error) {
      setStaffBySport({});
      setStaffError(getErrorMessage(error, "Unable to load staff assignments."));
    } finally {
      setStaffLoading(false);
    }
  }, [sports]);

  const loadInviteStatus = useCallback(async () => {
    setInviteLoading(true);
    setInviteMessage("");
    try {
      const payload = await getInviteCodeStatus();
      setInviteStatus(payload || null);
    } catch (error) {
      setInviteStatus(null);
      setInviteMessage(getErrorMessage(error, "Unable to load invite code status."));
    } finally {
      setInviteLoading(false);
    }
  }, []);

  const loadDepartmentsAndManagers = useCallback(async () => {
    await Promise.all([loadRefs(), loadManagers()]);
  }, [loadManagers, loadRefs]);

  useEffect(() => {
    void loadRefs();
  }, [loadRefs]);

  useEffect(() => {
    if (activeTab !== "all_accounts") return;
    void loadAccounts();
    void loadAccountSummary();
  }, [activeTab, loadAccountSummary, loadAccounts]);

  useEffect(() => {
    if (activeTab !== "departments" && !(activeTab === "role_coverage" && coverageType === "manager")) return;
    void loadManagers();
  }, [activeTab, coverageType, loadManagers]);

  useEffect(() => {
    if (activeTab !== "role_coverage" || coverageType !== "facilitator") return;
    void loadFacilitators();
  }, [activeTab, coverageType, loadFacilitators]);

  useEffect(() => {
    if (activeTab !== "staff_officials") return;
    void loadStaffAssignments();
  }, [activeTab, loadStaffAssignments]);

  useEffect(() => {
    if (activeTab !== "all_accounts") return;
    void loadInviteStatus();
  }, [activeTab, loadInviteStatus]);

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, departmentFilter, statusFilter]);

  useEffect(() => {
    if (managementPage !== "users" || activeTab !== "all_accounts") return;
    const next = new URLSearchParams(searchParams);
    const values = { q: search, role: roleFilter, department: departmentFilter, status: statusFilter === "all" ? "" : statusFilter };
    let changed = false;
    Object.entries(values).forEach(([key, value]) => {
      if (value && next.get(key) !== String(value)) { next.set(key, String(value)); changed = true; }
      if (!value && next.has(key)) { next.delete(key); changed = true; }
    });
    if (changed) setSearchParams(next, { replace: true });
  }, [activeTab, departmentFilter, managementPage, roleFilter, search, searchParams, setSearchParams, statusFilter]);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      if (!staffAssignModalOpen || !staffAssignForm.sportId) return;
      setStaffCandidatesLoading(true);
      setStaffCandidatesError("");
      try {
        const payload = await searchSportStaffCandidates(staffAssignForm.sportId, {
          q: staffAssignForm.search,
          assignedRole: staffAssignForm.assignedRole,
          limit: 20,
        });
        setStaffCandidates(Array.isArray(payload?.items) ? payload.items : []);
      } catch (error) {
        setStaffCandidates([]);
        setStaffCandidatesError(getErrorMessage(error, "Unable to search users for staff assignment."));
      } finally {
        setStaffCandidatesLoading(false);
      }
    }, 220);
    return () => window.clearTimeout(timer);
  }, [staffAssignForm.assignedRole, staffAssignForm.search, staffAssignForm.sportId, staffAssignModalOpen]);

  useEffect(() => {
    if (!drawerOpen || !selectedUserDetails?.id) return;
    void loadUserActivity(selectedUserDetails.id);
  }, [drawerOpen, loadUserActivity, selectedUserDetails]);

  const openAssignManagerModal = (departmentId, mode, existingAssignmentIds = []) => {
    setAssignModal({
      open: true,
      kind: "manager",
      mode,
      departmentId: Number(departmentId),
      sportId: null,
      existingAssignmentIds,
      email: "",
      busy: false,
      error: "",
    });
  };

  const openAssignFacilitatorModal = (sportId, mode, existingAssignmentIds = []) => {
    setAssignModal({
      open: true,
      kind: "facilitator",
      mode,
      departmentId: null,
      sportId: Number(sportId),
      existingAssignmentIds,
      email: "",
      busy: false,
      error: "",
    });
  };

  const closeAssignModal = (force = false) => {
    if (assignModal.busy && !force) return;
    setAssignModal({
      open: false,
      kind: "",
      mode: "assign",
      departmentId: null,
      sportId: null,
      existingAssignmentIds: [],
      email: "",
      busy: false,
      error: "",
    });
  };

  const submitAssignModal = async () => {
    const email = String(assignModal.email || "").trim();
    if (!email) {
      setAssignModal((previous) => ({ ...previous, error: "Email is required." }));
      return;
    }
    setAssignModal((previous) => ({ ...previous, busy: true, error: "" }));
    try {
      if (assignModal.mode === "replace" && assignModal.existingAssignmentIds.length > 0) {
        for (const assignmentId of assignModal.existingAssignmentIds) {
          await deleteRoleAssignment(Number(assignmentId));
        }
      }
      if (assignModal.kind === "manager") {
        await createRoleAssignment({
          email,
          role_id: ROLE_DEPARTMENT_MANAGER,
          department_id: assignModal.departmentId,
        });
        setManagerMessage(
          assignModal.mode === "replace"
            ? "Department manager assignment replaced."
            : "Department manager assignment created."
        );
        await loadManagers();
        await refreshSelectedUserDetails();
      } else if (assignModal.kind === "facilitator") {
        const payload = {
          email,
          sport_id: assignModal.sportId,
        };
        if (assignModal.departmentId) payload.department_id = assignModal.departmentId;
        const result = await assignSportFacilitator(payload);
        setFacilitatorMessage(
          result?.message || (assignModal.mode === "replace"
            ? "Sports Facilitator eligibility replaced."
            : "Sports Facilitator eligibility saved.")
        );
        await loadFacilitators();
        await refreshSelectedUserDetails();
      }
      closeAssignModal(true);
    } catch (error) {
      setAssignModal((previous) => ({
        ...previous,
        busy: false,
        error: getErrorMessage(error, "Unable to save assignment."),
      }));
    }
  };

  const openRoleRemoveConfirm = (assignmentIds, roleScope) => {
    setConfirmModal({
      open: true,
      type: "role",
      roleScope: roleScope || "",
      assignmentIds: assignmentIds.map((item) => Number(item)),
      sportId: null,
      userId: null,
      busy: false,
    });
  };

  const openStaffRemoveConfirm = (sportId, userId) => {
    setConfirmModal({
      open: true,
      type: "staff",
      assignmentIds: [],
      sportId: Number(sportId),
      userId: Number(userId),
      busy: false,
    });
  };

  const closeConfirmModal = (force = false) => {
    if (confirmModal.busy && !force) return;
    setConfirmModal({
      open: false,
      type: "",
      roleScope: "",
      assignmentIds: [],
      sportId: null,
      userId: null,
      busy: false,
    });
  };

  const submitConfirmModal = async () => {
    setConfirmModal((previous) => ({ ...previous, busy: true }));
    try {
      if (confirmModal.type === "role") {
        for (const assignmentId of confirmModal.assignmentIds) {
          await deleteRoleAssignment(Number(assignmentId));
        }
        if (confirmModal.roleScope === "manager") {
          await loadManagers();
        } else if (confirmModal.roleScope === "facilitator") {
          await loadFacilitators();
        } else {
          await Promise.all([loadManagers(), loadFacilitators()]);
        }
        await refreshSelectedUserDetails();
      } else if (confirmModal.type === "staff") {
        await removeSportStaff(confirmModal.sportId, confirmModal.userId);
        await loadStaffAssignments();
        await refreshSelectedUserDetails();
      }
      closeConfirmModal(true);
    } catch (error) {
      if (confirmModal.type === "role") {
        setManagerError(getErrorMessage(error, "Unable to remove role assignment."));
        setFacilitatorError(getErrorMessage(error, "Unable to remove role assignment."));
      } else {
        setStaffError(getErrorMessage(error, "Unable to remove staff assignment."));
      }
      setConfirmModal((previous) => ({ ...previous, busy: false }));
    }
  };

  const openStaffAssignModal = () => {
    setStaffAssignForm({
      sportId: selectedStaffSportId || (sports[0] ? String(sports[0].id) : ""),
      assignedRole: "Official",
      userId: "",
      search: "",
      note: "",
    });
    setStaffCandidates([]);
    setStaffCandidatesError("");
    setStaffAssignModalOpen(true);
  };

  const openAccountStatusModal = (row, nextIsActive) => {
    setAccountStatusModal({
      open: true,
      userId: Number(row.id),
      userName: row.name || row.email || "Unknown user",
      nextIsActive: Boolean(nextIsActive),
      busy: false,
    });
  };

  const closeAccountStatusModal = (force = false) => {
    if (accountStatusModal.busy && !force) return;
    setAccountStatusModal({
      open: false,
      userId: null,
      userName: "",
      nextIsActive: true,
      busy: false,
    });
  };

  const submitAccountStatusModal = async () => {
    if (!accountStatusModal.userId) return;
    setAccountStatusModal((previous) => ({ ...previous, busy: true }));
    try {
      await updateAdminUserStatus(accountStatusModal.userId, {
        is_active: accountStatusModal.nextIsActive,
      });
      await loadAccounts();
      const refreshTasks = [];
      if (
        activeTab === "department_managers"
        || activeTab === "departments"
        || managerAssignments.length > 0
      ) {
        refreshTasks.push(loadManagers());
      }
      if (activeTab === "sports_facilitators" || facilitatorAssignments.length > 0) {
        refreshTasks.push(loadFacilitators());
      }
      if (activeTab === "staff_officials" || Object.keys(staffBySport).length > 0) {
        refreshTasks.push(loadStaffAssignments());
      }
      if (refreshTasks.length > 0) {
        await Promise.all(refreshTasks);
      }
      await refreshSelectedUserDetails();
      closeAccountStatusModal(true);
    } catch (error) {
      setAccountsError(
        getErrorMessage(
          error,
          accountStatusModal.nextIsActive
            ? "Unable to reactivate account."
            : "Unable to deactivate account."
        )
      );
      setAccountStatusModal((previous) => ({ ...previous, busy: false }));
    }
  };

  const closeStaffAssignModal = () => {
    if (staffAssignBusy) return;
    setStaffAssignModalOpen(false);
  };

  const submitStaffAssignModal = async () => {
    if (!staffAssignForm.sportId || !staffAssignForm.userId || !staffAssignForm.assignedRole) {
      setStaffCandidatesError("Select sport, staff role, and account.");
      return;
    }
    const selectedCandidate = staffCandidates.find(
      (candidate) => Number(candidate.user_id) === Number(staffAssignForm.userId)
    );
    if (selectedCandidate?.already_assigned_for_selected_role) {
      setStaffCandidatesError("This account is already assigned for the selected staff role.");
      return;
    }
    setStaffAssignBusy(true);
    setStaffCandidatesError("");
    try {
      await addSportStaff(Number(staffAssignForm.sportId), Number(staffAssignForm.userId), {
        assigned_role: String(staffAssignForm.assignedRole || "").trim(),
        note: String(staffAssignForm.note || "").trim() || null,
      });
      setStaffMessage("Staff assignment created.");
      setSelectedStaffSportId(String(staffAssignForm.sportId));
      setStaffAssignModalOpen(false);
      await loadStaffAssignments();
      await refreshSelectedUserDetails();
    } catch (error) {
      setStaffCandidatesError(getErrorMessage(error, "Unable to assign staff."));
    } finally {
      setStaffAssignBusy(false);
    }
  };

  const handleDepartmentCreate = async () => {
    if (!String(departmentForm.department_code || "").trim() || !String(departmentForm.department_name || "").trim()) {
      setDepartmentsMessage("Department code and department name are required.");
      return;
    }
    setDepartmentBusy(true);
    setDepartmentsMessage("");
    try {
      await createDepartment({
        department_code: String(departmentForm.department_code || "").trim(),
        department_name: String(departmentForm.department_name || "").trim(),
      });
      setDepartmentForm({ department_code: "", department_name: "" });
      setDepartmentsMessage("Department created.");
      await loadRefs();
    } catch (error) {
      setDepartmentsMessage(getErrorMessage(error, "Unable to create department."));
    } finally {
      setDepartmentBusy(false);
    }
  };

  const closeDepartmentDetail = useCallback(() => {
    setDepartmentDetail((previous) => ({ ...previous, open: false }));
  }, []);

  useEffect(() => {
    let active = true;
    const loadDepartmentTournaments = async () => {
      try {
        const payload = await getTournaments(selectedIntramural?.id ? { workspaceId: selectedIntramural.id } : {});
        if (active) setDepartmentTournaments(Array.isArray(payload) ? payload : []);
      } catch {
        if (active) setDepartmentTournaments([]);
      }
    };
    void loadDepartmentTournaments();
    return () => { active = false; };
  }, [selectedIntramural?.id]);

  const loadDepartmentTeams = async (department, tournamentId) => {
    const departmentId = Number(department?.id || 0);
    if (!departmentId) return;
    const scopedTournamentId = Number(tournamentId || 0) || null;
    setDepartmentDetail((previous) => ({ ...previous, department, tournamentId: scopedTournamentId ? String(scopedTournamentId) : "", teamPage: 1, entryPage: 1, playerPage: 1, loading: true, error: "" }));
    try {
      const loadScopedEntries = async () => {
        if (scopedTournamentId) {
          return listEntries({ departmentId, tournamentId: scopedTournamentId });
        }
        const results = await Promise.allSettled(
          departmentTournaments.map((tournament) => listEntries({
            departmentId,
            tournamentId: Number(tournament.id),
          }))
        );
        return results.flatMap((result) => result.status === "fulfilled" && Array.isArray(result.value) ? result.value : []);
      };
      const [teamRows, entryRows] = await Promise.all([
        getTeams(departmentId, scopedTournamentId),
        loadScopedEntries(),
      ]);
      const teams = Array.isArray(teamRows) ? teamRows : teamRows?.items || teamRows?.data || [];
      const entryById = new Map(
        (Array.isArray(entryRows) ? entryRows : [])
          .filter((entry) => ["SOLO", "DUO"].includes(String(entry?.participant_shape || "").toUpperCase()))
          .map((entry) => [Number(entry.id), entry])
      );
      const entries = [...entryById.values()];
      const rosterResults = await Promise.allSettled(teams.map(async (team) => {
        const rows = scopedTournamentId
          ? await getTeamRoster(Number(team.id), scopedTournamentId)
          : await getTeamPlayers(Number(team.id));
        const players = Array.isArray(rows) ? rows : rows?.items || rows?.players || rows?.data || [];
        return players.map((player) => ({ ...player, team_id: Number(team.id), team_name: team.team_name || team.name || "Unnamed team" }));
      }));
      const teamPlayers = rosterResults.flatMap((result) => result.status === "fulfilled" ? result.value : []);
      const entryPlayers = entries.flatMap((entry) => (entry.members || []).map((member) => ({
        ...member,
        entry_id: entry.id,
        entry_name: entry.entry_name,
        participant_shape: entry.participant_shape,
        sport_id: entry.sport_id,
        sport_name: sportById[Number(entry.sport_id)] || "—",
        team_name: entry.entry_name,
      })));
      const players = [...teamPlayers, ...entryPlayers];
      const failedRosters = rosterResults.filter((result) => result.status === "rejected").length;
      setDepartmentDetail((previous) => ({ ...previous, teams, entries, players, loading: false, error: failedRosters ? `${failedRosters} team roster${failedRosters === 1 ? "" : "s"} could not be loaded.` : "" }));
    } catch (error) {
      setDepartmentDetail((previous) => ({ ...previous, teams: [], entries: [], players: [], loading: false, error: getErrorMessage(error, "Department teams, entries, and players could not be loaded.") }));
    }
  };

  const openDepartmentDetail = async (department) => {
    const departmentId = Number(department?.id || 0);
    if (!departmentId) return;
    const selectedIsAvailable = departmentTournaments.some((row) => String(row.id) === String(selectedTournamentId || ""));
    const defaultTournament = selectedIsAvailable || (selectedTournamentId && departmentTournaments.length === 0)
      ? String(selectedTournamentId)
      : String(departmentTournaments.find((row) => row?.is_started && !row?.is_archived)?.id || departmentTournaments[0]?.id || "");
    setDepartmentDetail({ open: true, department, tab: "teams", teams: [], entries: [], players: [], teamPage: 1, entryPage: 1, playerPage: 1, loading: true, error: "", tournamentId: defaultTournament, search: "" });
    await loadDepartmentTeams(department, defaultTournament);
  };

  const startDepartmentEdit = (department) => {
    setDepartmentEditingId(Number(department.id));
    setDepartmentEditForm({
      department_code: department.department_code || "",
      department_name: department.department_name || "",
    });
  };

  const cancelDepartmentEdit = () => {
    setDepartmentEditingId(null);
    setDepartmentEditForm({ department_code: "", department_name: "" });
  };

  const saveDepartmentEdit = async () => {
    if (!departmentEditingId) return;
    if (!String(departmentEditForm.department_code || "").trim() || !String(departmentEditForm.department_name || "").trim()) {
      setDepartmentsMessage("Department code and department name are required.");
      return;
    }
    setDepartmentBusy(true);
    setDepartmentsMessage("");
    try {
      await updateDepartment(departmentEditingId, {
        department_code: String(departmentEditForm.department_code || "").trim(),
        department_name: String(departmentEditForm.department_name || "").trim(),
      });
      cancelDepartmentEdit();
      setDepartmentsMessage("Department updated.");
      await loadRefs();
    } catch (error) {
      setDepartmentsMessage(getErrorMessage(error, "Unable to update department."));
    } finally {
      setDepartmentBusy(false);
    }
  };

  const openDepartmentDeleteConfirm = (department) => {
    setDepartmentDeleteTarget(department || null);
  };

  const closeDepartmentDeleteConfirm = () => {
    if (departmentBusy) return;
    setDepartmentDeleteTarget(null);
  };

  const submitDepartmentDelete = async () => {
    if (!departmentDeleteTarget?.id) return;
    setDepartmentBusy(true);
    setDepartmentsMessage("");
    try {
      await deleteDepartment(Number(departmentDeleteTarget.id));
      setDepartmentsMessage("Department removed.");
      setDepartmentDeleteTarget(null);
      await loadDepartmentsAndManagers();
    } catch (error) {
      setDepartmentsMessage(getErrorMessage(error, "Unable to remove department."));
    } finally {
      setDepartmentBusy(false);
    }
  };

  const openInviteRotateConfirm = () => {
    if (!String(inviteCodeInput || "").trim()) {
      setInviteMessage("Invite code is required.");
      return;
    }
    setInviteConfirmOpen(true);
  };

  const closeInviteRotateConfirm = () => {
    if (inviteSaving) return;
    setInviteConfirmOpen(false);
  };

  const submitInviteRotate = async () => {
    const code = String(inviteCodeInput || "").trim();
    if (code.length < 8) {
      setInviteMessage("Invite code must be at least 8 characters.");
      return;
    }
    setInviteSaving(true);
    setInviteMessage("");
    try {
      await updateInviteCode({ code });
      setInviteCodeInput("");
      setInviteMessage("Invite code updated.");
      setInviteConfirmOpen(false);
      await loadInviteStatus();
    } catch (error) {
      setInviteMessage(getErrorMessage(error, "Unable to rotate invite code."));
    } finally {
      setInviteSaving(false);
    }
  };

  const managerStatusUnavailable = !managerLoading && departments.length > 0 && departmentManagerRows.length === 0 && !!managerError;
  const facilitatorStatusUnavailable = !facilitatorLoading && sports.length > 0 && facilitatorScopeRows.length === 0 && !!facilitatorError;
  const departmentsMessageTone = inferMessageTone(departmentsMessage);
  const departmentDetailPageSize = 10;
  const departmentDetailAllRows = useMemo(() => {
    const rows = departmentDetail.tab === "teams" ? departmentDetail.teams : departmentDetail.tab === "entries" ? departmentDetail.entries : departmentDetail.players;
    const query = String(departmentDetail.search || "").trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => [row.team_name, row.entry_name, row.participant_shape, row.name, row.sport_name, row.coach_name, row.full_name, row.player_name, row.first_name, row.last_name, row.position, row.playing_position]
      .some((value) => String(value || "").toLowerCase().includes(query)));
  }, [departmentDetail.entries, departmentDetail.players, departmentDetail.search, departmentDetail.tab, departmentDetail.teams]);
  const departmentDetailPageKey = departmentDetail.tab === "teams" ? "teamPage" : departmentDetail.tab === "entries" ? "entryPage" : "playerPage";
  const departmentDetailPage = Number(departmentDetail[departmentDetailPageKey] || 1);
  const departmentDetailTotalPages = Math.max(1, Math.ceil(departmentDetailAllRows.length / departmentDetailPageSize));
  const departmentDetailVisibleRows = departmentDetailAllRows.slice(
    (departmentDetailPage - 1) * departmentDetailPageSize,
    departmentDetailPage * departmentDetailPageSize
  );

  const openUserProfile = (row) => {
    const resolvedId = Number(row?.id || row?.user_id || 0);
    if (!resolvedId) return;
    openProfile({
      userId: resolvedId,
      tournamentId: selectedTournamentId ? Number(selectedTournamentId) : null,
    });
  };
  const closeUserProfile = useCallback(() => {}, []);

  const accountsColumns = [
    {
      header: "User",
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-blue-50 text-xs font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">{String(row.name || "?").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span>
          <button type="button" onClick={() => openUserProfile(row)} className={`text-left font-semibold hover:underline ${row.is_active ? "text-blue-700 dark:text-blue-300" : "text-slate-500 dark:text-slate-400"}`}>
            {row.name || "Unknown user"}
          </button>
        </div>
      ),
    },
    { header: "Department", priority: 2, render: (row) => row?.department?.name || "—" },
    { header: "Roles", priority: 2, render: (row) => <span className="inline-flex rounded-full border border-slate-200 px-2 py-0.5 text-xs dark:border-slate-700">{roleLabel(row?.base_role?.role_name)}</span> },
    {
      header: "Assignments",
      priority: 3,
      render: (row) => {
        const labels = buildUserAssignmentLabels(row);
        if (!labels.length) return "—";
        return <ul className="grid gap-1 text-sm">{labels.map((label) => <li key={label} className="break-words text-slate-700 dark:text-slate-300">{label}</li>)}</ul>;
      },
    },
    {
      header: "Status",
      render: (row) => (
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(row.is_active)}`}>
          {accountStatusText(Boolean(row.is_active))}
        </span>
      ),
    },
    {
      header: "Actions",
      render: (row) => (
        <details className="relative"><summary className="cursor-pointer list-none rounded-lg border border-slate-200 px-3 py-1.5 font-bold dark:border-slate-700" aria-label={`Actions for ${row.name || "user"}`}>•••</summary><div className="absolute right-0 z-20 mt-1 grid min-w-40 rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"><button type="button" onClick={() => openUserProfile(row)} className="rounded-md px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800">View Profile</button><button type="button" onClick={() => openAccountStatusModal(row, !row.is_active)} disabled={row.is_active && Number(row.id) === currentUserId} className="rounded-md px-3 py-2 text-left text-sm hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800">{row.is_active ? "Deactivate" : "Activate"}</button></div></details>
      ),
    },
  ];

  const allAccountsFilterSummary = useMemo(() => {
    const parts = [];
    if (search.trim()) parts.push(`Search: "${search.trim()}"`);
    if (roleFilter) {
      const role = roleOptions.find((row) => String(row.id) === String(roleFilter));
      parts.push(role ? roleLabel(role.name) : "Selected role");
    }
    if (departmentFilter) {
      const department = departments.find((row) => String(row.id) === String(departmentFilter));
      parts.push(department?.department_name || "Selected department");
    }
    if (statusFilter !== "all") {
      const status = STATUS_OPTIONS.find((row) => row.value === statusFilter);
      parts.push(status?.label || "Selected status");
    }
    return parts;
  }, [departmentFilter, departments, roleFilter, roleOptions, search, statusFilter]);

  const activeAccountsFilterCount = allAccountsFilterSummary.length;

  const clearAllAccountsFilters = () => {
    setSearch("");
    setSearchInput("");
    setRoleFilter("");
    setDepartmentFilter("");
    setStatusFilter("all");
    setPage(1);
  };

  return (
    <div className="os-themed-page space-y-6">
      <PageHeaderCard
        icon={managementPage === "departments" ? Building2 : UserCog}
        title={managementPage === "departments" ? "Departments" : "Users"}
        subtitle={managementPage === "departments" ? "Manage organizational units and assigned managers" : "Manage accounts, roles, and assignments"}
        breadcrumbs={`Coordinator / Management / ${managementPage === "departments" ? "Departments" : "Users"}`}
      />
      <div className={`grid gap-3 ${managementPage === "departments" ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
        {managementPage === "departments" ? <><MetricCard title="Departments" value={departments.length} icon={Building2} color="blue" /><MetricCard title="Missing Managers" value={departmentsWithoutManagers.length} icon={UserCog} color="orange" /></> : <><MetricCard title="Users" value={accountSummary.users} icon={UserCog} color="blue" /><MetricCard title="Active" value={accountSummary.active} icon={UserCog} color="green" /><MetricCard title="Inactive" value={accountSummary.inactive} icon={UserCog} color="slate" /></>}
      </div>
      {managementPage === "users" ? <SectionTabs tabs={USER_SECTIONS} activeTab={activeTab} onChange={setActiveTab} /> : null}

      {refsLoading ? <LoadingState message="Loading user management references..." /> : null}
      <InlineAlert
        message={refsError}
        tone="error"
        actionLabel="Retry"
        onAction={() => void loadRefs()}
        actionClassName={BTN_GHOST}
      />

      {activeTab === "all_accounts" ? (
        <DashboardCard className="space-y-4">
          <CollapsibleFilterPanel
            title="Account Filters"
            activeCount={activeAccountsFilterCount}
            // summaryText={
            //   activeAccountsFilterCount > 0
            //     ? `Filtered by: ${allAccountsFilterSummary.join(" · ")}`
            //     : "No active filters"
            // }
            onClear={clearAllAccountsFilters}
          >
            <div className="grid gap-3 md:grid-cols-5">
              <div className="md:col-span-2 flex gap-2">
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  className={INPUT_CLS}
                  placeholder="Search name or email"
                />
                <button type="button" onClick={() => setSearch(searchInput)} className={BTN_PRIMARY}>
                  Apply
                </button>
              </div>
              <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className={INPUT_CLS}>
                <option value="">All roles</option>
                {roleOptions.map((role) => (
                  <option key={role.id} value={role.id}>
                    {roleLabel(role.name)}
                  </option>
                ))}
              </select>
              <select
                value={departmentFilter}
                onChange={(event) => setDepartmentFilter(event.target.value)}
                className={INPUT_CLS}
              >
                <option value="">All departments</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.department_name}
                  </option>
                ))}
              </select>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={INPUT_CLS}>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </CollapsibleFilterPanel>

          <InlineAlert
            message={accountsError}
            tone="error"
            actionLabel="Retry"
            onAction={() => void loadAccounts()}
            actionClassName={BTN_GHOST}
          />

          {accountsLoading ? (
            <LoadingState message="Loading accounts..." />
          ) : accounts.length === 0 ? (
            <EmptyState title="No accounts found" message="Try a different search or filter." icon={FolderOpen} />
          ) : (
            <DataTable columns={accountsColumns} data={accounts} keyExtractor={(row) => row.id} />
          )}

          <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
            <span>
              Showing {accounts.length} of {total}
            </span>
            <div className="flex items-center gap-2">
              <select value={limit} onChange={(event) => setLimit(Number(event.target.value))} className={INPUT_CLS}>
                {[10, 25, 50, 100].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} className={BTN_GHOST}>
                Prev
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((current) => (current < totalPages ? current + 1 : current))}
                className={BTN_GHOST}
              >
                Next
              </button>
            </div>
          </div>
        </DashboardCard>
      ) : null}

      {activeTab === "all_accounts" ? (
        <DashboardCard className="flex flex-wrap items-center justify-between gap-4">
          <div><h2 className="font-semibold text-slate-900 dark:text-slate-100">Registration Access</h2><p className="text-sm text-slate-500 dark:text-slate-400">Global invite code · Applies to all departments</p>{inviteMessage ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{inviteMessage}</p> : null}</div>
          <div className="flex flex-wrap items-center gap-2"><span className="rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm dark:border-slate-700">{inviteCodeInput || (inviteLoading ? "Loading…" : inviteStatusLabel(inviteStatus))}</span>{inviteCodeInput ? <button type="button" className={BTN_GHOST} onClick={() => void navigator.clipboard?.writeText(inviteCodeInput)}>Copy</button> : null}<button type="button" className={BTN_GHOST} onClick={() => setInviteCodeInput(generateInviteCode())}>Generate</button><button type="button" className={BTN_PRIMARY} onClick={openInviteRotateConfirm} disabled={!inviteCodeInput || inviteSaving}>Rotate</button></div>
        </DashboardCard>
      ) : null}

      {activeTab === "role_coverage" && coverageType === "manager" ? (
        <DashboardCard className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Role Coverage</h2><p className="text-sm text-slate-500 dark:text-slate-400">Review assignment coverage by role.</p></div><select aria-label="Coverage role" value={coverageType} onChange={(event) => setCoverageType(event.target.value)} className={INPUT_CLS}><option value="manager">Department Managers</option><option value="facilitator">Sports Facilitators</option></select></div>

          <InlineAlert
            message={managerError}
            tone="error"
            actionLabel="Retry"
            onAction={() => void loadManagers()}
            actionClassName={BTN_GHOST}
          />
          <InlineAlert message={managerStatusWarning} tone="warning" />
          <InlineAlert message={managerMessage} tone="success" />

          {managerStatusUnavailable ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
              Assignment status unavailable. Refresh or check setup.
            </div>
          ) : (
            <div
              className={`rounded-lg px-3 py-2 text-sm ${
                departmentsWithoutManagers.length === 0
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300"
                  : "border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300"
              }`}
            >
              {managerCompletenessMessage}
            </div>
          )}

          {managerLoading ? (
            <LoadingState message="Loading department manager assignments..." />
          ) : departmentManagerRows.length === 0 ? (
            <EmptyState title="No departments found" message="Department list is empty." icon={FolderOpen} />
          ) : (
            <DataTable
              columns={[
                { header: "Department", render: (row) => row.department_name },
                { header: "Assigned Managers", render: (row) => row.assignments.length ? `${row.assignments.length} assigned` : "—" },
                {
                  header: "Account Status",
                  render: (row) => getAccountStatusLabel(row.isAssigned, row.managerIsActive),
                },
                { header: "Status", render: (row) => renderAssignmentStatusChip(row.isAssigned) },
                {
                  header: "Actions",
                  render: (row) => (
                    <button type="button" className={BTN_GHOST} onClick={() => navigate(`/coordinator/management/departments?department=${row.department_id}`)}>Manage</button>
                  ),
                },
              ]}
              data={departmentManagerRows}
              keyExtractor={(row) => row.department_id}
            />
          )}
        </DashboardCard>
      ) : null}

      {activeTab === "role_coverage" && coverageType === "facilitator" ? (
        <DashboardCard className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Role Coverage</h2><p className="text-sm text-slate-500 dark:text-slate-400">Eligibility allows selection as a facilitator. Assignments are configured during Intramural Setup.</p></div><select aria-label="Coverage role" value={coverageType} onChange={(event) => setCoverageType(event.target.value)} className={INPUT_CLS}><option value="manager">Department Managers</option><option value="facilitator">Sports Facilitators</option></select></div>

          <InlineAlert
            message={facilitatorError}
            tone="error"
            actionLabel="Retry"
            onAction={() => void loadFacilitators()}
            actionClassName={BTN_GHOST}
          />
          <InlineAlert message={facilitatorStatusWarning} tone="warning" />
          <InlineAlert message={facilitatorMessage} tone="success" />

          {facilitatorStatusUnavailable ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
              Eligibility status unavailable. Refresh or check setup.
            </div>
          ) : (
            <div
              className={`rounded-lg px-3 py-2 text-sm ${
                sportsWithoutFacilitators.length === 0
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300"
                  : "border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300"
              }`}
            >
              {facilitatorCompletenessMessage}
            </div>
          )}

          {facilitatorLoading ? (
            <LoadingState message="Loading sports facilitator eligibility..." />
          ) : facilitatorScopeRows.length === 0 ? (
            <EmptyState
              title="No sports found"
              message="Add sports first to manage facilitator eligibility."
              icon={FolderOpen}
            />
          ) : (
            <DataTable
              columns={[
                { header: "Sport Scope", render: (row) => getSportDisplayName(row) },
                { header: "Eligible Users", render: (row) => row.assignmentCount },
                { header: "Eligible Facilitators", render: (row) => row.currentLabel },
                { header: "Primary Department Scope", render: (row) => row.primaryDepartmentName },
                {
                  header: "Account Status",
                  render: (row) => getAccountStatusLabel(row.isAssigned, row.facilitatorIsActive),
                },
                { header: "Status", render: (row) => renderAssignmentStatusChip(row.isAssigned) },
                {
                  header: "Actions",
                  render: (row) => (
                    <div className="flex flex-wrap gap-2">
                      {row.isAssigned ? (
                        <>
                          <button
                            type="button"
                            className={BTN_GHOST}
                            onClick={() =>
                              openAssignFacilitatorModal(
                                row.sport_id,
                                "replace",
                                row.assignments.map((item) => item.assignment_id)
                              )
                            }
                          >
                            Change Eligibility
                          </button>
                          <button
                            type="button"
                            className={BTN_GHOST}
                            onClick={() => openRoleRemoveConfirm(row.assignments.map((item) => item.assignment_id), "facilitator")}
                          >
                            Remove Eligibility
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className={BTN_PRIMARY}
                          onClick={() => openAssignFacilitatorModal(row.sport_id, "assign", [])}
                        >
                          Add Eligible Facilitator
                        </button>
                      )}
                    </div>
                  ),
                },
              ]}
              data={facilitatorScopeRows}
              keyExtractor={(row) => row.key}
            />
          )}
        </DashboardCard>
      ) : null}

      {activeTab === "staff_officials" ? (
        <DashboardCard className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Staff & Officials</h2>
            <button type="button" className={BTN_PRIMARY} onClick={openStaffAssignModal}>
              <span className="inline-flex items-center gap-2">
                <UserPlus size={14} />
                Assign Staff/Official
              </span>
            </button>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            Assign staff roles to specific sports. Assignments take effect immediately.
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard title="Active Staff" value={totalAssignedStaff} icon={UserCog} color="green" />
            <MetricCard title="Sports Covered" value={sportsCoveredCount} icon={Building2} color="blue" />
            <MetricCard title="Sports Without Staff" value={sportsWithoutStaffCount} icon={FolderOpen} color="orange" />
          </div>

          <InlineAlert
            message={staffError}
            tone="error"
            actionLabel="Retry"
            onAction={() => void loadStaffAssignments()}
            actionClassName={BTN_GHOST}
          />
          <InlineAlert message={staffMessage} tone="success" />
          <div className="grid gap-3 md:grid-cols-3">
            <input aria-label="Search staff" value={staffSearch} onChange={(event) => setStaffSearch(event.target.value)} className={INPUT_CLS} placeholder="Search staff" />
            <select aria-label="Filter staff by sport" value={staffSportFilter} onChange={(event) => setStaffSportFilter(event.target.value)} className={INPUT_CLS}><option value="">All sports</option>{sports.map((sport) => <option key={sport.id} value={sport.id}>{getSportDisplayName(sport)}</option>)}</select>
            <select aria-label="Filter staff by role" value={staffRoleFilter} onChange={(event) => setStaffRoleFilter(event.target.value)} className={INPUT_CLS}><option value="">All roles</option>{STAFF_ROLE_OPTIONS.map((role) => <option key={role} value={role}>{role}</option>)}</select>
          </div>
          {staffLoading ? <LoadingState message="Loading staff assignments..." /> : staffAssignmentRows.length === 0 ? <EmptyState title="No staff assignments found" message="Adjust the filters or assign staff." icon={FolderOpen} /> : <DataTable columns={[
            { header: "Name", render: (row) => <button type="button" onClick={() => openUserProfile(row)} className="font-semibold text-blue-700 hover:underline dark:text-blue-300">{row.name || "Unknown user"}</button> },
            { header: "Sport", accessor: "sport_name", render: (row) => getSportDisplayName(row) },
            { header: "Role", render: (row) => row.assigned_role || row.role || "—" },
            { header: "Department", render: (row) => row.department_name || departmentById[Number(row.department_id)] || "—" },
            { header: "Status", render: (row) => <StatusBadge status={String(row.status || "ACTIVE").toUpperCase()} /> },
            { header: "Actions", render: (row) => <details className="relative"><summary className="cursor-pointer list-none rounded-lg border border-slate-200 px-3 py-1.5 font-bold dark:border-slate-700">•••</summary><div className="absolute right-0 z-20 mt-1 grid min-w-40 rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"><button type="button" onClick={() => openUserProfile(row)} className="rounded-md px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800">View Profile</button><button type="button" onClick={() => openStaffRemoveConfirm(row.sport_id, row.user_id)} className="rounded-md px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/30">Remove Assignment</button></div></details> },
          ]} data={staffAssignmentRows} keyExtractor={(row) => `${row.sport_id}-${row.user_id}-${row.id || row.assigned_role}`} />}
          <div className="hidden" aria-hidden="true">
          {staffLoading ? (
            <LoadingState message="Loading staff assignments..." />
          ) : sports.length === 0 ? (
            <EmptyState title="No sports found" message="Staff summary is unavailable without sports." icon={FolderOpen} />
          ) : (
            <>
              <DataTable
                columns={[
                  { header: "Sport", render: (row) => getSportDisplayName(row) },
                  { header: "Assigned Staff Count", render: (row) => row.count },
                  {
                    header: "Staff Roles",
                    render: (row) => {
                      const labels = Object.entries(row.roles).map(([role, count]) => `${role} (${count})`);
                      return labels.length > 0 ? labels.join(", ") : "No staff assigned";
                    },
                  },
                  {
                    header: "Status",
                    render: (row) => (
                      <StatusBadge
                        status={row.count > 0 ? "ACTIVE" : "PENDING"}
                        customLabel={row.count > 0 ? "Assigned" : "Missing"}
                      />
                    ),
                  },
                  {
                    header: "Actions",
                    render: (row) => (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className={BTN_GHOST}
                          onClick={() => setSelectedStaffSportId(String(row.sport_id))}
                        >
                          View Assignments
                        </button>
                        <button
                          type="button"
                          className={BTN_PRIMARY}
                          onClick={() => {
                            setSelectedStaffSportId(String(row.sport_id));
                            setTimeout(openStaffAssignModal, 0);
                          }}
                        >
                          Assign
                        </button>
                      </div>
                    ),
                  },
                ]}
                data={sports.map((sport) => {
                  const sportId = Number(sport.id);
                  const summary = staffCountsBySport[sportId] || { count: 0, roles: {} };
                  return {
                    sport_id: sportId,
                    sport_name: sport.sport_name || sport.name || "Unassigned sport",
                    count: summary.count,
                    roles: summary.roles,
                  };
                })}
                keyExtractor={(row) => row.sport_id}
              />

              <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
                <div className="mb-3 flex items-center gap-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Selected Sport</label>
                  <select
                    value={selectedStaffSportId}
                    onChange={(event) => setSelectedStaffSportId(event.target.value)}
                    className={INPUT_CLS}
                  >
                    <option value="">Select sport</option>
                    {sports.map((sport) => (
                      <option key={sport.id} value={sport.id}>
                        {getSportDisplayName(sport)}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedStaffSportId ? (
                  selectedStaffRows.length === 0 ? (
                    <EmptyState
                      title={`No staff assigned to ${sportById[Number(selectedStaffSportId)] || "selected sport"}`}
                      message="Use Assign Staff/Official to add assignment."
                      icon={FolderOpen}
                    />
                  ) : (
                    <DataTable
                      columns={[
                        {
                          header: "Account",
                          render: (row) => (
                            <div>
                              {Number(row.user_id || 0) > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => openUserProfile(row)}
                                  className="font-semibold text-blue-700 hover:text-blue-600 dark:text-blue-300 dark:hover:text-blue-200"
                                >
                                  {row.name || "Unknown user"}
                                </button>
                              ) : (
                                <p className="font-semibold text-slate-900 dark:text-slate-100">
                                  {row.name || "Profile unavailable"}
                                </p>
                              )}
                              <p className="text-xs text-slate-500 dark:text-slate-400">{row.email || "-"}</p>
                            </div>
                          ),
                        },
                        { header: "Staff Assignment", render: (row) => row.assigned_role || row.role || "-" },
                        { header: "Status", render: (row) => <StatusBadge status={String(row.status || "").toUpperCase() || "ACTIVE"} /> },
                        { header: "Assigned Date", render: (row) => fmtDateTime(row.assigned_at) },
                        {
                          header: "Actions",
                          render: (row) => (
                            <div className="flex flex-wrap gap-2">
                              {Number(row.user_id || 0) > 0 ? (
                                <button
                                  type="button"
                                  className={BTN_GHOST}
                                  onClick={() => openUserProfile(row)}
                                >
                                  View Profile
                                </button>
                              ) : null}
                              <button
                                type="button"
                                className={BTN_GHOST}
                                onClick={() => openStaffRemoveConfirm(row.sport_id, row.user_id)}
                              >
                                Remove Assignment
                              </button>
                            </div>
                          ),
                        },
                      ]}
                      data={selectedStaffRows}
                      keyExtractor={(row) => `${row.sport_id}-${row.user_id}-${row.id || row.assigned_role}`}
                    />
                  )
                ) : (
                  <EmptyState title="Select a sport" message="Choose a sport to view assignments." icon={FolderOpen} />
                )}
              </div>
            </>
          )}
          </div>
        </DashboardCard>
      ) : null}

      {activeTab === "departments" ? (
        <DashboardCard className="space-y-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Department Directory</h2>

          <InlineAlert
            message={departmentsMessage}
            tone={departmentsMessageTone}
          />

          {refsLoading ? <LoadingState message="Loading departments..." /> : null}

          {!refsLoading ? (
          <div className="max-w-xl">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                <Building2 size={14} />
                Create Department
              </div>
              <div className="space-y-2">
                <input
                  value={departmentForm.department_code}
                  onChange={(event) => setDepartmentForm((previous) => ({ ...previous, department_code: event.target.value }))}
                  className={INPUT_CLS}
                  placeholder="Department code (e.g. CITE)"
                />
                <input
                  value={departmentForm.department_name}
                  onChange={(event) => setDepartmentForm((previous) => ({ ...previous, department_name: event.target.value }))}
                  className={INPUT_CLS}
                  placeholder="Department name"
                />
                <button
                  type="button"
                  className={BTN_PRIMARY}
                  onClick={() => void handleDepartmentCreate()}
                  disabled={departmentBusy}
                >
                  {departmentBusy ? "Saving..." : "Create Department"}
                </button>
              </div>
            </div>

          </div>
          ) : null}

          {!refsLoading && departments.length === 0 ? (
            <EmptyState title="No departments found" message="Create a department to continue." icon={FolderOpen} />
          ) : !refsLoading ? (
            <DataTable
              columns={[
                {
                  header: "Department",
                  render: (row) =>
                    departmentEditingId === Number(row.id) ? (
                      <div className="grid gap-2">
                        <input
                          value={departmentEditForm.department_name}
                          onChange={(event) => setDepartmentEditForm((previous) => ({ ...previous, department_name: event.target.value }))}
                          className={INPUT_CLS}
                        />
                      </div>
                    ) : (
                      <button type="button" onClick={() => void openDepartmentDetail(row)} className="text-left font-semibold text-blue-700 hover:underline dark:text-blue-300">
                        {row.department_name}
                      </button>
                    ),
                },
                {
                  header: "Code",
                  priority: 2,
                  render: (row) =>
                    departmentEditingId === Number(row.id) ? (
                      <input
                        value={departmentEditForm.department_code}
                        onChange={(event) => setDepartmentEditForm((previous) => ({ ...previous, department_code: event.target.value }))}
                        className={INPUT_CLS}
                      />
                    ) : (
                      row.department_code || "-"
                    ),
                },
                {
                  header: "Assigned Managers",
                  priority: 3,
                  render: (row) => {
                    const managerRow = departmentManagerRows.find((item) => Number(item.department_id) === Number(row.id));
                    const assignments = managerRow?.assignments || [];
                    return assignments.length ? <div className="grid gap-1">{assignments.map((assignment) => <div key={assignment.assignment_id} className="flex items-center justify-between gap-2"><span>{assignment.name || "Unknown user"}</span><button type="button" onClick={() => openRoleRemoveConfirm([assignment.assignment_id], "manager")} className="text-xs font-semibold text-rose-600 hover:underline dark:text-rose-300">Remove</button></div>)}</div> : "—";
                  },
                },
                {
                  header: "Status",
                  render: () => <StatusBadge status="ACTIVE" customLabel="Available" />,
                },
                {
                  header: "Actions",
                  render: (row) => {
                    return (
                      <div>
                        {departmentEditingId === Number(row.id) ? (
                          <>
                            <button type="button" className={BTN_PRIMARY} onClick={() => void saveDepartmentEdit()}>
                              Save
                            </button>
                            <button type="button" className={BTN_GHOST} onClick={cancelDepartmentEdit}>
                              Cancel
                            </button>
                          </>
                        ) : (
                          <details className="relative"><summary className="cursor-pointer list-none rounded-lg border border-slate-200 px-3 py-1.5 font-bold dark:border-slate-700" aria-label={`Actions for ${row.department_name}`}>•••</summary><div className="absolute right-0 z-20 mt-1 grid min-w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"><button type="button" onClick={() => void openDepartmentDetail(row)} className="rounded-md px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800">View Teams & Players</button><button type="button" onClick={() => startDepartmentEdit(row)} className="rounded-md px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800">Edit</button><button type="button" onClick={() => openAssignManagerModal(row.id, "assign", [])} className="rounded-md px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800">Add Manager</button><button type="button" onClick={() => openDepartmentDeleteConfirm(row)} className="rounded-md px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/30">Delete</button></div></details>
                        )}
                      </div>
                    );
                  },
                },
              ]}
              data={departments}
              keyExtractor={(row) => row.id}
            />
          ) : null}
        </DashboardCard>
      ) : null}

      <AppModal
        open={departmentDetail.open}
        onClose={closeDepartmentDetail}
        title={departmentDetail.department?.department_name || "Department"}
        subtitle={`${departmentDetail.department?.department_code || "Department"} · Teams and registered players`}
        variant="drawer"
        drawerResizable
        drawerDefaultWidth={640}
        drawerMinWidth={420}
        drawerMaxWidth={1000}
      >
        <div className="space-y-4 p-5">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"><p className="text-xs text-slate-500 dark:text-slate-400">Teams in scope</p><p className="text-xl font-bold text-slate-900 dark:text-slate-100">{departmentDetail.teams.length}</p></div>
            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"><p className="text-xs text-slate-500 dark:text-slate-400">Solo / Duo entries</p><p className="text-xl font-bold text-slate-900 dark:text-slate-100">{departmentDetail.entries.length}</p></div>
            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"><p className="text-xs text-slate-500 dark:text-slate-400">Players in scope</p><p className="text-xl font-bold text-slate-900 dark:text-slate-100">{departmentDetail.players.length}</p></div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
              <label className="grid min-w-0 flex-1 gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                Search
                <input type="search" className={INPUT_CLS} value={departmentDetail.search} placeholder={departmentDetail.tab === "teams" ? "Search team, sport, or coach" : departmentDetail.tab === "entries" ? "Search entry, sport, or type" : "Search player, team, or entry"} onChange={(event) => setDepartmentDetail((previous) => ({ ...previous, search: event.target.value, teamPage: 1, entryPage: 1, playerPage: 1 }))} />
              </label>
             
              <label className="grid min-w-0 flex-1 gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                Intramural
                <select className={INPUT_CLS} value={departmentDetail.tournamentId} disabled={departmentDetail.loading} onChange={(event) => void loadDepartmentTeams(departmentDetail.department, event.target.value)}>
                  <option value="">All intramurals</option>
                  {departmentTournaments.map((tournament) => <option key={tournament.id} value={tournament.id}>{tournament.tournament_name || tournament.name || `Intramural #${tournament.id}`}</option>)}
                </select>
              </label>

               <div className="flex shrink-0 rounded-lg bg-slate-200/70 p-1 dark:bg-slate-900" role="tablist" aria-label="Department records">
                {[{ id: "teams", label: "Teams" }, { id: "entries", label: "Solo / Duo" }, { id: "players", label: "Players" }].map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={departmentDetail.tab === tab.id} onClick={() => setDepartmentDetail((previous) => ({ ...previous, tab: tab.id, teamPage: 1, entryPage: 1, playerPage: 1 }))} className={`min-h-10 flex-1 rounded-md px-3 py-2 text-sm font-semibold transition lg:flex-none ${departmentDetail.tab === tab.id ? "bg-white text-blue-700 shadow-sm dark:bg-slate-700 dark:text-blue-300" : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"}`}>{tab.label}</button>)}
              </div>
              
            </div>
          </div>
          <InlineAlert message={departmentDetail.error} tone="error" />
          {departmentDetail.loading ? <LoadingState message="Loading department teams, entries, and players..." /> : departmentDetail.tab === "teams" ? (
            departmentDetailAllRows.length ? <DataTable columns={[
              { header: "Team", render: (row) => row.team_name || row.name || "Unnamed team" },
              { header: "Sport", priority: 2, render: (row) => getSportDisplayName(row, sportById[Number(row.sport_id)] || "—") },
              { header: "Coach", priority: 3, render: (row) => row.coach_name || row.coach?.name || "—" },
              { header: "Status", render: (row) => <StatusBadge status={String(row.status || "ACTIVE").toUpperCase()} /> },
            ]} data={departmentDetailVisibleRows} keyExtractor={(row) => row.id} /> : <EmptyState title="No teams found" message={departmentDetail.search ? "No teams match this search." : "This department has no teams in the selected intramural scope."} icon={FolderOpen} />
          ) : departmentDetail.tab === "entries" ? (
            departmentDetailAllRows.length ? <DataTable columns={[
              { header: "Entry", render: (row) => row.entry_name || `Entry #${row.entry_number || row.id}` },
              { header: "Type", render: (row) => String(row.participant_shape || "ENTRY").toUpperCase() },
              { header: "Sport", priority: 2, render: (row) => sportById[Number(row.sport_id)] || "—" },
              { header: "Players", priority: 2, render: (row) => (row.members || []).map((member) => member.player_name).filter(Boolean).join(" + ") || "—" },
              { header: "Status", render: (row) => <StatusBadge status={String(row.status || "DRAFT").toUpperCase()} /> },
            ]} data={departmentDetailVisibleRows} keyExtractor={(row) => row.id} /> : <EmptyState title="No solo or duo entries found" message={departmentDetail.search ? "No entries match this search." : "This department has no solo or duo entries in the selected intramural scope."} icon={FolderOpen} />
          ) : departmentDetailAllRows.length ? <DataTable columns={[
            { header: "Player", render: (row) => row.full_name || row.player_name || [row.first_name, row.last_name].filter(Boolean).join(" ") || row.name || "Unknown player" },
            { header: "Team / Entry", priority: 2, accessor: "team_name" },
            { header: "Position", priority: 3, render: (row) => row.position || row.playing_position || "—" },
            { header: "Status", render: (row) => <StatusBadge status={String(row.status || "ACTIVE").toUpperCase()} /> },
          ]} data={departmentDetailVisibleRows} keyExtractor={(row) => `${row.team_id}-${row.id || row.player_id}`} /> : <EmptyState title="No players found" message={departmentDetail.search ? "No players match this search." : "No players are registered in this department's teams for the selected scope."} icon={FolderOpen} />}
          {!departmentDetail.loading && departmentDetailAllRows.length > departmentDetailPageSize ? (
            <div className="flex flex-col gap-2 border-t border-slate-200 pt-3 text-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
              <p className="text-slate-500 dark:text-slate-400">
                Showing {(departmentDetailPage - 1) * departmentDetailPageSize + 1}–{Math.min(departmentDetailPage * departmentDetailPageSize, departmentDetailAllRows.length)} of {departmentDetailAllRows.length}
              </p>
              <div className="flex items-center gap-2">
                <button type="button" className={BTN_GHOST} disabled={departmentDetailPage <= 1} onClick={() => setDepartmentDetail((previous) => ({ ...previous, [departmentDetailPageKey]: Math.max(1, departmentDetailPage - 1) }))}>Previous</button>
                <span className="min-w-20 text-center font-medium text-slate-700 dark:text-slate-200">Page {departmentDetailPage} of {departmentDetailTotalPages}</span>
                <button type="button" className={BTN_GHOST} disabled={departmentDetailPage >= departmentDetailTotalPages} onClick={() => setDepartmentDetail((previous) => ({ ...previous, [departmentDetailPageKey]: Math.min(departmentDetailTotalPages, departmentDetailPage + 1) }))}>Next</button>
              </div>
            </div>
          ) : null}
        </div>
      </AppModal>

      <AppModal
        open={accountStatusModal.open}
        onClose={closeAccountStatusModal}
        title={accountStatusModal.nextIsActive ? "Reactivate account?" : "Deactivate account?"}
        subtitle={
          accountStatusModal.nextIsActive
            ? "This allows the user to log in again if their credentials are valid."
            : "This prevents the user from logging in or using protected actions. Historical records and assignments will be preserved."
        }
        maxWidthClass="max-w-xl"
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            Account: <span className="font-semibold">{accountStatusModal.userName || "-"}</span>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className={BTN_GHOST} onClick={closeAccountStatusModal} disabled={accountStatusModal.busy}>
              Cancel
            </button>
            <button
              type="button"
              className={
                accountStatusModal.nextIsActive
                  ? BTN_PRIMARY
                  : "rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:opacity-60"
              }
              onClick={() => void submitAccountStatusModal()}
              disabled={accountStatusModal.busy}
            >
              {accountStatusModal.busy
                ? accountStatusModal.nextIsActive
                  ? "Reactivating..."
                  : "Deactivating..."
                : accountStatusModal.nextIsActive
                  ? "Confirm Reactivate"
                  : "Confirm Deactivate"}
            </button>
          </div>
        </div>
      </AppModal>

      <AppModal
        open={assignModal.open}
        onClose={closeAssignModal}
        title={
          assignModal.kind === "manager"
            ? `Assign Manager — ${departmentById[Number(assignModal.departmentId)] || "Department"}`
            : `Assign Facilitator — ${sportById[Number(assignModal.sportId)] || "Sport"}`
        }
        subtitle={
          assignModal.kind === "facilitator"
            ? "This grants Sport eligibility only. Assign the user to a specific Intramural from Intramural Setup."
            : assignModal.mode === "replace"
              ? "This will replace the current assignment after confirmation."
              : "Create a new assignment for this scope."
        }
        maxWidthClass="max-w-xl"
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {assignModal.kind === "manager" ? (
              <>Department Scope: {departmentById[Number(assignModal.departmentId)] || "-"}</>
            ) : (
              <>
                Sport Scope: {sportById[Number(assignModal.sportId)] || "-"}
              </>
            )}
          </div>
          <input
            value={assignModal.email}
            onChange={(event) => setAssignModal((previous) => ({ ...previous, email: event.target.value }))}
            className={INPUT_CLS}
            placeholder="account@school.edu"
          />
          {assignModal.error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
              {assignModal.error}
            </div>
          ) : null}
          <div className="flex justify-end gap-2">
            <button type="button" className={BTN_GHOST} onClick={closeAssignModal} disabled={assignModal.busy}>
              Cancel
            </button>
            <button type="button" className={BTN_PRIMARY} onClick={() => void submitAssignModal()} disabled={assignModal.busy}>
              {assignModal.mode === "replace"
                ? assignModal.busy
                  ? "Replacing..."
                  : "Replace Assignment"
                : assignModal.busy
                  ? "Assigning..."
                  : "Assign"}
            </button>
          </div>
        </div>
      </AppModal>

      <AppModal
        open={confirmModal.open}
        onClose={closeConfirmModal}
        title={confirmModal.type === "staff" ? "Remove staff assignment?" : "Remove assignment?"}
        subtitle="This keeps account history but removes the active assignment."
        maxWidthClass="max-w-lg"
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            This keeps account history but removes the active assignment.
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className={BTN_GHOST} onClick={closeConfirmModal} disabled={confirmModal.busy}>
              Cancel
            </button>
            <button
              type="button"
              className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => void submitConfirmModal()}
              disabled={confirmModal.busy}
            >
              {confirmModal.busy ? "Removing..." : "Confirm Remove"}
            </button>
          </div>
        </div>
      </AppModal>

      <AppModal
        open={Boolean(departmentDeleteTarget)}
        onClose={closeDepartmentDeleteConfirm}
        title="Remove department?"
        subtitle="This will attempt to remove the department using existing safety checks."
        maxWidthClass="max-w-lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Department: <span className="font-semibold">{departmentDeleteTarget?.department_name || "-"}</span>
          </p>
          <div className="flex justify-end gap-2">
            <button type="button" className={BTN_GHOST} onClick={closeDepartmentDeleteConfirm} disabled={departmentBusy}>
              Cancel
            </button>
            <button
              type="button"
              className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:opacity-60"
              onClick={() => void submitDepartmentDelete()}
              disabled={departmentBusy}
            >
              {departmentBusy ? "Removing..." : "Remove Department"}
            </button>
          </div>
        </div>
      </AppModal>

      <AppModal
        open={inviteConfirmOpen}
        onClose={closeInviteRotateConfirm}
        title="Rotate global invite code?"
        subtitle="This will replace the shared registration invite code."
        maxWidthClass="max-w-lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-700 dark:text-slate-300">New code: <span className="font-semibold">{inviteCodeInput || "-"}</span></p>
          <div className="flex justify-end gap-2">
            <button type="button" className={BTN_GHOST} onClick={closeInviteRotateConfirm} disabled={inviteSaving}>
              Cancel
            </button>
            <button
              type="button"
              className={BTN_PRIMARY}
              onClick={() => void submitInviteRotate()}
              disabled={inviteSaving}
            >
              {inviteSaving ? "Updating..." : "Confirm Rotate"}
            </button>
          </div>
        </div>
      </AppModal>

      <AppModal
        open={staffAssignModalOpen}
        onClose={closeStaffAssignModal}
        title="Assign Staff/Official"
        subtitle="Select sport scope, staff role, and account."
        maxWidthClass="max-w-4xl"
      >
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <select
              value={staffAssignForm.sportId}
              onChange={(event) =>
                setStaffAssignForm((previous) => ({ ...previous, sportId: event.target.value, userId: "" }))
              }
              className={INPUT_CLS}
            >
              {sports.map((sport) => (
                <option key={sport.id} value={sport.id}>
                  {getSportDisplayName(sport)}
                </option>
              ))}
            </select>
            <select
              value={staffAssignForm.assignedRole}
              onChange={(event) =>
                setStaffAssignForm((previous) => ({ ...previous, assignedRole: event.target.value, userId: "" }))
              }
              className={INPUT_CLS}
            >
              {STAFF_ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            <input
              value={staffAssignForm.search}
              onChange={(event) =>
                setStaffAssignForm((previous) => ({ ...previous, search: event.target.value, userId: "" }))
              }
              className={INPUT_CLS}
              placeholder="Search name or email"
            />
          </div>

          {staffCandidatesError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
              {staffCandidatesError}
            </div>
          ) : null}

          {staffCandidatesLoading ? (
            <LoadingState message="Searching users..." />
          ) : staffCandidates.length === 0 ? (
            <EmptyState title="No users found" message="Try a different search term." icon={FolderOpen} />
          ) : (
            <div className="space-y-2">
              {staffCandidates.map((candidate) => {
                const assignedRoles = Array.isArray(candidate.assigned_roles_for_sport)
                  ? candidate.assigned_roles_for_sport
                  : [];
                const alreadyAssigned =
                  Boolean(candidate.already_assigned_for_selected_role) ||
                  assignedRoles.some((role) => String(role || "").trim().toLowerCase() === selectedStaffRole);
                return (
                  <label
                    key={candidate.user_id}
                    className={`block rounded-xl border px-3 py-2 ${
                      alreadyAssigned
                        ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-70 dark:border-slate-700 dark:bg-slate-800/50"
                        : Number(staffAssignForm.userId) === Number(candidate.user_id)
                          ? "border-blue-300 bg-blue-50 dark:border-blue-500/60 dark:bg-blue-500/10"
                          : "cursor-pointer border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {candidate.name || "Unknown user"}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{candidate.email || "-"}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {candidate.department_name || "No department"} / {roleLabel(candidate.primary_role)}
                        </p>
                        {assignedRoles.length > 0 ? (
                          <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                            Existing assignment roles for this sport: {assignedRoles.join(", ")}
                          </p>
                        ) : null}
                      </div>
                      <input
                        type="radio"
                        name="staff-assignment-user"
                        checked={Number(staffAssignForm.userId) === Number(candidate.user_id)}
                        disabled={alreadyAssigned}
                        onChange={() =>
                          setStaffAssignForm((previous) => ({ ...previous, userId: String(candidate.user_id) }))
                        }
                      />
                    </div>
                  </label>
                );
              })}
            </div>
          )}

          <textarea
            rows={3}
            value={staffAssignForm.note}
            onChange={(event) => setStaffAssignForm((previous) => ({ ...previous, note: event.target.value }))}
            className={INPUT_CLS}
            placeholder="Assignment note (optional)"
          />

          <div className="flex justify-end gap-2">
            <button type="button" className={BTN_GHOST} onClick={closeStaffAssignModal} disabled={staffAssignBusy}>
              Cancel
            </button>
            <button
              type="button"
              className={BTN_PRIMARY}
              onClick={() => void submitStaffAssignModal()}
              disabled={staffAssignBusy}
            >
              {staffAssignBusy ? "Assigning..." : "Assign Staff/Official"}
            </button>
          </div>
        </div>
      </AppModal>
    </div>
  );
};

export default UserManagement;
