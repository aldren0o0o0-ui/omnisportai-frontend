import { createElement, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Clock3, Megaphone, Search, Trophy, Users } from "lucide-react";
import ParticipantDrawer from "../../../directory/ParticipantDrawer";
import { SportIcon } from "../../../common/IdentityImage";

const MAX_SLOTS = 2;
const releasedStatuses = new Set(["DRAFT", "REJECTED", "WITHDRAWN", "CANCELLED", "CANCELED", "ELIMINATED_AFTER_TRYOUT"]);
const confirmedStatuses = new Set(["ACCEPTED_AS_PLAYER", "APPROVED", "ACCEPTED", "CONFIRMED"]);
const normalizeStatus = (value) => String(value || "FOR_TRYOUT").trim().toUpperCase();
const usesParticipationSlot = (application) => !releasedStatuses.has(normalizeStatus(application?.application_status || application?.my_application_status || application?.status));
const displayStatus = (value) => ({ FOR_TRYOUT: "Waiting for Tryout", PENDING: "Pending Review", SUBMITTED: "Pending Review", ACCEPTED_AS_PLAYER: "Approved", APPROVED: "Approved", REJECTED: "Rejected", CANCELLED: "Cancelled", CANCELED: "Cancelled", WITHDRAWN: "Withdrawn" }[normalizeStatus(value)] || String(value || "Pending Review").replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()));
const formatDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";
};
const applicationShape = (application) => String(application?.participant_shape || application?.competition_type_label || (application?.sourceType === "POOL" ? "SOLO" : "TEAM")).toUpperCase().includes("DUO") ? "DUO" : String(application?.participant_shape || application?.competition_type_label || "").toUpperCase().includes("SOLO") ? "SOLO" : "TEAM";
const applicationName = (application) => application?.entry_name || application?.team_name || application?.pool_name || application?.name || "Competition entry";
const sportName = (application) => application?.sport_name || application?.sport_label || application?.sport || "Sport";
const participationSportKey = (application) => String(application?.sport_id || sportName(application)).trim().toLowerCase();
const countActiveSports = (applications) => new Set(
  applications.filter(usesParticipationSlot).map(participationSportKey).filter(Boolean)
).size;
const nextStep = (application) => {
  const status = normalizeStatus(application?.application_status || application?.my_application_status);
  if (confirmedStatuses.has(status)) return "View entry";
  if (status === "FOR_TRYOUT") return "Wait for tryout update";
  if (["PENDING", "SUBMITTED"].includes(status)) return "Wait for review";
  if (releasedStatuses.has(status)) return "Slot released";
  return "View details";
};

const toDrawerParticipant = (application) => ({
  entry_id: application.id,
  entry_name: applicationName(application),
  display_name: applicationName(application),
  participant_shape: applicationShape(application),
  sport_name: sportName(application),
  event_name: application.event_name || application.competition_type_label || null,
  department_name: application.department_name || application.department || "Your department",
  department_code: application.department_code,
  image_url: application.logo_url || application.image_url,
  public_status: displayStatus(application.application_status || application.my_application_status),
  coach: application.coach || (application.coach_name ? { display_name: application.coach_name } : null),
  members: [],
  capabilities: { can_edit_name: false, can_edit_logo: false },
});

export const ViewerParticipationHero = ({ tournament, applications }) => {
  const active = applications.filter(usesParticipationSlot);
  const activeSportCount = countActiveSports(applications);
  const confirmed = new Set(active.filter((row) => confirmedStatuses.has(normalizeStatus(row.application_status || row.my_application_status))).map(participationSportKey).filter(Boolean)).size;
  const awaiting = Math.max(0, activeSportCount - confirmed);
  const tournamentName = tournament?.tournament_name || tournament?.name || "Selected Intramural";
  const start = formatDate(tournament?.start_date || tournament?.date_start);
  const end = formatDate(tournament?.end_date || tournament?.date_end);
  const remaining = Math.max(0, MAX_SLOTS - activeSportCount);
  const message = activeSportCount >= MAX_SLOTS ? "Participation limit reached." : remaining === MAX_SLOTS ? "You can participate in 2 sports." : `${remaining} participation slot remaining.`;
  return <section className="relative overflow-hidden rounded-3xl border border-blue-400/15 bg-[radial-gradient(circle_at_86%_20%,rgba(37,99,235,.18),transparent_30%),linear-gradient(135deg,#111827,#0b1220_60%,#08101d)] p-6 shadow-[0_24px_70px_rgba(2,6,23,.2)] md:p-8"><div className="relative grid items-center gap-7 lg:grid-cols-[minmax(0,1fr)_180px]"><div><div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-300"><span>{tournamentName}</span>{start || end ? <><span className="text-blue-300/50">•</span><span>{start}{start && end ? " – " : ""}{end}</span></> : null}</div><h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">My Participation</h2><p className="mt-3 text-sm text-slate-400">Track your applications and registered competition entries.</p><div className="mt-7 grid divide-y divide-white/10 border-t border-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">{[["Sports Used",`${Math.min(activeSportCount, MAX_SLOTS)} / ${MAX_SLOTS}`],["Confirmed",confirmed],["Awaiting Decision",awaiting]].map(([label,value]) => <div key={label} className="px-4 py-3 first:pl-0"><p className="text-xl font-black text-white tabular-nums">{value}</p><p className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p></div>)}</div><p className={`mt-4 text-sm font-bold ${activeSportCount >= MAX_SLOTS ? "text-amber-300" : "text-emerald-300"}`}>{message}</p></div><div className="mx-auto grid h-36 w-36 place-items-center rounded-[2rem] border border-blue-300/15 bg-blue-400/10 text-blue-300 shadow-[0_0_70px_rgba(59,130,246,.14)]"><Trophy size={58} strokeWidth={1.4} /></div></div></section>;
};

