import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarRange,
  LayoutGrid,
  PencilLine,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Trophy,
  Users,
} from "lucide-react";

import AppModal from "../common/AppModal";
import CollapsibleFilterPanel from "../common/CollapsibleFilterPanel";
import {
  archiveTournament,
  createTournamentProgramBlock,
  deleteTournamentProgramBlock,
  getTournamentProgramBlocks,
  getTournamentRegistrationTargetSummary,
  deleteTournament,
  getTournaments,
  permanentlyDeleteTournament,
  refreshTournamentRegistrationTargets,
  restoreTournament,
  startTournament,
  updateTournamentProgramBlock,
  updateTournament,
} from "../../services/tournamentService";
import { useWorkspace } from "../../context/WorkspaceContext";
import { getSportTemplates, getSports } from "../../services/sportService";
import { getTeams } from "../../services/teamService";
import { getDepartments } from "../../services/departmentService";
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
  validateEventCategories,
} from "../../utils/tournamentEventCategories";

const toHour = (rawValue, fallback, min, max) => {
  const parsed = Number.parseInt(String(rawValue ?? ""), 10);
  if (!Number.isInteger(parsed)) return fallback;
  if (parsed < min || parsed > max) return fallback;
  return parsed;
};

const toIntList = (rawValues) => {
  const source = Array.isArray(rawValues) ? rawValues : [];
  return Array.from(
    new Set(
      source
        .map((value) => Number.parseInt(String(value), 10))
        .filter((value) => Number.isInteger(value) && value > 0)
    )
  );
};

