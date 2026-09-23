import { ChevronDown, UsersRound } from "lucide-react";

const SHAPE_LABELS = { TEAM: "Team", SOLO: "Individual", DUO: "Pair" };
const STATUS_LABELS = {
  DRAFT: "Draft", INCOMPLETE: "Incomplete", PENDING: "Pending",
  PENDING_REVIEW: "Pending Review", SUBMITTED: "Submitted", UNDER_REVIEW: "Under Review",
  APPROVED: "Approved", REJECTED: "Rejected", REVISION_REQUESTED: "Needs Changes",
};

const entryStatusLabel = (status) => STATUS_LABELS[String(status || "").toUpperCase()]
  || String(status || "Entry").replaceAll("_", " ").toLowerCase();

const statusTone = (status) => {
  const value = String(status || "").toUpperCase();
  if (value === "APPROVED") return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300";
  if (value === "REJECTED") return "bg-rose-500/10 text-rose-600 dark:text-rose-300";
  if (["PENDING_REVIEW", "SUBMITTED", "UNDER_REVIEW"].includes(value)) return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
  return "bg-[var(--surface-muted)] text-[var(--text-muted)]";
};

const eventSummary = (event) => {
  const shape = String(event.participant_shape || "TEAM").toUpperCase();
  const parts = [SHAPE_LABELS[shape] || shape];
  if (shape === "TEAM" && event.min_players && event.max_players) {
    parts.push(`${event.min_players}–${event.max_players} players`);
    parts.push(`${event.submitted_department_count} of ${event.eligible_department_count} departments submitted`);
  } else {
    if (shape === "DUO") parts.push("2 athletes per pair");
    const capacity = (event.departments || []).reduce((sum, row) => sum + Number(row.capacity || 0), 0);
    parts.push(`${event.submitted_entry_count || 0} of ${capacity} entries submitted`);
  }
  return parts.join(" · ");
};

const memberLabel = (entry, shape) => {
  const count = Number(entry.member_count || 0);
  if (shape === "TEAM") return `${count} player${count === 1 ? "" : "s"}`;
  return `${count} athlete${count === 1 ? "" : "s"}`;
};

