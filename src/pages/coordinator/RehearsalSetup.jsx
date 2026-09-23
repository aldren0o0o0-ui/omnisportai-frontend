import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  CalendarRange,
  Check,
  ChevronRight,
  CircleDot,
  ExternalLink,
  LoaderCircle,
  Play,
  ShieldCheck,
} from "lucide-react";

import AppModal from "../../components/common/AppModal";
import { useWorkspace } from "../../context/WorkspaceContext";
import useTournamentAccess from "../../hooks/useTournamentAccess";
import {
  adoptRuleProfile,
  getGovernanceStandards,
  getInstitutionalConfirmation,
  getIntramuralRuleProfiles,
  previewRuleProfileAdoption,
  saveInstitutionalConfirmation,
} from "../../services/ruleProfileService";
import {
  getAssignmentReadiness,
  getLifecycleReadiness,
  getOperationalReadiness,
  transitionIntramuralLifecycle,
} from "../../services/intramuralService";
import { getScheduleEvents, validateSchedule } from "../../services/scheduleService";
import {
  getTournaments,
  previewTournamentDateShift,
  updateTournament,
} from "../../services/tournamentService";
import RuleGovernancePage from "../shared/RuleGovernancePage";
import {
  buildGovernanceGroups,
  friendlyValue,
  humanizeSetupError,
  INSTITUTIONAL_SPORT_CODES,
  ongoingScheduleEvents,
  REHEARSAL_STEPS,
  summarizeAdoption,
  validateInstitutionalDecisions,
} from "../../utils/rehearsalSetup";

const fieldClass = "mt-1 min-h-11 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 text-sm text-[var(--text-main)] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";
const panelClass = "rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-4 shadow-sm sm:p-5";

