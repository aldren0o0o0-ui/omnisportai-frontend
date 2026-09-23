import { RefreshCcw } from "lucide-react";
import DashboardCard from "../../common/DashboardCard";

const RoleDashboardControls = ({
  tournaments = [],
  selectedTournamentId = "",
  onTournamentChange,
  minRestMinutes = "30",
  onMinRestChange,
  onRefresh,
  loading = false,
  layout = "default",
}) => {
  const containerClass =
    layout === "compact"
      ? "grid gap-3 md:grid-cols-[1.7fr,1fr,auto]"
      : "grid gap-3 md:grid-cols-[2fr,1fr,auto]";

  return (
    <DashboardCard className="mb-6">
      <div className={containerClass}>
        <select
          value={selectedTournamentId}
          onChange={(event) => onTournamentChange(event.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-500 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-100"
        >
          {tournaments.length === 0 ? (
            <option value="">No tournaments found</option>
          ) : null}
          {tournaments.map((tournament) => (
            <option key={tournament.id} value={tournament.id}>
              {tournament.name}
            </option>
          ))}
        </select>

        <input
          type="number"
          min="0"
          max="240"
          value={minRestMinutes}
          onChange={(event) => onMinRestChange(event.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-500 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-100"
          placeholder="Min Rest Minutes"
        />

        <button
          type="button"
          onClick={() => onRefresh(selectedTournamentId)}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[var(--surface-soft)] dark:hover:bg-slate-700 dark:text-slate-200 px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCcw size={15} />
          Refresh
        </button>
      </div>
    </DashboardCard>
  );
};

export default RoleDashboardControls;
