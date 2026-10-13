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
  if (engineType === "WIN_LOSS") {
    const white = participants.find((row) => Number(row.teamId) === Number(state?.white_participant_id)) || participants?.[0];
    const black = participants.find((row) => Number(row.teamId) === Number(state?.black_participant_id)) || participants?.[1];
    const whitePts = Number(state?.result_points?.[String(white?.teamId)] ?? 0);
    const blackPts = Number(state?.result_points?.[String(black?.teamId)] ?? 0);
    const reason = state?.result_reason ? state.result_reason.replaceAll("_", " ") : "Pending";
    return (
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className={stateCellClass}>
          <p className="text-xs font-semibold text-[var(--text-muted)]">♔ White: {white?.label || "Player 1"}</p>
          <p className="mt-1 text-2xl font-black tabular-nums text-[var(--text-main)]">{whitePts} pts</p>
        </div>
        <div className={stateCellClass}>
          <p className="text-xs font-semibold text-[var(--text-muted)]">♚ Black: {black?.label || "Player 2"}</p>
          <p className="mt-1 text-2xl font-black tabular-nums text-[var(--text-main)]">{blackPts} pts</p>
        </div>
        {state?.result_reason ? (
          <div className={`${stateCellClass} sm:col-span-2 text-center`}>
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Official Outcome</p>
            <p className="mt-0.5 text-base font-bold text-cyan-600 dark:text-cyan-400 capitalize">{reason}</p>
          </div>
        ) : null}
      </div>
    );
  }
  const rows = {
    JUDGE_SCORECARD: [["Round", state?.current_round || 1], ["Scorecards", Object.keys(state?.scorecards || {}).length]],
    COUNT_OR_TARGET: [["Mode", state?.mode || "—"], ["End", state?.current_end || 1]],
    INNING: [["Inning", state?.inning || 1], ["Half", state?.half || "TOP"], ["Balls", state?.balls || 0], ["Strikes", state?.strikes || 0], ["Outs", state?.outs || 0]],
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
  const [chessMethod, setChessMethod] = useState("CHECKMATE");
  const [swappedColors, setSwappedColors] = useState(false);
  const [tiebreakRematchActive, setTiebreakRematchActive] = useState(false);
  const [confirmDrawActive, setConfirmDrawActive] = useState(false);
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

      {engineType === "WIN_LOSS" && (() => {
        const whiteParticipant = swappedColors
          ? (participants.find((row) => Number(row.teamId) === Number(state?.black_participant_id)) || second)
          : (participants.find((row) => Number(row.teamId) === Number(state?.white_participant_id)) || first);

        const blackParticipant = swappedColors
          ? (participants.find((row) => Number(row.teamId) === Number(state?.white_participant_id)) || first)
          : (participants.find((row) => Number(row.teamId) === Number(state?.black_participant_id)) || second);

        const whiteId = Number(whiteParticipant?.teamId || 0);
        const blackId = Number(blackParticipant?.teamId || 0);
        const whitePts = Number(state?.result_points?.[String(whiteId)] || 0);
        const blackPts = Number(state?.result_points?.[String(blackId)] || 0);
        const whiteIllegalMoves = Number(state?.illegal_moves?.[String(whiteId)] || 0);
        const blackIllegalMoves = Number(state?.illegal_moves?.[String(blackId)] || 0);

        const winActionType = controls.has(chessMethod)
          ? chessMethod
          : controls.has("RESULT_CONFIRMED")
            ? "RESULT_CONFIRMED"
            : "CHECKMATE";

        return (
          <div className="mt-3 space-y-3">
            {/* Sudden-Death Tiebreak Rematch Notice */}
            {tiebreakRematchActive && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold flex items-center gap-1.5">
                    <span>🤝</span> Sudden-Death Tiebreak / Rematch in Progress
                  </p>
                  <p className="text-xs text-amber-800 dark:text-amber-200 mt-0.5">
                    Game ended in a draw. Play the tiebreak game on the board, then declare the winner below.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSwappedColors((prev) => !prev)}
                  className="rounded-lg border border-amber-400 bg-white px-2.5 py-1 text-xs font-semibold text-amber-900 shadow-xs hover:bg-amber-50 dark:border-amber-600 dark:bg-slate-900 dark:text-amber-200"
                >
                  Swap Colors ({swappedColors ? "Swapped" : "Standard"})
                </button>
              </div>
            )}

            {/* Two Main Player Cards: White vs Black */}
            <div className="grid gap-3 sm:grid-cols-2">
              {/* White Player Card */}
              <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-black uppercase tracking-wider text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
                      ♔ White
                    </span>
                    {whiteIllegalMoves > 0 && (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                        {whiteIllegalMoves} Illegal Move{whiteIllegalMoves > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <h4 className="mt-2 text-base font-bold text-slate-900 dark:text-white truncate">
                    {whiteParticipant?.label || "Player 1"}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Score: {whitePts} pts</p>
                </div>

                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={disabled || !whiteId}
                    onClick={() => send(winActionType, { team_id: whiteId })}
                    className="min-h-11 w-full rounded-xl bg-cyan-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-cyan-500 disabled:opacity-50"
                  >
                    🏆 White Wins (1 – 0)
                  </button>
                  {controls.has("ILLEGAL_MOVE") && (
                    <button
                      type="button"
                      disabled={disabled || !whiteId}
                      onClick={() => send("ILLEGAL_MOVE", { team_id: whiteId })}
                      className="text-[11px] font-semibold text-slate-500 hover:text-rose-600 dark:text-slate-400 py-0.5"
                    >
                      +1 Illegal Move Penalty
                    </button>
                  )}
                </div>
              </div>

              {/* Black Player Card */}
              <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900 px-2.5 py-0.5 text-xs font-black uppercase tracking-wider text-slate-100 dark:border-slate-500 dark:bg-slate-950 dark:text-slate-200">
                      ♚ Black
                    </span>
                    {blackIllegalMoves > 0 && (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                        {blackIllegalMoves} Illegal Move{blackIllegalMoves > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <h4 className="mt-2 text-base font-bold text-slate-900 dark:text-white truncate">
                    {blackParticipant?.label || "Player 2"}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Score: {blackPts} pts</p>
                </div>

                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={disabled || !blackId}
                    onClick={() => send(winActionType, { team_id: blackId })}
                    className="min-h-11 w-full rounded-xl bg-slate-800 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-700 dark:hover:bg-slate-600"
                  >
                    🏆 Black Wins (0 – 1)
                  </button>
                  {controls.has("ILLEGAL_MOVE") && (
                    <button
                      type="button"
                      disabled={disabled || !blackId}
                      onClick={() => send("ILLEGAL_MOVE", { team_id: blackId })}
                      className="text-[11px] font-semibold text-slate-500 hover:text-rose-600 dark:text-slate-400 py-0.5"
                    >
                      +1 Illegal Move Penalty
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Victory Method Option & Draw Options */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[var(--surface-soft)] p-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[var(--text-muted)]">Win Method:</span>
                <select
                  value={chessMethod}
                  onChange={(e) => setChessMethod(e.target.value)}
                  disabled={disabled}
                  className="rounded-lg border border-[var(--border-soft)] bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 outline-none dark:bg-slate-950 dark:text-slate-200"
                >
                  {controls.has("CHECKMATE") && <option value="CHECKMATE">Checkmate</option>}
                  {controls.has("RESIGNATION") && <option value="RESIGNATION">Resignation</option>}
                  {controls.has("TIME_FORFEIT") && <option value="TIME_FORFEIT">Win on Time</option>}
                  {controls.has("WALKOVER") && <option value="WALKOVER">Walkover</option>}
                  {controls.has("RESULT_CONFIRMED") && <option value="RESULT_CONFIRMED">General Win</option>}
                </select>
              </div>

              {/* Draw & Rematch Controls */}
              <div className="flex flex-wrap items-center gap-2">
                {!tiebreakRematchActive ? (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      setTiebreakRematchActive(true);
                      setConfirmDrawActive(false);
                    }}
                    className="min-h-9 rounded-lg border border-amber-300 bg-amber-50 px-3 text-xs font-bold text-amber-900 transition hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
                  >
                    🤝 Game Draw → Start Tiebreak Rematch
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setTiebreakRematchActive(false)}
                    className="min-h-9 rounded-lg border border-[var(--border-soft)] px-3 text-xs font-semibold hover:bg-[var(--surface-muted)]"
                  >
                    Exit Rematch Mode
                  </button>
                )}

                {/* Finalize as 0 - 0 Draw (for Round Robin tournaments) */}
                {confirmDrawActive ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                      Conclude as 0–0 Draw?
                    </span>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        const drawType = controls.has("DRAW_AGREED") ? "DRAW_AGREED" : "STALEMATE";
                        send(drawType);
                        setConfirmDrawActive(false);
                      }}
                      className="rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-rose-500"
                    >
                      Yes, Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDrawActive(false)}
                      className="rounded-lg border border-[var(--border-soft)] px-2 py-1 text-xs hover:bg-[var(--surface-muted)]"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={disabled || (!controls.has("DRAW_AGREED") && !controls.has("STALEMATE"))}
                    onClick={() => setConfirmDrawActive(true)}
                    className="min-h-9 rounded-lg border border-[var(--border-soft)] px-3 text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"
                  >
                    Finalize Match as Draw (0 – 0)
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </section>
  );
}
