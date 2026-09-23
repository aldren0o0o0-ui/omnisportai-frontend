import DashboardCard from "../common/DashboardCard";

const TONE_CLASS_NAMES = {
  neutral:
    "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200",
  info:
    "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-200",
  warning:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200",
};

const TournamentModeFallback = ({
  title,
  message,
  tone = "neutral",
  className = "",
  children = null,
}) => (
  <DashboardCard className={className}>
    <div
      className={`rounded-2xl border px-4 py-4 ${
        TONE_CLASS_NAMES[tone] || TONE_CLASS_NAMES.neutral
      }`}
    >
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm opacity-90">{message}</p>
        {children ? <div className="pt-1">{children}</div> : null}
      </div>
    </div>
  </DashboardCard>
);

export default TournamentModeFallback;
