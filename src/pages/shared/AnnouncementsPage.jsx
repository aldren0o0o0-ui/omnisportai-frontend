import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { listAnnouncements } from "../../services/announcementService";
import { resolveRoleKeyFromRoles } from "../../utils/notificationRouting";
import EmptyState from "../../components/common/EmptyState";
import { IntramuralPage } from "../../components/intramural";
import { Megaphone } from "lucide-react";

const stripHtml = (html) => {
  if (!html) return "";
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return (doc.body.textContent || "").trim();
  } catch {
    return String(html).replace(/<[^>]*>?/gm, "").trim();
  }
};

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
      subtitle="Official updates and announcements across OmniSport AI"
      requireActive={false}
      showHistoricalBanner={false}
      loading={loading}
      error={error}
      onRetry={loadItems}
      headerAction={
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto justify-start sm:justify-end">
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(event) => setIncludeArchived(Boolean(event.target.checked))}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500 dark:border-slate-700 dark:bg-[var(--surface-soft)]"
            />
            Include archived
          </label>
          {canCreate ? (
            <Link
              to={`/${roleKey}/announcements/new`}
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-3.5 py-2 text-xs sm:text-sm font-medium text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 shadow-xs transition"
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
          message="Announcements across the organization will appear here once they are posted."
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Link
              key={item.id}
              to={`/${roleKey}/announcements/${item.id}`}
              className="group block rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4.5 transition hover:border-slate-300 hover:shadow-xs dark:border-slate-800 dark:bg-[var(--surface-soft)]/50 dark:hover:border-slate-700"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2">
                <h2 className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100 break-words min-w-0 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                  {item.title}
                </h2>
                <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      item.status === "PUBLISHED"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50"
                        : item.status === "ARCHIVED"
                        ? "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                        : "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50"
                    }`}
                  >
                    {item.status || "DRAFT"}
                  </span>
                </div>
              </div>
              <p className="mt-2 line-clamp-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 break-words leading-relaxed">
                {stripHtml(item.body)}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                {item.category ? (
                  <span className="rounded-md bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800 dark:text-slate-300">
                    {item.category}
                  </span>
                ) : null}
                {item.priority && item.priority !== "NORMAL" ? (
                  <span className="rounded-md bg-rose-50 px-1.5 py-0.5 font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                    {item.priority}
                  </span>
                ) : null}
                {item.target_scope_type ? (
                  <span className="rounded-md bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800 dark:text-slate-300">
                    {item.target_scope_type}
                  </span>
                ) : null}
                <span className="ml-auto text-[11px] text-slate-400">
                  {item.published_at ? "Published" : "Draft"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </IntramuralPage>
  );
};

export default AnnouncementsPage;
