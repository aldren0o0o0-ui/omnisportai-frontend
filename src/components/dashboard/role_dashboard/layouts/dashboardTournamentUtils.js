import { safeDateFromIso, formatShortDate, formatDateTime, startOfDay, endOfDay, getAnnouncementGroup } from "./dashboardDateUtils";
import { isLiveEvent, isCompletedEvent, getUpcomingEvents, getSportLabel } from "./dashboardEventUtils";

export const getSelectedTournament = (dashboard) => {
  const selectedId = String(dashboard?.selected_tournament_id || "").trim();
  const tournaments = Array.isArray(dashboard?.tournaments) ? dashboard.tournaments : [];
  if (!selectedId) return null;
  return tournaments.find((row) => String(row?.id) === selectedId) || null;
};

export const getSelectedTournamentName = (dashboard) => {
  const tournament = getSelectedTournament(dashboard);
  return String(tournament?.name || "").trim();
};

export const deriveTournamentPhase = (tournament, events = [], now = new Date()) => {
  const safeEvents = Array.isArray(events) ? events : [];

  if (safeEvents.some((event) => isLiveEvent(event, now))) return "running";

  const start = startOfDay(tournament?.start_date);
  const end = endOfDay(tournament?.end_date);

  if (start && now < start) return "pre";
  if (end && now > end) return "finished";

  const hasEvents = safeEvents.length > 0;
  if (hasEvents) {
    const everythingDone =
      safeEvents.every((event) => isCompletedEvent(event, now)) &&
      getUpcomingEvents(safeEvents, now).length === 0;
    if (everythingDone) return "finished";
  }

  if (!start && !end && !hasEvents) return "pre";

  return "running";
};

export const resolveDashboardLifecycleStage = ({
  status = "",
  phase = "pre",
  hasLiveMatch = false,
  hasTodayMatches = false,
  hasRegistrationActivity = false,
} = {}) => {
  const normalizedStatus = String(status || "").trim().toUpperCase();
  const normalizedPhase = String(phase || "pre").trim().toLowerCase();

  if (
    hasLiveMatch ||
    hasTodayMatches ||
    normalizedPhase === "running" ||
    normalizedPhase === "finished" ||
    ["LIVE", "ONGOING", "IN_PROGRESS", "RUNNING", "COMPLETED", "FINISHED", "CLOSED", "FINALIZED"].includes(normalizedStatus)
  ) {
    return "live";
  }

  if (
    hasRegistrationActivity ||
    ["REGISTRATION", "RECRUITING", "OPEN", "ENTRY_PERIOD"].includes(normalizedStatus)
  ) {
    return "registration";
  }

  return "announced";
};

