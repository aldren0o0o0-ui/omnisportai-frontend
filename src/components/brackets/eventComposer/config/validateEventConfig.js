/**
 * validateEventConfig - strict adapter for legacy caller shape.
 */
// config/validateEventConfig.js
// import { validateEventConfig as strictValidateEventConfig } from './sportTemplateValidator.js';
// import { applyLockedSnapshotCapabilities } from '../../utils/sportActionCapabilities.js';

// export const validateEventConfig = (rawConfig) => {
//   const status = String(rawConfig?.status || "VALID").toUpperCase();
//   const blockedStatuses = new Set(["CONFIG_LOCKED", "CONFIG_MISMATCH"]);
//   const incomingSafeDisplay = rawConfig?.safe_display && typeof rawConfig.safe_display === "object"
//     ? rawConfig.safe_display
//     : {};
//   const safeDisplay = {
//     allow_scoreboard: incomingSafeDisplay.allow_scoreboard !== false,
//     allow_timeline: incomingSafeDisplay.allow_timeline !== false,
//     allow_composer: blockedStatuses.has(status) ? false : incomingSafeDisplay.allow_composer !== false,
//   };

//   if (blockedStatuses.has(status)) {
//     const issues = Array.isArray(rawConfig?.issues) ? rawConfig.issues : [];
//     return {
//       validatedConfig: null,
//       configHash: null,
//       error: String(rawConfig?.reason || status),
//       issues: issues.length > 0
//         ? issues
//         : [status === "CONFIG_MISMATCH" ? "Template has changed since match creation." : "Invalid sport template configuration"],
//       sport_id: rawConfig?.sport_id || null,
//       status,
//       safe_display: safeDisplay,
//     };
//   }

//   const sourceConfig =
//     rawConfig?.event_config && typeof rawConfig.event_config === "object"
//       ? rawConfig.event_config
//       : rawConfig;

//   console.log("Validating event config with locked snapshot capabilities applied:", sourceConfig);
//   const capabilitySafeConfig = applyLockedSnapshotCapabilities(sourceConfig);
//   const result = strictValidateEventConfig(capabilitySafeConfig);
//   if (!result.valid) {
//     return {
//       validatedConfig: null,
//       configHash: null,
//       error: result.errors.join(' | ') || 'TEMPLATE_INVALID',
//       issues: result.errors,
//       sport_id: result.sport_id,
//       status: "CONFIG_LOCKED",
//       safe_display: safeDisplay,
//     };
//   }

//   return {
//     validatedConfig: result.config,
//     configHash: result.configHash,
//     error: null,
//     issues: [],
//     sport_id: result.config?.sport_id || null,
//     status: "VALID",
//     safe_display: safeDisplay,
//   };
// };

/**
 * validateEventConfig - strict adapter for legacy caller shape.
 */
// config/validateEventConfig.js
import { validateEventConfig as strictValidateEventConfig } from "./sportTemplateValidator.js";
import { applyLockedSnapshotCapabilities } from "../../utils/sportActionCapabilities.js";

const isObject = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const hasEventConfigurationShape = (value) =>
  isObject(value) &&
  (
    Array.isArray(value.controls) ||
    Array.isArray(value.action_groups) ||
    Array.isArray(value.supported_actions)
  );

export const validateEventConfig = (rawConfig) => {
  const status = String(rawConfig?.status || "VALID").toUpperCase();
  const blockedStatuses = new Set(["CONFIG_LOCKED", "CONFIG_MISMATCH"]);

  const incomingSafeDisplay = isObject(rawConfig?.safe_display)
    ? rawConfig.safe_display
    : {};

  const safeDisplay = {
    allow_scoreboard: incomingSafeDisplay.allow_scoreboard !== false,
    allow_timeline: incomingSafeDisplay.allow_timeline !== false,
    allow_composer:
      blockedStatuses.has(status)
        ? false
        : incomingSafeDisplay.allow_composer !== false,
  };

  if (blockedStatuses.has(status)) {
    const issues = Array.isArray(rawConfig?.issues)
      ? rawConfig.issues
      : [];

    return {
      validatedConfig: null,
      configHash: null,
      error: String(rawConfig?.reason || status),
      issues:
        issues.length > 0
          ? issues
          : [
              status === "CONFIG_MISMATCH"
                ? "Template has changed since Match creation."
                : "Invalid Sport template configuration.",
            ],
      sport_id: rawConfig?.sport_id || null,
      status,
      safe_display: safeDisplay,
    };
  }

  const nestedEventConfig = isObject(rawConfig?.event_config)
    ? rawConfig.event_config
    : null;

  const sourceConfig = nestedEventConfig || rawConfig;

  /*
   * The runtime Match-state response is not itself an event configuration.
   * Do not silently validate it as though it contained controls.
   */
  if (!hasEventConfigurationShape(sourceConfig)) {
    if (import.meta.env.DEV) {
      console.warn(
        "Live-scoring event configuration is missing from the backend response.",
        {
          match_id: rawConfig?.match_id ?? null,
          status,
          has_event_config: Boolean(nestedEventConfig),
          raw_keys: Object.keys(rawConfig || {}),
          source_keys: Object.keys(sourceConfig || {}),
          rule_snapshot: rawConfig?.rule_snapshot ?? null,
          safe_display: rawConfig?.safe_display ?? null,
        }
      );
    }

    return {
      validatedConfig: null,
      configHash: null,
      error: "EVENT_CONFIG_MISSING",
      issues: [
        "The Match state is valid, but its scoring-control configuration was not provided.",
      ],
      sport_id: rawConfig?.sport_id || null,
      status: "CONFIG_LOCKED",
      safe_display: {
        ...safeDisplay,
        allow_composer: false,
      },
    };
  }

  const capabilitySafeConfig =
    applyLockedSnapshotCapabilities(sourceConfig);

  const result = strictValidateEventConfig(capabilitySafeConfig);

  if (!result.valid) {
    return {
      validatedConfig: null,
      configHash: null,
      error: result.errors.join(" | ") || "TEMPLATE_INVALID",
      issues: result.errors,
      sport_id: result.sport_id,
      status: "CONFIG_LOCKED",
      safe_display: {
        ...safeDisplay,
        allow_composer: false,
      },
    };
  }

  return {
    validatedConfig: result.config,
    configHash: result.configHash,
    error: null,
    issues: [],
    sport_id: result.config?.sport_id || null,
    status: "VALID",
    safe_display: safeDisplay,
  };
};