const EventEntryTable = ({ event, sport, participantById, onOpenEntry, onResubmitEntry, viewerMode }) => {
  const shape = String(event.participant_shape || "TEAM").toUpperCase();
  const rows = (event.departments || []).flatMap((department) => {
    const entries = Array.isArray(department.entries) ? department.entries : [];
    if (!entries.length) return [{ key: `empty-${department.department_id}`, department, entry: null }];
    return entries.map((entry) => ({
      key: entry.registration_id
        ? `team-registration-${entry.registration_id}`
        : `entry-${entry.entry_id}`,
      department,
      entry,
    }));
  });

  return (
    <div className="mb-3 overflow-hidden border-y border-[var(--border-soft)]" role="table" aria-label={`${event.event_name} entries`}>
      <div className="hidden min-h-10 grid-cols-[minmax(110px,.8fr)_minmax(180px,1.5fr)_110px_130px_80px] items-center gap-3 bg-[var(--surface-soft)] px-4 text-[11px] font-bold uppercase tracking-wide text-[var(--text-soft)] md:grid" role="row">
        <span role="columnheader">Department</span><span role="columnheader">Entry / Team</span>
        <span role="columnheader">{shape === "TEAM" ? "Players" : "Athletes"}</span>
        <span role="columnheader">Status</span><span className="text-right" role="columnheader">Action</span>
      </div>
      <div className="divide-y divide-[var(--border-soft)]">
        {rows.map(({ key, department, entry }) => {
          const departmentLabel = department.department_code || department.department_name;
          if (!entry) {
            return (
              <div key={key} className="grid gap-2 px-4 py-3 md:min-h-14 md:grid-cols-[minmax(110px,.8fr)_minmax(180px,1.5fr)_110px_130px_80px] md:items-center md:gap-3" role="row">
                <p className="text-sm font-bold text-[var(--text-main)]" role="cell">{departmentLabel}</p>
                <p className="text-sm text-[var(--text-soft)]" role="cell">—</p>
                <p className="hidden text-sm text-[var(--text-soft)] md:block" role="cell">—</p>
                <p className="text-sm text-[var(--text-soft)]" role="cell">{department.capacity > 1 ? "No entries yet" : "No entry yet"}</p>
                <span className="hidden md:block" aria-label="No action" role="cell">—</span>
              </div>
            );
          }

          const participant = entry.entry_id ? participantById.get(Number(entry.entry_id)) : null;
          const drawerEntry = participant || {
            ...entry, entry_name: entry.display_name, participant_shape: shape,
            department_id: department.department_id, department_name: department.department_name,
            department_code: department.department_code, sport_id: sport.sport_id,
            sport_name: sport.canonical_display_name || sport.sport_name,
            tournament_sport_event_id: event.event_id, event_name: event.event_name,
            status: entry.status, can_review: Boolean(entry.can_review),
          };
          const canReview = Boolean(entry.can_review) && String(entry.status || "").toUpperCase() === "PENDING_REVIEW";
          const status = String(entry.status || "").toUpperCase();
          const isCoach = ["coach", "assistant_coach"].includes(String(viewerMode || "").toLowerCase());
          const canResubmit = isCoach && Boolean(onResubmitEntry)
            && ["INCOMPLETE", "REJECTED", "EXPIRED", "REVISION_REQUESTED"].includes(status);
          const actionLabel = canResubmit ? "Resubmit" : canReview || (isCoach && status === "APPROVED") ? "Review" : "View";

          return (
            <div key={key} className="grid gap-2 px-4 py-3 transition hover:bg-[var(--surface-soft)] md:min-h-14 md:grid-cols-[minmax(110px,.8fr)_minmax(180px,1.5fr)_110px_130px_80px] md:items-center md:gap-3" role="row">
              <div className="min-w-0" role="cell">
                <p className="truncate text-sm font-bold text-[var(--text-main)]">{departmentLabel}</p>
                {shape !== "TEAM" && department.capacity > 1 ? <p className="text-[11px] text-[var(--text-soft)]">{department.created_count} of {department.capacity} entries</p> : null}
              </div>
              <p className="truncate text-sm font-semibold text-[var(--text-main)]" role="cell">{entry.display_name || "Entry"}</p>
              <p className="text-xs font-semibold text-[var(--text-muted)]" role="cell">{memberLabel(entry, shape)}</p>
              <div role="cell"><span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${statusTone(entry.status)}`}>{entryStatusLabel(entry.status)}</span></div>
              <div className="md:text-right" role="cell"><button type="button" onClick={() => canResubmit ? onResubmitEntry(drawerEntry) : onOpenEntry(drawerEntry)} aria-label={`${actionLabel} ${entry.display_name}`} className={`min-h-9 rounded-lg px-3 text-xs font-bold ${canReview || canResubmit ? "bg-[var(--primary)] text-white hover:opacity-90" : "os-btn-ghost-soft"}`}>{actionLabel}</button></div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function EventCenteredCompetitionDirectory({ sportGroups = [], participantById, onOpenEntry, onResubmitEntry, viewerMode, emptyTitle = "No competition events configured yet", emptyMessage = "Add sports and events to this Intramural first." }) {
  if (!sportGroups.length) return <div className="rounded-2xl border border-dashed border-[var(--border-soft)] px-5 py-10 text-center"><UsersRound className="mx-auto text-[var(--text-soft)]" size={32} /><h2 className="mt-3 text-sm font-bold text-[var(--text-main)]">{emptyTitle}</h2><p className="mt-1 text-sm text-[var(--text-muted)]">{emptyMessage}</p></div>;

  return <div className="space-y-6" aria-label="Event-centered Teams and Entries Directory">{sportGroups.map((sport, sportIndex) => <section key={sport.sport_id} aria-labelledby={`directory-sport-${sport.sport_id}`}><div className="mb-2 flex flex-wrap items-baseline gap-2 border-b border-[var(--border-soft)] pb-2"><h2 id={`directory-sport-${sport.sport_id}`} className="text-lg font-bold text-[var(--text-main)]">{sport.canonical_display_name || sport.sport_name}</h2><span className="text-xs text-[var(--text-muted)]">{sport.events?.length || 0} event{sport.events?.length === 1 ? "" : "s"}</span></div><div className="divide-y divide-[var(--border-soft)]">{(sport.events || []).map((event, eventIndex) => <details key={event.event_id} className="group" defaultOpen={sportIndex === 0 && eventIndex === 0}><summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><div className="min-w-0"><h3 className="truncate text-sm font-bold text-[var(--text-main)]">{event.event_name}</h3><p className="mt-0.5 text-xs text-[var(--text-muted)]">{eventSummary(event)}</p></div><ChevronDown size={17} className="shrink-0 text-[var(--text-soft)] transition-transform group-open:rotate-180" aria-hidden="true" /></summary><EventEntryTable event={event} sport={sport} participantById={participantById} onOpenEntry={onOpenEntry} onResubmitEntry={onResubmitEntry} viewerMode={viewerMode} /></details>)}</div></section>)}</div>;
}
