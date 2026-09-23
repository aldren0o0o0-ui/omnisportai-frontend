import {
  normalizeParticipantShape,
  participantShapeLabel,
} from "../../utils/tournamentEventCategories";

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit"
});

const DAY_LABEL_FORMATTER = new Intl.DateTimeFormat("en-US", {
  weekday: "short"
});

const DAY_NUMBER_FORMATTER = new Intl.DateTimeFormat("en-US", {
  day: "2-digit"
});

const SHORT_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit"
});

const normalizeKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

export const toDate = (value) => {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
};

export const formatDateTime = (value) => {
  const date = toDate(value);
  if (!date) return "TBA";
  return DATE_TIME_FORMATTER.format(date);
};

export const formatShortTime = (value) => {
  const date = toDate(value);
  if (!date) return "TBA";
  return SHORT_TIME_FORMATTER.format(date);
};

export const formatDayLabel = (value) => {
  const date = toDate(value);
  if (!date) return "";
  return DAY_LABEL_FORMATTER.format(date);
};

export const formatDayNumber = (value) => {
  const date = toDate(value);
  if (!date) return "";
  return DAY_NUMBER_FORMATTER.format(date);
};

export const toDateKey = (value) => {
  const date = toDate(value);
  if (!date) return "";
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export const getMatchLabel = (event) => {
  const normalizeValue = (value) => String(value || "").trim();
  const isPlaceholder = (value) => {
    const normalized = normalizeValue(value).toLowerCase();
    if (!normalized) return true;
    return (
      normalized === "tbd" ||
      normalized === "to be determined" ||
      normalized === "team a" ||
      normalized === "team b" ||
      normalized === "unknown" ||
      normalized === "pending"
    );
  };
  const pickBest = (...values) => {
    const candidates = values.map(normalizeValue).filter(Boolean);
    if (!candidates.length) return "";
    const concrete = candidates.find((entry) => !isPlaceholder(entry));
    return concrete || candidates[0];
  };
  const team1 = pickBest(
    event?.team1_name,
    event?.team_1_name,
    event?.team1_label,
    event?.team_1_label,
    event?.teams?.team1?.name,
    event?.teams?.team_1?.name,
    event?.team1?.name,
    event?.home_team_name,
    event?.home_team?.name
  );
  const team2 = pickBest(
    event?.team2_name,
    event?.team_2_name,
    event?.team2_label,
    event?.team_2_label,
    event?.teams?.team2?.name,
    event?.teams?.team_2?.name,
    event?.team2?.name,
    event?.away_team_name,
    event?.away_team?.name
  );
  if (team1 && team2) return `${team1} vs ${team2}`;

  const title = String(event?.title || "").trim();
  if (title.includes(":")) {
    const splitTitle = title.split(":").slice(1).join(":").trim();
    if (splitTitle) return splitTitle;
  }
  return title || "Match details unavailable";
};

export const getSportLabel = (value) => {
  const key = normalizeKey(value);
  if (!key) return "Sport";
  return key
    .split("_")
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
};

export const getSportKey = (value) => normalizeKey(value);

export const isMeaningfulEventName = (eventName, sportName = "") => {
  const normalizedEventName = String(eventName || "").trim();
  if (!normalizedEventName) return false;
  const foldedEventName = normalizedEventName.toLowerCase();
  if (foldedEventName === "default" || foldedEventName === "default event") return false;
  const normalizedSportName = String(sportName || "").trim().toLowerCase();
  if (normalizedSportName) {
    if (foldedEventName === normalizedSportName) return false;
    if (normalizedSportName.includes(foldedEventName)) return false;
  }
  return true;
};

export const buildEventAwareSportLabel = ({
  sportName = "",
  eventName = "",
} = {}) => {
  const normalizedSportName = String(sportName || "").trim();
  const normalizedEventName = String(eventName || "").trim();
  if (!normalizedSportName) return normalizedEventName || "Match";
  if (!normalizedEventName || !isMeaningfulEventName(normalizedEventName, normalizedSportName)) {
    return normalizedSportName;
  }
  const foldedSport = normalizedSportName.toLowerCase();
  const foldedEvent = normalizedEventName.toLowerCase();
  if (foldedEvent.startsWith(foldedSport)) return normalizedEventName;
  if (foldedSport.includes(foldedEvent)) return normalizedSportName;
  return `${normalizedSportName} · ${normalizedEventName}`.trim();
};

export const buildScheduleEventCategoryKey = (event = {}) => {
  const tournamentSportEventId = Number(event?.tournament_sport_event_id || 0);
  if (Number.isInteger(tournamentSportEventId) && tournamentSportEventId > 0) {
    return `event:${tournamentSportEventId}`;
  }
  const sportId = Number(event?.sport_id || 0);
  const eventKey = String(event?.event_key || "").trim().toLowerCase();
  if (sportId > 0 && eventKey) return `sport:${sportId}:key:${eventKey}`;
  const eventName = String(event?.event_name || "").trim().toLowerCase();
  if (sportId > 0 && eventName) return `sport:${sportId}:name:${eventName}`;
  return `sport:${sportId || "0"}:default`;
};

export const normalizeEvents = (events = []) =>
  (Array.isArray(events) ? events : [])
    .map((event) => {
      const start = toDate(event?.start);
      const end = toDate(event?.end);
      if (!start || !end || end <= start) return null;

      const status = String(event?.status || "Scheduled");
      const venueName = String(event?.venue || "").trim();
      const sportName = String(event?.canonical_display_name || event?.sport_name || event?.base_sport_name || event?.sport || "").trim();
      const eventName = String(event?.event_name || "").trim();
      const participantShape = normalizeParticipantShape(
        event?.participant_shape || event?.competition_type || "",
        ""
      );
      const sportDisplayLabel =
        String(event?.sport_display_name || "").trim() ||
        buildEventAwareSportLabel({ sportName, eventName });
      const competitionTypeLabel = participantShapeLabel(participantShape || "");
      const eventCategoryKey = buildScheduleEventCategoryKey(event);

      return {
        ...event,
        id: event?.id ?? event?.match_id ?? `${event?.title || "match"}-${start.getTime()}`,
        start,
        end,
        status,
        sportKey: getSportKey(sportName || event?.sport),
        sportLabel: getSportLabel(sportName || event?.sport),
        sportName,
        eventName,
        participantShape,
        competitionTypeLabel,
        sportDisplayLabel,
        eventCategoryKey,
        eventCategoryLabel: isMeaningfulEventName(eventName, sportName) ? eventName : "",
        matchLabel: getMatchLabel(event),
        venueLabel: venueName || "Unassigned Venue",
        dateKey: toDateKey(start)
      };
    })
    .filter(Boolean);

export const inferVenueCategory = (venue) => {
  const surface = normalizeKey(venue?.surface_type);
  const features = Array.isArray(venue?.features)
    ? venue.features.map((entry) => normalizeKey(entry))
    : [];

  if (features.some((entry) => entry.includes("pool")) || surface.includes("pool")) {
    return "Water Sports";
  }
  if (
    features.some((entry) => entry.includes("field") || entry.includes("goal")) ||
    surface === "grass"
  ) {
    return "Field";
  }
  if (features.some((entry) => entry.includes("court")) || surface === "wood") {
    return "Court";
  }
  if (features.length > 2) return "Multi-Sport";
  return "Venue";
};

export const getVenueTypeLabel = (venue) =>
  venue?.is_indoor === true ? "Indoor" : venue?.is_indoor === false ? "Outdoor" : "Type N/A";

export const getVenueKey = (event) => {
  const rawVenueId = event?.venue_id;
  if (rawVenueId !== null && rawVenueId !== undefined && rawVenueId !== "") {
    return `id:${rawVenueId}`;
  }

  const venueName = String(event?.venue || "").trim();
  if (venueName) return `name:${normalizeKey(venueName)}`;
  return "unassigned";
};

export const buildVenueMap = (venues = []) => {
  const map = new Map();
  (Array.isArray(venues) ? venues : []).forEach((venue) => {
    if (!venue) return;
    if (venue.id !== null && venue.id !== undefined) {
      map.set(`id:${venue.id}`, venue);
    }
    const normalizedName = normalizeKey(venue.name);
    if (normalizedName) {
      map.set(`name:${normalizedName}`, venue);
    }
  });
  return map;
};

export const buildDateColumns = ({ events, selectedTournament, days = 7 }) => {
  const tournamentStart = toDate(selectedTournament?.start_date);
  const tournamentEnd = toDate(selectedTournament?.end_date || selectedTournament?.start_date);
  const hasTournamentRange =
    tournamentStart instanceof Date &&
    tournamentEnd instanceof Date &&
    tournamentEnd.getTime() >= tournamentStart.getTime();
  const tournamentDays = hasTournamentRange
    ? Math.max(
        1,
        Math.round((tournamentEnd.getTime() - tournamentStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
      )
    : null;
  const safeDays = tournamentDays || Math.max(3, Math.min(14, Number(days) || 7));
  const eventStartDates = events.map((event) => event.start).filter(Boolean);
  const sortedStarts = eventStartDates.sort((a, b) => a.getTime() - b.getTime());

  const fallbackStart =
    sortedStarts[0] ||
    tournamentStart ||
    new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  const columns = [];
  const anchor = new Date(
    fallbackStart.getFullYear(),
    fallbackStart.getMonth(),
    fallbackStart.getDate()
  );

  for (let index = 0; index < safeDays; index += 1) {
    const next = new Date(anchor);
    next.setDate(anchor.getDate() + index);
    columns.push({
      key: toDateKey(next),
      date: next,
      dayLabel: formatDayLabel(next),
      dayNumber: formatDayNumber(next)
    });
  }

  return columns;
};

export const getStatusTone = (status) => {
  const value = String(status || "").toLowerCase();
  if (value.includes("live") || value.includes("ongoing")) return "live";
  if (value.includes("conflict") || value.includes("delayed") || value.includes("blocked")) {
    return "conflict";
  }
  if (value.includes("done") || value.includes("finish") || value.includes("completed")) {
    return "completed";
  }
  return "scheduled";
};

export const eventHasConflict = (event) => {
  if (event?.has_conflict === true || event?.conflict === true) return true;
  return getStatusTone(event?.status) === "conflict";
};
