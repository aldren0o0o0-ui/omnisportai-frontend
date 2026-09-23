import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Activity, CalendarClock, Mail, Shield, Sparkles, User } from "lucide-react";
import RechartsChartCard from "../../components/dashboard/role_dashboard/RechartsChartCard";
import RoleDataTable from "../../components/dashboard/role_dashboard/RoleDataTable";
import ImageUploadField from "../../components/common/ImageUploadField";
import DashboardCard from "../../components/common/DashboardCard";
import StatusBadge from "../../components/common/StatusBadge";
import SectionTabs from "../../components/common/SectionTabs";
import LoadingState from "../../components/common/LoadingState";
import EmptyState from "../../components/common/EmptyState";
import { getMyRoleProfile, removeUserProfileImage, uploadUserProfileImage } from "../../services/userService";
import useTournamentAccess from "../../hooks/useTournamentAccess";
import { getSelectedIntramuralRoleLabels } from "../../utils/tournamentAccess";

const tabLabels = {
  overview: "Overview",
  analytics: "Analytics",
  activity: "Activity",
};

const resolveRoleContextFromPath = (pathname = "") => {
  if (pathname === "/dashboard" || pathname.startsWith("/coordinator")) return "coordinator";
  if (pathname.startsWith("/department")) return "department";
  if (pathname.startsWith("/sport-facilitator")) return "sport-facilitator";
  if (pathname.startsWith("/coach")) return "coach";
  if (pathname.startsWith("/viewer")) return "viewer";
  return null;
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString();
};


