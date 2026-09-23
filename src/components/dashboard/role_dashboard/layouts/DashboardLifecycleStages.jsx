import CompetitionShowcase from "../../../dashboard/CompetitionShowcase";
import {
  LiveStageEmptyState,
  MatchCenterPanel,
  OlympicStandingsTable,
  SportBreakdownTable,
} from "./dashboardLayoutUtils";

export const DashboardStageSwitcher = ({
  label = "",
  options,
  effectiveStage,
  autoStage,
  selectedStage,
  onSelect,
}) => (
  <nav aria-label="Dashboard workspace" className="flex min-h-12 flex-col gap-2 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-2 sm:flex-row sm:items-center sm:justify-between">
    {label ? <div className="flex items-center gap-2 px-2 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
      <span>{label}:</span>
      <span className="rounded-md bg-[var(--primary-soft)] px-2 py-0.5 text-[11px] font-extrabold text-[var(--primary)]">
        {options.find((option) => option.value === effectiveStage)?.label || "Current stage"}
      </span>
    </div> : null}
    <div className="flex flex-wrap gap-1">
      {options.map((option) => {
        const Icon = option.icon;
        const selected = effectiveStage === option.value;
        const automatic = autoStage === option.value && !selectedStage;
        return (
          <button key={option.value} type="button" onClick={() => onSelect(option.value)} aria-pressed={selected} className={`inline-flex min-h-9 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] ${selected ? "bg-[var(--primary)] text-white shadow-sm" : "text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-main)]"}`}>
            <Icon size={14} aria-hidden="true" />
            <span>{option.label}</span>
            {automatic ? <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" title="Current active stage" /> : null}
          </button>
        );
      })}
    </div>
  </nav>
);

export const LiveDashboardStage = ({
  events,
  sports,
  entries,
  tournamentId,
  scheduleHref,
  scoreBasePath,
  standingsHref,
  entriesHref,
  departmentRows,
  breakdownRows,
  standingsUnavailable = false,
  userDepartmentId = null,
  matchCenterProps = {},
  children = null,
}) => {
  if (!Array.isArray(events) || events.length === 0) return <LiveStageEmptyState />;

  const showcaseSports = (Array.isArray(sports) ? sports : []).map((sport) => ({
    id: sport.id,
    name: sport.name,
    imageUrl: sport.image_url || sport.icon_url || sport.sport_image_url || null,
    meta: sport.category || "Official sport",
  }));

  return (
    <>
      <section aria-label="Live match center and schedule" className="w-full min-w-0 max-w-full">
        <MatchCenterPanel events={events} scheduleHref={scheduleHref} scoreBasePath={scoreBasePath} standingsHref={standingsHref} {...matchCenterProps} />
      </section>
      <div className="min-w-0 max-w-full overflow-hidden">
        <CompetitionShowcase sports={showcaseSports} entries={entries} entriesHref={entriesHref} tournamentId={tournamentId} userDepartmentId={userDepartmentId} />
      </div>
      <section aria-label="Standings and sport breakdown" className="grid items-start gap-4 xl:grid-cols-[minmax(0,6fr)_minmax(0,4fr)]">
        <OlympicStandingsTable departmentRows={departmentRows} standingsHref={standingsHref} unavailable={standingsUnavailable} />
        <SportBreakdownTable breakdownRows={breakdownRows} unavailable={standingsUnavailable} />
      </section>
      {children}
    </>
  );
};
