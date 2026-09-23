import DashboardCard from "../../../components/common/DashboardCard";
import EmptyState from "../../../components/common/EmptyState";
import { HeartPulse, CheckCircle2, Clock } from "lucide-react";
import { getMedicalCertificateStatus } from "./recruitmentWorkflow";

/**
 * Section 8 — Medical Certificate Progress.
 * Tracks roster compliance: submitted / waiting / progress. Lists players still
 * still need action without repeating the accepted-player names already shown
 * in the recruitment table. Submitted-vs-waiting is derived the same way the backend decides it
 * (presence of a certificate attachment in health_notes).
 *
 * Not rendered for pool workspaces (pools have no medical requirement) — the
 * container guards on groupType.
 */
const MedicalCertificateProgress = ({ players = [], className = "" }) => {
  const total = players.length;
  const waiting = players.filter((row) => getMedicalCertificateStatus(row) !== "RECEIVED");
  const awaitingUpload = waiting.filter((row) => getMedicalCertificateStatus(row) === "NOT_SUBMITTED").length;
  const awaitingReview = waiting.filter((row) => getMedicalCertificateStatus(row) === "PENDING").length;
  const needsResubmission = waiting.filter((row) => getMedicalCertificateStatus(row) === "REJECTED").length;
  const received = total - waiting.length;
  const pct = total > 0 ? Math.round((received / total) * 100) : 0;

  return (
    <DashboardCard className={className}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Medical Certificate Progress
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Every accepted player needs a medical certificate before the team can be submitted.
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {received} / {total}
          </p>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Received
          </p>
        </div>
      </div>

      {total === 0 ? (
        <EmptyState
          icon={HeartPulse}
          title="Waiting for player selection"
          message="Once you select players for the roster, their medical certificate status will appear here."
        />
      ) : (
        <>
          <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>

          {waiting.length === 0 ? (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-300">
              <CheckCircle2 size={16} />
              All accepted players have received medical certificate clearance.
            </div>
          ) : (
            <div className="rounded-xl bg-amber-50 px-4 py-3 dark:bg-amber-900/15">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-amber-700 dark:text-amber-300">
                <Clock size={14} />
                {waiting.length} medical certificate{waiting.length === 1 ? "" : "s"} still need clearance
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {[
                  awaitingUpload ? `${awaitingUpload} awaiting upload` : null,
                  awaitingReview ? `${awaitingReview} ready for Coach review` : null,
                  needsResubmission ? `${needsResubmission} awaiting resubmission` : null,
                ].filter(Boolean).join(" · ")}.
                Review individual status in the accepted-player list above.
              </p>
            </div>
          )}
        </>
      )}
    </DashboardCard>
  );
};

export default MedicalCertificateProgress;
