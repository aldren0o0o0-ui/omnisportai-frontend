import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, ChevronRight, LogOut, Menu, Moon, Search, Settings, Sun, X } from "lucide-react";
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
  ["MATCH_REMINDER", "TRYOUT_REMINDER"].includes(String(item?.event_type || "").trim().toUpperCase());

const reminderLeadLabel = (item) => {
  const eventType = String(item?.event_type || "").trim().toUpperCase();
  const minutes = Number(item?.metadata?.reminder_minutes_before);
  const subject = eventType === "TRYOUT_REMINDER" ? "Tryout" : "Match";
  if (!Number.isFinite(minutes) || minutes <= 0) return `${subject} starts now`;
  if (minutes === 60) return "Reminder: 1 hour before";
  if (minutes === 120) return "Reminder: 2 hours before";
  return `Reminder: ${minutes} minutes before`;
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
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return created.toLocaleDateString();
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
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [profileIdentity, setProfileIdentity] = useState(null);
  const searchWrapRef = useRef(null);
  const notificationsWrapRef = useRef(null);
  const userMenuWrapRef = useRef(null);
  const mobileSearchInputRef = useRef(null);
  const { openProfile } = useProfileDrawer();

  const segments = useMemo(
    () => location.pathname.split("/").filter(Boolean),
    [location.pathname]
  );
  const roleKey = segments[0] || "viewer";
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
      setUnreadCount(Number(payload?.unread_count || 0));
    } catch {
      setUnreadCount(0);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    setNotificationLoading(true);
    setNotificationError("");
    try {
      const payload = await getNotifications({ limit: 8 });
      setNotificationItems(Array.isArray(payload?.items) ? payload.items : []);
    } catch (apiError) {
      setNotificationItems([]);
      setNotificationError(apiError?.response?.data?.detail || "Failed to load notifications.");
    } finally {
      setNotificationLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUnreadCount();
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
          <div className="os-header-left flex items-center gap-2 min-w-0 flex-1 md:flex-initial">
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

          {/* Right Side: Search Icon Trigger (Mobile only) + User Avatar Profile Container */}
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

            {/* User Profile Container (with badge on avatar & menu) */}
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
                {unreadCount > 0 ? (
                  <span className="absolute -top-1 -right-1 grid min-h-[18px] min-w-[18px] place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-black leading-none text-white ring-2 ring-[var(--surface)]">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                ) : null}
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

                    {/* Notifications item inside Profile Container */}
                    <button
                      type="button"
                      className="!flex !h-9 !w-full !items-center !justify-between !px-3 !text-xs font-medium rounded-lg transition hover:bg-[var(--surface-soft)] text-[var(--text-main)] cursor-pointer"
                      onClick={() => {
                        setOpenUserMenu(false);
                        setOpenNotifications(true);
                        void loadNotifications();
                      }}
                    >
                      <span className="flex items-center gap-3">
                        <Bell size={16} aria-hidden="true" />
                        <span>Notifications</span>
                      </span>
                      {unreadCount > 0 ? (
                        <span className="grid min-h-[18px] min-w-[18px] place-items-center rounded-full bg-rose-500 px-1.5 text-[10px] font-black leading-none text-white">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      ) : null}
                    </button>

                    <button
                      type="button"
                      className="!flex !h-9 !w-full !items-center !justify-start !gap-3 !px-3 !text-xs font-medium rounded-lg transition hover:bg-[var(--surface-soft)] text-[var(--text-main)]"
                      onClick={toggleTheme}
                    >
                      {isDark ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
                      <span>{isDark ? "Light mode" : "Dark mode"}</span>
                    </button>
                    <Link
                      to={`/${roleKey}/notification-settings`}
                      className="!flex !h-9 !w-full !items-center !justify-start !gap-3 !px-3 !text-xs font-medium rounded-lg transition hover:bg-[var(--surface-soft)] text-[var(--text-main)]"
                      onClick={() => setOpenUserMenu(false)}
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

              {/* Notifications Popover (rendered when opened from profile container) */}
              {openNotifications ? (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[1px] sm:hidden"
                    onClick={() => setOpenNotifications(false)}
                    aria-hidden="true"
                  />
                  <div ref={notificationsWrapRef} className="os-popover fixed top-14 left-3 right-3 z-50 sm:absolute sm:top-[calc(100%+8px)] sm:left-auto sm:right-0 sm:w-[360px] sm:max-w-[calc(100vw-20px)] shadow-xl p-3">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--border-soft)]">
                      <p className="!m-0 font-bold text-sm text-[var(--text-main)]">Notifications</p>
                      <button
                        type="button"
                        className="!mt-0 !h-auto !w-auto !border-0 !bg-transparent text-xs font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)] cursor-pointer"
                        onClick={async () => {
                          await markAllNotificationsRead();
                          await loadUnreadCount();
                          await loadNotifications();
                        }}
                      >
                        Mark all as read
                      </button>
                    </div>
                    {notificationLoading ? (
                      <small className="py-4 text-center block text-[var(--text-muted)]">Loading notifications...</small>
                    ) : notificationError ? (
                      <small className="py-4 text-center block text-red-500">{notificationError}</small>
                    ) : notificationItems.length === 0 ? (
                      <small className="py-4 text-center block text-[var(--text-muted)]">No notifications yet.</small>
                    ) : (
                      <div className="mt-1 space-y-1.5 max-h-[320px] overflow-y-auto overscroll-contain">
                        {notificationItems.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={async () => {
                              if (!item.is_read) {
                                await markNotificationRead(item.id);
                                await loadUnreadCount();
                                await loadNotifications();
                              }
                              const targetPath = getRelatedNotificationPath({ roleKey, notification: item });
                              if (targetPath) {
                                setOpenNotifications(false);
                                navigate(targetPath);
                              } else {
                                setSelectedNotification({
                                  ...item,
                                  displayType: toDisplayType(item.event_type),
                                  timeLabel: timeAgo(item.created_at)
                                });
                                setOpenNotifications(false);
                              }
                            }}
                            className={`os-notification-item text-left p-2.5 rounded-xl transition hover:bg-[var(--surface-soft)] ${
                              item.is_read
                                ? "is-read opacity-75"
                                : isReminderNotification(item)
                                ? "is-reminder"
                                : "is-unread"
                            }`}
                          >
                            <div className="mb-1 flex items-center justify-between gap-2">
                              <span className="os-inline-type text-[10px] font-bold uppercase tracking-wider text-[var(--primary)]">{toDisplayType(item.event_type)}</span>
                              <span className="text-[10px] text-[var(--text-soft)]">{timeAgo(item.created_at)}</span>
                            </div>
                            {isReminderNotification(item) ? (
                              <div className="mb-1 inline-flex rounded-full bg-[var(--warning-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--warning)]">
                                {reminderLeadLabel(item)}
                              </div>
                            ) : null}
                            <div className="font-semibold text-xs text-[var(--text-main)]">{item.title}</div>
                            <div className="text-[11px] text-[var(--text-muted)] line-clamp-2 mt-0.5">{item.message}</div>
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="mt-2 pt-2 border-t border-[var(--border-soft)] flex justify-end">
                      <Link
                        className="os-results-link text-xs font-semibold"
                        to={`/${roleKey}/notifications`}
                        onClick={() => setOpenNotifications(false)}
                      >
                        Open inbox
                      </Link>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </>
      )}

      {selectedNotification && (
        <div className="fixed inset-0 z-[var(--z-overlay)] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" role="presentation">
          <div className="w-full max-w-sm rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6 shadow-[var(--shadow-lg)]" role="dialog" aria-modal="true" aria-labelledby="notification-detail-title">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <span className="mb-1 inline-block rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  {selectedNotification.displayType}
                </span>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {selectedNotification.timeLabel}
                </p>
              </div>
              <button
                type="button"
                className="rounded-full p-1.5 text-[var(--text-soft)] transition-colors duration-150 hover:bg-[var(--surface-muted)] hover:text-[var(--text-main)] motion-reduce:transition-none"
                onClick={() => setSelectedNotification(null)}
                aria-label="Close notification details"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <h3 id="notification-detail-title" className="mb-2 text-lg font-bold text-[var(--text-main)]">
              {selectedNotification.title}
            </h3>
            <div className="mb-6 text-sm text-[var(--text-muted)]">
              {selectedNotification.message}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                className="rounded-xl bg-[var(--primary)] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)]"
                onClick={() => setSelectedNotification(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default AppTopHeader;
