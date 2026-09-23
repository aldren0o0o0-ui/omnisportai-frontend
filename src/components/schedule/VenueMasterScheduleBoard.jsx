import {
  AlertTriangle,
  CalendarClock,
  CircleDot,
  MapPin,
  ShieldAlert,
  Users
} from "lucide-react";
import {
  buildDateColumns,
  buildVenueMap,
  eventHasConflict,
  formatShortTime,
  getStatusTone,
  getVenueKey,
  getVenueTypeLabel,
  inferVenueCategory
} from "./venueScheduleUtils";
import { participantShapeBadgeClass } from "../../utils/tournamentEventCategories";
import { formatSeverityLabel } from "../common/statusLabels";

const statusBadgeClass = (status) => {
  const tone = getStatusTone(status);
  if (tone === "live") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
  if (tone === "completed") return "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200";
  if (tone === "conflict") return "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300";
  return "bg-blue-100 text-blue-700 dark:bg-[var(--surface)]/40 dark:text-blue-300";
};

const normalizeIssueSeverity = (value) => {
  const key = String(value || "").toUpperCase();
  if (key === "BLOCKING") return "BLOCKING";
  if (key === "WARNING") return "WARNING";
  if (key === "INFO") return "INFO";
  return "NONE";
};

const issueBadgeClass = (severity) => {
  if (severity === "BLOCKING") return "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300";
  if (severity === "WARNING") return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
  if (severity === "INFO") return "bg-blue-100 text-blue-700 dark:bg-[var(--surface)]/40 dark:text-blue-300";
  return "";
};

const issueBorderClass = (severity) => {
  if (severity === "BLOCKING") return "border-rose-300 bg-rose-50/80 hover:border-rose-400 dark:border-rose-700 dark:bg-rose-900/20";
  if (severity === "WARNING") return "border-amber-300 bg-amber-50/80 hover:border-amber-400 dark:border-amber-700 dark:bg-amber-900/20";
  if (severity === "INFO") return "border-blue-300 bg-blue-50/80 hover:border-blue-400 dark:border-blue-700 dark:bg-[var(--surface)]";
  return "";
};

const VenueRowHeader = ({ venue = null, eventCount = 0 }) => {
  const hasVenue = Boolean(venue);
  const title = hasVenue ? venue.name || "Unassigned venue" : "Unassigned Venue";
  const location = hasVenue ? venue.location || "Location not set" : "Matches without venue";
  const typeLabel = hasVenue ? getVenueTypeLabel(venue) : "Unassigned";
  const categoryLabel = hasVenue ? inferVenueCategory(venue) : "Needs assignment";

  return (
    <div className="space-y-1">
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{location}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700 dark:bg-slate-700 dark:text-slate-200">
          {typeLabel}
        </span>
        <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300">
          {categoryLabel}
        </span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
          {eventCount} event{eventCount === 1 ? "" : "s"}
        </span>
      </div>
    </div>
  );
};

