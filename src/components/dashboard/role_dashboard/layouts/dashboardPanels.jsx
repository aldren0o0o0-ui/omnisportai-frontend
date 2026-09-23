import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarClock, CalendarDays, CheckCircle2, Circle, CircleHelp, Clock3, MapPin, Megaphone, Minus, Radio, TrendingDown, TrendingUp, Trophy, Medal, ArrowRight, Sparkles } from "lucide-react";
import DashboardCard from "../../../common/DashboardCard";
import StatusBadge from "../../../common/StatusBadge";
import { TeamLogo, SportIcon } from "../../../common/IdentityImage";
import { resolveMediaUrl } from "../../../../utils/media";
import { formatShortDate, formatTime, getCountdownLabel } from "./dashboardDateUtils";
import { getEventStatus, isLiveEvent, isCompletedEvent, getMatchup, parseScore, getSportLabel, getEventKey } from "./dashboardEventUtils";


const CHART_COLORS = ["#06b6d4", "#3b82f6", "#14b8a6", "#8b5cf6", "#f59e0b", "#f97316", "#ec4899", "#64748b"];

const formatMatchClock = (seconds) => {
  const total = Math.max(0, Number(seconds || 0));
  const minutes = Math.floor(total / 60);
  return `${String(minutes).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

export { CHART_COLORS };

export const LiveStageEmptyState = () => (
  <section aria-labelledby="live-stage-empty-title" className="flex min-h-[320px] w-full items-center justify-center py-10 sm:min-h-[380px]">
    <div className="mx-auto max-w-xl px-5 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">
        <CalendarClock size={27} aria-hidden="true" />
      </span>
      <h2 id="live-stage-empty-title" className="mt-5 text-xl font-extrabold tracking-tight text-[var(--text-main)] sm:text-2xl">
        Match schedule coming soon
      </h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[var(--text-muted)] sm:text-base">
        The schedule for this Intramural has not been published yet. Live matches, scores, and standings will appear here once the schedule is ready.
      </p>
    </div>
  </section>
);

const ActionButton = ({ action, primary = false }) => {
  if (!action?.label) return null;
  const className = primary
    ? "os-btn-primary-soft inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold"
    : "os-btn-ghost-soft inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold";

  if (action.to) {
    return (
      <Link to={action.to} className={className}>
        {action.label}
      </Link>
    );
  }

  return (
    <button type="button" onClick={action.onClick} className={className}>
      {action.label}
    </button>
  );
};

export const ToggleGroup = ({ value, onChange, options = [], size = "sm" }) => {
  const containerClass = size === "xs"
    ? "inline-flex rounded-lg border border-[var(--border-soft)] bg-[var(--surface-soft)] p-0.5"
    : "inline-flex rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-1";
  const buttonClass = size === "xs"
    ? "rounded-md px-2 py-1 text-[11px] font-semibold transition"
    : "rounded-lg px-2.5 py-1.5 text-xs font-semibold transition";

  return (
    <div className={containerClass}>
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`${buttonClass} ${active
              ? "bg-[var(--primary)] text-white"
              : "text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};

export const FilterSelect = ({ value, onChange, options = [], label = "View", id }) => {
  const selectId = id || `filter-select-${String(label).toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <label htmlFor={selectId} className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)]">
      {label ? <span className="text-[var(--text-soft)]">{label}</span> : null}
      <select
        id={selectId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-soft)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-main)] transition hover:bg-[var(--surface-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
};

export const PanelHeader = ({ icon: Icon, title, meta, action }) => (
  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
    <div className="min-w-0">
      <h2 className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[var(--text-main)]">
        {Icon ? <Icon size={15} className="text-[var(--primary)]" /> : null}
        {title}
      </h2>
      {meta ? <p className="mt-1 text-xs text-[var(--text-muted)]">{meta}</p> : null}
    </div>
    {action?.label ? (
      action.to ? (
        <Link to={action.to} className="text-xs font-semibold text-[var(--primary)] hover:underline">
          {action.label}
        </Link>
      ) : (
        <button
          type="button"
          onClick={action.onClick}
          className="text-xs font-semibold text-[var(--primary)] hover:underline"
        >
          {action.label}
        </button>
      )
    ) : null}
  </div>
);

export const InfoPopover = ({ title = "About this chart", description }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-soft)] bg-[var(--surface-soft)] text-[var(--text-muted)] transition hover:text-[var(--text-main)]"
        aria-label={title}
      >
        <CircleHelp size={14} />
      </button>
      {open ? (
        <div className="absolute right-0 top-10 z-20 w-64 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-3 shadow-xl">
          <p className="text-sm font-semibold text-[var(--text-main)]">{title}</p>
          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
            {description || "More context will appear here when details are available."}
          </p>
        </div>
      ) : null}
    </div>
  );
};

export const InlineEmptyState = ({
  icon: Icon = CalendarDays,
  title,
  description,
  action,
  compact = false,
}) => {
  if (!Icon) return null;
  if (compact) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-dashed border-[var(--border-soft)] bg-[var(--surface-soft)] px-3.5 py-2.5">
        <Icon size={15} className="shrink-0 text-[var(--text-soft)]" />
        <p className="min-w-0 flex-1 truncate text-xs text-[var(--text-muted)]">
          <span className="font-semibold text-[var(--text-main)]">{title}</span>
          {description ? <span className="ml-1 text-[var(--text-soft)]">{description}</span> : null}
        </p>
        {action?.label && action?.to ? (
          <Link to={action.to} className="shrink-0 text-xs font-semibold text-[var(--primary)] hover:underline">
            {action.label}
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-dashed border-[var(--border-soft)] bg-[var(--surface-soft)] px-3.5 py-3.5 text-center">
      <Icon size={16} className="mx-auto mb-1.5 text-[var(--text-soft)]" />
      <p className="text-sm font-semibold text-[var(--text-main)]">{title}</p>
      {description ? <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{description}</p> : null}
      {action?.label ? <div className="mt-2 flex justify-center"><ActionButton action={action} primary /></div> : null}
    </div>
  );
};

export const MatchHeroCard = ({
  event,
  emptyTitle = "No active or featured match right now.",
  emptyDescription = "Featured match details will appear here once matches are scheduled.",
  primaryAction,
  secondaryAction,
  scoreAction,
}) => {
  const [clockNow, setClockNow] = useState(() => Date.now());
  useEffect(() => {
    if ((!event?.clock_enabled || !event?.clock_running) && !event?.secondary_clock?.running) return undefined;
    const timer = window.setInterval(() => setClockNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [event?.clock_enabled, event?.clock_running, event?.secondary_clock?.running]);

  if (!event) {
    return (
      <InlineEmptyState
        icon={CalendarDays}
        title={emptyTitle}
        description={emptyDescription}
        action={primaryAction}
      />
    );
  }

  const matchup = getMatchup(event);
  const score = parseScore(event);
  const status = getEventStatus(event);
  const showScore = score.hasScore || isLiveEvent(event) || isCompletedEvent(event);
  const phaseLabel = String(event?.phase_label || "").trim();
  const phaseNumber = Number(event?.phase_number || 0);
  const showPhase = phaseLabel && phaseNumber > 0;
  const showClock = Boolean(event?.clock_enabled);
  const observedAtMs = new Date(event?.clock_observed_at || "").getTime();
  const elapsedSinceObservation = event?.clock_running && Number.isFinite(observedAtMs)
    ? Math.max(0, Math.floor((clockNow - observedAtMs) / 1000))
    : 0;
  const visibleClockSeconds = Math.max(0, Number(event?.clock_remaining_seconds || 0) - elapsedSinceObservation);
  const secondaryClock = event?.secondary_clock && typeof event.secondary_clock === "object" ? event.secondary_clock : null;
  const secondaryObservedAtMs = new Date(secondaryClock?.observed_at || "").getTime();
  const secondaryElapsed = secondaryClock?.running && Number.isFinite(secondaryObservedAtMs)
    ? Math.max(0, Math.floor((clockNow - secondaryObservedAtMs) / 1000))
    : 0;
  const visibleSecondarySeconds = Math.max(0, Number(secondaryClock?.remaining_seconds || 0) - secondaryElapsed);

  return (
    <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[var(--primary-soft)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--primary)]">
              {getSportLabel(event)}
            </span>
            <StatusBadge status={status} />
          </div>
          <p className="text-sm text-[var(--text-muted)]">{getCountdownLabel(event?.start)}</p>
        </div>
        <div className="space-y-1 text-right text-xs text-[var(--text-muted)]">
          <p className="inline-flex items-center gap-1">
            <CalendarDays size={13} />
            {formatShortDate(event?.start)}
          </p>
          <p className="inline-flex items-center gap-1">
            <Clock3 size={13} />
            {formatTime(event?.start)}
          </p>
          <p className="inline-flex items-center gap-1">
            <MapPin size={13} />
            {String(event?.venue || "Venue TBD")}
          </p>
        </div>
      </div>

      <div className="mt-5 grid items-center gap-4 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <div className="flex items-center gap-3">
          <TeamLogo imageUrl={event?.team1_logo_url || event?.team1_logo || null} label={matchup.left} scale="md" />
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-[var(--text-main)]">{matchup.left}</p>
            <p className="text-xs text-[var(--text-muted)]">Home side</p>
          </div>
        </div>

        <div className="text-center">
          {showScore && scoreAction?.to ? (
            <Link
              to={scoreAction.to}
              className="inline-flex min-h-11 items-center rounded-xl px-3 text-3xl font-black tabular-nums text-[var(--text-main)] transition hover:bg-[var(--primary-soft)] hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] motion-reduce:transition-none"
              aria-label={scoreAction.label || `Open live score for ${matchup.left} versus ${matchup.right}`}
            >
              {score.left}
              <span className="mx-2 text-[var(--text-soft)]">:</span>
              {score.right}
            </Link>
          ) : showScore ? (
            <p className="text-3xl font-black tabular-nums text-[var(--text-main)]">
              {score.left}<span className="mx-2 text-[var(--text-soft)]">:</span>{score.right}
            </p>
          ) : (
            <p className="text-lg font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">vs</p>
          )}
          {(showPhase || showClock) ? (
            <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5" aria-live="polite">
              {showPhase ? (
                <span className="rounded-full border border-[var(--border-soft)] bg-[var(--surface)] px-2.5 py-1 text-xs font-semibold text-[var(--text-main)]">
                  {phaseLabel} {phaseNumber}
                </span>
              ) : null}
              {showClock ? (
                <span className="rounded-full border border-cyan-300 bg-cyan-50 px-2.5 py-1 font-mono text-xs font-semibold text-cyan-800 dark:border-cyan-700/50 dark:bg-cyan-950/30 dark:text-cyan-100">
                  {formatMatchClock(visibleClockSeconds)} {event?.clock_running && visibleClockSeconds > 0 ? "• Live" : "• Stopped"}
                </span>
              ) : null}
              {secondaryClock ? (
                <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 font-mono text-xs font-semibold text-amber-800 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-100">
                  {secondaryClock.label || "Secondary Clock"}: {visibleSecondarySeconds}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-start gap-3 sm:justify-end">
          <div className="min-w-0 text-right">
            <p className="truncate text-base font-semibold text-[var(--text-main)]">{matchup.right}</p>
            <p className="text-xs text-[var(--text-muted)]">Away side</p>
          </div>
          <TeamLogo imageUrl={event?.team2_logo_url || event?.team2_logo || null} label={matchup.right} scale="md" />
        </div>
      </div>

      {(primaryAction?.label || secondaryAction?.label) ? (
        <div className="mt-5 flex flex-wrap gap-2">
          <ActionButton action={primaryAction} primary />
          <ActionButton action={secondaryAction} />
        </div>
      ) : null}
    </div>
  );
};

export const ScheduleHighlightCard = ({
  event,
  emptyTitle,
  emptyDescription,
  action,
}) => {
  if (!event) {
    return (
      <InlineEmptyState
        icon={CalendarDays}
        title={emptyTitle}
        description={emptyDescription}
        action={action}
      />
    );
  }

  const matchup = getMatchup(event);

  return (
    <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-soft)] px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-soft)]">Next up</p>
          <p className="mt-1 truncate text-base font-semibold text-[var(--text-main)]">
            {matchup.left} <span className="text-[var(--text-soft)]">vs</span> {matchup.right}
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {getSportLabel(event)}{event?.venue ? ` | ${event.venue}` : ""}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusBadge status={getEventStatus(event)} />
          <span className="text-xs text-[var(--text-muted)]">{getCountdownLabel(event?.start)}</span>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)]">
        <span className="inline-flex items-center gap-1">
          <CalendarDays size={12} />
          {formatShortDate(event?.start)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock3 size={12} />
          {formatTime(event?.start)}
        </span>
        {event?.venue ? (
          <span className="inline-flex items-center gap-1">
            <MapPin size={12} />
            {event.venue}
          </span>
        ) : null}
      </div>
    </div>
  );
};

export const CompactScheduleList = ({
  events = [],
  emptyTitle,
  emptyDescription,
  action,
  showScore = false,
}) => {
  const safeEvents = Array.isArray(events) ? events : [];

  if (safeEvents.length === 0) {
    return (
      <InlineEmptyState
        icon={CalendarDays}
        title={emptyTitle}
        description={emptyDescription}
        action={action}
      />
    );
  }

  return (
    <div className="space-y-2.5">
      {safeEvents.map((event) => {
        const matchup = getMatchup(event);
        const score = parseScore(event);
        return (
          <div
            key={getEventKey(event)}
            className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3 py-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--text-main)]">
                  {matchup.left} vs {matchup.right}
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {getSportLabel(event)}{event?.venue ? ` | ${event.venue}` : ""}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <StatusBadge status={getEventStatus(event)} />
                {showScore && score.hasScore ? (
                  <span className="text-xs font-semibold tabular-nums text-[var(--text-main)]">
                    {score.left} - {score.right}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)]">
              <span className="inline-flex items-center gap-1">
                <CalendarDays size={12} />
                {formatShortDate(event?.start)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock3 size={12} />
                {formatTime(event?.start)}
              </span>
              {event?.venue ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={12} />
                  {event.venue}
                </span>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const CompactScheduleTable = ({
  events = [],
  emptyTitle,
  emptyDescription,
  action,
  showSport = true,
  showVenue = true,
}) => {
  const safeEvents = Array.isArray(events) ? events : [];

  if (safeEvents.length === 0) {
    return (
      <InlineEmptyState
        icon={CalendarDays}
        title={emptyTitle}
        description={emptyDescription}
        action={action}
      />
    );
  }

  return (
    <div className="overflow-auto rounded-xl border border-[var(--border-soft)]">
      <table className="w-full min-w-[620px] text-sm">
        <thead className="bg-[var(--surface-soft)] text-left text-[11px] uppercase tracking-wide text-[var(--text-soft)]">
          <tr>
            <th className="px-3 py-2.5">Match</th>
            {showSport ? <th className="px-3 py-2.5">Sport</th> : null}
            <th className="px-3 py-2.5">Date</th>
            <th className="px-3 py-2.5">Time</th>
            {showVenue ? <th className="px-3 py-2.5">Venue</th> : null}
            <th className="px-3 py-2.5 text-right">Status</th>
          </tr>
        </thead>
        <tbody className="bg-[var(--surface)]">
          {safeEvents.map((event) => {
            const matchup = getMatchup(event);
            return (
              <tr key={getEventKey(event)} className="border-t border-[var(--border-soft)]">
                <td className="px-3 py-3">
                  <p className="font-semibold text-[var(--text-main)]">
                    {matchup.left} vs {matchup.right}
                  </p>
                </td>
                {showSport ? <td className="px-3 py-3 text-[var(--text-main)]">{getSportLabel(event)}</td> : null}
                <td className="px-3 py-3 text-[var(--text-main)]">{formatShortDate(event?.start)}</td>
                <td className="px-3 py-3 text-[var(--text-muted)]">{formatTime(event?.start)}</td>
                {showVenue ? <td className="px-3 py-3 text-[var(--text-muted)]">{event?.venue || "Venue TBD"}</td> : null}
                <td className="px-3 py-3 text-right">
                  <StatusBadge status={getEventStatus(event)} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export const TrendIndicator = ({ trend }) => {
  const value = String(trend || "flat").trim().toLowerCase();
  if (value === "up") {
    return (
      <span className="inline-flex items-center gap-1 text-[var(--success)]" title="Trending up">
        <TrendingUp size={15} />
      </span>
    );
  }
  if (value === "down") {
    return (
      <span className="inline-flex items-center gap-1 text-[var(--danger)]" title="Trending down">
        <TrendingDown size={15} />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[var(--text-soft)]" title="Steady">
      <Minus size={15} />
    </span>
  );
};

export const CompactStandingsTable = ({
  rows = [],
  highlightLabel = "",
  emptyTitle,
  emptyDescription,
  action,
  showRank = true,
  entityLabel = "Team",
  metaResolver = null,
  showTrend = false,
  trendResolver = null,
  compactEmpty = false,
}) => {
  const safeRows = Array.isArray(rows) ? rows : [];

  if (safeRows.length === 0) {
    return (
      <InlineEmptyState
        icon={CalendarDays}
        title={emptyTitle}
        description={emptyDescription}
        action={action}
        compact={compactEmpty}
      />
    );
  }

  const highlight = String(highlightLabel || "").trim().toLowerCase();

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border-soft)]">
      <table className="w-full min-w-[320px] text-sm">
        <thead className="bg-[var(--surface-soft)] text-left text-xs uppercase tracking-wide text-[var(--text-soft)]">
          <tr>
            {showRank ? <th className="px-3 py-2">#</th> : null}
            <th className="px-3 py-2">{entityLabel}</th>
            <th className="px-3 py-2 text-right">W</th>
            <th className="px-3 py-2 text-right">L</th>
            <th className="px-3 py-2 text-right">Pts</th>
            {showTrend ? <th className="px-3 py-2 text-center">Trend</th> : null}
          </tr>
        </thead>
        <tbody className="bg-[var(--surface)]">
          {safeRows.map((row, index) => {
            const isHighlighted =
              highlight.length > 0 && String(row?.label || "").trim().toLowerCase() === highlight;
            const metaText = typeof metaResolver === "function"
              ? metaResolver(row)
              : [row?.sport, row?.department].filter(Boolean).join(" | ");
            return (
              <tr
                key={row?.id || `${row?.label}-${index}`}
                className={`border-t border-[var(--border-soft)] ${isHighlighted ? "bg-[var(--primary-soft)]/40" : ""}`}
              >
                {showRank ? (
                  <td className="px-3 py-2 font-semibold text-[var(--text-main)]">{index + 1}</td>
                ) : null}
                <td className="px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <TeamLogo imageUrl={row?.logoUrl || null} label={row?.label} scale="sm" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[var(--text-main)]">{row?.label}</p>
                      {metaText ? (
                        <p className="truncate text-[11px] text-[var(--text-muted)]">
                          {metaText}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums text-[var(--text-main)]">{row?.wins ?? 0}</td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums text-[var(--text-main)]">{row?.losses ?? 0}</td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums text-[var(--text-main)]">{row?.points ?? row?.value ?? 0}</td>
                {showTrend ? (
                  <td className="px-3 py-2 text-center">
                    <div className="flex justify-center">
                      <TrendIndicator
                        trend={typeof trendResolver === "function" ? trendResolver(row) : row?.trend}
                      />
                    </div>
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export const StandingsGraph = ({
  rows = [],
  emptyTitle,
  emptyDescription,
  action,
  height = 320,
  compactEmpty = false,
}) => {
  const safeRows = Array.isArray(rows) ? rows : [];

  if (safeRows.length === 0) {
    return (
      <InlineEmptyState
        icon={CalendarDays}
        title={emptyTitle}
        description={emptyDescription}
        action={action}
        compact={compactEmpty}
      />
    );
  }

  const graphRows = safeRows.slice(0, 8).map((row, index) => ({
    id: row?.id || `${row?.label}-${index}`,
    label: row?.label || `Row ${index + 1}`,
    points: Number(row?.points ?? row?.value ?? 0),
    wins: Number(row?.wins ?? 0),
    losses: Number(row?.losses ?? 0),
  }));

  return (
    <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-3">
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={graphRows} layout="vertical" margin={{ top: 8, right: 18, left: 12, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
            <XAxis type="number" stroke="var(--text-soft)" tick={{ fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="label"
              width={88}
              stroke="var(--text-soft)"
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              cursor={{ fill: "rgba(59, 130, 246, 0.08)" }}
              contentStyle={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border-soft)",
                borderRadius: "12px",
                color: "var(--text-main)",
              }}
              formatter={(value, _name, payload) => [
                `${Number(value || 0)} pts`,
                `${payload?.payload?.wins || 0}W | ${payload?.payload?.losses || 0}L`,
              ]}
              labelFormatter={(label) => label}
            />
            <Bar dataKey="points" radius={[0, 8, 8, 0]}>
              {graphRows.map((row, index) => (
                <Cell key={row.id} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export const LeaderboardGraphPanel = ({
  rows = [],
  emptyTitle,
  emptyDescription,
}) => {
  const safeRows = Array.isArray(rows) ? rows : [];

  if (safeRows.length === 0) {
    return (
      <InlineEmptyState
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-3">
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={safeRows.slice(0, 8).map((row, index) => ({
              id: row?.id || `${row?.player || row?.player_name || "player"}-${index}`,
              label: row?.player || row?.player_name || `Player ${index + 1}`,
              points: Number(row?.points || 0),
              events: Number(row?.events || 0),
            }))}
            layout="vertical"
            margin={{ top: 8, right: 18, left: 10, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
            <XAxis type="number" stroke="var(--text-soft)" tick={{ fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="label"
              width={92}
              stroke="var(--text-soft)"
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              cursor={{ fill: "rgba(245, 158, 11, 0.08)" }}
              contentStyle={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border-soft)",
                borderRadius: "12px",
                color: "var(--text-main)",
              }}
              formatter={(value, _name, payload) => [
                `${Number(value || 0)} pts`,
                `${payload?.payload?.events || 0} tracked events`,
              ]}
              labelFormatter={(label) => label}
            />
            <Bar dataKey="points" radius={[0, 8, 8, 0]}>
              {safeRows.slice(0, 8).map((row, index) => (
                <Cell
                  key={row?.id || `leaderboard-graph-${index}`}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export const LeaderboardGraphCard = ({
  chartTitle,
  chartDescription,
  popoverTitle,
  popoverDescription,
  rows = [],
  emptyTitle,
  emptyDescription,
}) => {
  return (
    <DashboardCard>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-main)]">
            {chartTitle}
          </h2>
          {chartDescription ? (
            <p className="mt-1 text-xs text-[var(--text-muted)]">{chartDescription}</p>
          ) : null}
        </div>
        <InfoPopover title={popoverTitle} description={popoverDescription} />
      </div>
      <LeaderboardGraphPanel
        rows={rows}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
      />
    </DashboardCard>
  );
};

export const AnnouncementFeed = ({ items = [], emptyTitle, emptyDescription, action }) => {
  const safeItems = Array.isArray(items) ? items : [];

  if (safeItems.length === 0) {
    return (
      <InlineEmptyState
        icon={Megaphone}
        title={emptyTitle}
        description={emptyDescription}
        action={action}
      />
    );
  }

  return (
    <div className="space-y-2.5">
      {safeItems.map((item, index) => (
        <div
          key={item?.id || `${item?.title}-${index}`}
          className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3 py-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[var(--text-main)]">{item?.title || "Announcement"}</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {item?.message || item?.detail || "Relevant updates will appear here."}
              </p>
              {item?.meta ? (
                <p className="mt-2 text-[11px] text-[var(--text-soft)]">{item.meta}</p>
              ) : null}
            </div>
            {item?.timestamp ? (
              <span className="shrink-0 text-[11px] text-[var(--text-soft)]">{item.timestamp}</span>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
};

export const ActionList = ({ items = [], emptyTitle, emptyDescription, action }) => {
  const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];

  if (safeItems.length === 0) {
    return (
      <InlineEmptyState
        icon={Clock3}
        title={emptyTitle}
        description={emptyDescription}
        action={action}
      />
    );
  }

  return (
    <div className="space-y-2.5">
      {safeItems.map((item, index) => (
        <div
          key={item?.id || `${item?.title}-${index}`}
          className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3 py-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--text-main)]">{item?.title}</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">{item?.detail}</p>
            </div>
            {item?.status ? <StatusBadge status={item.status} /> : null}
          </div>
          {item?.action?.label ? (
            <div className="mt-3">
              <ActionButton action={item.action} />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
};

const PHASE_CHIP = {
  pre: { label: "Pre-Tournament", className: "bg-[var(--info-soft)] text-[var(--info)]" },
  running: { label: "Tournament Live", className: "bg-[var(--success-soft)] text-[var(--success)]" },
  finished: { label: "Tournament Finished", className: "bg-[var(--surface-muted)] text-[var(--text-muted)]" },
};

export const TournamentHero = ({
  name,
  phase = "running",
  dateRange = "",
  countdownTarget = null,
  phaseLabel = "",
  stats = [],
  children = null,
}) => {
  const chip = PHASE_CHIP[phase] || PHASE_CHIP.running;
  const resolvedPhaseLabel = phaseLabel || chip.label;
  const showCountdown = phase === "pre" && countdownTarget;
  const safeStats = (Array.isArray(stats) ? stats : []).filter((stat) => stat && stat.value !== undefined && stat.value !== null && stat.value !== "");
  const isLive = phase === "running";

  return (
    <section className={`os-card overflow-hidden px-5 py-4.5 transition-all ${isLive ? 'os-hero-live' : ''}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
          <h1 className="truncate text-xl font-bold tracking-tight text-[var(--text-main)] sm:text-2xl">{name || "Tournament"}</h1>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${chip.className}`}>
            {isLive ? <span className="os-pulse-live" aria-hidden="true" /> : phase === "finished" ? <Trophy size={12} /> : <CalendarDays size={12} />}
            {resolvedPhaseLabel}
          </span>
          {dateRange ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-muted)]">
              <CalendarDays size={14} className="text-[var(--primary)]" />
              {dateRange}
            </span>
          ) : null}
        </div>

        {showCountdown ? (
          <span className="inline-flex items-center gap-2 rounded-xl bg-[var(--surface)] px-3.5 py-2 text-sm font-bold text-[var(--primary)] shadow-xs ring-1 ring-[var(--border-soft)]">
            <Clock3 size={15} className="animate-pulse" />
            <span>{getCountdownLabel(countdownTarget)}</span>
          </span>
        ) : null}
      </div>

      {safeStats.length > 0 ? (
        <div className="mt-3.5 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-[var(--border-soft)]/60 pt-3">
          {safeStats.map((stat, index) => (
            <div key={`hero-stat-${stat.label || index}`} className="flex items-baseline gap-1.5">
              <span className="text-base font-extrabold tabular-nums text-[var(--text-main)]">{stat.value}</span>
              <span className="text-xs font-semibold text-[var(--text-muted)]">{stat.label}</span>
            </div>
          ))}
        </div>
      ) : null}

      {children}
    </section>
  );
};

export const TodaysMatchesTable = ({
  events = [],
  emptyTitle = "No matches scheduled today.",
  emptyDescription = "Today's published matches will appear here once the current tournament day is scheduled.",
  action = { label: "View Full Schedule", to: "/viewer/schedules" },
}) => {
  const safeEvents = Array.isArray(events) ? events : [];

  if (safeEvents.length === 0) {
    return (
      <InlineEmptyState
        icon={CalendarDays}
        title={emptyTitle}
        description={emptyDescription}
        action={action}
        compact
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-auto rounded-xl border border-[var(--border-soft)]">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-[var(--surface-soft)] text-left text-[11px] uppercase tracking-wide text-[var(--text-soft)]">
            <tr>
              <th className="px-3 py-2.5">Time</th>
              <th className="px-3 py-2.5">Sport</th>
              <th className="px-3 py-2.5">Match</th>
              <th className="px-3 py-2.5">Venue</th>
              <th className="px-3 py-2.5 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="bg-[var(--surface)]">
            {safeEvents.map((event, index) => {
              const matchup = getMatchup(event);
              return (
                <tr key={getEventKey(event, `today-${index}`)} className="border-t border-[var(--border-soft)]">
                  <td className="px-3 py-3 font-semibold tabular-nums text-[var(--text-main)]">{formatTime(event?.start)}</td>
                  <td className="px-3 py-3 text-[var(--text-main)]">{getSportLabel(event)}</td>
                  <td className="px-3 py-3 text-[var(--text-main)]">
                    <span className="font-medium">{matchup.left}</span>
                    <span className="mx-1 text-[var(--text-soft)]">vs</span>
                    <span className="font-medium">{matchup.right}</span>
                  </td>
                  <td className="px-3 py-3 text-[var(--text-muted)]">{event?.venue || "Venue TBA"}</td>
                  <td className="px-3 py-3 text-right">
                    <StatusBadge status={getEventStatus(event)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {action?.label ? (
        <div className="flex justify-end">
          {action.to ? (
            <Link to={action.to} className="text-xs font-semibold text-[var(--primary)] hover:underline">
              {action.label}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export const SportsOverview = ({
  items = [],
  emptyTitle = "No sports configured yet.",
  emptyDescription = "Sports readiness will appear here once events are added to the tournament.",
}) => {
  const safeItems = Array.isArray(items) ? items : [];

  if (safeItems.length === 0) {
    return (
      <InlineEmptyState
        icon={Trophy}
        title={emptyTitle}
        description={emptyDescription}
        compact
      />
    );
  }

  return (
    <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
      {safeItems.map((item, index) => (
        <div
          key={`sport-overview-${item?.sport || index}`}
          className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3.5 py-3"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--text-main)]">{item?.sport || "Sport"}</p>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              {Number(item?.teamCount || 0)} {Number(item?.teamCount) === 1 ? "Team" : "Teams"}
              {item?.matchCount ? ` | ${item.matchCount} ${Number(item.matchCount) === 1 ? "match" : "matches"}` : ""}
            </p>
          </div>
          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              item?.ready
                ? "bg-[var(--success-soft)] text-[var(--success)]"
                : "bg-[var(--surface-muted)] text-[var(--text-muted)]"
            }`}
          >
            {item?.ready ? <CheckCircle2 size={12} /> : <Circle size={12} />}
            {item?.ready ? "Ready" : "Pending"}
          </span>
        </div>
      ))}
    </div>
  );
};

