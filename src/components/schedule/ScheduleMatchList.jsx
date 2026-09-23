import { CalendarDays, Clock3, MapPin } from "lucide-react";
import { getScheduleParticipantLabel } from "./scheduleWorkflow";
import { getSportDisplayName } from "../../utils/tournamentEventCategories";

const formatDay = (value) => {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return "Date pending";
  return value.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

const formatTime = (value) => {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return "Time pending";
  return value.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
};

const statusClasses = {
  COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
  CANCELLED: "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300",
  ABANDONED: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
  ONGOING: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
  LIVE: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
  SCHEDULED: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300",
};

const ScheduleMatchList = ({ events = [], onSelectEvent = null, selectedEventId = null }) => {
  const matches = (Array.isArray(events) ? events : [])
    .filter((event) => event?.start instanceof Date)
    .slice()
    .sort((left, right) => left.start.getTime() - right.start.getTime());

  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] shadow-sm" aria-labelledby="schedule-match-list-title">
      <header className="border-b border-[var(--border-soft)] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 id="schedule-match-list-title" className="text-base font-semibold text-[var(--text-main)]">
              Match List
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">{matches.length} scheduled match{matches.length === 1 ? "" : "es"}</p>
          </div>
          <CalendarDays className="h-5 w-5 text-[var(--text-muted)]" aria-hidden="true" />
        </div>
      </header>

      {matches.length === 0 ? (
        <div className="grid min-h-48 place-items-center p-5 text-center">
          <p className="text-sm text-[var(--text-muted)]">No matches match the current filters.</p>
        </div>
      ) : (
        <div className="max-h-[44rem] flex-1 space-y-2 overflow-y-auto overscroll-contain p-3">
          {matches.map((event, index) => {
            const eventId = Number(event?.match_id || event?.id || 0);
            const selected = eventId > 0 && Number(selectedEventId) === eventId;
            const status = String(event?.status || "SCHEDULED").toUpperCase();
            const content = (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-300">
                      {event?.sportDisplayLabel || getSportDisplayName(event, event?.sport || "Sport")}
                    </p>
                    <p className="mt-1 break-words text-sm font-semibold leading-snug text-[var(--text-main)]">
                      {getScheduleParticipantLabel(event)}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClasses[status] || "border-[var(--border-soft)] bg-[var(--surface-soft)] text-[var(--text-muted)]"}`}>
                    {status.charAt(0) + status.slice(1).toLowerCase()}
                  </span>
                </div>
                <div className="mt-2 grid gap-1 text-xs text-[var(--text-muted)]">
                  <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" aria-hidden="true" />{formatDay(event.start)} · {formatTime(event.start)}</span>
                  <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{event?.venueLabel || event?.venue_name || event?.venue || "Venue pending"}</span>
                </div>
              </>
            );
            const className = `block w-full rounded-xl border p-3 text-left transition-colors duration-150 motion-reduce:transition-none ${selected ? "border-blue-400 bg-blue-50 dark:border-blue-500 dark:bg-blue-500/10" : "border-[var(--border-soft)] bg-[var(--surface-soft)] hover:border-blue-300 hover:bg-blue-50/60 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/5"}`;

            return onSelectEvent ? (
              <button key={`${eventId || "match"}-${index}`} type="button" className={className} onClick={() => onSelectEvent(event)}>
                {content}
              </button>
            ) : (
              <article key={`${eventId || "match"}-${index}`} className={className}>{content}</article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default ScheduleMatchList;
