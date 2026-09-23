import EntryStatusBadge from "./EntryStatusBadge";

const severityTone = {
  ERROR: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200",
  WARNING: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200",
  INFO: "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

const EntryCard = ({
  title,
  subtitle = "",
  status,
  readOnly = false,
  issues = [],
  children,
  primaryActionLabel = "",
  secondaryActionLabel = "",
  onPrimaryAction,
  onSecondaryAction,
  primaryActionDisabled = false,
  secondaryActionDisabled = false,
  busy = false,
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h4>
          <EntryStatusBadge status={status} />
          {readOnly ? (
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              Read-only
            </span>
          ) : null}
        </div>
        {subtitle ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {secondaryActionLabel ? (
          <button
            type="button"
            onClick={onSecondaryAction}
            disabled={secondaryActionDisabled || busy}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            {secondaryActionLabel}
          </button>
        ) : null}
        {primaryActionLabel ? (
          <button
            type="button"
            onClick={onPrimaryAction}
            disabled={primaryActionDisabled || busy}
            className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {primaryActionLabel}
          </button>
        ) : null}
      </div>
    </div>

    <div className="mt-4 space-y-3">
      {children}
      {Array.isArray(issues) && issues.length > 0 ? (
        <div className="space-y-2">
          {issues.map((issue, index) => {
            const severity = String(issue?.severity || "ERROR").trim().toUpperCase();
            return (
              <div
                key={`entry-issue-${issue?.code || "issue"}-${index}`}
                className={`rounded-xl border px-3 py-2 text-sm ${severityTone[severity] || severityTone.ERROR}`}
              >
                <p className="font-semibold">{issue?.message || "Entry validation issue."}</p>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  </div>
);

export default EntryCard;
