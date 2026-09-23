import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList, ShieldCheck, UserCheck, UserX } from "lucide-react";
import AppModal from "../../components/common/AppModal";
import DataTable from "../../components/common/DataTable";
import DashboardCard from "../../components/common/DashboardCard";
import EmptyState from "../../components/common/EmptyState";
import LoadingState from "../../components/common/LoadingState";
import MetricCard from "../../components/common/MetricCard";
import PageHeaderCard from "../../components/common/PageHeaderCard";
import SectionTabs from "../../components/common/SectionTabs";
import StatusBadge from "../../components/common/StatusBadge";
import { getSportDisplayName } from "../../utils/tournamentEventCategories";
import {
  STAFF_ROLE_OPTIONS,
  STAFF_STATUS_LABELS,
  STAFF_STATUS_OPTIONS,
  formatDateTime,
  splitSkills,
  summarizeApiError,
  toUpperStatus,
} from "../../components/staff_officials/staffOfficialUi";
import { getRoleDashboardData } from "../../services/dashboardService";
import { getSports } from "../../services/sportService";
import {
  getSportStaff,
  getSportStaffApplications,
  updateStaffApplicationStatus,
} from "../../services/sportStaffService";

const StaffApplications = () => {
  const [sports, setSports] = useState([]);
  const [selectedSportId, setSelectedSportId] = useState("");
  const [applications, setApplications] = useState([]);
  const [assignedStaff, setAssignedStaff] = useState([]);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [loadingSports, setLoadingSports] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [activeApplication, setActiveApplication] = useState(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [assignedRole, setAssignedRole] = useState("");
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);

  const loadScopedSports = useCallback(async () => {
    setLoadingSports(true);
    setError("");
    try {
      const [allSports, roleData] = await Promise.all([
        getSports(),
        getRoleDashboardData().catch(() => null),
      ]);
      const sportRows = Array.isArray(allSports) ? allSports : [];
      const assignedIds = new Set(
        Array.isArray(roleData?.scope?.sport_ids)
          ? roleData.scope.sport_ids.map((id) => Number(id)).filter((id) => Number.isFinite(id))
          : []
      );

      const scopedSports =
        assignedIds.size > 0
          ? sportRows.filter((sport) => assignedIds.has(Number(sport.id)))
          : [];

      setSports(scopedSports);
      if (scopedSports.length > 0) {
        setSelectedSportId((previous) => {
          if (previous && scopedSports.some((sport) => Number(sport.id) === Number(previous))) {
            return previous;
          }
          return String(scopedSports[0].id);
        });
      } else {
        setSelectedSportId("");
      }
    } catch (apiError) {
      setSports([]);
      setSelectedSportId("");
      setError(summarizeApiError(apiError, "Unable to load assigned sports."));
    } finally {
      setLoadingSports(false);
    }
  }, []);

  const loadApplications = useCallback(async (sportId) => {
    if (!sportId) {
      setApplications([]);
      setAssignedStaff([]);
      return;
    }
    setLoadingRows(true);
    setError("");
    try {
      const [appsPayload, staffPayload] = await Promise.all([
        getSportStaffApplications(sportId),
        getSportStaff(sportId),
      ]);
      setApplications(Array.isArray(appsPayload?.items) ? appsPayload.items : []);
      setAssignedStaff(Array.isArray(staffPayload?.items) ? staffPayload.items : []);
    } catch (apiError) {
      setApplications([]);
      setAssignedStaff([]);
      setError(
        summarizeApiError(
          apiError,
          "You are not authorized to review applications for this sport."
        )
      );
    } finally {
      setLoadingRows(false);
    }
  }, []);

  useEffect(() => {
    loadScopedSports();
  }, [loadScopedSports]);

  useEffect(() => {
    if (!selectedSportId) return;
    loadApplications(selectedSportId);
  }, [loadApplications, selectedSportId]);

  const filteredApplications = useMemo(() => {
    if (statusFilter === "ALL") return applications;
    return applications.filter((row) => toUpperStatus(row.status) === statusFilter);
  }, [applications, statusFilter]);

  const counts = useMemo(() => {
    const next = { PENDING: 0, APPROVED: 0, ASSIGNED: 0, REJECTED: 0, CANCELLED: 0 };
    for (const row of applications) {
      const key = toUpperStatus(row.status);
      if (next[key] !== undefined) next[key] += 1;
    }
    return next;
  }, [applications]);

  const tabs = STAFF_STATUS_OPTIONS.map((statusKey) => ({
    id: statusKey,
    label: statusKey === "ALL" ? "All" : STAFF_STATUS_LABELS[statusKey] || statusKey,
    badge:
      statusKey === "ALL"
        ? applications.length
        : counts[statusKey] ?? 0,
  }));

  const openReviewModal = (application) => {
    setActiveApplication(application);
    setDecisionNote(application?.decision_note || "");
    setAssignedRole(application?.preferred_role || "Official");
  };

  const closeReviewModal = () => {
    if (isSubmittingDecision) return;
    setActiveApplication(null);
    setDecisionNote("");
    setAssignedRole("");
  };

  const submitDecision = async (newStatus) => {
    if (!activeApplication) return;
    if ((newStatus === "APPROVED" || newStatus === "ASSIGNED") && !String(assignedRole || "").trim()) {
      setError("Assigned role is required for approval/assignment.");
      return;
    }

    setIsSubmittingDecision(true);
    setError("");
    setMessage("");
    try {
      const payload = {
        new_status: newStatus,
        decision_note: String(decisionNote || "").trim() || null,
      };
      if (newStatus === "APPROVED" || newStatus === "ASSIGNED") {
        payload.assigned_role = String(assignedRole || "").trim();
      }
      await updateStaffApplicationStatus(activeApplication.id, payload);
      setMessage(`Application moved to ${newStatus}.`);
      closeReviewModal();
      await loadApplications(selectedSportId);
    } catch (apiError) {
      setError(summarizeApiError(apiError, "Failed to update application status."));
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  return (
    <div className="os-page-shell">
      <PageHeaderCard
        title="Staff Applications"
        subtitle="Review staff and official applications for your assigned sports."
        breadcrumbs="Sports Facilitator / Staff Applications"
        icon={ClipboardList}
        action={
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
        }
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
        <LoadingState message="Loading sports scope..." />
      ) : sports.length === 0 ? (
        <EmptyState
          title="No assigned sports"
          message="No facilitator sport assignments were found for this account."
        />
      ) : (
        <>
          <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Pending Applications" value={counts.PENDING} icon={ClipboardList} color="orange" />
            <MetricCard title="Approved Staff" value={counts.APPROVED} icon={ShieldCheck} color="blue" />
            <MetricCard title="Assigned Officials" value={assignedStaff.length} icon={UserCheck} color="green" />
            <MetricCard title="Rejected Applications" value={counts.REJECTED} icon={UserX} color="red" />
          </section>

          <DashboardCard>
            <SectionTabs tabs={tabs} activeTab={statusFilter} onChange={setStatusFilter} />
            {loadingRows ? (
              <LoadingState message="Loading staff applications..." />
            ) : filteredApplications.length === 0 ? (
              <EmptyState
                title="No staff applications yet"
                message="No pending applications for this sport."
              />
            ) : (
              <DataTable
                columns={[
                  {
                    header: "Applicant",
                    accessor: "applicant_name",
                    render: (row) => (
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {row.applicant_name || "Unknown user"}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{row.applicant_email || "-"}</p>
                      </div>
                    ),
                  },
                  {
                    header: "Department",
                    accessor: "applicant_department",
                    render: (row) => row.applicant_department || row.department_id || "-",
                  },
                  {
                    header: "Sport",
                    accessor: "sport_name",
                    render: (row) => row.sport_name || "Unassigned sport",
                  },
                  {
                    header: "Preferred Role",
                    accessor: "preferred_role",
                    render: (row) => row.preferred_role || "-",
                  },
                  {
                    header: "Status",
                    accessor: "status",
                    render: (row) => {
                      const status = toUpperStatus(row.status);
                      return <StatusBadge status={status} customLabel={STAFF_STATUS_LABELS[status] || status} />;
                    },
                  },
                  {
                    header: "Submitted",
                    accessor: "created_at",
                    render: (row) => formatDateTime(row.created_at),
                  },
                  {
                    header: "Actions",
                    accessor: "actions",
                    className: "text-right",
                    cellClassName: "text-right",
                    render: (row) => (
                      <button
                        type="button"
                        onClick={() => openReviewModal(row)}
                        className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20"
                      >
                        Review
                      </button>
                    ),
                  },
                ]}
                data={filteredApplications}
              />
            )}
          </DashboardCard>
        </>
      )}

      <AppModal
        open={Boolean(activeApplication)}
        onClose={closeReviewModal}
        title="Application Details"
        subtitle="Review applicant details and submit your decision."
        maxWidthClass="max-w-4xl"
      >
        {!activeApplication ? null : (
          <div className="space-y-5">
            <section className="grid gap-4 md:grid-cols-2">
              <DashboardCard className="p-4">
                <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Applicant Information</h3>
                <div className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
                  <p><span className="font-medium text-slate-500 dark:text-slate-400">Name:</span> {activeApplication.applicant_name || "-"}</p>
                  <p><span className="font-medium text-slate-500 dark:text-slate-400">Email:</span> {activeApplication.applicant_email || "-"}</p>
                  <p><span className="font-medium text-slate-500 dark:text-slate-400">Department:</span> {activeApplication.applicant_department || "-"}</p>
                </div>
              </DashboardCard>
              <DashboardCard className="p-4">
                <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Application Details</h3>
                <div className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
                  <p><span className="font-medium text-slate-500 dark:text-slate-400">Sport:</span> {getSportDisplayName(activeApplication, "-")}</p>
                  <p><span className="font-medium text-slate-500 dark:text-slate-400">Preferred Role:</span> {activeApplication.preferred_role || "-"}</p>
                  <p><span className="font-medium text-slate-500 dark:text-slate-400">Status:</span> <StatusBadge status={toUpperStatus(activeApplication.status)} /></p>
                  <p><span className="font-medium text-slate-500 dark:text-slate-400">Submitted:</span> {formatDateTime(activeApplication.created_at)}</p>
                </div>
              </DashboardCard>
            </section>

            <DashboardCard className="p-4">
              <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {splitSkills(activeApplication.skills).length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No skills provided.</p>
                ) : (
                  splitSkills(activeApplication.skills).map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    >
                      {skill}
                    </span>
                  ))
                )}
              </div>
            </DashboardCard>

            <DashboardCard className="p-4">
              <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Availability</h3>
              <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
                {activeApplication.availability || "-"}
              </p>
            </DashboardCard>

            <DashboardCard className="p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Decision Panel</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Assigned Role
                  <select
                    value={assignedRole}
                    onChange={(event) => setAssignedRole(event.target.value)}
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
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Decision Note
                  <textarea
                    rows={3}
                    value={decisionNote}
                    onChange={(event) => setDecisionNote(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    placeholder="Add optional decision note."
                  />
                </label>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={isSubmittingDecision}
                  onClick={() => submitDecision("APPROVED")}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmittingDecision ? "Saving..." : "Approve"}
                </button>
                <button
                  type="button"
                  disabled={isSubmittingDecision}
                  onClick={() => submitDecision("ASSIGNED")}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmittingDecision ? "Saving..." : "Assign"}
                </button>
                <button
                  type="button"
                  disabled={isSubmittingDecision}
                  onClick={() => submitDecision("REJECTED")}
                  className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmittingDecision ? "Saving..." : "Reject"}
                </button>
              </div>
            </DashboardCard>
          </div>
        )}
      </AppModal>
    </div>
  );
};

export default StaffApplications;
