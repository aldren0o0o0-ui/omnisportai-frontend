export const resolveLegacyManagementTarget = ({ kind = "users", search = "" } = {}) => {
  const legacy = new URLSearchParams(search);
  const tab = String(legacy.get("tab") || "").toLowerCase();
  let pathname = "/coordinator/management/users";
  const next = new URLSearchParams();
  if (kind === "departments" || tab === "departments") pathname = "/coordinator/management/departments";
  else if (kind === "facilitators" || ["facilitators", "sports-facilitators"].includes(tab)) { next.set("section", "role-coverage"); next.set("type", "facilitator"); }
  else if (kind === "staff" || ["staff", "staff-officials"].includes(tab)) next.set("section", "staff");
  else if (tab === "department-managers") { next.set("section", "role-coverage"); next.set("type", "manager"); }
  const returnTo = legacy.get("return_to");
  if (returnTo) next.set("return_to", returnTo);
  return `${pathname}${next.size ? `?${next}` : ""}`;
};

