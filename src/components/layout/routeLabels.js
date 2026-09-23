const SEGMENT_LABELS = {
  dashboard: "Dashboard",
  announcements: "Announcements",
  sports: "Sports",
  "rule-standards": "Sport Rules",
  rules: "Sport Rules",
  teams: "Teams & Entries",
  "teams-and-players": "Teams & Entries",
  intramurals: "Intramurals",
  tournaments: "Intramurals",
  schedules: "Schedules",
  "rehearsal-setup": "Rehearsal Setup",
  venues: "Venues",
  brackets: "Brackets",
  standings: "Standings",
  results: "Results",
  "user-management": "User Management",
  management: "Management",
  "coach-assignments": "Coach Assignments",
  "assigned-staff": "Staff & Officials",
  approvals: "Entry Approvals",
  "player-applications": "Recruitment",
  "team-registration": "Team Registration",
  profile: "Profile",
  intelligence: "Intelligence",
  analytics: "Analytics",
  notifications: "Notifications",
  "notification-settings": "Settings",
  "staff-applications": "Staff Applications",
  players: "Players",
  leaderboards: "Leaderboards",
  highlights: "Highlights",
  create: "Create",
  "read-only": "Read Only",
  "live-scoring": "Live Scoring",
  "result-corrections": "Result Corrections",
  settings: "Settings",
};

export const buildBreadcrumbs = (pathname) => {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length < 2) return [];

  const rolePrefix = segments[0];
  const pathSegments = segments.slice(1);

  const trail = [];
  let builtPath = `/${rolePrefix}`;

  for (let i = 0; i < pathSegments.length; i++) {
    const seg = pathSegments[i];

    if (/^\d+$/.test(seg)) continue;
    if (seg.startsWith(":")) continue;

    const label = rolePrefix === "coordinator" && seg === "teams"
      ? "Competition Entries"
      : SEGMENT_LABELS[seg] || seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " ");
    builtPath += `/${seg}`;
    const isLast = i === pathSegments.length - 1;

    trail.push({
      label,
      to: isLast ? undefined : builtPath,
    });
  }

  return trail;
};
