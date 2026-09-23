import { useEffect, useState } from "react";
import { CircleDot, Timer } from "lucide-react";

import IdentityImage from "../common/IdentityImage";

const dictionaryValue = (dictionary, key, fallback = 0) => {
  if (!dictionary || key == null) return fallback;
  return dictionary[String(key)] ?? dictionary[key] ?? fallback;
};

const formatClock = (seconds) => {
  const value = Math.max(0, Number(seconds || 0));
  const minutes = Math.floor(value / 60);
  return `${String(minutes).padStart(2, "0")}:${String(Math.floor(value % 60)).padStart(2, "0")}`;
};

const useViewerClock = (clock) => {
  const canonical = Number(clock?.remaining_seconds || 0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!clock?.running) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [clock?.running]);

  const observed = Date.parse(clock?.observed_at || "");
  const anchor = Number.isFinite(observed) ? observed : now;
  const elapsed = clock?.running ? Math.max(0, Math.floor((now - anchor) / 1000)) : 0;
  const remaining = Math.max(0, canonical - elapsed);
  return formatClock(remaining);
};

const ParticipantIdentity = ({ participant, align = "left", compact = false }) => (
  <div className={`min-w-0 ${align === "right" ? "text-right" : "text-left"}`}>
    <IdentityImage
      imageUrl={participant?.effective_logo_url}
      label={participant?.display_name || "Participant"}
      kind="logo"
      scale={compact ? "lg" : "xl"}
      className={`mb-3 !h-16 !w-16 sm:!h-20 sm:!w-20 ${align === "right" ? "ml-auto" : "mr-auto"}`}
    />
    <h2 className="break-words text-base font-black leading-tight text-[var(--text-strong)] sm:text-xl">
      {participant?.display_name || "TBD"}
    </h2>
    {participant?.department?.code || participant?.department?.name ? (
      <p className="mt-1 break-words text-xs font-medium text-[var(--text-muted)] sm:text-sm">
        {participant.department.code || participant.department.name}
      </p>
    ) : null}
    {participant?.participant_shape === "DUO" && participant?.members?.length ? (
      <p className="mt-1 break-words text-xs text-[var(--text-muted)]">
        {participant.members.map((member) => member.display_name).join(" · ")}
      </p>
    ) : null}
  </div>
);

const ScoreValue = ({ value, label }) => {
  return (
    <span
      key={String(value ?? "")}
      className="viewer-score-change rounded-xl px-2 py-1 text-5xl font-black tabular-nums tracking-tight text-[var(--text-strong)] sm:text-7xl"
      aria-label={`${label}: ${value ?? 0}`}
    >
      {value ?? 0}
    </span>
  );
};

const TwoSidedShell = ({ participants, center, below }) => (
  <section aria-label="Match scoreboard" className="rounded-[1.75rem] border border-[var(--border-soft)] bg-[var(--surface-card)] px-4 py-7 shadow-sm sm:px-8 sm:py-9">
    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-8">
      <ParticipantIdentity participant={participants?.[0]} />
      <div className="flex min-w-[7rem] flex-col items-center justify-center text-center sm:min-w-[13rem]">{center}</div>
      <ParticipantIdentity participant={participants?.[1]} align="right" />
    </div>
    {below ? <div className="mt-7 border-t border-[var(--border-soft)] pt-5">{below}</div> : null}
  </section>
);