export const deriveSportsOverview = (events = [], brackets = [], tournamentSports = []) => {
  const safeEvents = Array.isArray(events) ? events : [];
  const safeBrackets = Array.isArray(brackets) ? brackets : [];
  const safeTournamentSports = Array.isArray(tournamentSports) ? tournamentSports : [];

  const bracketBySport = new Map();
  safeBrackets.forEach((bracket) => {
    const name = String(bracket?.sportName || bracket?.sport_name || bracket?.sport || "").trim().toLowerCase();
    if (name) bracketBySport.set(name, bracket);
  });

  const grouped = new Map();

  // Initialize with tournament sports so all intramural-specific sports are represented
  safeTournamentSports.forEach((ts) => {
    const name = String(ts?.name || ts?.sport_name || ts?.sport || "").trim();
    if (name && !grouped.has(name.toLowerCase())) {
      grouped.set(name.toLowerCase(), { sport: name, teamIds: new Set(), matchCount: 0 });
    }
  });

  safeEvents.forEach((event) => {
    const sport = getSportLabel(event);
    const key = sport.toLowerCase();
    if (!grouped.has(key)) {
      grouped.set(key, { sport, teamIds: new Set(), matchCount: 0 });
    }
    const entry = grouped.get(key);
    entry.matchCount += 1;
    const team1Id = Number(event?.team1_id);
    const team2Id = Number(event?.team2_id);
    if (Number.isFinite(team1Id) && team1Id > 0) entry.teamIds.add(team1Id);
    if (Number.isFinite(team2Id) && team2Id > 0) entry.teamIds.add(team2Id);
    const left = String(event?.participant1?.display_name || event?.participant1_label || event?.team1_label || event?.team1_name || "").trim();
    const right = String(event?.participant2?.display_name || event?.participant2_label || event?.team2_label || event?.team2_name || "").trim();
    if (left) entry.teamIds.add(`name:${left.toLowerCase()}`);
    if (right) entry.teamIds.add(`name:${right.toLowerCase()}`);
  });

  return Array.from(grouped.values())
    .map((entry) => {
      const bracket = bracketBySport.get(entry.sport.toLowerCase()) || null;
      const bracketStatus = String(bracket?.status || "").trim().toUpperCase();
      const ready =
        bracketStatus === "GENERATED" ||
        bracketStatus === "ACTIVE" ||
        bracketStatus === "LIVE" ||
        bracketStatus === "RUNNING" ||
        bracketStatus === "COMPLETED" ||
        bracketStatus === "FINISHED" ||
        entry.matchCount > 0;
      return {
        sport: entry.sport,
        teamCount: entry.teamIds.size,
        matchCount: entry.matchCount,
        status: bracketStatus || (entry.matchCount > 0 ? "SCHEDULED" : "PENDING"),
        ready,
      };
    })
    .sort((left, right) => (right?.teamCount || 0) - (left?.teamCount || 0) || String(left?.sport || "").localeCompare(String(right?.sport || "")));
};


export const getTournamentDateRange = (tournament) => {
  const start = formatShortDate(tournament?.start_date);
  const end = formatShortDate(tournament?.end_date);
  if (start === "TBD" && end === "TBD") return "";
  if (start === end) return start;
  return `${start} - ${end}`;
};

export const getTournamentDayProgress = (tournament, now = new Date()) => {
  const start = startOfDay(tournament?.start_date);
  const end = startOfDay(tournament?.end_date);
  if (!start || !end) return null;
  const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
  const today = startOfDay(now);
  const elapsed = Math.round((today.getTime() - start.getTime()) / 86400000) + 1;
  const currentDay = Math.min(Math.max(elapsed, 1), totalDays);
  return { currentDay, totalDays, label: `Day ${currentDay} of ${totalDays}` };
};

export const buildAnnouncementTimeline = (rows = [], now = new Date()) => {
  const safeRows = Array.isArray(rows) ? rows : [];
  return safeRows
    .map((row, index) => {
      const rawDate = row?.created_at || row?.timestamp || row?.date || null;
      const parsed = safeDateFromIso(rawDate);
      return {
        id: row?.id || `announcement-${index}`,
        title: row?.title || row?.announcement_title || "Tournament update",
        message: row?.message || row?.body || row?.summary || "",
        group: getAnnouncementGroup(rawDate, now),
        timestamp: rawDate ? formatDateTime(rawDate) : "",
        sortValue: parsed ? parsed.getTime() : 0,
      };
    })
    .sort((left, right) => right.sortValue - left.sortValue);
};

