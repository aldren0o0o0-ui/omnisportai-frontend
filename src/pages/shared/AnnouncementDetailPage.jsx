import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  archiveAnnouncement,
  getAnnouncementDetail,
  listAnnouncementRecipients,
  publishAnnouncement,
} from "../../services/announcementService";
import { resolveRoleKeyFromRoles } from "../../utils/notificationRouting";
import { useProfileDrawer } from "../../components/profile";

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
  const [recipientRows, setRecipientRows] = useState([]);

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

  const handleLoadRecipients = async () => {
    setActionMessage("");
    try {
      const payload = await listAnnouncementRecipients(announcementId);
      setRecipientRows(Array.isArray(payload?.items) ? payload.items : []);
    } catch (apiError) {
      setActionMessage(apiError?.response?.data?.detail || "Failed to load recipients.");
      setRecipientRows([]);
    }
  };

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[var(--surface)]">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Announcement Detail</h1>
          <Link
            className="text-sm font-medium text-slate-600 underline-offset-2 hover:underline dark:text-slate-300"
            to={`/${roleKey}/announcements`}
          >
            Back to list
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[var(--surface)]">
        {loading ? <p className="text-sm text-slate-500 dark:text-slate-400">Loading announcement...</p> : null}
        {!loading && error ? <p className="text-sm text-rose-600">{error}</p> : null}
        {!loading && !error && announcement ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <span>{announcement.status}</span>
              <span>{announcement.priority}</span>
              <span>{announcement.category}</span>
              <span>{announcement.target_scope_type}</span>
            </div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{announcement.title}</h2>
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-300">{announcement.body}</p>
            <div className="grid gap-2 text-xs text-slate-500 dark:text-slate-400">
              <p className="flex items-center gap-1.5">
                <span>Created by:</span>
                {announcement.created_by_user_id ? (
                  <button
                    type="button"
                    onClick={() => openProfile({ userId: Number(announcement.created_by_user_id) })}
                    className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
                  >
                    User #{announcement.created_by_user_id}
                  </button>
                ) : (
                  <span>System</span>
                )}
              </p>
              <p>Published at: {announcement.published_at || "Not published"}</p>
              <p>Archived at: {announcement.archived_at || "Not archived"}</p>
            </div>

            {canManage ? (
              <div className="flex flex-wrap gap-2">
                {announcement.status === "DRAFT" ? (
                  <button
                    type="button"
                    onClick={handlePublish}
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    Publish
                  </button>
                ) : null}
                {announcement.status !== "ARCHIVED" ? (
                  <button
                    type="button"
                    onClick={handleArchive}
                    className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700"
                  >
                    Archive
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={handleLoadRecipients}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-[var(--surface)]"
                >
                  View Recipients
                </button>
              </div>
            ) : null}

            {actionMessage ? <p className="text-sm text-slate-600 dark:text-slate-300">{actionMessage}</p> : null}

            {recipientRows.length > 0 ? (
              <div className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700">
                <p className="mb-2 font-medium text-slate-800 dark:text-slate-100">Recipients ({recipientRows.length})</p>
                <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                  {recipientRows.map((row) => (
                    <p key={`${row.recipient_user_id}-${row.notification_id || "none"}`}>
                      User #{row.recipient_user_id} - {row.delivery_status}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default AnnouncementDetailPage;
