import { resolveSpecializedEngine } from "../../../components/brackets/utils/specializedScoringUi.js";
import { getSportStatisticsProfile } from "./sportStatisticsConfig.js";

const normalizeRawMap = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [String(key), item]));
};

const findSource = (maps, sourceKeys) => {
  for (const key of sourceKeys) {
    for (const map of maps) {
      if (Object.prototype.hasOwnProperty.call(map, key)) return { key, value: map[key] };
      const upperKey = String(key).toUpperCase();
      const actual = Object.keys(map).find((candidate) => String(candidate).toUpperCase() === upperKey);
      if (actual !== undefined) return { key: actual, value: map[actual] };
    }
  }
  return null;
};

const validValue = (value, unit) => {
  if (unit === "text" || unit === "status") {
    const text = String(value ?? "").trim();
    return text ? text : null;
  }
  if (typeof value === "boolean" || value === null || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const displayValue = (value, unit) => {
  if (unit === "seconds") {
    const total = Number(value);
    if (!Number.isFinite(total)) return "—";
    const minutes = Math.floor(total / 60);
    const seconds = total - minutes * 60;
    return minutes > 0 ? `${minutes}:${seconds.toFixed(2).padStart(5, "0")}` : seconds.toFixed(2);
  }
  return String(value);
};

export const normalizePlayerStatistics = ({
  sportKey,
  rawStats = {},
  resultState = {},
  runtimeConfig = {},
  engineType = "",
  participantResolved = true,
} = {}) => {
  const profile = getSportStatisticsProfile(sportKey);
  if (!profile) return { profile: null, primary: [], secondary: [], metrics: {}, unknownKeys: Object.keys(normalizeRawMap(rawStats)) };

  const raw = normalizeRawMap(rawStats);
  const result = normalizeRawMap(resultState);
  const specializedEngine = String(engineType || resolveSpecializedEngine(runtimeConfig) || "").trim().toUpperCase();
  const runtimeKind = specializedEngine ? "specialized" : "unified";
  const knownKeys = new Set();
  Object.values(profile.metrics).forEach((definition) => definition.sourceKeys.forEach((key) => knownKeys.add(String(key).toUpperCase())));

  const normalized = {};
  for (const [key, definition] of Object.entries(profile.metrics)) {
    const runtimeSupported = definition.runtimeAvailability?.[runtimeKind] === true;
    const found = findSource([raw, result], definition.sourceKeys);
    const parsed = found ? validValue(found.value, definition.unit) : null;
    let status = "tracked";
    let value = parsed;

    if (!participantResolved || !runtimeSupported || (found && parsed === null)) {
      status = "unavailable";
      value = null;
    } else if (!found) {
      const isCounter = definition.unit === "count" || definition.unit === "points";
      if (runtimeKind === "unified" && isCounter) value = 0;
      else {
        status = "unavailable";
        value = null;
      }
    }

    normalized[key] = {
      ...definition,
      value,
      status,
      displayValue: status === "tracked" ? displayValue(value, definition.unit) : "—",
      sourceKeys: found ? [found.key] : [],
    };
  }

  const unknownKeys = Object.keys(raw).filter((key) => !knownKeys.has(String(key).toUpperCase()));
  return {
    profile,
    metrics: normalized,
    primary: profile.primaryMetrics.map((key) => normalized[key]),
    secondary: profile.secondaryMetrics.map((key) => normalized[key]),
    unknownKeys,
    runtimeKind,
    engineType: specializedEngine,
  };
};

export const normalizeStatistic = (input = {}) => {
  const normalized = normalizePlayerStatistics(input);
  const metric = normalized.metrics?.[input.metricKey];
  if (metric) return metric;
  return {
    key: String(input.metricKey || ""),
    label: String(input.metricKey || ""),
    fullLabel: String(input.metricKey || ""),
    value: null,
    displayValue: "N/A",
    status: "not_applicable",
    provenance: "direct",
    sourceKeys: [],
  };
};
