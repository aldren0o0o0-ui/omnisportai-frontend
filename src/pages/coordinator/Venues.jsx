import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getSportDisplayName } from "../../utils/tournamentEventCategories";
import {
  MapPin,
  Search,
  CalendarClock,
  PencilLine,
  Archive,
  ArchiveRestore,
  Trash2,
  ChevronRight
} from "lucide-react";
import AppModal from "../../components/common/AppModal";
import ActionMenu from "../../components/common/ActionMenu";
import DataTable from "../../components/common/DataTable";
import PageHeaderCard from "../../components/common/PageHeaderCard";
import {
  createVenueAvailabilitySlot,
  createVenue,
  deleteVenueAvailabilitySlot,
  deleteVenue,
  getVenueAvailability,
  getVenues,
  updateVenue,
  updateVenueActive
} from "../../services/venueService";
import { getSports } from "../../services/sportService";
import { useAuth } from "../../context/AuthContext";

const SURFACE_OPTIONS = [
  { value: "wood", label: "Wood" },
  { value: "concrete", label: "Concrete" },
  { value: "grass", label: "Grass" },
  { value: "synthetic", label: "Synthetic" }
];

const FEATURE_OPTIONS = [
  { key: "basketball_ring", label: "Basketball Ring" },
  { key: "multi_sport_net", label: "Multi-Sport Net" },
  { key: "goal_post", label: "Goal Post" },
  { key: "table_set", label: "Table Set" },
  { key: "swimming_pool", label: "Swimming Pool" },
  { key: "running_track", label: "Running Track" },
  { key: "baseball_diamond", label: "Baseball Diamond" },
  { key: "cricket_pitch", label: "Cricket Pitch" },
  { key: "tennis_court_lines", label: "Tennis Court Lines" },
  { key: "badminton_court_lines", label: "Badminton Court Lines" },
  { key: "volleyball_court_lines", label: "Volleyball Court Lines" },
  { key: "futsal_court_lines", label: "Futsal Court Lines" },
  { key: "gymnastics_area", label: "Gymnastics Area" },
  { key: "bleachers", label: "Bleachers" },
  { key: "locker_room", label: "Locker Room" },
  { key: "first_aid_station", label: "First Aid Station" },
  { key: "scoreboard", label: "Scoreboard" },
  { key: "lighting", label: "Lighting" }
];

const FEATURE_LABELS = FEATURE_OPTIONS.reduce((acc, option) => {
  acc[option.key] = option.label;
  return acc;
}, {});

const CAPABILITY_TO_FEATURE_KEY = {
  hoop: "basketball_ring",
  net: "multi_sport_net",
  goal: "goal_post",
  table: "table_set",
  pool: "swimming_pool",
  track: "running_track",
  diamond: "baseball_diamond",
  pitch: "cricket_pitch",
  tennis_court: "tennis_court_lines",
  badminton_court: "badminton_court_lines",
  volleyball_court: "volleyball_court_lines",
  futsal_court: "futsal_court_lines",
  gymnastics_area: "gymnastics_area",
  bleachers: "bleachers",
  locker_room: "locker_room",
  first_aid: "first_aid_station",
  scoreboard: "scoreboard",
  lighting: "lighting"
};

const CAPABILITY_ALIASES = {
  basketball_ring: "hoop",
  basketball_hoop: "hoop",
  hoop: "hoop",
  ring: "hoop",
  multi_sport_net: "net",
  volleyball_net: "net",
  badminton_net: "net",
  tennis_net: "net",
  net_system: "net",
  net: "net",
  goal_post: "goal",
  goalpost: "goal",
  goal_posts: "goal",
  goal: "goal",
  table_set: "table",
  chess_table: "table",
  tables: "table",
  table: "table",
  swimming_pool: "pool",
  pool_lane: "pool",
  pool: "pool",
  running_track: "track",
  track_lane: "track",
  track: "track",
  baseball_diamond: "diamond",
  diamond: "diamond",
  cricket_pitch: "pitch",
  pitch: "pitch",
  tennis_court_lines: "tennis_court",
  tennis_court: "tennis_court",
  badminton_court_lines: "badminton_court",
  badminton_court: "badminton_court",
  volleyball_court_lines: "volleyball_court",
  volleyball_court: "volleyball_court",
  futsal_court_lines: "futsal_court",
  futsal_court: "futsal_court",
  gymnastics_area: "gymnastics_area",
  bleachers: "bleachers",
  locker_rooms: "locker_room",
  locker_room: "locker_room",
  first_aid_station: "first_aid",
  medical_station: "first_aid",
  first_aid: "first_aid",
  scoreboard: "scoreboard",
  lighting: "lighting",
  lights: "lighting"
};

const buildDefaultForm = () => ({
  name: "",
  location: "",
  capacity: "1",
  is_indoor: false,
  length: "",
  width: "",
  surface_type: "",
  supported_sport_ids: [],
  features: [],
  legacy_capabilities: []
});

const buildDefaultAvailabilityForm = () => ({
  available_date: "",
  start_time: "08:00",
  end_time: "10:00"
});

