import { ShieldCheck, Mail, Hash, Heart } from "lucide-react";
import { PlayerAvatar } from "../common/IdentityImage";
import ProfileRoleBadges from "./ProfileRoleBadges";

export const ProfileHeader = ({
  user = {},
  playerProfile = null,
  roles = [],
  visibility = "PUBLIC",
  likes = null,
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
    <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4 sm:p-5" data-testid="profile-header">
      <div className="flex items-start gap-4">
        <PlayerAvatar imageUrl={avatarUrl} label={displayName} scale="lg" className="shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="truncate text-lg font-bold text-[var(--text-main)]" title={displayName}>
              {displayName}
            </h3>
            {likes && typeof likes.count === "number" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-semibold text-rose-500 dark:text-rose-400">
                <Heart size={12} className={likes.user_liked ? "fill-current" : ""} />
                {likes.count}
              </span>
            ) : null}
          </div>

          {departmentName ? (
            <p className="mt-0.5 text-xs font-semibold text-[var(--primary)]">
              {departmentName}
            </p>
          ) : null}

          {/* Role Badges */}
          <div className="mt-2.5">
            <ProfileRoleBadges roles={roles} />
          </div>
        </div>
      </div>

      {/* Bio if present */}
      {bio ? (
        <p className="mt-3 text-xs italic text-[var(--text-muted)] border-t border-[var(--border-soft)] pt-2">
          "{bio}"
        </p>
      ) : null}

      {/* Status indicator & Permitted metadata */}
      <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[var(--border-soft)] pt-3 text-xs text-[var(--text-muted)]">
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
        {email ? (
          <span className="inline-flex items-center gap-1 text-[var(--text-muted)]" data-testid="profile-email">
            <Mail size={13} /> {email}
          </span>
        ) : null}

        {studentId ? (
          <span className="inline-flex items-center gap-1 text-[var(--text-muted)]" data-testid="profile-student-id">
            <Hash size={13} /> {studentId}
          </span>
        ) : null}
      </div>
    </div>
  );
};

export default ProfileHeader;
