import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  Globe,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";
import {
  getMyPreferences,
  getPushStatus,
  registerPushToken,
  unregisterPushToken,
  updateMyPreferences,
} from "../../services/notification/notificationPreferenceService";
import {
  clearStoredPushToken,
  getBrowserNotificationPermission,
  getStoredPushToken,
  isBrowserPushSupported,
  requestBrowserPushToken,
  syncCurrentBrowserPushToken,
} from "../../services/notification/browserPushService";
import { useAuth } from "../../context/AuthContext";
import { resolveBackSettingsRoute } from "../../utils/settingsNavigation";

const MATCH_REMINDER_OPTIONS = [15, 30, 60, 120];
const REMINDER_EDITABLE_FIELDS = ["match_reminder_enabled", "match_reminder_minutes_before"];

const readableApiError = (error, fallbackMessage) => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) return detail.trim();
  if (Array.isArray(detail)) {
    const normalized = detail
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object") {
          const message = String(item.msg || item.message || "").trim();
          const loc = Array.isArray(item.loc)
            ? item.loc
                .filter((part) => part !== "body" && part !== "query")
                .map((part) => String(part))
                .join(".")
            : "";
          if (loc && message) return `${loc}: ${message}`;
          if (message) return message;
        }
        return "";
      })
      .filter(Boolean);
    if (normalized.length > 0) return normalized.join("; ");
  }
  if (detail && typeof detail === "object") {
    const message = String(detail.message || detail.error || "").trim();
    if (message) return message;
    try {
      return JSON.stringify(detail);
    } catch {
      // Ignore
    }
  }
  if (typeof error?.message === "string" && error.message.trim()) {
    return error.message.trim();
  }
  return fallbackMessage;
};

const normalizePreferences = (raw) => ({
  match_reminder_enabled: Boolean(raw?.match_reminder_enabled ?? true),
  match_reminder_minutes_before: Number(raw?.match_reminder_minutes_before || 60),
  enable_push: Boolean(raw?.enable_push),
});

const areReminderFieldsEqual = (left, right) =>
  REMINDER_EDITABLE_FIELDS.every((key) => left?.[key] === right?.[key]);

const reminderTimeLabel = (minutes) => {
  const normalized = Number(minutes || 60);
  if (normalized === 120) return "2 hours before";
  if (normalized === 60) return "1 hour before";
  return `${normalized} minutes before`;
};

