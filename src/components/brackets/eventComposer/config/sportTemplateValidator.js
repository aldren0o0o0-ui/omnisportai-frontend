/**
 * Sport Template Validator (v1) — Frontend
 * ==========================================
 * Strict build-time assertion engine for API-delivered event configs.
 *
 * REPLACES: silent normalization in validateEventConfig.js
 *
 * RULES:
 *   ✅ Asserts the config matches a registered v1 template
 *   ✅ Every controls[].event_type must exist in event_types
 *   ✅ Every scoring_rules[].event_type must exist in event_types
 *   ✅ ui_spec must be present
 *   ❌ NEVER patches, repairs, or silently fills missing fields
 *   ❌ NEVER returns a partially valid config — it's valid or rejected
 */

import { isSportRegistered } from './sportTemplateRegistry.js';

// ---------------------------------------------------------------------------
// Allowed enum values — must mirror sport_template_validator.py exactly
// ---------------------------------------------------------------------------
// config/sportTemplateValidator.js

const ALLOWED_SPORT_PROFILES = new Set([
  'POINT_GAME', 'SET_MATCH', 'ROUND_BASED', 'TURN_BASED', 'TIME_BASED',
]);

const ALLOWED_MATCH_TYPES = new Set([
  'SCORE', 'SETS', 'TIME', 'ROUND_BASED', 'RESULT',
]);

const ALLOWED_VALUE_TYPES = new Set([
  'integer', 'float', 'boolean', 'text', 'json',
]);

const ALLOWED_CATEGORIES = new Set([
  'score', 'event', 'violation',
]);

const ALLOWED_STYLES = new Set([
  'neutral', 'success', 'danger', 'warn',
]);

// ---------------------------------------------------------------------------
// Validation result shape
// ---------------------------------------------------------------------------

const pass = (config, configHash) => ({ valid: true, config, configHash, errors: [] });
const fail = (errors, sportId = '<unknown>') => ({
  valid: false,
  config: null,
  configHash: null,
  error: 'TEMPLATE_INVALID',
  sport_id: sportId,
  errors,
});

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validate an API-delivered event config against the v1 schema.
 *
 * Returns { valid, config, configHash, errors }.
 * On failure, config is null — never return a partially valid config.
 *
 * @param {object} rawConfig - The config object from the API response
 * @returns {{ valid: boolean, config: object|null, configHash: string|null, errors: string[] }}
 */
