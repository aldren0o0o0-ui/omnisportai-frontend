import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Calendar, Eye, Focus, MapPin, RefreshCcw } from "lucide-react";
import PageHeaderCard from "../common/PageHeaderCard";
import AppModal from "../common/AppModal";
import ScheduleCalendarWorkspace from "./ScheduleCalendarWorkspace";
import useRoleDashboardData from "../../hooks/useRoleDashboardData";
import { getProgramBlocks, getScheduleAnalytics, getScheduleEvents } from "../../services/scheduleService";
import { getVenueAvailability, getVenues } from "../../services/venueService";
import VenueProfilesPanel from "../../pages/coordinator/schedules/VenueProfilesPanel";
import VenueScheduleFilterBar from "./VenueScheduleFilterBar";
import ScheduleEmptyState from "./ScheduleEmptyState";
import { getScheduleParticipantLabel } from "./scheduleWorkflow";
import { getSportLabel, getVenueKey, normalizeEvents } from "./venueScheduleUtils";

const parseHour = (v, fb, min, max) => {
  const p = Number.parseInt(String(v ?? ""), 10);
  if (!Number.isInteger(p)) return fb;
  return p < min || p > max ? fb : p;
};

const toPositiveInt = (v) => {
  const p = Number(v);
  return Number.isFinite(p) && p > 0 ? Math.trunc(p) : 0;
};

const PROGRAM_BLOCK_TYPE_LABELS = {
  OPENING_PROGRAM: "Opening Program",
  LUNCH_BREAK: "Lunch Break",
  CLOSING_CEREMONY: "Closing Ceremony",
  AWARDING: "Awarding",
  PREPARATION: "Preparation",
  MAINTENANCE: "Maintenance",
  CUSTOM: "Program Block",
};

const formatProgramBlockTypeLabel = (v) => PROGRAM_BLOCK_TYPE_LABELS[String(v || "CUSTOM").toUpperCase()] || "Program Block";

