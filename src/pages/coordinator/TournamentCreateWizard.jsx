import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useBeforeUnload, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  PencilLine,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import DashboardCard from "../../components/common/DashboardCard";
import LoadingState from "../../components/common/LoadingState";
import PageHeaderCard from "../../components/common/PageHeaderCard";
import { useAuth } from "../../context/AuthContext";
import { getDepartments } from "../../services/departmentService";
import { getSportTemplates, getSports } from "../../services/sportService";
import { createIntramural } from "../../services/intramuralService";
import { getVenues } from "../../services/venueService";
import {
  buildCustomEventCategory,
  DIVISION_OPTIONS,
  buildNormalizedSportBracketSetting,
  countExpectedRegistrationTargets,
  describePlayersPerEntry,
  getSportDisplayName,
  participantShapeBadgeClass,
  participantShapeLabel,
  resolveSportEventCapabilities,
  serializeSportBracketSettingsForPayload,
  slugifyEventKey,
  validateEventCategories,
} from "../../utils/tournamentEventCategories";

const DRAFT_STORAGE_VERSION = 3;
const DRAFT_KEY_PREFIX = "omnisport:tournament-create-draft";

const STEP_ITEMS = [
  { id: 0, title: "Basic Information" },
  { id: 1, title: "Schedule & Timeline" },
  { id: 2, title: "Sports Selection" },
  { id: 3, title: "Events & Competition Setup" },
  { id: 4, title: "Department Eligibility" },
  { id: 5, title: "Venues" },
  { id: 6, title: "Review & Publish" },
];

const SEEDING_METHOD_OPTIONS = [
  { value: "RANDOM", label: "Random Seeding" },
  { value: "MANUAL", label: "Manual Seeding" },
  { value: "PREVIOUS_RANKING", label: "Previous Event Ranking" },
  { value: "DEPARTMENT_SEPARATION", label: "Department Separation" },
  { value: "SYSTEM_BALANCED", label: "System-Balanced Seeding" },
];

const SEMESTER_OPTIONS = [
  { value: "FIRST", label: "1st Semester" },
  { value: "SECOND", label: "2nd Semester" },
  { value: "SUMMER", label: "Summer" },
];

const INITIAL_STATE = {
  currentStep: 0,
  basics: {
    tournament_name: "",
    tournament_type: "SINGLE_ELIMINATION",
    season_label: "",
    semester: "FIRST",
    location_label: "",
    sports_overview: "",
    previous_tournament_id: "",
    start_date: "",
    end_date: "",
  },
  selectedDepartments: [],
  selectedSports: [],
  selectedVenues: [],
  format: {
    default_bracket_format: "SINGLE_ELIMINATION",
    default_seeding_method: "RANDOM",
    include_evening: false,
    schedule_start_hour: 5,
    schedule_end_hour: 18,
  },
  sport_bracket_settings: [],
  updatedAt: null,
};

const toIntList = (value) => {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => Number.parseInt(String(item), 10))
        .filter((item) => Number.isInteger(item) && item > 0)
    )
  );
};

const buildDraftKey = (userId) =>
  userId ? `${DRAFT_KEY_PREFIX}:${userId}` : `${DRAFT_KEY_PREFIX}:anonymous`;

const normalizeVenueName = (venue) =>
  String(venue?.name || venue?.venue_name || `Venue #${venue?.id || "-"}`);

const inferParticipantShape = (sport) => {
  const unitType = String(sport?.configuration?.unit_type || sport?.unit_type || "").trim().toUpperCase();
  if (["TEAM", "SOLO", "DUO"].includes(unitType)) return unitType;
  const participationType = String(
    sport?.configuration?.participation_type || sport?.participation_type || sport?.category || ""
  )
    .trim()
    .toLowerCase();
  if (["single", "solo", "individual"].includes(participationType)) return "SOLO";
  if (["double", "duo", "pair"].includes(participationType)) return "DUO";
  return "TEAM";
};

const intKey = (value) => {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed)) return -1;
  return parsed;
};

const formatApiMessage = (detail, fallback) => {
  if (typeof detail === "string" && detail.trim()) return detail.trim();
  if (Array.isArray(detail)) {
    const message = detail
      .map((item) => formatApiMessage(item, ""))
      .filter(Boolean)
      .join(" ");
    return message || fallback;
  }
  if (detail && typeof detail === "object") {
    if (typeof detail.message === "string" && detail.message.trim()) {
      return detail.message.trim();
    }
    const message = Object.values(detail)
      .map((item) => formatApiMessage(item, ""))
      .filter(Boolean)
      .join(" ");
    return message || fallback;
  }
  return fallback;
};