export const AnnouncementTimeline = ({
  items = [],
  emptyTitle = "No announcements yet.",
  emptyDescription = "Tournament announcements will appear here when new updates are posted.",
  action = { label: "View all announcements", to: "/viewer/announcements" },
}) => {
  const safeItems = Array.isArray(items) ? items : [];

  if (safeItems.length === 0) {
    return (
      <InlineEmptyState
        icon={Megaphone}
        title={emptyTitle}
        description={emptyDescription}
        action={action}
        compact
      />
    );
  }

  return (
    <div className="space-y-3">
      <ol className="relative ml-2 space-y-4 border-l border-[var(--border-soft)] pl-5">
        {safeItems.map((item, index) => (
          <li key={item?.id || `timeline-${index}`} className="relative">
            <span className="absolute -left-[26px] top-1 flex h-3 w-3 items-center justify-center rounded-full border-2 border-[var(--primary)] bg-[var(--surface)]" />
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-soft)]">
                {item?.group || "Update"}
              </p>
              {item?.timestamp ? (
                <span className="text-[11px] text-[var(--text-soft)]">{item.timestamp}</span>
              ) : null}
            </div>
            <p className="mt-1 text-sm font-semibold text-[var(--text-main)]">{item?.title || "Announcement"}</p>
            {item?.message ? (
              <p className="mt-1 line-clamp-2 text-xs text-[var(--text-muted)]">{item.message}</p>
            ) : null}
          </li>
        ))}
      </ol>
      {action?.label && action?.to ? (
        <div className="flex justify-end">
          <Link to={action.to} className="text-xs font-semibold text-[var(--primary)] hover:underline">
            {action.label}
          </Link>
        </div>
      ) : null}
    </div>
  );
};

