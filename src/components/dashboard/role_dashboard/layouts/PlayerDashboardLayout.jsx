import { useState } from "react";
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, FileUp, Radio, Users } from "lucide-react";
import { PlayerAvatar, SportIcon } from "../../../common/IdentityImage";
import { DashboardStageSwitcher, LiveDashboardStage } from "./DashboardLifecycleStages";
import { formatShortDate, getSelectedTournament, getSelectedTournamentName, getTournamentDateRange, sortEventsByStart } from "./dashboardLayoutUtils";
import { useProfileDrawer } from "../../../profile";

const upper = (value) => String(value || "").trim().toUpperCase();
const medicalStatusOf = (application) => {
  const status = upper(application?.medical_certificate_status);
  if (status) return status;
  const notes = String(application?.health_notes || "");
  if (!/Medical Certificate Attachment:/i.test(notes)) return "NOT_SUBMITTED";
  return upper(notes.match(/Medical Certificate Status:\s*([^\r\n]+)/i)?.[1] || "PENDING");
};

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
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-300"><span>My Team / Entry</span><span className="text-blue-300/50">•</span><span>{tournamentName}</span>{dateRange ? <><span className="text-blue-300/50">•</span><span>{dateRange}</span></> : null}</div>
          <h2 className="mt-3 max-w-4xl break-words text-3xl font-black tracking-tight text-white sm:text-4xl">{entryName}</h2>
          <p className="mt-2 text-sm font-bold text-slate-300">{[sportName, roster?.department_name || application?.department_name].filter(Boolean).join(" · ")}</p>
          <div className="mt-7 grid divide-y divide-white/10 border-t border-white/10 sm:grid-cols-4 sm:divide-x sm:divide-y-0">{metrics.map((metric) => <div key={metric.label} className="min-w-0 px-4 py-3 first:pl-0"><p className="truncate text-lg font-black text-white" title={String(metric.value)}>{metric.value}</p><p className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">{metric.label}</p></div>)}</div>
        </div>
        <div className="mx-auto grid h-44 w-44 place-items-center rounded-[2.25rem] border border-blue-300/15 bg-gradient-to-br from-blue-400/15 to-indigo-500/5 shadow-[0_0_80px_rgba(59,130,246,.18)] lg:h-52 lg:w-52"><SportIcon imageUrl={roster?.logo_url} label={sportName} scale="xl" className="!h-28 !w-28 rounded-[1.75rem] border-blue-300/20 text-2xl shadow-2xl lg:!h-32 lg:!w-32" /></div>
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

const PlayerActivity = ({ lifecycle, onOpenRoster }) => {
  const application = lifecycle?.primary || null;
  const schedule = lifecycle?.schedule || null;
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
  return <aside className="min-w-0"><div><h3 className="text-base font-extrabold">Activity</h3><p className="mt-1 text-xs text-[var(--text-muted)]">Application, tryout, and medical-certificate updates.</p></div><div className="mt-4 max-h-[470px] space-y-1 overflow-y-auto">{activities.length ? activities.slice().reverse().map((item, index) => { const Icon = item.icon; return <div key={`${item.title}-${index}`} className="flex gap-3 rounded-xl p-3 hover:bg-[var(--surface-soft)]"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-blue-500"><Icon size={16} /></span><div className="min-w-0 flex-1"><p className="text-sm font-bold">{item.title}</p><p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">{item.detail}</p>{item.date ? <p className="mt-1 text-[11px] text-[var(--text-soft)]">{formatShortDate(item.date)}</p> : null}{item.action ? <button type="button" onClick={() => onOpenRoster?.(application)} className="mt-2 text-xs font-bold text-[var(--primary)] hover:underline">{item.action}</button> : null}</div></div>; }) : <div className="grid min-h-40 place-items-center text-center"><div><Clock3 className="mx-auto text-[var(--text-soft)]" size={27} /><p className="mt-3 font-bold">No activity yet</p><p className="mt-1 text-sm text-[var(--text-muted)]">Your application and team updates will appear here.</p></div></div>}</div></aside>;
};

const PlayerDashboardLayout = ({ dashboard, lifecycle, currentUser, onOpenRoster }) => {
  const [dashboardStage, setDashboardStage] = useState("entry");
  const events = sortEventsByStart(dashboard?.schedule?.events || []);
  const sportEvents = sortEventsByStart(dashboard?.schedule?.sport_events || []);
  const teamIds = Array.isArray(dashboard?.scope?.team_ids) ? dashboard.scope.team_ids : [];
  const scopedEvents = events.filter((event) => teamIds.some((teamId) => Number(teamId) === Number(event?.team1_id) || Number(teamId) === Number(event?.team2_id)));
  const operationalEvents = scopedEvents.length ? scopedEvents : sportEvents.length ? sportEvents : events;
  const tournament = getSelectedTournament(dashboard);
  const application = lifecycle?.primary || null;
  const rosterPlayers = Array.isArray(lifecycle?.roster?.players) ? lifecycle.roster.players : [];
  const liveEntries = application ? [{ id: application.id, entry_id: application.entry_id, team_id: application.team_id, name: application.entry_name || application.team_name || application.pool_name || "My Entry", meta: [application.sport_name, application.event_name].filter(Boolean).join(" · "), members: rosterPlayers }] : [];
  const liveSports = application ? [{ id: application.sport_id, name: application.sport_name || "Sport" }] : [];
  return (
    <div className="space-y-5">
      <DashboardStageSwitcher label="" options={[{ value: "entry", label: "My Entry", icon: Users }, { value: "live", label: "Live Center & Leaderboard", icon: Radio }]} effectiveStage={dashboardStage} autoStage="entry" selectedStage={dashboardStage} onSelect={setDashboardStage} />
      {dashboardStage === "entry" ? <><PlayerTeamHero application={application} roster={lifecycle?.roster} tournamentName={getSelectedTournamentName(dashboard) || "Intramural Tournament"} dateRange={getTournamentDateRange(tournament)} /><section className="pt-1"><div className="grid items-start gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(320px,2fr)]"><PlayerTeamList application={application} roster={lifecycle?.roster} currentUser={currentUser} onOpenRoster={onOpenRoster} /><PlayerActivity lifecycle={lifecycle} onOpenRoster={onOpenRoster} /></div></section></> : null}
      {dashboardStage === "live" ? <LiveDashboardStage events={operationalEvents} sports={liveSports} entries={liveEntries} tournamentId={tournament?.id} scheduleHref="/viewer/schedules" scoreBasePath="/viewer/matches" standingsHref="/viewer/standings" entriesHref="/viewer/teams" departmentRows={[]} breakdownRows={[]} matchCenterProps={{ roleTitle: "Live Match Center", emptyTitle: "No live or upcoming matches", emptyDescription: "Your team or entry fixtures will appear here when published." }} /> : null}
    </div>
  );
};

export default PlayerDashboardLayout;
