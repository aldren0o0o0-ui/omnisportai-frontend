import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, BarChart3, Medal, Radio, Trophy } from "lucide-react";
import { motion as Motion } from "framer-motion";
import { TeamLogo, SportIcon } from "../../components/common/IdentityImage";
import { useWorkspace } from "../../context/WorkspaceContext";
import { createLeaderboardSocket } from "../../services/intelligenceService";
import { getChampionshipStandings, getDepartmentStandings } from "../../services/standingsService";
import { getTournaments } from "../../services/tournamentService";
import { getEventDisplayName, getSportDisplayName } from "../../utils/tournamentEventCategories";
import AnalyticsStandingsPanel from "./AnalyticsStandingsPanel";

const pointsLabel = (value) => `${Number(value || 0).toLocaleString()} pts`;
const placement = (row, rank) => row?.placements?.[rank] || row?.placements?.[String(rank)] || null;
const Loading = () => <div className="grid min-h-64 place-items-center text-sm text-[var(--text-muted)]">Loading official standings…</div>;
const Empty = ({ children }) => <div className="grid min-h-52 place-items-center px-5 text-center text-sm text-[var(--text-muted)]">{children}</div>;
const chooseStandingsTournament = (rows) => {
  const items = Array.isArray(rows) ? rows : [];
  return items.find((row) => String(row?.lifecycle_status || "").toUpperCase() === "STARTED")
    || items.find((row) => row?.is_started)
    || items.find((row) => !row?.is_archived)
    || items[0]
    || null;
};

