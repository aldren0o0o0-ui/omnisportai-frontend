import { useEffect, useMemo, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { ClipboardList, Settings2, ShieldCheck, Trophy } from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { getSportDisplayName } from "../../utils/tournamentEventCategories";
import {
  createSport,
  deleteSport,
  getSportById,
  getSportTemplates,
  getSports,
  removeSportImage,
  restoreSport,
  updateSport,
  uploadSportImage,
} from "../../services/sportService";
import AppModal from "../../components/common/AppModal";
import CollapsibleFilterPanel from "../../components/common/CollapsibleFilterPanel";
import PageHeaderCard from "../../components/common/PageHeaderCard";
import Breadcrumbs from "../../components/common/Breadcrumbs";
import { SportIcon } from "../../components/common/IdentityImage";
import RuleGovernancePage from "../shared/RuleGovernancePage";
import InstitutionalSportRulesPanel from "../shared/InstitutionalSportRulesPanel";
import GlobalSportTemplatePanel from "../../components/sports/GlobalSportTemplatePanel";

const TEMPLATE_STEPS = [
  "Choose Sport",
  "Review Sport",
  "Match Timing",
  "Confirm",
];

const DEFAULT_SCHEDULING = {
  estimated_match_duration_minutes: 60,
  setup_buffer_minutes: 5,
  cleanup_buffer_minutes: 5,
};

const THEMED_FIELD_CLASS = "mt-1 min-h-11 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-main)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 disabled:cursor-not-allowed disabled:bg-[var(--surface-muted)] disabled:text-[var(--text-soft)] motion-reduce:transition-none";

const ActionPopover = ({
  label,
  buttonClassName,
  panelClassName,
  children,
}) => {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event) => {
      if (!popoverRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div className="relative inline-flex" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={buttonClassName}
      >
        {label}
      </button>
      {open ? (
        <div className={panelClassName}>
          {typeof children === "function" ? children(() => setOpen(false)) : children}
        </div>
      ) : null}
    </div>
  );
};

const formatApiErrorDetail = (rawError, fallbackMessage) => {
  const detail = rawError?.response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) {
    return detail.trim();
  }
  if (Array.isArray(detail) && detail.length > 0) {
    const formatted = detail
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const path = Array.isArray(entry.loc)
          ? entry.loc
            .filter((segment) => String(segment) !== "body")
            .map((segment) => String(segment))
            .join(".")
          : "";
        const message = typeof entry.msg === "string" ? entry.msg : "";
        if (!message) return null;
        return path ? `${path}: ${message}` : message;
      })
      .filter(Boolean);
    if (formatted.length > 0) return formatted.join(" | ");
  }
  if (typeof rawError?.message === "string" && rawError.message.trim()) {
    return rawError.message.trim();
  }
  return fallbackMessage;
};

const normalizeStatus = (value) => {
  const key = String(value || "active").trim().toLowerCase();
  if (key === "inactive") return "archived";
  if (key !== "active" && key !== "archived") return "active";
  return key;
};

const isArchivedStatus = (value) => normalizeStatus(value) === "archived";

const formatStatusLabel = (value) => (isArchivedStatus(value) ? "Archived" : "Active");

const toOptionalInt = (value, fallback = null) => {
  if (value === "" || value === null || value === undefined) return fallback;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isInteger(parsed) ? parsed : fallback;
};

const participantLabelFromKey = (value) => {
  const key = String(value || "TEAM").trim().toUpperCase();
  if (key === "INDIVIDUAL" || key === "SINGLE" || key === "SOLO") return "Individual";
  if (key === "DUO" || key === "DOUBLE" || key === "PAIR") return "Pair";
  if (key === "MIXED_EVENTS") return "Individual & Pair";
  return "Team";
};

const participantLabelForSport = (sport) => {
  const shapes = Array.isArray(sport?.participant_shapes)
    ? sport.participant_shapes.map((shape) => String(shape).toUpperCase())
    : [];
  if (shapes.includes("SOLO") && shapes.includes("DUO")) return "Individual & Pair";
  if (sport?.display_participant_type) return sport.display_participant_type;
  return participantLabelFromKey(sport?.configuration?.participation_type || "team");
};

const playerSetupForSport = (sport) => {
  const shapes = new Set((sport?.participant_shapes || []).map((shape) => String(shape).toUpperCase()));
  if (shapes.has("SOLO") && shapes.has("DUO")) return "1–2 athletes per entry";
  if (shapes.has("SOLO")) return "1 athlete per entry";
  if (shapes.has("DUO")) return "2 athletes per entry";
  if (sport?.resolved_team_size?.exact) return `${sport.resolved_team_size.exact} players`;
  if (sport?.resolved_team_size?.min) return `${sport.resolved_team_size.min}–${sport.resolved_team_size.max} players`;
  return "Event-based";
};

const formatTemplateRosterSummary = (template) => {
  if (!template || typeof template !== "object") return "Roster defaults unavailable";
  const type = String(template.participant_type || "TEAM").trim().toUpperCase();
  if (type === "SOLO") return "1 player per entry";
  if (type === "DUO") return "2 players per entry";
  const minPlayers = toOptionalInt(template.min_players, null);
  const maxPlayers = toOptionalInt(template.max_players, null);
  if (minPlayers && maxPlayers) {
    if (minPlayers === maxPlayers) return `${minPlayers} players required`;
    return `${minPlayers}-${maxPlayers} player roster`;
  }
  return "Roster defaults unavailable";
};

const formatTemplateEventSummary = (template) => {
  const events = ensureArray(template?.default_event_categories).filter(
    (event) => event && typeof event === "object"
  );
  if (events.length === 0) return "No default event categories";
  if (events.length === 1) {
    return events[0].event_name || "1 default event category";
  }
  return `${events.filter((event) => event.is_default_enabled !== false).length} default event categories`;
};

