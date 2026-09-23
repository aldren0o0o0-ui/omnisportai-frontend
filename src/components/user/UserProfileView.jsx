import { Camera, PencilLine, ShieldCheck, Star, Trophy, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  getMyProfile,
  getUserProfile,
  likeUserProfile,
  removeUserProfileImage,
  unlikeUserProfile,
  updateMyProfile,
  uploadUserProfileImage,
} from "../../services/userService";
import { resolveMediaUrl } from "../../utils/media";
import StatusBadge from "../common/StatusBadge";

const sectionTitleClass = "text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400";
const cardClass = "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-[var(--surface)]";
const tableWrapClass = "overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700";
const tableClass = "min-w-full divide-y divide-slate-200 dark:divide-slate-700";
const thClass = "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400";
const tdClass = "px-3 py-2 text-sm text-slate-700 dark:text-slate-200";
const chipClass = "rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-200";
const pageTabsBase = [
  { id: "overview", label: "Overview" },
  { id: "participation", label: "Participation" },
  { id: "responsibilities", label: "Responsibilities" },
  { id: "stats", label: "Stats" },
  { id: "activity", label: "Activity" },
];

const formatDate = (value) => {
  if (!value) return "N/A";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return "N/A";
  }
};

const formatDateTime = (value) => {
  if (!value) return "N/A";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "N/A";
  }
};

const toRoleLabel = (value) => {
  const cleaned = String(value || "").replace(/_/g, " ").trim();
  if (!cleaned) return "Role";
  return cleaned
    .split(" ")
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(" ");
};

const toInitials = (name) => {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) return "UP";
  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
};

const asNumber = (value) => Number(value || 0);

const normalizeProfileImagePath = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const slash = raw.replace(/\\/g, "/");
  const staticIndex = slash.indexOf("/static/uploads/");
  if (staticIndex >= 0) return slash.slice(staticIndex);
  if (slash.startsWith("static/uploads/")) return `/${slash}`;
  if (slash.startsWith("/uploads/")) return `/static${slash}`;
  return slash;
};

const safeText = (value, fallback = "N/A") => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || fallback;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return fallback;
    return value.map((item) => safeText(item, "")).filter(Boolean).join(", ") || fallback;
  }
  if (typeof value === "object") {
    const named = value.name || value.label || value.title || value.value;
    if (named !== undefined && named !== null) return safeText(named, fallback);
    return fallback;
  }
  return fallback;
};

const formatScopeLabel = (value, fallback) => {
  const normalized = safeText(value, "").toLowerCase();
  if (!normalized || normalized === "-" || normalized === "n/a") return fallback;
  if (normalized.includes("all")) return fallback;
  return safeText(value, fallback);
};

const formatStatusLabel = (status) => {
  const normalized = String(status || "").trim();
  if (!normalized) return "Unknown";
  return normalized.replace(/_/g, " ");
};

const isOperationalVisibility = (profilePayload) => {
  const visibility = String(profilePayload?.visibility || "").toUpperCase();
  return visibility === "OPERATIONAL" || visibility === "PRIVATE_SELF";
};

const hasPlayerStats = (profilePayload) => {
  const stats = profilePayload?.stats || profilePayload?.player_statistics || {};
  const summary = stats?.summary || {};
  return [
    "matches_played",
    "total_matches",
    "wins",
    "losses",
    "draws",
    "points",
    "assists",
    "fouls",
  ].some((key) => asNumber(summary[key] ?? stats[key]) > 0);
};

const getParticipationRows = (profilePayload) => {
  const participation = Array.isArray(profilePayload?.participation)
    ? profilePayload.participation
    : (Array.isArray(profilePayload?.tournament_participation) ? profilePayload.tournament_participation : []);
  return participation.map((row) => ({
    tournament: safeText(row?.tournament),
    sport: safeText(row?.sport),
    team: safeText(row?.team),
    department: safeText(row?.department),
    rosterStatus: formatStatusLabel(row?.roster_status),
    date: formatDate(row?.season || row?.created_at || row?.approved_at),
  }));
};

const getStatisticsRows = (profilePayload) => {
  const stats = profilePayload?.stats || profilePayload?.player_statistics || {};
  const breakdown = Array.isArray(stats?.sport_breakdown) ? stats.sport_breakdown : [];
  return breakdown.map((row) => ({
    sport: safeText(row?.sport),
    matches: asNumber(row?.matches || row?.total_matches),
    wins: asNumber(row?.wins),
    losses: asNumber(row?.losses),
    draws: asNumber(row?.draws),
    points: asNumber(row?.points),
    assists: asNumber(row?.assists),
    fouls: asNumber(row?.fouls),
  }));
};

const getMatchHistoryRows = (profilePayload) => {
  const history = Array.isArray(profilePayload?.match_history) ? profilePayload.match_history : [];
  return history.map((row) => ({
    rawDate: row?.date || null,
    date: row?.date ? formatDate(row.date) : "N/A",
    tournament: safeText(row?.tournament, "N/A"),
    sport: safeText(row?.sport, "N/A"),
    opponent: safeText(row?.opponent, "N/A"),
    team: safeText(row?.team, "N/A"),
    result: formatStatusLabel(row?.result || "UNKNOWN"),
    resultKey: String(row?.result || "UNKNOWN").trim().toUpperCase(),
    score: row?.score || "N/A",
  }));
};

