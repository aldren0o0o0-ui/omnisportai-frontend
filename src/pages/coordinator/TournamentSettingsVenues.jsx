import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarRange, RefreshCcw, Save, Settings2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import PageHeaderCard from "../../components/common/PageHeaderCard";
import SectionTabs from "../../components/common/SectionTabs";
import LoadingState from "../../components/common/LoadingState";
import { getSports } from "../../services/sportService";
import {
  getTournamentVenueAvailabilityPreview,
  getTournamentVenues,
  getTournaments,
  replaceTournamentVenues,
} from "../../services/tournamentService";
import { getVenues } from "../../services/venueService";
import { useWorkspace } from "../../context/WorkspaceContext";

const toIntList = (value) => {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((entry) => Number(entry))
        .filter((entry) => Number.isInteger(entry) && entry > 0)
    )
  );
};

const normalizeVenueName = (venue) =>
  String(venue?.name || venue?.venue_name || `Venue #${venue?.id || "-"}`);

const formatPreviewTime = (value) => {
  if (!value) return "Time unavailable";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const TABS = [{ id: "venues", label: "Venues" }];

const TournamentSettingsVenues = () => {
  const navigate = useNavigate();
  const { tournamentId: tournamentIdParam } = useParams();
  const tournamentId = Number(tournamentIdParam || 0);
  const { selectedIntramural } = useWorkspace();
  const selectedWorkspaceId = selectedIntramural?.id ?? null;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  const [tournament, setTournament] = useState(null);
  const [sports, setSports] = useState([]);
  const [venues, setVenues] = useState([]);

  const [initialVenueIds, setInitialVenueIds] = useState([]);
  const [selectedVenueIds, setSelectedVenueIds] = useState([]);

  const [showOnlyActive, setShowOnlyActive] = useState(true);
  const [showOnlyCompatible, setShowOnlyCompatible] = useState(true);
  const [search, setSearch] = useState("");

  const [preview, setPreview] = useState(null);
  const [previewBusy, setPreviewBusy] = useState(false);

  const [activeTab, setActiveTab] = useState("venues");

  const selectedSportIds = useMemo(
    () => toIntList(tournament?.sport_ids || [tournament?.sport_id]),
    [tournament]
  );

  const sportNameById = useMemo(() => {
    const map = new Map();
    sports.forEach((sport) => {
      const id = Number(sport?.id || 0);
      if (!id) return;
      map.set(id, String(sport?.sport_name || sport?.name || `Sport #${id}`));
    });
    return map;
  }, [sports]);

  const normalizedVenues = useMemo(
    () =>
      (Array.isArray(venues) ? venues : []).map((venue) => ({
        ...venue,
        id: Number(venue?.id || 0),
        venueLabel: normalizeVenueName(venue),
        supportedSportIds: toIntList(venue?.supported_sport_ids),
      })),
    [venues]
  );

  const selectedSportIdSet = useMemo(() => new Set(selectedSportIds), [selectedSportIds]);

  const compatibilityByVenueId = useMemo(() => {
    const map = new Map();
    normalizedVenues.forEach((venue) => {
      const supportedIds = toIntList(venue?.supportedSportIds);
      const overlap = supportedIds.filter((sportId) => selectedSportIdSet.has(sportId));
      map.set(venue.id, {
        compatible: selectedSportIdSet.size === 0 ? true : overlap.length > 0,
        overlap,
      });
    });
    return map;
  }, [normalizedVenues, selectedSportIdSet]);

  const filteredVenues = useMemo(() => {
    const keyword = String(search || "").trim().toLowerCase();
    return normalizedVenues.filter((venue) => {
      if (!venue.id) return false;
      if (showOnlyActive && !venue?.is_active) return false;
      const compatibility = compatibilityByVenueId.get(venue.id);
      if (showOnlyCompatible && selectedSportIds.length > 0 && !compatibility?.compatible) return false;
      if (!keyword) return true;
      return (
        venue.venueLabel.toLowerCase().includes(keyword) ||
        String(venue?.location || "").toLowerCase().includes(keyword)
      );
    });
  }, [
    compatibilityByVenueId,
    normalizedVenues,
    search,
    selectedSportIds.length,
    showOnlyActive,
    showOnlyCompatible,
  ]);

  const selectedVenueSet = useMemo(() => new Set(toIntList(selectedVenueIds)), [selectedVenueIds]);

  const selectedVenues = useMemo(
    () => normalizedVenues.filter((venue) => selectedVenueSet.has(Number(venue.id))),
    [normalizedVenues, selectedVenueSet]
  );

  const isDirty = useMemo(() => {
    const current = toIntList(selectedVenueIds).join(",");
    const initial = toIntList(initialVenueIds).join(",");
    return current !== initial;
  }, [initialVenueIds, selectedVenueIds]);

  const reloadPageData = useCallback(async () => {
    if (!tournamentId) return;
    setIsLoading(true);
    setStatus({ type: "", message: "" });
    try {
      const [tournamentsData, sportsData, venuesData, assignmentData] = await Promise.all([
        getTournaments(selectedWorkspaceId ? { workspaceId: selectedWorkspaceId } : {}),
        getSports(),
        getVenues(true),
        getTournamentVenues(tournamentId),
      ]);
      const tournamentRow = (Array.isArray(tournamentsData) ? tournamentsData : []).find(
        (row) => Number(row?.id) === tournamentId
      );
      if (!tournamentRow) {
        setTournament(null);
        setStatus({ type: "error", message: "Intramural event not found." });
      } else {
        setTournament(tournamentRow);
      }
      setSports(Array.isArray(sportsData) ? sportsData : []);
      setVenues(Array.isArray(venuesData) ? venuesData : []);
      const assignedIds = toIntList(assignmentData?.venue_ids);
      setInitialVenueIds(assignedIds);
      setSelectedVenueIds(assignedIds);
    } catch (error) {
      setStatus({
        type: "error",
        message: error?.response?.data?.detail || "Failed to load tournament venue settings.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedWorkspaceId, tournamentId]);

  useEffect(() => {
    void reloadPageData();
  }, [reloadPageData]);

  const runPreview = useCallback(
    async (candidateVenueIds) => {
      if (!tournamentId) return;
      setPreviewBusy(true);
      try {
        const payloadIds = toIntList(candidateVenueIds);
        const response = await getTournamentVenueAvailabilityPreview(
          tournamentId,
          payloadIds.length > 0 ? payloadIds : null
        );
        setPreview(response || null);
      } catch {
        setPreview(null);
      } finally {
        setPreviewBusy(false);
      }
    },
    [tournamentId]
  );

  useEffect(() => {
    if (!tournamentId) return;
    const handle = window.setTimeout(() => {
      void runPreview(selectedVenueIds);
    }, 250);
    return () => window.clearTimeout(handle);
  }, [runPreview, selectedVenueIds, tournamentId]);

  const toggleVenue = (venueId, checked) => {
    setSelectedVenueIds((prev) => {
      const current = new Set(toIntList(prev));
      if (checked) current.add(Number(venueId));
      else current.delete(Number(venueId));
      return Array.from(current);
    });
  };

  const handleSave = async () => {
    if (!tournamentId) return;
    setIsSaving(true);
    setStatus({ type: "", message: "" });
    try {
      const payloadIds = toIntList(selectedVenueIds);
      const response = await replaceTournamentVenues(tournamentId, payloadIds);
      const nextIds = toIntList(response?.venue_ids || payloadIds);
      setInitialVenueIds(nextIds);
      setSelectedVenueIds(nextIds);
      setStatus({ type: "success", message: "Intramural venues saved." });
    } catch (error) {
      setStatus({
        type: "error",
        message: error?.response?.data?.detail || "Unable to save tournament venues.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const statusToneClass =
    status.type === "error"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : status.type === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-slate-200 bg-slate-50 text-slate-600";

  const conflictRows = Array.isArray(preview?.conflicts) ? preview.conflicts : [];
  const warningRows = Array.isArray(preview?.warnings) ? preview.warnings : [];

  return (
    <div className="os-page-shell">
      <PageHeaderCard
        title="Intramural Venues"
        subtitle={tournament ? `Venue assignment for ${tournament.tournament_name}` : "Manage tournament venue assignment"}
        breadcrumbs=""
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
            onClick={() => navigate("/coordinator/intramurals")}
              className="os-btn-ghost-soft inline-flex items-center gap-1.5"
            >
              <ArrowLeft size={14} />
              Back To Intramurals
            </button>
            {tournament ? (
              <button
                type="button"
                onClick={() => navigate(`/coordinator/schedules?tournament_id=${tournament.id}`)}
                className="os-btn-ghost-soft"
              >
                Open Schedule
              </button>
            ) : null}
          </div>
        }
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
        <div className="grid gap-3 md:grid-cols-3">
          <article className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/40">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Intramural Event</p>
            <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
              {tournament?.tournament_name || "Loading..."}
            </p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/40">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Date Range</p>
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100">
              <CalendarRange size={13} />
              {tournament?.start_date || "TBA"} to {tournament?.end_date || tournament?.start_date || "TBA"}
            </p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/40">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Selected Venues</p>
            <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{selectedVenues.length}</p>
          </article>
        </div>
      </section>

      {status.message ? (
        <section className={`rounded-xl border px-4 py-3 text-sm ${statusToneClass}`}>
          {status.message}
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
        <SectionTabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

        {isLoading ? (
          <LoadingState message="Loading venue settings..." inline />
        ) : (
          <div className="space-y-4">
            {selectedVenueIds.length === 0 ? (
              <article className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                No venues assigned. The scheduler will use all available venues. Assign specific venues below to restrict options, then click Save.
              </article>
            ) : null}

            <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search venues by name or location"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
              <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={showOnlyActive}
                  onChange={(event) => setShowOnlyActive(event.target.checked)}
                />
                Active only
              </label>
              <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={showOnlyCompatible}
                  onChange={(event) => setShowOnlyCompatible(event.target.checked)}
                />
                Compatible only
              </label>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {selectedSportIds.length === 0 ? (
                <span className="rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  No sports linked yet
                </span>
              ) : (
                selectedSportIds.map((sportId) => (
                  <span
                    key={`selected-sport-${sportId}`}
                    className="rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-xs text-cyan-700 dark:border-cyan-500/40 dark:bg-cyan-500/10 dark:text-cyan-200"
                  >
                    {sportNameById.get(sportId) || `Sport #${sportId}`}
                  </span>
                ))
              )}
            </div>

            {filteredVenues.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No venues match this filter.</p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2">
                {filteredVenues.map((venue) => {
                  const checked = selectedVenueSet.has(venue.id);
                  const compatibility = compatibilityByVenueId.get(venue.id);
                  const incompatible = selectedSportIds.length > 0 && !compatibility?.compatible;
                  return (
                    <label
                      key={`settings-venue-${venue.id}`}
                      className={`space-y-1 rounded-xl border px-3 py-2 text-sm ${
                        checked
                          ? "border-cyan-300 bg-cyan-50 dark:border-cyan-500/40 dark:bg-cyan-500/10"
                          : "border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900/70"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-slate-100">{venue.venueLabel}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {venue?.location || "No location"} | Capacity: {venue?.capacity || "N/A"} |{" "}
                            {venue?.is_active ? "Active" : "Inactive"}
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => toggleVenue(venue.id, event.target.checked)}
                        />
                      </div>
                      {incompatible ? (
                        <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                          Not compatible with selected tournament sports.
                        </p>
                      ) : null}
                    </label>
                  );
                })}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 dark:border-slate-700">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {isDirty ? "You have unsaved venue changes." : "All venue changes are saved."}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedVenueIds(toIntList(initialVenueIds));
                    setStatus({ type: "", message: "" });
                  }}
                  disabled={!isDirty || isSaving}
                  className="os-btn-ghost-soft disabled:opacity-50"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => reloadPageData()}
                  disabled={isSaving}
                  className="os-btn-ghost-soft inline-flex items-center gap-1.5"
                >
                  <RefreshCcw size={14} />
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!isDirty || isSaving}
                  className="os-btn-primary-soft inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Save size={14} />
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>

            <section className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/40">
              <div className="flex flex-wrap items-center gap-2">
                  <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100">
                    <Settings2 size={14} />
                  Venue Conflict Check
                  </p>
                {previewBusy ? (
                  <span className="text-xs text-slate-500 dark:text-slate-400">Checking...</span>
                ) : null}
              </div>
              {conflictRows.length === 0 && warningRows.length === 0 ? (
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  No venue capacity or availability conflicts were found. Simultaneous matches that fit within the venue's playing areas are valid.
                </p>
              ) : (
                <div className="mt-2 space-y-2">
                  {warningRows.slice(0, 4).map((warning, index) => (
                    <article
                      key={`preview-warning-${index}`}
                      className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
                    >
                      {String(warning?.message || warning || "Potential venue pressure detected.")}
                    </article>
                  ))}
                  {conflictRows.slice(0, 8).map((conflict, index) => (
                    <article
                      key={`preview-conflict-${index}`}
                      className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
                    >
                      <p className="font-semibold">
                        {conflict?.venue_name || conflict?.details?.venue_name || `Venue #${conflict?.venue_id || "-"}`}
                      </p>
                      {Number(conflict?.concurrent_count) > 0 && Number(conflict?.capacity) > 0 ? (
                        <p className="mt-0.5">
                          {conflict.concurrent_count} simultaneous matches / {conflict.capacity} playing areas. Capacity exceeded by {Math.max(0, Number(conflict.concurrent_count) - Number(conflict.capacity))}.
                        </p>
                      ) : (
                        <p className="mt-0.5">{conflict?.message || "This venue setup conflicts with the current schedule."}</p>
                      )}
                      <p className="mt-0.5 text-rose-700/80 dark:text-rose-200/80">
                        {formatPreviewTime(conflict?.start_time || conflict?.slot)}
                        {Array.isArray(conflict?.affected_match_ids) && conflict.affected_match_ids.length > 0
                          ? ` · Affected matches: ${conflict.affected_match_ids.join(", ")}`
                          : ""}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </section>

          </div>
        )}
      </section>
    </div>
  );
};

export default TournamentSettingsVenues;