const normalizeToken = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const normalizeCapabilityName = (value) => {
  const token = normalizeToken(value);
  if (!token) return "";
  return CAPABILITY_ALIASES[token] || token;
};

const mapCapabilitiesToFeatures = (capabilities) => {
  const selected = new Set();
  (capabilities || []).forEach((row) => {
    const capabilityName = normalizeCapabilityName(row?.name);
    const featureKey = CAPABILITY_TO_FEATURE_KEY[capabilityName];
    if (featureKey) {
      selected.add(featureKey);
    }
  });
  return Array.from(selected);
};

const extractLegacyCapabilities = (capabilities) => {
  const extras = [];
  (capabilities || []).forEach((row) => {
    const rawName = String(row?.name || "").trim();
    const normalizedName = normalizeCapabilityName(rawName);
    if (!rawName || CAPABILITY_TO_FEATURE_KEY[normalizedName]) return;

    extras.push({
      name: rawName,
      quantity: Number.isFinite(Number(row?.quantity))
        ? Math.max(1, Math.trunc(Number(row.quantity)))
        : 1
    });
  });
  return extras;
};

const mapVenueToForm = (venue) => ({
  name: venue?.name || "",
  location: venue?.location || "",
  is_indoor: Boolean(venue?.is_indoor),
  capacity:
    venue?.capacity !== null && venue?.capacity !== undefined
      ? String(venue.capacity)
      : "1",
  length:
    venue?.length !== null && venue?.length !== undefined
      ? String(venue.length)
      : "",
  width:
    venue?.width !== null && venue?.width !== undefined ? String(venue.width) : "",
  surface_type: venue?.surface_type || "",
  supported_sport_ids: Array.isArray(venue?.supported_sport_ids)
    ? venue.supported_sport_ids
        .map((row) => Number.parseInt(String(row), 10))
        .filter((row) => Number.isInteger(row) && row > 0)
    : [],
  features:
    Array.isArray(venue?.features) && venue.features.length > 0
      ? venue.features
      : mapCapabilitiesToFeatures(venue?.capabilities),
  legacy_capabilities: extractLegacyCapabilities(venue?.capabilities)
});

