import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Award,
  Check,
  ChevronDown,
  ChevronUp,
  Minus,
  Plus,
  Trophy,
  X,
} from "lucide-react";
import IdentityImage from "../../common/IdentityImage";
import { recordManualMatchResult } from "../../../services/matchEventService";

export default function ShortcutWinnerModal({
  isOpen,
  onClose,
  match,
  teamOptions = [],
  currentScoreTeam1 = 0,
  currentScoreTeam2 = 0,
  onSuccess,
}) {
  const participant1 = teamOptions[0] || null;
  const participant2 = teamOptions[1] || null;

  const [selectedWinnerId, setSelectedWinnerId] = useState(null);
  const [scoreTeam1, setScoreTeam1] = useState(0);
  const [scoreTeam2, setScoreTeam2] = useState(0);
  const [disposition, setDisposition] = useState("NORMAL");
  const [auditReason, setAuditReason] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Initialize or reset when modal opens or match changes
  useEffect(() => {
    if (isOpen) {
      const initialScore1 = Number(currentScoreTeam1 ?? match?.score_team1 ?? 0);
      const initialScore2 = Number(currentScoreTeam2 ?? match?.score_team2 ?? 0);
      setScoreTeam1(initialScore1);
      setScoreTeam2(initialScore2);
      setDisposition("NORMAL");
      setAuditReason("");
      setShowAdvanced(false);
      setErrorMessage("");

      // If one side was already leading, pre-select as winner
      if (initialScore1 > initialScore2 && participant1) {
        setSelectedWinnerId(participant1.id);
      } else if (initialScore2 > initialScore1 && participant2) {
        setSelectedWinnerId(participant2.id);
      } else {
        setSelectedWinnerId(null);
      }
    }
  }, [currentScoreTeam1, currentScoreTeam2, isOpen, match?.score_team1, match?.score_team2, participant1, participant2]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  const p1Name = participant1?.name || match?.team1_name || match?.participant1_label || "Team 1";
  const p2Name = participant2?.name || match?.team2_name || match?.participant2_label || "Team 2";

  const isWinner1 = participant1 && Number(selectedWinnerId) === Number(participant1.id);
  const isWinner2 = participant2 && Number(selectedWinnerId) === Number(participant2.id);

  // Score conflict validation
  const scoreWarning = useMemo(() => {
    if (disposition !== "NORMAL") return null;
    if (isWinner1 && Number(scoreTeam1) <= Number(scoreTeam2)) {
      return {
        side: 1,
        message: `${p1Name} is selected as winner, but their score (${scoreTeam1}) is not higher than ${p2Name} (${scoreTeam2}).`,
        suggestedScore: Number(scoreTeam2) + 1,
      };
    }
    if (isWinner2 && Number(scoreTeam2) <= Number(scoreTeam1)) {
      return {
        side: 2,
        message: `${p2Name} is selected as winner, but their score (${scoreTeam2}) is not higher than ${p1Name} (${scoreTeam1}).`,
        suggestedScore: Number(scoreTeam1) + 1,
      };
    }
    return null;
  }, [disposition, isWinner1, isWinner2, p1Name, p2Name, scoreTeam1, scoreTeam2]);

  const handleAutoAdjustScore = useCallback((side, targetScore) => {
    if (side === 1) {
      setScoreTeam1(targetScore);
    } else {
      setScoreTeam2(targetScore);
    }
    setErrorMessage("");
  }, []);

  const handleSelectWinner = useCallback((targetId) => {
    setSelectedWinnerId(targetId);
    setErrorMessage("");

    // If scores are 0-0 or tied, auto-nudge the winner to 1 if applicable
    if (participant1 && Number(targetId) === Number(participant1.id)) {
      if (Number(scoreTeam1) <= Number(scoreTeam2)) {
        setScoreTeam1(Math.max(1, Number(scoreTeam2) + 1));
      }
    } else if (participant2 && Number(targetId) === Number(participant2.id)) {
      if (Number(scoreTeam2) <= Number(scoreTeam1)) {
        setScoreTeam2(Math.max(1, Number(scoreTeam1) + 1));
      }
    }
  }, [participant1, participant2, scoreTeam1, scoreTeam2]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!match?.id) return;

    if (!selectedWinnerId && disposition !== "DRAW" && disposition !== "ABANDONMENT") {
      setErrorMessage("Please select a winning team or entry to continue.");
      return;
    }

    if (disposition === "NORMAL") {
      if (isWinner1 && Number(scoreTeam1) <= Number(scoreTeam2)) {
        setErrorMessage(`Winning score for ${p1Name} must be higher than ${p2Name}. Adjust score or select auto-adjust.`);
        return;
      }
      if (isWinner2 && Number(scoreTeam2) <= Number(scoreTeam1)) {
        setErrorMessage(`Winning score for ${p2Name} must be higher than ${p1Name}. Adjust score or select auto-adjust.`);
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const selectedTarget = teamOptions.find((t) => Number(t.id) === Number(selectedWinnerId));
      const payload = {
        score_team1: Math.max(0, Number(scoreTeam1) || 0),
        score_team2: Math.max(0, Number(scoreTeam2) || 0),
        disposition: disposition || "NORMAL",
        audit_reason: auditReason?.trim() || "Shortcut winner declared directly from tally board",
      };

      if (selectedTarget?.targetType === "ENTRY") {
        payload.winner_entry_id = Number(selectedTarget.id);
      } else if (selectedWinnerId) {
        payload.winner_team_id = Number(selectedWinnerId);
      }

      const result = await recordManualMatchResult(match.id, payload);
      onSuccess?.(result, {
        winnerName: isWinner1 ? p1Name : isWinner2 ? p2Name : "Draw",
        score1: payload.score_team1,
        score2: payload.score_team2,
      });
      onClose?.();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const message = typeof detail === "string" ? detail : (detail?.message || err?.message || "Failed to record winner.");
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcut-winner-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={() => !isSubmitting && onClose?.()}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-3xl border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--text-main)] shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Trophy size={20} aria-hidden="true" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="shortcut-winner-title" className="text-base font-bold sm:text-lg">
                  Declare Match Winner
                </h2>
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  Shortcut
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                Directly finalize the match and set official score
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-1.5 text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-main)] disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="max-h-[75vh] overflow-y-auto px-5 py-4 space-y-4 sm:px-6 sm:py-5">
          {/* Informational banner */}
          <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3 text-xs leading-relaxed text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
            Use this shortcut when the live tally board was not used and the match is concluded. Select the winner and enter the final score to advance bracket progression.
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs font-semibold text-rose-800 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
              {errorMessage}
            </div>
          )}

          {/* 1. Winner Selection Cards */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              1. Select Winning Team or Entry <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* Participant 1 Card */}
              <button
                type="button"
                onClick={() => participant1 && handleSelectWinner(participant1.id)}
                disabled={!participant1 || isSubmitting}
                className={`relative flex flex-col items-center justify-between rounded-2xl border p-4 text-center transition ${
                  isWinner1
                    ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/30"
                    : "border-[var(--border-soft)] bg-[var(--surface-soft)] hover:border-[var(--border-main)] hover:bg-[var(--surface-muted)]"
                }`}
              >
                {isWinner1 && (
                  <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                    <Check size={11} /> Winner
                  </span>
                )}
                <div className="mb-3 flex flex-col items-center">
                  <IdentityImage
                    imageUrl={participant1?.logoUrl}
                    label={p1Name}
                    kind="logo"
                    scale="md"
                    className="mb-2"
                  />
                  <p className="line-clamp-2 text-sm font-bold text-[var(--text-main)]" title={p1Name}>
                    {p1Name}
                  </p>
                  <span className="mt-0.5 text-[11px] font-semibold text-[var(--text-muted)]">
                    Side A {participant1?.targetType === "ENTRY" ? "· Entry" : "· Team"}
                  </span>
                </div>
                <div
                  className={`w-full rounded-xl py-1.5 text-xs font-bold transition ${
                    isWinner1
                      ? "bg-emerald-600 text-white"
                      : "border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--text-main)]"
                  }`}
                >
                  {isWinner1 ? "Winner Selected" : "Select as Winner"}
                </div>
              </button>

              {/* Participant 2 Card */}
              <button
                type="button"
                onClick={() => participant2 && handleSelectWinner(participant2.id)}
                disabled={!participant2 || isSubmitting}
                className={`relative flex flex-col items-center justify-between rounded-2xl border p-4 text-center transition ${
                  isWinner2
                    ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/30"
                    : "border-[var(--border-soft)] bg-[var(--surface-soft)] hover:border-[var(--border-main)] hover:bg-[var(--surface-muted)]"
                }`}
              >
                {isWinner2 && (
                  <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                    <Check size={11} /> Winner
                  </span>
                )}
                <div className="mb-3 flex flex-col items-center">
                  <IdentityImage
                    imageUrl={participant2?.logoUrl}
                    label={p2Name}
                    kind="logo"
                    scale="md"
                    className="mb-2"
                  />
                  <p className="line-clamp-2 text-sm font-bold text-[var(--text-main)]" title={p2Name}>
                    {p2Name}
                  </p>
                  <span className="mt-0.5 text-[11px] font-semibold text-[var(--text-muted)]">
                    Side B {participant2?.targetType === "ENTRY" ? "· Entry" : "· Team"}
                  </span>
                </div>
                <div
                  className={`w-full rounded-xl py-1.5 text-xs font-bold transition ${
                    isWinner2
                      ? "bg-emerald-600 text-white"
                      : "border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--text-main)]"
                  }`}
                >
                  {isWinner2 ? "Winner Selected" : "Select as Winner"}
                </div>
              </button>
            </div>
          </div>

          {/* 2. Manual Final Score Entry */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              2. Final Score
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* Score Team 1 */}
              <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-3">
                <span className="block truncate text-xs font-bold text-[var(--text-main)]" title={p1Name}>
                  {p1Name} Score
                </span>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setScoreTeam1((prev) => Math.max(0, Number(prev || 0) - 1))}
                    disabled={isSubmitting || Number(scoreTeam1) <= 0}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--text-main)] hover:bg-[var(--surface-muted)] disabled:opacity-40"
                    aria-label={`Decrease ${p1Name} score`}
                  >
                    <Minus size={14} />
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={scoreTeam1}
                    onChange={(e) => setScoreTeam1(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    disabled={isSubmitting}
                    className="h-10 w-24 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-2 text-center font-mono text-xl font-black text-[var(--text-main)] focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={() => setScoreTeam1((prev) => Math.max(0, Number(prev || 0) + 1))}
                    disabled={isSubmitting}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--text-main)] hover:bg-[var(--surface-muted)]"
                    aria-label={`Increase ${p1Name} score`}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* Score Team 2 */}
              <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-3">
                <span className="block truncate text-xs font-bold text-[var(--text-main)]" title={p2Name}>
                  {p2Name} Score
                </span>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setScoreTeam2((prev) => Math.max(0, Number(prev || 0) - 1))}
                    disabled={isSubmitting || Number(scoreTeam2) <= 0}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--text-main)] hover:bg-[var(--surface-muted)] disabled:opacity-40"
                    aria-label={`Decrease ${p2Name} score`}
                  >
                    <Minus size={14} />
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={scoreTeam2}
                    onChange={(e) => setScoreTeam2(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    disabled={isSubmitting}
                    className="h-10 w-24 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-2 text-center font-mono text-xl font-black text-[var(--text-main)] focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={() => setScoreTeam2((prev) => Math.max(0, Number(prev || 0) + 1))}
                    disabled={isSubmitting}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--text-main)] hover:bg-[var(--surface-muted)]"
                    aria-label={`Increase ${p2Name} score`}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Score validation warning & auto-fix prompt */}
            {scoreWarning && (
              <div className="mt-2 flex flex-col gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 sm:flex-row sm:items-center sm:justify-between dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={15} className="shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>{scoreWarning.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleAutoAdjustScore(scoreWarning.side, scoreWarning.suggestedScore)}
                  className="shrink-0 rounded-lg bg-amber-600 px-2.5 py-1 text-xs font-bold text-white transition hover:bg-amber-700"
                >
                  Auto-adjust to {scoreWarning.suggestedScore}
                </button>
              </div>
            )}
          </div>

          {/* 3. Advanced Settings Accordion (Disposition & Reason) */}
          <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-soft)]">
            <button
              type="button"
              onClick={() => setShowAdvanced((prev) => !prev)}
              className="flex w-full items-center justify-between p-3.5 text-xs font-bold text-[var(--text-main)] hover:bg-[var(--surface-muted)] rounded-2xl"
            >
              <span>Optional: Match Result Type & Notes</span>
              {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showAdvanced && (
              <div className="border-t border-[var(--border-soft)] p-3.5 space-y-3 text-xs">
                <div>
                  <label className="mb-1 block font-semibold text-[var(--text-muted)]">
                    Result Disposition
                  </label>
                  <select
                    value={disposition}
                    onChange={(e) => setDisposition(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-2 font-medium text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  >
                    <option value="NORMAL">Normal Finish</option>
                    <option value="FORFEIT">Forfeit</option>
                    <option value="WALKOVER">Walkover</option>
                    <option value="NO_SHOW">No Show</option>
                    <option value="DISQUALIFICATION">Disqualification</option>
                    <option value="TECHNICAL_RESULT">Technical Result</option>
                    <option value="DRAW">Draw / Tie</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-[var(--text-muted)]">
                    Audit Note / Reason (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={300}
                    placeholder="e.g. Match concluded offline; official scores recorded directly."
                    value={auditReason}
                    onChange={(e) => setAuditReason(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-2 font-medium text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-[var(--border-soft)]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="min-h-10 rounded-xl border border-[var(--border-soft)] px-4 text-xs font-semibold hover:bg-[var(--surface-muted)] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (!selectedWinnerId && disposition !== "DRAW" && disposition !== "ABANDONMENT")}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-xs font-bold text-white shadow-md transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Award size={15} />
              {isSubmitting ? "Finalizing Match…" : "Finalize Match & Save Winner"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
