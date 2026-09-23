import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleSlash2,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import AppModal from "../common/AppModal";
import {
  getLifecycleReadiness,
  getIntramuralClosurePreview,
  closeIntramuralAsCancelled,
  INTRAMURAL_ASSIGNMENTS_CHANGED_EVENT,
  transitionIntramuralLifecycle,
} from "../../services/intramuralService";

const TRANSITION_ACTIONS = new Set([
  "OPEN_REGISTRATION",
  "CLOSE_REGISTRATION",
  "ACTIVATE_INTRAMURAL",
  "COMPLETE_INTRAMURAL",
  "ARCHIVE_INTRAMURAL",
]);

const ACTION_COPY = {
  OPEN_REGISTRATION: {
    label: "Open Registration",
    description: "Department Managers and assigned coaches can begin the registration workflow.",
  },
  CLOSE_REGISTRATION: {
    label: "Close Registration",
    description: "New registration submissions will stop and competition preparation can continue.",
  },
  GENERATE_BRACKETS: { label: "Review Bracket Generation", path: "/coordinator/brackets" },
  ACTIVATE_BRACKETS: { label: "Review Bracket Activation", path: "/coordinator/brackets" },
  GENERATE_SCHEDULE: { label: "Review Schedule Generation", path: "/coordinator/schedules" },
  PUBLISH_SCHEDULE: { label: "Review Schedule Publication", path: "/coordinator/schedules" },
  ACTIVATE_INTRAMURAL: {
    label: "Activate Intramural",
    description: "Published competition operations will become active.",
  },
  COMPLETE_INTRAMURAL: {
    label: "Complete Intramural",
    description: "Operational competition work will be finalized and made historical.",
  },
  ARCHIVE_INTRAMURAL: {
    label: "Archive Intramural",
    description: "The completed Intramural will become read-only.",
  },
};

