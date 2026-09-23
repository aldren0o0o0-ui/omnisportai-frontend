import { MapPin } from "lucide-react";
import { SportIcon } from "../../../components/common/IdentityImage";
import { getSportDisplayName } from "../../../utils/tournamentEventCategories";

const VenueProfilesPanel = ({
  venues = [],
  availabilityByVenueId = {},
  usageCountByVenueId = {},
  onManageVenues = null,
  compact = false,
  className = "",
  fillHeight = false,
}) => {
  const canManage = typeof onManageVenues === "function";
  return (
    <section className={`rounded-3xl border border-slate-200/60 bg-white/95 p-4 shadow-sm dark:border-slate-800 dark:bg-[var(--surface)]/95 dark:shadow-none ${fillHeight ? "flex h-full min-h-0 flex-col" : ""} ${className}`.trim()}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
            <MapPin size={16} />
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-800 dark:text-slate-100">
              Venue Profiles
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Availability windows are configured open slots, separate from scheduled match usage.
            </p>
          </div>
        </div>
        {canManage ? (
          <button
            type="button"
            onClick={onManageVenues}
            className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-[var(--surface-soft)] dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Manage
          </button>
        ) : (
          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:bg-[var(--surface-soft)] dark:text-slate-300">
            View Only
          </span>
        )}
      </div>

      {venues.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {canManage
              ? "No venues available. Create a venue to begin scheduling."
              : "No venue profiles available for this schedule view."}
          </p>
        </div>
      ) : (
        <div className={`${fillHeight ? "flex-1 min-h-0" : ""} ${compact && !fillHeight ? "max-h-[28rem]" : !fillHeight ? "max-h-[68vh]" : ""} space-y-2.5 overflow-y-auto pr-1`}>
          {venues.map((venue) => (
            <article
              key={`venue-preview-${venue.id}`}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/50 p-3 transition-all hover:border-blue-300 hover:shadow-sm hover:shadow-blue-500/5 dark:border-slate-800 dark:from-slate-800/80 dark:to-slate-900/80 dark:hover:border-blue-500/40"
            >
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-blue-50 opacity-50 blur-2xl transition-opacity group-hover:opacity-100 dark:bg-[var(--surface)]"></div>

              <div className="relative">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-50">
                      {venue.name || "Unassigned venue"}
                    </h4>
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <MapPin size={12} />
                      {venue.location || "Location not set"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold tracking-wide text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                      {Array.isArray(availabilityByVenueId[venue.id])
                        ? availabilityByVenueId[venue.id].length
                        : 0} windows
                    </span>
                    <div className="mt-1 flex flex-col items-end gap-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        {venue.is_indoor ? "Indoor" : "Outdoor"}
                      </p>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-[var(--surface-soft)] dark:text-slate-300">
                        {Number(usageCountByVenueId[venue.id] || 0)} scheduled
                      </span>
                      {Array.isArray(availabilityByVenueId[venue.id]) && availabilityByVenueId[venue.id].length === 0 ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                          No availability windows
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                {Array.isArray(venue.supported_sports) && venue.supported_sports.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(compact ? venue.supported_sports.slice(0, 4) : venue.supported_sports).map((sport) => (
                      <span
                        key={`venue-sport-${venue.id}-${sport.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200/60 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-700 shadow-sm dark:border-slate-700 dark:bg-[var(--surface-soft)]/50 dark:text-slate-200"
                      >
                        <SportIcon imageUrl={sport.image_url} label={getSportDisplayName(sport, "Sport")} scale="sm" />
                        <span>{getSportDisplayName(sport)}</span>
                      </span>
                    ))}
                    {compact && venue.supported_sports.length > 4 ? (
                      <span className="inline-flex items-center rounded-lg bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-[var(--surface-soft)] dark:text-slate-300">
                        +{venue.supported_sports.length - 4} more
                      </span>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-3 text-xs italic text-slate-400 dark:text-slate-500">
                    No sports linked
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default VenueProfilesPanel;
