const DEFAULT_SECONDARY_PROFILE = {
  enabled: false,
  label: "Secondary Clock",
  defaultSeconds: 24,
  alternateSeconds: 14,
  syncWithGameClock: false,
  resetOptions: [],
  supportedEvents: {
    autoReset: [],
    suggestReset: [],
    noChange: []
  },
  suggestionByEvent: {}
};

const FALLBACK_SECONDARY_CLOCK_PROFILES = {
  basketball: {
    enabled: true,
    label: "Shot Clock",
    defaultSeconds: 24,
    alternateSeconds: 14,
    syncWithGameClock: true,
    resetOptions: [
      { label: "24", seconds: 24, reason: "Full reset" },
      { label: "14", seconds: 14, reason: "Short reset" }
    ],
    supportedEvents: {
      autoReset: ["FREE_THROW", "FREE_THROW_MADE", "TWO_PT_MADE", "THREE_PT_MADE", "TURNOVER", "STEAL"],
      suggestReset: ["FREE_THROW", "FOUL", "VIOLATION", "REBOUND"],
      noChange: ["TIMEOUT", "CLOCK_START", "CLOCK_STOP", "SUBSTITUTION", "QUARTER_ADVANCE", "PERIOD_ADVANCE"]
    },
    suggestionByEvent: {
      REBOUND: 14,
      FOUL: 14,
      VIOLATION: 14,
      FREE_THROW: 14
    }
  },
  "3x3 basketball": {
    enabled: true,
    label: "Shot Clock",
    defaultSeconds: 12,
    alternateSeconds: 12,
    syncWithGameClock: true,
    resetOptions: [
      { label: "12", seconds: 12, reason: "Reset" }
    ],
    supportedEvents: {
      autoReset: ["SCORE", "TURNOVER", "STEAL"],
      suggestReset: ["FOUL", "VIOLATION"],
      noChange: ["TIMEOUT", "CLOCK_START", "CLOCK_STOP", "SUBSTITUTION", "PERIOD_ADVANCE"]
    },
    suggestionByEvent: {
      FOUL: 12,
      VIOLATION: 12
    }
  }
};

const normalizeControlSupport = (controls = []) => {
  const normalized = {
    hasSecondaryClockControls: false,
    hasStart: false,
    hasStop: false,
    hasReset: false,
    hasSet: false
  };

  controls.forEach((control) => {
    const eventType = String(control?.event_type || "").trim().toUpperCase();
    const label = String(control?.label || "").trim().toLowerCase();
    const isSecondary =
      eventType.includes("SHOT_CLOCK") ||
      eventType.includes("SECONDARY_CLOCK") ||
      eventType.includes("PLAY_CLOCK") ||
      eventType.includes("POSSESSION_CLOCK") ||
      label.includes("shot clock") ||
      label.includes("play clock") ||
      label.includes("possession clock");
    if (!isSecondary) return;

    normalized.hasSecondaryClockControls = true;
    if (eventType.includes("START")) normalized.hasStart = true;
    if (eventType.includes("STOP") || eventType.includes("PAUSE")) normalized.hasStop = true;
    if (eventType.includes("RESET")) normalized.hasReset = true;
    if (eventType.includes("SET")) normalized.hasSet = true;
  });

  return normalized;
};

