import { createElement, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, CheckCircle2, ClipboardCheck, Megaphone, Search, ShieldCheck, UserCheck, Users, XCircle } from "lucide-react";
import { DepartmentLogo } from "../../../common/IdentityImage";

const surface = "!rounded-none !border-0 !bg-none !p-0 !shadow-none";
const statusOf = (entry) => String(entry?.public_status || entry?.status || "APPROVED").toUpperCase();
const coachOf = (entry) => entry?.coach?.display_name || entry?.coach_name || "";
const sportEventLabel = (sport, event) => {
  const sportLabel = String(sport || "Sport").trim();
  const eventLabel = String(event || "").trim();
  if (!eventLabel) return sportLabel;
  const sportWords = sportLabel.toLowerCase().split(/\s+/);
  const eventWords = eventLabel.toLowerCase().split(/\s+/);
  if (eventLabel.toLowerCase().startsWith(sportLabel.toLowerCase())) return eventLabel;
  if (sportWords.includes(eventWords[0]) && sportWords.length >= eventWords.length) return sportLabel;
  return `${sportLabel} ${eventLabel}`;
};

const formatDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";
};

const groupDepartmentSports = (entries, coachTargets) => {
  const groups = new Map();
  const groupKey = (row, shape) => `${row.sport_id || row.sport_name || row.sport || "sport"}-${row.tournament_sport_event_id || row.event_key || row.event_name || "default"}-${shape}`;
  for (const target of coachTargets) {
    const sportName = target.sport_name || target.sport || "Sport";
    const eventName = target.event_name || "";
    const shape = String(target.participant_shape || (target.target_type === "ENTRY_POOL" ? "SOLO" : "TEAM")).toUpperCase();
    const key = groupKey(target, shape);
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        sportId: target.sport_id,
        sportName,
        eventName,
        shape,
        entries: [],
        players: 0,
        approved: 0,
        target,
      });
    }
  }
  for (const entry of entries) {
    const sportName = entry.sport_name || entry.sport || "Sport";
    const eventName = entry.event_name || "";
    const shape = String(entry.participant_shape || "TEAM").toUpperCase();
    const key = groupKey(entry, shape);
    if (!groups.has(key)) groups.set(key, { key, sportId: entry.sport_id, sportName, eventName, shape, entries: [], players: 0, approved: 0 });
    const group = groups.get(key);
    group.entries.push(entry);
    group.players += Array.isArray(entry.members) ? entry.members.length : Number(entry.player_count || 0);
    if (/APPROVED|ACCEPTED|READY/.test(statusOf(entry))) group.approved += 1;
  }
  for (const group of groups.values()) {
    const target = group.target || coachTargets.find((row) => Number(row?.sport_id) === Number(group.sportId) && (!row?.participant_shape || String(row.participant_shape).toUpperCase() === group.shape))
      || coachTargets.find((row) => Number(row?.sport_id) === Number(group.sportId));
    group.coach = group.entries.map(coachOf).find(Boolean) || target?.current_coach?.display_name || target?.current_coach?.name || target?.coach_name || "";
    group.targetPlayers = group.entries.reduce((sum, row) => sum + Number(row.max_players || row.roster_limit || 0), 0);
    group.issues = [];
    if (!group.coach) group.issues.push("Coach missing");
    if (group.entries.length === 0 && !target?.target_id) {
      group.issues.push(group.shape === "TEAM" ? "Team setup not started" : "Entry pool not created");
    }
    const progressStatus = String(target?.progress_status || "").trim().toUpperCase();
    const hasSubmittedEntry = group.entries.length > 0
      || ["SUBMITTED_FOR_REVIEW", "APPROVED", "CLOSED"].includes(progressStatus);
    if (target?.target_id && !hasSubmittedEntry) {
      group.issues.push("Entry not submitted");
    }
    if (group.approved < group.entries.length) group.issues.push("Entry approval pending");
    if (group.targetPlayers > 0 && group.players < group.targetPlayers) group.issues.push(`Needs ${group.targetPlayers - group.players} players`);
    group.displayName = group.entries[0]?.display_name || target?.target_name || (group.shape === "TEAM" ? "Team entry" : `${group.shape} entries`);
    group.sportName = sportEventLabel(group.sportName, group.eventName);
    group.eventName = "";
    group.ready = group.issues.length === 0;
  }
  return [...groups.values()].sort((a, b) => Number(a.ready) - Number(b.ready) || a.sportName.localeCompare(b.sportName));
};

