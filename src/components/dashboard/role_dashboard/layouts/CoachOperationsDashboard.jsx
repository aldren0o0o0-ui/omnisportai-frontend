import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, CheckCircle2, ClipboardList, Clock3, Search, UserPlus, Users, XCircle } from "lucide-react";
import { PlayerAvatar, SportIcon } from "../../../common/IdentityImage";
import { getCompetitionDisplayLabel } from "../../../../utils/tournamentEventCategories";

const upper = (value, fallback = "") => String(value || fallback).trim().toUpperCase();
const coachStatusLabel = (value) => {
  const status = upper(value);
  if (status === "ROSTER_BUILDING") return "Adding players";
  if (["APPROVED", "ACCEPTED", "READY"].includes(status)) return "Ready";
  if (status === "PENDING") return "Waiting for review";
  if (status === "INCOMPLETE") return "More information needed";
  if (status === "REJECTED") return "Not approved";
  return String(value || "In progress").replaceAll("_", " ").toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
};
const medicalStatusOf = (player) => {
  const structured = upper(player?.medical_certificate_status);
  if (["NOT_SUBMITTED", "PENDING", "RECEIVED", "REJECTED"].includes(structured)) return structured;
  const notes = String(player?.health_notes || "");
  if (!/Medical Certificate Attachment:/i.test(notes)) return "NOT_SUBMITTED";
  const recorded = upper(notes.match(/Medical Certificate Status:\s*([^\r\n]+)/i)?.[1]);
  return ["PENDING", "RECEIVED", "REJECTED"].includes(recorded) ? recorded : "PENDING";
};
const medicalStatusPresentation = (player) => {
  const status = medicalStatusOf(player);
  if (status === "PENDING") return { status, label: "Waiting for Coach review", className: "text-blue-400" };
  if (status === "RECEIVED") return { status, label: "Certificate accepted", className: "text-emerald-400" };
  if (status === "REJECTED") return { status, label: "Needs resubmission", className: "text-rose-400" };
  return { status: "NOT_SUBMITTED", label: "No Medical Certificate Yet", className: "text-slate-400" };
};
const formatDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";
};

const ownedByCoach = (entry, teamIds) => entry?.is_current_user_entry
  || entry?.is_priority
  || entry?.capabilities?.can_edit_name
  || entry?.capabilities?.can_edit_logo
  || (entry?.team_id && teamIds.includes(Number(entry.team_id)));

const rosterRows = (entries) => entries.flatMap((participant) => {
  const members = Array.isArray(participant.members) ? participant.members : [];
  return members.map((player) => ({
    key: `${participant.entry_id}-${player.player_id}`,
    player,
    participant,
    shape: upper(participant.participant_shape, "TEAM"),
    status: upper(participant.public_status, "APPROVED"),
    medical: medicalStatusPresentation(player),
  }));
});

const HeroMetric = ({ label, value, attention }) => <div className="px-4 py-3 first:pl-0"><p className={`text-xl font-black tabular-nums ${attention ? "text-amber-300" : "text-white"}`}>{value}</p><p className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p></div>;

const targetAsEntryContext = (target = {}) => ({
  display_name: target.target_name || target.team_name || target.pool_name || target.event_name,
  entry_name: target.target_name || target.team_name || target.pool_name || target.event_name,
  participant_shape: target.participant_shape,
  sport_name: target.sport_label || target.sport_name,
  event_name: target.event_name,
  department_code: target.department_code,
  department_name: target.department_name,
  sport_id: target.sport_id,
});