export const buildShowcaseEntries = ({
  teamRegistrations = [],
  competitionEntries = [],
  teams = [],
  events = [],
  dashboard = null,
} = {}) => {
  const list = [];
  const seen = new Set();

  const add = (entryObj) => {
    const name = String(entryObj?.name || "").trim();
    const key = `${entryObj?.type || "item"}-${entryObj?.teamId || entryObj?.entryId || name}`.toLowerCase();
    if (name && !seen.has(key)) {
      seen.add(key);
      list.push({
        id: entryObj?.id || `entry-${list.length + 1}`,
        teamId: entryObj?.teamId ?? null,
        entryId: entryObj?.entryId ?? null,
        type: entryObj?.type || "team",
        name,
        meta: entryObj?.meta || "Competition entry",
        imageUrl: entryObj?.imageUrl || null,
        status: entryObj?.status || "",
        sport_name: entryObj?.sport_name || "",
        sport_id: entryObj?.sport_id ?? null,
        department_name: entryObj?.department_name || "",
        department_code: entryObj?.department_code || "",
        department_id: entryObj?.department_id ?? null,
        coach_name: entryObj?.coach_name || "",
        coach_id: entryObj?.coach_id ?? null,
        participant_shape: entryObj?.participant_shape || "Team",
        tournament_id: entryObj?.tournament_id ?? null,
        tournament_sport_event_id: entryObj?.tournament_sport_event_id ?? null,
        members: Array.isArray(entryObj?.members) ? entryObj.members : [],
        member_count: Number.isFinite(Number(entryObj?.member_count))
          ? Number(entryObj.member_count)
          : Array.isArray(entryObj?.members)
            ? entryObj.members.length
            : null,
      });
    }
  };

  // 1. Team registrations
  const safeTeamRegs = Array.isArray(teamRegistrations)
    ? teamRegistrations
    : Array.isArray(teamRegistrations?.items)
      ? teamRegistrations.items
      : Array.isArray(teamRegistrations?.rows)
        ? teamRegistrations.rows
        : [];
  safeTeamRegs.forEach((row) => {
    add({
      id: `team-${row?.id || row?.registration_id || row?.team_id}`,
      teamId: row?.team_id || row?.id,
      type: "team",
      name: row?.team_name || row?.name,
      meta: [row?.sport_name, row?.department_code || row?.department_name].filter(Boolean).join(" · "),
      imageUrl: row?.logo_url || row?.image_url || row?.team_logo_url || null,
      status: row?.status || row?.registration_status || "",
      sport_name: row?.sport_name || row?.sport || "",
      sport_id: row?.sport_id ?? null,
      department_name: row?.department_name || "",
      department_code: row?.department_code || "",
      department_id: row?.department_id ?? null,
      coach_name: row?.coach_name || row?.head_coach || "",
      coach_id: row?.coach_id ?? null,
      tournament_id: row?.tournament_id ?? null,
    });
  });

  // 2. Competition entries
  const safeEntries = Array.isArray(competitionEntries)
    ? competitionEntries
    : Array.isArray(competitionEntries?.items)
      ? competitionEntries.items
      : Array.isArray(competitionEntries?.rows)
        ? competitionEntries.rows
        : [];
  safeEntries.forEach((row) => {
    add({
      id: `entry-${row?.id || row?.entry_id}`,
      entryId: row?.id || row?.entry_id,
      teamId: row?.team_id || null,
      type: "entry",
      name: row?.entry_name || row?.name || `${row?.participant_shape || "Competition"} Entry`,
      meta: [row?.sport_name, row?.participant_shape, row?.department_code || row?.department_name].filter(Boolean).join(" · "),
      imageUrl: row?.logo_url || row?.image_url || row?.entry_logo_url || null,
      status: row?.status || row?.registration_status || "",
      sport_name: row?.sport_name || row?.sport || "",
      sport_id: row?.sport_id ?? null,
      department_name: row?.department_name || "",
      department_code: row?.department_code || "",
      department_id: row?.department_id ?? null,
      coach_name: row?.coach_name || row?.head_coach || "",
      participant_shape: row?.participant_shape || "Individual",
      tournament_id: row?.tournament_id ?? null,
      tournament_sport_event_id: row?.tournament_sport_event_id ?? null,
      members: row?.members,
      member_count: row?.member_count ?? row?.player_count,
    });
  });

  // 3. Teams array
  const safeTeams = Array.isArray(teams) ? teams : [];
  safeTeams.forEach((row) => {
    add({
      id: `team-${row?.id || row?.name}`,
      teamId: row?.id,
      type: "team",
      name: row?.name || row?.team_name,
      meta: [row?.sport_name || row?.sport, row?.department_code || row?.department_name || row?.department].filter(Boolean).join(" · "),
      imageUrl: row?.logo_url || row?.image_url || row?.team_logo_url || null,
      status: row?.status || "",
      sport_name: row?.sport_name || row?.sport || "",
      sport_id: row?.sport_id ?? null,
      department_name: row?.department_name || row?.department || "",
      department_code: row?.department_code || "",
      department_id: row?.department_id ?? null,
      coach_name: row?.coach_name || row?.head_coach || "",
    });
  });

  // 4. Dashboard teams & entries
  if (Array.isArray(dashboard?.teams)) {
    dashboard.teams.forEach((t) => {
      add({
        id: `team-${t.id || t.name}`,
        teamId: t.id,
        type: "team",
        name: t?.name || t?.team_name,
        meta: [t?.sport_name || t?.sport, t?.department_code || t?.department_name || t?.department].filter(Boolean).join(" · "),
        imageUrl: t?.logo_url || t?.image_url || t?.team_logo_url,
        status: t?.status || "",
        sport_name: t?.sport_name || t?.sport || "",
        sport_id: t?.sport_id ?? null,
        department_name: t?.department_name || t?.department || "",
        department_code: t?.department_code || "",
        department_id: t?.department_id ?? null,
        coach_name: t?.coach_name || t?.head_coach || "",
      });
    });
  }

  if (Array.isArray(dashboard?.entries)) {
    dashboard.entries.forEach((e) => {
      add({
        id: `entry-${e.id || e.name}`,
        entryId: e.id,
        type: "entry",
        name: e?.name || e?.entry_name,
        meta: [e?.sport_name || e?.sport, e?.department_code || e?.department_name || e?.department].filter(Boolean).join(" · "),
        imageUrl: e?.logo_url || e?.image_url || e?.entry_logo_url,
        status: e?.status || "",
        sport_name: e?.sport_name || e?.sport || "",
        sport_id: e?.sport_id ?? null,
        department_name: e?.department_name || e?.department || "",
        department_code: e?.department_code || "",
        department_id: e?.department_id ?? null,
        coach_name: e?.coach_name || e?.head_coach || "",
        participant_shape: e?.participant_shape || "Individual",
      });
    });
  }

  // 5. Match fixtures (events)
  if (Array.isArray(events)) {
    events.forEach((ev) => {
      const t1 = ev?.team1_name || ev?.team_a_name || ev?.team1;
      if (t1) {
        add({
          id: `team-${ev?.team1_id || t1}`,
          teamId: ev?.team1_id || null,
          type: "team",
          name: t1,
          meta: [ev?.sport_name || ev?.sport, ev?.department1_code || ev?.department1_name || ev?.team1_department].filter(Boolean).join(" · "),
          imageUrl: ev?.team1_logo_url || ev?.team1_image_url || null,
          status: "",
          sport_name: ev?.sport_name || ev?.sport || "",
          sport_id: ev?.sport_id ?? null,
          department_name: ev?.department1_name || ev?.team1_department || "",
          department_code: ev?.department1_code || "",
          department_id: ev?.department1_id || ev?.team1_department_id || null,
        });
      }
      const t2 = ev?.team2_name || ev?.team_b_name || ev?.team2;
      if (t2) {
        add({
          id: `team-${ev?.team2_id || t2}`,
          teamId: ev?.team2_id || null,
          type: "team",
          name: t2,
          meta: [ev?.sport_name || ev?.sport, ev?.department2_code || ev?.department2_name || ev?.team2_department].filter(Boolean).join(" · "),
          imageUrl: ev?.team2_logo_url || ev?.team2_image_url || null,
          status: "",
          sport_name: ev?.sport_name || ev?.sport || "",
          sport_id: ev?.sport_id ?? null,
          department_name: ev?.department2_name || ev?.team2_department || "",
          department_code: ev?.department2_code || "",
          department_id: ev?.department2_id || ev?.team2_department_id || null,
        });
      }
    });
  }

  return list;
};

export const deriveShowcaseEntries = (dashboard, events = []) =>
  buildShowcaseEntries({ dashboard, events });