export const TournamentUpdatesPanel = ({
  milestones = [],
  emptyTitle = "No tournament updates yet.",
  emptyDescription = "Preparation milestones will appear here as the tournament gets ready.",
}) => {
  const safeMilestones = Array.isArray(milestones) ? milestones : [];

  if (safeMilestones.length === 0) {
    return (
      <InlineEmptyState
        icon={Clock3}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <div className="space-y-2.5">
      {safeMilestones.map((milestone, index) => (
        <div
          key={`milestone-${milestone?.key || index}`}
          className="flex items-center gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3.5 py-3"
        >
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
              milestone?.done
                ? "bg-[var(--success-soft)] text-[var(--success)]"
                : "bg-[var(--surface-muted)] text-[var(--text-soft)]"
            }`}
          >
            {milestone?.done ? <CheckCircle2 size={16} /> : <Circle size={16} />}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--text-main)]">{milestone?.label}</p>
            {milestone?.detail ? (
              <p className="truncate text-xs text-[var(--text-muted)]">{milestone.detail}</p>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
};

export const SportsDirectoryGrid = ({
  sports = [],
  emptyTitle = "No sports configured yet.",
  emptyDescription = "Official sports disciplines for this intramural will appear here once announced.",
}) => {
  const safeSports = Array.isArray(sports) ? sports : [];

  if (safeSports.length === 0) {
    return (
      <InlineEmptyState
        icon={Trophy}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {safeSports.map((sport, index) => {
        const name = String(sport?.name || sport?.sport_name || sport?.sport || `Sport ${index + 1}`).trim();
        const category = String(sport?.category || sport?.gender_category || sport?.type || "Standard").toUpperCase();
        const maxPlayers = sport?.max_players || sport?.configuration?.max_players || sport?.teamCount;
        const participantShape = String(sport?.participant_shape || (sport?.is_solo ? "Solo" : "Team")).toUpperCase();

        return (
          <div
            key={sport?.id || `sport-card-${index}`}
            className="group relative overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4 transition hover:border-[var(--primary)]/50 hover:bg-[var(--surface)] hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)] font-bold text-sm">
                <Trophy size={18} />
              </span>
              <span className="rounded-full bg-[var(--surface-muted)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                {participantShape}
              </span>
            </div>

            <h3 className="mt-3 truncate text-sm font-bold text-[var(--text-main)] group-hover:text-[var(--primary)]">
              {name}
            </h3>

            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
              {category && category !== "STANDARD" ? (
                <span className="rounded-md border border-[var(--border-soft)] bg-[var(--surface)] px-2 py-0.5 font-medium">
                  {category}
                </span>
              ) : null}
              {maxPlayers ? (
                <span className="rounded-md border border-[var(--border-soft)] bg-[var(--surface)] px-2 py-0.5 font-medium">
                  Max {maxPlayers} players
                </span>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const ApplicationQuotaBanner = ({
  approvedCount = 0,
  maxQuota = 2,
  totalApplications = 0,
}) => {
  const isCapped = approvedCount >= maxQuota;

  return (
    <div
      className={`rounded-2xl border p-4 transition ${
        isCapped
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
          : "border-[var(--border-soft)] bg-[var(--surface-soft)] text-[var(--text-main)]"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span
            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-bold text-sm ${
              isCapped
                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300"
                : "bg-[var(--primary-soft)] text-[var(--primary)]"
            }`}
          >
            {approvedCount}/{maxQuota}
          </span>
          <div>
            <h4 className="text-sm font-bold">
              {isCapped
                ? "Participation Limit Reached"
                : `Participation Slots: ${approvedCount} of ${maxQuota} Used`}
            </h4>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              {isCapped
                ? "Both participation slots are occupied by pending or confirmed applications. A rejected, withdrawn, or cancelled application releases its slot."
                : "Pending, tryout, and confirmed applications reserve a slot. You may hold up to 2 active teams or entries."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <div className="flex gap-1.5">
            {[...Array(maxQuota)].map((_, i) => (
              <div
                key={i}
                className={`h-2.5 w-6 rounded-full transition-all ${
                  i < approvedCount
                    ? "bg-emerald-500"
                    : "bg-[var(--surface-muted)] border border-[var(--border-soft)]"
                }`}
                title={`Slot ${i + 1}: ${i < approvedCount ? "Used" : "Available"}`}
              />
            ))}
          </div>
          {totalApplications > 0 ? (
            <span className="text-[11px] font-semibold text-[var(--text-soft)]">
              ({totalApplications} submitted)
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export const SportsIconGrid = ({
  sports = [],
  viewAllHref = "/viewer/sports",
  emptyTitle = "No sports configured for this intramural yet.",
  emptyDescription = "Sports disciplines will appear here once added by the coordinator.",
}) => {
  const safeSports = Array.isArray(sports) ? sports : [];

  if (safeSports.length === 0) {
    return (
      <div className="py-4 text-center">
        <InlineEmptyState
          icon={Trophy}
          title={emptyTitle}
          description={emptyDescription}
          compact
        />
      </div>
    );
  }

  const getSportEmoji = (name = "") => {
    const n = name.toLowerCase();
    if (n.includes("basket")) return "🏀";
    if (n.includes("volley")) return "🏐";
    if (n.includes("foot") || n.includes("soccer")) return "⚽";
    if (n.includes("badminton")) return "🏸";
    if (n.includes("table") || n.includes("ping")) return "🏓";
    if (n.includes("tennis")) return "🎾";
    if (n.includes("esport") || n.includes("valorant") || n.includes("ml") || n.includes("game")) return "🎮";
    if (n.includes("swim")) return "🏊";
    if (n.includes("track") || n.includes("run") || n.includes("athletic")) return "🏃";
    if (n.includes("chess")) return "♟️";
    if (n.includes("dance")) return "💃";
    return "🏆";
  };

  return (
    <div className="w-full space-y-4 py-2">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="inline-flex items-center gap-2 text-base font-extrabold uppercase tracking-wide text-[var(--text-main)]">
            <Trophy size={18} className="text-[var(--primary)]" aria-hidden="true" />
            Sports Overview
          </h2>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Official sports disciplines and competitive events included in this Intramural
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3.5 py-1">
        {safeSports.map((sport, idx) => {
          const name = String(sport?.name || sport?.sport_name || sport?.sport || "Sport").trim();
          const category = String(sport?.category || sport?.participant_shape || "").trim();
          const rawImage = sport?.image_url || sport?.icon_url || sport?.sport_image_url || sport?.logo_url;
          const imageSrc = resolveMediaUrl(rawImage);
          const emoji = getSportEmoji(name);

          return (
            <div
              key={`sport-icon-${sport?.id || idx}`}
              className="group flex min-w-[130px] max-w-[170px] flex-col items-center justify-center rounded-2xl p-3.5 text-center transition-transform duration-200 hover:-translate-y-1 sm:min-w-[150px]"
            >
              <div className="relative mb-2 flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl text-2xl transition-transform duration-200 group-hover:scale-105">
                {imageSrc ? (
                  <img
                    src={imageSrc}
                    alt={name}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      if (e.currentTarget.nextElementSibling) {
                        e.currentTarget.nextElementSibling.classList.remove("hidden");
                      }
                    }}
                  />
                ) : null}
                <span className={imageSrc ? "hidden" : ""}>{emoji}</span>
              </div>

              <h4 className="line-clamp-1 text-xs font-extrabold text-[var(--text-main)] group-hover:text-[var(--primary)] transition-colors">
                {name}
              </h4>

              {category && category.toLowerCase() !== "general" ? (
                <span className="mt-1 inline-block rounded-md bg-[var(--surface-muted)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--text-muted)]">
                  {category}
                </span>
              ) : (
                <span className="mt-1 inline-block text-[10px] text-[var(--text-soft)]">
                  {sport?.team_count ? `${sport.team_count} Teams` : "Official Event"}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-center pt-2">
        <Link
          to={viewAllHref}
          className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-[var(--primary)] hover:bg-[var(--primary-soft)] transition-colors border border-transparent hover:border-[var(--border-soft)]"
        >
          <span>View All Sports Details & Brackets</span>
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
};


export const OlympicStandingsTable = ({
  departmentRows = [],
  standingsHref = "/viewer/standings",
  emptyTitle = "No department standings recorded yet.",
  emptyDescription = "Medal points and overall rankings will calculate as matches conclude.",
  unavailable = false,
}) => {
  const safeRows = Array.isArray(departmentRows) ? departmentRows : [];

  if (unavailable) {
    return (
      <DashboardCard className="h-full">
        <PanelHeader icon={Trophy} title="Standings" meta="Official Department Overall Leaderboard" />
        <InlineEmptyState icon={Trophy} title="Unable to load standings." description="Authoritative standings are temporarily unavailable." compact />
      </DashboardCard>
    );
  }

  if (safeRows.length === 0) {
    return (
      <DashboardCard className="h-full">
        <PanelHeader icon={Trophy} title="Standings" meta="Official Department Overall Leaderboard" />
        <InlineEmptyState
          icon={Trophy}
          title={emptyTitle}
          description={emptyDescription}
          compact
        />
      </DashboardCard>
    );
  }

  const getRankBadge = (rank) => {
    if (rank === 1) {
      return (
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-amber-500/20 text-amber-500 font-extrabold text-xs shadow-sm ring-1 ring-amber-500/30">
          🥇 1st
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-slate-300/30 text-slate-400 font-extrabold text-xs ring-1 ring-slate-400/30">
          🥈 2nd
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-amber-700/20 text-amber-700 dark:text-amber-500 font-extrabold text-xs ring-1 ring-amber-700/30">
          🥉 3rd
        </span>
      );
    }
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-[var(--surface-muted)] text-[var(--text-muted)] font-bold text-xs">
        {rank}th
      </span>
    );
  };

  return (
    <DashboardCard className="h-full">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="inline-flex items-center gap-2 text-base font-extrabold uppercase tracking-wide text-[var(--text-main)]">
            <Trophy size={18} className="text-[var(--primary)]" aria-hidden="true" />
            Standings
          </h2>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Department Overall Leaderboard & Medal Points (Gold 100 • Silver 70 • Bronze 40 • 4th 20)
          </p>
        </div>
        <Link
          to={standingsHref}
          className="text-xs font-semibold text-[var(--primary)] hover:underline"
        >
          Full Standings
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[var(--border-soft)] text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] bg-[var(--surface-soft)]/50">
              <th className="px-3 py-2.5">Rank</th>
              <th className="px-3 py-2.5">Department / Team</th>
              <th className="px-2 py-2.5 text-center text-amber-500">Gold (100)</th>
              <th className="px-2 py-2.5 text-center text-slate-400">Silver (70)</th>
              <th className="px-2 py-2.5 text-center text-amber-700 dark:text-amber-500">Bronze (40)</th>
              <th className="px-2 py-2.5 text-center text-[var(--text-soft)]">4th (20)</th>
              <th className="px-3 py-2.5 text-right font-extrabold text-[var(--text-main)]">Total Points</th>
              <th className="px-3 py-2.5 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-soft)]/60">
            {safeRows.map((row, idx) => {
              const isLeader = row.rank === 1;
              return (
                <tr
                  key={`dept-leaderboard-${row.id || idx}`}
                  className={`transition-colors hover:bg-[var(--surface-soft)]/70 ${
                    isLeader ? "bg-amber-500/5 font-medium" : ""
                  }`}
                >
                  <td className="px-3 py-3 font-bold whitespace-nowrap">
                    {getRankBadge(row.rank)}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      <TeamLogo imageUrl={row.logoUrl || null} label={row.name} scale="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-[var(--text-main)]">{row.name}</p>
                        {row.code && row.code !== row.name ? (
                          <span className="text-[10px] text-[var(--text-muted)]">{row.code}</span>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-3 text-center">
                    <span className="inline-flex min-w-[20px] items-center justify-center rounded-md bg-amber-500/10 px-1.5 py-0.5 text-xs font-extrabold text-amber-600 dark:text-amber-400">
                      {row.gold || 0}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-center">
                    <span className="inline-flex min-w-[20px] items-center justify-center rounded-md bg-slate-300/20 px-1.5 py-0.5 text-xs font-extrabold text-slate-500 dark:text-slate-300">
                      {row.silver || 0}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-center">
                    <span className="inline-flex min-w-[20px] items-center justify-center rounded-md bg-amber-700/10 px-1.5 py-0.5 text-xs font-extrabold text-amber-700 dark:text-amber-500">
                      {row.bronze || 0}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-center">
                    <span className="inline-flex min-w-[20px] items-center justify-center rounded-md bg-[var(--surface-muted)] px-1.5 py-0.5 text-xs font-semibold text-[var(--text-muted)]">
                      {row.fourth || 0}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right font-extrabold text-sm text-[var(--text-main)] whitespace-nowrap">
                    {row.totalPoints || 0} <span className="text-[10px] font-normal text-[var(--text-muted)]">pts</span>
                  </td>
                  <td className="px-3 py-3 text-right whitespace-nowrap">
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-extrabold ${
                        isLeader
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-[var(--surface-muted)] text-[var(--text-muted)]"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </DashboardCard>
  );
};

const PlacementIdentity = ({ name, imageUrl, className }) => {
  const label = String(name || "-").trim() || "-";
  if (label === "-") return <span className="text-[var(--text-soft)]">-</span>;
  return (
    <span className={`inline-flex max-w-44 items-center gap-1.5 rounded-lg px-2 py-1 text-left text-[11px] font-bold ${className}`}>
      <TeamLogo imageUrl={imageUrl} label={label} scale="sm" className="!h-6 !w-6 shrink-0 text-[9px]" />
      <span className="min-w-0 break-words leading-tight">{label}</span>
    </span>
  );
};

export const SportBreakdownTable = ({
  breakdownRows = [],
  emptyTitle = "No sport results recorded yet.",
  emptyDescription = "Sport-by-sport placements will appear here as matches finish.",
  unavailable = false,
}) => {
  const safeRows = Array.isArray(breakdownRows) ? breakdownRows : [];

  if (unavailable) {
    return (
      <DashboardCard className="h-full">
        <PanelHeader icon={Medal} title="Sport-by-Sport Breakdown" meta="Podium Placements per Sport" />
        <InlineEmptyState icon={Medal} title="Unable to load standings." description="Authoritative sport placements are temporarily unavailable." compact />
      </DashboardCard>
    );
  }

  if (safeRows.length === 0) {
    return (
      <DashboardCard className="h-full">
        <PanelHeader icon={Medal} title="Sport-by-Sport Breakdown" meta="Podium Placements per Sport" />
        <InlineEmptyState
          icon={Medal}
          title={emptyTitle}
          description={emptyDescription}
          compact
        />
      </DashboardCard>
    );
  }

  return (
    <DashboardCard className="h-full">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="inline-flex items-center gap-2 text-base font-extrabold uppercase tracking-wide text-[var(--text-main)]">
            <Medal size={18} className="text-amber-500" aria-hidden="true" />
            Sport-by-Sport Breakdown
          </h2>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Podium winners & placements for each sport discipline
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[var(--border-soft)] text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] bg-[var(--surface-soft)]/50">
              <th className="px-3 py-2.5">Sport / Category</th>
              <th className="px-2 py-2.5 text-center text-amber-500">Gold (1st)</th>
              <th className="px-2 py-2.5 text-center text-slate-400">Silver (2nd)</th>
              <th className="px-2 py-2.5 text-center text-amber-700 dark:text-amber-500">Bronze (3rd)</th>
              <th className="px-2 py-2.5 text-center text-[var(--text-soft)]">4th Place</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-soft)]/60">
            {safeRows.map((row, idx) => (
              <tr key={`sport-breakdown-${row.sport}-${idx}`} className="hover:bg-[var(--surface-soft)]/70 transition-colors">
                <td className="px-3 py-3">
                  <p className="font-bold text-xs text-[var(--text-main)]">{row.sport}</p>
                  {row.category ? (
                    <span className="text-[10px] text-[var(--text-muted)]">({row.category})</span>
                  ) : null}
                </td>
                <td className="px-2 py-3 text-center">
                  <PlacementIdentity name={row.gold} imageUrl={row.gold_logo_url} className="border border-amber-500/30 bg-amber-500/15 text-amber-600 dark:text-amber-400" />
                </td>
                <td className="px-2 py-3 text-center">
                  <PlacementIdentity name={row.silver} imageUrl={row.silver_logo_url} className="border border-slate-400/30 bg-slate-300/25 text-slate-600 dark:text-slate-300" />
                </td>
                <td className="px-2 py-3 text-center">
                  <PlacementIdentity name={row.bronze} imageUrl={row.bronze_logo_url} className="border border-amber-700/30 bg-amber-700/15 text-amber-700 dark:text-amber-500" />
                </td>
                <td className="px-2 py-3 text-center">
                  <PlacementIdentity name={row.fourth} imageUrl={row.fourth_logo_url} className="bg-[var(--surface-muted)] font-medium text-[var(--text-muted)]" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardCard>
  );
};
