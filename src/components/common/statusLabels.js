// Centralized status & severity label mapping.
// Translates raw backend enum constants into the user-facing vocabulary
// defined in OMNISPORT_AI_FRONTEND_UIUX_GOALS.md. Presentation-only — no
// backend values are changed, only how they are displayed.

// Canonical, user-friendly labels for known status enums.
// Keys are normalized to UPPER_SNAKE_CASE.
const STATUS_LABELS = {
  // Lifecycle / setup
  DRAFT: "Planning",
  PLANNING: "Registration Open",
  INCOMPLETE: "Needs Setup",
  NEEDS_SETUP: "Needs Setup",
  READY: "Ready",
  GENERATED: "Ready to Activate",
  CONFIGURED: "Ready",

  // Review / approval
  PENDING: "Pending Review",
  PENDING_REVIEW: "Pending Review",
  FOR_REVIEW: "Pending Review",
  APPROVED: "Approved",
  ACCEPTED: "Approved",
  ACCEPTED_AS_PLAYER: "Accepted as Player",
  REJECTED: "Rejected",
  REMOVED: "Removed",
  ELIMINATED_AFTER_TRYOUT: "Not Selected",
  FOR_TRYOUT: "For Tryout",

  // Scheduling / play
  SCHEDULED: "Scheduled",
  UPCOMING: "Upcoming",
  IN_PROGRESS: "In Progress",
  ONGOING: "In Progress",
  LIVE: "Live",
  ACTIVE: "Active",
  IN_USE: "In Use",

  // Completion
  COMPLETED: "Completed",
  FINALIZED: "Completed",
  CANCELLED: "Cancelled",
  ARCHIVED: "Archived",
  INACTIVE: "Inactive",
  EXPIRED: "Expired",

  // Availability / conflicts
  AVAILABLE: "Available",
  UNAVAILABLE: "Unavailable",
  ASSIGNED: "Assigned",
  CONFLICT: "Issue Found",
  RESOLVED: "Resolved",

  // Bracket-specific
  TRASHED: "Trashed",
};

// Severity enums (schedule issues, preflight checks) → friendly wording.
const SEVERITY_LABELS = {
  BLOCKING: "Critical",
  CRITICAL: "Critical",
  ERROR: "Critical",
  WARNING: "Alert",
  WARN: "Alert",
  INFO: "Note",
  NOTICE: "Note",
};

const normalizeKey = (value) =>
  String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

const titleCase = (value) =>
  String(value ?? "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();

/**
 * Returns a user-friendly label for a backend status enum.
 * Falls back to title-cased text so unknown statuses still read cleanly.
 */
export const formatStatusLabel = (status) => {
  const key = normalizeKey(status);
  if (!key) return "";
  return STATUS_LABELS[key] || titleCase(key);
};

/**
 * Returns a user-friendly label for a severity enum (BLOCKING/WARNING/INFO).
 */
export const formatSeverityLabel = (severity) => {
  const key = normalizeKey(severity);
  if (!key) return "";
  return SEVERITY_LABELS[key] || titleCase(key);
};

/** True when a status has no explicit mapping (useful for an UNKNOWN badge style). */
export const isKnownStatus = (status) =>
  Boolean(STATUS_LABELS[normalizeKey(status)]);

export { STATUS_LABELS, SEVERITY_LABELS, normalizeKey };
