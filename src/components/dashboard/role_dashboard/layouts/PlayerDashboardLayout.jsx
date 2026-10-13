import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowRight, CalendarDays, CheckCircle2, Clock3, FileUp, Radio, ShieldAlert, ShieldCheck, Users } from "lucide-react";
import { PlayerAvatar, SportIcon } from "../../../common/IdentityImage";
import { DashboardStageSwitcher, LiveDashboardStage } from "./DashboardLifecycleStages";
import { formatShortDate, getSelectedTournament, getSelectedTournamentName, getTournamentDateRange, sortEventsByStart, buildShowcaseEntries, getSportLabel } from "./dashboardLayoutUtils";
import { getChampionshipStandings } from "../../../../services/standingsService";
import { getTournamentTeamRegistrations, getTeams } from "../../../../services/teamService";
import { listEntries } from "../../../../services/competitionEntryService";
import { mapChampionshipLeaderboard, mapChampionshipSportBreakdown } from "./dashboardStandingsUtils.js";
import { useProfileDrawer } from "../../../profile";

const upper = (value) => String(value || "").trim().toUpperCase();
const medicalStatusOf = (application) => {
  const status = upper(application?.medical_certificate_status);
  if (status) return status;
  const notes = String(application?.health_notes || "");
  if (!/Medical Certificate Attachment:/i.test(notes)) return "NOT_SUBMITTED";
  return upper(notes.match(/Medical Certificate Status:\s*([^\r\n]+)/i)?.[1] || "PENDING");
};

const appKey = (app) =>
  app ? `${String(app?.sourceType || "TEAM").toUpperCase()}:${Number(app?.pool_id || app?.team_id || app?.id || 0)}:${Number(app?.id || 0)}` : "";

