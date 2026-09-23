import React, { useMemo, useState } from "react";
import {
  controlsByEventType,
  specializedEngineTitle,
  specializedStateForEngine,
} from "../utils/specializedScoringUi";

const numberOrBlank = (value) => (
  Number.isFinite(Number(value)) ? Number(value) : ""
);

const Field = ({ label, children }) => (
  <label className="grid gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
    <span>{label}</span>
    {children}
  </label>
);

const inputClass =
  "min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

const actionClass =
  "min-h-10 rounded-lg bg-cyan-600 px-3 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50";

const stateCellClass = "rounded-xl bg-[var(--surface-soft)] px-3 py-2.5";

const ReadOnlySpecializedState = ({ engineType, state, participants }) => {
  if (engineType === "GAME_SET_MATCH") {
    return (
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {participants.map((participant) => (
          <div key={participant.key} className={stateCellClass}>
            <p className="truncate text-xs text-[var(--text-muted)]">{participant.label}</p>
            <p className="mt-1 text-lg font-semibold text-[var(--text-main)]">{state?.points?.[String(participant.teamId)] ?? "0"}</p>
            <p className="text-xs text-[var(--text-muted)]">{state?.games?.[String(participant.teamId)] || 0} games · {state?.sets?.[String(participant.teamId)] || 0} sets</p>
          </div>
        ))}
        <div className={stateCellClass}>
          <p className="text-xs text-[var(--text-muted)]">Serving</p>
          <p className="mt-1 truncate font-semibold text-[var(--text-main)]">{participants.find((row) => Number(row.teamId) === Number(state?.server_participant_id))?.label || "Not set"}</p>
        </div>
      </div>
    );
  }
  if (engineType === "TIMED_RACE" || engineType === "PLACEMENT") {
    return (
      <div className="mt-3 max-w-full overflow-x-auto overscroll-x-contain">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Official race or placement results</caption>
          <thead className="text-xs text-[var(--text-muted)]">
            <tr><th className="hidden px-2 py-2 sm:table-cell">Lane</th><th className="px-2 py-2">Participant</th><th className="px-2 py-2">Official time</th><th className="hidden px-2 py-2 md:table-cell">Status</th><th className="px-2 py-2">Place</th></tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-soft)]">
            {participants.map((participant) => {
              const result = state?.results?.[String(participant.teamId)] || {};
              return (
                <tr key={participant.key}>
                  <td className="hidden px-2 py-2 sm:table-cell">{result.lane || participant.side || "—"}</td>
                  <td className="max-w-36 break-words px-2 py-2 font-medium">{participant.label}<span className="mt-0.5 block text-xs text-[var(--text-muted)] md:hidden">{result.status || "Pending"}</span></td>
                  <td className="px-2 py-2">{result.official_time ?? "—"}</td>
                  <td className="hidden px-2 py-2 md:table-cell">{result.status || "Pending"}</td>
                  <td className="px-2 py-2">{result.placement || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }
  const rows = {
    JUDGE_SCORECARD: [["Round", state?.current_round || 1], ["Scorecards", Object.keys(state?.scorecards || {}).length]],
    COUNT_OR_TARGET: [["Mode", state?.mode || "—"], ["End", state?.current_end || 1]],
    INNING: [["Inning", state?.inning || 1], ["Half", state?.half || "TOP"], ["Balls", state?.balls || 0], ["Strikes", state?.strikes || 0], ["Outs", state?.outs || 0]],
    WIN_LOSS: [["Clock", state?.clock?.authoritative ? "Server controlled" : "Command based"], ["Result", state?.result_reason?.replaceAll("_", " ") || "Pending"]],
  }[engineType] || [];
  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map(([label, value]) => (
        <div key={label} className={stateCellClass}>
          <p className="text-xs text-[var(--text-muted)]">{label}</p>
          <p className="mt-1 font-semibold text-[var(--text-main)]">{String(value ?? "—")}</p>
        </div>
      ))}
    </div>
  );
};

export default function SpecializedScoringPanel({
  engineType,
  config,
  liveState,
  participants = [],
  canWrite = false,
  isSubmitting = false,
  onSubmit,
}) {
  const controls = useMemo(() => controlsByEventType(config), [config]);
  const state = specializedStateForEngine(engineType, liveState);
  const [selectedParticipant, setSelectedParticipant] = useState("");
  const [value, setValue] = useState("");
  const [judgeId, setJudgeId] = useState("1");
  const [round, setRound] = useState("1");
  const [sideAScore, setSideAScore] = useState("10");
  const [sideBScore, setSideBScore] = useState("9");
  const disabled = !canWrite || isSubmitting;
  const participantId = Number(selectedParticipant || participants?.[0]?.teamId || 0) || null;
  const first = participants?.[0];
  const second = participants?.[1];

  if (!canWrite) {
    return (
      <section className="rounded-2xl bg-[var(--surface-soft)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-[var(--text-main)]">{specializedEngineTitle(engineType)}</h3>
          <span className="rounded-full bg-[var(--surface-muted)] px-2 py-1 text-[11px] font-semibold text-[var(--text-muted)]">Read only</span>
        </div>
        <ReadOnlySpecializedState engineType={engineType} state={state} participants={participants} />
      </section>
    );
  }

  const send = (eventType, payload = {}) => {
    if (!controls.has(eventType) || disabled) return;
    onSubmit?.({ event_type: eventType, ...payload });
  };

  const participantSelect = (
    <Field label="Participant">
      <select
        className={inputClass}
        value={selectedParticipant || String(participants?.[0]?.teamId || "")}
        onChange={(event) => setSelectedParticipant(event.target.value)}
        disabled={disabled}
      >
        {participants.map((participant) => (
          <option key={participant.key} value={participant.teamId || ""}>
            {participant.label}
          </option>
        ))}
      </select>
    </Field>
  );

  return (
    <section className="rounded-2xl bg-[var(--surface-soft)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {specializedEngineTitle(engineType)}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Enter the official Match result.</p>
        </div>
      </div>

      {engineType === "GAME_SET_MATCH" && (
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          {participants.map((participant) => (
            <div key={participant.key} className="rounded-lg bg-slate-100/80 p-3 dark:bg-slate-900/80">
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{participant.label}</p>
              <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                {state?.points?.[String(participant.teamId)] ?? "0"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {state?.games?.[String(participant.teamId)] || 0} games · {state?.sets?.[String(participant.teamId)] || 0} sets
              </p>
            </div>
          ))}
          <div className="rounded-lg bg-slate-100/80 p-3 dark:bg-slate-900/80">
            <p className="text-xs text-slate-500 dark:text-slate-400">Serving</p>
            <p className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
              {participants.find((row) => Number(row.teamId) === Number(state?.server_participant_id))?.label || "Not set"}
            </p>
          </div>
        </div>
      )}

      {engineType === "JUDGE_SCORECARD" && (
        <div className="mt-3 grid gap-3">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <Field label="Judge">
              <input className={inputClass} type="number" min="1" value={judgeId} onChange={(e) => setJudgeId(e.target.value)} disabled={disabled} />
            </Field>
            <Field label="Round">
              <input className={inputClass} type="number" min="1" value={round} onChange={(e) => setRound(e.target.value)} disabled={disabled} />
            </Field>
            <Field label={first?.label || "Participant A"}>
              <input className={inputClass} type="number" min="0" max="10" value={sideAScore} onChange={(e) => setSideAScore(e.target.value)} disabled={disabled} />
            </Field>
            <Field label={second?.label || "Participant B"}>
              <input className={inputClass} type="number" min="0" max="10" value={sideBScore} onChange={(e) => setSideBScore(e.target.value)} disabled={disabled} />
            </Field>
            <button
              type="button"
              className={`${actionClass} self-end`}
              disabled={disabled || !first?.teamId || !second?.teamId}
              onClick={() => send("JUDGE_SCORE_SUBMITTED", {
                metadata: {
                  judge_id: Number(judgeId),
                  round: Number(round),
                  scores: {
                    [String(first.teamId)]: Number(sideAScore),
                    [String(second.teamId)]: Number(sideBScore),
                  },
                },
              })}
            >
              Save scorecard
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Round {state?.current_round || 1} · {Object.keys(state?.scorecards || {}).length} round scorecard set(s)
          </p>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_120px]">
            {participantSelect}
            <Field label="Deduction">
              <input className={inputClass} type="number" min="1" value={value} onChange={(e) => setValue(e.target.value)} disabled={disabled} />
            </Field>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              ["ROUND_START", "Start round", false],
              ["ROUND_END", "End round", false],
              ["WARNING", "Warning", true],
              ["CAUTION", "Caution", true],
              ["KNOCKDOWN", "Knockdown", true],
              ["KNOCKOUT", "Win by knockout", true],
              ["TECHNICAL_KNOCKOUT", "Win by technical knockout", true],
              ["REFEREE_STOPPAGE", "Win by referee stoppage", true],
              ["DISQUALIFICATION", "Win by disqualification", true],
              ["OFFICIAL_DECISION", "Confirm official decision", false],
            ].filter(([eventType]) => controls.has(eventType)).map(([eventType, label, requiresParticipant]) => (
              <button key={eventType} type="button" className={actionClass} disabled={disabled || (requiresParticipant && !participantId)} onClick={() => send(eventType, requiresParticipant ? { team_id: participantId } : {})}>
                {label}
              </button>
            ))}
            {controls.has("DEDUCTION") && (
              <button type="button" className={actionClass} disabled={disabled || !participantId || Number(value) <= 0} onClick={() => send("DEDUCTION", { team_id: participantId, value: Number(value) })}>
                Record deduction
              </button>
            )}
          </div>
        </div>
      )}

      {engineType === "COUNT_OR_TARGET" && (
        <div className="mt-3 grid gap-3">
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_140px_auto_auto]">
            {participantSelect}
            <Field label="Arrow value">
              <input className={inputClass} type="number" min="0" max="10" value={value} onChange={(e) => setValue(e.target.value)} disabled={disabled} />
            </Field>
            <button type="button" className={`${actionClass} self-end`} disabled={disabled || !participantId || value === ""} onClick={() => send("ARROW_RECORDED", { team_id: participantId, value: Number(value) })}>
              Record arrow
            </button>
            <button type="button" className="min-h-10 self-end rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900" disabled={disabled || !participantId} onClick={() => send("MISS_RECORDED", { team_id: participantId })}>
              Record miss
            </button>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-900">Mode: {state?.mode || "—"}</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-900">End: {state?.current_end || 1}</span>
            {participants.map((participant) => (
              <span key={participant.key} className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-900">
                {participant.label}: {state?.totals?.[String(participant.teamId)] || 0}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={actionClass} disabled={disabled} onClick={() => send("END_COMPLETED")}>Complete end</button>
            {controls.has("SHOOT_OFF_ARROW") && (
              <button type="button" className={actionClass} disabled={disabled || !participantId || value === ""} onClick={() => send("SHOOT_OFF_ARROW", { team_id: participantId, value: Number(value) })}>Record shoot-off arrow</button>
            )}
            {controls.has("PROCEDURAL_PENALTY") && (
              <button type="button" className={actionClass} disabled={disabled || !participantId || Number(value) <= 0} onClick={() => send("PROCEDURAL_PENALTY", { team_id: participantId, value: Number(value) })}>Record penalty</button>
            )}
            <button type="button" className={actionClass} disabled={disabled} onClick={() => send("RESULT_CONFIRMED")}>Confirm result</button>
          </div>
        </div>
      )}

      {(engineType === "TIMED_RACE" || engineType === "PLACEMENT") && (
        <div className="mt-3 max-w-full overflow-x-auto overscroll-x-contain">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Race result entry</caption>
            <thead className="text-xs text-slate-500 dark:text-slate-400">
              <tr>
                <th className="hidden px-2 py-2 font-medium sm:table-cell">Lane</th>
                <th className="px-2 py-2 font-medium">Participant</th>
                <th className="px-2 py-2 font-medium">Official time</th>
                <th className="px-2 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {participants.map((participant) => {
                const result = state?.results?.[String(participant.teamId)] || {};
                return (
                  <tr key={participant.key}>
                    <td className="hidden px-2 py-2 sm:table-cell">{result.lane || participant.side || "—"}</td>
                    <td className="max-w-32 break-words px-2 py-2 font-medium">{participant.label}</td>
                    <td className="px-2 py-2">
                      <div className="flex gap-1">
                        <input
                          aria-label={`Official time for ${participant.label}`}
                          className={`${inputClass} w-20 sm:w-28`}
                          type="number"
                          min="0"
                          step="0.001"
                          defaultValue={numberOrBlank(result.official_time)}
                          disabled={disabled}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" && Number(event.currentTarget.value) > 0) {
                              send("RESULT_TIME_RECORDED", { team_id: participant.teamId, value: Number(event.currentTarget.value) });
                            }
                          }}
                        />
                        <button type="button" className={actionClass} disabled={disabled} onClick={(event) => {
                          const input = event.currentTarget.previousElementSibling;
                          if (Number(input?.value) > 0) send("RESULT_TIME_RECORDED", { team_id: participant.teamId, value: Number(input.value) });
                        }}>Save</button>
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap gap-1">
                        {["DNS", "DNF", "DQ", "FALSE_START"].filter((code) => controls.has(code)).map((code) => (
                          <button key={code} type="button" className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-900" disabled={disabled} onClick={() => send(code, { team_id: participant.teamId })}>{code}</button>
                        ))}
                        {result.status && <span className="rounded-md bg-slate-100 px-2 py-1 text-xs dark:bg-slate-900">{result.status}</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <button type="button" className={`${actionClass} mt-3`} disabled={disabled} onClick={() => send("RESULT_CONFIRMED")}>
            Confirm all results
          </button>
        </div>
      )}

      {engineType === "INNING" && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {[
            ["Inning", state?.inning || 1],
            ["Half", state?.half || "TOP"],
            ["Balls", state?.balls || 0],
            ["Strikes", state?.strikes || 0],
            ["Outs", state?.outs || 0],
          ].map(([label, item]) => (
            <div key={label} className="rounded-lg bg-slate-100/80 p-3 dark:bg-slate-900/80">
              <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
              <p className="mt-1 text-lg font-semibold">{item}</p>
            </div>
          ))}
        </div>
      )}

      {engineType === "WIN_LOSS" && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg bg-slate-100/80 p-3 dark:bg-slate-900/80">
            <p className="text-xs text-slate-500 dark:text-slate-400">White</p>
            <p className="mt-1 truncate font-semibold">{participants.find((row) => Number(row.teamId) === Number(state?.white_participant_id))?.label || first?.label || "—"}</p>
            <p className="mt-1 text-2xl font-black tabular-nums">{Number(state?.result_points?.[String(state?.white_participant_id || first?.teamId)] || 0)}</p>
          </div>
          <div className="rounded-lg bg-slate-100/80 p-3 dark:bg-slate-900/80">
            <p className="text-xs text-slate-500 dark:text-slate-400">Black</p>
            <p className="mt-1 truncate font-semibold">{participants.find((row) => Number(row.teamId) === Number(state?.black_participant_id))?.label || second?.label || "—"}</p>
            <p className="mt-1 text-2xl font-black tabular-nums">{Number(state?.result_points?.[String(state?.black_participant_id || second?.teamId)] || 0)}</p>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 sm:col-span-2">
            Clock: {state?.clock?.authoritative ? "server controlled" : "command based"} · {state?.result_reason ? `Result: ${state.result_reason.replaceAll("_", " ")}` : "Result pending"}
          </p>
          <div className="grid gap-2 sm:col-span-2 sm:grid-cols-[minmax(0,1fr)_140px]">
            {participantSelect}
            <Field label="Clock adjustment (seconds)">
              <input className={inputClass} type="number" value={value} onChange={(event) => setValue(event.target.value)} disabled={disabled} />
            </Field>
          </div>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            {[
              ["MATCH_START", "Start Match", false],
              ["CLOCK_START", "Start clock", true],
              ["CLOCK_PAUSE", "Pause clock", false],
              ["CHECKMATE", "Win by checkmate", true],
              ["RESIGNATION", "Win by resignation", true],
              ["TIME_FORFEIT", "Win on time", true],
              ["ILLEGAL_MOVE", "Record illegal move", true],
              ["WALKOVER", "Win by walkover", true],
              ["DRAW_AGREED", "Draw agreed", false],
              ["STALEMATE", "Stalemate", false],
              ["RESULT_CONFIRMED", "Confirm winner", true],
            ].filter(([eventType]) => controls.has(eventType)).map(([eventType, label, requiresParticipant]) => (
              <button key={eventType} type="button" className={actionClass} disabled={disabled || (requiresParticipant && !participantId)} onClick={() => send(eventType, requiresParticipant ? { team_id: participantId } : {})}>
                {label}
              </button>
            ))}
            {controls.has("TIME_ADJUSTMENT") && (
              <button type="button" className={actionClass} disabled={disabled || !participantId || value === ""} onClick={() => send("TIME_ADJUSTMENT", { team_id: participantId, value: Number(value) })}>
                Adjust clock
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
