import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, RefreshCw } from "lucide-react";
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

import { getSports } from "../../../services/sportService";
import { getTournaments } from "../../../services/tournamentService";
import { createLeaderboardSocket, getLeaderboards } from "../../../services/intelligenceService";
import { useWorkspace } from "../../../context/WorkspaceContext";
import { acceptLeaderboardInvalidation } from "../../../services/realtime/leaderboardInvalidation";
import { getSportDisplayName } from "../../../utils/tournamentEventCategories";
import IdentityImage from "../../common/IdentityImage";

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
  participant: [
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
  { value: "participant", label: "Participants (Solo, Duo & Team)" },
  { value: "team", label: "Legacy Teams" },
  { value: "department", label: "Departments" },
];

const metricOptionsForType = (type) => {
  if (type === "all") {
    return LEADERBOARD_METRICS.player;
  }
  return LEADERBOARD_METRICS[type] || LEADERBOARD_METRICS.player;
};

const normalizeMetricValue = (value) => {
  const num = Number(value || 0);
  if (Number.isNaN(num)) return "0";
  return Number.isInteger(num) ? String(num) : num.toFixed(2);
};

const DynamicLeaderboardPanel = ({
  title = "Dynamic Leaderboards",
  defaultType = "all",
  defaultMetric = "points",
  defaultLimit = 10,
  compact = false,
}) => {
  const { selectedIntramural } = useWorkspace();
  const selectedWorkspaceId = selectedIntramural?.id ?? null;
  const [sports, setSports] = useState([]);
  const [tournaments, setTournaments] = useState([]);

  const [leaderboardType, setLeaderboardType] = useState(defaultType);
  const [leaderboardMetric, setLeaderboardMetric] = useState(defaultMetric);
  const [sportIdFilter, setSportIdFilter] = useState("");
  const [tournamentIdFilter, setTournamentIdFilter] = useState("");
  const [leaderboardLimit, setLeaderboardLimit] = useState(defaultLimit);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState("");
  const [leaderboardResponse, setLeaderboardResponse] = useState({ type: "all", data: [] });
  const [activeLeaderboardIndex, setActiveLeaderboardIndex] = useState(0);
  const [realtimeStatus, setRealtimeStatus] = useState("connecting");
  const [updatedAt, setUpdatedAt] = useState(null);
  const [rankDeltas, setRankDeltas] = useState({});
  const previousRanksRef = useRef(new Map());

  const leaderboardGroups = useMemo(
    () => (Array.isArray(leaderboardResponse?.data) ? leaderboardResponse.data : []),
    [leaderboardResponse]
  );

  const activeBoard = leaderboardGroups[activeLeaderboardIndex] || leaderboardGroups[0] || null;
  const activeIdentityKind = activeBoard?.leaderboard_type === "player" ? "avatar" : "logo";

  const activeMetricOptions = useMemo(() => {
    const serverOptions = activeBoard?.metric_options;
    return Array.isArray(serverOptions) && serverOptions.length > 0
      ? serverOptions
      : metricOptionsForType(leaderboardType);
  }, [activeBoard, leaderboardType]);

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
    if (compact) {
      setSports([]);
      setTournaments([]);
      return undefined;
    }

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
    return undefined;
  }, [compact, selectedWorkspaceId]);

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
      const next = data || { type: leaderboardType, data: [] };
      const nextRanks = new Map();
      const deltas = {};
      (next.data || []).forEach((board) => (board.rows || []).forEach((row) => {
        const key = `${board.leaderboard_type}:${row.entity_id || row.name}`;
        nextRanks.set(key, Number(row.rank));
        const previous = previousRanksRef.current.get(key);
        if (Number.isFinite(previous) && previous !== Number(row.rank)) deltas[key] = previous - Number(row.rank);
      }));
      previousRanksRef.current = nextRanks;
      setRankDeltas(deltas);
      setLeaderboardResponse(next);
      setUpdatedAt(new Date());
      setActiveLeaderboardIndex(0);
    } catch (error) {
      const detail = error?.response?.data?.detail;
      setLeaderboardError(
        typeof detail === "string"
          ? detail
          : detail?.message || "Unable to load leaderboards."
      );
      setLeaderboardResponse({ type: leaderboardType, data: [] });
    } finally {
      setLeaderboardLoading(false);
    }
  }, [leaderboardType, leaderboardMetric, sportIdFilter, tournamentIdFilter, leaderboardLimit]);

  useEffect(() => {
    void loadLeaderboards();
  }, [loadLeaderboards]);

  useEffect(() => {
    const tournamentId = tournamentIdFilter ? Number(tournamentIdFilter) : null;
    const workspaceId = !tournamentId ? Number(selectedWorkspaceId || 0) || null : null;
    if (!tournamentId && !workspaceId) {
      setRealtimeStatus("unavailable");
      return undefined;
    }
    let socket;
    let reconnectTimer;
    let fallbackTimer;
    let debounceTimer;
    let reconnectAttempt = 0;
    let stopped = false;
    const seen = new Map();
    const versions = new Map();
    const scheduleRefresh = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => void loadLeaderboards(), 200);
    };
    const startFallback = () => {
      if (fallbackTimer) return;
      void loadLeaderboards();
      fallbackTimer = setInterval(() => {
        if (!document.hidden) void loadLeaderboards();
      }, 30000);
    };
    const stopFallback = () => {
      clearInterval(fallbackTimer);
      fallbackTimer = null;
    };
    const connect = () => {
      if (stopped) return;
      setRealtimeStatus(reconnectAttempt ? "reconnecting" : "connecting");
      try {
        socket = createLeaderboardSocket({ tournamentId, workspaceId });
      } catch {
        setRealtimeStatus("reconnecting");
        startFallback();
        return;
      }
      socket.onmessage = (event) => {
        let message;
        try { message = JSON.parse(event.data); } catch { return; }
        if (message.type === "ping") { socket?.send?.("ping"); return; }
        if (message.type === "leaderboard.subscription.ack") {
          reconnectAttempt = 0;
          setRealtimeStatus(message?.transport?.available === false ? "reconnecting" : "live");
          stopFallback();
          void loadLeaderboards();
          return;
        }
        if (!acceptLeaderboardInvalidation({ message, sportId: sportIdFilter, seen, versions })) return;
        scheduleRefresh();
      };
      socket.onclose = () => {
        if (stopped) return;
        setRealtimeStatus("reconnecting");
        startFallback();
        const delay = Math.min(15000, 500 * (2 ** reconnectAttempt++));
        reconnectTimer = setTimeout(connect, delay);
      };
      socket.onerror = () => socket?.close?.();
    };
    connect();
    return () => {
      stopped = true;
      clearTimeout(reconnectTimer);
      clearTimeout(debounceTimer);
      stopFallback();
      socket?.close?.();
    };
  }, [loadLeaderboards, selectedWorkspaceId, sportIdFilter, tournamentIdFilter]);

  return (
    <section className={`os-glass-card rounded-xl backdrop-blur-md ${compact ? "space-y-3" : "space-y-4"}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-[var(--text-main)]">
          <BarChart3 size={18} className="text-amber-300" />
          {title}
        </h3>
        <button
          type="button"
          onClick={() => void loadLeaderboards()}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text-main)] transition hover:brightness-105"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
        <span className="text-xs text-[var(--text-muted)]" aria-live="polite">
          {realtimeStatus === "live" ? "Live" : realtimeStatus === "reconnecting" ? "Reconnecting" : "Connecting"}
          {updatedAt ? ` · Updated ${Math.max(0, Math.floor((Date.now() - updatedAt.getTime()) / 60000)) === 0 ? "just now" : "recently"}` : ""}
        </span>
      </div>

      {compact ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <select
            value={leaderboardType}
            onChange={(event) => setLeaderboardType(event.target.value)}
            className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text-main)] outline-none"
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
            className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text-main)] outline-none"
          >
            {activeMetricOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <select
            value={leaderboardType}
            onChange={(event) => setLeaderboardType(event.target.value)}
            className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text-main)] outline-none"
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
            className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text-main)] outline-none"
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
            className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text-main)] outline-none"
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
            className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text-main)] outline-none"
          >
            <option value="">All Intramural Events</option>
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
            className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text-main)] outline-none"
          />
        </div>
      )}

      {leaderboardLoading ? (
        <div className="grid gap-2" aria-label="Loading leaderboard data">
          {[1, 2, 3].map((row) => (
            <div key={row} className="h-10 animate-pulse rounded-lg bg-[var(--surface-soft)] motion-reduce:animate-none" />
          ))}
        </div>
      ) : null}
      {leaderboardError ? (
        <div className="rounded-xl border border-rose-700/40 bg-rose-950/30 px-3 py-2 text-sm text-rose-200">
          {leaderboardError}
        </div>
      ) : null}

      {!compact && leaderboardGroups.length > 1 ? (
          <div className="flex flex-wrap gap-2">
          {leaderboardGroups.map((board, index) => (
            <button
              key={`${board.leaderboard_type}-${index}`}
              type="button"
              onClick={() => setActiveLeaderboardIndex(index)}
              className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                activeLeaderboardIndex === index
                  ? "border-cyan-400/40 bg-cyan-500/10 text-cyan-200"
                  : "border-[var(--border-soft)] bg-[var(--surface)] text-[var(--text-muted)] hover:brightness-105"
              }`}
            >
              {String(board.leaderboard_type || "leaderboard")}
            </button>
          ))}
        </div>
      ) : null}

      {!activeBoard ? (
        <div className="text-sm text-slate-500">
          No official statistics yet. Statistics will appear after Matches are completed.
        </div>
      ) : compact ? (
        <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-4">
          <div className="mb-3">
            <div className="text-sm font-semibold text-[var(--text-main)]">
              {String(activeBoard.leaderboard_type || "Main")} Leaderboard
            </div>
            <div className="text-xs text-[var(--text-muted)]">
              Metric: {String(activeBoard.metric_label || activeBoard.metric || leaderboardMetric || "metric")}
            </div>
          </div>

          <div className="space-y-2">
            {Array.isArray(activeBoard.rows) && activeBoard.rows.length > 0 ? (
              activeBoard.rows.slice(0, 8).map((row) => (
                <div
                  key={`${activeBoard.leaderboard_type}-${row.rank}-${row.entity_id || row.name}`}
                  className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-[var(--text-main)]">
                      <span className="shrink-0">#{row.rank}</span>
                      <IdentityImage imageUrl={row.image_url} label={row.name} kind={activeIdentityKind} scale="sm" className="shrink-0" />
                      <span className="min-w-0 break-words">{row.name}</span>
                    </span>
                    <span className="text-sm text-cyan-300">{normalizeMetricValue(row.metric_value)}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No official statistics yet. Statistics will appear after Matches are completed.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1.2fr,1fr]">
          <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-[var(--text-main)]">
                  {String(activeBoard.leaderboard_type || "Main")} Leaderboard
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  Metric: {String(activeBoard.metric_label || activeBoard.metric || leaderboardMetric || "metric")}
                </div>
              </div>
            </div>
            <div className="h-64 w-full sm:h-80" role="img" aria-label={`${String(activeBoard.leaderboard_type || "Main")} leaderboard chart using ${String(activeBoard.metric_label || activeBoard.metric || leaderboardMetric || "metric")}`}>
              <ResponsiveContainer>
                <BarChart data={leaderboardChartRows} margin={{ top: 8, right: 10, left: 0, bottom: 34 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
                  <XAxis
                    dataKey="name"
                    stroke="var(--text-soft)"
                    interval="preserveStartEnd"
                    minTickGap={24}
                    height={50}
                  />
                  <YAxis stroke="var(--text-soft)" />
                  <Tooltip
                    cursor={{ fill: "rgba(14, 165, 233, 0.10)" }}
                    contentStyle={{
                      backgroundColor: "var(--surface)",
                      border: "1px solid var(--border-soft)",
                      borderRadius: 10,
                      color: "var(--text-main)",
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="metric"
                    name={String(activeBoard.metric || leaderboardMetric || "metric")}
                    fill="#22d3ee"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <ul className="sr-only">{leaderboardChartRows.map((row) => <li key={`leaderboard-chart-summary-${row.name}`}>{row.name}: {row.metric}</li>)}</ul>
          </div>

          <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-4">
            <h4 className="mb-3 text-sm font-semibold tracking-wide text-[var(--text-main)]">Ranking Table</h4>
            <div className="max-h-80 space-y-2 overflow-auto pr-1">
              {Array.isArray(activeBoard.rows) && activeBoard.rows.length > 0 ? (
                activeBoard.rows.map((row) => (
                  <div
                    key={`${activeBoard.leaderboard_type}-${row.rank}-${row.entity_id || row.name}`}
                    className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3 py-2 motion-safe:transition-all motion-safe:duration-200"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-[var(--text-main)]">
                        <span className="shrink-0">#{row.rank}</span>
                        <IdentityImage imageUrl={row.image_url} label={row.name} kind={activeIdentityKind} scale="sm" className="shrink-0" />
                        <span className="min-w-0 break-words">{row.name}</span>
                      </span>
                      <span className="text-sm text-cyan-300">{normalizeMetricValue(row.metric_value)}</span>
                      {rankDeltas[`${activeBoard.leaderboard_type}:${row.entity_id || row.name}`] ? (
                        <span className="ml-2 text-xs text-emerald-300">
                          {rankDeltas[`${activeBoard.leaderboard_type}:${row.entity_id || row.name}`] > 0 ? "↑" : "↓"}
                          {Math.abs(rankDeltas[`${activeBoard.leaderboard_type}:${row.entity_id || row.name}`])}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No official statistics yet. Statistics will appear after Matches are completed.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default DynamicLeaderboardPanel;
