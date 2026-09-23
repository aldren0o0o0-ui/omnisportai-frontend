/**
 * recruitmentWorkflow.js — pure, framework-free helpers for the Coach
 * Recruitment Dashboard. No React, no network. Everything here derives
 * presentation state from a normalized "workspace" object so the page stays
 * thin and the workflow logic is testable in isolation.
 *
 * Normalized workspace contract (built by PlayerApplications.jsx):
 * {
 *   groupKey, groupType: 'team' | 'pool',
 *   teamName, sportName, departmentName, tournamentName,
 *   hasSchedule: bool, tryoutDone: bool,
 *   counts: { total, forTryout, accepted, rejected },
 *   minPlayers: number|null, maxPlayers: number|null,
 *   minSatisfied: bool, maxOk: bool,
 *   teamInfoComplete: bool,
 *   certsComplete: bool, missingCertPlayers: [{ id, name }],
 *   isReady: bool,          // all submission requirements met
 *   isLocked: bool,         // already submitted / under review / approved
 *   currentStatus: string,  // backend status (for display only)
 * }
 */

// Spec Section 2 — Recruitment Progress stages, in workflow order.
export const RECRUITMENT_STAGES = [
  { key: "applicants", label: "Applicants" },
  { key: "tryout", label: "Tryout Scheduled" },
  { key: "selection", label: "Player Selection" },
  { key: "medical", label: "Medical Certificates" },
  { key: "submission", label: "Ready for Submission" },
];

export const STAGE_INDEX = {
  APPLICANTS: 0,
  TRYOUT: 1,
  SELECTION: 2,
  MEDICAL: 3,
  SUBMISSION: 4,
};

// In-page section anchors used by the Next Required Action button to scroll.
export const SECTION_IDS = {
  applicants: "recruitment-applicants",
  tryout: "recruitment-tryout",
  accepted: "recruitment-accepted",
  medical: "recruitment-medical",
  submit: "recruitment-submit",
};

const toUpper = (value) => String(value || "").trim().toUpperCase();

// Canonical backend TournamentTeam states plus legacy aliases retained for
// historical payload compatibility. Keep submission gating in one place so a
// PENDING_REVIEW registration cannot be submitted twice from the Coach UI.
export const TEAM_LOCKED_REGISTRATION_STATUSES = new Set([
  "PENDING_REVIEW",
  "APPROVED",
  "SUBMITTED",
  "UNDER_REVIEW",
]);

export const TEAM_RESUBMITTABLE_REGISTRATION_STATUSES = new Set([
  "INCOMPLETE",
  "REJECTED",
  "EXPIRED",
  "REVISION_REQUESTED",
  "WITHDRAWN",
]);

/**
 * Pull a medical-certificate URL out of the free-text health_notes field.
 * Backend stores it as "Medical Certificate Attachment: {url}". Kept here as
 * the single source of truth (moved from PlayerApplications.jsx).
 */
export const extractMedicalCertificateUrl = (healthNotes) => {
  const raw = String(healthNotes || "").trim();
  if (!raw) return "";
  const match = raw.match(/(\/static\/uploads\/team_applications_medical\/\S+|https?:\/\/\S+)/i);
  return match ? String(match[1] || "").trim() : "";
};

export const getMedicalCertificateStatus = (rowOrHealthNotes) => {
  if (rowOrHealthNotes && typeof rowOrHealthNotes === "object") {
    const fromApi = String(rowOrHealthNotes.medical_certificate_status || "").trim().toUpperCase();
    if (fromApi) return fromApi;
    return getMedicalCertificateStatus(rowOrHealthNotes.health_notes);
  }
  const raw = String(rowOrHealthNotes || "").trim();
  if (!extractMedicalCertificateUrl(raw)) return "NOT_SUBMITTED";
  const statusLine = raw
    .replace(/\r/g, "\n")
    .split("\n")
    .find((line) => line.trim().toLowerCase().startsWith("medical certificate status:"));
  if (!statusLine) return "PENDING";
  const status = statusLine.split(":", 2)[1]?.trim().toUpperCase() || "PENDING";
  return ["PENDING", "RECEIVED", "REJECTED"].includes(status) ? status : "PENDING";
};

