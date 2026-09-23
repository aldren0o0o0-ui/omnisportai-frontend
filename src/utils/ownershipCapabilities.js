/**
 * Centralized Role-Based Ownership & Capability Resolver for OmniSport AI
 */

export const normalizeRole = (rawRole = "") =>
  String(rawRole || "").trim().toLowerCase().replace(/[\s-]+/g, "_");

/**
 * Check if the user is authorized to edit the department identity (name/logo)
 */
export const canEditDepartment = (user, department, effectiveMode = "") => {
  if (!user) return false;
  const mode = normalizeRole(effectiveMode || user.role);
  if (["sports_coordinator", "admin", "super_admin"].includes(mode)) return true;

  if (mode === "department_manager") {
    const userDeptId = Number(user.department_id || user.departmentId);
    const targetDeptId = Number(department?.id || department?.department_id);
    return Boolean(userDeptId > 0 && targetDeptId > 0 && userDeptId === targetDeptId);
  }

  return false;
};

/**
 * Check if the user is authorized to edit the sport configuration/rules/logo
 */
export const canEditSport = (user, sport, effectiveMode = "", facilitatedSportIds = []) => {
  if (!user) return false;
  const mode = normalizeRole(effectiveMode || user.role);
  if (["sports_coordinator", "admin", "super_admin"].includes(mode)) return true;

  if (mode === "sports_facilitator") {
    const targetSportId = Number(sport?.id || sport?.sport_id);
    const ids = Array.isArray(facilitatedSportIds) ? facilitatedSportIds.map(Number) : [];
    if (ids.includes(targetSportId)) return true;
    if (Number(user.sport_id) === targetSportId) return true;
  }

  return false;
};

/**
 * Check if the user is authorized to edit the entry/team identity (name/logo)
 */
export const canEditEntry = (user, entry, effectiveMode = "") => {
  if (!user || !entry) return false;
  const mode = normalizeRole(effectiveMode || user.role);
  if (["sports_coordinator", "admin", "super_admin"].includes(mode)) return true;

  // If backend provided capabilities object on entry
  if (entry.capabilities?.can_edit_name || entry.capabilities?.can_edit_logo) {
    return true;
  }

  const userId = Number(user.id || user.user_id);
  const userDeptId = Number(user.department_id || user.departmentId);
  const entryDeptId = Number(entry.department_id || entry.departmentId);
  const entryCoachUserId = Number(entry.coach?.user_id || entry.submitted_by_coach_id || entry.coach_id);

  if (mode === "department_manager") {
    return Boolean(userDeptId > 0 && entryDeptId > 0 && userDeptId === entryDeptId);
  }

  if (["coach", "assistant_coach"].includes(mode)) {
    return Boolean(userId > 0 && entryCoachUserId > 0 && userId === entryCoachUserId);
  }

  return false;
};

/**
 * Check if the user can manage the roster for an entry
 */
export const canManageRoster = (user, entry, effectiveMode = "") => {
  if (!user || !entry) return false;
  const mode = normalizeRole(effectiveMode || user.role);
  if (["sports_coordinator", "admin", "super_admin"].includes(mode)) return true;

  const userId = Number(user.id || user.user_id);
  const userDeptId = Number(user.department_id || user.departmentId);
  const entryDeptId = Number(entry.department_id || entry.departmentId);
  const entryCoachUserId = Number(entry.coach?.user_id || entry.submitted_by_coach_id || entry.coach_id);

  if (mode === "department_manager") {
    return Boolean(userDeptId > 0 && entryDeptId > 0 && userDeptId === entryDeptId);
  }

  if (["coach", "assistant_coach"].includes(mode)) {
    return Boolean(userId > 0 && entryCoachUserId > 0 && userId === entryCoachUserId);
  }

  return false;
};

/**
 * Check if the current user is a participating member of an entry (viewer/player marker)
 */
export const isUserParticipantInEntry = (user, entry) => {
  if (!user || !entry) return false;
  if (entry.is_current_user_entry) return true;
  const userId = Number(user.id || user.user_id);
  const userEmail = String(user.email || "").trim().toLowerCase();

  const members = Array.isArray(entry.members) ? entry.members : [];
  return members.some((m) => {
    if (m.user_id && Number(m.user_id) === userId) return true;
    if (m.player_email && String(m.player_email).trim().toLowerCase() === userEmail) return true;
    if (m.email && String(m.email).trim().toLowerCase() === userEmail) return true;
    return false;
  });
};

/**
 * Return Scope Tabs for the role
 */
export const getRoleScopeTabs = (effectiveMode = "") => {
  const mode = normalizeRole(effectiveMode);
  switch (mode) {
    case "department_manager":
      return [
        { id: "owned", label: "My Department" },
        { id: "all", label: "All Departments" },
      ];
    case "coach":
    case "assistant_coach":
      return [
        { id: "owned", label: "My Entry" },
        { id: "all", label: "Browse Teams & Entries" },
      ];
    case "sports_facilitator":
      return [
        { id: "owned", label: "My Sports" },
        { id: "all", label: "All Teams & Entries" },
      ];
    default:
      return [];
  }
};

/**
 * Return compact role-specific empty state copy
 */
export const getRoleEmptyState = (effectiveMode = "", hasActiveFilters = false) => {
  const mode = normalizeRole(effectiveMode);
  if (hasActiveFilters) {
    return {
      title: "No matching entries found",
      message: "Try adjusting your search query or filters.",
    };
  }

  switch (mode) {
    case "coach":
    case "assistant_coach":
      return {
        title: "No entry assigned yet",
        message: "Your assigned team or competition entry will appear here once configured.",
      };
    case "department_manager":
      return {
        title: "No department entries yet",
        message: "Your department's registered entries will appear here once approved.",
      };
    case "sports_facilitator":
      return {
        title: "No entries in this sport yet",
        message: "Approved department entries for your assigned sport will appear here.",
      };
    default:
      return {
        title: "No teams or entries yet",
        message: "Registered competition entries for this Intramural will appear here.",
      };
  }
};
