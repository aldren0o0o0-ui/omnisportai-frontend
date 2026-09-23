import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, Megaphone, Radio, ShieldCheck, Sparkles, Trophy, Users } from "lucide-react";
import DashboardCard from "../../../common/DashboardCard";
import StatusBadge from "../../../common/StatusBadge";
import { getChampionshipStandings } from "../../../../services/standingsService";
import { getBrackets } from "../../../../services/bracketService";
import { getTournamentTeamRegistrations, getTeams } from "../../../../services/teamService";
import { listEntries } from "../../../../services/competitionEntryService";
import { getScheduleEvents } from "../../../../services/scheduleService";
import { getSportDisplayName } from "../../../../utils/tournamentEventCategories";
import {
  AnnouncementTimeline,
  buildAnnouncementTimeline,
  buildShowcaseEntries,
  deriveTournamentPhase,
  resolveDashboardLifecycleStage,
  findTableByKeywords,
  getLiveOrNextMatch,
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
import FacilitatorOperationsDashboard from "./FacilitatorOperationsDashboard";

const toPositiveInt = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  const normalized = Math.trunc(parsed);
  return normalized > 0 ? normalized : 0;
};

const FacilitatorDashboardLayout = ({
  dashboard,
  sportsList = [],
  startedTournament = null,
}) => {
  const [championship, setChampionship] = useState(null);
  const [championshipUnavailable, setChampionshipUnavailable] = useState(false);
  const [brackets, setBrackets] = useState([]);
  const [teamRegistrations, setTeamRegistrations] = useState([]);
  const [competitionEntries, setCompetitionEntries] = useState([]);
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

  const tables = useMemo(
    () => (Array.isArray(dashboard?.tables) ? dashboard.tables : []),
    [dashboard]
  );
  const featuredEvent = useMemo(() => getLiveOrNextMatch(events), [events]);
  const hasLiveMatch = Boolean(featuredEvent && isLiveEvent(featuredEvent));

  const rawPhase = useMemo(() => deriveTournamentPhase(tournament, events), [tournament, events]);

  // Load championship data, brackets, and team registrations
  useEffect(() => {
    let active = true;
    const loadData = async () => {
      try {
        setChampionship(null);
        setChampionshipUnavailable(false);
        const [champData, bracketsData, teamPayload, entryPayload, schedulePayload] = await Promise.all([
          getChampionshipStandings({ tournamentId }).catch(() => null),
          getBrackets().catch(() => []),
          tournamentId
            ? getTournamentTeamRegistrations(Number(tournamentId), { status: "ALL", page: 1, limit: 200 }).catch(() =>
                getTeams(null, Number(tournamentId)).catch(() => [])
              )
            : getTeams().catch(() => []),
          tournamentId ? listEntries({ tournamentId: Number(tournamentId) }).catch(() => []) : [],
          tournamentId ? getScheduleEvents(Number(tournamentId)).catch(() => ({ events: [] })) : Promise.resolve({ events: [] }),
        ]);
        if (!active) return;
        setChampionship(champData || null);
        setChampionshipUnavailable(!champData);
        if (Array.isArray(bracketsData)) setBrackets(bracketsData);
        setTeamRegistrations(
          Array.isArray(teamPayload)
            ? teamPayload
            : Array.isArray(teamPayload?.items)
              ? teamPayload.items
              : Array.isArray(teamPayload?.rows)
                ? teamPayload.rows
                : []
        );
        setCompetitionEntries(Array.isArray(entryPayload) ? entryPayload : []);
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
  }, [tournamentId]);

  // Pending coach approvals queue
  const pendingApprovalTable = useMemo(
    () => tables.find((table) => String(table?.id || "") === "facilitator_pending_approvals"),
    [tables]
  );
  const pendingApprovalRows = useMemo(
    () => (Array.isArray(pendingApprovalTable?.rows) ? pendingApprovalTable.rows.slice(0, 6) : []),
    [pendingApprovalTable]
  );
  const pendingApprovalCount = toPositiveInt(
    dashboard?.meta?.pending_approval_count ?? pendingApprovalRows.length
  );

  // Assigned Staff and Officials
  const staffTable = useMemo(
    () => tables.find((table) => /assigned_staff|staff|official|referee/i.test(String(table?.id || table?.title || ""))),
    [tables]
  );
  const staffRows = useMemo(
    () => (Array.isArray(staffTable?.rows) ? staffTable.rows.slice(0, 6) : []),
    [staffTable]
  );

  // Announcements
  const announcementsTable = useMemo(() => findTableByKeywords(dashboard, ["announcement", "note"]), [dashboard]);
  const announcements = useMemo(
    () => buildAnnouncementTimeline(announcementsTable?.rows || []).slice(0, 6),
    [announcementsTable]
  );

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

    // The selected-Intramural access projection is authoritative for a
    // facilitator. These IDs exist immediately after assignment, before any
    // bracket, schedule, or Match has been created.
    if (Array.isArray(dashboard?.scope?.sport_ids)) {
      dashboard.scope.sport_ids.forEach(addId);
    }

    // Compatibility inference is only needed for older dashboard responses.
    // Never widen a current facilitator assignment to every Intramural sport.
    if (ids.size === 0) {
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
    }
    return ids;
  }, [dashboard, tournament, startedTournament, scopedBrackets, events]);

  const intramuralSportNames = useMemo(() => {
    const names = new Set();
    const addName = (val) => {
      const str = String(val || "").trim().toLowerCase();
      if (str) names.add(str);
    };

    if (Array.isArray(dashboard?.scope?.sport_ids) && dashboard.scope.sport_ids.length > 0) {
      return names;
    }

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
  }, [dashboard, tournament, startedTournament, scopedBrackets, events]);

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
  const hasEntrySubmissions =
    pendingApprovalCount > 0 ||
    (Array.isArray(teamRegistrations) && teamRegistrations.length > 0) ||
    (Array.isArray(competitionEntries) && competitionEntries.length > 0) ||
    ["REGISTRATION", "RECRUITING", "OPEN"].includes(rawStatus);

  const autoStage = useMemo(() => resolveDashboardLifecycleStage({
    status: rawStatus,
    phase: rawPhase,
    hasLiveMatch,
    hasTodayMatches: getTodayEvents(events).length > 0,
    hasRegistrationActivity: hasEntrySubmissions,
  }), [rawStatus, rawPhase, hasLiveMatch, events, hasEntrySubmissions]);

  const effectiveStage = userSelectedStage || "announced";

  const preMilestones = useMemo(() => {
    const hasSchedule = events.length > 0;
    const hasApprovals = pendingApprovalCount > 0;

    return [
      {
        key: "announcement",
        label: "Intramural Announced",
        detail: "Event guidelines & sport schedules set",
        done: true,
      },
      {
        key: "registration",
        label: "Coach Submissions & Approvals",
        detail: hasApprovals ? `${pendingApprovalCount} submissions awaiting review` : "Team registration underway",
        done: hasApprovals || effectiveStage !== "announced",
      },
      {
        key: "schedule",
        label: "Match Schedule & Live Operations",
        detail: hasSchedule ? "Fixtures and assigned courts ready" : "Awaiting schedule publication",
        done: hasSchedule,
      },
    ];
  }, [events.length, pendingApprovalCount, effectiveStage]);

  const stageOptions = [
    { value: "announced", label: "Operations", icon: Users },
    { value: "live", label: "Live Center & Leaderboard", icon: Radio },
  ];

  // The live-stage presentation still accepts legacy match/team projections.
  // The active Entries & Approvals dashboard intentionally does not consume
  // this merged compatibility view.
  const showcaseEntries = useMemo(
    () => buildShowcaseEntries({ teamRegistrations, competitionEntries, events, dashboard }),
    [teamRegistrations, competitionEntries, events, dashboard]
  );

  return (
    <div className="space-y-5 w-full min-w-0 max-w-full overflow-hidden">
      <DashboardStageSwitcher label="" options={stageOptions} effectiveStage={effectiveStage} autoStage={autoStage} selectedStage={userSelectedStage} onSelect={setUserSelectedStage} onReset={() => setUserSelectedStage(null)} />

      {effectiveStage === "announced" ? (
        <FacilitatorOperationsDashboard
          sports={displaySports}
          tournament={tournament || startedTournament}
          entries={competitionEntries}
          staffRows={staffRows}
          announcements={announcements}
          events={events}
          brackets={scopedBrackets}
        />
      ) : null}

      {/* Retained compatibility composition; no longer exposed by the two-tab dashboard. */}
      {effectiveStage === "legacy-overview" && (
        <>
          <DashboardCard>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[var(--text-main)]">
                  <Sparkles size={16} className="text-[var(--primary)]" aria-hidden="true" />
                  Assigned Sports & Disciplines
                </h2>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  Sports categories and venue allocations under your management
                </p>
              </div>
              <Link
                to="/sport-facilitator/schedules"
                className="text-xs font-semibold text-[var(--primary)] hover:underline"
              >
                View Matches →
              </Link>
            </div>
            <SportsDirectoryGrid
              sports={displaySports}
              emptyTitle="Sports list is being finalized."
              emptyDescription="Official sports disciplines for this intramural will appear here."
            />
          </DashboardCard>

          <section aria-label="Tournament milestones and directives" className="grid gap-4 xl:grid-cols-[minmax(0,6fr)_minmax(0,6fr)]">
            <DashboardCard>
              <PanelHeader icon={CalendarDays} title="Intramural Milestones" />
              <TournamentUpdatesPanel milestones={preMilestones} />
            </DashboardCard>

            <DashboardCard>
              <PanelHeader icon={Megaphone} title="Latest Announcements" action={{ label: "View all", to: "/sport-facilitator/announcements" }} />
              <AnnouncementTimeline items={announcements} />
            </DashboardCard>
          </section>
        </>
      )}

      {/* STAGE 2: Approvals & Preparation */}
      {effectiveStage === "legacy-registration" && (
        <>
          {/* Actionable Approvals Queue */}
          <DashboardCard className="border-[var(--primary)]/30">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[var(--text-main)]">
                  <Users size={16} className="text-[var(--primary)]" aria-hidden="true" />
                  Team & Entry Approvals
                </h2>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  Review coach submissions, athlete eligibility, and tournament entry readiness
                </p>
              </div>
              <Link
                to="/sport-facilitator/teams-and-players"
                className="os-btn-primary-soft inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold"
              >
                <span>Manage Teams & Entries</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            {pendingApprovalRows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--border-soft)] p-6 text-center text-xs text-[var(--text-muted)]">
                No team or player submissions pending review right now.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {pendingApprovalRows.map((team, idx) => (
                  <div
                    key={`facilitator-app-${team.id || idx}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-[var(--text-main)]">
                        {team.team_name || team.name || "Competition Entry"}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        {[getSportDisplayName(team, team.sport || "Sport"), team.department_name || team.department_code].filter(Boolean).join(" • ") || "Team Submission"}
                      </p>
                    </div>
                    <Link
                      to="/sport-facilitator/teams-and-players"
                      className="rounded-lg bg-[var(--primary-soft)] px-2.5 py-1 text-[11px] font-bold text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition"
                    >
                      Review →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </DashboardCard>

          <section aria-label="Tournament sports and staff readiness" className="grid gap-4 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            <DashboardCard>
              <PanelHeader
                icon={Trophy}
                title="Assigned Sports & Venues"
                action={{ label: "Manage teams", to: "/sport-facilitator/teams-and-players" }}
              />
              <SportsDirectoryGrid
                sports={displaySports}
                emptyTitle="No sports configured."
                emptyDescription="Sports for this tournament will appear here."
              />
            </DashboardCard>

            <div className="space-y-4">
              <DashboardCard>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h2 className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[var(--text-main)]">
                      <ShieldCheck size={16} className="text-[var(--primary)]" aria-hidden="true" />
                      Assigned Staff & Officials
                    </h2>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                      Referees and table officials on duty
                    </p>
                  </div>
                  <Link
                    to="/sport-facilitator/assigned-staff"
                    className="text-xs font-semibold text-[var(--primary)] hover:underline"
                  >
                    Manage Staff →
                  </Link>
                </div>

                {staffRows.length === 0 ? (
                  <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4 text-center text-xs text-[var(--text-muted)]">
                    No staff assigned to your sports yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {staffRows.slice(0, 4).map((staff, idx) => (
                      <div
                        key={`staff-reg-${staff?.id || idx}`}
                        className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-[var(--text-main)]">{staff?.name || `Staff ${idx + 1}`}</p>
                          <p className="text-[10px] text-[var(--text-muted)]">
                            {[staff?.role, staff?.sport].filter(Boolean).join(" • ") || "Official"}
                          </p>
                        </div>
                        <StatusBadge status={staff?.status || "ASSIGNED"} />
                      </div>
                    ))}
                  </div>
                )}
              </DashboardCard>

              <DashboardCard>
                <PanelHeader icon={CalendarDays} title="Registration Timeline" />
                <TournamentUpdatesPanel milestones={preMilestones} />
              </DashboardCard>
            </div>
          </section>
        </>
      )}

      {/* STAGE 3: Live Center & Leaderboard */}
      {effectiveStage === "live" && (
        <LiveDashboardStage events={events} sports={displaySports} entries={showcaseEntries} tournamentId={tournamentId} scheduleHref="/sport-facilitator/schedules" scoreBasePath="/sport-facilitator/matches" standingsHref="/sport-facilitator/standings" entriesHref="/sport-facilitator/schedules" departmentRows={olympicLeaderboard} breakdownRows={sportBreakdown} standingsUnavailable={championshipUnavailable} matchCenterProps={{ roleTitle: "Live Match Center", emptyTitle: "No matches scheduled right now", emptyDescription: "Your next assigned match will appear here once fixtures are scheduled." }}>
          <section aria-label="Staff and updates" className="grid gap-4 xl:grid-cols-[minmax(0,6fr)_minmax(0,6fr)]">
            <DashboardCard>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[var(--text-main)]">
                    <Users size={16} className="text-[var(--primary)]" aria-hidden="true" />
                    Officials on Duty
                  </h2>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    Active staff and referees assigned for this tournament
                  </p>
                </div>
                <Link
                  to="/sport-facilitator/assigned-staff"
                  className="text-xs font-semibold text-[var(--primary)] hover:underline"
                >
                  View All →
                </Link>
              </div>

              {staffRows.length === 0 ? (
                <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4 text-center text-xs text-[var(--text-muted)]">
                  No assigned officials listed yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {staffRows.map((staff, idx) => (
                    <div
                      key={`staff-live-${staff?.id || idx}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-[var(--text-main)]">{staff?.name || `Staff ${idx + 1}`}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">
                          {[staff?.role, staff?.sport].filter(Boolean).join(" • ") || "Official"}
                        </p>
                      </div>
                      <StatusBadge status={staff?.status || "ACTIVE"} />
                    </div>
                  ))}
                </div>
              )}
            </DashboardCard>

            <DashboardCard>
              <PanelHeader icon={Megaphone} title="Operations Announcements" action={{ label: "View all", to: "/sport-facilitator/announcements" }} />
              <AnnouncementTimeline items={announcements} />
            </DashboardCard>
          </section>
        </LiveDashboardStage>
      )}
    </div>
  );
};

export default FacilitatorDashboardLayout;
