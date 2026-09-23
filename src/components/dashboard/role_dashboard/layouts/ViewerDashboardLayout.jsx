import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, Megaphone, Radio, Sparkles, Trophy, Users } from "lucide-react";
import { Link } from "react-router-dom";
import DashboardCard from "../../../common/DashboardCard";
import { getChampionshipStandings } from "../../../../services/standingsService";
import { getTournamentTeamRegistrations, getTeams } from "../../../../services/teamService";
import { listEntries } from "../../../../services/competitionEntryService";
import { getScheduleEvents } from "../../../../services/scheduleService";
import {
  AnnouncementTimeline,
  ApplicationQuotaBanner,
  buildAnnouncementTimeline,
  buildShowcaseEntries,
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
  TournamentHero,
  TournamentUpdatesPanel,
  sortEventsByStart,
} from "./dashboardLayoutUtils";
import { mapChampionshipLeaderboard, mapChampionshipSportBreakdown } from "./dashboardStandingsUtils.js";
import { DashboardStageSwitcher, LiveDashboardStage } from "./DashboardLifecycleStages";
import ViewerParticipationDashboard from "./ViewerParticipationDashboard";


const typeLabel = (type) => {
  const normalized = String(type || "").toUpperCase();
  if (normalized === "TEAM") return "Team";
  if (normalized === "SOLO") return "Solo";
  if (normalized === "DUO") return "Duo";
  return "Entry";
};

const typeClass = (type) => {
  const normalized = String(type || "").toUpperCase();
  if (normalized === "TEAM") return "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300";
  if (normalized === "SOLO") return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300";
  if (normalized === "DUO") return "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300";
  return "bg-[var(--surface-muted)] text-[var(--text-muted)]";
};

const OpenApplicationsPanel = ({ preview, viewerTeamsHref }) => {
  const items = Array.isArray(preview?.items) ? preview.items : [];
  const totalOpen = Number(preview?.totalOpen || 0);
  const extraCount = Math.max(0, totalOpen - items.length);

  return (
    <DashboardCard>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <PanelHeader icon={Users} title="Open Department Teams & Entries" />
          </div>
          <p className="max-w-2xl text-xs text-[var(--text-muted)]">
            Sports teams, solo, and duo entries your department is currently recruiting for.
          </p>
        </div>
        <Link
          to={viewerTeamsHref}
          className="os-btn-primary-soft inline-flex min-h-[var(--control-height-md)] items-center justify-center gap-2 px-4 text-sm font-semibold self-start"
        >
          View all available
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>

      {preview?.loading ? (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-28 animate-pulse rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-soft)]"
            />
          ))}
        </div>
      ) : preview?.error ? (
        <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          {preview.error}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-soft)] px-4 py-5 text-sm text-[var(--text-muted)]">
          No applications are open yet. Once your Department Manager or Coach opens a team or entry, it will appear here.
        </div>
      ) : (
        <>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {items.map((item) => (
              <Link
                key={item.id}
                to={item.href || viewerTeamsHref}
                className="group relative rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4 transition hover:border-[var(--primary)]/50 hover:bg-[var(--surface)] hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${typeClass(item.type)}`}>
                    {typeLabel(item.type)}
                  </span>
                  <ArrowRight
                    size={16}
                    className="text-[var(--text-soft)] transition group-hover:translate-x-0.5 group-hover:text-[var(--primary)]"
                    aria-hidden="true"
                  />
                </div>
                <h3 className="mt-3 line-clamp-1 text-sm font-bold text-[var(--text-main)] group-hover:text-[var(--primary)]">
                  {item.name}
                </h3>
                <p className="mt-0.5 text-xs font-semibold text-[var(--primary)]">
                  {item.sportName}
                </p>
                <p className="mt-2 truncate text-xs text-[var(--text-muted)]">
                  {item.coachName}
                </p>
              </Link>
            ))}
          </div>
          {extraCount > 0 ? (
            <p className="mt-3 text-xs text-[var(--text-muted)]">
              +{extraCount} more available on the Teams page.
            </p>
          ) : null}
        </>
      )}
    </DashboardCard>
  );
};

