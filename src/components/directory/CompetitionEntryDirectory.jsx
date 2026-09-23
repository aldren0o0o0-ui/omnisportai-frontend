import { useMemo } from "react";
import { ChevronLeft, ChevronRight, UsersRound } from "lucide-react";
import EntryDirectoryRow from "./EntryDirectoryRow";
import {
  canEditEntry,
  isUserParticipantInEntry,
  getRoleEmptyState,
} from "../../utils/ownershipCapabilities";

export const CompetitionEntryDirectory = ({
  entries = [],
  currentUser = null,
  effectiveMode = "",
  hasActiveFilters = false,
  groupBySport = false,
  page = 1,
  totalPages = 1,
  onPageChange,
  onOpenEntry,
  onEditEntry,
}) => {
  // Check if list is empty
  if (!Array.isArray(entries) || entries.length === 0) {
    const emptyState = getRoleEmptyState(effectiveMode, hasActiveFilters);
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border-soft)] bg-[var(--surface-soft)] p-8 text-center">
        <UsersRound className="text-[var(--text-soft)]" size={32} />
        <h3 className="mt-3 text-sm font-bold text-[var(--text-main)]">
          {emptyState.title}
        </h3>
        <p className="mt-1 max-w-sm text-xs text-[var(--text-muted)]">
          {emptyState.message}
        </p>
      </div>
    );
  }

  // If grouped by sport & event
  if (groupBySport) {
    const groups = [];
    const groupMap = new Map();

    for (const entry of entries) {
      const sportName = entry.sport_name || entry.sport || "Sport";
      const eventName = entry.event_name || "";
      const groupKey = `${sportName}__${eventName}`;

      if (!groupMap.has(groupKey)) {
        const groupObj = {
          key: groupKey,
          sportName,
          eventName,
          entries: [],
        };
        groupMap.set(groupKey, groupObj);
        groups.push(groupObj);
      }
      groupMap.get(groupKey).entries.push(entry);
    }

    return (
      <div className="space-y-6" aria-label="Grouped Teams and Entries Directory">
        {groups.map((group) => (
          <section key={group.key} className="space-y-2.5">
            <div className="flex items-baseline gap-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-[var(--text-main)]">
                {group.sportName}
              </h3>
              {group.eventName ? (
                <span className="text-xs text-[var(--text-muted)]">
                  • {group.eventName}
                </span>
              ) : null}
            </div>

            <div className="space-y-2">
              {group.entries.map((entry) => (
                <EntryDirectoryRow
                  key={entry.entry_id || entry.participant_key || entry.id}
                  entry={entry}
                  canEdit={canEditEntry(currentUser, entry, effectiveMode)}
                  isParticipant={isUserParticipantInEntry(currentUser, entry)}
                  onOpen={onOpenEntry}
                  onEdit={onEditEntry}
                />
              ))}
            </div>
          </section>
        ))}

        {totalPages > 1 ? (
          <nav aria-label="Pagination" className="flex items-center justify-center gap-3 pt-3">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange?.(Math.max(1, page - 1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-soft)] text-[var(--text-main)] disabled:opacity-30"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-semibold text-[var(--text-muted)]">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange?.(Math.min(totalPages, page + 1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-soft)] text-[var(--text-main)] disabled:opacity-30"
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </nav>
        ) : null}
      </div>
    );
  }

  // Flat List
  return (
    <div className="space-y-2" aria-label="Teams and Entries Directory">
      {entries.map((entry) => (
        <EntryDirectoryRow
          key={entry.entry_id || entry.participant_key || entry.id}
          entry={entry}
          canEdit={canEditEntry(currentUser, entry, effectiveMode)}
          isParticipant={isUserParticipantInEntry(currentUser, entry)}
          onOpen={onOpenEntry}
          onEdit={onEditEntry}
        />
      ))}

      {totalPages > 1 ? (
        <nav aria-label="Pagination" className="flex items-center justify-center gap-3 pt-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange?.(Math.max(1, page - 1))}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-soft)] text-[var(--text-main)] disabled:opacity-30"
            aria-label="Previous page"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs font-semibold text-[var(--text-muted)]">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange?.(Math.min(totalPages, page + 1))}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-soft)] text-[var(--text-main)] disabled:opacity-30"
            aria-label="Next page"
          >
            <ChevronRight size={16} />
          </button>
        </nav>
      ) : null}
    </div>
  );
};

export default CompetitionEntryDirectory;