const DepartmentMetric = ({ value, label, attention = false }) => <div className="px-4 py-3 first:pl-0"><p className={`text-xl font-black tabular-nums ${attention ? "text-amber-300" : "text-white"}`}>{value}</p><p className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p></div>;

export const DepartmentOperationsHero = ({ groups, entries, coachTargets, tournament }) => {
  const first = entries[0] || {};
  const department = [first, ...(coachTargets || [])].find((row) => String(row?.department_name || "").trim()) || first;
  const departmentName = department.department_name || department.department_code || "Department";
  const departmentCode = department.department_code || departmentName
    .split(/\s+/)
    .filter((word) => !["OF", "AND", "THE"].includes(word.toUpperCase()))
    .map((word) => word[0])
    .join("")
    .slice(0, 5)
    .toUpperCase();
  const ready = groups.filter((group) => group.ready).length;
  const players = entries.reduce((sum, entry) => sum + (entry.members?.length || Number(entry.player_count || 0)), 0);
  const tournamentName = tournament?.tournament_name || tournament?.name || "Selected Intramural";
  const start = formatDate(tournament?.start_date || tournament?.date_start);
  const end = formatDate(tournament?.end_date || tournament?.date_end);
  return <section className="relative overflow-hidden rounded-3xl border border-blue-400/15 bg-[radial-gradient(circle_at_86%_20%,rgba(37,99,235,.22),transparent_32%),linear-gradient(135deg,#111827,#0b1220_60%,#08101d)] p-6 shadow-[0_24px_70px_rgba(2,6,23,.24)] md:p-8"><div className="relative grid items-center gap-7 lg:grid-cols-[minmax(0,1fr)_220px]"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-300"><span>{tournamentName}</span>{start || end ? <><span className="text-blue-300/50">•</span><span>{start}{start && end ? " – " : ""}{end}</span></> : null}</div><h2 className="mt-3 max-w-4xl break-words text-3xl font-black tracking-tight text-white sm:text-4xl">{departmentName}</h2><p className="mt-2 text-sm font-extrabold tracking-wide text-slate-300">{departmentCode}</p><p className="mt-4 text-sm text-slate-400">Department participation, entry readiness, rosters, and coach coverage across registered sports.</p><div className="mt-7 grid divide-y divide-white/10 border-t border-white/10 sm:grid-cols-4 sm:divide-x sm:divide-y-0"><DepartmentMetric value={groups.length} label="Sports" /><DepartmentMetric value={ready} label="Ready" /><DepartmentMetric value={players} label="Players" /><DepartmentMetric value={groups.length - ready} label="Need Attention" attention={groups.length > ready} /></div></div><div className="mx-auto grid h-44 w-44 place-items-center rounded-[2.25rem] border border-blue-300/15 bg-gradient-to-br from-blue-400/15 to-indigo-500/5 shadow-[0_0_80px_rgba(59,130,246,.18)] lg:h-52 lg:w-52"><DepartmentLogo imageUrl={department.department_logo_url || department.logo_url} label={departmentCode} scale="xl" className="!h-28 !w-28 rounded-[1.75rem] border-blue-300/20 text-2xl shadow-2xl lg:!h-32 lg:!w-32" /></div></div></section>;
};

const TypeTag = ({ shape }) => <span className="rounded-md bg-[var(--surface-muted)] px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide text-[var(--text-soft)]">{shape}</span>;

