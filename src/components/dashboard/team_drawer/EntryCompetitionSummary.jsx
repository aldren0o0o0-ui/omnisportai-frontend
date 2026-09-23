import { Trophy } from "lucide-react";

export const EntryCompetitionSummary = ({
  teamStandingRow,
  sportCategory = "GENERIC",
  shape = "TEAM",
}) => {
  if (!teamStandingRow) return null;

  const metrics = teamStandingRow.metrics || {};
  const rank = teamStandingRow.rank;
  const wins = Number(metrics.WINS || 0);
  const losses = Number(metrics.LOSSES || 0);
  const draws = Number(metrics.DRAWS || 0);
  const matches = Number(metrics.MATCHES_PLAYED || (wins + losses + draws) || 0);
  const form = Array.isArray(teamStandingRow.form) ? teamStandingRow.form : [];

  if (matches === 0 && !rank) return null;

  const recordDisplay = draws > 0 ? `${wins}–${losses}–${draws}` : `${wins}–${losses}`;
  const rankDisplay = rank ? `${rank}${getOrdinalSuffix(rank)}` : "—";

  // Sport-specific extra metrics
  const pointsFor = metrics.SCORE_FOR || metrics.POINTS_TOTAL || metrics.POINTS_FOR || null;
  const pointsAgainst = metrics.SCORE_AGAINST || metrics.POINTS_AGAINST || null;
  const setsWon = metrics.SETS_WON ?? null;
  const setsLost = metrics.SETS_LOST ?? null;

  const summaryItems = [
    { label: "Record", value: recordDisplay },
    { label: shape === "SOLO" ? "Current Rank" : "Standing", value: rankDisplay },
    { label: "Matches", value: matches },
  ];

  if (sportCategory === "BASKETBALL" && pointsFor !== null && pointsAgainst !== null) {
    summaryItems.push({ label: "Pts For / Against", value: `${pointsFor} / ${pointsAgainst}` });
  } else if (sportCategory === "VOLLEYBALL" && setsWon !== null && setsLost !== null) {
    summaryItems.push({ label: "Sets Won / Lost", value: `${setsWon} / ${setsLost}` });
  } else if (sportCategory === "FOOTBALL" && pointsFor !== null && pointsAgainst !== null) {
    summaryItems.push({ label: "Goals For / Against", value: `${pointsFor} / ${pointsAgainst}` });
  }

  return (
    <section aria-label="Competition Summary" className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
          Competition Summary
        </h3>
        {rank && rank <= 3 ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-amber-400">
            <Trophy size={12} /> Rank #{rank}
          </span>
        ) : null}
      </div>

      <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-3.5 space-y-3">
        <div className="grid grid-cols-3 gap-2 divide-x divide-[var(--border-soft)] text-center">
          {summaryItems.slice(0, 3).map((item, idx) => (
            <div key={item.label} className={idx > 0 ? "pl-2" : ""}>
              <p className="text-base font-black tabular-nums text-[var(--text-main)]">
                {item.value}
              </p>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                {item.label}
              </p>
            </div>
          ))}
        </div>

        {summaryItems.length > 3 ? (
          <div className="flex items-center justify-between border-t border-[var(--border-soft)] pt-2 text-xs text-[var(--text-muted)]">
            <span>{summaryItems[3].label}</span>
            <span className="font-bold tabular-nums text-[var(--text-main)]">{summaryItems[3].value}</span>
          </div>
        ) : null}

        {form.length > 0 ? (
          <div className="flex items-center justify-between border-t border-[var(--border-soft)] pt-2 text-xs">
            <span className="font-semibold text-[var(--text-muted)]">Current Form</span>
            <div className="flex items-center gap-1">
              {form.map((outcome, idx) => {
                const isWin = outcome === "W";
                const isLoss = outcome === "L";
                return (
                  <span
                    key={idx}
                    className={`inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-black ${
                      isWin
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : isLoss
                        ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                        : "bg-slate-500/20 text-slate-300 border border-slate-500/30"
                    }`}
                  >
                    {outcome}
                  </span>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
};

const getOrdinalSuffix = (num) => {
  const n = Number(num);
  if (!n) return "";
  const v = n % 100;
  return ["th", "st", "nd", "rd"][(v - 20) % 10] || ["th", "st", "nd", "rd"][v] || "th";
};

export default EntryCompetitionSummary;