export const TimedScoreboard = ({ presentation, participants }) => {
  const score = presentation?.score || {};
  const clock = useViewerClock(presentation?.clock);
  const segment = presentation?.segment;
  const counters = presentation?.counters || {};
  return (
    <TwoSidedShell
      participants={participants}
      center={presentation?.show_score ? (
        <>
          <div className="flex items-center gap-1 sm:gap-3">
            <ScoreValue value={score.participant1} label={participants?.[0]?.display_name} />
            <span aria-hidden="true" className="text-3xl font-black text-[var(--text-muted)] sm:text-5xl">/</span>
            <ScoreValue value={score.participant2} label={participants?.[1]?.display_name} />
          </div>
          {presentation?.clock ? <p className="mt-3 flex items-center gap-1.5 text-xl font-bold tabular-nums text-[var(--text-strong)]"><Timer size={18} aria-hidden="true" />{clock}</p> : null}
          {segment ? <p className="mt-1 text-sm font-bold uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">{segment.label} {segment.index}</p> : null}
        </>
      ) : (
        <p className="max-w-36 text-sm font-semibold text-[var(--text-muted)]">Official scoring begins when the Match starts.</p>
      )}
      below={presentation?.show_score ? (
        <div className="grid grid-cols-2 gap-5 text-sm">
          {[0, 1].map((index) => {
            const values = counters[String(index + 1)] || {};
            return (
              <div key={index} className={index === 1 ? "text-right" : "text-left"}>
                {Object.entries(values).map(([label, value]) => (
                  <span key={label} className="mr-4 inline-flex gap-1 text-[var(--text-muted)] last:mr-0"><span className="capitalize">{label.replaceAll("_", " ")}</span><strong className="text-[var(--text-strong)]">{value}</strong></span>
                ))}
                {presentation?.possession_side === index + 1 ? <span className="inline-flex items-center gap-1 font-bold text-cyan-700 dark:text-cyan-300"><CircleDot size={14} aria-hidden="true" />Possession</span> : null}
              </div>
            );
          })}
        </div>
      ) : null}
    />
  );
};

export const SetGameScoreboard = ({ presentation, participants, rules }) => {
  const score = presentation?.score || {};
  const sets = presentation?.set_state?.sets_won || {};
  const targets = participants.map((participant) => participant.scoring_target_id);
  return (
    <TwoSidedShell
      participants={participants}
      center={presentation?.show_score ? (
        <>
          <div className="flex items-center gap-1 sm:gap-3">
            <ScoreValue value={score.participant1} label={participants?.[0]?.display_name} />
            <span aria-hidden="true" className="text-3xl font-black text-[var(--text-muted)] sm:text-5xl">/</span>
            <ScoreValue value={score.participant2} label={participants?.[1]?.display_name} />
          </div>
          <p className="mt-2 text-sm font-black uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">{presentation?.segment?.label || "Set"} {presentation?.segment?.index || 1}</p>
          <p className="mt-2 text-sm text-[var(--text-muted)]">Sets {dictionaryValue(sets, targets[0])} / {dictionaryValue(sets, targets[1])}</p>
        </>
      ) : <p className="text-sm font-semibold text-[var(--text-muted)]">Awaiting the first serve.</p>}
      below={presentation?.show_score ? (
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-[var(--text-muted)] sm:text-sm">
          {presentation?.service?.server_side ? <span>Serving: <strong className="text-[var(--text-strong)]">{participants[presentation.service.server_side - 1]?.display_name}</strong></span> : null}
          {rules?.score_to_win || rules?.target_score ? <span>Target {rules.score_to_win || rules.target_score}</span> : null}
          {rules?.deciding_set_target ? <span>Deciding target {rules.deciding_set_target}</span> : null}
          {rules?.win_by ? <span>Win by {rules.win_by}</span> : null}
          {rules?.score_cap ? <span>Cap {rules.score_cap}</span> : null}
        </div>
      ) : null}
    />
  );
};

