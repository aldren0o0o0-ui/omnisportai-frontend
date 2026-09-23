import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";

const toneClassMap = {
  error:
    "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300",
  warning:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300",
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300",
  neutral:
    "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
};

const toneIconMap = {
  error: AlertCircle,
  warning: AlertTriangle,
  success: CheckCircle2,
  neutral: Info,
};

const InlineAlert = ({ message, tone = "neutral", actionLabel = "", onAction = null, actionClassName = "" }) => {
  if (!message) return null;
  const toneClass = toneClassMap[tone] || toneClassMap.neutral;
  const Icon = toneIconMap[tone] || toneIconMap.neutral;
  return (
    <div className={`rounded-lg border px-3 py-2 text-sm ${toneClass}`} role="alert">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-start gap-2">
          <Icon size={15} className="mt-0.5 shrink-0" />
          <span>{message}</span>
        </span>
        {actionLabel && typeof onAction === "function" ? (
          <button type="button" className={actionClassName} onClick={onAction}>
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default InlineAlert;
