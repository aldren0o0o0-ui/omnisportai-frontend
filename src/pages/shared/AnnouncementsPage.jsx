import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { listAnnouncements } from "../../services/announcementService";
import { resolveRoleKeyFromRoles } from "../../utils/notificationRouting";
import EmptyState from "../../components/common/EmptyState";
import { IntramuralPage } from "../../components/intramural";
import { Megaphone } from "lucide-react";

const AnnouncementsPage = () => {
  const { roleNames, isViewerOnly } = useAuth();
  const roleKey = resolveRoleKeyFromRoles({ roleNames, isViewerOnly });
  const canCreate = useMemo(
    () =>
      roleNames.includes("SPORTS_COORDINATOR") ||
      roleNames.includes("SPORTS_FACILITATOR") ||
      roleNames.includes("DEPARTMENT_MANAGER") ||
      roleNames.includes("COACH"),
    [roleNames]
  );

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await listAnnouncements({
        includeArchived,
        includeDrafts: true,
        limit: 150,
      });
      setItems(Array.isArray(payload?.items) ? payload.items : []);
    } catch (apiError) {
      setError(apiError?.response?.data?.detail || "Failed to load announcements.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [includeArchived]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  return (
    <IntramuralPage
      role={roleKey === "sport-facilitator" ? "sport-facilitator" : roleKey}
      title="Announcements"
      breadcrumbs={[{ label: "Announcements" }]}
      subtitle="Across your Intramurals"
      requireActive={false}
      loading={loading}
      error={error}
      onRetry={loadItems}
      headerAction={
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(event) => setIncludeArchived(Boolean(event.target.checked))}
            />
            Include archived
          </label>
          {canCreate ? (
            <Link
              to={`/${roleKey}/announcements/new`}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
            >
              Create Announcement
            </Link>
          ) : null}
        </div>
      }
    >
      {items.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No announcements yet"
          message="Announcements across your Intramurals will appear here once they are posted."
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Link
              key={item.id}
              to={`/${roleKey}/announcements/${item.id}`}
              className="block rounded-xl border border-slate-200 p-4 transition hover:border-slate-400 dark:border-slate-700 dark:hover:border-slate-500"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold text-slate-900 dark:text-slate-100">{item.title}</h2>
                <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {item.status}
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{item.body}</p>
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
                <span>{item.category}</span>
                <span>{item.priority}</span>
                <span>{item.target_scope_type}</span>
                <span>{item.published_at ? "Published" : "Draft"}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </IntramuralPage>
  );
};

export default AnnouncementsPage;