export const CoachOperationsHero = ({ entries, applications, tournament, sports, assignedTargets = [] }) => {
  const applicationContext = applications[0] || {};
  const first = entries[0] || (assignedTargets[0] ? targetAsEntryContext(assignedTargets[0]) : null) || {
    display_name: applicationContext.team_name || applicationContext.pool_name || applicationContext.entry_name,
    entry_name: applicationContext.team_name || applicationContext.pool_name || applicationContext.entry_name,
    participant_shape: applicationContext.participant_shape || applicationContext.competition_type_label,
    sport_name: applicationContext.sport_name || applicationContext.sport_label || applicationContext.sport,
    event_name: applicationContext.event_name,
    department_code: applicationContext.department_code,
    department_name: applicationContext.department_name,
    sport_id: applicationContext.sport_id,
  };
  const shape = upper(first.participant_shape, "TEAM");
  const players = entries.reduce((sum, row) => sum + (row.members?.length || 0), 0);
  const approved = entries.filter((row) => /APPROVED|ACCEPTED|READY/.test(upper(row.public_status))).length;
  const issues = Math.max(0, entries.length - approved);
  const sport = sports.find((row) => Number(row?.id || row?.sport_id) === Number(first.sport_id)) || {};
  const sportName = first.sport_name || sport.name || "Sport assignment pending";
  const eventName = first.event_name || "";
  const participantName = first.display_name || first.entry_name || (applications.length ? "Entry setup pending" : "Coach assignment pending");
  const tournamentName = tournament?.tournament_name || tournament?.name || "Selected Intramural";
  const start = formatDate(tournament?.start_date || tournament?.date_start);
  const end = formatDate(tournament?.end_date || tournament?.date_end);
  const capacity = entries.reduce((sum, row) => sum + Number(row.max_players || row.roster_limit || 0), 0);
  const readiness = entries.length ? (issues ? "In progress" : "Ready") : applications.length ? "Review applications" : assignedTargets.length ? "Assigned" : "Not assigned";
  const metrics = shape === "TEAM"
    ? [["Players", players], ["Roster", capacity ? `${players}/${capacity}` : `${players} registered`], ["Applicants", applications.length], ["Readiness", readiness]]
    : shape === "DUO"
      ? [["Entries", entries.length], ["Players", players], ["Applicants", applications.length], ["Readiness", readiness]]
      : [["Players", players], ["Ready", entries.filter((row) => /APPROVED|READY|ACCEPTED/.test(upper(row.public_status))).length], ["Applicants", applications.length], ["Readiness", readiness]];

  return <section className="relative overflow-hidden rounded-3xl border border-blue-400/15 bg-[radial-gradient(circle_at_86%_20%,rgba(37,99,235,.22),transparent_32%),linear-gradient(135deg,#111827,#0b1220_60%,#08101d)] p-6 shadow-[0_24px_70px_rgba(2,6,23,.24)] md:p-8"><div className="relative grid items-center gap-7 lg:grid-cols-[minmax(0,1fr)_220px]"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-300"><span>{tournamentName}</span>{start || end ? <><span className="text-blue-300/50">•</span><span>{start}{start && end ? " – " : ""}{end}</span></> : null}</div><h2 className="mt-3 max-w-4xl break-words text-3xl font-black tracking-tight text-white sm:text-4xl">{participantName}</h2>{(entries.length || applications.length || assignedTargets.length) ? <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-300"><span className="font-extrabold text-white">{sportName}{eventName ? ` · ${eventName}` : ""}</span>{first.department_code || first.department_name ? <><span className="text-slate-600">•</span><span>{first.department_code || first.department_name}</span></> : null}</div> : <p className="mt-2 text-sm text-slate-400">Your assigned team or entry will appear here.</p>}<div className="mt-7 grid divide-y divide-white/10 border-t border-white/10 sm:grid-cols-4 sm:divide-x sm:divide-y-0">{metrics.map(([label, value], index) => <HeroMetric key={label} label={label} value={value} attention={index === 3 && Boolean(issues)} />)}</div></div><div className="mx-auto grid h-44 w-44 place-items-center rounded-[2.25rem] border border-blue-300/15 bg-gradient-to-br from-blue-400/15 to-indigo-500/5 shadow-[0_0_80px_rgba(59,130,246,.18)] lg:h-52 lg:w-52"><SportIcon imageUrl={sport.image_url || sport.icon_url || sport.sport_image_url || sport.logo_url} label={sportName} scale="xl" className="!h-28 !w-28 rounded-[1.75rem] border-blue-300/20 text-2xl shadow-2xl lg:!h-32 lg:!w-32" /></div></div></section>;
};

