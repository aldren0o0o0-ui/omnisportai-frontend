import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  Calendar,
  CheckCheck,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  LogOut,
  Megaphone,
  Menu,
  Moon,
  Search,
  Settings,
  Sun,
  Trophy,
  Users,
  X,
} from "lucide-react";
import AppModal from "../common/AppModal";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { searchGlobal } from "../../services/intelligenceService";
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead
} from "../../services/notification/notificationService";
import { getRelatedNotificationPath } from "../../utils/notificationRouting";
import { resolveMediaUrl } from "../../utils/media";
import { getMyProfile } from "../../services/userService";
import { setupForegroundPushListener, getBrowserNotificationPermission } from "../../services/notification/browserPushService";
import IntramuralDropdown from "./IntramuralDropdown";
import { useProfileDrawer } from "../profile";
import useTournamentAccess from "../../hooks/useTournamentAccess";
import {
  getSelectedIntramuralRoleLabels,
  getTournamentRoleLabels,
  requestTournamentAccessRefresh,
} from "../../utils/tournamentAccess";

const EMPTY_SEARCH_RESULT = {
  players: [],
  teams: [],
  matches: [],
  tournaments: [],
};

const toDisplayType = (value) =>
  String(value || "")
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ") || "Notification";

const isReminderNotification = (item) =>
  ["MATCH_REMINDER", "TRYOUT_REMINDER", "MATCH_STARTING_NOW"].includes(String(item?.event_type || "").trim().toUpperCase());

const showDesktopNotification = (title, body, tag = undefined) => {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(title, { body, icon: "/favicon.ico", tag });
      });
    } else {
      new Notification(title, { body, icon: "/favicon.ico", tag });
    }
  } catch (err) {
    console.warn("Could not display browser notification:", err);
  }
};

const reminderLeadLabel = (item) => {
  const eventType = String(item?.event_type || "").trim().toUpperCase();
  const minutes = Number(item?.metadata?.reminder_minutes_before);
  const subject = eventType === "TRYOUT_REMINDER" ? "Tryout" : "Match";
  if (!Number.isFinite(minutes) || minutes <= 0) return `${subject} starts now`;
  if (minutes === 60) return "Reminder: 1 hour before";
  if (minutes === 120) return "Reminder: 2 hours before";
  return `Reminder: ${minutes} minutes before`;
};

const getNotificationConfig = (eventType) => {
  const type = String(eventType || "").trim().toUpperCase();

  if (type.includes("ANNOUNCE")) {
    return {
      label: "Announcement",
      icon: Megaphone,
      badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800",
      iconWrapClass: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300",
      badgeBg: "bg-indigo-600 text-white",
    };
  }
  if (type.includes("RESULT")) {
    return {
      label: "Match Result",
      icon: Trophy,
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
      iconWrapClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
      badgeBg: "bg-emerald-600 text-white",
    };
  }
  if (type.includes("REMINDER")) {
    const isTryout = type.includes("TRYOUT");
    return {
      label: isTryout ? "Tryout Reminder" : "Match Reminder",
      icon: Clock,
      badgeClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
      iconWrapClass: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
      badgeBg: "bg-amber-500 text-white",
    };
  }
  if (type.includes("TRYOUT") || type.includes("SCHEDULE") || type.includes("VENUE") || type.includes("TOURNAMENT")) {
    return {
      label: toDisplayType(type),
      icon: Calendar,
      badgeClass: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
      iconWrapClass: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
      badgeBg: "bg-blue-600 text-white",
    };
  }
  if (type.includes("APPLICATION") || type.includes("PLAYER")) {
    return {
      label: toDisplayType(type),
      icon: Users,
      badgeClass: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
      iconWrapClass: "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
      badgeBg: "bg-sky-600 text-white",
    };
  }
  if (type.includes("MEDICAL")) {
    const isAccepted = type.includes("ACCEPTED");
    return {
      label: isAccepted ? "Medical Accepted" : "Medical Rejected",
      icon: FileText,
      badgeClass: isAccepted
        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
        : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
      iconWrapClass: isAccepted
        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
        : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
      badgeBg: isAccepted ? "bg-emerald-600 text-white" : "bg-rose-600 text-white",
    };
  }
  return {
    label: toDisplayType(type),
    icon: Bell,
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-[var(--surface-soft)] dark:text-slate-300 dark:border-slate-700",
    iconWrapClass: "bg-slate-100 text-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-300",
    badgeBg: "bg-blue-600 text-white",
  };
};

