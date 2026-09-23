export const INSTITUTIONAL_SPORT_CODES = new Set([
  "BOXING",
  "SEPAK_TAKRAW",
  "TENNIS",
  "ARCHERY",
]);

export const REHEARSAL_STEPS = [
  { key: "rules", label: "Rules" },
  { key: "governance", label: "Governance" },
  { key: "previous", label: "Previous Intramural" },
  { key: "dates", label: "Rehearsal Dates" },
  { key: "review", label: "Review" },
];

export const friendlyValue = (value) => {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return String(value ?? "")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

export const validateInstitutionalDecisions = (requirement, values = {}) => {
  const schema = requirement?.confirmation_schema || {};
  const fields = schema.fields || {};
  const errors = {};
  Object.entries(fields).forEach(([name, definition]) => {
    const value = values[name];
    if (definition.required && (value === "" || value === null || value === undefined)) {
      errors[name] = `${definition.label || friendlyValue(name)} is required.`;
      return;
    }
    if (["integer", "duration"].includes(String(definition.type || "").toLowerCase()) && value !== "") {
      const numeric = Number(value);
      if (!Number.isInteger(numeric)) errors[name] = "Enter a whole number.";
      if (definition.minimum != null && numeric < Number(definition.minimum)) {
        errors[name] = `Minimum value is ${definition.minimum}.`;
      }
      if (definition.maximum != null && numeric > Number(definition.maximum)) {
        errors[name] = `Maximum value is ${definition.maximum}.`;
      }
    }
    if (String(definition.type || "").toLowerCase() === "enum" && value !== "") {
      if (!(definition.values || []).some((allowed) => String(allowed) === String(value))) {
        errors[name] = "Choose one of the allowed values.";
      }
    }
  });
  (schema.dependency_rules || []).forEach((rule) => {
    if (rule.greater_than_or_equal && Number(values[rule.field]) < Number(values[rule.greater_than_or_equal])) {
      errors[rule.field] = `${fields[rule.field]?.label || friendlyValue(rule.field)} must be at least ${
        String(fields[rule.greater_than_or_equal]?.label || friendlyValue(rule.greater_than_or_equal)).toLowerCase()
      }.`;
    }
  });
  return errors;
};

export const buildGovernanceGroups = (profiles = [], competitions = []) => {
  const coveredByProfile = new Map();
  competitions.forEach((competition) => {
    const profileId = Number(competition?.rules?.profile_id || 0);
    if (!profileId) return;
    const current = coveredByProfile.get(profileId) || [];
    current.push({
      event_id: competition.event_id,
      event_name: competition.event_name,
      participant_model: competition.participant_model,
      match_count: Number(competition?.matches?.total || 0),
    });
    coveredByProfile.set(profileId, current);
  });
  return profiles
    .filter((profile) => !["SUPERSEDED", "RETIRED"].includes(String(profile.governance_status || "").toUpperCase()))
    .map((profile) => ({ ...profile, covered_events: coveredByProfile.get(Number(profile.id)) || [] }))
    .sort((a, b) => String(a.sport_name).localeCompare(String(b.sport_name)));
};

export const summarizeAdoption = (previews = []) => previews.reduce(
  (summary, preview) => ({
    total: summary.total + Number(preview?.total_matches || 0),
    eligible: summary.eligible + Number(preview?.eligible_matches || 0),
    governed: summary.governed + Number(preview?.already_using_version || 0),
    protected:
      summary.protected +
      Number(preview?.started_matches_unchanged || 0) +
      Number(preview?.completed_matches_unchanged || 0) +
      Number(preview?.locked_snapshots_unchanged || 0),
    conflicts:
      summary.conflicts +
      Number(preview?.different_profile_unchanged || 0) +
      Number(preview?.event_overrides_unchanged || 0) +
      Number(preview?.participant_mismatches || 0),
  }),
  { total: 0, eligible: 0, governed: 0, protected: 0, conflicts: 0 }
);

export const normalizeScheduleEvents = (payload) =>
  Array.isArray(payload) ? payload : Array.isArray(payload?.events) ? payload.events : [];

export const ongoingScheduleEvents = (payload) => normalizeScheduleEvents(payload).filter((row) =>
  ["ONGOING", "LIVE", "IN_PROGRESS"].includes(String(row?.status || row?.match_status || "").toUpperCase())
);

export const humanizeSetupError = (error) => {
  const detail = error?.response?.data?.detail;
  const code = String(detail?.code || "").toUpperCase();
  const known = {
    ANOTHER_INTRAMURAL_ACTIVE: "Complete the currently active Intramural before activating this one.",
    RULE_PROFILE_NOT_APPROVED: "Validate, approve, and lock every required rule profile first.",
    SCHEDULE_INVALID: "Resolve the schedule blockers before activation.",
    SCHEDULE_DATE_SHIFT_CONFLICT: "The selected dates create schedule conflicts. Review the details and choose another window.",
  };
  return known[code] || detail?.message || (typeof detail === "string" ? detail : "The action could not be completed. Review the requirements and try again.");
};