export const ViewerApplicationsList = ({ applications, onSelect }) => {
  const [search, setSearch] = useState("");
  const visible = applications.filter((row) => !search.trim() || `${sportName(row)} ${applicationName(row)} ${displayStatus(row.application_status)}`.toLowerCase().includes(search.trim().toLowerCase()));
  const used = countActiveSports(applications);
  return <section className="min-w-0"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-base font-extrabold">My Applications & Entries</h3><p className="mt-1 text-xs text-[var(--text-muted)]">{Math.min(used, MAX_SLOTS)} / {MAX_SLOTS} participation slots used</p></div>{applications.length >= 6 ? <label className="relative block w-48"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-soft)]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search applications" className="min-h-10 w-full rounded-xl border border-[var(--border-soft)] bg-transparent pl-9 pr-3 text-sm" /></label> : null}</div><div className="mt-4 hidden grid-cols-[minmax(0,1.4fr)_70px_minmax(100px,.75fr)_125px_minmax(110px,.8fr)_15px] gap-3 px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-soft)] sm:grid"><span>Sport / Entry</span><span>Type</span><span>Coach</span><span>Status</span><span>Next</span><span /></div><div className="overflow-hidden rounded-xl border border-[var(--border-soft)]">{visible.length ? visible.map((application, index) => { const status = normalizeStatus(application.application_status || application.my_application_status); const active = usesParticipationSlot(application); return <button key={`${application.sourceType}-${application.id}-${index}`} type="button" onClick={() => onSelect(application)} className="grid w-full min-w-0 gap-3 border-b border-[var(--border-soft)] px-3 py-3 text-left last:border-0 hover:bg-[var(--surface-soft)] sm:grid-cols-[minmax(0,1.4fr)_70px_minmax(100px,.75fr)_125px_minmax(110px,.8fr)_auto] sm:items-center"><div className="min-w-0"><p className="break-words text-sm font-bold">{sportName(application)}</p><p className="mt-0.5 break-words text-xs text-[var(--text-soft)]">{applicationName(application)}</p></div><span className="w-fit rounded-md bg-[var(--surface-muted)] px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide text-[var(--text-soft)]">{applicationShape(application)}</span><p className="break-words text-xs text-[var(--text-muted)]">{application.coach?.display_name || application.coach_name || "Awaiting coach"}</p><p className={`text-xs font-bold ${confirmedStatuses.has(status) ? "text-emerald-400" : active ? "text-amber-300" : "text-[var(--text-muted)]"}`}>{displayStatus(status)}</p><p className="text-xs text-[var(--text-muted)]">{nextStep(application)}</p><ArrowRight size={15} className="text-[var(--text-soft)]" /></button>; }) : <div className="grid min-h-36 place-items-center p-5 text-center"><div><Users className="mx-auto text-[var(--text-soft)]" size={27} /><p className="mt-3 font-bold">No applications or entries yet</p><p className="mt-1 text-sm text-[var(--text-muted)]">Explore available opportunities to join your first sport.</p></div></div>}</div></section>;
};

