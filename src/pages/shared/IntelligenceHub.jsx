import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  BrainCircuit,
  RefreshCw,
  Search,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import PageHeaderCard from "../../components/common/PageHeaderCard";
import DashboardCard from "../../components/common/DashboardCard";
import StatusBadge from "../../components/common/StatusBadge";
import { getSportDisplayName } from "../../utils/tournamentEventCategories";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getSports } from "../../services/sportService";
import { getTournaments } from "../../services/tournamentService";
import { useWorkspace } from "../../context/WorkspaceContext";
import {
  generateMatchSummary,
  getLeaderboards,
  getMatchSummary,
  searchGlobal,
} from "../../services/intelligenceService";

const LEADERBOARD_METRICS = {
  player: [
    { value: "points", label: "Points" },
    { value: "assists", label: "Assists" },
    { value: "rebounds", label: "Rebounds" },
    { value: "steals", label: "Steals" },
    { value: "blocks", label: "Blocks" },
    { value: "turnovers", label: "Turnovers" },
    { value: "rating", label: "Rating" },
    { value: "matches_played", label: "Matches Played" },
  ],
  team: [
    { value: "wins", label: "Wins" },
    { value: "win_rate", label: "Win Rate %" },
    { value: "points_for", label: "Points For" },
    { value: "point_difference", label: "Point Difference" },
    { value: "matches_played", label: "Matches Played" },
  ],
  department: [
    { value: "wins", label: "Wins" },
    { value: "win_rate", label: "Win Rate %" },
    { value: "points_for", label: "Points For" },
    { value: "point_difference", label: "Point Difference" },
    { value: "matches_played", label: "Matches Played" },
  ],
};

const LEADERBOARD_TYPE_OPTIONS = [
  { value: "all", label: "All Leaderboards" },
  { value: "player", label: "Players" },
  { value: "team", label: "Teams" },
  { value: "department", label: "Departments" },
];

const SEARCH_TYPE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "player", label: "Players" },
  { value: "team", label: "Teams" },
  { value: "match", label: "Matches" },
  { value: "tournament", label: "Tournaments" },
];

const STATUS_STYLE = {
  COMPLETED: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  PENDING: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  FAILED: "border-rose-500/40 bg-rose-500/10 text-rose-200",
  NOT_READY: "border-slate-700 bg-slate-900 text-slate-300",
};

const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

const emptySearchResult = {
  counts: {
    players: 0,
    teams: 0,
    matches: 0,
    tournaments: 0,
  },
  players: [],
  teams: [],
  matches: [],
  tournaments: [],
};

const metricOptionsForType = (type) => {
  if (type === "all") {
    return LEADERBOARD_METRICS.player;
  }
  return LEADERBOARD_METRICS[type] || LEADERBOARD_METRICS.player;
};

const toHumanMetric = (metric) =>
  String(metric || "")
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const normalizeMetricValue = (value) => {
  const num = Number(value || 0);
  if (Number.isNaN(num)) return "0";
  return Number.isInteger(num) ? String(num) : num.toFixed(2);
};

