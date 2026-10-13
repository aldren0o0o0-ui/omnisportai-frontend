import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Archive, Send, User as UserIcon } from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import {
  archiveAnnouncement,
  getAnnouncementDetail,
  publishAnnouncement,
} from "../../services/announcementService";
import { getUserProfile } from "../../services/userService";
import { resolveRoleKeyFromRoles } from "../../utils/notificationRouting";
import { useProfileDrawer } from "../../components/profile";

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

const AnnouncementDetailPage = () => {
  const { announcementId } = useParams();
  const { user, roleNames, isViewerOnly } = useAuth();
  const { openProfile } = useProfileDrawer();
  const roleKey = resolveRoleKeyFromRoles({ roleNames, isViewerOnly });
  const isCoordinator = roleNames.includes("SPORTS_COORDINATOR");

  const [announcement, setAnnouncement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [creatorProfileName, setCreatorProfileName] = useState("");

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await getAnnouncementDetail(announcementId);
      setAnnouncement(payload?.announcement || null);
    } catch (apiError) {
      setError(apiError?.response?.data?.detail || "Failed to load announcement.");
      setAnnouncement(null);
    } finally {
      setLoading(false);
    }
  }, [announcementId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const isCreator = useMemo(
    () => Number(user?.id || 0) > 0 && Number(announcement?.created_by_user_id || 0) === Number(user?.id || 0),
    [announcement?.created_by_user_id, user?.id]
  );
  const canManage = isCreator || isCoordinator;

  useEffect(() => {
    let active = true;
    const fetchCreatorName = async () => {
      if (!announcement?.created_by_user_id) return;
      if (announcement?.created_by_name) {
        setCreatorProfileName(announcement.created_by_name);
        return;
      }
      if (isCreator && (user?.full_name || user?.name)) {
        setCreatorProfileName(user?.full_name || user?.name);
        return;
      }
      try {
        const payload = await getUserProfile(announcement.created_by_user_id);
        if (active && (payload?.user?.name || payload?.user?.full_name)) {
          setCreatorProfileName(payload.user.name || payload.user.full_name);
        }
      } catch {
        // Fallback silently if peer profile restricted
      }
    };
    void fetchCreatorName();
    return () => {
      active = false;
    };
  }, [announcement?.created_by_name, announcement?.created_by_user_id, isCreator, user?.full_name, user?.name]);

  const creatorDisplayName =
    announcement?.created_by_name ||
    creatorProfileName ||
    (isCreator ? (user?.full_name || user?.name) : null) ||
    (announcement?.created_by_user_id ? `User #${announcement.created_by_user_id}` : "System");

  const handlePublish = async () => {
    if (!window.confirm("Publish this announcement now?")) return;
    setActionMessage("");
    try {
      const payload = await publishAnnouncement(announcementId);
      setActionMessage(payload?.message || "Announcement published.");
      await loadDetail();
    } catch (apiError) {
      setActionMessage(apiError?.response?.data?.detail || "Failed to publish announcement.");
    }
  };

  const handleArchive = async () => {
    if (!window.confirm("Archive this announcement?")) return;
    setActionMessage("");
    try {
      const payload = await archiveAnnouncement(announcementId);
      setActionMessage(payload?.message || "Announcement archived.");
      await loadDetail();
    } catch (apiError) {
      setActionMessage(apiError?.response?.data?.detail || "Failed to archive announcement.");
    }
  };

  return (
    <section className="mx-auto w-full max-w-4xl px-3 sm:px-4 pb-14 pt-3 sm:pt-4 md:px-6">
      {/* Back to Announcements link placed cleanly above the announcement detail */}
      <div className="mb-4 sm:mb-6">
        <Link
          to={`/${roleKey}/announcements`}
          className="group inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition group-hover:-translate-x-0.5" />
          <span>Back to Announcements</span>
        </Link>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
          Loading announcement...
        </div>
      ) : null}

      {!loading && error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 sm:p-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      {actionMessage ? (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
          {actionMessage}
        </div>
      ) : null}

      {!loading && !error && announcement ? (
        <div className="space-y-4 sm:space-y-6">
          {/* Header Row: Title & Creator on left, Archive button top right */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1.5 sm:space-y-2 min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 break-words leading-tight">
                {announcement.title}
              </h1>

              {/* Creator with Name (Clickable to open profile in sidebar) */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span>Created by</span>
                {announcement.created_by_user_id ? (
                  <button
                    type="button"
                    onClick={() => openProfile({ userId: Number(announcement.created_by_user_id) })}
                    className="inline-flex items-center gap-1 font-semibold text-slate-800 hover:text-emerald-600 hover:underline dark:text-slate-200 dark:hover:text-emerald-400 transition"
                    title="View creator profile in sidebar"
                  >
                    <UserIcon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate max-w-[200px] sm:max-w-none">{creatorDisplayName}</span>
                  </button>
                ) : (
                  <span className="font-semibold text-slate-700 dark:text-slate-300">System</span>
                )}
                {announcement.created_at ? (
                  <>
                    <span>•</span>
                    <span>{new Date(announcement.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                  </>
                ) : null}
              </div>
            </div>

            {/* Top Right Action Area: Archive / Publish */}
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0 pt-1 sm:pt-0">
              {canManage && announcement.status === "DRAFT" ? (
                <button
                  type="button"
                  onClick={handlePublish}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-500"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Publish</span>
                </button>
              ) : null}

              {canManage && announcement.status !== "ARCHIVED" ? (
                <button
                  type="button"
                  onClick={handleArchive}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-200 dark:hover:border-amber-700 dark:hover:bg-amber-950/30 dark:hover:text-amber-300"
                >
                  <Archive className="h-3.5 w-3.5" />
                  <span>Archive</span>
                </button>
              ) : announcement.status === "ARCHIVED" ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                  <Archive className="h-3.5 w-3.5" />
                  <span>Archived</span>
                </span>
              ) : null}
            </div>
          </div>

          {/* Clean Subtle Divider (No heavy container box) */}
          <div className="border-b border-slate-200 dark:border-slate-800" />

          {/* Formatted Announcement Body (Clean flat reading canvas) */}
          <div className="min-w-0 max-w-full overflow-hidden">
            {/<[a-z][\s\S]*>/i.test(announcement.body || "") ? (
              <div
                className="rich-text-content text-sm sm:text-base leading-relaxed text-slate-800 dark:text-slate-200 break-words [&_img]:max-w-full [&_img]:h-auto [&_table]:w-full [&_table]:overflow-x-auto [&_table]:block [&>h1]:mb-3 [&>h1]:text-xl sm:[&>h1]:text-2xl [&>h1]:font-bold [&>h1]:text-slate-900 dark:[&>h1]:text-slate-100 [&>h2]:mb-2 [&>h2]:text-lg sm:[&>h2]:text-xl [&>h2]:font-semibold [&>h2]:text-slate-900 dark:[&>h2]:text-slate-100 [&>h3]:mb-2 [&>h3]:text-sm sm:[&>h3]:text-base [&>h3]:font-medium [&>p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 sm:[&_ul]:pl-6 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 sm:[&_ol]:pl-6 [&_ol]:my-2 [&_li]:my-1 [&_li]:pl-1 [&>blockquote]:mb-3 [&>blockquote]:border-l-4 [&>blockquote]:border-emerald-500 [&>blockquote]:pl-3 [&>blockquote]:italic [&>blockquote]:text-slate-500 dark:[&>blockquote]:text-slate-400 [&>hr]:my-5 [&>hr]:border-slate-200 dark:[&>hr]:border-slate-700"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(announcement.body) }}
              />
            ) : (
              <p className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed text-slate-800 dark:text-slate-200 break-words">
                {announcement.body}
              </p>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default AnnouncementDetailPage;
