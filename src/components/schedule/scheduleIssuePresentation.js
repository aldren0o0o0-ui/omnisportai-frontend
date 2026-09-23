export const groupScheduleConflicts = (conflicts, { normalizeContractSeverity, normalizeResolutionOptions }) => {
  const groups = {};
  for (const conflict of Array.isArray(conflicts) ? conflicts : []) {
    const type = String(conflict.code || conflict.type || "SCHEDULE_CONFLICT").toUpperCase();
    const evidence = conflict?.evidence && typeof conflict.evidence === "object" ? conflict.evidence : {};
    const venueId = Number(conflict?.venue_id ?? evidence?.venue_id ?? 0);
    const slot = String(conflict?.slot || evidence?.slot || "").trim();
    const groupingKey = type === "VENUE_CONFLICT" ? `${type}:${venueId || "na"}:${slot || "na"}` : type;
    if (!groups[groupingKey]) {
      groups[groupingKey] = {
        key: groupingKey, type,
        severity: normalizeContractSeverity(conflict.severity, conflict.blocking !== false),
        confidence: conflict.confidence || null, blocking: conflict.blocking !== false,
        category: conflict.category || null,
        venueId: Number.isFinite(venueId) && venueId > 0 ? Math.trunc(venueId) : null,
        slot: slot || null, matchIds: [], affectedMatchIds: [], count: 0,
        repairSuggestions: conflict.recommended_actions ?? conflict.repair_suggestions ?? [],
        resolutionOptions: normalizeResolutionOptions(conflict.resolution_options),
        message: conflict.message || "", reason: conflict.reason || "", evidence,
        fixTargets: conflict.fix_targets || []
      };
    }
    groups[groupingKey].matchIds.push(...(conflict.match_ids ?? []));
    if (Array.isArray(evidence?.affected_match_ids)) groups[groupingKey].affectedMatchIds.push(...evidence.affected_match_ids);
    groups[groupingKey].count += 1;
    const incomingOptions = normalizeResolutionOptions(conflict.resolution_options);
    if (incomingOptions.length > 0) {
      const existing = new Map((groups[groupingKey].resolutionOptions || []).map(option => [`${option.option_type}|${option.label}`, option]));
      incomingOptions.forEach(option => {
        const optionKey = `${option.option_type}|${option.label}`;
        if (!existing.has(optionKey)) existing.set(optionKey, option);
      });
      groups[groupingKey].resolutionOptions = Array.from(existing.values());
    }
  }
  const order = { BLOCKING: 0, WARNING: 1, INFO: 2 };
  return Object.values(groups).sort((a, b) => (a.blocking === b.blocking ? 0 : a.blocking ? -1 : 1) || (order[a.severity] ?? 9) - (order[b.severity] ?? 9) || String(a.type).localeCompare(String(b.type)));
};

export const collectScheduleIssueMatchIds = group => {
  const ids = new Set();
  const push = rawId => { const parsed = Number(rawId); if (Number.isFinite(parsed) && parsed > 0) ids.add(Math.trunc(parsed)); };
  (Array.isArray(group?.matchIds) ? group.matchIds : []).forEach(push);
  (Array.isArray(group?.affectedMatchIds) ? group.affectedMatchIds : []).forEach(push);
  const evidence = group?.evidence && typeof group.evidence === "object" ? group.evidence : {};
  if (Array.isArray(evidence?.match_ids)) evidence.match_ids.forEach(push);
  if (Array.isArray(evidence?.affected_match_ids)) evidence.affected_match_ids.forEach(push);
  if (Array.isArray(evidence?.affected_matches)) evidence.affected_matches.forEach(row => push(row?.match_id || row?.id));
  [evidence?.match_id, evidence?.target_match_id, evidence?.conflict_match_id].forEach(push);
  return Array.from(ids);
};

export const getScheduleIssueFriendlyTitle = (group, { getVenueLabelById, buildIssueTitle }) => {
  const type = String(group?.type || "").toUpperCase();
  const evidence = group?.evidence && typeof group.evidence === "object" ? group.evidence : {};
  const venueLabel = getVenueLabelById(group?.venueId || evidence?.venue_id, evidence?.venue_name || "");
  if (type === "VENUE_CONFLICT") return `${venueLabel} is over capacity`;
  if (type === "MISSING_SCHEDULE_SLOT" || type === "NO_VALID_SLOT") return "Some matches could not be placed in a valid slot";
  return buildIssueTitle({ message: group?.message, reason: group?.reason, code: group?.type });
};

