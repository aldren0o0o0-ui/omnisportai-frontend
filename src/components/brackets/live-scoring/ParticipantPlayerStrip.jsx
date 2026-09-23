import React, { useState } from "react";

const memberId = (member) => Number(member?.playerId || member?.id || 0);
const memberName = (member) => member?.displayName || member?.name || `Player ${memberId(member)}`;

export default function ParticipantPlayerStrip({ participants = [], selectedTeamId, selectedPlayerId, onSelectPlayer, substitutionControl, onSubstitute, disabled = false }) {
  const [substitutionTeamId, setSubstitutionTeamId] = useState(null);
  const [outPlayerId, setOutPlayerId] = useState("");
  const [inPlayerId, setInPlayerId] = useState("");
  const closeSubstitution = () => { setSubstitutionTeamId(null); setOutPlayerId(""); setInPlayerId(""); };

  return (
    <section className="grid gap-3 md:grid-cols-2" aria-label="Players available for the next action">
      {participants.map((participant) => {
        const substitutionOpen = Number(substitutionTeamId) === Number(participant.id);
        return (
          <div key={`players-${participant.id}`} className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">{participant.shortName || participant.name} players</p>
              {substitutionControl ? (
                <button type="button" disabled={disabled || !participant.benchMembers?.length} title={!participant.benchMembers?.length ? "No bench players are available for substitution." : "Substitute an active player"} onClick={() => { if (substitutionOpen) closeSubstitution(); else { setSubstitutionTeamId(Number(participant.id)); setOutPlayerId(""); setInPlayerId(""); } }} className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1.5 text-xs font-bold text-cyan-700 hover:bg-cyan-500/20 disabled:opacity-45 dark:text-cyan-200">
                  {substitutionOpen ? "Cancel" : "Substitution"}
                </button>
              ) : null}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(participant.members || []).map((member) => {
                const id = memberId(member);
                const selected = substitutionOpen ? Number(outPlayerId) === id : Number(selectedTeamId) === Number(participant.id) && Number(selectedPlayerId) === id;
                return <button key={`active-${participant.id}-${id}`} type="button" aria-pressed={selected} onClick={() => { if (substitutionOpen) setOutPlayerId(String(id)); else onSelectPlayer?.({ teamId: participant.id, playerId: id }); }} className={`min-h-9 rounded-full border px-2.5 text-xs font-semibold transition ${selected ? "border-cyan-500 bg-cyan-500/15 text-cyan-800 dark:text-cyan-100" : "border-[var(--border-soft)] bg-[var(--surface)] hover:bg-[var(--surface-muted)]"}`}>{memberName(member)}</button>;
              })}
              {(participant.members || []).length === 0 ? <span className="text-xs text-[var(--text-muted)]">No active player list is available.</span> : null}
            </div>
            {substitutionOpen ? (
              <div className="mt-3 rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] p-2.5">
                <p className="text-xs text-[var(--text-muted)]">Select the player leaving above, then choose the bench player entering.</p>
                <label className="mt-2 block text-xs font-semibold" htmlFor={`bench-player-${participant.id}`}>Player from bench</label>
                <select id={`bench-player-${participant.id}`} value={inPlayerId} onChange={(event) => setInPlayerId(event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] px-3 text-sm">
                  <option value="">Choose a bench player</option>
                  {(participant.benchMembers || []).map((member) => <option key={`bench-${participant.id}-${memberId(member)}`} value={memberId(member)}>{memberName(member)}</option>)}
                </select>
                <button type="button" disabled={disabled || !outPlayerId || !inPlayerId} onClick={async () => { const saved = await onSubstitute?.({ teamId: participant.id, outPlayerId: Number(outPlayerId), inPlayerId: Number(inPlayerId) }); if (saved !== false) closeSubstitution(); }} className="mt-2 min-h-10 rounded-lg bg-cyan-600 px-4 text-sm font-bold text-white disabled:opacity-45">Confirm substitution</button>
              </div>
            ) : null}
          </div>
        );
      })}
    </section>
  );
}