const ScheduleEventCard = ({ event, isSelected, onSelect, compact = false }) => {
  const conflict = eventHasConflict(event);
  const issueSeverity = normalizeIssueSeverity(event?.highestIssueSeverity || event?.issueSummary?.highestSeverity);
  const hasIssue = issueSeverity !== "NONE";
  const issueLabel = hasIssue ? formatSeverityLabel(issueSeverity) : "";

  return (
    <button
      type="button"
      onClick={() => onSelect?.(event)}
      className={`w-full rounded-xl border text-left transition ${
        isSelected
          ? "border-blue-400 bg-blue-50 shadow-sm dark:border-blue-400 dark:bg-[var(--surface)]/30"
          : hasIssue
            ? issueBorderClass(issueSeverity)
            : conflict
            ? "border-rose-300 bg-rose-50/80 hover:border-rose-400 dark:border-rose-700 dark:bg-rose-900/20"
            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-[var(--surface)] dark:hover:bg-slate-800"
      } ${compact ? "p-2" : "p-2.5"}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`${compact ? "text-[10px]" : "text-[11px]"} font-semibold text-slate-600 dark:text-slate-300`}>
          {formatShortTime(event.start)}
        </span>
        <span className={`rounded-full ${compact ? "px-1.5 py-0.5" : "px-2 py-0.5"} text-[10px] font-semibold ${statusBadgeClass(event.status)}`}>
          {event.status || "Scheduled"}
        </span>
      </div>
      <p className={`${compact ? "mt-0.5 text-xs" : "mt-1 text-sm"} font-semibold text-slate-900 dark:text-slate-100`}>
        {event.matchLabel}
      </p>
      <div className={`${compact ? "mt-0.5" : "mt-1"} flex flex-wrap items-center gap-1.5`}>
        <p className={`${compact ? "text-[10px]" : "text-[11px]"} text-slate-500 dark:text-slate-400`}>
          {event.sportDisplayLabel || event.sportLabel}
        </p>
        {event.competitionTypeLabel ? (
          <span
            className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${participantShapeBadgeClass(
              event.participantShape || "TEAM"
            )}`}
          >
            {event.competitionTypeLabel}
          </span>
        ) : null}
      </div>
      {hasIssue ? (
        <p className={`${compact ? "mt-0.5 text-[10px]" : "mt-1 text-[11px]"} inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${issueBadgeClass(issueSeverity)}`}>
          {issueLabel}
        </p>
      ) : null}
      {conflict ? (
        <p className={`${compact ? "mt-0.5 text-[10px]" : "mt-1 text-[11px]"} inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-300`}>
          <AlertTriangle size={11} />
          Conflict
        </p>
      ) : null}
    </button>
  );
};

const ListItemCard = ({ event, isSelected, onSelect }) => (
  <button
    type="button"
    onClick={() => onSelect?.(event)}
    className={`w-full rounded-xl border p-3 text-left transition ${
      isSelected
        ? "border-blue-400 bg-blue-50 dark:border-blue-400 dark:bg-[var(--surface)]/30"
        : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-[var(--surface)] dark:hover:bg-slate-800"
    }`}
  >
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{event.matchLabel}</p>
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadgeClass(event.status)}`}>
        {event.status || "Scheduled"}
      </span>
    </div>
    <div className="mt-2 grid grid-cols-1 gap-2 text-xs text-slate-600 dark:text-slate-300 md:grid-cols-4">
      <span className="inline-flex items-center gap-1">
        <CalendarClock size={12} />
        {formatShortTime(event.start)}
      </span>
      <span className="inline-flex items-center gap-1">
        <CircleDot size={12} />
        {event.sportDisplayLabel || event.sportLabel}
        {event.competitionTypeLabel ? (
          <span
            className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${participantShapeBadgeClass(
              event.participantShape || "TEAM"
            )}`}
          >
            {event.competitionTypeLabel}
          </span>
        ) : null}
      </span>
      <span className="inline-flex items-center gap-1">
        <MapPin size={12} />
        {event.venueLabel}
      </span>
      <span className="inline-flex items-center gap-1">
        <Users size={12} />
        Match {event.match_id || event.id || "details unavailable"}
      </span>
    </div>
  </button>
);

const EmptyBoard = ({ title, description }) => (
  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center dark:border-slate-700 dark:bg-[var(--surface)]/40">
    <ShieldAlert className="mx-auto text-slate-400" size={20} />
    <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</p>
    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{description}</p>
  </div>
);