const getPlayerSummary = (profilePayload) => {
  const stats = profilePayload?.stats || profilePayload?.player_statistics || {};
  const summary = stats?.summary || {};
  return {
    matchesPlayed: asNumber(summary.matches_played ?? stats.total_matches),
    wins: asNumber(summary.wins ?? stats.wins),
    losses: asNumber(summary.losses ?? stats.losses),
    draws: asNumber(summary.draws ?? stats.draws),
    tournamentsJoined: asNumber(summary.tournaments_joined ?? stats.tournaments_joined),
    sportsPlayed: asNumber(summary.sports_played ?? stats.sports_played),
    teamsJoined: asNumber(summary.teams_joined ?? stats.teams_joined),
    points: asNumber(summary.points ?? stats.points),
    assists: asNumber(summary.assists ?? stats.assists),
    fouls: asNumber(summary.fouls ?? stats.fouls),
  };
};

const formatRecord = (summary) => `${asNumber(summary?.wins)}W - ${asNumber(summary?.losses)}L - ${asNumber(summary?.draws)}D`;

const formatStatValue = (value) => {
  if (value === null || value === undefined) return "N/A";
  const numberValue = Number(value);
  if (Number.isNaN(numberValue)) return "N/A";
  return numberValue.toLocaleString();
};

const getWinRate = (summary) => {
  const wins = asNumber(summary?.wins);
  const losses = asNumber(summary?.losses);
  const draws = asNumber(summary?.draws);
  const denominator = wins + losses + draws;
  if (denominator <= 0) return null;
  return Math.round((wins / denominator) * 100);
};

const getResultBadgeType = (result) => {
  const normalized = String(result || "").trim().toUpperCase();
  if (normalized === "WIN") return "win";
  if (normalized === "LOSS") return "loss";
  if (normalized === "DRAW") return "draw";
  if (normalized === "PENDING") return "pending";
  return "unknown";
};

const getFilteredMatchHistory = (rows, filters) => {
  const source = Array.isArray(rows) ? rows : [];
  const resultFilter = String(filters?.result || "ALL").trim().toUpperCase();
  const sportFilter = String(filters?.sport || "ALL").trim().toLowerCase();
  return source.filter((row) => {
    const rowResult = String(row?.resultKey || "").trim().toUpperCase();
    const rowSport = String(row?.sport || "").trim().toLowerCase();
    const resultMatch = (() => {
      if (resultFilter === "ALL") return true;
      if (resultFilter === "PENDING_UNKNOWN") return rowResult === "PENDING" || rowResult === "UNKNOWN";
      return rowResult === resultFilter;
    })();
    const sportMatch = sportFilter === "all" ? true : rowSport === sportFilter;
    return resultMatch && sportMatch;
  });
};

const getAvailableSportsFromHistory = (rows) => {
  const source = Array.isArray(rows) ? rows : [];
  const names = Array.from(
    new Set(
      source
        .map((row) => String(row?.sport || "").trim())
        .filter(Boolean)
    )
  );
  return names.sort((a, b) => a.localeCompare(b));
};

const getCompletedResultSummary = (summary) => {
  const wins = asNumber(summary?.wins);
  const losses = asNumber(summary?.losses);
  const draws = asNumber(summary?.draws);
  const total = wins + losses + draws;
  return {
    wins,
    losses,
    draws,
    total,
  };
};

const getSportParticipationBreakdown = (rows) => {
  const source = Array.isArray(rows) ? rows : [];
  const totalMatches = source.reduce((sum, row) => sum + asNumber(row?.matches), 0);
  return source.map((row) => {
    const matches = asNumber(row?.matches);
    return {
      ...row,
      participationPct: totalMatches > 0 ? Math.round((matches / totalMatches) * 100) : null,
    };
  });
};

const getContributionBySport = (rows) => {
  const source = Array.isArray(rows) ? rows : [];
  const totalPoints = source.reduce((sum, row) => sum + asNumber(row?.points), 0);
  const totalAssists = source.reduce((sum, row) => sum + asNumber(row?.assists), 0);
  const totalFouls = source.reduce((sum, row) => sum + asNumber(row?.fouls), 0);

  const mapped = source.map((row) => ({
    sport: row?.sport || "Unknown",
    points: asNumber(row?.points),
    assists: asNumber(row?.assists),
    fouls: asNumber(row?.fouls),
    pointsPct: totalPoints > 0 ? Math.round((asNumber(row?.points) / totalPoints) * 100) : null,
    assistsPct: totalAssists > 0 ? Math.round((asNumber(row?.assists) / totalAssists) * 100) : null,
    foulsPct: totalFouls > 0 ? Math.round((asNumber(row?.fouls) / totalFouls) * 100) : null,
  }));

  return {
    rows: mapped,
    hasAnyContribution: mapped.some((row) => row.points > 0 || row.assists > 0 || row.fouls > 0),
  };
};

const getMatchTrendRows = (rows, limit = 10) => {
  const source = Array.isArray(rows) ? rows : [];
  return [...source]
    .sort((a, b) => {
      const left = a?.rawDate ? Date.parse(a.rawDate) : 0;
      const right = b?.rawDate ? Date.parse(b.rawDate) : 0;
      return right - left;
    })
    .slice(0, limit);
};

const getRoleAssignmentRows = (profilePayload) => {
  const roles = Array.isArray(profilePayload?.roles) ? profilePayload.roles : [];
  return roles.map((role) => ({
    role: toRoleLabel(role?.role),
    departmentScope: formatScopeLabel(role?.scope?.department, "All departments"),
    sportScope: formatScopeLabel(role?.scope?.sport, "All sports"),
    teamScope: formatScopeLabel(role?.scope?.team, "No team scope"),
    status: formatStatusLabel(role?.status || "ACTIVE"),
  }));
};

const getStaffAssignmentRows = (profilePayload) => {
  const staffAssignments = Array.isArray(profilePayload?.staff_assignments) ? profilePayload.staff_assignments : [];
  return staffAssignments.map((row) => ({
    sport: safeText(row?.sport),
    staffRole: safeText(row?.role, "Staff"),
    status: formatStatusLabel(row?.status || "ACTIVE"),
  }));
};

