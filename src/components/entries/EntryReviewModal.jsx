import { useRef } from "react";
import AppModal from "../common/AppModal";
import { TeamLogo } from "../common/IdentityImage";

const EntryReviewModal = ({
  open,
  entry,
  action = "",
  decisionNote = "",
  onDecisionNoteChange,
  onClose,
  onSubmit,
  busy = false,
  error = "",
  issues = [],
}) => {
  const textareaRef = useRef(null);
  const normalizedAction = String(action || "").toUpperCase();
  const isReject = normalizedAction === "REJECT";
  const isRevision = normalizedAction === "REQUEST_REVISION";
  const title = isReject ? "Reject entry" : isRevision ? "Request changes" : "Approve entry";
  const subtitle = isReject
    ? "Closes this submission so it cannot proceed."
    : isRevision
      ? "Returns the entry to the submitter for correction and resubmission."
      : "Confirms that this entry can proceed to bracket and match setup.";

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      maxWidthClass="max-w-lg"
      initialFocusRef={textareaRef}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <TeamLogo imageUrl={entry?.logo_url} label={entry?.entry_name} scale="lg" className="shrink-0" />
          <p className="min-w-0 break-words font-semibold text-slate-900 dark:text-slate-100">{entry?.entry_name || "Entry"}</p>
        </div>
        <div className="text-sm">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
            <dt className="text-slate-500 dark:text-slate-400">Entry</dt>
            <dd className="break-words font-semibold text-slate-900 dark:text-slate-100">{entry?.entry_name || "-"}</dd>
            <dt className="text-slate-500 dark:text-slate-400">Type</dt>
            <dd>{entry?.participantShapeLabel || "-"}</dd>
            <dt className="text-slate-500 dark:text-slate-400">Sport</dt>
            <dd>{entry?.sportLabel || "-"}</dd>
            <dt className="text-slate-500 dark:text-slate-400">Department</dt>
            <dd className="break-words">{entry?.departmentLabel || "-"}</dd>
          </dl>
          {entry?.participantShapeLabel !== "Team" ? (
            <p className="mt-3 text-slate-600 dark:text-slate-300"><span className="font-semibold">Participants:</span> {entry?.memberSummary || "-"}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="competition-entry-decision-note" className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {isReject ? "Reason for rejection" : isRevision ? "Changes required" : "Review note (optional)"}
          </label>
          <textarea
            id="competition-entry-decision-note"
            ref={textareaRef}
            rows={4}
            value={decisionNote}
            onChange={(event) => onDecisionNoteChange?.(event.target.value)}
            placeholder={
              isReject
                ? "Explain why this entry is being rejected."
                : isRevision
                  ? "Clearly state what the submitter must correct."
                  : "Add a short internal note if needed."
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
            {error}
          </div>
        ) : null}

        {issues.length > 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/40 dark:bg-amber-500/10">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
              Validation issues
            </p>
            <div className="mt-2 space-y-2">
              {issues.map((issue, index) => (
                <div
                  key={`${issue.code || "issue"}-${index}`}
                  className="rounded-lg border border-amber-200 bg-white/70 px-3 py-2 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-slate-900/30 dark:text-amber-100"
                >
                  <p className="font-semibold">{issue.message || issue.code || "Validation issue"}</p>
                  {issue.field ? <p className="mt-1 opacity-80">Field: {issue.field}</p> : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={busy}
            className={`rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${
              isReject ? "bg-rose-600 hover:bg-rose-500" : isRevision ? "bg-amber-600 hover:bg-amber-500" : "bg-emerald-600 hover:bg-emerald-500"
            }`}
          >
            {busy ? "Saving..." : isReject ? "Reject entry" : isRevision ? "Request changes" : "Approve entry"}
          </button>
        </div>
      </div>
    </AppModal>
  );
};

export default EntryReviewModal;
