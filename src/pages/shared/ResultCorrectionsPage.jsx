import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  Check,
  ClipboardCheck,
  ExternalLink,
  MapPin,
  RefreshCw,
  Search,
  ShieldAlert,
  Trophy,
  X,
} from "lucide-react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { useWorkspace } from "../../context/WorkspaceContext";
import useIntramuralList from "../../hooks/useIntramuralList";
import { TeamLogo } from "../../components/common/IdentityImage";
import { getBrackets, getBracketMatches } from "../../services/bracketService";
import {
  applyCorrection,
  approveCorrection,
  getCorrectionQueue,
  rejectCorrection,
} from "../../services/resultCorrectionService";
import {
  correctionErrorMessage,
  correctionStatusPresentation,
  summarizeCorrectionImpact,
} from "../../components/brackets/utils/resultCorrectionPresentation";
import {
  DASHBOARD_TOURNAMENT_SELECTION_EVENT,
  readStoredDashboardTournamentSelection,
} from "../../utils/dashboardTournamentSelection";

const statusOptions = ["", "DRAFT", "SUBMITTED", "APPROVED", "APPLIED", "REJECTED", "FAILED"];

const isSideWinner = (match, side) => {
  const score1 = Number(match.score_team1 ?? 0);
  const score2 = Number(match.score_team2 ?? 0);

  if (side === 1) {
    if (match.winner_team_id && match.team1_id && Number(match.winner_team_id) === Number(match.team1_id)) return true;
    if (match.winner_entry_id && match.entry1_id && Number(match.winner_entry_id) === Number(match.entry1_id)) return true;
    if (match.winner_unit_id && match.unitA_id && Number(match.winner_unit_id) === Number(match.unitA_id)) return true;
    if (match.winner_label && (match.team1_label === match.winner_label || match.team1_name === match.winner_label)) return true;
    if (score1 > score2) return true;
    return false;
  }
  if (side === 2) {
    if (match.winner_team_id && match.team2_id && Number(match.winner_team_id) === Number(match.team2_id)) return true;
    if (match.winner_entry_id && match.entry2_id && Number(match.winner_entry_id) === Number(match.entry2_id)) return true;
    if (match.winner_unit_id && match.unitB_id && Number(match.winner_unit_id) === Number(match.unitB_id)) return true;
    if (match.winner_label && (match.team2_label === match.winner_label || match.team2_name === match.winner_label)) return true;
    if (score2 > score1) return true;
    return false;
  }
  return false;
};

