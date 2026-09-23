import { ArrowLeft, ShieldCheck, User } from "lucide-react";
import { PlayerAvatar } from "../../common/IdentityImage";
import { formatMetricBadge } from "./teamDrawerUtils";

export const PlayerDetailDrilldown = ({
  player,
  sportName,
  onBack,
}) => {
  if (!player) return null;

  const playerName = player.participant_name || player.name || player.display_name || "Player";
  const position = player.position || player.role || "Athlete";
  const jersey = player.jersey_number || player.number || null;
  const metrics = player.metrics || {};

  const metricEntries = Object.entries(metrics)
    .filter(([key, val]) => !["MATCHES_PLAYED", "WINS", "LOSSES", "DRAWS"].includes(key) && Number(val) > 0)
    .map(([key, val]) => ({
      code: key,
      formatted: formatMetricBadge(key, val),
      value: val,
    }));

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-right duration-200">
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--primary)] hover:underline focus-visible:outline-none"
      >
        <ArrowLeft size={14} /> Back to Entry Roster
      </button>

      {/* Player Header Card */}
      <div className="flex items-center gap-3.5 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4">
        <PlayerAvatar imageUrl={player.profile_image_url || player.image_url} label={playerName} scale="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="truncate text-base font-extrabold text-[var(--text-main)]">
              {playerName}
            </h4>
            {jersey ? (
              <span className="rounded bg-[var(--primary-soft)] px-1.5 py-0.5 text-[10px] font-black text-[var(--primary)]">
                #{jersey}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">{position} • {sportName}</p>
        </div>
      </div>

      {/* Eligibility Pill */}
      <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-400">
        <ShieldCheck size={16} className="shrink-0" />
        <span>Approved on official tournament roster</span>
      </div>

      {/* Player Recorded Statistics */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
          Recorded Statistics
        </h4>
        {metricEntries.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {metricEntries.map((item) => (
              <div
                key={item.code}
                className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-3 text-center"
              >
                <p className="text-lg font-black tabular-nums text-[var(--text-main)]">
                  {item.value}
                </p>
                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                  {item.code.replace(/_/g, " ")}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[var(--border-soft)] p-4 text-center text-xs text-[var(--text-muted)]">
            No specific event-level stats recorded for this player yet.
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerDetailDrilldown;
