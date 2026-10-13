const TYPE_ALIASES = {
  FREE_THROW_MADE: { tier: "primary", label: "+1", points: 1 },
  FREE_THROW: { tier: "primary", label: "+1", points: 1 },
  ONE_POINT_MADE: { tier: "primary", label: "+1", points: 1 },
  ONE_PT_MADE: { tier: "primary", label: "+1", points: 1 },
  FIELD_GOAL_2_MADE: { tier: "primary", label: "+2", points: 2 },
  TWO_POINT_MADE: { tier: "primary", label: "+2", points: 2 },
  TWO_PT_MADE: { tier: "primary", label: "+2", points: 2 },
  FIELD_GOAL_3_MADE: { tier: "primary", label: "+3", points: 3 },
  THREE_POINT_MADE: { tier: "primary", label: "+3", points: 3 },
  THREE_PT_MADE: { tier: "primary", label: "+3", points: 3 },
};

const typeOf = (control) => String(control?.event_type || "").trim().toUpperCase();

export const isBasketballTeamActionControl = (control) =>
  /(ASSIST|STEAL|BLOCK|TURNOVER|REBOUND|OFFENSIVE_REBOUND|DEFENSIVE_REBOUND)/.test(typeOf(control));

export const classifyTimedTeamControls = (controls = []) => {
  const result = { primary: [], secondary: [], utility: [], destructive: [], fallback: [], teamActions: [] };
  for (const control of Array.isArray(controls) ? controls : []) {
    if (!control || control.enabled === false) continue;
    const type = typeOf(control);
    const alias = TYPE_ALIASES[type];
    if (alias) {
      result.primary.push({ ...control, quickLabel: alias.label, points: alias.points });
    } else if (isBasketballTeamActionControl(control)) {
      result.teamActions.push(control);
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
    if (!type || DEDICATED_CONTROL_PATTERN.test(type) || isBasketballTeamActionControl(control) || seenTypes.has(type)) return false;
    seenTypes.add(type);
    return true;
  });
};

export const getBasketballActionDisabledReason = ({
  eventType,
  teamId,
  possessionTeamId,
  possessionTeamName,
  hasSelectedPlayer = true,
  disabled = false,
  generalDisabledReason = "",
} = {}) => {
  if (disabled && generalDisabledReason) return generalDisabledReason;
  if (!eventType) return "";
  const type = String(eventType || "").trim().toUpperCase();

  // If a player is required for scoring or player actions and none is selected
  if (!hasSelectedPlayer) {
    return "Select a player above before scoring";
  }

  // When possession is uninitialized (null/undefined/0), all actions are allowed
  if (possessionTeamId === null || possessionTeamId === undefined || possessionTeamId === "" || Number(possessionTeamId) === 0) {
    return "";
  }

  const isPossessionTeam = Number(teamId) === Number(possessionTeamId);
  const possessionLabel = possessionTeamName ? `${possessionTeamName}` : "opponent";

  // 1. Offensive Field Goals (2PT / 3PT): Defending team disabled
  if (["TWO_PT_MADE", "THREE_PT_MADE", "TWO_POINT_MADE", "THREE_POINT_MADE", "FIELD_GOAL_2_MADE", "FIELD_GOAL_3_MADE"].includes(type)) {
    if (!isPossessionTeam) {
      return `Disabled — ${possessionLabel} has possession.`;
    }
    return "";
  }

  // 2. Free Throw: Not possession-gated
  if (["FREE_THROW", "FREE_THROW_MADE", "ONE_POINT_MADE", "ONE_PT_MADE"].includes(type)) {
    return "";
  }

  // 3. Turnover: Only team in possession can commit a turnover
  if (type === "TURNOVER") {
    if (!isPossessionTeam) {
      return "Turnovers can only be committed by the team in possession.";
    }
    return "";
  }

  // 4. Offensive Rebound: Only team in possession can get an offensive rebound
  if (type === "OFFENSIVE_REBOUND") {
    if (!isPossessionTeam) {
      return "Offensive rebounds can only be committed by the team in possession.";
    }
    return "";
  }

  // 5. Steal: Defending team only
  if (type === "STEAL") {
    if (isPossessionTeam) {
      return "Steals can only be credited to the defending team.";
    }
    return "";
  }

  // 6. Block: Defending team only
  if (type === "BLOCK") {
    if (isPossessionTeam) {
      return "Blocks can only be credited to the defending team.";
    }
    return "";
  }

  // 7. Defensive Rebound: Defending team only
  if (type === "DEFENSIVE_REBOUND") {
    if (isPossessionTeam) {
      return "Defensive rebounds can only be credited to the defending team.";
    }
    return "";
  }

  // 8. Assist: Team in possession only
  if (type === "ASSIST") {
    if (!isPossessionTeam) {
      return "Assists can only be credited to the team in possession.";
    }
    return "";
  }

  return "";
};