const normalizeBackendConfig = (rawConfig) => {
  if (!rawConfig || typeof rawConfig !== "object") return null;

  const enabled = rawConfig.enabled !== false || Boolean(rawConfig.hasShotClock || rawConfig.hasSecondaryClock);
  if (!enabled) return null;

  const defaultSeconds = Number(rawConfig.defaultSeconds ?? rawConfig.default_seconds ?? rawConfig.initial_seconds ?? 24);
  const alternateSeconds = Number(rawConfig.alternateSeconds ?? rawConfig.alternate_seconds ?? rawConfig.short_reset_seconds ?? 14);
  const label = String(rawConfig.label || rawConfig.clockLabel || rawConfig.name || "Shot Clock").trim() || "Shot Clock";

  const profile = {
    ...DEFAULT_SECONDARY_PROFILE,
    enabled: true,
    label,
    defaultSeconds: Number.isFinite(defaultSeconds) ? defaultSeconds : 24,
    alternateSeconds: Number.isFinite(alternateSeconds) ? alternateSeconds : 14,
    syncWithGameClock: Boolean(rawConfig.syncWithGameClock ?? rawConfig.sync_with_game_clock ?? true),
  };

  if (Array.isArray(rawConfig.resetOptions)) {
    profile.resetOptions = rawConfig.resetOptions
      .map((row) => ({
        label: String(row?.label || "").trim(),
        seconds: Number(row?.seconds),
        reason: String(row?.reason || "").trim()
      }))
      .filter((row) => row.label && Number.isFinite(row.seconds));
  }

  if (profile.resetOptions.length === 0) {
    profile.resetOptions = [
      { label: String(profile.defaultSeconds), seconds: profile.defaultSeconds, reason: "Default reset" }
    ];
    if (profile.alternateSeconds !== profile.defaultSeconds) {
      profile.resetOptions.push({ label: String(profile.alternateSeconds), seconds: profile.alternateSeconds, reason: "Alternate reset" });
    }
  }

  return profile;
};

const resolveFallbackProfile = (sportKey) => {
  const key = String(sportKey || "").trim().toLowerCase();
  if (!key) return null;
  if (FALLBACK_SECONDARY_CLOCK_PROFILES[key]) return { ...DEFAULT_SECONDARY_PROFILE, ...FALLBACK_SECONDARY_CLOCK_PROFILES[key] };
  if (key.includes("basketball")) return { ...DEFAULT_SECONDARY_PROFILE, ...FALLBACK_SECONDARY_CLOCK_PROFILES.basketball };
  if (key.includes("3x3")) return { ...DEFAULT_SECONDARY_PROFILE, ...FALLBACK_SECONDARY_CLOCK_PROFILES["3x3 basketball"] };
  return null;
};

export const getSecondaryClockConfig = ({ sportKey, validatedConfig }) => {
  const displayConfig = validatedConfig?.display && typeof validatedConfig.display === "object" ? validatedConfig.display : {};
  const uiSpec = validatedConfig?.ui_spec && typeof validatedConfig.ui_spec === "object" ? validatedConfig.ui_spec : {};
  const controls = Array.isArray(validatedConfig?.controls) ? validatedConfig.controls : [];

  const backendCandidates = [
    displayConfig.secondary_clock,
    displayConfig.shot_clock,
    displayConfig.play_clock,
    uiSpec.secondaryClock,
    uiSpec.secondary_clock,
    uiSpec.shotClock,
    uiSpec.shot_clock
  ];
  const backendProfile = backendCandidates.map(normalizeBackendConfig).find(Boolean);

  const fallbackProfile = resolveFallbackProfile(sportKey);
  const selected = backendProfile || fallbackProfile || { ...DEFAULT_SECONDARY_PROFILE };
  const controlSupport = normalizeControlSupport(controls);
  const isLocalOnly = selected.enabled && !controlSupport.hasSecondaryClockControls;

  return {
    ...selected,
    controlSupport,
    isLocalOnly
  };
};

export const getSecondaryClockSuggestion = ({ profile, eventType }) => {
  if (!profile?.enabled) return null;
  const normalized = String(eventType || "").trim().toUpperCase();
  if (!normalized) return null;

  const autoReset = new Set((profile.supportedEvents?.autoReset || []).map((row) => String(row || "").trim().toUpperCase()));
  const suggestReset = new Set((profile.supportedEvents?.suggestReset || []).map((row) => String(row || "").trim().toUpperCase()));

  if (autoReset.has(normalized)) {
    return { mode: "auto", seconds: Number(profile.defaultSeconds || 24), reason: "Automatic reset" };
  }
  if (suggestReset.has(normalized)) {
    const suggestionByEvent = profile.suggestionByEvent || {};
    const mapped = Number(suggestionByEvent[normalized]);
    const seconds = Number.isFinite(mapped) ? mapped : Number(profile.alternateSeconds || profile.defaultSeconds || 14);
    return { mode: "suggest", seconds, reason: "Suggested reset" };
  }
  return null;
};
