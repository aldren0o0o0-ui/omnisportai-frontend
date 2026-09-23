const SHAPE_LABELS = {
  SOLO: "Individual",
  DUO: "Pair",
  TEAM: "Team",
};

export const DIVISION_OPTIONS = [
  { value: "MEN", label: "Men" },
  { value: "WOMEN", label: "Women" },
  { value: "MIXED", label: "Mixed" },
  { value: "OPEN", label: "Open" },
];

const normalizeText = (value) => String(value || "").trim();

export const normalizeParticipantShape = (value, fallback = "TEAM") => {
  const key = normalizeText(value).toUpperCase();
  if (key === "INDIVIDUAL") return "SOLO";
  if (key === "PAIR") return "DUO";
  if (["SOLO", "DUO", "TEAM"].includes(key)) return key;
  return fallback;
};

export const participantShapeLabel = (value) =>
  SHAPE_LABELS[normalizeParticipantShape(value)] || "Team";

export const participantShapeBadgeClass = (value) => {
  const shape = normalizeParticipantShape(value);
  if (shape === "SOLO") {
    return "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-200";
  }
  if (shape === "DUO") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200";
  }
  return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200";
};

export const inferParticipantShapeFromSport = (sport) => {
  const unitType = normalizeText(sport?.configuration?.unit_type || sport?.unit_type).toUpperCase();
  if (["TEAM", "SOLO", "DUO"].includes(unitType)) return unitType;
  const participationType = normalizeText(
    sport?.configuration?.participation_type || sport?.participation_type || sport?.category
  ).toLowerCase();
  if (["single", "solo", "individual"].includes(participationType)) return "SOLO";
  if (["double", "duo", "pair"].includes(participationType)) return "DUO";
  return "TEAM";
};

export const derivePlayersPerEntry = (shape) => {
  const normalized = normalizeParticipantShape(shape);
  if (normalized === "SOLO") return 1;
  if (normalized === "DUO") return 2;
  return null;
};

export const describePlayersPerEntry = (shape) => {
  const normalized = normalizeParticipantShape(shape);
  if (normalized === "SOLO") return "Individual · 1 player per entry";
  if (normalized === "DUO") return "Pair · 2 players per entry";
  return "Team · roster-based";
};

export const slugifyEventKey = (value, fallback = "default") => {
  const normalized = normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || fallback;
};

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
};

const normalizeTemplateKey = (value) =>
  normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

export const resolveSportTemplateId = (sport) => {
  const explicitId = sport?.configuration?.event_config?.sport_id;
  if (normalizeText(explicitId)) return normalizeTemplateKey(explicitId);
  const explicitTemplateId = sport?.configuration?.event_config?.template_sport_id;
  if (normalizeText(explicitTemplateId)) return normalizeTemplateKey(explicitTemplateId);
  return normalizeTemplateKey(sport?.sport_name || sport?.name || "");
};

export const findTemplateForSport = (sport, templates = []) => {
  const wantedId = resolveSportTemplateId(sport);
  if (!wantedId) return null;
  return (
    templates.find((template) => normalizeTemplateKey(template?.template_id) === wantedId) ||
    templates.find((template) => normalizeTemplateKey(template?.name) === wantedId) ||
    null
  );
};

export const getSportDisplayName = (sport, templates = [], fallback = "Unknown sport") => {
  if (!Array.isArray(templates)) {
    fallback = normalizeText(templates) || fallback;
    templates = [];
  }
  const template = findTemplateForSport(sport, templates);
  return normalizeText(
    sport?.canonical_display_name || template?.canonical_display_name || sport?.sport_name || sport?.name
  ) || fallback;
};

export const getEventDisplayName = (event, fallback = "Event") =>
  normalizeText(event?.event_name || event?.eventName || event?.name) || fallback;

export const getCompetitionDisplayLabel = ({ sport, event, templates = [], separator = " · " } = {}) => {
  const sportLabel = getSportDisplayName(sport, templates);
  const eventLabel = getEventDisplayName(event, "");
  if (!eventLabel || eventLabel.toLocaleLowerCase() === sportLabel.toLocaleLowerCase()) return sportLabel;
  return `${sportLabel}${separator}${eventLabel}`;
};

