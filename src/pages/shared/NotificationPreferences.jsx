import { useEffect, useMemo, useState } from "react";
import {
  getMyPreferences,
  getPushStatus,
  registerPushToken,
  sendTestPush,
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
import {
  isRoleMissionCardPermanentlyHidden,
  setRoleMissionCardSessionDismissed,
  setRoleMissionCardPermanentlyHidden,
} from "../../utils/roleMissionCardPreferences";
import PageHeaderCard from "../../components/common/PageHeaderCard";
import DashboardCard from "../../components/common/DashboardCard";
import LoadingState from "../../components/common/LoadingState";
import SettingsStatusBanner from "../../components/common/SettingsStatusBanner";
import AppModal from "../../components/common/AppModal";



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
      // Ignore stringify failures.
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

const formatResultValue = (value) => {
  if (value === null || value === undefined || value === "") return "None";
  if (typeof value === "boolean") return value ? "True" : "False";
  return String(value);
};

const NotificationPreferences = () => {
  const { user } = useAuth();
  const [initialPreferences, setInitialPreferences] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const [initialHideRoleMissionCard, setInitialHideRoleMissionCard] = useState(false);
  const [hideRoleMissionCard, setHideRoleMissionCard] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPushProcessing, setIsPushProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [pushStatusMessage, setPushStatusMessage] = useState("");
  const [pushStatus, setPushStatus] = useState(null);
  const [, setPushPermissionState] = useState(getBrowserNotificationPermission());
  const [, setPushRegistrationState] = useState("idle");
  const [isSendingTestPush, setIsSendingTestPush] = useState(false);
  const [testPushResult, setTestPushResult] = useState(null);
  const [testPushError, setTestPushError] = useState("");
  const [testPushResultOpen, setTestPushResultOpen] = useState(false);
  const userId = Number(user?.id || user?.user_id || 0);
  // const [browserPushEnabledForDevice, setBrowserPushEnabledForDevice] = useState(false);


  const browserPushSupported = isBrowserPushSupported();
  const browserPushEnabledForDevice = Boolean(pushStatus?.push_preference_enabled);
  
  const showDeveloperTools = import.meta.env.DEV;

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

  useEffect(() => {
    if (userId <= 0) return;
    const hidden = isRoleMissionCardPermanentlyHidden(userId);
    setHideRoleMissionCard(hidden);
    setInitialHideRoleMissionCard(hidden);
  }, [userId]);

  const remindersDirty = useMemo(() => {
    if (!initialPreferences || !preferences) return false;
    return !areReminderFieldsEqual(initialPreferences, preferences);
  }, [initialPreferences, preferences]);

  const roleCardDirty =
    userId > 0 && Boolean(hideRoleMissionCard) !== Boolean(initialHideRoleMissionCard);
  const isDirty = remindersDirty || roleCardDirty;

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
    setHideRoleMissionCard(Boolean(initialHideRoleMissionCard));
    setStatusMessage("");
    setErrorMessage("");
  };

  const saveChanges = async () => {
    if (!preferences || isSaving || !isDirty) return;
    setIsSaving(true);
    setStatusMessage("");
    setErrorMessage("");
    try {
      if (remindersDirty) {
        const payload = {
          match_reminder_enabled: Boolean(preferences.match_reminder_enabled),
          match_reminder_minutes_before: Number(preferences.match_reminder_minutes_before || 60),
        };
        const updated = await updateMyPreferences(payload);
        const normalized = normalizePreferences(updated);
        setPreferences(normalized);
        setInitialPreferences(normalized);
      }
      if (userId > 0) {
        setRoleMissionCardPermanentlyHidden(userId, hideRoleMissionCard);
        if (!hideRoleMissionCard) {
          setRoleMissionCardSessionDismissed(userId, false);
        }
        setInitialHideRoleMissionCard(Boolean(hideRoleMissionCard));
      }
      setStatusMessage("Notification settings saved.");
    } catch (error) {
      const reason = readableApiError(error, "Unknown error.");
      setErrorMessage(`Could not save notification settings. ${reason}`);
    } finally {
      setIsSaving(false);
    }
  };


  const enableBrowserNotifications = async () => {
    if (!isBrowserPushSupported()) {
      setPushPermissionState("unsupported");
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

          console.log(browserPushEnabledForDevice);

          setPushPermissionState(result.permission);
          setPushStatusMessage("Browser notifications enabled.");
          return true;
        } catch (error) {
          console.error("Failed to register push token:", error);
          setPushStatusMessage("Failed to save notification settings. Please try again.");
          return false;
        }
      } else {
        setPushPermissionState(result.permission);
        setPushStatusMessage("Failed to obtain push permission.");
        return false;
      }
    } catch (error) {
      console.error("Error requesting push token:", error);
      setPushStatusMessage("An error occurred while setting up notifications.");
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
          console.warn("Failed to unregister push token, continuing to disable:", e);
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

      setPushRegistrationState("disabled");
      setPushStatusMessage("Browser notifications disabled.");
    } catch (error) {
      setPushRegistrationState("error");
      setPushStatusMessage(
        readableApiError(
          error,
          "Could not disable browser notifications."
        )
      );
    } finally {
      setIsPushProcessing(false);
    }
  };

  const sendDeveloperTestPush = async () => {
    if (isSendingTestPush) return;
    setIsSendingTestPush(true);
    setTestPushError("");
    setTestPushResult(null);
    setStatusMessage("");
    setErrorMessage("");
    try {
      const payload = await sendTestPush();
      setTestPushResult(payload);
      setTestPushResultOpen(true);
    } catch (error) {
      const reason = readableApiError(error, "Could not send test push notification.");
      setTestPushError(reason);
      setTestPushResult({
        success: false,
        provider_message_id: null,
        failed_reason: reason,
        invalid_token: false,
        skipped: false,
        user_id: userId || null,
        token_id: null,
      });
      setTestPushResultOpen(true);
    } finally {
      setIsSendingTestPush(false);
    }
  };

  return (
    <div className="os-page-shell">
      <PageHeaderCard
        title="Notification Settings"
        subtitle="Manage how OmniSport AI notifies you about matches and system updates."
      />

      <SettingsStatusBanner type="error" message={errorMessage} onDismiss={() => setErrorMessage("")} />
      <SettingsStatusBanner type="success" message={statusMessage} onDismiss={() => setStatusMessage("")} />
      {isDirty ? <SettingsStatusBanner type="info" message="You have unsaved changes." /> : null}

      <DashboardCard>
        {isLoading || !preferences ? (
          <LoadingState message="Loading notification preferences..." />
        ) : (
          <div className="grid gap-6 lg:grid-cols-12">
            <fieldset disabled={isSaving} className="space-y-6 lg:col-span-7">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-[var(--surface-soft)]/50">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">In-app Notifications</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Notifications appear in your OmniSport AI bell and inbox.
                </p>
                <p className="mt-3 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300">
                  Always active
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-[var(--surface-soft)]/50">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Match Reminders</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Receive reminders before matches where you are a player, coach, or assigned facilitator.
                </p>
                <label className="mt-4 flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-[var(--surface)] dark:hover:bg-[var(--surface)]">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Enable Match Reminders</p>
                  </div>
                  <div className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={preferences.match_reminder_enabled}
                      onChange={(event) => applyField("match_reminder_enabled", event.target.checked)}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                  </div>
                </label>
                <div className="mt-4">
                  <label className="block text-sm font-bold text-slate-900 dark:text-slate-100">Reminder Time</label>
                  <select
                    value={Number(preferences.match_reminder_minutes_before || 60)}
                    onChange={(event) =>
                      applyField("match_reminder_minutes_before", Number(event.target.value))
                    }
                    disabled={!preferences.match_reminder_enabled}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-[var(--surface)] dark:text-slate-100"
                  >
                    {MATCH_REMINDER_OPTIONS.map((minutes) => (
                      <option key={minutes} value={minutes}>
                        {reminderTimeLabel(minutes)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-[var(--surface-soft)]/50">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Browser Pop-up Notifications</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Browser notifications can appear as pop-ups even when the web app is not focused.
                </p>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  In-app notifications will still work even if browser pop-ups are disabled.
                </p>
                {/* {pushStatusMessage ? (
                  <div className="mt-3">
                    <SettingsStatusBanner
                      type={pushMessageTone}
                      message={pushStatusMessage}
                      onDismiss={() => setPushStatusMessage("")}
                    />
                  </div>
                ) : null} */}
                <label className="mt-4 flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-[var(--surface)] dark:hover:bg-[var(--surface)]">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Enable Browser Notifications
                    </p>
                       {pushStatusMessage ? (
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {pushStatusMessage}
                          </p>
                        ) : null}
                    
                  </div>
                  <div className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={browserPushEnabledForDevice}
                      disabled={isSaving || isPushProcessing || !browserPushSupported}
                      onChange={(event) => {
                        if (event.target.checked) {
                          void enableBrowserNotifications();
                          console.log("Enabling browser notifications...");
                          return;
                        }
                        void disableBrowserNotifications();
                      }}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600 peer-disabled:opacity-60"></div>
                  </div>
                </label>
              </div>

              {showDeveloperTools ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-500/40 dark:bg-amber-500/10">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Developer Tools</p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    This section is only available during development.
                  </p>
                  {testPushError ? (
                    <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
                      {testPushError}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={sendDeveloperTestPush}
                    disabled={isSaving || isPushProcessing || isSendingTestPush}
                    className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
                  >
                    {isSendingTestPush ? (
                      <>
                        <svg className="-ml-1 mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Sending...
                      </>
                    ) : (
                      "Send Test Notification"
                    )}
                  </button>
                </div>
              ) : null}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-[var(--surface-soft)]/50">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Other preferences</p>
                <label className="mt-3 flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-[var(--surface)] dark:hover:bg-[var(--surface)]">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Hide Role Mission Card</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Keep role mission cards hidden across sessions until turned off.
                    </p>
                  </div>
                  <div className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={Boolean(hideRoleMissionCard)}
                      onChange={(event) => {
                        setStatusMessage("");
                        setErrorMessage("");
                        setHideRoleMissionCard(event.target.checked);
                      }}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                  </div>
                </label>
              </div>

              <div className="bottom-4 z-10 mt-2 rounded-xl border border-slate-200 bg-white/95 p-4 backdrop-blur dark:border-slate-700 dark:bg-[var(--surface)]/95">
                <div className="flex flex-wrap justify-end gap-3">
                  {isDirty ? (
                    <button
                      type="button"
                      onClick={resetUnsavedChanges}
                      disabled={isSaving || isPushProcessing}
                      className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-[var(--surface-soft)] dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      Reset
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={saveChanges}
                    disabled={isSaving || isPushProcessing || !isDirty}
                    className="rounded-xl bg-blue-600 px-8 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </fieldset>

            {/* <div className="space-y-6 lg:col-span-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-[var(--surface-soft)]/50">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Notification Summary</p>
                <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                  <p>In-app: Active</p>
                  <p>Match reminders: {preferences.match_reminder_enabled ? "Enabled" : "Disabled"}</p>
                  <p>Reminder time: {reminderTimeLabel(preferences.match_reminder_minutes_before)}</p>
                  <p>Browser pop-ups: {summaryBrowserPopups}</p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-[var(--surface-soft)]/50">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">How it works</p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  You will always receive reminders in the notification bell.
                </p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Browser pop-ups will appear only if browser notifications are enabled and allowed by your browser.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-[var(--surface-soft)]/50">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Browser permission status</p>
                <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                  <p>Permission: {permissionStatusLabel}</p>
                  <p>Browser support: {browserPushSupported ? "Supported" : "Not supported"}</p>
                  <p>Firebase: {firebaseEnabled ? "Configured" : "Not configured"}</p>
                </div>
                {!firebaseEnabled ? (
                  <div className="mt-3">
                    <SettingsStatusBanner
                      type="warning"
                      message="Browser push is not configured. In-app notifications will still work."
                    />
                  </div>
                ) : null}
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-[var(--surface-soft)]/50">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Other preferences</p>
                <label className="mt-3 flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-[var(--surface)] dark:hover:bg-[var(--surface)]">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Hide Role Mission Card</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Keep role mission cards hidden across sessions until turned off.
                    </p>
                  </div>
                  <div className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={Boolean(hideRoleMissionCard)}
                      onChange={(event) => {
                        setStatusMessage("");
                        setErrorMessage("");
                        setHideRoleMissionCard(event.target.checked);
                      }}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                  </div>
                </label>
              </div>
            </div> */}
          </div>
        )}
      </DashboardCard>

      <AppModal
        open={testPushResultOpen}
        onClose={() => setTestPushResultOpen(false)}
        title="Push Test Result"
        maxWidthClass="max-w-lg"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-[var(--surface-soft)]/50">
            <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Status</p>
            <p className={`mt-1 text-sm font-bold ${testPushResult?.success ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>
              {testPushResult?.success ? "Success" : "Failed"}
            </p>
          </div>

          <dl className="space-y-3 text-sm">
            <div>
              <dt className="font-semibold text-slate-700 dark:text-slate-200">Firebase Message ID</dt>
              <dd className="mt-1 break-words rounded-lg bg-slate-100 px-3 py-2 text-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-200">
                {formatResultValue(testPushResult?.provider_message_id)}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-700 dark:text-slate-200">Invalid Token</dt>
              <dd className="mt-1 text-slate-600 dark:text-slate-300">
                {formatResultValue(testPushResult?.invalid_token)}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-700 dark:text-slate-200">Skipped</dt>
              <dd className="mt-1 text-slate-600 dark:text-slate-300">
                {formatResultValue(testPushResult?.skipped)}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-700 dark:text-slate-200">Reason</dt>
              <dd className="mt-1 whitespace-pre-wrap break-words rounded-lg bg-slate-100 px-3 py-2 text-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-200">
                {formatResultValue(testPushResult?.failed_reason)}
              </dd>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="font-semibold text-slate-700 dark:text-slate-200">User ID</dt>
                <dd className="mt-1 text-slate-600 dark:text-slate-300">
                  {formatResultValue(testPushResult?.user_id)}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-700 dark:text-slate-200">Token ID</dt>
                <dd className="mt-1 text-slate-600 dark:text-slate-300">
                  {formatResultValue(testPushResult?.token_id)}
                </dd>
              </div>
            </div>
          </dl>
        </div>
      </AppModal>
    </div>
  );
};

export default NotificationPreferences;