const PlayerTeamHero = ({ application, roster, tournamentName, dateRange }) => {
  const players = Array.isArray(roster?.players) ? roster.players : [];
  const entryName = application?.entry_name || application?.team_name || application?.pool_name || roster?.team_name || "My Team / Entry";
  const coachName = roster?.coach?.name || application?.coach_name || "Coach assigned";
  const sportName = application?.sport_name || roster?.sport_name || "Sport";
  const metrics = [
    { label: "Players", value: players.length || (application?.player_membership_confirmed ? 1 : 0) },
    { label: "Coach", value: coachName },
    { label: "Entry", value: entryName },
    { label: "Readiness", value: "Player" },
  ];
  return (
    <section className="relative overflow-hidden rounded-3xl border border-blue-400/15 bg-[radial-gradient(circle_at_86%_20%,rgba(37,99,235,.22),transparent_32%),linear-gradient(135deg,#111827,#0b1220_60%,#08101d)] p-6 shadow-[0_24px_70px_rgba(2,6,23,.24)] md:p-8">
      <div className="relative grid items-center gap-7 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-300">
            <span>My Team / Entry</span>
            <span className="text-blue-300/50">•</span>
            <span>{tournamentName}</span>
            {dateRange ? <><span className="text-blue-300/50">•</span><span>{dateRange}</span></> : null}
          </div>
          <h2 className="mt-3 max-w-4xl break-words text-3xl font-black tracking-tight text-white sm:text-4xl">{entryName}</h2>
          <p className="mt-2 text-sm font-bold text-slate-300">{[sportName, roster?.department_name || application?.department_name].filter(Boolean).join(" · ")}</p>
          <div className="mt-7 grid divide-y divide-white/10 border-t border-white/10 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
            {metrics.map((metric) => (
              <div key={metric.label} className="min-w-0 px-4 py-3 first:pl-0">
                <p className="truncate text-lg font-black text-white" title={String(metric.value)}>{metric.value}</p>
                <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">{metric.label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="mx-auto grid h-44 w-44 place-items-center rounded-[2.25rem] border border-blue-300/15 bg-gradient-to-br from-blue-400/15 to-indigo-500/5 shadow-[0_0_80px_rgba(59,130,246,.18)] lg:h-52 lg:w-52">
          <SportIcon imageUrl={roster?.logo_url} label={sportName} scale="xl" className="!h-28 !w-28 rounded-[1.75rem] border-blue-300/20 text-2xl shadow-2xl lg:!h-32 lg:!w-32" />
        </div>
      </div>
    </section>
  );
};

const PlayerTeamList = ({ application, roster, currentUser, onOpenRoster }) => {
  const { openProfile } = useProfileDrawer();
  const players = Array.isArray(roster?.players) ? roster.players : [];
  const currentEmail = String(currentUser?.email || "").trim().toLowerCase();
  return (
    <section className="min-w-0">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-extrabold">My Team / Entry</h3>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Your confirmed teammates and entry members.</p>
        </div>
        <button type="button" onClick={() => onOpenRoster?.(application)} className="inline-flex items-center gap-1 text-xs font-bold text-[var(--primary)] hover:underline">
          View details <ArrowRight size={13} />
        </button>
      </div>
      <div className="mt-4 overflow-hidden rounded-xl border border-[var(--border-soft)]">
        {players.length ? players.map((player) => {
          const email = String(player?.email || player?.applicant_email || "").trim().toLowerCase();
          const isCurrent = Boolean(currentEmail && email === currentEmail);
          const name = player?.full_name || player?.display_name || player?.applicant_name || player?.name || "Player";
          return (
            <button
              key={player?.id || player?.player_id || `${name}-${email}`}
              type="button"
              onClick={() => openProfile({
                userId: player?.user_id || null,
                playerId: player?.id || player?.player_id || null,
                tournamentId: application?.tournament_id || roster?.tournament_id || null,
                sportId: application?.sport_id || roster?.sport_id || null,
              })}
              className={`flex w-full items-center gap-3 border-b border-[var(--border-soft)] px-3 py-3 text-left last:border-0 transition hover:bg-[var(--surface-soft)] ${isCurrent ? "bg-blue-500/10 ring-1 ring-inset ring-blue-500/20" : ""}`}
            >
              <PlayerAvatar imageUrl={player?.profile_image_url} label={name} />
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-bold">
                  {name}
                  {isCurrent ? <span className="ml-2 rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-black uppercase text-blue-600 dark:text-blue-300">You</span> : null}
                </p>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">{player?.position || "Player"}</p>
              </div>
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-300">Profile</span>
            </button>
          );
        }) : (
          <div className="grid min-h-40 place-items-center p-5 text-center">
            <div>
              <Users className="mx-auto text-[var(--text-soft)]" size={28} />
              <p className="mt-3 font-bold">Roster is being prepared</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Confirmed teammates will appear here.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

const PlayerActivity = ({ application, schedule, onOpenRoster }) => {
  const status = upper(application?.application_status);
  const medicalStatus = medicalStatusOf(application);
  const confirmed = Boolean(application?.player_membership_confirmed || application?.my_application_confirmed);
  const activities = [];
  if (application?.created_at) activities.push({ title: "Application submitted", detail: "Your application was sent to the Coach for review.", date: application.created_at, icon: Clock3 });
  if (schedule) activities.push({ title: "Tryout scheduled", detail: `${formatShortDate(schedule.scheduled_date)}${schedule.venue_name ? ` · ${schedule.venue_name}` : ""}${schedule.instructions ? ` · ${schedule.instructions}` : ""}`, date: schedule.scheduled_date, icon: CalendarDays });
  if (status === "REJECTED") activities.push({ title: "Application not selected", detail: application?.decision_note || "The Coach completed the application review.", date: application?.reviewed_at, icon: Clock3 });
  if (status === "ACCEPTED_AS_PLAYER") activities.push({ title: confirmed ? "Accepted as player" : "Coach accepted your application", detail: confirmed ? "You confirmed your place in this team or entry." : "Review the team or entry and confirm your decision.", date: application?.reviewed_at, icon: CheckCircle2, action: !confirmed ? "Review and decide" : null });
  if (confirmed && medicalStatus === "NOT_SUBMITTED") activities.push({ title: "Medical certificate required", detail: "Upload your medical certificate to complete your player requirements.", icon: FileUp, action: "Submit certificate" });
  if (medicalStatus === "PENDING") activities.push({ title: "Medical certificate submitted", detail: "Your certificate is waiting for Coach review.", icon: FileUp });
  if (medicalStatus === "RECEIVED") activities.push({ title: "Medical certificate received", detail: "Your Coach accepted your certificate. Your medical requirement is complete.", icon: CheckCircle2 });
  if (medicalStatus === "REJECTED") activities.push({ title: "Certificate needs resubmission", detail: application?.medical_certificate_note || "Upload a clearer or valid medical certificate.", icon: FileUp, action: "Review and resubmit" });
  return (
    <aside className="min-w-0">
      <div>
        <h3 className="text-base font-extrabold">Activity</h3>
        <p className="mt-1 text-xs text-[var(--text-muted)]">Application, tryout, and medical-certificate updates.</p>
      </div>
      <div className="mt-4 max-h-[470px] space-y-1 overflow-y-auto">
        {activities.length ? (
          activities.slice().reverse().map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={`${item.title}-${index}`} className="flex gap-3 rounded-xl p-3 hover:bg-[var(--surface-soft)]">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-blue-500">
                  <Icon size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{item.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">{item.detail}</p>
                  {item.date ? <p className="mt-1 text-[11px] text-[var(--text-soft)]">{formatShortDate(item.date)}</p> : null}
                  {item.action ? (
                    <button type="button" onClick={() => onOpenRoster?.(application)} className="mt-2 text-xs font-bold text-[var(--primary)] hover:underline">
                      {item.action}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })
        ) : (
          <div className="grid min-h-40 place-items-center text-center">
            <div>
              <Clock3 className="mx-auto text-[var(--text-soft)]" size={27} />
              <p className="mt-3 font-bold">No activity yet</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Your application and team updates will appear here.</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

const MultiSportMedicalOverview = ({ applications, onOpenRoster }) => {
  if (!Array.isArray(applications) || applications.length <= 1) return null;

  return (
    <section className="rounded-2xl border border-blue-200/60 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 p-4 shadow-sm dark:border-blue-900/40 dark:bg-gradient-to-r dark:from-blue-950/20 dark:via-indigo-950/15 dark:to-slate-900/40 sm:p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white">
            <ShieldCheck size={18} className="text-blue-600 dark:text-blue-400" />
            My Tournament Sports & Medical Certificates ({applications.length} Sports)
          </h3>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
            You are selected in multiple sports. Each team or entry requires its own verified medical certificate.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {applications.map((app) => {
          const medStatus = medicalStatusOf(app);
          const confirmed = Boolean(app?.player_membership_confirmed || app?.my_application_confirmed);
          const entryName = app?.entry_name || app?.team_name || app?.pool_name || "My Entry";
          const sportName = app?.sport_name || "Sport";
          const needsUpload = medStatus === "NOT_SUBMITTED" || medStatus === "REJECTED";

          return (
            <div
              key={appKey(app)}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs transition hover:border-blue-300 dark:border-slate-700/80 dark:bg-slate-800/80 dark:hover:border-blue-600"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      {sportName}
                    </p>
                    <p className="mt-0.5 truncate text-sm font-extrabold text-slate-900 dark:text-white" title={entryName}>
                      {entryName}
                    </p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      medStatus === "RECEIVED"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                        : medStatus === "PENDING"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                          : medStatus === "REJECTED"
                            ? "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300"
                    }`}
                  >
                    {medStatus === "RECEIVED" ? (
                      <><CheckCircle2 size={11} /> Verified</>
                    ) : medStatus === "PENDING" ? (
                      <><Clock3 size={11} /> Submitted</>
                    ) : medStatus === "REJECTED" ? (
                      <><AlertCircle size={11} /> Re-upload</>
                    ) : (
                      <><FileUp size={11} /> Required</>
                    )}
                  </span>
                </div>

                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  {medStatus === "RECEIVED"
                    ? "Coach marked your certificate as received. Ready for competition."
                    : medStatus === "PENDING"
                      ? "Certificate submitted. Waiting for Coach verification."
                      : medStatus === "REJECTED"
                        ? "Certificate rejected. Please upload a clear and valid document."
                        : !confirmed
                          ? "First confirm your player spot, then upload certificate."
                          : "Upload your certificate so your coach can verify your spot."}
                </p>
              </div>

              <div className="mt-3.5 flex items-center justify-end border-t border-slate-100 pt-2.5 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => onOpenRoster?.(app)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    needsUpload
                      ? "bg-blue-600 text-white shadow-xs hover:bg-blue-500"
                      : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-700/50 dark:text-slate-200"
                  }`}
                >
                  {needsUpload ? <FileUp size={13} /> : <ArrowRight size={13} />}
                  {needsUpload
                    ? medStatus === "REJECTED" ? "Resubmit Certificate" : "Submit Certificate"
                    : !confirmed ? "Review & Confirm" : "View Details"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

const PlayerDashboardLayout = ({
  dashboard,
  lifecycle,
  currentUser,
  onOpenRoster,
  startedTournament = null,
  brackets = [],
  sportsList = [],
}) => {
  const [dashboardStage, setDashboardStage] = useState("entry");
  const [selectedAppKey, setSelectedAppKey] = useState("");
  const [championship, setChampionship] = useState(null);
  const [championshipUnavailable, setChampionshipUnavailable] = useState(false);
  const [teamRegistrations, setTeamRegistrations] = useState([]);
  const [competitionEntries, setCompetitionEntries] = useState([]);
  const [allTeams, setAllTeams] = useState([]);

  const events = sortEventsByStart(dashboard?.schedule?.events || []);
  const sportEvents = sortEventsByStart(dashboard?.schedule?.sport_events || []);
  const teamIds = Array.isArray(dashboard?.scope?.team_ids) ? dashboard.scope.team_ids : [];
  const scopedEvents = events.filter((event) =>
    teamIds.some((teamId) => Number(teamId) === Number(event?.team1_id) || Number(teamId) === Number(event?.team2_id))
  );
  const operationalEvents = scopedEvents.length ? scopedEvents : sportEvents.length ? sportEvents : events;
  const tournament = useMemo(
    () => getSelectedTournament(dashboard) || startedTournament || null,
    [dashboard, startedTournament]
  );
  const tournamentId = tournament?.id ?? dashboard?.selected_tournament_id ?? null;

  useEffect(() => {
    let active = true;
    const loadTournamentDetails = async () => {
      if (!tournamentId) return;
      try {
        setChampionship(null);
        setChampionshipUnavailable(false);
        const [champData, teamPayload, entryPayload, allTeamsPayload] = await Promise.all([
          getChampionshipStandings({ tournamentId }).catch(() => null),
          getTournamentTeamRegistrations(Number(tournamentId), { status: "ALL", page: 1, limit: 200 }).catch(() => []),
          listEntries({ tournamentId: Number(tournamentId) }).catch(() => []),
          getTeams(null, Number(tournamentId)).catch(() => []),
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
        setAllTeams(
          Array.isArray(allTeamsPayload)
            ? allTeamsPayload
            : Array.isArray(allTeamsPayload?.items)
              ? allTeamsPayload.items
              : []
        );
      } catch {
        if (!active) return;
        setChampionship(null);
        setChampionshipUnavailable(true);
      }
    };
    void loadTournamentDetails();
    return () => {
      active = false;
    };
  }, [tournamentId]);

  // Collect all accepted/participating player applications in this tournament
  const playerApplications = useMemo(() => {
    const items = Array.isArray(lifecycle?.items) ? lifecycle.items : [];
    const accepted = items.filter(
      (app) => upper(app.application_status) === "ACCEPTED_AS_PLAYER" || Boolean(app.player_membership_confirmed)
    );
    return accepted.length > 0 ? accepted : items;
  }, [lifecycle?.items]);

  // Determine the active application being inspected in the hero and list
  const activeApp = useMemo(() => {
    if (!playerApplications.length) return lifecycle?.primary || null;
    if (selectedAppKey) {
      const found = playerApplications.find((app) => appKey(app) === selectedAppKey);
      if (found) return found;
    }
    return lifecycle?.primary || playerApplications[0] || null;
  }, [playerApplications, selectedAppKey, lifecycle?.primary]);

  const activeKey = appKey(activeApp);
  const activeRoster = lifecycle?.rostersByKey?.[activeKey] || lifecycle?.roster || null;
  const activeSchedule = lifecycle?.schedulesByKey?.[activeKey] || lifecycle?.schedule || null;

  // Live center entries and sports for all player applications
  const liveEntries = useMemo(() => {
    return playerApplications.map((app) => {
      const k = appKey(app);
      const r = lifecycle?.rostersByKey?.[k] || (k === appKey(activeApp) ? activeRoster : null);
      const rPlayers = Array.isArray(r?.players) ? r.players : [];
      return {
        id: app.id,
        entry_id: app.entry_id,
        team_id: app.team_id,
        name: app.entry_name || app.team_name || app.pool_name || "My Entry",
        meta: [app.sport_name, app.event_name].filter(Boolean).join(" · "),
        members: rPlayers,
      };
    });
  }, [playerApplications, lifecycle?.rostersByKey, activeApp, activeRoster]);

  const liveSports = useMemo(() => {
    const seen = new Set();
    const result = [];
    for (const app of playerApplications) {
      const sid = app.sport_id;
      if (sid && !seen.has(sid)) {
        seen.add(sid);
        result.push({ id: sid, name: app.sport_name || "Sport" });
      }
    }
    return result.length ? result : activeApp ? [{ id: activeApp.sport_id, name: activeApp.sport_name || "Sport" }] : [];
  }, [playerApplications, activeApp]);

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
    if (Array.isArray(targetTournament?.sport_ids)) targetTournament.sport_ids.forEach(addId);
    if (targetTournament?.sport_id) addId(targetTournament.sport_id);
    if (Array.isArray(targetTournament?.sport_bracket_settings)) {
      targetTournament.sport_bracket_settings.forEach((s) => addId(s?.sport_id || s?.id));
    }
    if (Array.isArray(scopedBrackets)) scopedBrackets.forEach((b) => addId(b?.sport_id || b?.sportId));
    if (Array.isArray(events)) events.forEach((ev) => addId(ev?.sport_id || ev?.sportId));
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

  const showcaseEntries = useMemo(
    () =>
      buildShowcaseEntries({
        teamRegistrations,
        competitionEntries,
        teams: allTeams,
        events,
        dashboard,
      }),
    [teamRegistrations, competitionEntries, allTeams, events, dashboard]
  );

  const olympicLeaderboard = useMemo(() => mapChampionshipLeaderboard(championship?.leaderboard), [championship]);
  const sportBreakdown = useMemo(() => mapChampionshipSportBreakdown(championship?.sport_breakdown), [championship]);

  return (
    <div className="space-y-5">
      <DashboardStageSwitcher
        label=""
        options={[
          { value: "entry", label: "My Entry", icon: Users },
          { value: "live", label: "Live Center & Leaderboard", icon: Radio },
        ]}
        effectiveStage={dashboardStage}
        autoStage="entry"
        selectedStage={dashboardStage}
        onSelect={setDashboardStage}
      />

      {dashboardStage === "entry" ? (
        <>
          {/* Multi-sport switcher tabs when player is in multiple entries */}
          {playerApplications.length > 1 ? (
            <div className="flex flex-col gap-2 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Switch Active Sport / Entry
                </span>
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  {playerApplications.length} sports joined
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {playerApplications.map((app) => {
                  const k = appKey(app);
                  const isSelected = k === appKey(activeApp);
                  const medStatus = medicalStatusOf(app);
                  const sportName = app.sport_name || "Sport";
                  const entryName = app.entry_name || app.team_name || app.pool_name || "Entry";
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setSelectedAppKey(k)}
                      className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                        isSelected
                          ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                          : "border border-[var(--border-soft)] bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      <span className="truncate max-w-[160px] sm:max-w-[220px]">
                        {sportName} · {entryName}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-1.5 py-0.2 text-[9px] font-black uppercase ${
                          isSelected
                            ? "bg-white/20 text-white"
                            : medStatus === "RECEIVED"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : medStatus === "PENDING"
                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                : medStatus === "REJECTED"
                                  ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                                  : "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                        }`}
                      >
                        {medStatus === "RECEIVED"
                          ? "Verified"
                          : medStatus === "PENDING"
                            ? "Pending"
                            : medStatus === "REJECTED"
                              ? "Resubmit"
                              : "Med Req"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Multi-sport medical certificate status & submission cards */}
          <MultiSportMedicalOverview applications={playerApplications} onOpenRoster={onOpenRoster} />

          <PlayerTeamHero
            application={activeApp}
            roster={activeRoster}
            tournamentName={getSelectedTournamentName(dashboard) || "Intramural Tournament"}
            dateRange={getTournamentDateRange(tournament)}
          />

          <section className="pt-1">
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(320px,2fr)]">
              <PlayerTeamList
                application={activeApp}
                roster={activeRoster}
                currentUser={currentUser}
                onOpenRoster={onOpenRoster}
              />
              <PlayerActivity
                application={activeApp}
                schedule={activeSchedule}
                onOpenRoster={onOpenRoster}
              />
            </div>
          </section>
        </>
      ) : null}

      {dashboardStage === "live" ? (
        <LiveDashboardStage
          events={events.length > 0 ? events : operationalEvents}
          sports={displaySports.length > 0 ? displaySports : liveSports}
          entries={showcaseEntries.length > 0 ? showcaseEntries : liveEntries}
          tournamentId={tournament?.id}
          scheduleHref="/viewer/schedules"
          scoreBasePath="/viewer/matches"
          standingsHref="/viewer/standings"
          entriesHref="/viewer/teams"
          departmentRows={olympicLeaderboard}
          breakdownRows={sportBreakdown}
          standingsUnavailable={championshipUnavailable}
          userDepartmentId={currentUser?.department_id}
          matchCenterProps={{
            events: operationalEvents,
            roleTitle: "Live Match Center",
            emptyTitle: "No live or upcoming matches",
            emptyDescription: "Your team or entry fixtures will appear here when published.",
          }}
        />
      ) : null}
    </div>
  );
};

export default PlayerDashboardLayout;
