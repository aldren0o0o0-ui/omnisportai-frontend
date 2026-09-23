import { useCallback, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import useTreeKeyboard from "./useTreeKeyboard";
import useSidebarPrefetch from "../Sidebar/useSidebarPrefetch";
import { flattenSidebarGroups } from "../Sidebar/sidebarTypes";

const STORAGE_KEY = "omnisport:sidebar-expanded-groups";

const readExpandedState = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
};

const SidebarNavTree = ({
  groups = [],
  collapsed = false,
  onCloseMobile = () => {},
}) => {
  const [expanded, setExpanded] = useState(() => {
    const stored = readExpandedState();
    const initial = {};
    groups.forEach((g) => {
      initial[g.key] = stored[g.key] !== undefined ? stored[g.key] : true;
    });
    return initial;
  });

  const flatItems = useMemo(() => flattenSidebarGroups(groups), [groups]);
  const getPrefetchHandlers = useSidebarPrefetch(flatItems);

  const visibleItems = useMemo(() => {
    const result = [];
    groups.forEach((group) => {
      result.push({ type: "group", group });
      if (expanded[group.key]) {
        group.items.forEach((item, itemIndex) => {
          result.push({ type: "item", item, group, itemIndex });
        });
      }
    });
    return result;
  }, [groups, expanded]);

  const { onKeyDown, setRef } = useTreeKeyboard(visibleItems.length);

  const toggleGroup = useCallback((key) => {
    setExpanded((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch { /* quota */ }
      return next;
    });
  }, []);

  const flatIndexOf = useCallback(
    (item) => flatItems.findIndex((fi) => fi.path === item.path),
    [flatItems]
  );

  if (collapsed) {
    return (
      <nav className="os-nav" role="tree" aria-label="Sidebar navigation">
        {groups.map((group) => {
          const GroupIcon = group.icon;
          return (
            <div
              key={group.key}
              role="treeitem"
              className="os-nav-group-icon-wrap"
              title={group.label}
            >
              <GroupIcon size={17} aria-hidden="true" />
            </div>
          );
        })}
      </nav>
    );
  }

  let refIndex = 0;

  return (
    <nav className="os-nav os-nav-tree" role="tree" aria-label="Sidebar navigation" onKeyDown={onKeyDown}>
      {groups.map((group) => {
        const isExpanded = expanded[group.key] !== false;
        const GroupIcon = group.icon;
        const currentRefIndex = refIndex;
        refIndex++;

        return (
          <div key={group.key} className="os-nav-group" role="none">
            <button
              ref={setRef(currentRefIndex)}
              type="button"
              role="treeitem"
              aria-expanded={isExpanded}
              className="os-nav-group-header"
              onClick={() => toggleGroup(group.key)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight" && !isExpanded) {
                  e.preventDefault();
                  toggleGroup(group.key);
                } else if (e.key === "ArrowLeft" && isExpanded) {
                  e.preventDefault();
                  toggleGroup(group.key);
                }
              }}
              tabIndex={0}
            >
              <GroupIcon size={14} className="os-nav-group-header-icon" aria-hidden="true" />
              <span className="os-nav-group-label">{group.label}</span>
              <ChevronDown
                size={14}
                className={`os-nav-group-chevron ${isExpanded ? "expanded" : ""}`}
                aria-hidden="true"
              />
            </button>
            <div
              role="group"
              className={`os-nav-group-items ${isExpanded ? "expanded" : ""}`}
            >
              {isExpanded &&
                group.items.map((item) => {
                  const Icon = item.icon;
                  const fi = flatIndexOf(item);
                  const itemRefIndex = refIndex;
                  refIndex++;
                  return (
                    <NavLink
                      key={item.path}
                      ref={setRef(itemRefIndex)}
                      to={item.path}
                      role="treeitem"
                      {...getPrefetchHandlers(fi)}
                      className={({ isActive }) =>
                        `os-nav-item ${isActive ? "active" : ""}`
                      }
                      onClick={onCloseMobile}
                      tabIndex={0}
                    >
                      {/* <Icon size={14} /> */}
                      <span>{item.label}</span>
                      {Number(item?.badge || 0) > 0 ? (
                        <span className="os-nav-badge">{item.badge > 99 ? "99+" : item.badge}</span>
                      ) : null}
                    </NavLink>
                  );
                })}
            </div>
          </div>
        );
      })}
    </nav>
  );
};

export default SidebarNavTree;
