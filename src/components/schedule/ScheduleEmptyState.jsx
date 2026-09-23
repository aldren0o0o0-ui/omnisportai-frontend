import { CalendarClock } from "lucide-react";

const ScheduleEmptyState = ({
  title,
  description,
  actionLabel = "",
  onAction = null,
  actionDisabled = false,
  loadingLabel = "",
}) => (
  <section
    className="mx-auto flex min-h-72 w-full max-w-2xl flex-col items-center justify-center px-5 py-12 text-center"
    aria-live="polite"
  >
    <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-[var(--surface-soft)] dark:text-slate-300">
      <CalendarClock size={23} aria-hidden="true" />
    </span>
    <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
    <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-400">{description}</p>
    {actionLabel && onAction ? (
      <button
        type="button"
        onClick={onAction}
        disabled={actionDisabled}
        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-cyan-600 dark:hover:bg-cyan-500"
      >
        {loadingLabel || actionLabel}
      </button>
    ) : null}
  </section>
);

export default ScheduleEmptyState;