export const CoachRosterList = ({ entries, applications, onSelectPlayer }) => {
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const rows = useMemo(() => rosterRows(entries), [entries]);
  const allTeam = entries.length > 0 && entries.every((row) => upper(row.participant_shape) === "TEAM");
  const visible = rows.filter((row) => (filter === "READY" ? row.medical.status === "RECEIVED" : filter === "ATTENTION" ? row.medical.status !== "RECEIVED" : true) && (!search.trim() || `${row.player.display_name} ${row.player.position || ""} ${row.participant.display_name}`.toLowerCase().includes(search.trim().toLowerCase())));
  return <section className="min-w-0"><div className="flex items-center justify-between gap-3"><h3 className="text-base font-extrabold">{allTeam ? "Roster & Players" : "Entries & Players"}</h3><Link to="/coach/teams" className="inline-flex items-center gap-1 text-xs font-bold text-[var(--primary)] hover:underline">Manage players <ArrowRight size={13} /></Link></div><div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between"><div className="flex flex-wrap gap-1.5">{[["ALL",`All ${rows.length}`],["READY","Certificate accepted"],["ATTENTION","Needs action"]].map(([value,label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${filter === value ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-muted)] text-[var(--text-muted)]"}`}>{label}</button>)}</div>{rows.length >= 6 ? <label className="relative block xl:w-52"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-soft)]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search players" className="min-h-10 w-full rounded-xl border border-[var(--border-soft)] bg-transparent pl-9 pr-3 text-sm" /></label> : null}</div><div className="mt-4 overflow-hidden rounded-xl border border-[var(--border-soft)]">{visible.length ? visible.map((row) => <button key={row.key} type="button" onClick={() => onSelectPlayer({ player: row.player, participant: row.participant })} className="grid w-full min-w-0 gap-3 border-b border-[var(--border-soft)] px-3 py-3 text-left last:border-0 hover:bg-[var(--surface-soft)] sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_110px_auto] sm:items-center"><div className="flex min-w-0 items-center gap-3"><PlayerAvatar imageUrl={row.player.profile_image_url} label={row.player.display_name} /><div className="min-w-0"><p className="break-words text-sm font-bold">{row.player.display_name}</p><p className="mt-0.5 text-xs text-[var(--text-soft)]">{row.player.position || (row.shape === "TEAM" ? "Team player" : "Entry member")}</p></div></div><p className="break-words text-xs text-[var(--text-muted)]">{row.participant.display_name}</p><p className={`text-xs font-bold ${row.medical.className}`}>{row.medical.label}</p><ArrowRight size={15} className="text-[var(--text-soft)]" /></button>) : <div className="grid min-h-36 place-items-center p-5 text-center"><div><Users className="mx-auto text-[var(--text-soft)]" size={27} /><p className="mt-3 font-bold">No players added yet</p><p className="mt-1 text-sm text-[var(--text-muted)]">Add players or review new applications.</p>{applications.length ? <Link to="/coach/applications" className="mt-3 inline-flex text-xs font-bold text-[var(--primary)] hover:underline">Review applications</Link> : null}</div></div>}</div></section>;
};

export const CoachRecruitmentActivity = ({ applications, entries }) => {
  const [tab, setTab] = useState("recruitment");
  const updates = entries.slice(0, 8).map((entry) => ({
    title: entry.display_name,
    detail: entry.href
      ? String(entry.public_status || "Your submitted entry was reviewed.")
      : `${getCompetitionDisplayLabel({ sport: entry, event: entry })} · ${coachStatusLabel(entry.public_status || "Approved")}`,
    href: entry.href,
    actionLabel: entry.actionLabel,
  }));
  return <aside className="min-w-0"><div className="flex items-center justify-between gap-3"><h3 className="text-base font-extrabold">Recruitment & Activity</h3></div><div className="mt-4 grid grid-cols-2 rounded-xl bg-[var(--surface-muted)] p-1">{[["recruitment","Recruitment",applications.length],["updates","Updates",updates.length]].map(([value,label,count]) => <button key={value} type="button" onClick={() => setTab(value)} className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold ${tab === value ? "bg-[var(--surface)] shadow-sm" : "text-[var(--text-muted)]"}`}><span>{label}</span>{count > 0 ? <span className="grid min-h-5 min-w-5 place-items-center rounded-full bg-[var(--primary)] px-1 text-[10px] font-black text-white" aria-label={`${count} ${label.toLowerCase()} items`}>{count > 99 ? "99+" : count}</span> : null}</button>)}</div><div className="mt-4 max-h-[430px] space-y-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{tab === "recruitment" ? applications.length ? <><p className="px-3 pb-2 text-xs font-bold text-amber-400">{applications.length} application{applications.length === 1 ? "" : "s"} need review</p>{applications.map((app, index) => <div key={app.id || index} className="flex items-center gap-3 rounded-xl p-3 hover:bg-[var(--surface-soft)]"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-blue-400"><UserPlus size={16} /></span><div className="min-w-0 flex-1"><p className="break-words text-sm font-bold">{app.player_name || app.applicant_name || app.name || "Player applicant"}</p><p className="mt-0.5 text-xs text-[var(--text-muted)]">{app.team_name || app.team || app.sport || "Player application"}</p></div><Link to="/coach/player-applications" className="text-xs font-bold text-[var(--primary)] hover:underline">Review</Link></div>)}</> : <div className="grid min-h-36 place-items-center text-center"><div><CheckCircle2 className="mx-auto text-emerald-400" size={27} /><p className="mt-3 font-bold">No pending applications</p><p className="mt-1 text-sm text-[var(--text-muted)]">New player applications will appear here.</p></div></div> : updates.length ? updates.map((item) => <div key={`${item.title}-${item.detail}`} className="flex gap-3 rounded-xl p-3 hover:bg-[var(--surface-soft)]"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-500/10 text-blue-400"><Clock3 size={15} /></span><div><p className="text-sm font-bold">{item.title}</p><p className="mt-1 text-xs text-[var(--text-muted)]">{item.detail}</p>{item.href ? <Link to={item.href} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[var(--primary)] hover:underline">{item.actionLabel} <ArrowRight size={13} /></Link> : null}</div></div>) : <div className="grid min-h-36 place-items-center text-center"><div><ClipboardList className="mx-auto text-[var(--text-soft)]" size={27} /><p className="mt-3 font-bold">No recent team activity</p><p className="mt-1 text-sm text-[var(--text-muted)]">Updates will appear as roster and entry changes occur.</p></div></div>}</div></aside>;
};