export const resolveSportEventCapabilities = (sport, templates = []) => {
  const template = findTemplateForSport(sport, templates);
  const shapes = Array.isArray(template?.allowed_participant_shapes)
    ? template.allowed_participant_shapes.map((value) => normalizeParticipantShape(value, "")).filter(Boolean)
    : [];
  const divisions = Array.isArray(template?.allowed_divisions)
    ? template.allowed_divisions.map((value) => normalizeText(value).toUpperCase()).filter(Boolean)
    : [];
  return {
    allowedParticipantShapes: shapes.length ? [...new Set(shapes)] : [inferParticipantShapeFromSport(sport)],
    allowedDivisions: divisions.length ? [...new Set(divisions)] : ["OPEN"],
  };
};

export const buildNormalizedEventCategory = (
  rawEvent,
  {
    fallbackName = "Default Event",
    fallbackShape = "TEAM",
    fallbackBracketFormat = "SINGLE_ELIMINATION",
    fallbackSeedingMethod = "RANDOM",
    fallbackMaxEntries = 1,
    fallbackMinEntries = 2,
    fallbackMinPlayers = null,
    fallbackMaxPlayers = null,
  } = {}
) => {
  const participantShape = normalizeParticipantShape(
    rawEvent?.participant_shape || rawEvent?.competition_type,
    fallbackShape
  );
  const eventName = normalizeText(rawEvent?.event_name) || fallbackName;
  const eventKey = normalizeText(rawEvent?.event_key) || slugifyEventKey(eventName);
  return {
    id: rawEvent?.id ?? null,
    event_name: eventName,
    event_key: eventKey,
    division_category: normalizeText(rawEvent?.division_category).toUpperCase() || "OPEN",
    participant_shape: participantShape,
    players_per_entry: derivePlayersPerEntry(participantShape),
    min_players: participantShape === "SOLO" ? 1 : participantShape === "DUO" ? 2 : toPositiveInt(rawEvent?.min_players, fallbackMinPlayers),
    max_players: participantShape === "SOLO" ? 1 : participantShape === "DUO" ? 2 : toPositiveInt(rawEvent?.max_players, fallbackMaxPlayers),
    max_entries_per_department: toPositiveInt(
      rawEvent?.max_entries_per_department,
      toPositiveInt(rawEvent?.max_entries_allowed, fallbackMaxEntries)
    ),
    minimum_total_entries_for_bracket: toPositiveInt(
      rawEvent?.minimum_total_entries_for_bracket,
      fallbackMinEntries
    ),
    bracket_format: normalizeText(rawEvent?.bracket_format) || fallbackBracketFormat,
    seeding_method: normalizeText(rawEvent?.seeding_method) || fallbackSeedingMethod,
    playing_format: normalizeText(rawEvent?.playing_format) || null,
    is_active: rawEvent?.is_active !== false && rawEvent?.is_default_enabled !== false,
    _is_custom: rawEvent?._is_custom === true,
  };
};

export const buildDefaultEventCategoriesForSport = ({
  sport,
  templates = [],
  fallbackBracketFormat = "SINGLE_ELIMINATION",
  fallbackSeedingMethod = "RANDOM",
}) => {
  const template = findTemplateForSport(sport, templates);
  const templateDefaults = Array.isArray(template?.default_event_categories)
    ? template.default_event_categories
    : [];

  if (templateDefaults.length > 0) {
    return templateDefaults.map((eventCategory) =>
      buildNormalizedEventCategory(eventCategory, {
        fallbackName: "Default Event",
        fallbackShape: eventCategory?.participant_shape || inferParticipantShapeFromSport(sport),
        fallbackBracketFormat: eventCategory?.bracket_format || fallbackBracketFormat,
        fallbackSeedingMethod: eventCategory?.seeding_method || fallbackSeedingMethod,
        fallbackMaxEntries: toPositiveInt(
          eventCategory?.max_entries_per_department,
          toPositiveInt(template?.default_max_entries_per_department, 1)
        ),
        fallbackMinEntries: toPositiveInt(
          eventCategory?.minimum_total_entries_for_bracket,
          toPositiveInt(template?.default_minimum_total_entries_for_bracket, 2)
        ),
        fallbackMinPlayers: toPositiveInt(template?.min_players, null),
        fallbackMaxPlayers: toPositiveInt(template?.max_players, null),
      })
    );
  }

  const participantShape = inferParticipantShapeFromSport(sport);
  return [
    buildNormalizedEventCategory(
      {
        event_name: "Default Event",
        division_category: "OPEN",
        participant_shape: participantShape,
        max_entries_per_department: sport?.configuration?.max_entries_per_department ?? 1,
        minimum_total_entries_for_bracket: 2,
      },
      {
        fallbackShape: participantShape,
        fallbackBracketFormat,
        fallbackSeedingMethod,
        fallbackMaxEntries: toPositiveInt(sport?.configuration?.max_entries_per_department, 1),
        fallbackMinEntries: 2,
      }
    ),
  ];
};

