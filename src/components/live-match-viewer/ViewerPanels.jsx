import { createElement, useId, useRef } from "react";
import {
  Activity,
  CalendarDays,
  ChevronLeft,
  CircleAlert,
  Clock3,
  MapPin,
  Radio,
  Trophy,
  Users,
} from "lucide-react";

import IdentityImage from "../common/IdentityImage";
import { useProfileDrawer } from "../profile";

const dateTimeLabel = (schedule) => {
  if (!schedule?.date) return "Schedule to be announced";
  const parsed = new Date(`${schedule.date}T${schedule.start_time || "00:00:00"}`);
  if (Number.isNaN(parsed.getTime())) return String(schedule.date);
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    ...(schedule.start_time ? { timeStyle: "short" } : {}),
  }).format(parsed);
};

const statusClasses = {
  LIVE: "bg-rose-50 text-rose-700 dark:bg-rose-950/45 dark:text-rose-300",
  FINAL: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  UPCOMING: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/45 dark:text-cyan-300",
  WAITING: "bg-amber-50 text-amber-700 dark:bg-amber-950/45 dark:text-amber-300",
  PAUSED: "bg-amber-50 text-amber-700 dark:bg-amber-950/45 dark:text-amber-300",
  CANCELLED: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  ABANDONED: "bg-orange-50 text-orange-700 dark:bg-orange-950/45 dark:text-orange-300",
  ADMINISTRATIVE: "bg-violet-50 text-violet-700 dark:bg-violet-950/45 dark:text-violet-300",
};

