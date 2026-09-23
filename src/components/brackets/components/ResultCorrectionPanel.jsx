import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, FilePenLine, History } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import {
  createCorrectionRequest,
  getCorrectionContext,
  previewCorrection,
  submitCorrection,
} from "../../../services/resultCorrectionService";
import AppModal from "../../common/AppModal";
import {
  canShowCorrectionMutation,
  correctionErrorMessage,
  defaultCorrectionType,
  summarizeCorrectionImpact,
} from "../utils/resultCorrectionPresentation";

const inputClass = "mt-1 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20";
const correctionTypeLabels = {
  SCORE_CORRECTION: "Final score",
  WINNER_CORRECTION: "Winner",
  DISPOSITION_CORRECTION: "Forfeit, draw, or official outcome",
  PARTICIPANT_RESULT_CORRECTION: "Participant result",
  OFFICIAL_TIME_CORRECTION: "Official race time",
  PLACEMENT_CORRECTION: "Race placement",
  JUDGE_SCORECARD_CORRECTION: "Boxing scorecard",
  ARCHERY_RESULT_CORRECTION: "Archery result",
  BASEBALL_RESULT_CORRECTION: "Baseball result",
  CHESS_RESULT_CORRECTION: "Chess result",
};

const ResultCorrectionPanel = ({ match, completed = false }) => {
  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [draft, setDraft] = useState(null);
  const [preview, setPreview] = useState(null);
  const [reason, setReason] = useState("");
  const [supportingNote, setSupportingNote] = useState("");
  const [correctionType, setCorrectionType] = useState(() => defaultCorrectionType(match?.sport_name));
  const [score1, setScore1] = useState(0);
  const [score2, setScore2] = useState(0);
  const [winnerId, setWinnerId] = useState("");
  const [disposition, setDisposition] = useState("NORMAL");
  const [participantResults, setParticipantResults] = useState([]);
  const [judgeScorecards, setJudgeScorecards] = useState([
    { judge_number: 1, participant_a: 10, participant_b: 9 },
    { judge_number: 2, participant_a: 10, participant_b: 9 },
    { judge_number: 3, participant_a: 10, participant_b: 9 },
  ]);
  const location = useLocation();

  const participantOptions = useMemo(() => {
    const ids = context?.match?.participant_ids || [];
    return ids.map((id, index) => ({
      id: Number(id),
      label: String(
        match?.[`participant${index + 1}`]?.display_name
        || match?.[`team${index + 1}_name`]
        || match?.[`participant${index + 1}_label`]
        || `Participant ${index + 1}`
      ),
    }));
  }, [context?.match?.participant_ids, match]);

  useEffect(() => {
    if (!completed || !match?.id) return undefined;
    let active = true;
    setLoading(true);
    getCorrectionContext(match.id)
      .then((payload) => {
        if (!active) return;
        setContext(payload);
        setScore1(Number(payload?.current_result?.score_team1 || 0));
        setScore2(Number(payload?.current_result?.score_team2 || 0));
        setWinnerId(payload?.current_result?.winner_target_id || "");
        setDisposition(String(payload?.current_result?.disposition || "NORMAL"));
        const allowedTypes = payload?.capabilities?.allowed_correction_types || [];
        setCorrectionType((current) => allowedTypes.includes(current) ? current : (allowedTypes[0] || ""));
        setParticipantResults((payload?.match?.participant_ids || []).map((id, index) => ({
          participant_id: Number(id), lane: index + 1, official_time: "", status: "FINISHED", placement: index + 1,
        })));
      })
      .catch((requestError) => active && setError(correctionErrorMessage(requestError, "Correction information could not be loaded.")))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [completed, match?.id]);

  if (!completed) return null;

  const allowedCorrectionTypes = context?.capabilities?.allowed_correction_types || [];
  const canRequest = canShowCorrectionMutation({ completed, capability: context?.capabilities?.can_request }) && allowedCorrectionTypes.length > 0;
  const appliedHistory = context?.corrections || [];
  const isRace = ["OFFICIAL_TIME_CORRECTION", "PLACEMENT_CORRECTION", "PARTICIPANT_RESULT_CORRECTION"].includes(correctionType);
  const isOutcomeOnlyBoxing = correctionType === "DISPOSITION_CORRECTION"
    && String(context?.correction_schema?.engine_type || "").toUpperCase() !== "JUDGE_SCORECARD"
    && String(match?.sport_name || "").toUpperCase().includes("BOX");

  const buildChanges = () => {
    if (isRace) {
      return {
        participant_results: participantResults.map((row) => ({
          participant_id: Number(row.participant_id),
          lane: Number(row.lane),
          official_time: row.status === "FINISHED" ? Number(row.official_time) : null,
          status: row.status,
          placement: row.status === "FINISHED" ? Number(row.placement) : null,
        })),
      };
    }
    if (correctionType === "JUDGE_SCORECARD_CORRECTION") {
      return { judge_scorecards: judgeScorecards, decision_type: "OFFICIAL_DECISION", winner_target_id: Number(winnerId), disposition };
    }
    if (correctionType === "ARCHERY_RESULT_CORRECTION") {
      const mode = String(context?.correction_schema?.archery_mode || "CUMULATIVE_SCORE").toUpperCase();
      const totals = mode === "SET_MATCH"
        ? { set_points_a: Number(score1), set_points_b: Number(score2) }
        : { final_score_a: Number(score1), final_score_b: Number(score2) };
      return { result_payload: { mode, ...totals }, winner_target_id: Number(winnerId), disposition };
    }
    if (correctionType === "CHESS_RESULT_CORRECTION") {
      return { winner_target_id: disposition === "DRAW" ? null : Number(winnerId), disposition, result_reason: supportingNote || "Official review" };
    }
    const changes = {
      winner_target_id: disposition === "DRAW" ? null : Number(winnerId),
      disposition,
    };
    if (["SCORE_CORRECTION", "BASEBALL_RESULT_CORRECTION"].includes(correctionType)) {
      changes.score_team1 = Number(score1);
      changes.score_team2 = Number(score2);
    }
    if (correctionType === "BASEBALL_RESULT_CORRECTION") changes.innings = [];
    return changes;
  };

  const handleCreate = async () => {
    if (reason.trim().length < 3) {
      setError("Explain why the official result needs to be corrected.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const created = await createCorrectionRequest(match.id, {
        correction_type: correctionType,
        requested_changes: buildChanges(),
        reason: reason.trim(),
        supporting_note: supportingNote.trim() || null,
        source_match_state_version: Number(context?.state_version || 0),
      });
      setDraft(created);
      setPreview((await previewCorrection(created.id)).impact);
    } catch (requestError) {
      setError(correctionErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!draft) return;
    setSubmitting(true);
    setError("");
    try {
      const submitted = await submitCorrection(draft.id, draft.row_version);
      setDraft(submitted);
      setOpen(false);
      setReason("");
      setPreview(null);
    } catch (requestError) {
      setError(correctionErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-3 rounded-2xl bg-[var(--surface-soft)] p-4" aria-labelledby="result-correction-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="result-correction-heading" className="flex items-center gap-2 text-sm font-semibold text-[var(--text-main)]">
            <History size={16} aria-hidden="true" /> Official result history
          </h3>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Original scoring events remain preserved when an approved correction is applied.</p>
        </div>
        {canRequest ? (
          <div className="flex flex-wrap gap-2"><Link to={`${location.pathname.startsWith("/sport-facilitator") ? "/sport-facilitator" : "/coordinator"}/result-corrections`} className="inline-flex min-h-10 items-center rounded-xl border border-[var(--border-soft)] px-3 py-2 text-sm font-semibold text-[var(--text-main)]">Correction queue</Link><button
            type="button"
            onClick={() => { setDraft(null); setPreview(null); setOpen(true); }}
            disabled={loading}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FilePenLine size={16} aria-hidden="true" /> Request result correction
          </button></div>
        ) : null}
      </div>

      {appliedHistory.length > 0 ? appliedHistory.map((item) => (
        <div key={item.id} className="flex items-start gap-2 text-sm text-[var(--text-main)]">
          <CheckCircle2 size={16} className="mt-0.5 text-emerald-500" aria-hidden="true" />
          <div><p className="font-medium">Result corrected · Version {item.correction_version}</p><p className="text-xs text-[var(--text-muted)]">{item.public_message}</p></div>
        </div>
      )) : (
        <p className="text-xs text-[var(--text-muted)]">No result corrections have been applied.</p>
      )}
      {error && !open ? <p role="alert" className="text-sm text-rose-600 dark:text-rose-300">{error}</p> : null}

      <AppModal
        open={open}
        onClose={() => !submitting && setOpen(false)}
        title={preview ? "Review correction impact" : "Request result correction"}
        subtitle="The original Match history will not be changed or deleted."
        maxWidthClass="max-w-2xl"
      >
        {preview ? (
          <div className="space-y-5">
            <div>
              <h4 className="font-semibold text-[var(--text-main)]">This correction will:</h4>
              <ul className="mt-2 space-y-2 text-sm text-[var(--text-muted)]">
                {summarizeCorrectionImpact(preview).map((item) => <li key={item}>• {item}</li>)}
              </ul>
            </div>
            {(preview.blockers || []).length > 0 ? (
              <div role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-500/10 dark:text-rose-200">
                <p className="flex items-center gap-2 font-semibold"><AlertTriangle size={16} /> Automatic correction is blocked</p>
                {(preview.blockers || []).map((item) => <p key={item.code} className="mt-1">{item.message}</p>)}
              </div>
            ) : null}
            {error ? <p role="alert" className="text-sm text-rose-600 dark:text-rose-300">{error}</p> : null}
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setPreview(null)} disabled={submitting} className="rounded-xl border border-[var(--border-soft)] px-4 py-2 text-sm font-semibold text-[var(--text-main)]">Back</button>
              <button type="button" onClick={handleSubmit} disabled={submitting || (preview.blockers || []).length > 0} className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {submitting ? "Submitting…" : "Submit for review"}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={(event) => { event.preventDefault(); handleCreate(); }} className="space-y-5">
            <div>
              <label htmlFor="correction-type" className="text-sm font-medium text-[var(--text-main)]">Correction type</label>
              <select id="correction-type" value={correctionType} onChange={(event) => setCorrectionType(event.target.value)} className={inputClass}>
                {allowedCorrectionTypes.map((type) => <option key={type} value={type}>{correctionTypeLabels[type] || type}</option>)}
              </select>
            </div>

            {isRace ? (
              <div className="space-y-3">
                <p className="text-sm font-medium text-[var(--text-main)]">Corrected participant results</p>
                {participantResults.map((row, index) => (
                  <div key={row.participant_id} className="grid gap-3 sm:grid-cols-3">
                    <label className="text-sm text-[var(--text-muted)]">{participantOptions[index]?.label || `Participant ${index + 1}`}<input aria-label={`Official time for ${participantOptions[index]?.label || `participant ${index + 1}`}`} type="number" min="0" step="0.001" value={row.official_time} onChange={(event) => setParticipantResults((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, official_time: event.target.value } : item))} className={inputClass} /></label>
                    <label className="text-sm text-[var(--text-muted)]">Status<select value={row.status} onChange={(event) => setParticipantResults((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, status: event.target.value } : item))} className={inputClass}><option>FINISHED</option><option>DNS</option><option>DNF</option><option>DQ</option></select></label>
                    <label className="text-sm text-[var(--text-muted)]">Placement<input type="number" min="1" value={row.placement} onChange={(event) => setParticipantResults((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, placement: event.target.value } : item))} className={inputClass} /></label>
                  </div>
                ))}
              </div>
            ) : correctionType === "JUDGE_SCORECARD_CORRECTION" ? (
              <div className="space-y-3">
                <p className="text-sm font-medium text-[var(--text-main)]">Corrected judge scorecards</p>
                {judgeScorecards.map((card, index) => (
                  <div key={card.judge_number} className="grid gap-3 sm:grid-cols-3">
                    <p className="self-end pb-2 text-sm font-semibold text-[var(--text-main)]">Judge {card.judge_number}</p>
                    <label className="text-sm text-[var(--text-muted)]">Participant A<input aria-label={`Judge ${card.judge_number} score for participant A`} type="number" min="0" max="10" value={card.participant_a} onChange={(event) => setJudgeScorecards((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, participant_a: Number(event.target.value) } : item))} className={inputClass} /></label>
                    <label className="text-sm text-[var(--text-muted)]">Participant B<input aria-label={`Judge ${card.judge_number} score for participant B`} type="number" min="0" max="10" value={card.participant_b} onChange={(event) => setJudgeScorecards((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, participant_b: Number(event.target.value) } : item))} className={inputClass} /></label>
                  </div>
                ))}
                <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium text-[var(--text-main)]">Official outcome<select value={disposition} onChange={(event) => setDisposition(event.target.value)} className={inputClass}><option value="NORMAL">Official decision</option><option value="DISQUALIFICATION">Disqualification</option><option value="TECHNICAL_RESULT">Technical result</option></select></label><label className="text-sm font-medium text-[var(--text-main)]">Corrected winner<select value={winnerId} onChange={(event) => setWinnerId(event.target.value)} required className={inputClass}><option value="">Select participant</option>{participantOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label></div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {isOutcomeOnlyBoxing ? <p className="sm:col-span-2 rounded-xl bg-cyan-50 p-3 text-sm text-cyan-900 dark:bg-cyan-500/10 dark:text-cyan-100">This bout was decided by an official outcome such as a stoppage. A numeric score is not required; select the corrected outcome and winner.</p> : null}
                {!['WINNER_CORRECTION', 'DISPOSITION_CORRECTION', 'CHESS_RESULT_CORRECTION'].includes(correctionType) ? <><label className="text-sm font-medium text-[var(--text-main)]">Participant A final score<input type="number" min="0" value={score1} onChange={(event) => setScore1(event.target.value)} className={inputClass} /></label><label className="text-sm font-medium text-[var(--text-main)]">Participant B final score<input type="number" min="0" value={score2} onChange={(event) => setScore2(event.target.value)} className={inputClass} /></label></> : null}
                <label className="text-sm font-medium text-[var(--text-main)]">Official outcome<select value={disposition} onChange={(event) => setDisposition(event.target.value)} className={inputClass}><option value="NORMAL">Normal result</option><option value="DRAW">Draw</option><option value="FORFEIT">Forfeit</option><option value="WALKOVER">Walkover</option><option value="DISQUALIFICATION">Disqualification</option><option value="TECHNICAL_RESULT">Technical result</option></select></label>
                {disposition !== "DRAW" ? <label className="text-sm font-medium text-[var(--text-main)]">Corrected winner<select value={winnerId} onChange={(event) => setWinnerId(event.target.value)} required className={inputClass}><option value="">Select participant</option>{participantOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label> : null}
              </div>
            )}

            <label className="block text-sm font-medium text-[var(--text-main)]">Reason <span className="text-rose-500">*</span><textarea value={reason} onChange={(event) => setReason(event.target.value)} required minLength={3} rows={3} className={inputClass} placeholder="Explain what is incorrect and why the official result should change." /></label>
            <label className="block text-sm font-medium text-[var(--text-main)]">Supporting note <span className="font-normal text-[var(--text-muted)]">Optional</span><textarea value={supportingNote} onChange={(event) => setSupportingNote(event.target.value)} rows={2} className={inputClass} /></label>
            {error ? <p role="alert" className="text-sm text-rose-600 dark:text-rose-300">{error}</p> : null}
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} disabled={submitting} className="rounded-xl border border-[var(--border-soft)] px-4 py-2 text-sm font-semibold text-[var(--text-main)]">Cancel</button><button type="submit" disabled={submitting} className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{submitting ? "Preparing preview…" : "Review impact"}</button></div>
          </form>
        )}
      </AppModal>
    </section>
  );
};

export default ResultCorrectionPanel;
