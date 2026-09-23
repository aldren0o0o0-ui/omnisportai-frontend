import AppModal from "../common/AppModal";

const statusClassByCategory = {
  completed:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/35 dark:bg-emerald-500/10 dark:text-emerald-300",
  ongoing:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/35 dark:bg-amber-500/10 dark:text-amber-300",
  upcoming:
    "border-[var(--border-soft)] bg-[var(--surface-soft)] text-[var(--text-muted)]",
};

const DetailRow = ({ label, value }) => (
  <div className="grid gap-1 border-b border-[var(--border-soft)] py-3 last:border-b-0 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-start sm:gap-4">
    <dt className="text-sm font-medium text-[var(--text-muted)]">{label}</dt>
    <dd className="min-w-0 break-words text-sm font-medium text-[var(--text-main)] sm:text-right">
      {value}
    </dd>
  </div>
);

const ParticipantScore = ({ participant }) => (
  <div
    className={`flex min-w-0 items-center justify-between gap-4 rounded-xl border px-4 py-3 ${
      participant?.isWinner
        ? "border-emerald-200 bg-emerald-50/80 dark:border-emerald-500/30 dark:bg-emerald-500/10"
        : "border-[var(--border-soft)] bg-[var(--surface-soft)]"
    }`}
  >
    <div className="min-w-0">
      <p className="break-words text-sm font-semibold text-[var(--text-main)]">
        {participant?.name || "TBD"}
      </p>
      {participant?.isWinner ? (
        <p className="mt-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
          Winner
        </p>
      ) : null}
    </div>
    <span className="shrink-0 font-mono text-xl font-bold text-[var(--text-main)]">
      {participant?.score ?? 0}
    </span>
  </div>
);

const MatchDetailsPanel = ({ match, isOpen, onClose, onViewScore }) => {
  const statusClass =
    statusClassByCategory[match?.statusCategory] || statusClassByCategory.upcoming;
  const matchTitle = match?.matchNumber
    ? `Match ${match.matchNumber}`
    : "Match Details";

  return (
    <AppModal
      open={Boolean(isOpen && match)}
      onClose={onClose}
      title={matchTitle}
      subtitle={match?.roundLabel || "Bracket match information"}
      maxWidthClass="max-w-2xl"
      overlayClassName="bg-slate-950/55 backdrop-blur-md dark:bg-slate-950/70"
      closeButtonLabel="Close match details"
    >
      {match ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[var(--text-muted)]">
              Official bracket match details
            </p>
            <span
              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass}`}
            >
              {match.statusLabel || "Upcoming"}
            </span>
          </div>

          <section aria-label="Participants and score" className="grid gap-3">
            <ParticipantScore participant={match.team1} />
            <ParticipantScore participant={match.team2} />
          </section>

          <dl className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-4">
            <DetailRow label="Winner" value={match.winnerName || "To be determined"} />
            <DetailRow label="Schedule" value={match.scheduledAt || "Not scheduled"} />
            <DetailRow label="Venue" value={match.venueName || "Not assigned"} />
            <DetailRow label="Bracket side" value={match.bracketSide || "Not applicable"} />
          </dl>

          <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border-soft)] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] px-4 text-sm font-semibold text-[var(--text-main)] transition-colors duration-150 hover:bg-[var(--surface-muted)] motion-reduce:transition-none"
            >
              Close
            </button>
            {match?.id && onViewScore ? (
              <button
                type="button"
                onClick={() => onViewScore(match)}
                className="min-h-11 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                View match score
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </AppModal>
  );
};

export default MatchDetailsPanel;
