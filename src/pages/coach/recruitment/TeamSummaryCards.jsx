import MetricCard from "../../../components/common/MetricCard";
import { Users, CheckCircle, ClipboardList } from "lucide-react";

/**
 * Team Summary (V2) — four action-oriented cards: Applicants, Accepted Players,
 * Roster progress, Medical completion. Omits "Available Slots". Medical reads
 * contextually (not "Not required") so it explains the workflow rather than
 * system state.
 *
 * MetricCard renders its own card surface, so this is a plain grid (no extra
 * wrapping card) to avoid nested containers.
 */
const TeamSummaryCards = ({ workspace, className = "" }) => {
  const counts = workspace?.counts || {};
  const total = Number(counts.total || 0);
  const accepted = Number(counts.accepted || 0);

  const maxPlayers = workspace?.maxPlayers ?? null;
  const rosterValue = maxPlayers ? `${accepted} / ${maxPlayers}` : String(accepted);

  return (
    <section className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-3 ${className}`}>
      <MetricCard title="Applicants" value={total} icon={Users} color="blue" />
      <MetricCard title="Accepted Players" value={accepted} icon={CheckCircle} color="green" />
      <MetricCard title="Roster" value={rosterValue} icon={ClipboardList} color="slate" />
    </section>
  );
};

export default TeamSummaryCards;
