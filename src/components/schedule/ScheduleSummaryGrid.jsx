import { AlertTriangle, BarChart3, Building2, CalendarRange } from "lucide-react";
import {
  eventHasConflict,
  getStatusTone,
  getVenueKey
} from "./venueScheduleUtils";

const StatCard = ({ icon: Icon, label, value, helper }) => (
  <article className="rounded-xl bg-white p-3 shadow-sm shadow-slate-200/60 dark:bg-[var(--surface)]/90 dark:shadow-none">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
      </div>
      <Icon className="text-blue-500 dark:text-cyan-300" size={18} />
    </div>
    {helper ? <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{helper}</p> : null}
  </article>
);

const ScheduleSummaryGrid = ({ events = [], venues = [] }) => {
  const totalMatches = events.length;
  const liveMatches = events.filter((event) => getStatusTone(event.status) === "live").length;
  const conflictMatches = events.filter((event) => eventHasConflict(event)).length;
  const unassigned = events.filter((event) => getVenueKey(event) === "unassigned").length;

  return (
    <section>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={CalendarRange}
          label="Total Matches"
          value={totalMatches}
          helper="Visible schedule items."
        />
        <StatCard
          icon={BarChart3}
          label="Live or Ongoing"
          value={liveMatches}
          helper="Matches currently in progress."
        />
        <StatCard
          icon={AlertTriangle}
          label="Conflicts"
          value={conflictMatches}
          helper="Items flagged as conflict or delayed."
        />
        <StatCard
          icon={Building2}
          label="Unassigned"
          value={unassigned}
          helper={`${venues.length} venue profile${venues.length === 1 ? "" : "s"} loaded.`}
        />
      </div>
    </section>
  );
};

export default ScheduleSummaryGrid;
