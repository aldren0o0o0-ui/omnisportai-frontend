const toScore = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(0, Math.min(100, numeric));
};

const statusTone = (status) => {
  const key = String(status || "").toLowerCase();
  if (key.includes("excellent")) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300";
  if (key.includes("good")) return "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300";
  if (key.includes("needs")) return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300";
  if (key.includes("poor")) return "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300";
  return "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300";
};

const ScoreBar = ({ label, component, fallbackScore, colorClass, fallbackMeaning }) => {
  const displayScore = toScore(component?.display_score ?? component?.score ?? fallbackScore);
  const hasData = component?.has_sufficient_data !== false && displayScore !== null;
  const meaning = component?.meaning || fallbackMeaning;
  const status = component?.status_label || (hasData ? "Needs Review" : "Not enough data");
  const evidence = component?.evidence && typeof component.evidence === "object" ? component.evidence : {};
  const recommendedAction = String(component?.recommended_action || "").trim();

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-2.5 dark:border-slate-700 dark:bg-[var(--surface)]">
      <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs">
        <span className="font-semibold text-slate-700 dark:text-slate-200">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusTone(status)}`}>
            {status}
          </span>
          <span className="text-slate-600 dark:text-slate-300">
            {hasData ? `${displayScore.toFixed(1)} / 100` : "Not enough data"}
          </span>
        </div>
      </div>
      <div className="mt-1.5 h-2.5 rounded-full bg-slate-200 dark:bg-[var(--surface-soft)]">
        <div
          className={`h-2.5 rounded-full ${hasData ? colorClass : "bg-slate-400 dark:bg-slate-600"} transition-all duration-200`}
          style={{ width: `${hasData ? displayScore : 8}%` }}
        />
      </div>
      <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">{meaning}</p>
      {hasData ? (
        <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
          Evidence: {Object.entries(evidence)
            .filter(([, value]) => value !== null && value !== undefined && value !== "")
            .slice(0, 2)
            .map(([key, value]) => `${String(key).replace(/_/g, " ")} ${value}`)
            .join(" • ") || "No detailed evidence available."}
        </p>
      ) : null}
      {recommendedAction ? (
        <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">Next: {recommendedAction}</p>
      ) : null}
    </article>
  );
};

const FairnessChart = ({ fairness = null }) => {
  const overall = toScore(fairness?.overall_score);
  const hasFairnessPayload = Boolean(fairness && typeof fairness === "object");
  const hasSufficientData = fairness?.has_sufficient_data !== false;
  const overallLabel = fairness?.overall_label || (overall !== null ? "Needs Review" : "Not enough data");
  const overallExplanation = String(fairness?.overall_explanation || "").trim();
  const overallFormula = String(
    fairness?.overall_formula ||
      "Overall score is calculated from rest interval fairness, venue/match distribution, and time fairness."
  ).trim();
  const components = fairness?.components && typeof fairness.components === "object" ? fairness.components : {};

  if (!hasFairnessPayload) {
    return (
      <section className="rounded-2xl bg-white p-4 shadow-sm shadow-slate-200/60 transition-all duration-200 dark:bg-[var(--surface)] dark:shadow-none">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">
          Fairness Breakdown
        </h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Fairness metrics will appear after schedule generation.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm shadow-slate-200/60 transition-all duration-200 dark:bg-[var(--surface)] dark:shadow-none">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">
        Fairness Breakdown
      </h3>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Balance indicators based on recovery windows and schedule spread.
      </p>

      <div className="mt-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-950/70">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Overall Fairness Score
          </p>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusTone(overallLabel)}`}>
            {overallLabel}
          </span>
        </div>
        <p className="mt-1 text-3xl font-black text-emerald-600 dark:text-emerald-300">
          {hasSufficientData && overall !== null ? `${overall.toFixed(1)} / 100` : "Not enough data"}
        </p>
        {overallExplanation ? (
          <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">{overallExplanation}</p>
        ) : null}
        <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">{overallFormula}</p>
      </div>

      <div className="mt-4 space-y-2.5">
        <ScoreBar
          label="Rest Intervals"
          component={components?.rest_intervals}
          fallbackScore={fairness?.rest_time_score}
          colorClass="bg-emerald-500"
          fallbackMeaning="Higher is better when teams have healthy recovery gaps."
        />
        <ScoreBar
          label="Match Distribution"
          component={components?.match_distribution}
          fallbackScore={fairness?.venue_balance_score}
          colorClass="bg-sky-500"
          fallbackMeaning="How evenly matches are spread across available venues."
        />
        <ScoreBar
          label="Time Fairness"
          component={components?.time_fairness}
          fallbackScore={fairness?.time_fairness_score}
          colorClass="bg-amber-500"
          fallbackMeaning="Checks if teams get balanced early and late slots."
        />
      </div>
    </section>
  );
};

export default FairnessChart;
