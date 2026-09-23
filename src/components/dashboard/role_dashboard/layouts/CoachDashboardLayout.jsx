import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, ClipboardList, Megaphone, Radio, Sparkles, Trophy, Users, CheckCircle2, ShieldCheck, Clock } from "lucide-react";
import DashboardCard from "../../../common/DashboardCard";
import { TeamLogo, SportIcon } from "../../../common/IdentityImage";
import { getChampionshipStandings } from "../../../../services/standingsService";
import { getBrackets } from "../../../../services/bracketService";
import { getManagedCompetitionParticipants } from "../../../../services/competitionParticipantService";
import { getScheduleEvents } from "../../../../services/scheduleService";
import { getCoachApplications } from "../../../../services/teamApplicationService";
import { getNotifications } from "../../../../services/notification/notificationService";
import {
  AnnouncementTimeline,
  buildAnnouncementTimeline,
  deriveTournamentPhase,
  resolveDashboardLifecycleStage,
  findTableByKeywords,
  getSelectedTournament,
  getSportLabel,
  getTodayEvents,
  isLiveEvent,
  MatchHeroCard,
  PanelHeader,
  SportsDirectoryGrid,
  TodaysMatchesTable,
  TournamentUpdatesPanel,
  sortEventsByStart,
} from "./dashboardLayoutUtils";
import { mapChampionshipLeaderboard, mapChampionshipSportBreakdown } from "./dashboardStandingsUtils.js";
import { DashboardStageSwitcher, LiveDashboardStage } from "./DashboardLifecycleStages";
import { useProfileDrawer } from "../../../profile";
import CoachOperationsDashboard from "./CoachOperationsDashboard";