const formatTournamentType = (rawValue) => {
  const text = String(rawValue || "").trim();
  if (!text) return "-";
  return text
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

const PROGRAM_BLOCK_TYPE_OPTIONS = [
  "OPENING_PROGRAM",
  "LUNCH_BREAK",
  "CLOSING_CEREMONY",
  "AWARDING",
  "PREPARATION",
  "CUSTOM",
];

const EMPTY_PROGRAM_BLOCK_DRAFT = {
  id: null,
  title: "",
  block_type: "CUSTOM",
  date: "",
  start_time: "08:00",
  end_time: "09:00",
  is_recurring_daily: false,
  description: "",
};

const formatProgramTypeLabel = (value) =>
  String(value || "")
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((token) => token[0].toUpperCase() + token.slice(1))
    .join(" ");

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

const TournamentTable = ({
  refreshKey,
  readOnly = false,
  departmentId = null,
  onTournamentSelect = null,
  onCreateTournament = null,
  onOpenTournamentSettings = null,
  selectedTournamentId = null,
}) => {
  const { selectedIntramural } = useWorkspace();
  const selectedWorkspaceId = selectedIntramural?.id ?? null;
  const [tournaments, setTournaments] = useState([]);
  const [sports, setSports] = useState([]);
  const [sportTemplates, setSportTemplates] = useState([]);
  const [teams, setTeams] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sportFilter, setSportFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTournament, setEditingTournament] = useState(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editProgramBlocks, setEditProgramBlocks] = useState([]);
  const [editProgramDraft, setEditProgramDraft] = useState(
    EMPTY_PROGRAM_BLOCK_DRAFT
  );
  const [programBlockSaving, setProgramBlockSaving] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletePreview, setDeletePreview] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteModalError, setDeleteModalError] = useState("");
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [deleteOrphanTeams, setDeleteOrphanTeams] = useState(false);
  const [actionConfirmModal, setActionConfirmModal] = useState({
    open: false,
    action: "",
    tournament: null,
    blockId: null,
    targetIds: [],
    title: "",
    message: "",
    busy: false,
    error: "",
  });
  const [editForm, setEditForm] = useState({
    tournament_name: "",
    tournament_type: "",
    department_ids: [],
    sport_ids: [],
    start_date: "",
    end_date: "",
    include_evening: false,
    schedule_start_hour: 5,
    schedule_end_hour: 18,
    sport_bracket_settings: [],
  });
  const [registrationTargetSummary, setRegistrationTargetSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [summaryMessage, setSummaryMessage] = useState({ type: "", text: "" });
  const [isRefreshingTargets, setIsRefreshingTargets] = useState(false);
  const [expandedEventEditors, setExpandedEventEditors] = useState({});

  const isArchivedTournament = useCallback(
    (tournament) =>
      Boolean(tournament?.is_archived) ||
      String(tournament?.status || "").toLowerCase() === "archived",
    []
  );

  const isDevEnvironment = Boolean(import.meta?.env?.DEV);

  const resolveDeleteLifecycleState = useCallback(
    (target, preview) => {
      const archived =
        preview && typeof preview?.is_archived === "boolean"
          ? preview.is_archived
          : isArchivedTournament(target);
      const hasDependencies = Boolean(preview?.has_dependencies);
      const canPermanentDelete =
        preview && typeof preview?.can_permanent_delete === "boolean"
          ? preview.can_permanent_delete
          : archived;
      const canDelete = archived
        ? Boolean(canPermanentDelete)
        : Boolean(
          preview?.can_delete ??
          preview?.can_delete_now ??
          (!hasDependencies)
        );
      const canArchive =
        preview && typeof preview?.can_archive === "boolean"
          ? preview.can_archive
          : !archived;
      const canRestore =
        preview && typeof preview?.can_restore === "boolean"
          ? preview.can_restore
          : archived;
      const recommendedAction = String(preview?.recommended_action || "").toUpperCase();
      const mode = archived
        ? "ARCHIVED_PERMANENT_DELETE"
        : hasDependencies
          ? "ACTIVE_ARCHIVE_RECOMMENDED"
          : "ACTIVE_DELETE_READY";
      return {
        archived,
        hasDependencies,
        canDelete,
        canPermanentDelete,
        canArchive,
        canRestore,
        recommendedAction,
        mode,
      };
    },
    [isArchivedTournament]
  );

  const isStartedTournament = useCallback(
    (tournament) =>
      Boolean(tournament?.is_started) ||
      String(tournament?.lifecycle_status || "").toLowerCase() === "started",
    []
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sportsData, templatesData, teamsData, departmentsData] = await Promise.all([
          getSports(departmentId),
          getSportTemplates().catch(() => []),
          getTeams(),
          getDepartments(),
        ]);
        setSports(Array.isArray(sportsData) ? sportsData : []);
        setSportTemplates(Array.isArray(templatesData) ? templatesData : []);
        setTeams(Array.isArray(teamsData) ? teamsData : []);
        setDepartments(Array.isArray(departmentsData) ? departmentsData : []);
      } catch (error) {
        console.error(error);
        setSports([]);
        setSportTemplates([]);
        setTeams([]);
        setDepartments([]);
      }
    };

    fetchData();
  }, [departmentId]);

  const loadTournaments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTournaments({
        includeArchived: !readOnly && showArchived,
        ...(selectedWorkspaceId ? { workspaceId: selectedWorkspaceId } : {}),
      });
      const normalized = Array.isArray(data) ? data : [];
      const visible =
        !readOnly && showArchived
          ? normalized.filter((tournament) => isArchivedTournament(tournament))
          : normalized;
      setTournaments(visible);
    } finally {
      setLoading(false);
    }
  }, [isArchivedTournament, readOnly, showArchived, selectedWorkspaceId]);

  useEffect(() => {
    loadTournaments();
  }, [loadTournaments, refreshKey]);

  const sportsById = useMemo(() => {
    const map = {};
    sports.forEach((sport) => {
      map[sport.id] = getSportDisplayName(sport, sportTemplates);
    });
    return map;
  }, [sportTemplates, sports]);

  const teamsById = useMemo(() => {
    const map = {};
    teams.forEach((team) => {
      map[team.id] = team;
    });
    return map;
  }, [teams]);

  const departmentsById = useMemo(() => {
    const map = {};
    departments.forEach((department) => {
      map[department.id] = department.department_name;
    });
    return map;
  }, [departments]);

  const editDepartmentOptions = useMemo(
    () =>
      departments
        .filter((department) => String(department?.department_name || "").trim().toLowerCase() !== "sports office")
        .map((department) => ({
          id: department.id,
          name: department.department_name || department.department_code || `Department #${department.id}`,
        }))
        .sort((a, b) => String(a.name).localeCompare(String(b.name))),
    [departments]
  );

  const editExpectedTargets = useMemo(() => {
    const departmentIds = toIntList(editForm.department_ids);
    const sportIds = toIntList(editForm.sport_ids);
    const { teamSlots, entryPools } = countExpectedRegistrationTargets({
      departmentCount: departmentIds.length,
      sportIds,
      sports: sports.filter((sport) => sportIds.includes(Number(sport.id))),
      sportSettings: editForm.sport_bracket_settings,
      templates: sportTemplates,
      fallbackBracketFormat: "SINGLE_ELIMINATION",
      fallbackSeedingMethod: "RANDOM",
    });
    return {
      departments: departmentIds.length,
      sports: sportIds.length,
      teamSlots,
      entryPools,
    };
  }, [editForm.department_ids, editForm.sport_bracket_settings, editForm.sport_ids, sportTemplates, sports]);

  const sportNamesForTournament = useCallback(
    (tournament) => {
      const sportIds = toIntList(tournament?.sport_ids || [tournament?.sport_id]);
      return sportIds.map((sportId) => sportsById[sportId] || "Unassigned sport");
    },
    [sportsById]
  );

  const teamLabel = (teamId) => {
    const team = teamsById[teamId];
    if (!team) return "Unnamed team";
    const dept = departmentsById[team.department_id] || team.department_id || "-";
    return `${team.team_name} (${dept})`;
  };

  const resolveLifecycleBadge = useCallback(
    (tournament) => {
      if (isArchivedTournament(tournament)) {
        return {
          key: "archived",
          label: "Archived",
          className:
            "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-200",
        };
      }
      if (isStartedTournament(tournament)) {
        return {
          key: "started",
          label: "Started",
          className:
            "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-200",
        };
      }
      return {
        key: "review",
        label: "Review",
        className:
          "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-200",
      };
    },
    [isArchivedTournament, isStartedTournament]
  );

  const formatScheduleWindow = (tournament) => {
    const includeEvening = Boolean(tournament?.include_evening);
    const startHour = toHour(tournament?.schedule_start_hour, 5, 0, 23);
    const endHour = toHour(
      tournament?.schedule_end_hour,
      includeEvening ? 22 : 18,
      1,
      24
    );
    return `${String(startHour).padStart(2, "0")}:00 - ${String(endHour).padStart(2, "0")}:00`;
  };

  const formatDateRange = (tournament) => {
    const start = String(tournament?.start_date || "").trim();
    const end = String(tournament?.end_date || "").trim();
    if (start && end) return `${start} to ${end}`;
    return start || end || "-";
  };

  const resetEditState = () => {
    setIsEditModalOpen(false);
    setEditingTournament(null);
    setIsSavingEdit(false);
    setEditForm({
      tournament_name: "",
      tournament_type: "",
      department_ids: [],
      sport_ids: [],
      start_date: "",
      end_date: "",
      include_evening: false,
      schedule_start_hour: 5,
      schedule_end_hour: 18,
      sport_bracket_settings: [],
    });
    setRegistrationTargetSummary(null);
    setSummaryLoading(false);
    setSummaryError("");
    setSummaryMessage({ type: "", text: "" });
    setIsRefreshingTargets(false);
    setExpandedEventEditors({});
    setEditProgramBlocks([]);
    setEditProgramDraft(EMPTY_PROGRAM_BLOCK_DRAFT);
    setProgramBlockSaving(false);
  };

  const loadEditProgramBlocks = async (tournamentId) => {
    if (!tournamentId) {
      setEditProgramBlocks([]);
      return;
    }
    try {
      const response = await getTournamentProgramBlocks(tournamentId);
      const rows = Array.isArray(response?.blocks) ? response.blocks : [];
      setEditProgramBlocks(rows);
    } catch (error) {
      console.error(error);
      setEditProgramBlocks([]);
    }
  };

  const loadRegistrationTargetSummary = async (tournamentId) => {
    if (!tournamentId) {
      setRegistrationTargetSummary(null);
      setSummaryError("");
      return;
    }
    setSummaryLoading(true);
    setSummaryError("");
    try {
      const summary = await getTournamentRegistrationTargetSummary(tournamentId);
      setRegistrationTargetSummary(summary || null);
    } catch (error) {
      setRegistrationTargetSummary(null);
      setSummaryError(error?.response?.data?.detail || "Failed to load registration target summary.");
    } finally {
      setSummaryLoading(false);
    }
  };

  const startEdit = (tournament) => {
    if (readOnly) return;
    if (isArchivedTournament(tournament)) {
      alert("Restore this archived tournament before editing.");
      return;
    }

    const includeEvening = Boolean(tournament?.include_evening);
    const scheduleStartHour = toHour(tournament?.schedule_start_hour, 5, 0, 23);
    const scheduleEndHour = toHour(
      tournament?.schedule_end_hour,
      includeEvening ? 22 : 18,
      1,
      24
    );

    setEditingTournament(tournament);
    const normalizedSportIds = toIntList(tournament.sport_ids || [tournament.sport_id]);
    const normalizedSettings = normalizedSportIds
      .map((sportId) => {
        const sport = sports.find((row) => Number(row.id) === Number(sportId));
        if (!sport) return null;
        const existingSetting = (tournament.sport_bracket_settings || []).find(
          (setting) => Number(setting?.sport_id) === Number(sportId)
        );
        return buildNormalizedSportBracketSetting({
          sport,
          setting: existingSetting,
          templates: sportTemplates,
          fallbackBracketFormat: "SINGLE_ELIMINATION",
          fallbackSeedingMethod: "RANDOM",
        });
      })
      .filter(Boolean);
    setEditForm({
      tournament_name: tournament.tournament_name || "",
      tournament_type: tournament.tournament_type || "",
      department_ids: toIntList(tournament.department_ids || []),
      sport_ids: normalizedSportIds,
      start_date: tournament.start_date || "",
      end_date: tournament.end_date || "",
      include_evening: includeEvening,
      schedule_start_hour: scheduleStartHour,
      schedule_end_hour: scheduleEndHour,
      sport_bracket_settings: normalizedSettings,
    });
    loadEditProgramBlocks(tournament.id);
    loadRegistrationTargetSummary(tournament.id);
    setSummaryMessage({ type: "", text: "" });
    setIsEditModalOpen(true);
  };

  const handleEditFormChange = (name, value) => {
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const buildEventEditorKey = (sportId, event, index) =>
    `${sportId}:${event?.id ?? event?.event_key ?? index}`;

  const toggleEventEditor = (sportId, event, index) => {
    const key = buildEventEditorKey(sportId, event, index);
    setExpandedEventEditors((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const ensureEditSportSetting = (settings, sportId) => {
    const index = settings.findIndex((setting) => Number(setting?.sport_id) === Number(sportId));
    if (index >= 0) return { settings, index };
    const sport = sports.find((row) => Number(row.id) === Number(sportId));
    if (!sport) return { settings, index: -1 };
    const nextSettings = [
      ...settings,
      buildNormalizedSportBracketSetting({
        sport,
        templates: sportTemplates,
        fallbackBracketFormat: "SINGLE_ELIMINATION",
        fallbackSeedingMethod: "RANDOM",
      }),
    ];
    return { settings: nextSettings, index: nextSettings.length - 1 };
  };

  const handleEditEventAdd = (sportId) => {
    setEditForm((prev) => {
      let settings = [...(prev.sport_bracket_settings || [])];
      const ensured = ensureEditSportSetting(settings, sportId);
      settings = ensured.settings;
      const index = ensured.index;
      if (index < 0) return prev;
      const sport = sports.find((row) => Number(row.id) === Number(sportId));
      const capabilities = resolveSportEventCapabilities(sport, sportTemplates);
      const events = [...(settings[index].events || [])];
      const newEvent = buildCustomEventCategory({
        sport,
        fallbackBracketFormat: "SINGLE_ELIMINATION",
        fallbackSeedingMethod: "RANDOM",
        participantShape: capabilities.allowedParticipantShapes[0],
      });
      newEvent.division_category = capabilities.allowedDivisions[0];
      events.push(newEvent);
      settings[index] = { ...settings[index], events };
      const editorKey = buildEventEditorKey(sportId, newEvent, events.length - 1);
      setExpandedEventEditors((current) => ({ ...current, [editorKey]: true }));
      return { ...prev, sport_bracket_settings: settings };
    });
  };

  const handleEditEventRemove = (sportId, eventIndex) => {
    setEditForm((prev) => {
      const settings = [...(prev.sport_bracket_settings || [])];
      const index = settings.findIndex((s) => Number(s?.sport_id) === Number(sportId));
      if (index < 0) return prev;
      const events = [...(settings[index].events || [])];
      const activeCount = events.filter((eventCategory) => eventCategory?.is_active !== false).length;
      const targetEvent = events[eventIndex];
      if (!targetEvent) return prev;
      if (activeCount <= 1 && targetEvent?.is_active !== false) return prev;
      if (targetEvent?.id) {
        events[eventIndex] = { ...targetEvent, is_active: false };
      } else {
        events.splice(eventIndex, 1);
      }
      settings[index] = { ...settings[index], events };
      return { ...prev, sport_bracket_settings: settings };
    });
  };

  const handleEditEventRestore = (sportId, eventIndex) => {
    setEditForm((prev) => {
      const settings = [...(prev.sport_bracket_settings || [])];
      const index = settings.findIndex((s) => Number(s?.sport_id) === Number(sportId));
      if (index < 0) return prev;
      const events = [...(settings[index].events || [])];
      if (!events[eventIndex]) return prev;
      events[eventIndex] = { ...events[eventIndex], is_active: true };
      settings[index] = { ...settings[index], events };
      return { ...prev, sport_bracket_settings: settings };
    });
  };

  const handleEditEventSettingChange = (sportId, eventIndex, field, value) => {
    setEditForm((prev) => {
      const settings = [...(prev.sport_bracket_settings || [])];
      const index = settings.findIndex((s) => Number(s?.sport_id) === Number(sportId));
      if (index < 0) return prev;
      const events = [...(settings[index].events || [])];
      if (!events[eventIndex]) return prev;
      const nextEvent = { ...events[eventIndex], [field]: value };
      if (field === "participant_shape") {
        nextEvent.players_per_entry = null;
      }
      events[eventIndex] = nextEvent;
      settings[index] = { ...settings[index], events };
      return { ...prev, sport_bracket_settings: settings };
    });
  };

  const toggleEditSport = (sportId, checked) => {
    setEditForm((prev) => {
      const nextSportIds = checked
        ? toIntList([...prev.sport_ids, sportId])
        : prev.sport_ids.filter((value) => value !== sportId);
      const selectedIdSet = new Set(nextSportIds);
      const keptSettings = (prev.sport_bracket_settings || []).filter((setting) =>
        selectedIdSet.has(Number(setting?.sport_id))
      );
      if (!checked) {
        return {
          ...prev,
          sport_ids: nextSportIds,
          sport_bracket_settings: keptSettings,
        };
      }
      const sport = sports.find((row) => Number(row.id) === Number(sportId));
      if (!sport || keptSettings.some((setting) => Number(setting?.sport_id) === Number(sportId))) {
        return {
          ...prev,
          sport_ids: nextSportIds,
          sport_bracket_settings: keptSettings,
        };
      }
      return {
        ...prev,
        sport_ids: nextSportIds,
        sport_bracket_settings: [
          ...keptSettings,
          buildNormalizedSportBracketSetting({
            sport,
            templates: sportTemplates,
            fallbackBracketFormat: "SINGLE_ELIMINATION",
            fallbackSeedingMethod: "RANDOM",
          }),
        ],
      };
    });
  };

  const toggleEditDepartment = (departmentId, checked) => {
    setEditForm((prev) => ({
      ...prev,
      department_ids: checked
        ? toIntList([...prev.department_ids, departmentId])
        : prev.department_ids.filter((value) => value !== departmentId),
    }));
  };

  const handleIncludeEveningChange = (checked) => {
    setEditForm((prev) => {
      const endHour = toHour(prev.schedule_end_hour, checked ? 22 : 18, 1, 24);
      return {
        ...prev,
        include_evening: checked,
        schedule_end_hour: checked ? Math.max(endHour, 18) : Math.min(endHour, 18),
      };
    });
  };

  useEffect(() => {
    if (!isEditModalOpen || editForm.sport_ids.length === 0 || sports.length === 0) return;
    setEditForm((prev) => {
      const selectedIdSet = new Set(toIntList(prev.sport_ids));
      const nextSettings = sports
        .filter((sport) => selectedIdSet.has(Number(sport.id)))
        .map((sport) => {
          const existingSetting = (prev.sport_bracket_settings || []).find(
            (setting) => Number(setting?.sport_id) === Number(sport.id)
          );
          return buildNormalizedSportBracketSetting({
            sport,
            setting: existingSetting,
            templates: sportTemplates,
            fallbackBracketFormat: "SINGLE_ELIMINATION",
            fallbackSeedingMethod: "RANDOM",
          });
        });
      const unchanged =
        JSON.stringify(nextSettings) === JSON.stringify(prev.sport_bracket_settings || []);
      if (unchanged) return prev;
      return { ...prev, sport_bracket_settings: nextSettings };
    });
  }, [editForm.sport_ids, isEditModalOpen, sportTemplates, sports]);

  const validateProgramBlockDraft = (draft) => {
    if (!draft.title.trim()) return "Program block title is required.";
    if (!PROGRAM_BLOCK_TYPE_OPTIONS.includes(String(draft.block_type))) {
      return "Select a valid program block type.";
    }
    if (!draft.start_time || !draft.end_time || draft.start_time >= draft.end_time) {
      return "Program block start time must be before end time.";
    }
    if (!draft.is_recurring_daily) {
      if (!draft.date) return "Program block date is required unless recurring daily.";
      if (editForm.start_date && draft.date < editForm.start_date) {
        return "Program block date must be within tournament range.";
      }
      if (editForm.end_date && draft.date > editForm.end_date) {
        return "Program block date must be within tournament range.";
      }
    }
    return null;
  };

  const handleProgramBlockEdit = (block) => {
    setEditProgramDraft({
      id: block.id,
      title: String(block.title || ""),
      block_type: String(block.block_type || "CUSTOM"),
      date: block.is_recurring_daily ? "" : String(block.date || ""),
      start_time: String(block.start_time || "08:00").slice(0, 5),
      end_time: String(block.end_time || "09:00").slice(0, 5),
      is_recurring_daily: Boolean(block.is_recurring_daily),
      description: String(block.description || ""),
    });
  };

  const handleProgramBlockSave = async () => {
    if (!editingTournament?.id) return;
    const validationError = validateProgramBlockDraft(editProgramDraft);
    if (validationError) {
      alert(validationError);
      return;
    }
    setProgramBlockSaving(true);
    try {
      const payload = {
        title: String(editProgramDraft.title || "").trim(),
        block_type: String(editProgramDraft.block_type || "CUSTOM"),
        date: editProgramDraft.is_recurring_daily ? null : editProgramDraft.date || null,
        start_time: editProgramDraft.start_time,
        end_time: editProgramDraft.end_time,
        is_recurring_daily: Boolean(editProgramDraft.is_recurring_daily),
        description: String(editProgramDraft.description || "").trim() || null,
      };
      if (editProgramDraft.id) {
        await updateTournamentProgramBlock(editingTournament.id, editProgramDraft.id, payload);
      } else {
        await createTournamentProgramBlock(editingTournament.id, payload);
      }
      setEditProgramDraft(EMPTY_PROGRAM_BLOCK_DRAFT);
      await loadEditProgramBlocks(editingTournament.id);
    } catch (error) {
      alert(error?.response?.data?.detail || "Unable to save program block.");
    } finally {
      setProgramBlockSaving(false);
    }
  };

  const handleProgramBlockDelete = async (blockId, confirmed = false) => {
    if (!editingTournament?.id || !blockId) return;
    if (!confirmed) {
      setActionConfirmModal({
        open: true,
        action: "delete_program_block",
        tournament: editingTournament,
        blockId: Number(blockId),
        targetIds: [],
        title: "Delete Program Block",
        message: "Delete this program block?",
        busy: false,
        error: "",
      });
      return;
    }
    setProgramBlockSaving(true);
    try {
      await deleteTournamentProgramBlock(editingTournament.id, blockId);
      setActionConfirmModal((prev) => ({ ...prev, open: false, action: "", blockId: null }));
      await loadEditProgramBlocks(editingTournament.id);
      if (Number(editProgramDraft.id) === Number(blockId)) {
        setEditProgramDraft(EMPTY_PROGRAM_BLOCK_DRAFT);
      }
    } catch (error) {
      setActionConfirmModal((prev) => ({
        ...prev,
        error: error?.response?.data?.detail || "Unable to delete program block.",
      }));
    } finally {
      setProgramBlockSaving(false);
    }
  };

  const saveEdit = async (event) => {
    event.preventDefault();
    if (!editingTournament?.id) return;
    if (!editForm.tournament_name.trim()) {
      alert("Tournament name is required.");
      return;
    }
    if (!editForm.tournament_type) {
      alert("Tournament format is required.");
      return;
    }
    if (toIntList(editForm.department_ids).length === 0) {
      alert("Select at least one department.");
      return;
    }
    if (editForm.sport_ids.length === 0) {
      alert("Select at least one sport.");
      return;
    }
    if (!editForm.start_date || !editForm.end_date) {
      alert("Tournament start and end dates are required.");
      return;
    }
    if (editForm.end_date < editForm.start_date) {
      alert("End date must be on or after start date.");
      return;
    }

    const includeEvening = Boolean(editForm.include_evening);
    const startHour = toHour(editForm.schedule_start_hour, 5, 0, 23);
    const endHour = toHour(editForm.schedule_end_hour, includeEvening ? 22 : 18, 1, 24);
    if (endHour <= startHour) {
      alert("Schedule end hour must be greater than schedule start hour.");
      return;
    }
    if (!includeEvening && endHour > 18) {
      alert("Enable evening schedule to allow end hour later than 18.");
      return;
    }
    for (const sportId of toIntList(editForm.sport_ids)) {
      const sport = sports.find((row) => Number(row.id) === Number(sportId));
      const setting = (editForm.sport_bracket_settings || []).find(
        (row) => Number(row?.sport_id) === Number(sportId)
      );
      const validationMessage = validateEventCategories(setting?.events || []);
      if (validationMessage) {
        alert(`${getSportDisplayName(sport, "Selected sport")}: ${validationMessage}`);
        return;
      }
    }

    setIsSavingEdit(true);
    try {
      const updated = await updateTournament(editingTournament.id, {
        tournament_name: editForm.tournament_name.trim(),
        tournament_type: editForm.tournament_type,
        department_ids: toIntList(editForm.department_ids),
        sport_ids: toIntList(editForm.sport_ids),
        start_date: editForm.start_date || null,
        end_date: editForm.end_date || null,
        include_evening: includeEvening,
        schedule_start_hour: startHour,
        schedule_end_hour: endHour,
        sport_bracket_settings: serializeSportBracketSettingsForPayload({
          sportIds: toIntList(editForm.sport_ids),
          sportSettings: editForm.sport_bracket_settings || [],
          sports: sports.filter((sport) => toIntList(editForm.sport_ids).includes(Number(sport.id))),
          templates: sportTemplates,
          fallbackBracketFormat: "SINGLE_ELIMINATION",
          fallbackSeedingMethod: "RANDOM",
        }),
      });
      setEditingTournament(updated || editingTournament);
      const scheduleAdjustment = updated?.schedule_adjustment;
      setSummaryMessage({
        type: "success",
        text: scheduleAdjustment?.schedule_preserved
          ? `Intramural updated. ${scheduleAdjustment.shifted_match_count} scheduled match${scheduleAdjustment.shifted_match_count === 1 ? "" : "es"} and ${scheduleAdjustment.shifted_program_block_count} dated program block${scheduleAdjustment.shifted_program_block_count === 1 ? "" : "s"} were moved automatically.`
          : "Tournament setup saved. Registration targets were rechecked on the backend.",
      });
      await loadTournaments();
      await loadRegistrationTargetSummary(editingTournament.id);
    } catch (error) {
      setSummaryMessage({
        type: "error",
        text: error?.response?.data?.detail || "Failed to update tournament.",
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleRefreshRegistrationTargets = async () => {
    if (!editingTournament?.id || isRefreshingTargets) return;
    setIsRefreshingTargets(true);
    setSummaryMessage({ type: "", text: "" });
    try {
      const response = await refreshTournamentRegistrationTargets(editingTournament.id);
      if (response?.registration_target_summary) {
        setRegistrationTargetSummary(response.registration_target_summary);
      } else {
        await loadRegistrationTargetSummary(editingTournament.id);
      }
      setSummaryMessage({
        type: response?.setup_complete ? "success" : "warning",
        text:
          response?.message ||
          "Registration targets refreshed.",
      });
      await loadTournaments();
    } catch (error) {
      setSummaryMessage({
        type: "error",
        text: error?.response?.data?.detail || "Failed to refresh registration targets.",
      });
    } finally {
      setIsRefreshingTargets(false);
    }
  };

  const handleDelete = async (tournament) => {
    const tournamentId = tournament?.id;
    if (!tournamentId) return;

    setDeleteTarget(tournament);
    setDeletePreview(null);
    setDeleteModalError("");
    setDeleteConfirmationText("");
    setDeleteOrphanTeams(false);
    setDeleteModalOpen(true);
    setIsDeleting(true);

    try {
      const preview = await deleteTournament(tournamentId, { dryRun: true });
      setDeletePreview(preview);
    } catch (error) {
      const detail =
        error?.response?.data?.detail?.message ||
        error?.response?.data?.detail ||
        "Failed to fetch deletion impact.";
      setDeletePreview({ error: String(detail) });
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.id || !deletePreview) return;
    const lifecycle = resolveDeleteLifecycleState(deleteTarget, deletePreview);
    if (!lifecycle.canDelete) {
      setDeleteModalError("Permanent deletion is blocked while this tournament still has linked records.");
      return;
    }
    const requiredConfirmationText = `DELETE ${deleteTarget?.tournament_name || "Unnamed tournament"}`;
    if (lifecycle.archived && deleteConfirmationText.trim() !== requiredConfirmationText) {
      setDeleteModalError("Type the required confirmation phrase to permanently delete this archived tournament.");
      return;
    }
    setIsDeleting(true);
    setDeleteModalError("");
    try {
      if (lifecycle.archived) {
        await permanentlyDeleteTournament(deleteTarget.id, {
          confirmationText: deleteConfirmationText.trim(),
          deleteOrphanTeams: deleteOrphanTeams && isDevEnvironment,
        });
      } else {
        await deleteTournament(deleteTarget.id);
      }
      setDeleteModalOpen(false);
      setDeleteTarget(null);
      setDeletePreview(null);
      setDeleteModalError("");
      setDeleteConfirmationText("");
      setDeleteOrphanTeams(false);
      loadTournaments();
    } catch (error) {
      const detail =
        error?.response?.data?.detail?.message ||
        error?.response?.data?.detail ||
        "Failed to delete tournament.";
      setDeleteModalError(String(detail));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleArchiveFromDeleteModal = async () => {
    if (!deleteTarget?.id) return;
    setIsDeleting(true);
    setDeleteModalError("");
    try {
      await archiveTournament(deleteTarget.id);
      setDeleteModalOpen(false);
      setDeleteTarget(null);
      setDeletePreview(null);
      setDeleteModalError("");
      if (editingTournament?.id === deleteTarget.id) {
        resetEditState();
      }
      loadTournaments();
    } catch (error) {
      const detail =
        error?.response?.data?.detail?.message ||
        error?.response?.data?.detail ||
        "Failed to archive tournament.";
      setDeleteModalError(String(detail));
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    setDeleteModalOpen(false);
    setDeleteTarget(null);
    setDeletePreview(null);
    setDeleteModalError("");
    setDeleteConfirmationText("");
    setDeleteOrphanTeams(false);
  };

  const handleStart = async (tournament, confirmed = false) => {
    if (!tournament?.id) return;
    if (isArchivedTournament(tournament)) {
      alert("Restore this archived tournament before starting.");
      return;
    }
    if (isStartedTournament(tournament)) {
      alert("Tournament is already started.");
      return;
    }

    if (!confirmed) {
      setActionConfirmModal({
        open: true,
        action: "start_tournament",
        tournament,
        blockId: null,
        targetIds: [],
        title: "Start Tournament",
        message: "Start this tournament now? Deletion will only be allowed after the configured finish time.",
        busy: false,
        error: "",
      });
      return;
    }

    try {
      await startTournament(tournament.id);
      setActionConfirmModal((prev) => ({ ...prev, open: false, action: "", tournament: null }));
      if (editingTournament?.id === tournament.id) {
        resetEditState();
      }
      loadTournaments();
    } catch (error) {
      alert(error?.response?.data?.detail || "Failed to start tournament.");
    }
  };

  const handleArchiveToggle = async (tournament, confirmed = false) => {
    const archived = isArchivedTournament(tournament);
    if (!confirmed) {
      setActionConfirmModal({
        open: true,
        action: "toggle_archive_tournament",
        tournament,
        blockId: null,
        targetIds: [],
        title: archived ? "Restore Tournament" : "Archive Tournament",
        message: archived
          ? "Restore this tournament and make it visible in active lists?"
          : "Archive this tournament? Historical matches and brackets will be preserved.",
        busy: false,
        error: "",
      });
      return;
    }

    try {
      if (archived) {
        await restoreTournament(tournament.id);
      } else {
        await archiveTournament(tournament.id);
        if (editingTournament?.id === tournament.id) {
          resetEditState();
        }
      }
      setActionConfirmModal((prev) => ({ ...prev, open: false, action: "", tournament: null }));
      loadTournaments();
    } catch (error) {
      setActionConfirmModal((prev) => ({
        ...prev,
        error:
          error?.response?.data?.detail ||
          `Failed to ${archived ? "restore" : "archive"} tournament.`,
      }));
    }
  };

  const runActionConfirm = async () => {
    if (!actionConfirmModal.action || actionConfirmModal.busy) return;
    setActionConfirmModal((prev) => ({ ...prev, busy: true, error: "" }));
    if (actionConfirmModal.action === "delete_program_block") {
      await handleProgramBlockDelete(actionConfirmModal.blockId, true);
      setActionConfirmModal((prev) => ({ ...prev, busy: false }));
      return;
    }
    if (actionConfirmModal.action === "start_tournament") {
      await handleStart(actionConfirmModal.tournament, true);
      setActionConfirmModal((prev) => ({ ...prev, busy: false }));
      return;
    }
    if (actionConfirmModal.action === "toggle_archive_tournament") {
      await handleArchiveToggle(actionConfirmModal.tournament, true);
      setActionConfirmModal((prev) => ({ ...prev, busy: false }));
      return;
    }
    setActionConfirmModal((prev) => ({ ...prev, busy: false }));
  };

  const filteredTournaments = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return tournaments.filter((tournament) => {
      const lifecycle = resolveLifecycleBadge(tournament).key;
      const sportNames = sportNamesForTournament(tournament);
      const sportIds = toIntList(tournament?.sport_ids || [tournament?.sport_id]);

      if (statusFilter !== "all" && lifecycle !== statusFilter) return false;
      if (
        sportFilter !== "all" &&
        !sportIds.some((id) => String(id) === String(sportFilter))
      ) {
        return false;
      }

      if (!normalizedSearch) return true;
      const haystack = [
        tournament?.tournament_name,
        `#${tournament?.id || ""}`,
        ...sportNames,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [resolveLifecycleBadge, searchTerm, sportFilter, sportNamesForTournament, statusFilter, tournaments]);

  const sportFilterOptions = useMemo(() => {
    return sports
      .map((sport) => ({
        id: sport.id,
        name: getSportDisplayName(sport, sportTemplates),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [sportTemplates, sports]);

  const filterSummaryParts = useMemo(() => {
    const parts = [];
    if (searchTerm.trim()) parts.push(`Search: "${searchTerm.trim()}"`);
    if (sportFilter !== "all") {
      const sport = sportFilterOptions.find((row) => String(row.id) === String(sportFilter));
      parts.push(sport?.name || "Selected sport");
    }
    if (statusFilter !== "all") {
      const labelMap = {
        review: "Review",
        started: "Started",
        archived: "Archived",
      };
      parts.push(labelMap[statusFilter] || "Selected status");
    }
    if (showArchived) parts.push("Archived view");
    return parts;
  }, [searchTerm, showArchived, sportFilter, sportFilterOptions, statusFilter]);

  const activeFilterCount = filterSummaryParts.length;

  const clearFilters = () => {
    setSearchTerm("");
    setSportFilter("all");
    setStatusFilter("all");
    setShowArchived(false);
  };

  const summaryStats = useMemo(() => {
    const nowDate = new Date().toISOString().slice(0, 10);
    const active = tournaments.filter((row) => !isArchivedTournament(row)).length;
    const scheduledToday = tournaments.filter(
      (row) => String(row?.start_date || "") === nowDate
    ).length;
    const archived = tournaments.filter((row) => isArchivedTournament(row)).length;
    const sportCount = new Set(
      tournaments.flatMap((row) => toIntList(row?.sport_ids || [row?.sport_id]))
    ).size;
    return { active, scheduledToday, archived, sportCount };
  }, [isArchivedTournament, tournaments]);

  const deleteLifecycle = resolveDeleteLifecycleState(deleteTarget, deletePreview || {});
  const deleteDependencyCounts = useMemo(() => {
    const dependencies =
      deletePreview?.dependencies && typeof deletePreview.dependencies === "object"
        ? deletePreview.dependencies
        : null;
    if (dependencies) {
      return {
        matches: Number(dependencies.matches || 0),
        schedules: Number(dependencies.schedules || 0),
        brackets: Number(dependencies.brackets || 0),
        teams: Number(dependencies.teams || 0),
        notifications: Number(dependencies.notifications || 0),
        program_blocks: Number(dependencies.program_blocks || 0),
      };
    }
    return {
      matches: Number(deletePreview?.match_count || 0),
      schedules: Number(deletePreview?.schedule_count || 0),
      brackets: Number(deletePreview?.bracket_count || 0),
      teams: Number(deletePreview?.linked_team_ids?.length || 0),
      notifications: Number(deletePreview?.notification_count || 0),
      program_blocks: Number(deletePreview?.program_block_count || 0),
    };
  }, [deletePreview]);
  const deleteDependencyItems = useMemo(
    () => [
      { key: "matches", label: "Matches", count: deleteDependencyCounts.matches },
      { key: "schedules", label: "Schedules", count: deleteDependencyCounts.schedules },
      { key: "brackets", label: "Brackets", count: deleteDependencyCounts.brackets },
      { key: "teams", label: "Teams", count: deleteDependencyCounts.teams },
      { key: "notifications", label: "Notifications", count: deleteDependencyCounts.notifications },
      { key: "program_blocks", label: "Program Blocks", count: deleteDependencyCounts.program_blocks },
    ],
    [deleteDependencyCounts]
  );

  const getTournamentTitle = (tournament) => {
    return (
      tournament?.tournament_name ||
       "Unnamed tournament"
      ).trim();
  }

  const deleteRequiredConfirmationText = useMemo(() => {
    if (!deleteTarget?.id) return "";

    const title = getTournamentTitle(deleteTarget);
    return `DELETE ${title}`;
  }, [deleteTarget]);

  const deleteConfirmationMatches = useMemo(
    () => deleteConfirmationText.trim() === deleteRequiredConfirmationText,
    [deleteConfirmationText, deleteRequiredConfirmationText]
  );

  const summaryMessageClass =
    summaryMessage.type === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200"
      : summaryMessage.type === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
        : summaryMessage.type === "error"
          ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
          : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-500/10 dark:text-slate-200";


  return (
    <div className="space-y-4 ">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950/30">
          <div className="mb-1 flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Trophy size={14} />
            <span className="text-xs uppercase tracking-wide">Active Tournaments</span>
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{summaryStats.active}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950/30">
          <div className="mb-1 flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <CalendarRange size={14} />
            <span className="text-xs uppercase tracking-wide">Scheduled Today</span>
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{summaryStats.scheduledToday}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950/30">
          <div className="mb-1 flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <LayoutGrid size={14} />
            <span className="text-xs uppercase tracking-wide">Archived</span>
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{summaryStats.archived}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950/30">
          <div className="mb-1 flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Sparkles size={14} />
            <span className="text-xs uppercase tracking-wide">Sports Covered</span>
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{summaryStats.sportCount}</p>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/70">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Tournaments</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage tournament lifecycle, brackets, schedules, and standings.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!readOnly && typeof onCreateTournament === "function" && (
              <button
                type="button"
                onClick={onCreateTournament}
                className="rounded-lg bg-cyan-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-cyan-500"
              >
                Create Intramural Event
              </button>
            )}
          </div>
        </div>

          <div className="space-y-3 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200">
                  {filteredTournaments.length} shown
                </span>
                <span className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200">
                  {showArchived ? "Archived View" : "Active View"}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {activeFilterCount > 0 ? "Filters are narrowing the list." : "Showing the current intramural list."}
              </p>
            </div>

            <CollapsibleFilterPanel
              title="Filters"
              activeCount={activeFilterCount}
            summaryText={activeFilterCount > 0 ? `Filtered by: ${filterSummaryParts.join(" · ")}` : "No active filters"}
            onClear={clearFilters}
          >
            <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_180px_160px_auto]">
              <label className="relative">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search tournaments..."
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>

              <select
                value={sportFilter}
                onChange={(event) => setSportFilter(event.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="all">All Sports</option>
                {sportFilterOptions.map((sport) => (
                  <option key={sport.id} value={sport.id}>
                    {getSportDisplayName(sport)}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="all">All Status</option>
                <option value="review">Review</option>
                <option value="started">Started</option>
                <option value="archived">Archived</option>
              </select>

              {!readOnly && (
                <button
                  type="button"
                  onClick={() => setShowArchived((value) => !value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                >
                  {showArchived ? "Show Active" : "Show Archived"}
                </button>
              )}
            </div>
          </CollapsibleFilterPanel>

          {loading && <div className="text-sm text-slate-500 dark:text-slate-400">Loading tournaments...</div>}

          {!loading && filteredTournaments.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/30 dark:text-slate-400">
              {tournaments.length === 0 && !showArchived ? (
                <div className="space-y-3">
                  <p className="font-semibold text-slate-700 dark:text-slate-200">No tournaments created yet.</p>
                  <p>
                    Start with one intramural, then manage sports, teams, brackets, schedules, and standings from its overview.
                  </p>
                  {!readOnly && typeof onCreateTournament === "function" ? (
                    <button
                      type="button"
                      onClick={onCreateTournament}
                      className="rounded-lg bg-cyan-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-cyan-500"
                    >
                      Create Intramural Event
                    </button>
                  ) : null}
                </div>
              ) : tournaments.length === 0 && showArchived ? (
                "No archived tournaments found."
              ) : (
                "No results match your filters."
              )}
            </div>
          )}

          {!loading && filteredTournaments.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full min-w-[1040px] text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/80">
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    <th className="px-3 py-3">Tournament</th>
                    <th className="px-3 py-3">Sports</th>
                    <th className="px-3 py-3">Teams</th>
                    <th className="px-3 py-3">Format</th>
                    <th className="px-3 py-3">Schedule Window</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Intramural</th>
                    {!readOnly && <th className="px-3 py-3">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredTournaments.map((tournament) => {
                    const isSelectedTournament =
                      Number(selectedTournamentId || 0) === Number(tournament.id);
                    const sportsForRow = sportNamesForTournament(tournament);
                    const visibleSports = sportsForRow.slice(0, 3);
                    const remainingSports = Math.max(0, sportsForRow.length - visibleSports.length);
                    const teamIds = Array.isArray(tournament.team_ids) ? tournament.team_ids : [];
                    const teamNames = teamIds.map((id) => teamLabel(id));
                    const canStart =
                      !isArchivedTournament(tournament) && !isStartedTournament(tournament);
                    const statusBadge = resolveLifecycleBadge(tournament);

                    return (
                      <tr
                        key={tournament.id}
                        className={`border-t border-slate-200 align-top transition dark:border-slate-700 ${
                          isSelectedTournament
                            ? "bg-cyan-50/70 dark:bg-cyan-500/10"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                        }`}
                      >
                        <td className="px-3 py-3">
                          {typeof onTournamentSelect === "function" ? (
                            <button
                              type="button"
                              onClick={() => onTournamentSelect(tournament)}
                              className="text-left"
                              title={`Open tournament details for ${tournament.tournament_name}`}
                            >
                              <p className="max-w-[220px] truncate font-semibold text-slate-900 hover:text-cyan-700 dark:text-slate-100 dark:hover:text-cyan-300">
                                {tournament.tournament_name}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                ID #{tournament.id}
                              </p>
                            </button>
                          ) : (
                            <div>
                              <p className="max-w-[220px] truncate font-semibold text-slate-900 dark:text-slate-100">
                                {tournament.tournament_name}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                ID {tournament.id}
                              </p>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {sportsForRow.length === 0 ? (
                            <span className="text-slate-500 dark:text-slate-400">-</span>
                          ) : (
                            <div className="flex max-w-[260px] flex-wrap gap-1.5">
                              {visibleSports.map((sportName) => (
                                <span
                                  key={`${tournament.id}-${sportName}`}
                                  className="rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                                >
                                  {sportName}
                                </span>
                              ))}
                              {remainingSports > 0 && (
                                <span
                                  title={sportsForRow.join(", ")}
                                  className="rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-xs text-cyan-700 dark:border-cyan-500/40 dark:bg-cyan-500/10 dark:text-cyan-200"
                                >
                                  +{remainingSports} more
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <div className="inline-flex items-center gap-2 text-slate-700 dark:text-slate-200">
                            <Users size={14} className="text-slate-400 dark:text-slate-500" />
                            <span className="font-semibold">{teamIds.length}</span>
                            <span className="text-slate-500 dark:text-slate-400">teams</span>
                          </div>
                          {teamNames.length > 0 && (
                            <p className="mt-1 max-w-[220px] truncate text-xs text-slate-500 dark:text-slate-400" title={teamNames.join(", ")}>
                              {teamNames.slice(0, 2).join(", ")}
                              {teamNames.length > 2 ? ` +${teamNames.length - 2} more` : ""}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-3 font-medium text-slate-700 dark:text-slate-200">
                          {formatTournamentType(tournament.tournament_type)}
                        </td>
                        <td className="px-3 py-3">
                          <div className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                            <CalendarRange size={14} className="text-slate-400 dark:text-slate-500" />
                            <span>{formatDateRange(tournament)}</span>
                          </div>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {formatScheduleWindow(tournament)}
                          </p>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadge.className}`}>
                            {statusBadge.label}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          {typeof onTournamentSelect === "function" ? (
                            <button
                              type="button"
                              onClick={() => onTournamentSelect(tournament)}
                              className="rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-1.5 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-100 dark:border-cyan-500/40 dark:bg-cyan-500/10 dark:text-cyan-200 dark:hover:bg-cyan-500/20"
                            >
                              Open Intramural
                            </button>
                          ) : (
                            <span className="text-xs text-slate-500 dark:text-slate-400">-</span>
                          )}
                        </td>
                        {!readOnly && (
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => startEdit(tournament)}
                                disabled={isArchivedTournament(tournament)}
                                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                              >
                                Edit
                              </button>
                              {typeof onOpenTournamentSettings === "function" ? (
                                <button
                                  type="button"
                                  onClick={() => onOpenTournamentSettings(tournament)}
                                  disabled={isArchivedTournament(tournament)}
                                  className="rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-1.5 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-100 disabled:opacity-50 dark:border-cyan-500/40 dark:bg-cyan-500/10 dark:text-cyan-200 dark:hover:bg-cyan-500/20"
                                >
                                  Manage Venues
                                </button>
                              ) : null}
                              {canStart && (
                                <button
                                  type="button"
                                  onClick={() => handleStart(tournament)}
                                  className="rounded-lg bg-slate-800 dark:bg-[var(--surface-soft)] px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700 dark:hover:bg-[var(--surface)] disabled:opacity-50"
                                >
                                  Start
                                </button>
                              )}
                              <ActionPopover
                                label="More"
                                buttonClassName="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                                panelClassName="absolute right-0 top-full z-20 mt-1 w-40 rounded-lg border border-slate-200 bg-white p-1 shadow-lg shadow-slate-300/20 dark:border-slate-700 dark:bg-slate-900 dark:shadow-none"
                              >
                                {(closePopover) => (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleArchiveToggle(tournament);
                                        closePopover();
                                      }}
                                      className="w-full rounded-md px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                                    >
                                      {isArchivedTournament(tournament) ? "Restore" : "Archive"}
                                    </button>
                                    {isArchivedTournament(tournament) ? <button
                                      type="button"
                                      onClick={() => {
                                        handleDelete(tournament);
                                        closePopover();
                                      }}
                                      className="w-full rounded-md px-2 py-1.5 text-left text-xs text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/15"
                                    >
                                      Delete
                                    </button> : null}
                                    
                                  </>
                                )}
                              </ActionPopover>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {!readOnly && (
        <AppModal
          open={isEditModalOpen}
          onClose={resetEditState}
          title={`Edit Tournament${
            editingTournament?.tournament_name ? `: ${editingTournament.tournament_name}` : ""
          }`}
          subtitle="Update included departments, sports, and registration target setup."
        >
          <form onSubmit={saveEdit} className="space-y-5">
            <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Basics
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  value={editForm.tournament_name}
                  onChange={(event) =>
                    handleEditFormChange("tournament_name", event.target.value)
                  }
                  placeholder="Tournament Name"
                />
                <select
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  value={editForm.tournament_type}
                  onChange={(event) =>
                    handleEditFormChange("tournament_type", event.target.value)
                  }
                >
                  <option value="">Select Format</option>
                  <option value="round_robin">Round Robin</option>
                  <option value="single_elimination">Single Elimination</option>
                  <option value="double_elimination">Double Elimination</option>
                </select>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <input
                  type="date"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  value={editForm.start_date}
                  onChange={(event) =>
                    handleEditFormChange("start_date", event.target.value)
                  }
                />
                <input
                  type="date"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  value={editForm.end_date}
                  onChange={(event) =>
                    handleEditFormChange("end_date", event.target.value)
                  }
                />
              </div>
            </section>

            <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Included Departments
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                These departments should receive registration targets for the selected sports.
              </p>
              <div className="grid gap-2 md:grid-cols-3">
                {editDepartmentOptions.map((department) => (
                  <label
                    key={department.id}
                    className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
                  >
                    <input
                      type="checkbox"
                      checked={editForm.department_ids.includes(department.id)}
                      onChange={(event) => toggleEditDepartment(department.id, event.target.checked)}
                    />
                    {department.name}
                  </label>
                ))}
              </div>
            </section>

            <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Schedule Policy
              </h3>

              <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={Boolean(editForm.include_evening)}
                  onChange={(event) =>
                    handleIncludeEveningChange(event.target.checked)
                  }
                />
                Include evening schedule
              </label>

              <div className="grid gap-3 md:grid-cols-2">
                <input
                  type="number"
                  min="0"
                  max="23"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  value={editForm.schedule_start_hour}
                  onChange={(event) =>
                    handleEditFormChange("schedule_start_hour", event.target.value)
                  }
                  placeholder="Start hour"
                />
                <input
                  type="number"
                  min="1"
                  max="24"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  value={editForm.schedule_end_hour}
                  onChange={(event) =>
                    handleEditFormChange("schedule_end_hour", event.target.value)
                  }
                  placeholder="End hour"
                />
              </div>
            </section>

            <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Tournament Program
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure opening, lunch, closing, awarding, and custom blocked time windows.
              </p>
              <div className="grid gap-2 md:grid-cols-7">
                <input
                  type="text"
                  value={editProgramDraft.title}
                  onChange={(event) =>
                    setEditProgramDraft((prev) => ({ ...prev, title: event.target.value }))
                  }
                  placeholder="Title"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 md:col-span-2"
                />
                <select
                  value={editProgramDraft.block_type}
                  onChange={(event) =>
                    setEditProgramDraft((prev) => ({ ...prev, block_type: event.target.value }))
                  }
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  {PROGRAM_BLOCK_TYPE_OPTIONS.map((type) => (
                    <option key={type} value={type}>
                      {formatProgramTypeLabel(type)}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={editProgramDraft.date}
                  disabled={editProgramDraft.is_recurring_daily}
                  onChange={(event) =>
                    setEditProgramDraft((prev) => ({ ...prev, date: event.target.value }))
                  }
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
                <input
                  type="time"
                  value={editProgramDraft.start_time}
                  onChange={(event) =>
                    setEditProgramDraft((prev) => ({ ...prev, start_time: event.target.value }))
                  }
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
                <input
                  type="time"
                  value={editProgramDraft.end_time}
                  onChange={(event) =>
                    setEditProgramDraft((prev) => ({ ...prev, end_time: event.target.value }))
                  }
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={handleProgramBlockSave}
                  disabled={programBlockSaving}
                  className="rounded-lg bg-slate-800 dark:bg-[var(--surface-soft)] px-3 py-2 text-sm font-semibold text-white hover:bg-slate-900 dark:hover:bg-[var(--surface)] disabled:opacity-60"
                >
                  {editProgramDraft.id ? "Update" : "Add"}
                </button>
              </div>
              <label className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={Boolean(editProgramDraft.is_recurring_daily)}
                  onChange={(event) =>
                    setEditProgramDraft((prev) => ({
                      ...prev,
                      is_recurring_daily: event.target.checked,
                    }))
                  }
                />
                Repeat daily
              </label>
              <textarea
                value={editProgramDraft.description}
                onChange={(event) =>
                  setEditProgramDraft((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="Description (optional)"
                className="min-h-16 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
              {editProgramBlocks.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">No program blocks configured.</p>
              ) : (
                <ul className="space-y-2">
                  {editProgramBlocks.map((block) => (
                    <li
                      key={`edit-program-block-${block.id}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                    >
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-100">{block.title}</p>
                        <p className="text-slate-500 dark:text-slate-400">
                          {formatProgramTypeLabel(block.block_type)} |{" "}
                          {block.is_recurring_daily ? "Daily" : block.date || "No date"} |{" "}
                          {block.start_time} - {block.end_time}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleProgramBlockEdit(block)}
                          className="rounded border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleProgramBlockDelete(block.id)}
                          className="rounded border border-rose-300 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 dark:border-rose-500/40 dark:text-rose-300"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Sports
              </h3>
              <div className="grid gap-2 md:grid-cols-3">
                {sports.map((sport) => (
                  <label
                    key={sport.id}
                    className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
                  >
                    <input
                      type="checkbox"
                      checked={editForm.sport_ids.includes(sport.id)}
                      onChange={(event) =>
                        toggleEditSport(sport.id, event.target.checked)
                      }
                    />
                    {getSportDisplayName(sport, sportTemplates)}
                  </label>
                ))}
              </div>
            </section>

            {editForm.sport_ids.length > 0 && (
              <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
                <div className="mb-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Event Categories & Entry Rules
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Existing event categories stay preserved. Newly added sports use template defaults when available.
                  </p>
                </div>
                <div className="space-y-4">
                  {sports
                    .filter((sport) => editForm.sport_ids.includes(sport.id))
                    .map((sport) => {
                      const capabilities = resolveSportEventCapabilities(sport, sportTemplates);
                      const setting =
                        (editForm.sport_bracket_settings || []).find((s) => Number(s?.sport_id) === Number(sport.id)) ||
                        buildNormalizedSportBracketSetting({
                          sport,
                          templates: sportTemplates,
                          fallbackBracketFormat: "SINGLE_ELIMINATION",
                          fallbackSeedingMethod: "RANDOM",
                        });
                      const activeEvents = (setting.events || []).filter((eventCategory) => eventCategory?.is_active !== false);
                      const inactiveEvents = (setting.events || []).filter((eventCategory) => eventCategory?.is_active === false);
                      return (
                        <div key={`edit-sport-override-${sport.id}`} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <h5 className="font-semibold text-slate-800 dark:text-slate-100">{getSportDisplayName(sport, sportTemplates)}</h5>
                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                {activeEvents.length} event categor{activeEvents.length === 1 ? "y" : "ies"}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleEditEventAdd(sport.id)}
                              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-500/10 dark:text-slate-200"
                            >
                              <Plus size={14} />
                              Add Event Category
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
                                  <div key={editorKey} className="rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60">
                                    <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
                                      <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                                            {eventCategory.event_name || "New Event Category"}
                                          </p>
                                          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${participantShapeBadgeClass(eventCategory.participant_shape)}`}>
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
                                          className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                                        >
                                          <PencilLine size={14} />
                                          {isExpanded ? "Close" : "Edit"}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleEditEventRemove(sport.id, idx)}
                                          disabled={!canRemove}
                                          className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-white px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-500/30 dark:bg-slate-900 dark:text-rose-300"
                                        >
                                          <Trash2 size={14} />
                                          Remove
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
                                              onChange={(e) => handleEditEventSettingChange(sport.id, idx, "event_name", e.target.value)}
                                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                            />
                                          </label>
                                          <label className="space-y-1">
                                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Division</span>
                                            {capabilities.allowedDivisions.length === 1 ? (
                                              <div className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                                {DIVISION_OPTIONS.find((option) => option.value === capabilities.allowedDivisions[0])?.label || capabilities.allowedDivisions[0]}
                                              </div>
                                            ) : (
                                              <select value={eventCategory.division_category || capabilities.allowedDivisions[0]} onChange={(e) => handleEditEventSettingChange(sport.id, idx, "division_category", e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                                                {DIVISION_OPTIONS.filter((option) => capabilities.allowedDivisions.includes(option.value)).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                              </select>
                                            )}
                                          </label>
                                          <label className="space-y-1">
                                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Competition Type</span>
                                            {capabilities.allowedParticipantShapes.length === 1 ? (
                                              <div className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">{participantShapeLabel(capabilities.allowedParticipantShapes[0])}</div>
                                            ) : (
                                              <select value={eventCategory.participant_shape || capabilities.allowedParticipantShapes[0]} onChange={(e) => handleEditEventSettingChange(sport.id, idx, "participant_shape", e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                                                {capabilities.allowedParticipantShapes.map((shape) => <option key={shape} value={shape}>{participantShapeLabel(shape)}</option>)}
                                              </select>
                                            )}
                                          </label>
                                          <label className="space-y-1">
                                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Entries per Department</span>
                                            <input
                                              type="number"
                                              min="1"
                                              value={eventCategory.max_entries_per_department || ""}
                                              onChange={(e) => handleEditEventSettingChange(sport.id, idx, "max_entries_per_department", e.target.value ? parseInt(e.target.value, 10) : null)}
                                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                            />
                                          </label>
                                          <label className="space-y-1">
                                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Minimum Entries to Start Bracket</span>
                                            <input
                                              type="number"
                                              min="2"
                                              value={eventCategory.minimum_total_entries_for_bracket || ""}
                                              onChange={(e) => handleEditEventSettingChange(sport.id, idx, "minimum_total_entries_for_bracket", e.target.value ? parseInt(e.target.value, 10) : null)}
                                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                            />
                                          </label>
                                          {Array.isArray(sport?.configuration?.bracket_types_allowed) && sport.configuration.bracket_types_allowed.length === 0 ? (
                                            <div className="space-y-1">
                                              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Competition Format</span>
                                              <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200">
                                                Multi-Contestant Race (Stage Progression)
                                              </div>
                                            </div>
                                          ) : (
                                            <label className="space-y-1">
                                              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Bracket Format</span>
                                              <select
                                                value={eventCategory.bracket_format || "SINGLE_ELIMINATION"}
                                                onChange={(e) => handleEditEventSettingChange(sport.id, idx, "bracket_format", e.target.value)}
                                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                              >
                                                <option value="SINGLE_ELIMINATION">Single Elimination</option>
                                                <option value="DOUBLE_ELIMINATION">Double Elimination</option>
                                                <option value="ROUND_ROBIN">Round Robin</option>
                                              </select>
                                            </label>
                                          )}
                                          <label className="space-y-1">
                                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Seeding Method</span>
                                            <select
                                              value={eventCategory.seeding_method || "RANDOM"}
                                              onChange={(e) => handleEditEventSettingChange(sport.id, idx, "seeding_method", e.target.value)}
                                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                            >
                                              <option value="RANDOM">Random Seeding</option>
                                              <option value="MANUAL">Manual Seeding</option>
                                              <option value="PREVIOUS_RANKING">Previous Tournament Ranking</option>
                                              <option value="DEPARTMENT_SEPARATION">Department Separation</option>
                                              <option value="SYSTEM_BALANCED">System-Balanced Seeding</option>
                                            </select>
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
                                  Pending removal on save
                                </p>
                                {inactiveEvents.map((eventCategory, idx) => {
                                  const inactiveIndex = (setting.events || []).findIndex(
                                    (row) => row?.event_key === eventCategory?.event_key && row?.id === eventCategory?.id
                                  );
                                  return (
                                    <div key={`inactive-edit-${buildEventEditorKey(sport.id, eventCategory, idx)}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                                      <span>{eventCategory.event_name}</span>
                                      <button
                                        type="button"
                                        onClick={() => handleEditEventRestore(sport.id, inactiveIndex)}
                                        className="rounded-full border border-amber-300 bg-white px-3 py-1 font-semibold hover:bg-amber-100 dark:border-amber-500/40 dark:bg-slate-900"
                                      >
                                        Undo Remove
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
              </section>
            )}

            <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-500/10">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                    Setup Verification
                  </h3>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    Verify departments and sports, then refresh registration targets if coach assignment reports missing slots or entry pools.
                  </p>
                  <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">
                    Changing event categories may require refreshing registration targets.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRefreshRegistrationTargets}
                  disabled={isRefreshingTargets || !editingTournament?.id}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
                >
                  {isRefreshingTargets ? "Refreshing..." : "Refresh Registration Targets"}
                </button>
              </div>

              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900/70">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Departments</p>
                  <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{editExpectedTargets.departments}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900/70">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Sports</p>
                  <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{editExpectedTargets.sports}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900/70">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Expected Team Slots</p>
                  <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{editExpectedTargets.teamSlots}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900/70">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Expected Individual/Pair Pools</p>
                  <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{editExpectedTargets.entryPools}</p>
                </div>
              </div>

              {summaryMessage.text ? (
                <div className={`rounded-lg border px-3 py-2 text-sm ${summaryMessageClass}`}>
                  {summaryMessage.text}
                </div>
              ) : null}

              {summaryLoading ? (
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
                  Loading registration target summary...
                </div>
              ) : summaryError ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                  {summaryError}
                </div>
              ) : registrationTargetSummary ? (
                <div className="space-y-3">
                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900/70">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Actual Team Slots</p>
                      <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{registrationTargetSummary.actual_team_slots}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900/70">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Missing Team Slots</p>
                      <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{registrationTargetSummary.missing_team_slot_count}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900/70">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Actual Individual/Pair Pools</p>
                      <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{registrationTargetSummary.actual_entry_pools}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900/70">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Missing Individual/Pair Pools</p>
                      <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{registrationTargetSummary.missing_entry_pool_count}</p>
                    </div>
                  </div>
                  <div className={`rounded-lg border px-3 py-2 text-sm ${
                    registrationTargetSummary.setup_complete
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200"
                      : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
                  }`}>
                    {registrationTargetSummary.setup_complete
                      ? "Registration target setup is complete."
                      : "Some registration targets are still missing. Save the updated setup or use Refresh Registration Targets."}
                  </div>
                </div>
              ) : null}
            </section>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={resetEditState}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                disabled={isSavingEdit}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-slate-800 dark:bg-[var(--surface-soft)] px-4 py-2 font-semibold text-white disabled:opacity-60"
                disabled={isSavingEdit}
              >
                {isSavingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </AppModal>
      )}
      

      <AppModal
        open={deleteModalOpen}
        onClose={cancelDelete}
        title={
          deleteLifecycle.archived
            ? "Permanently delete archived tournament?"
            : "Delete Tournament"
        }
        subtitle={deleteTarget ? `Review impact for "${deleteTarget.tournament_name}"` : ""}
      >
        <div className="space-y-4">
          {isDeleting && !deletePreview ? (
            <div className="text-sm text-slate-500">Checking tournament dependencies...</div>
          ) : deletePreview?.error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {deletePreview.error}
            </div>
          ) : deletePreview ? (
            <>
              {deletePreview.has_dependencies ? (
                <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  <div>
                    <p className="font-semibold">This tournament still has linked records.</p>
                    <p className="mt-1">
                      {deleteLifecycle.archived
                        ? "Review the remaining linked data before permanent deletion."
                        : "Archive first if you want to preserve history and avoid accidental data loss."}
                    </p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {deleteDependencyItems.map((item) => (
                      <div key={item.key} className="rounded-lg border border-amber-200 bg-white/70 px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                          {item.label}
                        </p>
                        <p className="mt-1 text-base font-bold text-amber-900">{item.count}</p>
                      </div>
                    ))}
                  </div>
                  {deleteLifecycle.archived && !deleteLifecycle.canDelete ? (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                      Permanent delete stays locked until those linked records are removed.
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  <p>
                    {deleteLifecycle.archived
                      ? "No dependent records found. This archived tournament can be permanently deleted."
                      : "No dependent records found. This tournament can be deleted."}
                  </p>
                </div>
              )}

              {deleteLifecycle.archived && deleteLifecycle.hasDependencies && isDevEnvironment ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
                  Developer cleanup: `backend/scripts/delete_tournament_test_data.py --tournament-id {deleteTarget?.id} --apply`
                </div>
              ) : null}
              {deleteLifecycle.archived ? (
                <div className="space-y-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                  <p className="font-semibold">
                    This action permanently removes tournament data and cannot be undone.
                  </p>
                  <p>
                    Global users and player accounts will not be deleted.
                  </p>
                  <div className="space-y-2">
                    <label
                      htmlFor="permanent-delete-confirmation"
                      className="block text-xs font-semibold uppercase tracking-wide text-rose-700"
                    >
                      Type <span className="font-mono normal-case">{deleteRequiredConfirmationText}</span> to confirm
                    </label>
                    <input
                      id="permanent-delete-confirmation"
                      type="text"
                      value={deleteConfirmationText}
                      onChange={(event) => setDeleteConfirmationText(event.target.value)}
                      placeholder={deleteRequiredConfirmationText}
                      className="w-full rounded-lg border border-rose-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-rose-500 focus:outline-none dark:border-rose-500/50 dark:bg-slate-900 dark:text-slate-100"
                    />
                    {isDevEnvironment ? (
                      <label className="inline-flex items-center gap-2 text-xs text-rose-700">
                        <input
                          type="checkbox"
                          checked={deleteOrphanTeams}
                          onChange={(event) => setDeleteOrphanTeams(event.target.checked)}
                        />
                        Also delete safe orphan teams (development only)
                      </label>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {deleteModalError ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                  {deleteModalError}
                </div>
              ) : null}

              <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={cancelDelete}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  Cancel
                </button>
                {deleteLifecycle.mode === "ACTIVE_ARCHIVE_RECOMMENDED" && deleteLifecycle.canArchive && (
                  <button
                    type="button"
                    onClick={handleArchiveFromDeleteModal}
                    disabled={isDeleting}
                    className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-500"
                  >
                    {isDeleting ? "Archiving..." : "Archive Tournament"}
                  </button>
                )}
                {/* {deleteLifecycle.archived && deleteLifecycle.canRestore ? (
                  <button
                    type="button"
                    onClick={handleRestoreFromDeleteModal}
                    disabled={isDeleting}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    {isDeleting ? "Restoring..." : "Restore Tournament"}
                  </button>
                ) : null} */}
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={
                    isDeleting ||
                    !deleteLifecycle.canDelete ||
                    (deleteLifecycle.archived && !deleteConfirmationMatches)
                  }
                  title={
                    deleteLifecycle.archived && !deleteConfirmationMatches
                      ? "Type the exact confirmation phrase to enable permanent delete."
                      : deleteLifecycle.canDelete
                      ? "Permanently delete this tournament."
                      : "Permanent delete is blocked while linked records exist."
                  }
                  className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isDeleting ? "Deleting..." : "Delete Permanently"}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </AppModal>
      <AppModal
        open={actionConfirmModal.open}
        onClose={() => {
          if (actionConfirmModal.busy || programBlockSaving) return;
          setActionConfirmModal({
            open: false,
            action: "",
            tournament: null,
            blockId: null,
            targetIds: [],
            title: "",
            message: "",
            busy: false,
            error: "",
          });
        }}
        title={actionConfirmModal.title || "Confirm Action"}
        subtitle="Please confirm this action before proceeding."
        maxWidthClass="max-w-xl"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            {actionConfirmModal.message || "Proceed with this action?"}
          </p>
          {actionConfirmModal.error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {actionConfirmModal.error}
            </div>
          ) : null}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() =>
                setActionConfirmModal({
                  open: false,
                  action: "",
                  tournament: null,
                  blockId: null,
                  targetIds: [],
                  title: "",
                  message: "",
                  busy: false,
                  error: "",
                })
              }
              disabled={actionConfirmModal.busy || programBlockSaving}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={runActionConfirm}
              disabled={actionConfirmModal.busy || programBlockSaving}
              className="rounded-lg bg-slate-800 dark:bg-[var(--surface-soft)] px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 dark:hover:bg-[var(--surface)] disabled:opacity-60"
            >
              {actionConfirmModal.busy || programBlockSaving ? "Processing..." : "Confirm"}
            </button>
          </div>
        </div>
      </AppModal>
    </div>
  );
};

export default TournamentTable;