export const getTimedTeamControlType = typeOf;

/**
 * Returns true for controls that should be duplicated once per team (TIMEOUT).
 * These are team-level actions with no player requirement.
 */
export const isTimeoutControl = (control) => /TIMEOUT/.test(typeOf(control));

/**
 * Returns true for controls that act on the currently selected player
 * (FOUL, CARD, SUSPENSION). These appear once in the action bar and
 * are dispatched using whichever player the scorer has selected.
 */
export const isPlayerActionControl = (control) => /FOUL|CARD|SUSPENSION/.test(typeOf(control));

export const resolvePeriodAdvancePresentation = ({
  periodLabel = "",
  scores = [0, 0],
  totalPeriods = 4,
} = {}) => {
  const normalizedLabel = String(periodLabel || "").trim();
  const periodMatch = normalizedLabel.match(/(quarter|period|q)\s*(\d+)/i);
  const currentPeriodNum = periodMatch ? Number(periodMatch[2]) : null;
  const isOvertime = /(ot|overtime)/i.test(normalizedLabel);
  const otMatch = normalizedLabel.match(/(ot|overtime)\s*(\d+)/i);
  const currentOtNum = otMatch ? Number(otMatch[2]) : (isOvertime ? 1 : null);

  const score1 = Number(scores?.[0] || 0);
  const score2 = Number(scores?.[1] || 0);
  const isTied = score1 === score2;

  const effectiveTotal = Number(totalPeriods) > 0 ? Number(totalPeriods) : 4;
  const isFinalRegulation = currentPeriodNum !== null && currentPeriodNum >= effectiveTotal;

  if (isOvertime) {
    const otName = currentOtNum ? `OT ${currentOtNum}` : "OT";
    if (isTied) {
      return {
        label: `End ${otName} (Tie → Next OT)`,
        ariaLabel: `End ${otName} tied, advance to next overtime`,
        variant: "overtime",
        className:
          "min-h-11 rounded-xl border border-amber-400 bg-amber-500/15 px-4 text-sm font-bold text-amber-900 hover:bg-amber-500/25 dark:border-amber-500/40 dark:text-amber-100 disabled:opacity-45 transition",
        isFinal: false,
      };
    }
    return {
      label: `Finish Game (End ${otName})`,
      ariaLabel: `Finish Game, end ${otName}`,
      variant: "finish",
      className:
        "min-h-11 rounded-xl border border-emerald-500 bg-emerald-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-45 transition",
      isFinal: true,
    };
  }

  if (isFinalRegulation) {
    const qShort = `Q${currentPeriodNum}`;
    if (isTied) {
      return {
        label: `End ${qShort} (Tie → Overtime)`,
        ariaLabel: `End ${qShort} tied, advance to Overtime`,
        variant: "overtime",
        className:
          "min-h-11 rounded-xl border border-amber-400 bg-amber-500/15 px-4 text-sm font-bold text-amber-900 hover:bg-amber-500/25 dark:border-amber-500/40 dark:text-amber-100 disabled:opacity-45 transition",
        isFinal: false,
      };
    }
    return {
      label: `Finish Game (End ${qShort})`,
      ariaLabel: `Finish Game, end ${qShort}`,
      variant: "finish",
      className:
        "min-h-11 rounded-xl border border-emerald-500 bg-emerald-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-45 transition",
      isFinal: true,
    };
  }

  const baseLabel = normalizedLabel.replace(/\s+\d+$/, "") || "Period";
  return {
    label: `Next ${baseLabel}`,
    ariaLabel: `Advance to next ${baseLabel.toLowerCase()}`,
    variant: "next",
    className:
      "min-h-11 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-4 text-sm font-semibold hover:bg-[var(--surface-muted)] disabled:opacity-45 transition",
    isFinal: false,
  };
};