export const buildCustomEventCategory = ({
  sport,
  fallbackBracketFormat = "SINGLE_ELIMINATION",
  fallbackSeedingMethod = "RANDOM",
  participantShape = null,
} = {}) => {
  const resolvedShape = normalizeParticipantShape(
    participantShape,
    inferParticipantShapeFromSport(sport)
  );
  return buildNormalizedEventCategory(
    {
      event_name: "",
      participant_shape: resolvedShape,
      min_players: resolvedShape === "TEAM" ? sport?.configuration?.min_players : undefined,
      max_players: resolvedShape === "TEAM" ? sport?.configuration?.max_players : undefined,
      max_entries_per_department: resolvedShape === "TEAM" ? 1 : 1,
      minimum_total_entries_for_bracket: 2,
      bracket_format: fallbackBracketFormat,
      seeding_method: fallbackSeedingMethod,
      is_active: true,
      _is_custom: true,
    },
    {
      fallbackName: "",
      fallbackShape: resolvedShape,
      fallbackBracketFormat,
      fallbackSeedingMethod,
      fallbackMaxEntries: 1,
      fallbackMinEntries: 2,
    }
  );
};

export const buildNormalizedSportBracketSetting = ({
  sport,
  setting = {},
  templates = [],
  fallbackBracketFormat = "SINGLE_ELIMINATION",
  fallbackSeedingMethod = "RANDOM",
}) => {
  const eventsSource =
    Array.isArray(setting?.events) && setting.events.length > 0
      ? setting.events
      : buildDefaultEventCategoriesForSport({
          sport,
          templates,
          fallbackBracketFormat,
          fallbackSeedingMethod,
        });

  return {
    sport_id: Number(sport?.id ?? setting?.sport_id),
    bracket_format: normalizeText(setting?.bracket_format) || null,
    seeding_method: normalizeText(setting?.seeding_method) || null,
    use_default: setting?.use_default ?? false,
    participant_shape: null,
    players_per_entry: null,
    max_entries_per_department: null,
    minimum_total_entries_for_bracket: null,
    events: eventsSource.map((eventCategory) =>
      buildNormalizedEventCategory(eventCategory, {
        fallbackShape: inferParticipantShapeFromSport(sport),
        fallbackBracketFormat,
        fallbackSeedingMethod,
        fallbackMaxEntries: 1,
        fallbackMinEntries: 2,
      })
    ),
  };
};

export const validateEventCategories = (events = []) => {
  const activeEvents = events.filter((eventCategory) => eventCategory?.is_active !== false);
  if (activeEvents.length === 0) {
    return "Add at least one event category.";
  }

  const seenNames = new Set();
  const seenKeys = new Set();
  for (const eventCategory of activeEvents) {
    const eventName = normalizeText(eventCategory?.event_name);
    if (!eventName) return "Event Category name is required.";

    const eventNameKey = eventName.toLowerCase();
    if (seenNames.has(eventNameKey)) {
      return "This event category already exists for this sport.";
    }
    seenNames.add(eventNameKey);

    const participantShape = normalizeParticipantShape(eventCategory?.participant_shape, "");
    if (!["SOLO", "DUO", "TEAM"].includes(participantShape)) {
      return "Competition Type must be Individual, Pair, or Team.";
    }
    if (participantShape === "TEAM") {
      const minPlayers = toPositiveInt(eventCategory?.min_players, 0);
      const maxPlayers = toPositiveInt(eventCategory?.max_players, 0);
      if (minPlayers < 1 || maxPlayers < minPlayers) {
        return "Team roster size must have a valid minimum and maximum.";
      }
    }

    const entriesPerDepartment = toPositiveInt(eventCategory?.max_entries_per_department, 0);
    if (entriesPerDepartment < 1) {
      return "Entries per Department must be at least 1.";
    }

    const minimumEntries = toPositiveInt(eventCategory?.minimum_total_entries_for_bracket, 0);
    if (minimumEntries < 2) {
      return "Minimum Entries to Start Bracket must be at least 2.";
    }

    const eventKey = slugifyEventKey(eventCategory?.event_key || eventName);
    if (seenKeys.has(eventKey)) {
      return "This event category already exists for this sport.";
    }
    seenKeys.add(eventKey);
  }

  return "";
};