const formatPopoverTimeRange = (start, end) => {
  if (!(start instanceof Date) || !(end instanceof Date)) return "Time not set";
  return `${start.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} - ${end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
};

/**
 * Shared schedule page for all roles (viewer, player, coach, department).
 *
 * Props:
 * - pageTitle, pageSubtitle, pageIcon
 * - focusModes: array of { key, label, icon }, resolver function, or null
 * - defaultFocusMode: string key or resolver function
 * - buildScopeFilter: (dashboard) => Set | null — returns a Set of IDs to filter, or null for "show all"
 * - scopeFilterField: "team_ids" | "sport_ids" — which event field(s) to match against
 * - showVenuePanel: boolean
 * - introContent: optional React node rendered below the header
 */
const RoleSchedulePage = ({
  pageTitle = "Schedules & Calendar",
  pageSubtitle = "Read-only schedule view.",
  pageIcon: PageIcon = Calendar,
  focusModes = null,
  defaultFocusMode = "ALL",
  buildScopeFilter = () => null,
  scopeFilterField = "team_ids",
  showVenuePanel = false,
  introContent = null,
}) => {
  const {
    dashboard, tournaments, selectedTournamentId, setSelectedTournamentId,
    minRestMinutes, setMinRestMinutes, loading, error, refresh,
  } = useRoleDashboardData();

  const [scheduleBundle, setScheduleBundle] = useState(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState("");
  const [, setIsScopedFallback] = useState(false);
  const [focusMode, setFocusMode] = useState("ALL");
  const [venues, setVenues] = useState([]);
  const [availabilityByVenueId, setAvailabilityByVenueId] = useState({});
  const [selectedSport, setSelectedSport] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedDate, setSelectedDate] = useState("all");
  const [selectedVenue, setSelectedVenue] = useState("all");
  const [viewMode, setViewMode] = useState("tournament");
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarBlockedWindows, setCalendarBlockedWindows] = useState([]);
  const [hoverPopover, setHoverPopover] = useState(null);
  const [pinnedPopover, setPinnedPopover] = useState(null);
  const [venueDrawerOpen, setVenueDrawerOpen] = useState(false);
  const scheduleLoadRequestRef = useRef(0);
  const schedulePanelRef = useRef(null);

  const selectedTournament = useMemo(
    () => tournaments.find((t) => Number(t.id) === Number(selectedTournamentId)) || null,
    [selectedTournamentId, tournaments]
  );
  const roleDashboardType = String(dashboard?.dashboard_type || "").toUpperCase();
  const canReadVenues = roleDashboardType === "COORDINATOR";
  const canReadProgramBlocks = roleDashboardType === "COORDINATOR";

  const scopeFilter = useMemo(() => buildScopeFilter(dashboard), [buildScopeFilter, dashboard]);
  const resolvedFocusModes = useMemo(
    () => typeof focusModes === "function" ? focusModes(dashboard) : focusModes,
    [dashboard, focusModes]
  );
  const resolvedDefaultFocusMode = useMemo(
    () => typeof defaultFocusMode === "function"
      ? defaultFocusMode(dashboard)
      : defaultFocusMode,
    [dashboard, defaultFocusMode]
  );

  useEffect(() => {
    setFocusMode(resolvedDefaultFocusMode || "ALL");
  }, [resolvedDefaultFocusMode]);

  const fallbackSchedule = useMemo(() => dashboard?.schedule || {}, [dashboard?.schedule]);
  const fallbackScheduleRef = useRef(fallbackSchedule);
  useEffect(() => {
    fallbackScheduleRef.current = fallbackSchedule;
  }, [fallbackSchedule]);

  const loadScheduleData = useCallback(async (tournamentId) => {
    const requestId = scheduleLoadRequestRef.current + 1;
    scheduleLoadRequestRef.current = requestId;
    const tid = Number.parseInt(String(tournamentId || ""), 10);
    if (!Number.isFinite(tid) || tid <= 0) {
      setScheduleBundle(null);
      setCalendarBlockedWindows([]);
      setHoverPopover(null);
      setPinnedPopover(null);
      setScheduleError("");
      setIsScopedFallback(false);
      return;
    }
    setScheduleLoading(true);
    setScheduleError("");
    try {
      const minRest = Number.parseInt(String(minRestMinutes || "30"), 10) || 30;
      const [analyticsResult, eventsResult, blocksResult] = await Promise.allSettled([
        getScheduleAnalytics(tid, minRest),
        getScheduleEvents(tid),
        canReadProgramBlocks ? getProgramBlocks(tid) : Promise.resolve({ blocks: [] }),
      ]);
      if (requestId !== scheduleLoadRequestRef.current) return;
      const analytics = analyticsResult.status === "fulfilled" ? (analyticsResult.value || {}) : null;
      const eventsPayload = eventsResult.status === "fulfilled" ? (eventsResult.value || {}) : null;
      const events = Array.isArray(eventsPayload?.events)
        ? eventsPayload.events
        : Array.isArray(analytics?.events) ? analytics.events : [];
      const blockRowsFromEvents = Array.isArray(eventsPayload?.program_blocks) ? eventsPayload.program_blocks : [];
      const blockRowsFromBlocksApi = blocksResult.status === "fulfilled" && Array.isArray(blocksResult.value?.blocks) ? blocksResult.value.blocks : [];
      const sourceBlocks = blockRowsFromEvents.length > 0 ? blockRowsFromEvents : blockRowsFromBlocksApi;
      const normalizedBlocks = sourceBlocks
        .map((block) => {
          const start = new Date(block?.start);
          const end = new Date(block?.end);
          if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return null;
          return { ...block, title: block?.title || formatProgramBlockTypeLabel(block?.block_type), start, end };
        })
        .filter(Boolean);
      if (!analytics && !eventsPayload) {
        throw analyticsResult.status === "rejected" ? analyticsResult.reason : new Error("Unable to load schedule");
      }
      setScheduleBundle({ ...(analytics || {}), events });
      setCalendarBlockedWindows(normalizedBlocks);
      setIsScopedFallback(false);
    } catch (apiError) {
      if (requestId !== scheduleLoadRequestRef.current) return;
      setScheduleBundle(fallbackScheduleRef.current);
      setCalendarBlockedWindows([]);
      setIsScopedFallback(true);
      setScheduleError(
        apiError?.response?.data?.detail || "Unable to load full tournament schedule right now."
      );
    } finally {
      if (requestId === scheduleLoadRequestRef.current) setScheduleLoading(false);
    }
  }, [canReadProgramBlocks, minRestMinutes]);

  useEffect(() => { void loadScheduleData(selectedTournamentId); }, [loadScheduleData, selectedTournamentId]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!canReadVenues) {
        if (active) setVenues([]);
        return;
      }
      try {
        const data = await getVenues(true);
        if (active) setVenues(Array.isArray(data) ? data : []);
      } catch { if (active) setVenues([]); }
    })();
    return () => { active = false; };
  }, [canReadVenues]);

  const schedule = scheduleBundle || fallbackSchedule;
  const normalizedEvents = useMemo(
    () => normalizeEvents(Array.isArray(schedule?.events) ? schedule.events : []),
    [schedule?.events]
  );

  // Apply role-based scope filtering
  const baseEvents = useMemo(() => {
    if (focusMode === "ALL") return normalizedEvents;
    if (!scopeFilter || scopeFilter.size === 0) return [];
    return normalizedEvents.filter((event) => {
      if (scopeFilterField === "sport_ids") {
        return scopeFilter.has(toPositiveInt(event?.sport_id));
      }
      // team_ids: backend events use a `team_ids` array (e.g. [1, 5])
      const teamIdsArray = Array.isArray(event?.team_ids) ? event.team_ids : [];
      if (teamIdsArray.some((id) => scopeFilter.has(toPositiveInt(id)))) return true;
      // Fallback: also check team1_id / team2_id for compatibility
      const t1 = toPositiveInt(event?.team1_id);
      const t2 = toPositiveInt(event?.team2_id);
      return (t1 > 0 && scopeFilter.has(t1)) || (t2 > 0 && scopeFilter.has(t2));
    });
  }, [focusMode, normalizedEvents, scopeFilter, scopeFilterField]);

  const sportOptions = useMemo(() => {
    const m = new Map();
    normalizedEvents.forEach((e) => { if (e.sportKey && !m.has(e.sportKey)) m.set(e.sportKey, getSportLabel(e.sportKey)); });
    return Array.from(m.entries()).map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [normalizedEvents]);

  const statusOptions = useMemo(() => {
    const s = new Set();
    normalizedEvents.forEach((e) => { const k = String(e.status || "").trim(); if (k) s.add(k); });
    return Array.from(s).map((v) => ({ value: v, label: v })).sort((a, b) => a.label.localeCompare(b.label));
  }, [normalizedEvents]);

  const dateOptions = useMemo(() => {
    const m = new Map();
    normalizedEvents.forEach((e) => {
      const k = String(e.dateKey || "").trim();
      if (k && !m.has(k)) m.set(k, e.start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }));
    });
    return Array.from(m.entries()).map(([value, label]) => ({ value, label })).sort((a, b) => a.value.localeCompare(b.value));
  }, [normalizedEvents]);

  const venueOptions = useMemo(() => {
    const m = new Map();
    normalizedEvents.forEach((e) => { const k = getVenueKey(e); if (!m.has(k)) m.set(k, e.venueLabel); });
    return Array.from(m.entries()).map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [normalizedEvents]);

  const visibleEvents = useMemo(
    () => baseEvents.filter((e) => {
      if (selectedSport !== "all" && e.sportKey !== selectedSport) return false;
      if (selectedStatus !== "all" && String(e.status || "") !== selectedStatus) return false;
      if (selectedDate !== "all" && e.dateKey !== selectedDate) return false;
      if (selectedVenue !== "all" && getVenueKey(e) !== selectedVenue) return false;
      return true;
    }),
    [baseEvents, selectedDate, selectedSport, selectedStatus, selectedVenue]
  );

  const hasActiveFilters = selectedSport !== "all" || selectedStatus !== "all" || selectedDate !== "all" || selectedVenue !== "all";
  const handleClearFilters = useCallback(() => { setSelectedSport("all"); setSelectedStatus("all"); setSelectedDate("all"); setSelectedVenue("all"); }, []);
  const hasAnyScheduledEvents = normalizedEvents.length > 0;
  const hasVisibleScheduledEvents = visibleEvents.length > 0;

  const venuePreview = useMemo(() => {
    const sorted = (Array.isArray(venues) ? venues : []).slice().sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    const scopedEvents = focusMode !== "ALL" ? baseEvents : visibleEvents;
    const activeKeys = new Set(scopedEvents.map((e) => getVenueKey(e)));
    if (activeKeys.size === 0) return sorted;
    return sorted.filter((v) => {
      const byId = v?.id != null ? `id:${v.id}` : "";
      const byName = v?.name ? `name:${String(v.name).trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")}` : "";
      return activeKeys.has(byId) || (byName && activeKeys.has(byName));
    });
  }, [baseEvents, focusMode, venues, visibleEvents]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!canReadVenues) {
        if (active) setAvailabilityByVenueId({});
        return;
      }
      const preview = (Array.isArray(venuePreview) ? venuePreview : []).slice(0, 8);
      if (preview.length === 0) { setAvailabilityByVenueId({}); return; }
      const results = await Promise.allSettled(preview.map((v) => getVenueAvailability(v.id)));
      if (!active) return;
      const next = {};
      preview.forEach((v, i) => { next[v.id] = results[i].status === "fulfilled" && Array.isArray(results[i].value) ? results[i].value : []; });
      setAvailabilityByVenueId(next);
    })();
    return () => { active = false; };
  }, [canReadVenues, venuePreview]);

  const includeEvening = Boolean(selectedTournament?.include_evening ?? schedule?.include_evening ?? false);
  const calendarStartHour = parseHour(selectedTournament?.schedule_start_hour ?? schedule?.display_start_hour, 5, 0, 23);
  const calendarEndHour = parseHour(selectedTournament?.schedule_end_hour ?? schedule?.display_end_hour, includeEvening ? 22 : 18, 1, 24);
  const tournamentStartDate = useMemo(() => selectedTournament?.start_date ? new Date(`${selectedTournament.start_date}T00:00:00`) : null, [selectedTournament]);
  const tournamentEndDate = useMemo(() => selectedTournament?.end_date ? new Date(`${selectedTournament.end_date}T00:00:00`) : selectedTournament?.start_date ? new Date(`${selectedTournament.start_date}T00:00:00`) : null, [selectedTournament]);

  useEffect(() => {
    if (tournamentStartDate instanceof Date && !Number.isNaN(tournamentStartDate.getTime())) setCalendarDate(new Date(tournamentStartDate));
    setViewMode("tournament");
    setHoverPopover(null);
    setPinnedPopover(null);
  }, [selectedTournamentId, tournamentStartDate]);

  const visibleTournamentBlocks = useMemo(
    () => (Array.isArray(calendarBlockedWindows) ? calendarBlockedWindows : [])
      .filter((b) => b?.start instanceof Date && b?.end instanceof Date)
      .sort((a, b) => a.start.getTime() - b.start.getTime()),
    [calendarBlockedWindows]
  );

  const busy = loading || scheduleLoading;
  const effectiveError = error || "";
  const tournamentOptions = useMemo(() => tournaments.map((t) => ({ ...t, tournament_name: t.tournament_name || t.name || "Unnamed tournament" })), [tournaments]);
  const activePopover = pinnedPopover || hoverPopover;

  const buildPopoverAnchor = useCallback((ev) => {
    if (!ev || typeof ev.clientX !== "number") return { x: 16, y: 16 };
    const r = schedulePanelRef.current?.getBoundingClientRect();
    if (!r) return { x: ev.clientX, y: ev.clientY };
    return { x: ev.clientX - r.left + 8, y: ev.clientY - r.top + 8 };
  }, []);

  const asPopoverItem = useCallback((raw) => {
    const kind = String(raw?.__kind || "").toUpperCase();
    if (kind === "PROGRAM_BLOCK") return { type: "PROGRAM_BLOCK", title: raw?.title || formatProgramBlockTypeLabel(raw?.block_type), item: raw };
    return { type: "MATCH", title: String(raw?.title || "Match"), item: raw };
  }, []);

  const handleCalendarItemHover = useCallback((item, e) => {
    if (pinnedPopover) return;
    setHoverPopover({ ...asPopoverItem(item), anchor: buildPopoverAnchor(e), pinned: false });
  }, [asPopoverItem, buildPopoverAnchor, pinnedPopover]);

  const handleCalendarItemHoverEnd = useCallback(() => { if (!pinnedPopover) setHoverPopover(null); }, [pinnedPopover]);

  const handleCalendarItemSelect = useCallback((item, e) => {
    setPinnedPopover({ ...asPopoverItem(item), anchor: buildPopoverAnchor(e), pinned: true });
    setHoverPopover(null);
  }, [asPopoverItem, buildPopoverAnchor]);

  const closePinnedPopover = useCallback(() => { setPinnedPopover(null); setHoverPopover(null); }, []);

  const popoverDisplayStyle = useMemo(() => {
    if (!activePopover?.anchor) return { left: 12, top: 12 };
    const r = schedulePanelRef.current?.getBoundingClientRect();
    const pw = r?.width || 620, ph = r?.height || 520;
    return { left: Math.max(8, Math.min(activePopover.anchor.x, Math.max(8, pw - 372))), top: Math.max(8, Math.min(activePopover.anchor.y, Math.max(8, ph - 220))) };
  }, [activePopover]);

  const activePopoverItem = activePopover?.item || null;

  return (
    <div className="os-themed-page space-y-6 pb-2">
      <PageHeaderCard
        icon={PageIcon}
        title={pageTitle}
        subtitle={pageSubtitle}
        action={resolvedFocusModes && resolvedFocusModes.length > 1 ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {resolvedFocusModes.map((fm) => (
              <button
                key={fm.key}
                type="button"
                onClick={() => setFocusMode(fm.key)}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                  focusMode === fm.key
                    ? "border-blue-400 bg-blue-600 text-white hover:bg-blue-700 dark:border-cyan-400 dark:bg-cyan-600 dark:hover:bg-cyan-700"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {fm.icon && <fm.icon size={13} />}
                {fm.label}
              </button>
            ))}
          </div>
        ) : null}
      />

      {introContent}

      {hasAnyScheduledEvents ? <VenueScheduleFilterBar
        tournaments={tournamentOptions}
        selectedTournamentId={selectedTournamentId}
        onSelectTournament={(id) => { setSelectedTournamentId(id); void refresh(id); }}
        minRestMinutes={minRestMinutes}
        onChangeMinRest={setMinRestMinutes}
        sportOptions={sportOptions}
        selectedSport={selectedSport}
        onSelectSport={setSelectedSport}
        statusOptions={statusOptions}
        selectedStatus={selectedStatus}
        onSelectStatus={setSelectedStatus}
        dateOptions={dateOptions}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        venueOptions={venueOptions}
        selectedVenue={selectedVenue}
        onSelectVenue={setSelectedVenue}
        onRefresh={() => { void refresh(selectedTournamentId); void loadScheduleData(selectedTournamentId); }}
        refreshing={busy}
        refreshDisabled={!selectedTournamentId || busy}
        refreshDisabledReason={!selectedTournamentId ? "Select a tournament first." : busy ? "Refreshing..." : ""}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={handleClearFilters}
      /> : null}

      {effectiveError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-700/40 dark:bg-rose-950/30 dark:text-rose-200">{effectiveError}</div>
      ) : null}

      {scheduleError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-700/40 dark:bg-amber-950/30 dark:text-amber-200">{scheduleError}</div>
      ) : null}

      {busy ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-[var(--surface)] dark:text-slate-400">Loading schedules...</div>
      ) : (
        <section className="grid gap-4">
          <div ref={schedulePanelRef} className="relative space-y-3">
            {hasAnyScheduledEvents && selectedTournamentId && showVenuePanel && canReadVenues ? (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setVenueDrawerOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <MapPin size={14} />
                  Venue Profiles
                </button>
              </div>
            ) : null}
            {!selectedTournamentId ? (
              <ScheduleEmptyState
                title="No active Intramural"
                description="Select an Intramural before viewing its schedule."
              />
            ) : !hasAnyScheduledEvents ? (
              <ScheduleEmptyState
                title="Schedule is not available yet"
                description="Matches will appear here after the Sports Coordinator creates and publishes the schedule."
              />
            ) : !hasVisibleScheduledEvents ? (
              <div className="mx-auto min-h-56 w-full max-w-2xl px-5 py-12 text-center text-sm text-slate-600 dark:text-slate-300">
                <p className="font-semibold text-slate-800 dark:text-slate-100">
                  {hasActiveFilters ? "No schedules match the current filters." : "No schedule yet for this tournament."}
                </p>
                <p className="mt-2">
                  {hasActiveFilters
                    ? "Adjust or clear the filters to check other matches."
                    : "Match schedules will appear here once fixtures are published."}
                </p>
              </div>
            ) : (
              <ScheduleCalendarWorkspace
                events={visibleEvents}
                blockedWindows={visibleTournamentBlocks}
                editable={false}
                minHour={calendarStartHour}
                maxHour={calendarEndHour}
                onSelectEvent={handleCalendarItemSelect}
                onSelectEmpty={closePinnedPopover}
                onCalendarItemHover={handleCalendarItemHover}
                onCalendarItemLeave={handleCalendarItemHoverEnd}
                onCalendarItemSelect={handleCalendarItemSelect}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                currentDate={calendarDate}
                onCurrentDateChange={setCalendarDate}
                tournamentStartDate={tournamentStartDate}
                tournamentEndDate={tournamentEndDate}
              />
            )}

            {activePopoverItem ? (
              <div className="pointer-events-none absolute inset-0 z-30">
                <article className="pointer-events-auto absolute w-full max-w-sm rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-[var(--surface)]" style={popoverDisplayStyle}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{activePopover?.title || "Schedule item"}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {activePopover?.type === "PROGRAM_BLOCK" ? "Program Block" : `${activePopoverItem?.sport || "Sport"} · ${activePopoverItem?.venue || "Venue not assigned"}`}
                      </p>
                    </div>
                    {activePopover?.pinned ? (
                      <button type="button" onClick={closePinnedPopover} className="rounded-md border border-slate-300 px-2 py-0.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">Close</button>
                    ) : null}
                  </div>
                  {activePopover?.type === "PROGRAM_BLOCK" ? (
                    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-[var(--surface-soft)]/60 dark:text-slate-200">
                      <p className="font-semibold text-slate-800 dark:text-slate-100">{formatProgramBlockTypeLabel(activePopoverItem?.block_type)}</p>
                      <p className="mt-1">{formatPopoverTimeRange(activePopoverItem?.start, activePopoverItem?.end)}</p>
                      {activePopoverItem?.description ? <p className="mt-1 text-slate-600 dark:text-slate-300">{activePopoverItem.description}</p> : null}
                    </div>
                  ) : (
                    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-[var(--surface-soft)]/60 dark:text-slate-200">
                      <p className="font-semibold text-slate-800 dark:text-slate-100">
                        {getScheduleParticipantLabel(activePopoverItem)}
                      </p>
                      <p className="mt-1">{formatPopoverTimeRange(activePopoverItem?.start, activePopoverItem?.end)}</p>
                      <p className="mt-1">{activePopoverItem?.venue || "Venue not assigned"}</p>
                      <p className="mt-1 text-slate-600 dark:text-slate-300">View only: schedule changes are not available for this role.</p>
                    </div>
                  )}
                </article>
              </div>
            ) : null}

          </div>
        </section>
      )}

      {showVenuePanel && canReadVenues ? (
        <AppModal
          open={venueDrawerOpen}
          onClose={() => setVenueDrawerOpen(false)}
          title="Venue Profiles"
          subtitle="Availability windows, supported sports, and current bookings"
          variant="drawer"
          bodyClassName="p-0"
          closeButtonLabel="Close venue profiles"
          fallbackFocusRef={schedulePanelRef}
        >
          <div className="p-4">
            <VenueProfilesPanel venues={venuePreview} availabilityByVenueId={availabilityByVenueId} compact />
          </div>
        </AppModal>
      ) : null}
    </div>
  );
};

export default RoleSchedulePage;
