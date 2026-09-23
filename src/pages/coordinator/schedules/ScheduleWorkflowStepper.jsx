import { AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";

const STEP_TONE = {
  complete: {
    card: "border-emerald-200 bg-emerald-50/80 dark:border-emerald-500/30 dark:bg-emerald-500/10",
    badge: "bg-emerald-600 text-white dark:bg-emerald-500",
    text: "text-emerald-800 dark:text-emerald-200",
  },
  current: {
    card: "border-blue-200 bg-blue-50/80 dark:border-blue-500/30 dark:bg-blue-500/10",
    badge: "bg-blue-600 text-white dark:bg-blue-500",
    text: "text-blue-800 dark:text-blue-200",
  },
  ready: {
    card: "border-cyan-200 bg-cyan-50/80 dark:border-cyan-500/30 dark:bg-cyan-500/10",
    badge: "bg-cyan-600 text-white dark:bg-cyan-500",
    text: "text-cyan-800 dark:text-cyan-200",
  },
  blocked: {
    card: "border-rose-200 bg-rose-50/80 dark:border-rose-500/30 dark:bg-rose-500/10",
    badge: "bg-rose-600 text-white dark:bg-rose-500",
    text: "text-rose-800 dark:text-rose-200",
  },
  pending: {
    card: "border-slate-200 bg-white dark:border-slate-700 dark:bg-[var(--surface)]/80",
    badge: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
    text: "text-slate-700 dark:text-slate-200",
  },
};

const StepStatusIcon = ({ status, stepNumber }) => {
  if (status === "complete") return <CheckCircle2 size={16} />;
  if (status === "blocked") return <AlertTriangle size={16} />;
  if (status === "current") return <Clock3 size={16} />;
  return <span className="text-xs font-bold">{stepNumber}</span>;
};

const ScheduleWorkflowStepper = ({ steps = [] }) => (
  <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-[var(--surface)]/90">
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          Workflow
        </p>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Scheduling steps
        </h2>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">Before generation → After review</p>
    </div>
    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      {steps.map((step, index) => {
        const status = STEP_TONE[step.status] ? step.status : "pending";
        const tone = STEP_TONE[status];
        return (
          <article
            key={step.key || step.label || index}
            className={`rounded-2xl border p-3 transition ${tone.card}`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tone.badge}`}
                aria-label={`Step ${index + 1}: ${status}`}
              >
                <StepStatusIcon status={status} stepNumber={index + 1} />
              </span>
              <div className="min-w-0">
                <p className={`text-sm font-semibold ${tone.text}`}>{step.label}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{step.helper}</p>
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {step.statusLabel || status.replace(/_/g, " ")}
                </p>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  </section>
);

export default ScheduleWorkflowStepper;
