import { createElement, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, Bell, CalendarCheck, Check, CheckCircle2, ChevronDown, Clock3,
  Megaphone, Search, Trophy, UserCheck, Users, XCircle,
} from "lucide-react";
import { SportIcon, TeamLogo } from "../../../common/IdentityImage";
import { approvalMemberCount } from "./facilitatorOperationsUtils";
import { getSportDisplayName } from "../../../../utils/tournamentEventCategories";

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const normalizeStatus = (row) => String(row?.status || row?.application_status || row?.public_status || "APPROVED").trim().toUpperCase();
const isPendingStatus = (status) => /PENDING|REVIEW|SUBMITTED/.test(status);
const isApprovedStatus = (status) => /APPROVED|ACCEPTED|READY/.test(status);
const eventIdOf = (row) => Number(row?.tournament_sport_event_id || row?.event_id || 0);
const eventNameOf = (row) => row?.event_name || "Configured event";

export const StatusPill = ({ status }) => {
  const value = String(status || "Ready");
  const key = value.toUpperCase();
  const tone = /PENDING|REVIEW|ATTENTION|INCOMPLETE/.test(key)
    ? "border-amber-400/25 bg-amber-400/10 text-amber-300"
    : /REJECT|MISSING|CANCEL/.test(key)
      ? "border-rose-400/25 bg-rose-400/10 text-rose-300"
      : "border-emerald-400/25 bg-emerald-400/10 text-emerald-300";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${tone}`}>{value}</span>;
};

export const OperationsStatInline = ({ label, value, attention = false }) => (
  <div className="min-w-0 px-4 py-3 first:pl-0">
    <p className={`text-xl font-extrabold tabular-nums ${attention ? "text-amber-300" : "text-white"}`}>{value}</p>
    <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-soft)]">{label}</p>
  </div>
);

export const SportOperationsHero = ({ sports, tournament, totals }) => {
  const primary = sports[0] || null;
  const sportName = primary?.name || primary?.sport_name || "Assigned Sport";
  const tournamentName = tournament?.tournament_name || tournament?.name || "Selected Intramural";
  const start = formatDate(tournament?.start_date || tournament?.date_start);
  const end = formatDate(tournament?.end_date || tournament?.date_end);
  const dateRange = start && end ? `${start} – ${end}` : start || end || "Dates to be announced";
  const readiness = totals.pending > 0 || totals.officialsAssigned < totals.officialsRequired
    ? "Needs Attention"
    : totals.total > 0 ? "Ready" : "In Preparation";

  return <section className="relative overflow-hidden rounded-3xl border border-blue-400/15 bg-[radial-gradient(circle_at_85%_20%,rgba(37,99,235,.24),transparent_32%),linear-gradient(135deg,#111827,#0b1220_60%,#08101d)] p-6 shadow-[0_24px_70px_rgba(2,6,23,.24)] md:p-8">
    <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full border border-blue-400/10 bg-blue-500/5 blur-sm" />
    <div className="relative grid items-center gap-7 lg:grid-cols-[minmax(0,1fr)_220px]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2"><StatusPill status={readiness} />{sports.slice(1).map((sport) => <span key={sport.id} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-300">{getSportDisplayName(sport)}</span>)}</div>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-blue-300">{tournamentName}</p>
        <h2 className="mt-2 break-words text-3xl font-black tracking-tight text-white sm:text-4xl">{sportName}</h2>
        <p className="mt-2 text-sm text-slate-300">{dateRange}</p>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400">{primary?.description || `${primary?.category || "Intramural sport"} operations, entry readiness, and staff coordination.`}</p>
        <div className="mt-7 grid divide-y divide-white/10 border-t border-white/10 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          <OperationsStatInline label="Total Entries" value={totals.total} />
          <OperationsStatInline label="Approved" value={totals.approved} />
          <OperationsStatInline label="Event/s" value={totals.events} />
          <OperationsStatInline label="Officials" value={`${totals.officialsAssigned}/${totals.officialsRequired}`} attention={totals.officialsAssigned < totals.officialsRequired} />
        </div>
      </div>
      <div className="mx-auto grid h-44 w-44 place-items-center rounded-[2.25rem] border border-blue-300/15 bg-gradient-to-br from-blue-400/15 to-indigo-500/5 shadow-[0_0_80px_rgba(59,130,246,.18)] lg:h-52 lg:w-52">
        <SportIcon imageUrl={primary?.image_url || primary?.logo_url} label={sportName} scale="xl" className="!h-28 !w-28 rounded-[1.75rem] border-blue-300/20 shadow-2xl lg:!h-32 lg:!w-32" />
      </div>
    </div>
  </section>;
};

const DashboardSectionHeader = ({ title, action }) => <div className="flex items-center justify-between gap-3"><h3 className="text-base font-extrabold text-[var(--text-main)]">{title}</h3>{action}</div>;

const APPROVAL_FILTERS = [
  ["PENDING_REVIEW", "Needs Review"],
  ["APPROVED", "Approved"],
  ["INCOMPLETE", "Needs Changes"],
  ["REJECTED", "Rejected"],
  ["ALL", "All"],
];

const matchesApprovalFilter = (status, filter) => {
  if (filter === "ALL") return true;
  if (filter === "PENDING_REVIEW") return isPendingStatus(status);
  if (filter === "APPROVED") return isApprovedStatus(status);
  if (filter === "INCOMPLETE") return /INCOMPLETE|RETURNED|CHANGES/.test(status);
  if (filter === "REJECTED") return /REJECT/.test(status);
  return false;
};

export const EntriesApprovalTable = ({ entries, sports }) => {
  const [filter, setFilter] = useState("PENDING_REVIEW");
  const [eventFilter, setEventFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const sportById = useMemo(() => new Map(sports.map((sport) => [Number(sport?.id || sport?.sport_id), sport])), [sports]);
  const eventOptions = useMemo(() => {
    const byId = new Map();
    entries.forEach((row) => {
      const id = eventIdOf(row);
      if (!id || byId.has(id)) return;
      byId.set(id, {
        id,
        name: eventNameOf(row),
        sportId: Number(row?.sport_id || 0),
        pending: 0,
      });
    });
    entries.forEach((row) => {
      const option = byId.get(eventIdOf(row));
      if (option && isPendingStatus(normalizeStatus(row))) option.pending += 1;
    });
    return [...byId.values()].sort((left, right) => left.name.localeCompare(right.name));
  }, [entries]);
  const rows = useMemo(() => {
    return entries.filter((row) => {
      const status = normalizeStatus(row);
      if (!matchesApprovalFilter(status, filter)) return false;
      if (eventFilter !== "ALL" && eventIdOf(row) !== Number(eventFilter)) return false;
      const needle = search.trim().toLowerCase();
      const haystack = [row.display_name, row.entry_name, row.team_name, row.name, row.event_name, row.department_name, row.department_code].filter(Boolean).join(" ").toLowerCase();
      return !needle || haystack.includes(needle);
    }).slice(0, 7);
  }, [entries, eventFilter, filter, search]);

  return <section className="min-w-0">
    <DashboardSectionHeader title="Entries & Approvals" action={<Link to="/sport-facilitator/teams-and-players" className="inline-flex items-center gap-1 text-xs font-bold text-[var(--primary)] hover:underline">Manage Entries <ArrowRight size={13} /></Link>} />
    <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex min-w-0 flex-wrap gap-2">
        <label className="sr-only" htmlFor="facilitator-entry-status">Entry status</label>
        <select id="facilitator-entry-status" value={filter} onChange={(event) => setFilter(event.target.value)} className="min-h-10 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--text-main)]">
          {APPROVAL_FILTERS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        {eventOptions.length >= 2 ? <details className="group relative">
          <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--text-main)] [&::-webkit-details-marker]:hidden">
            {eventFilter === "ALL" ? "All events" : eventOptions.find((option) => option.id === Number(eventFilter))?.name || "Event"}<ChevronDown size={15} className="text-[var(--text-soft)] transition group-open:rotate-180" />
          </summary>
          <div className="absolute left-0 z-20 mt-2 min-w-72 overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-1 shadow-xl">
            <button type="button" onClick={() => setEventFilter("ALL")} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--surface-soft)]"><span>All events</span><span className="text-xs text-[var(--text-soft)]">{entries.length}</span></button>
            {eventOptions.map((option) => { const sport = sportById.get(option.sportId); return <button key={option.id} type="button" onClick={() => setEventFilter(String(option.id))} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-[var(--surface-soft)]">
              <SportIcon imageUrl={sport?.image_url || sport?.logo_url} label={option.name} scale="sm" className="shrink-0" />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{option.name}</span>
              {option.pending > 0 ? <span className="grid min-w-5 place-items-center rounded-full bg-[var(--primary)] px-1.5 py-0.5 text-[10px] font-bold text-white" aria-label={`${option.pending} entries need review`}>{option.pending}</span> : null}
            </button>; })}
          </div>
        </details> : null}
      </div>
      {entries.length >= 6 ? <label className="relative block min-w-0 xl:w-52"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-soft)]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search entries" className="min-h-10 w-full rounded-xl border border-[var(--border-soft)] bg-transparent pl-9 pr-3 text-sm" /></label> : null}
    </div>
    <div className="mt-4 overflow-hidden rounded-xl border border-[var(--border-soft)]">
      {rows.length ? rows.map((row) => { const name = row.display_name || row.entry_name || row.team_name || row.name || "Unnamed entry"; const status = normalizeStatus(row); return <div key={row.id} className="grid min-w-0 gap-2 border-b border-[var(--border-soft)] px-3 py-3 last:border-0 hover:bg-[var(--surface-soft)] sm:grid-cols-[minmax(0,1.5fr)_minmax(100px,.8fr)_90px_auto] sm:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <TeamLogo imageUrl={row.imageUrl || row.logo_url || row.entry_logo_url} label={name} scale="md" className="shrink-0" />
          <div className="min-w-0"><p className="break-words text-sm font-bold">{name}</p><p className="mt-0.5 text-xs text-[var(--text-soft)]">{eventNameOf(row)} · {getSportDisplayName(row, row.sport || row.meta || "Assigned sport")}</p></div>
        </div>
        <p className="text-xs text-[var(--text-muted)]">{row.department_code || row.department_name || row.department || "—"}</p>
        <div><p className="text-xs font-semibold text-[var(--text-muted)]">{approvalMemberCount(row)} members</p><StatusPill status={status.replaceAll("_", " ")} /></div>
        <Link to={isPendingStatus(status) ? "/sport-facilitator/teams-and-players?status=PENDING_REVIEW" : "/sport-facilitator/teams-and-players"} className="justify-self-start rounded-lg border border-[var(--border-soft)] px-2.5 py-1.5 text-xs font-bold text-[var(--primary)] sm:justify-self-end">{isPendingStatus(status) ? "Review" : "View"}</Link>
      </div>; }) : <div className="grid min-h-36 place-items-center p-5 text-center"><div><CheckCircle2 className="mx-auto text-emerald-400" size={26} /><p className="mt-2 font-bold">No matching entries</p><p className="mt-1 text-sm text-[var(--text-muted)]">Try another status or event filter.</p></div></div>}
    </div>
  </section>;
};

export const ActivityUpdatesPanel = ({ announcements, totals, hasSchedule, hasBracket }) => {
  const [tab, setTab] = useState("updates");
  const updates = [
    !hasBracket ? { icon: Trophy, text: "Bracket preparation is pending", tone: "text-amber-300", priority: 1 } : { icon: Trophy, text: "Competition bracket is ready", tone: "text-emerald-300", priority: 5 },
    totals.officialsAssigned < totals.officialsRequired ? { icon: UserCheck, text: `${totals.officialsAssigned}/${totals.officialsRequired} officials assigned`, tone: "text-amber-300", priority: 1 } : { icon: UserCheck, text: `${totals.officialsAssigned}/${totals.officialsRequired} officials assigned`, tone: "text-emerald-300", priority: 5 },
    totals.pending > 0 ? { icon: Clock3, text: `${totals.pending} entries need review`, tone: "text-amber-300", priority: 2 } : { icon: CheckCircle2, text: "Entry review queue is clear", tone: "text-emerald-300", priority: 5 },
    !hasSchedule ? { icon: CalendarCheck, text: "Schedule has not been published", tone: "text-slate-400", priority: 3 } : { icon: CalendarCheck, text: "Match schedule is published", tone: "text-emerald-300", priority: 5 },
  ].sort((left, right) => left.priority - right.priority);
  return <aside className="min-w-0">
    <DashboardSectionHeader title="Activity & Updates" action={<Link to="/sport-facilitator/announcements" className="text-xs font-bold text-[var(--primary)] hover:underline">View all announcements</Link>} />
    <div className="mt-4 grid grid-cols-2 rounded-xl bg-[var(--surface-muted)] p-1">{[["updates","Updates"],["announcements","Announcements"]].map(([value,label]) => <button key={value} type="button" onClick={() => setTab(value)} className={`rounded-lg px-3 py-2 text-xs font-bold ${tab === value ? "bg-[var(--surface)] text-[var(--text-main)] shadow-sm" : "text-[var(--text-muted)]"}`}>{label}</button>)}</div>
    <div className="mt-4 max-h-[390px] space-y-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tab === "updates" ? updates.map(({ icon: UpdateIcon, text, tone }) => <div key={text} className="flex gap-3 rounded-xl p-3 hover:bg-[var(--surface-soft)]"><span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--surface-muted)] ${tone}`}>{createElement(UpdateIcon, { size: 16 })}</span><div><p className="text-sm font-semibold">{text}</p><p className="mt-1 text-xs text-[var(--text-soft)]">Current Intramural status</p></div></div>) : announcements.length ? announcements.map((item, index) => <div key={item.id || index} className="flex gap-3 rounded-xl p-3 hover:bg-[var(--surface-soft)]"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-500/10 text-blue-300"><Megaphone size={15} /></span><div className="min-w-0"><p className="break-words text-sm font-semibold">{item.title || item.label || item.message || "Announcement"}</p><p className="mt-1 text-xs text-[var(--text-soft)]">{item.time || item.date || "Intramural update"}</p></div></div>) : <div className="grid min-h-36 place-items-center text-center"><div><Bell className="mx-auto text-[var(--text-soft)]" size={26} /><p className="mt-3 font-bold">No announcements yet</p><p className="mt-1 text-sm text-[var(--text-muted)]">Operational updates remain available in the Updates tab.</p></div></div>}
    </div>
  </aside>;
};