const formatMatchType = (value) => {
  const key = String(value || "-").trim().toUpperCase();
  if (!key || key === "-") return "-";
  const mapped = {
    SCORE: "Score-Based",
    SETS: "Set-Based",
    RESULT: "Result-Only",
    TIME_BASED: "Time-Based",
    ROUND_BASED: "Round-Based",
    TURN_BASED: "Turn-Based",
    POINTS: "Point-Based",
    POINT_GAME: "Point Game",
    SET_MATCH: "Set Match",
  };
  if (mapped[key]) return mapped[key];
  return key
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const formatProfile = (value) => {
  const key = String(value || "").trim().toUpperCase();
  if (!key) return "-";
  const mapped = {
    POINT_GAME: "Point Game",
    SET_MATCH: "Set Match",
    ROUND_BASED: "Round-Based",
    TURN_BASED: "Turn-Based",
    TIME_BASED: "Time-Based",
  };
  if (mapped[key]) return mapped[key];
  return key
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const ensureArray = (value) => (Array.isArray(value) ? value : []);

const getTemplateTone = (participantType) => {
  const key = String(participantType || "TEAM").toUpperCase();
  if (key === "INDIVIDUAL" || key === "SOLO") return "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200";
  if (key === "DUO") return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200";
  if (key === "MIXED_EVENTS") return "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-200";
  return "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200";
};

const getSchedulingFromSport = (sport) => {
  const matchConfig = sport?.configuration?.match_config || {};
  const estimated = toOptionalInt(
    matchConfig.estimated_match_duration_minutes,
    DEFAULT_SCHEDULING.estimated_match_duration_minutes
  );
  const setup = Math.max(
    0,
    toOptionalInt(matchConfig.setup_buffer_minutes, DEFAULT_SCHEDULING.setup_buffer_minutes) || 0
  );
  const cleanup = Math.max(
    0,
    toOptionalInt(matchConfig.cleanup_buffer_minutes, DEFAULT_SCHEDULING.cleanup_buffer_minutes) || 0
  );
  return {
    estimated_match_duration_minutes: Math.max(1, estimated || DEFAULT_SCHEDULING.estimated_match_duration_minutes),
    setup_buffer_minutes: setup,
    cleanup_buffer_minutes: cleanup,
  };
};

const getTotalSlotDuration = (scheduling) => {
  const estimated = Math.max(1, toOptionalInt(scheduling?.estimated_match_duration_minutes, 0) || 0);
  const setup = Math.max(0, toOptionalInt(scheduling?.setup_buffer_minutes, 0) || 0);
  const cleanup = Math.max(0, toOptionalInt(scheduling?.cleanup_buffer_minutes, 0) || 0);
  return estimated + setup + cleanup;
};

const buildConfigForUpdate = (sport, scheduling) => {
  const existing = sport?.configuration;
  if (!existing || typeof existing !== "object") return null;

  const matchConfig = existing.match_config && typeof existing.match_config === "object" ? existing.match_config : {};

  return {
    ...existing,
    match_config: {
      ...matchConfig,
      estimated_match_duration_minutes:
        Math.max(
          1,
          toOptionalInt(
            scheduling.estimated_match_duration_minutes,
            DEFAULT_SCHEDULING.estimated_match_duration_minutes
          ) || DEFAULT_SCHEDULING.estimated_match_duration_minutes
        ),
      setup_buffer_minutes: Math.max(
        0,
        toOptionalInt(scheduling.setup_buffer_minutes, DEFAULT_SCHEDULING.setup_buffer_minutes) || 0
      ),
      cleanup_buffer_minutes: Math.max(
        0,
        toOptionalInt(scheduling.cleanup_buffer_minutes, DEFAULT_SCHEDULING.cleanup_buffer_minutes) || 0
      ),
    },
  };
};

const buildTemplateDraft = (template) => {
  const defaults = template?.defaults || {};
  return {
    template_id: template?.template_id || "",
    name: template?.name || "",
    category: template?.default_category || "Team Sport",
    description: template?.description || "",
    status: "active",
    participant_type: template?.participant_type || "TEAM",
    display_participant_type: template?.display_participant_type || participantLabelFromKey(template?.participant_type),
    sport_profile: template?.sport_profile || "",
    match_type: template?.match_type || "",
    min_players: template?.min_players ?? null,
    max_players: template?.max_players ?? null,
    players_per_side: template?.players_per_side ?? null,
    players_per_entry: template?.players_per_entry ?? null,
    default_max_entries_per_department: template?.default_max_entries_per_department ?? null,
    default_minimum_total_entries_for_bracket:
      template?.default_minimum_total_entries_for_bracket ?? null,
    default_event_categories: ensureArray(template?.default_event_categories),
    scheduling: {
      estimated_match_duration_minutes:
        toOptionalInt(defaults.estimated_match_duration_minutes, DEFAULT_SCHEDULING.estimated_match_duration_minutes) ||
        DEFAULT_SCHEDULING.estimated_match_duration_minutes,
      setup_buffer_minutes: Math.max(
        0,
        toOptionalInt(defaults.setup_buffer_minutes, DEFAULT_SCHEDULING.setup_buffer_minutes) || 0
      ),
      cleanup_buffer_minutes: Math.max(
        0,
        toOptionalInt(defaults.cleanup_buffer_minutes, DEFAULT_SCHEDULING.cleanup_buffer_minutes) || 0
      ),
    },
  };
};

const ModalShell = ({ children, onClose, busy = false }) => createPortal((
  <div
    className="fixed inset-0 z-[calc(var(--z-overlay)+10)] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm"
    onClick={() => {
      if (!busy) onClose();
    }}
  >
    <div
      className="relative max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--text-main)] shadow-[var(--shadow-lg)]"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className="absolute right-3 top-3 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--text-main)] hover:bg-[var(--surface-muted)] disabled:opacity-50"
        onClick={onClose}
        disabled={busy}
      >
        Close
      </button>
      <div className="p-4 md:p-6">{children}</div>
    </div>
  </div>
), document.body);

const Sports = ({
  readOnly = false,
  departmentId = null,
  directoryTitle = "Sports Directory",
  directorySubtitle = "Template-first sport management with clear scheduling profiles.",
  introContent = null,
}) => {
  const { user, isSportsCoordinator } = useAuth();
  const location = useLocation();

  const [sports, setSports] = useState([]);
  const [templates, setTemplates] = useState([]);

  const showMineOnly = false;
  const showArchived = false;

  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [isTemplateWizardOpen, setIsTemplateWizardOpen] = useState(false);
  const [templateStep, setTemplateStep] = useState(1);
  const [templateBusy, setTemplateBusy] = useState(false);
  const [templateError, setTemplateError] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templateDraft, setTemplateDraft] = useState(null);

  const [editingSport, setEditingSport] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState("");
  const [ruleSport, setRuleSport] = useState(null);
  const [templateSport, setTemplateSport] = useState(null);
  const [templateDefaultsDirty, setTemplateDefaultsDirty] = useState(false);

  const [imageActionBySportId, setImageActionBySportId] = useState({});
  const [statusModal, setStatusModal] = useState({
    open: false,
    sportId: null,
    action: "archive",
    error: "",
    busy: false,
  });

  const rolePrefix = useMemo(() => {
    const segment = location.pathname.split("/").filter(Boolean)[0];
    if (
      segment === "coordinator"
      || segment === "department"
      || segment === "viewer"
      || segment === "coach"
      || segment === "sport-facilitator"
    ) {
      return segment;
    }
    return "coordinator";
  }, [location.pathname]);
  const isCoordinatorView = rolePrefix === "coordinator" && !readOnly && departmentId == null;

  const loadSports = async () => {
    const data = await getSports(departmentId, { includeArchived: showArchived });
    setSports(Array.isArray(data) ? data : []);
  };

  const loadTemplates = async () => {
    if (readOnly) {
      setTemplates([]);
      return;
    }
    const rows = await getSportTemplates();
    setTemplates(Array.isArray(rows) ? rows : []);
  };

  const refreshAll = async () => {
    setError("");
    await Promise.all([loadSports(), loadTemplates()]);
  };

  useEffect(() => {
    setLoading(true);
    refreshAll()
      .catch((rawError) => {
        setError(formatApiErrorDetail(rawError, "Failed to load sports module data."));
      })
      .finally(() => {
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departmentId, readOnly, showArchived]);

  const visibleSports = useMemo(() => {
    const filteredByStatus = sports.filter((sport) => {
      const archived = isArchivedStatus(sport.status);
      return showArchived ? archived : !archived;
    });

    if (!showMineOnly || !user?.id) return filteredByStatus;
    return filteredByStatus.filter((sport) => sport.created_by === user.id);
  }, [showArchived, showMineOnly, sports, user]);

  const selectedTemplate = useMemo(
    () => templates.find((row) => row.template_id === selectedTemplateId) || null,
    [templates, selectedTemplateId]
  );

  const openTemplateWizard = () => {
    setTemplateError("");
    setTemplateStep(1);
    setSelectedTemplateId("");
    setTemplateDraft(null);
    setIsTemplateWizardOpen(true);
  };

  const closeTemplateWizard = () => {
    if (templateBusy) return;
    setIsTemplateWizardOpen(false);
    setTemplateError("");
    setTemplateStep(1);
    setSelectedTemplateId("");
    setTemplateDraft(null);
  };

  const patchTemplateDraft = (partial) => {
    setTemplateDraft((prev) => {
      if (!prev) return prev;
      return { ...prev, ...partial };
    });
  };

  const patchTemplateScheduling = (field, value) => {
    setTemplateDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        scheduling: {
          ...prev.scheduling,
          [field]: value,
        },
      };
    });
  };

  const validateScheduling = (scheduling) => {
    const estimated = toOptionalInt(scheduling.estimated_match_duration_minutes, null);
    const setup = toOptionalInt(scheduling.setup_buffer_minutes, null);
    const cleanup = toOptionalInt(scheduling.cleanup_buffer_minutes, null);

    if (estimated === null || estimated < 1) {
      return "Estimated match duration must be at least 1 minute.";
    }
    if (setup === null || setup < 0) {
      return "Setup buffer must be 0 or greater.";
    }
    if (cleanup === null || cleanup < 0) {
      return "Cleanup buffer must be 0 or greater.";
    }
    return null;
  };

  const friendlyTemplateError = (rawError, fallback) => {
    const detail = formatApiErrorDetail(rawError, fallback);
    if (String(detail).toLowerCase().includes("not registered in sporttemplateregistry")) {
      return "This sport is not available as a system template. Choose a registered template or use Advanced setup.";
    }
    return detail;
  };

  const applySchedulingToSport = async (sportRow, scheduling) => {
    const configPayload = buildConfigForUpdate(sportRow, scheduling);
    if (!configPayload) return;
    await updateSport(sportRow.id, {
      configuration: configPayload,
    });
  };

  const handleCreateFromTemplate = async () => {
    if (!selectedTemplate || !templateDraft) {
      setTemplateError("Choose a template first.");
      return;
    }

    const scheduleError = validateScheduling(templateDraft.scheduling);
    if (scheduleError) {
      setTemplateError(scheduleError);
      setTemplateStep(3);
      return;
    }

    setTemplateBusy(true);
    setTemplateError("");
    setError("");
    setNotice("");
    try {
      const createPayload = {
        name: templateDraft.name,
        category: String(templateDraft.category || "").trim() || "Team Sport",
        description: String(templateDraft.description || "").trim() || null,
        status: normalizeStatus(templateDraft.status),
      };
      const response = await createSport(createPayload);
      const createdSport = response?.sport || { id: response?.id };

      if (createdSport?.id) {
        const latest = await getSportById(createdSport.id);
        await applySchedulingToSport(latest, templateDraft.scheduling);
      }

      await refreshAll();
      closeTemplateWizard();
      setNotice(`Sport created from ${templateDraft.name} template.`);
    } catch (rawError) {
      setTemplateError(friendlyTemplateError(rawError, "Failed to create sport from template."));
    } finally {
      setTemplateBusy(false);
    }
  };

  const handleTemplateNext = () => {
    if (templateStep === 1) {
      if (!selectedTemplate) {
        setTemplateError("Select a template to continue.");
        return;
      }
      const nextDraft = buildTemplateDraft(selectedTemplate);
      setTemplateDraft(nextDraft);
      setTemplateError("");
      setTemplateStep(2);
      return;
    }

    if (templateStep === 2) {
      if (!templateDraft?.category || !String(templateDraft.category).trim()) {
        setTemplateError("Category is required.");
        return;
      }
      setTemplateError("");
      setTemplateStep(3);
      return;
    }

    if (templateStep === 3) {
      const scheduleError = validateScheduling(templateDraft?.scheduling || {});
      if (scheduleError) {
        setTemplateError(scheduleError);
        return;
      }
      setTemplateError("");
      setTemplateStep(4);
    }
  };

  const handleTemplateBack = () => {
    if (templateBusy) return;
    setTemplateError("");
    setTemplateStep((prev) => Math.max(1, prev - 1));
  };

  const handleArchive = async (sportId) => {
    setError("");
    setNotice("");
    try {
      await deleteSport(sportId);
      setStatusModal({ open: false, sportId: null, action: "archive", error: "", busy: false });
      await refreshAll();
      setNotice("Sport archived successfully.");
    } catch (rawError) {
      const message = formatApiErrorDetail(rawError, "Failed to archive sport.");
      setError(message);
      setStatusModal((prev) => ({ ...prev, error: message }));
    }
  };

  const handleRestore = async (sportId) => {
    setError("");
    setNotice("");
    try {
      await restoreSport(sportId);
      setStatusModal({ open: false, sportId: null, action: "archive", error: "", busy: false });
      await refreshAll();
      setNotice("Sport restored successfully.");
    } catch (rawError) {
      const message = formatApiErrorDetail(rawError, "Failed to restore sport.");
      setError(message);
      setStatusModal((prev) => ({ ...prev, error: message }));
    }
  };

  const openStatusModal = (sportId, action) => {
    setStatusModal({
      open: true,
      sportId: Number(sportId || 0) || null,
      action,
      error: "",
      busy: false,
    });
  };

  const confirmStatusModal = async () => {
    if (!statusModal.sportId || statusModal.busy) return;
    setStatusModal((prev) => ({ ...prev, busy: true, error: "" }));
    if (statusModal.action === "restore") {
      await handleRestore(statusModal.sportId);
    } else {
      await handleArchive(statusModal.sportId);
    }
    setStatusModal((prev) => ({ ...prev, busy: false }));
  };

  const setSportImageAction = (sportId, loadingState, message = "") => {
    setImageActionBySportId((prev) => ({
      ...prev,
      [sportId]: { loading: loadingState, message },
    }));
  };

  const handleUploadSportImage = async (sportId, file) => {
    if (!file || !sportId) return;
    setSportImageAction(sportId, true, "");
    try {
      await uploadSportImage(sportId, file);
      await loadSports();
      setNotice("Sport image updated.");
      setError("");
    } catch (rawError) {
      const message = formatApiErrorDetail(rawError, "Failed to upload sport image.");
      setError(message);
      setNotice("");
      setSportImageAction(sportId, false, message);
      return;
    }
    setSportImageAction(sportId, false, "");
  };

  const handleRemoveSportImage = async (sportId) => {
    if (!sportId) return;
    setSportImageAction(sportId, true, "");
    try {
      await removeSportImage(sportId);
      await loadSports();
      setNotice("Sport image removed.");
      setError("");
    } catch (rawError) {
      const message = formatApiErrorDetail(rawError, "Failed to remove sport image.");
      setError(message);
      setNotice("");
      setSportImageAction(sportId, false, message);
      return;
    }
    setSportImageAction(sportId, false, "");
  };

  const openEditModal = async (sportId) => {
    setEditBusy(true);
    setEditError("");
    setError("");
    try {
      const detail = await getSportById(sportId);
      const scheduling = getSchedulingFromSport(detail);
      const eventConfig = detail?.configuration?.event_config || {};
      setEditingSport(detail);
      setEditDraft({
        id: detail.id,
        name: detail.name || detail.sport_name || "",
        category: detail.category || "",
        description: detail.description || "",
        status: normalizeStatus(detail.status),
        scheduling,
        templateInfo: {
          sport_profile: eventConfig?.sport_profile || "",
          match_type: eventConfig?.match_type || detail?.configuration?.match_config?.match_type || "",
          participant_type: detail?.configuration?.participation_type || "team",
          template_sport_id: eventConfig?.sport_id || "",
        },
        eventConfig,
        configuration: detail?.configuration || {},
      });
    } catch (rawError) {
      setEditError(formatApiErrorDetail(rawError, "Failed to load sport details."));
    } finally {
      setEditBusy(false);
    }
  };

  const closeEditModal = () => {
    if (editBusy) return;
    setEditingSport(null);
    setEditDraft(null);
    setEditError("");
  };

  const patchEditDraft = (partial) => {
    setEditDraft((prev) => ({ ...prev, ...partial }));
  };

  const patchEditScheduling = (field, value) => {
    setEditDraft((prev) => ({
      ...prev,
      scheduling: {
        ...prev.scheduling,
        [field]: value,
      },
    }));
  };

  const handleSaveEdit = async () => {
    if (!editDraft || !editingSport) return;

    const category = String(editDraft.category || "").trim();
    if (!category) {
      setEditError("Category is required.");
      return;
    }

    const scheduleError = validateScheduling(editDraft.scheduling);
    if (scheduleError) {
      setEditError(scheduleError);
      return;
    }

    const configPayload = buildConfigForUpdate(editingSport, editDraft.scheduling);

    setEditBusy(true);
    setEditError("");
    setError("");
    setNotice("");
    try {
      await updateSport(editDraft.id, {
        category,
        description: String(editDraft.description || "").trim() || null,
        configuration: configPayload,
      });

      await refreshAll();
      closeEditModal();
      setNotice("Sport updated successfully.");
    } catch (rawError) {
      setEditError(formatApiErrorDetail(rawError, "Failed to update sport."));
    } finally {
      setEditBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading sports directory...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {
        <PageHeaderCard
          title={directoryTitle}
          subtitle={directorySubtitle}
          breadcrumbs={<Breadcrumbs trail={[{ label: "Intramural" }, { label: "Sports" }]} />}
          icon={Trophy}
          action={isCoordinatorView ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={openTemplateWizard}
                className="rounded-sm mr-10 bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500"
              >
                Add Supported Sport
              </button>
            </div>
          ) : null}
        />
      }

      {/* {isCoordinatorView && (
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-blue-500/10 p-2 text-blue-500 dark:text-blue-300">
                <ClipboardList size={18} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Template-first setup</h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Register sports from approved templates so scoring, widgets, and event behavior stay consistent.
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-500 dark:text-emerald-300">
                <Settings2 size={18} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Scheduling profile control</h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Adjust match duration, setup, and cleanup buffers so bracketing and scheduling use realistic slot lengths.
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-violet-500/10 p-2 text-violet-500 dark:text-violet-300">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Lifecycle management</h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Review active sports, archive unused ones safely, and preserve linked teams, matches, and analytics.
                </p>
              </div>
            </div>
          </div>
        </div>
      )} */}

      {!readOnly && isTemplateWizardOpen && (
        <ModalShell onClose={closeTemplateWizard} busy={templateBusy}>
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-slate-100">Add Supported Sport</h2>
              <p className="text-sm text-slate-400">
                Choose a sport supported by OmniSport AI, review its events, set typical match timing, and confirm.
              </p>
            </div>

            <div className="grid gap-2 md:grid-cols-4">
              {TEMPLATE_STEPS.map((stepLabel, index) => {
                const stepNumber = index + 1;
                const isActive = stepNumber === templateStep;
                const isComplete = stepNumber < templateStep;
                return (
                  <div
                    key={stepLabel}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-wide ${isActive
                      ? "border-blue-500 bg-blue-500/10 text-blue-200"
                      : isComplete
                        ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200"
                        : "border-slate-700 bg-slate-900 text-slate-400"
                      }`}
                  >
                    {stepNumber}. {stepLabel}
                  </div>
                );
              })}
            </div>

            {templateError && (
              <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                {templateError}
              </div>
            )}

            {templateStep === 1 && (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {templates.map((template) => {
                    const isSelected = selectedTemplateId === template.template_id;
                    return (
                      <button
                        key={template.template_id}
                        type="button"
                        onClick={() => {
                          setSelectedTemplateId(template.template_id);
                          setTemplateError("");
                        }}
                        className={`rounded-xl border p-4 text-left transition ${isSelected
                          ? "border-blue-500 bg-blue-500/10"
                          : "border-slate-700 bg-slate-950/40 hover:border-slate-500"
                          }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-semibold text-slate-100">{template.name}</h3>
                          <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${getTemplateTone(template.participant_type)}`}>
                            {participantLabelFromKey(template.participant_type)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-400">{template.default_category || "-"}</p>
                        <p className="mt-2 text-xs text-slate-300">Profile: {formatProfile(template.sport_profile)}</p>
                        <p className="text-xs text-slate-300">Match Type: {formatMatchType(template.match_type)}</p>
                        <p className="mt-2 text-xs text-slate-300">Roster: {formatTemplateRosterSummary(template)}</p>
                        <p className="text-xs text-slate-400">Defaults: {formatTemplateEventSummary(template)}</p>
                        <p className="mt-2 line-clamp-2 text-xs text-slate-400">{template.description || "System template"}</p>
                      </button>
                    );
                  })}
                </div>

                <p className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 text-sm text-blue-100">
                  Choose a sport supported by OmniSport AI. Competition types and scoring capabilities are provided by the system.
                </p>
              </div>
            )}

            {templateStep === 2 && templateDraft && (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-sm border border-slate-700 bg-slate-950/40 p-2">
                  <h3 className="font-semibold text-slate-100">Template Summary</h3>
                  <div className="mt-2 space-y-1 text-sm text-slate-300">
                    <p>Template: {templateDraft.name}</p>
                    <p>Sport profile: {formatProfile(templateDraft.sport_profile)}</p>
                    <p>Match format: {formatMatchType(templateDraft.match_type)}</p>
                    <p>Competition type: {templateDraft.display_participant_type}</p>
                    <p>Roster / entry: {formatTemplateRosterSummary(templateDraft)}</p>
                    <p>Entries per department: {templateDraft.default_max_entries_per_department ?? "-"}</p>
                    <p>Minimum bracket entries: {templateDraft.default_minimum_total_entries_for_bracket ?? "-"}</p>
                    <p>Scoring source: System template</p>
                    <p>Rule profile: Default template behavior</p>
                  </div>
                  <p className="mt-3 text-xs text-slate-400">This sport is created from a registered system template.</p>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-4">
                  <h3 className="font-semibold text-slate-100">Scoring & Rules</h3>
                  <p className="mt-2 text-sm text-slate-300">
                    Scoring events, controls, and scoreboard behavior are managed by the selected system template.
                  </p>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-300">
                    <li>Scoring events are preconfigured for this sport.</li>
                    <li>Match controls and widgets follow template defaults.</li>
                    <li>You can adjust scheduling profile in the next step.</li>
                  </ul>
                  {templateDraft.default_event_categories.length > 0 && (
                    <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900/60 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Default Event Categories
                      </p>
                      <div className="mt-2 space-y-2 text-sm text-slate-300">
                        {templateDraft.default_event_categories.map((eventCategory) => (
                          <div
                            key={eventCategory.event_key || eventCategory.event_name}
                            className="rounded border border-slate-800 bg-slate-950/50 px-3 py-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-slate-100">
                                {eventCategory.event_name || "Event Category"}
                              </span>
                              <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${getTemplateTone(eventCategory.participant_shape)}`}>
                                {participantLabelFromKey(eventCategory.participant_shape)}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-slate-400">
                              {eventCategory.players_per_entry
                                ? `${eventCategory.players_per_entry} player${Number(eventCategory.players_per_entry) === 1 ? "" : "s"} per entry`
                                : "Roster-based team entry"}
                              {" · "}
                              Entries/Dept: {eventCategory.max_entries_per_department ?? "-"}
                              {" · "}
                              Min bracket: {eventCategory.minimum_total_entries_for_bracket ?? "-"}
                              {eventCategory.is_default_enabled === false ? " · Optional by default" : ""}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-4 space-y-3 md:col-span-2">
                  <h3 className="font-semibold text-slate-100">Basic Setup</h3>
                  <div>
                    <label className="text-xs uppercase tracking-wide text-slate-400">Sport Name</label>
                    <input
                      className="mt-1 w-full rounded border border-slate-700 bg-slate-800 px-2 py-2 text-sm text-slate-300"
                      value={templateDraft.name}
                      disabled
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wide text-slate-400">Category</label>
                    <input
                      className="mt-1 w-full rounded border border-slate-700 bg-slate-800 px-2 py-2 text-sm text-slate-100"
                      value={templateDraft.category}
                      onChange={(event) => patchTemplateDraft({ category: event.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wide text-slate-400">Description</label>
                    <textarea
                      className="mt-1 min-h-[84px] w-full rounded border border-slate-700 bg-slate-800 px-2 py-2 text-sm text-slate-100"
                      value={templateDraft.description}
                      onChange={(event) => patchTemplateDraft({ description: event.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            {templateStep === 3 && templateDraft && (
              <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-4 space-y-3">
                <h3 className="font-semibold text-slate-100">Match Timing Defaults</h3>
                <p className="text-xs text-slate-400">
                  This determines how much time the scheduler reserves for each match of this sport.
                </p>
                <p className="text-xs text-slate-500">
                  Example: 90 min game + 10 min setup + 5 min cleanup = 105 min reserved slot.
                </p>
                <div className="grid gap-3 md:grid-cols-3">
                  <div>
                    <label className="text-xs uppercase tracking-wide text-slate-400">Estimated Match Duration (min)</label>
                    <input
                      type="number"
                      min="1"
                      className="mt-1 w-full rounded border border-slate-700 bg-slate-800 px-2 py-2 text-sm text-slate-100"
                      value={templateDraft.scheduling.estimated_match_duration_minutes}
                      onChange={(event) => patchTemplateScheduling("estimated_match_duration_minutes", event.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wide text-slate-400">Setup Buffer (min)</label>
                    <input
                      type="number"
                      min="0"
                      className="mt-1 w-full rounded border border-slate-700 bg-slate-800 px-2 py-2 text-sm text-slate-100"
                      value={templateDraft.scheduling.setup_buffer_minutes}
                      onChange={(event) => patchTemplateScheduling("setup_buffer_minutes", event.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wide text-slate-400">Cleanup Buffer (min)</label>
                    <input
                      type="number"
                      min="0"
                      className="mt-1 w-full rounded border border-slate-700 bg-slate-800 px-2 py-2 text-sm text-slate-100"
                      value={templateDraft.scheduling.cleanup_buffer_minutes}
                      onChange={(event) => patchTemplateScheduling("cleanup_buffer_minutes", event.target.value)}
                    />
                  </div>
                </div>
                <div className="rounded border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-sm text-blue-200">
                  Total slot duration: {getTotalSlotDuration(templateDraft.scheduling)} minutes
                </div>
              </div>
            )}

            {templateStep === 4 && templateDraft && (
              <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-950/40 p-4 text-sm text-slate-300">
                <h3 className="font-semibold text-slate-100">Confirm Create</h3>
                <p>Selected template: {templateDraft.name}</p>
                <p>Category: {templateDraft.category || "Team Sport"}</p>
                <p>Sport profile: {formatProfile(templateDraft.sport_profile)}</p>
                <p>Competition type: {templateDraft.display_participant_type}</p>
                <p>Roster / entry: {formatTemplateRosterSummary(templateDraft)}</p>
                <p>Default event categories: {formatTemplateEventSummary(templateDraft)}</p>
                <p>Match format: {formatMatchType(templateDraft.match_type)}</p>
                <p>Total slot duration: {getTotalSlotDuration(templateDraft.scheduling)} min</p>
                <p>Scoring summary: System template scoring and controls will be applied automatically.</p>
                <p>Rule summary: Default template behavior.</p>
              </div>
            )}

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                className="rounded bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-50"
                onClick={handleTemplateBack}
                disabled={templateStep <= 1 || templateBusy}
              >
                Back
              </button>

              <div className="flex gap-2">
                {templateStep < TEMPLATE_STEPS.length && (
                  <button
                    type="button"
                    className="rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                    onClick={handleTemplateNext}
                    disabled={templateBusy}
                  >
                    Next
                  </button>
                )}

                {templateStep === TEMPLATE_STEPS.length && (
                  <button
                    type="button"
                    className="rounded bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                    onClick={handleCreateFromTemplate}
                    disabled={templateBusy}
                  >
                    {templateBusy ? "Adding..." : "Add Sport"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </ModalShell>
      )}

      {!readOnly && editingSport && editDraft && (
        <ModalShell onClose={closeEditModal} busy={editBusy}>
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-[var(--text-main)]">Edit Sport</h2>
              <p className="text-sm text-[var(--text-muted)]">Update basic information and typical match timing.</p>
            </div>

            {editError && (
              <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                {editError}
              </div>
            )}

            <div className="space-y-3 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4">
              <h3 className="font-semibold text-[var(--text-main)]">Basic Information</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="md:col-span-2">
                  <p className="text-xs uppercase tracking-wide text-[var(--text-soft)]">Sport</p>
                  <p className="mt-1 text-base font-semibold text-[var(--text-main)]">{editDraft.name}</p>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wide text-[var(--text-soft)]">Category</label>
                  <input
                    className={THEMED_FIELD_CLASS}
                    value={editDraft.category}
                    onChange={(event) => patchEditDraft({ category: event.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs uppercase tracking-wide text-[var(--text-soft)]">Description</label>
                  <textarea
                    className={`${THEMED_FIELD_CLASS} min-h-[88px]`}
                    value={editDraft.description}
                    onChange={(event) => patchEditDraft({ description: event.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4">
              <h3 className="font-semibold text-[var(--text-main)]">Match Timing Defaults</h3>
              <p className="text-xs text-[var(--text-muted)]">
                These defaults are used the next time schedules are generated or regenerated. Existing scheduled matches are not automatically moved.
              </p>
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <label className="text-xs uppercase tracking-wide text-[var(--text-soft)]">Expected Playing Time (min)</label>
                  <input
                    type="number"
                    min="1"
                    className={THEMED_FIELD_CLASS}
                    value={editDraft.scheduling.estimated_match_duration_minutes}
                    onChange={(event) => patchEditScheduling("estimated_match_duration_minutes", event.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wide text-[var(--text-soft)]">Preparation Time (min)</label>
                  <input
                    type="number"
                    min="0"
                    className={THEMED_FIELD_CLASS}
                    value={editDraft.scheduling.setup_buffer_minutes}
                    onChange={(event) => patchEditScheduling("setup_buffer_minutes", event.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wide text-[var(--text-soft)]">Changeover Time (min)</label>
                  <input
                    type="number"
                    min="0"
                    className={THEMED_FIELD_CLASS}
                    value={editDraft.scheduling.cleanup_buffer_minutes}
                    onChange={(event) => patchEditScheduling("cleanup_buffer_minutes", event.target.value)}
                  />
                </div>
              </div>
              <div className="rounded-lg border border-[var(--primary)]/30 bg-[var(--primary-soft)] px-3 py-2 text-sm font-semibold text-[var(--primary)]">
                Total time reserved: {getTotalSlotDuration(editDraft.scheduling)} minutes
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3 py-2 text-sm font-semibold text-[var(--text-main)] hover:bg-[var(--surface-muted)]"
                onClick={closeEditModal}
                disabled={editBusy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                onClick={handleSaveEdit}
                disabled={editBusy}
              >
                {editBusy ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {introContent}

      <div className="">
        <div className="flex flex-wrap items-center justify-between gap-3">

          {!readOnly && !isCoordinatorView && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={openTemplateWizard}
                className="rounded-sm mr-10 bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500"
              >
                Add Supported Sport
              </button>
            </div>
          )}
        </div>

        {/* <CollapsibleFilterPanel
          title="Sport Filters"
          activeCount={activeSportsFilterCount}
          summaryText={
            activeSportsFilterCount > 0
              ? `Filtered by: ${sportsFilterSummary.join(" · ")}`
              : "No active filters"
          }
          onClear={clearSportsFilters}
          compact
        >
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowArchived((value) => !value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              {showArchived ? "Show Active" : "Show Archived"}
            </button>
            <button
              type="button"
              onClick={() => setShowMineOnly((value) => !value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              {showMineOnly ? "Show All" : "Show Mine"}
            </button>
          </div>
        </CollapsibleFilterPanel> */}

        {(notice || error) && (
          <div
            className={`rounded-lg border px-3 py-2 text-sm ${error
              ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300"
              : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300"
              }`}
          >
            {error || notice}
          </div>
        )}

        {visibleSports.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-6 text-center dark:border-slate-700 dark:bg-slate-950/30">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {showArchived ? "No archived sports found." : "No active sports found."}
            </p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {isCoordinatorView
                ? "As Sports Coordinator, you can create a sport, review its template-backed rules, tune scheduling buffers, and open its teams view once departments start using it."
                : "Sports will appear here once they are configured for your current scope."}
            </p>
            {isCoordinatorView && !showArchived && (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={openTemplateWizard}
                  className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                >
                  Add First Supported Sport
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-hidden mr-5 mt-7 ml-1 rounded-sm border border-slate-200 bg-white dark:border-slate-800 dark:bg-[var(--surface)]">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left ">
                <thead>
                  <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 dark:bg-[var(--surface-soft)] dark:text-[var(--text-soft)]">
                    <th className="px-4 py-3 font-semibold">Sport</th>
                    <th className="px-4 py-3 font-semibold">Competition Types</th>
                    <th className="px-4 py-3 font-semibold">Default Events</th>
                    <th className="px-4 py-3 font-semibold">Player Setup</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm dark:divide-[var(--border-soft)] dark:bg-[var(--surface)]">
                  {visibleSports.map((sport) => {
                    const archived = isArchivedStatus(sport.status);
                    const globalTemplate = templates.find((template) => Number(template.sport_id) === Number(sport.id));
                    const defaultEvents = globalTemplate?.default_event_categories || [];
                    const enabledEvents = defaultEvents.filter((event) => event.is_default_enabled !== false);

                    return (
                      <tr key={sport.id} className="hover:bg-slate-50 dark:hover:bg-[var(--surface-soft)]">
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                          <div className="flex items-center gap-2">
                            <SportIcon imageUrl={sport.image_url} label={getSportDisplayName(sport)} scale="sm" />
                            <span>{getSportDisplayName(sport)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{participantLabelForSport(sport)}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{enabledEvents.length} event{enabledEvents.length === 1 ? "" : "s"} enabled</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{playerSetupForSport(sport)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-sm px-2 py-0.5 text-xs font-semibold ${archived
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-700/30 dark:text-amber-300"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-700/30 dark:text-emerald-300"
                              }`}
                          >
                            {formatStatusLabel(sport.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            {isSportsCoordinator && !archived ? <button type="button" onClick={() => setTemplateSport(sport)} className="os-btn-primary-soft min-h-10 text-xs">Configure Sport</button> : null}
                            {readOnly ? <button
                              type="button"
                              onClick={() => setRuleSport(sport)}
                              className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                            >
                              View Rules
                            </button> : null}

                            {!readOnly && (
                              <>

                                <ActionPopover
                                  label="•••"
                                  buttonClassName="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                                  panelClassName="grid gap-1 absolute right-0 top-full z-20 mt-1 w-40 rounded-sm border border-slate-200 bg-white p-2 shadow-lg shadow-slate-300/20 dark:border-slate-700 dark:bg-slate-900 dark:shadow-none"
                                >
                                  {() => (
                                    <>
                                      {isSportsCoordinator ? (
                                        <button
                                          type="button"
                                          onClick={() => setRuleSport(sport)}
                                          className="rounded-sm px-2 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
                                        >
                                          Rules for future Intramurals
                                        </button>
                                      ) : null}

                                      <label className="cursor-pointer rounded-sm px-2 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-700">
                                        {imageActionBySportId[sport.id]?.loading
                                          ? "Uploading..."
                                          : sport.image_url
                                            ? "Change Image"
                                            : "Upload Image"}
                                        <input
                                          type="file"
                                          accept=".jpg,.jpeg,.png,.webp"
                                          className="hidden"
                                          disabled={Boolean(imageActionBySportId[sport.id]?.loading)}
                                          onChange={(event) => {
                                            const file = event.target.files?.[0] || null;
                                            event.target.value = "";
                                            handleUploadSportImage(sport.id, file);
                                          }}
                                        />
                                      </label>
                                      {sport.image_url ? (
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveSportImage(sport.id)}
                                          disabled={Boolean(imageActionBySportId[sport.id]?.loading)}
                                          className="rounded-sm w-28 cursor-pointer py-2 text-sm font-semibold text-slate-700 dark:bg-slate-900 hover:bg-slate-50 disabled:opacity-50 "
                                        >
                                          Remove Image
                                        </button>
                                      ) : null}

                                      {!archived ? (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => openEditModal(sport.id)}
                                            className="rounded-sm w-10 cursor-pointer border-slate-300 bg-white px-2.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200"
                                          >
                                            Edit details
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => openStatusModal(sport.id, "archive")}
                                            className="rounded-sm cursor-pointer w-17 border-rose-200 bg-white px-2.5 py-1 text-sm font-semibold text-rose-700 hover:bg-rose-50 hover:text-rose-900 dark:bg-slate-900 dark:text-rose-300"
                                          >
                                            Archive
                                          </button>
                                        </>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => openStatusModal(sport.id, "restore")}
                                          className="rounded-sm cursor-pointer bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-500"
                                        >
                                          Restore
                                        </button>
                                      )}

                                    </>
                                  )}


                                </ActionPopover>


                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      <AppModal
        open={Boolean(templateSport)}
        onClose={() => {
          if (templateDefaultsDirty && !window.confirm("Discard unsaved changes?")) return;
          setTemplateSport(null);
          setTemplateDefaultsDirty(false);
        }}
        title={templateSport ? `Configure ${getSportDisplayName(templateSport)}` : "Configure Sport"}
        subtitle="Choose what future Intramurals normally offer. Existing competitions are not changed."
        maxWidthClass="max-w-5xl"
        bodyClassName="p-4 sm:p-6"
      >
        {templateSport ? <GlobalSportTemplatePanel sportId={templateSport.id} onDirtyChange={setTemplateDefaultsDirty} onSaved={refreshAll} /> : null}
      </AppModal>
      <AppModal
        open={Boolean(ruleSport)}
        onClose={() => setRuleSport(null)}
        title={ruleSport ? `${getSportDisplayName(ruleSport)} Rules` : "Rules for Future Intramurals"}
        subtitle={isSportsCoordinator
          ? "Set the rule version used when this sport is added to future Intramurals."
          : "Review the rules for this sport and event."}
        maxWidthClass="max-w-4xl"
        bodyClassName="p-4 sm:p-6"
      >
        {ruleSport ? (
          isSportsCoordinator ? (
            <InstitutionalSportRulesPanel
              key={`institutional-sport-rules-${ruleSport.id}`}
              sportId={ruleSport.id}
            />
          ) : (
            <RuleGovernancePage
              key={`sport-rules-${ruleSport.id}`}
              embedded
              lockSportSelection
              initialSportId={ruleSport.id}
            />
          )
        ) : null}
      </AppModal>
      <AppModal
        open={statusModal.open}
        onClose={() => {
          if (statusModal.busy) return;
          setStatusModal({ open: false, sportId: null, action: "archive", error: "", busy: false });
        }}
        title={statusModal.action === "restore" ? "Restore Sport" : "Archive Sport"}
        subtitle={
          statusModal.action === "restore"
            ? "This sport will be available in active workflows again."
            : "Linked teams stay preserved while this sport is archived."
        }
        maxWidthClass="max-w-xl"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            {statusModal.action === "restore"
              ? "Restore this archived sport now?"
              : "Archive this sport now?"}
          </p>
          {statusModal.error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
              {statusModal.error}
            </div>
          ) : null}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setStatusModal({ open: false, sportId: null, action: "archive", error: "", busy: false })}
              disabled={statusModal.busy}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmStatusModal}
              disabled={statusModal.busy}
              className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${statusModal.action === "restore" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-rose-600 hover:bg-rose-500"
                }`}
            >
              {statusModal.busy
                ? (statusModal.action === "restore" ? "Restoring..." : "Archiving...")
                : (statusModal.action === "restore" ? "Confirm Restore" : "Confirm Archive")}
            </button>
          </div>
        </div>
      </AppModal>
    </div>
  );
};

export default Sports;