export const validateEventConfig = (rawConfig) => {
  if (!rawConfig || typeof rawConfig !== 'object') {
    return fail(['Config is missing or not an object']);
  }

  const errors = [];
//   const sportId = String(rawConfig.sport_id || '').trim().toLowerCase();
//   const templateVersion = String(rawConfig.template_version || '').trim();
//   const uiSchemaVersion = String(rawConfig.ui_schema_version || '').trim();
//   const renderSchemaVersion = String(rawConfig.ui_spec?.render_schema?.version || '').trim();
//   const sportProfile = String(rawConfig.sport_profile || '').trim().toUpperCase();
//   const matchType = String(rawConfig.match_type || '').trim().toUpperCase();

//   if (!sportId) errors.push('sport_id is required');
//   if (sportId && !isSportRegistered(sportId)) errors.push(`sport_id '${sportId}' is not registered`);
//   // if (templateVersion !== '1.0.0') errors.push(`template_version must be '1.0.0', got '${templateVersion}'`);
//   if(!templateVersion) {
//     errors.push('template_version is required');
//   } else if (!isLegacyTemplate && !isGovernedTemplate) {
//       errors.push(
//         `template_version '${templateVersion}' is not a valid governed template version`
//       );
//   }
//   if (uiSchemaVersion !== "2.0.0") {
//   errors.push(
//     `ui_schema_version must be '2.0.0', got '${uiSchemaVersion}'`
//   );
// }

// if (renderSchemaVersion !== "1.0.0") {
//   errors.push(
//     `ui_spec.render_schema.version must be '1.0.0', got '${renderSchemaVersion}'`
//   );
// }
//   if (!ALLOWED_SPORT_PROFILES.has(sportProfile)) errors.push(`sport_profile '${sportProfile}' is not valid`);
//   if (!ALLOWED_MATCH_TYPES.has(matchType)) errors.push(`match_type '${matchType}' is not valid`);

const sportId = String(
  rawConfig.sport_id || ""
)
  .trim()
  .toLowerCase();

const LEGACY_TEMPLATE_VERSIONS = new Set([
  "1.0.0",
]);

const GOVERNED_TEMPLATE_PATTERN = /^g1\.\d+$/;

const templateVersion = String(
  rawConfig.template_version || ""
).trim();

const uiSchemaVersion = String(
  rawConfig.ui_schema_version || ""
).trim();

const engineVersion = String(
  rawConfig.engine_version || ""
).trim();

const renderSchemaVersion = String(
  rawConfig.ui_spec?.render_schema?.version || ""
).trim();

const sportProfile = String(
  rawConfig.sport_profile || ""
)
  .trim()
  .toUpperCase();

const matchType = String(
  rawConfig.match_type || ""
)
  .trim()
  .toUpperCase();

if (!sportId) {
  errors.push("sport_id is required");
}

if (
  sportId &&
  !isSportRegistered(sportId)
) {
  errors.push(
    `sport_id '${sportId}' is not registered`
  );
}

const isLegacyTemplate = LEGACY_TEMPLATE_VERSIONS.has(templateVersion);
const isGovernedTemplate = GOVERNED_TEMPLATE_PATTERN.test(templateVersion);

if (!templateVersion) {
  errors.push("template_version is required");
} else if (!isLegacyTemplate && !isGovernedTemplate) {
  errors.push(
    `template_version '${templateVersion}' is unsupported`
  );
}

if (isGovernedTemplate) {
  if (uiSchemaVersion !== "2.0.0") {
    errors.push(`ui_schema_version must be '2.0.0' for governed templates, got '${uiSchemaVersion}'`);
  }

  if (renderSchemaVersion !== "1.0.0") {
    errors.push(
      `ui_spec.render_schema.version must be '1.0.0' for governed templates, got '${renderSchemaVersion}'`
    );
  }

   if (
    engineVersion &&
    engineVersion !== "2.0.0"
  ) {
    errors.push(
      `engine_version '${engineVersion}' is unsupported`
    );
  }
}

if (
    engineVersion &&
    !["1.0.0", "2.0.0"].includes(engineVersion)
  ) {
    errors.push(
      `legacy engine_version '${engineVersion}' is unsupported`
    );
  }


if (!ALLOWED_SPORT_PROFILES.has(sportProfile)) {
  errors.push(
    `sport_profile '${sportProfile}' is not valid`
  );
}

if (!ALLOWED_MATCH_TYPES.has(matchType)) {
  errors.push(
    `match_type '${matchType}' is not valid`
  );
}

  // --- event_types (validated first for cross-reference) ---
  const eventTypes = rawConfig.event_types;
  const declaredEventNames = new Set();

  if (!Array.isArray(eventTypes) || eventTypes.length === 0) {
    errors.push('event_types must be a non-empty array');
  } else {
    eventTypes.forEach((et, idx) => {
      const prefix = `event_types[${idx}]`;
      if (!et || typeof et !== 'object') { errors.push(`${prefix} must be an object`); return; }

      const name = String(et.name || '').trim().toUpperCase();
      if (!name) { errors.push(`${prefix}.name is required`); return; }
      if (declaredEventNames.has(name)) { errors.push(`${prefix}.name '${name}' is duplicated`); return; }
      declaredEventNames.add(name);

      if (!ALLOWED_VALUE_TYPES.has(String(et.value_type || '').toLowerCase())) {
        errors.push(`${prefix}.value_type '${et.value_type}' is not valid`);
      }
      if (!ALLOWED_CATEGORIES.has(String(et.category || '').toLowerCase())) {
        errors.push(`${prefix}.category '${et.category}' is not valid`);
      }
      ['has_team', 'has_player', 'has_value', 'counts_for_score'].forEach(f => {
        if (typeof et[f] !== 'boolean') errors.push(`${prefix}.${f} must be a boolean`);
      });
    });
  }

  // --- controls ---
  const controls = rawConfig.controls;
  if (!Array.isArray(controls) || controls.length === 0) {
    errors.push('controls must be a non-empty array');
  } else {
    const seenControlIds = new Set();
    controls.forEach((ctrl, idx) => {
      const prefix = `controls[${idx}]`;
      if (!ctrl || typeof ctrl !== 'object') { errors.push(`${prefix} must be an object`); return; }

      const id = String(ctrl.id || '').trim();
      if (!id) { errors.push(`${prefix}.id is required`); }
      else if (seenControlIds.has(id)) { errors.push(`${prefix}.id '${id}' is duplicated`); }
      else { seenControlIds.add(id); }

      if (!String(ctrl.label || '').trim()) errors.push(`${prefix}.label is required`);

      const eventType = String(ctrl.event_type || '').trim().toUpperCase();
      if (!eventType) {
        errors.push(`${prefix}.event_type is required`);
      } else if (declaredEventNames.size > 0 && !declaredEventNames.has(eventType)) {
        // Rule 8: controls.event_type must exist in event_types
        errors.push(`${prefix}.event_type '${eventType}' not found in event_types`);
      }

      if (!ALLOWED_STYLES.has(String(ctrl.style || '').toLowerCase())) {
        errors.push(`${prefix}.style '${ctrl.style}' is not valid`);
      }
      ['requires_team', 'requires_player', 'provides_value'].forEach(f => {
        if (typeof ctrl[f] !== 'boolean') errors.push(`${prefix}.${f} must be a boolean`);
      });
    });
  }

  // --- scoring_rules ---
  const scoringRules = rawConfig.scoring_rules;
  if (!Array.isArray(scoringRules) || scoringRules.length === 0) {
    errors.push('scoring_rules must be a non-empty array');
  } else {
    scoringRules.forEach((rule, idx) => {
      const prefix = `scoring_rules[${idx}]`;
      if (!rule || typeof rule !== 'object') { errors.push(`${prefix} must be an object`); return; }

      const et = String(rule.event_type || '').trim().toUpperCase();
      if (!et) {
        errors.push(`${prefix}.event_type is required`);
      } else if (declaredEventNames.size > 0 && !declaredEventNames.has(et)) {
        errors.push(`${prefix}.event_type '${et}' not found in event_types`);
      }
      if (typeof rule.points !== 'number') {
        errors.push(`${prefix}.points must be a number`);
      }
    });
  }

  const scoreEventTypes = rawConfig.score_event_types;
  if (!Array.isArray(scoreEventTypes) || scoreEventTypes.length === 0) {
    errors.push('score_event_types must be a non-empty array');
  } else {
    scoreEventTypes.forEach((eventName, idx) => {
      const normalized = String(eventName || '').trim().toUpperCase();
      if (!normalized) errors.push(`score_event_types[${idx}] must be non-empty`);
      else if (declaredEventNames.size > 0 && !declaredEventNames.has(normalized)) {
        errors.push(`score_event_types[${idx}] '${normalized}' not found in event_types`);
      }
    });
  }

  // --- ui_spec ---
  const uiSpec = rawConfig.ui_spec;
  if (!uiSpec || typeof uiSpec !== 'object') {
    errors.push('ui_spec is required and must be an object');
  } else {
    const rr = uiSpec.render_rules;
    if (!rr || typeof rr !== 'object') {
      errors.push('ui_spec.render_rules is required');
    } else {
      ['show_team_selector', 'show_player_selector', 'show_value_input'].forEach(f => {
        if (typeof rr[f] !== 'boolean') errors.push(`ui_spec.render_rules.${f} must be a boolean`);
      });
    }
    ['requires_team_by_default', 'requires_player_by_default'].forEach(f => {
      if (typeof uiSpec[f] !== 'boolean') errors.push(`ui_spec.${f} must be a boolean`);
    });
  }

  if (errors.length > 0) {
    return fail(errors, sportId);
  }

    const templateFamily = isGovernedTemplate
  ? "GOVERNED_V1"
  : "LEGACY_V1";  



  const supportedActions = Array.isArray(
  rawConfig.supported_actions
)
  ? rawConfig.supported_actions
      .map((value) =>
        String(typeof value === "object" ? value?.eventType || value?.code || value?.name || "" : value).trim().toUpperCase()
      )
      .filter(Boolean)
      .sort()
  : [];


  // Build deterministic hash from stable fields
const configHash = JSON.stringify({
  sport_id: sportId,
  template_version: templateVersion,
  template_family: templateFamily,
  ui_schema_version: uiSchemaVersion || null,
  engine_version: engineVersion || null,
  controls: controls
    .map((control) => ({  
      id: control.id,
      event_type: String(
        control.event_type || ""
      ).trim().toUpperCase(),
    }))
    .sort((a, b) =>
      String(a.id).localeCompare(String(b.id))
    ),
  supported_actions: supportedActions,
  event_types: [...declaredEventNames].sort(),
});

  // return pass(rawConfig, configHash);

    const validatedConfig = {
    ...rawConfig, 
    template_family: templateFamily
  };
  return pass(validatedConfig, configHash);
};



