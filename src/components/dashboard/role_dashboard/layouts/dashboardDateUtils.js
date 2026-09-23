export const safeDateFromIso = (value) => {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatShortDate = (value) => {
  const parsed = safeDateFromIso(value);
  if (!parsed) return "TBD";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

export const formatTime = (value) => {
  const parsed = safeDateFromIso(value);
  if (!parsed) return "TBD";
  return parsed.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
};

export const formatDateTime = (value) => {
  const parsed = safeDateFromIso(value);
  if (!parsed) return "TBD";
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export const getCountdownLabel = (value) => {
  const start = safeDateFromIso(value);
  if (!start) return "Schedule pending";
  const diffMs = start.getTime() - Date.now();
  if (diffMs <= 0) return "Starting soon";
  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `Starts in ${days}d ${hours}h`;
  if (hours > 0) return `Starts in ${hours}h ${minutes}m`;
  return `Starts in ${minutes}m`;
};

export const startOfDay = (value) => {
  const parsed = value instanceof Date ? value : safeDateFromIso(value);
  if (!parsed) return null;
  const copy = new Date(parsed);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

export const endOfDay = (value) => {
  const parsed = value instanceof Date ? value : safeDateFromIso(value);
  if (!parsed) return null;
  const copy = new Date(parsed);
  copy.setHours(23, 59, 59, 999);
  return copy;
};

export const getAnnouncementGroup = (rawDate, now = new Date()) => {
  const parsed = startOfDay(rawDate);
  if (!parsed) return "Earlier";
  const today = startOfDay(now);
  const diffDays = Math.round((today.getTime() - parsed.getTime()) / 86400000);
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return "Last week";
  return formatShortDate(rawDate);
};

export const formatMatchClock = (seconds) => {
  const total = Math.max(0, Number(seconds || 0));
  const minutes = Math.floor(total / 60);
  return `${String(minutes).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};
