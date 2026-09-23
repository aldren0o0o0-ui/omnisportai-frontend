import { AlertTriangle, CheckCircle2, Info, Sparkles } from "lucide-react";

const BANNER_THEME = {
  idle: {
    wrapper: "border-slate-200 bg-white dark:border-slate-800 dark:bg-[var(--surface)]/90",
    icon: "bg-slate-100 text-slate-600 dark:bg-[var(--surface-soft)] dark:text-slate-300",
  },
  not_checked: {
    wrapper: "border-blue-200 bg-blue-50/70 dark:border-blue-500/30 dark:bg-blue-500/10",
    icon: "bg-blue-600 text-white dark:bg-blue-500",
  },
  ready: {
    wrapper: "border-emerald-200 bg-emerald-50/80 dark:border-emerald-500/30 dark:bg-emerald-500/10",
    icon: "bg-emerald-600 text-white dark:bg-emerald-500",
  },
  warning: {
    wrapper: "border-amber-200 bg-amber-50/80 dark:border-amber-500/30 dark:bg-amber-500/10",
    icon: "bg-amber-500 text-white dark:bg-amber-400",
  },
  blocked: {
    wrapper: "border-rose-200 bg-rose-50/80 dark:border-rose-500/30 dark:bg-rose-500/10",
    icon: "bg-rose-600 text-white dark:bg-rose-500",
  },
};

const BannerIcon = ({ state }) => {
  if (state === "ready") return <CheckCircle2 size={18} />;
  if (state === "warning") return <Sparkles size={18} />;
  if (state === "blocked") return <AlertTriangle size={18} />;
  return <Info size={18} />;
};

const ScheduleReadinessBanner = ({
  state = "not_checked",
  title = "",
  helper = "",
  counts = {},
  actionLabel = "",
  actionDisabled = false,
  onAction = null,
  secondaryActionLabel = "",
  onSecondaryAction = null,
}) => {
  const theme = BANNER_THEME[state] || BANNER_THEME.not_checked;
  const summaryItems = [
    { key: "blocking", label: "Critical", value: counts.blocking ?? 0 },
    { key: "warnings", label: "Alerts", value: counts.warnings ?? 0 },
    { key: "info", label: "Notes", value: counts.info ?? 0 },
  ];

  return (
    <section className={`rounded-2xl border p-4 shadow-sm ${theme.wrapper}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${theme.icon}`}>
            <BannerIcon state={state} />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{helper}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {summaryItems.map((item) => (
                <span
                  key={item.key}
                  className="inline-flex items-center rounded-full border border-current/10 bg-white/70 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-[var(--surface)]/60 dark:text-slate-200"
                >
                  {item.label}: {item.value}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {typeof onAction === "function" && actionLabel ? (
            <button
              type="button"
              onClick={onAction}
              disabled={actionDisabled}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-cyan-600 dark:hover:bg-cyan-700"
            >
              {actionLabel}
            </button>
          ) : null}
          {typeof onSecondaryAction === "function" && secondaryActionLabel ? (
            <button
              type="button"
              onClick={onSecondaryAction}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-[var(--surface)] dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {secondaryActionLabel}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default ScheduleReadinessBanner;