/**
 * Assert a config is valid or throw with the full error list.
 * Use in non-recoverable contexts where rendering must not proceed.
 */
export const assertEventConfig = (rawConfig) => {
  const result = validateEventConfig(rawConfig);
  if (!result.valid) {
    throw new Error(
      `[SportTemplateValidator] TEMPLATE_INVALID for sport '${result.sport_id}':\n` +
      result.errors.map(e => `  • ${e}`).join('\n')
    );
  }
  return result;
};

/**
 * Derive UI rules from the selected control (highest priority) with
 * ui_spec defaults as fallback. No inference, no heuristics.
 *
 * Priority:
 *   1. selectedControl.requires_* fields
 *   2. ui_spec.render_rules defaults
 */
export const resolveUIRules = (selectedControl, uiSpec) => {
  const renderRules = uiSpec?.render_rules ?? {};

  if (!selectedControl) {
    return {
      shouldShowTeamSelector: Boolean(renderRules.show_team_selector),
      shouldShowPlayerSelector: Boolean(renderRules.show_player_selector),
      shouldShowValueInput: Boolean(renderRules.show_value_input),
    };
  }

  return {
    // Per-control overrides take priority
    shouldShowTeamSelector: Boolean(selectedControl.requires_team),
    shouldShowPlayerSelector: Boolean(selectedControl.requires_player),
    // show value input only if control provides_value and has no fixed value
    shouldShowValueInput: Boolean(selectedControl.provides_value && selectedControl.value === undefined),
  };
};
