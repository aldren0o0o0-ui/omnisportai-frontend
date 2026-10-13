import React, { useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Moon, Sun, Check } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { resolveBackSettingsRoute } from "../../utils/settingsNavigation";

const AppearancePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { roleNames = [] } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const backSettingsRoute = useMemo(
    () => resolveBackSettingsRoute(location.pathname, roleNames),
    [location.pathname, roleNames]
  );

  return (
    <div
      className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-6 space-y-8"
      data-testid="appearance-page"
    >
      {/* Top Navigation */}
      <div>
        <button
          type="button"
          onClick={() => navigate(backSettingsRoute)}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer group"
          data-testid="back-to-settings-button"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to settings</span>
        </button>
      </div>

      {/* Header */}
      <div className="border-b border-[var(--border-soft)] pb-4">
        <h1 className="text-xl font-bold text-[var(--text-main)] tracking-tight">
          Appearance
        </h1>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Manage display and theme preferences.
        </p>
      </div>

      {/* Theme Section */}
      <section aria-labelledby="theme-section-heading">
        <h2
          id="theme-section-heading"
          className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2"
        >
          Theme
        </h2>
        <div className="divide-y divide-[var(--border-soft)] border-y border-[var(--border-soft)]">
          {/* Dark Mode Row */}
          <button
            type="button"
            onClick={() => {
              if (!isDark) toggleTheme();
            }}
            className="w-full flex items-center justify-between py-3.5 px-1 hover:bg-[var(--surface-soft)]/50 transition-colors text-left cursor-pointer group"
            data-testid="theme-dark-option"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <Moon className="h-4 w-4 shrink-0 text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--text-main)] truncate">
                  Dark theme
                </p>
                <p className="text-xs text-[var(--text-muted)] truncate">
                  High-contrast dark palette tailored for low-light environments.
                </p>
              </div>
            </div>
            {isDark ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--primary)]">
                <Check className="h-4 w-4" />
                <span>Active</span>
              </span>
            ) : null}
          </button>

          {/* Light Mode Row */}
          <button
            type="button"
            onClick={() => {
              if (isDark) toggleTheme();
            }}
            className="w-full flex items-center justify-between py-3.5 px-1 hover:bg-[var(--surface-soft)]/50 transition-colors text-left cursor-pointer group"
            data-testid="theme-light-option"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <Sun className="h-4 w-4 shrink-0 text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--text-main)] truncate">
                  Light theme
                </p>
                <p className="text-xs text-[var(--text-muted)] truncate">
                  Clean bright palette with crisp typography and subtle borders.
                </p>
              </div>
            </div>
            {!isDark ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--primary)]">
                <Check className="h-4 w-4" />
                <span>Active</span>
              </span>
            ) : null}
          </button>
        </div>
      </section>
    </div>
  );
};

export default AppearancePage;
