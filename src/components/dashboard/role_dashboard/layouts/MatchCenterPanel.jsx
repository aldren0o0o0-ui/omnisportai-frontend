import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  Clock3,
  MapPin,
  Radio,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { TeamLogo } from "../../../common/IdentityImage";
import {
  formatShortDate,
  formatTime,
  formatMatchClock,
} from "./dashboardDateUtils";
import {
  getEventKey,
  getMatchup,
  getSportLabel,
  isCompletedEvent,
  isLiveEvent,
  parseScore,
  prioritizeMatchCenterEvents,
} from "./dashboardEventUtils";

export const MatchCenterPanel = ({
  events = [],
  scheduleHref = "/viewer/schedules",
  scoreBasePath = "/viewer/matches",
  roleTitle = null,
  onOpenScore = null,
  emptyTitle = "No matches scheduled yet",
  emptyDescription = "Match schedules will appear here once the schedule is generated.",
}) => {
  const safeEvents = useMemo(() => prioritizeMatchCenterEvents(events), [events]);

  // Find initial featured match (live first, then next upcoming, else first available)
  const initialMatch = useMemo(() => {
    if (safeEvents.length === 0) return null;
    const live = safeEvents.find((e) => isLiveEvent(e));
    if (live) return live;
    const now = new Date();
    const upcoming = safeEvents.filter((e) => {
      const start = e?.start ? new Date(e.start) : null;
      return start && start >= now;
    });
    return upcoming[0] || safeEvents[0];
  }, [safeEvents]);

  const [selectedMatchId, setSelectedMatchId] = useState(null);

  const currentMatch = useMemo(() => {
    if (!selectedMatchId) return initialMatch;
    return (
      safeEvents.find((e) => getEventKey(e) === selectedMatchId) || initialMatch
    );
  }, [safeEvents, selectedMatchId, initialMatch]);

  // Real-time clock ticks for live matches
  const [clockNow, setClockNow] = useState(() => Date.now());
  useEffect(() => {
    if (
      (!currentMatch?.clock_enabled || !currentMatch?.clock_running) &&
      !currentMatch?.secondary_clock?.running
    ) {
      return undefined;
    }
    const timer = window.setInterval(() => setClockNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [
    currentMatch?.clock_enabled,
    currentMatch?.clock_running,
    currentMatch?.secondary_clock?.running,
  ]);

  const matchup = currentMatch ? getMatchup(currentMatch) : null;
  const score = currentMatch ? parseScore(currentMatch) : null;
  const showScore =
    score &&
    (score.hasScore ||
      isLiveEvent(currentMatch) ||
      isCompletedEvent(currentMatch));
  const phaseLabel = String(currentMatch?.phase_label || "").trim();
  const phaseNumber = Number(currentMatch?.phase_number || 0);
  const showPhase = phaseLabel && phaseNumber > 0;
  const showClock = Boolean(currentMatch?.clock_enabled);
  const observedAtMs = new Date(
    currentMatch?.clock_observed_at || ""
  ).getTime();
  const elapsedSinceObservation =
    currentMatch?.clock_running && Number.isFinite(observedAtMs)
      ? Math.max(0, Math.floor((clockNow - observedAtMs) / 1000))
      : 0;
  const visibleClockSeconds = Math.max(
    0,
    Number(currentMatch?.clock_remaining_seconds || 0) - elapsedSinceObservation
  );

  const matchId = currentMatch?.match_id || currentMatch?.id || currentMatch?.event_id || null;
  const liveScoringUrl =
    matchId && scoreBasePath ? `${scoreBasePath}/${matchId}` : null;

  return (
    <div className="w-full min-w-0 max-w-full rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] shadow-xs transition-shadow">
      <div className="grid grid-cols-1 items-stretch lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        {/* ================= LEFT SIDE: LIVE / FEATURED MATCH CENTER ================= */}
        <div className="flex flex-col justify-between p-5 sm:p-6 min-w-0">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border-soft)] pb-4">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${isLiveEvent(currentMatch) ? "bg-rose-500/15 text-rose-600 dark:text-rose-400" : "bg-[var(--primary-soft)] text-[var(--primary)]"}`}><Radio size={18} aria-hidden="true" /></span>
                <h2 className="truncate text-sm font-extrabold uppercase tracking-wide text-[var(--text-main)] sm:text-base">{roleTitle || "Live Match Center"}</h2>
              </div>
              {currentMatch && liveScoringUrl && onOpenScore ? (
                <button type="button" onClick={() => onOpenScore(currentMatch)} className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[var(--primary)]/30 px-3 text-xs font-semibold text-[var(--primary)] transition hover:bg-[var(--primary-soft)]">View Match <ExternalLink size={13} aria-hidden="true" /></button>
              ) : currentMatch && liveScoringUrl ? (
                <Link to={liveScoringUrl} className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[var(--primary)]/30 px-3 text-xs font-semibold text-[var(--primary)] transition hover:bg-[var(--primary-soft)]">View Match <ExternalLink size={13} aria-hidden="true" /></Link>
              ) : null}
            </div>

            {/* Content Body */}
            {currentMatch ? (
              <div className="mt-5 space-y-5">
                {/* Meta details bar */}
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-[var(--primary-soft)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--primary)]">
                      {getSportLabel(currentMatch)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)]">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays size={13} className="text-[var(--text-soft)]" />
                      {formatShortDate(currentMatch?.start)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock3 size={13} className="text-[var(--text-soft)]" />
                      {formatTime(currentMatch?.start)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={13} className="text-[var(--text-soft)]" />
                      {String(currentMatch?.venue || "Venue TBD")}
                    </span>
                  </div>
                </div>

                {/* Matchup Duel View */}
                <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-6 py-4 px-2">
                  {/* Home Team */}
                  <div className="flex min-w-0 flex-col items-center gap-2 text-center">
                    <div className="shrink-0">
                      <TeamLogo
                        imageUrl={
                          currentMatch?.participant1?.effective_logo_url ||
                          currentMatch?.team1_logo_url ||
                          currentMatch?.team1_logo ||
                          null
                        }
                        label={matchup.left}
                        scale="xl"
                        className="rounded-full"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs sm:text-sm md:text-base font-extrabold text-[var(--text-main)]">
                        {matchup.left}
                      </p>
                      
                    </div>
                  </div>

                  {/* Score / Center VS */}
                  <div className="text-center px-1">
                    {showScore && liveScoringUrl ? (
                      <Link
                        to={liveScoringUrl}
                        className="group inline-flex flex-col items-center justify-center rounded-xl p-1 transition hover:scale-105"
                        title="Open live match score"
                      >
                        <div className="text-4xl font-black tabular-nums tracking-tight sm:text-5xl text-[var(--text-main)] group-hover:text-[var(--primary)]">
                          <span>{score.left}</span>
                          <span className="mx-3 inline-block text-6xl font-bold leading-none text-[var(--text-soft)] sm:text-7xl">/</span>
                          <span>{score.right}</span>
                        </div>
                      </Link>
                    ) : showScore ? (
                      <div className="text-4xl font-black tabular-nums tracking-tight sm:text-5xl text-[var(--text-main)]">
                        <span>{score.left}</span>
                        <span className="mx-3 inline-block text-6xl font-bold leading-none text-[var(--text-soft)] sm:text-7xl">/</span>
                        <span>{score.right}</span>
                      </div>
                    ) : (
                      <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface-soft)] text-xs font-black uppercase tracking-widest text-[var(--text-soft)] border border-[var(--border-soft)]">
                        VS
                      </div>
                    )}

                    {/* Clock / Phase */}
                    {(showPhase || showClock) && (
                      <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
                        {showPhase && (
                          <span className="rounded-md border border-[var(--border-soft)] bg-[var(--surface-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--text-main)]">
                            {phaseLabel} {phaseNumber}
                          </span>
                        )}
                        {showClock && (
                          <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[10px] font-black text-cyan-600 dark:text-cyan-300">
                            {formatMatchClock(visibleClockSeconds)}{" "}
                            {currentMatch?.clock_running && visibleClockSeconds > 0
                              ? "â€¢ LIVE"
                              : "â€¢ STOPPED"}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Away Team */}
                  <div className="flex min-w-0 flex-col items-center gap-2 text-center">
                    <div className="shrink-0">
                      <TeamLogo
                        imageUrl={
                          currentMatch?.participant2?.effective_logo_url ||
                          currentMatch?.team2_logo_url ||
                          currentMatch?.team2_logo ||
                          null
                        }
                        label={matchup.right}
                        scale="xl"
                        className="rounded-full"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs sm:text-sm md:text-base font-extrabold text-[var(--text-main)]">
                        {matchup.right}
                      </p>
                      
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-8 flex flex-col items-center justify-center text-center p-6 rounded-xl border border-dashed border-[var(--border-soft)]">
                <CalendarDays size={32} className="text-[var(--text-soft)] mb-2" />
                <p className="text-sm font-bold text-[var(--text-main)]">{emptyTitle}</p>
                <p className="mt-1 text-xs text-[var(--text-muted)] max-w-sm">
                  {emptyDescription}
                </p>
              </div>
            )}
          </div>

        </div>

        {/* ================= RIGHT SIDE: COMPACT MATCH SCHEDULE ================= */}
        <div className="relative flex min-w-0 flex-col justify-between border-t border-[var(--border-soft)] bg-[var(--surface-soft)]/10 p-4 before:pointer-events-none before:absolute before:left-0 before:top-1/2 before:hidden before:h-16 before:w-px before:-translate-y-1/2 before:bg-[var(--border-soft)] sm:p-5 lg:border-t-0 lg:before:block">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border-soft)] pb-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-soft)] text-[var(--primary)]">
                  <CalendarDays size={16} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wide text-[var(--text-main)] truncate">
                    Match Schedule
                  </h3>
                  <p className="text-[11px] text-[var(--text-muted)] truncate">
                    "Select a match to preview"
                  </p>
                </div>
              </div>

              {scheduleHref && (
                <Link
                  to={scheduleHref}
                  className="inline-flex items-center gap-0.5 rounded-md px-2 py-0.5 text-xs font-bold text-[var(--primary)] hover:bg-[var(--primary-soft)] transition shrink-0"
                >
                  <span>Full</span>
                  <ChevronRight size={13} />
                </Link>
              )}
            </div>

            {/* Compact Match list (Max 4 items) */}
            <div className="mt-2.5">
              {safeEvents.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--text-muted)]">
                  <CalendarDays size={22} className="mx-auto text-[var(--text-soft)] mb-1.5" />
                  <p className="font-semibold text-[var(--text-main)]">No matches found</p>
                  <p className="mt-0.5 text-[11px]">Schedules will appear once generated.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {safeEvents.slice(0, 4).map((event, index) => {
                    const eventKey = getEventKey(event, `match-${index}`);
                    const isSelected = selectedMatchId === eventKey;
                    const eventMatchup = getMatchup(event);
                    const isLive = isLiveEvent(event);
                    const eventScore = parseScore(event);

                    return (
                      <button
                        key={eventKey}
                        type="button"
                        onClick={() => setSelectedMatchId(eventKey)}
                        className={`group w-full text-left rounded-lg px-2.5 py-2 transition duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] ${
                          isSelected
                            ? "bg-blue-500/10 ring-1 ring-blue-500/40 shadow-xs"
                            : "hover:bg-[var(--surface-soft)]"
                        }`}
                      >
                        {/* Compact Row: Team 1 Logo + Name  VS/Score  Team 2 Name + Logo */}
                        <div className="flex items-center justify-between gap-2">
                          {/* Home side */}
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <TeamLogo
                              imageUrl={
                                event?.participant1?.effective_logo_url ||
                                event?.team1_logo_url ||
                                event?.team1_logo ||
                                null
                              }
                              label={eventMatchup.left}
                              scale="sm"
                            />
                            <span className="truncate text-xs font-semibold text-[var(--text-main)]">
                              {eventMatchup.left}
                            </span>
                          </div>

                          {/* Center: VS or Score */}
                          <div className="shrink-0 px-1 text-center">
                            {isLive ? (
                              <span className="inline-flex items-center gap-1 rounded bg-rose-500/15 px-1 py-0.2 text-[9px] font-black uppercase text-rose-600 dark:text-rose-400 animate-pulse">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                {eventScore.left}-{eventScore.right}
                              </span>
                            ) : eventScore.hasScore || isCompletedEvent(event) ? (
                              <span className="font-mono text-xs font-bold text-[var(--text-main)]">
                                {eventScore.left} - {eventScore.right}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-soft)]">
                                vs
                              </span>
                            )}
                          </div>

                          {/* Away side */}
                          <div className="flex items-center justify-end gap-1.5 min-w-0 flex-1 text-right">
                            <span className="truncate text-xs font-semibold text-[var(--text-main)]">
                              {eventMatchup.right}
                            </span>
                            <TeamLogo
                              imageUrl={
                                event?.participant2?.effective_logo_url ||
                                event?.team2_logo_url ||
                                event?.team2_logo ||
                                null
                              }
                              label={eventMatchup.right}
                              scale="sm"
                            />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchCenterPanel;