export const MatchContextHeader = ({ match, onBack, connectionStatus }) => {
  const status = match?.status || {};
  const title = [match?.sport?.name, match?.event?.name].filter(Boolean).join(" · ") || "Live Match";
  const context = [match?.intramural?.name, match?.round].filter(Boolean).join(" · ");
  const location = [match?.venue?.name, match?.venue?.location].filter(Boolean).join(" · ");
  return (
    <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex min-w-0 items-start gap-3 sm:gap-4">
        <button type="button" onClick={onBack} aria-label="Back to Matches" className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border-soft)] text-[var(--text-muted)] hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"><ChevronLeft size={21} aria-hidden="true" /></button>
        <IdentityImage imageUrl={match?.sport?.image_url} label={match?.sport?.name || "Sport"} kind="logo" scale="lg" className="hidden shrink-0 sm:flex" />
        <div className="min-w-0">
          {context ? <p className="mb-1 break-words text-sm font-semibold text-cyan-700 dark:text-cyan-300">{context}</p> : null}
          <h1 className="break-words text-2xl font-black tracking-tight text-[var(--text-strong)] sm:text-3xl">{title}</h1>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--text-muted)]">
            <span className="inline-flex items-center gap-1.5"><CalendarDays size={15} aria-hidden="true" />{dateTimeLabel(match?.schedule)}</span>
            {location ? <span className="inline-flex items-center gap-1.5"><MapPin size={15} aria-hidden="true" />{location}</span> : null}
          </div>
        </div>
      </div>
      <div className="ml-13 flex shrink-0 flex-wrap items-center gap-2 sm:ml-0">
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] ${statusClasses[status.category] || statusClasses.UPCOMING}`}>
          {status.category === "LIVE" ? <span className="h-2 w-2 rounded-full bg-rose-500 motion-safe:animate-pulse" aria-hidden="true" /> : null}
          {status.label || "Upcoming"}
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)]" title={`Realtime status: ${connectionStatus}`}><Radio size={14} aria-hidden="true" />{connectionStatus === "live" ? "Synced" : connectionStatus === "offline" ? "Offline" : "Syncing"}</span>
      </div>
    </header>
  );
};

export const ViewerStateNotice = ({ match, result }) => {
  const category = match?.status?.category;
  let title = "";
  let message = "";
  if (match?.release?.supported === false) {
    title = "Release 1 result presentation";
    message = match.release.reason;
  } else if (category === "WAITING") {
    title = "Waiting for opponent";
    message = "The remaining participant will appear when the prior Match is officially resolved.";
  } else if (category === "CANCELLED") {
    title = "Match cancelled";
    message = "Historical participants and schedule are preserved. No winner is assigned.";
  } else if (category === "ABANDONED") {
    title = "Match abandoned";
    message = "The recorded partial score is shown without inferring a winner.";
  } else if (category === "PAUSED") {
    title = match.status.label;
    message = "The official Match state is temporarily paused.";
  } else if (category === "ADMINISTRATIVE") {
    title = result?.disposition?.replaceAll("_", " ") || match.status.label;
    message = result?.winner ? `${result.winner.display_name} is the official winner.` : "The administrative result is shown without a fabricated score.";
  }
  if (!title) return null;
  return <section aria-label="Match state notice" className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/35 dark:text-amber-100"><CircleAlert className="mt-0.5 shrink-0" size={19} aria-hidden="true" /><div><h2 className="text-sm font-bold">{title}</h2><p className="mt-0.5 text-sm opacity-80">{message}</p></div></section>;
};

export const SegmentBreakdown = ({ segments }) => {
  if (!segments?.length) return null;
  return (
    <section aria-labelledby="segment-breakdown-heading" className="py-1">
      <h2 id="segment-breakdown-heading" className="sr-only">Segment breakdown</h2>
      <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
        {segments.map((segment) => <div key={`${segment.index}-${segment.label}`} className={`inline-flex items-center gap-2 text-sm ${segment.status === "LIVE" ? "font-bold text-cyan-700 dark:text-cyan-300" : "text-[var(--text-muted)]"}`}><span>{segment.label}</span><strong className="tabular-nums text-[var(--text-strong)]">{segment.participant1_value ?? "—"}–{segment.participant2_value ?? "—"}</strong>{segment.status === "LIVE" ? <span className="text-[0.65rem] uppercase tracking-widest">Live</span> : null}</div>)}
      </div>
    </section>
  );
};

const actionTime = (value) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" }).format(parsed);
};

export const ActionList = ({ actions, emptyLabel = "No public actions recorded yet." }) => {
  if (!actions?.length) return <p className="py-6 text-sm text-[var(--text-muted)]">{emptyLabel}</p>;
  return (
    <ol className="divide-y divide-[var(--border-soft)]">
      {actions.map((action) => <li key={action.event_id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
        {action.player ? <IdentityImage imageUrl={action.player.image_url} label={action.player.display_name} kind="avatar" scale="sm" className="shrink-0" /> : <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${action.is_score_event ? "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300" : "bg-[var(--surface-muted)] text-[var(--text-muted)]"}`}><Activity size={15} aria-hidden="true" /></span>}
        <div className="min-w-0 flex-1"><p className="break-words text-sm font-semibold text-[var(--text-strong)]"><span aria-hidden="true" className="mr-2 font-black text-cyan-700 dark:text-cyan-300">{action.label}</span><span className="text-[var(--text-muted)]">{action.player?.display_name || action.participant_display_name || "Official Match action"}</span></p><span className="sr-only">{action.description}</span></div>
        <time dateTime={action.occurred_at} className="shrink-0 text-xs tabular-nums text-[var(--text-muted)]">{actionTime(action.occurred_at)}</time>
      </li>)}
    </ol>
  );
};

export const RecentActions = ({ actions, onViewAll }) => (
  <section aria-labelledby="recent-actions-heading" className="rounded-[1.5rem] border border-[var(--border-soft)] bg-[var(--surface-card)] p-5 shadow-sm sm:p-6">
    <div className="mb-4 flex items-center justify-between gap-4"><div><h2 id="recent-actions-heading" className="text-lg font-black text-[var(--text-strong)]">Recent Actions</h2><p className="mt-0.5 text-sm text-[var(--text-muted)]">Latest viewer-safe official Match actions.</p></div>{onViewAll ? <button type="button" onClick={onViewAll} className="shrink-0 text-sm font-bold text-cyan-700 hover:underline dark:text-cyan-300">View all plays</button> : null}</div>
    <ActionList actions={actions} />
  </section>
);

