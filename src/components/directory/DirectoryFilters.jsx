import { Search, X } from "lucide-react";

export const DirectoryFilters = ({
  search = "",
  onSearchChange,
  sportId = "",
  onSportChange,
  departmentId = "",
  onDepartmentChange,
  participantShape = "",
  onParticipantShapeChange,
  status = "",
  onStatusChange,
  sports = [],
  departments = [],
  hideDepartmentFilter = false,
  hideSportFilter = false,
}) => {
  const hasFilters = Boolean(search || sportId || departmentId || participantShape || status);

  const resetFilters = () => {
    onSearchChange?.("");
    onSportChange?.("");
    onDepartmentChange?.("");
    onParticipantShapeChange?.("");
    onStatusChange?.("");
  };

  return (
    <div
      aria-label="Directory Filters"
      className="flex flex-wrap items-center gap-2.5 py-2.5 text-xs"
    >
      {/* Search Input */}
      <div className="relative min-w-[200px] flex-1">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-soft)]"
          aria-hidden="true"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder="Search teams, entries, or players…"
          className="h-9 w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] pl-9 pr-3 text-xs text-[var(--text-main)] placeholder:text-[var(--text-soft)] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Sport Select */}
      {!hideSportFilter ? (
        <select
          value={sportId}
          onChange={(e) => onSportChange?.(e.target.value)}
          className="h-9 rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] px-2.5 text-xs font-medium text-[var(--text-main)] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          aria-label="Filter by sport"
        >
          <option value="">All Sports</option>
          {sports.map((s) => (
            <option key={s.sport_id || s.id} value={s.sport_id || s.id}>
              {getSportDisplayName(s)}
            </option>
          ))}
        </select>
      ) : null}

      {/* Department Select */}
      {!hideDepartmentFilter ? (
        <select
          value={departmentId}
          onChange={(e) => onDepartmentChange?.(e.target.value)}
          className="h-9 rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] px-2.5 text-xs font-medium text-[var(--text-main)] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          aria-label="Filter by department"
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.department_id || d.id} value={d.department_id || d.id}>
              {d.department_code || d.department_name || d.name}
            </option>
          ))}
        </select>
      ) : null}

      {/* Entry Type Select */}
      <select
        value={participantShape}
        onChange={(e) => onParticipantShapeChange?.(e.target.value)}
        className="h-9 rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] px-2.5 text-xs font-medium text-[var(--text-main)] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        aria-label="Filter by entry type"
      >
        <option value="">All Entry Types</option>
        <option value="TEAM">Teams</option>
        <option value="DUO">Doubles</option>
        <option value="SOLO">Singles</option>
      </select>

      <select
        value={status}
        onChange={(e) => onStatusChange?.(e.target.value)}
        className="h-9 rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] px-2.5 text-xs font-medium text-[var(--text-main)] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        aria-label="Filter by entry status"
      >
        <option value="">All Statuses</option>
        <option value="NO_ENTRY">No entry</option>
        <option value="DRAFT">Draft</option>
        <option value="INCOMPLETE">Incomplete</option>
        <option value="PENDING_REVIEW">Pending review</option>
        <option value="REVISION_REQUESTED">Needs changes</option>
        <option value="APPROVED">Approved</option>
        <option value="REJECTED">Rejected</option>
      </select>

      {/* Clear Filters Button */}
      {hasFilters ? (
        <button
          type="button"
          onClick={resetFilters}
          className="inline-flex h-9 items-center gap-1 rounded-lg px-2.5 text-xs font-bold text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-main)] focus-visible:outline-none"
          title="Reset all filters"
        >
          <X size={13} />
          <span>Clear</span>
        </button>
      ) : null}
    </div>
  );
};

export default DirectoryFilters;
import { getSportDisplayName } from "../../utils/tournamentEventCategories";
