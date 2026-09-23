import { useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { TeamLogo } from "../../components/common/IdentityImage";
import { getAnalyticsLeaderboard, getAnalyticsOptions } from "../../services/standingsService";
import { useProfileDrawer } from "../../components/profile";
import {
  analyticsParticipantType,
  columnsForMetricSchema,
  filterStandingRowsByDepartment,
  formatMetricValue,
  participantTypeLabel,
  rankingExplanation,
} from "./standingsPresentation";

const SelectField = ({ id, label, value, onChange, children }) => <label htmlFor={id} className="grid w-full gap-1 text-xs font-bold text-[var(--text-muted)] sm:w-auto">
  {label}
  <select id={id} value={value} onChange={onChange} className="min-h-10 w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] px-3 text-sm text-[var(--text-main)] outline-none focus:border-[var(--primary)] sm:min-w-44">
    {children}
  </select>
</label>;

const statusFor = (payload) => {
  if (!payload || Number(payload.completed_matches || 0) === 0) return "No Results";
  return payload.provisional ? "Provisional" : "Final";
};

const StatusBadge = ({ payload }) => {
  const status = statusFor(payload);
  const tone = status === "Final" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : status === "Provisional" ? "bg-amber-500/10 text-amber-800 dark:text-amber-200" : "bg-[var(--surface-muted)] text-[var(--text-muted)]";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${tone}`}>{status}</span>;
};

const competitorLabel = (row, participantType) => {
  if (participantType === "PLAYER") return "Player";
  if (participantType === "LANE" || participantType === "SOLO") return "Athlete / Entry";
  if (participantType === "DUO") return "Pair / Entry";
  return "Team";
};

const AnalyticsTable = ({ payload, departmentId, tournamentId, sportId }) => {
  const { openProfile } = useProfileDrawer();
  const participantType = String(payload?.participant_type || "TEAM").toUpperCase();
  const rows = filterStandingRowsByDepartment(payload?.rows, departmentId);
  const columns = columnsForMetricSchema(payload?.metric_schema, participantType);
  if (!rows.length) return <div className="grid min-h-48 place-items-center px-5 text-center text-sm text-[var(--text-muted)]">{participantType === "PLAYER" ? "No player statistics available yet." : "No completed results yet for this selection."}</div>;
  return <div className="overflow-x-auto [webkit-overflow-scrolling:touch]" tabIndex={0} aria-label="Scrollable standings table">
    <table className="w-full min-w-[720px] text-sm">
      <caption className="sr-only">{payload.sport_name} {payload.event_name || ""} standings</caption>
      <thead className="bg-[var(--surface-soft)] text-[11px] uppercase tracking-wide text-[var(--text-muted)]"><tr>
        <th className="sticky left-0 z-20 w-16 bg-[var(--surface-soft)] px-3 py-3 text-left">Rank</th>
        <th className="sticky left-16 z-20 min-w-56 bg-[var(--surface-soft)] px-4 py-3 text-left">{competitorLabel(rows[0], participantType)}</th>
        {columns.map((metric) => <th key={metric.code} className="whitespace-nowrap px-3 py-3 text-right">{metric.short_label || metric.label}</th>)}
      </tr></thead>
      <tbody className="divide-y divide-[var(--border-soft)]">{rows.map((row) => <tr key={`${row.participant_type}-${row.participant_id}`} className="hover:bg-[var(--surface-soft)]">
        <td className="sticky left-0 z-10 bg-[var(--surface)] px-3 py-3 font-extrabold tabular-nums">{row.rank}</td>
        <td className="sticky left-16 z-10 bg-[var(--surface)] px-4 py-3"><div className="flex items-center gap-2.5"><TeamLogo imageUrl={row.image_url} label={row.participant_name} scale="sm" /><div className="min-w-0">{participantType === "PLAYER" && row.participant_id ? (<button type="button" onClick={() => openProfile({ playerId: Number(row.participant_id), tournamentId: tournamentId ? Number(tournamentId) : null, sportId: payload?.sport_id || (sportId ? Number(sportId) : null) })} className="max-w-52 truncate text-left font-bold text-blue-600 hover:underline dark:text-blue-400" aria-label={`View ${row.participant_name}'s profile`}>{row.participant_name}</button>) : (<div className="max-w-52 truncate font-bold">{row.participant_name}</div>)}{row.department_name ? <div className="truncate text-xs text-[var(--text-muted)]">{row.department_name}</div> : null}{Array.isArray(row.members) && row.members.length ? <div className="max-w-52 truncate text-xs text-[var(--text-soft)]">{row.members.join(" · ")}</div> : null}</div></div></td>
        {columns.map((metric) => <td key={metric.code} className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums">{formatMetricValue(row.metrics?.[metric.code], metric)}</td>)}
      </tr>)}</tbody>
    </table>
  </div>;
};

const AnalyticsStandingsPanel = ({ tournamentId, mode, refreshToken = 0 }) => {
  const [options, setOptions] = useState(null);
  const [sportId, setSportId] = useState("");
  const [eventId, setEventId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryNonce, setRetryNonce] = useState(0);
  const requestSequence = useRef(0);

  useEffect(() => {
    const requestId = ++requestSequence.current;
    if (!tournamentId) return;
    getAnalyticsOptions({ tournamentId }).then((result) => {
      if (requestId !== requestSequence.current) return;
      setOptions(result);
      const defaultSport = Number(result?.default_sport_id || result?.sports?.[0]?.id || 0);
      setSportId(defaultSport ? String(defaultSport) : "");
      const events = (result?.events || []).filter((item) => Number(item.sport_id) === defaultSport);
      const defaultEvent = events.find((item) => Number(item.id) === Number(result?.default_event_id)) || events[0];
      setEventId(defaultEvent?.id ? String(defaultEvent.id) : "");
      if (!defaultSport) setLoading(false);
    }).catch(() => { if (requestId === requestSequence.current) { setError("Unable to load standings options."); setLoading(false); } });
  }, [tournamentId]);

  const selectedSport = useMemo(() => (options?.sports || []).find((row) => Number(row.id) === Number(sportId)), [options, sportId]);
  const sportEvents = useMemo(() => (options?.events || []).filter((row) => Number(row.sport_id) === Number(sportId)), [options, sportId]);
  const selectedEvent = sportEvents.find((row) => Number(row.id) === Number(eventId)) || null;
  const participantType = analyticsParticipantType({ sportCode: selectedSport?.sport_code, participantShape: selectedEvent?.participant_shape, playerMode: mode === "players" });
  const departments = useMemo(() => {
    const names = new Map();
    (options?.participants || []).filter((row) => Number(row.sport_id) === Number(sportId) && (!eventId || Number(row.event_id) === Number(eventId))).forEach((row) => { if (row.department_name) names.set(row.department_name, row.department_name); });
    return [...names.values()].sort((a, b) => a.localeCompare(b));
  }, [eventId, options, sportId]);

  useEffect(() => {
    if (!tournamentId || !sportId || (sportEvents.length > 0 && !eventId)) return;
    const requestId = ++requestSequence.current;
    getAnalyticsLeaderboard({ tournamentId, sportId, eventId: eventId || null, participantType, fresh: true }).then((result) => {
      if (requestId === requestSequence.current) { setPayload(result); setError(""); }
    }).catch(() => { if (requestId === requestSequence.current) setError("Unable to load standings."); }).finally(() => { if (requestId === requestSequence.current) setLoading(false); });
  }, [eventId, participantType, refreshToken, retryNonce, sportEvents.length, sportId, tournamentId]);

  const changeSport = (value) => {
    setSportId(value); setDepartmentId(""); setPayload(null); setLoading(true);
    const events = (options?.events || []).filter((item) => Number(item.sport_id) === Number(value));
    setEventId(events[0]?.id ? String(events[0].id) : "");
  };
  return <section className="overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
    <div className="flex flex-wrap items-end gap-3 border-b border-[var(--border-soft)] p-4 sm:p-5">
      <SelectField id={`${mode}-sport`} label="Sport" value={sportId} onChange={(event) => changeSport(event.target.value)}><option value="">Choose a sport</option>{(options?.sports || []).map((sport) => <option key={sport.id} value={sport.id}>{sport.sport_name}</option>)}</SelectField>
      {sportEvents.length ? <SelectField id={`${mode}-event`} label="Event" value={eventId} onChange={(event) => { setEventId(event.target.value); setDepartmentId(""); setPayload(null); setLoading(true); }}><option value="">Choose an event</option>{sportEvents.map((item) => <option key={item.id} value={item.id}>{item.event_name}</option>)}</SelectField> : null}
      {departments.length > 1 ? <SelectField id={`${mode}-department`} label="Department" value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}><option value="">All departments</option>{departments.map((name) => <option key={name} value={name}>{name}</option>)}</SelectField> : null}
      {payload ? <div className="ml-auto flex items-center gap-2 self-center"><span className="text-xs font-semibold text-[var(--text-muted)]">{participantTypeLabel(payload.participant_type)}</span><StatusBadge payload={payload} /></div> : null}
    </div>
    {payload?.ranking_policy ? <div className="border-b border-[var(--border-soft)] px-4 py-3 text-xs text-[var(--text-muted)] sm:px-5"><span className="font-bold text-[var(--text-main)]">Ranking:</span> {rankingExplanation(payload.ranking_policy).replace("Participants are ranked by:\n", "").replaceAll(/\d+\. /g, "").replaceAll("\n", " → ")}{payload.provisional ? <span className="ml-2">Rankings may change until the event is complete.</span> : null}</div> : null}
    {error ? <div className="grid min-h-48 place-items-center gap-3 px-5 text-center"><div><p className="text-sm font-semibold text-rose-600 dark:text-rose-300">{error}</p><button type="button" onClick={() => { setLoading(true); setRetryNonce((value) => value + 1); }} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--border-soft)] px-3 text-sm font-bold"><RefreshCw size={15} />Retry</button></div></div> : loading ? <div className="grid min-h-48 place-items-center text-sm text-[var(--text-muted)]">Loading standings…</div> : !sportId ? <div className="grid min-h-48 place-items-center text-sm text-[var(--text-muted)]">Choose a sport to view standings.</div> : <AnalyticsTable payload={payload} departmentId={departmentId} tournamentId={tournamentId} sportId={sportId} />}
  </section>;
};

export default AnalyticsStandingsPanel;
