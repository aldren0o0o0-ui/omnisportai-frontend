import { ChevronRight, Pencil, Shield, Trophy, UserCheck } from "lucide-react";
import { TeamLogo } from "../common/IdentityImage";

export const EntryDirectoryRow = ({
  entry,
  canEdit = false,
  isParticipant = false,
  onOpen,
  onEdit,
}) => {
  const shape = String(entry.participant_shape || entry.shape || "TEAM").toUpperCase();
  const shapeLabel = shape === "SOLO" ? "SOLO" : shape === "DUO" ? "DUO" : "TEAM";
  const entryName = entry.display_name || entry.entry_name || entry.name || "Entry";
  const sportName = entry.sport_name || entry.sport || "Sport";
  const eventName = entry.event_name || null;
  const deptCode = entry.department_code || entry.department_name || null;
  const coachName = entry.coach?.display_name || entry.coach_name || null;
  const playerCount = entry.members?.length ?? entry.players_count ?? 0;
  const status = entry.public_status || entry.status || "APPROVED";
  const isApproved = /APPROVED|ACCEPTED|READY/.test(String(status).toUpperCase());

  return (
    <div className="group flex items-center justify-between gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-3 transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)] sm:p-3.5">
      {/* Clickable Main Target */}
      <button
        type="button"
        onClick={() => onOpen?.(entry)}
        className="flex min-w-0 flex-1 items-center gap-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
        aria-label={`View details for ${entryName}`}
      >
        <TeamLogo imageUrl={entry.image_url || entry.imageUrl} label={entryName} scale="md" />

        <div className="min-w-0 flex-1">
          {/* Top Line: Sport, Event, Shape, Department, Your Entry */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
            <span className="font-bold text-[var(--text-main)]">
              {sportName}{eventName ? ` • ${eventName}` : ""}
            </span>
            <span>•</span>
            <span className="rounded bg-[var(--surface)] px-1.5 py-0.5 text-[10px] font-black text-[var(--text-soft)] border border-[var(--border-soft)]">
              {shapeLabel}
            </span>
            {deptCode ? (
              <>
                <span>•</span>
                <span className="font-bold text-blue-400">{deptCode}</span>
              </>
            ) : null}
            {isParticipant ? (
              <>
                <span>•</span>
                <span className="rounded bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-black text-indigo-300 border border-indigo-500/20">
                  Your Entry
                </span>
              </>
            ) : null}
          </div>

          {/* Title Line */}
          <p className="mt-0.5 truncate text-sm font-extrabold text-[var(--text-main)]">
            {entryName}
          </p>

          {/* Sub Line: Coach and Players */}
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
            <span>
              {playerCount} {shape === "SOLO" ? "Athlete" : "Players"}
            </span>
            {coachName ? (
              <>
                <span>•</span>
                <span className="truncate">Coach: {coachName}</span>
              </>
            ) : null}
          </div>
        </div>
      </button>

      {/* Right Side Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <span
          className={`hidden rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wide sm:inline-flex ${
            isApproved
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : "bg-amber-500/10 text-amber-300 border border-amber-500/20"
          }`}
        >
          {isApproved ? "Ready" : status}
        </span>

        {/* Contextual Edit button only for authorized user */}
        {canEdit && onEdit ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(entry);
            }}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] px-2.5 text-xs font-bold text-[var(--text-main)] shadow-sm hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            title="Edit entry identity"
          >
            <Pencil size={12} />
            <span>Edit</span>
          </button>
        ) : null}

        {/* Standard subtle open chevron */}
        <button
          type="button"
          onClick={() => onOpen?.(entry)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-soft)] hover:text-[var(--text-main)] focus-visible:outline-none"
          aria-label="Open details"
        >
          <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
};

export default EntryDirectoryRow;
