import React, { useMemo, useState } from "react";

import { buildTeamStats } from "./basketballStatsEngine.js";

export { buildTeamStats };

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
        <span className="ml-0.5 text-[10px] font-normal text-[var(--text-muted)]">{label}</span>
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * Basketball match analytics & box score panel.
 *
 * Props:
 *   participants  – [{id, name, shortName, members, benchMembers}]
 *   scores        – [team1Score, team2Score]
 *   timeline      – timelineWithEffects array
 *   currentPeriod – current period number or label
 *   playerStats   – optional backend player_stats object
 */
export default function BasketballAnalytics({
  participants = [],
  scores = [0, 0],
  timeline = [],
  currentPeriod = null,
  playerStats = null,
}) {
  const [activeTab, setActiveTab] = useState("comparison"); // "comparison" | "leaders" | "boxscore"
  const [boxScoreTeamFilter, setBoxScoreTeamFilter] = useState("all"); // "all" | teamId

  const p1 = participants?.[0];
  const p2 = participants?.[1];

  const teamIds = useMemo(
    () => [String(p1?.id || ""), String(p2?.id || "")].filter(Boolean),
    [p1?.id, p2?.id]
  );

  const stats = useMemo(
    () => buildTeamStats(timeline || [], teamIds, participants, playerStats),
    [timeline, teamIds, participants, playerStats]
  );

  const s1 = stats[String(p1?.id || "")] || {};
  const s2 = stats[String(p2?.id || "")] || {};

  const teamColor = (teamId) =>
    String(teamId) === String(p1?.id)
      ? "text-cyan-700 dark:text-cyan-300"
      : "text-violet-700 dark:text-violet-300";

  // Build sorted player rows
  const allPlayers = useMemo(() => {
    const list = [];
    for (const teamId of teamIds) {
      const s = stats[teamId] || {};
      const teamObj = participants.find((p) => String(p?.id) === String(teamId));
      const teamName = teamObj?.shortName || teamObj?.name || `Team ${teamId}`;

      const playerIds = new Set([
        ...Object.keys(s.playerName || {}),
        ...Object.keys(s.playerPts || {}),
        ...Object.keys(s.playerRebounds || {}),
        ...Object.keys(s.playerAssists || {}),
        ...Object.keys(s.playerSteals || {}),
        ...Object.keys(s.playerBlocks || {}),
        ...Object.keys(s.playerTurnovers || {}),
        ...Object.keys(s.playerFouls || {}),
      ]);

      for (const pid of playerIds) {
        const pts = s.playerPts?.[pid] || 0;
        const reb = s.playerRebounds?.[pid] || 0;
        const offReb = s.playerOffRebounds?.[pid] || 0;
        const defReb = s.playerDefRebounds?.[pid] || 0;
        const ast = s.playerAssists?.[pid] || 0;
        const stl = s.playerSteals?.[pid] || 0;
        const blk = s.playerBlocks?.[pid] || 0;
        const to = s.playerTurnovers?.[pid] || 0;
        const fls = s.playerFouls?.[pid] || 0;
        const ft = s.playerFt?.[pid] || 0;
        const twoP = s.playerTwoP?.[pid] || 0;
        const threeP = s.playerThreeP?.[pid] || 0;
        const name = s.playerName?.[pid] || `Player ${pid}`;

        list.push({
          pid,
          name,
          teamId,
          teamName,
          pts,
          reb,
          offReb,
          defReb,
          ast,
          stl,
          blk,
          to,
          fls,
          ft,
          twoP,
          threeP,
          activity: pts + reb + ast + stl + blk + to + fls,
        });
      }
    }
    return list;
  }, [stats, teamIds, participants]);

  // Leaders
  const topScorers = useMemo(
    () => [...allPlayers].filter((p) => p.pts > 0).sort((a, b) => b.pts - a.pts).slice(0, 5),
    [allPlayers]
  );
  const topRebounders = useMemo(
    () => [...allPlayers].filter((p) => p.reb > 0).sort((a, b) => b.reb - a.reb).slice(0, 5),
    [allPlayers]
  );
  const topPlaymakers = useMemo(
    () => [...allPlayers].filter((p) => p.ast > 0).sort((a, b) => b.ast - a.ast).slice(0, 5),
    [allPlayers]
  );
  const topDefenders = useMemo(
    () =>
      [...allPlayers]
        .filter((p) => p.stl + p.blk > 0)
        .sort((a, b) => b.stl + b.blk - (a.stl + a.blk))
        .slice(0, 5),
    [allPlayers]
  );

  const score1 = scores?.[0] ?? s1.pts ?? 0;
  const score2 = scores?.[1] ?? s2.pts ?? 0;
  const totalPts = score1 + score2;
  const totalReb = (s1.rebounds || 0) + (s2.rebounds || 0);
  const totalAst = (s1.assists || 0) + (s2.assists || 0);
  const totalStl = (s1.steals || 0) + (s2.steals || 0);
  const totalBlk = (s1.blocks || 0) + (s2.blocks || 0);
  const totalTo = (s1.turnovers || 0) + (s2.turnovers || 0);
  const totalFouls = (s1.fouls || 0) + (s2.fouls || 0);

  const hasAnyData =
    totalPts + totalReb + totalAst + totalStl + totalBlk + totalTo + totalFouls > 0;

  if (!p1 || !p2) return null;

  const filteredBoxScorePlayers =
    boxScoreTeamFilter === "all"
      ? allPlayers
      : allPlayers.filter((p) => String(p.teamId) === String(boxScoreTeamFilter));

  return (
    <div className="space-y-4 rounded-2xl bg-[var(--surface-soft)] p-4 sm:p-5">
      {/* ── Header & Navigation ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-soft)] pb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold tracking-tight text-[var(--text-main)]">
            Basketball Statistics
          </h3>
          <span className="rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text-muted)]">
            {currentPeriod ? `Quarter ${currentPeriod}` : "Live Match"}
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
          {p1.shortName || p1.name}
          <span className="text-sm font-black tabular-nums">({score1})</span>
        </span>
        <span className="text-[var(--text-muted)] font-normal">vs</span>
        <span className="flex items-center gap-1.5 text-violet-700 dark:text-violet-300">
          <span className="text-sm font-black tabular-nums">({score2})</span>
          {p2.shortName || p2.name}
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-violet-500" />
        </span>
      </div>

      {!hasAnyData ? (
        <p className="py-6 text-center text-xs text-[var(--text-muted)]">
          Live statistics will populate as plays and events are recorded on the court.
        </p>
      ) : activeTab === "comparison" ? (
        <div className="space-y-4">
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: "Points", v1: score1, v2: score2 },
              { label: "Rebounds", v1: s1.rebounds || 0, v2: s2.rebounds || 0 },
              { label: "Assists", v1: s1.assists || 0, v2: s2.assists || 0 },
              { label: "Steals", v1: s1.steals || 0, v2: s2.steals || 0 },
              { label: "Blocks", v1: s1.blocks || 0, v2: s2.blocks || 0 },
              { label: "Turnovers", v1: s1.turnovers || 0, v2: s2.turnovers || 0 },
              { label: "Fouls", v1: s1.fouls || 0, v2: s2.fouls || 0 },
              { label: "Timeouts", v1: s1.timeouts || 0, v2: s2.timeouts || 0 },
            ].map(({ label, v1, v2 }) => (
              <div
                key={label}
                className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-2.5 shadow-sm"
              >
                <div className="flex items-center justify-between font-bold tabular-nums">
                  <span className="text-sm text-cyan-700 dark:text-cyan-300">{v1}</span>
                  <span className="text-xs font-medium text-[var(--text-muted)]">{label}</span>
                  <span className="text-sm text-violet-700 dark:text-violet-300">{v2}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Scoring Comparison Bars */}
          <section className="space-y-3 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-3">
            <SectionHeader>Scoring Breakdown</SectionHeader>
            <div className="space-y-2.5">
              <StatBar label="Total points" v1={score1} v2={score2} max={totalPts} />
              <StatBar
                label="Free throws (1PT)"
                v1={s1.ft || 0}
                v2={s2.ft || 0}
                max={(s1.ft || 0) + (s2.ft || 0)}
              />
              <StatBar
                label="2-point field goals"
                v1={s1.twoP || 0}
                v2={s2.twoP || 0}
                max={(s1.twoP || 0) + (s2.twoP || 0)}
              />
              <StatBar
                label="3-pointers"
                v1={s1.threeP || 0}
                v2={s2.threeP || 0}
                max={(s1.threeP || 0) + (s2.threeP || 0)}
              />
            </div>
          </section>

          {/* Playmaking & Defense Comparison Bars */}
          <section className="space-y-3 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-3">
            <SectionHeader>Playmaking &amp; Defense</SectionHeader>
            <div className="space-y-2.5">
              <StatBar
                label="Rebounds"
                v1={s1.rebounds || 0}
                v2={s2.rebounds || 0}
                max={Math.max(totalReb, 1)}
                color1="bg-sky-500"
                color2="bg-indigo-500"
              />
              <StatBar
                label="Assists"
                v1={s1.assists || 0}
                v2={s2.assists || 0}
                max={Math.max(totalAst, 1)}
                color1="bg-emerald-500"
                color2="bg-teal-500"
              />
              <StatBar
                label="Steals"
                v1={s1.steals || 0}
                v2={s2.steals || 0}
                max={Math.max(totalStl, 1)}
                color1="bg-amber-500"
                color2="bg-orange-500"
              />
              <StatBar
                label="Blocks"
                v1={s1.blocks || 0}
                v2={s2.blocks || 0}
                max={Math.max(totalBlk, 1)}
                color1="bg-purple-500"
                color2="bg-fuchsia-500"
              />
              <StatBar
                label="Turnovers"
                v1={s1.turnovers || 0}
                v2={s2.turnovers || 0}
                max={Math.max(totalTo, 1)}
                color1="bg-amber-600"
                color2="bg-amber-500"
              />
              <StatBar
                label="Fouls"
                v1={s1.fouls || 0}
                v2={s2.fouls || 0}
                max={Math.max(totalFouls, 1)}
                color1="bg-rose-500"
                color2="bg-rose-400"
              />
            </div>
          </section>
        </div>
      ) : activeTab === "leaders" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Points Leaders */}
          <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-3">
            <SectionHeader>Scoring Leaders</SectionHeader>
            {topScorers.length === 0 ? (
              <p className="py-2 text-xs text-[var(--text-muted)]">No points recorded</p>
            ) : (
              <div className="space-y-1.5">
                {topScorers.map((row, i) => (
                  <PlayerLeaderRow
                    key={`scorer-${row.pid}`}
                    rank={i + 1}
                    name={row.name}
                    value={row.pts}
                    label="pts"
                    accent={teamColor(row.teamId)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Rebounds Leaders */}
          <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-3">
            <SectionHeader>Rebound Leaders</SectionHeader>
            {topRebounders.length === 0 ? (
              <p className="py-2 text-xs text-[var(--text-muted)]">No rebounds recorded</p>
            ) : (
              <div className="space-y-1.5">
                {topRebounders.map((row, i) => (
                  <PlayerLeaderRow
                    key={`reb-${row.pid}`}
                    rank={i + 1}
                    name={row.name}
                    value={row.reb}
                    label="reb"
                    accent="text-sky-700 dark:text-sky-300"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Assists Leaders */}
          <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-3">
            <SectionHeader>Assist Leaders</SectionHeader>
            {topPlaymakers.length === 0 ? (
              <p className="py-2 text-xs text-[var(--text-muted)]">No assists recorded</p>
            ) : (
              <div className="space-y-1.5">
                {topPlaymakers.map((row, i) => (
                  <PlayerLeaderRow
                    key={`ast-${row.pid}`}
                    rank={i + 1}
                    name={row.name}
                    value={row.ast}
                    label="ast"
                    accent="text-emerald-700 dark:text-emerald-300"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Defense Leaders */}
          <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-3">
            <SectionHeader>Steals &amp; Blocks Leaders</SectionHeader>
            {topDefenders.length === 0 ? (
              <p className="py-2 text-xs text-[var(--text-muted)]">No steals/blocks recorded</p>
            ) : (
              <div className="space-y-1.5">
                {topDefenders.map((row, i) => (
                  <PlayerLeaderRow
                    key={`def-${row.pid}`}
                    rank={i + 1}
                    name={row.name}
                    value={`${row.stl} stl · ${row.blk} blk`}
                    label=""
                    accent="text-amber-700 dark:text-amber-300"
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Box Score Table */
        <div className="space-y-3">
          {/* Team Filter Pills */}
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
              onClick={() => setBoxScoreTeamFilter(String(p1.id))}
              className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                String(boxScoreTeamFilter) === String(p1.id)
                  ? "bg-cyan-600 text-white"
                  : "bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"
              }`}
            >
              {p1.shortName || p1.name}
            </button>
            <button
              type="button"
              onClick={() => setBoxScoreTeamFilter(String(p2.id))}
              className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                String(boxScoreTeamFilter) === String(p2.id)
                  ? "bg-violet-600 text-white"
                  : "bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"
              }`}
            >
              {p2.shortName || p2.name}
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
                  <th scope="col" className="px-2 py-2 text-right">PTS</th>
                  <th scope="col" className="px-2 py-2 text-right">REB</th>
                  <th scope="col" className="px-2 py-2 text-right">AST</th>
                  <th scope="col" className="px-2 py-2 text-right">STL</th>
                  <th scope="col" className="px-2 py-2 text-right">BLK</th>
                  <th scope="col" className="px-2 py-2 text-right">TO</th>
                  <th scope="col" className="px-2 py-2 text-right">PF</th>
                  <th scope="col" className="px-2 py-2 text-right">FGM (1/2/3)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)] font-medium">
                {filteredBoxScorePlayers.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-4 text-center text-[var(--text-muted)]">
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
                      <td className="px-2 py-2 text-right font-black tabular-nums text-[var(--text-main)]">
                        {player.pts}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">{player.reb}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{player.ast}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{player.stl}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{player.blk}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-amber-700 dark:text-amber-300">
                        {player.to}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-rose-700 dark:text-rose-300">
                        {player.fls}
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-[11px] tabular-nums text-[var(--text-muted)]">
                        {player.ft}/{player.twoP}/{player.threeP}
                      </td>
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