const formatRoleLabel = (roles = [], { hasPlayerProfile = false, routeRole = "" } = {}) => {
  if (hasPlayerProfile && routeRole === "viewer") return "Player";
  const routeLabels = {
    coach: "Coach",
    department: "Department Manager",
    "sport-facilitator": "Sports Facilitator",
    coordinator: "Sports Coordinator",
    viewer: "Viewer",
  };
  if (routeLabels[routeRole]) return routeLabels[routeRole];
  const primary = Array.isArray(roles) && roles.length > 0 ? roles[0] : "";
  if (!primary) return "Authenticated";
  return String(primary)
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const timeAgo = (timestamp) => {
  if (!timestamp) return "";
  const created = new Date(timestamp);
  if (Number.isNaN(created.getTime())) return "";
  const diffMs = Date.now() - created.getTime();
  const diffMin = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) {
    return `Yesterday at ${created.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
  }
  if (diffDay < 7) return `${diffDay}d ago`;
  return created.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const formatDateTime = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const AppTopHeader = ({ onOpenMobileSidebar = () => {} }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const tournamentAccess = useTournamentAccess();

  const [query, setQuery] = useState("");
  const [, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchResult, setSearchResult] = useState(EMPTY_SEARCH_RESULT);
  const [openSearch, setOpenSearch] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [openNotifications, setOpenNotifications] = useState(false);
  const [openUserMenu, setOpenUserMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationItems, setNotificationItems] = useState([]);
  const [notificationFilter, setNotificationFilter] = useState("all");
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [profileIdentity, setProfileIdentity] = useState(null);
  const searchWrapRef = useRef(null);
  const notificationsWrapRef = useRef(null);
  const userMenuWrapRef = useRef(null);
  const mobileSearchInputRef = useRef(null);
  const previousUnreadCountRef = useRef(null);
  const lastBrowserNotifiedIdRef = useRef(null);
  const { openProfile } = useProfileDrawer();

  const segments = useMemo(
    () => location.pathname.split("/").filter(Boolean),
    [location.pathname]
  );
  const roleKey = segments[0] || "viewer";

  const displayedNotifications = useMemo(() => {
    if (notificationFilter === "unread") {
      return notificationItems.filter((item) => !item.is_read);
    }
    return notificationItems;
  }, [notificationItems, notificationFilter]);
  const userLabel = profileIdentity?.name || user?.full_name || user?.name || user?.username || "User";
  const userImage = resolveMediaUrl(profileIdentity?.profile_image_url || user?.profile_image_url || "");
  const hasPlayerProfile = (user?.assignment_contexts || []).some((row) => String(row?.type || "").toUpperCase() === "PLAYER");
  const fallbackRoleLabel = formatRoleLabel(user?.roles?.map((item) => item?.role_name), { hasPlayerProfile, routeRole: roleKey });
  const scopedLabels = getSelectedIntramuralRoleLabels(tournamentAccess.tournamentAccess, tournamentAccess.selectedTournamentName);
  const availableRoleLabels = getTournamentRoleLabels(tournamentAccess.tournamentAccess);
  const roleLabel = tournamentAccess.hasSelectedTournament
    ? tournamentAccess.loading
      ? "Checking access…"
      : tournamentAccess.error
        ? fallbackRoleLabel
        : availableRoleLabels.join(" · ") || scopedLabels.role
    : fallbackRoleLabel;

  useEffect(() => {
    let active = true;
    const loadIdentity = async () => {
      try {
        const payload = await getMyProfile();
        if (active) setProfileIdentity(payload?.user || null);
      } catch {
        if (active) setProfileIdentity(null);
      }
    };
    const handleProfileUpdate = (event) => {
      setProfileIdentity((current) => ({ ...(current || {}), ...(event?.detail || {}) }));
    };
    void loadIdentity();
    window.addEventListener("omnisport:profile-updated", handleProfileUpdate);
    return () => {
      active = false;
      window.removeEventListener("omnisport:profile-updated", handleProfileUpdate);
    };
  }, [user?.id]);

  const mergedResults = useMemo(() => {
    return (searchResult.players || []).map((item) => ({
        key: `player-${item.id}`,
        entityType: "player",
        userId: Number(item?.metadata?.user_id || 0) || null,
        title: item.title,
        subtitle: item.subtitle,
      })).slice(0, 6);
  }, [searchResult]);

  const runSearch = useCallback(async (text) => {
    const trimmed = String(text || "").trim();
    if (trimmed.length < 2) {
      setSearchError("");
      setSearchResult(EMPTY_SEARCH_RESULT);
      setSearchLoading(false);
      setOpenSearch(false);
      return;
    }

    setSearchLoading(true);
    setSearchError("");
    try {
      const data = await searchGlobal({
        query: trimmed,
        type: "player",
        limit: 8,
      });
      setSearchResult(data || EMPTY_SEARCH_RESULT);
      setOpenSearch(true);
    } catch (error) {
      const detail = error?.response?.data?.detail;
      setSearchError(typeof detail === "string" ? detail : "Search request failed.");
      setSearchResult(EMPTY_SEARCH_RESULT);
      setOpenSearch(true);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSearchError("");
      setSearchResult(EMPTY_SEARCH_RESULT);
      setOpenSearch(false);
      setSearchLoading(false);
      return undefined;
    }

    const timer = window.setTimeout(() => {
      void runSearch(trimmed);
    }, 280);

    return () => window.clearTimeout(timer);
  }, [query, runSearch]);

  const handleSubmit = (event) => {
    event.preventDefault();
    void runSearch(query);
  };

  const loadUnreadCount = useCallback(async () => {
    try {
      const payload = await getUnreadNotificationCount();
      const currentCount = Number(payload?.unread_count || 0);
      setUnreadCount(currentCount);

      if (
        previousUnreadCountRef.current !== null &&
        currentCount > previousUnreadCountRef.current &&
        getBrowserNotificationPermission() === "granted"
      ) {
        getNotifications({ limit: 3 })
          .then((res) => {
            const items = Array.isArray(res?.items) ? res.items : [];
            const newest = items.find((i) => !i.is_read);
            if (newest && newest.id !== lastBrowserNotifiedIdRef.current) {
              lastBrowserNotifiedIdRef.current = newest.id;
              showDesktopNotification(
                newest.title || "Match Alert",
                newest.message || "You have a new schedule notification.",
                `notif-${newest.id}`
              );
            }
          })
          .catch(() => {});
      }
      previousUnreadCountRef.current = currentCount;
    } catch {
      setUnreadCount(0);
    }
  }, []);

  const loadNotifications = useCallback(async (filterOverride) => {
    setNotificationLoading(true);
    setNotificationError("");
    try {
      const activeFilter = filterOverride !== undefined ? filterOverride : notificationFilter;
      const payload = await getNotifications({
        unreadOnly: activeFilter === "unread",
        limit: 50,
      });
      setNotificationItems(Array.isArray(payload?.items) ? payload.items : []);
    } catch (apiError) {
      setNotificationItems([]);
      setNotificationError(apiError?.response?.data?.detail || "Failed to load notifications.");
    } finally {
      setNotificationLoading(false);
    }
  }, [notificationFilter]);

  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(() => {
      loadUnreadCount();
    }, 25000);
    return () => clearInterval(interval);
  }, [loadUnreadCount]);

  useEffect(() => {
    let unsubscribe = null;
    const initForegroundListener = async () => {
      try {
        const unsub = await setupForegroundPushListener((payload) => {
          const title = payload?.notification?.title || payload?.data?.title || "New Notification";
          const body = payload?.notification?.body || payload?.data?.message || "You have a new message.";
          const eventType = String(payload?.data?.event_type || "").trim().toUpperCase();
          if (["TEAM_APPLICATION_ACCEPTED_AS_PLAYER", "ENTRY_POOL_APPLICATION_ACCEPTED_AS_PLAYER"].includes(eventType)) {
            requestTournamentAccessRefresh({
              tournament_id: Number(payload?.data?.tournament_id || tournamentAccess.selectedTournamentId || 0) || null,
            });
          }

          if (getBrowserNotificationPermission() === "granted") {
            try {
              navigator.serviceWorker.ready.then(reg => {
                  reg.showNotification(title, {
                      body
                  });
              });
            } catch (e) {
              console.warn("Failed to display system notification:", e);
            }
          }

          loadUnreadCount();
          if (openNotifications) {
            loadNotifications();
          }
        });
        if (typeof unsub === "function") {
          unsubscribe = unsub;
        }
      } catch (e) {
        console.error("Foreground listener setup error:", e);
      }
    };
    initForegroundListener();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [loadUnreadCount, loadNotifications, openNotifications, tournamentAccess.selectedTournamentId]);

  useEffect(() => {
    if (mobileSearchOpen && mobileSearchInputRef.current) {
      mobileSearchInputRef.current.focus();
    }
  }, [mobileSearchOpen]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) {
        setOpenSearch(false);
        setMobileSearchOpen(false);
      }
      if (notificationsWrapRef.current && !notificationsWrapRef.current.contains(e.target)) {
        setOpenNotifications(false);
      }
      if (userMenuWrapRef.current && !userMenuWrapRef.current.contains(e.target)) {
        setOpenUserMenu(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setOpenSearch(false);
        setMobileSearchOpen(false);
        setOpenNotifications(false);
        setOpenUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <header className="os-header relative flex h-14 sm:h-16 items-center justify-between gap-2 px-2.5 sm:px-4 md:grid md:grid-cols-[minmax(0,1fr)_minmax(220px,560px)_minmax(0,1fr)]">
      {mobileSearchOpen ? (
        <div className="flex md:hidden w-full items-center gap-2 py-1 col-span-full">
          <div ref={searchWrapRef} className="relative flex-1">
            <form onSubmit={handleSubmit} className="relative flex h-10 w-full items-center gap-2 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 shadow-xs">
              <Search size={16} className="shrink-0 text-[var(--text-soft)]" aria-hidden="true" />
              <input
                ref={mobileSearchInputRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setOpenSearch(true);
                }}
                placeholder="Search user..."
                className="w-full min-w-0 border-none bg-transparent px-1 text-sm text-[var(--text-main)] outline-none placeholder:text-[var(--text-soft)]"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setSearchResult(EMPTY_SEARCH_RESULT);
                    setOpenSearch(false);
                  }}
                  className="p-1 text-[var(--text-muted)] hover:text-[var(--text-main)] shrink-0 cursor-pointer"
                  aria-label="Clear query"
                >
                  <X size={14} />
                </button>
              ) : null}

              {openSearch ? (
                <div className="os-suggestions fixed top-14 left-2.5 right-2.5 max-h-[60vh] overflow-y-auto z-50">
                  {searchError ? (
                    <div className="os-search-state">{searchError}</div>
                  ) : mergedResults.length === 0 ? (
                    <div className="os-search-state">No matching records found.</div>
                  ) : (
                    mergedResults.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => {
                          const hasIdentity = item.userId || item.playerId || item.id;
                          if (item.entityType === "player" && hasIdentity) {
                            openProfile({
                              userId: item.userId || null,
                              playerId: item.playerId || item.id || null,
                              tournamentId: tournamentAccess?.selectedTournamentId ? Number(tournamentAccess.selectedTournamentId) : null,
                            });
                            setOpenSearch(false);
                            setMobileSearchOpen(false);
                          }
                        }}
                        disabled={item.entityType === "player" && !item.userId && !item.playerId && !item.id}
                        className="!rounded-none !border-none !bg-transparent px-1 py-1 text-left hover:!border-none hover:!bg-transparent"
                      >
                        <span>{item.title}</span>
                        {item.subtitle ? <small>{item.subtitle}</small> : null}
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </form>
          </div>
          <button
            type="button"
            onClick={() => {
              setMobileSearchOpen(false);
              setOpenSearch(false);
            }}
            className="shrink-0 px-2.5 py-2 text-xs font-semibold text-[var(--text-soft)] hover:text-[var(--text-main)] cursor-pointer"
          >
            Cancel
          </button>
        </div>
      ) : (
        <>
          {/* Left Side: Mobile Menu Hamburger + Intramural Dropdown */}
          <div className="os-header-left flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 md:flex-initial">
            <button
              type="button"
              className="os-mobile-nav-toggle flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--text-main)] shadow-xs transition-all hover:bg-[var(--surface-soft)] active:scale-95 lg:hidden cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onOpenMobileSidebar();
              }}
              aria-label="Open sidebar menu"
            >
              <Menu size={20} className="text-[var(--text-main)] shrink-0" aria-hidden="true" />
            </button>
            <div className="min-w-0 flex-1 md:flex-initial">
              <IntramuralDropdown />
            </div>
          </div>

          {/* Center: Desktop-only Search Bar */}
          <div ref={searchWrapRef} className="os-header-search-wrap hidden md:flex md:flex-1 md:items-center md:justify-center md:min-w-0 md:max-w-[460px] lg:max-w-[560px] lg:justify-self-center mx-2">
            <form onSubmit={handleSubmit} className="relative flex h-10 w-full items-center gap-2 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 shadow-xs">
              <Search size={16} className="shrink-0 text-[var(--text-soft)]" aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search user..."
                className="w-full min-w-0 border-none bg-transparent px-1 text-sm text-[var(--text-main)] outline-none placeholder:text-[var(--text-soft)]"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setSearchResult(EMPTY_SEARCH_RESULT);
                    setOpenSearch(false);
                  }}
                  className="p-1 text-[var(--text-muted)] hover:text-[var(--text-main)] shrink-0"
                  aria-label="Clear query"
                >
                  <X size={14} />
                </button>
              ) : null}

              {openSearch ? (
                <div className="os-suggestions">
                  {searchError ? (
                    <div className="os-search-state">{searchError}</div>
                  ) : mergedResults.length === 0 ? (
                    <div className="os-search-state">No matching records found.</div>
                  ) : (
                    mergedResults.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => {
                          const hasIdentity = item.userId || item.playerId || item.id;
                          if (item.entityType === "player" && hasIdentity) {
                            openProfile({
                              userId: item.userId || null,
                              playerId: item.playerId || item.id || null,
                              tournamentId: tournamentAccess?.selectedTournamentId ? Number(tournamentAccess.selectedTournamentId) : null,
                            });
                            setOpenSearch(false);
                          }
                        }}
                        disabled={item.entityType === "player" && !item.userId && !item.playerId && !item.id}
                        className="!rounded-none !border-none !bg-transparent px-1 py-1 text-left hover:!border-none hover:!bg-transparent"
                      >
                        <span>{item.title}</span>
                        {item.subtitle ? <small>{item.subtitle}</small> : null}
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </form>
          </div>

          {/* Right Side: Search Icon Trigger (Mobile) + Facebook Notification Bell + User Profile */}
          <div className="os-header-right flex items-center gap-2 shrink-0 justify-self-end">
            {/* Mobile Search Icon Button */}
            <button
              type="button"
              className="flex md:hidden h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--text-main)] shadow-xs transition hover:bg-[var(--surface-soft)] active:scale-95 shrink-0 cursor-pointer"
              onClick={() => {
                setMobileSearchOpen(true);
                setOpenSearch(true);
              }}
              aria-label="Search"
            >
              <Search size={18} aria-hidden="true" />
            </button>

            {/* Facebook-style Notification Bell Icon Button & Popover */}
            <div ref={notificationsWrapRef} className="relative">
              <button
                type="button"
                className={`relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full transition active:scale-95 shrink-0 cursor-pointer ${
                  openNotifications
                    ? "bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400"
                    : "border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--text-main)] hover:bg-[var(--surface-soft)]"
                }`}
                aria-label="Notifications"
                aria-expanded={openNotifications}
                onClick={() => {
                  setOpenNotifications((prev) => {
                    const next = !prev;
                    if (next) {
                      void loadNotifications();
                    }
                    return next;
                  });
                  setOpenUserMenu(false);
                }}
              >
                <Bell size={18} aria-hidden="true" />
                {unreadCount > 0 ? (
                  <span className="absolute -top-1 -right-1 grid min-h-[18px] min-w-[18px] place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-black leading-none text-white ring-2 ring-[var(--surface)]">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                ) : null}
              </button>

              {/* Facebook Notifications Flyout */}
              {openNotifications ? (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[1px] sm:hidden"
                    onClick={() => setOpenNotifications(false)}
                    aria-hidden="true"
                  />
                  <div
                    className="fixed top-14 left-2 right-2 z-50 sm:absolute sm:top-[calc(100%+8px)] sm:left-auto sm:right-0 sm:w-[420px] sm:max-w-[calc(100vw-20px)] rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[var(--surface)] shadow-2xl backdrop-blur-md p-3.5"
                    role="region"
                    aria-label="Notifications"
                  >
                    {/* Facebook Header: Title & Mark all read */}
                    <div className="flex items-center justify-between px-1 pb-3">
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                          Notifications
                        </h2>
                        {unreadCount > 0 ? (
                          <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-bold text-white leading-none">
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        ) : null}
                      </div>

                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40 transition cursor-pointer disabled:opacity-40 disabled:hover:bg-transparent"
                        disabled={unreadCount === 0}
                        onClick={async () => {
                          await markAllNotificationsRead();
                          await loadUnreadCount();
                          await loadNotifications();
                        }}
                      >
                        <CheckCheck size={14} aria-hidden="true" />
                        <span>Mark all read</span>
                      </button>
                    </div>

                    {/* Facebook Filter Pills: All / Unread */}
                    <div className="flex items-center gap-2 px-1 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        className={`rounded-full px-3.5 py-1 text-xs font-bold transition cursor-pointer ${
                          notificationFilter === "all"
                            ? "bg-blue-600 text-white shadow-xs"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                        }`}
                        onClick={() => {
                          setNotificationFilter("all");
                          void loadNotifications("all");
                        }}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        className={`rounded-full px-3.5 py-1 text-xs font-bold transition cursor-pointer ${
                          notificationFilter === "unread"
                            ? "bg-blue-600 text-white shadow-xs"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                        }`}
                        onClick={() => {
                          setNotificationFilter("unread");
                          void loadNotifications("unread");
                        }}
                      >
                        Unread{unreadCount > 0 ? ` (${unreadCount})` : ""}
                      </button>
                    </div>

                    {/* Notification items list */}
                    {notificationLoading ? (
                      <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                        Loading notifications...
                      </div>
                    ) : notificationError ? (
                      <div className="py-8 text-center text-xs text-rose-500 font-medium">
                        {notificationError}
                      </div>
                    ) : displayedNotifications.length === 0 ? (
                      <div className="py-12 text-center text-slate-500 dark:text-slate-400">
                        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
                          <Bell size={22} />
                        </div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {notificationFilter === "unread" ? "No unread notifications" : "No notifications yet"}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                          {notificationFilter === "unread" ? "You're all caught up!" : "You will receive updates here"}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-2 max-h-[400px] space-y-1 overflow-y-auto overscroll-contain pr-0.5">
                        {displayedNotifications.map((item) => {
                          const cfg = getNotificationConfig(item.event_type);
                          const IconComp = cfg.icon;
                          const isReminder = isReminderNotification(item);
                          const isAnnouncement = String(item.event_type || "").toUpperCase().includes("ANNOUNCE");

                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={async () => {
                                if (!item.is_read) {
                                  await markNotificationRead(item.id);
                                  await loadUnreadCount();
                                  await loadNotifications();
                                }
                                setSelectedNotification({
                                  ...item,
                                  displayType: toDisplayType(item.event_type),
                                  timeLabel: timeAgo(item.created_at),
                                  formattedDate: formatDateTime(item.created_at),
                                });
                                setOpenNotifications(false);
                              }}
                              className={`group relative flex w-full items-start gap-3 rounded-xl p-2.5 text-left transition hover:bg-slate-100/90 dark:hover:bg-slate-800/80 cursor-pointer ${
                                item.is_read
                                  ? "opacity-85"
                                  : "bg-blue-50/70 dark:bg-blue-950/30"
                              }`}
                            >
                              {/* Facebook-style circular avatar with category badge */}
                              <div className="relative shrink-0">
                                <div className="grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200 font-bold text-sm">
                                  {isAnnouncement ? (
                                    <Megaphone size={20} className="text-indigo-600 dark:text-indigo-400" />
                                  ) : (
                                    <IconComp size={20} />
                                  )}
                                </div>
                                <span
                                  className={`absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full text-[10px] ring-2 ring-white dark:ring-[var(--surface)] ${cfg.badgeBg || "bg-blue-600 text-white"}`}
                                >
                                  <IconComp size={10} />
                                </span>
                              </div>

                              {/* Notification text details */}
                              <div className="min-w-0 flex-1 pr-1">
                                <div className="text-[13px] leading-snug text-slate-800 dark:text-slate-200">
                                  <span className="font-bold text-slate-900 dark:text-white mr-1.5">
                                    {item.title}
                                  </span>
                                  <span className="line-clamp-2 text-slate-600 dark:text-slate-300 font-normal">
                                    {item.message?.replace(/<[^>]*>?/gm, "") || ""}
                                  </span>
                                </div>

                                <div className="mt-1 flex items-center gap-2">
                                  <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                                    {timeAgo(item.created_at)}
                                  </span>
                                  {isReminder && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.2 text-[9px] font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                                      <Clock size={9} aria-hidden="true" />
                                      <span>{reminderLeadLabel(item)}</span>
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Facebook unread blue dot on right */}
                              {!item.is_read ? (
                                <div className="self-center pr-1 shrink-0">
                                  <span className="block h-2.5 w-2.5 rounded-full bg-blue-600 ring-2 ring-blue-200 dark:ring-blue-900" />
                                </div>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>

            {/* User Profile Container & Dropdown Menu */}
            <div ref={userMenuWrapRef} className="relative">
              <button
                type="button"
                className="os-avatar-btn relative flex h-9 sm:h-10 items-center gap-2 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-1 sm:pr-2.5 transition hover:bg-[var(--surface-soft)] active:scale-95 shrink-0"
                aria-label="Open user menu"
                aria-haspopup="menu"
                aria-expanded={openUserMenu}
                onClick={() => {
                  setOpenUserMenu((prev) => !prev);
                  setOpenNotifications(false);
                }}
              >
                <div className="os-avatar relative h-7 w-7 sm:h-8 sm:w-8 shrink-0 overflow-hidden rounded-lg">
                  {userImage ? (
                    <img
                      src={userImage}
                      alt={userLabel}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    String(userLabel).slice(0, 2).toUpperCase()
                  )}
                </div>
                <div className="os-user-chip-wrap hidden lg:block text-left max-w-[140px]">
                  <span className="os-user-name text-xs font-bold leading-tight text-[var(--text-main)] truncate block">{userLabel}</span>
                  <span className="os-user-role text-[10px] font-semibold text-[var(--text-soft)] uppercase tracking-wider truncate block">{roleLabel}</span>
                </div>
              </button>

              {openUserMenu ? (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[1px] sm:hidden"
                    onClick={() => setOpenUserMenu(false)}
                    aria-hidden="true"
                  />
                  <div className="os-popover user fixed top-14 left-3 right-3 z-50 sm:absolute sm:top-[calc(100%+8px)] sm:left-auto sm:right-0 sm:w-[280px] shadow-xl p-2.5" role="menu">
                    <Link
                      to={`/${roleKey}/profile`}
                      className="!mt-0 !h-auto !min-h-14 !justify-start !gap-3 !px-3 !py-2 rounded-xl transition hover:bg-[var(--surface-soft)] flex items-center"
                      onClick={() => setOpenUserMenu(false)}
                    >
                      <div className="os-avatar !h-10 !w-10 shrink-0 overflow-hidden rounded-xl">
                        {userImage ? <img src={userImage} alt="" className="h-full w-full object-cover" /> : String(userLabel).slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <p className="!mb-0.5 text-sm font-bold text-[var(--text-main)] truncate">{userLabel}</p>
                        <small className="text-xs text-[var(--text-muted)] truncate block">{roleLabel}</small>
                      </div>
                      <ChevronRight size={18} className="shrink-0 text-[var(--text-soft)]" aria-hidden="true" />
                    </Link>

                    <div className="my-1.5 border-t border-[var(--border-soft)]" role="separator" />

                    <button
                      type="button"
                      className="!flex !h-9 !w-full !items-center !justify-start !gap-3 !px-3 !text-xs font-medium rounded-lg transition hover:bg-[var(--surface-soft)] text-[var(--text-main)]"
                      onClick={toggleTheme}
                    >
                      {isDark ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
                      <span>{isDark ? "Light mode" : "Dark mode"}</span>
                    </button>
                    <Link
                      to={`/${roleKey}/settings`}
                      className="!flex !h-9 !w-full !items-center !justify-start !gap-3 !px-3 !text-xs font-medium rounded-lg transition hover:bg-[var(--surface-soft)] text-[var(--text-main)]"
                      onClick={() => setOpenUserMenu(false)}
                      data-testid="user-menu-settings-link"
                    >
                      <Settings size={16} aria-hidden="true" />
                      <span>Settings</span>
                    </Link>
                    <div className="my-1.5 border-t border-[var(--border-soft)]" role="separator" />
                    <button
                      type="button"
                      className="!flex !h-9 !w-full !items-center !justify-start !gap-3 !px-3 !text-xs font-semibold text-red-600 dark:text-red-400 rounded-lg transition hover:bg-red-50 dark:hover:bg-red-950/30"
                      onClick={() => void logout()}
                    >
                      <LogOut size={16} aria-hidden="true" />
                      <span>Logout</span>
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </>
      )}

      {selectedNotification && (
        <AppModal
          open={Boolean(selectedNotification)}
          onClose={() => setSelectedNotification(null)}
          title="Notification Details"
          subtitle={selectedNotification.displayType}
          maxWidthClass="max-w-2xl sm:max-w-3xl"
          bodyClassName="p-6 sm:p-8 min-h-[220px] max-h-[75vh] overflow-y-auto space-y-6"
          footer={
            <div className="flex w-full items-center justify-end gap-3">
              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-200 dark:hover:bg-slate-800"
                onClick={() => setSelectedNotification(null)}
              >
                Close
              </button>
              {getRelatedNotificationPath({ roleKey, notification: selectedNotification }) ? (
                <button
                  type="button"
                  onClick={() => {
                    const targetPath = getRelatedNotificationPath({ roleKey, notification: selectedNotification });
                    setSelectedNotification(null);
                    if (targetPath) navigate(targetPath);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700"
                >
                  <span>
                    {String(selectedNotification.event_type || "").toUpperCase().includes("ANNOUNCE")
                      ? "View Full Announcement"
                      : "Open Related Page"}
                  </span>
                  <ExternalLink size={14} aria-hidden="true" />
                </button>
              ) : null}
            </div>
          }
        >
          {(() => {
            const modalCfg = getNotificationConfig(selectedNotification.event_type);
            const ModalIcon = modalCfg.icon;
            const isReminder = isReminderNotification(selectedNotification);
            const isAnnouncement = String(selectedNotification.event_type || "").toUpperCase().includes("ANNOUNCE");
            const hasHtmlContent = Boolean(selectedNotification.message && /<[a-z][\s\S]*>/i.test(selectedNotification.message));

            return (
              <div className="space-y-6">
                {/* Header info: Icon, Category Badge, Title, Timestamps */}
                <div className="flex items-start gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className={`flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl shrink-0 ${modalCfg.iconWrapClass}`}>
                    {isAnnouncement ? <Megaphone size={28} aria-hidden="true" /> : <ModalIcon size={28} aria-hidden="true" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${modalCfg.badgeClass}`}>
                        {modalCfg.label}
                      </span>
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {selectedNotification.timeLabel}
                      </span>
                      {selectedNotification.formattedDate && (
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          · {selectedNotification.formattedDate}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-snug">
                      {selectedNotification.title}
                    </h3>
                  </div>
                </div>

                {/* Announcement / Message Body - min/max elastic height container */}
                <div className="min-h-[100px] text-slate-800 dark:text-slate-100">
                  {hasHtmlContent ? (
                    <div
                      className="rich-text-editor-content text-sm sm:text-base leading-relaxed break-words"
                      dangerouslySetInnerHTML={{ __html: selectedNotification.message }}
                    />
                  ) : (
                    <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-normal">
                      {selectedNotification.message}
                    </p>
                  )}
                </div>

                {isReminder && (
                  <div className="flex items-center gap-3 rounded-xl bg-amber-50/90 p-4 dark:bg-amber-950/25 text-sm text-amber-900 dark:text-amber-200 border border-amber-200/80 dark:border-amber-900/40">
                    <Clock size={18} className="shrink-0 text-amber-600 dark:text-amber-400" />
                    <div className="text-xs sm:text-sm">
                      <span className="font-semibold">{reminderLeadLabel(selectedNotification)}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </AppModal>
      )}
    </header>
  );
};

export default AppTopHeader;
