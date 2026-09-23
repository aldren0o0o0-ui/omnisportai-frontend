import { Pencil, Shield, Trophy, Users, UserRound, Sparkles } from "lucide-react";
import { DepartmentLogo, TeamLogo } from "../common/IdentityImage";
import { normalizeRole } from "../../utils/ownershipCapabilities";

export const EntityIdentityHeader = ({
  effectiveMode = "",
  department = null,
  entry = null,
  sport = null,
  stats = {},
  onEditDepartment,
  onEditEntry,
  onEditSport,
}) => {
  const mode = normalizeRole(effectiveMode);

  // 1. Department Manager Header
  if (mode === "department_manager" && department) {
    const deptName = department.department_name || "Department";
    const deptCode = department.department_code || "";
    const entriesCount = stats.entriesCount ?? stats.entries_count ?? 0;
    const playersCount = stats.playersCount ?? stats.players_count ?? 0;
    const sportsCount = stats.sportsCount ?? stats.sports_count ?? 0;

    return (
      <header aria-label="Department Identity" className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <DepartmentLogo imageUrl={department.logo_url} label={deptName} scale="xl" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-lg font-black text-[var(--text-main)] sm:text-xl">
                  {deptName}
                </h1>
                {deptCode ? (
                  <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-xs font-black text-blue-400 border border-blue-500/20">
                    {deptCode}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs font-medium text-[var(--text-muted)]">
                <span>{entriesCount} {entriesCount === 1 ? "Entry" : "Entries"}</span>
                <span>•</span>
                <span>{playersCount} {playersCount === 1 ? "Player" : "Players"}</span>
                <span>•</span>
                <span>{sportsCount} {sportsCount === 1 ? "Sport" : "Sports"}</span>
              </p>
            </div>
          </div>

          {onEditDepartment ? (
            <button
              type="button"
              onClick={onEditDepartment}
              className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-4 text-xs font-bold text-[var(--text-main)] shadow-sm transition hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:self-auto"
            >
              <Pencil size={14} aria-hidden="true" />
              <span>Edit Department</span>
            </button>
          ) : null}
        </div>
      </header>
    );
  }

  // 2. Coach Header
  if (["coach", "assistant_coach"].includes(mode) && entry) {
    const entryName = entry.display_name || entry.entry_name || entry.name || "My Entry";
    const sportName = entry.sport_name || entry.sport || "Sport";
    const shape = String(entry.participant_shape || entry.shape || "TEAM").toUpperCase();
    const shapeLabel = shape === "SOLO" ? "SOLO" : shape === "DUO" ? "DUO" : "TEAM";
    const membersCount = entry.members?.length || entry.players_count || 0;
    const status = entry.public_status || entry.status || "APPROVED";
    const isReady = /READY|APPROVED|ACCEPTED/.test(String(status).toUpperCase());

    return (
      <header aria-label="Assigned Entry Identity" className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <TeamLogo imageUrl={entry.image_url || entry.imageUrl} label={entryName} scale="xl" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-lg font-black text-[var(--text-main)] sm:text-xl">
                  {entryName}
                </h1>
                <span className="rounded-md bg-[var(--surface-muted)] px-2 py-0.5 text-xs font-black text-[var(--text-soft)]">
                  {shapeLabel}
                </span>
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs font-medium text-[var(--text-muted)]">
                <span className="font-semibold text-[var(--text-main)]">{sportName}</span>
                <span>•</span>
                <span>{membersCount} {shape === "SOLO" ? "Athlete" : "Players"}</span>
                <span>•</span>
                <span className={isReady ? "font-bold text-emerald-400" : "font-bold text-amber-300"}>
                  {isReady ? "Ready for Competition" : status}
                </span>
              </p>
            </div>
          </div>

          {onEditEntry ? (
            <button
              type="button"
              onClick={onEditEntry}
              className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-4 text-xs font-bold text-[var(--text-main)] shadow-sm transition hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:self-auto"
            >
              <Pencil size={14} aria-hidden="true" />
              <span>Edit Entry</span>
            </button>
          ) : null}
        </div>
      </header>
    );
  }

  // 3. Sports Facilitator Header
  if (mode === "sports_facilitator" && sport) {
    const sportTitle = sport.sport_name || sport.name || "Sport";
    const entriesCount = stats.entriesCount ?? 0;
    const playersCount = stats.playersCount ?? 0;

    return (
      <header aria-label="Assigned Sport Identity" className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Trophy size={28} />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-black text-[var(--text-main)] sm:text-xl">
                {sportTitle}
              </h1>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs font-medium text-[var(--text-muted)]">
                <span>{entriesCount} {entriesCount === 1 ? "Department Entry" : "Department Entries"}</span>
                <span>•</span>
                <span>{playersCount} {playersCount === 1 ? "Active Player" : "Active Players"}</span>
              </p>
            </div>
          </div>

          {onEditSport ? (
            <button
              type="button"
              onClick={onEditSport}
              className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-4 text-xs font-bold text-[var(--text-main)] shadow-sm transition hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:self-auto"
            >
              <Pencil size={14} aria-hidden="true" />
              <span>Edit Sport</span>
            </button>
          ) : null}
        </div>
      </header>
    );
  }

  // 4. Default / Global Header (Coordinator & Viewer)
  const isCoordinator = ["sports_coordinator", "admin", "super_admin"].includes(mode);
  return (
    <header aria-label="Competition Directory" className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-5">
      <div className="flex items-center gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
          <Users size={24} />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-black text-[var(--text-main)] sm:text-xl">
            Teams & Entries
          </h1>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            {isCoordinator
              ? "Track configured events and department participation across this Intramural."
              : "View configured events and department participation across this Intramural."}
          </p>
        </div>
      </div>
    </header>
  );
};

export default EntityIdentityHeader;