export const DepartmentSportsList = ({ groups, onSelect }) => {
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const visible = groups.filter((group) => (filter === "READY" ? group.ready : filter === "ATTENTION" ? !group.ready : true) && (!search.trim() || `${group.sportName} ${group.eventName} ${group.entries.map((entry) => entry.display_name).join(" ")}`.toLowerCase().includes(search.trim().toLowerCase()))).slice(0, 5);
  const attention = groups.filter((group) => !group.ready).length;
  return <section className={`${surface} min-w-0 p-5`}><div className="flex items-center justify-between gap-3"><h3 className="text-base font-extrabold">Sports & Entries</h3><Link to="/department/teams" className="inline-flex items-center gap-1 text-xs font-bold text-[var(--primary)] hover:underline">Manage Teams & Entries <ArrowRight size={13} /></Link></div><div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between"><div className="flex flex-wrap gap-1.5">{[["ALL",`All ${groups.length}`],["ATTENTION",`Need Attention ${attention}`],["READY",`Ready ${groups.length-attention}`]].map(([value,label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${filter === value ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-muted)] text-[var(--text-muted)]"}`}>{label}</button>)}</div>{groups.length >= 6 ? <label className="relative block xl:w-52"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-soft)]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search sports" className="min-h-10 w-full rounded-xl border border-[var(--border-soft)] bg-transparent pl-9 pr-3 text-sm" /></label> : null}</div><div className="mt-4 overflow-hidden rounded-xl border border-[var(--border-soft)]">{visible.length ? visible.map((group) => <button key={group.key} type="button" onClick={() => onSelect(group)} className={`grid w-full min-w-0 gap-2 border-b border-[var(--border-soft)] px-3 py-3 text-left last:border-0 hover:bg-[var(--surface-soft)] sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_95px_minmax(100px,.8fr)_auto] sm:items-center ${group.ready ? "" : "bg-amber-400/[.025]"}`}><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="break-words text-sm font-bold">{group.sportName}{group.eventName ? ` ${group.eventName}` : ""}</p><TypeTag shape={group.shape} /></div><p className="mt-0.5 break-words text-xs text-[var(--text-soft)]">{group.displayName}</p></div><p className="text-xs text-[var(--text-muted)]">{group.shape === "TEAM" && group.targetPlayers ? `${group.players}/${group.targetPlayers} players` : `${group.players} players`}</p><p className={`text-xs font-bold ${group.coach ? "text-[var(--text-muted)]" : "text-amber-300"}`}>{group.coach || "Unassigned"}</p><p className={`text-xs font-bold ${group.ready ? "text-emerald-300" : "text-amber-300"}`}>{group.ready ? "Ready" : group.issues[0]}</p><ArrowRight size={15} className="text-[var(--text-soft)]" /></button>) : <div className="grid min-h-36 place-items-center p-5 text-center"><div><ClipboardCheck className="mx-auto text-[var(--text-soft)]" size={26} /><p className="mt-3 font-bold">No sports found</p><p className="mt-1 text-sm text-[var(--text-muted)]">Sports assigned to your department will appear here.</p></div></div>}</div></section>;
};

export const DepartmentActivityPanel = ({ groups, announcements }) => {
  const [tab, setTab] = useState("updates");
  const updates = groups.filter((group) => !group.ready).slice(0, 6).map((group) => ({ icon: group.coach ? Users : UserCheck, title: `${group.sportName}${group.eventName ? ` ${group.eventName}` : ""}`, detail: group.issues.join(" · ") }));
  return <aside className={`${surface} min-w-0 p-5`}><div className="flex items-center justify-between gap-3"><h3 className="text-base font-extrabold">Department Activity</h3><Link to="/department/announcements" className="text-xs font-bold text-[var(--primary)] hover:underline">View all</Link></div><div className="mt-4 grid grid-cols-2 rounded-xl bg-[var(--surface-muted)] p-1">{[["updates","Updates"],["announcements","Announcements"]].map(([value,label]) => <button key={value} type="button" onClick={() => setTab(value)} className={`rounded-lg px-3 py-2 text-xs font-bold ${tab === value ? "bg-[var(--surface)] shadow-sm" : "text-[var(--text-muted)]"}`}>{label}</button>)}</div><div className="mt-4 max-h-[430px] space-y-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{tab === "updates" ? updates.length ? updates.map(({ icon: Icon, title, detail }) => <div key={`${title}-${detail}`} className="flex gap-3 rounded-xl p-3 hover:bg-[var(--surface-soft)]"><span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-400/10 text-amber-300">{createElement(Icon, { size: 15 })}</span><div><p className="text-sm font-bold">{title}</p><p className="mt-1 text-xs text-[var(--text-muted)]">{detail}</p></div></div>) : <div className="grid min-h-36 place-items-center text-center"><div><CheckCircle2 className="mx-auto text-emerald-400" size={27} /><p className="mt-3 font-bold">{groups.length ? "Department is on track" : "No recent department activity"}</p><p className="mt-1 text-sm text-[var(--text-muted)]">{groups.length ? "No current sport requires action." : "Updates will appear as teams, entries, and rosters change."}</p></div></div> : announcements.length ? announcements.map((item, index) => <div key={item.id || index} className="flex gap-3 rounded-xl p-3 hover:bg-[var(--surface-soft)]"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-500/10 text-blue-300"><Megaphone size={15} /></span><div><p className="text-sm font-bold">{item.title || item.message || item.label || "Announcement"}</p><p className="mt-1 text-xs text-[var(--text-muted)]">{item.time || item.date || "Intramural notice"}</p></div></div>) : <div className="grid min-h-36 place-items-center text-center"><div><Megaphone className="mx-auto text-[var(--text-soft)]" size={26} /><p className="mt-3 font-bold">No announcements</p><p className="mt-1 text-sm text-[var(--text-muted)]">Department notices will appear here.</p></div></div>}</div></aside>;
};

export const DepartmentReadiness = ({ groups }) => {
  const entries = groups.reduce((sum, group) => sum + group.entries.length, 0);
  const approved = groups.reduce((sum, group) => sum + group.approved, 0);
  const players = groups.reduce((sum, group) => sum + group.players, 0);
  const targetPlayers = groups.reduce((sum, group) => sum + group.targetPlayers, 0);
  const rows = [["Coaches", groups.filter((group) => group.coach).length, groups.length],["Entries", approved, entries],["Rosters", groups.filter((group) => !group.issues.some((issue) => /players/i.test(issue))).length, groups.length],["Eligibility", players, Math.max(players, targetPlayers)]];
  const issues = groups.length ? groups.filter((group) => !group.ready).length : 1;
  return <section className="bg-transparent p-0"><div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--text-soft)]">Department Readiness</p><div className="mt-3 grid gap-x-8 gap-y-3 sm:grid-cols-2 xl:grid-cols-4">{rows.map(([label,value,total]) => { const ready = total > 0 && value >= total; return <div key={label} className="flex min-w-40 items-center justify-between gap-4"><div><p className="text-xs text-[var(--text-muted)]">{label}</p><p className="mt-0.5 text-sm font-black tabular-nums">{value} / {total}</p></div>{ready ? <Check className="text-emerald-400" size={17} /> : <XCircle className="text-amber-300" size={17} />}</div>; })}</div></div><div className="flex items-center gap-4 xl:border-l xl:border-[var(--border-soft)] xl:pl-6"><div><p className={`text-sm font-black ${issues ? "text-amber-300" : "text-emerald-300"}`}>{groups.length === 0 ? "No sports configured" : issues ? `${issues} sport${issues === 1 ? "" : "s"} need attention` : "Department ready for competition"}</p><p className="mt-1 text-xs text-[var(--text-muted)]">{groups.length === 0 ? "Sports will appear once Intramural configuration is complete." : issues ? "Resolve incomplete participation requirements." : "All current requirements are complete."}</p></div>{issues && groups.length ? <Link to="/department/teams" className="whitespace-nowrap text-xs font-bold text-[var(--primary)] hover:underline">Review issues →</Link> : null}</div></div></section>;
};

const DepartmentOperationsDashboard = ({ entries, coachTargets, tournament, announcements, onSelectSport }) => {
  const groups = useMemo(() => groupDepartmentSports(entries, coachTargets), [coachTargets, entries]);
  return <div className="space-y-6"><DepartmentOperationsHero groups={groups} entries={entries} coachTargets={coachTargets} tournament={tournament} /><div className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,13fr)_minmax(320px,7fr)]"><DepartmentSportsList groups={groups} onSelect={onSelectSport} /><DepartmentActivityPanel groups={groups} announcements={announcements} /></div><DepartmentReadiness groups={groups} /></div>;
};

export default DepartmentOperationsDashboard;