export const getScheduleIssueFriendlyMessage = (group, { getVenueLabelById, formatDateTimeRange }) => {
  const type = String(group?.type || "").toUpperCase();
  const evidence = group?.evidence && typeof group.evidence === "object" ? group.evidence : {};
  if (["MISSING_SCHEDULE_SLOT", "NO_VALID_SLOT", "MISSING_VENUE_ASSIGNMENT"].includes(type)) return "The system could not find a valid time and venue for one or more matches.";
  if (type === "VENUE_CONFLICT") {
    const venueLabel = getVenueLabelById(group?.venueId || evidence?.venue_id, evidence?.venue_name || "");
    const playingAreas = Number(evidence?.playing_areas || 0);
    const simultaneous = Number(evidence?.simultaneous_matches ?? evidence?.overlapping_assignments ?? 0);
    const slotText = evidence?.slot ? formatDateTimeRange(evidence.slot, evidence.slot) : "";
    if (playingAreas > 0 && simultaneous > 0) return `${simultaneous} match(es) are scheduled at the same time, but ${venueLabel} has only ${playingAreas} playing area(s).${slotText ? ` Time: ${slotText}.` : ""}`;
    return `${venueLabel} has overlapping matches that exceed available playing areas.`;
  }
  return String(group?.message || group?.reason || "Schedule conflict detected.");
};

export const buildScheduleIssueEvidenceRows = (group, { getVenueLabelById, formatDateTimeRange, buildEvidenceRows }) => {
  const evidence = group?.evidence && typeof group.evidence === "object" ? group.evidence : {};
  const rows = [];
  if (group?.venueId || evidence?.venue_id || evidence?.venue_name) rows.push({ key: "venue_name", label: "Venue", value: getVenueLabelById(group?.venueId || evidence?.venue_id, evidence?.venue_name || "") });
  if (Number.isFinite(Number(evidence?.playing_areas))) rows.push({ key: "playing_areas", label: "Available playing areas", value: String(Number(evidence.playing_areas)) });
  const simultaneous = Number(evidence?.simultaneous_matches ?? evidence?.overlapping_assignments ?? NaN);
  if (Number.isFinite(simultaneous)) rows.push({ key: "simultaneous_matches", label: "Matches scheduled at this time", value: String(simultaneous) });
  if (evidence?.slot) rows.push({ key: "slot", label: "Time", value: formatDateTimeRange(evidence.slot, evidence.slot) });
  buildEvidenceRows({ evidence }).forEach(row => {
    if (rows.some(existing => existing.key === row.key)) return;
    if (["venue_id", "venue_name", "playing_areas", "simultaneous_matches", "overlapping_assignments", "match_ids", "affected_match_ids", "slot"].includes(String(row.key))) return;
    rows.push(row);
  });
  return rows;
};

export const getScheduleIssueWhyItMatters = group => {
  const type = String(group?.type || "").toUpperCase();
  if (["MISSING_SCHEDULE_SLOT", "NO_VALID_SLOT", "MISSING_VENUE_ASSIGNMENT"].includes(type)) return "These matches are not on the calendar yet. The schedule is incomplete until they are assigned.";
  return "These conflicts can cause overlaps, missed games, or invalid venue usage if not resolved.";
};

export const getScheduleIssueNextSteps = group => {
  const type = String(group?.type || "").toUpperCase();
  const suggested = Array.isArray(group?.repairSuggestions) ? group.repairSuggestions.map(item => String(item || "").trim()).filter(Boolean) : [];
  const fallback = ["MISSING_SCHEDULE_SLOT", "NO_VALID_SLOT", "MISSING_VENUE_ASSIGNMENT"].includes(type)
    ? ["Add more available time.", "Add or enable a compatible venue.", "Review sport duration and buffers.", "Run Exact Check again."]
    : ["Review affected match times on the calendar.", "Check venue availability and playing areas.", "Adjust overlapping matches.", "Validate schedule again."];
  return [...new Set([...suggested, ...fallback])].slice(0, 4);
};

export const buildUnscheduledDiagnosticNotes = match => {
  const evidence = match?.evidence && typeof match.evidence === "object" ? match.evidence : {};
  const notes = [];
  const diagnosticSummary = String(evidence?.diagnostic_summary || "").trim();
  if (diagnosticSummary) notes.push(diagnosticSummary);
  const candidates = Array.isArray(evidence?.candidate_venue_diagnostics) ? evidence.candidate_venue_diagnostics : [];
  if (candidates.length > 0) {
    notes.push(`The system checked ${candidates.length} possible venue(s) for this match.`);
    candidates.slice(0, 3).forEach(venue => {
      const label = String(venue?.venue_name || (Number(venue?.venue_id) > 0 ? "Unassigned venue" : "Venue")).trim();
      const statusLabel = !venue?.active ? "Inactive" : venue?.compatible ? "Compatible" : "Not compatible";
      const reason = String(venue?.rejection_reason || "").trim() || "No usable slot was found.";
      if (label) notes.push(`${label} (${statusLabel}): ${reason}`);
    });
  } else {
    (Array.isArray(evidence?.rejected_venues) ? evidence.rejected_venues : []).slice(0, 3).forEach(venue => {
      const label = String(venue?.venue_name || (Number(venue?.venue_id) > 0 ? "Unassigned venue" : "Venue")).trim();
      const reason = String(venue?.rejection_reason || "").trim();
      if (label && reason) notes.push(`${label}: ${reason}`);
    });
  }
  return notes.slice(0, 4);
};