export const CoachReadiness = ({ entries, applications, assignedTargets = [] }) => {
  const players = entries.reduce((sum, entry) => sum + (entry.members?.length || 0), 0);
  const approved = entries.filter((entry) => /APPROVED|ACCEPTED|READY/.test(upper(entry.public_status))).length;
  const allTeam = entries.length > 0 && entries.every((entry) => upper(entry.participant_shape) === "TEAM");
  const assignedCount = assignedTargets.length;
  const coachAssigned = entries.length
    ? entries.filter((entry) => entry.coach?.is_active !== false && entry.coach?.display_name).length
    : assignedCount;
  const coachTotal = entries.length || assignedCount;
  const hasAssignment = coachTotal > 0;
  const rows = [[allTeam ? "Roster" : "Players", players, players],["Entries", approved, entries.length],["Coach", coachAssigned, coachTotal],["Applications", applications.length ? 0 : 1, 1]];
  const issues = (hasAssignment ? 0 : 1) + (approved < entries.length ? 1 : 0) + (coachAssigned < coachTotal ? 1 : 0) + (applications.length ? 1 : 0);
  const status = !hasAssignment ? "Coach assignment not configured" : entries.length === 0 ? "Coach assignment active" : issues ? `${issues} item${issues === 1 ? "" : "s"} need attention` : `${allTeam ? "Team" : "Entry"} ready for competition`;
  const detail = hasAssignment && entries.length === 0 ? "Player applications and submitted entries will appear here." : issues ? "Finish the remaining player or entry tasks shown above." : "Everything currently required is complete.";
  return <section className="bg-transparent p-0"><div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--text-soft)]">{allTeam ? "Team Progress" : "Entry Progress"}</p><div className="mt-3 grid gap-x-8 gap-y-3 sm:grid-cols-2 xl:grid-cols-4">{rows.map(([label,value,total]) => { const ready = total > 0 && value >= total; return <div key={label} className="flex min-w-40 items-center justify-between gap-4"><div><p className="text-xs text-[var(--text-muted)]">{label}</p><p className="mt-0.5 text-sm font-black tabular-nums">{label === "Applications" ? (applications.length ? `${applications.length} waiting` : "None waiting") : `${value} / ${total}`}</p></div>{ready ? <Check className="text-emerald-400" size={17} /> : <XCircle className="text-amber-300" size={17} />}</div>; })}</div></div><div className="flex items-center gap-4 xl:border-l xl:border-[var(--border-soft)] xl:pl-6"><div><p className={`text-sm font-black ${issues ? "text-amber-300" : "text-emerald-300"}`}>{status}</p><p className="mt-1 text-xs text-[var(--text-muted)]">{detail}</p></div>{issues ? <Link to="/coach/teams" className="whitespace-nowrap text-xs font-bold text-[var(--primary)] hover:underline">Manage players <ArrowRight className="inline" size={13} /></Link> : null}</div></div></section>;
};

