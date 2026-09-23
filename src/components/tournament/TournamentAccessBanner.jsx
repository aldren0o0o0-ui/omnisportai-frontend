import {
  formatRoleContextLabel,
  getModeDisplayLabel,
  getPrimaryRoleContext,
} from "../../utils/tournamentAccess";

const TournamentAccessBanner = ({
  tournamentAccess,
  selectedTournamentId,
  loading = false,
  error = "",
  className = "",
}) => {
  if (!selectedTournamentId) return null;

  if (loading) {
    return (
      <div className={`rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300 ${className}`}>
        Loading tournament access...
      </div>
    );
  }

  const effectiveMode = String(tournamentAccess?.effective_mode || "").trim().toLowerCase();
  const roleContexts = Array.isArray(tournamentAccess?.role_contexts)
    ? tournamentAccess.role_contexts
    : [];
  const primaryContext = getPrimaryRoleContext(tournamentAccess);
  const primaryContextLabel = formatRoleContextLabel(primaryContext, { includeRole: false });
  const coachContexts = roleContexts.filter((context) => String(context?.role || "").trim().toLowerCase() === "coach");
  const hasMultipleContexts = roleContexts.length > 1;

  let title = `${getModeDisplayLabel(effectiveMode) || "Tournament"} Mode`;
  let message = "Tournament access loaded.";
  let toneClassName =
    "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200";

  if (effectiveMode === "viewer") {
    title = "Viewer Mode";
    message = "You are not assigned as staff or player in this tournament.";
    toneClassName =
      "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200";
  } else if (effectiveMode === "coach") {
    message =
      coachContexts.length > 1
        ? "You are assigned to multiple event categories. Use the page filters to manage each assignment."
        : primaryContextLabel
          ? `You are assigned to ${primaryContextLabel}.`
          : "You are assigned as a coach in this tournament.";
    toneClassName =
      "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-200";
  } else if (effectiveMode === "assistant_coach") {
    title = "Assistant Coach Mode";
    message = "Limited access. Official submissions may require the head coach.";
    toneClassName =
      "border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-200";
  } else if (effectiveMode === "player") {
    title = "Player Mode";
    message = "You are registered as a player in this tournament.";
    toneClassName =
      "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200";
  } else if (effectiveMode === "department_manager") {
    title = "Department Manager Mode";
    message = "You can manage your assigned department in this tournament.";
    toneClassName =
      "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-200";
  } else if (effectiveMode === "sports_facilitator") {
    title = "Sports Facilitator Mode";
    message = "You can manage assigned sport operations in this tournament.";
    toneClassName =
      "border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-500/40 dark:bg-cyan-500/10 dark:text-cyan-200";
  } else if (effectiveMode === "sports_coordinator") {
    title = "Coordinator Mode";
    message = "You have full tournament management access.";
    toneClassName =
      "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200";
  }

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClassName} ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-sm opacity-90">{message}</p>
          {error ? (
            <p className="text-xs opacity-80">{error}</p>
          ) : null}
        </div>
      </div>

      {hasMultipleContexts ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {roleContexts.slice(0, 4).map((context, index) => (
            <span
              key={`${context.role || "role"}-${context.sport_label || "context"}-${index}`}
              className="inline-flex rounded-full border border-current/20 bg-white/40 px-3 py-1 text-xs font-semibold dark:bg-slate-900/20"
            >
              {formatRoleContextLabel(context)}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default TournamentAccessBanner;