const IntelligenceHub = () => {
  const { selectedIntramural } = useWorkspace();
  const selectedWorkspaceId = selectedIntramural?.id ?? null;
  const [sports, setSports] = useState([]);
  const [tournaments, setTournaments] = useState([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState("all");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchResult, setSearchResult] = useState(emptySearchResult);

  const [leaderboardType, setLeaderboardType] = useState("all");
  const [leaderboardMetric, setLeaderboardMetric] = useState("points");
  const [sportIdFilter, setSportIdFilter] = useState("");
  const [tournamentIdFilter, setTournamentIdFilter] = useState("");
  const [leaderboardLimit, setLeaderboardLimit] = useState(10);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState("");
  const [leaderboardResponse, setLeaderboardResponse] = useState({ type: "all", data: [] });
  const [activeLeaderboardIndex, setActiveLeaderboardIndex] = useState(0);

  const [summaryMatchId, setSummaryMatchId] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryGenerateLoading, setSummaryGenerateLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [summaryData, setSummaryData] = useState(null);

  const activeMetricOptions = useMemo(
    () => metricOptionsForType(leaderboardType),
    [leaderboardType]
  );

  const leaderboardGroups = useMemo(
    () => (Array.isArray(leaderboardResponse?.data) ? leaderboardResponse.data : []),
    [leaderboardResponse]
  );

  const activeBoard = leaderboardGroups[activeLeaderboardIndex] || leaderboardGroups[0] || null;

  const leaderboardChartRows = useMemo(() => {
    if (!activeBoard || !Array.isArray(activeBoard.rows)) return [];
    return activeBoard.rows.slice(0, 8).map((row) => ({
      name: row.name,
      metric: Number(row.metric_value || 0),
    }));
  }, [activeBoard]);

  useEffect(() => {
    const metricExists = activeMetricOptions.some((item) => item.value === leaderboardMetric);
    if (!metricExists) {
      setLeaderboardMetric(activeMetricOptions[0]?.value || "points");
    }
  }, [activeMetricOptions, leaderboardMetric]);

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [sportsData, tournamentsData] = await Promise.all([
          getSports(),
          getTournaments(selectedWorkspaceId ? { workspaceId: selectedWorkspaceId } : {}),
        ]);
        setSports(Array.isArray(sportsData) ? sportsData : []);
        setTournaments(Array.isArray(tournamentsData) ? tournamentsData : []);
      } catch {
        setSports([]);
        setTournaments([]);
      }
    };
    void loadFilters();
  }, [selectedWorkspaceId]);

  const loadLeaderboards = useCallback(async () => {
    setLeaderboardLoading(true);
    setLeaderboardError("");
    try {
      const data = await getLeaderboards({
        type: leaderboardType,
        metric: leaderboardMetric,
        sportId: sportIdFilter ? Number(sportIdFilter) : null,
        tournamentId: tournamentIdFilter ? Number(tournamentIdFilter) : null,
        limit: Number(leaderboardLimit) || 10,
      });
      setLeaderboardResponse(data || { type: leaderboardType, data: [] });
      setActiveLeaderboardIndex(0);
    } catch (error) {
      const detail = error?.response?.data?.detail;
      setLeaderboardError(typeof detail === "string" ? detail : "Unable to load leaderboards.");
      setLeaderboardResponse({ type: leaderboardType, data: [] });
    } finally {
      setLeaderboardLoading(false);
    }
  }, [leaderboardType, leaderboardMetric, sportIdFilter, tournamentIdFilter, leaderboardLimit]);

  useEffect(() => {
    void loadLeaderboards();
  }, [loadLeaderboards]);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSearchResult(emptySearchResult);
      setSearchError("");
      setSearchLoading(false);
      return undefined;
    }

    const timer = window.setTimeout(async () => {
      setSearchLoading(true);
      setSearchError("");
      try {
        const data = await searchGlobal({
          query: trimmed,
          type: searchType,
          limit: 10,
          sportId: sportIdFilter ? Number(sportIdFilter) : null,
          tournamentId: tournamentIdFilter ? Number(tournamentIdFilter) : null,
        });
        setSearchResult(data || emptySearchResult);
      } catch (error) {
        const detail = error?.response?.data?.detail;
        setSearchError(typeof detail === "string" ? detail : "Search request failed.");
        setSearchResult(emptySearchResult);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchQuery, searchType, sportIdFilter, tournamentIdFilter]);

  const pollSummaryUntilSettled = useCallback(async (matchId) => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await sleep(1400);
      const latest = await getMatchSummary(matchId);
      setSummaryData(latest);
      const status = String(latest?.status || "").toUpperCase();
      if (status === "COMPLETED" || status === "FAILED") {
        return latest;
      }
    }
    return null;
  }, []);

  const handleLoadSummary = useCallback(async (explicitMatchId = null) => {
    const parsedMatchId = Number(explicitMatchId ?? summaryMatchId);
    if (!parsedMatchId || parsedMatchId <= 0) {
      setSummaryError("Enter a valid match ID.");
      return;
    }

    setSummaryLoading(true);
    setSummaryError("");
    try {
      const data = await getMatchSummary(parsedMatchId);
      setSummaryData(data);
      setSummaryMatchId(String(parsedMatchId));
    } catch (error) {
      const detail = error?.response?.data?.detail;
      setSummaryError(typeof detail === "string" ? detail : "Unable to load match summary.");
      setSummaryData(null);
    } finally {
      setSummaryLoading(false);
    }
  }, [summaryMatchId]);

  const handleGenerateSummary = useCallback(async () => {
    const parsedMatchId = Number(summaryMatchId);
    if (!parsedMatchId || parsedMatchId <= 0) {
      setSummaryError("Enter a valid match ID before generating.");
      return;
    }

    setSummaryGenerateLoading(true);
    setSummaryError("");
    try {
      const queued = await generateMatchSummary(parsedMatchId, { forceRegenerate: true });
      if (queued?.summary) {
        setSummaryData(queued.summary);
      }
      if (queued?.queued) {
        await pollSummaryUntilSettled(parsedMatchId);
      }
    } catch (error) {
      const detail = error?.response?.data?.detail;
      setSummaryError(typeof detail === "string" ? detail : "Unable to generate match summary.");
    } finally {
      setSummaryGenerateLoading(false);
    }
  }, [summaryMatchId, pollSummaryUntilSettled]);

  const searchSections = useMemo(
    () => [
      { key: "players", title: "Players", rows: searchResult.players || [] },
      { key: "teams", title: "Teams", rows: searchResult.teams || [] },
      { key: "matches", title: "Matches", rows: searchResult.matches || [] },
      { key: "tournaments", title: "Tournaments", rows: searchResult.tournaments || [] },
    ],
    [searchResult]
  );

  return (
    <div className="os-page-shell">
      <PageHeaderCard
        title="AI Intelligence Hub"
        subtitle="Unified global search, live leaderboards, and AI match summary generation for operations and performance intelligence."
        action={
          <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-bold text-cyan-700 dark:border-cyan-800/50 dark:bg-cyan-900/20 dark:text-cyan-300">
            FastAPI + WebSocket
          </div>
        }
      />

      <DashboardCard>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <Search size={20} className="text-blue-500" />
            Global Search
          </h3>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Players, Teams, Matches, Tournaments</span>
        </div>

        <div className="mb-6 grid gap-3 md:grid-cols-[2fr,1fr]">
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Type at least 2 characters..."
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-[var(--surface)] dark:text-slate-100 dark:focus:border-blue-400"
          />
          <select
            value={searchType}
            onChange={(event) => setSearchType(event.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-[var(--surface)] dark:text-slate-100"
          >
            {SEARCH_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {searchLoading ? (
          <div className="mb-4 text-sm font-semibold text-slate-500 dark:text-slate-400">Searching...</div>
        ) : null}
        {searchError ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-200">
            {searchError}
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-2">
          {searchSections.map((section) => (
            <div
              key={section.key}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700/50 dark:bg-[var(--surface-soft)]/50"
            >
              <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-700">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{section.title}</h4>
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-300">{section.rows.length}</span>
              </div>
              {section.rows.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">No matches found.</p>
              ) : (
                <div className="space-y-2">
                  {section.rows.slice(0, 5).map((row) => (
                    <div
                      key={`${section.key}-${row.id}`}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-[var(--surface)]"
                    >
                      <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{row.title}</div>
                      {row.subtitle ? (
                        <div className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">{row.subtitle}</div>
                      ) : null}
                      {section.key === "matches" ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSummaryMatchId(String(row.id));
                            void handleLoadSummary(row.id);
                          }}
                          className="mt-2 inline-flex text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Load summary for match #{row.id}
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </DashboardCard>

      <DashboardCard>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <BarChart3 size={20} className="text-amber-500" />
            Dynamic Leaderboards
          </h3>
          <button
            type="button"
            onClick={() => void loadLeaderboards()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-[var(--surface-soft)] dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        <div className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <select
            value={leaderboardType}
            onChange={(event) => setLeaderboardType(event.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-[var(--surface)] dark:text-slate-100"
          >
            {LEADERBOARD_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={leaderboardMetric}
            onChange={(event) => setLeaderboardMetric(event.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-[var(--surface)] dark:text-slate-100"
          >
            {activeMetricOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={sportIdFilter}
            onChange={(event) => setSportIdFilter(event.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-[var(--surface)] dark:text-slate-100"
          >
            <option value="">All Sports</option>
            {sports.map((sport) => (
              <option key={sport.id} value={sport.id}>
                {getSportDisplayName(sport, "Unassigned sport")}
              </option>
            ))}
          </select>

          <select
            value={tournamentIdFilter}
            onChange={(event) => setTournamentIdFilter(event.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-[var(--surface)] dark:text-slate-100"
          >
            <option value="">All Tournaments</option>
            {tournaments.map((tournament) => (
              <option key={tournament.id} value={tournament.id}>
                {tournament.tournament_name || "Unnamed tournament"}
              </option>
            ))}
          </select>

          <input
            type="number"
            min={3}
            max={50}
            value={leaderboardLimit}
            onChange={(event) => setLeaderboardLimit(Number(event.target.value || 10))}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-[var(--surface)] dark:text-slate-100"
          />
        </div>

        {leaderboardLoading ? (
          <div className="mb-4 text-sm font-semibold text-slate-500 dark:text-slate-400">Loading leaderboard data...</div>
        ) : null}
        {leaderboardError ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-200">
            {leaderboardError}
          </div>
        ) : null}

        {leaderboardGroups.length > 1 ? (
          <div className="mb-6 flex flex-wrap gap-2">
            {leaderboardGroups.map((board, index) => (
              <button
                key={`${board.leaderboard_type}-${index}`}
                type="button"
                onClick={() => setActiveLeaderboardIndex(index)}
                className={`rounded-xl border px-4 py-2 text-xs font-bold transition ${
                  activeLeaderboardIndex === index
                    ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/50 dark:bg-[var(--surface)] dark:text-blue-300"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-[var(--surface-soft)] dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                {String(board.leaderboard_type || "leaderboard").toUpperCase()}
              </button>
            ))}
          </div>
        ) : null}

        {!activeBoard ? (
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400">No leaderboard rows available for the selected filters.</div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1.2fr,1fr]">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700/50 dark:bg-[var(--surface-soft)]/50">
              <div className="mb-4">
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {String(activeBoard.leaderboard_type || "").toUpperCase()} Leaderboard
                </div>
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Metric: {toHumanMetric(activeBoard.metric || leaderboardMetric)}
                </div>
              </div>
              <div className="h-80 w-full">
                <ResponsiveContainer>
                  <BarChart data={leaderboardChartRows} margin={{ top: 8, right: 10, left: 0, bottom: 34 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" className="dark:stroke-slate-700" />
                    <XAxis
                      dataKey="name"
                      stroke="#64748b"
                      angle={-20}
                      textAnchor="end"
                      interval={0}
                      height={70}
                      className="dark:stroke-slate-400"
                    />
                    <YAxis stroke="#64748b" className="dark:stroke-slate-400" />
                    <Tooltip
                      cursor={{ fill: "rgba(59, 130, 246, 0.1)" }}
                      contentStyle={{
                        backgroundColor: "var(--bg-card, #ffffff)",
                        border: "1px solid var(--border-soft, #e2e8f0)",
                        borderRadius: 12,
                        color: "var(--text-main, #0f172a)",
                        fontWeight: 600,
                      }}
                    />
                    <Legend />
                    <Bar dataKey="metric" name={toHumanMetric(activeBoard.metric)} fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700/50 dark:bg-[var(--surface-soft)]/50">
              <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Ranking Table</h4>
              <div className="max-h-[340px] space-y-2 overflow-auto pr-1">
                {Array.isArray(activeBoard.rows) && activeBoard.rows.length > 0 ? (
                  activeBoard.rows.map((row) => (
                    <div
                      key={`${activeBoard.leaderboard_type}-${row.rank}-${row.entity_id || row.name}`}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-[var(--surface)]"
                    >
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        <span className="mr-2 text-slate-500 dark:text-slate-400">#{row.rank}</span> 
                        {row.name}
                      </span>
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{normalizeMetricValue(row.metric_value)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No rows available.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </DashboardCard>

      <DashboardCard>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <BrainCircuit size={20} className="text-purple-500" />
            AI Match Summary
          </h3>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-[var(--surface-soft)] dark:text-slate-400">
            <Sparkles size={13} />
            Stored per match
          </span>
        </div>

        <div className="mb-6 grid gap-3 md:grid-cols-[1fr,auto,auto]">
          <input
            type="number"
            min={1}
            value={summaryMatchId}
            onChange={(event) => setSummaryMatchId(event.target.value)}
            placeholder="Enter match ID"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-[var(--surface)] dark:text-slate-100"
          />
          <button
            type="button"
            onClick={() => void handleLoadSummary()}
            disabled={summaryLoading}
            className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-[var(--surface-soft)] dark:text-slate-300 dark:hover:bg-slate-700"
          >
            {summaryLoading ? "Loading..." : "Load Summary"}
          </button>
          <button
            type="button"
            onClick={() => void handleGenerateSummary()}
            disabled={summaryGenerateLoading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <WandSparkles size={16} />
            {summaryGenerateLoading ? "Generating..." : "Generate / Regenerate"}
          </button>
        </div>

        {summaryError ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-200">
            {summaryError}
          </div>
        ) : null}

        {!summaryData ? (
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Load a match summary to view details.</div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Match {summaryData.match_id || "details unavailable"}</span>
              <StatusBadge status={summaryData.status || "NOT_READY"} />
              {summaryData.source ? (
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-400">
                  Source: {summaryData.source}
                </span>
              ) : null}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700/50 dark:bg-[var(--surface-soft)]/50">
              <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Summary</h4>
              <p className="text-sm font-medium leading-relaxed text-slate-800 dark:text-slate-200">
                {summaryData.summary_text || "No summary content yet."}
              </p>
              {summaryData.mvp_player_name ? (
                <p className="mt-3 text-sm font-bold text-blue-700 dark:text-blue-400">
                  MVP: {summaryData.mvp_player_name}
                  {summaryData.mvp_reason ? <span className="font-medium text-slate-600 dark:text-slate-300"> - {summaryData.mvp_reason}</span> : ""}
                </p>
              ) : null}
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700/50 dark:bg-[var(--surface-soft)]/50">
                <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Highlights</h4>
                {Array.isArray(summaryData.highlights) && summaryData.highlights.length > 0 ? (
                  <div className="space-y-2.5">
                    {summaryData.highlights.map((line, index) => (
                      <div
                        key={`highlight-${index}`}
                        className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-sm dark:border-slate-700 dark:bg-[var(--surface)] dark:text-slate-200"
                      >
                        {line}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No highlights yet.</p>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700/50 dark:bg-[var(--surface-soft)]/50">
                <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Insights</h4>
                {Array.isArray(summaryData.insights) && summaryData.insights.length > 0 ? (
                  <div className="space-y-2.5">
                    {summaryData.insights.map((line, index) => (
                      <div
                        key={`insight-${index}`}
                        className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-sm dark:border-slate-700 dark:bg-[var(--surface)] dark:text-slate-200"
                      >
                        {line}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No insight lines yet.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </DashboardCard>
    </div>
  );
};

export default IntelligenceHub;