const CoachOperationsDashboard = ({ entries, applications, tournament, sports, teamIds, assignedTargets = [], announcements = [], notifications = [], onSelectPlayer }) => {
  const ownedEntries = useMemo(() => entries.filter((entry) => ownedByCoach(entry, teamIds)), [entries, teamIds]);
  const pendingApplications = useMemo(() => applications.filter((row) => ["PENDING", "FOR_TRYOUT"].includes(upper(row?.application_status || row?.status))), [applications]);
  const activityEntries = useMemo(() => {
    const applicationUpdates = applications.map((row) => {
      const status = upper(row?.application_status || row?.status);
      const medical = medicalStatusPresentation(row);
      const medicalLabel = status === "ACCEPTED_AS_PLAYER" ? medical.label : "";
      return {
        display_name: row?.applicant_name || row?.player_name || "Player application",
        sport_name: medicalLabel ? "Medical Certificate" : "Recruitment",
        event_name: row?.event_name || row?.team_name,
        public_status: medicalLabel || (status === "ACCEPTED_AS_PLAYER" ? "Accepted as player" : status === "REJECTED" ? "Application not selected" : "Application awaiting review"),
        updated_at: row?.updated_at || row?.reviewed_at || row?.created_at,
      };
    });
    const announcementUpdates = announcements.map((row) => ({ display_name: row?.title || "Intramural announcement", sport_name: "Announcement", public_status: row?.detail || row?.message || "New Intramural update", updated_at: row?.created_at || row?.timestamp }));
    const facilitatorDecisionUpdates = notifications
      .filter((row) => {
        const isEntryDecision = String(row?.event_type || "").toUpperCase().startsWith("TEAM_REGISTRATION_");
        const notificationTournamentId = Number(row?.tournament_id || row?.metadata?.tournament_id || row?.metadata_json?.tournament_id || 0);
        return isEntryDecision && (!notificationTournamentId || notificationTournamentId === Number(tournament?.id || 0));
      })
      .map((row) => {
        const eventType = String(row?.event_type || "").toUpperCase();
        const approved = eventType === "TEAM_REGISTRATION_APPROVED";
        return {
          display_name: row?.title || (approved ? "Entry approved" : eventType === "TEAM_REGISTRATION_REJECTED" ? "Entry rejected" : "Entry needs changes"),
          sport_name: "Facilitator review",
          public_status: row?.message || row?.body || "Your submitted entry was reviewed.",
          updated_at: row?.created_at || row?.timestamp,
          href: approved ? "/coach/teams-and-players" : "/coach/player-applications",
          actionLabel: approved ? "Review entry" : "Review and update entry",
        };
      });
    return [...facilitatorDecisionUpdates, ...applicationUpdates, ...announcementUpdates, ...ownedEntries].sort((left, right) => new Date(right?.updated_at || 0).getTime() - new Date(left?.updated_at || 0).getTime());
  }, [announcements, applications, notifications, ownedEntries, tournament?.id]);
  return <div className="space-y-6"><CoachOperationsHero entries={ownedEntries} applications={pendingApplications} tournament={tournament} sports={sports} assignedTargets={assignedTargets} /><div className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,13fr)_minmax(320px,7fr)]"><CoachRosterList entries={ownedEntries} applications={pendingApplications} onSelectPlayer={onSelectPlayer} /><CoachRecruitmentActivity applications={pendingApplications} entries={activityEntries} /></div><CoachReadiness entries={ownedEntries} applications={pendingApplications} assignedTargets={assignedTargets} /></div>;
};

export default CoachOperationsDashboard;