export const serializeSportBracketSettingsForPayload = ({
  sportIds = [],
  sportSettings = [],
  sports = [],
  templates = [],
  fallbackBracketFormat = "SINGLE_ELIMINATION",
  fallbackSeedingMethod = "RANDOM",
}) => {
  const selectedIdSet = new Set((Array.isArray(sportIds) ? sportIds : []).map((value) => Number(value)));
  return sports
    .filter((sport) => selectedIdSet.has(Number(sport.id)))
    .map((sport) => {
      const existingSetting =
        (Array.isArray(sportSettings) ? sportSettings : []).find(
          (setting) => Number(setting?.sport_id) === Number(sport.id)
        ) || {};
      const normalizedSetting = buildNormalizedSportBracketSetting({
        sport,
        setting: existingSetting,
        templates,
        fallbackBracketFormat,
        fallbackSeedingMethod,
      });
      return {
        sport_id: Number(sport.id),
        bracket_format: normalizedSetting.bracket_format,
        seeding_method: normalizedSetting.seeding_method,
        use_default: false,
        events: normalizedSetting.events.filter((eventCategory) => eventCategory?.is_active !== false).map((eventCategory) => ({
            id: eventCategory.id ?? undefined,
            event_name: normalizeText(eventCategory.event_name),
            event_key: slugifyEventKey(eventCategory.event_key || eventCategory.event_name),
            division_category: normalizeText(eventCategory.division_category).toUpperCase() || "OPEN",
            participant_shape: normalizeParticipantShape(eventCategory.participant_shape),
            players_per_entry: derivePlayersPerEntry(eventCategory.participant_shape),
            min_players: eventCategory.participant_shape === "TEAM" ? toPositiveInt(eventCategory.min_players, null) : derivePlayersPerEntry(eventCategory.participant_shape),
            max_players: eventCategory.participant_shape === "TEAM" ? toPositiveInt(eventCategory.max_players, null) : derivePlayersPerEntry(eventCategory.participant_shape),
            max_entries_per_department: toPositiveInt(eventCategory.max_entries_per_department, 1),
            minimum_total_entries_for_bracket: toPositiveInt(
              eventCategory.minimum_total_entries_for_bracket,
              2
            ),
            bracket_format: normalizeText(eventCategory.bracket_format) || fallbackBracketFormat,
            seeding_method: normalizeText(eventCategory.seeding_method) || fallbackSeedingMethod,
            is_active: eventCategory.is_active !== false,
          })),
      };
    });
};

export const countExpectedRegistrationTargets = ({
  departmentCount = 0,
  sportIds = [],
  sports = [],
  sportSettings = [],
  templates = [],
  fallbackBracketFormat = "SINGLE_ELIMINATION",
  fallbackSeedingMethod = "RANDOM",
}) => {
  let teamSlots = 0;
  let entryPools = 0;
  sports
    .filter((sport) => (Array.isArray(sportIds) ? sportIds : []).includes(Number(sport.id)))
    .forEach((sport) => {
      const setting =
        (Array.isArray(sportSettings) ? sportSettings : []).find(
          (row) => Number(row?.sport_id) === Number(sport.id)
        ) || {};
      const normalizedSetting = buildNormalizedSportBracketSetting({
        sport,
        setting,
        templates,
        fallbackBracketFormat,
        fallbackSeedingMethod,
      });
      normalizedSetting.events
        .filter((eventCategory) => eventCategory?.is_active !== false)
        .forEach((eventCategory) => {
          if (normalizeParticipantShape(eventCategory.participant_shape) === "TEAM") {
            teamSlots += departmentCount;
          } else {
            entryPools += departmentCount;
          }
        });
    });

  return { teamSlots, entryPools };
};