export const resolveScheduleReadinessState = ({ hasTournamentSelected, bracketContextLoaded, hasSchedulableBracket, preflightResult, preflightMode }) => {
  if (!hasTournamentSelected) return "idle";
  if (bracketContextLoaded && !hasSchedulableBracket) return "warning";
  if (!preflightResult) return "not_checked";
  if (preflightMode === "BLOCKED" || preflightMode === "EXACT_FAILED") return "blocked";
  if (preflightMode === "WARNING" || preflightMode === "ESTIMATED_ONLY") return "warning";
  return "ready";
};

export const mapRecommendationCenterItems = (issues, {
  getContextualResolutionTitle,
  getResolutionOptionExplanation,
  getRecommendationTrustLabel,
  getRecommendationTrustTone,
  isAutoApplicableVerifiedOption,
}) => {
  const items = [];
  const seen = new Set();
  issues.forEach(issue => {
    const baseImpactLabel = issue.severity === "BLOCKING" ? "High impact" : issue.severity === "WARNING" ? "Medium impact" : "Low impact";
    const baseMeta = issue.matchSummary ? `${issue.matchSummary.venueName} · ${issue.matchSummary.timeRange}` : issue.recommendedFix;
    if (Array.isArray(issue.resolutionOptions) && issue.resolutionOptions.length > 0) {
      issue.resolutionOptions.slice(0, 2).forEach(option => {
        const key = `${issue.issueKey}|${issue.matchId || "na"}|${option.option_type}|${option.label}`;
        if (seen.has(key)) return;
        seen.add(key);
        const canApply = Boolean(issue.matchId && isAutoApplicableVerifiedOption({ option, matchId: issue.matchId }));
        items.push({ key, issue, option, matchId: issue.matchId,
          title: getContextualResolutionTitle(option, issue.matchSummary || issue.rawIssue || issue),
          issueTitle: issue.title, description: getResolutionOptionExplanation(option), impactLabel: baseImpactLabel,
          trustLabel: getRecommendationTrustLabel(option), trustTone: getRecommendationTrustTone(option), canApply,
          quickAction: !canApply ? issue.quickActions?.[0] || null : null, meta: option?.impact_summary || baseMeta });
      });
      return;
    }
    if (issue.quickActions?.length > 0 || issue.recommendedFix) {
      const key = `${issue.issueKey}|manual`;
      if (seen.has(key)) return;
      seen.add(key);
      items.push({ key, issue, option: null, matchId: issue.matchId,
        title: issue.quickActions?.[0]?.label || issue.actionLabel || "Review manually", issueTitle: issue.title,
        description: issue.recommendedFix, impactLabel: baseImpactLabel, trustLabel: "Manual Setup",
        trustTone: "bg-slate-100 text-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-300", canApply: false,
        quickAction: issue.quickActions?.[0] || null, meta: baseMeta });
    }
  });
  return items.sort((left, right) => {
    if (left.canApply !== right.canApply) return left.canApply ? -1 : 1;
    return (left.issue?.priority ?? 99) - (right.issue?.priority ?? 99);
  }).slice(0, 8);
};

export const buildIssueDrawerSections = ({ conflictItems, unscheduledItems, warningItems, infoItems }) => [{
  key: "calendar-conflicts", anchorKey: "calendar-conflicts", title: "Calendar conflicts",
  description: "Scheduled matches that need time, venue, team, or player conflict fixes.", tone: "blocking", items: conflictItems,
  emptyText: "No blocking scheduled-match conflicts right now."
}, {
  key: "unscheduled-matches", anchorKey: "unscheduled-matches", title: "Unscheduled matches",
  description: "These matches are not on the calendar yet because they still need a valid time and venue.", tone: "blocking", items: unscheduledItems,
  emptyText: "No real unscheduled matches in current data."
}, {
  key: "warnings", anchorKey: "warnings", title: "Warnings",
  description: "These issues do not always block generation, but they still deserve review.", tone: "warning", items: warningItems,
  emptyText: "No warning-level issues right now."
}, {
  key: "info-placeholders", anchorKey: "info-placeholders", title: "Info and placeholders",
  description: "Guide-only notes and future-round placeholders that provide context for the schedule.", tone: "info", items: infoItems,
  emptyText: "No informational issues right now."
}];
