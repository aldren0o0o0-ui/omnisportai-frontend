import { useCallback, useRef, useState } from "react";
import ScheduleCalendar from "./ScheduleCalendar";
import ScheduleMatchList from "./ScheduleMatchList";

const DEFAULT_CALENDAR_SHARE = 65;
const MIN_CALENDAR_SHARE = 50;
const MAX_CALENDAR_SHARE = 80;

const clampShare = (value) =>
  Math.min(MAX_CALENDAR_SHARE, Math.max(MIN_CALENDAR_SHARE, value));

const ScheduleCalendarWorkspace = ({
  events = [],
  selectedEventId = null,
  onSelectEvent = null,
  ...calendarProps
}) => {
  const workspaceRef = useRef(null);
  const [calendarShare, setCalendarShare] = useState(DEFAULT_CALENDAR_SHARE);

  const updateShareFromPointer = useCallback((clientX) => {
    const bounds = workspaceRef.current?.getBoundingClientRect();
    if (!bounds || bounds.width <= 0) return;
    const percentage = ((clientX - bounds.left) / bounds.width) * 100;
    setCalendarShare(clampShare(Math.round(percentage)));
  }, []);

  const beginResize = useCallback((event) => {
    if (window.innerWidth < 1280) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    updateShareFromPointer(event.clientX);

    const previousUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";
    const handleMove = (moveEvent) => updateShareFromPointer(moveEvent.clientX);
    const handleUp = () => {
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp, { once: true });
  }, [updateShareFromPointer]);

  const handleResizeKeyDown = useCallback((event) => {
    if (!["ArrowLeft", "ArrowRight", "Home"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "Home") {
      setCalendarShare(DEFAULT_CALENDAR_SHARE);
      return;
    }
    const change = event.key === "ArrowLeft" ? -2 : 2;
    setCalendarShare((current) => clampShare(current + change));
  }, []);

  return (
    <div
      ref={workspaceRef}
      className="os-schedule-workspace grid min-w-0 gap-4"
      style={{
        "--schedule-calendar-share": `${calendarShare}fr`,
        "--schedule-list-share": `${100 - calendarShare}fr`,
      }}
    >
      <div className="min-w-0">
        <ScheduleCalendar
          {...calendarProps}
          events={events}
          onSelectEvent={onSelectEvent}
        />
      </div>

      <div
        role="separator"
        aria-label="Resize calendar and match list"
        aria-orientation="vertical"
        aria-valuemin={MIN_CALENDAR_SHARE}
        aria-valuemax={MAX_CALENDAR_SHARE}
        aria-valuenow={calendarShare}
        tabIndex={0}
        onPointerDown={beginResize}
        onKeyDown={handleResizeKeyDown}
        onDoubleClick={() => setCalendarShare(DEFAULT_CALENDAR_SHARE)}
        className="os-schedule-workspace__divider"
        title="Drag to resize. Use arrow keys when focused; double-click to reset."
      >
        <span aria-hidden="true" />
      </div>

      <ScheduleMatchList
        events={events}
        selectedEventId={selectedEventId}
        onSelectEvent={onSelectEvent}
      />
    </div>
  );
};

export default ScheduleCalendarWorkspace;
