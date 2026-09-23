import React from "react";
import { normalizeRoles } from "./profileUtils";

const ROLE_STYLES = {
  PLAYER: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400 dark:border-blue-500/30",
  COACH: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400 dark:border-amber-500/30",
  SPORTS_FACILITATOR: "bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400 dark:border-purple-500/30",
  DEPARTMENT_MANAGER: "bg-teal-500/10 text-teal-600 border-teal-500/20 dark:text-teal-400 dark:border-teal-500/30",
  SPORTS_COORDINATOR: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:text-indigo-400 dark:border-indigo-500/30",
  ADMIN: "bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400 dark:border-rose-500/30",
  DEFAULT: "bg-[var(--surface-muted)] text-[var(--text-muted)] border-[var(--border-soft)]",
};

const ROLE_LABELS = {
  PLAYER: "Player",
  COACH: "Coach",
  SPORTS_FACILITATOR: "Sports Facilitator",
  DEPARTMENT_MANAGER: "Dept. Manager",
  SPORTS_COORDINATOR: "Sports Coordinator",
  ADMIN: "Admin",
  VIEWER: "Viewer",
};

export const ProfileRoleBadges = ({ roles = [] }) => {
  const normalized = normalizeRoles(roles);

  if (normalized.length === 0) {
    return (
      <div className="flex flex-wrap items-center gap-1.5" data-testid="profile-role-badges">
        <span
          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium tracking-wide ${ROLE_STYLES.DEFAULT}`}
          data-testid="profile-role-badge"
        >
          Participant
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5" data-testid="profile-role-badges">
      {normalized.map((role) => {
        const style = ROLE_STYLES[role] || ROLE_STYLES.DEFAULT;
        const label = ROLE_LABELS[role] || role.replace(/_/g, " ");

        return (
          <span
            key={role}
            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold tracking-wide ${style}`}
            data-testid="profile-role-badge"
          >
            {label}
          </span>
        );
      })}
    </div>
  );
};

export default ProfileRoleBadges;
