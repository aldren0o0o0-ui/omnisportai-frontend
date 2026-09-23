import React, { useRef, useMemo } from "react";

export const PlayerSportSelector = ({
  sports = [],
  selectedSportId = null,
  selectedEventId = "all",
  onSelectSport = () => {},
  onSelectEvent = () => {},
}) => {
  const tabsRef = useRef({});

  if (!Array.isArray(sports) || sports.length === 0) {
    return null;
  }

  // Deduplicate and group sports by unique sport_id
  const distinctSports = useMemo(() => {
    const map = new Map();
    for (const s of sports) {
      const sid = String(s.sport_id);
      if (!map.has(sid)) {
        map.set(sid, {
          sport_id: s.sport_id,
          sport_name: s.sport_name || `Sport #${s.sport_id}`,
          events: [],
          totalMatches: 0,
        });
      }
      const group = map.get(sid);
      group.events.push(s);
      if (typeof s.matches_played === "number") {
        group.totalMatches += s.matches_played;
      }
    }
    return Array.from(map.values());
  }, [sports]);

  // Active sport group
  const activeGroup = useMemo(() => {
    if (!distinctSports.length) return null;
    return (
      distinctSports.find((g) => String(g.sport_id) === String(selectedSportId)) ||
      distinctSports[0]
    );
  }, [distinctSports, selectedSportId]);

  // If only one sport exists AND that sport has only one event context
  if (sports.length === 1) {
    const single = sports[0];
    return (
      <div
        className="flex items-center justify-between rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3.5 py-2.5"
        data-testid="player-sport-single"
      >
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[var(--primary)]" aria-hidden="true" />
          <span className="text-xs font-bold text-[var(--text-main)]">
            {single.sport_name || "Athletic Record"}
          </span>
          {single.event_name ? (
            <span className="text-xs text-[var(--text-muted)]">
              · {single.event_name}
            </span>
          ) : null}
        </div>
        {typeof single.matches_played === "number" ? (
          <span className="text-xs font-semibold text-[var(--text-muted)]">
            {single.matches_played} {single.matches_played === 1 ? "match" : "matches"}
          </span>
        ) : null}
      </div>
    );
  }

  // Handle keyboard navigation for sports tabs
  const handleSportKeyDown = (event, currentIndex) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      const nextIndex = (currentIndex + 1) % distinctSports.length;
      const nextSport = distinctSports[nextIndex];
      if (nextSport) {
        onSelectSport(nextSport.sport_id);
        tabsRef.current[nextSport.sport_id]?.focus();
      }
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      const prevIndex = (currentIndex - 1 + distinctSports.length) % distinctSports.length;
      const prevSport = distinctSports[prevIndex];
      if (prevSport) {
        onSelectSport(prevSport.sport_id);
        tabsRef.current[prevSport.sport_id]?.focus();
      }
    }
  };

  const hasMultipleSports = distinctSports.length > 1;
  const eventsInActiveGroup = activeGroup?.events || [];
  const hasMultipleEvents = eventsInActiveGroup.length > 1;

  return (
    <div className="space-y-2.5" data-testid="player-sport-selector">
      {/* Tier 1: Sport Selection (Header + Tabs) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label
            id="player-sport-selector-label"
            className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]"
          >
            {hasMultipleSports ? "Select Sport" : "Sport Record"}
          </label>
          <span className="text-[10px] text-[var(--text-soft)]">
            {distinctSports.length} {distinctSports.length === 1 ? "sport" : "sports"}
          </span>
        </div>

        {hasMultipleSports ? (
          <div
            role="tablist"
            aria-labelledby="player-sport-selector-label"
            className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none"
          >
            {distinctSports.map((s, idx) => {
              const isSelected = String(s.sport_id) === String(selectedSportId);
              const label = s.sport_name || `Sport #${s.sport_id}`;
              const eventCount = s.events.length;
              const badgeText =
                eventCount > 1
                  ? `${eventCount} events`
                  : `${s.totalMatches} ${s.totalMatches === 1 ? "match" : "matches"}`;

              return (
                <button
                  key={`sport-${s.sport_id}`}
                  ref={(el) => {
                    tabsRef.current[s.sport_id] = el;
                  }}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => onSelectSport(s.sport_id)}
                  onKeyDown={(e) => handleSportKeyDown(e, idx)}
                  className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] ${
                    isSelected
                      ? "bg-[var(--primary)] text-white shadow-sm ring-1 ring-[var(--primary)] font-bold"
                      : "border border-[var(--border-soft)] bg-[var(--surface-soft)] text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-main)]"
                  }`}
                  data-testid={`player-sport-tab-${s.sport_id}`}
                >
                  <span>{label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      isSelected
                        ? "bg-white/25 text-white"
                        : "bg-[var(--surface-muted)] text-[var(--text-muted)]"
                    }`}
                  >
                    {badgeText}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[var(--primary)]" aria-hidden="true" />
              <span className="text-xs font-bold text-[var(--text-main)]">
                {activeGroup?.sport_name}
              </span>
            </div>
            <span className="text-xs font-semibold text-[var(--text-muted)]">
              {eventsInActiveGroup.length}{" "}
              {eventsInActiveGroup.length === 1 ? "event" : "events"}
            </span>
          </div>
        )}
      </div>

      {/* Tier 2: Event / Competition Contexts (when active sport has multiple events) */}
      {hasMultipleEvents ? (
        <div
          className="space-y-1.5 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)]/60 p-2.5"
          data-testid="player-event-selector"
        >
          <div className="flex items-center justify-between">
            <label
              id="player-event-selector-label"
              className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]"
            >
              Event / Competition
            </label>
            <span className="text-[10px] text-[var(--text-soft)]">
              {eventsInActiveGroup.length} events
            </span>
          </div>

          <div
            role="tablist"
            aria-labelledby="player-event-selector-label"
            className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none"
          >
            {/* All Events Tab */}
            <button
              type="button"
              role="tab"
              aria-selected={String(selectedEventId) === "all"}
              tabIndex={String(selectedEventId) === "all" ? 0 : -1}
              onClick={() => onSelectEvent("all")}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                String(selectedEventId) === "all"
                  ? "bg-[var(--primary)] text-white shadow-sm font-bold"
                  : "border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-main)]"
              }`}
              data-testid="player-event-tab-all"
            >
              <span>All Events</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[9px] font-bold ${
                  String(selectedEventId) === "all"
                    ? "bg-white/25 text-white"
                    : "bg-[var(--surface-muted)] text-[var(--text-muted)]"
                }`}
              >
                {activeGroup?.totalMatches ?? 0}
              </span>
            </button>

            {/* Specific Events */}
            {eventsInActiveGroup.map((evt, idx) => {
              const isEventSelected = String(selectedEventId) === String(evt.event_id);
              const eventTitle = evt.event_name || `Event #${evt.event_id}`;
              const matchCount =
                typeof evt.matches_played === "number" ? evt.matches_played : 0;

              return (
                <button
                  key={`event-${evt.event_id || idx}`}
                  type="button"
                  role="tab"
                  aria-selected={isEventSelected}
                  tabIndex={isEventSelected ? 0 : -1}
                  onClick={() => onSelectEvent(evt.event_id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                    isEventSelected
                      ? "bg-[var(--primary)] text-white shadow-sm font-bold"
                      : "border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-main)]"
                  }`}
                  data-testid={`player-event-tab-${evt.event_id}`}
                >
                  <span className="truncate max-w-[150px]" title={eventTitle}>
                    {eventTitle}
                  </span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[9px] font-bold ${
                      isEventSelected
                        ? "bg-white/25 text-white"
                        : "bg-[var(--surface-muted)] text-[var(--text-muted)]"
                    }`}
                    aria-label={`${matchCount} matches`}
                  >
                    {matchCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default PlayerSportSelector;