const VenueMasterScheduleBoard = ({
  events = [],
  venues = [],
  selectedTournament = null,
  selectedEventId = null,
  selectedSport = "all",
  selectedVenue = "all",
  viewMode = "grid",
  onSelectEvent = null,
  onGenerateSchedule = null,
  onClearFilters = null,
  hasActiveFilters = false
}) => {
  const venueMap = buildVenueMap(venues);
  const dateColumns = buildDateColumns({ events, selectedTournament, days: 7 });

  const filteredEvents = events.filter((event) => {
    if (selectedSport !== "all" && event.sportKey !== selectedSport) return false;
    if (selectedVenue !== "all" && getVenueKey(event) !== selectedVenue) return false;
    return true;
  });

  if (filteredEvents.length === 0) {
    const hasTournament = Boolean(selectedTournament);
    const title = !hasTournament
      ? "Select a tournament to view and generate schedules."
      : hasActiveFilters
        ? "No matches match your filters."
        : "No matches scheduled yet.";
    const description = !hasTournament
      ? "Choose a tournament, then generate a schedule to begin venue allocation."
      : hasActiveFilters
        ? "Try clearing filters or selecting another sport, venue, or date."
        : "Generate a schedule to assign matches to venues and time slots.";

    return (
      <div className="space-y-3">
        <EmptyBoard
          title={title}
          description={description}
        />
        <div className="flex flex-wrap justify-center gap-2">
          {typeof onGenerateSchedule === "function" ? (
            <button
              type="button"
              onClick={onGenerateSchedule}
              className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500"
            >
              Generate Schedule
            </button>
          ) : null}
          {hasActiveFilters && typeof onClearFilters === "function" ? (
            <button
              type="button"
              onClick={onClearFilters}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-[var(--surface)] dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Clear Filters
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  if (viewMode === "list") {
    return (
      <div className="space-y-2.5">
        {filteredEvents
          .slice()
          .sort((a, b) => a.start.getTime() - b.start.getTime())
          .map((event) => (
            <ListItemCard
              key={`list-${event.id}`}
              event={event}
              isSelected={String(selectedEventId) === String(event.id)}
              onSelect={onSelectEvent}
            />
          ))}
      </div>
    );
  }

  const groupedByVenue = filteredEvents.reduce((acc, event) => {
    const venueKey = getVenueKey(event);
    if (!acc[venueKey]) acc[venueKey] = [];
    acc[venueKey].push(event);
    return acc;
  }, {});

  const venueKeys = Object.keys(groupedByVenue).sort((a, b) => {
    if (a === "unassigned") return 1;
    if (b === "unassigned") return -1;
    const venueA = venueMap.get(a);
    const venueB = venueMap.get(b);
    const nameA = String(venueA?.name || a).toLowerCase();
    const nameB = String(venueB?.name || b).toLowerCase();
    return nameA.localeCompare(nameB);
  });

  return (
    <div className="overflow-x-auto rounded-2xl bg-white shadow-sm shadow-slate-200/60 dark:bg-[var(--surface)]/90 dark:shadow-none">
      <div className="min-w-[920px]">
        <div className="grid grid-cols-[220px_repeat(7,minmax(120px,1fr))] border-b border-slate-200/70 dark:border-slate-800">
          <div className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Venue / Date
          </div>
          {dateColumns.map((column) => (
            <div
              key={column.key}
              className="border-l border-slate-200/70 px-3 py-3 text-center dark:border-slate-800"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {column.dayLabel}
              </p>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {column.dayNumber}
              </p>
            </div>
          ))}
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {venueKeys.map((venueKey) => {
            const rowEvents = groupedByVenue[venueKey] || [];
            const venue = venueMap.get(venueKey) || null;

            return (
              <div
                key={`row-${venueKey}`}
                className="grid grid-cols-[220px_repeat(7,minmax(120px,1fr))]"
              >
                  <div className="border-r border-slate-200/70 px-4 py-3 dark:border-slate-800">
                  <VenueRowHeader venue={venue} eventCount={rowEvents.length} />
                </div>
                {dateColumns.map((column) => {
                  const cellEvents = rowEvents
                    .filter((event) => event.dateKey === column.key)
                    .sort((a, b) => a.start.getTime() - b.start.getTime());
                  return (
                    <div
                      key={`${venueKey}-${column.key}`}
                      className="min-h-[96px] border-l border-slate-100 bg-slate-50/40 px-2 py-2 dark:border-slate-800 dark:bg-[var(--surface)]/40"
                    >
                      {cellEvents.length === 0 ? (
                        <div className="h-full rounded-lg border border-dashed border-slate-200/70 bg-white/60 dark:border-slate-700 dark:bg-[var(--surface)]/50" />
                      ) : (
                        <div className="space-y-1.5">
                          {cellEvents.slice(0, 3).map((event) => (
                            <ScheduleEventCard
                              key={`event-${event.id}`}
                              event={event}
                              isSelected={String(selectedEventId) === String(event.id)}
                              onSelect={onSelectEvent}
                              compact={cellEvents.length > 2}
                            />
                          ))}
                          {cellEvents.length > 3 ? (
                            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                              +{cellEvents.length - 3} more
                            </p>
                          ) : null}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default VenueMasterScheduleBoard;
