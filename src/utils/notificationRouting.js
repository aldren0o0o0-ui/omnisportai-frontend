export const resolveRoleKeyFromRoles = ({ roleNames = [], isViewerOnly = false } = {}) => {
  const normalized = Array.isArray(roleNames) ? roleNames.map((value) => String(value || "").trim().toUpperCase()) : [];
  if (normalized.includes("SPORTS_COORDINATOR")) return "coordinator";
  if (normalized.includes("DEPARTMENT_MANAGER")) return "department";
  if (normalized.includes("SPORTS_FACILITATOR")) return "sport-facilitator";
  if (normalized.includes("COACH")) return "coach";
  if (isViewerOnly || normalized.includes("VIEWER")) return "viewer";
  return "viewer";
};

export const getRelatedNotificationPath = ({ roleKey, notification }) => {
  if (!notification) return null;
  const eventType = String(notification.event_type || "").trim().toUpperCase();
  const announcementId = Number(
    notification.announcement_id ||
    notification?.metadata?.announcement_id ||
    notification?.metadata_json?.announcement_id ||
    0
  );
  if (eventType === "ANNOUNCEMENT" && Number.isFinite(announcementId) && announcementId > 0) {
    return `/${roleKey}/announcements/${Math.trunc(announcementId)}`;
  }
  const isMatchReminder = eventType === "MATCH_REMINDER";
  const isMatchResultFinalized = eventType === "MATCH_RESULT_FINALIZED";
  const isTeamApplicationEvent = eventType.startsWith("TEAM_APPLICATION_");
  const isTeamRegistrationEvent = eventType.startsWith("TEAM_REGISTRATION_");
  const isCompetitionEntryEvent = eventType.startsWith("COMPETITION_ENTRY_");
  const isPoolApplicationEvent = eventType.startsWith("ENTRY_POOL_APPLICATION_");
  const isTryoutScheduleEvent = eventType.startsWith("TRYOUT_SCHEDULE_");
  const isTryoutReminderEvent = eventType === "TRYOUT_REMINDER";
  const isMedicalCertificateEvent = eventType.startsWith("MEDICAL_CERTIFICATE_");

  if (roleKey === "sport-facilitator") {
    if (isTeamRegistrationEvent || isCompetitionEntryEvent) {
      return "/sport-facilitator/teams-and-players?status=PENDING_REVIEW";
    }
    if (notification.match_id && (isMatchReminder || isMatchResultFinalized)) {
      return `/sport-facilitator/matches/${notification.match_id}/live-scoring`;
    }
    if (notification.match_id) {
      return `/sport-facilitator/matches/${notification.match_id}/live-scoring`;
    }
  }
  if (roleKey === "coordinator") {
    if (isMatchReminder || isMatchResultFinalized) return "/coordinator/schedules";
    if (notification.tournament_id) return "/coordinator/intramurals";
    if (notification.team_id) return "/coordinator/teams";
    if (notification.match_id || notification.schedule_id || notification.venue_id) return "/coordinator/schedules";
  }
  if (roleKey === "department") {
    if (isMatchReminder || isMatchResultFinalized) return "/department/schedules";
    if (notification.tournament_id) return "/department/intramurals";
    if (notification.team_id) return "/department/teams";
    if (notification.match_id || notification.schedule_id || notification.venue_id) return "/department/schedules";
  }
  if (roleKey === "viewer") {
    if (isMatchReminder || isMatchResultFinalized) return "/viewer/schedules";
    if (isMedicalCertificateEvent) return "/viewer/dashboard";
    if (isTryoutScheduleEvent || isTryoutReminderEvent || isTeamApplicationEvent || isPoolApplicationEvent) return "/viewer/teams";
    if (notification.tournament_id) return "/viewer/intramurals";
    if (notification.team_id) return "/viewer/teams";
    if (notification.match_id || notification.schedule_id || notification.venue_id) return "/viewer/schedules";
  }
  if (roleKey === "coach") {
    if (isMatchReminder || isMatchResultFinalized) return "/coach/schedules";
    if (isMedicalCertificateEvent) return "/coach/player-applications";
    if (isCompetitionEntryEvent) return "/coach/brackets";
    if (isTeamRegistrationEvent) return "/coach/player-applications";
    if (isTeamApplicationEvent && notification.team_id) return "/coach/player-applications";
    if (isPoolApplicationEvent && (notification.metadata?.pool_id || notification.metadata_json?.pool_id)) return "/coach/player-applications";
    if (notification.match_id || notification.tournament_id) return "/coach/brackets";
    if (notification.team_id) return "/coach/player-applications";
  }
  return null;
};

export const buildFallbackNotificationPath = (roleKey = "viewer") => `/${String(roleKey || "viewer")}/notifications`;
