/**
 * Grouped sidebar config shape and utilities.
 *
 * Each role config exports an array of groups:
 *   { key, label, icon, items: [{ label, icon, path }] }
 *
 * flattenSidebarGroups  — backward compat with useSidebarPrefetch
 * filterGroupsByPaths   — CoachLayout dynamic filtering
 */

export const flattenSidebarGroups = (groups) =>
  groups.flatMap((group) => group.items);

export const filterGroupsByPaths = (groups, allowedPaths) =>
  groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => allowedPaths.has(item.path)),
    }))
    .filter((group) => group.items.length > 0);