export const StaffOfficialsCard = ({ staffRows, required }) => <section className="min-w-0"><DashboardSectionHeader title="Staff & Officials" action={<Link to="/sport-facilitator/assigned-staff" className="inline-flex items-center gap-1 text-xs font-bold text-[var(--primary)] hover:underline">Manage staff <ArrowRight size={13} /></Link>} /><div className="mt-5 grid gap-2">{staffRows.length ? staffRows.slice(0, 5).map((row, index) => <div key={row.id || index} className="flex items-center justify-between gap-3 rounded-xl bg-[var(--surface-soft)] px-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-bold">{row.name || row.display_name || `Official ${index + 1}`}</p><p className="text-xs text-[var(--text-soft)]">{row.role || row.position || "Match official"}</p></div><StatusPill status={row.status || "Assigned"} /></div>) : <div className="rounded-xl border border-dashed border-[var(--border-soft)] p-6 text-center"><Users className="mx-auto text-[var(--text-soft)]" size={24} /><p className="mt-2 font-bold">No officials assigned</p><p className="mt-1 text-sm text-[var(--text-muted)]">Assign staff before match-day operations begin.</p></div>}</div><p className="mt-4 text-xs font-semibold text-[var(--text-muted)]">{staffRows.length}/{required} operational positions covered</p></section>;

