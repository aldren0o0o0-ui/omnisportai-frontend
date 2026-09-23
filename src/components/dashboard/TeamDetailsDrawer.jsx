import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  X, Users, UserCheck, Shield, Trophy, ArrowRight,
  BarChart2, History, AlertTriangle, Sparkles, User, Info,
} from "lucide-react";
import { Link } from "react-router-dom";
import { TeamLogo, DepartmentLogo } from "../common/IdentityImage";
import {
  getTeamRoster,
  getTeamPlayers,
  getTournamentTeamRegistrationDetail,
  reviewTournamentTeamRegistration,
} from "../../services/teamService";
import { approveEntry, getEntry, rejectEntry, requestEntryChanges } from "../../services/competitionEntryService";
import { getAnalyticsLeaderboard } from "../../services/standingsService";
import { getScheduleEvents } from "../../services/scheduleService";
import EntryOverview from "./team_drawer/EntryOverview";
import EntryCompetitionSummary from "./team_drawer/EntryCompetitionSummary";
import PlayerPerformanceList from "./team_drawer/PlayerPerformanceList";
import MatchHistoryList from "./team_drawer/MatchHistoryList";
import DisciplineSummary from "./team_drawer/DisciplineSummary";
import { useProfileDrawer } from "../profile";
import EntryReviewModal from "../entries/EntryReviewModal";
import {
  detectSportCategory,
  resolveDrawerPerformanceState,
  filterEntryMatches,
} from "./team_drawer/teamDrawerUtils";