const parsePositiveInt = (value) => {
  const parsed = Number.parseInt(String(value || "").trim(), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
};

const validateVenueForm = (form) => {
  if (!String(form.name || "").trim()) return "Venue name is required.";
  if (!String(form.location || "").trim()) return "Location is required.";
  if (!String(form.surface_type || "").trim()) return "Surface type is required.";
  if (parsePositiveInt(form.capacity) === null) {
    return "Playing Areas must be a whole number greater than or equal to 1.";
  }
  return null;
};

const buildVenuePayload = (form) => {
  const payload = {
    name: String(form.name || "").trim(),
    location: String(form.location || "").trim(),
    capacity: parsePositiveInt(form.capacity) || 1,
    is_indoor: Boolean(form.is_indoor),
    surface_type: String(form.surface_type || "").trim().toLowerCase(),
    supported_sport_ids: Array.isArray(form.supported_sport_ids)
      ? form.supported_sport_ids
          .map((row) => Number.parseInt(String(row), 10))
          .filter((row) => Number.isInteger(row) && row > 0)
      : []
  };
  return payload;
};

const formatFeatureLabel = (featureKey) => {
  if (FEATURE_LABELS[featureKey]) return FEATURE_LABELS[featureKey];
  return String(featureKey || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const summarizeSuggestion = (row) => {
  const hardFailures = Array.isArray(row?.hard_failures) ? row.hard_failures : [];
  if (hardFailures.length > 0) return hardFailures[0];

  const reasons = Array.isArray(row?.reasons) ? row.reasons : [];
  if (reasons.length > 0) return reasons[0];

  return "Review venue support settings and scheduling constraints.";
};

const formatSlotDate = (value) => {
  if (!value) return "-";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
};

const normalizeSlotTime = (value) => String(value || "").slice(0, 5);

const VenueFormModal = ({
  open,
  title,
  submitLabel,
  form,
  setForm,
  availableSports = [],
  onSubmit,
  onClose,
  submitting
}) => {
  if (!open) return null;

  const normalizedSurface = String(form.surface_type || "").trim().toLowerCase();
  const hasKnownSurface = SURFACE_OPTIONS.some(
    (option) => option.value === normalizedSurface
  );
  const surfaceOptions = hasKnownSurface || !normalizedSurface
    ? SURFACE_OPTIONS
    : [
        {
          value: normalizedSurface,
          label: `${formatFeatureLabel(normalizedSurface)} (Current)`
        },
        ...SURFACE_OPTIONS
      ];

  const toggleSupportedSport = (sportId) => {
    setForm((prev) => {
      const current = new Set(prev.supported_sport_ids || []);
      if (current.has(sportId)) {
        current.delete(sportId);
      } else {
        current.add(sportId);
      }
      return { ...prev, supported_sport_ids: Array.from(current) };
    });
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-3xl max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-2xl dark:border-slate-700 dark:bg-[var(--surface)]"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{title}</h2>

        <form onSubmit={onSubmit} className="mt-5 space-y-5">
          <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-950/30">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Venue Details
            </h3>
            <div className="grid gap-3">
              <input
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                placeholder="Venue Name"
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
              <input
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                placeholder="Location"
                value={form.location}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, location: event.target.value }))
                }
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <input
                type="number"
                min="1"
                step="1"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                placeholder="Playing Areas"
                value={form.capacity}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, capacity: event.target.value }))
                }
              />
              <select
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                value={form.surface_type}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, surface_type: event.target.value }))
                }
              >
                <option value="">Select Surface Type</option>
                {surfaceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              How many matches can be played in this venue at the same time?
              Examples: Basketball Court = 1, Chess Room = 10, Badminton Hall = 4.
            </p>

            <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={Boolean(form.is_indoor)}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, is_indoor: event.target.checked }))
                }
              />
              Indoor Venue
            </label>
          </section>

          <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-950/30">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Supported Sports
            </h3>
            {availableSports.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No active sports found.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {availableSports.map((sport) => {
                  const sportId = Number.parseInt(String(sport.id), 10);
                  const checked = (form.supported_sport_ids || []).includes(sportId);
                  return (
                    <label
                      key={`supported-sport-${sportId}`}
                      className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${
                        checked
                          ? "border-blue-400 bg-blue-50 text-blue-700 dark:border-blue-500/50 dark:bg-blue-500/10 dark:text-blue-200"
                          : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-600"
                      }`}
                    >
                      <span>{getSportDisplayName(sport, "Unassigned sport")}</span>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSupportedSport(sportId)}
                        className="h-4 w-4"
                      />
                    </label>
                  );
                })}
              </div>
            )}
          </section>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="min-h-10 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-10 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={submitting}
            >
              {submitting ? "Saving..." : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Venues = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { roleNames } = useAuth();
  const canManageVenues = Array.isArray(roleNames) && roleNames.includes("SPORTS_COORDINATOR");
  const roleBasePath = location.pathname.startsWith("/department")
    ? "/department"
    : location.pathname.startsWith("/sport-facilitator")
      ? "/sport-facilitator"
      : location.pathname.startsWith("/coach")
        ? "/coach"
        : location.pathname.startsWith("/viewer")
          ? "/viewer"
          : "/coordinator";
  const [venues, setVenues] = useState([]);
  const [sports, setSports] = useState([]);
  const [sportsLoading, setSportsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sportFilter, setSportFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [detailVenueId, setDetailVenueId] = useState(null);

  const [createForm, setCreateForm] = useState(buildDefaultForm());
  const [editForm, setEditForm] = useState(buildDefaultForm());
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingVenueId, setEditingVenueId] = useState(null);
  const [latestCreation, setLatestCreation] = useState(null);
  const [availabilityByVenueId, setAvailabilityByVenueId] = useState({});
  const [availabilityLoadingByVenueId, setAvailabilityLoadingByVenueId] = useState({});
  const [availabilitySavingByVenueId, setAvailabilitySavingByVenueId] = useState({});
  const [availabilityFormByVenueId, setAvailabilityFormByVenueId] = useState({});
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    type: "",
    venueId: null,
    venueName: "",
    slotId: null,
    busy: false,
    error: "",
  });

  const loadVenues = async () => {
    setLoading(true);
    try {
      const data = await getVenues(true);
      setVenues(Array.isArray(data) ? data : []);
    } catch (error) {
      setMessage(error?.response?.data?.detail || "Failed to load venues.");
    } finally {
      setLoading(false);
    }
  };

  const loadSports = async () => {
    setSportsLoading(true);
    try {
      const rows = await getSports();
      const activeSports = (Array.isArray(rows) ? rows : [])
        .filter((row) => String(row?.status || "").toLowerCase() === "active")
        .map((row) => ({
          id: row.id,
          name: row.name || row.sport_name || "Unassigned sport",
          sport_name: row.sport_name || row.name || "Unassigned sport"
        }));
      setSports(activeSports);
    } catch (error) {
      setSports([]);
      setMessage(error?.response?.data?.detail || "Failed to load sports.");
    } finally {
      setSportsLoading(false);
    }
  };

  useEffect(() => {
    loadVenues();
    loadSports();
  }, []);

  const locationOptions = useMemo(() => {
    const seen = new Set();
    venues.forEach((venue) => {
      const location = String(venue?.location || "").trim();
      if (location) seen.add(location);
    });
    return Array.from(seen).sort((a, b) => a.localeCompare(b));
  }, [venues]);

  const filteredVenues = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const sportId = sportFilter === "all" ? null : Number.parseInt(sportFilter, 10);

    return venues.filter((venue) => {
      if (statusFilter === "active" && !venue.is_active) return false;
      if (statusFilter === "inactive" && venue.is_active) return false;

      if (typeFilter === "indoor" && !venue.is_indoor) return false;
      if (typeFilter === "outdoor" && venue.is_indoor) return false;

      if (locationFilter !== "all" && String(venue?.location || "") !== locationFilter) {
        return false;
      }

      if (sportId) {
        const supported = Array.isArray(venue?.supported_sports) ? venue.supported_sports : [];
        if (!supported.some((sport) => Number(sport.id) === sportId)) return false;
      }

      if (term) {
        const haystack = `${venue?.name || ""} ${venue?.location || ""}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }

      return true;
    });
  }, [venues, searchTerm, statusFilter, typeFilter, sportFilter, locationFilter]);

  const ensureAvailabilityForm = (venueId) => {
    setAvailabilityFormByVenueId((prev) => {
      if (prev[venueId]) return prev;
      return { ...prev, [venueId]: buildDefaultAvailabilityForm() };
    });
  };

  const loadAvailabilitySlots = async (venueId, force = false) => {
    const hasCached = Object.prototype.hasOwnProperty.call(
      availabilityByVenueId,
      venueId
    );
    if (!force && hasCached) return;

    setAvailabilityLoadingByVenueId((prev) => ({ ...prev, [venueId]: true }));
    try {
      const data = await getVenueAvailability(venueId);
      setAvailabilityByVenueId((prev) => ({
        ...prev,
        [venueId]: Array.isArray(data) ? data : []
      }));
      ensureAvailabilityForm(venueId);
    } catch (error) {
      setMessage(error?.response?.data?.detail || "Failed to load availability slots.");
    } finally {
      setAvailabilityLoadingByVenueId((prev) => ({ ...prev, [venueId]: false }));
    }
  };

  const openDetailDrawer = async (venueId) => {
    setMessage("");
    setDetailVenueId(venueId);
    ensureAvailabilityForm(venueId);
    await loadAvailabilitySlots(venueId);
  };

  const closeDetailDrawer = () => {
    setDetailVenueId(null);
  };

  const handleAvailabilityFormChange = (venueId, key, value) => {
    setAvailabilityFormByVenueId((prev) => ({
      ...prev,
      [venueId]: {
        ...(prev[venueId] || buildDefaultAvailabilityForm()),
        [key]: value
      }
    }));
  };

  const handleAddAvailabilitySlot = async (venueId) => {
    const form = availabilityFormByVenueId[venueId] || buildDefaultAvailabilityForm();
    if (!form.available_date || !form.start_time || !form.end_time) {
      setMessage("Availability date, start time, and end time are required.");
      return;
    }
    if (form.start_time >= form.end_time) {
      setMessage("Availability start time must be earlier than end time.");
      return;
    }

    setAvailabilitySavingByVenueId((prev) => ({ ...prev, [venueId]: true }));
    try {
      await createVenueAvailabilitySlot(venueId, {
        available_date: form.available_date,
        start_time: form.start_time,
        end_time: form.end_time
      });
      setMessage("Availability slot added successfully.");
      setAvailabilityFormByVenueId((prev) => ({
        ...prev,
        [venueId]: buildDefaultAvailabilityForm()
      }));
      await loadAvailabilitySlots(venueId, true);
    } catch (error) {
      setMessage(error?.response?.data?.detail || "Failed to add availability slot.");
    } finally {
      setAvailabilitySavingByVenueId((prev) => ({ ...prev, [venueId]: false }));
    }
  };

  const handleDeleteAvailabilitySlot = async (venueId, slotId) => {
    setAvailabilitySavingByVenueId((prev) => ({ ...prev, [venueId]: true }));
    try {
      await deleteVenueAvailabilitySlot(venueId, slotId);
      setMessage("Availability slot deleted successfully.");
      setConfirmModal({ open: false, type: "", venueId: null, venueName: "", slotId: null, busy: false, error: "" });
      await loadAvailabilitySlots(venueId, true);
    } catch (error) {
      const modalError = error?.response?.data?.detail || "Failed to delete availability slot.";
      setMessage(modalError);
      setConfirmModal((prev) => ({ ...prev, error: modalError }));
    } finally {
      setAvailabilitySavingByVenueId((prev) => ({ ...prev, [venueId]: false }));
    }
  };

  const openCreateModal = () => {
    setCreateForm(buildDefaultForm());
    setMessage("");
    setCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setCreateModalOpen(false);
  };

  const openEditModal = (venue) => {
    setEditingVenueId(venue.id);
    setEditForm(mapVenueToForm(venue));
    setMessage("");
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditingVenueId(null);
    setEditForm(buildDefaultForm());
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setMessage("");

    const validationError = validateVenueForm(createForm);
    if (validationError) {
      setMessage(validationError);
      return;
    }

    setSaving(true);
    try {
      const response = await createVenue(buildVenuePayload(createForm));
      const supportedSports = Array.isArray(response?.supported_sports)
        ? response.supported_sports
        : [];
      const supportedSportsDetail = Array.isArray(response?.supported_sports_detail)
        ? response.supported_sports_detail
        : [];
      const nearbySports = Array.isArray(response?.nearby_sports)
        ? response.nearby_sports
        : [];
      const schedulerReadiness =
        response?.scheduler_readiness && typeof response.scheduler_readiness === "object"
          ? response.scheduler_readiness
          : null;

      setLatestCreation({
        venueName: response?.venue?.name || createForm.name,
        supportedSports,
        supportedSportsDetail,
        nearbySports,
        schedulerReadiness
      });
      setMessage(response?.message || "Venue created successfully.");
      setCreateModalOpen(false);
      setCreateForm(buildDefaultForm());
      await loadVenues();
    } catch (error) {
      setMessage(error?.response?.data?.detail || "Failed to create venue.");
    } finally {
      setSaving(false);
    }
  };

  const handleEditSave = async (event) => {
    event.preventDefault();
    setMessage("");

    const validationError = validateVenueForm(editForm);
    if (validationError) {
      setMessage(validationError);
      return;
    }

    setSaving(true);
    try {
      await updateVenue(editingVenueId, buildVenuePayload(editForm));
      setMessage("Venue updated successfully.");
      closeEditModal();
      await loadVenues();
    } catch (error) {
      setMessage(error?.response?.data?.detail || "Failed to update venue.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (venue) => {
    const nextState = !venue.is_active;
    setMessage("");
    try {
      await updateVenueActive(venue.id, nextState);
      setConfirmModal({ open: false, type: "", venueId: null, venueName: "", slotId: null, busy: false, error: "" });
      setMessage(`Venue ${nextState ? "activated" : "archived"} successfully.`);
      await loadVenues();
    } catch (error) {
      const modalError = error?.response?.data?.detail || "Failed to update venue status.";
      setMessage(modalError);
      setConfirmModal((prev) => ({ ...prev, error: modalError }));
    }
  };

  const handleDeleteVenue = async (venue) => {
    if (venue?.is_active) {
      setMessage("Only inactive venues can be deleted.");
      return;
    }

    setMessage("");
    try {
      await deleteVenue(venue.id);
      setConfirmModal({ open: false, type: "", venueId: null, venueName: "", slotId: null, busy: false, error: "" });
      setMessage("Venue deleted successfully.");
      await loadVenues();
    } catch (error) {
      const modalError = error?.response?.data?.detail || "Failed to delete venue.";
      setMessage(modalError);
      setConfirmModal((prev) => ({ ...prev, error: modalError }));
    }
  };

  const openConfirmModal = (payload) => {
    setConfirmModal({
      open: true,
      type: payload?.type || "",
      venueId: Number(payload?.venueId || 0) || null,
      venueName: payload?.venueName || "",
      slotId: Number(payload?.slotId || 0) || null,
      busy: false,
      error: "",
    });
  };

  const runConfirmAction = async () => {
    if (confirmModal.busy) return;
    setConfirmModal((prev) => ({ ...prev, busy: true, error: "" }));
    if (confirmModal.type === "delete_slot") {
      await handleDeleteAvailabilitySlot(confirmModal.venueId, confirmModal.slotId);
    } else if (confirmModal.type === "toggle_active") {
      const venue = venues.find((row) => Number(row.id) === Number(confirmModal.venueId));
      if (venue) await handleToggleActive(venue);
    } else if (confirmModal.type === "delete_venue") {
      const venue = venues.find((row) => Number(row.id) === Number(confirmModal.venueId));
      if (venue) await handleDeleteVenue(venue);
    }
    setConfirmModal((prev) => ({ ...prev, busy: false }));
  };

  const detailVenue =
    detailVenueId !== null
      ? venues.find((row) => Number(row.id) === Number(detailVenueId)) || null
      : null;

  return (
    <div className="space-y-6">
      <PageHeaderCard
        icon={MapPin}
        title="Venues"
        breadcrumbs={
          <span className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={() => navigate(`${roleBasePath}/schedules`)}
              className="rounded text-[var(--text-soft)] transition hover:text-[var(--text-main)]"
            >
              Schedule
            </button>
            <ChevronRight size={12} className="text-[var(--text-soft)]" />
            <span className="text-[var(--text-main)]">Venues</span>
          </span>
        }
        action={canManageVenues ? (
          <button
            onClick={openCreateModal}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
          >
            Create Venue
          </button>
        ) : null}
      />

      {message && (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm dark:border-slate-700 dark:bg-[var(--surface)] dark:text-slate-200">
          {message}
        </div>
      )}

      {latestCreation && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200">
          <p className="font-semibold">Venue created: {latestCreation.venueName}</p>

          {latestCreation.schedulerReadiness && (
            <p className="mt-2 text-emerald-700 dark:text-emerald-300">
              Scheduler readiness:{" "}
              <span className="font-semibold">
                {latestCreation.schedulerReadiness.is_ready ? "Ready" : "Needs Improvement"}
              </span>
              {latestCreation.schedulerReadiness.recommended_slot_minutes && (
                <>
                  {" "}
                  | Suggested slot length:{" "}
                  <span className="font-semibold">
                    {latestCreation.schedulerReadiness.recommended_slot_minutes} mins
                  </span>
                </>
              )}
            </p>
          )}

          {latestCreation.supportedSportsDetail?.length > 0 ? (
            <div className="mt-2">
              <p className="text-emerald-700 dark:text-emerald-300">Supported sports:</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {latestCreation.supportedSportsDetail.map((sportRow) => (
                  <div
                    key={sportRow.sport_id || sportRow.sport_name}
                    className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs dark:border-emerald-500/40 dark:bg-emerald-500/10"
                  >
                    <p className="font-semibold text-emerald-800 dark:text-emerald-200">
                      {getSportDisplayName(sportRow)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-2 text-emerald-700 dark:text-emerald-300">
              No supported sports selected yet. Select at least one sport to make this
              venue schedulable.
            </p>
          )}

          {(() => {
            // Only show near-match recommendations when:
            //  - There are items returned from the backend
            //  - None of those items are purely dimension warnings
            //    (dimension warnings are already suppressed server-side, but guard here too)
            const DIMENSION_WARNINGS = [
              "Venue length is required but missing.",
              "Venue width is required but missing.",
              "Venue length not specified",
              "Venue width not specified",
            ];
            const isDimensionOnlyItem = (sportRow) => {
              const failures = Array.isArray(sportRow?.hard_failures) ? sportRow.hard_failures : [];
              if (!failures.length) return false;
              return failures.every((f) =>
                DIMENSION_WARNINGS.some((w) => String(f).toLowerCase().includes(w.toLowerCase()))
              );
            };
            const meaningfulNearby = (latestCreation.nearbySports || []).filter(
              (row) => !isDimensionOnlyItem(row)
            );

            if (meaningfulNearby.length === 0) return null;

            return (
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-700 dark:border-slate-600/40 dark:bg-slate-700/20 dark:text-slate-300">
                <p className="font-semibold text-slate-800 dark:text-slate-200">Recommendations</p>
                <div className="mt-2 space-y-2">
                  {meaningfulNearby.map((sportRow) => (
                    <div
                      key={`near-${sportRow.sport_id || sportRow.sport_name}`}
                      className="rounded border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-600/30 dark:bg-slate-800"
                    >
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {getSportDisplayName(sportRow)}
                      </p>
                      <p className="mt-1 text-slate-600 dark:text-slate-400">{summarizeSuggestion(sportRow)}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      <div className="border border-slate-200 bg-white dark:border-slate-800 dark:bg-[var(--surface)]">
        <div className="flex flex-wrap items-center gap-2 p-4">
          <label className="relative min-w-[200px] flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search venue or location..."
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 dark:border-[var(--border-soft)] dark:bg-[var(--surface-soft)] dark:text-slate-100"
            />
          </label>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-[var(--border-soft)] dark:bg-[var(--surface-soft)] dark:text-slate-200"
            aria-label="Filter by status"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-[var(--border-soft)] dark:bg-[var(--surface-soft)] dark:text-slate-200"
            aria-label="Filter by type"
          >
            <option value="all">All Types</option>
            <option value="indoor">Indoor</option>
            <option value="outdoor">Outdoor</option>
          </select>

          <select
            value={sportFilter}
            onChange={(event) => setSportFilter(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-[var(--border-soft)] dark:bg-[var(--surface-soft)] dark:text-slate-200"
            aria-label="Filter by sport"
          >
            <option value="all">All Sports</option>
            {sports.map((sport) => (
              <option key={`sport-filter-${sport.id}`} value={String(sport.id)}>
                {getSportDisplayName(sport)}
              </option>
            ))}
          </select>

          <select
            value={locationFilter}
            onChange={(event) => setLocationFilter(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-[var(--border-soft)] dark:bg-[var(--surface-soft)] dark:text-slate-200"
            aria-label="Filter by location"
          >
            <option value="all">All Locations</option>
            {locationOptions.map((location) => (
              <option key={`location-filter-${location}`} value={location}>
                {location}
              </option>
            ))}
          </select>
        </div>

        <DataTable
          isLoading={loading}
          loadingMessage="Loading venues..."
          data={filteredVenues}
          keyExtractor={(venue) => venue.id}
          emptyState={
            <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
              No venues found.
            </div>
          }
          columns={[
            {
              header: "Venue",
              accessor: "name",
              render: (venue) => (
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {venue.name || "Unnamed venue"}
                  </p>
                  <p className="text-xs capitalize text-slate-500 dark:text-slate-400">
                    {venue.surface_type ? `Surface: ${venue.surface_type}` : "Surface: -"}
                  </p>
                </div>
              )
            },
            {
              header: "Location",
              accessor: "location",
              render: (venue) => venue.location || "-"
            },
            {
              header: "Type",
              accessor: "is_indoor",
              render: (venue) => (
                <span className="inline-flex rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {venue.is_indoor ? "Indoor" : "Outdoor"}
                </span>
              )
            },
            {
              header: "Supported Sports",
              accessor: "supported_sports",
              render: (venue) => {
                const supported = Array.isArray(venue?.supported_sports)
                  ? venue.supported_sports
                  : [];
                if (supported.length === 0) {
                  return <span className="text-xs text-amber-600 dark:text-amber-300">None</span>;
                }
                const [first, ...rest] = supported;
                const fullList = supported
                  .map((sport) => sport.name || "Unassigned sport")
                  .join(", ");
                return (
                  <span
                    title={fullList}
                    className="inline-flex items-center gap-1 whitespace-nowrap"
                  >
                    <span className="rounded-full border border-blue-300 bg-blue-50 px-2.5 py-1 text-xs text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-200">
                      {first.name || "Unassigned sport"}
                    </span>
                    {rest.length > 0 && (
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        +{rest.length}
                      </span>
                    )}
                  </span>
                );
              }
            },
            {
              header: "Playing Areas",
              accessor: "capacity",
              render: (venue) => venue.capacity || 1
            },
            {
              header: "Status",
              accessor: "is_active",
              render: (venue) => (
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                    venue.is_active
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                  }`}
                >
                  {venue.is_active ? "Active" : "Inactive"}
                </span>
              )
            },
            {
              header: "Action",
              accessor: "id",
              className: "text-right",
              cellClassName: "text-right",
              render: (venue) => {
                const venueName = venue.name || "Unnamed venue";
                return (
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openDetailDrawer(venue.id)}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-500"
                    >
                      {canManageVenues ? "Manage" : "View"}
                    </button>
                    {canManageVenues ? <ActionMenu
                      buttonLabel=""
                      buttonClassName="inline-flex items-center rounded-lg border border-slate-300 bg-white p-2 text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                      items={[
                        {
                          key: "availability",
                          label: "Manage Availability",
                          icon: CalendarClock,
                          onClick: () => openDetailDrawer(venue.id)
                        },
                        {
                          key: "edit",
                          label: "Edit",
                          icon: PencilLine,
                          onClick: () => openEditModal(venue)
                        },
                        {
                          key: "toggle",
                          label: venue.is_active ? "Archive" : "Activate",
                          icon: venue.is_active ? Archive : ArchiveRestore,
                          onClick: () =>
                            openConfirmModal({
                              type: "toggle_active",
                              venueId: venue.id,
                              venueName
                            })
                        },
                        !venue.is_active && {
                          key: "delete",
                          label: "Delete",
                          icon: Trash2,
                          danger: true,
                          onClick: () =>
                            openConfirmModal({
                              type: "delete_venue",
                              venueId: venue.id,
                              venueName
                            })
                        }
                      ]}
                    /> : null}
                  </div>
                );
              }
            }
          ]}
        />
      </div>

      <AppModal
        open={Boolean(detailVenue)}
        onClose={closeDetailDrawer}
        variant="drawer"
        title={detailVenue?.name || "Venue Details"}
        subtitle={detailVenue?.location || ""}
      >
        {detailVenue && (() => {
          const supportedSports = Array.isArray(detailVenue?.supported_sports)
            ? detailVenue.supported_sports
            : [];
          const availabilitySlots = availabilityByVenueId[detailVenue.id] || [];
          const availabilityLoading = Boolean(availabilityLoadingByVenueId[detailVenue.id]);
          const availabilitySaving = Boolean(availabilitySavingByVenueId[detailVenue.id]);
          const availabilityForm =
            availabilityFormByVenueId[detailVenue.id] || buildDefaultAvailabilityForm();
          const hasDimensions =
            (detailVenue.length !== null && detailVenue.length !== undefined && detailVenue.length !== "") ||
            (detailVenue.width !== null && detailVenue.width !== undefined && detailVenue.width !== "");

          return (
            <div className="space-y-6 p-5 md:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                    detailVenue.is_active
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                  }`}
                >
                  {detailVenue.is_active ? "Active" : "Inactive"}
                </span>
                {canManageVenues ? <button
                  type="button"
                  onClick={() => openEditModal(detailVenue)}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <PencilLine size={15} />
                  Edit
                </button> : <span className="text-xs font-semibold text-[var(--text-muted)]">View only</span>}
              </div>

              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  General Information
                </h3>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div>
                    <dt className="text-xs text-slate-500 dark:text-slate-400">Location</dt>
                    <dd className="text-slate-800 dark:text-slate-200">{detailVenue.location || "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500 dark:text-slate-400">Type</dt>
                    <dd className="text-slate-800 dark:text-slate-200">
                      {detailVenue.is_indoor ? "Indoor" : "Outdoor"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500 dark:text-slate-400">Surface</dt>
                    <dd className="capitalize text-slate-800 dark:text-slate-200">
                      {detailVenue.surface_type || "-"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500 dark:text-slate-400">Playing Areas</dt>
                    <dd className="text-slate-800 dark:text-slate-200">{detailVenue.capacity || 1}</dd>
                  </div>
                  {hasDimensions && (
                    <div>
                      <dt className="text-xs text-slate-500 dark:text-slate-400">Dimensions</dt>
                      <dd className="text-slate-800 dark:text-slate-200">
                        {detailVenue.length || "?"} × {detailVenue.width || "?"}
                      </dd>
                    </div>
                  )}
                </dl>
              </section>

              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  Supported Sports
                </h3>
                <div className="flex flex-wrap gap-2">
                  {supportedSports.length > 0 ? (
                    supportedSports.map((sport) => (
                      <span
                        key={`detail-sport-${detailVenue.id}-${sport.id}`}
                        className="rounded-full border border-blue-300 bg-blue-50 px-2.5 py-1 text-xs text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-200"
                      >
                        {getSportDisplayName(sport, "Unassigned sport")}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-amber-600 dark:text-amber-300">
                      No supported sports selected. Venue is not schedulable.
                    </span>
                  )}
                </div>
              </section>

              <section className="space-y-3">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    Availability
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    The auto scheduler will only assign this venue inside the slots below.
                  </p>
                </div>

                {canManageVenues ? <div className="grid gap-2 sm:grid-cols-[1fr_120px_120px_auto]">
                  <input
                    type="date"
                    value={availabilityForm.available_date}
                    onChange={(event) =>
                      handleAvailabilityFormChange(
                        detailVenue.id,
                        "available_date",
                        event.target.value
                      )
                    }
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                  <input
                    type="time"
                    value={availabilityForm.start_time}
                    onChange={(event) =>
                      handleAvailabilityFormChange(
                        detailVenue.id,
                        "start_time",
                        event.target.value
                      )
                    }
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                  <input
                    type="time"
                    value={availabilityForm.end_time}
                    onChange={(event) =>
                      handleAvailabilityFormChange(
                        detailVenue.id,
                        "end_time",
                        event.target.value
                      )
                    }
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddAvailabilitySlot(detailVenue.id)}
                    disabled={availabilitySaving}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {availabilitySaving ? "Saving..." : "Add Slot"}
                  </button>
                </div> : null}

                <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/40">
                  {availabilityLoading ? (
                    <div className="px-3 py-3 text-sm text-slate-500 dark:text-slate-400">
                      Loading availability slots...
                    </div>
                  ) : availabilitySlots.length === 0 ? (
                    <div className="px-3 py-3 text-sm text-slate-500 dark:text-slate-400">
                      No slots configured. Scheduler can use default schedule hours for this venue.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-200 dark:divide-slate-800">
                      {availabilitySlots.map((slot) => (
                        <div
                          key={slot.id}
                          className="flex flex-wrap items-center justify-between gap-2 px-3 py-3"
                        >
                          <div className="text-sm text-slate-700 dark:text-slate-200">
                            <span className="font-medium">
                              {formatSlotDate(slot.available_date)}
                            </span>
                            <span className="mx-2 text-slate-400 dark:text-slate-600">|</span>
                            <span>
                              {normalizeSlotTime(slot.start_time)} -{" "}
                              {normalizeSlotTime(slot.end_time)}
                            </span>
                          </div>
                          {canManageVenues ? <button
                            type="button"
                            onClick={() =>
                              openConfirmModal({
                                type: "delete_slot",
                                venueId: detailVenue.id,
                                slotId: slot.id,
                                venueName: detailVenue.name || "Unnamed venue",
                              })
                            }
                            disabled={availabilitySaving}
                            className="rounded bg-rose-700 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Delete
                          </button> : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>
          );
        })()}
      </AppModal>

      {canManageVenues ? <VenueFormModal
        open={createModalOpen}
        title="Create Venue"
        submitLabel="Create"
        form={createForm}
        setForm={setCreateForm}
        availableSports={sportsLoading ? [] : sports}
        onSubmit={handleCreate}
        onClose={closeCreateModal}
        submitting={saving}
      /> : null}

      {canManageVenues ? <VenueFormModal
        open={editModalOpen}
        title={editingVenueId ? "Edit Venue" : "Edit Venue"}
        submitLabel="Save Changes"
        form={editForm}
        setForm={setEditForm}
        availableSports={sportsLoading ? [] : sports}
        onSubmit={handleEditSave}
        onClose={closeEditModal}
        submitting={saving}
      /> : null}
      {canManageVenues ? <AppModal
        open={confirmModal.open}
        onClose={() => {
          if (confirmModal.busy) return;
          setConfirmModal({ open: false, type: "", venueId: null, venueName: "", slotId: null, busy: false, error: "" });
        }}
        title={
          confirmModal.type === "delete_slot"
            ? "Delete Availability Slot"
            : confirmModal.type === "delete_venue"
            ? "Delete Venue"
            : "Update Venue Status"
        }
        subtitle={
          confirmModal.type === "delete_slot"
            ? "This removes the selected venue availability window."
            : confirmModal.type === "delete_venue"
            ? "This action permanently deletes the inactive venue."
            : "Activate or archive this venue."
        }
        maxWidthClass="max-w-xl"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            {confirmModal.type === "delete_slot"
              ? "Delete this availability slot?"
              : confirmModal.type === "delete_venue"
              ? `Delete "${confirmModal.venueName || "Unnamed venue"}" permanently? This cannot be undone.`
              : "Apply this venue status change?"}
          </p>
          {confirmModal.error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
              {confirmModal.error}
            </div>
          ) : null}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmModal({ open: false, type: "", venueId: null, venueName: "", slotId: null, busy: false, error: "" })}
              disabled={confirmModal.busy}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={runConfirmAction}
              disabled={confirmModal.busy}
              className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${
                confirmModal.type === "toggle_active" ? "bg-blue-600 hover:bg-blue-500" : "bg-rose-600 hover:bg-rose-500"
              }`}
            >
              {confirmModal.busy ? "Processing..." : "Confirm"}
            </button>
          </div>
        </div>
      </AppModal> : null}
    </div>
  );
};

export default Venues;