const getResponsibilityRows = (profilePayload) => {
  const teamManagement = profilePayload?.operational?.team_management || profilePayload?.team_management || {};
  const managedTeams = Array.isArray(teamManagement?.managed_teams) ? teamManagement.managed_teams : [];
  return managedTeams.map((team) => ({
    team: safeText(team?.team_name),
    sport: safeText(team?.sport),
    department: safeText(team?.department),
    rosterCount: asNumber(team?.roster_count),
    responsibility: "Managed Team",
  }));
};

const getActivityRows = (profilePayload) => {
  const activity = Array.isArray(profilePayload?.recent_activity) ? profilePayload.recent_activity : [];
  return activity.map((entry) => ({
    date: formatDateTime(entry?.created_at),
    action: toRoleLabel(entry?.action || "Activity"),
    target: safeText(entry?.target?.name || entry?.target?.email || entry?.target_type, "N/A"),
    reason: safeText(entry?.reason, "N/A"),
  }));
};

const EmptyState = ({ message }) => (
  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600 dark:border-slate-700 dark:bg-[var(--surface-soft)]/50 dark:text-slate-300">
    {message}
  </div>
);

const StatusPill = ({ value }) => {
  const status = formatStatusLabel(value);
  const lower = status.toLowerCase();
  let className = "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-200";
  if (lower.includes("approved") || lower.includes("active")) {
    className = "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300";
  } else if (lower.includes("pending") || lower.includes("review")) {
    className = "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300";
  } else if (lower.includes("rejected") || lower.includes("inactive") || lower.includes("archived")) {
    className = "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300";
  }
  return <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${className}`}>{status}</span>;
};

const UserProfileView = ({ userId = null, mode = "drawer", onClose = null }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const [likeBusy, setLikeBusy] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [matchResultFilter, setMatchResultFilter] = useState("ALL");
  const [matchSportFilter, setMatchSportFilter] = useState("ALL");

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("");
  const [avatarRefreshKey, setAvatarRefreshKey] = useState(0);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

  const normalizedMode = String(mode || "").trim().toLowerCase();
  const isDrawerMode = normalizedMode === "drawer";
  const isSelfMode = normalizedMode === "self" || (normalizedMode === "page" && Number(userId) <= 0);
  const canLoad = useMemo(() => isSelfMode || Number(userId) > 0, [isSelfMode, userId]);

  const loadProfile = async () => {
    if (!canLoad) return;
    setLoading(true);
    setError("");
    setMatchResultFilter("ALL");
    setMatchSportFilter("ALL");
    try {
      const payload = isSelfMode ? await getMyProfile() : await getUserProfile(Number(userId));
      setProfile(payload || null);
    } catch (err) {
      setProfile(null);
      setError(err?.response?.data?.detail || "Unable to load user profile. Try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canLoad, isSelfMode, userId]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreviewUrl("");
      return undefined;
    }
    try {
      const previewUrl = URL.createObjectURL(avatarFile);
      setAvatarPreviewUrl(previewUrl);
      return () => URL.revokeObjectURL(previewUrl);
    } catch {
      setAvatarPreviewUrl("");
      return undefined;
    }
  }, [avatarFile]);

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [profile?.user?.avatar_url, profile?.user?.profile_image_url, avatarRefreshKey]);

  if (!canLoad) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-[var(--surface-soft)]/60 dark:text-slate-300">
        Select a user profile to view details.
      </div>
    );
  }

  if (loading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-[var(--surface)] dark:text-slate-400">Loading profile...</div>;
  }

  if (error) {
    return (
      <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-500/40 dark:bg-rose-500/10">
        <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
        <button
          type="button"
          onClick={() => void loadProfile()}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-[var(--surface-soft)]/60 dark:text-slate-300">
        Profile unavailable.
      </div>
    );
  }

  const visibility = String(profile.visibility || "OPERATIONAL").toUpperCase();
  const isPublicLimited = visibility === "PUBLIC_LIMITED";
  const isPrivateSelf = visibility === "PRIVATE_SELF";
  const canEditSelf = isPrivateSelf || isSelfMode;
  const canShowOperational = isOperationalVisibility(profile);

  const user = profile.user || {};
  const publicProfile = profile.public_profile || {};
  const operational = profile.operational || null;
  const playerProfile = profile.player_profile || null;
  const likes = profile.likes || { count: 0, liked_by_me: false };

  const roleBadges = Array.isArray(user.role_badges)
    ? user.role_badges.filter((item) => String(item || "").trim())
    : [];

  const displayName = safeText(user.display_name || user.full_name, "User Profile");
  const departmentName = safeText(user?.department?.name || publicProfile.department, "Unassigned");
  const bioText = String(publicProfile.bio || user.bio || "").trim() || "No bio added yet.";
  const statusText = user.status || operational?.account?.status || "UNKNOWN";
  const avatarUrl = normalizeProfileImagePath(user.avatar_url || user.profile_image_url || "");
  const resolvedAvatarUrl = avatarUrl ? resolveMediaUrl(avatarUrl) : "";
  const avatarSrc = resolvedAvatarUrl
    ? `${resolvedAvatarUrl}${String(resolvedAvatarUrl).includes("?") ? "&" : "?"}v=${avatarRefreshKey}`
    : "";

  const targetUserId = Number(user.id || userId || 0);
  const canLike = targetUserId > 0 && !canEditSelf;

  const participationRows = getParticipationRows(profile);
  const statsRows = getStatisticsRows(profile);
  const matchHistoryRows = getMatchHistoryRows(profile);
  const roleRows = getRoleAssignmentRows(profile);
  const staffRows = getStaffAssignmentRows(profile);
  const responsibilityRows = getResponsibilityRows(profile);
  const activityRows = getActivityRows(profile);

  const hasStatsSignal = hasPlayerStats(profile);
  const playerSummary = getPlayerSummary(profile);
  const availableSportsFromHistory = getAvailableSportsFromHistory(matchHistoryRows);
  const filteredMatchHistoryRows = getFilteredMatchHistory(matchHistoryRows, {
    result: matchResultFilter,
    sport: matchSportFilter,
  });
  const profileTypeLabel = canEditSelf
    ? "My Profile"
    : isPublicLimited
      ? "Public Profile"
      : (playerProfile ? "Player Profile" : "Operational Profile");

  const kpis = (() => {
    if (playerProfile || hasStatsSignal) {
      return [
        { label: "Matches Played", value: playerSummary.matchesPlayed, icon: Trophy },
        { label: "Wins", value: playerSummary.wins, icon: ShieldCheck },
        { label: "Losses", value: playerSummary.losses, icon: Users },
        { label: "Sports Played", value: playerSummary.sportsPlayed, icon: Star },
      ];
    }
    return [
      { label: "Active Roles", value: roleRows.length, icon: ShieldCheck },
      { label: "Managed Teams", value: responsibilityRows.length, icon: Users },
      { label: "Tournament Participation", value: participationRows.length, icon: Trophy },
      { label: "Staff Assignments", value: staffRows.length, icon: Star },
    ];
  })();

  const tabs = pageTabsBase.filter((tab) => {
    if (tab.id === "activity") return canShowOperational;
    if (tab.id === "responsibilities") return canShowOperational;
    return true;
  });
  const validTabSet = new Set(tabs.map((tab) => tab.id));
  const effectiveTab = validTabSet.has(activeTab) ? activeTab : "overview";

  const handleLikeToggle = async () => {
    if (!canLike || likeBusy || !targetUserId) return;
    setLikeBusy(true);
    setError("");
    try {
      const response = likes.liked_by_me
        ? await unlikeUserProfile(targetUserId)
        : await likeUserProfile(targetUserId);
      setProfile((prev) => (prev ? { ...prev, likes: response?.likes || prev.likes } : prev));
    } catch (err) {
      setError(err?.response?.data?.detail || "Unable to update support for this profile.");
    } finally {
      setLikeBusy(false);
    }
  };

  const openEditModal = () => {
    setEditName(String(user.display_name || user.full_name || ""));
    setEditBio(String(user.bio || publicProfile.bio || ""));
    setAvatarFile(null);
    setEditError("");
    setEditOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!canEditSelf || editBusy) return;
    setEditBusy(true);
    setEditError("");
    try {
      const payload = {};
      const nextName = String(editName || "").trim();
      const currentName = String(user.display_name || user.full_name || "").trim();
      const nextBio = String(editBio || "").trim();
      const currentBio = String(user.bio || publicProfile.bio || "").trim();

      if (nextName && nextName !== currentName) payload.name = nextName;
      if (nextBio !== currentBio) payload.bio = nextBio;

      if (Object.keys(payload).length > 0) {
        await updateMyProfile(payload);
      }

      if (avatarFile) {
        const uploadResponse = await uploadUserProfileImage(targetUserId, avatarFile);
        const nextAvatar = normalizeProfileImagePath(
          uploadResponse?.profile_image_url || uploadResponse?.user?.avatar_url || uploadResponse?.user?.profile_image_url || ""
        );
        if (nextAvatar) {
          setProfile((prev) => (prev ? {
            ...prev,
            user: {
              ...(prev.user || {}),
              avatar_url: nextAvatar,
              profile_image_url: nextAvatar,
            },
          } : prev));
        }
        setAvatarRefreshKey((prev) => prev + 1);
      }

      setAvatarLoadFailed(false);
      setEditOpen(false);
      await loadProfile();
    } catch (err) {
      setEditError(err?.response?.data?.detail || "Unable to save profile updates.");
    } finally {
      setEditBusy(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!canEditSelf || editBusy || !targetUserId) return;
    setEditBusy(true);
    setEditError("");
    try {
      await removeUserProfileImage(targetUserId);
      setProfile((prev) => (prev ? {
        ...prev,
        user: {
          ...(prev.user || {}),
          avatar_url: null,
          profile_image_url: null,
        },
      } : prev));
      setAvatarRefreshKey((prev) => prev + 1);
      setAvatarLoadFailed(false);
      await loadProfile();
    } catch (err) {
      setEditError(err?.response?.data?.detail || "Unable to remove profile photo.");
    } finally {
      setEditBusy(false);
    }
  };

  const HeroSection = ({ compact = false }) => (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-[var(--surface)]">
      <div className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-blue-100/70 blur-3xl dark:bg-blue-500/10" />
      <div className={`relative grid gap-4 ${compact ? "grid-cols-1" : "grid-cols-1 xl:grid-cols-12 xl:items-center"}`}>
        <div className={`${compact ? "" : "xl:col-span-5"} flex min-w-0 items-center gap-4`}>
          <div className={`${compact ? "h-20 w-20" : "h-24 w-24"} shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-[var(--surface-soft)]`}>
            {avatarSrc && !avatarLoadFailed ? (
              <img src={avatarSrc} alt={`${displayName} profile`} className="h-full w-full object-cover" onError={() => setAvatarLoadFailed(true)} />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-slate-600 dark:text-slate-300">
                {toInitials(displayName)}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-2xl font-bold text-slate-900 dark:text-slate-100">{displayName}</h2>
            <p className="truncate text-sm text-slate-600 dark:text-slate-400">{departmentName}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className={chipClass}>{profileTypeLabel}</span>
              <span className={chipClass}>{visibility === "PRIVATE_SELF" ? "Private Self" : visibility === "OPERATIONAL" ? "Operational" : "Public Limited"}</span>
              {roleBadges.slice(0, 3).map((badge, index) => (
                <span key={`hero-badge-${index}`} className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-200">
                  {toRoleLabel(badge)}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className={`${compact ? "" : "xl:col-span-4"} text-sm text-slate-700 dark:text-slate-300`}>
          <p className="leading-6">{bioText}</p>
          <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            {asNumber(likes.count)} supporter{asNumber(likes.count) === 1 ? "" : "s"}
          </p>
        </div>

        <div className={`${compact ? "" : "xl:col-span-3"} flex flex-wrap items-center gap-2 xl:justify-end`}>
          {canShowOperational ? <StatusBadge status={statusText} /> : null}
          {canLike ? (
            <button
              type="button"
              onClick={() => void handleLikeToggle()}
              disabled={likeBusy}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                likes.liked_by_me
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-300"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-200 dark:hover:bg-slate-700"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {likeBusy ? "Updating..." : (likes.liked_by_me ? "Liked" : "Like")}
            </button>
          ) : null}
          {canEditSelf ? (
            <button
              type="button"
              onClick={openEditModal}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <PencilLine size={15} />
              Edit Profile
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );

  const KpiSection = ({ compact = false }) => (
    <div className={`grid gap-3 ${compact ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-4"}`}>
      {kpis.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className={cardClass}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{item.label}</p>
              <Icon size={15} className="text-blue-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{item.value}</p>
          </div>
        );
      })}
    </div>
  );

  const OverviewTab = () => (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className={cardClass}>
        <p className={sectionTitleClass}>Account Details</p>
        <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
          <p><span className="text-slate-500 dark:text-slate-400">Name:</span> {displayName}</p>
          <p><span className="text-slate-500 dark:text-slate-400">Department:</span> {departmentName}</p>
          {canShowOperational ? <p><span className="text-slate-500 dark:text-slate-400">Email:</span> {safeText(user.email || operational?.account?.email)}</p> : null}
          {canShowOperational ? <p><span className="text-slate-500 dark:text-slate-400">Status:</span> {safeText(statusText)}</p> : null}
          {canShowOperational ? <p><span className="text-slate-500 dark:text-slate-400">Joined:</span> {formatDateTime(user.created_at || operational?.account?.created_at)}</p> : null}
        </div>
      </div>

      <div className={cardClass}>
        <p className={sectionTitleClass}>Player Profile</p>
        {playerProfile ? (
          <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
            <p><span className="text-slate-500 dark:text-slate-400">Player:</span> {safeText(playerProfile.full_name, "Player")}</p>
            <p><span className="text-slate-500 dark:text-slate-400">Student ID:</span> {safeText(playerProfile.student_id)}</p>
            <p><span className="text-slate-500 dark:text-slate-400">Link Type:</span> {playerProfile.is_possible_match ? "Possible Player Record" : "Linked Player Record"}</p>
          </div>
        ) : (
          <EmptyState message="No player profile linked." />
        )}
      </div>

      <div className={cardClass}>
        <p className={sectionTitleClass}>Current Role</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(roleBadges.length > 0 ? roleBadges : ["Participant"]).map((badge, index) => (
            <span key={`overview-role-${index}`} className={chipClass}>{toRoleLabel(badge)}</span>
          ))}
        </div>
      </div>

      <div className={cardClass}>
        <p className={sectionTitleClass}>Latest Participation</p>
        {participationRows.length === 0 ? (
          <EmptyState message="No tournament participation found." />
        ) : (
          <div className="mt-3 space-y-1 text-sm text-slate-700 dark:text-slate-200">
            <p className="font-semibold text-slate-900 dark:text-slate-100">{participationRows[0].team}</p>
            <p>{participationRows[0].tournament}</p>
            <p>{participationRows[0].sport} | {participationRows[0].department}</p>
          </div>
        )}
      </div>
    </div>
  );

  const ParticipationTab = () => (
    <div className={cardClass}>
      <p className={sectionTitleClass}>Tournament Participation</p>
      {participationRows.length === 0 ? (
        <div className="mt-3"><EmptyState message="No tournament participation found." /></div>
      ) : (
        <div className="mt-3">
          <div className={tableWrapClass}>
            <table className={tableClass}>
              <thead className="bg-slate-50 dark:bg-[var(--surface-soft)]/70">
                <tr>
                  <th className={thClass}>Tournament</th>
                  <th className={thClass}>Sport</th>
                  <th className={thClass}>Team</th>
                  <th className={thClass}>Department</th>
                  <th className={thClass}>Roster Status</th>
                  <th className={thClass}>Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {participationRows.map((row, index) => (
                  <tr key={`participation-row-${index}`}>
                    <td className={tdClass}>{row.tournament}</td>
                    <td className={tdClass}>{row.sport}</td>
                    <td className={tdClass}>{row.team}</td>
                    <td className={tdClass}>{row.department}</td>
                    <td className={tdClass}><StatusPill value={row.rosterStatus} /></td>
                    <td className={tdClass}>{row.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  const ResponsibilitiesTab = () => (
    <div className="space-y-4">
      {roleRows.length === 0 && staffRows.length === 0 && responsibilityRows.length === 0 ? (
        <EmptyState message="No operational responsibilities assigned." />
      ) : null}

      {roleRows.length > 0 ? (
        <div className={cardClass}>
          <p className={sectionTitleClass}>Role Assignments</p>
          <div className="mt-3">
            <div className={tableWrapClass}>
              <table className={tableClass}>
                <thead className="bg-slate-50 dark:bg-[var(--surface-soft)]/70">
                  <tr>
                    <th className={thClass}>Role</th>
                    <th className={thClass}>Department Scope</th>
                    <th className={thClass}>Sport Scope</th>
                    <th className={thClass}>Team Scope</th>
                    <th className={thClass}>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {roleRows.map((row, index) => (
                    <tr key={`role-row-${index}`}>
                      <td className={tdClass}>{row.role}</td>
                      <td className={tdClass}>{row.departmentScope}</td>
                      <td className={tdClass}>{row.sportScope}</td>
                      <td className={tdClass}>{row.teamScope}</td>
                      <td className={tdClass}><StatusPill value={row.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {staffRows.length > 0 ? (
        <div className={cardClass}>
          <p className={sectionTitleClass}>Staff Assignments</p>
          <div className="mt-3">
            <div className={tableWrapClass}>
              <table className={tableClass}>
                <thead className="bg-slate-50 dark:bg-[var(--surface-soft)]/70">
                  <tr>
                    <th className={thClass}>Sport</th>
                    <th className={thClass}>Staff Role</th>
                    <th className={thClass}>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {staffRows.map((row, index) => (
                    <tr key={`staff-row-${index}`}>
                      <td className={tdClass}>{row.sport}</td>
                      <td className={tdClass}>{row.staffRole}</td>
                      <td className={tdClass}><StatusPill value={row.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {responsibilityRows.length > 0 ? (
        <div className={cardClass}>
          <p className={sectionTitleClass}>Team Responsibilities</p>
          <div className="mt-3">
            <div className={tableWrapClass}>
              <table className={tableClass}>
                <thead className="bg-slate-50 dark:bg-[var(--surface-soft)]/70">
                  <tr>
                    <th className={thClass}>Team</th>
                    <th className={thClass}>Sport</th>
                    <th className={thClass}>Department</th>
                    <th className={thClass}>Roster Count</th>
                    <th className={thClass}>Responsibility</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {responsibilityRows.map((row, index) => (
                    <tr key={`resp-row-${index}`}>
                      <td className={tdClass}>{row.team}</td>
                      <td className={tdClass}>{row.sport}</td>
                      <td className={tdClass}>{row.department}</td>
                      <td className={tdClass}>{row.rosterCount}</td>
                      <td className={tdClass}>{row.responsibility}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );

  const StatsTab = () => {
    const sportPointTotal = statsRows.reduce((sum, row) => sum + asNumber(row.points), 0);
    const completedResults = getCompletedResultSummary(playerSummary);
    const sportParticipationRows = getSportParticipationBreakdown(statsRows);
    const contributionBySport = getContributionBySport(statsRows);
    const trendRows = getMatchTrendRows(matchHistoryRows, 8);
    const summaryCards = [
      { label: "Matches Played", value: formatStatValue(playerSummary.matchesPlayed) },
      { label: "Record", value: formatRecord(playerSummary) },
      { label: "Tournaments Joined", value: formatStatValue(playerSummary.tournamentsJoined) },
      { label: "Sports Played", value: formatStatValue(playerSummary.sportsPlayed) },
      { label: "Points", value: formatStatValue(playerSummary.points) },
      { label: "Assists", value: formatStatValue(playerSummary.assists) },
      { label: "Fouls", value: formatStatValue(playerSummary.fouls) },
    ];

    const renderResultBadge = (resultValue) => {
      const badgeType = getResultBadgeType(resultValue);
      let className = "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-[var(--surface-soft)] dark:text-slate-200";
      if (badgeType === "win") className = "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300";
      if (badgeType === "loss") className = "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300";
      if (badgeType === "draw") className = "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300";
      if (badgeType === "pending") className = "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300";
      return (
        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${className}`}>
          {formatStatusLabel(resultValue)}
        </span>
      );
    };

    return (
      <div className="space-y-4">
        {!playerProfile && !hasStatsSignal ? (
          <EmptyState message="No player profile linked." />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {summaryCards.map((card) => (
                <div key={card.label} className={cardClass}>
                  <p className={sectionTitleClass}>{card.label}</p>
                  <p className="mt-2 text-xl font-bold text-slate-900 dark:text-slate-100">{card.value}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className={cardClass}>
                <p className={sectionTitleClass}>Performance Overview</p>
                {completedResults.total <= 0 ? (
                  <div className="mt-3">
                    <EmptyState message="No completed match results yet." />
                  </div>
                ) : (
                  <div className="mt-3 space-y-3">
                    <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                      <div className="flex h-full w-full">
                        <div
                          className="h-full bg-emerald-500"
                          style={{ width: `${Math.round((completedResults.wins / completedResults.total) * 100)}%` }}
                        />
                        <div
                          className="h-full bg-rose-500"
                          style={{ width: `${Math.round((completedResults.losses / completedResults.total) * 100)}%` }}
                        />
                        <div
                          className="h-full bg-blue-500"
                          style={{ width: `${Math.round((completedResults.draws / completedResults.total) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300">
                        Wins: {completedResults.wins}
                      </div>
                      <div className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
                        Losses: {completedResults.losses}
                      </div>
                      <div className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-1.5 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300">
                        Draws: {completedResults.draws}
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Sport Participation Breakdown</p>
                  {sportParticipationRows.length === 0 ? (
                    <div className="mt-2">
                      <EmptyState message="No sport breakdown available." />
                    </div>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {sportParticipationRows.map((row, index) => (
                        <div key={`sport-participation-${index}`}>
                          <div className="mb-1 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                            <span className="font-medium">{row.sport}</span>
                            <span>{formatStatValue(row.matches)} match(es){row.participationPct === null ? "" : ` • ${row.participationPct}%`}</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                            <div
                              className="h-full rounded-full bg-indigo-500"
                              style={{ width: `${row.participationPct === null ? 0 : row.participationPct}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className={cardClass}>
                <p className={sectionTitleClass}>Contribution By Sport</p>
                {!contributionBySport.hasAnyContribution ? (
                  <div className="mt-3">
                    <EmptyState message="No recorded contribution stats yet." />
                  </div>
                ) : (
                  <div className="mt-3 space-y-3">
                    {contributionBySport.rows.map((row, index) => (
                      <div key={`contribution-row-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-[var(--surface-soft)]/60">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{row.sport}</p>
                        <div className="mt-2 space-y-2">
                          <div>
                            <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                              <span>Points</span>
                              <span>{formatStatValue(row.points)}{row.pointsPct === null ? "" : ` • ${row.pointsPct}%`}</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                              <div className="h-full rounded-full bg-blue-500" style={{ width: `${row.pointsPct === null ? 0 : row.pointsPct}%` }} />
                            </div>
                          </div>
                          <div>
                            <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                              <span>Assists</span>
                              <span>{formatStatValue(row.assists)}{row.assistsPct === null ? "" : ` • ${row.assistsPct}%`}</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${row.assistsPct === null ? 0 : row.assistsPct}%` }} />
                            </div>
                          </div>
                          <div>
                            <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                              <span>Fouls</span>
                              <span>{formatStatValue(row.fouls)}{row.foulsPct === null ? "" : ` • ${row.foulsPct}%`}</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                              <div className="h-full rounded-full bg-amber-500" style={{ width: `${row.foulsPct === null ? 0 : row.foulsPct}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!isPublicLimited ? (
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Recent Result Trend</p>
                    {trendRows.length === 0 ? (
                      <div className="mt-2">
                        <EmptyState message="Not enough match data for trends." />
                      </div>
                    ) : (
                      <div className="mt-2 space-y-2">
                        <div className="flex flex-wrap gap-1.5">
                          {trendRows.map((row, index) => (
                            <span key={`trend-badge-${index}`}>{renderResultBadge(row.result)}</span>
                          ))}
                        </div>
                        <div className="space-y-1">
                          {trendRows.slice(0, 5).map((row, index) => (
                            <div key={`trend-item-${index}`} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-[var(--surface)]">
                              <span className="truncate text-slate-700 dark:text-slate-200">
                                {row.sport} vs {row.opponent}
                              </span>
                              <span className="shrink-0 text-slate-500 dark:text-slate-400">{row.score}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>

            {statsRows.length === 0 ? (
              <EmptyState message="No recorded player statistics yet." />
            ) : (
              <>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {statsRows.map((row, index) => {
                    const rowWinRate = getWinRate({
                      wins: row.wins,
                      losses: row.losses,
                      draws: row.draws,
                    });
                    const pointsContribution = sportPointTotal > 0 ? Math.round((asNumber(row.points) / sportPointTotal) * 100) : null;
                    return (
                      <div key={`sport-card-${index}`} className={cardClass}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{row.sport}</p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {formatStatValue(row.matches)} matches | {formatRecord(row)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-600 dark:text-slate-300">
                          <div>
                            <p className="text-slate-500 dark:text-slate-400">Points</p>
                            <p className="font-semibold text-slate-900 dark:text-slate-100">{formatStatValue(row.points)}</p>
                          </div>
                          <div>
                            <p className="text-slate-500 dark:text-slate-400">Assists</p>
                            <p className="font-semibold text-slate-900 dark:text-slate-100">{formatStatValue(row.assists)}</p>
                          </div>
                          <div>
                            <p className="text-slate-500 dark:text-slate-400">Fouls</p>
                            <p className="font-semibold text-slate-900 dark:text-slate-100">{formatStatValue(row.fouls)}</p>
                          </div>
                        </div>

                        <div className="mt-3 space-y-2">
                          <div>
                            <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                              <span>Win rate</span>
                              <span>{rowWinRate === null ? "Not enough match data" : `${rowWinRate}%`}</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                              <div
                                className="h-full rounded-full bg-emerald-500 transition-all"
                                style={{ width: `${rowWinRate === null ? 0 : rowWinRate}%` }}
                              />
                            </div>
                          </div>
                          <div>
                            <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                              <span>Point contribution</span>
                              <span>{pointsContribution === null ? "N/A" : `${pointsContribution}%`}</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                              <div
                                className="h-full rounded-full bg-blue-500 transition-all"
                                style={{ width: `${pointsContribution === null ? 0 : pointsContribution}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className={cardClass}>
                  <p className={sectionTitleClass}>Statistics By Sport</p>
                  <div className="mt-3">
                    <div className={tableWrapClass}>
                      <table className={tableClass}>
                        <thead className="bg-slate-50 dark:bg-[var(--surface-soft)]/70">
                          <tr>
                            <th className={thClass}>Sport</th>
                            <th className={thClass}>Matches</th>
                            <th className={thClass}>Wins</th>
                            <th className={thClass}>Losses</th>
                            <th className={thClass}>Draws</th>
                            <th className={thClass}>Points</th>
                            <th className={thClass}>Assists</th>
                            <th className={thClass}>Fouls</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                          {statsRows.map((row, index) => (
                            <tr key={`stats-row-${index}`}>
                              <td className={tdClass}>{row.sport}</td>
                              <td className={tdClass}>{formatStatValue(row.matches)}</td>
                              <td className={tdClass}>{formatStatValue(row.wins)}</td>
                              <td className={tdClass}>{formatStatValue(row.losses)}</td>
                              <td className={tdClass}>{formatStatValue(row.draws)}</td>
                              <td className={tdClass}>{formatStatValue(row.points)}</td>
                              <td className={tdClass}>{formatStatValue(row.assists)}</td>
                              <td className={tdClass}>{formatStatValue(row.fouls)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        <div className={cardClass}>
          <p className={sectionTitleClass}>Match History</p>
          {isPublicLimited ? (
            <div className="mt-3">
              <EmptyState message="Match history is private for this profile view." />
            </div>
          ) : (
            <>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {[
                  { id: "ALL", label: "All" },
                  { id: "WIN", label: "Wins" },
                  { id: "LOSS", label: "Losses" },
                  { id: "DRAW", label: "Draws" },
                  { id: "PENDING_UNKNOWN", label: "Pending/Unknown" },
                ].map((filterItem) => (
                  <button
                    key={`result-filter-${filterItem.id}`}
                    type="button"
                    onClick={() => setMatchResultFilter(filterItem.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      matchResultFilter === filterItem.id
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {filterItem.label}
                  </button>
                ))}

                {availableSportsFromHistory.length > 0 ? (
                  <select
                    value={matchSportFilter}
                    onChange={(event) => setMatchSportFilter(event.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-200"
                  >
                    <option value="ALL">All Sports</option>
                    {availableSportsFromHistory.map((sportName) => (
                      <option key={`sport-filter-${sportName}`} value={sportName}>
                        {sportName}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>

              {filteredMatchHistoryRows.length === 0 ? (
                <div className="mt-3">
                  <EmptyState message="No match history found for this filter." />
                </div>
              ) : (
                <div className="mt-3">
                  <div className={tableWrapClass}>
                    <table className={tableClass}>
                      <thead className="bg-slate-50 dark:bg-[var(--surface-soft)]/70">
                        <tr>
                          <th className={thClass}>Date</th>
                          <th className={thClass}>Tournament</th>
                          <th className={thClass}>Sport</th>
                          <th className={thClass}>Opponent</th>
                          <th className={thClass}>Team</th>
                          <th className={thClass}>Result</th>
                          <th className={thClass}>Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {filteredMatchHistoryRows.map((row, index) => (
                          <tr key={`match-history-row-${index}`}>
                            <td className={tdClass}>{row.date}</td>
                            <td className={tdClass}>{row.tournament}</td>
                            <td className={tdClass}>{row.sport}</td>
                            <td className={tdClass}>{row.opponent}</td>
                            <td className={tdClass}>{row.team}</td>
                            <td className={tdClass}>{renderResultBadge(row.result)}</td>
                            <td className={tdClass}>{row.score}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };
  const ActivityTab = () => (
    <div className={cardClass}>
      <p className={sectionTitleClass}>Recent Activity</p>
      {activityRows.length === 0 ? (
        <div className="mt-3"><EmptyState message="No recent activity found." /></div>
      ) : (
        <div className="mt-3">
          <div className={tableWrapClass}>
            <table className={tableClass}>
              <thead className="bg-slate-50 dark:bg-[var(--surface-soft)]/70">
                <tr>
                  <th className={thClass}>Date</th>
                  <th className={thClass}>Action</th>
                  <th className={thClass}>Target</th>
                  <th className={thClass}>Reason/Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {activityRows.map((row, index) => (
                  <tr key={`activity-row-${index}`}>
                    <td className={tdClass}>{row.date}</td>
                    <td className={tdClass}>{row.action}</td>
                    <td className={tdClass}>{row.target}</td>
                    <td className={tdClass}>{row.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  const renderTabContent = () => {
    if (effectiveTab === "overview") return <OverviewTab />;
    if (effectiveTab === "participation") return <ParticipationTab />;
    if (effectiveTab === "responsibilities") return <ResponsibilitiesTab />;
    if (effectiveTab === "stats") return <StatsTab />;
    if (effectiveTab === "activity") return <ActivityTab />;
    return <OverviewTab />;
  };

  return (
    <div className={`space-y-4 ${isDrawerMode ? "" : "mx-auto w-full max-w-7xl"}`}>
      {isDrawerMode ? (
        <>
          <HeroSection compact />
          <KpiSection compact />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className={cardClass}>
              <p className={sectionTitleClass}>Participation Summary</p>
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{participationRows.length} participation record(s)</p>
            </div>
            <div className={cardClass}>
              <p className={sectionTitleClass}>Stats Summary</p>
              {playerProfile ? (
                <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
                  Matches: {playerSummary.matchesPlayed} | Wins: {playerSummary.wins}
                </p>
              ) : (
                <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">No player profile linked.</p>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          <HeroSection />
          <KpiSection />
          <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-[var(--surface)]">
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    effectiveTab === tab.id
                      ? "bg-blue-600 text-white"
                      : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          {renderTabContent()}
        </>
      )}

      {typeof onClose === "function" ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Close
          </button>
        </div>
      ) : null}

      {editOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xl dark:border-slate-700 dark:bg-[var(--surface)]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Edit Profile</h3>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Close
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700 dark:text-slate-200">Display Name</span>
                <input
                  type="text"
                  value={editName}
                  maxLength={120}
                  onChange={(event) => setEditName(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-100"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700 dark:text-slate-200">Bio</span>
                <textarea
                  value={editBio}
                  maxLength={512}
                  onChange={(event) => setEditBio(event.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-100"
                  placeholder="Tell others about your sports participation"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-200">
                  <Camera size={14} />
                  Profile Photo
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => setAvatarFile(event.target.files?.[0] || null)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-blue-700 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-200 dark:file:bg-blue-500/10 dark:file:text-blue-200"
                />
              </label>

              {avatarPreviewUrl ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-[var(--surface-soft)]/60">
                  <p className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">Preview</p>
                  <img src={avatarPreviewUrl} alt="Selected profile preview" className="h-28 w-28 rounded-full border border-slate-200 object-cover dark:border-slate-700" />
                </div>
              ) : null}

              {avatarUrl ? (
                <button
                  type="button"
                  onClick={() => void handleRemoveAvatar()}
                  disabled={editBusy}
                  className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300"
                >
                  Remove Profile Photo
                </button>
              ) : null}

              {editError ? (
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
                  {editError}
                </p>
              ) : null}

              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="min-h-10 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveProfile()}
                  disabled={editBusy}
                  className="min-h-10 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {editBusy ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default UserProfileView;


