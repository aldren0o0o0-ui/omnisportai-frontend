const normalizeTargetValue = (value) => String(value || "").trim().toLowerCase();

export const isDefaultEventTarget = (eventName, eventKey) => {
  const normalizedName = normalizeTargetValue(eventName);
  const normalizedKey = normalizeTargetValue(eventKey);
  return normalizedKey === "default" || normalizedName === "default" || (!normalizedName && !normalizedKey);
};

export const isLegacyDefaultEventTarget = (eventName, eventKey) => {
  const normalizedName = normalizeTargetValue(eventName);
  const normalizedKey = normalizeTargetValue(eventKey);
  const legacyDefaultNames = new Set(["default", "standard singles", "standard_singles"]);
  const legacyDefaultKeys = new Set(["default", "standard_singles"]);
  return (
    legacyDefaultKeys.has(normalizedKey) ||
    legacyDefaultNames.has(normalizedName) ||
    (!normalizedName && !normalizedKey)
  );
};

const participantShapeLabel = (value, fallback) => {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "SOLO") return "Individual";
  if (normalized === "DUO") return "Pair";
  if (normalized === "TEAM") return "Team";
  return normalized || fallback;
};

export const formatParticipantShapeLabel = (value) => participantShapeLabel(value, "Unknown");

export const readableParticipantShapeLabel = (value) => participantShapeLabel(value, "");

const positiveId = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const participantForSide = (match, side) => {
  const normalizedSide = Number(side) === 2 ? 2 : 1;
  return match?.[`participant${normalizedSide}`] || null;
};

export const getMatchParticipantTarget = (match, side) => {
  const normalizedSide = Number(side) === 2 ? 2 : 1;
  const participant = participantForSide(match, normalizedSide);
  const participantShape = String(
    participant?.participant_shape
      || match?.participant_shape
      || ""
  ).trim().toUpperCase();
  const teamId = positiveId(
    match?.[`team${normalizedSide}_id`]
      ?? participant?.team_id
  );
  const entryId = positiveId(
    match?.[`entry${normalizedSide}_id`]
      ?? participant?.entry_id
  );

  if (participantShape === "TEAM" && teamId) return { type: "TEAM", id: teamId };
  if ((participantShape === "SOLO" || participantShape === "DUO") && entryId) {
    return { type: "ENTRY", id: entryId };
  }
  if (teamId) return { type: "TEAM", id: teamId };
  if (entryId) return { type: "ENTRY", id: entryId };
  return null;
};

export const hasResolvedMatchParticipants = (match) =>
  Boolean(
    getMatchParticipantTarget(match, 1)
    && getMatchParticipantTarget(match, 2)
  );

export const getMatchParticipantLabel = (match, side, fallback = "TBD") => {
  const normalizedSide = Number(side) === 2 ? 2 : 1;
  const participant = participantForSide(match, normalizedSide);
  const candidates = [
    participant?.display_name,
    match?.[`participant${normalizedSide}_label`],
    match?.[`team${normalizedSide}_name`],
    match?.[`team${normalizedSide}_label`],
    match?.[`unit${normalizedSide === 1 ? "A" : "B"}_name`],
    match?.[`unit${normalizedSide === 1 ? "A" : "B"}_label`],
  ];
  const label = candidates
    .map((value) => String(value || "").trim())
    .find(Boolean);
  return label || fallback;
};

const targetLabel = ({ sportName, eventName, eventKey }, defaultTargetDetector) => {
  const safeSportName = String(sportName || "").trim();
  const safeEventName = String(eventName || "").trim();
  if (defaultTargetDetector(safeEventName, eventKey)) return safeSportName || "Unassigned sport";
  if (!safeSportName) return safeEventName || "Unassigned sport";
  if (!safeEventName) return safeSportName;

  if (safeEventName.toLowerCase().includes(safeSportName.toLowerCase())) {
    return safeEventName;
  }
  if (safeSportName.toLowerCase().includes(safeEventName.toLowerCase())) {
    return safeSportName;
  }
  const sportWords = safeSportName.split(/\s+/);
  const eventWords = safeEventName.split(/\s+/);
  const commonWords = sportWords.filter((w) => eventWords.some((ew) => ew.toLowerCase() === w.toLowerCase()));
  if (commonWords.length >= 2) {
    const baseSport = sportWords[0];
    if (!eventWords[0].toLowerCase().includes(baseSport.toLowerCase())) {
      return `${baseSport} • ${safeEventName}`;
    }
    return safeEventName;
  }

  return `${safeSportName} • ${safeEventName}`;
};

export const buildBracketTargetLabel = (target) => targetLabel(target, isLegacyDefaultEventTarget);

export const buildStrictBracketTargetLabel = (target) => targetLabel(target, isDefaultEventTarget);

export const isNonBracketEvent = (target) => {
  if (!target) return false;
  if (target.isTimedRace === true) return true;
  if (target.isBracketAllowed === false) return true;
  const engine = String(target.engineType || "").trim().toUpperCase();
  if (engine === "TIMED_RACE") return true;
  const execFormat = String(target.executionFormat || "").trim().toUpperCase();
  if (execFormat === "MULTI_CONTESTANT_TIMED") return true;
  return false;
};

export const getCleanEventOptionLabel = (row) => {
  const safeEventName = String(row?.eventName || "").trim();
  const safeTargetLabel = String(row?.targetLabel || "").trim();
  const safeSportName = String(row?.sportName || "").trim();
  const suffix = isNonBracketEvent(row) ? " (Heats & Finals)" : "";
  if (isLegacyDefaultEventTarget(safeEventName, row?.eventKey)) {
    return (safeSportName || "Main Event") + suffix;
  }
  return (safeEventName || safeTargetLabel || "Main Event") + suffix;
};

export const formatBracketFormatLabel = (rawValue) => {
  const value = String(rawValue || "")
    .trim()
    .replace(/[\s-]+/g, "_")
    .toUpperCase();
  if (!value) return "Single Elimination";
  if (value === "SINGLE_ELIMINATION") return "Single Elimination";
  if (value === "DOUBLE_ELIMINATION") return "Double Elimination";
  if (value === "ROUND_ROBIN") return "Round Robin";
  return value
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

export const formatSeedingModeLabel = (rawValue) => {
  const value = String(rawValue || "").trim().toUpperCase();
  if (!value) return "Random";
  if (value === "MANUAL") return "Manual";
  if (value === "PREVIOUS_RANKING") return "Previous Tournament Ranking";
  if (value === "RANDOM") return "Random";
  return value
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};