const SetupStatus = ({ ready, pending = false }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
    ready
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200"
      : pending
        ? "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-200"
        : "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200"
  }`}>
    {ready ? <Check size={13} /> : <CircleDot size={13} />}
    {ready ? "Ready" : pending ? "In progress" : "Needs decision"}
  </span>
);

const DecisionField = ({ name, definition, value, error, onChange }) => {
  const type = String(definition?.type || "").toLowerCase();
  const label = definition?.label || friendlyValue(name);
  const describedBy = error ? `${name}-error` : undefined;
  if (type === "boolean") {
    return (
      <label className="block text-sm font-medium text-[var(--text-main)]">
        {label}
        <select value={value === true ? "true" : value === false ? "false" : ""} onChange={(event) => onChange(name, event.target.value === "" ? "" : event.target.value === "true")} className={fieldClass} aria-invalid={Boolean(error)} aria-describedby={describedBy}>
          <option value="">Select...</option><option value="true">Yes</option><option value="false">No</option>
        </select>
        {error ? <span id={describedBy} className="mt-1 block text-xs text-rose-600">{error}</span> : null}
      </label>
    );
  }
  if (type === "enum") {
    return (
      <label className="block text-sm font-medium text-[var(--text-main)]">
        {label}
        <select value={value ?? ""} onChange={(event) => onChange(name, (definition.values || []).find((item) => String(item) === event.target.value) ?? event.target.value)} className={fieldClass} aria-invalid={Boolean(error)} aria-describedby={describedBy}>
          <option value="">Select...</option>
          {(definition.values || []).map((item) => <option key={String(item)} value={String(item)}>{friendlyValue(item)}</option>)}
        </select>
        {error ? <span id={describedBy} className="mt-1 block text-xs text-rose-600">{error}</span> : null}
      </label>
    );
  }
  return (
    <label className="block text-sm font-medium text-[var(--text-main)]">
      {label}
      <input type="number" min={definition.minimum} max={definition.maximum} value={value ?? ""} onChange={(event) => onChange(name, event.target.value === "" ? "" : Number(event.target.value))} className={fieldClass} aria-invalid={Boolean(error)} aria-describedby={describedBy} />
      <span className="mt-1 block text-xs text-[var(--text-soft)]">{definition.minimum}–{definition.maximum}{definition.unit ? ` ${definition.unit}` : ""}</span>
      {error ? <span id={describedBy} className="mt-1 block text-xs text-rose-600">{error}</span> : null}
    </label>
  );
};

const RehearsalSetup = () => {
  const navigate = useNavigate();
  const { selectedTournamentId, selectedTournamentName, hasSelectedTournament } = useTournamentAccess();
  const { selectedIntramural, workspace: activeWorkspace, refresh: refreshWorkspace } = useWorkspace();
  const [step, setStep] = useState("rules");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [standards, setStandards] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [operational, setOperational] = useState(null);
  const [assignmentReadiness, setAssignmentReadiness] = useState(null);
  const [lifecycle, setLifecycle] = useState(null);
  const [targetTournament, setTargetTournament] = useState(null);
  const [activeMatches, setActiveMatches] = useState([]);
  const [requirements, setRequirements] = useState({});
  const [decisionValues, setDecisionValues] = useState({});
  const [decisionSource, setDecisionSource] = useState({});
  const [decisionErrors, setDecisionErrors] = useState({});
  const [confirmSport, setConfirmSport] = useState(null);
  const [profileEditor, setProfileEditor] = useState(null);
  const [adoptionPreviews, setAdoptionPreviews] = useState([]);
  const [adoptionOpen, setAdoptionOpen] = useState(false);
  const [dateForm, setDateForm] = useState({ startDate: "", endDate: "" });
  const [datePreview, setDatePreview] = useState(null);
  const [dateApplyOpen, setDateApplyOpen] = useState(false);
  const [scheduleValidation, setScheduleValidation] = useState(null);
  const [activationOpen, setActivationOpen] = useState(false);
  const loadRequestRef = useRef(0);

  const targetWorkspaceId = Number(selectedIntramural?.id || 0);

  const load = useCallback(async () => {
    const requestId = ++loadRequestRef.current;
    if (!selectedTournamentId || !targetWorkspaceId) {
      if (requestId === loadRequestRef.current) setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [standardRows, profileRows, readiness, assignments, lifecycleRows, targetRows, activeRows] = await Promise.all([
        getGovernanceStandards({ tournamentId: selectedTournamentId }),
        getIntramuralRuleProfiles(selectedTournamentId),
        getOperationalReadiness(targetWorkspaceId),
        getAssignmentReadiness(targetWorkspaceId),
        getLifecycleReadiness(targetWorkspaceId),
        getTournaments({ includeArchived: true, workspaceId: targetWorkspaceId }),
        activeWorkspace?.id ? getTournaments({ includeArchived: true, workspaceId: activeWorkspace.id }) : Promise.resolve([]),
      ]);
      const target = (Array.isArray(targetRows) ? targetRows : []).find((row) => Number(row.id) === Number(selectedTournamentId)) || targetRows?.[0] || null;
      const active = (Array.isArray(activeRows) ? activeRows : [])[0] || null;
      if (requestId !== loadRequestRef.current) return;
      setStandards(standardRows);
      setProfiles(profileRows);
      setOperational(readiness);
      setAssignmentReadiness(assignments);
      setLifecycle(lifecycleRows);
      setTargetTournament(target);
      setDateForm((current) => current.startDate ? current : { startDate: "", endDate: "" });

      const institutional = standardRows.filter((row) => INSTITUTIONAL_SPORT_CODES.has(String(row.sport_code || "").toUpperCase()));
      const confirmationRows = await Promise.all(institutional.map(async (standard) => [
        standard.sport_code,
        await getInstitutionalConfirmation({ tournamentId: selectedTournamentId, sportId: standard.sport_id }),
      ]));
      if (requestId !== loadRequestRef.current) return;
      const confirmationMap = Object.fromEntries(confirmationRows);
      setRequirements(confirmationMap);
      setDecisionValues(Object.fromEntries(confirmationRows.map(([code, result]) => [code, result?.confirmation?.decision_values || {}])));
      setDecisionSource(Object.fromEntries(confirmationRows.map(([code, result]) => [code, result?.confirmation?.adopted_source_or_policy || ""])));

      const locked = profileRows.filter((profile) => String(profile.governance_status || "").toUpperCase() === "LOCKED");
      const previews = await Promise.all(locked.map((profile) => previewRuleProfileAdoption(profile.id)));
      if (requestId !== loadRequestRef.current) return;
      setAdoptionPreviews(previews);

      if (active?.id && Number(activeWorkspace?.id) !== targetWorkspaceId) {
        const activeEvents = await getScheduleEvents(active.id).catch(() => []);
        if (requestId !== loadRequestRef.current) return;
        setActiveMatches(ongoingScheduleEvents(activeEvents));
      } else {
        setActiveMatches([]);
      }
      if (target?.id) {
        const validation = await validateSchedule(target.id).catch(() => null);
        if (requestId !== loadRequestRef.current) return;
        setScheduleValidation(validation);
      }
    } catch (requestError) {
      if (requestId === loadRequestRef.current) setError(humanizeSetupError(requestError));
    } finally {
      if (requestId === loadRequestRef.current) setLoading(false);
    }
  }, [activeWorkspace?.id, selectedTournamentId, targetWorkspaceId]);

  useEffect(() => { void load(); }, [load]);

  const institutionalStandards = useMemo(() => standards.filter((row) => INSTITUTIONAL_SPORT_CODES.has(String(row.sport_code || "").toUpperCase())), [standards]);
  const governanceGroups = useMemo(() => buildGovernanceGroups(profiles, operational?.competitions || []), [operational, profiles]);
  const missingProfiles = useMemo(() => (operational?.competitions || []).filter((row) => !row?.rules?.profile_id), [operational]);
  const adoptionSummary = useMemo(() => summarizeAdoption(adoptionPreviews), [adoptionPreviews]);
  const lockedProfiles = profiles.filter((profile) => String(profile.governance_status).toUpperCase() === "LOCKED");
  const activationReadiness = lifecycle?.actions?.find((action) => action.action === "ACTIVATE_INTRAMURAL") || null;
  const governanceReady = String(operational?.status || "").toUpperCase() === "READY";
  const assignmentReady = String(assignmentReadiness?.status || "").toUpperCase() === "COMPLETE";
  const entryReady = Boolean((operational?.competitions || []).length) && (operational?.competitions || []).every((row) => row?.entries?.ready);
  const bracketReady = Boolean((operational?.competitions || []).length) && (operational?.competitions || []).every((row) => row?.bracket?.ready);
  const scheduleFuture = Boolean(targetTournament?.end_date && String(targetTournament.end_date) >= new Date().toISOString().slice(0, 10));
  const activationReady = Boolean(activationReadiness?.allowed && governanceReady && scheduleFuture && !scheduleValidation?.has_blocking_issues);

  const saveDecision = async () => {
    if (!confirmSport) return;
    setBusy(true); setError("");
    try {
      const standard = institutionalStandards.find((row) => row.sport_code === confirmSport);
      await saveInstitutionalConfirmation({ tournamentId: selectedTournamentId, sportId: standard.sport_id, payload: {
        tournament_sport_event_id: null,
        decision_values: decisionValues[confirmSport],
        adopted_source_or_policy: decisionSource[confirmSport].trim(),
        approval_note: "Recorded through Live Rehearsal Setup.",
      } });
      setConfirmSport(null);
      setSuccess(`${standard.sport_name} institutional decisions were recorded.`);
      await load();
    } catch (requestError) { setError(humanizeSetupError(requestError)); }
    finally { setBusy(false); }
  };

  const reviewDecision = (standard) => {
    const code = standard.sport_code;
    const errors = validateInstitutionalDecisions(requirements[code], decisionValues[code]);
    if (String(decisionSource[code] || "").trim().length < 3) errors._source = "Institutional authority or policy source is required.";
    setDecisionErrors((current) => ({ ...current, [code]: errors }));
    if (Object.keys(errors).length === 0) setConfirmSport(code);
  };

  const previewAdoption = async () => {
    setBusy(true); setError("");
    try {
      const previews = [];
      for (const profile of lockedProfiles) previews.push(await previewRuleProfileAdoption(profile.id));
      setAdoptionPreviews(previews);
      setAdoptionOpen(true);
    } catch (requestError) { setError(humanizeSetupError(requestError)); }
    finally { setBusy(false); }
  };

  const applyAdoption = async () => {
    setBusy(true); setError("");
    const failures = [];
    let adopted = 0;
    for (const profile of lockedProfiles) {
      try {
        const result = await adoptRuleProfile(profile.id, { expected_row_version: profile.row_version, reason: "Adopt reviewed governed rules for live rehearsal.", confirm: true });
        adopted += Number(result?.adopted_matches || 0);
      } catch (requestError) { failures.push(`${profile.sport_name}: ${humanizeSetupError(requestError)}`); }
    }
    setAdoptionOpen(false);
    setError(failures.length ? `${failures.length} profile adoption${failures.length === 1 ? "" : "s"} require attention. ${failures.join(" ")}` : "");
    if (!failures.length) setSuccess(`${adopted} Match configurations adopted governed rules.`);
    setBusy(false);
    await load();
  };

  const runDatePreview = async () => {
    setError(""); setDatePreview(null);
    const start = new Date(`${dateForm.startDate}T00:00:00`);
    const end = new Date(`${dateForm.endDate}T00:00:00`);
    if (!dateForm.startDate || !dateForm.endDate || end < start || Math.round((end - start) / 86400000) < 2) {
      setError("Choose a future rehearsal window covering at least three operational days."); return;
    }
    if (dateForm.startDate <= new Date().toISOString().slice(0, 10)) {
      setError("The rehearsal start date must be in the future."); return;
    }
    setBusy(true);
    try { setDatePreview(await previewTournamentDateShift(selectedTournamentId, dateForm)); }
    catch (requestError) { setError(humanizeSetupError(requestError)); }
    finally { setBusy(false); }
  };

  const applyDateShift = async () => {
    setBusy(true); setError("");
    try {
      const result = await updateTournament(selectedTournamentId, { start_date: dateForm.startDate, end_date: dateForm.endDate });
      setDateApplyOpen(false); setDatePreview(null);
      setSuccess(`${result?.schedule_adjustment?.shifted_match_count || 0} scheduled Matches moved to the approved rehearsal window.`);
      await load();
    } catch (requestError) { setError(humanizeSetupError(requestError)); }
    finally { setBusy(false); }
  };

  const activate = async () => {
    setBusy(true); setError("");
    try {
      const result = await transitionIntramuralLifecycle(targetWorkspaceId, "ACTIVATE_INTRAMURAL", { expected_current_state: lifecycle.current_state });
      setActivationOpen(false); setSuccess(result.message || `${selectedTournamentName} is active.`);
      await refreshWorkspace(); await load();
    } catch (requestError) { setActivationOpen(false); setError(humanizeSetupError(requestError)); await load(); }
    finally { setBusy(false); }
  };

  if (!hasSelectedTournament) return <div className={panelClass}>Select an Intramural to prepare its live rehearsal.</div>;
  if (loading) return <div className="flex min-h-72 items-center justify-center"><LoaderCircle className="h-6 w-6 animate-spin text-blue-600" aria-label="Loading rehearsal readiness" /></div>;

  const renderRules = () => (
    <div className="space-y-4">
      <div><h2 className="text-lg font-bold text-[var(--text-main)]">Institutional rule decisions</h2><p className="mt-1 text-sm text-[var(--text-muted)]">Select every value explicitly. Recording a decision does not approve or lock its profile.</p></div>
      {institutionalStandards.map((standard) => {
        const code = standard.sport_code; const requirement = requirements[code]; const fields = requirement?.confirmation_schema?.fields || {}; const confirmed = Boolean(requirement?.confirmed); const errors = decisionErrors[code] || {};
        return <fieldset key={code} className={panelClass}><legend className="px-1 text-base font-bold text-[var(--text-main)]">{standard.sport_name}</legend>
          <div className="mb-4 flex items-center justify-between gap-3"><p className="text-sm text-[var(--text-muted)]">These choices become the approved institutional configuration for this Intramural.</p><SetupStatus ready={confirmed} /></div>
          <div className="grid gap-4 sm:grid-cols-2">{Object.entries(fields).map(([name, definition]) => <DecisionField key={name} name={name} definition={definition} value={decisionValues[code]?.[name] ?? ""} error={errors[name]} onChange={(field, value) => setDecisionValues((current) => ({ ...current, [code]: { ...(current[code] || {}), [field]: value } }))} />)}</div>
          <label className="mt-4 block text-sm font-medium text-[var(--text-main)]">Institutional authority or policy source<input value={decisionSource[code] || ""} onChange={(event) => setDecisionSource((current) => ({ ...current, [code]: event.target.value }))} className={fieldClass} placeholder="Enter the approving policy, body, or authority" />{errors._source ? <span className="mt-1 block text-xs text-rose-600">{errors._source}</span> : null}</label>
          <div className="mt-5 flex justify-end"><button type="button" onClick={() => reviewDecision(standard)} disabled={busy} className="os-btn-primary-soft min-h-11">Review institutional rules</button></div>
        </fieldset>;
      })}
    </div>
  );

  const renderGovernance = () => (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-bold text-[var(--text-main)]">Governance profiles</h2><p className="mt-1 text-sm text-[var(--text-muted)]">Validate, submit, approve, and lock through the existing profile lifecycle.</p></div><button type="button" onClick={previewAdoption} disabled={busy || lockedProfiles.length === 0} className="os-btn-primary-soft min-h-11"><ShieldCheck size={16} /> Review Match adoption</button></div>
      {missingProfiles.map((competition) => <div key={competition.event_id} className={`${panelClass} border-amber-300`}><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-bold text-[var(--text-main)]">{competition.sport_name} · {competition.event_name}</p><p className="text-sm text-amber-700 dark:text-amber-300">Profile required. Create it from the protected {competition.sport_name} standard.</p></div><button type="button" className="os-btn-primary-soft min-h-10" onClick={() => setProfileEditor({ sport_id: competition.sport_id, event_id: competition.event_id, label: `${competition.sport_name} · ${competition.event_name}` })}>Create profile</button></div></div>)}
      <div className="divide-y divide-[var(--border-soft)] rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]">{governanceGroups.map((profile) => <div key={profile.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-[var(--text-main)]">{profile.sport_name}</p><SetupStatus ready={profile.governance_status === "LOCKED"} pending={["VALIDATED", "PENDING_APPROVAL", "APPROVED"].includes(profile.governance_status)} /><span className="text-xs text-[var(--text-soft)]">{profile.engine_type}</span></div><p className="mt-1 text-xs text-[var(--text-muted)]">Covers: {profile.covered_events.length ? profile.covered_events.map((row) => row.event_name).join(", ") : "profile scope awaiting Competition mapping"}</p></div><button type="button" className="os-btn-ghost-soft min-h-10" onClick={() => setProfileEditor({ sport_id: profile.sport_id, event_id: profile.tournament_sport_event_id, label: profile.sport_name })}>Open profile <ChevronRight size={15} /></button></div>)}</div>
    </div>
  );

  const renderPrevious = () => {
    const isTargetActive = Number(activeWorkspace?.id) === targetWorkspaceId;
    return <div className="space-y-5"><div><h2 className="text-lg font-bold text-[var(--text-main)]">Previous Intramural</h2><p className="mt-1 text-sm text-[var(--text-muted)]">Finish real Matches and champions through normal operations before closing the active Intramural.</p></div><div className={panelClass}><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-bold text-[var(--text-main)]">{isTargetActive ? selectedIntramural?.name : activeWorkspace?.name || "No active Intramural"}</p><p className="text-sm text-[var(--text-muted)]">{isTargetActive ? "This Intramural is already active." : activeWorkspace ? "Currently active" : "No previous active Intramural blocks activation."}</p></div><SetupStatus ready={!activeWorkspace || isTargetActive} pending={Boolean(activeWorkspace && !isTargetActive)} /></div>{activeMatches.length ? <div className="mt-4"><p className="text-sm font-semibold text-[var(--text-main)]">{activeMatches.length} ongoing Match{activeMatches.length === 1 ? "" : "es"}</p><ul className="mt-2 divide-y divide-[var(--border-soft)]">{activeMatches.map((match) => <li key={match.match_id || match.id} className="flex items-center justify-between gap-3 py-3 text-sm"><span>{match.sport_name || match.sport || "Sport"} {match.event_name ? `· ${match.event_name}` : ""} — Match {match.match_number || match.match_id || match.id}</span><button type="button" onClick={() => navigate(`/coordinator/matches/${match.match_id || match.id}/live-scoring`)} className="text-sm font-semibold text-blue-600">Open Match</button></li>)}</ul></div> : activeWorkspace && !isTargetActive ? <p className="mt-4 text-sm text-[var(--text-muted)]">No live Match rows were returned. Review remaining competitions and unresolved champions before completion.</p> : null}<div className="mt-4 border-t border-[var(--border-soft)] pt-4"><button type="button" onClick={() => navigate("/coordinator/dashboard")} className="os-btn-ghost-soft min-h-10">Open active Intramural operations <ExternalLink size={15} /></button></div></div></div>;
  };

  const renderDates = () => {
    const adjustment = datePreview?.schedule_adjustment;
    return <div className="space-y-5"><div><h2 className="text-lg font-bold text-[var(--text-main)]">Rehearsal dates</h2><p className="mt-1 text-sm text-[var(--text-muted)]">Choose the future window. The server previews the exact published-schedule shift before any change is saved.</p></div><div className={panelClass}><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium text-[var(--text-main)]">New rehearsal start date<input type="date" value={dateForm.startDate} onChange={(event) => { setDateForm((current) => ({ ...current, startDate: event.target.value })); setDatePreview(null); }} className={fieldClass} /></label><label className="text-sm font-medium text-[var(--text-main)]">New rehearsal end date<input type="date" value={dateForm.endDate} onChange={(event) => { setDateForm((current) => ({ ...current, endDate: event.target.value })); setDatePreview(null); }} className={fieldClass} /></label></div><p className="mt-3 text-xs text-[var(--text-soft)]">Current window: {targetTournament?.start_date || "Not set"} to {targetTournament?.end_date || "Not set"} · Operating hours {targetTournament?.schedule_start_hour ?? 8}:00–{targetTournament?.schedule_end_hour ?? 17}:00</p><div className="mt-5 flex justify-end"><button type="button" onClick={runDatePreview} disabled={busy} className="os-btn-primary-soft min-h-11">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CalendarRange size={16} />} Preview date shift</button></div></div>{adjustment ? <div className={panelClass}><h3 className="font-bold text-[var(--text-main)]">Date shift preview</h3><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Scheduled Matches", adjustment.shifted_match_count], ["Program blocks", adjustment.shifted_program_block_count], ["Pending jobs replaced", adjustment.reminder_refresh?.cancelled_jobs], ["New reminder jobs", adjustment.reminder_refresh?.queued_jobs]].map(([label, value]) => <div key={label} className="rounded-xl bg-[var(--surface-soft)] p-3"><p className="text-xl font-bold text-[var(--text-main)]">{value ?? 0}</p><p className="text-xs text-[var(--text-muted)]">{label}</p></div>)}</div><p className="mt-4 text-sm text-emerald-700 dark:text-emerald-300">Canonical venue, program-block, dependency, and availability validation passed inside the rolled-back preview.</p><div className="mt-5 flex justify-end"><button type="button" onClick={() => setDateApplyOpen(true)} className="os-btn-primary-soft min-h-11">Shift tournament schedule</button></div></div> : null}</div>;
  };

  const renderReview = () => {
    const rows = [
      ["Assignments", assignmentReady, assignmentReady ? "All required operational roles are assigned" : "Resolve assignment readiness blockers"],
      ["Entries", entryReady, entryReady ? "All Competition entries are ready" : "Resolve entry readiness blockers"],
      ["Brackets", bracketReady, bracketReady ? "All Competition brackets are ready" : "Generate or resolve required brackets"],
      ["Rules", governanceReady, `${operational?.summary?.competitions_ready || 0} / ${operational?.summary?.competitions_total || 0} competitions ready`],
      ["Match snapshots", adoptionSummary.eligible === 0 && lockedProfiles.length === profiles.length && profiles.length > 0, adoptionPreviews.length ? `${adoptionSummary.governed} governed · ${adoptionSummary.eligible} eligible` : "Run the adoption preview after profiles are locked"],
      ["Previous event", !activeWorkspace || Number(activeWorkspace.id) === targetWorkspaceId, activeWorkspace && Number(activeWorkspace.id) !== targetWorkspaceId ? `${activeWorkspace.name} is still active` : "No previous active event blocker"],
      ["Schedule", scheduleFuture && !scheduleValidation?.has_blocking_issues, scheduleFuture ? `${scheduleValidation?.blocking_count || 0} blocking schedule issues` : "Choose and apply a future rehearsal window"],
      ["Activation", activationReady, activationReady ? "Backend readiness permits activation" : "Blocked until every authoritative check passes"],
    ];
    return <div className="space-y-5"><div><h2 className="text-lg font-bold text-[var(--text-main)]">Final readiness</h2><p className="mt-1 text-sm text-[var(--text-muted)]">Activation stays server-gated. This page cannot override a blocker.</p></div><div className="divide-y divide-[var(--border-soft)] rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]">{rows.map(([label, ready, note]) => <div key={label} className="flex items-center justify-between gap-4 p-4"><div><p className="font-semibold text-[var(--text-main)]">{label}</p><p className="text-xs text-[var(--text-muted)]">{note}</p></div><SetupStatus ready={ready} pending={!ready} /></div>)}</div><div className="flex justify-end"><button type="button" disabled={!activationReady || busy} onClick={() => setActivationOpen(true)} className="os-btn-primary-soft min-h-12 disabled:cursor-not-allowed disabled:opacity-50"><Play size={16} /> Activate {selectedTournamentName || "Intramural"}</button></div></div>;
  };

  return <main className="mx-auto w-full max-w-6xl space-y-5 p-4 sm:p-6 lg:p-8">
    <header><p className="text-xs font-bold uppercase tracking-widest text-blue-600">Coordinator operations</p><h1 className="mt-1 text-2xl font-black text-[var(--text-main)] sm:text-3xl">Live Rehearsal Setup</h1><p className="mt-1 text-sm text-[var(--text-muted)]">{selectedTournamentName || targetTournament?.tournament_name} · resolve human decisions without bypassing governance.</p></header>
    <nav aria-label="Rehearsal setup steps" className="flex gap-2 overflow-x-auto pb-1">{REHEARSAL_STEPS.map((item, index) => <button key={item.key} type="button" onClick={() => setStep(item.key)} aria-current={step === item.key ? "step" : undefined} className={`min-h-11 shrink-0 rounded-xl px-3 text-sm font-semibold ${step === item.key ? "bg-blue-600 text-white" : "border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--text-muted)]"}`}>{index + 1}. {item.label}</button>)}</nav>
    {error ? <div role="alert" className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-500/10 dark:text-rose-200"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}<button type="button" className="ml-auto font-semibold" onClick={() => void load()}>Retry</button></div> : null}
    {success ? <div role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200"><Check className="h-4 w-4" />{success}</div> : null}
    {step === "rules" ? renderRules() : step === "governance" ? renderGovernance() : step === "previous" ? renderPrevious() : step === "dates" ? renderDates() : renderReview()}

    <AppModal open={Boolean(confirmSport)} onClose={() => !busy && setConfirmSport(null)} title={`${institutionalStandards.find((row) => row.sport_code === confirmSport)?.sport_name || "Sport"} Rules`} subtitle="Review every institutional decision before recording it." maxWidthClass="max-w-xl"><dl className="divide-y divide-[var(--border-soft)]">{Object.entries(decisionValues[confirmSport] || {}).map(([name, value]) => <div key={name} className="flex justify-between gap-4 py-3 text-sm"><dt className="text-[var(--text-muted)]">{requirements[confirmSport]?.confirmation_schema?.fields?.[name]?.label || friendlyValue(name)}</dt><dd className="text-right font-semibold text-[var(--text-main)]">{friendlyValue(value)}</dd></div>)}</dl><p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">These rules become the institutional configuration for this Intramural. Profile approval and locking remain separate steps.</p><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setConfirmSport(null)} disabled={busy} className="os-btn-ghost-soft min-h-10">Back</button><button type="button" onClick={saveDecision} disabled={busy} className="os-btn-primary-soft min-h-10">{busy ? "Recording..." : "Confirm institutional rules"}</button></div></AppModal>
    <AppModal open={Boolean(profileEditor)} onClose={() => setProfileEditor(null)} title={profileEditor?.label || "Rule profile"} subtitle="Use the existing governed profile lifecycle." maxWidthClass="max-w-6xl" bodyClassName="p-4 sm:p-6">{profileEditor ? <RuleGovernancePage embedded lockSportSelection initialSportId={profileEditor.sport_id} initialEventId={profileEditor.event_id} /> : null}</AppModal>
    <AppModal open={adoptionOpen} onClose={() => !busy && setAdoptionOpen(false)} title="Adopt Governed Match Rules?" subtitle="Only reviewed, locked profiles are included." maxWidthClass="max-w-xl"><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Eligible", adoptionSummary.eligible], ["Already governed", adoptionSummary.governed], ["Protected", adoptionSummary.protected], ["Conflicts", adoptionSummary.conflicts]].map(([label, value]) => <div key={label} className="rounded-xl bg-[var(--surface-soft)] p-3 text-center"><p className="text-xl font-bold">{value}</p><p className="text-xs text-[var(--text-muted)]">{label}</p></div>)}</div><p className="mt-4 text-sm text-[var(--text-muted)]">Started Matches, completed Matches, scored Matches, and locked conflicting snapshots remain protected by the backend.</p><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setAdoptionOpen(false)} disabled={busy} className="os-btn-ghost-soft min-h-10">Cancel</button><button type="button" onClick={applyAdoption} disabled={busy || adoptionSummary.conflicts > 0 || adoptionSummary.eligible === 0} className="os-btn-primary-soft min-h-10">Adopt governed Match rules</button></div></AppModal>
    <AppModal open={dateApplyOpen} onClose={() => !busy && setDateApplyOpen(false)} title="Shift Tournament Schedule?" subtitle="Existing published Match times move to the approved rehearsal dates." maxWidthClass="max-w-xl"><p className="text-sm text-[var(--text-muted)]">Bracket structure, participants, relative times, venue assignments, and completed results will not change. Pending reminders will be replaced transactionally.</p><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setDateApplyOpen(false)} disabled={busy} className="os-btn-ghost-soft min-h-10">Cancel</button><button type="button" onClick={applyDateShift} disabled={busy} className="os-btn-primary-soft min-h-10">Shift tournament schedule</button></div></AppModal>
    <AppModal open={activationOpen} onClose={() => !busy && setActivationOpen(false)} title={`Activate ${selectedTournamentName || "Intramural"}?`} subtitle="This makes the Intramural operational for live scoring." maxWidthClass="max-w-lg"><p className="text-sm text-[var(--text-muted)]">The server will re-evaluate every lifecycle blocker before activation. No MatchEvents or standings are created.</p><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setActivationOpen(false)} disabled={busy} className="os-btn-ghost-soft min-h-10">Cancel</button><button type="button" onClick={activate} disabled={busy} className="os-btn-primary-soft min-h-10">Activate Intramural</button></div></AppModal>
  </main>;
};

export default RehearsalSetup;
