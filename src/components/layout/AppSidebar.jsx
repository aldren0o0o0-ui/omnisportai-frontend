import { useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import useSidebarPrefetch from "../Sidebar/useSidebarPrefetch";
import { flattenSidebarGroups } from "../Sidebar/sidebarTypes";
import SidebarNavTree from "./SidebarNavTree";

const ROLE_LABELS = {
  coordinator: "Sports Coordinator",
  department: "Department Manager",
  "sport-facilitator": "Sports Facilitator",
  coach: "Coach",
  viewer: "Player / Viewer",
};

const AppSidebar = ({
  items = [],
  groups = null,
  collapsed = false,
  onToggleCollapse = () => { },
  mobileOpen = false,
  onCloseMobile = () => { },
  roleLabelOverride = "",
}) => {
  const sidebarRef = useRef(null);
  const previousFocusRef = useRef(null);
  const flatItems = groups ? flattenSidebarGroups(groups) : items;
  const getPrefetchHandlers = useSidebarPrefetch(flatItems);
  const effectiveCollapsed = collapsed && !mobileOpen;
  const fallbackRolePrefix = flatItems[0]?.path?.split("/")?.[1] || "coordinator";
  const roleLabel = String(roleLabelOverride || "").trim() || ROLE_LABELS[fallbackRolePrefix] || "Role Dashboard";

  useEffect(() => {
    if (!mobileOpen) return undefined;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const sidebar = sidebarRef.current;
    const focusableSelector = "a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])";
    const frameId = window.requestAnimationFrame(() => sidebar?.querySelector(".os-sidebar-mobile-close")?.focus());
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseMobile();
        return;
      }
      if (event.key !== "Tab" || !sidebar) return;
      const focusable = Array.from(sidebar.querySelectorAll(focusableSelector)).filter((node) => node instanceof HTMLElement && node.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frameId);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus?.({ preventScroll: true });
    };
  }, [mobileOpen, onCloseMobile]);

  return (
    <>
      <button
        type="button"
        className={`os-sidebar-backdrop ${mobileOpen ? "open" : ""}`}
        aria-label="Close sidebar"
        aria-hidden={!mobileOpen}
        tabIndex={mobileOpen ? 0 : -1}
        onClick={onCloseMobile}
      />
      <aside ref={sidebarRef} role={mobileOpen ? "dialog" : undefined} aria-label={`${roleLabel} navigation`} aria-modal={mobileOpen ? "true" : undefined} className={`os-sidebar ${effectiveCollapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="os-sidebar-top">
          <div className="os-brand">
            <div className="os-brand-mark">OA</div>
            {!effectiveCollapsed ? (
              <div>
                <div className="os-brand-text">OmniSport AI</div>
              </div>
            ) : null}
          </div>
          <div className="os-sidebar-top-actions">
            <button
              type="button"
              className="os-sidebar-toggle"
              onClick={onToggleCollapse}
              aria-label={effectiveCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {effectiveCollapsed ? <ChevronRight size={16} aria-hidden="true" /> : <ChevronLeft size={16} aria-hidden="true" />}
            </button>
            <button
              type="button"
              className="os-sidebar-mobile-close"
              aria-label="Close sidebar"
              onClick={onCloseMobile}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
        {groups ? (
          <SidebarNavTree
            groups={groups}
            collapsed={effectiveCollapsed}
            onCloseMobile={onCloseMobile}
          />
        ) : (
          <nav className="os-nav">
            {items.map((item, index) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  {...getPrefetchHandlers(index)}
                  title={effectiveCollapsed ? item.label : undefined}
                  className={({ isActive }) => `os-nav-item ${isActive ? "active" : ""}`}
                  onClick={onCloseMobile}
                >
                  <Icon size={17} aria-hidden="true" />
                  {!effectiveCollapsed ? (
                    <>
                      <span>{item.label}</span>
                      {Number(item?.badge || 0) > 0 ? (
                        <span className="os-nav-badge">{item.badge > 99 ? "99+" : item.badge}</span>
                      ) : null}
                    </>
                  ) : null}
                </NavLink>
              );
            })}
          </nav>
        )}

      </aside>
    </>
  );
};

export default AppSidebar;
