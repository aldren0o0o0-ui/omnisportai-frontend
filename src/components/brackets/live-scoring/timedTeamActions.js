const TYPE_ALIASES = {
  FREE_THROW_MADE: { tier: "primary", label: "+1", points: 1 },
  FREE_THROW: { tier: "primary", label: "+1", points: 1 },
  ONE_POINT_MADE: { tier: "primary", label: "+1", points: 1 },
  FIELD_GOAL_2_MADE: { tier: "primary", label: "+2", points: 2 },
  TWO_POINT_MADE: { tier: "primary", label: "+2", points: 2 },
  TWO_PT_MADE: { tier: "primary", label: "+2", points: 2 },
  FIELD_GOAL_3_MADE: { tier: "primary", label: "+3", points: 3 },
  THREE_POINT_MADE: { tier: "primary", label: "+3", points: 3 },
  THREE_PT_MADE: { tier: "primary", label: "+3", points: 3 },
};

const typeOf = (control) => String(control?.event_type || "").trim().toUpperCase();

export const classifyTimedTeamControls = (controls = []) => {
  const result = { primary: [], secondary: [], utility: [], destructive: [], fallback: [] };
  for (const control of Array.isArray(controls) ? controls : []) {
    if (!control || control.enabled === false) continue;
    const type = typeOf(control);
    const alias = TYPE_ALIASES[type];
    if (alias) {
      result.primary.push({ ...control, quickLabel: alias.label, points: alias.points });
    } else if (/(TIMEOUT|FOUL|CARD|SUSPENSION|SUBSTITUTION)/.test(type)) {
      result.secondary.push(control);
    } else if (/(CLOCK_RESET|CLOCK_SET)/.test(type)) {
      result.destructive.push(control);
    } else if (/(CLOCK_START|CLOCK_STOP|CLOCK_PAUSE|CLOCK_RESUME|PERIOD_ADVANCE|QUARTER_ADVANCE|HALF_ADVANCE|POSSESSION)/.test(type)) {
      result.utility.push(control);
    } else {
      result.fallback.push(control);
    }
  }
  result.primary.sort((left, right) => Number(left.points || 0) - Number(right.points || 0));
  return result;
};

export const findTimedTeamControl = (controls, pattern) =>
  (Array.isArray(controls) ? controls : []).find((control) => pattern.test(typeOf(control))) || null;

const DEDICATED_CONTROL_PATTERN = /(CLOCK_START|CLOCK_STOP|CLOCK_PAUSE|CLOCK_RESUME|PERIOD_ADVANCE|QUARTER_ADVANCE|HALF_ADVANCE|POSSESSION|SUBSTITUTION)/;

export const getTimedTeamActionControls = (classified = {}) => {
  const seenTypes = new Set();
  return [
    ...(classified.secondary || []),
    ...(classified.fallback || []),
    ...(classified.destructive || []),
    ...(classified.utility || []),
  ].filter((control) => {
    const type = typeOf(control);
    if (!type || DEDICATED_CONTROL_PATTERN.test(type) || seenTypes.has(type)) return false;
    seenTypes.add(type);
    return true;
  });
};

export const getTimedTeamControlType = typeOf;
