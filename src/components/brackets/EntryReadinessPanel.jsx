import { AlertCircle, CheckCircle2, Info, ShieldAlert } from "lucide-react";
import {
  buildBracketTargetLabel,
  formatParticipantShapeLabel,
  isDefaultEventTarget,
} from "./utils/bracketTargets";

const STATUS_COPY = {
  READY: "Approved entries are ready for bracket generation.",
  NOT_READY: "Some entry requirements must be completed before bracket generation.",
  READY_WITH_WARNINGS: "Entries are usable, but review the warnings below.",
};

const STATUS_CLASSES = {
  READY: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200",
  NOT_READY: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200",
  READY_WITH_WARNINGS: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-300",
};

const SEVERITY_CLASSES = {
  ERROR: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200",
  WARNING: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200",
  INFO: "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-300",
};

const COUNT_ITEMS = [
  ["approved_count", "Approved"],
  ["valid_entries_count", "Valid Entries"],
  ["draft_count", "Draft"],
  ["incomplete_count", "Incomplete"],
  ["pending_review_count", "Pending Review"],
  ["rejected_count", "Rejected"],
  ["expired_count", "Expired"],
];

const toSafeList = (value) => (Array.isArray(value) ? value : []);

const SeverityBadge = ({ severity = "INFO" }) => {
  const normalized = String(severity || "INFO").trim().toUpperCase();
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${SEVERITY_CLASSES[normalized] || SEVERITY_CLASSES.INFO}`}
    >
      {normalized}
    </span>
  );
};

const EntryReadinessPanel = ({
  readiness = null,
  loading = false,
  error = "",
  emptyMessage = "Select a tournament and sport to inspect approved entry readiness.",
  className = "",
  sportName = "",
  eventName = "",
  eventKey = "",
  participantShape = "",
  tournamentSportEventId = null,
}) => {
  const normalizedStatus = String(readiness?.status || "").trim().toUpperCase();
  const issues = toSafeList(readiness?.issues);
  const warnings = toSafeList(readiness?.warnings);
  const hasData = Boolean(readiness);
  const targetLabel = buildBracketTargetLabel({ sportName, eventName, eventKey });
  const participantShapeLabel = formatParticipantShapeLabel(participantShape);
  const isEventScoped = tournamentSportEventId != null && !isDefaultEventTarget(eventName, eventKey);

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-700 dark:bg-[var(--surface)] ${className}`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">
              Entry Readiness
            </h3>
            {hasData ? (
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${STATUS_CLASSES[normalizedStatus] || STATUS_CLASSES.NOT_READY}`}
              >
                {normalizedStatus || "UNKNOWN"}
              </span>
            ) : null}
          </div>
          {(sportName || eventName || participantShapeLabel) ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-200">
                {targetLabel}
              </span>
              {participantShapeLabel ? (
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-300">
                  {participantShapeLabel}
                </span>
              ) : null}
              {isEventScoped ? (
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-300">
                  Event Category
                </span>
              ) : null}
            </div>
          ) : null}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {hasData
              ? STATUS_COPY[normalizedStatus] || "Read-only entry readiness visibility for this tournament sport."
              : emptyMessage}
          </p>
        </div>
        {hasData ? (
          <span
            className={`inline-flex items-center self-start rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
              readiness?.can_generate_bracket
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200"
                : "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-300"
            }`}
          >
            {readiness?.can_generate_bracket ? "Can Generate Bracket" : "Generation Not Ready"}
          </span>
        ) : null}
      </div>

      {loading ? (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
          {COUNT_ITEMS.map(([, label]) => (
            <div
              key={`entry-readiness-skeleton-${label}`}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-[var(--surface-soft)]"
            >
              <div className="h-3 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
              <div className="mt-2 h-5 w-10 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Unable to load entry readiness right now.</p>
            <p className="mt-1 text-xs">{error}</p>
          </div>
        </div>
      ) : hasData ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
            {COUNT_ITEMS.map(([key, label]) => (
              <div
                key={`entry-readiness-count-${key}`}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-[var(--surface-soft)]"
              >
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {label}
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-800 dark:text-slate-100">
                  {Number(readiness?.[key] || 0)}
                </p>
              </div>
            ))}
          </div>

          {issues.length === 0 && warnings.length === 0 ? (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">No blocking entry issues found.</p>
                <p className="mt-1 text-xs">This panel is informational only; existing bracket generation behavior is unchanged.</p>
              </div>
            </div>
          ) : (
            <div className="mt-4 grid gap-3 xl:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    Issues
                  </p>
                </div>
                {issues.length > 0 ? (
                  <div className="space-y-2">
                    {issues.map((issue, index) => (
                      <div
                        key={`entry-readiness-issue-${issue.code || "issue"}-${issue.entry_id || issue.department_id || index}`}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-700 dark:bg-[var(--surface-soft)]"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <SeverityBadge severity={issue.severity} />
                          {issue.entry_name ? (
                            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">{issue.entry_name}</span>
                          ) : null}
                          {issue.department_name ? (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">{issue.department_name}</span>
                          ) : null}
                        </div>
                        <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{issue.message}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-slate-200 px-3 py-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    No blocking issues.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    Warnings
                  </p>
                </div>
                {warnings.length > 0 ? (
                  <div className="space-y-2">
                    {warnings.map((warning, index) => (
                      <div
                        key={`entry-readiness-warning-${warning.code || "warning"}-${warning.entry_id || warning.department_id || index}`}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-700 dark:bg-[var(--surface-soft)]"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <SeverityBadge severity={warning.severity} />
                          {warning.entry_name ? (
                            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">{warning.entry_name}</span>
                          ) : null}
                          {warning.department_name ? (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">{warning.department_name}</span>
                          ) : null}
                        </div>
                        <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{warning.message}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-slate-200 px-3 py-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    No warnings to review.
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          {emptyMessage}
        </div>
      )}
    </div>
  );
};

export default EntryReadinessPanel;