const ViewerDashboardLayout = ({
  dashboard,
  startedTournament = null,
  brackets = [],
  sportsList = [],
  applicationPreview = null,
  viewerTeamsHref = "/viewer/teams",
  approvedApplicationsCount = 0,
  totalApplicationsCount = 0,
  applications = [],
}) => {
  const [championship, setChampionship] = useState(null);
  const [championshipUnavailable, setChampionshipUnavailable] = useState(false);
  const [teamRegistrations, setTeamRegistrations] = useState([]);
  const [competitionEntries, setCompetitionEntries] = useState([]);
  const [scheduleEvents, setScheduleEvents] = useState([]);
  const [userSelectedStage, setUserSelectedStage] = useState(null);

  const tournament = useMemo(
    () => getSelectedTournament(dashboard) || startedTournament || null,
    [dashboard, startedTournament]
  );
  const tournamentId = tournament?.id ?? dashboard?.selected_tournament_id ?? null;

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

  const rawStatus = String(
    tournament?.lifecycle_status || tournament?.status || ""
  ).trim().toUpperCase();

  const rawPhase = useMemo(() => deriveTournamentPhase(tournament, events), [tournament, events]);

  useEffect(() => {
    let active = true;
    const loadChampionshipAndEntries = async () => {
      try {
        setChampionship(null);
        setChampionshipUnavailable(false);
        const [champData, teamPayload, entryPayload, schedulePayload] = await Promise.all([
          getChampionshipStandings({ tournamentId }).catch(() => null),
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
        setChampionship(null);
        setChampionshipUnavailable(true);
      }
    };
    void loadChampionshipAndEntries();
    return () => {
      active = false;
    };
  }, [tournamentId]);

  const hasLiveMatch = useMemo(() => events.some((event) => isLiveEvent(event)), [events]);
  const announcementsTable = useMemo(() => findTableByKeywords(dashboard, ["announcement"]), [dashboard]);
  const announcements = useMemo(
    () => buildAnnouncementTimeline(announcementsTable?.rows || []).slice(0, 6),
    [announcementsTable]
  );

  const autoStage = useMemo(() => {
    const hasOpenApplications = (applicationPreview?.totalOpen > 0) || (applicationPreview?.items?.length > 0);
    const hasMyApplications = totalApplicationsCount > 0;
    return resolveDashboardLifecycleStage({
      status: rawStatus,
      phase: rawPhase,
      hasLiveMatch,
      hasTodayMatches: getTodayEvents(events).length > 0,
      hasRegistrationActivity: hasOpenApplications || hasMyApplications,
    });
  }, [rawStatus, rawPhase, hasLiveMatch, events, applicationPreview, totalApplicationsCount]);

  // Always open the dashboard on its orientation view. The detected lifecycle
  // stage remains marked in the switcher, but must not unexpectedly navigate
  // spectators straight into live operations.
  const effectiveStage = userSelectedStage || "announced";

  // Scoped brackets strictly for this tournament
  const scopedBrackets = useMemo(() => {
    if (!Array.isArray(brackets)) return [];
    if (!tournamentId) return brackets;
    return brackets.filter((b) => Number(b.tournament_id || b.tournamentId) === Number(tournamentId));
  }, [brackets, tournamentId]);

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

    if (allCatalog.length > 0 && hasScopeCriteria) {
      const matched = allCatalog.filter((sport) => {
        const sId = Number(sport?.id);
        const sName = String(sport?.name || sport?.sport_name || "").trim().toLowerCase();
        return intramuralSportIds.has(sId) || intramuralSportNames.has(sName);
      });
      if (matched.length > 0) baseSports = matched;
    }

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

    if (baseSports.length === 0 && Array.isArray(brackets) && brackets.length > 0) {
      const seen = new Set();
      brackets.forEach((b) => {
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

    // Always merge image_url, icon_url from catalog if available
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
  }, [sportsList, intramuralSportIds, intramuralSportNames, tournament, startedTournament, brackets, events]);


  const olympicLeaderboard = useMemo(() => mapChampionshipLeaderboard(championship?.leaderboard), [championship]);
  const sportBreakdown = useMemo(() => mapChampionshipSportBreakdown(championship?.sport_breakdown), [championship]);

  const preMilestones = useMemo(() => {
    const hasSchedule = events.length > 0;
    const bracketsGenerated = (Array.isArray(brackets) ? brackets : []).some((bracket) => {
      const status = String(bracket?.status || "").trim().toUpperCase();
      return status === "GENERATED" || status === "ACTIVE" || status === "LIVE" || status === "RUNNING";
    });
    const hasApplications = (applicationPreview?.totalOpen || 0) > 0 || totalApplicationsCount > 0;

    return [
      {
        key: "announcement",
        label: "Intramural Announced",
        detail: "Event structure & sports finalized",
        done: true,
      },
      {
        key: "registration",
        label: "Department Recruitment",
        detail: hasApplications ? "Applications currently open" : "Awaiting team registration",
        done: hasApplications,
      },
      {
        key: "schedule",
        label: "Schedule & Brackets Published",
        detail: hasSchedule ? "Fixtures and match times set" : "Awaiting schedule publication",
        done: hasSchedule || bracketsGenerated,
      },
    ];
  }, [events, brackets, applicationPreview, totalApplicationsCount]);

  const stageOptions = [
    { value: "announced", label: "My Participation", icon: Users },
    { value: "live", label: "Live Center & Leaderboard", icon: Radio },
  ];

  const showcaseEntries = useMemo(
    () =>
      buildShowcaseEntries({
        teamRegistrations,
        competitionEntries,
        events,
        dashboard,
      }),
    [teamRegistrations, competitionEntries, events, dashboard]
  );

  return (
    <div className="space-y-5 w-full min-w-0 max-w-full overflow-hidden">
      <DashboardStageSwitcher label="" options={stageOptions} effectiveStage={effectiveStage} autoStage={autoStage} selectedStage={userSelectedStage} onSelect={setUserSelectedStage} onReset={() => setUserSelectedStage(null)} />

      {effectiveStage === "announced" ? (
        <ViewerParticipationDashboard
          tournament={tournament || startedTournament}
          applications={applications}
          announcements={announcements}
          applicationPreview={applicationPreview}
          viewerTeamsHref={viewerTeamsHref}
        />
      ) : null}

      {/* STAGE 1: Announced / Overview */}
      {effectiveStage === "legacy-overview" && (
        <>
          <DashboardCard>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[var(--text-main)]">
                  <Sparkles size={16} className="text-[var(--primary)]" aria-hidden="true" />
                  Included Sports Disciplines
                </h2>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  Sports categories and events open for competition
                </p>
              </div>
              <Link
                to="/viewer/sports"
                className="text-xs font-semibold text-[var(--primary)] hover:underline"
              >
                View Full Catalog →
              </Link>
            </div>
            <SportsDirectoryGrid
              sports={displaySports}
              emptyTitle="Sports list is being prepared."
              emptyDescription="Official sports for this tournament will appear here."
            />
          </DashboardCard>

          <section aria-label="Tournament milestones and directives" className="grid gap-4 xl:grid-cols-[minmax(0,6fr)_minmax(0,6fr)]">
            <DashboardCard>
              <PanelHeader icon={CalendarDays} title="Intramural Milestones" />
              <TournamentUpdatesPanel milestones={preMilestones} />
            </DashboardCard>

            <DashboardCard>
              <PanelHeader icon={Megaphone} title="Latest Announcements" action={{ label: "View all", to: "/viewer/announcements" }} />
              <AnnouncementTimeline items={announcements} />
            </DashboardCard>
          </section>
        </>
      )}

      {/* STAGE 2: Registration & Tryouts */}
      {effectiveStage === "legacy-registration" && (
        <>
          <ApplicationQuotaBanner
            approvedCount={approvedApplicationsCount}
            maxQuota={2}
            totalApplications={totalApplicationsCount}
          />

          <OpenApplicationsPanel
            preview={applicationPreview}
            viewerTeamsHref={viewerTeamsHref}
            approvedCount={approvedApplicationsCount}
            maxQuota={2}
          />

          <section aria-label="Tournament sports and updates" className="grid gap-4 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            <DashboardCard>
              <PanelHeader
                icon={Trophy}
                title="All Included Sports"
                action={{ label: "View catalog", to: "/viewer/sports" }}
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

      {/* STAGE 3: Live & Leaderboard */}
      {effectiveStage === "live" && (
        <LiveDashboardStage events={events} sports={displaySports} entries={showcaseEntries} tournamentId={tournamentId} scheduleHref="/viewer/schedules" scoreBasePath="/viewer/matches" standingsHref="/viewer/standings" entriesHref="/viewer/schedules" departmentRows={olympicLeaderboard} breakdownRows={sportBreakdown} standingsUnavailable={championshipUnavailable}>
          {announcements.length > 0 ? (
            <DashboardCard>
              <PanelHeader icon={Megaphone} title="Latest Announcements" action={{ label: "View all", to: "/viewer/announcements" }} />
              <AnnouncementTimeline items={announcements} />
            </DashboardCard>
          ) : null}
        </LiveDashboardStage>
      )}
    </div>
  );
};

export default ViewerDashboardLayout;
