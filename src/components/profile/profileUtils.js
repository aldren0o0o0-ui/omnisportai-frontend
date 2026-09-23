/**
 * Normalizes a drawer opening target to a standard object shape.
 * Supports:
 * - Number/numeric string: interpreted as { userId }
 * - Object: { userId, playerId, sportId, tournamentId, ... }
 */
export const normalizeProfileTarget = (target) => {
  if (!target) return null;
  if (typeof target === "number" || typeof target === "string") {
    const num = Number(target);
    return Number.isFinite(num) && num > 0 ? { userId: num } : null;
  }
  if (typeof target === "object") {
    const normalized = { ...target };
    if (normalized.userId !== undefined && normalized.userId !== null) {
      normalized.userId = Number(normalized.userId) || null;
    }
    if (normalized.playerId !== undefined && normalized.playerId !== null) {
      normalized.playerId = Number(normalized.playerId) || null;
    }
    if (normalized.sportId !== undefined && normalized.sportId !== null) {
      normalized.sportId = Number(normalized.sportId) || null;
    }
    if (normalized.tournamentId !== undefined && normalized.tournamentId !== null) {
      normalized.tournamentId = Number(normalized.tournamentId) || null;
    }
    return normalized;
  }
  return null;
};

/**
 * Creates an initial profile drawer state tuple.
 */
export const createProfileDrawerState = () => ({
  isOpen: false,
  profileTarget: null,
});

/**
 * Pure reducer/state updater for profile drawer actions.
 */
export const profileDrawerReducer = (state, action) => {
  switch (action.type) {
    case "OPEN": {
      const target = normalizeProfileTarget(action.payload);
      if (!target) return state;
      return {
        isOpen: true,
        profileTarget: target,
      };
    }
    case "CLOSE": {
      return {
        ...state,
        isOpen: false,
      };
    }
    case "RESET": {
      return createProfileDrawerState();
    }
    default:
      return state;
  }
};

/**
 * Normalizes roles array from backend (can be [{role: 'Player'}] or strings) to uppercase strings with underscores.
 */
export const normalizeRoles = (roles) => {
  if (!roles) return [];
  const list = Array.isArray(roles) ? roles : [roles];
  const set = new Set();
  for (const item of list) {
    if (!item) continue;
    let r = "";
    if (typeof item === "string") {
      r = item.trim().toUpperCase().replace(/[\s-]+/g, "_");
    } else if (typeof item === "object") {
      r = String(item.role || item.name || item.role_name || "")
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, "_");
    }
    if (r) set.add(r);
  }
  return Array.from(set);
};

/**
 * Checks if a roles list contains a specific role (case-insensitive, space/underscore agnostic).
 */
export const hasRole = (roles, targetRole) => {
  if (!targetRole) return false;
  const normalized = normalizeRoles(roles);
  const targetNorm = String(targetRole).trim().toUpperCase().replace(/[\s-]+/g, "_");
  return normalized.includes(targetNorm);
};

/**
 * Validates if a metric should be rendered according to Phase 7B/7C non-fabrication rules:
 * Metric must have available === true and value !== null and value !== undefined.
 */
export const isMetricRenderable = (metric) => {
  if (!metric || typeof metric !== "object") return false;
  return metric.available === true && metric.value !== null && metric.value !== undefined;
};

/**
 * Formats a metric value strictly respecting backend format metadata.
 */
export const formatMetricValue = (value, format = "NUMBER") => {
  if (value === null || value === undefined) return "";
  const fmt = String(format || "").toUpperCase();

  if (fmt === "PERCENTAGE") {
    const num = Number(value);
    return Number.isFinite(num) ? `${num.toFixed(1).replace(/\.0$/, "")}%` : `${value}%`;
  }

  if (fmt === "TIME") {
    const num = Number(value);
    if (Number.isFinite(num)) {
      const minutes = Math.floor(num / 60);
      const seconds = Math.floor(num % 60);
      return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    }
    return String(value);
  }

  if (fmt === "RATIO") {
    return String(value);
  }

  // Default NUMBER or count
  const num = Number(value);
  if (Number.isFinite(num)) {
    return num.toLocaleString();
  }
  return String(value);
};

/**
 * Safely formats date strings for profile presentation.
 */
export const formatProfileDate = (dateVal, options = {}) => {
  if (!dateVal) return "";
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return "";
  const defaultOpts = { month: "short", day: "numeric", year: "numeric", ...options };
  return d.toLocaleDateString("en-US", defaultOpts);
};

/**
 * Checks if a match or performance record matches an active sport context.
 * Supports optional event-level scoping via options.strictEvent and options.eventId.
 */
export const isRecordForSport = (record, activeSport, options = {}) => {
  if (!record || !activeSport) return false;

  let sportMatches = false;

  // Direct sport_id match
  if (
    record.sport_id !== undefined &&
    record.sport_id !== null &&
    activeSport.sport_id !== undefined &&
    activeSport.sport_id !== null
  ) {
    if (String(record.sport_id) === String(activeSport.sport_id)) sportMatches = true;
  }

  // Name match
  if (!sportMatches) {
    const recordSportName = String(record.sport || record.sport_name || "").trim().toLowerCase();
    const activeSportName = String(activeSport.sport_name || activeSport.sport || "").trim().toLowerCase();
    if (recordSportName && activeSportName && recordSportName === activeSportName) {
      sportMatches = true;
    }
  }

  // Code match
  if (!sportMatches) {
    const recordSportCode = String(record.sport_code || "").trim().toUpperCase();
    const activeSportCode = String(activeSport.sport_code || "").trim().toUpperCase();
    if (recordSportCode && activeSportCode && recordSportCode === activeSportCode) {
      sportMatches = true;
    }
  }

  if (!sportMatches) return false;

  // Strict event-level matching when requested
  const targetEventId =
    options?.eventId !== undefined
      ? options.eventId
      : options?.strictEvent
      ? activeSport?.event_id
      : undefined;

  if (
    options?.strictEvent &&
    targetEventId !== undefined &&
    targetEventId !== null &&
    String(targetEventId) !== "all"
  ) {
    const recordEventId =
      record.event_id !== undefined ? record.event_id : record._event_id;
    if (recordEventId !== undefined && recordEventId !== null) {
      return String(recordEventId) === String(targetEventId);
    }
  }

  return true;
};

/**
 * Formats or orients a score string (e.g. "0 - 2") relative to participant's result.
 * If result is WIN and score1 < score2, or result is LOSS and score1 > score2,
 * reverses the score numbers so participant's score appears first.
 */
export const formatOrientedScore = (scoreStr, result = "") => {
  if (!scoreStr || typeof scoreStr !== "string") return scoreStr;
  const match = scoreStr.match(/^(\d+)\s*-\s*(\d+)$/);
  if (!match) return scoreStr;
  const s1 = parseInt(match[1], 10);
  const s2 = parseInt(match[2], 10);
  const res = String(result || "").toUpperCase();

  if (res === "WIN" && s1 < s2) {
    return `${s2} - ${s1}`;
  }
  if (res === "LOSS" && s1 > s2) {
    return `${s2} - ${s1}`;
  }
  return scoreStr;
};

/**
 * Resolves a valid positive numeric user ID from a list of potential ID fields
 * (e.g. user_id, applicant_id, account_user_id).
 */
export const resolveProfileUserId = (...values) => {
  for (const value of values) {
    const normalized = Number(value || 0);
    if (Number.isFinite(normalized) && normalized > 0) return normalized;
  }
  return 0;
};
