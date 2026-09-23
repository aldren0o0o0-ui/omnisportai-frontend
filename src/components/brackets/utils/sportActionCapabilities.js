const normalizeActionCode = (value) =>
  String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

const resolveActionCode = (value) => {
  if (typeof value === "string") {
    return normalizeActionCode(value);
  }

  if (!value || typeof value !== "object") {
    return "";
  }

  return normalizeActionCode(
    value.event_type ??
      value.action_type ??
      value.event_code ??
      value.action ??
      value.code ??
      value.name
  );
};

const eventCode = (row) => resolveActionCode(row);

const resolveSupportedActions = (config) => {
  const explicitCandidates = [
    config?.supported_actions,
    config?.runtime_model?.supported_actions,
    config?.match_logic?.supported_actions,
  ];
  const explicit = explicitCandidates.find(Array.isArray);
  if (explicit) return explicit;

  // Historical v1 compatibility only.
  if (
    config?.template_version === "1.0.0" &&
    Array.isArray(config?.event_types) &&
    Array.isArray(config?.controls)
  ) {
    const declared = new Set(
      config.event_types.map(resolveActionCode).filter(Boolean)
    );
    return config.controls
      .map(resolveActionCode)
      .filter((code) => code && declared.has(code));
  }
  return [];
};

/**
 * Treat the backend snapshot capability list as the only scoring-control
 * authority. Missing capabilities intentionally produce no write controls.
 */
export const applyLockedSnapshotCapabilities = (config) => {
  if (!config || typeof config !== "object") {
    return config;
  }

  const rawSupportedActions = resolveSupportedActions(config);

  const supported = new Set(
    rawSupportedActions
      .map(resolveActionCode)
      .filter(Boolean)
  );

  const controls = Array.isArray(config.controls)
    ? config.controls
    : [];

  const actionGroups = Array.isArray(config.action_groups)
    ? config.action_groups
    : [];

  const filteredControls = controls.filter((row) =>
    supported.has(eventCode(row))
  );

  const filteredActionGroups = actionGroups
    .map((group) => ({
      ...group,
      controls: (
        Array.isArray(group?.controls)
          ? group.controls
          : []
      ).filter((row) => {
        if (row && typeof row === "object") {
          return supported.has(eventCode(row));
        }

        const referencedId = String(row ?? "")
          .trim()
          .toLowerCase();

        const control = controls.find(
          (candidate) =>
            String(candidate?.id ?? "")
              .trim()
              .toLowerCase() === referencedId
        );

        return Boolean(
          control && supported.has(eventCode(control))
        );
      }),
    }))
    .filter((group) => group.controls.length > 0);

  const capabilityFilterReason =
    ![
      config?.supported_actions,
      config?.runtime_model?.supported_actions,
      config?.match_logic?.supported_actions,
    ].some(Array.isArray)
      ? "SUPPORTED_ACTIONS_MISSING"
      : supported.size === 0
        ? "SUPPORTED_ACTIONS_EMPTY"
        : controls.length > 0 &&
            filteredControls.length === 0
          ? "CONTROL_ACTION_CODE_MISMATCH"
          : null;

  if (import.meta.env?.DEV && capabilityFilterReason) {
    console.warn("Live-scoring capability filtering produced no controls.", {
      reason: capabilityFilterReason,
      supported_actions: rawSupportedActions,
      normalized_supported_actions: [...supported],
      controls: controls.map((control) => ({
        id: control?.id ?? null,
        event_type: control?.event_type ?? null,
        action_type: control?.action_type ?? null,
        code: control?.code ?? null,
        name: control?.name ?? null,
        resolved_code: eventCode(control),
      })),
    });
  }

  return {
    ...config,
    controls: filteredControls,
    action_groups: filteredActionGroups,
    capability_filter_reason: capabilityFilterReason,
  };
};
