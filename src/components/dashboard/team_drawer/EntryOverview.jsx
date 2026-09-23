import { Shield, UserCheck, Users, CheckCircle2, AlertCircle } from "lucide-react";

export const EntryOverview = ({
  coachName,
  shape = "TEAM",
  playerCount = 0,
  targetPlayers = 0,
  status = "APPROVED",
  isReady = true,
  issues = [],
}) => {
  const shapeLabel = shape === "SOLO" ? "Solo Athlete" : shape === "DUO" ? "Duo Pair" : "Team Entry";
  const playersDisplay = targetPlayers > 0 ? `${playerCount} / ${targetPlayers}` : `${playerCount} registered`;
  const isApproved = /APPROVED|ACCEPTED|READY/.test(String(status).toUpperCase());

  const rows = [
    {
      label: "Coach",
      value: coachName || "Unassigned",
      tone: coachName ? "normal" : "warning",
    },
    {
      label: "Entry Type",
      value: shapeLabel,
      tone: "normal",
    },
    {
      label: shape === "SOLO" ? "Athlete" : "Players",
      value: playersDisplay,
      tone: "normal",
    },
    {
      label: "Eligibility",
      value: playerCount > 0 ? "Roster Listed" : "Pending Roster",
      tone: playerCount > 0 ? "success" : "warning",
    },
    {
      label: "Entry Status",
      value: isApproved ? "Approved" : status || "Under Review",
      tone: isApproved ? "success" : "warning",
    },
    {
      label: "Readiness",
      value: isReady ? "Ready for Competition" : issues[0] || "Needs Attention",
      tone: isReady ? "success" : "warning",
    },
  ];

  return (
    <section aria-label="Entry Overview" className="space-y-2">
      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
        Overview
      </h3>
      <div className="divide-y divide-[var(--border-soft)] rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3.5 py-1 text-xs">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between py-2.5"
          >
            <span className="font-semibold text-[var(--text-muted)]">{row.label}</span>
            <span
              className={`font-bold ${
                row.tone === "success"
                  ? "text-emerald-400"
                  : row.tone === "warning"
                  ? "text-amber-300"
                  : "text-[var(--text-main)]"
              }`}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default EntryOverview;