const ProfilePage = () => {
  const location = useLocation();
  const tournamentAccess = useTournamentAccess();
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [imageError, setImageError] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  const roleContext = useMemo(
    () => resolveRoleContextFromPath(location.pathname),
    [location.pathname]
  );

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const payload = await getMyRoleProfile({ roleContext });
        if (!active) return;
        setProfile(payload);
        const tabs = Array.isArray(payload?.role_profile?.tabs) ? payload.role_profile.tabs : [];
        setActiveTab(tabs.includes("overview") ? "overview" : tabs[0] || "overview");
      } catch (requestError) {
        if (!active) return;
        setProfile(null);
        setError(
          requestError?.response?.data?.detail || "Unable to load profile analytics."
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [roleContext]);

  const baseProfile = profile?.base_profile || {};
  const roleProfile = profile?.role_profile || {};
  const basic = baseProfile.basic_info || {};
  const system = baseProfile.system_info || {};
  const tabs = Array.isArray(roleProfile.tabs) && roleProfile.tabs.length > 0
    ? roleProfile.tabs
    : ["overview", "analytics", "activity"];
  const section = roleProfile?.[activeTab] || {};
  const roleBadges = Array.isArray(basic.role_badges) ? basic.role_badges : [];
  const charts = Array.isArray(section.charts) ? section.charts : [];
  const tables = Array.isArray(section.tables) ? section.tables : [];
  const kpis = Array.isArray(section.kpis) ? section.kpis : [];
  const timeline = Array.isArray(section.timeline) ? section.timeline : [];
  const listGroups = Array.isArray(section.list_groups) ? section.list_groups : [];
  const aiInsights = Array.isArray(roleProfile.ai_insights) ? roleProfile.ai_insights : [];
  const currentUserId = Number(profile?.user?.id || 0);
  const currentProfileImageUrl = basic.profile_picture_url || profile?.user?.profile_image_url || "";
  const scopedLabels = getSelectedIntramuralRoleLabels(tournamentAccess.tournamentAccess, tournamentAccess.selectedTournamentName);
  const currentRoleLabel = tournamentAccess.hasSelectedTournament
    ? tournamentAccess.loading ? "Checking access…" : scopedLabels.role
    : roleProfile.active_role_label || "Profile";

  const syncProfileImage = (nextImageUrl) => {
    setProfile((prev) => {
      if (!prev || typeof prev !== "object") return prev;
      return {
        ...prev,
        user: {
          ...(prev.user || {}),
          profile_image_url: nextImageUrl || null,
        },
        base_profile: {
          ...(prev.base_profile || {}),
          basic_info: {
            ...((prev.base_profile || {}).basic_info || {}),
            profile_picture_url: nextImageUrl || null,
          },
        },
      };
    });
    window.dispatchEvent(new CustomEvent("omnisport:profile-updated", {
      detail: { profile_image_url: nextImageUrl || null, name: basic.full_name || profile?.user?.name || "" },
    }));
  };

  const handleUploadProfileImage = async (file) => {
    if (!currentUserId) return;
    setUploadingImage(true);
    setImageError("");
    try {
      const response = await uploadUserProfileImage(currentUserId, file);
      syncProfileImage(response?.profile_image_url || null);
    } catch (uploadError) {
      setImageError(uploadError?.response?.data?.detail || "Failed to upload profile image.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveProfileImage = async () => {
    if (!currentUserId) return;
    setUploadingImage(true);
    setImageError("");
    try {
      await removeUserProfileImage(currentUserId);
      syncProfileImage(null);
    } catch (removeError) {
      setImageError(removeError?.response?.data?.detail || "Failed to remove profile image.");
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <div className="os-page-shell">
      <DashboardCard className="relative overflow-hidden bg-white dark:bg-[var(--surface)] border-none shadow-sm pb-8 pt-8">
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-[var(--surface-soft)] dark:text-slate-300">
              <User size={36} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {basic.full_name || "Profile"}
              </h1>
              <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                Your access for {tournamentAccess.hasSelectedTournament ? scopedLabels.intramural : "the selected intramural"}.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-200">
              <Shield size={14} />
              {currentRoleLabel}
            </span>
            {tournamentAccess.hasSelectedTournament && scopedLabels.assignment ? (
              <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200">
                {scopedLabels.assignment}
              </span>
            ) : null}
            <StatusBadge status={basic.status || "ACTIVE"} />
          </div>
        </div>
      </DashboardCard>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      {loading ? (
        <LoadingState message="Loading role-aware profile..." />
      ) : (
        <>
          <section className="grid gap-6 xl:grid-cols-[1.3fr,1fr]">
            <DashboardCard title="Base Profile">
              <div className="mt-2">
                <ImageUploadField
                  label="Profile Photo"
                  imageUrl={currentProfileImageUrl}
                  fallbackLabel={basic.full_name || "User"}
                  onUpload={handleUploadProfileImage}
                  onRemove={handleRemoveProfileImage}
                  uploading={uploadingImage}
                  error={imageError}
                  kind="avatar"
                  scale="xl"
                />
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700/50 dark:bg-[var(--surface-soft)]/50">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Full Name</div>
                  <div className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{basic.full_name || "-"}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700/50 dark:bg-[var(--surface-soft)]/50">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Department</div>
                  <div className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                    {basic?.department?.name || basic?.department?.code || "Not assigned"}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2 dark:border-slate-700/50 dark:bg-[var(--surface-soft)]/50">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <Mail size={14} />
                    Email
                  </div>
                  <div className="mt-1 break-all text-sm font-medium text-slate-900 dark:text-slate-100">
                    {basic.email || "-"}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2 dark:border-slate-700/50 dark:bg-[var(--surface-soft)]/50">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Account Eligibility</div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">These roles may apply only to specific intramurals. Your current access is shown at the top.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {roleBadges.length === 0 ? (
                      <span className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-500 dark:border-slate-600 dark:bg-[var(--surface-soft)] dark:text-slate-400">
                        No roles
                      </span>
                    ) : (
                      roleBadges.map((badge) => (
                        <span
                          key={badge}
                          className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-300"
                        >
                          {badge}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </DashboardCard>

            <DashboardCard title="System Info">
              <div className="mt-2 space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700/50 dark:bg-[var(--surface-soft)]/50">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Date Joined</div>
                  <div className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-200">
                    {formatDateTime(system.date_joined)}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700/50 dark:bg-[var(--surface-soft)]/50">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Last Active</div>
                  <div className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-200">
                    {formatDateTime(system.last_active)}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700/50 dark:bg-[var(--surface-soft)]/50">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <CalendarClock size={14} />
                    Account Status
                  </div>
                  <div className="mt-2">
                    <StatusBadge status={system.account_status || "-"} />
                  </div>
                </div>
              </div>
            </DashboardCard>
          </section>

          <SectionTabs
            tabs={tabs.map((key) => ({ key, label: tabLabels[key] || key }))}
            activeTab={activeTab}
            onChange={setActiveTab}
          />

          <div className="mt-6 space-y-6">
            {section.description ? (
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-300">
                {section.description}
              </div>
            ) : null}

            {kpis.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {kpis.map((item, index) => (
                  <div
                    key={`${item.label}-${index}`}
                    className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[var(--surface)]"
                  >
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{item.label}</div>
                    <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{item.value}</div>
                    {item.hint ? (
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-500">{item.hint}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            {charts.length > 0 ? (
              <div className="grid gap-6 xl:grid-cols-2">
                {charts.map((chart) => (
                  <RechartsChartCard key={chart.id || chart.title} chart={chart} />
                ))}
              </div>
            ) : null}

            {tables.length > 0 ? (
              <div className="grid gap-6 xl:grid-cols-2">
                {tables.map((table) => (
                  <RoleDataTable key={table.id || table.title} table={table} />
                ))}
              </div>
            ) : null}

            {listGroups.length > 0 ? (
              <div className="grid gap-6 xl:grid-cols-2">
                {listGroups.map((group, index) => (
                  <DashboardCard
                    key={`${group.title || "list-group"}-${index}`}
                    title={group.title || "Highlights"}
                  >
                    <div className="mt-2 space-y-3">
                      {(Array.isArray(group.items) ? group.items : []).map((item) => (
                        <div key={item} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-medium text-slate-800 dark:border-slate-700/50 dark:bg-[var(--surface-soft)]/50 dark:text-slate-200">
                          {item}
                        </div>
                      ))}
                    </div>
                  </DashboardCard>
                ))}
              </div>
            ) : null}

            {timeline.length > 0 ? (
              <DashboardCard title="Activity Timeline">
                <div className="mt-2 space-y-4">
                  {timeline.map((entry, index) => (
                    <div
                      key={`${entry.title || "timeline"}-${index}`}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700/50 dark:bg-[var(--surface-soft)]/50"
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{entry.title || "-"}</span>
                        {entry.tag ? (
                          <span className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-xs font-semibold text-slate-600 dark:border-slate-600 dark:bg-[var(--surface-soft)] dark:text-slate-300">
                            {entry.tag}
                          </span>
                        ) : null}
                      </div>
                      {entry.detail ? (
                        <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">{entry.detail}</div>
                      ) : null}
                      <div className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">{formatDateTime(entry.timestamp)}</div>
                    </div>
                  ))}
                </div>
              </DashboardCard>
            ) : null}
          </div>

          {aiInsights.length > 0 && (
            <DashboardCard className="mt-6 border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-[var(--surface)]">
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                <Sparkles size={16} />
                AI Insights
              </h3>
              <div className="mt-4 space-y-3">
                {aiInsights.map((insight, index) => (
                  <div
                    key={`insight-${index}`}
                    className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-sm dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-300"
                  >
                    {insight}
                  </div>
                ))}
              </div>
            </DashboardCard>
          )}
        </>
      )}
    </div>
  );
};

export default ProfilePage;