const DepartmentCompetitionTable = ({ rows, error }) => (
  <section className="overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] shadow-[var(--shadow-sm)]" aria-labelledby="competition-perf-title">
    <div className="border-b border-[var(--border-soft)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="competition-perf-title" className="flex items-center gap-2 text-base font-bold">
          <Activity size={18} className="text-[var(--primary)]" />
          Competition performance
        </h2>
        <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-300">
          Match results to date
        </span>
      </div>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        Results from finalized matches to date. Ongoing matches are excluded until officially concluded.
      </p>
    </div>
    {error ? (
      <div role="alert" className="m-4 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
        {error}
      </div>
    ) : rows.length === 0 ? (
      <Empty>No finalized match results recorded yet across any department.</Empty>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <caption className="sr-only">Department overall match and competition performance</caption>
          <thead className="bg-[var(--surface-soft)] text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
            <tr>
              <th className="px-4 py-3 text-left">Rank</th>
              <th className="px-4 py-3 text-left">Department / Team</th>
              <th className="px-3 py-3 text-center">Played</th>
              <th className="px-3 py-3 text-center font-extrabold text-emerald-600 dark:text-emerald-400">Wins</th>
              <th className="px-3 py-3 text-center text-rose-600 dark:text-rose-400">Losses</th>
              <th className="px-3 py-3 text-center">Diff</th>
              <th className="px-4 py-3 text-right text-[var(--primary)]">Comp. Pts</th>
              <th className="px-3 py-3 text-right">Win Rate</th>
              <th className="px-4 py-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-soft)]">
            {rows.map((row) => {
              const meta = row.metadata || {};
              const played = Number(meta.matches_played ?? meta.played ?? 0);
              const wins = Number(meta.wins ?? 0);
              const losses = Number(meta.losses ?? 0);
              const diff = Number(meta.score_difference ?? 0);
              const compPts = Number(meta.competition_points ?? meta.points ?? 0);
              const winRate = Number(meta.win_rate ?? (played > 0 ? (wins / played) * 100 : 0));
              const formattedDiff = diff > 0 ? `+${diff.toFixed(1).replace(/\.0$/, "")}` : diff.toFixed(1).replace(/\.0$/, "");
              const isLeader = row.rank === 1;
              return (
                <tr key={row.entity_id || row.name} className={isLeader ? "bg-amber-500/5" : "hover:bg-[var(--surface-soft)]"}>
                  <td className="px-4 py-3">
                    <span className={`inline-grid size-8 place-items-center rounded-full text-xs font-extrabold ${row.rank === 1 ? "bg-amber-500/20 text-amber-700 dark:text-amber-300" : row.rank === 2 ? "bg-slate-400/15" : row.rank === 3 ? "bg-orange-500/15 text-orange-700 dark:text-orange-300" : "bg-[var(--surface-muted)]"}`}>
                      {row.rank}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <TeamLogo imageUrl={row.image_url} label={meta.department_code || row.name} scale="sm" />
                      <div>
                        <div className="font-bold">{meta.department_code || row.name}</div>
                        {meta.department_code && meta.department_code !== row.name ? (
                          <div className="max-w-56 truncate text-xs text-[var(--text-muted)]">{row.name}</div>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center font-bold tabular-nums">{played}</td>
                  <td className="px-3 py-3 text-center">
                    <span className="inline-grid min-w-8 place-items-center rounded-md bg-emerald-500/15 px-2 py-0.5 font-extrabold tabular-nums text-emerald-700 dark:text-emerald-300 shadow-sm">
                      {wins}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center font-bold tabular-nums text-[var(--text-muted)]">{losses}</td>
                  <td className={`px-3 py-3 text-center font-semibold tabular-nums ${diff > 0 ? "text-emerald-600 dark:text-emerald-400" : diff < 0 ? "text-rose-600 dark:text-rose-400" : "text-[var(--text-muted)]"}`}>
                    {formattedDiff}
                  </td>
                  <td className="px-4 py-3 text-right font-extrabold tabular-nums text-[var(--primary)]">{compPts}</td>
                  <td className="px-3 py-3 text-right font-semibold tabular-nums text-[var(--text-muted)]">{winRate.toFixed(1)}%</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${isLeader ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" : "bg-[var(--surface-muted)] text-[var(--text-muted)]"}`}>
                      {meta.status || (isLeader ? "Leader" : `${wins} wins`)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}
  </section>
);

const ChampionshipChart = ({ rows, departmentRows = [] }) => {
  const [chartMetric, setChartMetric] = useState("wins");
  const maximumChamp = Math.max(...rows.map((row) => Number(row.total_points || 0)), 1);
  const maximumWins = Math.max(...departmentRows.map((dept) => Number(dept.metadata?.wins ?? 0)), 1);

  const deptMap = useMemo(() => {
    const map = new Map();
    for (const dept of departmentRows) {
      const id = dept.entity_id || dept.metadata?.department_id;
      const code = dept.metadata?.department_code;
      if (id) map.set(Number(id), dept);
      if (code) map.set(String(code).toUpperCase(), dept);
    }
    return map;
  }, [departmentRows]);

  const displayRows = useMemo(() => {
    if (chartMetric !== "wins") return rows;
    return [...rows].sort((a, b) => {
      const deptA = deptMap.get(Number(a.department_id)) || deptMap.get(String(a.department_code || "").toUpperCase());
      const deptB = deptMap.get(Number(b.department_id)) || deptMap.get(String(b.department_code || "").toUpperCase());
      const winsA = Number(deptA?.metadata?.wins ?? 0);
      const winsB = Number(deptB?.metadata?.wins ?? 0);
      if (winsB !== winsA) return winsB - winsA;
      return Number(b.total_points || 0) - Number(a.total_points || 0);
    });
  }, [rows, chartMetric, deptMap]);

  return (
    <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)]" aria-labelledby="chart-title">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="chart-title" className="flex items-center gap-2 text-base font-bold">
            <BarChart3 size={18} className="text-[var(--primary)]" />
            Championship points & progress
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {chartMetric === "wins"
              ? "Progress bar reflects finalized match wins across all sports. Official championship points are shown alongside."
              : "Points awarded from finalized sport and event placements. Current match records are shown alongside for context."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-[var(--border-soft)] bg-[var(--surface-soft)] p-0.5 text-xs font-bold">
            <button
              type="button"
              id="chart-metric-wins-btn"
              onClick={() => setChartMetric("wins")}
              className={`rounded-md px-2.5 py-1 transition ${
                chartMetric === "wins"
                  ? "bg-[var(--surface)] text-emerald-600 shadow-sm dark:text-emerald-300"
                  : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
              }`}
            >
              Progress by wins
            </button>
            <button
              type="button"
              id="chart-metric-champ-btn"
              onClick={() => setChartMetric("championship")}
              className={`rounded-md px-2.5 py-1 transition ${
                chartMetric === "championship"
                  ? "bg-[var(--surface)] text-amber-600 shadow-sm dark:text-amber-400"
                  : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
              }`}
            >
              Championship points
            </button>
          </div>
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-300">
            {chartMetric === "wins" ? "Active match progress" : "Official results"}
          </span>
        </div>
      </div>
      <div className="space-y-3.5" role="img" aria-label="Horizontal bar chart of championship points by department">
        {displayRows.map((row, index) => {
          const dept = deptMap.get(Number(row.department_id)) || deptMap.get(String(row.department_code || "").toUpperCase());
          const meta = dept?.metadata || {};
          const wins = Number(meta.wins ?? 0);
          const losses = Number(meta.losses ?? 0);
          const compPts = Number(meta.competition_points ?? meta.points ?? 0);
          const totalPts = Number(row.total_points || 0);

          const barPercent = chartMetric === "wins"
            ? (wins / maximumWins) * 100
            : (totalPts / maximumChamp) * 100;

          return (
            <div key={row.department_id} className="grid grid-cols-[minmax(80px,160px)_1fr] items-center gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <TeamLogo imageUrl={row.logo_url} label={row.department_code || row.department_name} scale="sm" />
                <span className="truncate text-sm font-bold">{row.department_code || row.department_name}</span>
              </div>
              <div className="relative h-9 overflow-hidden rounded-lg bg-[var(--surface-muted)]">
                <Motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(barPercent, 4)}%` }}
                  transition={{ duration: 0.55, delay: index * 0.05 }}
                  className={`h-full rounded-lg ${
                    chartMetric === "wins"
                      ? index === 0
                        ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                        : "bg-gradient-to-r from-[var(--primary)] to-emerald-500/80"
                      : index === 0 && totalPts > 0
                        ? "bg-gradient-to-r from-amber-500 to-amber-400"
                        : "bg-[var(--primary)]"
                  }`}
                />
                <div className="absolute inset-y-0 right-3 flex items-center gap-2 text-xs tabular-nums font-bold">
                  {chartMetric === "wins" ? (
                    <>
                      <span className="font-extrabold text-[var(--text-main)]">{wins} wins</span>
                      <span className="text-[11px] font-semibold text-[var(--text-muted)]">
                        ({totalPts > 0 ? pointsLabel(totalPts) : "0 champ. pts"})
                      </span>
                    </>
                  ) : totalPts === 0 ? (
                    <span className="text-[11px] font-semibold text-[var(--text-muted)] italic">0 pts · provisional</span>
                  ) : (
                    <span className="font-extrabold text-[var(--text-main)]">{pointsLabel(totalPts)}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

const MedalTable = ({ rows, scoring }) => <section className="overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] shadow-[var(--shadow-sm)]" aria-labelledby="overall-title">
  <div className="border-b border-[var(--border-soft)] p-5"><h2 id="overall-title" className="flex items-center gap-2 text-base font-bold"><Trophy size={18} className="text-amber-500" />Official championship standings</h2><p className="mt-1 text-xs text-[var(--text-muted)]">Medal and championship points awarded after event finalization · Gold {scoring.gold} · Silver {scoring.silver} · Bronze {scoring.bronze} · 4th {scoring.fourth} · Participation {scoring.participation}</p></div>
  <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><caption className="sr-only">Overall championship medal and points standings</caption><thead className="bg-[var(--surface-soft)] text-[11px] uppercase tracking-wide text-[var(--text-muted)]"><tr><th className="px-4 py-3 text-left">Rank</th><th className="px-4 py-3 text-left">Department / Team</th><th className="px-3 py-3 text-center text-amber-600">Gold ({scoring.gold})</th><th className="px-3 py-3 text-center">Silver ({scoring.silver})</th><th className="px-3 py-3 text-center text-orange-700 dark:text-orange-300">Bronze ({scoring.bronze})</th><th className="px-3 py-3 text-center">4th ({scoring.fourth})</th><th className="px-3 py-3 text-center">Participation ({scoring.participation})</th><th className="px-4 py-3 text-right">Total points</th><th className="px-4 py-3 text-right">Status</th></tr></thead><tbody className="divide-y divide-[var(--border-soft)]">{rows.map((row) => <tr key={row.department_id} className={row.rank === 1 ? "bg-amber-500/5" : "hover:bg-[var(--surface-soft)]"}><td className="px-4 py-3"><span className={`inline-grid size-8 place-items-center rounded-full text-xs font-extrabold ${row.rank === 1 ? "bg-amber-500/20 text-amber-700 dark:text-amber-300" : row.rank === 2 ? "bg-slate-400/15" : row.rank === 3 ? "bg-orange-500/15 text-orange-700 dark:text-orange-300" : "bg-[var(--surface-muted)]"}`}>{row.rank}</span></td><td className="px-4 py-3"><div className="flex items-center gap-2.5"><TeamLogo imageUrl={row.logo_url} label={row.department_name} scale="sm" /><div><div className="font-bold">{row.department_code || row.department_name}</div>{row.department_code ? <div className="max-w-56 truncate text-xs text-[var(--text-muted)]">{row.department_name}</div> : null}</div></div></td>{["gold", "silver", "bronze", "fourth", "participation"].map((key) => <td key={key} className="px-3 py-3 text-center font-bold tabular-nums">{row[key]}</td>)}<td className="px-4 py-3 text-right font-extrabold tabular-nums text-[var(--primary)]">{row.total_points}</td><td className="px-4 py-3 text-right"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${row.rank === 1 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" : "bg-[var(--surface-muted)] text-[var(--text-muted)]"}`}>{row.status}</span></td></tr>)}</tbody></table></div>
  <div className="border-t border-[var(--border-soft)] bg-[var(--surface-soft)]/50 px-5 py-3 text-xs text-[var(--text-muted)]">
    Championship points are awarded when an entire sport or event is finalized. Current match performance is shown separately above.
  </div>
</section>;

const SportBreakdown = ({ rows }) => <section className="overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] shadow-[var(--shadow-sm)]" aria-labelledby="breakdown-title">
  <div className="border-b border-[var(--border-soft)] p-5"><h2 id="breakdown-title" className="flex items-center gap-2 text-base font-bold"><Medal size={18} className="text-amber-500" />Sport-by-sport breakdown</h2><p className="mt-1 text-xs text-[var(--text-muted)]">Final placements with existing sport and team images</p></div>
  <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><caption className="sr-only">Final placements by sport and event</caption><thead className="bg-[var(--surface-soft)] text-[11px] uppercase tracking-wide text-[var(--text-muted)]"><tr><th className="px-4 py-3 text-left">Sport / event</th>{["Gold (1st)", "Silver (2nd)", "Bronze (3rd)", "4th place"].map((label) => <th key={label} className="px-4 py-3 text-left">{label}</th>)}</tr></thead><tbody className="divide-y divide-[var(--border-soft)]">{rows.map((row) => { const sportLabel = getSportDisplayName(row); return <tr key={`${row.sport_id}-${row.event_id || "all"}`} className="hover:bg-[var(--surface-soft)]"><td className="px-4 py-3"><div className="flex items-center gap-2.5"><SportIcon imageUrl={row.sport_image_url} label={sportLabel} scale="sm" /><div><div className="font-bold">{sportLabel}</div>{row.event_name ? <div className="text-xs text-[var(--text-muted)]">{getEventDisplayName(row)}</div> : null}</div></div></td>{[1, 2, 3, 4].map((rank) => { const item = placement(row, rank); return <td key={rank} className="px-4 py-3">{item ? <div className="flex items-center gap-2"><TeamLogo imageUrl={item.entry_logo_url || item.department_logo_url} label={item.entry_name || item.department_name} scale="sm" /><div className="min-w-0"><div className="max-w-40 truncate font-semibold">{item.entry_name}</div><div className="text-xs text-[var(--text-muted)]">{item.department_code || item.department_name}</div></div></div> : <span className="text-[var(--text-soft)]">—</span>}</td>; })}</tr>; })}</tbody></table></div>
</section>;

const StandingsPage = () => {
  const { selectedIntramural } = useWorkspace();
  const workspaceId = Number(selectedIntramural?.id || 0) || null;
  const [tournamentId, setTournamentId] = useState(null);
  const [payload, setPayload] = useState(null);
  const [departmentPayload, setDepartmentPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [champError, setChampError] = useState("");
  const [deptError, setDeptError] = useState("");
  const [live, setLive] = useState(false);
  const [activeTab, setActiveTab] = useState("overall");
  const [analyticsRefresh, setAnalyticsRefresh] = useState(0);
  const requestSequence = useRef(0);

  useEffect(() => {
    const requestId = ++requestSequence.current;
    setTournamentId(null);
    setPayload(null);
    setDepartmentPayload(null);
    setChampError("");
    setDeptError("");
    setLive(false);
    setLoading(Boolean(workspaceId));
    if (!workspaceId) return undefined;
    let active = true;
    (async () => {
      try {
        const tournaments = await getTournaments({ workspaceId });
        if (!active || requestId !== requestSequence.current) return;
        setTournamentId(Number(chooseStandingsTournament(tournaments)?.id || 0) || null);
        if (!tournaments?.length) setLoading(false);
      } catch (requestError) {
        if (!active || requestId !== requestSequence.current) return;
        setChampError(requestError?.response?.data?.detail || "Unable to resolve the selected Intramural competition.");
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [workspaceId]);

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!tournamentId) return;
    const requestId = ++requestSequence.current;
    if (!quiet) setLoading(true);
    try {
      const [champRes, deptRes] = await Promise.allSettled([
        getChampionshipStandings({ tournamentId }),
        getDepartmentStandings({ tournamentId }),
      ]);
      if (requestId !== requestSequence.current) return;

      if (champRes.status === "fulfilled") {
        setPayload(champRes.value);
        setChampError("");
      } else {
        setChampError(champRes.reason?.response?.data?.detail || "Championship standings could not be loaded.");
      }

      if (deptRes.status === "fulfilled") {
        setDepartmentPayload(deptRes.value);
        setDeptError("");
      } else {
        setDeptError(deptRes.reason?.response?.data?.detail || "Department competition standings could not be loaded.");
      }
    } finally {
      if (!quiet && requestId === requestSequence.current) setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!tournamentId) return undefined;
    let socket;
    let timer;
    try {
      socket = createLeaderboardSocket({ tournamentId });
      socket.onmessage = (event) => {
        let message;
        try {
          message = JSON.parse(event.data);
        } catch {
          return;
        }
        if (message.type === "leaderboard.subscription.ack") {
          setLive(true);
        } else if (message.type !== "ping") {
          clearTimeout(timer);
          timer = setTimeout(() => {
            void load({ quiet: true });
            setAnalyticsRefresh((value) => value + 1);
          }, 250);
        }
      };
      socket.onclose = () => setLive(false);
    } catch {
      setLive(false);
    }
    return () => {
      clearTimeout(timer);
      socket?.close?.();
    };
  }, [load, tournamentId]);

  const championshipRows = useMemo(() => payload?.leaderboard || [], [payload]);
  const scoring = payload?.scoring || { gold: 100, silver: 70, bronze: 40, fourth: 20, participation: 10 };
  const departmentRows = useMemo(() => departmentPayload?.rows || [], [departmentPayload]);
  const tabs = [{ id: "overall", label: "Overall" }, { id: "sport", label: "Sport / Event" }, { id: "competitors", label: "Teams / Entries" }, { id: "players", label: "Players" }];

  return <Motion.main initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto w-full max-w-[1500px] space-y-4 px-4 py-5 text-[var(--text-main)] sm:px-6 lg:px-8">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">Intramural championship</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">Standings</h1><p className="mt-1 text-sm text-[var(--text-muted)]">Championship and sport rankings</p></div><div className="flex items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-1.5 text-xs font-bold"><Radio size={14} className={live ? "text-emerald-500" : "text-amber-500"} />{live ? "Live updates" : "Connecting"}</div></header>
    <nav aria-label="Standings views" className="overflow-x-auto"><div role="tablist" className="inline-flex min-w-max gap-1 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-1">{tabs.map((tab) => <button key={tab.id} id={`standings-tab-${tab.id}`} type="button" role="tab" aria-selected={activeTab === tab.id} aria-controls={`standings-panel-${tab.id}`} onClick={() => setActiveTab(tab.id)} className={`min-h-10 rounded-lg px-4 text-sm font-bold transition ${activeTab === tab.id ? "bg-[var(--primary)] text-white shadow-sm" : "text-[var(--text-muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--text-main)]"}`}>{tab.label}</button>)}</div></nav>
    <div id={`standings-panel-${activeTab}`} role="tabpanel" aria-labelledby={`standings-tab-${activeTab}`}>
      {activeTab === "overall" ? <div className="space-y-6">
        {champError && deptError ? <div role="alert" className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">Unable to load standings.</div> : null}
        {loading ? <Loading /> : <>
          <ChampionshipChart rows={championshipRows} departmentRows={departmentRows} />
          <DepartmentCompetitionTable rows={departmentRows} error={deptError} />
          <MedalTable rows={championshipRows} scoring={scoring} />
          {payload?.sport_breakdown?.length ? <SportBreakdown rows={payload.sport_breakdown} /> : null}
        </>}
      </div> : <AnalyticsStandingsPanel key={`${tournamentId}-${activeTab}`} tournamentId={tournamentId} mode={activeTab} refreshToken={analyticsRefresh} />}
    </div>
  </Motion.main>;
};

export default StandingsPage;
