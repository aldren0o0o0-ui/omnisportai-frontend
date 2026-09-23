import { useEffect, useMemo, useRef, useState } from "react";
import moment from "moment";
import {
  AlertTriangle,
  Ban,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  ShieldAlert,
} from "lucide-react";
import { formatSeverityLabel } from "../common/statusLabels";
import {
  getScheduleParticipantLabel,
  resolveVisibleScheduleHourRange,
} from "./scheduleWorkflow";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import "./ScheduleCalendar.css";

const SPORT_COLORS = {
  basketball: "#f97316",
  volleyball: "#22c55e",
  football: "#0ea5e9",
  futsal: "#0891b2",
  badminton: "#6366f1",
  tennis: "#f43f5e",
  baseball: "#a855f7",
  softball: "#eab308",
  table_tennis: "#14b8a6"
};

const VIEW_LABELS = {
  tournament: "Tournament",
  day: "Day",
  week: "Week",
  month: "Month"
};

const toDate = (value) => {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
};

const startOfDay = (value) => {
  const date = toDate(value);
  if (!date) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const addDays = (value, days) => {
  const date = startOfDay(value);
  if (!date) return null;
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const buildDateRange = (start, end) => {
  const left = startOfDay(start);
  const right = startOfDay(end);
  if (!left || !right || right < left) return [];
  const range = [];
  let cursor = new Date(left);
  while (cursor <= right) {
    range.push(new Date(cursor));
    cursor = addDays(cursor, 1);
  }
  return range;
};

const hashColor = (value) => {
  const text = String(value || "match").toLowerCase();
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = text.charCodeAt(index) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 72% 46%)`;
};

const getSportColor = (sport) => {
  const key = String(sport || "").trim().toLowerCase().replace(/\s+/g, "_");
  return SPORT_COLORS[key] || hashColor(key);
};

const EVENT_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit"
});

const HOUR_TICK_FORMATTER = new Intl.DateTimeFormat("en-US", {
  hour: "numeric"
});

const DAY_NAME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  weekday: "short"
});

const DAY_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric"
});

const toHour = (rawValue, fallback, min, max) => {
  const parsed = Number.parseInt(String(rawValue ?? ""), 10);
  if (!Number.isInteger(parsed)) return fallback;
  if (parsed < min || parsed > max) return fallback;
  return parsed;
};

const formatShortTime = (value) => {
  const date = toDate(value);
  if (!date) return "";
  return EVENT_TIME_FORMATTER.format(date);
};

const formatEventTime = (start, end) => {
  const s = toDate(start);
  const e = toDate(end);
  if (!s || !e) return "Time TBA";
  return `${EVENT_TIME_FORMATTER.format(s)} - ${EVENT_TIME_FORMATTER.format(e)}`;
};

const formatToolbarLabel = (viewKey) => VIEW_LABELS[String(viewKey)] || String(viewKey);

const toLocalDateKey = (value) => {
  const date = toDate(value);
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const minutesFromDayStart = (value) => {
  const date = toDate(value);
  if (!date) return 0;
  return date.getHours() * 60 + date.getMinutes();
};

const assignTimelineLanes = (events = []) => {
  const laneEnds = [];
  return events
    .slice()
    .sort((left, right) => left.start.getTime() - right.start.getTime())
    .map((event) => {
      let lane = laneEnds.findIndex((laneEnd) => laneEnd <= event.start.getTime());
      if (lane < 0) lane = laneEnds.length;
      laneEnds[lane] = event.end.getTime();
      return { ...event, __timelineLane: lane };
    });
};

const normalizeIssueSeverity = (value) => {
  const key = String(value || "").toUpperCase();
  if (key === "BLOCKING") return "BLOCKING";
  if (key === "WARNING") return "WARNING";
  if (key === "INFO") return "INFO";
  return "NONE";
};

const getIssueBadgeTone = (severity) => {
  if (severity === "BLOCKING") return "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300";
  if (severity === "WARNING") return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300";
  if (severity === "INFO") return "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300";
  return "";
};

const getIssueBadgeLabel = (severity) => {
  if (!severity || severity === "NONE") return "";
  return formatSeverityLabel(severity);
};

const getEventMatchId = (event) => Number(event?.match_id || event?.id || 0);

const isFocusedIssueTarget = (event, focusedIssueTarget) => {
  const eventMatchId = getEventMatchId(event);
  const targetMatchId = Number(focusedIssueTarget?.matchId || focusedIssueTarget?.eventId || 0);
  return Number.isFinite(eventMatchId) && eventMatchId > 0 && eventMatchId === targetMatchId;
};

const CalendarHeader = ({
  label,
  onNavigate,
  onView,
  view,
  views,
  fixedRange = false,
  onScrollEarlier = null,
  onScrollLater = null,
}) => {
  const allowedViews = Object.keys(views || {}).filter((item) =>
    ["tournament", "day", "week"].includes(String(item))
  );

  return (
    <div className="os-calendar-toolbar">
      <div className="os-calendar-toolbar__left">
        <span className="os-calendar-toolbar__title">{label}</span>
      </div>

      <div className="os-calendar-toolbar__controls">
        {fixedRange ? (
          <>
            <button
              type="button"
              className="os-toolbar-btn os-toolbar-btn--icon"
              aria-label="Show earlier times"
              title="Show earlier times"
              onClick={onScrollEarlier}
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              className="os-toolbar-btn os-toolbar-btn--icon"
              aria-label="Show later times"
              title="Show later times"
              onClick={onScrollLater}
            >
              <ChevronRight size={14} />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="os-toolbar-btn"
              onClick={() => onNavigate("TODAY")}
            >
              Today
            </button>
            <button
              type="button"
              className="os-toolbar-btn os-toolbar-btn--icon"
              aria-label="Previous"
              onClick={() => onNavigate("PREV")}
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              className="os-toolbar-btn os-toolbar-btn--icon"
              aria-label="Next"
              onClick={() => onNavigate("NEXT")}
            >
              <ChevronRight size={14} />
            </button>
          </>
        )}
      </div>

      <div className="os-calendar-toolbar__views">
        {allowedViews.map((item) => {
          const key = String(item);
          return (
            <button
              key={key}
              type="button"
              className={`os-toolbar-btn ${view === key ? "os-toolbar-btn--active" : ""}`}
              onClick={() => onView(key)}
            >
              {formatToolbarLabel(key)}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const assignSmartLanes = (items = []) => {
  if (items.length === 0) return [];
  const sorted = items.slice().sort((a, b) => a.start.getTime() - b.start.getTime());

  // Group into overlapping clusters
  const clusters = [];
  let currentCluster = [];
  let clusterEnd = 0;

  for (const event of sorted) {
    if (currentCluster.length === 0) {
      currentCluster.push(event);
      clusterEnd = event.end.getTime();
    } else if (event.start.getTime() < clusterEnd) {
      currentCluster.push(event);
      clusterEnd = Math.max(clusterEnd, event.end.getTime());
    } else {
      clusters.push(currentCluster);
      currentCluster = [event];
      clusterEnd = event.end.getTime();
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  // Assign lanes within each cluster
  const placedEvents = [];
  for (const cluster of clusters) {
    const laneEnds = [];
    const clusterAssigned = cluster.map((event) => {
      let lane = laneEnds.findIndex((end) => end <= event.start.getTime());
      if (lane < 0) {
        lane = laneEnds.length;
        laneEnds.push(event.end.getTime());
      } else {
        laneEnds[lane] = event.end.getTime();
      }
      return { ...event, __lane: lane };
    });
    const clusterMaxLanes = Math.max(1, laneEnds.length);
    for (const event of clusterAssigned) {
      placedEvents.push({
        ...event,
        __lane: event.__lane,
        __totalLanes: clusterMaxLanes,
      });
    }
  }
  return placedEvents;
};

const StandardScheduleCalendar = ({
  events,
  blockedWindows,
  dates,
  minHour,
  maxHour,
  label,
  views,
  view,
  onView,
  onNavigate,
}) => {
  const HOUR_ROW_HEIGHT = 84;
  const startMinute = minHour * 60;
  const endMinute = maxHour * 60;
  const totalMinutes = Math.max(60, endMinute - startMinute);
  const hourTicks = Array.from(
    { length: Math.max(1, maxHour - minHour) + 1 },
    (_, index) => minHour + index
  );
  const totalGridHeight = (hourTicks.length - 1) * HOUR_ROW_HEIGHT;
  const todayKey = toLocalDateKey(new Date());

  return (
    <div className="os-standard-calendar">
      <CalendarHeader
        label={label}
        onNavigate={onNavigate}
        onView={onView}
        view={view}
        views={views}
      />

      <div
        className="os-schedule-viewport"
        tabIndex={0}
        aria-label="Tournament schedule calendar. Days are columns at top, hours are rows on left."
      >
        <div
          className="os-schedule-grid"
          style={{
            gridTemplateColumns: `76px repeat(${dates.length}, minmax(180px, 1fr))`,
            minWidth: `calc(76px + ${dates.length * 180}px)`,
          }}
        >
          {/* Top-left corner */}
          <div className="os-schedule-grid__corner">
            <Clock3 size={14} aria-hidden="true" />
            <span>Time</span>
          </div>

          {/* Sticky Day Column Headers along the top */}
          {dates.map((date) => {
            const dateKey = toLocalDateKey(date);
            const isToday = dateKey === todayKey;
            const dayEvents = events.filter(
              (event) => toLocalDateKey(event.start) === dateKey
            );

            return (
              <div
                key={`header-${dateKey}`}
                className={`os-schedule-grid__day-header ${isToday ? "is-today" : ""}`}
              >
                <span className="os-schedule-grid__day-name">
                  {DAY_NAME_FORMATTER.format(date)}
                </span>
                <span className="os-schedule-grid__day-num">
                  {DAY_DATE_FORMATTER.format(date)}
                </span>
                <span className="os-schedule-grid__day-badge">
                  {dayEvents.length} {dayEvents.length === 1 ? "match" : "matches"}
                </span>
              </div>
            );
          })}

          {/* Time Gutter down the left */}
          <div
            className="os-schedule-grid__time-gutter"
            style={{ height: `${totalGridHeight}px` }}
          >
            {hourTicks.slice(0, -1).map((hour, index) => (
              <div
                key={`tick-${hour}`}
                className="os-schedule-grid__time-tick"
                style={{ top: `${index * HOUR_ROW_HEIGHT}px` }}
              >
                {HOUR_TICK_FORMATTER.format(new Date(1970, 0, 1, hour, 0))}
              </div>
            ))}
          </div>

          {/* Day Columns Body */}
          {dates.map((date) => {
            const dateKey = toLocalDateKey(date);
            const dayEvents = assignSmartLanes(
              events.filter((event) => toLocalDateKey(event.start) === dateKey)
            );
            const dayBlocks = blockedWindows.filter(
              (block) => toLocalDateKey(block.start) === dateKey
            );

            return (
              <div
                key={`col-${dateKey}`}
                className="os-schedule-grid__day-column"
                style={{ height: `${totalGridHeight}px` }}
              >
                {/* Horizontal hour lines */}
                {hourTicks.slice(0, -1).map((hour, index) => (
                  <div
                    key={`line-${dateKey}-${hour}`}
                    className="os-schedule-grid__hour-line"
                    style={{ top: `${index * HOUR_ROW_HEIGHT}px` }}
                  />
                ))}

                {/* Program Blocks */}
                {dayBlocks.map((block) => {
                  const blockStart = Math.max(startMinute, minutesFromDayStart(block.start));
                  const blockEnd = Math.min(endMinute, minutesFromDayStart(block.end));
                  if (blockEnd <= blockStart) return null;
                  const topPx = ((blockStart - startMinute) / totalMinutes) * totalGridHeight;
                  const heightPx = Math.max(28, ((blockEnd - blockStart) / totalMinutes) * totalGridHeight);

                  return (
                    <div
                      key={`grid-block-${block.id}`}
                      className="os-schedule-grid__block"
                      style={{
                        top: `${topPx}px`,
                        height: `${heightPx}px`,
                      }}
                      title={block.title || "Program Block"}
                    >
                      <Ban size={12} aria-hidden="true" />
                      <span className="truncate">{block.title || "Program Block"}</span>
                    </div>
                  );
                })}

                {/* Placed Match Cards */}
                {dayEvents.map((event) => {
                  const eventStart = Math.max(startMinute, minutesFromDayStart(event.start));
                  const eventEnd = Math.min(endMinute, minutesFromDayStart(event.end));
                  if (eventEnd <= eventStart) return null;
                  const topPx = ((eventStart - startMinute) / totalMinutes) * totalGridHeight;
                  const durationMin = Math.max(30, (event.end.getTime() - event.start.getTime()) / 60000);
                  const heightPx = Math.max(72, (durationMin / totalMinutes) * totalGridHeight - 4);

                  const totalLanes = event.__totalLanes || 1;
                  const lane = event.__lane || 0;
                  const widthPercent = 100 / totalLanes;
                  const leftPercent = lane * widthPercent;

                  return (
                    <div
                      key={`grid-event-${event.id}`}
                      className="os-schedule-grid__event"
                      style={{
                        "--event-color": getSportColor(event.sport),
                        top: `${topPx}px`,
                        height: `${heightPx}px`,
                        width: `calc(${widthPercent}% - 4px)`,
                        left: `calc(${leftPercent}% + 2px)`,
                      }}
                    >
                      <MatchEventCard event={event} />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const MobileDailyScheduleStream = ({
  events,
  blockedWindows,
  dates,
  label,
  views,
  view,
  onView,
  onNavigate,
  activeDate,
  onSelectDate,
}) => {
  const activeKey = toLocalDateKey(activeDate);
  const dayMatches = events
    .filter((event) => toLocalDateKey(event.start) === activeKey)
    .sort((a, b) => {
      const aTime = toDate(a.start)?.getTime() || 0;
      const bTime = toDate(b.start)?.getTime() || 0;
      return aTime - bTime;
    });

  const dayBlocks = blockedWindows.filter(
    (block) => toLocalDateKey(block.start) === activeKey
  );

  return (
    <div className="os-mobile-schedule-wrap">
      <CalendarHeader
        label={label}
        onNavigate={onNavigate}
        onView={onView}
        view={view}
        views={views}
      />

      {/* Sticky Horizontal Date Selector Strip */}
      <div className="os-mobile-date-strip" role="tablist" aria-label="Select date">
        {dates.map((d) => {
          const dKey = toLocalDateKey(d);
          const isSelected = dKey === activeKey;
          const count = events.filter((e) => toLocalDateKey(e.start) === dKey).length;

          return (
            <button
              key={`pill-${dKey}`}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => onSelectDate(d)}
              className={`os-mobile-date-pill ${isSelected ? "is-selected" : ""}`}
            >
              <span className="os-mobile-date-pill__day">{DAY_NAME_FORMATTER.format(d)}</span>
              <span className="os-mobile-date-pill__num">{d.getDate()}</span>
              <span className="os-mobile-date-pill__badge">
                {count} {count === 1 ? "match" : "matches"}
              </span>
            </button>
          );
        })}
      </div>

      {/* Program Blocks notice */}
      {dayBlocks.length > 0 ? (
        <div className="space-y-1.5">
          {dayBlocks.map((block) => (
            <div
              key={`mobile-block-${block.id}`}
              className="flex items-center gap-2 rounded-xl border border-amber-300/70 bg-amber-50/80 px-3 py-2 text-xs font-semibold text-amber-800 dark:border-amber-700/50 dark:bg-amber-950/20 dark:text-amber-300"
            >
              <Ban size={14} className="shrink-0" aria-hidden="true" />
              <span className="font-bold">{block.title || "Program Block"}:</span>
              <span>{formatEventTime(block.start, block.end)}</span>
            </div>
          ))}
        </div>
      ) : null}

      {/* Daily Matches Stream */}
      <div className="os-mobile-day-stream">
        {dayMatches.length === 0 ? (
          <div className="os-mobile-empty-day">
            <CalendarDays size={28} className="mx-auto mb-2 opacity-50 text-[var(--text-muted)]" />
            <p className="font-bold text-sm text-[var(--text-main)]">No matches scheduled</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {activeDate instanceof Date && !Number.isNaN(activeDate.getTime())
                ? `${DAY_NAME_FORMATTER.format(activeDate)}, ${DAY_DATE_FORMATTER.format(activeDate)}`
                : "This date"}{" "}
              has no matches.
            </p>
          </div>
        ) : (
          dayMatches.map((event) => (
            <div key={`stream-${event.id}`} className="os-mobile-stream-item">
              <div className="os-mobile-stream-time">
                <span className="text-xs font-bold text-[var(--text-main)]">{formatShortTime(event.start)}</span>
                <span className="text-[10px] text-[var(--text-muted)]">{formatShortTime(event.end)}</span>
              </div>
              <div className="os-mobile-stream-card" style={{ "--event-color": getSportColor(event.sport) }}>
                <MatchEventCard event={event} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const MatchEventCard = ({ event }) => {
  const {
    __onHoverStart,
    __onHoverEnd,
    __onSelect,
  } = event || {};
  const teams = getScheduleParticipantLabel(event);
  const timeRange = formatEventTime(event?.start, event?.end);
  const venueLabel = event?.venue || event?.venueLabel || "Venue to be assigned";
  const issueSeverity = normalizeIssueSeverity(event?.highestIssueSeverity || event?.issueSummary?.highestSeverity);
  const hasIssue = issueSeverity !== "NONE";
  const issueLabel = getIssueBadgeLabel(issueSeverity);
  const isFocusedIssue = Boolean(event?.__focusedIssue);
  const issueTooltip = String(
    event?.issueSummary?.issues?.[0]?.message ||
    event?.issueSummary?.issues?.[0]?.reason ||
    ""
  ).trim();
  const accessibleLabel = [
    teams,
    event?.sportDisplayLabel || event?.sport || "Match",
    timeRange,
    venueLabel,
    event?.competitionTypeLabel || null,
    event?.status || null,
    hasIssue ? `${issueLabel} issue` : null,
    isFocusedIssue ? "Highlighted from issue drawer" : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div
      className={`os-match-event-card ${
        hasIssue ? `os-match-event-card--issue-${issueSeverity.toLowerCase()}` : ""
      } ${isFocusedIssue ? "os-match-event-card--focused-issue" : ""}`}
      data-match-id={event?.match_id || event?.id || ""}
      title={issueTooltip || undefined}
      tabIndex={isFocusedIssue ? -1 : undefined}
      aria-label={accessibleLabel}
      onMouseEnter={(evt) => __onHoverStart?.(event, evt)}
      onMouseLeave={() => __onHoverEnd?.()}
      onClick={(evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        __onSelect?.(event, evt);
      }}
    >
      <div className="os-match-event-card__sport">
        <span>{event?.sportDisplayLabel || event?.sport || "Match"}</span>
        {event?.competitionTypeLabel ? (
          <>
            <span className="os-match-event-card__separator" aria-hidden="true">•</span>
            <span className="os-match-event-card__category">{event.competitionTypeLabel}</span>
          </>
        ) : null}
        {hasIssue ? (
          <span className={`os-match-event-card__issue-badge ${getIssueBadgeTone(issueSeverity)}`}>
            {issueSeverity === "BLOCKING" ? <ShieldAlert size={11} /> : <AlertTriangle size={11} />}
            {issueLabel}
          </span>
        ) : null}
      </div>
      <p className="os-match-event-card__teams">{teams}</p>
      <div className="os-match-event-card__details">
        <span className="os-match-event-card__meta">
          <Clock3 size={10} aria-hidden="true" />
          {timeRange}
        </span>
        <span className="os-match-event-card__meta">
          <MapPin size={10} aria-hidden="true" />
          {venueLabel}
        </span>
      </div>
    </div>
  );
};

const ScheduleCalendar = ({
  events = [],
  blockedWindows = [],
  minHour = 5,
  maxHour = 18,
  onSelectEvent = null,
  onCalendarItemHover = null,
  onCalendarItemLeave = null,
  onCalendarItemSelect = null,
  viewMode = "tournament",
  onViewModeChange = null,
  currentDate = null,
  onCurrentDateChange = null,
  tournamentStartDate = null,
  tournamentEndDate = null,
  focusedIssueTarget = null
}) => {
  const normalizedEvents = useMemo(
    () =>
      (Array.isArray(events) ? events : [])
        .map((event) => {
          const start = toDate(event.start);
          const end = toDate(event.end);
          if (!start || !end || end <= start) return null;

          return {
            ...event,
            id: event.id ?? event.match_id,
            start,
            end,
            title: event.title || "Match details unavailable",
            __kind: "MATCH",
            __onHoverStart: onCalendarItemHover,
            __onHoverEnd: onCalendarItemLeave,
            __onSelect: onCalendarItemSelect || onSelectEvent,
            __focusedIssue: isFocusedIssueTarget(event, focusedIssueTarget),
          };
        })
        .filter(Boolean),
    [
      events,
      focusedIssueTarget,
      onCalendarItemHover,
      onCalendarItemLeave,
      onCalendarItemSelect,
      onSelectEvent,
    ]
  );

  const normalizedBlocks = useMemo(
    () =>
      (Array.isArray(blockedWindows) ? blockedWindows : [])
        .map((block, index) => {
          const start = toDate(block?.start);
          const end = toDate(block?.end);
          if (!start || !end || end <= start) return null;
          return {
            id: block?.id ?? `program-block-${index}`,
            title: block?.title || "Program Block",
            start,
            end,
            allDay: false,
            block_type: block?.block_type || "CUSTOM",
            date: block?.date || "",
            start_time: block?.start_time || "",
            end_time: block?.end_time || "",
            is_recurring_daily: Boolean(block?.is_recurring_daily),
            description: block?.description || "",
            __kind: "PROGRAM_BLOCK",
            __onHoverStart: onCalendarItemHover,
            __onHoverEnd: onCalendarItemLeave,
            __onSelect: onCalendarItemSelect,
          };
        })
        .filter(Boolean),
    [blockedWindows, onCalendarItemHover, onCalendarItemLeave, onCalendarItemSelect]
  );

  const tournamentStart = useMemo(() => startOfDay(tournamentStartDate), [tournamentStartDate]);
  const tournamentEnd = useMemo(() => startOfDay(tournamentEndDate), [tournamentEndDate]);
  const tournamentHasRange = Boolean(tournamentStart && tournamentEnd && tournamentEnd >= tournamentStart);
  const fallbackDate = useMemo(
    () => startOfDay(currentDate) || tournamentStart || normalizedEvents[0]?.start || new Date(),
    [currentDate, normalizedEvents, tournamentStart]
  );

  const resolvedView = useMemo(() => {
    if (["day", "week", "month", "tournament"].includes(String(viewMode))) {
      return String(viewMode);
    }
    return tournamentHasRange ? "tournament" : "week";
  }, [viewMode, tournamentHasRange]);

  const calendarViews = useMemo(
    () => ({
      tournament: true,
      day: true,
      week: true,
      month: true
    }),
    []
  );

  const horizontalDates = useMemo(() => {
    const anchor = startOfDay(fallbackDate) || new Date();

    if (resolvedView === "day") {
      return [anchor];
    }

    if (resolvedView === "week") {
      return buildDateRange(
        moment(anchor).startOf("week").toDate(),
        moment(anchor).endOf("week").toDate()
      );
    }

    if (resolvedView === "month") {
      return buildDateRange(
        moment(anchor).startOf("month").toDate(),
        moment(anchor).endOf("month").toDate()
      );
    }

    if (tournamentHasRange) {
      return buildDateRange(tournamentStart, tournamentEnd);
    }

    const dateMap = new Map();
    [...normalizedEvents, ...normalizedBlocks].forEach((item) => {
      const day = startOfDay(item?.start);
      const key = toLocalDateKey(day);
      if (day && key) dateMap.set(key, day);
    });
    const resolvedDates = Array.from(dateMap.values()).sort(
      (left, right) => left.getTime() - right.getTime()
    );
    return resolvedDates.length > 0 ? resolvedDates : [startOfDay(fallbackDate)];
  }, [
    fallbackDate,
    normalizedBlocks,
    normalizedEvents,
    resolvedView,
    tournamentEnd,
    tournamentHasRange,
    tournamentStart,
  ]);

  const horizontalRangeLabel = useMemo(() => {
    const first = horizontalDates[0];
    const last = horizontalDates[horizontalDates.length - 1];
    if (!first || !last) return "Intramural Schedule";
    if (resolvedView === "day") return moment(first).format("dddd, MMM D, YYYY");
    if (resolvedView === "month") return moment(first).format("MMMM YYYY");
    const firstLabel = moment(first).format("MMM D");
    const lastLabel = moment(last).format("MMM D, YYYY");
    return firstLabel === lastLabel ? lastLabel : `${firstLabel} - ${lastLabel}`;
  }, [horizontalDates, resolvedView]);

  const horizontalDateKeys = useMemo(
    () => new Set(horizontalDates.map((date) => toLocalDateKey(date))),
    [horizontalDates]
  );

  const visibleHorizontalEvents = useMemo(
    () =>
      normalizedEvents.filter((event) =>
        horizontalDateKeys.has(toLocalDateKey(event.start))
      ),
    [horizontalDateKeys, normalizedEvents]
  );

  const visibleHorizontalBlocks = useMemo(
    () =>
      normalizedBlocks.filter((block) =>
        horizontalDateKeys.has(toLocalDateKey(block.start))
      ),
    [horizontalDateKeys, normalizedBlocks]
  );

  const horizontalHourRange = useMemo(
    () =>
      resolveVisibleScheduleHourRange({
        events: [...visibleHorizontalEvents, ...visibleHorizontalBlocks],
        fallbackStartHour: toHour(minHour, 5, 0, 23),
        fallbackEndHour: toHour(maxHour, 18, 1, 24),
      }),
    [maxHour, minHour, visibleHorizontalBlocks, visibleHorizontalEvents]
  );

  // Mobile state detection
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Active selected date for mobile view
  const [activeDateKey, setActiveDateKey] = useState(() => toLocalDateKey(fallbackDate));

  const activeDate = useMemo(() => {
    const found = horizontalDates.find((d) => toLocalDateKey(d) === activeDateKey);
    if (found) return found;
    const today = horizontalDates.find((d) => toLocalDateKey(d) === toLocalDateKey(new Date()));
    return today || horizontalDates[0] || new Date();
  }, [horizontalDates, activeDateKey]);

  const handleSelectDate = (date) => {
    setActiveDateKey(toLocalDateKey(date));
    onCurrentDateChange?.(date);
  };

  const handleViewChange = (nextView) => {
    onViewModeChange?.(String(nextView));
  };

  const handleHorizontalNavigate = (action) => {
    if (action === "TODAY") {
      const today = startOfDay(new Date());
      setActiveDateKey(toLocalDateKey(today));
      onCurrentDateChange?.(today);
      return;
    }

    const direction = action === "PREV" ? -1 : action === "NEXT" ? 1 : 0;
    if (!direction) return;

    if (isMobile || resolvedView === "day") {
      const nextDate = addDays(activeDate, direction);
      setActiveDateKey(toLocalDateKey(nextDate));
      onCurrentDateChange?.(nextDate);
      return;
    }

    const anchor = startOfDay(fallbackDate) || new Date();
    if (resolvedView === "month") {
      onCurrentDateChange?.(moment(anchor).add(direction, "month").startOf("month").toDate());
      return;
    }
    if (resolvedView === "week") {
      onCurrentDateChange?.(addDays(anchor, direction * 7));
      return;
    }
    onCurrentDateChange?.(addDays(anchor, direction * 7));
  };

  return (
    <div className="schedule-calendar w-full rounded-2xl">
      {isMobile ? (
        <MobileDailyScheduleStream
          events={visibleHorizontalEvents}
          blockedWindows={normalizedBlocks}
          dates={horizontalDates}
          label={horizontalRangeLabel}
          views={calendarViews}
          view={resolvedView}
          onView={handleViewChange}
          onNavigate={handleHorizontalNavigate}
          activeDate={activeDate}
          onSelectDate={handleSelectDate}
        />
      ) : (
        <StandardScheduleCalendar
          events={visibleHorizontalEvents}
          blockedWindows={normalizedBlocks}
          dates={horizontalDates}
          minHour={horizontalHourRange.startHour}
          maxHour={horizontalHourRange.endHour}
          label={horizontalRangeLabel}
          views={calendarViews}
          view={resolvedView}
          onView={handleViewChange}
          onNavigate={handleHorizontalNavigate}
        />
      )}
    </div>
  );
};

export default ScheduleCalendar;
