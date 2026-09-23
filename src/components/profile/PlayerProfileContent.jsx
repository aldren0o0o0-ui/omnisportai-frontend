import React, { useState, useEffect, useMemo } from "react";
import PlayerSportSelector from "./PlayerSportSelector";
import PlayerMetricCards from "./PlayerMetricCards";
import PlayerPerformanceChart from "./PlayerPerformanceChart";
import PlayerMatchHistory from "./PlayerMatchHistory";
import { Shield, Users, Activity } from "lucide-react";
import { isRecordForSport } from "./profileUtils";

export const PlayerProfileContent = ({ profile = {} }) => {
  const sports = useMemo(() => {
    return Array.isArray(profile?.sports) ? profile.sports : [];
  }, [profile?.sports]);

  const [selectedSportId, setSelectedSportId] = useState(() => {
    return sports[0]?.sport_id || null;
  });

  const [selectedEventId, setSelectedEventId] = useState("all");

  // Reset selectedEventId to "all" when sport changes
  useEffect(() => {
    setSelectedEventId("all");
  }, [selectedSportId]);

  // Selected sport object (matches sport_id and event_id if specific event is selected)
  const activeSport = useMemo(() => {
    if (!sports.length) return null;
    if (selectedEventId && String(selectedEventId) !== "all") {
      const matchEvent = sports.find(
        (s) =>
          String(s.sport_id) === String(selectedSportId) &&
          String(s.event_id) === String(selectedEventId)
      );
      if (matchEvent) return matchEvent;
    }
    return (
      sports.find((s) => String(s.sport_id) === String(selectedSportId)) ||
      sports[0]
    );
  }, [sports, selectedSportId, selectedEventId]);

  // Overall or sport-specific summary directly from backend canonical analytics
  const summary = useMemo(() => {
    if (!activeSport) {
      const overall = profile?.stats?.summary || {};
      return {
        matches: overall.matches_played ?? overall.total_matches ?? 0,
        wins: overall.wins ?? 0,
        losses: overall.losses ?? 0,
        draws: overall.draws ?? 0,
        label: "Overall Tournament Record",
      };
    }

    // If "all" events selected for this sport, use canonical sport_breakdown or aggregate
    if (String(selectedEventId) === "all") {
      const breakdownList = Array.isArray(profile?.stats?.sport_breakdown)
        ? profile.stats.sport_breakdown
        : [];
      const brk = breakdownList.find(
        (b) => String(b.sport_id) === String(activeSport.sport_id)
      );
      if (brk) {
        return {
          matches: brk.matches ?? 0,
          wins: brk.wins ?? 0,
          losses: brk.losses ?? 0,
          draws: brk.draws ?? 0,
          label: activeSport.sport_name || "Sport Record",
        };
      }
      const sportEvents = sports.filter(
        (s) => String(s.sport_id) === String(activeSport.sport_id)
      );
      return {
        matches: sportEvents.reduce((acc, e) => acc + (e.matches_played || 0), 0),
        wins: sportEvents.reduce((acc, e) => acc + (e.wins || 0), 0),
        losses: sportEvents.reduce((acc, e) => acc + (e.losses || 0), 0),
        draws: sportEvents.reduce((acc, e) => acc + (e.draws || 0), 0),
        label: activeSport.sport_name || "Sport Record",
      };
    }

    // Specific event selected: directly use activeSport matches/wins/losses/draws
    return {
      matches: activeSport.matches_played ?? 0,
      wins: activeSport.wins ?? 0,
      losses: activeSport.losses ?? 0,
      draws: activeSport.draws ?? 0,
      label: activeSport.event_name
        ? `${activeSport.sport_name} · ${activeSport.event_name}`
        : activeSport.sport_name || "Sport Record",
    };
  }, [
    activeSport,
    selectedEventId,
    sports,
    profile?.stats?.sport_breakdown,
    profile?.stats?.summary,
  ]);

  // Participation records filtered by active sport and optional active event context
  const participations = useMemo(() => {
    const list = Array.isArray(profile?.participation) ? profile.participation : [];
    if (!activeSport) return list;
    const isStrictEvent = String(selectedEventId) !== "all";
    const filtered = list.filter((p) =>
      isRecordForSport(p, activeSport, {
        strictEvent: isStrictEvent,
        eventId: selectedEventId,
      })
    );
    const baseList = filtered.length > 0 ? filtered : list;

    // Deduplicate by entry_id / (tournament_id, event_id, entry_id)
    const seen = new Set();
    const deduplicated = [];
    for (const p of baseList) {
      const key = `${p.tournament_id || 0}_${p.event_id || 0}_${p.entry_id || p._entry_id || 0}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(p);
      }
    }
    return deduplicated;
  }, [profile?.participation, activeSport, selectedEventId]);

  // Metrics for active sport / event context (strictly from backend, never fabricated)
  const activeMetrics = useMemo(() => {
    if (selectedEventId && String(selectedEventId) !== "all" && activeSport?.metrics) {
      return Array.isArray(activeSport.metrics) ? activeSport.metrics : [];
    }
    if (activeSport) {
      const sportEvents = sports.filter(
        (s) => String(s.sport_id) === String(activeSport.sport_id)
      );
      const metricsMap = new Map();
      for (const evt of sportEvents) {
        if (Array.isArray(evt.metrics)) {
          for (const m of evt.metrics) {
            const key = m.key || m.code;
            if (!metricsMap.has(key) || (!metricsMap.get(key).available && m.available)) {
              metricsMap.set(key, m);
            }
          }
        }
      }
      if (metricsMap.size > 0) {
        return Array.from(metricsMap.values());
      }
      return Array.isArray(activeSport.metrics) ? activeSport.metrics : [];
    }
    return [];
  }, [activeSport, selectedEventId, sports]);

  // Performance history strictly filtered to active sport and optional active event
  const performanceHistory = useMemo(() => {
    const list = Array.isArray(profile?.performance_history) ? profile.performance_history : [];
    if (!activeSport) return list;
    const isStrictEvent = String(selectedEventId) !== "all";
    return list.filter((p) =>
      isRecordForSport(p, activeSport, {
        strictEvent: isStrictEvent,
        eventId: selectedEventId,
      })
    );
  }, [profile?.performance_history, activeSport, selectedEventId]);

  // Match history strictly filtered to active sport and optional active event
  const matchHistory = useMemo(() => {
    const list = Array.isArray(profile?.match_history) ? profile.match_history : [];
    if (!activeSport) return list;
    const isStrictEvent = String(selectedEventId) !== "all";
    return list.filter((m) =>
      isRecordForSport(m, activeSport, {
        strictEvent: isStrictEvent,
        eventId: selectedEventId,
      })
    );
  }, [profile?.match_history, activeSport, selectedEventId]);

  // If player has no sports registered at all
  if (sports.length === 0) {
    return (
      <div className="space-y-4" data-testid="player-profile-content">
        <div
          className="rounded-xl border border-dashed border-[var(--border-soft)] bg-[var(--surface-soft)] p-6 text-center"
          data-testid="player-no-sports"
        >
          <Activity className="mx-auto h-7 w-7 text-[var(--text-soft)]" aria-hidden="true" />
          <h4 className="mt-2 text-xs font-bold uppercase tracking-wider text-[var(--text-main)]">
            No Sports Registered
          </h4>
          <p className="mt-1 text-xs text-[var(--text-muted)] max-w-xs mx-auto">
            This participant has not yet been assigned to any sports or tournament rosters.
          </p>
        </div>
      </div>
    );
  }

  const hasDraws = summary.draws > 0;

  return (
    <div className="space-y-4" data-testid="player-profile-content">
      {/* Sport / Event Selector */}
      <PlayerSportSelector
        sports={sports}
        selectedSportId={activeSport?.sport_id}
        selectedEventId={selectedEventId}
        onSelectSport={setSelectedSportId}
        onSelectEvent={setSelectedEventId}
      />

      {/* Roster & Participation Context for Active Sport / Event */}
      {participations.length > 0 ? (
        <div
          className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-3"
          data-testid="player-participation-context"
        >
          <div className="flex items-center justify-between text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
            <div className="flex items-center gap-1.5">
              <Users size={13} aria-hidden="true" />
              <span>Roster & Entry Context</span>
            </div>
            {activeSport?.participant_shape ? (
              <span className="rounded bg-[var(--surface)] border border-[var(--border-soft)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--primary)]">
                {activeSport.participant_shape}
              </span>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            {participations.map((part, idx) => {
              const entryTitle = part.entry_name || part.team || part.sport || "Participant Entry";
              const eventTitle = part.event_name || null;
              const tournamentTitle = part.tournament || null;
              const deptTitle = part.department || part.department_name || null;
              const teammates = Array.isArray(part.teammates) ? part.teammates : [];

              return (
                <div
                  key={part.entry_id || idx}
                  className="flex flex-col gap-1 rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] p-2 text-xs text-[var(--text-main)]"
                  data-testid={`participation-card-${part.entry_id || idx}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0 font-semibold">
                      <Shield size={12} className="text-[var(--primary)] shrink-0" aria-hidden="true" />
                      <span className="truncate">{entryTitle}</span>
                      {eventTitle ? (
                        <span className="text-[var(--text-muted)] font-normal truncate">
                          ({eventTitle})
                        </span>
                      ) : null}
                    </div>
                    {part.participant_shape ? (
                      <span className="shrink-0 rounded bg-[var(--surface-muted)] px-1.5 py-0.2 text-[10px] font-bold text-[var(--text-muted)]">
                        {part.participant_shape}
                      </span>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-[var(--text-soft)]">
                    {tournamentTitle ? (
                      <span className="font-medium text-[var(--primary)]">
                        🏆 {tournamentTitle}
                      </span>
                    ) : null}
                    {deptTitle && deptTitle !== entryTitle ? (
                      <span>· {deptTitle}</span>
                    ) : null}
                    {teammates.length > 0 ? (
                      <span className="text-[var(--text-muted)]">
                        · Partner/Teammates: {teammates.join(", ")}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Record Summary Strip (Values directly from backend sports object) */}
      <div className="grid grid-cols-4 gap-2 text-center" data-testid="player-summary-strip">
        <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Played
          </span>
          <p className="mt-0.5 text-lg font-extrabold text-[var(--text-main)]" data-testid="summary-matches">
            {summary.matches}
          </p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Wins
          </span>
          <p className="mt-0.5 text-lg font-extrabold text-emerald-600 dark:text-emerald-400" data-testid="summary-wins">
            {summary.wins}
          </p>
        </div>
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
            Losses
          </span>
          <p className="mt-0.5 text-lg font-extrabold text-rose-600 dark:text-rose-400" data-testid="summary-losses">
            {summary.losses}
          </p>
        </div>
        <div className={`rounded-xl border p-2.5 ${hasDraws ? "border-amber-500/20 bg-amber-500/5" : "border-[var(--border-soft)] bg-[var(--surface-soft)]"}`}>
          <span className={`text-[10px] font-bold uppercase tracking-wider ${hasDraws ? "text-amber-600 dark:text-amber-400" : "text-[var(--text-muted)]"}`}>
            Draws
          </span>
          <p className={`mt-0.5 text-lg font-extrabold ${hasDraws ? "text-amber-600 dark:text-amber-400" : "text-[var(--text-muted)]"}`} data-testid="summary-draws">
            {summary.draws}
          </p>
        </div>
      </div>

      {/* Sport-specific Metrics (Never fabricates unrecorded stats) */}
      <PlayerMetricCards
        metrics={activeMetrics}
        title={activeSport ? `${activeSport.sport_name} Metrics` : "Sport Metrics"}
      />

      {/* Performance Trend Chart (Strictly for active sport) */}
      <PlayerPerformanceChart
        performanceHistory={performanceHistory}
        title={activeSport ? `${activeSport.sport_name} Performance` : "Performance Trend"}
        sportName={activeSport?.sport_name}
      />

      {/* Chronological Match History (Strictly for active sport) */}
      <PlayerMatchHistory
        matchHistory={matchHistory}
        title={activeSport ? `${activeSport.sport_name} Matches` : "Match History"}
      />
    </div>
  );
};

export default PlayerProfileContent;
