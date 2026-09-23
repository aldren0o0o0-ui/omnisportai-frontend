export const PROFILE_STATUS_COPY = {
  DRAFT: ["Draft", "Rules are still being prepared."],
  VALIDATED: ["Validated", "Rules passed validation."],
  PENDING_APPROVAL: ["Pending approval", "Waiting for Coordinator approval."],
  APPROVED: ["Approved", "Rules are approved and may be adopted."],
  LOCKED: ["Locked", "Create a new version to make future changes."],
  SUPERSEDED: ["Superseded", "A newer version is being prepared."],
  RETIRED: ["Retired", "This version is retained for history."],
};

export const getRuleGovernanceActions = ({
  status,
  isCoordinator,
  isAssignedFacilitator,
}) => {
  const normalized = String(status || "").toUpperCase();
  const canPrepare = Boolean(isCoordinator || isAssignedFacilitator);
  return {
    edit: canPrepare && normalized === "DRAFT",
    validate: canPrepare && normalized === "DRAFT",
    submit: canPrepare && normalized === "VALIDATED",
    approve: Boolean(isCoordinator && normalized === "PENDING_APPROVAL"),
    lock: Boolean(isCoordinator && normalized === "APPROVED"),
    adopt: Boolean(
      isCoordinator && ["APPROVED", "LOCKED"].includes(normalized)
    ),
    supersede: Boolean(
      isCoordinator && ["APPROVED", "LOCKED"].includes(normalized)
    ),
    retire: Boolean(
      isCoordinator && ["APPROVED", "LOCKED"].includes(normalized)
    ),
  };
};

export const buildRuleDraftValues = (standard, profile) => {
  const defaults = standard?.default_rules || {};
  const configuration = profile?.configuration || {};
  return Object.fromEntries(
    Object.keys(standard?.configurable_schema || {}).map((name) => [
      name,
      configuration[name] ?? defaults[name] ?? "",
    ])
  );
};

export const normalizeRuleFieldValue = (definition, value) => {
  const type = String(definition?.type || "").toLowerCase();
  if (type === "boolean") return Boolean(value);
  if (["integer", "duration"].includes(type)) {
    return value === "" ? "" : Number.parseInt(value, 10);
  }
  if (type === "decimal") {
    return value === "" ? "" : Number.parseFloat(value);
  }
  if (type === "ordered_list") {
    return Array.isArray(value) ? value : [];
  }
  return value;
};

export const configurationOverrides = (standard, values) => {
  const defaults = standard?.default_rules || {};
  return Object.fromEntries(
    Object.entries(values || {}).filter(
      ([name, value]) =>
        value !== "" &&
        value !== undefined &&
        JSON.stringify(value) !== JSON.stringify(defaults[name])
    )
  );
};

export const formatRuleFieldLabel = (value) =>
  String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export const ruleManagementThemeClasses = [
  "bg-white",
  "text-slate-950",
  "dark:bg-slate-950",
  "dark:text-white",
  "dark:border-slate-800",
].join(" ");
