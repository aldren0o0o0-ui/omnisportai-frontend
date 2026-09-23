export const STAFF_ROLE_OPTIONS = [
  "Referee",
  "Assistant Referee",
  "Table Official",
  "Scorer",
  "Timekeeper",
  "Marshal",
  "Venue Staff",
  "Medical / First Aid Assistant",
  "Technical Staff",
  "Documentation Staff",
  "Official",
];

export const STAFF_SKILL_OPTIONS = [
  "Communication",
  "Rule Knowledge",
  "Fairness",
  "Leadership",
  "Time Management",
  "Scorekeeping",
  "Conflict Management",
  "Observation",
  "Organization",
  "First Aid Awareness",
  "Technical Support",
  "Documentation",
  "Crowd Control",
  "Decision Making",
];

export const MAX_STAFF_SKILLS = 5;

export const STAFF_STATUS_OPTIONS = ["ALL", "PENDING", "APPROVED", "ASSIGNED", "REJECTED", "CANCELLED"];

export const STAFF_STATUS_LABELS = {
  PENDING: "Waiting for review",
  APPROVED: "Approved",
  ASSIGNED: "Assigned as staff/official",
  REJECTED: "Not accepted",
  CANCELLED: "Cancelled",
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  REMOVED: "Removed",
};

export const toUpperStatus = (value) => String(value || "").trim().toUpperCase();

export const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
};

export const splitSkills = (skillsValue) =>
  String(skillsValue || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export const summarizeApiError = (error, fallbackMessage) =>
  error?.response?.data?.detail || fallbackMessage;