export const TennisScoreboard = ({ presentation, participants }) => {
  const tennis = presentation?.tennis_state || {};
  const targets = participants.map((participant) => participant.scoring_target_id);
  return (
    <section aria-label="Tennis scoreboard" className="overflow-hidden rounded-[1.75rem] border border-[var(--border-soft)] bg-[var(--surface-card)] shadow-sm">
      <div className="grid grid-cols-[minmax(0,1fr)_3.5rem_3.5rem_4rem] border-b border-[var(--border-soft)] px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] sm:grid-cols-[minmax(0,1fr)_5rem_5rem_6rem] sm:px-7">
        <span className="text-left">Participant</span><span>Sets</span><span>Games</span><span>Points</span>
      </div>
      {participants.map((participant, index) => {
        const target = targets[index];
        const serving = Number(tennis.server_participant_id) === Number(target);
        return (
          <div key={participant.side} className="grid grid-cols-[minmax(0,1fr)_3.5rem_3.5rem_4rem] items-center border-b border-[var(--border-soft)] px-4 py-5 text-center last:border-b-0 sm:grid-cols-[minmax(0,1fr)_5rem_5rem_6rem] sm:px-7">
            <div className="flex min-w-0 items-center gap-3 text-left">
              <IdentityImage imageUrl={participant.effective_logo_url} label={participant.display_name} kind="logo" scale="md" className="shrink-0" />
              <span className="min-w-0 break-words font-bold text-[var(--text-strong)]">{participant.display_name}</span>
              {serving ? <CircleDot size={14} className="shrink-0 text-cyan-600" aria-label="Serving" /> : null}
            </div>
            <strong>{dictionaryValue(tennis.sets, target)}</strong>
            <strong>{dictionaryValue(tennis.games, target)}</strong>
            <strong className="text-2xl text-[var(--text-strong)]">{dictionaryValue(tennis.points, target, "0")}</strong>
          </div>
        );
      })}
      {(tennis.in_tiebreak || tennis.match_tiebreak) ? <p className="border-t border-[var(--border-soft)] px-5 py-3 text-center text-sm font-semibold text-cyan-700 dark:text-cyan-300">{tennis.match_tiebreak ? "Match tie-break" : "Tie-break"}</p> : null}
    </section>
  );
};