const StatisticsPanel = ({ statistics }) => {
  const definitions = (statistics?.definitions || []).filter((definition) => !["UNSUPPORTED", "NOT_APPLICABLE"].includes(definition.availability));
  if (!definitions.length || statistics?.availability === "UNSUPPORTED") return <p className="py-8 text-sm text-[var(--text-muted)]">Statistics are not supported for this Match presentation.</p>;
  if (statistics?.availability === "NOT_RECORDED") return <p className="py-8 text-sm text-[var(--text-muted)]">Supported statistics have not been recorded for this Match.</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border-soft)]">
      <table className="w-full min-w-[38rem] border-collapse text-sm">
        <caption className="sr-only">Official Match statistics</caption>
        <thead><tr className="bg-[var(--surface-muted)] text-left text-xs uppercase tracking-wider text-[var(--text-muted)]"><th scope="col" className="px-4 py-3">{statistics.participant_label}</th>{definitions.map((definition) => <th scope="col" key={definition.key} title={definition.label} className="px-3 py-3 text-center">{definition.short_label}</th>)}</tr></thead>
        <tbody>{(statistics.rows || []).map((row, index) => {
          const values = new Map((row.values || []).map((value) => [value.metric_key, value]));
          return <tr key={`${row.player_id || row.participant_id || index}`} className="border-t border-[var(--border-soft)]"><th scope="row" className="px-4 py-3"><span className="flex min-w-0 items-center gap-2"><IdentityImage imageUrl={row.image_url} label={row.display_name} kind={row.player_id ? "avatar" : "logo"} scale="sm" className="shrink-0" /><span className="break-words text-left font-semibold text-[var(--text-strong)]">{row.display_name}</span></span></th>{definitions.map((definition) => { const metric = values.get(definition.key); return <td key={definition.key} className="px-3 py-3 text-center tabular-nums text-[var(--text-strong)]">{metric?.availability === "AVAILABLE" ? metric.value : <span aria-label={`${definition.label} not recorded`} className="text-[var(--text-muted)]">—</span>}</td>; })}</tr>;
        })}</tbody>
      </table>
    </div>
  );
};

