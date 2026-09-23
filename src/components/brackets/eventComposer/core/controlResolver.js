/**
 * controlResolver — v1 Template-Driven Control Resolver
 * =======================================================
 * Resolves a selectedControlId against the validated config.
 * UI rules are derived strictly from the control schema and ui_spec.
 *
 * Priority:
 *   1. selectedControl fields (requires_team, requires_player, provides_value)
 *   2. ui_spec.render_rules defaults (when no control is selected)
 *
 * ❌ NO inference from event definitions
 * ❌ NO heuristic fallbacks
 */
import { resolveUIRules } from '../config/sportTemplateValidator.js';

export const controlResolver = (validatedConfig, selectedControlId) => {
  if (!validatedConfig?.controls) {
    return { selectedControl: null, selectedEventDefinition: null, uiRules: {} };
  }

  const selectedControl = validatedConfig.controls.find(c => c.id === selectedControlId) ?? null;

  const selectedEventDefinition = selectedControl
    ? (validatedConfig.event_types ?? []).find(
        et => String(et.name || '').toUpperCase() === selectedControl.event_type
      ) ?? null
    : null;

  const uiRules = resolveUIRules(selectedControl, validatedConfig.ui_spec);

  return { selectedControl, selectedEventDefinition, uiRules };
};

