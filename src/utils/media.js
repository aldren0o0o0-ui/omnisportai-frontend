import api from "../api/axios";

export const resolveMediaUrl = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("data:")) {
    return raw;
  }
  const base = String(api?.defaults?.baseURL || "").replace(/\/+$/, "");
  if (!base) return raw;
  if (raw.startsWith("/")) return `${base}${raw}`;
  return `${base}/${raw}`;
};

export const initialsFromLabel = (label, fallback = "?") => {
  const normalized = String(label || "").trim();
  if (!normalized) return fallback;
  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
};