const RosterPanel = ({ participants, tournamentId = null, sportId = null }) => {
  const { openProfile } = useProfileDrawer();
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {participants.map((participant) => (
        <section key={participant.side} aria-labelledby={`roster-${participant.side}`}>
          <div className="mb-3 flex items-center gap-2">
            <IdentityImage imageUrl={participant.effective_logo_url} label={participant.display_name} kind="logo" scale="sm" />
            <h3 id={`roster-${participant.side}`} className="break-words font-bold text-[var(--text-strong)]">{participant.display_name}</h3>
          </div>
          {(participant.roster?.length || participant.members?.length) ? (
            <ul className="space-y-2">
              {(participant.roster?.length ? participant.roster : participant.members).map((member, index) => {
                const memberPlayerId = member.player_id || member.id;
                const memberUserId = member.user_id;
                return (
                  <li key={member.id || index}>
                    <button
                      type="button"
                      onClick={() => {
                        if (memberPlayerId || memberUserId) {
                          openProfile({
                            playerId: memberPlayerId ? Number(memberPlayerId) : null,
                            userId: memberUserId ? Number(memberUserId) : null,
                            tournamentId: tournamentId || participant.tournament_id || null,
                            sportId: sportId || participant.sport_id || null,
                          });
                        }
                      }}
                      className="flex w-full items-center gap-3 rounded-xl bg-[var(--surface-muted)] px-3 py-2.5 text-left transition hover:bg-[var(--surface-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                    >
                      <IdentityImage imageUrl={member.image_url} label={member.display_name} kind="avatar" scale="sm" />
                      <span className="min-w-0 flex-1 break-words text-sm font-semibold text-[var(--text-strong)] hover:underline">{member.display_name}</span>
                      {member.position || member.role ? <span className="text-xs text-[var(--text-muted)]">{member.position || member.role}</span> : null}
                      <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400">Profile</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">No public roster or member list is available.</p>
          )}
        </section>
      ))}
    </div>
  );
};

const MetadataPanel = ({ match, result, rules }) => {
  const rows = [
    ["Intramural", match?.intramural?.name],
    ["Competition", match?.competition?.name],
    ["Event", match?.event?.name],
    ["Round", match?.round],
    ["Venue", match?.venue?.name],
    ["Schedule", dateTimeLabel(match?.schedule)],
    ["Result", result?.draw ? "Draw" : result?.winner?.display_name ? `${result.winner.display_name} · Winner` : result?.disposition?.replaceAll("_", " ")],
    ["Rule snapshot", rules?.locked ? `Locked${rules.template_version ? ` · v${rules.template_version}` : ""}` : "Runtime configuration"],
  ].filter(([, value]) => value);
  return <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">{rows.map(([label, value]) => <div key={label} className="border-b border-[var(--border-soft)] pb-3"><dt className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">{label}</dt><dd className="mt-1 break-words text-sm font-semibold text-[var(--text-strong)]">{value}</dd></div>)}</dl>;
};

const TABS = [
  { key: "overview", label: "Overview", icon: Trophy },
  { key: "statistics", label: "Statistics", icon: Activity },
  { key: "plays", label: "Play-by-Play", icon: Clock3 },
  { key: "roster", label: "Roster / Members", icon: Users },
];

export const ViewerMatchTabs = ({ match, result, rules, statistics, participants, actions, hasMore, isLoadingMore, onLoadMore, activeTab, onTabChange }) => {
  const tabsId = useId();
  const tabRefs = useRef([]);
  const selectTab = (index, moveFocus = false) => {
    const targetIndex = (index + TABS.length) % TABS.length;
    onTabChange(TABS[targetIndex].key);
    if (moveFocus) window.requestAnimationFrame(() => tabRefs.current[targetIndex]?.focus());
  };
  const selectedIndex = Math.max(0, TABS.findIndex((tab) => tab.key === activeTab));
  const handleKeyDown = (event) => {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "Home") selectTab(0, true);
    else if (event.key === "End") selectTab(TABS.length - 1, true);
    else selectTab(selectedIndex + (event.key === "ArrowRight" ? 1 : -1), true);
  };
  return (
    <section className="rounded-[1.5rem] border border-[var(--border-soft)] bg-[var(--surface-card)] shadow-sm">
      <div role="tablist" aria-label="Match details" onKeyDown={handleKeyDown} className="flex overflow-x-auto border-b border-[var(--border-soft)] px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-4">
        {TABS.map((tab, index) => <button ref={(node) => { tabRefs.current[index] = node; }} key={tab.key} id={`${tabsId}-${tab.key}-tab`} role="tab" aria-selected={activeTab === tab.key} aria-controls={`${tabsId}-${tab.key}-panel`} tabIndex={activeTab === tab.key ? 0 : -1} type="button" onClick={() => onTabChange(tab.key)} className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-4 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-500 sm:px-4 ${activeTab === tab.key ? "border-cyan-600 text-cyan-700 dark:text-cyan-300" : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-strong)]"}`}>{createElement(tab.icon, { size: 16, "aria-hidden": true })}{tab.label}</button>)}
      </div>
      <div id={`${tabsId}-${activeTab}-panel`} role="tabpanel" aria-labelledby={`${tabsId}-${activeTab}-tab`} tabIndex={0} className="p-5 focus-visible:outline-none sm:p-6">
        {activeTab === "overview" ? <MetadataPanel match={match} result={result} rules={rules} /> : null}
        {activeTab === "statistics" ? <StatisticsPanel statistics={statistics} /> : null}
        {activeTab === "plays" ? <><ActionList actions={actions} emptyLabel="No public play-by-play is available." />{hasMore ? <button type="button" disabled={isLoadingMore} onClick={onLoadMore} className="mt-5 inline-flex rounded-full border border-cyan-300 px-4 py-2 text-sm font-bold text-cyan-700 hover:bg-cyan-50 disabled:opacity-60 dark:border-cyan-800 dark:text-cyan-300 dark:hover:bg-cyan-950/40">{isLoadingMore ? "Loading…" : "Load earlier plays"}</button> : null}</> : null}
        {activeTab === "roster" ? <RosterPanel participants={participants} tournamentId={match?.intramural?.id || match?.tournament_id} sportId={match?.sport?.id} /> : null}
      </div>
    </section>
  );
};

export const MatchMetadata = MetadataPanel;

export const LiveSummaryAnnouncer = ({ match, presentation, result }) => {
  const status = match?.status?.label || "Upcoming";
  const score = presentation?.score || {};
  const message = !presentation?.show_score
    ? `${status}. ${match?.sport?.name || "Match"}.`
    : match?.status?.category === "FINAL" && result?.winner
      ? `Match final. ${result.winner.display_name} won. Official score ${score.participant1} to ${score.participant2}.`
      : `${status}. Official score ${score.participant1} to ${score.participant2}.`;
  return <p className="sr-only" aria-live="polite" aria-atomic="true">{message}</p>;
};
