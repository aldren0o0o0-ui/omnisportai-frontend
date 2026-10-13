import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, BellOff, Globe, Send, FileText, Eye, CheckCircle2 } from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { createAnnouncement } from "../../services/announcementService";
import { resolveRoleKeyFromRoles } from "../../utils/notificationRouting";
import useTournamentAccess from "../../hooks/useTournamentAccess";
import RichTextEditor from "../../components/common/RichTextEditor";
import AppModal from "../../components/common/AppModal";
import {
  isBrowserPushSupported,
  getBrowserNotificationPermission,
  requestBrowserPushToken,
} from "../../services/notification/browserPushService";

const stripHtml = (html) => {
  if (!html) return "";
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return (doc.body.textContent || "").trim();
  } catch {
    return String(html).replace(/<[^>]*>?/gm, "").trim();
  }
};

const sanitizeHtml = (rawHtml) => {
  if (!rawHtml) return "";
  try {
    const doc = new DOMParser().parseFromString(rawHtml, "text/html");
    doc.querySelectorAll("script, iframe, object, embed, form").forEach((el) => el.remove());
    const allElements = doc.body.querySelectorAll("*");
    allElements.forEach((el) => {
      Array.from(el.attributes).forEach((attr) => {
        if (attr.name.startsWith("on") || attr.value.trim().toLowerCase().startsWith("javascript:")) {
          el.removeAttribute(attr.name);
        }
      });
    });
    return doc.body.innerHTML;
  } catch {
    return String(rawHtml).replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  }
};

