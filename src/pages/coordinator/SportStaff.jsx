import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, ShieldCheck, UserPlus, Users } from "lucide-react";
import AppModal from "../../components/common/AppModal";
import DataTable from "../../components/common/DataTable";
import DashboardCard from "../../components/common/DashboardCard";
import EmptyState from "../../components/common/EmptyState";
import LoadingState from "../../components/common/LoadingState";
import MetricCard from "../../components/common/MetricCard";
import PageHeaderCard from "../../components/common/PageHeaderCard";
import StatusBadge from "../../components/common/StatusBadge";
import {
  STAFF_ROLE_OPTIONS,
  STAFF_STATUS_LABELS,
  summarizeApiError,
  toUpperStatus,
} from "../../components/staff_officials/staffOfficialUi";
import { getSports } from "../../services/sportService";
import { getSportDisplayName } from "../../utils/tournamentEventCategories";
import {
  addSportStaff,
  getSportStaff,
  removeSportStaff,
  searchSportStaffCandidates,
} from "../../services/sportStaffService";

const roleLooksOfficial = (roleValue) => {
  const normalized = String(roleValue || "").trim().toLowerCase();
  return (
    normalized.includes("official")
    || normalized.includes("referee")
    || normalized.includes("scorer")
    || normalized.includes("timekeeper")
  );
};

const normalizeMessage = (error, fallbackMessage) => {
  const detail = String(summarizeApiError(error, fallbackMessage) || "").trim();
  const lowered = detail.toLowerCase();
  if (lowered.includes("only coordinator or assigned facilitator")) {
    return "You are not authorized to assign staff for this sport.";
  }
  if (lowered.includes("already active")) {
    return "This user is already assigned to this sport with the selected role.";
  }
  return detail || fallbackMessage;
};

