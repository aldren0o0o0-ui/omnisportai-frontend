import React from "react";

const ConfigLockedModal = ({
  isOpen,
  match,
  onClose,
  onViewDetails,
  onResolveAutomatically,
  onReviewMigration,
  onKeepReadOnly,
  migrationPreview,
  migrationError,
  isResolving = false,
  isReviewing = false,
  canMigrate = false,
}) => {
  if (!isOpen) return null;

  const status = String(match?.config_status || "CONFIG_LOCKED").toUpperCase();
  const isMismatch = status === "CONFIG_MISMATCH";
  const issues = Array.isArray(match?.config_issues) ? match.config_issues : [];
  const reason = String(
    match?.reason
      || (isMismatch ? "Template has changed since match creation." : "Invalid sport template configuration")
  );
  const previewRows = Array.isArray(migrationPreview?.changes_preview) ? migrationPreview.changes_preview : [];
  const previewIssues = Array.isArray(migrationPreview?.issues) ? migrationPreview.issues : [];
  const previewStatus = String(migrationPreview?.status || "").toUpperCase();
  const targetVersion = String(match?.current_template_version || match?.new_version || "").trim();
  const showMigrationActions = isMismatch && canMigrate;
  const keepReadOnly = () => {
    if (typeof onKeepReadOnly === "function") {
      onKeepReadOnly();
      return;
    }
    onClose?.();
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-xl max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-rose-500/40 bg-slate-900 p-4 sm:p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-rose-200">
          {isMismatch ? "Template Mismatch Detected" : "Match Cannot Be Scored"}
        </h3>
        <p className="mt-2 text-sm text-slate-300">
          {isMismatch
            ? "This match was created using an older sport configuration."
            : "This match has an invalid sport configuration."}
        </p>

        <div className="mt-3 rounded-lg border border-slate-700 bg-slate-950/70 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Reason</p>
          <p className="mt-1 text-sm text-slate-200">{reason}</p>
          {issues.length > 0 && (
            <>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Issues</p>
              <ul className="mt-1 space-y-1 text-sm text-rose-200">
                {issues.map((issue, index) => (
                  <li key={`${issue}-${index}`}>- {issue}</li>
                ))}
              </ul>
            </>
          )}
        </div>

        {showMigrationActions && (
          <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-200">Migration Options</p>
            <p className="mt-1 text-xs text-slate-200">
              Target version: {targetVersion || "Unavailable from runtime config"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onResolveAutomatically}
                disabled={isResolving || isReviewing || !targetVersion}
                className="min-h-9 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isResolving ? "Resolving..." : "Resolve Automatically"}
              </button>
              <button
                type="button"
                onClick={onReviewMigration}
                disabled={isResolving || isReviewing || !targetVersion}
                className="min-h-9 rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isReviewing ? "Reviewing..." : "Review Migration"}
              </button>
              <button
                type="button"
                onClick={keepReadOnly}
                className="min-h-9 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-700"
              >
                Keep Read-Only
              </button>
            </div>
            {migrationError ? (
              <div className="mt-3 rounded-md border border-rose-500/40 bg-rose-500/10 p-2 text-xs text-rose-200">
                {migrationError}
              </div>
            ) : null}
            {migrationPreview ? (
              <div className="mt-3 rounded-md border border-slate-700 bg-slate-950/70 p-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Dry Run Status: {previewStatus || "UNKNOWN"}
                </p>
                {previewIssues.length > 0 ? (
                  <ul className="mt-1 space-y-1 text-xs text-rose-200">
                    {previewIssues.map((issue, index) => (
                      <li key={`${issue}-${index}`}>- {issue}</li>
                    ))}
                  </ul>
                ) : null}
                {previewRows.length > 0 ? (
                  <ul className="mt-1 space-y-1 text-xs text-slate-200">
                    {previewRows.slice(0, 8).map((row, index) => {
                      const kind = String(row?.kind || "").toUpperCase();
                      if (kind === "EVENT_TYPE_RENAME") {
                        return (
                          <li key={`preview-${index}`}>
                            - {row?.from || "UNKNOWN"} to {row?.to || "UNKNOWN"}
                            {row?.affected_events ? ` (${row.affected_events} events)` : ""}
                          </li>
                        );
                      }
                      if (kind === "TEMPLATE_VERSION") {
                        return <li key={`preview-${index}`}>- Version {row?.from || "unknown"} to {row?.to || "unknown"}</li>;
                      }
                      return <li key={`preview-${index}`}>- {kind || "CHANGE"} detected</li>;
                    })}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>
        )}

        <div className="mt-3 rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-3 text-sm text-cyan-100">
          <p>You can still:</p>
          <p>- View match details</p>
          <p>- View scoreboard (if available)</p>
          <p className="mt-2 text-cyan-200/90">Scoring is disabled. Contact system administrator.</p>
        </div>

        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-10 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-700"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onViewDetails}
            className="min-h-10 rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-4 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/25"
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfigLockedModal;
