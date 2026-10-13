import React from "react";
import { Users, User, Shield, Building2 } from "lucide-react";

const getInitials = (name) => {
  if (!name || typeof name !== "string") return "P";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "P";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/**
 * PlayerParticipationCard
 * Displays player participation within the selected intramural:
 * Entry/team name, sport, event, department, roster status, and teammates.
 */
export const PlayerParticipationCard = ({
  participations = [],
  activeSport = null,
}) => {
  if (!Array.isArray(participations) || participations.length === 0) {
    return (
      <div
        className="rounded-xl border border-dashed border-[var(--border-soft)] bg-[var(--surface-soft)] p-4 text-center"
        data-testid="player-participation-empty"
      >
        <p className="text-xs text-[var(--text-muted)]">
          Participant registered, but no active entries in this intramural.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-3.5 space-y-3"
      data-testid="player-participation-card"
    >
      <div className="flex items-center justify-between text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
        <div className="flex items-center gap-1.5">
          <Users size={13} aria-hidden="true" />
          <span>Intramural Entry & Roster Context</span>
        </div>
        <span className="text-[10px] text-[var(--text-soft)]">
          {participations.length} {participations.length === 1 ? "entry" : "entries"}
        </span>
      </div>

      <div className="space-y-2">
        {participations.map((part, idx) => {
          const entryTitle = part.entry_name || part.team || part.sport || "Participant Entry";
          const eventTitle = part.event_name || null;
          const sportTitle = part.sport || null;
          const deptTitle = part.department || part.department_name || null;
          const shape = (part.participant_shape || "SOLO").toUpperCase();
          const rosterStatus = (part.roster_status || "APPROVED").toUpperCase();
          const teammates = Array.isArray(part.teammates) ? part.teammates : [];

          return (
            <div
              key={part.entry_id || part.team_id || idx}
              className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] p-3 text-xs space-y-2"
              data-testid={`participation-entry-${part.entry_id || idx}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[var(--text-main)]" title={entryTitle}>
                    {entryTitle}
                  </span>
                  <span className="rounded bg-[var(--surface-soft)] border border-[var(--border-soft)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--primary)]">
                    {shape}
                  </span>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                    rosterStatus === "APPROVED" || rosterStatus === "ACTIVE"
                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {rosterStatus}
                </span>
              </div>

              {/* Sport, Event, Department metadata */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--text-muted)]">
                {sportTitle ? (
                  <span>
                    <strong className="font-medium text-[var(--text-main)]">{sportTitle}</strong>
                    {eventTitle ? ` · ${eventTitle}` : ""}
                  </span>
                ) : null}
                {deptTitle ? (
                  <span className="inline-flex items-center gap-1 text-[var(--text-soft)]">
                    <Building2 size={11} /> {deptTitle}
                  </span>
                ) : null}
              </div>

              {/* Teammates / Duo partner if present */}
              {teammates.length > 0 ? (
                <div className="pt-2 border-t border-[var(--border-soft)] space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-soft)] flex items-center gap-1.5">
                      <Users size={12} className="text-[var(--primary)]" aria-hidden="true" />
                      {shape === "DUO" ? "Partner:" : "Teammates:"}
                    </span>
                    <span className="rounded-full bg-[var(--surface-muted)] border border-[var(--border-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--text-muted)]">
                      {teammates.length} {teammates.length === 1 ? "player" : "players"}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {teammates.map((teammate, tIdx) => {
                      const tmName =
                        typeof teammate === "string"
                          ? teammate
                          : teammate?.name || teammate?.display_name || teammate?.full_name || "Player";
                      const initials = getInitials(tmName);

                      return (
                        <div
                          key={tIdx}
                          className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-soft)]/50 px-2.5 py-1.5 transition-colors hover:bg-[var(--surface-soft)] hover:border-[var(--border-strong)]"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[9px] font-bold text-[var(--primary)] border border-[var(--primary)]/20 shadow-2xs">
                              {initials}
                            </span>
                            <span
                              className="truncate text-xs font-semibold text-[var(--text-main)]"
                              title={tmName}
                            >
                              {tmName}
                            </span>
                          </div>
                          <span className="shrink-0 text-[10px] font-medium text-[var(--text-muted)] bg-[var(--surface)] border border-[var(--border-soft)] rounded px-1.5 py-0.5">
                            {shape === "DUO" ? "Partner" : "Roster"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlayerParticipationCard;
