import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { RefreshCw, Search } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getLeaderboards, searchGlobal } from "../../services/intelligenceService";

const PATH_ROLE_LABEL = {
  coordinator: "Sports Coordinator",
  department: "Department Manager",
  "sport-facilitator": "Sports Facilitator",
  coach: "Coach",
  viewer: "Viewer",
};

const toTitle = (value) =>
  String(value || "")
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const normalizeMetricValue = (value) => {
  const num = Number(value || 0);
  if (Number.isNaN(num)) return "0";
  return Number.isInteger(num) ? String(num) : num.toFixed(2);
};

const toHumanMetric = (metric) =>
  String(metric || "")
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const EMPTY_SEARCH_RESULT = {
  players: [],
  teams: [],
  matches: [],
  tournaments: [],
};

const GlobalHeader = () => {
  const location = useLocation();
  const { user } = useAuth();

  const [query, setQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchResult, setSearchResult] = useState(EMPTY_SEARCH_RESULT);
  const [hasSearched, setHasSearched] = useState(false);

  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState("");
  const [leaderboardBoard, setLeaderboardBoard] = useState(null);

  const pageSegments = useMemo(
    () => location.pathname.split("/").filter(Boolean),
    [location.pathname]
  );
  const roleKey = pageSegments[0] || "";
  const pageKey = pageSegments[pageSegments.length - 1] || "dashboard";
  const roleLabel = PATH_ROLE_LABEL[roleKey] || "OmniSport";
  const pageTitle = toTitle(pageKey);
  const userLabel = user?.full_name || user?.username || user?.email || "Signed in";

  const loadGlobalLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true);
    setLeaderboardError("");
    try {
      const payload = await getLeaderboards({
        type: "all",
        metric: "points",
        limit: 5,
      });
      const groups = Array.isArray(payload?.data) ? payload.data : [];
      const firstWithRows = groups.find(
        (entry) => Array.isArray(entry?.rows) && entry.rows.length > 0
      );
      setLeaderboardBoard(firstWithRows || null);
    } catch (error) {
      const detail = error?.response?.data?.detail;
      setLeaderboardError(
        typeof detail === "string" ? detail : "Unable to load global leaderboard."
      );
      setLeaderboardBoard(null);
    } finally {
      setLeaderboardLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadGlobalLeaderboard();
  }, [loadGlobalLeaderboard]);

  const runGlobalSearch = useCallback(async (inputValue) => {
    const trimmed = String(inputValue || "").trim();
    if (trimmed.length < 2) {
      setSearchResult(EMPTY_SEARCH_RESULT);
      setSearchError("");
      setSearchLoading(false);
      setHasSearched(false);
      return;
    }

    setSearchLoading(true);
    setSearchError("");
    setHasSearched(true);
    try {
      const payload = await searchGlobal({
        query: trimmed,
        type: "all",
        limit: 6,
      });
      setSearchResult(payload || EMPTY_SEARCH_RESULT);
    } catch (error) {
      const detail = error?.response?.data?.detail;
      setSearchError(typeof detail === "string" ? detail : "Global search failed.");
      setSearchResult(EMPTY_SEARCH_RESULT);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSearchResult(EMPTY_SEARCH_RESULT);
      setSearchError("");
      setSearchLoading(false);
      setHasSearched(false);
      return undefined;
    }

    const timer = window.setTimeout(() => {
      void runGlobalSearch(trimmed);
    }, 280);

    return () => window.clearTimeout(timer);
  }, [query, runGlobalSearch]);

  const handleSearchSubmit = useCallback(
    (event) => {
      event.preventDefault();
      void runGlobalSearch(query);
    },
    [query, runGlobalSearch]
  );

  const mergedSearchRows = useMemo(() => {
    const rows = [];

    (searchResult.players || []).forEach((entry) => {
      rows.push({
        key: `player-${entry.id}`,
        type: "Player",
        title: entry.title,
        subtitle: entry.subtitle,
      });
    });
    (searchResult.teams || []).forEach((entry) => {
      rows.push({
        key: `team-${entry.id}`,
        type: "Team",
        title: entry.title,
        subtitle: entry.subtitle,
      });
    });
    (searchResult.matches || []).forEach((entry) => {
      rows.push({
        key: `match-${entry.id}`,
        type: "Match",
        title: entry.title,
        subtitle: entry.subtitle,
      });
    });
    (searchResult.tournaments || []).forEach((entry) => {
      rows.push({
        key: `tournament-${entry.id}`,
        type: "Tournament",
        title: entry.title,
        subtitle: entry.subtitle,
      });
    });

    return rows.slice(0, 6);
  }, [searchResult]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white/75 p-4 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/70">
      <div className="grid gap-4 xl:grid-cols-[1.2fr,1.4fr,1fr]">
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400">{roleLabel}</div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{pageTitle}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">{userLabel}</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-200">
            <Search size={15} className="text-cyan-300" />
            Global Search
          </div>
          <form onSubmit={handleSearchSubmit} className="space-y-2">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_0_0_1px_rgba(34,211,238,0.08)] dark:border-slate-700/80 dark:bg-slate-950/90 dark:shadow-[0_0_0_1px_rgba(34,211,238,0.04)]">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search players, teams, matches, intramurals"
                className="w-full rounded-lg border border-transparent bg-transparent px-3 py-2 text-sm text-slate-900 outline-none ring-cyan-500/40 transition focus:ring-2 dark:text-slate-100"
              />
              <button
                type="submit"
                disabled={query.trim().length < 2 || searchLoading}
                className="inline-flex min-w-[88px] items-center justify-center rounded-lg bg-cyan-500 px-3 py-2 text-xs text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {searchLoading ? "Searching..." : "Search"}
              </button>
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-500">
              Auto-search is enabled while typing.
            </div>
          </form>
          {searchError ? (
            <div className="rounded-lg border border-rose-700/40 bg-rose-950/30 px-2.5 py-1.5 text-xs text-rose-200">
              {searchError}
            </div>
          ) : null}
          {hasSearched && mergedSearchRows.length > 0 ? (
            <div className="max-h-44 space-y-1 overflow-auto rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-100 p-2 dark:border-slate-800 dark:from-slate-950/90 dark:to-slate-900/60">
              {mergedSearchRows.map((row) => (
                <button
                  key={row.key}
                  type="button"
                  onClick={() => setQuery(row.title || "")}
                  className="w-full rounded-lg border border-slate-200 bg-white/90 px-2.5 py-2 text-left transition hover:border-cyan-500/40 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:bg-slate-900"
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-900 dark:text-slate-100">{row.title}</span>
                    <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-cyan-200">
                      {row.type}
                    </span>
                  </div>
                  {row.subtitle ? <div className="text-[11px] text-slate-600 dark:text-slate-400">{row.subtitle}</div> : null}
                </button>
              ))}
            </div>
          ) : null}
          {hasSearched &&
          !searchLoading &&
          !searchError &&
          mergedSearchRows.length === 0 ? (
            <div className="text-xs text-slate-600 dark:text-slate-500">No global matches found.</div>
          ) : null}
        </div>

        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Global Leaderboard</div>
            <button
              type="button"
              onClick={() => void loadGlobalLeaderboard()}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RefreshCw size={12} />
            </button>
          </div>

          {leaderboardLoading ? <div className="text-xs text-slate-600 dark:text-slate-400">Loading...</div> : null}
          {leaderboardError ? (
            <div className="rounded-lg border border-rose-700/40 bg-rose-950/30 px-2.5 py-1.5 text-xs text-rose-200">
              {leaderboardError}
            </div>
          ) : null}

          {Array.isArray(leaderboardBoard?.rows) && leaderboardBoard.rows.length > 0 ? (
            <div className="space-y-1.5">
              <div className="text-xs text-slate-600 dark:text-slate-400">
                {String(leaderboardBoard?.leaderboard_type || "global").toUpperCase()} |{" "}
                {toHumanMetric(leaderboardBoard?.metric || "points")}
              </div>
              {leaderboardBoard.rows.slice(0, 3).map((row) => (
                <div
                  key={`${leaderboardBoard.leaderboard_type}-${row.rank}-${row.entity_id || row.name}`}
                  className="flex items-center justify-between rounded-md border border-slate-200 bg-white/90 px-2 py-1.5 dark:border-slate-800 dark:bg-slate-900/60"
                >
                  <span className="text-xs text-slate-900 dark:text-slate-100">
                    #{row.rank} {row.name}
                  </span>
                  <span className="text-xs text-cyan-300">
                    {normalizeMetricValue(row.metric_value)}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
          {!leaderboardLoading &&
          !leaderboardError &&
          (!Array.isArray(leaderboardBoard?.rows) || leaderboardBoard.rows.length === 0) ? (
            <div className="text-xs text-slate-600 dark:text-slate-500">No leaderboard rows yet.</div>
          ) : null}

          <Link
            to={`/${roleKey || "coordinator"}/intelligence`}
            className="inline-block text-xs text-cyan-300 transition hover:text-cyan-200"
          >
            Open full Intelligence Hub
          </Link>
        </div>
      </div>
    </section>
  );
};

export default GlobalHeader;