export const EventReadinessCard = ({ totals, hasVenue, hasBracket, hasSchedule }) => {
  const rows = [
    ["Entries", `${totals.approved}/${totals.total} approved`, totals.total > 0 && totals.pending === 0],
    ["Officials", `${totals.officialsAssigned}/${totals.officialsRequired} assigned`, totals.officialsAssigned >= totals.officialsRequired],
    ["Venue", hasVenue ? "Ready" : "Not assigned", hasVenue],
    ["Bracket", hasBracket ? "Generated" : "Pending", hasBracket],
    ["Schedule", hasSchedule ? "Published" : "Pending", hasSchedule],
  ];
  const attention = rows.filter((row) => !row[2]).length;
  return <section className="min-w-0"><DashboardSectionHeader title="Event Readiness" /><div className="mt-5 divide-y divide-[var(--border-soft)]">{rows.map(([label,value,ready]) => <div key={label} className="flex items-center justify-between gap-3 py-3"><div className="flex items-center gap-2.5">{ready ? <Check className="text-emerald-400" size={17} /> : <XCircle className="text-amber-300" size={17} />}<span className="text-sm font-semibold">{label}</span></div><span className={`text-xs font-bold ${ready ? "text-emerald-300" : "text-amber-300"}`}>{value}</span></div>)}</div><div className={`mt-4 rounded-xl px-4 py-3 text-sm font-bold ${attention ? "bg-amber-400/10 text-amber-200" : "bg-emerald-400/10 text-emerald-200"}`}>{attention ? `${attention} item${attention === 1 ? "" : "s"} need attention` : "Competition ready for match day"}</div></section>;
};

