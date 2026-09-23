import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, CalendarDays, Megaphone, Radio, ShieldCheck, Sparkles, Trophy, UserCheck, Users } from "lucide-react";
import DashboardCard from "../../../common/DashboardCard";
import StatusBadge from "../../../common/StatusBadge";
import { getChampionshipStandings } from "../../../../services/standingsService";
import { getBrackets } from "../../../../services/bracketService";
import { getDepartmentCoachAssignments } from "../../../../services/tournamentService";
import { getManagedCompetitionParticipants } from "../../../../services/competitionParticipantService";
import { getScheduleEvents } from "../../../../services/scheduleService";
import { getSportDisplayName } from "../../../../utils/tournamentEventCategories";
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
import TeamDetailsDrawer from "../../../dashboard/TeamDetailsDrawer";
import DepartmentOperationsDashboard from "./DepartmentOperationsDashboard";

const DepartmentDashboardLayout = ({
  dashboard,
  sportsList = [],
  startedTournament = null,
  workspaceId = null,
}) => {
  const { openProfile } = useProfileDrawer();
  const [championship, setChampionship] = useState(null);
  const [championshipUnavailable, setChampionshipUnavailable] = useState(false);
  const [brackets, setBrackets] = useState([]);
  const [coachTargets, setCoachTargets] = useState([]);
  const [directoryParticipants, setDirectoryParticipants] = useState([]);
  const [userSelectedStage, setUserSelectedStage] = useState(null);
  const [selectedSportGroup, setSelectedSportGroup] = useState(null);

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

  const scopeDepartments = useMemo(
    () => new Set((Array.isArray(dashboard?.scope?.department_ids) ? dashboard.scope.department_ids : []).map(Number)),
    [dashboard]
  );

  // Scoped events involving this department
  const scopedEvents = useMemo(() => {
    if (scopeDepartments.size === 0) return events;
    return events.filter((e) => {
      const d1 = Number(e?.department1_id || e?.team1_department_id);
      const d2 = Number(e?.department2_id || e?.team2_department_id);
      return scopeDepartments.has(d1) || scopeDepartments.has(d2);
    });
  }, [events, scopeDepartments]);

  const rawPhase = useMemo(() => deriveTournamentPhase(tournament, events), [tournament, events]);

  // Load championship data, department standings, brackets, coach targets, and team registrations
  useEffect(() => {
    let active = true;
    const loadData = async () => {
      try {
        setChampionship(null);
        setChampionshipUnavailable(false);
        const [champData, bracketsData, coachData, directoryRows, schedulePayload] = await Promise.all([
          getChampionshipStandings({ tournamentId }).catch(() => null),
          getBrackets().catch(() => []),
          tournamentId ? getDepartmentCoachAssignments(Number(tournamentId)).catch(() => []) : [],
          tournamentId && Number(workspaceId) > 0 ? getManagedCompetitionParticipants({ workspaceId: Number(workspaceId), tournamentId: Number(tournamentId), includeMembers: true }).catch(() => []) : [],
          tournamentId ? getScheduleEvents(Number(tournamentId)).catch(() => ({ events: [] })) : Promise.resolve({ events: [] }),
        ]);
        if (!active) return;
        setChampionship(champData || null);
        setChampionshipUnavailable(!champData);
        if (Array.isArray(bracketsData)) setBrackets(bracketsData);
        if (Array.isArray(coachData)) setCoachTargets(coachData);
        setDirectoryParticipants(Array.isArray(directoryRows) ? directoryRows : []);
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
    return () => {
      active = false;
    };
  }, [tournamentId, workspaceId]);

  // Next or Live match for department
  const operationalEvents = scopedEvents.length > 0 ? scopedEvents : events;
  const hasLiveMatch = useMemo(() => operationalEvents.some((event) => isLiveEvent(event)), [operationalEvents]);
  // Announcements
  const announcementsTable = useMemo(() => findTableByKeywords(dashboard, ["announcement", "note"]), [dashboard]);
  const announcements = useMemo(
    () => buildAnnouncementTimeline(announcementsTable?.rows || []).slice(0, 6),
    [announcementsTable]
  );

  // Coach Assignment Summary Metrics
  const coachSummary = useMemo(() => {
    let assigned = 0;
    let missing = 0;
    let total = Array.isArray(coachTargets) ? coachTargets.length : 0;
    for (const target of coachTargets || []) {
      if (target?.current_coach || target?.coach_user_id || target?.coach_id || target?.coach_name) {
        assigned += 1;
      } else {
        missing += 1;
      }
    }
    return { assigned, missing, total };
  }, [coachTargets]);
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

  const isCoachSetupDone = coachSummary.total > 0 && coachSummary.missing === 0;
  const hasDepartmentRosters = Array.isArray(directoryParticipants) && directoryParticipants.length > 0;

  // Auto Stage Resolution
  const autoStage = useMemo(() => resolveDashboardLifecycleStage({
    status: rawStatus,
    phase: rawPhase,
    hasLiveMatch,
    hasTodayMatches: getTodayEvents(events).length > 0,
    hasRegistrationActivity: isCoachSetupDone && (hasDepartmentRosters || ["REGISTRATION", "RECRUITING", "OPEN"].includes(rawStatus)),
  }), [rawStatus, rawPhase, hasLiveMatch, events, isCoachSetupDone, hasDepartmentRosters]);

  const effectiveStage = userSelectedStage || "announced";

  const preMilestones = useMemo(() => {
    const hasSchedule = events.length > 0;
    const isCoachSetupDone = coachSummary.total > 0 && coachSummary.missing === 0;

    return [
      {
        key: "announcement",
        label: "Intramural Announced",
        detail: "Sport disciplines and department quota open",
        done: true,
      },
      {
        key: "coach_setup",
        label: "Coach Assignments",
        detail: isCoachSetupDone ? "All department sports have assigned coaches" : `${coachSummary.assigned}/${coachSummary.total || 0} coaches assigned`,
        done: isCoachSetupDone || effectiveStage !== "announced",
      },
      {
        key: "schedule",
        label: "Match Schedule & Live Matches",
        detail: hasSchedule ? "Department match fixtures published" : "Awaiting schedule generation",
        done: hasSchedule,
      },
    ];
  }, [events.length, coachSummary, effectiveStage]);

  const stageOptions = [
    { value: "announced", label: "Department Operations", icon: Users },
    { value: "live", label: "Live Center & Leaderboard", icon: Radio },
  ];

  const showcaseEntries = useMemo(() => directoryParticipants.map((row) => ({
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
  })), [directoryParticipants]);

  return (
    <div className="space-y-5 w-full min-w-0 max-w-full overflow-hidden">
      <DashboardStageSwitcher label="" options={stageOptions} effectiveStage={effectiveStage} autoStage={autoStage} selectedStage={userSelectedStage} onSelect={setUserSelectedStage} onReset={() => setUserSelectedStage(null)} />

      {effectiveStage === "announced" ? (
        <DepartmentOperationsDashboard
          entries={directoryParticipants}
          coachTargets={coachTargets}
          tournament={tournament || startedTournament}
          announcements={announcements}
          onSelectSport={setSelectedSportGroup}
        />
      ) : null}

      {/* Compatibility composition retained outside the two-tab navigation. */}
      {effectiveStage === "legacy-overview" && (
        <>
          {/* Coach Coverage & Milestones */}
          <section aria-label="Coach status and updates" className="grid gap-4 xl:grid-cols-[minmax(0,6fr)_minmax(0,6fr)]">
            <DashboardCard>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[var(--text-main)]">
                    <UserCheck size={16} className="text-[var(--primary)]" aria-hidden="true" />
                    Coach Coverage Status
                  </h2>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    {coachSummary.assigned} of {coachSummary.total} sports assigned
                  </p>
                </div>
                <Link
                  to={workspaceId ? `/department/coach-assignments?workspace_id=${workspaceId}` : "/department/coach-assignments"}
                  className="text-xs font-semibold text-[var(--primary)] hover:underline"
                >
                  Manage Coaches →
                </Link>
              </div>

              {coachTargets.length === 0 ? (
                <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4 text-center text-xs text-[var(--text-muted)]">
                  No coach assignment targets found for this tournament.
                </div>
              ) : (
                <div className="space-y-2">
                  {coachTargets.slice(0, 5).map((target, idx) => {
                    const assignedCoach = target?.current_coach || null;
                    const coachUserId = assignedCoach?.user_id || assignedCoach?.id || target?.coach_user_id || target?.coach_id || null;
                    const coachName = assignedCoach?.name || assignedCoach?.display_name || target?.coach_name || "";
                    const hasCoach = Boolean(coachUserId || coachName);
                    return (
                      <div
                        key={`dept-coach-${target?.id || idx}`}
                        className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-[var(--text-main)]">
                            {getSportDisplayName(target, `Sport ${idx + 1}`)}
                          </p>
                          {hasCoach ? (
                            <button
                              type="button"
                              disabled={!coachUserId}
                              onClick={() => {
                                if (coachUserId) {
                                  openProfile({
                                    userId: Number(coachUserId),
                                    tournamentId: tournamentId ? Number(tournamentId) : null,
                                  });
                                }
                              }}
                              className="mt-0.5 block text-left text-[10px] font-semibold text-[var(--primary)] hover:underline disabled:cursor-default disabled:text-[var(--text-muted)] disabled:no-underline"
                            >
                              {coachName || "Assigned coach"}
                            </button>
                          ) : <p className="text-[10px] text-[var(--text-muted)]">No coach assigned</p>}
                        </div>
                        <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          hasCoach
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                        }`}>
                          {hasCoach ? "Assigned" : "Missing Coach"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </DashboardCard>

            <DashboardCard>
              <PanelHeader icon={CalendarDays} title="Intramural Milestones" />
              <TournamentUpdatesPanel milestones={preMilestones} />
            </DashboardCard>
          </section>
        </>
      )}

      {/* STAGE 2: Recruitment & Rosters */}
      {effectiveStage === "legacy-registration" && (
        <>
          {/* Department Teams & Recruitment Overview */}
          <DashboardCard>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[var(--text-main)]">
                  <Users size={16} className="text-[var(--primary)]" aria-hidden="true" />
                  Department Teams & Recruitment Overview
                </h2>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  Monitor student tryout volumes and roster preparation across all sports
                </p>
              </div>
              <Link
                to="/department/teams"
                className="os-btn-primary-soft inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold"
              >
                <span>Manage Department Teams</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            <SportsDirectoryGrid
              sports={displaySports}
              emptyTitle="No sports configured."
              emptyDescription="Sports for this tournament will appear here."
            />
          </DashboardCard>
        </>
      )}

      {/* STAGE 3: Live Center & Leaderboard */}
      {effectiveStage === "live" && (
        <LiveDashboardStage events={events} sports={displaySports} entries={showcaseEntries} tournamentId={tournamentId} scheduleHref="/department/schedules" scoreBasePath="/department/matches" standingsHref="/department/standings" entriesHref="/department/teams" departmentRows={olympicLeaderboard} breakdownRows={sportBreakdown} standingsUnavailable={championshipUnavailable} userDepartmentId={Array.from(scopeDepartments)[0] || null} matchCenterProps={{ events: operationalEvents, roleTitle: "Live Match Center", emptyTitle: "No department matches scheduled right now", emptyDescription: "Your department's match fixtures will appear here once scheduled." }}>
          {announcements.length > 0 ? (
            <DashboardCard>
              <PanelHeader icon={Megaphone} title="Department Announcements" action={{ label: "View all", to: "/department/announcements" }} />
              <AnnouncementTimeline items={announcements} />
            </DashboardCard>
          ) : null}
        </LiveDashboardStage>
      )}
      <TeamDetailsDrawer
        isOpen={Boolean(selectedSportGroup)}
        onClose={() => setSelectedSportGroup(null)}
        entry={selectedSportGroup ? {
          type: "entry",
          entryId: selectedSportGroup.entries?.[0]?.entry_id,
          teamId: selectedSportGroup.entries?.[0]?.team_id || selectedSportGroup.target?.team_id,
          sportId: selectedSportGroup.sportId || selectedSportGroup.target?.sport_id,
          eventId: selectedSportGroup.entries?.[0]?.tournament_sport_event_id || selectedSportGroup.target?.tournament_sport_event_id,
          name: selectedSportGroup.displayName || `${selectedSportGroup.sportName} ${selectedSportGroup.eventName || ""}`.trim(),
          imageUrl: selectedSportGroup.entries?.[0]?.image_url || selectedSportGroup.target?.logo_url,
          sport_name: `${selectedSportGroup.sportName} ${selectedSportGroup.eventName || ""}`.trim(),
          department_name: selectedSportGroup.entries?.[0]?.department_name || selectedSportGroup.target?.department_name,
          department_code: selectedSportGroup.entries?.[0]?.department_code || selectedSportGroup.target?.department_code,
          coach_name: selectedSportGroup.coach,
          status: selectedSportGroup.ready ? "READY" : "NEEDS ATTENTION",
          ready: selectedSportGroup.ready,
          issues: selectedSportGroup.issues,
          participant_shape: selectedSportGroup.shape,
          max_players: selectedSportGroup.targetPlayers,
          groupEntries: selectedSportGroup.entries,
        } : null}
        tournamentId={tournamentId}
        isMyDepartment
        viewHref="/department/teams"
      />
    </div>
  );
};

export default DepartmentDashboardLayout;