export const ViewerUpdatesPanel = ({ applications, announcements }) => {
  const [tab, setTab] = useState("for-you");
  const updates = applications.slice(0, 6).map((row) => ({ title: `${sportName(row)} application ${displayStatus(row.application_status || row.my_application_status).toLowerCase()}`, detail: nextStep(row), active: usesParticipationSlot(row) }));
  return <aside className="min-w-0"><h3 className="text-base font-extrabold">For You</h3><div className="mt-4 grid grid-cols-2 rounded-xl bg-[var(--surface-muted)] p-1">{[["for-you","For You"],["announcements","Announcements"]].map(([value,label]) => <button key={value} type="button" onClick={() => setTab(value)} className={`rounded-lg px-3 py-2 text-xs font-bold ${tab === value ? "bg-[var(--surface)] shadow-sm" : "text-[var(--text-muted)]"}`}>{label}</button>)}</div><div className="mt-4 max-h-[430px] space-y-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{tab === "for-you" ? updates.length ? updates.map((item, index) => <div key={`${item.title}-${index}`} className="flex gap-3 rounded-xl p-3 hover:bg-[var(--surface-soft)]"><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${item.active ? "bg-blue-500/10 text-blue-400" : "bg-slate-500/10 text-slate-400"}`}><Clock3 size={15} /></span><div><p className="text-sm font-bold">{item.title}</p><p className="mt-1 text-xs text-[var(--text-muted)]">{item.detail}</p></div></div>) : <EmptyUpdate icon={CheckCircle2} title="No participation updates" detail="Updates will appear as your applications progress." /> : announcements.length ? announcements.map((item, index) => <div key={item.id || index} className="flex gap-3 rounded-xl p-3 hover:bg-[var(--surface-soft)]"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-500/10 text-blue-400"><Megaphone size={15} /></span><div><p className="text-sm font-bold">{item.title || item.message || "Announcement"}</p><p className="mt-1 text-xs text-[var(--text-muted)]">{item.time || item.date || "Intramural notice"}</p></div></div>) : <EmptyUpdate icon={Megaphone} title="No announcements" detail="Relevant tournament notices will appear here." />}</div></aside>;
};
const EmptyUpdate = ({ icon, title, detail }) => <div className="grid min-h-36 place-items-center text-center"><div>{createElement(icon, { className: "mx-auto text-[var(--text-soft)]", size: 27 })}<p className="mt-3 font-bold">{title}</p><p className="mt-1 text-sm text-[var(--text-muted)]">{detail}</p></div></div>;

export const ViewerOpportunities = ({ preview, viewerTeamsHref, slotsFull }) => {
  const items = Array.isArray(preview?.items) ? preview.items : [];
  return <section className="py-2"><div className="flex items-center justify-between gap-3"><div><h3 className="text-base font-extrabold">Available Opportunities</h3><p className="mt-1 text-xs text-[var(--text-muted)]">Browse teams and entries currently accepting participants.</p></div><Link to={viewerTeamsHref} className="inline-flex items-center gap-1 text-xs font-bold text-[var(--primary)] hover:underline">View all opportunities <ArrowRight size={13} /></Link></div>{slotsFull ? <p className="mt-4 rounded-xl bg-amber-400/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-200">Participation limit reached. A slot becomes available if an active application is rejected, withdrawn, or cancelled.</p> : null}<div className="mt-4 divide-y divide-[var(--border-soft)]">{items.length ? items.map((item) => <div key={item.id} className="flex flex-wrap items-center gap-3 py-3"><SportIcon imageUrl={item.imageUrl || item.image_url} label={item.sportName} /><div className="min-w-0 flex-1"><p className="break-words text-sm font-bold">{item.name}</p><p className="mt-0.5 text-xs text-[var(--text-muted)]">{item.sportName}{item.coachName ? ` · ${item.coachName}` : ""}</p></div><span className="rounded-md bg-[var(--surface-muted)] px-1.5 py-0.5 text-[10px] font-extrabold text-[var(--text-soft)]">{String(item.type || "ENTRY").toUpperCase()}</span><Link to={item.href || viewerTeamsHref} aria-disabled={slotsFull} className={`text-xs font-bold ${slotsFull ? "pointer-events-none text-[var(--text-soft)]" : "text-[var(--primary)] hover:underline"}`}>{slotsFull ? "Limit reached" : "View"}</Link></div>) : <p className="py-8 text-center text-sm text-[var(--text-muted)]">No opportunities are currently available.</p>}</div></section>;
};

const ViewerParticipationDashboard = ({ tournament, applications, announcements, applicationPreview, viewerTeamsHref }) => {
  const [selected, setSelected] = useState(null);
  const activeSlots = useMemo(() => countActiveSports(applications), [applications]);
  return <div className="space-y-6"><ViewerParticipationHero tournament={tournament} applications={applications} /><div className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,13fr)_minmax(320px,7fr)]"><ViewerApplicationsList applications={applications} onSelect={setSelected} /><ViewerUpdatesPanel applications={applications} announcements={announcements} /></div><ViewerOpportunities preview={applicationPreview} viewerTeamsHref={viewerTeamsHref} slotsFull={activeSlots >= MAX_SLOTS} /><ParticipantDrawer participant={selected ? toDrawerParticipant(selected) : null} onClose={() => setSelected(null)} /></div>;
};

export default ViewerParticipationDashboard;