const CreateAnnouncementPage = () => {
  const navigate = useNavigate();
  const { user, roleNames, isViewerOnly } = useAuth();
  const tournamentAccess = useTournamentAccess();
  const roleKey = resolveRoleKeyFromRoles({ roleNames, isViewerOnly });

  const hasCoordinator = tournamentAccess.hasSelectedTournament
    ? tournamentAccess.isCoordinatorMode
    : roleNames.includes("SPORTS_COORDINATOR");
  const hasFacilitator = tournamentAccess.isFacilitatorMode || roleNames.includes("SPORTS_FACILITATOR");
  const hasDepartmentManager = tournamentAccess.hasSelectedTournament
    ? tournamentAccess.isDepartmentManagerMode
    : roleNames.includes("DEPARTMENT_MANAGER");
  const hasCoach = tournamentAccess.isCoachMode || roleNames.includes("COACH");
  const canCreate = hasCoordinator || hasFacilitator || hasDepartmentManager || hasCoach;

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(() =>
    getBrowserNotificationPermission()
  );

  const handleEnableBrowserNotifications = async () => {
    try {
      const result = await requestBrowserPushToken();
      setNotificationPermission(result?.permission || getBrowserNotificationPermission());
    } catch {
      setNotificationPermission(getBrowserNotificationPermission());
    }
  };

  const notifyLocalBrowser = (announcementTitle, announcementBody) => {
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      const previewText = stripHtml(announcementBody).slice(0, 160) || "Announcement published.";
      try {
        new Notification(`Announcement: ${announcementTitle}`, {
          body: previewText,
          icon: "/favicon.ico",
        });
      } catch {
        navigator?.serviceWorker?.ready?.then((reg) => {
          reg.showNotification(`Announcement: ${announcementTitle}`, {
            body: previewText,
            icon: "/favicon.ico",
          });
        });
      }
    }
  };

  const buildPayload = ({ publishNow = false } = {}) => ({
    title: String(title || "").trim(),
    body: String(body || "").trim(),
    priority: "NORMAL",
    category: "GENERAL",
    target_scope_type: "GLOBAL",
    target_scope_id: null,
    target_role_id: null,
    tournament_id: null,
    tournament_ids: [],
    sport_id: null,
    sport_ids: [],
    department_id: null,
    department_ids: [],
    team_id: null,
    team_ids: [],
    include_players: true,
    recipient_user_ids: [],
    publish_now: Boolean(publishNow),
  });

  const handleSaveDraft = async (e) => {
    if (e) e.preventDefault();
    if (!title.trim() || !stripHtml(body)) {
      setError("Please provide both a title and message content for the draft.");
      return;
    }
    setSavingDraft(true);
    setError("");
    try {
      const payload = buildPayload({ publishNow: false });
      const result = await createAnnouncement(payload);
      const announcementId = Number(result?.announcement?.id || 0);
      if (Number.isFinite(announcementId) && announcementId > 0) {
        navigate(`/${roleKey}/announcements/${announcementId}`);
        return;
      }
      navigate(`/${roleKey}/announcements`);
    } catch (apiError) {
      setError(apiError?.response?.data?.detail || "Failed to save draft announcement.");
    } finally {
      setSavingDraft(false);
    }
  };

  const handleOpenPublishModal = () => {
    if (!title.trim() || !stripHtml(body)) {
      setError("Title and announcement body are required before publishing.");
      return;
    }
    setError("");
    setShowPublishModal(true);
  };

  const handleConfirmPublish = async () => {
    setPublishing(true);
    setError("");
    try {
      const payload = buildPayload({ publishNow: true });
      const result = await createAnnouncement(payload);

      // Trigger local browser push notification if permitted
      notifyLocalBrowser(title.trim(), body);

      setShowPublishModal(false);
      const announcementId = Number(result?.announcement?.id || 0);
      if (Number.isFinite(announcementId) && announcementId > 0) {
        navigate(`/${roleKey}/announcements/${announcementId}`);
        return;
      }
      navigate(`/${roleKey}/announcements`);
    } catch (apiError) {
      setError(apiError?.response?.data?.detail || "Failed to publish announcement.");
    } finally {
      setPublishing(false);
    }
  };

  const isWorking = savingDraft || publishing;
  const hasValidContent = Boolean(title.trim() && stripHtml(body));

  if (!canCreate) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-12 text-center">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          You do not have permission to create announcements.
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-4xl px-3 sm:px-4 pb-14 pt-3 sm:pt-4 md:px-6">
      {/* Top Header Navigation */}
      <div className="mb-5 sm:mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            type="button"
            onClick={() => navigate(`/${roleKey}/announcements`)}
            className="group mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition group-hover:-translate-x-0.5" />
            <span>Back to Announcements</span>
          </button>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Create Announcement
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Compose and broadcast an official announcement across the organization.
          </p>
        </div>

        {/* Global Broadcast & Browser Push Badges */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {isBrowserPushSupported() ? (
            notificationPermission === "granted" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/70 px-2.5 sm:px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                <Bell className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Browser Push Active</span>
              </span>
            ) : notificationPermission === "denied" ? (
              <span
                title="Notifications are blocked in your browser site permissions."
                className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50/70 px-2.5 sm:px-3 py-1 text-xs font-medium text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300"
              >
                <BellOff className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Browser Push Blocked</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleEnableBrowserNotifications}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-2.5 sm:px-3 py-1 text-xs font-medium text-slate-700 shadow-xs hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-200 dark:hover:bg-[var(--surface)]"
              >
                <Bell className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                <span>Enable Browser Alerts</span>
              </button>
            )
          ) : null}
        </div>
      </div>

      {/* Main Single Clean Form Surface */}
      <form onSubmit={(e) => e.preventDefault()} className="space-y-5 sm:space-y-6">
        <div className="space-y-4">
          {/* Title Field */}
          <div>
            <label htmlFor="announcement-title" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Announcement Title
            </label>
            <input
              id="announcement-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Schedule Updates for Championship Matches"
              maxLength={150}
              disabled={isWorking}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base font-medium text-slate-900 placeholder-slate-400 transition focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-100 dark:placeholder-slate-500"
              required
            />
            <div className="mt-1 flex justify-end">
              <span className="text-[11px] text-slate-400">{title.length} / 150</span>
            </div>
          </div>

          {/* Word-like Rich Text Editor */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Announcement Message
            </label>
            <RichTextEditor
              value={body}
              onChange={(newHtml) => setBody(newHtml)}
              placeholder="Write your announcement message here... Use the toolbar above to style headings, font size, bold text, bullet lists, or colors."
              minHeight="260px"
              disabled={isWorking}
            />
          </div>
        </div>

        {/* Global Delivery Note */}
        <div className="flex items-start gap-2.5 sm:gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 sm:p-3.5 text-xs text-slate-600 dark:border-slate-800/80 dark:bg-[var(--surface-soft)]/50 dark:text-slate-400">
          <Globe className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
          <div className="space-y-0.5">
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              Global Organization Scope
            </p>
            <p className="leading-relaxed">
              When published, this announcement will be posted immediately for all players, coaches, managers, and staff across OmniSport. Users who have allowed browser notifications will receive an instant push notification on their device.
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
            {error}
          </div>
        ) : null}

        {/* Action Buttons Row */}
        <div className="flex flex-col-reverse gap-2.5 sm:gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isWorking || !hasValidContent}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-200 dark:hover:bg-[var(--surface)]"
          >
            <FileText className="h-4 w-4 text-slate-400" />
            <span>{savingDraft ? "Saving Draft..." : "Save Draft"}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenPublishModal}
            disabled={isWorking || !hasValidContent}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            <span>Publish Announcement</span>
          </button>
        </div>
      </form>

      {/* Publish Announcement Preview Modal */}
      <AppModal
        open={showPublishModal}
        onClose={() => !publishing && setShowPublishModal(false)}
        title="Publish Announcement"
        subtitle="Review your announcement preview before publishing globally to all members."
        maxWidthClass="max-w-2xl"
        footer={
          <div className="flex w-full flex-col-reverse items-stretch justify-end gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => setShowPublishModal(false)}
              disabled={publishing}
              className="w-full sm:w-auto rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-200 dark:hover:bg-[var(--surface)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmPublish}
              disabled={publishing}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              <span>{publishing ? "Publishing Announcement..." : "Publish Announcement"}</span>
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Announcement Card Preview */}
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-xs dark:border-slate-800 dark:bg-[var(--surface-soft)]">
            {/* Header info */}
            <div className="mb-3 border-b border-slate-100 pb-3 dark:border-slate-800">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Announcement Preview
              </span>
              <h2 className="mt-1 text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 break-words">
                {title.trim()}
              </h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span>By: {user?.full_name || user?.name || user?.username || "You"}</span>
                <span>•</span>
                <span>Scope: GLOBAL</span>
                <span>•</span>
                <span>Status: READY TO PUBLISH</span>
              </div>
            </div>

            {/* Formatted Message Body */}
            <div
              className="rich-text-content max-h-[360px] overflow-y-auto text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200 break-words [&_img]:max-w-full [&_img]:h-auto [&_table]:w-full [&_table]:overflow-x-auto [&_table]:block [&>h1]:mb-3 [&>h1]:text-xl sm:[&>h1]:text-2xl [&>h1]:font-bold [&>h1]:text-slate-900 dark:[&>h1]:text-slate-100 [&>h2]:mb-2 [&>h2]:text-lg sm:[&>h2]:text-xl [&>h2]:font-semibold [&>h2]:text-slate-900 dark:[&>h2]:text-slate-100 [&>h3]:mb-2 [&>h3]:text-sm sm:[&>h3]:text-base [&>h3]:font-medium [&>p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 sm:[&_ul]:pl-6 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 sm:[&_ol]:pl-6 [&_ol]:my-2 [&_li]:my-1 [&_li]:pl-1 [&>blockquote]:mb-2 [&>blockquote]:border-l-4 [&>blockquote]:border-emerald-500 [&>blockquote]:pl-3 [&>blockquote]:italic [&>blockquote]:text-slate-500 dark:[&>blockquote]:text-slate-400 [&>hr]:my-4 [&>hr]:border-slate-200 dark:[&>hr]:border-slate-700"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(body) }}
            />
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Publishing will notify users in their app feed and trigger a browser push notification for users who have permitted notifications.
          </p>
        </div>
      </AppModal>
    </section>
  );
};

export default CreateAnnouncementPage;