const ResultCorrectionsPage = ({ resultsOnly = false }) => {
  const { roleNames } = useAuth();
  const { selectedIntramural, workspace: activeIntramural } = useWorkspace();
  const { tournamentByWorkspace } = useIntramuralList();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const isCoordinator = roleNames.includes("SPORTS_COORDINATOR");
  const isFacilitatorPath = location.pathname.startsWith("/sport-facilitator");
  const isCorrectionsPermitted = isCoordinator && !resultsOnly && !isFacilitatorPath;

  const currentTab = isCorrectionsPermitted ? (searchParams.get("tab") || "results") : "results";
  const setTab = (newTab) => {
    if (!isCorrectionsPermitted) return;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", newTab);
      return next;
    });
  };

  const effectiveIntramural = selectedIntramural || activeIntramural || null;
  const workspaceTournament = effectiveIntramural?.id
    ? tournamentByWorkspace[Number(effectiveIntramural.id)]
    : null;

  // Selected tournament ID resolution
  const [selectedTournamentId, setSelectedTournamentId] = useState(() => {
    const stored = readStoredDashboardTournamentSelection();
    return stored?.id ? Number(stored.id) : null;
  });

  const [selectedTournamentName, setSelectedTournamentName] = useState(() => {
    const stored = readStoredDashboardTournamentSelection();
    return stored?.name || "";
  });

  // Sync tournament ID when workspace mapping updates
  useEffect(() => {
    if (workspaceTournament?.id) {
      setSelectedTournamentId(Number(workspaceTournament.id));
      setSelectedTournamentName(workspaceTournament.tournament_name || effectiveIntramural?.name || "");
    }
  }, [workspaceTournament?.id, workspaceTournament?.tournament_name, effectiveIntramural?.name]);

  // Listen for topbar tournament changes
  useEffect(() => {
    const handleSelectionUpdate = (event) => {
      const incomingId = event?.detail?.id;
      const incomingName = event?.detail?.name;
      if (incomingId) {
        setSelectedTournamentId(Number(incomingId));
        if (incomingName) setSelectedTournamentName(incomingName);
      }
    };
    window.addEventListener(DASHBOARD_TOURNAMENT_SELECTION_EVENT, handleSelectionUpdate);
    return () => {
      window.removeEventListener(DASHBOARD_TOURNAMENT_SELECTION_EVENT, handleSelectionUpdate);
    };
  }, []);

  // Correction queue state
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState(null);
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reviewNotes, setReviewNotes] = useState({});

  // Match Results state
  const [matches, setMatches] = useState([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [matchSportFilter, setMatchSportFilter] = useState("");
  const [matchSearchQuery, setMatchSearchQuery] = useState("");

  const rolePrefix = useMemo(() => {
    if (location.pathname.startsWith("/sport-facilitator")) return "/sport-facilitator";
    if (location.pathname.startsWith("/coordinator")) return "/coordinator";
    if (location.pathname.startsWith("/department")) return "/department";
    if (location.pathname.startsWith("/coach")) return "/coach";
    return "/viewer";
  }, [location.pathname]);

  // Load correction queue for the selected tournament
  const loadCorrections = useCallback(async () => {
    if (!isCorrectionsPermitted || !selectedTournamentId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      setRows(await getCorrectionQueue({ status, tournamentId: selectedTournamentId }));
    } catch (requestError) {
      setError(correctionErrorMessage(requestError, "Correction requests could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, [isCorrectionsPermitted, status, selectedTournamentId]);

  // Load finished match results strictly for the selected tournament
  const loadMatches = useCallback(async () => {
    if (!selectedTournamentId) {
      setMatches([]);
      setMatchesLoading(false);
      return;
    }
    setMatchesLoading(true);
    try {
      const rawBrackets = await getBrackets(selectedTournamentId);
      const brackets = (Array.isArray(rawBrackets) ? rawBrackets : []).filter(
        (b) => Number(b.tournament_id) === Number(selectedTournamentId)
      );

      if (brackets.length === 0) {
        setMatches([]);
        return;
      }

      const matchResults = await Promise.all(
        brackets.map(async (bracket) => {
          try {
            const rowsData = await getBracketMatches(bracket.id);
            return (Array.isArray(rowsData) ? rowsData : []).map((m) => ({
              ...m,
              bracket_id: bracket.id,
              tournament_id: bracket.tournament_id,
              sport_id: bracket.sport_id,
              sport_name: bracket.sport_name || m.sport_name || "Sport",
              event_name: bracket.event_name || m.event_name || null,
              tournament_sport_event_id: bracket.tournament_sport_event_id || m.tournament_sport_event_id,
            }));
          } catch {
            return [];
          }
        })
      );

      // Filter: ONLY finished / completed matches should display in Match Results!
      const finishedMatches = matchResults
        .flat()
        .filter((m) => {
          // Strictly verify tournament ID matches selected intramural
          if (m.tournament_id && Number(m.tournament_id) !== Number(selectedTournamentId)) {
            return false;
          }
          const mStatus = String(m.status || "").toUpperCase();
          const isFinished =
            mStatus === "COMPLETED" ||
            mStatus === "FINISHED" ||
            mStatus === "FINAL" ||
            Boolean(m.winner_team_id || m.winner_entry_id || m.winner_unit_id);
          return isFinished;
        })
        .sort((a, b) => Number(b.id) - Number(a.id));

      setMatches(finishedMatches);
    } catch (err) {
      console.error("Failed to load tournament match results:", err);
      setMatches([]);
    } finally {
      setMatchesLoading(false);
    }
  }, [selectedTournamentId]);

  useEffect(() => {
    loadCorrections();
  }, [loadCorrections]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  const visibleRows = useMemo(
    () => rows.filter((row) => !type || row.correction_type === type),
    [rows, type],
  );
  const correctionTypes = useMemo(
    () => [...new Set(rows.map((row) => row.correction_type))].sort(),
    [rows],
  );

  const availableSports = useMemo(() => {
    const set = new Set();
    matches.forEach((m) => {
      if (m.sport_name) set.add(m.sport_name);
    });
    return Array.from(set).sort();
  }, [matches]);

  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      if (matchSportFilter && m.sport_name !== matchSportFilter) return false;
      if (matchSearchQuery.trim()) {
        const q = matchSearchQuery.trim().toLowerCase();
        const t1 = (m.team1_name || m.team1_label || "").toLowerCase();
        const t2 = (m.team2_name || m.team2_label || "").toLowerCase();
        const sp = (m.sport_name || "").toLowerCase();
        const ev = (m.event_name || "").toLowerCase();
        const mid = String(m.match_number || m.id);
        if (!t1.includes(q) && !t2.includes(q) && !sp.includes(q) && !ev.includes(q) && !mid.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [matches, matchSportFilter, matchSearchQuery]);

  const runAction = async (row, action) => {
    const reviewNote = String(reviewNotes[row.id] || "");
    setWorkingId(row.id);
    setError("");
    setNotice("");
    try {
      if (action === "approve") await approveCorrection(row.id, row.row_version, reviewNote);
      if (action === "reject") {
        if (reviewNote.trim().length < 3) throw new Error("Enter a short review note before rejecting this request.");
        await rejectCorrection(row.id, row.row_version, reviewNote.trim());
      }
      if (action === "apply") await applyCorrection(row);
      setNotice(action === "apply" ? "The corrected result is now official." : `Correction ${action === "approve" ? "approved" : "rejected"}.`);
      setReviewNotes((current) => ({ ...current, [row.id]: "" }));
      await loadCorrections();
      await loadMatches();
    } catch (requestError) {
      setError(correctionErrorMessage(requestError, requestError?.message));
    } finally {
      setWorkingId(null);
    }
  };

  const displayName = effectiveIntramural?.name || selectedTournamentName || "Selected Intramural";

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      {/* Page Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-main)]">
              {isCorrectionsPermitted ? "Match Results & Corrections" : "Match Results"}
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 px-3 py-1 text-xs font-bold text-blue-700 dark:text-blue-300">
              <Trophy size={13} className="text-blue-500" />
              {displayName}
            </span>
          </div>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {isCorrectionsPermitted
              ? `Review completed match results, scores, and winners for ${displayName}, and audit requested result corrections.`
              : `Review completed match results, final scores, and winners for ${displayName}.`}
          </p>
        </div>
      </header>

      {/* Segmented Dual-Purpose Tabs: only shown when user can view/manage corrections */}
      {isCorrectionsPermitted ? (
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <button
            type="button"
            onClick={() => setTab("results")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition cursor-pointer ${
              currentTab === "results"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            }`}
          >
            <Trophy size={16} />
            <span>Match Results</span>
            {matches.length > 0 ? (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-bold leading-none ${
                  currentTab === "results"
                    ? "bg-white/20 text-white"
                    : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                }`}
              >
                {matches.length}
              </span>
            ) : null}
          </button>

          <button
            type="button"
            onClick={() => setTab("corrections")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition cursor-pointer ${
              currentTab === "corrections"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            }`}
          >
            <ClipboardCheck size={16} />
            <span>Correction Requests</span>
            {rows.length > 0 ? (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-bold leading-none ${
                  currentTab === "corrections"
                    ? "bg-white/20 text-white"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                }`}
              >
                {rows.length}
              </span>
            ) : null}
          </button>
        </div>
      ) : null}

      {notice ? (
        <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </p>
      ) : null}

      {/* ────────────────────────────────────────────────────────────
          PURPOSE 1: MATCH RESULTS (Finished Matches only)
         ──────────────────────────────────────────────────────────── */}
      {!isCorrectionsPermitted || currentTab === "results" ? (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={matchSearchQuery}
                  onChange={(e) => setMatchSearchQuery(e.target.value)}
                  placeholder="Search team, event, match #..."
                  className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] pl-9 pr-3 py-2 text-sm outline-none focus:border-blue-500"
                />
                {matchSearchQuery ? (
                  <button
                    type="button"
                    onClick={() => setMatchSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                ) : null}
              </div>

              {/* Sport Filter */}
              {availableSports.length > 1 ? (
                <select
                  value={matchSportFilter}
                  onChange={(e) => setMatchSportFilter(e.target.value)}
                  className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm font-medium outline-none"
                >
                  <option value="">All Sports</option>
                  {availableSports.map((sport) => (
                    <option key={sport} value={sport}>
                      {sport}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>

            <button
              type="button"
              onClick={loadMatches}
              disabled={matchesLoading}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border-soft)] px-3.5 py-2 text-sm font-semibold text-[var(--text-main)] hover:bg-[var(--surface-soft)] cursor-pointer"
            >
              <RefreshCw size={15} className={matchesLoading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>

          {/* Matches List */}
          {matchesLoading ? (
            <div className="space-y-3" aria-label="Loading match results">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-36 animate-pulse rounded-2xl bg-[var(--surface-soft)]" />
              ))}
            </div>
          ) : filteredMatches.length === 0 ? (
            <div className="py-16 text-center rounded-2xl border border-dashed border-[var(--border-soft)] bg-[var(--surface-soft)] p-6">
              <Trophy className="mx-auto text-[var(--text-muted)]" size={32} />
              <h2 className="mt-3 font-semibold text-[var(--text-main)]">No match results yet</h2>
              <p className="mt-1 text-sm text-[var(--text-muted)] max-w-md mx-auto">
                {matchSearchQuery || matchSportFilter
                  ? "No finished matches match your search or filter criteria."
                  : `No completed match results found for ${displayName}. Once matches finish, their official scores and winners will appear here.`}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredMatches.map((match) => {
                const isWinner1 = isSideWinner(match, 1);
                const isWinner2 = isSideWinner(match, 2);

                return (
                  <article
                    key={match.id}
                    onClick={() =>
                      navigate(`${rolePrefix}/matches/${match.id}`, {
                        state: { from: location.pathname + location.search },
                      })
                    }
                    className="group relative cursor-pointer rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[var(--surface)] p-4 sm:p-5 shadow-xs transition hover:border-blue-400 hover:shadow-lg dark:hover:border-blue-500/50"
                  >
                    {/* Card Top: Sport & Event, Round, Status */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 text-xs font-bold text-blue-700 dark:text-blue-300">
                          <Activity size={13} className="text-blue-500" />
                          {match.sport_name}
                          {match.event_name ? ` · ${match.event_name}` : ""}
                        </span>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          Match #{match.match_number || match.id}
                          {match.round ? ` · ${match.round}` : ""}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                          <Check size={12} strokeWidth={2.5} />
                          Final Result
                        </span>
                      </div>
                    </div>

                    {/* Main Versus Matchup Section */}
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-4 py-4 sm:py-5">
                      {/* Team 1 / Side A */}
                      <div
                        className={`flex items-center justify-between sm:justify-start gap-3 rounded-xl p-3 transition ${
                          isWinner1
                            ? "bg-emerald-500/10 dark:bg-emerald-950/30 ring-1 ring-emerald-500/30"
                            : "bg-slate-50/60 dark:bg-slate-800/40"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <TeamLogo
                            imageUrl={match.team1_logo_url || match.unitA_logo_url}
                            label={match.team1_name || match.team1_label || "Team 1"}
                            scale="md"
                            className="shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`truncate text-sm sm:text-base font-bold ${
                                  isWinner1
                                    ? "text-slate-900 dark:text-white font-extrabold"
                                    : "text-slate-700 dark:text-slate-300"
                                }`}
                              >
                                {match.team1_name || match.team1_label || "Team 1"}
                              </span>
                            </div>
                            {isWinner1 ? (
                              <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-2 py-0.5 text-[11px] font-extrabold shadow-xs">
                                <Trophy size={11} className="text-amber-600 dark:text-amber-400" /> WINNER
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div
                          className={`ml-auto grid h-12 min-w-12 px-2.5 place-items-center rounded-xl text-xl font-black tabular-nums transition ${
                            isWinner1
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-600"
                          }`}
                        >
                          {match.score_team1 ?? 0}
                        </div>
                      </div>

                      {/* Center VS Indicator */}
                      <div className="hidden sm:flex flex-col items-center justify-center px-1">
                        <span className="text-xs font-black tracking-widest text-slate-400 uppercase">
                          VS
                        </span>
                      </div>

                      {/* Team 2 / Side B */}
                      <div
                        className={`flex items-center justify-between sm:justify-end gap-3 rounded-xl p-3 transition ${
                          isWinner2
                            ? "bg-emerald-500/10 dark:bg-emerald-950/30 ring-1 ring-emerald-500/30"
                            : "bg-slate-50/60 dark:bg-slate-800/40"
                        }`}
                      >
                        <div
                          className={`mr-auto sm:mr-0 sm:order-2 grid h-12 min-w-12 px-2.5 place-items-center rounded-xl text-xl font-black tabular-nums transition ${
                            isWinner2
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-600"
                          }`}
                        >
                          {match.score_team2 ?? 0}
                        </div>

                        <div className="flex items-center gap-3 min-w-0 sm:order-1 sm:text-right">
                          <div className="min-w-0">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              <span
                                className={`truncate text-sm sm:text-base font-bold ${
                                  isWinner2
                                    ? "text-slate-900 dark:text-white font-extrabold"
                                    : "text-slate-700 dark:text-slate-300"
                                }`}
                              >
                                {match.team2_name || match.team2_label || "Team 2"}
                              </span>
                            </div>
                            {isWinner2 ? (
                              <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-2 py-0.5 text-[11px] font-extrabold shadow-xs">
                                <Trophy size={11} className="text-amber-600 dark:text-amber-400" /> WINNER
                              </span>
                            ) : null}
                          </div>
                          <TeamLogo
                            imageUrl={match.team2_logo_url || match.unitB_logo_url}
                            label={match.team2_name || match.team2_label || "Team 2"}
                            scale="md"
                            className="shrink-0"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-3 text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-3 flex-wrap">
                        {match.venue_name ? (
                          <span className="inline-flex items-center gap-1">
                            <MapPin size={13} className="text-slate-400" />
                            {match.venue_name}
                          </span>
                        ) : null}
                        {match.scheduled_at ? (
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays size={13} className="text-slate-400" />
                            {match.scheduled_at}
                          </span>
                        ) : null}
                      </div>

                      <div className="inline-flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform">
                        <span>Open match details</span>
                        <ArrowRight size={14} />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ────────────────────────────────────────────────────────────
            PURPOSE 2: CORRECTION REQUESTS QUEUE
           ──────────────────────────────────────────────────────────── */
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm font-medium text-[var(--text-main)]">
              Status
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="mt-1 block min-w-44 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm"
              >
                <option value="">All statuses</option>
                {statusOptions.filter(Boolean).map((item) => (
                  <option key={item} value={item}>
                    {correctionStatusPresentation(item).label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-[var(--text-main)]">
              Correction type
              <select
                value={type}
                onChange={(event) => setType(event.target.value)}
                className="mt-1 block min-w-52 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm"
              >
                <option value="">All types</option>
                {correctionTypes.map((item) => (
                  <option key={item} value={item}>
                    {item.replaceAll("_", " ").toLowerCase()}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={loadCorrections}
              disabled={loading}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border-soft)] px-3 py-2 text-sm font-semibold text-[var(--text-main)]"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>

          {loading ? (
            <div className="space-y-3" aria-label="Loading correction requests">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-28 animate-pulse rounded-2xl bg-[var(--surface-soft)]" />
              ))}
            </div>
          ) : visibleRows.length === 0 ? (
            <div className="py-16 text-center">
              <ClipboardCheck className="mx-auto text-[var(--text-muted)]" size={32} />
              <h2 className="mt-3 font-semibold text-[var(--text-main)]">No correction requests</h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Completed match correction requests will appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {visibleRows.map((row) => {
                const presentation = correctionStatusPresentation(row.status);
                const blocked = (row.impact_snapshot?.blockers || []).length > 0;
                return (
                  <article key={row.id} className="rounded-2xl bg-[var(--surface-soft)] p-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-semibold text-[var(--text-main)]">
                            Match #{row.match_id} · Correction v{row.correction_version}
                          </h2>
                          <span className="rounded-full bg-[var(--surface)] px-2.5 py-1 text-xs font-semibold text-[var(--text-muted)]">
                            {presentation.label}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-[var(--text-muted)]">
                          {row.correction_type.replaceAll("_", " ").toLowerCase()} · Sport #{row.sport_id}
                          {row.event_id ? ` · Event #${row.event_id}` : ""}
                        </p>
                      </div>
                      <Link
                        to={`${rolePrefix}/matches/${row.match_id}`}
                        state={{ from: location.pathname + location.search }}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-cyan-700 hover:underline dark:text-cyan-300"
                      >
                        Open Match <ExternalLink size={14} />
                      </Link>
                    </div>

                    <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                          Requested change
                        </p>
                        <p className="mt-1 text-sm text-[var(--text-main)]">
                          {(row.impact_snapshot?.result_changes || [])
                            .map((item) => `${item.field.replaceAll("_", " ")}: ${item.before ?? "—"} → ${item.after ?? "—"}`)
                            .join(" · ") || "Review the proposed official result."}
                        </p>
                        <p className="mt-2 text-xs text-[var(--text-muted)]">Reason: {row.reason}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Impact</p>
                        <ul className="mt-1 space-y-1 text-sm text-[var(--text-muted)]">
                          {summarizeCorrectionImpact(row.impact_snapshot).map((item) => (
                            <li key={item}>• {item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {blocked ? (
                      <div className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-500/10 dark:text-rose-200">
                        <p className="flex items-center gap-2 font-semibold">
                          <ShieldAlert size={16} /> Downstream repair required
                        </p>
                        {row.impact_snapshot.blockers.map((item) => (
                          <p key={item.code} className="mt-1">
                            {item.message}
                          </p>
                        ))}
                      </div>
                    ) : null}

                    {isCoordinator && row.status === "SUBMITTED" ? (
                      <div className="mt-4 flex flex-wrap items-end gap-2">
                        <label className="min-w-64 flex-1 text-sm font-medium text-[var(--text-main)]">
                          Review note
                          <input
                            value={reviewNotes[row.id] || ""}
                            onChange={(event) =>
                              setReviewNotes((current) => ({
                                ...current,
                                [row.id]: event.target.value,
                              }))
                            }
                            className="mt-1 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => runAction(row, "reject")}
                          disabled={workingId === row.id}
                          className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-700 dark:text-rose-300"
                        >
                          <X size={15} /> Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => runAction(row, "approve")}
                          disabled={workingId === row.id || blocked}
                          className="inline-flex min-h-10 items-center gap-1 rounded-xl bg-cyan-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                        >
                          <Check size={15} /> Approve
                        </button>
                      </div>
                    ) : null}

                    {isCoordinator && row.status === "APPROVED" ? (
                      <div className="mt-4 flex justify-end">
                        <button
                          type="button"
                          onClick={() => runAction(row, "apply")}
                          disabled={workingId === row.id || blocked}
                          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                        >
                          {workingId === row.id ? "Applying…" : "Apply correction"}
                        </button>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ResultCorrectionsPage;
