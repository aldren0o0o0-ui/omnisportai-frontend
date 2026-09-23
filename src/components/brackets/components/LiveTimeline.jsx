import React, { useMemo } from "react";
import {
  getEventDisplayLabel,
  getShortPlayerName,
  getShortTeamName,
  isStateOverrideEventCode,
  truncateMiddle
} from "../utils/displayLabels";

const LiveTimeline = ({ timelineWithEffects, canDeleteEvents, isDeletingById, handleDeleteEvent }) => {
  const isStateEventType = (eventType = "") => {
    const type = String(eventType || "").toUpperCase();
    if (isStateOverrideEventCode(type)) return true;
    return type === "BATTING_SET" || type === "FIELDING_SET" || type === "CHANGE_FIELDING" || type === "CHANGE_BATTING";
  };

  const timelineRows = useMemo(() => {
    const sourceRows = Array.isArray(timelineWithEffects) ? timelineWithEffects : [];
    const rows = [];
    sourceRows.forEach((eventRow) => {
      const eventType = String(eventRow?.event_type || "").toUpperCase();
      const isStateEvent = isStateEventType(eventType);
      const previousRow = rows[rows.length - 1];
      if (
        isStateEvent &&
        previousRow &&
        previousRow._isStateEvent &&
        String(previousRow?.event_type || "").toUpperCase() === eventType &&
        Number(previousRow?.team_id || 0) === Number(eventRow?.team_id || 0)
      ) {
        previousRow._collapsedCount = Number(previousRow._collapsedCount || 1) + 1;
        return;
      }
      rows.push({
        ...eventRow,
        _isStateEvent: isStateEvent,
        _collapsedCount: 1,
      });
    });
    return rows;
  }, [timelineWithEffects]);

  return (
    <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1 xl:max-h-[520px]">
      {timelineRows.length === 0 && (
        <div className="rounded-lg bg-slate-100 p-3 text-sm text-slate-600 dark:bg-slate-900/35 dark:text-slate-400">
          No events yet. Recorded actions will appear here.
        </div>
      )}
      {timelineRows.map((eventRow) => (
        <div
          key={eventRow.id}
          className={`rounded-xl p-2.5 text-sm ${
            eventRow._isStateEvent
              ? "bg-slate-100 dark:bg-slate-900/60"
              : eventRow.category === "score"
                ? "bg-emerald-50 dark:bg-emerald-500/12"
                : eventRow.category === "violation"
                  ? "bg-amber-50 dark:bg-amber-500/12"
                  : "bg-slate-100 dark:bg-slate-900/75"
          }`}
        >
          <div className="mb-1 flex items-start justify-between gap-2">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{eventRow.at}</p>
              <p className={`font-semibold ${eventRow._isStateEvent ? "text-slate-700 dark:text-slate-200" : "text-slate-900 dark:text-slate-100"}`} title={eventRow.event_type}>
                {getEventDisplayLabel(eventRow.event_type)}
              </p>
            </div>
            {canDeleteEvents && (
              <button
                type="button"
                onClick={() => handleDeleteEvent(eventRow.id)}
                disabled={Boolean(isDeletingById[eventRow.id])}
                aria-label={`Delete event ${eventRow.id}`}
                title="Delete event"
                className="inline-flex min-h-[28px] items-center justify-center rounded-md border border-slate-300 bg-white/80 px-2 text-[11px] font-semibold text-slate-600 hover:border-rose-400 hover:text-rose-600 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:border-rose-500/60 dark:hover:text-rose-200"
              >
                {isDeletingById[eventRow.id] ? "..." : "Delete"}
              </button>
            )}
          </div>
          {eventRow._isStateEvent ? (
            <p className="text-slate-700 dark:text-slate-300" title={eventRow.team_name || "-"}>
              {getShortTeamName(eventRow.team_name || "-")}
            </p>
          ) : (
            <p className="text-slate-800 dark:text-slate-200" title={eventRow.participant_name || eventRow.team_name || "Participant"}>
              {eventRow.player_name
                ? `${getShortPlayerName(eventRow.player_name)} · ${getShortTeamName(eventRow.team_name || "-")}`
                : getShortTeamName(eventRow.participant_name || eventRow.team_name || "Participant")}
            </p>
          )}
          {Number(eventRow._collapsedCount || 1) > 1 && (
            <p className="text-[11px] text-slate-500 dark:text-slate-500">+{Number(eventRow._collapsedCount || 1) - 1} similar updates</p>
          )}
          {eventRow.effect && String(eventRow.effect).trim() && String(eventRow.effect).trim().toLowerCase() !== "no score impact" && (
            <p className="text-slate-600 dark:text-slate-400">{truncateMiddle(eventRow.effect, 42)}</p>
          )}
        </div>
      ))}
    </div>
  );
};

export default LiveTimeline;