const NotificationPreferences = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { roleNames = [] } = useAuth();

  const [initialPreferences, setInitialPreferences] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPushProcessing, setIsPushProcessing] = useState(false);

  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [pushStatusMessage, setPushStatusMessage] = useState("");
  const [pushStatus, setPushStatus] = useState(null);

  const browserPushSupported = isBrowserPushSupported();
  const browserPushEnabledForDevice = Boolean(pushStatus?.push_preference_enabled);

  const backSettingsRoute = useMemo(
    () => resolveBackSettingsRoute(location.pathname, roleNames),
    [location.pathname, roleNames]
  );

  const loadPushStatus = async () => {
    try {
      const payload = await getPushStatus();
      setPushStatus(payload);
    } catch {
      setPushStatus(null);
    }
  };

  const loadPreferences = async () => {
    setIsLoading(true);
    setStatusMessage("");
    setErrorMessage("");
    try {
      const payload = await getMyPreferences();
      const normalized = normalizePreferences(payload);
      setPreferences(normalized);
      setInitialPreferences(normalized);
    } catch (error) {
      setErrorMessage(readableApiError(error, "Failed to load notification preferences."));
      setPreferences(null);
      setInitialPreferences(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadPreferences();
    void loadPushStatus();
    syncCurrentBrowserPushToken();
  }, []);

  const remindersDirty = useMemo(() => {
    if (!initialPreferences || !preferences) return false;
    return !areReminderFieldsEqual(initialPreferences, preferences);
  }, [initialPreferences, preferences]);

  const applyField = (field, value) => {
    setStatusMessage("");
    setErrorMessage("");
    setPreferences((current) => ({
      ...(current || {}),
      [field]: value,
    }));
  };

  const resetUnsavedChanges = () => {
    if (initialPreferences) {
      setPreferences({ ...initialPreferences });
    }
    setStatusMessage("");
    setErrorMessage("");
  };

  const saveChanges = async () => {
    if (!preferences || isSaving || !remindersDirty) return;
    setIsSaving(true);
    setStatusMessage("");
    setErrorMessage("");
    try {
      const payload = {
        match_reminder_enabled: Boolean(preferences.match_reminder_enabled),
        match_reminder_minutes_before: Number(preferences.match_reminder_minutes_before || 60),
      };
      const updated = await updateMyPreferences(payload);
      const normalized = normalizePreferences(updated);
      setPreferences(normalized);
      setInitialPreferences(normalized);
      setStatusMessage("Notification settings saved successfully.");
    } catch (error) {
      const reason = readableApiError(error, "Unknown error.");
      setErrorMessage(`Could not save notification settings. ${reason}`);
    } finally {
      setIsSaving(false);
    }
  };

  const enableBrowserNotifications = async () => {
    if (!isBrowserPushSupported()) {
      return false;
    }

    setIsPushProcessing(true);
    setPushStatusMessage("");
    try {
      const result = await requestBrowserPushToken();

      if (result.ok && result.token) {
        try {
          await registerPushToken({
            token: result.token,
            browser_name: result.browserName,
            device_label: result.deviceLabel,
          });

          await updateMyPreferences({
            enable_push: true,
          });

          setPreferences((prev) => ({ ...prev, enable_push: true }));
          setInitialPreferences((prev) => ({ ...prev, enable_push: true }));
          setPushStatus((prev) => ({ ...prev, push_preference_enabled: true }));
          await loadPushStatus();

          setPushStatusMessage("Browser notifications enabled.");
          return true;
        } catch (error) {
          console.error("Failed to register push token:", error);
          setPushStatusMessage("Failed to register browser token with server.");
          return false;
        }
      } else {
        setPushStatusMessage("Browser notification permission was not granted.");
        return false;
      }
    } catch (error) {
      console.error("Error requesting push token:", error);
      setPushStatusMessage("An error occurred while setting up browser notifications.");
      return false;
    } finally {
      setIsPushProcessing(false);
    }
  };

  const disableBrowserNotifications = async () => {
    if (isPushProcessing) return;

    setIsPushProcessing(true);
    setPushStatusMessage("");

    try {
      const storedToken = getStoredPushToken();
      if (storedToken) {
        try {
          await unregisterPushToken(storedToken);
        } catch (e) {
          console.warn("Failed to unregister push token:", e);
        }
      }
      clearStoredPushToken();

      await updateMyPreferences({
        enable_push: false,
      });

      setPreferences((prev) => ({
        ...prev,
        enable_push: false,
      }));

      setInitialPreferences((prev) => ({
        ...prev,
        enable_push: false,
      }));

      setPushStatus((prev) => ({ ...prev, push_preference_enabled: false }));
      await loadPushStatus();

      setPushStatusMessage("Browser notifications disabled.");
    } catch (error) {
      setPushStatusMessage(
        readableApiError(error, "Could not disable browser notifications.")
      );
    } finally {
      setIsPushProcessing(false);
    }
  };

  return (
    <div
      className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-6 space-y-8"
      data-testid="notification-settings-page"
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
          Notification Settings
        </h1>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Manage how OmniSport AI notifies you.
        </p>
      </div>

      {/* Feedback Messages */}
      {statusMessage && (
        <div
          className="flex items-center gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs text-emerald-400"
          data-testid="notification-status-success"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div
          className="flex items-center gap-2.5 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3.5 text-xs text-rose-400"
          data-testid="notification-status-error"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {pushStatusMessage && (
        <div className="flex items-center gap-2.5 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-soft)] p-3 text-xs text-[var(--text-muted)]">
          <Globe className="h-3.5 w-3.5 shrink-0 text-[var(--primary)]" />
          <span>{pushStatusMessage}</span>
        </div>
      )}

      {/* Loading State */}
      {isLoading || !preferences ? (
        <div
          className="flex min-h-[250px] flex-col items-center justify-center gap-3 p-8 text-center"
          data-testid="notifications-loading"
        >
          <Loader2 className="h-7 w-7 animate-spin text-[var(--primary)]" />
          <p className="text-xs font-semibold text-[var(--text-muted)]">
            Loading notification preferences...
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Notifications Section */}
          <section aria-labelledby="notifications-list-heading" className="space-y-2">
            <h2
              id="notifications-list-heading"
              className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2"
            >
              Notifications
            </h2>

            <div className="divide-y divide-[var(--border-soft)] border-y border-[var(--border-soft)]">
              {/* Row 1: In-app notifications */}
              <div
                className="py-4 px-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                data-testid="in-app-notifications-row"
              >
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  <Bell className="h-4 w-4 shrink-0 text-[var(--text-muted)] mt-0.5 sm:mt-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text-main)]">
                      In-app notifications
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      Notifications appear in your OmniSport AI bell and inbox.
                    </p>
                  </div>
                </div>
                <div className="shrink-0 self-start sm:self-center">
                  <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-400 border border-emerald-500/20">
                    Always active
                  </span>
                </div>
              </div>

              {/* Row 2: Match reminders */}
              <div className="py-4 px-1 space-y-3">
                <div className="flex items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <CalendarDays className="h-4 w-4 shrink-0 text-[var(--text-muted)] mt-0.5 sm:mt-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--text-main)]">
                        Match reminders
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        Receive reminders before matches where you are a player, coach, or assigned facilitator.
                      </p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={preferences.match_reminder_enabled}
                      disabled={isSaving}
                      onChange={(e) => applyField("match_reminder_enabled", e.target.checked)}
                      data-testid="match-reminders-toggle"
                      aria-label="Enable match reminders"
                    />
                    <div className="w-10 h-5 bg-[var(--surface-soft)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all border border-[var(--border-soft)] peer-checked:bg-[var(--primary)]"></div>
                  </label>
                </div>

                {/* Sub-row: Reminder time (when match reminders enabled) */}
                {preferences.match_reminder_enabled && (
                  <div className="ml-7 pt-2 space-y-2 border-t border-[var(--border-soft)]/50">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                        <label
                          htmlFor="reminder-time-select"
                          className="text-xs font-medium text-[var(--text-muted)]"
                        >
                          Reminder time
                        </label>
                      </div>

                      <div className="relative">
                        <select
                          id="reminder-time-select"
                          value={Number(preferences.match_reminder_minutes_before || 60)}
                          onChange={(e) =>
                            applyField("match_reminder_minutes_before", Number(e.target.value))
                          }
                          disabled={isSaving}
                          className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--text-main)] outline-none focus:border-[var(--primary)] transition cursor-pointer"
                          data-testid="reminder-time-select"
                        >
                          {MATCH_REMINDER_OPTIONS.map((minutes) => (
                            <option key={minutes} value={minutes}>
                              {reminderTimeLabel(minutes)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      You will receive an advance alert {reminderTimeLabel(preferences.match_reminder_minutes_before)}, plus an in-app and browser notification when your match starts.
                    </p>
                  </div>
                )}
              </div>

              {/* Row 3: Browser notifications */}
              <div className="py-4 px-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  <Globe className="h-4 w-4 shrink-0 text-[var(--text-muted)] mt-0.5 sm:mt-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text-main)]">
                      Browser notifications
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      Receive browser notifications even when the web app is not focused.
                    </p>
                    {!browserPushSupported && (
                      <p className="text-[11px] text-amber-500 mt-1">
                        Browser push is not supported on this browser or platform.
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-start sm:self-center shrink-0">
                  {isPushProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[var(--primary)]" />
                  ) : null}

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={browserPushEnabledForDevice}
                      disabled={isSaving || isPushProcessing || !browserPushSupported}
                      onChange={(e) => {
                        if (e.target.checked) {
                          void enableBrowserNotifications();
                        } else {
                          void disableBrowserNotifications();
                        }
                      }}
                      data-testid="browser-notifications-toggle"
                      aria-label="Enable browser notifications"
                    />
                    <div className="w-10 h-5 bg-[var(--surface-soft)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all border border-[var(--border-soft)] peer-checked:bg-[var(--primary)] peer-disabled:opacity-50"></div>
                  </label>
                </div>
              </div>
            </div>
          </section>

          {/* Save Action Bar (when match reminder changes pending) */}
          {remindersDirty && (
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-soft)]">
              <button
                type="button"
                onClick={resetUnsavedChanges}
                disabled={isSaving}
                className="rounded-lg border border-[var(--border-soft)] bg-transparent px-4 py-2 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-soft)] transition cursor-pointer disabled:opacity-50"
              >
                Reset
              </button>

              <button
                type="button"
                onClick={saveChanges}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground,#ffffff)] px-4 py-2 text-xs font-semibold hover:opacity-90 transition cursor-pointer disabled:opacity-50 shadow-sm"
                data-testid="save-notification-settings-button"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save changes</span>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationPreferences;