const CoachDashboardLayout = ({
  dashboard,
  sportsList = [],
  startedTournament = null,
  workspaceId = null,
  coachContexts = [],
}) => {
  const { openProfile } = useProfileDrawer();
  const [championship, setChampionship] = useState(null);
  const [championshipUnavailable, setChampionshipUnavailable] = useState(false);
  const [brackets, setBrackets] = useState([]);
  const [directoryParticipants, setDirectoryParticipants] = useState([]);
  const [coachApplications, setCoachApplications] = useState([]);
  const [coachNotifications, setCoachNotifications] = useState([]);
  const [userSelectedStage, setUserSelectedStage] = useState(null);

  const tournament = useMemo(
    () => getSelectedTournament(dashboard) || startedTournament || null,
    [dashboard, startedTournament]
  );
  const tournamentId = tournament?.id ?? dashboard?.selected_tournament_id ?? null;

  const rawStatus = String(
    tournament?.lifecycle_status || tournament?.status || ""
  ).trim().toUpperCase();

  const [scheduleEvents, setScheduleEvents] = useState([]);

  const events = useMemo(() => {
    const fromDashboard = dashboard?.schedule?.events;
    if (Array.isArray(fromDashboard) && fromDashboard.length > 0) {
      return sortEventsByStart(fromDashboard);
    }
    if (Array.isArray(scheduleEvents) && scheduleEvents.length > 0) {
      return sortEventsByStart(scheduleEvents);
    }
    return [];
  }, [dashboard?.schedule?.events, scheduleEvents]);

  const teamIds = useMemo(
    () => (Array.isArray(dashboard?.scope?.team_ids) ? dashboard.scope.team_ids.map(Number) : []),
    [dashboard]
  );

  // Filter events specifically involving the coach's team(s)
  const scopedEvents = useMemo(() => {
    if (teamIds.length === 0) return events;
    const teamSet = new Set(teamIds);
    return events.filter((e) => teamSet.has(Number(e.team1_id)) || teamSet.has(Number(e.team2_id)));
  }, [events, teamIds]);

  const rawPhase = useMemo(() => deriveTournamentPhase(tournament, events), [tournament, events]);

  // Load championship data, brackets, and team registrations
  useEffect(() => {
    let active = true;
    const loadData = async () => {
      try {
        setChampionship(null);
        setChampionshipUnavailable(false);
        const [champData, bracketsData, directoryRows, schedulePayload, applicationPayload, notificationPayload] = await Promise.all([
          getChampionshipStandings({ tournamentId }).catch(() => null),
          getBrackets().catch(() => []),
          tournamentId && Number(workspaceId) > 0 ? getManagedCompetitionParticipants({ workspaceId: Number(workspaceId), tournamentId: Number(tournamentId), includeMembers: true }).catch(() => []) : [],
          tournamentId ? getScheduleEvents(Number(tournamentId)).catch(() => ({ events: [] })) : Promise.resolve({ events: [] }),
          tournamentId ? getCoachApplications("ALL", Number(tournamentId)).catch(() => ({ items: [] })) : Promise.resolve({ items: [] }),
          tournamentId ? getNotifications({ limit: 30 }).catch(() => ({ items: [] })) : Promise.resolve({ items: [] }),
        ]);
        if (!active) return;
        setChampionship(champData || null);
        setChampionshipUnavailable(!champData);
        if (Array.isArray(bracketsData)) setBrackets(bracketsData);
        setDirectoryParticipants(Array.isArray(directoryRows) ? directoryRows : []);
        setCoachApplications(Array.isArray(applicationPayload?.items) ? applicationPayload.items : []);
        setCoachNotifications(Array.isArray(notificationPayload?.items)
          ? notificationPayload.items
          : Array.isArray(notificationPayload) ? notificationPayload : []);
        setScheduleEvents(
          Array.isArray(schedulePayload?.events)
            ? schedulePayload.events
            : Array.isArray(schedulePayload)
              ? schedulePayload
              : []
        );
      } catch (apiError) {
        if (!active) return;
        console.error(apiError);
      }
    };
    void loadData();
    const refreshTimer = window.setInterval(() => void loadData(), 30000);
    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, [tournamentId, workspaceId]);

  // Next or Live match for coach's team
  const operationalEvents = scopedEvents.length > 0 ? scopedEvents : events;
  const hasLiveMatch = useMemo(() => operationalEvents.some((event) => isLiveEvent(event)), [operationalEvents]);
  // Announcements
  const announcementsTable = useMemo(() => findTableByKeywords(dashboard, ["announcement", "note"]), [dashboard]);
  const announcements = useMemo(
    () => buildAnnouncementTimeline(announcementsTable?.rows || []).slice(0, 6),
    [announcementsTable]
  );

  // Pending Player Requests
  const requestsTable = useMemo(() => findTableByKeywords(dashboard, ["application", "request"]), [dashboard]);
  const applicationRows = useMemo(
    () => (coachApplications.length > 0 ? coachApplications : Array.isArray(requestsTable?.rows) ? requestsTable.rows : []),
    [coachApplications, requestsTable]
  );
  const totalPendingRequests = applicationRows.filter((row) => ["PENDING", "FOR_TRYOUT"].includes(String(row?.application_status || row?.status || "").trim().toUpperCase())).length;

  const operationalParticipants = useMemo(() => {
    const rows = (Array.isArray(directoryParticipants) ? directoryParticipants : []).map((row) => ({
      ...row,
      members: Array.isArray(row?.members) ? [...row.members] : [],
    }));
    const accepted = coachApplications.filter((row) => String(row?.application_status || "").trim().toUpperCase() === "ACCEPTED_AS_PLAYER");
    for (const application of accepted) {
      const targetId = Number(application?.pool_id || application?.team_id || 0);
      const isPool = String(application?.source_type || "").trim().toUpperCase() === "ENTRY_POOL_APPLICATION";
      let participant = rows.find((row) => Number(row?.team_id || row?.entry_pool_id || row?.pool_id || 0) === targetId);
      if (!participant) {
        participant = {
          entry_id: null,
          team_id: isPool ? null : targetId,
          entry_pool_id: isPool ? targetId : null,
          display_name: application?.team_name || application?.pool_name || "My Team / Entry",
          sport_id: application?.sport_id,
          sport_name: application?.sport_name,
          event_name: application?.event_name,
          department_id: application?.department_id,
          department_name: application?.department_name,
          participant_shape: isPool ? application?.participant_shape || "SOLO" : "TEAM",
          public_status: "ROSTER_BUILDING",
          is_priority: true,
          coach: { display_name: "Assigned Coach", is_active: true },
          members: [],
        };
        rows.push(participant);
      }
      const applicantId = Number(application?.applicant_id || application?.user_id || 0);
      const applicantEmail = String(application?.applicant_email || application?.user_email || "").trim().toLowerCase();
      const existingMember = participant.members.find((member) =>
        (applicantId > 0 && Number(member?.player_id || member?.user_id || member?.id || 0) === applicantId)
        || (applicantEmail && String(member?.email || "").trim().toLowerCase() === applicantEmail)
      );
      if (existingMember) {
        existingMember.medical_certificate_status = application?.medical_certificate_status || existingMember.medical_certificate_status;
        existingMember.medical_certificate_note = application?.medical_certificate_note || existingMember.medical_certificate_note;
        existingMember.health_notes = application?.health_notes || existingMember.health_notes;
      } else participant.members.push({
        player_id: applicantId || application?.id,
        user_id: applicantId || null,
        display_name: application?.applicant_name || application?.user_name || "Accepted player",
        email: application?.applicant_email || application?.user_email,
        profile_image_url: application?.applicant_image_url,
        position: application?.position || "Player",
        medical_certificate_status: application?.medical_certificate_status,
        medical_certificate_note: application?.medical_certificate_note,
        health_notes: application?.health_notes,
      });
    }
    return rows;
  }, [coachApplications, directoryParticipants]);

  // Scoped brackets strictly for this tournament
  const scopedBrackets = useMemo(() => {
    if (!Array.isArray(brackets)) return [];
    if (!tournamentId) return brackets;
    return brackets.filter((b) => Number(b.tournament_id || b.tournamentId) === Number(tournamentId));
  }, [brackets, tournamentId]);

  // Intramural-only sports catalog matching
  const intramuralSportIds = useMemo(() => {
    const ids = new Set();
    const addId = (val) => {
      const num = Number(val);
      if (Number.isFinite(num) && num > 0) ids.add(num);
    };

    const targetTournament = tournament || startedTournament;
    if (Array.isArray(targetTournament?.sport_ids)) {
      targetTournament.sport_ids.forEach(addId);
    }
    if (targetTournament?.sport_id) {
      addId(targetTournament.sport_id);
    }
    if (Array.isArray(targetTournament?.sport_bracket_settings)) {
      targetTournament.sport_bracket_settings.forEach((s) => addId(s?.sport_id || s?.id));
    }
    if (Array.isArray(scopedBrackets)) {
      scopedBrackets.forEach((b) => addId(b?.sport_id || b?.sportId));
    }
    if (Array.isArray(events)) {
      events.forEach((ev) => addId(ev?.sport_id || ev?.sportId));
    }
    return ids;
  }, [tournament, startedTournament, scopedBrackets, events]);

  const intramuralSportNames = useMemo(() => {
    const names = new Set();
    const addName = (val) => {
      const str = String(val || "").trim().toLowerCase();
      if (str) names.add(str);
    };

    const targetTournament = tournament || startedTournament;
    if (Array.isArray(targetTournament?.sport_bracket_settings)) {
      targetTournament.sport_bracket_settings.forEach((s) => addName(s?.sport_name || s?.name || s?.sport));
    }
    if (Array.isArray(targetTournament?.sports_overview)) {
      targetTournament.sports_overview.forEach((s) => addName(typeof s === "string" ? s : s?.sport || s?.name));
    }
    if (Array.isArray(scopedBrackets)) {
      scopedBrackets.forEach((b) => addName(b?.sportName || b?.sport_name || b?.sport));
    }
    if (Array.isArray(events)) {
      events.forEach((ev) => addName(getSportLabel(ev)));
    }
    return names;
  }, [tournament, startedTournament, scopedBrackets, events]);

  const displaySports = useMemo(() => {
    const hasScopeCriteria = intramuralSportIds.size > 0 || intramuralSportNames.size > 0;
    const allCatalog = Array.isArray(sportsList) ? sportsList : [];

    const findCatalogSport = (id, name) => {
      const targetId = Number(id);
      const targetName = String(name || "").trim().toLowerCase();
      return allCatalog.find(
        (s) =>
          (targetId > 0 && Number(s.id) === targetId) ||
          (targetName && String(s.name || s.sport_name || "").trim().toLowerCase() === targetName)
      );
    };

    let baseSports = [];

    // Source 1: Catalog matched with tournament sport scope
    if (allCatalog.length > 0 && hasScopeCriteria) {
      const matched = allCatalog.filter((sport) => {
        const sId = Number(sport?.id);
        const sName = String(sport?.name || sport?.sport_name || "").trim().toLowerCase();
        return intramuralSportIds.has(sId) || intramuralSportNames.has(sName);
      });
      if (matched.length > 0) baseSports = matched;
    }

    // Source 2: Tournament bracket settings
    if (baseSports.length === 0) {
      const settings = tournament?.sport_bracket_settings || startedTournament?.sport_bracket_settings;
      if (Array.isArray(settings) && settings.length > 0) {
        baseSports = settings.map((s) => ({
          id: s?.sport_id || s?.id,
          name: s?.sport_name || s?.name || "Sport",
          category: s?.category || "Team",
          participant_shape: s?.participant_shape || "Team",
          team_count: s?.team_count || 0,
        }));
      }
    }

    // Source 3: Tournament brackets
    if (baseSports.length === 0 && Array.isArray(scopedBrackets) && scopedBrackets.length > 0) {
      const seen = new Set();
      scopedBrackets.forEach((b) => {
        const name = String(b?.sportName || b?.sport_name || b?.sport || "").trim();
        if (name && !seen.has(name.toLowerCase())) {
          seen.add(name.toLowerCase());
          baseSports.push({
            id: b?.sport_id || b?.sportId || baseSports.length + 1,
            name,
            participant_shape: b?.format || "Team",
            category: "Intramural Sport",
          });
        }
      });
    }

    // Source 4: Match events
    if (baseSports.length === 0 && Array.isArray(events) && events.length > 0) {
      const seen = new Set();
      events.forEach((ev) => {
        const name = String(getSportLabel(ev) || "").trim();
        if (name && !seen.has(name.toLowerCase())) {
          seen.add(name.toLowerCase());
          baseSports.push({
            id: ev?.sport_id || baseSports.length + 1,
            name,
            participant_shape: "Team",
            category: "Intramural Sport",
          });
        }
      });
    }

    return baseSports.map((sport) => {
      const matched = findCatalogSport(sport?.id || sport?.sport_id, sport?.name || sport?.sport_name || sport?.sport);
      return {
        ...sport,
        image_url: sport?.image_url || matched?.image_url || null,
        icon_url: sport?.icon_url || matched?.icon_url || null,
        sport_image_url: sport?.sport_image_url || matched?.sport_image_url || null,
        logo_url: sport?.logo_url || matched?.logo_url || null,
        name: sport?.name || sport?.sport_name || matched?.name || "Sport",
      };
    });
  }, [sportsList, intramuralSportIds, intramuralSportNames, tournament, startedTournament, scopedBrackets, events]);

  const sportBreakdown = useMemo(
    () => mapChampionshipSportBreakdown(championship?.sport_breakdown),
    [championship]
  );
  const olympicLeaderboard = useMemo(
    () => mapChampionshipLeaderboard(championship?.leaderboard),
    [championship]
  );

  // Auto Stage Resolution
  const hasRecruitmentActivity =
    totalPendingRequests > 0 ||
    operationalParticipants.length > 0 ||
    ["REGISTRATION", "RECRUITING", "OPEN"].includes(rawStatus);

  const autoStage = useMemo(() => resolveDashboardLifecycleStage({
    status: rawStatus,
    phase: rawPhase,
    hasLiveMatch,
    hasTodayMatches: getTodayEvents(events).length > 0,
    hasRegistrationActivity: hasRecruitmentActivity,
  }), [rawStatus, rawPhase, hasLiveMatch, events, hasRecruitmentActivity]);

  const effectiveStage = userSelectedStage || "announced";

  const preMilestones = useMemo(() => {
    const hasSchedule = events.length > 0;
    const hasApplications = totalPendingRequests > 0;

    return [
      {
        key: "announcement",
        label: "Intramural Announced",
        detail: "Event guidelines & sport categories set",
        done: true,
      },
      {
        key: "recruitment",
        label: "Roster Building & Tryouts",
        detail: hasApplications ? `${totalPendingRequests} applicant requests to review` : "Player recruitment active",
        done: hasApplications || effectiveStage !== "announced",
      },
      {
        key: "schedule",
        label: "Match Schedule Published",
        detail: hasSchedule ? "Fixtures and venues assigned" : "Awaiting schedule generation",
        done: hasSchedule,
      },
    ];
  }, [events.length, totalPendingRequests, effectiveStage]);

  const stageOptions = [
    { value: "announced", label: "Team Operations", icon: Users },
    { value: "live", label: "Live Center & Leaderboard", icon: Radio },
  ];

  const showcaseEntries = useMemo(() => operationalParticipants.map((row) => ({
    id: `entry-${row.entry_id}`,
    entry_id: row.entry_id,
    team_id: row.team_id,
    name: row.display_name,
    imageUrl: row.image_url,
    meta: [row.sport_name, row.participant_shape, row.department_code || row.department_name].filter(Boolean).join(" · "),
    department_id: row.department_id,
    department_code: row.department_code,
    department_name: row.department_name,
    participant_shape: row.participant_shape,
    members: row.members,
  })), [operationalParticipants]);

  return (
    <div className="space-y-5 w-full min-w-0 max-w-full overflow-hidden">
      <DashboardStageSwitcher label="" options={stageOptions} effectiveStage={effectiveStage} autoStage={autoStage} selectedStage={userSelectedStage} onSelect={setUserSelectedStage} onReset={() => setUserSelectedStage(null)} />

      {effectiveStage === "announced" ? (
        <CoachOperationsDashboard
          entries={operationalParticipants}
          applications={applicationRows}
          tournament={tournament || startedTournament}
          sports={displaySports}
          teamIds={teamIds}
          assignedTargets={coachContexts}
          announcements={announcements}
          notifications={coachNotifications}
          onSelectPlayer={({ player, participant }) => {
            openProfile({
              userId: player?.user_id || null,
              playerId: player?.player_id || player?.id || null,
              tournamentId: tournamentId ? Number(tournamentId) : null,
              sportId: participant?.sport_id ? Number(participant.sport_id) : null,
            });
          }}
        />
      ) : null}

      {/* STAGE 1: Overview & My Sports */}
      {effectiveStage === "legacy-overview" && (
        <>
          <DashboardCard>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[var(--text-main)]">
                  <Sparkles size={16} className="text-[var(--primary)]" aria-hidden="true" />
                  Official Sports & Team Quotas
                </h2>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  Sports disciplines and team entries for this Intramural tournament
                </p>
              </div>
              <Link
                to="/coach/teams-and-players"
                className="text-xs font-semibold text-[var(--primary)] hover:underline"
              >
                View Teams →
              </Link>
            </div>
            <SportsDirectoryGrid
              sports={displaySports}
              emptyTitle="Sports list is being finalized."
              emptyDescription="Official sports disciplines for this intramural will be listed here shortly."
            />
          </DashboardCard>

          <section aria-label="Tournament milestones and directives" className="grid gap-4 xl:grid-cols-[minmax(0,6fr)_minmax(0,6fr)]">
            <DashboardCard>
              <PanelHeader icon={CalendarDays} title="Intramural Milestones" />
              <TournamentUpdatesPanel milestones={preMilestones} />
            </DashboardCard>

            <DashboardCard>
              <PanelHeader icon={Megaphone} title="Latest Announcements" action={{ label: "View all", to: "/coach/announcements" }} />
              <AnnouncementTimeline items={announcements} />
            </DashboardCard>
          </section>
        </>
      )}

      {/* STAGE 2: Registration & Tryouts */}
      {effectiveStage === "legacy-registration" && (
        <>
          {/* Actionable Player Applications Queue */}
          <DashboardCard className="border-[var(--primary)]/30">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[var(--text-main)]">
                  <Users size={16} className="text-[var(--primary)]" aria-hidden="true" />
                  Pending Player Applications
                </h2>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  {totalPendingRequests > 0
                    ? `You have ${totalPendingRequests} pending applicant${totalPendingRequests === 1 ? "" : "s"} awaiting your tryout review.`
                    : "No pending player applications right now."}
                </p>
              </div>
              <Link
                to="/coach/player-applications"
                className="os-btn-primary-soft inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold"
              >
                <span>Open All Applications</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            {applicationRows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--border-soft)] p-6 text-center text-xs text-[var(--text-muted)]">
                No player applications submitted yet. They will appear here once students apply.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {applicationRows.map((app, idx) => (
                  <div
                    key={`coach-app-${app.id || idx}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-[var(--text-main)]">
                        {app.player_name || app.applicant_name || app.name || "Student Applicant"}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        {[app.sport, app.team_name || app.team].filter(Boolean).join(" • ") || "Player Application"}
                      </p>
                    </div>
                    <Link
                      to="/coach/player-applications"
                      className="rounded-lg bg-[var(--primary-soft)] px-2.5 py-1 text-[11px] font-bold text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition"
                    >
                      Review →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </DashboardCard>

          <section aria-label="Tournament sports and roster readiness" className="grid gap-4 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            <DashboardCard>
              <PanelHeader
                icon={Trophy}
                title="Sports Disciplines & Roster Limits"
                action={{ label: "Manage teams", to: "/coach/teams-and-players" }}
              />
              <SportsDirectoryGrid
                sports={displaySports}
                emptyTitle="No sports configured."
                emptyDescription="Sports for this tournament will appear here."
              />
            </DashboardCard>

            <DashboardCard>
              <PanelHeader icon={CalendarDays} title="Registration Timeline" />
              <TournamentUpdatesPanel milestones={preMilestones} />
            </DashboardCard>
          </section>
        </>
      )}

      {/* STAGE 3: Live Center & Leaderboard */}
      {effectiveStage === "live" && (
        <LiveDashboardStage events={events} sports={displaySports} entries={showcaseEntries} tournamentId={tournamentId} scheduleHref="/coach/schedules" scoreBasePath="/coach/matches" standingsHref="/coach/standings" entriesHref="/coach/teams-and-players" departmentRows={olympicLeaderboard} breakdownRows={sportBreakdown} standingsUnavailable={championshipUnavailable} matchCenterProps={{ events: operationalEvents, roleTitle: "Live Match Center", emptyTitle: "No upcoming team matches scheduled", emptyDescription: "Your next team fixture will appear here as soon as published." }}>
          {announcements.length > 0 ? (
            <DashboardCard>
              <PanelHeader icon={Megaphone} title="Latest Announcements" action={{ label: "View all", to: "/coach/announcements" }} />
              <AnnouncementTimeline items={announcements} />
            </DashboardCard>
          ) : null}
        </LiveDashboardStage>
      )}
    </div>
  );
};

export default CoachDashboardLayout;
