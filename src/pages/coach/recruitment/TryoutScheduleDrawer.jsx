import AppModal from "../../../components/common/AppModal";
import StatusBadge from "../../../components/common/StatusBadge";
import { CalendarClock, MapPin, Users, Info } from "lucide-react";
import { isTryoutDone } from "./recruitmentWorkflow";

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Tryout Schedule side drawer (spec Section 6) — opened from the "View Schedule"
 * action. Shows the full schedule detail and an Update action that hands off to
 * the existing tryout modal. Presentational; the container owns the data + edit.
 */
const TryoutScheduleDrawer = ({
  open,
  onClose,
  schedule = null,
  applicantCount = 0,
  canManage = true,
  onEdit,
}) => {
  const tryoutDone = isTryoutDone(schedule);

  return (
    <AppModal
      open={open}
      onClose={onClose}
      variant="drawer"
      title="Tryout Schedule"
      subtitle="When and where your applicants attend. Everyone marked for tryout is notified automatically."
      maxWidthClass="max-w-md"
    >
      {schedule ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <StatusBadge
              status={tryoutDone ? "COMPLETED" : "UPCOMING"}
              customLabel={tryoutDone ? "Completed" : "Upcoming"}
            />
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
            <CalendarClock size={18} className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Date &amp; Time
              </p>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {formatDateTime(schedule.scheduled_date)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
            <MapPin size={18} className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Venue
              </p>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {schedule.venue_name || "Not specified"}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
            <Users size={18} className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Applicants
              </p>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {applicantCount} expected
              </p>
            </div>
          </div>

          {schedule.instructions ? (
            <div className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <Info size={18} className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Instructions
                </p>
                <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">
                  {schedule.instructions}
                </p>
              </div>
            </div>
          ) : null}

          {canManage ? (
            <button
              type="button"
              onClick={() => onEdit?.()}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              <CalendarClock size={15} />
              Update Schedule
            </button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            No tryout has been scheduled yet. Set a date so applicants know when and where to attend.
          </p>
          {canManage ? (
            <button
              type="button"
              onClick={() => onEdit?.()}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              <CalendarClock size={15} />
              Schedule Tryout
            </button>
          ) : null}
        </div>
      )}
    </AppModal>
  );
};

export default TryoutScheduleDrawer;
