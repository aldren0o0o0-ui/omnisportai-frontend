import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  CircleHelp,
  FileClock,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import ActionMenu from "../common/ActionMenu";

const STATUS_TONES = {
  success: {
    icon: CheckCircle2,
    className:
      "border-emerald-400/25 bg-emerald-400/10 text-emerald-700 dark:text-emerald-300",
  },
  warning: {
    icon: AlertTriangle,
    className:
      "border-amber-400/25 bg-amber-400/10 text-amber-700 dark:text-amber-300",
  },
  info: {
    icon: FileClock,
    className:
      "border-blue-400/25 bg-blue-400/10 text-blue-700 dark:text-blue-300",
  },
  neutral: {
    icon: FileClock,
    className:
      "border-slate-300/70 bg-slate-100/70 text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300",
  },
};

const ScheduleStatusBadge = ({ badge }) => {
  const preset = STATUS_TONES[badge?.tone] || STATUS_TONES.neutral;
  const Icon = badge?.icon || preset.icon;
  const legacyTone = typeof badge?.tone === "string" && badge.tone.includes(" ")
    ? badge.tone
    : "";

  return (
    <span
      className={`inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
        legacyTone || preset.className
      }`}
    >
      <Icon size={12} aria-hidden="true" />
      {badge.label}
    </span>
  );
};

const VenueScheduleHeader = ({
  selectedTournament = null,
  title = "",
  subtitle = "",
  primaryAction = null,
  secondaryActions = [],
  actionsMenu = [],
  actionsMenuLabel = "Actions",
  statusBadges = [],
  metrics = [],
  onGenerateSchedule = null,
  onOpenHelp = null,
  primaryActionLabel = "Generate Schedule",
  primaryActionBusyLabel = "Generating Schedule...",
  primaryActionBusy = false,
  primaryActionDisabled = false,
  primaryActionDisabledReason = "",
  statusText = "",
}) => {
  const resolvedTitle = title || (selectedTournament ? `${selectedTournament.tournament_name} Schedule` : "Schedule");
  const resolvedPrimaryAction = primaryAction || (onGenerateSchedule
    ? {
      label: primaryActionLabel,
      busyLabel: primaryActionBusyLabel,
      busy: primaryActionBusy,
      disabled: primaryActionDisabled,
      disabledReason: primaryActionDisabledReason,
      onClick: onGenerateSchedule,
    }
    : null);
  const resolvedSecondaryActions = secondaryActions.length > 0
    ? secondaryActions
    : onOpenHelp
      ? [{ key: "help", label: "Help", onClick: onOpenHelp, icon: CircleHelp }]
      : [];
  const isRegeneration = String(resolvedPrimaryAction?.label || "")
    .toLowerCase()
    .includes("regenerate");

  return (
    <header className="flex-none px-0.5 py-1">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-cyan-400/10 dark:text-cyan-300">
              <CalendarDays size={19} aria-hidden="true" />
            </span>
            <h1 className="truncate text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50 md:text-[1.75rem]">
              {resolvedTitle}
            </h1>
          </div>
          {statusText ? (
            <p className="mt-1.5 text-sm font-medium text-slate-500 dark:text-slate-400">
              {statusText}
            </p>
          ) : null}
          {subtitle ? (
            <p className="mt-1.5 max-w-3xl text-sm text-slate-600 dark:text-slate-400">
              {subtitle}
            </p>
          ) : null}
          {statusBadges.length > 0 ? (
            <div className="mt-2.5 flex flex-wrap gap-2" aria-label="Schedule status">
              {statusBadges.map((badge) => (
                <ScheduleStatusBadge key={badge.key || badge.label} badge={badge} />
              ))}
            </div>
          ) : null}
        </div>

        <div
          className="flex flex-col gap-1.5 sm:items-start xl:items-end"
          aria-label="Schedule management actions"
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            Schedule actions
          </span>
          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            {resolvedPrimaryAction ? (
              <button
                type="button"
                onClick={resolvedPrimaryAction.onClick}
                disabled={resolvedPrimaryAction.disabled}
                title={resolvedPrimaryAction.disabled ? resolvedPrimaryAction.disabledReason : resolvedPrimaryAction.label}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-950/10 transition duration-200 hover:-translate-y-0.5 hover:bg-blue-500 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 dark:bg-cyan-600 dark:hover:bg-cyan-500 dark:focus-visible:ring-offset-slate-950"
              >
                {resolvedPrimaryAction.busy ? (
                  <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />
                ) : (
                  <RefreshCw
                    size={15}
                    className={isRegeneration ? "" : "-rotate-45"}
                    aria-hidden="true"
                  />
                )}
                {resolvedPrimaryAction.busy ? resolvedPrimaryAction.busyLabel : resolvedPrimaryAction.label}
              </button>
            ) : null}

            {resolvedSecondaryActions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
              {resolvedSecondaryActions.map((action) => {
                const Icon = action.icon || null;
                return (
                  <button
                    key={action.key || action.label}
                    type="button"
                    onClick={action.onClick}
                    disabled={action.disabled}
                    title={action.disabled ? action.disabledReason || action.label : action.title || action.label}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    {Icon ? <Icon size={14} /> : null}
                    {action.label}
                  </button>
                );
              })}
              </div>
            ) : null}

            {actionsMenu.length > 0 ? (
              <ActionMenu items={actionsMenu} buttonLabel={actionsMenuLabel} align="right" />
            ) : null}
          </div>
        </div>
      </div>

      {metrics.length > 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <article
              key={metric.label}
              className="rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2 dark:border-slate-800 dark:bg-[var(--surface-soft)]/70"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {metric.label}
              </p>
              <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{metric.value}</p>
              {metric.helper ? (
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{metric.helper}</p>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
    </header>
  );
};

export default VenueScheduleHeader;