const titleCase = (value) => String(value || "")
  .replaceAll("_", " ")
  .toLowerCase()
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const IssueList = ({ title, items, tone, onResolve }) => {
  if (!items?.length) return null;
  const warning = tone === "warning";
  return (
    <section aria-label={title}>
      <h3 className={`text-sm font-semibold ${warning ? "text-amber-800 dark:text-amber-200" : "text-rose-800 dark:text-rose-200"}`}>
        {title}
      </h3>
      <ul className="mt-2 divide-y divide-slate-200 rounded-xl border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
        {items.map((item) => (
          <li key={item.code} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{item.message}</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{item.label}</p>
            </div>
            {item.resolution_path ? (
              <button type="button" onClick={() => onResolve(item.resolution_path)} className="os-btn-ghost-soft min-h-10 shrink-0 text-xs">
                Resolve <ArrowRight size={13} />
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
};

export default function LifecycleReadinessPanel({
  workspaceId,
  tournamentId,
  onTransition,
  contextual = false,
  staffSummary = null,
  actionOnly = false,
}) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [acknowledged, setAcknowledged] = useState([]);
  const [closureOpen, setClosureOpen] = useState(false);
  const [closurePreview, setClosurePreview] = useState(null);
  const [closureReason, setClosureReason] = useState("Administrative decision");
  const [abandonMatchIds, setAbandonMatchIds] = useState([]);
  const [unavailableOpen, setUnavailableOpen] = useState(false);

  const load = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError("");
    try {
      setData(await getLifecycleReadiness(workspaceId));
    } catch (requestError) {
      const detail = requestError?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Lifecycle readiness could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const refreshAfterAssignment = (event) => {
      if (Number(event?.detail?.workspace_id || 0) === Number(workspaceId)) void load();
    };
    window.addEventListener(INTRAMURAL_ASSIGNMENTS_CHANGED_EVENT, refreshAfterAssignment);
    return () => window.removeEventListener(INTRAMURAL_ASSIGNMENTS_CHANGED_EVENT, refreshAfterAssignment);
  }, [load, workspaceId]);

  const currentAction = useMemo(
    () => (data?.actions || []).find((row) => row.action === data?.next_recommended_action) || null,
    [data]
  );
  const actionCopy = ACTION_COPY[currentAction?.action] || {
    label: titleCase(currentAction?.action || "No transition available"),
  };
  const passedChecks = (currentAction?.checks || []).filter((row) => row.status === "PASS");
  const overrideBlockers = (currentAction?.blockers || []).filter((row) => row.override_eligible);
  const canOverride = Boolean(currentAction?.override_allowed && overrideBlockers.length);
  const isTransition = TRANSITION_ACTIONS.has(currentAction?.action);

  const openAction = () => {
    if (!currentAction) return;
    if (!isTransition) {
      const basePath = actionCopy.path;
      if (!basePath || !currentAction.allowed) return;
      const separator = basePath.includes("?") ? "&" : "?";
      navigate(`${basePath}${separator}tournament_id=${tournamentId || data?.tournament_id || ""}`);
      return;
    }
    setOverrideReason("");
    setAcknowledged([]);
    setConfirming(true);
  };

  const executeTransition = async () => {
    if (!currentAction) return;
    const useOverride = currentAction.blockers?.length > 0;
    setBusy(true);
    setError("");
    try {
      const result = await transitionIntramuralLifecycle(workspaceId, currentAction.action, {
        override: useOverride,
        override_reason: useOverride ? overrideReason.trim() : null,
        acknowledged_issue_codes: useOverride ? acknowledged : [],
        expected_current_state: data.current_state,
      });
      setConfirming(false);
      setSuccess(result.message || `${actionCopy.label} completed.`);
      await load();
      onTransition?.(result);
    } catch (requestError) {
      const detail = requestError?.response?.data?.detail;
      const readinessError = detail?.error;
      setError(
        readinessError?.message
        || detail?.message
        || (typeof detail === "string" ? detail : "The lifecycle transition could not be completed.")
      );
      setConfirming(false);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const openClosure = async () => {
    setBusy(true);
    setError("");
    try {
      const preview = await getIntramuralClosurePreview(workspaceId);
      setClosurePreview(preview);
      setAbandonMatchIds([]);
      setClosureOpen(true);
    } catch (requestError) {
      const detail = requestError?.response?.data?.detail;
      setError(detail?.message || (typeof detail === "string" ? detail : "Closure preview could not be loaded."));
    } finally {
      setBusy(false);
    }
  };

  const executeClosure = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await closeIntramuralAsCancelled(workspaceId, {
        reason_category: closureReason,
        expected_current_state: closurePreview?.status || "ACTIVE",
        abandon_match_ids: abandonMatchIds,
      });
      setClosureOpen(false);
      setSuccess(result.message || "The Intramural was closed.");
      await load();
      onTransition?.(result);
    } catch (requestError) {
      const detail = requestError?.response?.data?.detail;
      setError(detail?.message || (typeof detail === "string" ? detail : "The Intramural could not be closed."));
      setClosureOpen(false);
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900" aria-label="Loading lifecycle readiness">
        <div className="h-5 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="mt-4 h-24 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
      </section>
    );
  }

  if (error && !data) {
    return (
      <section className="rounded-2xl border border-rose-200 bg-white p-5 dark:border-rose-500/30 dark:bg-slate-900">
        <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
        <button type="button" onClick={load} className="os-btn-ghost-soft mt-3 inline-flex min-h-10 items-center gap-1 text-xs">
          <RefreshCw size={14} /> Retry
        </button>
      </section>
    );
  }

  if (contextual) {
    const action = String(currentAction?.action || "").toUpperCase();
    const managers = staffSummary?.managers || {};
    const facilitators = staffSummary?.facilitators || {};
    const missingManagers = Math.max(0, Number(managers.missing ?? Number(managers.total || 0) - Number(managers.assigned || 0)));
    const missingFacilitators = Math.max(0, Number(facilitators.missing ?? Number(facilitators.total || 0) - Number(facilitators.assigned || 0)));
    const setupTaskCount = Number(missingManagers > 0) + Number(missingFacilitators > 0);
    const registrationIsOpen = action === "CLOSE_REGISTRATION";
    const registrationIsComplete = !["OPEN_REGISTRATION", "CLOSE_REGISTRATION"].includes(action);

    let heading = "Waiting for staff setup";
    let guidance = "Complete the required staff assignments before registration can open.";
    if (currentAction?.allowed) {
      heading = "Ready to open";
      guidance = "Players and teams can begin submitting registrations for this Intramural.";
    } else if (missingManagers > 0 && missingFacilitators > 0) {
      guidance = `${setupTaskCount} staff setup tasks still need to be completed before registration can open.`;
    } else if (missingFacilitators > 0) {
      guidance = `${missingFacilitators} sport${missingFacilitators === 1 ? " still needs" : "s still need"} a Sports Facilitator.`;
    } else if (missingManagers > 0) {
      guidance = `${missingManagers} department${missingManagers === 1 ? " still needs" : "s still need"} a Department Manager.`;
    }
    if (registrationIsOpen) {
      heading = "Registration is open";
      guidance = "Players and teams can submit registrations. Continue reviewing entries as they arrive.";
    } else if (registrationIsComplete) {
      heading = "Registration complete";
      guidance = "Continue to Brackets when approved entries are ready.";
    }

    if (actionOnly) {
      const isRegistrationTransition = action === "OPEN_REGISTRATION" || action === "CLOSE_REGISTRATION";
      const handleContextualAction = () => {
        if (action === "OPEN_REGISTRATION" && !currentAction?.allowed) {
          setUnavailableOpen(true);
          return;
        }
        openAction();
      };
      return (
        <>
          {isRegistrationTransition ? (
            <button
              type="button"
              onClick={handleContextualAction}
              aria-disabled={!currentAction?.allowed}
              className={`${currentAction?.allowed ? "os-btn-primary-soft" : "os-btn-ghost-soft opacity-60"} inline-flex min-h-10 items-center justify-center px-3 text-xs font-semibold`}
            >
              {actionCopy.label}
            </button>
          ) : (
            <button type="button" onClick={() => navigate(`/coordinator/brackets?tournament_id=${tournamentId || data?.tournament_id || ""}`)} className="os-btn-primary-soft inline-flex min-h-10 items-center justify-center px-3 text-xs font-semibold">
              View Brackets
            </button>
          )}

          <AppModal
            open={unavailableOpen}
            onClose={() => setUnavailableOpen(false)}
            title="Registration is not ready to open"
            subtitle="Complete the required setup first."
            maxWidthClass="max-w-lg"
          >
            <p className="text-sm text-slate-600 dark:text-slate-300">{guidance}</p>
            <div className="mt-5 flex justify-end">
              <button type="button" onClick={() => setUnavailableOpen(false)} className="os-btn-primary-soft min-h-10">Got it</button>
            </div>
          </AppModal>

          <AppModal
            open={confirming}
            onClose={() => !busy && setConfirming(false)}
            title={`${actionCopy.label}?`}
            subtitle={actionCopy.description || "Confirm this lifecycle transition."}
            maxWidthClass="max-w-lg"
          >
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {action === "OPEN_REGISTRATION"
                ? "Players and teams will be able to submit registrations for this Intramural."
                : "New registration submissions will stop and competition preparation can continue."}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" disabled={busy} onClick={() => setConfirming(false)} className="os-btn-ghost-soft min-h-10">Cancel</button>
              <button type="button" disabled={busy} onClick={executeTransition} className="os-btn-primary-soft min-h-10">
                {busy ? "Applying…" : actionCopy.label}
              </button>
            </div>
          </AppModal>
        </>
      );
    }

    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5" aria-labelledby="registration-lifecycle-heading">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Registration</p>
            <h2 id="registration-lifecycle-heading" className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{heading}</h2>
            <p id="registration-action-explanation" className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-300">{guidance}</p>
          </div>
          {currentAction && (action === "OPEN_REGISTRATION" || action === "CLOSE_REGISTRATION") ? (
            <button
              type="button"
              onClick={openAction}
              disabled={!currentAction.allowed}
              aria-describedby="registration-action-explanation"
              title={!currentAction.allowed ? guidance : undefined}
              className={`${currentAction.allowed ? "os-btn-primary-soft" : "os-btn-ghost-soft"} min-h-11 shrink-0 disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {actionCopy.label}
            </button>
          ) : (
            <button type="button" onClick={() => navigate(`/coordinator/brackets?tournament_id=${tournamentId || data?.tournament_id || ""}`)} className="os-btn-primary-soft min-h-11 shrink-0">
              View Brackets
            </button>
          )}
        </div>
        {error ? <p role="alert" className="mt-3 text-sm text-rose-700 dark:text-rose-300">{error}</p> : null}
        {success ? <p role="status" className="mt-3 text-sm text-emerald-700 dark:text-emerald-300">{success}</p> : null}
        <AppModal
          open={confirming}
          onClose={() => !busy && setConfirming(false)}
          title={`${actionCopy.label}?`}
          subtitle={actionCopy.description || "Confirm this lifecycle transition."}
          maxWidthClass="max-w-lg"
        >
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {action === "OPEN_REGISTRATION"
              ? "Players and teams will be able to submit registrations for this Intramural."
              : "New registration submissions will stop and competition preparation can continue."}
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" disabled={busy} onClick={() => setConfirming(false)} className="os-btn-ghost-soft min-h-10">Cancel</button>
            <button type="button" disabled={busy} onClick={executeTransition} className="os-btn-primary-soft min-h-10">
              {busy ? "Applying…" : actionCopy.label}
            </button>
          </div>
        </AppModal>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">{contextual ? "Next setup action" : "Operational readiness"}</p>
          <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">{actionCopy.label}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Current state: <span className="font-semibold text-slate-700 dark:text-slate-200">{titleCase(data?.current_state)}</span>
            {data?.computed_stage !== data?.current_state ? ` · ${titleCase(data?.computed_stage)}` : ""}
          </p>
        </div>
        {currentAction ? (
          <div className="grid grid-cols-3 gap-2 text-center sm:min-w-72">
            <div className="rounded-xl bg-emerald-50 px-3 py-2 dark:bg-emerald-500/10"><p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{currentAction.summary?.passed || 0}</p><p className="text-xs text-emerald-700 dark:text-emerald-300">Passed</p></div>
            <div className="rounded-xl bg-rose-50 px-3 py-2 dark:bg-rose-500/10"><p className="text-lg font-bold text-rose-700 dark:text-rose-300">{currentAction.summary?.blocked || 0}</p><p className="text-xs text-rose-700 dark:text-rose-300">Required</p></div>
            <div className="rounded-xl bg-amber-50 px-3 py-2 dark:bg-amber-500/10"><p className="text-lg font-bold text-amber-700 dark:text-amber-300">{currentAction.summary?.warnings || 0}</p><p className="text-xs text-amber-700 dark:text-amber-300">Recommended</p></div>
          </div>
        ) : null}
      </div>

      {error ? <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p> : null}
      {success ? <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{success}</p> : null}

      {!currentAction ? (
        <div className="mt-5 flex items-center gap-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <CheckCircle2 size={18} className="text-emerald-600" /> No further operational transition is recommended.
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          <IssueList title="Required before this action" items={currentAction.blockers} tone="blocked" onResolve={navigate} />
          <IssueList title="Recommended setup" items={currentAction.warnings} tone="warning" onResolve={navigate} />

          {passedChecks.length ? (
            <details className="rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700">
              <summary className="min-h-10 cursor-pointer py-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                {passedChecks.length} passed check{passedChecks.length === 1 ? "" : "s"}
              </summary>
              <ul className="space-y-2 pb-2">
                {passedChecks.map((check) => <li key={check.code} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" /> {check.message}</li>)}
              </ul>
            </details>
          ) : null}

          <div className="flex flex-col gap-2 border-t border-slate-200 pt-4 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {currentAction.allowed
                ? "All blocking requirements for this action have passed."
                : canOverride
                  ? "Only explicitly acknowledged coordinator overrides can proceed."
                  : "Resolve the blockers before continuing."}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              {String(data?.current_state || "").toUpperCase() === "ACTIVE" ? (
                <button type="button" onClick={openClosure} disabled={busy} className="os-btn-ghost-soft min-h-11 shrink-0">
                  Close Intramural
                </button>
              ) : null}
              <button
                type="button"
                onClick={openAction}
                disabled={!currentAction.allowed && !canOverride}
                className="os-btn-primary-soft min-h-11 shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {canOverride && !currentAction.allowed ? <ShieldAlert size={15} /> : currentAction.allowed ? <CheckCircle2 size={15} /> : <CircleSlash2 size={15} />}
                {canOverride && !currentAction.allowed ? `Override and ${actionCopy.label}` : actionCopy.label}
              </button>
            </div>
          </div>
        </div>
      )}

      {data?.latest_decision ? (
        <p className="mt-5 border-t border-slate-200 pt-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Latest decision: {titleCase(data.latest_decision.action?.replace("LIFECYCLE_", ""))} · {titleCase(data.latest_decision.resulting_state)}
          {data.latest_decision.override_used ? " · coordinator override recorded" : ""}
        </p>
      ) : null}

      <AppModal
        open={confirming}
        onClose={() => !busy && setConfirming(false)}
        title={`${actionCopy.label}?`}
        subtitle={actionCopy.description || "Confirm this lifecycle transition."}
        maxWidthClass="max-w-lg"
      >
        {canOverride && !currentAction?.allowed ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
              <p className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-200"><AlertTriangle size={16} /> Acknowledge each overrideable blocker</p>
              <div className="mt-2 space-y-2">
                {overrideBlockers.map((issue) => (
                  <label key={issue.code} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={acknowledged.includes(issue.code)}
                      onChange={() => setAcknowledged((current) => current.includes(issue.code) ? current.filter((code) => code !== issue.code) : [...current, issue.code])}
                      className="mt-1 h-4 w-4"
                    />
                    <span>{issue.message}</span>
                  </label>
                ))}
              </div>
            </div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Override reason
              <textarea value={overrideReason} onChange={(event) => setOverrideReason(event.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" placeholder="Explain the operational reason (at least 10 characters)." />
            </label>
          </div>
        ) : (
          <p className="text-sm text-slate-600 dark:text-slate-300">The server will re-evaluate readiness immediately before changing the lifecycle state.</p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" disabled={busy} onClick={() => setConfirming(false)} className="os-btn-ghost-soft min-h-10">Cancel</button>
          <button
            type="button"
            disabled={busy || (canOverride && !currentAction?.allowed && (acknowledged.length !== overrideBlockers.length || overrideReason.trim().length < 10))}
            onClick={executeTransition}
            className="os-btn-primary-soft min-h-10 disabled:opacity-50"
          >
            {busy ? "Applying…" : actionCopy.label}
          </button>
        </div>
      </AppModal>

      <AppModal
        open={closureOpen}
        onClose={() => !busy && setClosureOpen(false)}
        title="Close Intramural"
        subtitle="Played results will be preserved. Unplayed Matches will be cancelled and unfinished brackets frozen."
        maxWidthClass="max-w-lg"
      >
        <div aria-live="polite" className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-[var(--surface-soft)] p-3"><p className="text-xl font-bold text-[var(--text-main)]">{closurePreview?.matches_completed || 0}</p><p className="text-xs text-[var(--text-muted)]">Completed</p></div>
          <div className="rounded-xl bg-[var(--surface-soft)] p-3"><p className="text-xl font-bold text-[var(--text-main)]">{closurePreview?.matches_unplayed || 0}</p><p className="text-xs text-[var(--text-muted)]">Unplayed</p></div>
          <div className="rounded-xl bg-[var(--surface-soft)] p-3"><p className="text-xl font-bold text-[var(--text-main)]">{closurePreview?.competitions_incomplete || 0}</p><p className="text-xs text-[var(--text-muted)]">Incomplete</p></div>
        </div>
        {(closurePreview?.matches_ongoing || 0) > 0 ? (
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-500/40 dark:bg-amber-500/10">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">{closurePreview.matches_ongoing} Match{closurePreview.matches_ongoing === 1 ? " is" : "es are"} in progress.</p>
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">Select each Match only after confirming it must be abandoned.</p>
            <div className="mt-2 space-y-2">
              {(closurePreview?.affected_matches || []).filter((row) => row.classification === "VALID_STARTED").map((row) => (
                <label key={row.match_id} className="flex min-h-10 items-center gap-2 text-sm text-[var(--text-main)]">
                  <input type="checkbox" checked={abandonMatchIds.includes(row.match_id)} onChange={() => setAbandonMatchIds((current) => current.includes(row.match_id) ? current.filter((id) => id !== row.match_id) : [...current, row.match_id])} />
                  Abandon Match {row.match_id}
                </label>
              ))}
            </div>
          </div>
        ) : null}
        {(closurePreview?.pending_corrections || 0) > 0 ? <p className="mt-4 text-sm text-rose-700 dark:text-rose-300">Resolve pending result corrections before closing.</p> : null}
        <label className="mt-4 block text-sm font-medium text-[var(--text-main)]">
          Reason
          <select value={closureReason} onChange={(event) => setClosureReason(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 text-[var(--text-main)]">
            {["Schedule ended", "Weather", "Venue unavailable", "Administrative decision", "Emergency", "Other"].map((reason) => <option key={reason}>{reason}</option>)}
          </select>
        </label>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" disabled={busy} onClick={() => setClosureOpen(false)} className="os-btn-ghost-soft min-h-10">Keep Active</button>
          <button type="button" disabled={busy || (closurePreview?.pending_corrections || 0) > 0 || abandonMatchIds.length !== (closurePreview?.matches_ongoing || 0)} onClick={executeClosure} className="min-h-10 rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Closing…" : "Close Intramural"}</button>
        </div>
      </AppModal>
    </section>
  );
}
