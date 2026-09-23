import { RefreshCcw, SlidersHorizontal, X } from "lucide-react";

const selectClass =
  "h-9 min-w-28 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 outline-none transition hover:border-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:focus:border-cyan-500";

const FilterField = ({ label, children }) => (
  <label className="grid gap-1">
    <span className="sr-only">{label}</span>
    {children}
  </label>
);

const VenueScheduleFilterBar = ({
  tournaments = [],
  selectedTournamentId = "",
  onSelectTournament = null,
  sportOptions = [],
  selectedSport = "all",
  onSelectSport = null,
  eventCategoryOptions = [],
  selectedEventCategory = "all",
  onSelectEventCategory = null,
  statusOptions = [],
  selectedStatus = "all",
  onSelectStatus = null,
  dateOptions = [],
  selectedDate = "all",
  onSelectDate = null,
  venueOptions = [],
  selectedVenue = "all",
  onSelectVenue = null,
  onRefresh = null,
  refreshing = false,
  refreshDisabled = false,
  refreshDisabledReason = "",
  hasActiveFilters = false,
  onClearFilters = null,
}) => {
  return (
    <div
      className="flex flex-none flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white/70 p-2.5 shadow-sm shadow-slate-200/30 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/50 dark:shadow-none xl:flex-row xl:items-center xl:justify-between"
      aria-label="Schedule navigation and filters"
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="mr-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
          <SlidersHorizontal size={14} aria-hidden="true" />
          <span className="sr-only">Schedule filters</span>
        </span>
        {tournaments.length > 1 ? (
          <FilterField label="Intramural">
            <select
              aria-label="Intramural"
              value={selectedTournamentId}
              onChange={(event) => onSelectTournament?.(event.target.value)}
              className={selectClass}
            >
              {tournaments.map((tournament) => (
                <option key={tournament.id} value={String(tournament.id)}>
                  {tournament.tournament_name}
                </option>
              ))}
            </select>
          </FilterField>
        ) : null}

        {sportOptions.length > 1 ? (
          <FilterField label="Sport">
            <select aria-label="Sport" value={selectedSport} onChange={(event) => onSelectSport?.(event.target.value)} className={selectClass}>
              <option value="all">All sports</option>
              {sportOptions.map((sport) => <option key={sport.value} value={sport.value}>{sport.label}</option>)}
            </select>
          </FilterField>
        ) : null}

        {eventCategoryOptions.length > 0 ? (
          <FilterField label="Event">
            <select aria-label="Event" value={selectedEventCategory} onChange={(event) => onSelectEventCategory?.(event.target.value)} className={selectClass}>
              <option value="all">All events</option>
              {eventCategoryOptions.map((row) => <option key={row.value} value={row.value}>{row.label}</option>)}
            </select>
          </FilterField>
        ) : null}

        {venueOptions.length > 1 ? (
          <FilterField label="Venue">
            <select aria-label="Venue" value={selectedVenue} onChange={(event) => onSelectVenue?.(event.target.value)} className={selectClass}>
              <option value="all">All venues</option>
              {venueOptions.map((venue) => <option key={venue.value} value={venue.value}>{venue.label}</option>)}
            </select>
          </FilterField>
        ) : null}

        {dateOptions.length > 1 ? (
          <FilterField label="Date">
            <select aria-label="Date" value={selectedDate} onChange={(event) => onSelectDate?.(event.target.value)} className={selectClass}>
              <option value="all">All dates</option>
              {dateOptions.map((row) => <option key={row.value} value={row.value}>{row.label}</option>)}
            </select>
          </FilterField>
        ) : null}

        {statusOptions.length > 1 ? (
          <FilterField label="Status">
            <select aria-label="Status" value={selectedStatus} onChange={(event) => onSelectStatus?.(event.target.value)} className={selectClass}>
              <option value="all">All statuses</option>
              {statusOptions.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
            </select>
          </FilterField>
        ) : null}

        {hasActiveFilters ? (
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:text-cyan-300 dark:hover:bg-cyan-400/10"
          >
            <X size={13} aria-hidden="true" />
            Clear
          </button>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-slate-200/80 pt-2.5 dark:border-slate-800 xl:border-l xl:border-t-0 xl:pl-2.5 xl:pt-0">
        <button
          type="button"
          onClick={() => onRefresh?.()}
          disabled={refreshDisabled || refreshing}
          title={refreshDisabled ? refreshDisabledReason || "Refresh unavailable" : "Refresh schedule"}
          className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <RefreshCcw size={13} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>
    </div>
  );
};

export default VenueScheduleFilterBar;
