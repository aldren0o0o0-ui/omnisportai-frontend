import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronRight,
  Info,
  Loader2,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import {
  confirmRoleCarryover,
  getRoleCarryoverPreview,
} from "../../services/intramuralService";

export default function RoleCarryoverBanner({ workspaceId, onConfirmed }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Selections inside the review modal
  const [selectedFacilitatorIds, setSelectedFacilitatorIds] = useState(new Set());
  const [selectedCoachKeys, setSelectedCoachKeys] = useState(new Set());

  const loadPreview = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError("");
    try {
      const data = await getRoleCarryoverPreview(workspaceId);
      setPreview(data);

      // Pre-select all active users
      if (data?.proposed_facilitators) {
        setSelectedFacilitatorIds(
          new Set(
            data.proposed_facilitators
              .filter((f) => f.is_active)
              .map((f) => f.user_id)
          )
        );
      }
      if (data?.proposed_coaches) {
        setSelectedCoachKeys(
          new Set(
            data.proposed_coaches
              .filter((c) => c.is_active)
              .map((c) => `${c.target_type}:${c.target_id}:${c.user_id}`)
          )
        );
      }
    } catch (err) {
      console.error("Failed to load role carryover preview:", err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  const handleQuickConfirmAll = async () => {
    if (!workspaceId || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await confirmRoleCarryover(workspaceId, {});
      await loadPreview();
      onConfirmed?.();
    } catch (err) {
      setError(
        err?.response?.data?.detail || "Failed to confirm role carryover."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmCustomized = async () => {
    if (!workspaceId || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const selectedCoaches = [];
      for (const coach of preview?.proposed_coaches || []) {
        const key = `${coach.target_type}:${coach.target_id}:${coach.user_id}`;
        if (selectedCoachKeys.has(key)) {
          selectedCoaches.push({
            target_type: coach.target_type,
            target_id: coach.target_id,
            user_id: coach.user_id,
          });
        }
      }

      await confirmRoleCarryover(workspaceId, {
        selected_facilitator_user_ids: Array.from(selectedFacilitatorIds),
        selected_coach_targets: selectedCoaches,
      });

      setShowReviewModal(false);
      await loadPreview();
      onConfirmed?.();
    } catch (err) {
      setError(
        err?.response?.data?.detail || "Failed to confirm selected roles."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const toggleFacilitator = (userId) => {
    setSelectedFacilitatorIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const toggleCoach = (key) => {
    setSelectedCoachKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (loading || !preview || preview.status === "NOT_APPLICABLE") {
    return null;
  }

  // Already confirmed state
  if (preview.status === "CONFIRMED") {
    const formattedDate = preview.roles_confirmed_at
      ? new Date(preview.roles_confirmed_at).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : null;

    return (
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3.5 py-2.5 sm:px-4 sm:py-3 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300">
        <div className="flex items-start sm:items-center gap-2 min-w-0">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-0" />
          <span className="leading-relaxed break-words">
            Role assignments carried over from{" "}
            <strong>{preview.previous_tournament_name || "previous intramural"}</strong>{" "}
            {formattedDate ? `on ${formattedDate}` : "are confirmed"}
            {preview.roles_confirmed_by_name
              ? ` by ${preview.roles_confirmed_by_name}`
              : ""}
            . Users have active operational access.
          </span>
        </div>
        <span className="inline-flex shrink-0 self-start sm:self-auto items-center rounded-full bg-emerald-100 px-2.5 py-0.5 font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
          Confirmed & Synced
        </span>
      </div>
    );
  }

  // PENDING_REVIEW state
  const facilitators = preview.proposed_facilitators || [];
  const coaches = preview.proposed_coaches || [];
  const totalProposed = facilitators.length + coaches.length;

  if (totalProposed === 0) {
    return null;
  }

  const selectedCount = selectedFacilitatorIds.size + selectedCoachKeys.size;

  return (
    <>
      <div className="mb-5 overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50/90 via-sky-50/70 to-indigo-50/90 p-3.5 sm:p-4 shadow-sm dark:border-indigo-900/40 dark:from-indigo-950/30 dark:via-sky-950/20 dark:to-indigo-950/30">
        <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm dark:bg-indigo-500">
                <Sparkles className="h-4 w-4" />
              </span>
              <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                Role Assignments Available from Previous Intramural
              </h4>
            </div>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              Found <strong>{facilitators.length} Sports Facilitator(s)</strong> and{" "}
              <strong>{coaches.length} Coach(es)</strong> from{" "}
              <span className="font-medium text-indigo-700 dark:text-indigo-400">
                {preview.previous_tournament_name}
              </span>
              . By default, users have <strong>Viewer</strong> access in this
              Intramural until you review and confirm all assigned roles.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto shrink-0">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setShowReviewModal(true)}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Users className="h-3.5 w-3.5 text-slate-500" />
              Review & Customize
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={handleQuickConfirmAll}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Confirming...
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Confirm All Roles ({totalProposed})
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Review & Customize Modal */}
      {showReviewModal &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-sm">
            <div className="flex max-h-[min(90vh,720px)] w-full max-w-2xl sm:max-w-3xl flex-col rounded-2xl bg-white shadow-2xl dark:bg-slate-900 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4 dark:border-slate-800">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100">
                      Review & Confirm Intramural Roles
                    </h3>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      Carried over from {preview.previous_tournament_name}.
                      Unchecked users will remain Viewers.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 space-y-5 sm:space-y-6 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
                {/* Sports Facilitators Section */}
                <div>
                  <div className="mb-2.5 flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Sports Facilitators ({facilitators.length})
                    </h4>
                    <span className="text-xs text-slate-400">
                      {selectedFacilitatorIds.size} of {facilitators.length} selected
                    </span>
                  </div>

                  {facilitators.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">
                      No matching sports facilitators found from previous intramural.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50/50 dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-800/40">
                      {facilitators.map((fac) => {
                        const isSelected = selectedFacilitatorIds.has(fac.user_id);
                        return (
                          <label
                            key={`${fac.sport_id}-${fac.user_id}`}
                            className={`flex cursor-pointer items-center justify-between p-3 transition hover:bg-slate-100/60 dark:hover:bg-slate-800/80 ${
                              !fac.is_active ? "opacity-60" : ""
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                disabled={!fac.is_active}
                                checked={isSelected}
                                onChange={() => toggleFacilitator(fac.user_id)}
                                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600"
                              />
                              <div>
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                  {fac.user_name}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {fac.user_email}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                                {fac.sport_name}
                              </span>
                              {!fac.is_active && (
                                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                                  Inactive Account
                                </span>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Coaches Section */}
                <div>
                  <div className="mb-2.5 flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Coaches ({coaches.length})
                    </h4>
                    <span className="text-xs text-slate-400">
                      {selectedCoachKeys.size} of {coaches.length} selected
                    </span>
                  </div>

                  {coaches.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">
                      No matching coaches found from previous intramural.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50/50 dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-800/40">
                      {coaches.map((coach) => {
                        const key = `${coach.target_type}:${coach.target_id}:${coach.user_id}`;
                        const isSelected = selectedCoachKeys.has(key);
                        return (
                          <label
                            key={key}
                            className={`flex cursor-pointer items-center justify-between p-3 transition hover:bg-slate-100/60 dark:hover:bg-slate-800/80 ${
                              !coach.is_active ? "opacity-60" : ""
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                disabled={!coach.is_active}
                                checked={isSelected}
                                onChange={() => toggleCoach(key)}
                                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600"
                              />
                              <div>
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                  {coach.user_name}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {coach.department_name} • {coach.sport_name} (
                                  {coach.target_name})
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                Coach
                              </span>
                              {!coach.is_active && (
                                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                                  Inactive Account
                                </span>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-6 sm:py-4 dark:border-slate-800 dark:bg-slate-900/50">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedCount} role(s) will be assigned and granted active access.
                </p>
                <div className="flex flex-col-reverse sm:flex-row items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setShowReviewModal(false)}
                    className="w-full sm:w-auto rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={submitting || selectedCount === 0}
                    onClick={handleConfirmCustomized}
                    className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        Confirm & Sync {selectedCount} Role(s)
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