export const RoundJudgedBoard = ({ presentation, participants }) => {
  const boxing = presentation?.boxing_state || {};
  const clock = useViewerClock(presentation?.clock);
  const scores = boxing.judge_totals || {};
  return (
    <TwoSidedShell
      participants={participants}
      center={presentation?.show_score ? (
        <>
          <div className="flex items-center gap-1 sm:gap-3"><ScoreValue value={scores["1"] ?? 0} label={participants?.[0]?.display_name} /><span className="text-3xl font-black text-[var(--text-muted)] sm:text-5xl">/</span><ScoreValue value={scores["2"] ?? 0} label={participants?.[1]?.display_name} /></div>
          {presentation?.clock ? <p className="mt-3 text-xl font-bold tabular-nums">{clock}</p> : null}
          <p className="mt-1 text-sm font-bold uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">Round {boxing.current_round || 1}</p>
        </>
      ) : <p className="text-sm font-semibold text-[var(--text-muted)]">Official scorecards will appear after the Match starts.</p>}
      below={<div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-[var(--text-muted)]"><span>Deductions {boxing.deductions?.["1"] || 0} / {boxing.deductions?.["2"] || 0}</span><span>Warnings {boxing.warnings?.["1"] || 0} / {boxing.warnings?.["2"] || 0}</span>{boxing.decision_type ? <strong>{boxing.decision_type.replaceAll("_", " ")}</strong> : null}{boxing.stoppage_type ? <strong>{boxing.stoppage_type.replaceAll("_", " ")}</strong> : null}</div>}
    />
  );
};

export const InningScoreboard = ({ presentation, participants }) => {
  const baseball = presentation?.baseball_state || {};
  const targets = participants.map((participant) => participant.scoring_target_id);
  const columns = [{ key: "runs", label: "R" }, { key: "hits", label: "H" }, { key: "errors", label: "E" }];
  return (
    <section aria-label="Inning scoreboard" className="rounded-[1.75rem] border border-[var(--border-soft)] bg-[var(--surface-card)] p-4 shadow-sm sm:p-7">
      <div className="mb-6 text-center"><p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">{baseball.half || "TOP"} {baseball.inning || 1}</p><p className="mt-1 text-sm text-[var(--text-muted)]">Balls {baseball.balls || 0} · Strikes {baseball.strikes || 0} · Outs {baseball.outs || 0}</p></div>
      <div role="table" aria-label="Runs, hits, and errors">
        <div role="row" className="grid grid-cols-[minmax(0,1fr)_3rem_3rem_3rem] px-2 pb-2 text-center text-xs font-bold text-[var(--text-muted)]"><span role="columnheader" className="text-left">Participant</span>{columns.map((column) => <span role="columnheader" key={column.key}>{column.label}</span>)}</div>
        {participants.map((participant, index) => <div role="row" key={participant.side} className="grid grid-cols-[minmax(0,1fr)_3rem_3rem_3rem] items-center border-t border-[var(--border-soft)] px-2 py-4 text-center"><span role="rowheader" className="flex min-w-0 items-center gap-3 text-left font-bold"><IdentityImage imageUrl={participant.effective_logo_url} label={participant.display_name} scale="md" kind="logo" className="shrink-0" /><span className="break-words">{participant.display_name}</span></span>{columns.map((column) => <strong role="cell" key={column.key} className={column.key === "runs" ? "text-2xl" : ""}>{dictionaryValue(baseball[column.key], targets[index])}</strong>)}</div>)}
      </div>
    </section>
  );
};

export const ResultBoard = ({ presentation, participants }) => {
  const targets = participants.map((participant) => participant.scoring_target_id);
  const race = presentation?.race_state || {};
  const archery = presentation?.archery_state || {};
  const chess = presentation?.chess_state || {};
  const boxing = presentation?.boxing_state || {};
  const rows = participants.map((participant, index) => {
    const target = targets[index];
    const raceResult = dictionaryValue(race.results, target, {});
    let primary = null;
    let secondary = null;
    if (race.results) {
      primary = raceResult.official_time != null ? `${raceResult.official_time}s` : raceResult.status || "—";
      secondary = raceResult.placement ? `Place ${raceResult.placement}` : raceResult.record_classification;
    } else if (archery.totals) {
      primary = dictionaryValue(archery.mode === "SET_MATCH" ? archery.set_points : archery.totals, target);
      secondary = archery.mode === "SET_MATCH" ? "Set points" : "Total";
    } else if (chess.result_points) {
      primary = dictionaryValue(chess.result_points, target);
      secondary = chess.result_reason?.replaceAll("_", " ") || "Result points";
    } else if (boxing.judge_totals) {
      primary = boxing.judge_totals[String(index + 1)] ?? 0;
      secondary = "Judge total";
    }
    return { participant, primary, secondary, placement: raceResult.placement };
  });
  return (
    <section aria-label="Official result board" className="rounded-[1.75rem] border border-[var(--border-soft)] bg-[var(--surface-card)] p-4 shadow-sm sm:p-7">
      <div className="space-y-3">
        {rows.map(({ participant, primary, secondary, placement }) => (
          <article key={participant.side} className="flex items-center gap-4 rounded-2xl bg-[var(--surface-muted)] px-4 py-4 sm:px-5">
            {placement ? <span className="w-7 text-center text-lg font-black text-cyan-700 dark:text-cyan-300">{placement}</span> : null}
            <IdentityImage imageUrl={participant.effective_logo_url} label={participant.display_name} kind="logo" scale="lg" className="shrink-0" />
            <div className="min-w-0 flex-1"><h2 className="break-words font-bold text-[var(--text-strong)]">{participant.display_name}</h2><p className="text-sm text-[var(--text-muted)]">{participant.department?.code || participant.department?.name}</p></div>
            <div className="text-right"><p className="text-2xl font-black tabular-nums text-[var(--text-strong)]">{primary ?? "—"}</p>{secondary ? <p className="text-xs font-medium uppercase text-[var(--text-muted)]">{secondary}</p> : null}</div>
          </article>
        ))}
      </div>
    </section>
  );
};

const FAMILY_COMPONENTS = {
  TIMED_TWO_SIDED: TimedScoreboard,
  SET_GAME_TWO_SIDED: SetGameScoreboard,
  TENNIS_HIERARCHICAL: TennisScoreboard,
  ROUND_JUDGED: RoundJudgedBoard,
  INNING_SCOREBOARD: InningScoreboard,
  RESULT_BOARD: ResultBoard,
};

const MatchPresentation = (props) => {
  const Component = FAMILY_COMPONENTS[props.presentation?.family] || TimedScoreboard;
  return <Component {...props} />;
};

export default MatchPresentation;