const FacilitatorOperationsDashboard = ({ sports, tournament, entries, staffRows, announcements, events, brackets }) => {
  const approved = entries.filter((row) => isApprovedStatus(normalizeStatus(row))).length;
  const pending = entries.filter((row) => isPendingStatus(normalizeStatus(row))).length;
  const configuredEventCount = new Set(entries.map(eventIdOf).filter(Boolean)).size;
  const officialsRequired = Math.max(Number(tournament?.required_officials || 0), staffRows.length ? staffRows.length : 1);
  const totals = { total: entries.length, approved, pending, events: configuredEventCount, officialsAssigned: staffRows.length, officialsRequired };
  const hasSchedule = events.length > 0;
  const hasBracket = brackets.length > 0;
  const hasVenue = events.some((event) => event?.venue_id || event?.venue || event?.venue_name);
  return <div className="space-y-6"><SportOperationsHero sports={sports} tournament={tournament} totals={totals} /><div className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(320px,2fr)]"><EntriesApprovalTable entries={entries} sports={sports} /><ActivityUpdatesPanel announcements={announcements} totals={totals} hasSchedule={hasSchedule} hasBracket={hasBracket} /></div><div className="grid items-start gap-5 lg:grid-cols-2"><StaffOfficialsCard staffRows={staffRows} required={officialsRequired} /><EventReadinessCard totals={totals} hasVenue={hasVenue} hasBracket={hasBracket} hasSchedule={hasSchedule} /></div></div>;
};

export default FacilitatorOperationsDashboard;
