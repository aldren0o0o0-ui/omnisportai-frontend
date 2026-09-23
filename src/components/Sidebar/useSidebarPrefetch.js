import { useCallback, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import {
  normalizeRoutePath,
  prefetchRoutesByPath,
  scheduleRoutePrefetch,
} from "../../router/routePrefetch";
import { flattenSidebarGroups } from "./sidebarTypes";

const uniquePaths = (paths) =>
  Array.from(new Set(paths.filter((path) => typeof path === "string" && path)));

const neighboringPaths = (items, index) =>
  uniquePaths([
    items[index]?.path,
    items[index + 1]?.path,
    items[index - 1]?.path,
  ]);

const useSidebarPrefetch = (items) => {
  const location = useLocation();
  const currentPath = normalizeRoutePath(location.pathname);

  const navItems = useMemo(() => {
    if (!Array.isArray(items)) return [];
    const flat = items.length > 0 && items[0]?.items
      ? flattenSidebarGroups(items)
      : items;
    return flat.filter((item) => typeof item?.path === "string");
  }, [items]);

  useEffect(() => {
    if (navItems.length === 0) return;

    const currentIndex = navItems.findIndex(
      (item) => normalizeRoutePath(item.path) === currentPath
    );

    const likelyPaths =
      currentIndex >= 0
        ? uniquePaths([
            navItems[currentIndex]?.path,
            navItems[currentIndex + 1]?.path,
            navItems[currentIndex - 1]?.path,
            navItems[0]?.path,
          ])
        : uniquePaths(navItems.slice(0, 3).map((item) => item.path));

    scheduleRoutePrefetch(likelyPaths);
  }, [currentPath, navItems]);

  return useCallback(
    (index) => {
      const likelyPaths = neighboringPaths(navItems, index);
      if (likelyPaths.length === 0) return {};

      const prefetchLikelyPaths = () => {
        void prefetchRoutesByPath(likelyPaths);
      };

      return {
        onMouseEnter: prefetchLikelyPaths,
        onFocus: prefetchLikelyPaths,
        onTouchStart: prefetchLikelyPaths,
      };
    },
    [navItems]
  );
};

export default useSidebarPrefetch;

