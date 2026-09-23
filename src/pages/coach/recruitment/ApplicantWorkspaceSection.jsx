import { useEffect, useMemo, useState } from "react";
import DataTable from "../../../components/common/DataTable";
import AppModal from "../../../components/common/AppModal";
import StatusBadge from "../../../components/common/StatusBadge";
import EmptyState from "../../../components/common/EmptyState";
import {
  Search,
  UserPlus,
  Users,
  CalendarClock,
  Send,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { resolveMediaUrl } from "../../../utils/media";
import {
  extractMedicalCertificateUrl,
  getMedicalCertificateStatus,
  isTryoutDone,
} from "./recruitmentWorkflow";

const PAGE_SIZE = 10;
const toUpper = (value) => String(value || "").trim().toUpperCase();

const newestFirst = (left, right) =>
  new Date(right?.created_at || 0).getTime() - new Date(left?.created_at || 0).getTime();

const formatDate = (value, withTime = true) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
};

// Compact strip label: "5 June - 14:30".
const formatStripDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const day = date.toLocaleDateString(undefined, { day: "numeric", month: "long" });
  const time = date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${day} - ${time}`;
};

// Status options shown in the dropdown, per active tab.
const APPLICANT_STATUS_OPTIONS = [
  { value: "ALL", label: "All stages" },
  { value: "FOR_TRYOUT", label: "Awaiting tryout" },
  { value: "REJECTED", label: "Not selected" },
  { value: "CANCELLED", label: "Withdrawn" },
];
const ROSTER_STATUS_OPTIONS = [
  { value: "ALL", label: "All medical statuses" },
  { value: "RECEIVED", label: "Received" },
  { value: "PENDING", label: "Waiting for review" },
  { value: "REJECTED", label: "Needs resubmission" },
  { value: "WAITING", label: "Medical waiting" },
];

/**
 * Applicant Management (V2) — tabbed view of the recruitment pool. A toggle
 * switches between "Applicants" (the recruitment pool) and "Accepted Roster"
 * (selected players). The tryout date strip sits above the table (with a View
 * Schedule action), and the team submit button sits below the roster table.
 *
 * Default tab: Accepted Roster when any players exist, otherwise Applicants
 * (the coach can always switch).
 */
const ApplicantWorkspaceSection = ({
  workspace,
  applicants = [],
  acceptedPlayers = [],
  schedule = null,
  rowDecisionBusyId = null,
  submitBusy = false,
  canManage = true,
  submitLabel = "Submit Team Registration",
  onRowDecision,
  onFinalizeRoster,
  onOpenDetail,
  onOpenProfile,
  onMedicalReview,
  medicalReviewBusyId = null,
  onViewSchedule,
  onScheduleTryout,
  onSubmit,
  className = "",
}) => {
  const poolRows = useMemo(
    () =>
      applicants
        .filter((row) => ["FOR_TRYOUT", "REJECTED", "CANCELLED"].includes(toUpper(row?.application_status)))
        .sort(newestFirst),
    [applicants]
  );
  const forTryoutCount = useMemo(
    () => applicants.filter((row) => toUpper(row?.application_status) === "FOR_TRYOUT").length,
    [applicants]
  );

  const [tab, setTab] = useState("applicants");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [submitError, setSubmitError] = useState("");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState([]);
  const [finalizeModalOpen, setFinalizeModalOpen] = useState(false);
  const [finalizeError, setFinalizeError] = useState("");

  // Default tab follows whether a roster exists; re-evaluated per workspace.
  useEffect(() => {
    setTab(acceptedPlayers.length > 0 ? "roster" : "applicants");
    setSearch("");
    setStatusFilter("ALL");
    setPage(1);
    setSubmitError("");
    setSelectedPlayerIds([]);
    setFinalizeModalOpen(false);
    setFinalizeError("");
  }, [workspace?.groupKey, acceptedPlayers.length]);

  useEffect(() => {
    setPage(1);
    setStatusFilter("ALL");
  }, [tab]);

  const tryoutDone = isTryoutDone(schedule);
  const usesDraftRosterSelection = Boolean(workspace?.groupType);
  const minimumPlayers = workspace?.groupType === "pool"
    ? (toUpper(workspace?.participantShape) === "DUO" ? 2 : 1)
    : Number(workspace?.rosterInfo?.minPlayers || 0) || 1;
  const maximumPlayers = workspace?.groupType === "pool"
    ? (Number(workspace?.selectionMaxPlayers || 0) || null)
    : (Number(workspace?.rosterInfo?.maxPlayers || 0) || null);
  const officialPlayerCount = acceptedPlayers.length;
  const prospectivePlayerCount = officialPlayerCount + selectedPlayerIds.length;
  const selectionAtMaximum = maximumPlayers !== null && prospectivePlayerCount >= maximumPlayers;
  const canFinalizeSelection =
    selectedPlayerIds.length > 0 &&
    prospectivePlayerCount >= minimumPlayers &&
    (maximumPlayers === null || prospectivePlayerCount <= maximumPlayers) &&
    (workspace?.groupType !== "pool" || toUpper(workspace?.participantShape) !== "DUO" || prospectivePlayerCount % 2 === 0);
  const selectedRows = useMemo(
    () => applicants.filter((row) => selectedPlayerIds.includes(Number(row?.id))),
    [applicants, selectedPlayerIds]
  );

  const togglePlayerSelection = (row) => {
    const applicationId = Number(row?.id || 0);
    if (!applicationId) return;
    setSelectedPlayerIds((current) => {
      if (current.includes(applicationId)) return current.filter((id) => id !== applicationId);
      if (maximumPlayers !== null && officialPlayerCount + current.length >= maximumPlayers) return current;
      return [...current, applicationId];
    });
  };

  const confirmFinalRoster = async () => {
    setFinalizeError("");
    try {
      await onFinalizeRoster?.(selectedRows);
      setSelectedPlayerIds([]);
      setFinalizeModalOpen(false);
    } catch (error) {
      setFinalizeError(error?.response?.data?.detail || "Unable to finalize this roster.");
    }
  };

  const matchesSearch = (row) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    const haystack = `${row?.applicant_name || ""} ${row?.applicant_email || ""} ${row?.position || ""}`.toLowerCase();
    return haystack.includes(term);
  };

  const filteredRows = useMemo(() => {
    if (tab === "roster") {
      return acceptedPlayers.filter((row) => {
        if (!matchesSearch(row)) return false;
        if (statusFilter === "ALL") return true;
        const medicalStatus = getMedicalCertificateStatus(row);
        if (statusFilter === "WAITING") return medicalStatus === "NOT_SUBMITTED";
        return medicalStatus === statusFilter;
      });
    }
    return poolRows.filter((row) => {
      if (!matchesSearch(row)) return false;
      if (statusFilter === "ALL") return true;
      return toUpper(row?.application_status) === statusFilter;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, acceptedPlayers, poolRows, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Friendly "Current Stage" label for an applicant row.
  const stageBadge = (row) => {
    const status = toUpper(row?.application_status);
    if (status === "FOR_TRYOUT") {
      if (!schedule)
        return <StatusBadge status="PENDING" customLabel="Awaiting tryout" />;
      return tryoutDone ? (
        <StatusBadge status="FOR_TRYOUT" customLabel="Ready to select" />
      ) : (
        <StatusBadge status="SCHEDULED" customLabel="Tryout scheduled" />
      );
    }
    if (status === "REJECTED") return <StatusBadge status="REJECTED" customLabel="Not selected" />;
    if (status === "CANCELLED") return <StatusBadge status="CANCELLED" customLabel="Withdrawn" />;
    return <StatusBadge status={row?.application_status} />;
  };

  const playerCell = (row, linkColor = true) => {
    const canViewProfile = Boolean(Number(row?.applicant_id || 0) > 0);
    const imageUrl = row?.applicant_image_url ? resolveMediaUrl(row.applicant_image_url) : "";
    const initial = String(row?.applicant_name || "?").trim().charAt(0).toUpperCase() || "?";
    return (
      <button
        type="button"
        onClick={() => canViewProfile && onOpenProfile?.(row.applicant_id)}
        disabled={!canViewProfile}
        className="flex items-center gap-3 text-left enabled:cursor-pointer disabled:cursor-default"
        title={canViewProfile ? "View profile" : undefined}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={row?.applicant_name || "Applicant"}
            className="h-8 w-8 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-200">
            {initial}
          </span>
        )}
        <div className="min-w-0">
          <div
            className={`truncate font-semibold ${
              canViewProfile && linkColor
                ? "text-blue-700 hover:text-blue-600 dark:text-blue-300 dark:hover:text-blue-200"
                : "text-slate-900 dark:text-white"
            }`}
          >
            {row?.applicant_name || "Unknown user"}
          </div>
          <div className="truncate text-xs text-slate-500 dark:text-slate-400">
            {row?.applicant_email || "-"}
          </div>
        </div>
      </button>
    );
  };

  const applicantColumns = [
    { header: "Player", accessor: "applicant_name", render: (row) => playerCell(row) },
    { header: "Preferred Position", accessor: "position", render: (row) => row?.position || "-" },
    { header: "Applied", accessor: "created_at", render: (row) => formatDate(row?.created_at) },
    { header: "Current Stage", accessor: "application_status", render: (row) => stageBadge(row) },
    {
      header: "Actions",
      accessor: "actions",
      className: "text-right",
      cellClassName: "text-right",
      render: (row) => {
        const isForTryout = toUpper(row?.application_status) === "FOR_TRYOUT";
        const busy = rowDecisionBusyId === row?.id;
        const isSelected = selectedPlayerIds.includes(Number(row?.id));
        if (!isForTryout || !canManage) {
          return (
            <button
              type="button"
              onClick={() => onOpenDetail?.(row)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              View Profile
            </button>
          );
        }
        const disabledReason = !schedule
          ? "Schedule a tryout first"
          : !tryoutDone
            ? "Available after the tryout date"
            : "";
        return (
          <div className="flex items-center justify-end gap-2" title={disabledReason || undefined}>
            <button
              type="button"
              onClick={() => onOpenDetail?.(row)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              View Profile
            </button>
            <button
              type="button"
              disabled={!tryoutDone || busy || (usesDraftRosterSelection && selectionAtMaximum && !isSelected)}
              onClick={() => usesDraftRosterSelection ? togglePlayerSelection(row) : onRowDecision?.(row, "ACCEPTED_AS_PLAYER")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                isSelected
                  ? "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                  : "bg-emerald-600 text-white hover:bg-emerald-500"
              }`}
            >
              {busy ? "..." : isSelected ? "Unselect" : selectionAtMaximum && usesDraftRosterSelection ? "Roster full" : "Select Player"}
            </button>
            <button
              type="button"
              disabled={!tryoutDone || busy}
              onClick={() => onRowDecision?.(row, "REJECTED")}
              className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "..." : "Reject"}
            </button>
          </div>
        );
      },
    },
  ];

  const rosterColumns = [
    { header: "Player", accessor: "applicant_name", render: (row) => playerCell(row, false) },
    { header: "Position", accessor: "position", render: (row) => row?.position || "-" },
  ];
  rosterColumns.push({
    header: "Medical Status",
    accessor: "medical",
    render: (row) => {
      const url = extractMedicalCertificateUrl(row?.health_notes);
      const medicalStatus = getMedicalCertificateStatus(row);
      if (url) {
        const label =
          medicalStatus === "RECEIVED"
            ? "Received"
            : medicalStatus === "REJECTED"
              ? "Needs resubmission"
              : "Waiting for review";
        const busy = medicalReviewBusyId === row?.id;
        return (
          <div className="flex flex-col gap-1.5">
            <StatusBadge
              status={medicalStatus === "RECEIVED" ? "APPROVED" : medicalStatus === "REJECTED" ? "REJECTED" : "PENDING"}
              customLabel={label}
            />
            <a
              href={resolveMediaUrl(url)}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-blue-700 hover:text-blue-600 dark:text-blue-300 dark:hover:text-blue-200"
            >
              Open certificate
            </a>
            {canManage ? (
              <div className="flex flex-wrap gap-1.5">
                {medicalStatus !== "RECEIVED" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onMedicalReview?.(row, "RECEIVED")}
                    className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-300"
                  >
                    {busy ? "Saving..." : "Receive"}
                  </button>
                ) : null}
                {medicalStatus !== "REJECTED" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onMedicalReview?.(row, "REJECTED")}
                    className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-300"
                  >
                    {busy ? "Saving..." : "Reject file"}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      }
      return <StatusBadge status="PENDING" customLabel="Waiting for upload" />;
    },
  });
  rosterColumns.push({
    header: "Accepted Date",
    accessor: "decision_at",
    render: (row) => formatDate(row?.decision_at || row?.updated_at || row?.created_at, false),
  });
  rosterColumns.push({
    header: "Actions",
    accessor: "actions",
    className: "text-right",
    cellClassName: "text-right",
    render: (row) => (
      <button
        type="button"
        onClick={() => onOpenDetail?.(row)}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        View Profile
      </button>
    ),
  });

  const statusOptions = tab === "roster" ? ROSTER_STATUS_OPTIONS : APPLICANT_STATUS_OPTIONS;

  const isReady = Boolean(workspace?.isReady);
  const isLocked = Boolean(workspace?.isLocked);
  const reasons = Array.isArray(workspace?.missingReasons) ? workspace.missingReasons : [];
  const readinessMessage =
    reasons.length > 0
      ? reasons.join(" ")
      : "Complete the remaining recruitment steps before submitting to the sports facilitator.";
  const visibleSubmitError = submitError || (!isReady && !isLocked ? readinessMessage : "");

  const handleSubmitClick = () => {
    if (!isReady) {
      setSubmitError(readinessMessage);
      return;
    }
    setSubmitError("");
    onSubmit?.();
  };

  return (
    <section className={`space-y-4 ${className}`}>
      {/* Header: tabs (left), filters (right) */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-800/50">
          <button
            type="button"
            onClick={() => setTab("applicants")}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              tab === "applicants"
                ? "bg-white text-blue-700 shadow-sm dark:bg-slate-900 dark:text-blue-300"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            }`}
          >
            Applicants
            <span className="rounded-full bg-slate-200 px-1.5 text-xs font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
              {forTryoutCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTab("roster")}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              tab === "roster"
                ? "bg-white text-blue-700 shadow-sm dark:bg-slate-900 dark:text-blue-300"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            }`}
          >
            Accepted Roster
            <span className="rounded-full bg-slate-200 px-1.5 text-xs font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
              {acceptedPlayers.length}
            </span>
          </button>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <div className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name or position"
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-8 pr-3 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:w-56"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            {statusOptions.map((option) => (
              <option key={`status-${option.value}`} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tryout date strip — schedule summary + View Schedule, above the table */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-800/40">
        <div className="flex items-center gap-2 text-sm">
          <CalendarClock size={16} className="text-blue-600 dark:text-blue-400" />
          {schedule ? (
            <span className="text-slate-700 dark:text-slate-200">
              Tryout {tryoutDone ? "held" : "scheduled"} ·{" "}
              <span className="font-semibold">{formatStripDate(schedule.scheduled_date)}</span>
              {schedule.venue_name ? <span className="text-slate-500 dark:text-slate-400"> · {schedule.venue_name}</span> : null}
            </span>
          ) : (
            <span className="text-slate-600 dark:text-slate-300">No tryout scheduled yet.</span>
          )}
        </div>
        {canManage ? (
          schedule ? (
            <button
              type="button"
              onClick={() => onViewSchedule?.()}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              View Schedule
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onScheduleTryout?.()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-500"
            >
              <CalendarClock size={13} />
              Schedule Tryout
            </button>
          )
        ) : null}
      </div>

      {/* Table */}
      {tab === "applicants" ? (
        applicants.length === 0 ? (
          <EmptyState
            icon={UserPlus}
            title="No applicants yet"
            message="Players will appear here once they apply. Share your tournament so athletes can submit their applications."
          />
        ) : pageRows.length === 0 ? (
          <EmptyState
            title="No applicants match your filters"
            message="Try clearing the search or choosing a different stage."
          />
        ) : (
          <DataTable columns={applicantColumns} data={pageRows} keyExtractor={(row) => `applicant-${row.id}`} />
        )
      ) : acceptedPlayers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No accepted players yet"
          message="Select players after the tryout to begin building your official roster."
        />
      ) : pageRows.length === 0 ? (
        <EmptyState
          title="No players match your filters"
          message="Try clearing the search or choosing a different status."
        />
      ) : (
        <DataTable columns={rosterColumns} data={pageRows} keyExtractor={(row) => `roster-${row.id}`} />
      )}

      {usesDraftRosterSelection && selectedPlayerIds.length > 0 && canManage ? (
        <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {selectedPlayerIds.length} selected · {prospectivePlayerCount}{maximumPlayers ? ` of ${maximumPlayers}` : ""} roster places
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {canFinalizeSelection
                ? "Review the selected players before committing the final roster."
                : `Select ${Math.max(0, minimumPlayers - prospectivePlayerCount)} more player(s) to reach the minimum of ${minimumPlayers}.`}
            </p>
          </div>
          <button
            type="button"
            disabled={!canFinalizeSelection || rowDecisionBusyId === "finalize-roster"}
            onClick={() => setFinalizeModalOpen(true)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Review final roster
          </button>
        </div>
      ) : null}

      <AppModal
        open={finalizeModalOpen}
        onClose={() => rowDecisionBusyId !== "finalize-roster" && setFinalizeModalOpen(false)}
        title="Finalize roster"
        subtitle={`Review the players selected for ${workspace?.teamName || "this team"}.`}
        maxWidthClass="max-w-xl"
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-200">
            Final roster: {prospectivePlayerCount}{maximumPlayers ? ` of ${maximumPlayers}` : ""} players · Minimum {minimumPlayers}
          </div>
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {selectedRows.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{row.applicant_name}</p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">{row.position || "Roster player"}</p>
                </div>
                <button type="button" onClick={() => togglePlayerSelection(row)} className="text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
                  Unselect
                </button>
              </li>
            ))}
          </ul>
          {finalizeError ? <p role="alert" className="text-sm text-rose-600 dark:text-rose-300">{finalizeError}</p> : null}
          <div className="flex justify-end gap-2">
            <button type="button" disabled={rowDecisionBusyId === "finalize-roster"} onClick={() => setFinalizeModalOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-700">Cancel</button>
            <button type="button" disabled={!canFinalizeSelection || rowDecisionBusyId === "finalize-roster"} onClick={confirmFinalRoster} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {rowDecisionBusyId === "finalize-roster" ? "Finalizing..." : "Finalize roster"}
            </button>
          </div>
        </div>
      </AppModal>

      {/* Pagination */}
      {filteredRows.length > PAGE_SIZE ? (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredRows.length)} of{" "}
            {filteredRows.length}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={safePage <= 1}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <ChevronLeft size={14} />
              Previous
            </button>
            <span className="px-2 text-xs font-medium text-slate-600 dark:text-slate-300">
              Page {safePage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={safePage >= totalPages}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      ) : null}

      {/* Submit (roster tab only) — below the roster table */}
      {tab === "roster" && acceptedPlayers.length > 0 && canManage ? (
        <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
          {isLocked ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <StatusBadge status={workspace?.currentStatus || "SUBMITTED"} />
              <span className="text-slate-600 dark:text-slate-300">
                Already sent for facilitator review.
              </span>
            </div>
          ) : visibleSubmitError ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-900/15">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-700 dark:text-amber-300">
                <AlertTriangle size={15} />
                Not ready to submit yet
              </p>
              <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">{visibleSubmitError}</p>
            </div>
          ) : null}

          <div className="flex items-center justify-end">
            <button
              type="button"
              disabled={submitBusy || isLocked || !isReady}
              onClick={handleSubmitClick}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              title={!isReady && !isLocked ? readinessMessage : undefined}
            >
              <Send size={16} />
              {submitBusy ? "Submitting..." : submitLabel}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default ApplicantWorkspaceSection;