const TeamDetailsDrawer = ({
  isOpen,
  onClose,
  entry = null,
  tournamentId = null,
  viewHref = null,
  onEntryChanged = null,
}) => {
  const { openProfile } = useProfileDrawer();
  const [, setLoading] = useState(false);
  const [rosterData, setRosterData] = useState(null);
  const [analyticsData, setAnalyticsData] = useState({
    teamStandingRow: null,
    playerAnalyticsRows: [],
    metricOptions: [],
  });
  const [scheduleMatches, setScheduleMatches] = useState([]);
  const [activeTab, setActiveTab] = useState("performance");
  const [, setError] = useState("");
  const [reviewAction, setReviewAction] = useState("");
  const [decisionNote, setDecisionNote] = useState("");
  const [decisionError, setDecisionError] = useState("");
  const [decisionIssues, setDecisionIssues] = useState([]);
  const [decisionBusy, setDecisionBusy] = useState(false);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (!isOpen) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Reset tab when drawer closes or entry changes
  useEffect(() => {
    if (!isOpen) {
      setActiveTab("performance");
    }
  }, [isOpen, entry]);

  // Fetch full details: Roster, Analytics Leaderboards, and Schedule
  useEffect(() => {
    if (!isOpen || !entry) {
      setRosterData(null);
      setAnalyticsData({ teamStandingRow: null, playerAnalyticsRows: [], metricOptions: [] });
      setScheduleMatches([]);
      setError("");
      return;
    }

    let active = true;
    const fetchAllData = async () => {
      setLoading(true);
      setError("");
      try {
        const shape = String(entry.participant_shape || entry.shape || "TEAM").toUpperCase();
        const sportId = Number(entry.sportId || entry.sport_id || 0) || null;
        const eventId = Number(entry.eventId || entry.tournament_sport_event_id || 0) || null;
        const entryId = Number(entry.entryId || entry.entry_id || (entry.type === "entry" ? entry.id : null)) || null;
        const registrationId = Number(entry.registrationId || entry.registration_id || 0) || null;
        const teamId = Number(entry.teamId || entry.team_id || (entry.type !== "entry" ? entry.id : null)) || null;

        // 1. Roster loading
        const rosterPromise = (async () => {
          if (registrationId && tournamentId) {
            const registrationDetail = await getTournamentTeamRegistrationDetail(
              Number(tournamentId),
              registrationId
            );
            const acceptedPlayers = Array.isArray(registrationDetail?.registration_payload?.accepted_players)
              ? registrationDetail.registration_payload.accepted_players
              : [];
            return {
              players: acceptedPlayers.map((player) => ({
                ...player,
                name: player.applicant_name,
                id: player.applicant_id,
              })),
              coach: registrationDetail?.submitted_by_name || entry.coach_name || null,
              detail: registrationDetail,
            };
          }
          if (entryId) {
            const entryDetail = await getEntry(entryId).catch(() => null);
            return {
              players:
                entryDetail?.members ||
                entryDetail?.athletes ||
                entryDetail?.players ||
                (entryDetail?.player_name ? [{ name: entryDetail.player_name, role: "Participant" }] : []),
              coach: entryDetail?.coach_name || entry.coach_name || null,
              detail: entryDetail,
            };
          }
          if (teamId) {
            const [roster, players] = await Promise.all([
              getTeamRoster(teamId, tournamentId ? Number(tournamentId) : null).catch(() => null),
              getTeamPlayers(teamId).catch(() => []),
            ]);
            const playerList = Array.isArray(roster?.players) && roster.players.length > 0
              ? roster.players
              : Array.isArray(players) && players.length > 0
                ? players
                : Array.isArray(roster)
                  ? roster
                  : [];
            const coachName =
              roster?.coach?.name ||
              roster?.coach_name ||
              roster?.staff?.find?.((s) => /coach/i.test(s.role || s.role_name))?.name ||
              entry.coach_name ||
              null;
            return {
              players: playerList,
              coach: coachName,
              staff: roster?.staff || [],
            };
          }
          // Fallback to groupEntries
          if (Array.isArray(entry.groupEntries) && entry.groupEntries.length > 0) {
            const allMembers = entry.groupEntries.flatMap((g) => g.members || []);
            return {
              players: allMembers,
              coach: entry.coach_name || null,
              detail: null,
            };
          }
          return { players: [], coach: entry.coach_name || null, detail: null };
        })();

        // 2. Schedule events loading
        const schedulePromise = tournamentId
          ? getScheduleEvents(Number(tournamentId)).catch(() => ({ events: [] }))
          : Promise.resolve({ events: [] });

        // 3. Analytics loading
        const analyticsPromise = (async () => {
          if (!tournamentId || !sportId) return null;
          try {
            const [teamLeaderboard, playerLeaderboard] = await Promise.all([
              getAnalyticsLeaderboard({
                tournamentId: Number(tournamentId),
                sportId,
                eventId,
                participantType: shape === "TEAM" ? "TEAM" : "ENTRY",
              }).catch(() => null),
              getAnalyticsLeaderboard({
                tournamentId: Number(tournamentId),
                sportId,
                eventId,
                participantType: "PLAYER",
              }).catch(() => null),
            ]);
            return { teamLeaderboard, playerLeaderboard };
          } catch {
            return null;
          }
        })();

        const [rosterRes, scheduleRes, analyticsRes] = await Promise.all([
          rosterPromise,
          schedulePromise,
          analyticsPromise,
        ]);

        if (!active) return;

        // Set Roster
        setRosterData(rosterRes);

        // Process schedule matches
        const allEvents = Array.isArray(scheduleRes?.events) ? scheduleRes.events : Array.isArray(scheduleRes) ? scheduleRes : [];
        const relevantMatches = filterEntryMatches(allEvents, {
          entryId,
          teamId,
          participantName: entry.name,
        });
        setScheduleMatches(relevantMatches);

        // Process Analytics
        let teamStandingRow = null;
        if (analyticsRes?.teamLeaderboard?.rows) {
          teamStandingRow = analyticsRes.teamLeaderboard.rows.find((r) => {
            const pId = Number(r.participant_id);
            return (teamId && pId === teamId) || (entryId && pId === entryId) ||
              (r.participant_name && entry.name && r.participant_name.toLowerCase().includes(entry.name.toLowerCase()));
          }) || null;
        }

        const playerAnalyticsRows = Array.isArray(analyticsRes?.playerLeaderboard?.rows)
          ? analyticsRes.playerLeaderboard.rows
          : [];
        const metricOptions = Array.isArray(analyticsRes?.playerLeaderboard?.metric_options)
          ? analyticsRes.playerLeaderboard.metric_options
          : [];

        setAnalyticsData({
          teamStandingRow,
          playerAnalyticsRows,
          metricOptions,
        });
      } catch (err) {
        if (!active) return;
        console.error("Error loading entry details in drawer:", err);
        setError("Could not load full statistics at this time.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchAllData();

    return () => {
      active = false;
    };
  }, [isOpen, entry, tournamentId]);

  const shape = String(entry?.participant_shape || entry?.shape || "TEAM").toUpperCase();
  const shapeLabel = shape === "SOLO" ? "SOLO" : shape === "DUO" ? "DUO" : "TEAM";
  const sportName = entry?.sport_name || entry?.sport || "Sport";
  const sportCategory = detectSportCategory(sportName);
  const coachName = rosterData?.coach || entry?.coach_name || entry?.coach || null;
  const rawPlayers = useMemo(() => rosterData?.players || [], [rosterData?.players]);

  // Match roster players with analytics rows if available
  const mergedPlayers = useMemo(() => {
    const analyticsMap = new Map();
    for (const row of analyticsData.playerAnalyticsRows) {
      if (row.participant_id) analyticsMap.set(Number(row.participant_id), row);
      if (row.user_id) analyticsMap.set(`u-${row.user_id}`, row);
      if (row.participant_name) analyticsMap.set(row.participant_name.trim().toLowerCase(), row);
    }

    if (rawPlayers.length === 0 && analyticsData.playerAnalyticsRows.length > 0) {
      return analyticsData.playerAnalyticsRows;
    }

    return rawPlayers.map((p, idx) => {
      const pId = Number(p.id || p.player_id);
      const name = p.full_name || p.display_name || p.name || `Player #${idx + 1}`;
      const matched = (pId && analyticsMap.get(pId)) ||
        (p.user_id && analyticsMap.get(`u-${p.user_id}`)) ||
        analyticsMap.get(name.trim().toLowerCase()) ||
        {};

      return {
        ...p,
        participant_id: pId || idx + 1,
        participant_name: name,
        position: p.position || p.role || null,
        metrics: matched.metrics || {},
        rank: matched.rank || null,
      };
    });
  }, [rawPlayers, analyticsData.playerAnalyticsRows]);

  // Determine Lifecycle Performance State
  const performanceState = useMemo(() => {
    return resolveDrawerPerformanceState({
      tournament: { lifecycle_status: entry?.status },
      matches: scheduleMatches,
      playerAnalyticsRows: analyticsData.playerAnalyticsRows,
      teamStandingRow: analyticsData.teamStandingRow,
    });
  }, [entry?.status, scheduleMatches, analyticsData]);

  const hasDataAvailable = performanceState === "DATA_AVAILABLE";
  const normalizedStatus = String(rosterData?.detail?.status || entry?.status || "").toUpperCase();
  const canReview = Boolean(entry?.can_review || entry?.capabilities?.can_review) && normalizedStatus === "PENDING_REVIEW";
  const reviewEntry = {
    ...(rosterData?.detail || entry),
    id: Number(entry?.entryId || entry?.entry_id || entry?.id),
    entry_name: entry?.name || entry?.entry_name,
    logo_url: entry?.imageUrl || entry?.image_url,
    participantShapeLabel: shape === "SOLO" ? "Individual" : shape === "DUO" ? "Pair" : "Team",
    sportLabel: sportName,
    departmentLabel: entry?.department_code || entry?.department_name || "Department",
    memberSummary: mergedPlayers.map((player) => player.participant_name).filter(Boolean).join(", "),
  };

  const closeDecision = () => {
    if (decisionBusy) return;
    setReviewAction("");
    setDecisionNote("");
    setDecisionError("");
    setDecisionIssues([]);
  };

  const submitDecision = async () => {
    const note = decisionNote.trim();
    if (["REJECT", "REQUEST_REVISION"].includes(reviewAction) && !note) {
      setDecisionError(reviewAction === "REJECT" ? "Explain why this entry is being rejected." : "State what the submitter must change.");
      return;
    }
    setDecisionBusy(true);
    setDecisionError("");
    setDecisionIssues([]);
    try {
      const isTeamRegistration = String(entry?.source_type || "").toUpperCase() === "TOURNAMENT_TEAM_REGISTRATION";
      const payload = note ? { decision_note: note } : {};
      const entryId = Number(reviewEntry.id);
      const updated = isTeamRegistration
        ? await reviewTournamentTeamRegistration(
            Number(tournamentId),
            Number(entry?.registrationId || entry?.registration_id),
            {
              action: reviewAction,
              review_notes: reviewAction === "APPROVE" ? note || null : null,
              rejection_reason: reviewAction === "REJECT" ? note : null,
              revision_notes: reviewAction === "REQUEST_REVISION" ? note : null,
            }
          )
        : reviewAction === "REJECT"
          ? await rejectEntry(entryId, payload)
          : reviewAction === "REQUEST_REVISION"
            ? await requestEntryChanges(entryId, payload)
            : await approveEntry(entryId, payload);
      await onEntryChanged?.(updated);
      setReviewAction("");
      onClose?.();
    } catch (apiError) {
      const detail = apiError?.response?.data?.detail;
      setDecisionError(typeof detail === "string" ? detail : detail?.message || "The entry decision could not be saved.");
      setDecisionIssues(Array.isArray(detail?.issues) ? detail.issues : []);
    } finally {
      setDecisionBusy(false);
    }
  };

  if (!isOpen || !entry) return null;

  const drawerContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="entry-drawer-title"
      className="fixed inset-0 z-[var(--z-overlay)] flex justify-end bg-black/60 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <aside
        className="relative flex h-full w-full max-w-full sm:max-w-lg flex-col border-l border-[var(--border-soft)] bg-[var(--surface)] shadow-2xl transition-transform duration-300 animate-in slide-in-from-right"
      >
        {/* Top Sticky Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-soft)] bg-[var(--surface)]/95 px-4 py-3 sm:px-6 sm:py-4 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
              <Shield size={17} />
            </span>
            <div className="min-w-0">
              <h2 id="entry-drawer-title" className="truncate text-sm font-bold text-[var(--text-main)]">
                {entry.name || "Entry Details"}
              </h2>
              <p className="text-[11px] text-[var(--text-muted)]">
                Official Intramural Participant
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-main)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Close drawer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 overscroll-contain pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {/* 1. Header Hero Card */}
          <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4">
                <div className="flex items-center gap-3.5">
                  <TeamLogo imageUrl={entry.imageUrl} label={entry.name} scale="lg" />
                  <div className="min-w-0 flex-1">
                    <h3 className="break-words text-lg font-black text-[var(--text-main)]">
                      {entry.name}
                    </h3>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-[var(--text-muted)]">
                      <span className="inline-flex items-center gap-1 font-semibold text-[var(--text-main)]">
                        <Trophy size={13} className="text-[var(--primary)]" />
                        {sportName}
                      </span>
                      <span>•</span>
                      <span className="rounded bg-[var(--surface-muted)] px-1.5 py-0.5 text-[10px] font-black text-[var(--text-soft)]">
                        {shapeLabel}
                      </span>
                      {(entry.department_name || entry.department_code) ? (
                        <>
                          <span>•</span>
                          <span className="font-semibold text-blue-400">
                            {entry.department_code || entry.department_name}
                          </span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Compact Overview */}
              <EntryOverview
                coachName={coachName}
                shape={shape}
                playerCount={mergedPlayers.length}
                targetPlayers={Number(entry.max_players || entry.roster_limit || 0)}
                status={entry.status || "APPROVED"}
                isReady={entry.ready !== false}
                issues={entry.issues || []}
              />

              {/* 3. Competition Summary (Rendered once records exist) */}
              {hasDataAvailable ? (
                <EntryCompetitionSummary
                  teamStandingRow={analyticsData.teamStandingRow}
                  sportCategory={sportCategory}
                  shape={shape}
                />
              ) : null}

              {/* 4. Players / Performance Section */}
              <section className="space-y-3" aria-label="Players and Performance">
                {/* State A: Before Competition */}
                {performanceState === "NOT_STARTED" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                        {shape === "SOLO" ? "Athlete" : "Roster & Players"}
                      </h3>
                      <span className="rounded-full bg-[var(--primary-soft)] px-2 py-0.5 text-[10px] font-extrabold text-[var(--primary)]">
                        {mergedPlayers.length} {shape === "SOLO" ? "Athlete" : "Players"}
                      </span>
                    </div>

                    {mergedPlayers.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-[var(--border-soft)] p-6 text-center text-xs text-[var(--text-muted)]">
                        No athletes added to this roster yet.
                      </div>
                    ) : (
                      <div className="divide-y divide-[var(--border-soft)] rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] overflow-hidden">
                        {mergedPlayers.map((player, idx) => (
                          <button
                            key={player.participant_id || idx}
                            type="button"
                            onClick={() => openProfile({
                              userId: player?.user_id || null,
                              playerId: player?.id || player?.player_id || player?.participant_id || null,
                              tournamentId: tournamentId ? Number(tournamentId) : null,
                              sportId: entry?.sport_id ? Number(entry.sport_id) : null,
                            })}
                            className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-xs transition hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--primary)]"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-bold text-[var(--text-main)] hover:underline">
                                {player.participant_name || player.name || `Player #${idx + 1}`}
                              </p>
                              <p className="text-[10px] text-[var(--text-muted)]">
                                {player.position || (shape === "SOLO" ? "Solo Participant" : "Roster Athlete")}
                              </p>
                            </div>
                            <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                              Eligible • Ready
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    <p className="text-center text-[11px] text-[var(--text-muted)]">
                      Performance data will appear after recorded matches.
                    </p>
                  </div>
                )}

                {/* State B: Competition Started but No Recorded Stats */}
                {performanceState === "STARTED_NO_STATS" && (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-center space-y-1.5">
                      <p className="text-xs font-extrabold uppercase tracking-wider text-blue-400">
                        Performance
                      </p>
                      <p className="text-sm font-bold text-[var(--text-main)]">
                        Competition is underway.
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        No recorded player performance yet. Statistics will appear after a match produces authoritative player-level records.
                      </p>
                    </div>

                    {/* Pre-competition roster list */}
                    {mergedPlayers.length > 0 ? (
                      <div className="divide-y divide-[var(--border-soft)] rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] overflow-hidden">
                        {mergedPlayers.map((player, idx) => (
                          <button
                            key={player.participant_id || idx}
                            type="button"
                            onClick={() => openProfile({
                              userId: player?.user_id || null,
                              playerId: player?.id || player?.player_id || player?.participant_id || null,
                              tournamentId: tournamentId ? Number(tournamentId) : null,
                              sportId: entry?.sport_id ? Number(entry.sport_id) : null,
                            })}
                            className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-xs transition hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--primary)]"
                          >
                            <span className="truncate font-bold text-[var(--text-main)] hover:underline">
                              {player.participant_name || player.name}
                            </span>
                            <span className="text-[10px] text-[var(--text-muted)]">
                              {player.position || "Roster Member"}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}

                {/* State C: Data Available - Tabs Enabled */}
                {hasDataAvailable && (
                  <div className="space-y-3">
                    {/* Navigation Tabs */}
                    <div className="grid grid-cols-3 rounded-xl bg-[var(--surface-muted)] p-1 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setActiveTab("performance")}
                        className={`flex items-center justify-center gap-1.5 rounded-lg py-2 transition ${
                          activeTab === "performance"
                            ? "bg-[var(--surface)] text-[var(--text-main)] shadow-sm"
                            : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                        }`}
                      >
                        <BarChart2 size={13} /> Performance
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("matches")}
                        className={`flex items-center justify-center gap-1.5 rounded-lg py-2 transition ${
                          activeTab === "matches"
                            ? "bg-[var(--surface)] text-[var(--text-main)] shadow-sm"
                            : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                        }`}
                      >
                        <History size={13} /> Matches
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("discipline")}
                        className={`flex items-center justify-center gap-1.5 rounded-lg py-2 transition ${
                          activeTab === "discipline"
                            ? "bg-[var(--surface)] text-[var(--text-main)] shadow-sm"
                            : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                        }`}
                      >
                        <AlertTriangle size={13} /> Discipline
                      </button>
                    </div>

                    {/* Tab 1: Performance */}
                    {activeTab === "performance" && (
                      <PlayerPerformanceList
                        playerRows={mergedPlayers}
                        sportName={sportName}
                        metricOptions={analyticsData.metricOptions}
                        onSelectPlayer={(player) => {
                          openProfile({
                            userId: player?.user_id || null,
                            playerId: player?.id || player?.player_id || player?.participant_id || null,
                            tournamentId: tournamentId ? Number(tournamentId) : null,
                            sportId: entry?.sport_id ? Number(entry.sport_id) : null,
                          });
                        }}
                      />
                    )}

                    {/* Tab 2: Match History */}
                    {activeTab === "matches" && (
                      <MatchHistoryList
                        matches={scheduleMatches}
                        context={{
                          entryId: entry.entryId || entry.entry_id,
                          teamId: entry.teamId || entry.team_id,
                          participantName: entry.name,
                        }}
                      />
                    )}

                    {/* Tab 3: Discipline */}
                    {activeTab === "discipline" && (
                      <DisciplineSummary
                        playerAnalyticsRows={mergedPlayers}
                        sportName={sportName}
                      />
                    )}
                  </div>
                )}
              </section>
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--border-soft)] bg-[var(--surface)] p-4">
          {canReview ? (
            <div className="grid grid-cols-3 gap-2">
              <button type="button" onClick={() => setReviewAction("REJECT")} className="rounded-xl border border-rose-300 px-3 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:border-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-500/10">Reject</button>
              <button type="button" onClick={() => setReviewAction("REQUEST_REVISION")} className="rounded-xl border border-amber-300 px-3 py-2.5 text-xs font-bold text-amber-700 hover:bg-amber-50 dark:border-amber-500/40 dark:text-amber-300 dark:hover:bg-amber-500/10">Needs changes</button>
              <button type="button" onClick={() => setReviewAction("APPROVE")} className="rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-emerald-500">Approve</button>
            </div>
          ) : viewHref ? (
            <Link
              to={viewHref}
              onClick={onClose}
              className="os-btn-primary-soft inline-flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold"
            >
              <span>Manage Department Teams & Entries</span>
              <ArrowRight size={14} />
            </Link>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="os-btn-secondary inline-flex w-full items-center justify-center rounded-xl py-2.5 text-xs font-semibold"
            >
              Close Details
            </button>
          )}
        </div>
      </aside>
      <EntryReviewModal
        open={Boolean(reviewAction)}
        entry={reviewEntry}
        action={reviewAction}
        decisionNote={decisionNote}
        onDecisionNoteChange={setDecisionNote}
        onClose={closeDecision}
        onSubmit={submitDecision}
        busy={decisionBusy}
        error={decisionError}
        issues={decisionIssues}
      />
    </div>
  );

  return createPortal(drawerContent, document.body);
};

export default TeamDetailsDrawer;
