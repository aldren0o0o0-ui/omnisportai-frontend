import { safeDateFromIso } from "./dashboardDateUtils.js";

const LIVE_STATUSES = new Set(["LIVE", "ONGOING", "IN_PROGRESS"]);
const COMPLETED_STATUSES = new Set(["COMPLETED", "FINAL", "FINALIZED", "FINISHED", "DONE"]);

export { LIVE_STATUSES, COMPLETED_STATUSES };

export const getEventStatus = (event) => String(event?.status || "SCHEDULED").trim().toUpperCase();

export const isLiveEvent = (event, now = new Date()) => {
  const status = getEventStatus(event);
  if (LIVE_STATUSES.has(status)) return true;
  const start = safeDateFromIso(event?.start);
  const end = safeDateFromIso(event?.end);
  return Boolean(start && end && now >= start && now < end);
};

export const isCompletedEvent = (event, now = new Date()) => {
  const status = getEventStatus(event);
  if (COMPLETED_STATUSES.has(status)) return true;
  const start = safeDateFromIso(event?.start);
  const hasStructuredScore =
    Number.isFinite(Number(event?.score_team1)) || Number.isFinite(Number(event?.score_team2));
  return Boolean(start && start < now && hasStructuredScore && !LIVE_STATUSES.has(status));
};

export const sortEventsByStart = (events = []) =>
  (Array.isArray(events) ? events : [])
    .slice()
    .sort((left, right) => String(left?.start || "").localeCompare(String(right?.start || "")));

export const prioritizeMatchCenterEvents = (events = [], now = new Date()) => {
  const nowMs = now.getTime();
  const ranked = (Array.isArray(events) ? events : []).map((event, index) => {
    const start = safeDateFromIso(event?.start);
    const startMs = start?.getTime?.() ?? Number.POSITIVE_INFINITY;
    const live = isLiveEvent(event, now);
    const scored = parseScore(event).hasScore;
    const completed = isCompletedEvent(event, now);
    const upcoming = Number.isFinite(startMs) && startMs >= nowMs;
    const rank = live ? 0 : scored || completed ? 1 : upcoming ? 2 : 3;
    return { event, index, rank, startMs };
  });

  return ranked
    .sort((left, right) => {
      if (left.rank !== right.rank) return left.rank - right.rank;
      // Recent scored results are more useful than older results. Live and
      // upcoming fixtures retain chronological ordering.
      if (left.rank === 1 || left.rank === 3) {
        if (left.startMs !== right.startMs) return right.startMs - left.startMs;
      } else if (left.startMs !== right.startMs) {
        return left.startMs - right.startMs;
      }
      return left.index - right.index;
    })
    .map(({ event }) => event);
};

export const getUpcomingEvents = (events = [], now = new Date()) =>
  sortEventsByStart(events).filter((event) => {
    const start = safeDateFromIso(event?.start);
    return Boolean(start && start >= now && !isLiveEvent(event, now));
  });

export const getTodayEvents = (events = [], now = new Date()) =>
  sortEventsByStart(events).filter((event) => {
    const start = safeDateFromIso(event?.start);
    if (!start) return false;
    return (
      start.getFullYear() === now.getFullYear()
      && start.getMonth() === now.getMonth()
      && start.getDate() === now.getDate()
    );
  });

export const getCompletedEvents = (events = [], now = new Date()) =>
  sortEventsByStart(events)
    .filter((event) => isCompletedEvent(event, now))
    .reverse();

export const getEventKey = (event, fallback = "event") =>
  String(event?.match_id || event?.id || `${fallback}-${event?.start || ""}-${event?.title || ""}`);

export const getSportLabel = (event) =>
  String(event?.sport || event?.sport_name || "").trim()
  || (String(event?.title || "").includes(":")
    ? String(event?.title).split(":")[0].trim()
    : "Match");

export const getMatchup = (event) => {
  const left = String(event?.participant1?.display_name || event?.participant1_label || event?.team1_label || event?.team1_name || "").trim();
  const right = String(event?.participant2?.display_name || event?.participant2_label || event?.team2_label || event?.team2_name || "").trim();
  if (left || right) {
    return {
      left: left || "Team A",
      right: right || "Team B",
    };
  }
  const title = String(event?.title || "Match").trim();
  const stripped = title.includes(":") ? title.split(":").slice(1).join(":").trim() : title;
  const parts = stripped.split(" vs ");
  if (parts.length >= 2) {
    return {
      left: String(parts[0] || "Team A").trim(),
      right: String(parts.slice(1).join(" vs ") || "Team B").trim(),
    };
  }
  return { left: stripped || "Team A", right: "Team B" };
};

export const parseScore = (event) => {
  const left = Number(event?.score_team1);
  const right = Number(event?.score_team2);
  if (Number.isFinite(left) && Number.isFinite(right)) {
    return { left, right, hasScore: left !== 0 || right !== 0 || isCompletedEvent(event) };
  }
  const scoreText = String(event?.score || "").trim();
  const match = scoreText.match(/(-?\d+)\s*[-:]\s*(-?\d+)/);
  if (match) {
    return {
      left: Number(match[1]),
      right: Number(match[2]),
      hasScore: true,
    };
  }
  return { left: 0, right: 0, hasScore: false };
};

export const buildCalendarEvents = (events = []) =>
  (Array.isArray(events) ? events : [])
    .map((event) => {
      const start = safeDateFromIso(event?.start);
      const end = safeDateFromIso(event?.end);
      if (!start || !end) return null;
      const matchup = getMatchup(event);
      return {
        ...event,
        id: event?.match_id || event?.id || `${event?.start || ""}-${matchup.left}-${matchup.right}`,
        start,
        end,
        title: `${getSportLabel(event)}: ${matchup.left} vs ${matchup.right}`,
        team1_label: matchup.left,
        team2_label: matchup.right,
        venue: event?.venue || "Venue TBD",
      };
    })
    .filter(Boolean);

export const getLiveOrNextMatch = (events = [], now = new Date()) => {
  const safeEvents = Array.isArray(events) ? events : [];
  const live = safeEvents.find((event) => isLiveEvent(event, now));
  if (live) return live;
  const upcoming = getUpcomingEvents(safeEvents, now);
  return upcoming[0] || null;
};

export const findTableByKeywords = (dashboard, keywords = []) => {
  const terms = (Array.isArray(keywords) ? keywords : []).map((value) => String(value).toLowerCase());
  const tables = Array.isArray(dashboard?.tables) ? dashboard.tables : [];
  return tables.find((table) => {
    const haystack = [table?.id, table?.title]
      .map((value) => String(value || "").toLowerCase())
      .join(" ");
    return terms.some((term) => haystack.includes(term));
  }) || null;
};