const TournamentCreateWizard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const userId = user?.id || user?.user_id || null;
  const draftKey = useMemo(() => buildDraftKey(userId), [userId]);

  const [sports, setSports] = useState([]);
  const [sportTemplates, setSportTemplates] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [venues, setVenues] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [state, setState] = useState(INITIAL_STATE);
  const [stepError, setStepError] = useState("");
  const [statusMessage, setStatusMessage] = useState({ type: "", text: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [creationModal, setCreationModal] = useState({
    isOpen: false,
    status: "loading", // "loading" | "success" | "error"
    title: "",
    message: "",
  });

  const [sportSearch, setSportSearch] = useState("");
  const [venueSearch, setVenueSearch] = useState("");
  const [showOnlyCompatibleVenues, setShowOnlyCompatibleVenues] = useState(true);
  const eventDrawerRef = useRef(null);
  const [eventDrawer, setEventDrawer] = useState({
    isOpen: false,
    mode: "edit",
    sportId: null,
    eventIndex: -1,
    draft: null,
    error: "",
  });
  const [expandedEventEditors, setExpandedEventEditors] = useState({});

  const normalizedSports = useMemo(
    () =>
      (Array.isArray(sports) ? sports : []).map((sport) => ({
        ...sport,
        id: Number(sport.id),
        label: getSportDisplayName(sport, sportTemplates),
        participantShape: inferParticipantShape(sport),
      })),
    [sportTemplates, sports]
  );

  const selectedSportIds = useMemo(() => toIntList(state.selectedSports), [state.selectedSports]);
  const selectedDepartmentIds = useMemo(() => toIntList(state.selectedDepartments), [state.selectedDepartments]);

  const normalizedDepartments = useMemo(
    () =>
      (Array.isArray(departments) ? departments : [])
        .filter((department) => String(department?.department_name || "").trim().toLowerCase() !== "sports office")
        .map((department) => ({
          ...department,
          id: Number(department.id),
          label: String(department?.department_name || department?.department_code || `Department #${department?.id || "-"}`),
        })),
    [departments]
  );

  const selectedSports = useMemo(() => {
    const idSet = new Set(selectedSportIds);
    return normalizedSports.filter((sport) => idSet.has(Number(sport.id)));
  }, [normalizedSports, selectedSportIds]);

  const selectedDepartments = useMemo(() => {
    const idSet = new Set(selectedDepartmentIds);
    return normalizedDepartments.filter((department) => idSet.has(Number(department.id)));
  }, [normalizedDepartments, selectedDepartmentIds]);

  const normalizedActiveVenues = useMemo(
    () =>
      (Array.isArray(venues) ? venues : [])
        .filter((venue) => Boolean(venue?.is_active))
        .map((venue) => ({
          ...venue,
          id: Number(venue.id),
          venueLabel: normalizeVenueName(venue),
          supportedSportIds: toIntList(venue?.supported_sport_ids),
        })),
    [venues]
  );

  const selectedVenueIds = useMemo(() => toIntList(state.selectedVenues), [state.selectedVenues]);
  const selectedVenueIdSet = useMemo(() => new Set(selectedVenueIds), [selectedVenueIds]);

  const selectedVenues = useMemo(() => {
    return normalizedActiveVenues.filter((venue) => selectedVenueIdSet.has(Number(venue.id)));
  }, [normalizedActiveVenues, selectedVenueIdSet]);

  const sportMap = useMemo(() => {
    const map = {};
    normalizedSports.forEach((sport) => {
      map[intKey(sport.id)] = sport.label;
    });
    return map;
  }, [normalizedSports]);

  const compatibilityByVenueId = useMemo(() => {
    const selected = new Set(selectedSportIds);
    const map = new Map();
    normalizedActiveVenues.forEach((venue) => {
      const overlap = venue.supportedSportIds.filter((sportId) => selected.has(sportId));
      map.set(venue.id, {
        isCompatible: selected.size === 0 ? true : overlap.length > 0,
      });
    });
    return map;
  }, [normalizedActiveVenues, selectedSportIds]);

  const expectedTargetCounts = useMemo(() => {
    const departmentCount = selectedDepartmentIds.length;
    const { teamSlots, entryPools } = countExpectedRegistrationTargets({
      departmentCount,
      sportIds: selectedSportIds,
      sports: selectedSports,
      sportSettings: state.sport_bracket_settings,
      templates: sportTemplates,
      fallbackBracketFormat: state.format.default_bracket_format,
      fallbackSeedingMethod: state.format.default_seeding_method,
    });
    return {
      departmentCount,
      sportCount: selectedSports.length,
      expectedTeamSlots: teamSlots,
      expectedEntryPools: entryPools,
    };
  }, [
    selectedDepartmentIds.length,
    selectedSportIds,
    selectedSports,
    sportTemplates,
    state.format.default_bracket_format,
    state.format.default_seeding_method,
    state.sport_bracket_settings,
  ]);

  const filteredSports = useMemo(() => {
    const keyword = String(sportSearch || "").trim().toLowerCase();
    if (!keyword) return normalizedSports;
    return normalizedSports.filter((sport) => sport.label.toLowerCase().includes(keyword));
  }, [normalizedSports, sportSearch]);

  const filteredVenues = useMemo(() => {
    const keyword = String(venueSearch || "").trim().toLowerCase();
    return normalizedActiveVenues.filter((venue) => {
      const compatibility = compatibilityByVenueId.get(venue.id);
      const isSelected = selectedVenueIdSet.has(Number(venue.id));
      if (showOnlyCompatibleVenues && selectedSportIds.length > 0 && !compatibility?.isCompatible && !isSelected) {
        return false;
      }
      if (!keyword) return true;
      return (
        venue.venueLabel.toLowerCase().includes(keyword) ||
        String(venue.location || "").toLowerCase().includes(keyword)
      );
    });
  }, [compatibilityByVenueId, normalizedActiveVenues, selectedSportIds.length, selectedVenueIdSet, showOnlyCompatibleVenues, venueSearch]);

  const incompatibleSelectedVenues = useMemo(
    () =>
      selectedVenues.filter((venue) => {
        if (selectedSportIds.length === 0) return false;
        return !compatibilityByVenueId.get(venue.id)?.isCompatible;
      }),
    [compatibilityByVenueId, selectedSportIds.length, selectedVenues]
  );

  const progressPercent = Math.round(((state.currentStep + 1) / STEP_ITEMS.length) * 100);

  const isDirty = useMemo(() => {
    const basics = state.basics || {};
    return Boolean(
      String(basics.tournament_name || "").trim() ||
      String(basics.season_label || "").trim() ||
      String(basics.location_label || "").trim() ||
      String(basics.sports_overview || "").trim() ||
      String(basics.start_date || "").trim() ||
      String(basics.end_date || "").trim() ||
      toIntList(state.selectedDepartments).length > 0 ||
      toIntList(state.selectedSports).length > 0 ||
      toIntList(state.selectedVenues).length > 0
    );
  }, [state.basics, state.selectedDepartments, state.selectedSports, state.selectedVenues]);

  useBeforeUnload((event) => {
    if (!isDirty || isSubmitting) return;
    event.preventDefault();
    event.returnValue = "";
  });

  const updateState = (updater) => {
    setState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      return { ...next, updatedAt: new Date().toISOString() };
    });
  };

  const ensureSportSetting = (settings, sportId) => {
    const index = settings.findIndex((setting) => Number(setting?.sport_id) === Number(sportId));
    if (index >= 0) return { settings, index };
    const sport = normalizedSports.find((row) => Number(row.id) === Number(sportId));
    if (!sport) return { settings, index: -1 };
    const nextSettings = [
      ...settings,
      buildNormalizedSportBracketSetting({
        sport,
        templates: sportTemplates,
        fallbackBracketFormat: state.format.default_bracket_format,
        fallbackSeedingMethod: state.format.default_seeding_method,
      }),
    ];
    return { settings: nextSettings, index: nextSettings.length - 1 };
  };

  const buildEventEditorKey = (sportId, event, index) => `${sportId}:${event?.id ?? event?.event_key ?? index}`;
  const toggleEventEditor = (sportId, event, index) => {
    const key = buildEventEditorKey(sportId, event, index);
    setExpandedEventEditors((current) => ({ ...current, [key]: !current[key] }));
  };

  const handleEventAdd = (sportId) => {
    const sport = normalizedSports.find((row) => Number(row.id) === Number(sportId));
    const capabilities = resolveSportEventCapabilities(sport, sportTemplates);
    const draft = buildCustomEventCategory({
      sport,
      fallbackBracketFormat: state.format.default_bracket_format,
      fallbackSeedingMethod: state.format.default_seeding_method,
      participantShape: capabilities.allowedParticipantShapes[0],
    });
    draft.division_category = capabilities.allowedDivisions[0];
    draft._is_custom = true;
    setEventDrawer({ isOpen: true, mode: "add", sportId: Number(sportId), eventIndex: -1, draft, error: "" });
  };

  const handleEventEdit = (sportId, eventIndex, eventCategory) => {
    setEventDrawer({
      isOpen: true,
      mode: "edit",
      sportId: Number(sportId),
      eventIndex,
      draft: { ...eventCategory },
      error: "",
    });
  };

  const closeEventDrawer = () => {
    setEventDrawer({ isOpen: false, mode: "edit", sportId: null, eventIndex: -1, draft: null, error: "" });
  };

  const saveEventDrawer = () => {
    const validationError = validateEventCategories([eventDrawer.draft]);
    if (validationError) {
      setEventDrawer((current) => ({ ...current, error: validationError }));
      return;
    }
    const currentSetting = (state.sport_bracket_settings || []).find((row) => Number(row?.sport_id) === Number(eventDrawer.sportId));
    const duplicate = (currentSetting?.events || []).some((eventCategory, index) =>
      index !== eventDrawer.eventIndex && eventCategory?.is_active !== false &&
      slugifyEventKey(eventCategory?.event_key || eventCategory?.event_name) === slugifyEventKey(eventDrawer.draft?.event_key || eventDrawer.draft?.event_name)
    );
    if (duplicate) {
      setEventDrawer((current) => ({ ...current, error: "This event is already selected for this sport." }));
      return;
    }
    updateState((prev) => {
      let settings = [...(prev.sport_bracket_settings || [])];
      const ensured = ensureSportSetting(settings, eventDrawer.sportId);
      settings = ensured.settings;
      if (ensured.index < 0) return prev;
      const events = [...(settings[ensured.index].events || [])];
      if (eventDrawer.mode === "add") events.push({ ...eventDrawer.draft, is_active: true });
      else events[eventDrawer.eventIndex] = { ...eventDrawer.draft, is_active: true };
      settings[ensured.index] = { ...settings[ensured.index], events };
      return { ...prev, sport_bracket_settings: settings };
    });
    closeEventDrawer();
  };

  const handleEventToggle = (sportId, eventIndex) => {
    updateState((prev) => {
      const settings = [...(prev.sport_bracket_settings || [])];
      const index = settings.findIndex((setting) => Number(setting?.sport_id) === Number(sportId));
      if (index < 0) return prev;
      const events = [...(settings[index].events || [])];
      if (!events[eventIndex]) return prev;
      events[eventIndex] = { ...events[eventIndex], is_active: events[eventIndex].is_active === false };
      settings[index] = { ...settings[index], events };
      return { ...prev, sport_bracket_settings: settings };
    });
  };

  const handleEventSettingChange = (sportId, eventIndex, field, value) => {
    updateState((prev) => {
      const settings = [...(prev.sport_bracket_settings || [])];
      const index = settings.findIndex((s) => Number(s?.sport_id) === Number(sportId));
      if (index < 0) return prev;
      const events = [...(settings[index].events || [])];
      if (!events[eventIndex]) return prev;
      const currentEvent = events[eventIndex];
      const nextEvent = { ...currentEvent, [field]: value };
      if (field === "participant_shape") {
        nextEvent.players_per_entry = null;
      }
      events[eventIndex] = nextEvent;
      settings[index] = { ...settings[index], events };
      return { ...prev, sport_bracket_settings: settings };
    });
  };

  useEffect(() => {
    if (!eventDrawer.isOpen) return undefined;
    const previousActiveElement = document.activeElement;
    window.requestAnimationFrame(() => eventDrawerRef.current?.querySelector("input, select, button")?.focus());
    const handleKeyDown = (event) => {
      if (event.key === "Escape") closeEventDrawer();
      if (event.key !== "Tab" || !eventDrawerRef.current) return;
      const focusable = [...eventDrawerRef.current.querySelectorAll("button:not([disabled]), input:not([disabled]), select:not([disabled])")];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousActiveElement?.focus?.();
    };
  }, [eventDrawer.isOpen]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setLoadError("");
      try {
        const [sportsData, templatesData, departmentsData, venuesData] = await Promise.all([
          getSports(),
          getSportTemplates(),
          getDepartments(),
          getVenues(false),
        ]);
        setSports(Array.isArray(sportsData) ? sportsData : []);
        setSportTemplates(Array.isArray(templatesData) ? templatesData : []);
        setDepartments(Array.isArray(departmentsData) ? departmentsData : []);
        setVenues(Array.isArray(venuesData) ? venuesData : []);
      } catch (error) {
        setSports([]);
        setSportTemplates([]);
        setDepartments([]);
        setVenues([]);
        setLoadError(formatApiMessage(error?.response?.data?.detail, "Unable to load setup references."));
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (selectedSportIds.length === 0 || normalizedSports.length === 0) return;
    updateState((prev) => {
      const selectedIdSet = new Set(selectedSportIds);
      const nextSettings = normalizedSports
        .filter((sport) => selectedIdSet.has(Number(sport.id)))
        .map((sport) => {
          const existingSetting = (prev.sport_bracket_settings || []).find(
            (setting) => Number(setting?.sport_id) === Number(sport.id)
          );
          return buildNormalizedSportBracketSetting({
            sport,
            setting: existingSetting,
            templates: sportTemplates,
            fallbackBracketFormat: prev.format.default_bracket_format,
            fallbackSeedingMethod: prev.format.default_seeding_method,
          });
        });

      const unchanged =
        JSON.stringify(nextSettings) === JSON.stringify(prev.sport_bracket_settings || []);
      if (unchanged) return prev;
      return { ...prev, sport_bracket_settings: nextSettings };
    });
  }, [normalizedSports, selectedSportIds, sportTemplates]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== DRAFT_STORAGE_VERSION) return;
      setState((prev) => ({
        ...prev,
        currentStep: Math.max(0, Math.min(Number(parsed.currentStep || 0), STEP_ITEMS.length - 1)),
        basics: { ...prev.basics, ...(parsed.basics || {}) },
        selectedDepartments: toIntList(parsed.selectedDepartments),
        selectedSports: toIntList(parsed.selectedSports),
        selectedVenues: toIntList(parsed.selectedVenues),
        format: { ...prev.format, ...(parsed.format || {}) },
        sport_bracket_settings: Array.isArray(parsed.sport_bracket_settings) ? parsed.sport_bracket_settings : prev.sport_bracket_settings,
        updatedAt: parsed.updatedAt || null,
      }));
    } catch {
      // Ignore malformed draft payloads.
    }
  }, [draftKey]);

  useEffect(() => {
    const payload = {
      version: DRAFT_STORAGE_VERSION,
      currentStep: state.currentStep,
      basics: state.basics,
      selectedDepartments: selectedDepartmentIds,
      selectedSports: selectedSportIds,
      selectedVenues: selectedVenueIds,
      format: state.format,
      sport_bracket_settings: state.sport_bracket_settings,
      updatedAt: state.updatedAt,
    };
    localStorage.setItem(draftKey, JSON.stringify(payload));
  }, [draftKey, selectedDepartmentIds, selectedSportIds, selectedVenueIds, state.basics, state.currentStep, state.format, state.sport_bracket_settings, state.updatedAt]);

  const toggleSport = (sportId) => {
    const id = Number.parseInt(String(sportId), 10);
    if (!Number.isInteger(id) || id <= 0) return;
    if (selectedSportIds.includes(id)) {
      const configured = (state.sport_bracket_settings || []).find((setting) => Number(setting?.sport_id) === id);
      const eventCount = (configured?.events || []).filter((event) => event?.is_active !== false).length;
      const label = normalizedSports.find((sport) => Number(sport.id) === id)?.label || "This sport";
      if (eventCount > 0 && !window.confirm(`Removing ${label} will remove its ${eventCount} configured event${eventCount === 1 ? "" : "s"} from this draft.`)) return;
    }
    updateState((prev) => {
      const current = new Set(toIntList(prev.selectedSports));
      if (current.has(id)) {
        current.delete(id);
      } else {
        current.add(id);
      }
      const nextSelectedSports = Array.from(current);
      const selectedIdSet = new Set(nextSelectedSports);
      return {
        ...prev,
        selectedSports: nextSelectedSports,
        sport_bracket_settings: (prev.sport_bracket_settings || []).filter((setting) =>
          selectedIdSet.has(Number(setting?.sport_id))
        ),
      };
    });
  };

  const toggleDepartment = (departmentId) => {
    const id = Number.parseInt(String(departmentId), 10);
    if (!Number.isInteger(id) || id <= 0) return;
    updateState((prev) => {
      const current = new Set(toIntList(prev.selectedDepartments));
      if (current.has(id)) {
        current.delete(id);
      } else {
        current.add(id);
      }
      return { ...prev, selectedDepartments: Array.from(current) };
    });
  };

  const selectAllDepartments = () => {
    updateState((prev) => ({
      ...prev,
      selectedDepartments: normalizedDepartments.map((d) => Number(d.id)),
    }));
  };

  const deselectAllDepartments = () => {
    updateState((prev) => ({
      ...prev,
      selectedDepartments: [],
    }));
  };

  const toggleVenue = (venueId) => {
    const id = Number.parseInt(String(venueId), 10);
    if (!Number.isInteger(id) || id <= 0) return;
    updateState((prev) => {
      const current = new Set(toIntList(prev.selectedVenues));
      if (current.has(id)) {
        current.delete(id);
      } else {
        current.add(id);
      }
      return { ...prev, selectedVenues: Array.from(current) };
    });
  };

  useEffect(() => {
    const activeVenueIdSet = new Set(normalizedActiveVenues.map((venue) => Number(venue.id)));
    setState((prev) => {
      const existing = toIntList(prev.selectedVenues);
      const filtered = existing.filter((id) => activeVenueIdSet.has(id));
      if (filtered.length === existing.length) return prev;
      return { ...prev, selectedVenues: filtered };
    });
  }, [normalizedActiveVenues]);

  const validateStep = (step = state.currentStep) => {
    const basics = state.basics || {};
    if (step === 0) {
      if (!String(basics.tournament_name || "").trim()) {
        return "Intramural name is required.";
      }
      if (String(basics.season_label || "").trim().length < 4) {
        return "Academic year is required (e.g. 2026-2027).";
      }
      if (!String(basics.semester || "").trim()) {
        return "Semester is required.";
      }
    }
    if (step === 1) {
      if (!String(basics.start_date || "").trim() || !String(basics.end_date || "").trim()) {
        return "Tournament start and end dates are required.";
      }
      if (String(basics.end_date) < String(basics.start_date)) {
        return "Tournament end date must be on or after start date.";
      }
    }
    if (step === 2) {
      if (selectedSportIds.length === 0) {
        return "Select at least one sport.";
      }
    }
    if (step === 3) {
      for (const sport of selectedSports) {
        const setting = (state.sport_bracket_settings || []).find(
          (row) => Number(row?.sport_id) === Number(sport.id)
        );
        const validationMessage = validateEventCategories(setting?.events || []);
        if (validationMessage) return `${sport.label}: ${validationMessage}`;
      }
    }
    if (step === 4 && selectedDepartmentIds.length === 0) {
      return "Select at least one department.";
    }
    if (step === 5) {
      if (selectedVenueIds.length === 0) {
        return "Please select at least one venue for this tournament. The scheduler will use only the venues assigned here.";
      }
      if (incompatibleSelectedVenues.length > 0) {
        return "One or more selected venues do not support the currently selected sports. Remove or replace them before continuing.";
      }
      return "";
    }
    if (step === 6) {
      for (const requiredStep of [0, 1, 2, 3, 4, 5]) {
        const error = validateStep(requiredStep);
        if (error) return error;
      }
    }
    return "";
  };

  const handleNext = () => {
    const error = validateStep();
    if (error) {
      setStepError(error);
      return;
    }
    setStepError("");
    updateState((prev) => ({ ...prev, currentStep: Math.min(prev.currentStep + 1, STEP_ITEMS.length - 1) }));
  };

  const handleBack = () => {
    setStepError("");
    if (state.currentStep === 0) {
      navigate("/coordinator/intramurals");
      return;
    }
    updateState((prev) => ({ ...prev, currentStep: Math.max(prev.currentStep - 1, 0) }));
  };

  const jumpToStep = (step) => {
    const parsed = Number.parseInt(String(step), 10);
    if (!Number.isInteger(parsed)) return;
    setStepError("");
    updateState((prev) => ({
      ...prev,
      currentStep: Math.max(0, Math.min(parsed, STEP_ITEMS.length - 1)),
    }));
  };

  const createPayload = useMemo(() => {
    const basics = state.basics || {};
    const previousTournamentId = Number.parseInt(String(basics.previous_tournament_id || ""), 10);
    const trimmedName = String(basics.tournament_name || "").trim();
    const trimmedSchoolYear = String(basics.season_label || "").trim();
    const trimmedDescription = String(basics.sports_overview || "").trim();
    return {
      // --- Season (workspace) fields — Intramural-first creation ---
      name: trimmedName,
      school_year: trimmedSchoolYear,
      semester: String(basics.semester || "FIRST").trim() || "FIRST",
      description: trimmedDescription || null,
      // --- Tournament (competition event) fields ---
      tournament_name: trimmedName,
      tournament_type: String(basics.tournament_type || "SINGLE_ELIMINATION").trim(),
      season_label: trimmedSchoolYear || null,
      location_label: String(basics.location_label || "").trim() || null,
      sports_overview: String(basics.sports_overview || "").trim() || null,
      previous_tournament_id: Number.isInteger(previousTournamentId) && previousTournamentId > 0 ? previousTournamentId : null,
      start_date: basics.start_date || null,
      end_date: basics.end_date || null,
      department_ids: selectedDepartmentIds,
      department_scope:
        normalizedDepartments.length > 0 && selectedDepartmentIds.length === normalizedDepartments.length
          ? "ALL_DEPARTMENTS"
          : "INTER_DEPARTMENT",
      sport_ids: selectedSportIds,
      team_ids: [],
      venue_ids: selectedVenueIds,
      include_evening: Boolean(state.format.include_evening),
      schedule_start_hour: Number(state.format.schedule_start_hour || 5),
      schedule_end_hour: Number(state.format.schedule_end_hour || 18),
      default_bracket_format: state.format.default_bracket_format || "SINGLE_ELIMINATION",
      default_seeding_method: state.format.default_seeding_method || "RANDOM",
      sport_bracket_settings: serializeSportBracketSettingsForPayload({
        sportIds: selectedSportIds,
        sportSettings: state.sport_bracket_settings || [],
        sports: selectedSports,
        templates: sportTemplates,
        fallbackBracketFormat: state.format.default_bracket_format || "SINGLE_ELIMINATION",
        fallbackSeedingMethod: state.format.default_seeding_method || "RANDOM",
      }),
    };
  }, [
    normalizedDepartments.length,
    selectedDepartmentIds,
    selectedSportIds,
    selectedVenueIds,
    selectedSports,
    sportTemplates,
    state.basics,
    state.format.default_bracket_format,
    state.format.default_seeding_method,
    state.format.include_evening,
    state.format.schedule_end_hour,
    state.format.schedule_start_hour,
    state.sport_bracket_settings,
  ]);

  const handleCreateTournament = async () => {
    const error = validateStep(6);
    if (error) {
      setStepError(error);
      return;
    }

    setStepError("");
    setIsSubmitting(true);
    setStatusMessage({ type: "", text: "" });
    setCreationModal({
      isOpen: true,
      status: "loading",
      title: "Creating Intramural Event",
      message: "Setting up tournament workspace, sports categories, and venue allocations...",
    });

    try {
      // Intramural-first: creates the draft season workspace and competition
      // Tournament in one atomic backend transaction.
      const result = await createIntramural(createPayload);
      const createdTournament = result?.tournament || {};
      const createdWorkspace = result?.workspace || null;
      localStorage.removeItem(draftKey);

      // Open the exact Tournament returned by the atomic creation response.
      // This deliberately avoids newest/highest-id selection heuristics.
      try {
        sessionStorage.setItem("omnisport:selected_tournament_workspace", JSON.stringify(createdTournament));
      } catch {
        // The overview can still reload through the Workspace mapping.
      }

      setCreationModal({
        isOpen: true,
        status: "success",
        title: "Intramural Created!",
        message: `"${createdTournament?.tournament_name || createPayload.name}" is ready. Redirecting to dashboard...`,
      });

      setTimeout(() => {
        navigate("/coordinator/dashboard", {
          state: {
            createdIntramuralName: createdTournament?.tournament_name || createPayload.name,
            createdWorkspaceId: createdWorkspace?.id || null,
          },
        });
      }, 1200);
    } catch (errorResponse) {
      const errorText = formatApiMessage(errorResponse?.response?.data?.detail, "Failed to create intramural.");
      setCreationModal({
        isOpen: true,
        status: "error",
        title: "Creation Failed",
        message: errorText,
      });
      setIsSubmitting(false);
    }
  };

  const renderBasicsStep = () => (
    <div className="space-y-6">
      {/* Intramural Name */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Intramural Event Name
        </label>
        <input
          type="text"
          value={state.basics.tournament_name}
          onChange={(event) => updateState((prev) => ({ ...prev, basics: { ...prev.basics, tournament_name: event.target.value } }))}
          placeholder="e.g. University Intramurals 2026"
          className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-base font-medium text-slate-900 placeholder-slate-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
        />
      </div>

      {/* Period & Schedule Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Academic Year
          </label>
          <input
            type="text"
            value={state.basics.season_label}
            onChange={(event) => updateState((prev) => ({ ...prev, basics: { ...prev.basics, season_label: event.target.value } }))}
            placeholder="e.g. 2026-2027"
            className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Semester
          </label>
          <select
            value={state.basics.semester}
            onChange={(event) => updateState((prev) => ({ ...prev, basics: { ...prev.basics, semester: event.target.value } }))}
            className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
          >
            {SEMESTER_OPTIONS.map((option) => (
              <option key={`semester-${option.value}`} value={option.value} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">
                {option.label}
              </option>
            ))}
          </select>
        </div>

      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Description
        </label>
        <textarea
          value={state.basics.sports_overview}
          onChange={(event) => updateState((prev) => ({ ...prev, basics: { ...prev.basics, sports_overview: event.target.value } }))}
          rows={3}
          placeholder="Brief description or guidelines for this intramural event..."
          className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
        />
      </div>

      {/* Department selection lives in its own wizard step. */}
      {/*
      <div className="space-y-3 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Participating Departments
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              ({selectedDepartmentIds.length} of {normalizedDepartments.length})
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <button
              type="button"
              onClick={selectAllDepartments}
              className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              Select All
            </button>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <button
              type="button"
              onClick={deselectAllDepartments}
              className="font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        {normalizedDepartments.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">No departments available.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {normalizedDepartments.map((department) => {
              const isSelected = selectedDepartmentIds.includes(Number(department.id));
              return (
                <button
                  type="button"
                  key={department.id}
                  onClick={() => toggleDepartment(department.id)}
                  className={`flex items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5 text-left text-sm font-medium transition-all ${isSelected
                    ? "border-blue-500/60 text-blue-200"
                    : "border-slate-200/80 bg-transparent text-slate-700 hover:border-slate-300 hover:bg-slate-50/40 dark:border-slate-800 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800/20"
                    }`}
                >
                  <span className="truncate">{department.label}</span>
                  <div
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-colors ${isSelected
                      ? "bg-blue-600 text-white dark:bg-blue-500"
                      : "border border-slate-300 dark:border-slate-700"
                      }`}
                  >
                    {isSelected && <Check size={11} strokeWidth={3} />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div> */}
    </div>
  );

  const renderSportsStep = () => (
    <div className="space-y-4">
      <div className="relative">
        {/* <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" /> */}
        <input
          type="search"
          value={sportSearch}
          onChange={(event) => setSportSearch(event.target.value)}
          placeholder="Search sports"
          className="w-full rounded-sm border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-900"
        />
      </div>

      <div className="grid gap-2 md:grid-cols-4">
        {filteredSports.map((sport) => {
          const checked = selectedSportIds.includes(Number(sport.id));
          return (
            <label
              key={`sport-option-${sport.id}`}
              className="flex cursor-pointer items-center justify-between rounded-sm border border-slate-200 px-3 py-2"
            >
              <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{sport.label}</span>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleSport(sport.id)}
              />
            </label>
          );
        })}
      </div>
    </div>
  );

  const renderScheduleStep = () => (
    <div className="space-y-5">
      <p className="text-sm text-slate-500 dark:text-slate-400">Set the operating dates and daily scheduling window for this Intramural.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5"><span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Start Date</span><input type="date" value={state.basics.start_date} onChange={(event) => updateState((prev) => ({ ...prev, basics: { ...prev.basics, start_date: event.target.value } }))} className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm" /></label>
        <label className="space-y-1.5"><span className="text-xs font-semibold uppercase tracking-wider text-slate-500">End Date</span><input type="date" value={state.basics.end_date} onChange={(event) => updateState((prev) => ({ ...prev, basics: { ...prev.basics, end_date: event.target.value } }))} className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm" /></label>
        <label className="space-y-1.5"><span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Daily Start Hour</span><input type="number" min="0" max="23" value={state.format.schedule_start_hour} onChange={(event) => updateState((prev) => ({ ...prev, format: { ...prev.format, schedule_start_hour: Number(event.target.value) } }))} className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm" /></label>
        <label className="space-y-1.5"><span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Daily End Hour</span><input type="number" min="1" max="24" value={state.format.schedule_end_hour} onChange={(event) => updateState((prev) => ({ ...prev, format: { ...prev.format, schedule_end_hour: Number(event.target.value) } }))} className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm" /></label>
      </div>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg bg-slate-50 px-3 text-sm dark:bg-slate-800/50"><input type="checkbox" checked={Boolean(state.format.include_evening)} onChange={(event) => updateState((prev) => ({ ...prev, format: { ...prev.format, include_evening: event.target.checked } }))} /><span>Allow evening matches</span></label>
    </div>
  );

  const renderDepartmentsStep = () => (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-500 dark:text-slate-400">Choose the departments eligible to register entries.</p><div className="flex gap-3 text-xs"><button type="button" onClick={selectAllDepartments} className="font-semibold text-blue-600">Select all</button><button type="button" onClick={deselectAllDepartments} className="font-semibold text-slate-500">Clear</button></div></div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{normalizedDepartments.map((department) => { const checked = selectedDepartmentIds.includes(Number(department.id)); return <label key={department.id} className="flex min-h-11 cursor-pointer items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5 text-sm dark:border-slate-700"><span>{department.label}</span><input type="checkbox" checked={checked} onChange={() => toggleDepartment(department.id)} /></label>; })}</div>
      <p className="text-xs text-slate-500" role="status">{selectedDepartmentIds.length} of {normalizedDepartments.length} departments selected</p>
    </div>
  );

  const renderVenuesStep = () => (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          {/* <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" /> */}
          <input
            type="search"
            value={venueSearch}
            onChange={(event) => setVenueSearch(event.target.value)}
            placeholder="Search active venues"
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-900"
          />
        </div>
        <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={showOnlyCompatibleVenues}
            onChange={(event) => setShowOnlyCompatibleVenues(event.target.checked)}
          />
          Show only venues compatible with selected sports
        </label>
      </div>

      {selectedSportIds.length === 0 ? (
        <p className="rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
          Select sports first to get compatibility filtering.
        </p>
      ) : null}

      {incompatibleSelectedVenues.length > 0 ? (
        <div className="rounded-sm border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/40 dark:bg-amber-500/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Selected venues need attention</p>
              <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">
                {incompatibleSelectedVenues.map((venue) => venue.venueLabel).join(", ")} no longer match the selected sports.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                updateState((prev) => ({
                  ...prev,
                  selectedVenues: toIntList(prev.selectedVenues).filter(
                    (venueId) => !incompatibleSelectedVenues.some((venue) => venue.id === venueId)
                  ),
                }))
              }
              className="rounded-sm border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-400/40 dark:bg-slate-900/70 dark:text-amber-200 dark:hover:bg-slate-800"
            >
              Remove incompatible venues
            </button>
          </div>
        </div>
      ) : null}

      {filteredVenues.length === 0 ? (
        <p className="rounded-sm border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300">
          No active venues match this filter.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filteredVenues.map((venue) => {
            const checked = selectedVenueIds.includes(Number(venue.id));
            const compatibility = compatibilityByVenueId.get(venue.id);
            const supportedNames = venue.supportedSportIds.map((sportId) => sportMap[intKey(sportId)] || `Sport #${sportId}`);
            return (
              <label
                key={`venue-option-${venue.id}`}
                className={`cursor-pointer rounded-sm border px-3 py-3 ${checked
                  ? "border-blue-400"
                  : "border-slate-200"
                  }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{venue.venueLabel}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {venue.location || "No location"} | Capacity: {Number(venue.capacity || 0) || "N/A"}
                    </p>
                  </div>
                  <input type="checkbox" checked={checked} onChange={() => toggleVenue(venue.id)} />
                </div>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                  Supports: {supportedNames.length > 0 ? supportedNames.join(", ") : "No linked sports"}
                </p>
                {selectedSportIds.length > 0 && !compatibility?.isCompatible ? (
                  <p className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
                    Warning: Not compatible with currently selected sports.
                  </p>
                ) : null}
              </label>
            );
          })}
        </div>
      )}

      {selectedVenueIds.length === 0 ? (
        <p className="rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
          Please select at least one venue for this tournament. The scheduler will use only the venues assigned here.
        </p>
      ) : null}
    </div>
  );

  const describeEvent = (eventCategory) => {
    const division = DIVISION_OPTIONS.find((option) => option.value === eventCategory.division_category)?.label || "Open";
    const shape = participantShapeLabel(eventCategory.participant_shape);
    const entryLimit = Number(eventCategory.max_entries_per_department || 1);
    const size = eventCategory.participant_shape === "TEAM"
      ? `${eventCategory.min_players || "?"}–${eventCategory.max_players || "?"} players`
      : eventCategory.participant_shape === "DUO" ? "2 athletes" : "1 athlete";
    return [division, shape, eventCategory.playing_format, size, entryLimit === 1 ? "1 entry/department" : `up to ${entryLimit} entries/department`].filter(Boolean).join(" · ");
  };

  const renderFormatStep = () => (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-700">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Choose the events being held. Common events already include valid settings from each sport template.
        </p>
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {selectedSports.length} sports · {(state.sport_bracket_settings || []).reduce((count, setting) => count + (setting.events || []).filter((eventCategory) => eventCategory?.is_active !== false).length, 0)} events selected
        </span>
      </div>

      <nav aria-label="Selected sports" className="flex gap-2 overflow-x-auto pb-1">
        {selectedSports.map((sport) => {
          const setting = (state.sport_bracket_settings || []).find((row) => Number(row?.sport_id) === Number(sport.id));
          const count = (setting?.events || []).filter((eventCategory) => eventCategory?.is_active !== false).length;
          return <a key={`event-index-${sport.id}`} href={`#sport-events-${sport.id}`} className="whitespace-nowrap rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-200">{sport.label} · {count}</a>;
        })}
      </nav>

      {selectedSports.map((sport) => {
        const setting = (state.sport_bracket_settings || []).find((row) => Number(row?.sport_id) === Number(sport.id)) || buildNormalizedSportBracketSetting({
          sport,
          templates: sportTemplates,
          fallbackBracketFormat: state.format.default_bracket_format,
          fallbackSeedingMethod: state.format.default_seeding_method,
        });
        const indexedEvents = (setting.events || []).map((eventCategory, index) => ({ eventCategory, index }));
        const selected = indexedEvents.filter(({ eventCategory }) => eventCategory?.is_active !== false);
        const available = indexedEvents.filter(({ eventCategory }) => eventCategory?.is_active === false && !eventCategory?._is_custom);
        return (
          <section id={`sport-events-${sport.id}`} key={`simple-sport-${sport.id}`} className="scroll-mt-6 border-b border-slate-200 pb-7 dark:border-slate-700">
            <header className="mb-2 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">{sport.label}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">{selected.length} {selected.length === 1 ? "event" : "events"} selected</p>
              </div>
              <button type="button" onClick={() => handleEventAdd(sport.id)} className="inline-flex min-h-10 items-center gap-1 px-2 text-sm font-semibold text-blue-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-blue-300">
                <Plus size={16} /> Add Event
              </button>
            </header>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {selected.map(({ eventCategory, index }) => (
                <div key={`selected-event-${sport.id}-${eventCategory.event_key || index}`} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <label className="flex min-w-0 cursor-pointer items-start gap-3">
                    <input type="checkbox" checked onChange={() => handleEventToggle(sport.id, index)} className="mt-1 h-5 w-5 rounded focus:ring-2 focus:ring-blue-500" />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">{eventCategory.event_name}</span>
                      <span className="block text-xs leading-5 text-slate-500 dark:text-slate-400">{describeEvent(eventCategory)}</span>
                    </span>
                  </label>
                  <button type="button" onClick={() => handleEventEdit(sport.id, index, eventCategory)} className="min-h-10 self-end px-2 text-sm font-semibold text-slate-600 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-300 sm:self-auto">Edit</button>
                </div>
              ))}
            </div>

            {selected.length === 0 ? <p role="alert" className="my-3 flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-300"><AlertCircle size={16} /> Select at least one event.</p> : null}

            {available.length > 0 ? (
              <div className="mt-3">
                <p className="mb-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Available</p>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {available.map(({ eventCategory, index }) => (
                    <div key={`available-event-${sport.id}-${eventCategory.event_key || index}`} className="flex items-center justify-between gap-3 py-2.5 pl-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{eventCategory.event_name}</p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{describeEvent(eventCategory)}</p>
                      </div>
                      <button type="button" onClick={() => handleEventToggle(sport.id, index)} aria-label={`Add ${eventCategory.event_name}`} className="min-h-10 shrink-0 px-3 text-sm font-semibold text-blue-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-blue-300">Add</button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );

  const renderLegacyFormatStep = () => (
    <div className="space-y-4">
      {selectedSports.length > 0 && (
        <div className="mt-6 space-y-4">
          {/* <h4 className="font-semibold text-slate-800 dark:text-slate-100">Event Categories & Entry Rules</h4> */}
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Each sport uses template-backed event categories when available. Edit only the category details that need tournament-specific adjustments.
          </p>
          <div className="space-y-6">
            {selectedSports.map((sport) => {
              const capabilities = resolveSportEventCapabilities(sport, sportTemplates);
              const setting =
                (state.sport_bracket_settings || []).find((s) => Number(s?.sport_id) === Number(sport.id)) ||
                buildNormalizedSportBracketSetting({
                  sport,
                  templates: sportTemplates,
                  fallbackBracketFormat: state.format.default_bracket_format,
                  fallbackSeedingMethod: state.format.default_seeding_method,
                });
              const activeEvents = (setting.events || []).filter((eventCategory) => eventCategory?.is_active !== false);
              const inactiveEvents = (setting.events || []).filter((eventCategory) => eventCategory?.is_active === false);
              return (
                <div key={`sport-override-${sport.id}`} className="space-y-3 rounded-2xl border border-slate-200 p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h5 className="font-semibold text-slate-800 dark:text-slate-100">{sport.label}</h5>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {activeEvents.length} event categor{activeEvents.length === 1 ? "y" : "ies"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleEventAdd(sport.id)}
                      className="inline-flex items-center gap-1 rounded-sm border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200"
                    >
                      <Plus size={14} />
                      Add Custom Event
                    </button>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Event Categories
                    </p>
                    <div className="space-y-2">
                      {activeEvents.map((eventCategory, idx) => {
                        const editorKey = buildEventEditorKey(sport.id, eventCategory, idx);
                        const isExpanded = Boolean(expandedEventEditors[editorKey]);
                        const canRemove = activeEvents.length > 1;
                        return (
                          <div key={editorKey} className="rounded-sm border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60">
                            <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <input aria-label={`Include ${eventCategory.event_name || "event"}`} type="checkbox" checked onChange={() => handleEventToggle(sport.id, idx)} className="h-5 w-5 shrink-0" />
                                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    {eventCategory.event_name || "New Event Category"}
                                  </p>
                                  <span className={`rounded-sm border px-2 py-0.5 text-[11px] font-semibold ${participantShapeBadgeClass(eventCategory.participant_shape)}`}>
                                    {participantShapeLabel(eventCategory.participant_shape)}
                                  </span>
                                </div>
                                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                                  <span>Entries/Dept: {eventCategory.max_entries_per_department}</span>
                                  <span>Min Bracket: {eventCategory.minimum_total_entries_for_bracket}</span>
                                  <span>{describePlayersPerEntry(eventCategory.participant_shape)}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => toggleEventEditor(sport.id, eventCategory, idx)}
                                  className="inline-flex items-center gap-1 rounded-sm border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                                >
                                  <PencilLine size={14} />
                                  {isExpanded ? "Close" : "Edit"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleEventToggle(sport.id, idx)}
                                  disabled={!canRemove}
                                  className="inline-flex items-center gap-1 rounded-sm border border-rose-200 bg-white px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-500/30 dark:bg-slate-900 dark:text-rose-300"
                                >
                                  <Check size={14} />
                                  Selected
                                </button>
                              </div>
                            </div>
                            {isExpanded ? (
                              <div className="border-t border-slate-200 px-3 py-3 dark:border-slate-700">
                                <div className="grid gap-3 md:grid-cols-2">
                                  <label className="space-y-1">
                                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Event Category Name</span>
                                    <input
                                      type="text"
                                      placeholder="e.g. Singles"
                                      value={eventCategory.event_name || ""}
                                      onChange={(e) => handleEventSettingChange(sport.id, idx, "event_name", e.target.value)}
                                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                    />
                                  </label>
                                  {eventCategory.participant_shape === "TEAM" ? (
                                    <>
                                      <label className="space-y-1">
                                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Minimum Roster Size</span>
                                        <input
                                          type="number"
                                          min="1"
                                          value={eventCategory.min_players || ""}
                                          onChange={(e) => handleEventSettingChange(sport.id, idx, "min_players", e.target.value ? parseInt(e.target.value, 10) : null)}
                                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                        />
                                      </label>
                                      <label className="space-y-1">
                                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Maximum Roster Size</span>
                                        <input
                                          type="number"
                                          min="1"
                                          value={eventCategory.max_players || ""}
                                          onChange={(e) => handleEventSettingChange(sport.id, idx, "max_players", e.target.value ? parseInt(e.target.value, 10) : null)}
                                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                        />
                                      </label>
                                    </>
                                  ) : null}
                                  <label className="space-y-1">
                                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Division</span>
                                    {capabilities.allowedDivisions.length === 1 ? (
                                      <div className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                        {DIVISION_OPTIONS.find((option) => option.value === capabilities.allowedDivisions[0])?.label || capabilities.allowedDivisions[0]}
                                      </div>
                                    ) : (
                                      <select
                                        value={eventCategory.division_category || capabilities.allowedDivisions[0]}
                                        onChange={(e) => handleEventSettingChange(sport.id, idx, "division_category", e.target.value)}
                                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                      >
                                        {DIVISION_OPTIONS.filter((option) => capabilities.allowedDivisions.includes(option.value)).map((option) => (
                                          <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                      </select>
                                    )}
                                  </label>
                                  <label className="space-y-1">
                                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Competition Type</span>
                                    {capabilities.allowedParticipantShapes.length === 1 ? (
                                      <div className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                        {participantShapeLabel(capabilities.allowedParticipantShapes[0])}
                                      </div>
                                    ) : (
                                      <select
                                        value={eventCategory.participant_shape || capabilities.allowedParticipantShapes[0]}
                                        onChange={(e) => handleEventSettingChange(sport.id, idx, "participant_shape", e.target.value)}
                                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                      >
                                        {capabilities.allowedParticipantShapes.map((shape) => (
                                          <option key={shape} value={shape}>{participantShapeLabel(shape)}</option>
                                        ))}
                                      </select>
                                    )}
                                  </label>
                                  <label className="space-y-1">
                                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Entries per Department</span>
                                    <input
                                      type="number"
                                      min="1"
                                      value={eventCategory.max_entries_per_department || ""}
                                      onChange={(e) => handleEventSettingChange(sport.id, idx, "max_entries_per_department", e.target.value ? parseInt(e.target.value, 10) : null)}
                                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                    />
                                  </label>
                                  <label className="space-y-1">
                                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Minimum Entries to Start Bracket</span>
                                    <input
                                      type="number"
                                      min="2"
                                      value={eventCategory.minimum_total_entries_for_bracket || ""}
                                      onChange={(e) => handleEventSettingChange(sport.id, idx, "minimum_total_entries_for_bracket", e.target.value ? parseInt(e.target.value, 10) : null)}
                                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                    />
                                  </label>
                                </div>
                                <p className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
                                  {describePlayersPerEntry(eventCategory.participant_shape)}
                                </p>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                    {inactiveEvents.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                          Available event suggestions
                        </p>
                        {inactiveEvents.map((eventCategory, idx) => {
                          const inactiveIndex = (setting.events || []).findIndex(
                            (row) => row?.event_key === eventCategory?.event_key && row?.id === eventCategory?.id
                          );
                          return (
                            <div key={`inactive-${buildEventEditorKey(sport.id, eventCategory, idx)}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                              <span>{eventCategory.event_name}</span>
                              <button
                                type="button"
                                onClick={() => handleEventToggle(sport.id, inactiveIndex)}
                                className="rounded-full border border-amber-300 bg-white px-3 py-1 font-semibold hover:bg-amber-100 dark:border-amber-500/40 dark:bg-slate-900"
                              >
                                Select Event
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  void renderLegacyFormatStep;

  const renderEventDrawer = () => {
    if (!eventDrawer.isOpen || !eventDrawer.draft) return null;
    const sport = normalizedSports.find((row) => Number(row.id) === Number(eventDrawer.sportId));
    const capabilities = resolveSportEventCapabilities(sport, sportTemplates);
    const draft = eventDrawer.draft;
    const updateDraft = (field, value) => setEventDrawer((current) => {
      const nextDraft = { ...current.draft, [field]: value };
      if (field === "participant_shape") {
        nextDraft.players_per_entry = value === "SOLO" ? 1 : value === "DUO" ? 2 : null;
        nextDraft.min_players = value === "SOLO" ? 1 : value === "DUO" ? 2 : sport?.configuration?.min_players;
        nextDraft.max_players = value === "SOLO" ? 1 : value === "DUO" ? 2 : sport?.configuration?.max_players;
      }
      return { ...current, error: "", draft: nextDraft };
    });
    const removeEvent = () => {
      if (eventDrawer.mode !== "edit") return;
      if (draft._is_custom) {
        updateState((prev) => {
          const settings = [...(prev.sport_bracket_settings || [])];
          const settingIndex = settings.findIndex((row) => Number(row?.sport_id) === Number(eventDrawer.sportId));
          if (settingIndex < 0) return prev;
          settings[settingIndex] = { ...settings[settingIndex], events: (settings[settingIndex].events || []).filter((_, index) => index !== eventDrawer.eventIndex) };
          return { ...prev, sport_bracket_settings: settings };
        });
      } else handleEventToggle(eventDrawer.sportId, eventDrawer.eventIndex);
      closeEventDrawer();
    };
    return createPortal(
      <div className="fixed inset-0 z-[100] flex justify-end bg-slate-950/50" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeEventDrawer(); }}>
        <aside ref={eventDrawerRef} role="dialog" aria-modal="true" aria-labelledby="event-drawer-title" className="flex h-full w-full max-w-full flex-col bg-white shadow-2xl sm:max-w-lg dark:bg-slate-950">
          <header className="flex items-start justify-between border-b border-slate-200 px-4 py-3 sm:px-5 sm:py-4 dark:border-slate-800">
            <div>
              <h3 id="event-drawer-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">{eventDrawer.mode === "add" ? "Add Event" : "Configure Event"}</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{sport?.label}</p>
            </div>
            <button type="button" onClick={closeEventDrawer} aria-label="Close event configuration" className="grid h-10 w-10 place-items-center rounded-full hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:hover:bg-slate-800"><X size={20} /></button>
          </header>
          <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
            {eventDrawer.error ? <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{eventDrawer.error}</p> : null}
            <label className="block space-y-1.5"><span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Event Name</span><input value={draft.event_name || ""} onChange={(event) => setEventDrawer((current) => ({ ...current, error: "", draft: { ...current.draft, event_name: event.target.value, event_key: current.draft?._is_custom ? slugifyEventKey(event.target.value) : current.draft?.event_key } }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900" /></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5"><span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Division</span>{capabilities.allowedDivisions.length === 1 ? <div className="rounded-lg bg-slate-100 px-3 py-2.5 text-sm dark:bg-slate-800">{DIVISION_OPTIONS.find((option) => option.value === capabilities.allowedDivisions[0])?.label || capabilities.allowedDivisions[0]}</div> : <select value={draft.division_category} onChange={(event) => updateDraft("division_category", event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900">{DIVISION_OPTIONS.filter((option) => capabilities.allowedDivisions.includes(option.value)).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>}</label>
              <label className="block space-y-1.5"><span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Competition Type</span>{capabilities.allowedParticipantShapes.length === 1 ? <div className="rounded-lg bg-slate-100 px-3 py-2.5 text-sm dark:bg-slate-800">{participantShapeLabel(capabilities.allowedParticipantShapes[0])}</div> : <select value={draft.participant_shape} onChange={(event) => updateDraft("participant_shape", event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900">{capabilities.allowedParticipantShapes.map((shape) => <option key={shape} value={shape}>{participantShapeLabel(shape)}</option>)}</select>}</label>
            </div>
            {draft.participant_shape === "TEAM" ? <fieldset><legend className="mb-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">Roster Size</legend><div className="grid grid-cols-2 gap-3"><label className="text-xs text-slate-500">Minimum<input type="number" min="1" value={draft.min_players || ""} onChange={(event) => updateDraft("min_players", event.target.value ? Number(event.target.value) : null)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900" /></label><label className="text-xs text-slate-500">Maximum<input type="number" min="1" value={draft.max_players || ""} onChange={(event) => updateDraft("max_players", event.target.value ? Number(event.target.value) : null)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900" /></label></div></fieldset> : <div><p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Athletes per Entry</p><p className="mt-1 rounded-lg bg-slate-100 px-3 py-2.5 text-sm dark:bg-slate-800">{draft.participant_shape === "DUO" ? 2 : 1}</p></div>}
            <label className="block space-y-1.5"><span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Entries per Department</span><input type="number" min="1" value={draft.max_entries_per_department || ""} onChange={(event) => updateDraft("max_entries_per_department", event.target.value ? Number(event.target.value) : null)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900" /></label>
            <div className="border-t border-slate-200 pt-5 dark:border-slate-800"><h4 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">Entry Readiness</h4><label className="block space-y-1.5"><span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Minimum Entries to Start</span><input type="number" min="2" value={draft.minimum_total_entries_for_bracket || ""} onChange={(event) => updateDraft("minimum_total_entries_for_bracket", event.target.value ? Number(event.target.value) : null)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900" /></label></div>
          </div>
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-4 sm:pb-4 dark:border-slate-800">
            <div>{eventDrawer.mode === "edit" ? <button type="button" onClick={removeEvent} className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500"><Trash2 size={16} /> Remove Event</button> : null}</div>
            <div className="flex gap-2"><button type="button" onClick={closeEventDrawer} className="min-h-10 px-4 text-sm font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-300">Cancel</button><button type="button" onClick={saveEventDrawer} className="min-h-10 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">{eventDrawer.mode === "add" ? "Add Event" : "Save"}</button></div>
          </footer>
        </aside>
      </div>,
      document.body
    );
  };

  const renderReviewStep = () => (
    <div className="space-y-6">
      {/* Basic Info & Schedule */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Basic Information
          </h4>
          <button
            type="button"
            onClick={() => jumpToStep(0)}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
          >
            Edit
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-slate-400 dark:text-slate-500">Event Name</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
              {state.basics.tournament_name || "Untitled Event"}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400 dark:text-slate-500">Academic Term</p>
            <p className="mt-0.5 text-sm font-medium text-slate-800 dark:text-slate-200">
              {state.basics.season_label || "N/A"} &bull; {SEMESTER_OPTIONS.find((s) => s.value === state.basics.semester)?.label || state.basics.semester}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400 dark:text-slate-500">Schedule</p>
            <p className="mt-0.5 text-sm font-medium text-slate-800 dark:text-slate-200">
              {state.basics.start_date || "TBA"} &mdash; {state.basics.end_date || "TBA"}
            </p>
          </div>
        </div>
      </div>

      {/* Participating Departments */}
      <div className="space-y-3 border-t border-slate-100 pt-5 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Participating Departments
            </h4>
            <span className="text-xs text-slate-400 dark:text-slate-500">({selectedDepartments.length})</span>
          </div>
          <button
            type="button"
            onClick={() => jumpToStep(4)}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
          >
            Edit
          </button>
        </div>
        {selectedDepartments.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {selectedDepartments.map((department) => (
              <span
                key={`review-dept-${department.id}`}
                className="rounded-md bg-slate-100/80 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                {department.label}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 dark:text-slate-500">No departments selected.</p>
        )}
      </div>

      {/* Selected Sports & Categories */}
      <div className="space-y-3 border-t border-slate-100 pt-5 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Sports & Events
            </h4>
            <span className="text-xs text-slate-400 dark:text-slate-500">({selectedSports.length})</span>
          </div>
          <button
            type="button"
            onClick={() => jumpToStep(3)}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
          >
            Edit
          </button>
        </div>
        {selectedSports.length > 0 ? (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {selectedSports.map((sport) => {
              const setting =
                (state.sport_bracket_settings || []).find((row) => Number(row?.sport_id) === Number(sport.id)) ||
                buildNormalizedSportBracketSetting({
                  sport,
                  templates: sportTemplates,
                  fallbackBracketFormat: state.format.default_bracket_format,
                  fallbackSeedingMethod: state.format.default_seeding_method,
                });
              const activeEvents = (setting.events || []).filter((eventCategory) => eventCategory?.is_active !== false);
              return (
                <div key={`review-sport-${sport.id}`} className="space-y-1.5 py-1">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{sport.label} <span className="font-normal text-slate-500">· {activeEvents.length} {activeEvents.length === 1 ? "event" : "events"}</span></p>
                  <div className="space-y-1.5">
                    {activeEvents.map((eventCategory) => (
                      <div
                        key={`review-event-${sport.id}-${eventCategory.event_key}`}
                        className="text-xs text-slate-600 dark:text-slate-300"
                      >
                        <span className="font-semibold text-slate-700 dark:text-slate-200">{eventCategory.event_name}</span>
                        <span className="block text-slate-500 dark:text-slate-400">{describeEvent(eventCategory)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-400 dark:text-slate-500">No sports selected.</p>
        )}
      </div>

      {/* Assigned Venues */}
      <div className="space-y-3 border-t border-slate-100 pt-5 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Assigned Venues
            </h4>
            <span className="text-xs text-slate-400 dark:text-slate-500">({selectedVenues.length})</span>
          </div>
          <button
            type="button"
            onClick={() => jumpToStep(5)}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
          >
            Edit
          </button>
        </div>
        {selectedVenues.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {selectedVenues.map((venue) => (
              <span
                key={`selected-review-venue-${venue.id}`}
                className="rounded-md bg-slate-100/80 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                {venue.venueLabel}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-amber-600 dark:text-amber-400">No venues selected.</p>
        )}
      </div>

      {/* Target Preview Metrics */}
      <div className="space-y-3 border-t border-slate-100 pt-5 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Registration Targets (Auto-Generated)
          </h4>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="py-1">
            <p className="text-xs text-slate-400 dark:text-slate-500">Departments</p>
            <p className="mt-0.5 text-lg font-bold text-slate-900 dark:text-slate-100">{expectedTargetCounts.departmentCount}</p>
          </div>
          <div className="py-1">
            <p className="text-xs text-slate-400 dark:text-slate-500">Sports</p>
            <p className="mt-0.5 text-lg font-bold text-slate-900 dark:text-slate-100">{expectedTargetCounts.sportCount}</p>
          </div>
          <div className="py-1">
            <p className="text-xs text-slate-400 dark:text-slate-500">Team Slots</p>
            <p className="mt-0.5 text-lg font-bold text-slate-900 dark:text-slate-100">{expectedTargetCounts.expectedTeamSlots}</p>
          </div>
          <div className="py-1">
            <p className="text-xs text-slate-400 dark:text-slate-500">Individual/Pair Pools</p>
            <p className="mt-0.5 text-lg font-bold text-slate-900 dark:text-slate-100">{expectedTargetCounts.expectedEntryPools}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    if (state.currentStep === 0) return renderBasicsStep();
    if (state.currentStep === 1) return renderScheduleStep();
    if (state.currentStep === 2) return renderSportsStep();
    if (state.currentStep === 3) return renderFormatStep();
    if (state.currentStep === 4) return renderDepartmentsStep();
    if (state.currentStep === 5) return renderVenuesStep();
    return renderReviewStep();
  };

  const statusToneClass =
    statusMessage.type === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300"
      : statusMessage.type === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300"
        : statusMessage.type === "error"
          ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300"
          : "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300";

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl p-4 md:p-6">
        <LoadingState message="Loading tournament setup wizard..." />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-4xl p-4 md:p-6">
        <DashboardCard>
          <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">Unable to start tournament setup</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{loadError}</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-4 min-h-11 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Retry</button>
        </DashboardCard>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">

      <PageHeaderCard
        title="Create Intramural Event"
        subtitle="Set up tournament basics, sports, venues, and format in one clean flow."
        breadcrumbs=""
        icon={Sparkles}
      />

      <section className="space-y-2 mb-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="mt-1 text-l font-semibold text-slate-900 dark:text-slate-100">{STEP_ITEMS[state.currentStep].title}</p>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">
            Step {state.currentStep + 1} of {STEP_ITEMS.length}
          </p>
        </div>
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${progressPercent}%` }} />
        </div>
      </section>

      {stepError ? (
        <section className="w-full rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
          {stepError}
        </section>
      ) : null}

      <section className="">
        <main>
          <DashboardCard className="border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{STEP_ITEMS[state.currentStep].title}</h2>
            {/* <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Complete this step before moving forward.</p> */}
            <div className="mt-5">{renderCurrentStep()}</div>
          </DashboardCard>
        </main>

        {/* <aside className="space-y-3">
            <DashboardCard className="border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Setup Summary</h4>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-700 dark:bg-slate-800/70">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Departments</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{selectedDepartmentIds.length}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-700 dark:bg-slate-800/70">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Sports</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{selectedSports.length}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-700 dark:bg-slate-800/70">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Venues</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{selectedVenues.length}</p>
                </div>
              </div>
            </DashboardCard>
            <DashboardCard className="border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Planning Notes</h4>
              <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <p>Registration targets are generated automatically after creation.</p>
                <p>Only the venues selected here are available to the scheduler.</p>
                {hasPreviousRankingRequirement(state) ? (
                  <p className="font-semibold text-amber-700 dark:text-amber-300">
                    Previous-ranking seeding is enabled, so this setup needs a previous tournament link.
                  </p>
                ) : null}
              </div>
            </DashboardCard>
          </aside> */}
      </section>

      {statusMessage.text ? (
        <section className={`rounded-xl border px-4 py-3 text-sm ${statusToneClass}`}>{statusMessage.text}</section>
      ) : null}

      <div className="w-full">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleBack}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <ChevronLeft size={14} />
            Back
          </button>

          <div className="flex flex-wrap gap-2">
            {/*  */}
            {state.currentStep < STEP_ITEMS.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={isSubmitting || (state.currentStep === 5 && selectedVenueIds.length === 0)}
                className="inline-flex items-center gap-1 rounded-lg border border-blue-400 bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                Next
                <ChevronRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCreateTournament}
                disabled={isSubmitting || selectedVenueIds.length === 0}
                className="rounded-lg border border-emerald-400 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {isSubmitting ? "Creating..." : "Create Intramural Event"}
              </button>
            )}
          </div>
        </div>
      </div>
      {/* Creation Loading & Success Modal */}
      {creationModal.isOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md transition-all duration-300"
            >
              <div className="relative w-full max-w-sm rounded-2xl border border-slate-200/80 bg-white p-7 text-center shadow-2xl transition-all duration-300 dark:border-slate-800 dark:bg-slate-900">
                {creationModal.status === "loading" && (
                  <div className="space-y-4">
                    <div className="relative mx-auto flex h-16 w-16 items-center justify-center">
                      <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
                      <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                        <Loader2 className="h-8 w-8 animate-spin" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {creationModal.title}
                      </h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                        {creationModal.message}
                      </p>
                    </div>
                    <div className="mx-auto mt-4 h-1.5 w-full max-w-[200px] overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-blue-600 to-indigo-500" />
                    </div>
                  </div>
                )}

                {creationModal.status === "success" && (
                  <div className="space-y-4">
                    <div className="relative mx-auto flex h-16 w-16 items-center justify-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                        <CheckCircle2 className="h-9 w-9 animate-bounce" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {creationModal.title}
                      </h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                        {creationModal.message}
                      </p>
                    </div>
                  </div>
                )}

                {creationModal.status === "error" && (
                  <div className="space-y-4">
                    <div className="relative mx-auto flex h-16 w-16 items-center justify-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
                        <AlertCircle className="h-8 w-8" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {creationModal.title}
                      </h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-rose-600 dark:text-rose-400">
                        {creationModal.message}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setCreationModal({ isOpen: false, status: "loading", title: "", message: "" })
                      }
                      className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            </div>,
            document.body
          )
        : null}
      {typeof document !== "undefined" ? renderEventDrawer() : null}
    </div>
  );
};

export default TournamentCreateWizard;