export const isMedicalCertificateReceived = (rowOrHealthNotes) =>
  getMedicalCertificateStatus(rowOrHealthNotes) === "RECEIVED";

/** Whether a tryout schedule's date has already passed. */
export const isTryoutDone = (schedule) => {
  if (!schedule?.scheduled_date) return false;
  const scheduled = new Date(schedule.scheduled_date);
  if (Number.isNaN(scheduled.getTime())) return false;
  return scheduled.getTime() <= Date.now();
};

/** Human-friendly date label for a tryout schedule (e.g. "June 30, 2:00 PM"). */
export const formatScheduledLabel = (schedule) => {
  if (!schedule?.scheduled_date) return "";
  const date = new Date(schedule.scheduled_date);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Build the normalized workspace object the rest of this module consumes, from
 * the pieces the page already has: a grouped team/pool, its tryout schedule,
 * and (for teams) the backend readiness payload. This is the single place that
 * maps backend state onto the workflow contract so no section re-derives rules.
 *
 * @param {object} group        — grouped team/pool from the page (acceptedTeamGroups shape)
 * @param {object|null} schedule — tryout schedule for the group, or null
 * @param {object|null} readiness — backend readiness payload (teams only), or null
 */
export const buildWorkspace = (group, schedule, readiness) => {
  if (!group) return null;

  const counts = group.counts || {};
  const tryoutDone = isTryoutDone(schedule);
  const isPool = group.groupType === "pool";
  const acceptedPlayers = Array.isArray(group.players) ? group.players : [];
  const playersMissingReceivedCertificate = acceptedPlayers
    .filter((player) => !isMedicalCertificateReceived(player))
    .map((player) => ({
      id: player?.applicant_id || player?.id,
      name: player?.applicant_name || player?.name || "Player",
    }));
  const allAcceptedCertificatesReceived =
    acceptedPlayers.length > 0 && playersMissingReceivedCertificate.length === 0;

  // Locked = already submitted / under review / approved (mirrors the page's
  // submit-gate sets for teams vs pools).
  const currentStatus = toUpper(group.currentStatus);
  const isLocked = isPool
    ? ["SUBMITTED_FOR_REVIEW", "APPROVED", "CLOSED"].includes(currentStatus)
    : TEAM_LOCKED_REGISTRATION_STATUSES.has(currentStatus);

  if (isPool) {
    // Pools have no medical-certificate or team-info gate; readiness is the
    // pool's own validity. Auto-complete those stages so the stepper flows
    // Applicants → Tryout → Selection → Ready.
    return {
      groupKey: group.groupKey,
      groupType: "pool",
      teamName: group.teamName,
      sportName: group.sportName,
      departmentName: group.departmentName,
      tournamentName: group.tournamentName,
      hasSchedule: Boolean(schedule),
      tryoutDone,
      scheduledLabel: formatScheduledLabel(schedule),
      counts,
      minPlayers: group?.rosterInfo?.minPlayers ?? null,
      maxPlayers: group?.rosterInfo?.maxPlayers ?? null,
      minSatisfied: Boolean(group.isValid),
      maxOk: Boolean(group.isValid),
      teamInfoComplete: true,
      certsComplete: allAcceptedCertificatesReceived,
      missingCertPlayers: playersMissingReceivedCertificate,
      missingReasons: [
        ...(!group.isValid ? [group.requirementLabel || "Select the required accepted players first."] : []),
        ...(!allAcceptedCertificatesReceived
          ? [
              playersMissingReceivedCertificate.length > 0
                ? `Medical certificate must be received for: ${playersMissingReceivedCertificate
                    .map((player) => player.name)
                    .join(", ")}.`
                : "Every accepted player must have a medical certificate marked as received.",
            ]
          : []),
      ],
      isReady: Boolean(group.isValid) && allAcceptedCertificatesReceived && !isLocked,
      isLocked,
      currentStatus,
    };
  }

  // Team workspace — backend readiness is the source of truth when present.
  const minSatisfied = readiness
    ? Boolean(readiness.min_satisfied)
    : Boolean(group.isValid);
  const maxOk = readiness ? Boolean(readiness.max_ok) : Boolean(group.isValid);
  const backendCertsComplete = readiness ? Boolean(readiness.all_certs_uploaded) : false;
  const certsComplete = acceptedPlayers.length > 0
    ? allAcceptedCertificatesReceived
    : backendCertsComplete;
  const teamInfoComplete = readiness ? Boolean(readiness.team_info_complete) : true;
  const missingCertPlayers = Array.isArray(readiness?.players_missing_certificate)
    ? readiness.players_missing_certificate.map((player) => ({
        id: player?.applicant_id,
        name: player?.applicant_name,
      }))
    : playersMissingReceivedCertificate;
  const missingReasons = Array.isArray(readiness?.missing) ? [...readiness.missing] : [];
  if (!certsComplete && playersMissingReceivedCertificate.length > 0) {
    const certificateMessage = `Medical certificate must be received for: ${playersMissingReceivedCertificate
      .map((player) => player.name)
      .join(", ")}.`;
    if (!missingReasons.includes(certificateMessage)) missingReasons.push(certificateMessage);
  }

  return {
    groupKey: group.groupKey,
    groupType: "team",
    teamName: group.teamName,
    sportName: group.sportName,
    departmentName: group.departmentName,
    tournamentName: group.tournamentName,
    hasSchedule: Boolean(schedule),
    tryoutDone,
    scheduledLabel: formatScheduledLabel(schedule),
    counts,
    minPlayers: readiness?.min_players ?? group?.rosterInfo?.minPlayers ?? null,
    maxPlayers: readiness?.max_players ?? group?.rosterInfo?.maxPlayers ?? null,
    minSatisfied,
    maxOk,
    teamInfoComplete,
    certsComplete,
    missingCertPlayers,
    missingReasons,
    isReady: Boolean(readiness?.is_ready) && certsComplete,
    isLocked,
    currentStatus,
  };
};

/**
 * Determine which lifecycle stage the workspace is currently in.
 * Returns an index into RECRUITMENT_STAGES.
 */
export const computeRecruitmentStage = (workspace) => {
  if (!workspace) return STAGE_INDEX.APPLICANTS;

  // A submitted / locked team is at the final stage.
  if (workspace.isLocked || workspace.isReady) return STAGE_INDEX.SUBMISSION;

  if (!workspace.hasSchedule) return STAGE_INDEX.APPLICANTS;
  if (!workspace.tryoutDone) return STAGE_INDEX.TRYOUT;

  // Tryout finished — are enough players accepted to satisfy the minimum?
  if (!workspace.minSatisfied) return STAGE_INDEX.SELECTION;

  // Enough players, but certificates still pending.
  if (!workspace.certsComplete) return STAGE_INDEX.MEDICAL;

  return STAGE_INDEX.SUBMISSION;
};

/**
 * The single most important next step (spec Section 4). Returns one action:
 * { title, description, buttonLabel, targetSection } — or null when there is
 * genuinely nothing to do (e.g. already submitted).
 */
export const computeNextAction = (workspace) => {
  if (!workspace) return null;

  const counts = workspace.counts || {};
  const forTryout = Number(counts.forTryout || 0);
  const applicantWord = (n) => `${n} applicant${n === 1 ? "" : "s"}`;

  if (workspace.isLocked) {
    return {
      title: "Submitted for review",
      description: "Your team has been sent to the sports facilitator. You'll be notified when a decision is made.",
      buttonLabel: "View Submission",
      targetSection: SECTION_IDS.submit,
      disabled: true,
    };
  }

  if (!workspace.hasSchedule) {
    const total = Number(counts.total || 0);
    return {
      title: "No tryout scheduled",
      description:
        total > 0
          ? `Schedule a tryout for ${applicantWord(total)}.`
          : "Schedule a tryout so applicants know when to attend.",
      buttonLabel: "Schedule Tryout",
      targetSection: SECTION_IDS.tryout,
    };
  }

  if (!workspace.tryoutDone) {
    return {
      title: "Tryout scheduled",
      description: workspace.scheduledLabel
        ? `Wait until ${workspace.scheduledLabel} before evaluating players.`
        : "Wait for the tryout date before evaluating players.",
      buttonLabel: "View Schedule",
      targetSection: SECTION_IDS.tryout,
    };
  }

  if (!workspace.minSatisfied) {
    return {
      title: "Tryout finished",
      description:
        forTryout > 0
          ? `Evaluate ${applicantWord(forTryout)} and build your roster.`
          : "Evaluate applicants and build your roster.",
      buttonLabel: "Review Applicants",
      targetSection: SECTION_IDS.applicants,
    };
  }

  if (!workspace.certsComplete) {
    const missing = Number((workspace.missingCertPlayers || []).length || 0);
    return {
      title: "Medical certificates missing",
      description:
        missing > 0
          ? `${missing} accepted player${missing === 1 ? "" : "s"} still need to upload medical certificates.`
          : "Some accepted players still need to upload medical certificates.",
      buttonLabel: "View Accepted Players",
      targetSection: SECTION_IDS.medical,
    };
  }

  if (!workspace.teamInfoComplete) {
    return {
      title: "Complete team information",
      description: "Finish your team details before submitting for facilitator review.",
      buttonLabel: "View Checklist",
      targetSection: SECTION_IDS.submit,
    };
  }

  return {
    title: "Everything complete",
    description: "Your team is ready for facilitator review.",
    buttonLabel: "Submit Team Registration",
    targetSection: SECTION_IDS.submit,
  };
};

/**
 * Registration checklist (V2 Registration Readiness). Unmet requirements first.
 * Works for both team workspaces (backed by readiness fields) and pools
 * (backed by validity).
 *
 * "Coach assigned" and "Eligibility complete" are display-only affirmations:
 * the coach is managing their own assigned team and eligibility is confirmed at
 * submit time. They do NOT gate submission — the backend `is_ready` flag remains
 * the single source of truth for whether the submit button is enabled.
 */
export const buildChecklist = (workspace) => {
  if (!workspace) return [];

  if (workspace.groupType === "pool") {
    const items = [
      { ok: Boolean(workspace.minSatisfied), label: "Required entries selected" },
      { ok: Boolean(workspace.maxOk), label: "Within entry limit" },
    ];
    return items.sort((a, b) => Number(a.ok) - Number(b.ok));
  }

  const items = [
    { ok: Boolean(workspace.minSatisfied), label: "Minimum roster reached" },
    { ok: Boolean(workspace.maxOk), label: "Maximum roster valid" },
    { ok: Boolean(workspace.teamInfoComplete), label: "Team information completed" },
    { ok: true, label: "Coach assigned" },
    { ok: Boolean(workspace.certsComplete), label: "Medical certificates completed" },
    { ok: true, label: "Eligibility confirmed" },
  ];

  // Unmet requirements first (spec: "Display unmet requirements first").
  return items.sort((a, b) => Number(a.ok) - Number(b.ok));
};

/** Count of satisfied checklist items, for the "X / N Requirements Complete" readout. */
export const checklistProgress = (workspace) => {
  const items = buildChecklist(workspace);
  const done = items.filter((item) => item.ok).length;
  return { done, total: items.length };
};

export { toUpper as normalizeStatus };
