import React from 'react';
import AppModal from "../../../components/common/AppModal";
import { resolveProfileUserId } from "../../../components/profile";

export default function ApplicationDetailsModal({
  applicationDetailModal,
  formatDateTime,
  openUserProfileDrawer,
  setApplicationDetailModal
}) {
  return (
    <AppModal
      open={applicationDetailModal.open}
      onClose={() => setApplicationDetailModal({ open: false, row: null })}
      title="Application Details"
      subtitle="Review applicant profile and submission details"
      maxWidthClass="max-w-3xl"
    >
      <div className="grid gap-4 md:grid-cols-2 text-sm text-slate-700 dark:text-slate-300">
        <div className="min-w-0 break-words rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-[var(--surface-soft)]/60">
          <p>
            <span className="font-semibold">Applicant:</span> {applicationDetailModal.row?.applicant_name || "Unknown user"}
            {resolveProfileUserId(applicationDetailModal.row?.applicant_id, applicationDetailModal.row?.user_id) ? (
              <button
                type="button"
                onClick={() => openUserProfileDrawer(applicationDetailModal.row?.applicant_id || applicationDetailModal.row?.user_id)}
                className="ml-2 text-xs font-semibold text-blue-700 hover:text-blue-600 dark:text-blue-300 dark:hover:text-blue-200"
              >
                View Profile
              </button>
            ) : null}
          </p>
          <p className="min-w-0 break-all"><span className="font-semibold">Email:</span> {applicationDetailModal.row?.applicant_email || "-"}</p>
          <p><span className="font-semibold">Department:</span> {applicationDetailModal.row?.department_name || applicationDetailModal.row?.department_id || "-"}</p>
          <p><span className="font-semibold">Status:</span> {applicationDetailModal.row?.application_status || "-"}</p>
          <p><span className="font-semibold">Submitted:</span> {formatDateTime(applicationDetailModal.row?.created_at)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-[var(--surface-soft)]/60">
          <p><span className="font-semibold">Position:</span> {applicationDetailModal.row?.position || "-"}</p>
          <p><span className="font-semibold">Availability:</span> {applicationDetailModal.row?.availability || "-"}</p>
          <p><span className="font-semibold">Experience:</span> {applicationDetailModal.row?.experience || "-"}</p>
          <p><span className="font-semibold">Skills:</span> {applicationDetailModal.row?.skills || "-"}</p>
          <p><span className="font-semibold">Reason:</span> {applicationDetailModal.row?.reason || "-"}</p>
        </div>
      </div>
    </AppModal>
  );
}
