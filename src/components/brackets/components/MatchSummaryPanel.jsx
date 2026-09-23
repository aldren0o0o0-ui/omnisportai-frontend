import React from "react";
import {
  getCompetitionTypeLabel,
  getEventDisplayLabel,
  getMeaningfulEventCategory,
  getShortPlayerName,
  truncateMiddle,
} from "../utils/displayLabels";

const formatMatchDateTime = (match) => {
  const scheduleLabel = String(match?.schedule_label || match?.scheduledAt || "").trim();
  if (scheduleLabel) return scheduleLabel;

  const scheduledAt = String(match?.scheduled_at || "").trim();
  if (scheduledAt) {
    const parsed = new Date(scheduledAt);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleString([], {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return scheduledAt;
  }

  const matchDate = String(match?.match_date || "").trim();
  const startTime = String(match?.start_time || "").trim();
  if (matchDate && startTime) return `${matchDate} ${startTime}`;
  if (matchDate) return matchDate;

  return "-";
};

const MatchSummaryPanel = ({
  match,
  liveState,
  latestViolation,
}) => {
  const tournamentName = String(
    match?.tournament_name ||
    match?.tournament?.tournament_name ||
    match?.tournament?.name ||
    ""
  ).trim() || "-";
  const facilitatorName = String(
    match?.facilitator_name ||
    match?.sport_facilitator_name ||
    match?.facilitator?.full_name ||
    match?.facilitator?.name ||
    ""
  ).trim() || "-";
  const dateTimeLabel = formatMatchDateTime(match);
  const sportName = String(match?.sport_name || match?.sport || "").trim() || "-";
  const eventCategory = getMeaningfulEventCategory(match);
  const competitionType = getCompetitionTypeLabel(match);
  const venueName = String(
    match?.venue_name ||
    match?.venue?.name ||
    match?.venue?.venue_name ||
    match?.venue ||
    ""
  ).trim() || "-";
  const venueLocation = String(
    match?.venue_location ||
    match?.venue?.location ||
    ""
  ).trim();
  const disposition = String(
    liveState?.disposition || liveState?.match_result?.disposition || ""
  ).trim().toUpperCase();
  const resultLabel = disposition
    ? disposition.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
    : "";

  return (
    <div className="space-y-2.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Match Overview</p>
      <div className="space-y-1.5 rounded-lg border border-slate-200 bg-white/80 p-2.5 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300">
        <p><span className="text-slate-500 dark:text-slate-400">Sport:</span> {sportName}</p>
        {eventCategory && (
          <p><span className="text-slate-500 dark:text-slate-400">Event Category:</span> {eventCategory}</p>
        )}
        {competitionType && (
          <p><span className="text-slate-500 dark:text-slate-400">Competition Type:</span> {competitionType}</p>
        )}
        <p><span className="text-slate-500 dark:text-slate-400">Date & Time:</span> {dateTimeLabel}</p>
        <p>
          <span className="text-slate-500 dark:text-slate-400">Venue:</span>{" "}
          {venueName}{venueLocation ? ` — ${venueLocation}` : ""}
        </p>
        <p><span className="text-slate-500 dark:text-slate-400">Tournament:</span> {tournamentName}</p>
        <p><span className="text-slate-500 dark:text-slate-400">Game Official:</span> {facilitatorName}</p>
        {resultLabel && (
          <p><span className="text-slate-500 dark:text-slate-400">Official Result:</span> {resultLabel}</p>
        )}
      </div>

      <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-sm text-rose-700 dark:border-rose-500/35 dark:bg-rose-500/10 dark:text-rose-100">
        <p className="text-xs font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-200">Latest Violation</p>
        {latestViolation ? (
          <>
            <p className="mt-1" title={latestViolation.event_type}>
              {getEventDisplayLabel(latestViolation.event_type)} - {getShortPlayerName(latestViolation.player_name || (latestViolation.player_id ? "Unknown player" : "Unknown"))}
            </p>
            <p className="text-rose-600 dark:text-rose-200/90">{truncateMiddle(latestViolation.effect, 46)}</p>
          </>
        ) : (
          <p className="mt-1 text-rose-600 dark:text-rose-200/90">No violations recorded yet.</p>
        )}
      </div>
    </div>
  );
};

export default MatchSummaryPanel;
