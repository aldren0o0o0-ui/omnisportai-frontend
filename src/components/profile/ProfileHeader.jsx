import { ShieldCheck, Mail, Hash, Pencil } from "lucide-react";
import { PlayerAvatar } from "../common/IdentityImage";
import ProfileRoleBadges from "./ProfileRoleBadges";

export const ProfileHeader = ({
  user = {},
  playerProfile = null,
  roles = [],
  visibility = "PUBLIC",
  likes = null,
  onEdit = null,
  isSelf = false,
}) => {
  const displayName =
    user?.display_name ||
    user?.full_name ||
    user?.name ||
    [playerProfile?.first_name, playerProfile?.last_name]
      .filter(Boolean)
      .join(" ") ||
    "User Profile";

  const departmentName =
    user?.department?.name ||
    user?.department_name ||
    playerProfile?.department_name ||
    null;
  const avatarUrl = user?.avatar_url || playerProfile?.profile_image_url || null;
  const isArchived = Boolean(playerProfile?.is_archived);
  const bio = user?.bio || null;

  // Sensitive fields are only rendered if explicitly returned as non-null by backend
  const email = user?.email || playerProfile?.email || null;
  const studentId = playerProfile?.student_id || null;

  return (
    <div className="" data-testid="profile-header">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <PlayerAvatar imageUrl={avatarUrl} label={displayName} scale="lg" className="shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1 space-y-1">
            <h1 className="truncate text-xl font-bold text-[var(--text-main)]" title={displayName}>
              {displayName}
            </h1>
            {/* <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <ProfileRoleBadges roles={roles} />
            </div> */}
            {/* {departmentName ? (
              <p className="text-sm text-[var(--text-muted)] truncate pt-0.5">
                {departmentName}
              </p>
            ) : null}
            {email ? (
              <p className="text-sm text-[var(--text-muted)] truncate" data-testid="profile-email">
                {email}
              </p>
            ) : null} */}
          </div>
        </div>

        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="self-start inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-main)] hover:bg-[var(--surface-soft)] transition-colors cursor-pointer shrink-0"
            data-testid="edit-profile-button"
          >
            <Pencil size={13} />
            <span>Edit profile</span>
          </button>
        ) : null}
      </div>

      {bio ? (
        <p className="mt-3 text-xs italic text-[var(--text-muted)]">
          "{bio}"
        </p>
      ) : null}

      {/* Status indicator & Permitted metadata */}
      {/* <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--text-muted)]">
        {isArchived ? (
          <span className="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
            ● Inactive / Archived
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
            <ShieldCheck size={14} /> Active Participant
          </span>
        )}

        {/* Sensitive fields are strictly excluded if masked to null by backend RBAC */}
      {/* {studentId ? (
          <span className="inline-flex items-center gap-1 text-[var(--text-muted)]" data-testid="profile-student-id">
            <Hash size={13} /> {studentId}
          </span>
        ) : null}
      </div>  */}
    </div>
  );
};

export default ProfileHeader;
