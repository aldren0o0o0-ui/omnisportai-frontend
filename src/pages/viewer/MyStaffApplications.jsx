import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText } from "lucide-react";
import AppModal from "../../components/common/AppModal";
import PageHeaderCard from "../../components/common/PageHeaderCard";
import DashboardCard from "../../components/common/DashboardCard";
import DataTable from "../../components/common/DataTable";
import EmptyState from "../../components/common/EmptyState";
import LoadingState from "../../components/common/LoadingState";
import StatusBadge from "../../components/common/StatusBadge";
import {
  STAFF_STATUS_LABELS,
  formatDateTime,
  summarizeApiError,
  toUpperStatus,
} from "../../components/staff_officials/staffOfficialUi";
import {
  cancelStaffApplication,
  getMyStaffApplications,
} from "../../services/sportStaffService";

const MyStaffApplications = () => {
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [cancellingId, setCancellingId] = useState(null);
  const [cancelModal, setCancelModal] = useState({
    open: false,
    applicationId: null,
    error: "",
  });

  const loadApplications = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const payload = await getMyStaffApplications();
      setApplications(Array.isArray(payload?.items) ? payload.items : []);
    } catch (apiError) {
      setApplications([]);
      setError(summarizeApiError(apiError, "Failed to load your staff applications."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const handleCancel = async (applicationId) => {
    setCancellingId(applicationId);
    setActionMessage("");
    setError("");
    try {
      await cancelStaffApplication(applicationId);
      setActionMessage("Application cancelled.");
      setCancelModal({ open: false, applicationId: null, error: "" });
      await loadApplications();
    } catch (apiError) {
      const message = summarizeApiError(apiError, "Failed to cancel application.");
      if (String(message).toLowerCase().includes("only pending")) {
        const normalized = "Only pending applications can be cancelled.";
        setError(normalized);
        setCancelModal((prev) => ({ ...prev, error: normalized }));
      } else {
        setError(message);
        setCancelModal((prev) => ({ ...prev, error: message }));
      }
    } finally {
      setCancellingId(null);
    }
  };

  const counts = useMemo(() => {
    const next = { PENDING: 0, APPROVED: 0, ASSIGNED: 0, REJECTED: 0, CANCELLED: 0 };
    for (const row of applications) {
      const key = toUpperStatus(row.status);
      if (next[key] !== undefined) next[key] += 1;
    }
    return next;
  }, [applications]);

  return (
    <div className="os-page-shell">
      <PageHeaderCard
        title="My Staff Applications"
        subtitle="Track your staff/official applications and review outcomes."
        breadcrumbs="Viewer / Staff & Officials / My Applications"
        icon={FileText}
      />

      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Object.entries(counts).map(([statusKey, value]) => (
          <DashboardCard key={statusKey} className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {statusKey}
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
          </DashboardCard>
        ))}
      </section>

      {error ? (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      {actionMessage ? (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200">
          {actionMessage}
        </div>
      ) : null}

      <DashboardCard>
        {isLoading ? (
          <LoadingState message="Loading your staff applications..." />
        ) : applications.length === 0 ? (
          <EmptyState
            title="No staff applications yet"
            message="You have not applied as staff or official yet."
          />
        ) : (
          <DataTable
            columns={[
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
                header: "Availability",
                accessor: "availability",
                render: (row) => row.availability || "-",
              },
              {
                header: "Submitted",
                accessor: "created_at",
                render: (row) => formatDateTime(row.created_at),
              },
              {
                header: "Decision Note",
                accessor: "decision_note",
                render: (row) => row.decision_note || "-",
              },
              {
                header: "Actions",
                accessor: "actions",
                className: "text-right",
                cellClassName: "text-right",
                render: (row) => {
                  const status = toUpperStatus(row.status);
                  if (status !== "PENDING") {
                    return <span className="text-xs text-slate-400">No actions</span>;
                  }
                  return (
                    <button
                      type="button"
                      disabled={cancellingId === row.id}
                      onClick={() => setCancelModal({ open: true, applicationId: row.id, error: "" })}
                      className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/20"
                    >
                      {cancellingId === row.id ? "Cancelling..." : "Cancel"}
                    </button>
                  );
                },
              },
            ]}
            data={applications}
          />
        )}
      </DashboardCard>

      <AppModal
        open={cancelModal.open}
        onClose={() => {
          if (cancellingId) return;
          setCancelModal({ open: false, applicationId: null, error: "" });
        }}
        title="Cancel staff application?"
        subtitle="This will withdraw your pending staff application."
        maxWidthClass="max-w-xl"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Are you sure you want to cancel this staff application?
          </p>
          {cancelModal.error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
              {cancelModal.error}
            </div>
          ) : null}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCancelModal({ open: false, applicationId: null, error: "" })}
              disabled={Boolean(cancellingId)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleCancel(cancelModal.applicationId)}
              disabled={Boolean(cancellingId) || !cancelModal.applicationId}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-60"
            >
              {cancellingId ? "Cancelling..." : "Confirm Cancel"}
            </button>
          </div>
        </div>
      </AppModal>
    </div>
  );
};

export default MyStaffApplications;
