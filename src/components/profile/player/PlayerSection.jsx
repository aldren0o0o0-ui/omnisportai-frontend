import React, { useState, useEffect, useMemo } from "react";
import PlayerSportSelector from "./PlayerSportSelector";
import PlayerRecordStrip from "./PlayerRecordStrip";
import PlayerMetricCards from "./PlayerMetricCards";
import PlayerParticipationCard from "./PlayerParticipationCard";
import PlayerMatchHistory from "./PlayerMatchHistory";
import { Activity } from "lucide-react";
import { isRecordForSport } from "../profileUtils";

/**
 * PlayerSection
 * Modular container for the player profile experience within the selected intramural.
 * Displays:
 * 1. Sport/event selector
 * 2. Universal record summary (played, wins, losses, draws)
 * 3. Sport-specific metrics (non-fabricated)
 * 4. Participation and roster context
 * 5. Completed match history
 */
export const PlayerSection = ({ profile = {} }) => {
  const sports = useMemo(() => {
    return Array.isArray(profile?.sports) ? profile.sports : [];
  }, [profile?.sports]);

  const [selectedSportId, setSelectedSportId] = useState(() => {
    return sports[0]?.sport_id || null;
  });

  const [selectedEventId, setSelectedEventId] = useState("all");

  // Keep selected sport updated if sports array changes
  useEffect(() => {
    if (sports.length > 0) {
      if (!selectedSportId || !sports.some((s) => String(s.sport_id) === String(selectedSportId))) {
        setSelectedSportId(sports[0].sport_id);
      }
    }
  }, [sports, selectedSportId]);

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
        label: "Record Summary",
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
          label: `${activeSport.sport_name || "Sport"} Record`,
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
        label: `${activeSport.sport_name || "Sport"} Record`,
      };
    }

    // Specific event selected: directly use activeSport matches/wins/losses/draws
    return {
      matches: activeSport.matches_played ?? 0,
      wins: activeSport.wins ?? 0,
      losses: activeSport.losses ?? 0,
      draws: activeSport.draws ?? 0,
      label: activeSport.event_name
        ? `${activeSport.sport_name} · ${activeSport.event_name} Record`
        : `${activeSport.sport_name || "Sport"} Record`,
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

  // If player has no sports registered in this tournament
  if (sports.length === 0) {
    return (
      <div className="space-y-3" data-testid="player-section">
        <PlayerParticipationCard participations={profile?.participation || []} />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="player-section">
      {/* 1. Sport / Event Selector */}
      <PlayerSportSelector
        sports={sports}
        selectedSportId={activeSport?.sport_id}
        selectedEventId={selectedEventId}
        onSelectSport={setSelectedSportId}
        onSelectEvent={setSelectedEventId}
      />

      {/* 2. Universal Record Strip */}
      <PlayerRecordStrip
        matches={summary.matches}
        wins={summary.wins}
        losses={summary.losses}
        draws={summary.draws}
        label={summary.label}
      />

      {/* 3. Sport-Specific Metrics */}
      <PlayerMetricCards
        metrics={activeMetrics}
        title={`${activeSport?.sport_name || "Sport"} Performance Metrics`}
      />

      {/* 4. Roster & Participation Context */}
      <PlayerParticipationCard
        participations={participations}
        activeSport={activeSport}
      />

      {/* 5. Completed Match History */}
      <PlayerMatchHistory
        matchHistory={matchHistory}
        title={`${activeSport?.sport_name || "Sport"} Match History`}
      />
    </div>
  );
};

export default PlayerSection;
