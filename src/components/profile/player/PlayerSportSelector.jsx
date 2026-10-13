import React, { useRef, useMemo } from "react";

/**
 * PlayerSportSelector
 * Clean sport and event selector.
 * - Single sport: hides selector, shows clean sport label.
 * - Multiple sports: clean tab selector with accessible keyboard navigation.
 * - Multiple events within sport: event filter tabs.
 */
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
      {/* Tier 1: Sports Tabs */}
      {hasMultipleSports ? (
        <div>
          <div
            role="tablist"
            aria-label="Participating Sports"
            className="flex flex-wrap gap-1.5 border-b border-[var(--border-soft)] pb-2"
          >
            {distinctSports.map((group, idx) => {
              const isSelected = String(group.sport_id) === String(activeGroup?.sport_id);
              return (
                <button
                  key={group.sport_id}
                  ref={(el) => (tabsRef.current[group.sport_id] = el)}
                  role="tab"
                  aria-selected={isSelected}
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => onSelectSport(group.sport_id)}
                  onKeyDown={(e) => handleSportKeyDown(e, idx)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                    isSelected
                      ? "bg-[var(--primary)] text-white shadow-xs"
                      : "bg-[var(--surface-soft)] text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text-main)]"
                  }`}
                  data-testid={`sport-tab-${group.sport_id}`}
                >
                  <span>{group.sport_name}</span>
                  {group.totalMatches > 0 ? (
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-[var(--surface)] text-[var(--text-soft)]"
                      }`}
                    >
                      {group.totalMatches}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Tier 2: Events within active sport */}
      {hasMultipleEvents ? (
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-soft)] shrink-0 mr-1">
            Events:
          </span>
          <button
            type="button"
            onClick={() => onSelectEvent("all")}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition shrink-0 cursor-pointer ${
              selectedEventId === "all"
                ? "bg-[var(--surface)] font-bold text-[var(--text-main)] border border-[var(--border-soft)] shadow-2xs"
                : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
            }`}
            data-testid="event-tab-all"
          >
            All Events
          </button>
          {eventsInActiveGroup.map((evt) => {
            const isEventSelected = String(selectedEventId) === String(evt.event_id);
            return (
              <button
                key={evt.event_id || evt.event_name}
                type="button"
                onClick={() => onSelectEvent(evt.event_id)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition shrink-0 cursor-pointer ${
                  isEventSelected
                    ? "bg-[var(--surface)] font-bold text-[var(--text-main)] border border-[var(--border-soft)] shadow-2xs"
                    : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                }`}
                data-testid={`event-tab-${evt.event_id}`}
              >
                {evt.event_name || `Event #${evt.event_id}`}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

export default PlayerSportSelector;
