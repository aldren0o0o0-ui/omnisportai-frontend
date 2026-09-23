import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, RotateCcw, Save } from "lucide-react";

import {
  getGlobalSportConfiguration,
  resetGlobalSportConfiguration,
  updateGlobalSportConfiguration,
} from "../../services/sportService";

const competitionLabel = { TEAM: "Team", SOLO: "Individual", DUO: "Pair" };
const divisionLabel = { MEN: "Men", WOMEN: "Women", MIXED: "Mixed", OPEN: "Open" };
const clone = (value) => JSON.parse(JSON.stringify(value));

export default function GlobalSportTemplatePanel({ sportId, onSaved, onDirtyChange }) {
  const [configuration, setConfiguration] = useState(null);
  const [draft, setDraft] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    getGlobalSportConfiguration(sportId)
      .then((result) => {
        if (!active) return;
        setConfiguration(result);
        setDraft(clone(result));
      })
      .catch((reason) => active && setError(reason?.response?.data?.detail || "Unable to load sport defaults."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [sportId]);

  const dirty = useMemo(
    () => Boolean(configuration && draft && JSON.stringify(configuration.events) !== JSON.stringify(draft.events)),
    [configuration, draft]
  );
  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);

  const patchEvent = (key, partial) => setDraft((current) => ({
    ...current,
    events: current.events.map((event) => event.capability_variant_key === key ? { ...event, ...partial } : event),
  }));

  const save = async () => {
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await updateGlobalSportConfiguration(sportId, {
        expected_version: configuration.sport_version,
        events: draft.events,
      });
      setConfiguration(result); setDraft(clone(result));
      setNotice(`${result.canonical_display_name} defaults updated. Future Intramurals will use these settings.`);
      onSaved?.(result);
    } catch (reason) {
      setError(reason?.response?.data?.detail || "Unable to save sport defaults.");
    } finally { setBusy(false); }
  };

  const reset = async () => {
    if (!window.confirm("Reset names, enabled events, and competition defaults? Existing Intramurals will not change.")) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await resetGlobalSportConfiguration(sportId, configuration.sport_version);
      setConfiguration(result); setDraft(clone(result));
      setNotice("System defaults restored. Existing competitions were not changed.");
      onSaved?.(result);
    } catch (reason) {
      setError(reason?.response?.data?.detail || "Unable to reset sport defaults.");
    } finally { setBusy(false); }
  };

  if (loading) return <div className="grid min-h-48 place-items-center"><Loader2 className="animate-spin text-blue-500" /></div>;
  if (!draft) return <p className="text-sm text-rose-600 dark:text-rose-300">{error || "Sport defaults are unavailable."}</p>;

  const enabledCount = draft.events.filter((event) => event.enabled_by_default).length;
  return (
    <div className="space-y-5">
      <section className="grid gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4 sm:grid-cols-3">
        <div><p className="text-xs text-[var(--text-soft)]">Competition types</p><p className="mt-1 font-semibold">{draft.competition_types.map((value) => competitionLabel[value]).join(" and ")}</p></div>
        <div><p className="text-xs text-[var(--text-soft)]">Available divisions</p><p className="mt-1 font-semibold">{draft.available_divisions.map((value) => divisionLabel[value]).join(", ")}</p></div>
        <div><p className="text-xs text-[var(--text-soft)]">Default events</p><p className="mt-1 font-semibold">{enabledCount} enabled</p></div>
      </section>

      <section>
        <h3 className="font-semibold text-[var(--text-main)]">Events</h3>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Choose the competitions normally offered. Changes apply only to future Intramurals.</p>
        <div className="mt-3 divide-y divide-[var(--border-soft)] overflow-hidden rounded-xl border border-[var(--border-soft)]">
          {draft.events.map((event) => {
            const isOpen = expanded === event.capability_variant_key;
            const fixedPlayers = event.competition_type === "SOLO" ? "1 athlete" : event.competition_type === "DUO" ? "2 athletes" : `${event.minimum_players}–${event.maximum_players} players`;
            return <div key={event.capability_variant_key} className="bg-[var(--surface)]">
              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                  <input type="checkbox" checked={event.enabled_by_default} onChange={(e) => patchEvent(event.capability_variant_key, { enabled_by_default: e.target.checked })} className="mt-1 h-4 w-4" />
                  <span className="min-w-0"><span className="block break-words font-semibold">{event.event_name}</span><span className="mt-1 block text-xs text-[var(--text-muted)]">{divisionLabel[event.division]} · {competitionLabel[event.competition_type]} · {fixedPlayers}{event.playing_format ? ` · ${event.playing_format}` : ""}</span></span>
                </label>
                <button type="button" onClick={() => setExpanded(isOpen ? null : event.capability_variant_key)} className="os-btn-ghost-soft min-h-10 text-sm">{isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />} Edit</button>
              </div>
              {isOpen ? <div className="grid gap-4 border-t border-[var(--border-soft)] bg-[var(--surface-soft)] p-4 sm:grid-cols-2">
                <label className="sm:col-span-2"><span className="text-sm font-medium">Event name</span><input maxLength={120} value={event.event_name} onChange={(e) => patchEvent(event.capability_variant_key, { event_name: e.target.value })} className="mt-1 min-h-11 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3" /></label>
                <div><p className="text-sm font-medium">Division</p><p className="mt-1 rounded-xl bg-[var(--surface)] px-3 py-3 text-sm">{divisionLabel[event.division]} · Fixed</p></div>
                <div><p className="text-sm font-medium">Competition type</p><p className="mt-1 rounded-xl bg-[var(--surface)] px-3 py-3 text-sm">{competitionLabel[event.competition_type]} · Fixed</p></div>
                {event.competition_type === "TEAM" ? <>
                  <label><span className="text-sm font-medium">Minimum players</span><input type="number" min="1" max="50" value={event.minimum_players} onChange={(e) => patchEvent(event.capability_variant_key, { minimum_players: Number(e.target.value) })} className="mt-1 min-h-11 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3" /></label>
                  <label><span className="text-sm font-medium">Maximum players</span><input type="number" min="1" max="50" value={event.maximum_players} onChange={(e) => patchEvent(event.capability_variant_key, { maximum_players: Number(e.target.value) })} className="mt-1 min-h-11 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3" /></label>
                </> : <div className="sm:col-span-2"><p className="text-sm font-medium">Players per entry</p><p className="mt-1 rounded-xl bg-[var(--surface)] px-3 py-3 text-sm">{fixedPlayers} · Fixed for this competition type</p></div>}
                <label><span className="text-sm font-medium">Entries allowed per department</span><input type="number" min="1" max="100" value={event.entries_per_department} onChange={(e) => patchEvent(event.capability_variant_key, { entries_per_department: Number(e.target.value) })} className="mt-1 min-h-11 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3" /></label>
                <label><span className="text-sm font-medium">Minimum approved entries required</span><input type="number" min="2" max="100" value={event.minimum_entries_to_start} onChange={(e) => patchEvent(event.capability_variant_key, { minimum_entries_to_start: Number(e.target.value) })} className="mt-1 min-h-11 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3" /><span className="mt-1 block text-xs text-[var(--text-soft)]">The event cannot proceed until this many approved entries are ready.</span></label>
                <details className="sm:col-span-2 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-3">
                  <summary className="cursor-pointer text-sm font-semibold text-[var(--text-main)]">Optional competition defaults</summary>
                  <p className="mt-2 text-xs text-[var(--text-soft)]">These suggestions can be changed later for a specific Intramural or during bracket setup.</p>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <label><span className="text-sm font-medium">Suggested participant ordering</span><select value={event.seeding} onChange={(e) => patchEvent(event.capability_variant_key, { seeding: e.target.value })} className="mt-1 min-h-11 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3"><option value="RANDOM">Random</option><option value="MANUAL">Manual</option></select></label>
                    <label><span className="text-sm font-medium">Suggested competition format</span><select value={event.bracket_type} onChange={(e) => patchEvent(event.capability_variant_key, { bracket_type: e.target.value })} className="mt-1 min-h-11 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3"><option value="SINGLE_ELIMINATION">Single Elimination</option><option value="DOUBLE_ELIMINATION">Double Elimination</option><option value="ROUND_ROBIN">Round Robin</option></select></label>
                  </div>
                </details>
              </div> : null}
            </div>;
          })}
        </div>
      </section>

      {error ? <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-300">{typeof error === "string" ? error : error?.message || "Unable to save changes."}</p> : null}
      {notice ? <p className="rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">{notice}</p> : null}
      <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-[var(--border-soft)] bg-[var(--surface)] py-3 sm:flex-row sm:justify-between">
        <button type="button" onClick={reset} disabled={busy} className="os-btn-ghost-soft min-h-11"><RotateCcw size={16} /> Reset to System Defaults</button>
        <button type="button" onClick={save} disabled={busy || !dirty} className="os-btn-primary-soft min-h-11"><Save size={16} /> {busy ? "Saving..." : "Save Changes"}</button>
      </div>
    </div>
  );
}
