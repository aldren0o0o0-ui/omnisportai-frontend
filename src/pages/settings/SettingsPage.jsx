import React, { useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Bell,
  Palette,
  User,
  Lock,
  Info,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { resolveRolePrefix } from "../../utils/settingsNavigation";

const SettingsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { roleNames = [], isViewerOnly } = useAuth();

  const rolePrefix = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith("/coordinator")) return "coordinator";
    if (path.startsWith("/department")) return "department";
    if (path.startsWith("/sport-facilitator")) return "sport-facilitator";
    if (path.startsWith("/coach")) return "coach";
    if (path.startsWith("/viewer")) return "viewer";
    return resolveRolePrefix(roleNames, isViewerOnly);
  }, [location.pathname, roleNames, isViewerOnly]);

  const notificationSettingsRoute = `/${rolePrefix}/notification-settings`;
  const appearanceRoute = `/${rolePrefix}/settings/appearance`;
  const editProfileRoute = `/${rolePrefix}/profile/edit`;
  const accountSecurityRoute = `/${rolePrefix}/profile/security`;
  const aboutRoute = `/${rolePrefix}/settings/about`;

  return (
    <div
      className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-6 space-y-8"
      data-testid="settings-page"
    >
      {/* Header */}
      <div className="border-b border-[var(--border-soft)] pb-4">
        <h1 className="text-xl font-bold text-[var(--text-main)] tracking-tight">
          Settings
        </h1>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Manage your OmniSport AI preferences and account settings.
        </p>
      </div>

      {/* 1. NOTIFICATIONS */}
      <section aria-labelledby="notifications-section-heading">
        <h2
          id="notifications-section-heading"
          className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2"
        >
          Notifications
        </h2>
        <div className="divide-y divide-[var(--border-soft)] border-y border-[var(--border-soft)]">
          <button
            type="button"
            onClick={() => navigate(notificationSettingsRoute)}
            className="w-full flex items-center justify-between py-3.5 px-1 hover:bg-[var(--surface-soft)]/50 transition-colors text-left cursor-pointer group"
            data-testid="settings-notifications-row"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <Bell className="h-4 w-4 shrink-0 text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--text-main)] truncate">
                  Notification Settings
                </p>
                <p className="text-xs text-[var(--text-muted)] truncate">
                  Manage how OmniSport AI notifies you.
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors" />
          </button>
        </div>
      </section>

      {/* 2. PREFERENCES */}
      <section aria-labelledby="preferences-section-heading">
        <h2
          id="preferences-section-heading"
          className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2"
        >
          Preferences
        </h2>
        <div className="divide-y divide-[var(--border-soft)] border-y border-[var(--border-soft)]">
          <button
            type="button"
            onClick={() => navigate(appearanceRoute)}
            className="w-full flex items-center justify-between py-3.5 px-1 hover:bg-[var(--surface-soft)]/50 transition-colors text-left cursor-pointer group"
            data-testid="settings-appearance-row"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <Palette className="h-4 w-4 shrink-0 text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--text-main)] truncate">
                  Appearance
                </p>
                <p className="text-xs text-[var(--text-muted)] truncate">
                  Manage display and theme preferences.
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors" />
          </button>
        </div>
      </section>

      {/* 3. ACCOUNT */}
      <section aria-labelledby="account-section-heading">
        <h2
          id="account-section-heading"
          className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2"
        >
          Account
        </h2>
        <div className="divide-y divide-[var(--border-soft)] border-y border-[var(--border-soft)]">
          <button
            type="button"
            onClick={() => navigate(editProfileRoute)}
            className="w-full flex items-center justify-between py-3.5 px-1 hover:bg-[var(--surface-soft)]/50 transition-colors text-left cursor-pointer group"
            data-testid="settings-edit-profile-row"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <User className="h-4 w-4 shrink-0 text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--text-main)] truncate">
                  Edit Profile
                </p>
                <p className="text-xs text-[var(--text-muted)] truncate">
                  Update your personal information.
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors" />
          </button>

          <button
            type="button"
            onClick={() => navigate(accountSecurityRoute)}
            className="w-full flex items-center justify-between py-3.5 px-1 hover:bg-[var(--surface-soft)]/50 transition-colors text-left cursor-pointer group"
            data-testid="settings-account-security-row"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <Lock className="h-4 w-4 shrink-0 text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--text-main)] truncate">
                  Account & Security
                </p>
                <p className="text-xs text-[var(--text-muted)] truncate">
                  Manage your password and security settings.
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors" />
          </button>
        </div>
      </section>

      {/* 4. SYSTEM */}
      <section aria-labelledby="system-section-heading">
        <h2
          id="system-section-heading"
          className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2"
        >
          System
        </h2>
        <div className="divide-y divide-[var(--border-soft)] border-y border-[var(--border-soft)]">
          <button
            type="button"
            onClick={() => navigate(aboutRoute)}
            className="w-full flex items-center justify-between py-3.5 px-1 hover:bg-[var(--surface-soft)]/50 transition-colors text-left cursor-pointer group"
            data-testid="settings-about-row"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <Info className="h-4 w-4 shrink-0 text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--text-main)] truncate">
                  About OmniSport AI
                </p>
                <p className="text-xs text-[var(--text-muted)] truncate">
                  View application information.
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors" />
          </button>
        </div>
      </section>
    </div>
  );
};

export default SettingsPage;
