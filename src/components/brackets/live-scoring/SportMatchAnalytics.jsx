import React, { useMemo, useState } from "react";
import { buildMultiSportStats } from "./sportStatsEngine.js";

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatBar({ label, v1, v2, max, color1 = "bg-cyan-500", color2 = "bg-violet-500" }) {
  const safeMax = Math.max(max, 1);
  const w1 = Math.round((v1 / safeMax) * 100);
  const w2 = Math.round((v2 / safeMax) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs font-semibold tabular-nums">
        <span className="text-cyan-700 dark:text-cyan-300">{v1}</span>
        <span className="text-[var(--text-muted)] font-medium">{label}</span>
        <span className="text-violet-700 dark:text-violet-300">{v2}</span>
      </div>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-[var(--surface-muted)]">
        <div
          className={`h-full rounded-l-full transition-all duration-500 ${color1}`}
          style={{ width: `${w1}%` }}
        />
        <div
          className={`ml-auto h-full rounded-r-full transition-all duration-500 ${color2}`}
          style={{ width: `${w2}%` }}
        />
      </div>
    </div>
  );
}

function SectionHeader({ children }) {
  return (
    <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
      {children}
    </p>
  );
}

function PlayerLeaderRow({ rank, name, value, label, accent }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${
          rank === 1
            ? "bg-amber-400 text-amber-950"
            : rank === 2
            ? "bg-slate-300 text-slate-800 dark:bg-slate-600 dark:text-white"
            : rank === 3
            ? "bg-amber-700 text-amber-100"
            : "bg-[var(--surface-muted)] text-[var(--text-muted)]"
        }`}
      >
        {rank}
      </span>
      <span className="min-w-0 flex-1 truncate text-xs font-semibold">{name}</span>
      <span className={`text-xs font-black tabular-nums ${accent}`}>
        {value}
        {label ? <span className="ml-0.5 text-[10px] font-normal text-[var(--text-muted)]">{label}</span> : null}
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * SportMatchAnalytics: Renders live match statistics tailored to the specific sport.
 * Supports: Badminton, Sepak Takraw, Volleyball, Tennis, Table Tennis, and Basketball.
 */
export default function SportMatchAnalytics({
  sportKey = "badminton",
  participants = [],
  scores = [0, 0],
  timeline = [],
  currentPeriod = null,
  playerStats = null,
  teamStats = null,
}) {
  const [activeTab, setActiveTab] = useState("comparison"); // "comparison" | "leaders" | "boxscore"
  const [boxScoreTeamFilter, setBoxScoreTeamFilter] = useState("all");

  const p1 = participants?.[0];
  const p2 = participants?.[1];

  const p1Target = String(p1?.scoring_target_id || p1?.id || "");
  const p2Target = String(p2?.scoring_target_id || p2?.id || "");

  const teamIds = useMemo(
    () => [p1Target, p2Target].filter(Boolean),
    [p1Target, p2Target]
  );

  const { schema, stats } = useMemo(
    () => buildMultiSportStats(sportKey, timeline || [], teamIds, participants, playerStats, teamStats),
    [sportKey, timeline, teamIds, participants, playerStats, teamStats]
  );

  const s1 = stats[p1Target] || stats[String(p1?.id || "")] || stats[String(p1?.scoring_target_id || "")] || {};
  const s2 = stats[p2Target] || stats[String(p2?.id || "")] || stats[String(p2?.scoring_target_id || "")] || {};

  const score1 = scores?.[0] ?? s1.pts ?? s1.gamesWon ?? 0;
  const score2 = scores?.[1] ?? s2.pts ?? s2.gamesWon ?? 0;

  // Build sorted player list
  const allPlayers = useMemo(() => {
    const list = [];
    for (const teamId of teamIds) {
      const s = stats[teamId] || {};
      const teamObj = participants.find((p) => String(p?.id) === String(teamId));
      const teamName = teamObj?.shortName || teamObj?.displayName || teamObj?.display_name || teamObj?.name || `Team ${teamId}`;

      for (const [pid, pMetrics] of Object.entries(s.playerMetrics || {})) {
        const name = s.playerName?.[pid] || `Player ${pid}`;
        const totalActivity = Object.values(pMetrics).reduce((sum, v) => sum + Number(v || 0), 0);
        list.push({
          pid,
          name,
          teamId,
          teamName,
          metrics: pMetrics,
          totalActivity,
        });
      }
    }
    return list;
  }, [stats, teamIds, participants]);

  // Derive leaders for each category defined in schema
  const leadersByCategory = useMemo(() => {
    const result = {};
    for (const cat of schema.leaderCategories || []) {
      const key = cat.key;
      let sorted = [];
      if (key === "def") {
        // composite defense (stl + blk)
        sorted = [...allPlayers]
          .filter((p) => Number(p.metrics.stl || 0) + Number(p.metrics.blk || 0) > 0)
          .sort((a, b) => (Number(b.metrics.stl || 0) + Number(b.metrics.blk || 0)) - (Number(a.metrics.stl || 0) + Number(a.metrics.blk || 0)))
          .slice(0, 5);
      } else {
        sorted = [...allPlayers]
          .filter((p) => Number(p.metrics[key] || 0) > 0)
          .sort((a, b) => Number(b.metrics[key] || 0) - Number(a.metrics[key] || 0))
          .slice(0, 5);
      }
      result[key] = sorted;
    }
    return result;
  }, [allPlayers, schema.leaderCategories]);

  // Check if any stats have been recorded
  const hasAnyData = useMemo(() => {
    let total = 0;
    for (const m of schema.metrics) {
      total += Number(s1[m.key] || 0) + Number(s2[m.key] || 0);
    }
    return (
      total > 0 ||
      Number(score1 || 0) > 0 ||
      Number(score2 || 0) > 0 ||
      allPlayers.some((p) => p.totalActivity > 0)
    );
  }, [s1, s2, schema.metrics, score1, score2, allPlayers]);

  if (!p1 || !p2) return null;

  const p1FilterId = String(p1?.scoring_target_id || p1?.id || "1");
  const p2FilterId = String(p2?.scoring_target_id || p2?.id || "2");

  const filteredBoxScorePlayers =
    boxScoreTeamFilter === "all"
      ? allPlayers
      : allPlayers.filter((p) =>
          String(p.teamId) === String(boxScoreTeamFilter) ||
          (String(boxScoreTeamFilter) === p1FilterId && (String(p.teamId) === String(p1?.id) || String(p.teamId) === String(p1?.scoring_target_id))) ||
          (String(boxScoreTeamFilter) === p2FilterId && (String(p.teamId) === String(p2?.id) || String(p.teamId) === String(p2?.scoring_target_id)))
        );

  const getMetricColor = (tone) => {
    if (tone === "success") return { c1: "bg-emerald-500", c2: "bg-teal-500" };
    if (tone === "warn") return { c1: "bg-amber-500", c2: "bg-orange-500" };
    if (tone === "danger") return { c1: "bg-rose-500", c2: "bg-rose-400" };
    if (tone === "sky") return { c1: "bg-sky-500", c2: "bg-indigo-500" };
    if (tone === "purple") return { c1: "bg-purple-500", c2: "bg-fuchsia-500" };
    return { c1: "bg-cyan-500", c2: "bg-violet-500" };
  };

  return (
    <div className="space-y-4 rounded-2xl bg-[var(--surface-soft)] p-4 sm:p-5">
      {/* ── Header & Navigation ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-soft)] pb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold tracking-tight text-[var(--text-main)]">
            {schema.sportLabel} Statistics
          </h3>
          <span className="rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text-muted)]">
            {currentPeriod ? `${schema.periodLabel || "Set"} ${currentPeriod}` : "Live Match"}
          </span>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center gap-1 rounded-xl bg-[var(--surface-muted)] p-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("comparison")}
            className={`rounded-lg px-2.5 py-1 font-semibold transition ${
              activeTab === "comparison"
                ? "bg-[var(--surface)] text-[var(--text-main)] shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
            }`}
          >
            Team Totals
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("leaders")}
            className={`rounded-lg px-2.5 py-1 font-semibold transition ${
              activeTab === "leaders"
                ? "bg-[var(--surface)] text-[var(--text-main)] shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
            }`}
          >
            Leaders
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("boxscore")}
            className={`rounded-lg px-2.5 py-1 font-semibold transition ${
              activeTab === "boxscore"
                ? "bg-[var(--surface)] text-[var(--text-main)] shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
            }`}
          >
            Box Score
          </button>
        </div>
      </div>

      {/* ── Team Legend Bar ── */}
      <div className="flex items-center justify-between text-xs font-bold">
        <span className="flex items-center gap-1.5 text-cyan-700 dark:text-cyan-300">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-cyan-500" />
          {p1.shortName || p1.displayName || p1.display_name || p1.name || "Team 1"}
          <span className="text-sm font-black tabular-nums">({score1})</span>
        </span>
        <span className="text-[var(--text-muted)] font-normal">vs</span>
        <span className="flex items-center gap-1.5 text-violet-700 dark:text-violet-300">
          <span className="text-sm font-black tabular-nums">({score2})</span>
          {p2.shortName || p2.displayName || p2.display_name || p2.name || "Team 2"}
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-violet-500" />
        </span>
      </div>

      {!hasAnyData ? (
        <p className="py-6 text-center text-xs text-[var(--text-muted)]">
          Live statistics will populate as plays and events are recorded on the court.
        </p>
      ) : activeTab === "comparison" ? (
        <div className="space-y-4">
          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {schema.metrics.map((m) => {
              const v1 = Number(s1[m.key] || 0);
              const v2 = Number(s2[m.key] || 0);
              return (
                <div
                  key={m.key}
                  className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-2.5 shadow-sm"
                >
                  <div className="flex items-center justify-between font-bold tabular-nums">
                    <span className="text-sm text-cyan-700 dark:text-cyan-300">{v1}</span>
                    <span className="text-xs font-medium text-[var(--text-muted)]">{m.label}</span>
                    <span className="text-sm text-violet-700 dark:text-violet-300">{v2}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Comparison Bars */}
          <section className="space-y-3 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-3">
            <SectionHeader>{schema.sportLabel} Performance Breakdown</SectionHeader>
            <div className="space-y-2.5">
              {schema.metrics.map((m) => {
                const v1 = Number(s1[m.key] || 0);
                const v2 = Number(s2[m.key] || 0);
                const { c1, c2 } = getMetricColor(m.tone);
                return (
                  <StatBar
                    key={`bar-${m.key}`}
                    label={m.label}
                    v1={v1}
                    v2={v2}
                    max={Math.max(v1 + v2, 1)}
                    color1={c1}
                    color2={c2}
                  />
                );
              })}
            </div>
          </section>
        </div>
      ) : activeTab === "leaders" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {schema.leaderCategories.map((cat) => {
            const leaders = leadersByCategory[cat.key] || [];
            return (
              <div
                key={`cat-${cat.key}`}
                className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-3"
              >
                <SectionHeader>{cat.label}</SectionHeader>
                {leaders.length === 0 ? (
                  <p className="py-2 text-xs text-[var(--text-muted)]">No records yet</p>
                ) : (
                  <div className="space-y-1.5">
                    {leaders.map((row, i) => {
                      const val = cat.key === "def"
                        ? `${row.metrics.stl || 0} stl · ${row.metrics.blk || 0} blk`
                        : row.metrics[cat.key] || 0;
                      return (
                        <PlayerLeaderRow
                          key={`leader-${cat.key}-${row.pid}`}
                          rank={i + 1}
                          name={row.name}
                          value={val}
                          label={cat.key === "def" ? "" : cat.unit}
                          accent={cat.color}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Box Score View */
        <div className="space-y-3">
          {/* Team Filter Buttons */}
          <div className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setBoxScoreTeamFilter("all")}
              className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                boxScoreTeamFilter === "all"
                  ? "bg-cyan-600 text-white"
                  : "bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"
              }`}
            >
              All Teams
            </button>
            <button
              type="button"
              onClick={() => setBoxScoreTeamFilter(p1FilterId)}
              className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                String(boxScoreTeamFilter) === p1FilterId
                  ? "bg-cyan-600 text-white"
                  : "bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"
              }`}
            >
              {p1.shortName || p1.displayName || p1.display_name || p1.name || "Team 1"}
            </button>
            <button
              type="button"
              onClick={() => setBoxScoreTeamFilter(p2FilterId)}
              className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                String(boxScoreTeamFilter) === p2FilterId
                  ? "bg-violet-600 text-white"
                  : "bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"
              }`}
            >
              {p2.shortName || p2.displayName || p2.display_name || p2.name || "Team 2"}
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]">
            <table className="min-w-full text-xs text-[var(--text-main)]">
              <thead className="border-b border-[var(--border-soft)] bg-[var(--surface-soft)] font-bold text-[var(--text-muted)]">
                <tr>
                  <th scope="col" className="sticky left-0 z-10 bg-[var(--surface-soft)] px-3 py-2 text-left">
                    Player
                  </th>
                  <th scope="col" className="px-2 py-2 text-left">Team</th>
                  {schema.boxScoreColumns.map((col) => (
                    <th key={`head-${col.key}`} scope="col" className="px-2 py-2 text-right">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)] font-medium">
                {filteredBoxScorePlayers.length === 0 ? (
                  <tr>
                    <td colSpan={schema.boxScoreColumns.length + 2} className="py-4 text-center text-[var(--text-muted)]">
                      No player statistics recorded.
                    </td>
                  </tr>
                ) : (
                  filteredBoxScorePlayers.map((player) => (
                    <tr
                      key={`box-${player.teamId}-${player.pid}`}
                      className="hover:bg-[var(--surface-muted)] transition"
                    >
                      <th
                        scope="row"
                        className="sticky left-0 z-10 whitespace-nowrap bg-[var(--surface)] px-3 py-2 text-left font-semibold"
                      >
                        {player.name}
                      </th>
                      <td className="whitespace-nowrap px-2 py-2 text-[var(--text-muted)]">
                        {player.teamName}
                      </td>
                      {schema.boxScoreColumns.map((col) => {
                        const val = Number(player.metrics[col.key] || 0);
                        const isScoreCol = col.key === "pts" || col.key === "gamesWon";
                        return (
                          <td
                            key={`cell-${player.pid}-${col.key}`}
                            className={`px-2 py-2 text-right tabular-nums ${
                              isScoreCol ? "font-black text-[var(--text-main)]" : ""
                            }`}
                          >
                            {val}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