const SportStaff = () => {
  const [sports, setSports] = useState([]);
  const [selectedSportId, setSelectedSportId] = useState("");
  const [rows, setRows] = useState([]);
  const [loadingSports, setLoadingSports] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({
    sportId: "",
    userId: "",
    assignedRole: "Official",
    note: "",
    search: "",
  });
  const [candidateRows, setCandidateRows] = useState([]);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [candidateError, setCandidateError] = useState("");
  const [removeModal, setRemoveModal] = useState({
    open: false,
    row: null,
    busy: false,
    error: "",
  });

  const selectedSportName = useMemo(() => {
    const match = sports.find((sport) => Number(sport.id) === Number(selectedSportId));
    return match?.sport_name || match?.name || "";
  }, [selectedSportId, sports]);

  const loadSports = useCallback(async () => {
    setLoadingSports(true);
    setError("");
    try {
      const payload = await getSports();
      const sportRows = Array.isArray(payload) ? payload : [];
      setSports(sportRows);
      if (sportRows.length > 0) {
        setSelectedSportId((previous) => {
          if (previous && sportRows.some((sport) => Number(sport.id) === Number(previous))) {
            return String(previous);
          }
          return String(sportRows[0].id);
        });
      } else {
        setSelectedSportId("");
      }
    } catch (apiError) {
      setSports([]);
      setSelectedSportId("");
      setError(normalizeMessage(apiError, "Failed to load sports."));
    } finally {
      setLoadingSports(false);
    }
  }, []);

  const loadStaff = useCallback(async (sportId) => {
    if (!sportId) {
      setRows([]);
      return;
    }
    setLoadingRows(true);
    setError("");
    try {
      const payload = await getSportStaff(sportId);
      setRows(Array.isArray(payload?.items) ? payload.items : []);
    } catch (apiError) {
      setRows([]);
      setError(normalizeMessage(apiError, "Failed to load assigned sport staff."));
    } finally {
      setLoadingRows(false);
    }
  }, []);

  useEffect(() => {
    loadSports();
  }, [loadSports]);

  useEffect(() => {
    if (!selectedSportId) return;
    loadStaff(selectedSportId);
  }, [loadStaff, selectedSportId]);

  const openAssignModal = () => {
    setMessage("");
    setCandidateError("");
    setCandidateRows([]);
    setAssignmentForm({
      sportId: selectedSportId || (sports[0] ? String(sports[0].id) : ""),
      userId: "",
      assignedRole: "Official",
      note: "",
      search: "",
    });
    setIsAssignModalOpen(true);
  };

  const closeAssignModal = () => {
    if (assigning) return;
    setIsAssignModalOpen(false);
    setCandidateError("");
    setCandidateRows([]);
  };

  const refreshCandidates = useCallback(async () => {
    if (!isAssignModalOpen || !assignmentForm.sportId) {
      setCandidateRows([]);
      return;
    }
    setCandidateLoading(true);
    setCandidateError("");
    try {
      const payload = await searchSportStaffCandidates(assignmentForm.sportId, {
        q: assignmentForm.search,
        assignedRole: assignmentForm.assignedRole,
        limit: 20,
      });
      setCandidateRows(Array.isArray(payload?.items) ? payload.items : []);
    } catch (apiError) {
      setCandidateRows([]);
      setCandidateError(normalizeMessage(apiError, "Unable to search users for assignment."));
    } finally {
      setCandidateLoading(false);
    }
  }, [assignmentForm.assignedRole, assignmentForm.search, assignmentForm.sportId, isAssignModalOpen]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshCandidates();
    }, 220);
    return () => window.clearTimeout(timeoutId);
  }, [refreshCandidates]);

  const stats = useMemo(() => {
    const departments = new Set();
    for (const row of rows) {
      if (row.department) departments.add(row.department);
    }
    return {
      total: rows.length,
      departments: departments.size,
      activeOfficials: rows.filter((row) => roleLooksOfficial(row.assigned_role || row.role)).length,
    };
  }, [rows]);

  const selectedRole = String(assignmentForm.assignedRole || "").trim().toLowerCase();
  const submitAssignment = async () => {
    if (!assignmentForm.sportId || !assignmentForm.userId || !assignmentForm.assignedRole) {
      setCandidateError("Please select a user and role before assigning.");
      return;
    }
    const selectedCandidate = candidateRows.find((candidate) => Number(candidate.user_id) === Number(assignmentForm.userId));
    if (selectedCandidate?.already_assigned_for_selected_role) {
      setCandidateError("This user is already assigned to this sport with the selected role.");
      return;
    }

    setAssigning(true);
    setError("");
    setMessage("");
    try {
      await addSportStaff(assignmentForm.sportId, assignmentForm.userId, {
        assigned_role: String(assignmentForm.assignedRole || "").trim(),
        note: String(assignmentForm.note || "").trim() || null,
      });
      setMessage("Staff/official assignment created successfully.");
      setIsAssignModalOpen(false);
      await loadStaff(assignmentForm.sportId);
      if (String(assignmentForm.sportId) !== String(selectedSportId)) {
        setSelectedSportId(String(assignmentForm.sportId));
      }
    } catch (apiError) {
      setCandidateError(normalizeMessage(apiError, "Failed to assign staff/official."));
    } finally {
      setAssigning(false);
    }
  };

  const removeAssignment = async (row) => {
    if (!row?.sport_id || !row?.user_id) return;
    setError("");
    setMessage("");
    setRemoveModal((prev) => ({ ...prev, busy: true, error: "" }));
    try {
      await removeSportStaff(row.sport_id, row.user_id);
      setMessage("Staff assignment removed.");
      setRemoveModal({ open: false, row: null, busy: false, error: "" });
      await loadStaff(selectedSportId);
    } catch (apiError) {
      const modalError = normalizeMessage(apiError, "Failed to remove staff assignment.");
      setError(modalError);
      setRemoveModal((prev) => ({ ...prev, busy: false, error: modalError }));
      return;
    }
    setRemoveModal((prev) => ({ ...prev, busy: false }));
  };

  return (
    <div className="os-page-shell">
      <PageHeaderCard
        title="Sport Staff & Officials"
        subtitle="Assign and manage referees, table officials, and event support staff per sport."
        breadcrumbs="Coordinator / Sport Staff"
        icon={Users}
        action={(
          <div className="flex items-center gap-2">
            <select
              value={selectedSportId}
              onChange={(event) => setSelectedSportId(event.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">Select sport</option>
              {sports.map((sport) => (
                <option key={sport.id} value={sport.id}>
                  {getSportDisplayName(sport)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={openAssignModal}
              disabled={!selectedSportId}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <UserPlus size={16} />
              Assign User
            </button>
          </div>
        )}
      />

      {error ? (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200">
          {message}
        </div>
      ) : null}

      {loadingSports ? (
        <LoadingState message="Loading sports..." />
      ) : sports.length === 0 ? (
        <EmptyState
          title="No sports available"
          message="Assigned staff cannot be displayed because no sports were found."
        />
      ) : (
        <>
          <section className="mb-6 grid gap-4 sm:grid-cols-3">
            <MetricCard title="Assigned Staff" value={stats.total} icon={Users} color="green" />
            <MetricCard title="Departments Represented" value={stats.departments} icon={Building2} color="blue" />
            <MetricCard title="Active Officials" value={stats.activeOfficials} icon={ShieldCheck} color="emerald" />
          </section>
          <DashboardCard>
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Assigned Staff Directory</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {selectedSportName ? `Current sport: ${selectedSportName}` : "Select a sport to view assignments."}
              </p>
            </div>
            {loadingRows ? (
              <LoadingState message="Loading sport staff..." />
            ) : rows.length === 0 ? (
              <EmptyState
                title="No assigned staff available"
                message="No assigned staff available for this sport."
              />
            ) : (
              <DataTable
                columns={[
                  { header: "Name", accessor: "name", render: (row) => row.name || "-" },
                  { header: "Email", accessor: "email", render: (row) => row.email || "-" },
                  { header: "Department", accessor: "department", render: (row) => row.department || "-" },
                  { header: "Sport", accessor: "sport", render: (row) => row.sport || "-" },
                  { header: "Role", accessor: "role", render: (row) => row.assigned_role || row.role || "-" },
                  { header: "Assignment Note", accessor: "note", render: (row) => row.note || "-" },
                  {
                    header: "Status",
                    accessor: "status",
                    render: (row) => {
                      const status = toUpperStatus(row.status);
                      return <StatusBadge status={status} customLabel={STAFF_STATUS_LABELS[status] || status} />;
                    },
                  },
                  {
                    header: "Actions",
                    accessor: "actions",
                    className: "text-right",
                    cellClassName: "text-right",
                    render: (row) => (
                      <button
                        type="button"
                        onClick={() => setRemoveModal({ open: true, row, busy: false, error: "" })}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20"
                      >
                        Remove
                      </button>
                    ),
                  },
                ]}
                data={rows}
              />
            )}
          </DashboardCard>
        </>
      )}

      <AppModal
        open={isAssignModalOpen}
        onClose={closeAssignModal}
        title="Assign Staff / Official"
        subtitle="Search a user, choose a role, and add optional assignment note."
        maxWidthClass="max-w-4xl"
      >
        <div className="space-y-5">
          <section className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Sport
              <select
                value={assignmentForm.sportId}
                onChange={(event) => {
                  setAssignmentForm((previous) => ({
                    ...previous,
                    sportId: event.target.value,
                    userId: "",
                  }));
                }}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                {sports.map((sport) => (
                  <option key={sport.id} value={sport.id}>
                    {getSportDisplayName(sport)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Assigned Role
              <select
                value={assignmentForm.assignedRole}
                onChange={(event) => {
                  setAssignmentForm((previous) => ({
                    ...previous,
                    assignedRole: event.target.value,
                    userId: "",
                  }));
                }}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="">Select role</option>
                {STAFF_ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <DashboardCard className="p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Select User</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Search existing users by name or email.
                </p>
              </div>
              <input
                value={assignmentForm.search}
                onChange={(event) => {
                  setAssignmentForm((previous) => ({
                    ...previous,
                    search: event.target.value,
                    userId: "",
                  }));
                }}
                placeholder="Search name or email"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 md:w-72 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            {candidateError ? (
              <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                {candidateError}
              </div>
            ) : null}

            {candidateLoading ? (
              <LoadingState message="Searching users..." />
            ) : candidateRows.length === 0 ? (
              <EmptyState
                title="No users found"
                message="Try a different search keyword or confirm that user records are available."
              />
            ) : (
              <div className="space-y-2">
                {candidateRows.map((candidate) => {
                  const assignedRoles = Array.isArray(candidate.assigned_roles_for_sport)
                    ? candidate.assigned_roles_for_sport
                    : [];
                  const alreadyAssignedForRole = Boolean(candidate.already_assigned_for_selected_role)
                    || assignedRoles.some((role) => String(role || "").trim().toLowerCase() === selectedRole);
                  return (
                    <label
                      key={candidate.user_id}
                      className={`block rounded-xl border px-3 py-2 transition ${
                        alreadyAssignedForRole
                          ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-70 dark:border-slate-700 dark:bg-slate-800/50"
                          : Number(assignmentForm.userId) === Number(candidate.user_id)
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
                            {candidate.department_name || "No department"} • {String(candidate.primary_role || "-").split("_").join(" ")}
                          </p>
                          {assignedRoles.length > 0 ? (
                            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                              Assigned in this sport: {assignedRoles.join(", ")}
                            </p>
                          ) : null}
                        </div>
                        <input
                          type="radio"
                          name="coordinator-staff-user"
                          value={candidate.user_id}
                          checked={Number(assignmentForm.userId) === Number(candidate.user_id)}
                          disabled={alreadyAssignedForRole}
                          onChange={(event) => {
                            setAssignmentForm((previous) => ({ ...previous, userId: event.target.value }));
                          }}
                          className="mt-1 h-4 w-4"
                        />
                      </div>
                      {alreadyAssignedForRole ? (
                        <p className="mt-1 text-xs font-medium text-rose-700 dark:text-rose-300">
                          Already assigned for this role.
                        </p>
                      ) : null}
                    </label>
                  );
                })}
              </div>
            )}
          </DashboardCard>

          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Assignment Note (optional)
            <textarea
              rows={3}
              value={assignmentForm.note}
              onChange={(event) => {
                setAssignmentForm((previous) => ({ ...previous, note: event.target.value }));
              }}
              placeholder="Add assignment context, shift notes, or event coverage details."
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={closeAssignModal}
              disabled={assigning}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitAssignment}
              disabled={assigning}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {assigning ? "Assigning..." : "Assign Staff"}
            </button>
          </div>
        </div>
      </AppModal>
      <AppModal
        open={removeModal.open}
        onClose={() => {
          if (removeModal.busy) return;
          setRemoveModal({ open: false, row: null, busy: false, error: "" });
        }}
        title="Remove Staff Assignment?"
        subtitle="This user will no longer appear as assigned staff for this sport."
        maxWidthClass="max-w-xl"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Remove this assignment now?
          </p>
          {removeModal.error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
              {removeModal.error}
            </div>
          ) : null}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setRemoveModal({ open: false, row: null, busy: false, error: "" })}
              disabled={removeModal.busy}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => removeAssignment(removeModal.row)}
              disabled={removeModal.busy || !removeModal.row}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-60"
            >
              {removeModal.busy ? "Removing..." : "Confirm Remove"}
            </button>
          </div>
        </div>
      </AppModal>
    </div>
  );
};

export default SportStaff;
