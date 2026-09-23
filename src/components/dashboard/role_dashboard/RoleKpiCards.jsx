import MetricCard from "../../common/MetricCard";

const SLOT_COLORS = ["blue", "green", "orange", "slate"];

const normalizeKey = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const KPI_COPY_BY_ROLE = {
  COORDINATOR: {
    [normalizeKey("Total Active Sports")]: {
      label: "Active Sports",
      hint: "Configured sports currently active in the platform",
    },
    [normalizeKey("Total Matches Played")]: {
      label: "Completed Matches",
      hint: "Finished matches in the selected tournament scope",
    },
    [normalizeKey("Player Participation Rate")]: {
      label: "Participation Rate",
      hint: "Player activity recorded over the last 30 days",
    },
    [normalizeKey("Upcoming Schedules")]: {
      label: "Upcoming Matches",
      hint: "Scheduled fixtures still ahead in the selected tournament",
    },
  },
  FACILITATOR: {
    [normalizeKey("Scheduled Matches")]: {
      label: "Assigned Matches",
      hint: "Scheduled or live matches inside your sport scope",
    },
    [normalizeKey("Live Game Tracking")]: {
      label: "Live Matches",
      hint: "Assigned matches currently happening right now",
    },
    [normalizeKey("Violations / Fouls")]: {
      label: "Recorded Fouls",
      hint: "Fouls and violations captured from scoped match events",
    },
    [normalizeKey("Game History")]: {
      label: "Completed Matches",
      hint: "Assigned matches already finished in this tournament",
    },
  },
  DEPARTMENT: {
    [normalizeKey("Teams Under Department")]: {
      label: "Department Teams",
      hint: "Department teams with roster-linked activity",
    },
    [normalizeKey("Win/Loss Record")]: {
      label: "Department Record",
      hint: "Current wins, losses, and draws for your department scope",
    },
    [normalizeKey("Player Stats Summary")]: {
      label: "Players With Stats",
      hint: "Players with recorded match-event production",
    },
    [normalizeKey("Participation Rate")]: {
      label: "Recent Participation",
      hint: "Active player share over the last 30 days",
    },
  },
  COACH: {
    [normalizeKey("Team Roster")]: {
      label: "Active Roster",
      hint: "Unique players currently linked to your scoped teams",
    },
    [normalizeKey("Player Performance")]: {
      label: "Team Points",
      hint: "Tracked points produced by players in your roster scope",
    },
    [normalizeKey("Training Insights")]: {
      label: "Team Insights",
      hint: "Auto-generated coaching insights available right now",
    },
    [normalizeKey("Upcoming Matches")]: {
      label: "Next Fixtures",
      hint: "Upcoming matches for your team scope",
    },
  },
  PLAYER: {
    [normalizeKey("Personal Performance")]: {
      label: "My Points",
      hint: "Tracked points from your recorded match events",
    },
    [normalizeKey("Match History")]: {
      label: "Matches With Stats",
      hint: "Matches where your performance has recorded data",
    },
    [normalizeKey("Achievements")]: {
      label: "Unlocked Milestones",
      hint: "Personal milestones earned so far",
    },
    [normalizeKey("Participation Rate")]: {
      label: "Recent Participation",
      hint: "Your activity rate over the last 30 days",
    },
  },
  VIEWER: {
    [normalizeKey("Live Scores")]: {
      label: "Live Matches",
      hint: "Public matches currently in progress",
    },
    [normalizeKey("Match Schedules")]: {
      label: "Upcoming Matches",
      hint: "Public fixtures still ahead in the selected tournament",
    },
    [normalizeKey("Leaderboards")]: {
      label: "Ranked Teams",
      hint: "Teams currently represented in the public leaderboard",
    },
    [normalizeKey("Highlights")]: {
      label: "Featured Results",
      hint: "Completed matches surfaced for viewers",
    },
  },
};

const getPolishedKpi = (dashboardType, kpi) => {
  const roleKey = String(dashboardType || "").trim().toUpperCase();
  const roleCopy = KPI_COPY_BY_ROLE[roleKey] || null;
  if (!roleCopy) return kpi;

  const copy = roleCopy[normalizeKey(kpi?.label)] || null;
  if (!copy) return kpi;

  return {
    ...kpi,
    label: copy.label || kpi.label,
    hint: copy.hint || kpi.hint,
  };
};

const RoleKpiCards = ({ kpis = [], dashboardType }) => {
  const safeKpis = Array.isArray(kpis) ? kpis : [];
  const polishedKpis = safeKpis.map((kpi) => getPolishedKpi(dashboardType, kpi));

  if (polishedKpis.length === 0) {
    return null;
  }

  return (
    <section className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {polishedKpis.map((kpi, index) => (
        <MetricCard
          key={`kpi-${index}`}
          title={kpi.label}
          value={kpi.value}
          color={SLOT_COLORS[index % SLOT_COLORS.length]}
          trendLabel={kpi.hint}
        />
      ))}
    </section>
  );
};

export default RoleKpiCards;
