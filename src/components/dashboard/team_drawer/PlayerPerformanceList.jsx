import { useMemo } from "react";
import PlayerPerformanceRow from "./PlayerPerformanceRow";
import { getPrimaryMetricConfig, detectSportCategory } from "./teamDrawerUtils";

export const PlayerPerformanceList = ({
  playerRows = [],
  sportName = "",
  metricOptions = [],
  onSelectPlayer,
}) => {
  const sportCategory = useMemo(() => detectSportCategory(sportName), [sportName]);
  const primaryConfig = useMemo(
    () => getPrimaryMetricConfig(sportCategory, metricOptions),
    [sportCategory, metricOptions]
  );

  // Compute maximum value for relative bar widths
  const maxValue = useMemo(() => {
    const primaryKey = primaryConfig.key;
    const values = playerRows.map((p) => Number(p.metrics?.[primaryKey] || 0));
    return Math.max(1, ...values);
  }, [playerRows, primaryConfig.key]);

  // Sort players descending by primary metric
  const sortedPlayers = useMemo(() => {
    const primaryKey = primaryConfig.key;
    return [...playerRows].sort((a, b) => {
      const vA = Number(a.metrics?.[primaryKey] || 0);
      const vB = Number(b.metrics?.[primaryKey] || 0);
      if (vB !== vA) return vB - vA;
      const nameA = a.participant_name || a.name || "";
      const nameB = b.participant_name || b.name || "";
      return nameA.localeCompare(nameB);
    });
  }, [playerRows, primaryConfig.key]);

  if (sortedPlayers.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border-soft)] p-6 text-center text-xs text-[var(--text-muted)]">
        No recorded player performance statistics yet.
      </div>
    );
  }

  return (
    <div className="space-y-2" aria-label="Player Performance Rankings">
      {sortedPlayers.map((player, idx) => (
        <PlayerPerformanceRow
          key={player.participant_id || player.player_id || idx}
          player={player}
          rank={idx + 1}
          primaryConfig={primaryConfig}
          maxValue={maxValue}
          onSelect={onSelectPlayer}
        />
      ))}
    </div>
  );
};

export default PlayerPerformanceList;
