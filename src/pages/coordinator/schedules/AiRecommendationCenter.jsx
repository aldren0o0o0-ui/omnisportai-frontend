import { ArrowRight, Sparkles, Wand2 } from "lucide-react";

const IMPACT_TONE = {
  "High impact": "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
  "Medium impact": "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  "Low impact": "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
};

const AiRecommendationCenter = ({
  items = [],
  actionLoading = false,
  onApply = null,
  onPreview = null,
  onNavigate = null,
}) => (
  <section className="rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm dark:border-slate-800 dark:bg-[var(--surface)]/95">
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:bg-[var(--surface-soft)] dark:text-slate-300">
          <Sparkles size={13} />
          AI Recommendation Center
        </div>
        <h2 className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-100">
          Smart suggestions to resolve conflicts automatically.
        </h2>
      </div>
    </div>

    {items.length === 0 ? (
      <div className="mt-4 rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
        <p className="font-semibold">No AI suggestions available.</p>
        <p className="mt-1">Suggestions appear when the system finds a safe fix.</p>
      </div>
    ) : (
      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        {items.map((item) => {
          const impactTone = IMPACT_TONE[item.impactLabel] || IMPACT_TONE["Low impact"];
          return (
            <article
              key={item.key}
              className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-[var(--surface-soft)]/60"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${impactTone}`}>
                  {item.impactLabel}
                </span>
                {item.trustLabel ? (
                  <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${item.trustTone}`}>
                    {item.trustLabel}
                  </span>
                ) : null}
              </div>

              <div className="mt-3">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.title}</h3>
                {item.issueTitle ? (
                  <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{item.issueTitle}</p>
                ) : null}
                <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{item.description}</p>
                {item.meta ? (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{item.meta}</p>
                ) : null}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {item.canApply && typeof onApply === "function" ? (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => onApply(item)}
                    className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-cyan-600 dark:hover:bg-cyan-700"
                  >
                    <Wand2 size={13} />
                    {actionLoading ? "Applying..." : "Apply"}
                  </button>
                ) : null}

                {typeof onPreview === "function" ? (
                  <button
                    type="button"
                    onClick={() => onPreview(item)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-[var(--surface)] dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <ArrowRight size={13} />
                    {item.canApply ? "View Details" : "Preview"}
                  </button>
                ) : null}

                {!item.canApply && item.quickAction && typeof onNavigate === "function" ? (
                  <button
                    type="button"
                    onClick={() => onNavigate(item)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-[var(--surface)] dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    {item.quickAction.label || "Open Setup"}
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    )}
  </section>
);

export default AiRecommendationCenter;
