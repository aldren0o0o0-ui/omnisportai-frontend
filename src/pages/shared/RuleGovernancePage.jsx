import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  ExternalLink,
  History,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
  ShieldCheck,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import useTournamentAccess from "../../hooks/useTournamentAccess";
import { getSportDisplayName } from "../../utils/tournamentEventCategories";
import {
  adoptRuleProfile,
  createIntramuralRuleProfile,
  getApprovedRuleSummaries,
  getGovernanceStandards,
  getInstitutionalConfirmation,
  getIntramuralRuleProfiles,
  getRuleProfileEvents,
  getRuleProfileHistory,
  getRuleProfileVersions,
  previewRuleProfileAdoption,
  resetRuleProfileDraft,
  saveInstitutionalConfirmation,
  setInstitutionalRuleDefault,
  transitionRuleProfile,
  updateRuleProfileDraft,
} from "../../services/ruleProfileService";
import {
  buildRuleDraftValues,
  configurationOverrides,
  formatRuleFieldLabel,
  getRuleGovernanceActions,
  normalizeRuleFieldValue,
  PROFILE_STATUS_COPY,
} from "../../utils/ruleGovernanceUi";

const RULE_FIELD_CLASS =
  "mt-1 min-h-11 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 text-sm text-[var(--text-main)] outline-none transition placeholder:text-[var(--text-soft)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 disabled:cursor-not-allowed disabled:bg-[var(--surface-muted)] disabled:text-[var(--text-soft)] motion-reduce:transition-none";
const RULE_LABEL_CLASS = "text-sm font-medium text-[var(--text-main)]";

const participantTypeLabel = (value) => {
  const type = String(value || "").trim().toUpperCase();
  if (type === "SOLO" || type === "INDIVIDUAL" || type === "SINGLE") return "Solo";
  if (type === "DUO" || type === "DOUBLE" || type === "PAIR") return "Duo";
  if (type === "TEAM") return "Team";
  return formatRuleFieldLabel(type);
};

const errorMessage = (error) => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string") {
    if (detail.toLowerCase().includes("changed after you opened")) {
      return "This profile changed while you were editing. Refresh and review the latest version.";
    }
    return detail;
  }
  return detail?.message || "The rule profile could not be updated. Review the settings and try again.";
};

const StatusBadge = ({ status }) => {
  const normalized = String(status || "DRAFT").toUpperCase();
  const tone = {
    DRAFT: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
    VALIDATED: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-200",
    PENDING_APPROVAL:
      "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200",
    APPROVED:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200",
    LOCKED:
      "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-200",
  }[normalized] || "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>
      {(PROFILE_STATUS_COPY[normalized] || [formatRuleFieldLabel(normalized)])[0]}
    </span>
  );
};

export const RuleField = ({ name, definition, value, disabled, onChange }) => {
  const type = String(definition?.type || "").toLowerCase();
  const label = definition?.label || formatRuleFieldLabel(name);
  const base = RULE_FIELD_CLASS;

  if (type === "boolean") {
    return (
      <label className="flex min-h-11 items-center justify-between gap-4 py-2">
        <span className={RULE_LABEL_CLASS}>
          {label}
        </span>
        <input
          type="checkbox"
          checked={Boolean(value)}
          disabled={disabled}
          onChange={(event) => onChange(name, event.target.checked, definition)}
          className="h-5 w-5 rounded border-[var(--border-soft)] bg-[var(--surface)] text-[var(--primary)] focus:ring-[var(--primary)]"
        />
      </label>
    );
  }

  if (type === "enum") {
    return (
      <label className="block">
        <span className={RULE_LABEL_CLASS}>
          {label}
        </span>
        <select
          value={value ?? ""}
          disabled={disabled}
          onChange={(event) => {
            const selected = (definition.values || []).find(
              (item) => String(item) === event.target.value
            );
            onChange(name, selected ?? event.target.value, definition);
          }}
          className={base}
        >
          <option value="">Select</option>
          {(definition.values || []).map((item) => (
            <option key={String(item)} value={String(item)}>
              {formatRuleFieldLabel(item)}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (type === "ordered_list") {
    const selected = Array.isArray(value) ? value : [];
    const available = (definition.values || []).filter(
      (item) => !selected.includes(item)
    );
    const move = (index, offset) => {
      const nextIndex = index + offset;
      if (nextIndex < 0 || nextIndex >= selected.length) return;
      const next = [...selected];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      onChange(name, next, definition);
    };
    return (
      <fieldset>
        <legend className={RULE_LABEL_CLASS}>
          {label}
        </legend>
        <div className="mt-2 space-y-2">
          {selected.map((item, index) => (
            <div
              key={String(item)}
              className="flex min-h-10 items-center gap-2 rounded-lg bg-slate-100 px-3 dark:bg-slate-800"
            >
              <span className="min-w-0 flex-1 text-xs font-semibold text-slate-800 dark:text-slate-100">
                {index + 1}. {formatRuleFieldLabel(item)}
              </span>
              <button
                type="button"
                aria-label={`Move ${formatRuleFieldLabel(item)} earlier`}
                disabled={disabled || index === 0}
                onClick={() => move(index, -1)}
                className="rounded p-1 text-slate-500 hover:bg-white disabled:opacity-30 dark:hover:bg-slate-700"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label={`Move ${formatRuleFieldLabel(item)} later`}
                disabled={disabled || index === selected.length - 1}
                onClick={() => move(index, 1)}
                className="rounded p-1 text-slate-500 hover:bg-white disabled:opacity-30 dark:hover:bg-slate-700"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() =>
                  onChange(
                    name,
                    selected.filter((entry) => entry !== item),
                    definition
                  )
                }
                className="text-xs font-semibold text-rose-700 dark:text-rose-300"
              >
                Remove
              </button>
            </div>
          ))}
          {available.length ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {available.map((item) => (
                <button
                  key={String(item)}
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    onChange(name, [...selected, item], definition)
                  }
                  className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Add {formatRuleFieldLabel(item)}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </fieldset>
    );
  }

  return (
    <label className="block">
      <span className={RULE_LABEL_CLASS}>
        {label}
      </span>
      <input
        type="number"
        step={type === "decimal" ? "any" : "1"}
        min={definition.minimum}
        max={definition.maximum}
        value={value ?? ""}
        disabled={disabled}
        onChange={(event) =>
          onChange(name, event.target.value, definition)
        }
        className={base}
      />
      <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
        {definition.minimum != null && definition.maximum != null
          ? `${definition.minimum}–${definition.maximum}${
              definition.unit ? ` ${definition.unit}` : ""
            }`
          : definition.unit || ""}
      </span>
    </label>
  );
};

const PageSkeleton = () => (
  <div className="animate-pulse space-y-6" aria-label="Loading Sport rules">
    <div className="h-9 w-56 rounded bg-slate-200 dark:bg-slate-800" />
    <div className="h-12 rounded-xl bg-slate-100 dark:bg-slate-900" />
    <div className="grid gap-5 md:grid-cols-2">
      <div className="h-64 rounded-2xl bg-slate-100 dark:bg-slate-900" />
      <div className="h-64 rounded-2xl bg-slate-100 dark:bg-slate-900" />
    </div>
  </div>
);

const RuleGovernancePage = ({ initialSportId = null, initialEventId = null, embedded = false, lockSportSelection = false }) => {
  const { isSportsCoordinator, isSportsFacilitator } = useAuth();
  const {
    selectedTournamentId,
    selectedTournamentName,
    hasSelectedTournament,
    loading: accessLoading,
  } = useTournamentAccess();
  const [standards, setStandards] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [selectedSummaryId, setSelectedSummaryId] = useState("");
  const [profiles, setProfiles] = useState([]);
  const [selectedSportId, setSelectedSportId] = useState("");
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [formValues, setFormValues] = useState({});
  const [reason, setReason] = useState("Update the Intramural rule profile.");
  const [confirmation, setConfirmation] = useState(null);
  const [confirmationValues, setConfirmationValues] = useState({});
  const [confirmationSource, setConfirmationSource] = useState("");
  const [confirmationNote, setConfirmationNote] = useState("");
  const [versions, setVersions] = useState([]);
  const [audits, setAudits] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [adoptionPreview, setAdoptionPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isAssignedFacilitator = Boolean(
    isSportsFacilitator && !isSportsCoordinator
  );
  const canManageGovernance = Boolean(
    isSportsCoordinator || isAssignedFacilitator
  );
  const selectedStandard = useMemo(
    () =>
      standards.find(
        (row) => Number(row.sport_id) === Number(selectedSportId)
      ) || null,
    [selectedSportId, standards]
  );
  const selectedEvent = useMemo(
    () =>
      events.find((row) => Number(row.id) === Number(selectedEventId)) || null,
    [events, selectedEventId]
  );
  const participantTypeOptions = useMemo(() => {
    return events.reduce((options, event) => {
      const type = String(event?.participant_shape || "").trim().toUpperCase();
      if (!type) return options;
      options.push({
        eventId: String(event.id),
        type,
        label: `${event.event_name} · ${participantTypeLabel(type)}`,
      });
      return options;
    }, []);
  }, [events]);
  const selectedSummary = useMemo(
    () =>
      summaries.find(
        (row) => Number(row.profile_id) === Number(selectedSummaryId)
      ) || null,
    [selectedSummaryId, summaries]
  );
  const currentProfile = useMemo(() => {
    const active = profiles
      .filter(
        (row) =>
          Number(row.sport_id) === Number(selectedSportId) &&
          !["SUPERSEDED", "RETIRED"].includes(row.governance_status)
      )
      .sort((a, b) => Number(b.version) - Number(a.version));
    if (selectedEventId) {
      const exact = active.find(
        (row) =>
          Number(row.tournament_sport_event_id) === Number(selectedEventId)
      );
      if (exact) return exact;
    }
    return (
      active.find((row) => row.tournament_sport_event_id == null) || null
    );
  }, [profiles, selectedEventId, selectedSportId]);
  const isEventFallback = Boolean(
    selectedEventId &&
      currentProfile &&
      currentProfile.tournament_sport_event_id == null
  );
  const actions = getRuleGovernanceActions({
    status: currentProfile?.governance_status,
    isCoordinator: isSportsCoordinator,
    isAssignedFacilitator,
  });

  const loadBase = useCallback(async () => {
    if (!selectedTournamentId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (!canManageGovernance) {
        const summaryRows = await getApprovedRuleSummaries({
          tournamentId: selectedTournamentId,
        });
        setSummaries(summaryRows);
        setStandards([]);
        setProfiles([]);
        setSelectedSummaryId((current) => {
          if (initialSportId) {
            const selected = summaryRows.find((row) => Number(row.sport_id) === Number(initialSportId));
            return selected ? String(selected.profile_id) : "";
          }
          return summaryRows.some((row) => String(row.profile_id) === String(current))
            ? current
            : String(summaryRows[0]?.profile_id || "");
        });
        return;
      }
      const [standardRows, profileRows] = await Promise.all([
        getGovernanceStandards({
          tournamentId: selectedTournamentId,
        }),
        getIntramuralRuleProfiles(selectedTournamentId),
      ]);
      setStandards(standardRows);
      setSummaries([]);
      setProfiles(profileRows);
      setSelectedSportId((current) => {
        if (initialSportId) {
          return String(initialSportId);
        }
        return standardRows.some((row) => String(row.sport_id) === String(current))
          ? current
          : String(standardRows[0]?.sport_id || "");
      });
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [canManageGovernance, initialSportId, selectedTournamentId]);

  useEffect(() => {
    if (!accessLoading) void loadBase();
  }, [accessLoading, loadBase]);

  useEffect(() => {
    if (!canManageGovernance) {
      setEvents([]);
      return;
    }
    if (!selectedTournamentId || !selectedSportId || !selectedStandard) {
      setEvents([]);
      return;
    }
    setEvents([]);
    let active = true;
    getRuleProfileEvents(selectedTournamentId, selectedSportId)
      .then((rows) => {
        if (active) setEvents(rows);
      })
      .catch(() => {
        if (active) setEvents([]);
      });
    return () => {
      active = false;
    };
  }, [canManageGovernance, selectedSportId, selectedStandard, selectedTournamentId]);

  useEffect(() => {
    if (participantTypeOptions.length === 0) {
      setSelectedEventId("");
      return;
    }
    setSelectedEventId((current) =>
      participantTypeOptions.some((option) => option.eventId === String(initialEventId))
        ? String(initialEventId)
        : participantTypeOptions.some((option) => option.eventId === String(current))
        ? current
        : participantTypeOptions[0].eventId
    );
  }, [initialEventId, participantTypeOptions]);

  useEffect(() => {
    setFormValues(buildRuleDraftValues(selectedStandard, currentProfile));
    setAdoptionPreview(null);
  }, [currentProfile, selectedStandard]);

  useEffect(() => {
    if (!canManageGovernance) {
      setConfirmation(null);
      return;
    }
    if (!selectedTournamentId || !selectedSportId) {
      setConfirmation(null);
      return;
    }
    let active = true;
    getInstitutionalConfirmation({
      tournamentId: selectedTournamentId,
      sportId: selectedSportId,
      eventId: selectedEventId || null,
    })
      .then((result) => {
        if (!active) return;
        setConfirmation(result);
        setConfirmationValues(result?.confirmation?.decision_values || {});
        setConfirmationSource(
          result?.confirmation?.adopted_source_or_policy || ""
        );
        setConfirmationNote(result?.confirmation?.approval_note || "");
      })
      .catch(() => {
        if (active) setConfirmation(null);
      });
    return () => {
      active = false;
    };
  }, [
    canManageGovernance,
    selectedEventId,
    selectedSportId,
    selectedTournamentId,
  ]);

  const refresh = async (message = "") => {
    await loadBase();
    setSuccess(message);
  };

  const mutate = async (operation, message) => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await operation();
      await refresh(message);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const createDraft = () =>
    mutate(
      () =>
        createIntramuralRuleProfile(selectedTournamentId, {
          standard_profile_id: selectedStandard.id,
          tournament_sport_event_id: selectedEventId
            ? Number(selectedEventId)
            : null,
          name: `${selectedStandard.sport_name}${
            selectedEvent ? ` ${selectedEvent.event_name}` : ""
          } Rules`,
          configuration: {},
          reason: "Adopt the protected standard for this Intramural scope.",
        }),
      "A standard-derived draft is ready."
    );

  const saveDraft = () =>
    mutate(
      () =>
        updateRuleProfileDraft(currentProfile.id, {
          configuration: configurationOverrides(selectedStandard, formValues),
          expected_row_version: currentProfile.row_version,
          reason,
        }),
      "Draft changes saved. Validate the profile when ready."
    );

  const resetDraft = () => {
    if (!window.confirm("Discard custom draft changes and return to standard rules?")) {
      return;
    }
    void mutate(
      () =>
        resetRuleProfileDraft(currentProfile.id, {
          expected_row_version: currentProfile.row_version,
          reason: "Reset the draft to the protected standard.",
        }),
      "The draft now uses standard rules."
    );
  };

  const transition = (action, message) =>
    mutate(
      () =>
        transitionRuleProfile(currentProfile.id, action, {
          expected_row_version: currentProfile.row_version,
          reason,
        }),
      message
    );

  const saveConfirmation = () =>
    mutate(
      () =>
        saveInstitutionalConfirmation({
          tournamentId: selectedTournamentId,
          sportId: selectedSportId,
          payload: {
            tournament_sport_event_id: selectedEventId
              ? Number(selectedEventId)
              : null,
            decision_values: confirmationValues,
            adopted_source_or_policy: confirmationSource,
            approval_note: confirmationNote || null,
          },
        }),
      "Institutional decisions were recorded and audited."
    );

  const openHistory = async () => {
    if (!currentProfile) return;
    setHistoryOpen(true);
    setError("");
    try {
      const [versionRows, auditRows] = await Promise.all([
        getRuleProfileVersions(currentProfile.id),
        getRuleProfileHistory(currentProfile.id),
      ]);
      setVersions(versionRows);
      setAudits(auditRows);
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  };

  const previewAdoption = async () => {
    setSaving(true);
    setError("");
    try {
      setAdoptionPreview(await previewRuleProfileAdoption(currentProfile.id));
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const confirmAdoption = () =>
    mutate(
      () =>
        adoptRuleProfile(currentProfile.id, {
          expected_row_version: currentProfile.row_version,
          reason: "Adopt the approved profile for eligible pre-start Matches.",
          confirm: true,
        }),
      "The approved profile was adopted for eligible Matches."
    );

  const setAsInstitutionalDefault = () =>
    mutate(
      () =>
        setInstitutionalRuleDefault(currentProfile.id, {
          expected_row_version: currentProfile.row_version,
          reason: reason || "Use this locked version for future compatible Intramurals.",
        }),
      "This version is now the institutional default for future compatible Intramurals."
    );

  if (!accessLoading && !hasSelectedTournament) {
    return (
      <main className={embedded ? "w-full" : "mx-auto w-full max-w-6xl px-4 py-8 sm:px-6"}>
        <h1 className="text-2xl font-bold text-slate-950 dark:text-white">
          Sport Rules
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Select an Intramural to configure its competition rules.
        </p>
      </main>
    );
  }

  if (loading || accessLoading) {
    return (
      <main className={embedded ? "w-full" : "mx-auto w-full max-w-6xl px-4 py-8 sm:px-6"}>
        <PageSkeleton />
      </main>
    );
  }

  if (!canManageGovernance) {
    return (
      <main className={embedded ? "w-full" : "mx-auto w-full max-w-4xl px-4 py-6 sm:px-6"}>
        {!embedded ? (
          <>
            <h1 className="text-2xl font-bold text-slate-950 dark:text-white">Sport Rules</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              View the approved competition format for {selectedTournamentName || "this Intramural"}.
            </p>
          </>
        ) : null}
        {summaries.length ? (
          <>
            {lockSportSelection && !embedded ? (
              <div className="mt-6 max-w-md">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sport</span>
                <p className="mt-1 min-h-11 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] px-3 py-3 text-sm font-semibold text-[var(--text-main)]">{getSportDisplayName(selectedSummary, "Selected sport")}</p>
              </div>
            ) : !lockSportSelection ? <label className="mt-6 block max-w-md">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Sport
              </span>
              <select
                value={selectedSummaryId}
                onChange={(event) => setSelectedSummaryId(event.target.value)}
                className={RULE_FIELD_CLASS}
              >
                {summaries.map((summary) => (
                  <option key={summary.profile_id} value={summary.profile_id}>
                    {getSportDisplayName(summary)}
                    {summary.event_name ? ` · ${summary.event_name}` : ""}
                  </option>
                ))}
              </select>
            </label> : null}
            {selectedSummary ? (
              <section className={embedded ? "pt-1" : "mt-8 border-t border-slate-200 pt-7 dark:border-slate-800"}>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-950 dark:text-white">
                    {getSportDisplayName(selectedSummary)}
                  </h2>
                  <StatusBadge status={selectedSummary.governance_status} />
                </div>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  {selectedSummary.source_label}
                </p>
                <dl className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2">
                  {Object.entries(selectedSummary.rules || {}).map(
                    ([name, value]) => (
                      <div key={name}>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {formatRuleFieldLabel(name)}
                        </dt>
                        <dd className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                          {Array.isArray(value)
                            ? value
                                .map((item) => formatRuleFieldLabel(item))
                                .join(", ")
                            : typeof value === "boolean"
                              ? value
                                ? "Enabled"
                                : "Disabled"
                              : String(value)}
                        </dd>
                      </div>
                    )
                  )}
                </dl>
              </section>
            ) : null}
          </>
        ) : (
          <p className="mt-8 text-sm text-slate-500 dark:text-slate-400">
            No approved rule summary is available for this Intramural yet.
          </p>
        )}
      </main>
    );
  }

  const statusCopy =
    PROFILE_STATUS_COPY[currentProfile?.governance_status] ||
    PROFILE_STATUS_COPY.DRAFT;
  const confirmationFields =
    confirmation?.confirmation_schema?.fields || {};

  return (
    <main className={embedded ? "w-full" : "mx-auto w-full max-w-6xl px-4 py-6 sm:px-6"}>
      {!embedded ? <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950 dark:text-white">
            Sport Rules
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Configure the approved competition format for{" "}
            {selectedTournamentName || "this Intramural"}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadBase()}
          disabled={saving}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </header> : null}

      {(!lockSportSelection || !embedded || participantTypeOptions.length > 0) ? (
      <div className={embedded ? "grid gap-3 sm:max-w-md" : "mt-6 grid gap-3 sm:grid-cols-2"}>
        {!lockSportSelection ? <label>
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Sport
          </span>
          <select
            value={selectedSportId}
            onChange={(event) => {
              setSelectedSportId(event.target.value);
              setSelectedEventId("");
            }}
            className={RULE_FIELD_CLASS}
          >
            {standards.map((standard) => (
              <option key={standard.id} value={standard.sport_id}>
                {getSportDisplayName(standard)}
              </option>
            ))}
          </select>
        </label> : !embedded ? (
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sport</span>
            <p className="mt-1 min-h-11 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] px-3 py-3 text-sm font-semibold text-[var(--text-main)]">{getSportDisplayName(selectedStandard, "Loading sport...")}</p>
          </div>
        ) : null}
        {participantTypeOptions.length > 0 ? (
          <label>
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Participant type
            </span>
            <select
              value={selectedEventId}
              onChange={(event) => setSelectedEventId(event.target.value)}
              disabled={participantTypeOptions.length === 1}
              className={RULE_FIELD_CLASS}
            >
              {participantTypeOptions.map((option) => (
                <option key={option.type} value={option.eventId}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      ) : null}

      {error ? (
        <div role="alert" className="mt-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-800 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </div>
      ) : null}
      {success ? (
        <div role="status" className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">
          <Check className="h-4 w-4" />
          {success}
        </div>
      ) : null}

      {selectedStandard ? (
        <section className="mt-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-slate-950 dark:text-white">
                  {getSportDisplayName(selectedStandard)}
                  {selectedEvent ? ` · ${selectedEvent.event_name}` : ""}
                </h2>
                {currentProfile ? (
                  <>
                    <StatusBadge status={currentProfile.governance_status} />
                    <span className="text-xs font-semibold text-slate-500">
                      Version {currentProfile.version}
                    </span>
                    {currentProfile.is_institutional_default ? (
                      <span className="rounded-full bg-cyan-100 px-2 py-1 text-xs font-semibold text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-200">
                        Current institutional default
                      </span>
                    ) : null}
                  </>
                ) : null}
              </div>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                {currentProfile ? statusCopy[1] : "No local rule profile exists for this scope."}
              </p>
            </div>
            {currentProfile && !embedded ? (
              <button
                type="button"
                onClick={() => void openHistory()}
                className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-300"
              >
                <History className="h-4 w-4" />
                Version history
              </button>
            ) : null}
          </div>

          <div className={embedded ? "mt-5" : "mt-6 grid gap-8 lg:grid-cols-[0.8fr_1.2fr]"}>
            {!embedded ? <div>
              <h3 className="text-sm font-semibold text-slate-950 dark:text-white">
                Rule source
              </h3>
              <p className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-200">
                {currentProfile?.using_standard_rules
                  ? "Using standard rules"
                  : "Using BCC custom rules"}
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {selectedStandard.governing_body} · {selectedStandard.source_edition}
              </p>
              {!currentProfile?.using_standard_rules &&
              currentProfile?.modified_fields?.length ? (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Modified
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-slate-700 dark:text-slate-300">
                    {currentProfile.modified_fields.map((field) => (
                      <li key={field}>• {formatRuleFieldLabel(field)}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <a
                href={selectedStandard.source_url}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:underline dark:text-blue-300"
              >
                Open official source <ExternalLink className="h-3.5 w-3.5" />
              </a>
              {currentProfile?.updated_at ? (
                <p className="mt-5 text-xs text-slate-500 dark:text-slate-400">
                  Updated{" "}
                  {new Date(currentProfile.updated_at).toLocaleString()}
                  {currentProfile.updated_by_name
                    ? ` by ${currentProfile.updated_by_name}`
                    : ""}
                </p>
              ) : null}
            </div> : null}

            <div>
              {!currentProfile || isEventFallback ? (
                <div className="rounded-xl bg-slate-100 p-5 dark:bg-slate-900">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {isEventFallback
                      ? "This Event currently inherits Sport-level rules"
                      : "Adopt standard rules"}
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Create a protected standard-derived draft for this exact scope.
                  </p>
                  <button
                    type="button"
                    onClick={() => void createDraft()}
                    disabled={saving}
                    className="mt-4 min-h-11 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {isEventFallback ? "Create Event profile" : "Adopt Standard Rules"}
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="text-base font-semibold text-slate-950 dark:text-white">
                    Rule settings
                  </h3>
                  <div className="mt-4 grid gap-5 sm:grid-cols-2">
                    {Object.entries(
                      selectedStandard.configurable_schema || {}
                    ).map(([name, definition]) => (
                      <RuleField
                        key={name}
                        name={name}
                        definition={definition}
                        value={formValues[name]}
                        disabled={!actions.edit || saving}
                        onChange={(field, value, schema) =>
                          setFormValues((current) => ({
                            ...current,
                            [field]: normalizeRuleFieldValue(schema, value),
                          }))
                        }
                      />
                    ))}
                  </div>
                  {Object.keys(selectedStandard.configurable_schema || {})
                    .length === 0 ? (
                    <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                      This structural template has no ordinary editable fields.
                    </p>
                  ) : null}
                  {actions.edit ? (
                    <div className="mt-5">
                      <label className="block">
                        <span className={RULE_LABEL_CLASS}>Reason for change</span>
                        <input
                          value={reason}
                          onChange={(event) => setReason(event.target.value)}
                          placeholder="Briefly explain this update"
                          className={RULE_FIELD_CLASS}
                        />
                      </label>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void saveDraft()}
                          disabled={saving}
                          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                        >
                          <Save className="h-4 w-4" /> Save draft
                        </button>
                        <button
                          type="button"
                          onClick={resetDraft}
                          disabled={saving || currentProfile.using_standard_rules}
                          className="inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-900"
                        >
                          <RotateCcw className="h-4 w-4" /> Reset to standard
                        </button>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {confirmation?.required ? (
        <section className="mt-9 border-t border-slate-200 pt-7 dark:border-slate-800">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <h2 className="font-bold text-slate-950 dark:text-white">
                Confirm required rules
              </h2>
              <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-400">
                Complete these decisions before the rules can be approved.
              </p>
            </div>
          </div>
          {!embedded ? <ul className="mt-4 grid gap-1 text-sm text-slate-700 dark:text-slate-300 sm:grid-cols-2">
            {(confirmation.pending_decisions || []).map((decision) => (
              <li key={decision}>• {decision}</li>
            ))}
          </ul> : null}
          {isSportsCoordinator ? (
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              {Object.entries(confirmationFields).map(([name, definition]) => (
                <RuleField
                  key={name}
                  name={name}
                  definition={definition}
                  value={confirmationValues[name]}
                  disabled={saving}
                  onChange={(field, value, schema) =>
                    setConfirmationValues((current) => ({
                      ...current,
                      [field]: normalizeRuleFieldValue(schema, value),
                    }))
                  }
                />
              ))}
              <label className="sm:col-span-2">
                <span className={RULE_LABEL_CLASS}>
                  Policy or source
                </span>
                <input
                  value={confirmationSource}
                  onChange={(event) => setConfirmationSource(event.target.value)}
                  className={RULE_FIELD_CLASS}
                />
              </label>
              <label className="sm:col-span-2">
                <span className={RULE_LABEL_CLASS}>
                  Approval note
                </span>
                <input
                  value={confirmationNote}
                  onChange={(event) => setConfirmationNote(event.target.value)}
                  className={RULE_FIELD_CLASS}
                />
              </label>
              <button
                type="button"
                onClick={() => void saveConfirmation()}
                disabled={saving}
                className="min-h-11 rounded-xl bg-amber-600 px-4 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60 sm:w-fit"
              >
                Confirm institutional rules
              </button>
            </div>
          ) : (
            <p className="mt-5 text-sm font-medium text-amber-700 dark:text-amber-300">
              A Sports Coordinator must record the formal confirmation.
            </p>
          )}
        </section>
      ) : null}

      {currentProfile && !isEventFallback ? (
        <section className="mt-9 border-t border-slate-200 pt-7 dark:border-slate-800">
          <h2 className="font-bold text-slate-950 dark:text-white">
            {embedded ? "Next step" : "Profile actions"}
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {actions.validate ? (
              <button type="button" onClick={() => void transition("validate", "Rules passed validation.")} disabled={saving} className="min-h-11 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white">
                Validate
              </button>
            ) : null}
            {actions.submit ? (
              <button type="button" onClick={() => void transition("submit", "Rules were submitted for Coordinator approval.")} disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white">
                <Send className="h-4 w-4" /> Submit
              </button>
            ) : null}
            {actions.approve ? (
              <button type="button" onClick={() => void transition("approve", "Rules were approved.")} disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white">
                <ShieldCheck className="h-4 w-4" /> Approve
              </button>
            ) : null}
            {actions.lock ? (
              <button type="button" onClick={() => void transition("lock", "Rules were locked for adoption.")} disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white">
                <LockKeyhole className="h-4 w-4" /> Lock
              </button>
            ) : null}
            {actions.adopt ? (
              <button type="button" onClick={() => void previewAdoption()} disabled={saving} className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-800 dark:border-slate-700 dark:text-slate-200">
                Preview Match adoption
              </button>
            ) : null}
            {isSportsCoordinator && currentProfile.governance_status === "LOCKED" && !currentProfile.is_institutional_default ? (
              <button type="button" onClick={() => void setAsInstitutionalDefault()} disabled={saving} className="min-h-11 rounded-xl border border-cyan-500 px-4 text-sm font-semibold text-cyan-700 dark:text-cyan-200">
                Set as institutional default
              </button>
            ) : null}
            {actions.supersede ? (
              <button type="button" onClick={() => void transition("supersede", "A new draft version was created.")} disabled={saving} className="min-h-11 rounded-xl px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900">
                Create new version
              </button>
            ) : null}
            {actions.retire ? (
              <button type="button" onClick={() => void transition("retire", "The profile was retired.")} disabled={saving} className="min-h-11 rounded-xl px-4 text-sm font-semibold text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10">
                Retire
              </button>
            ) : null}
            {saving ? (
              <span className="inline-flex items-center gap-2 px-2 text-sm text-slate-500">
                <LoaderCircle className="h-4 w-4 animate-spin" /> Saving…
              </span>
            ) : null}
          </div>
        </section>
      ) : null}

      {adoptionPreview ? (
        <section className="mt-7 rounded-2xl bg-slate-100 p-5 dark:bg-slate-900">
          <h2 className="font-bold text-slate-950 dark:text-white">
            Match adoption preview
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Eligible Matches", adoptionPreview.eligible_matches],
              ["Already using version", adoptionPreview.already_using_version],
              [
                "Started or completed unchanged",
                Number(adoptionPreview.started_matches_unchanged || 0) +
                  Number(adoptionPreview.completed_matches_unchanged || 0),
              ],
              ["Participant mismatches", adoptionPreview.participant_mismatches || 0],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-2xl font-bold text-slate-950 dark:text-white">
                  {value}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {label}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
            Only unstarted, event-free, unlocked Matches with the same Sport, Event, and participant model are updated. Historical Matches remain unchanged.
          </p>
          <button
            type="button"
            onClick={() => void confirmAdoption()}
            disabled={saving || adoptionPreview.eligible_matches === 0}
            className="mt-4 min-h-11 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            Confirm adoption
          </button>
        </section>
      ) : null}

      {historyOpen ? (
        <section className="mt-9 border-t border-slate-200 pt-7 dark:border-slate-800">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bold text-slate-950 dark:text-white">
              Version and audit history
            </h2>
            <button type="button" onClick={() => setHistoryOpen(false)} className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              Close
            </button>
          </div>
          <div className="mt-5 space-y-4">
            {versions.map((version) => (
              <div key={version.id} className="flex flex-col gap-2 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    Version {version.version}
                  </p>
                  <p className="text-sm text-slate-500">
                    {version.modified_fields.length
                      ? `Changed: ${version.modified_fields
                          .map(formatRuleFieldLabel)
                          .join(", ")}`
                      : "Using standard rules"}
                  </p>
                </div>
                <StatusBadge status={version.governance_status} />
              </div>
            ))}
          </div>
          <details className="mt-5">
            <summary className="cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-300">
              Audit activity
            </summary>
            <div className="mt-3 space-y-3">
              {audits.map((audit) => (
                <div key={audit.id} className="flex gap-3 text-sm">
                  <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <div>
                    <p className="font-medium text-slate-800 dark:text-slate-200">
                      {formatRuleFieldLabel(audit.action)}
                    </p>
                    <p className="text-slate-500">
                      {audit.reason || "Governance update"} ·{" "}
                      {new Date(audit.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </details>
          <details className="mt-4">
            <summary className="cursor-pointer text-xs font-semibold text-slate-500">
              Technical details
            </summary>
            <p className="mt-2 text-xs text-slate-500">
              Profile {currentProfile?.id} · Template{" "}
              {selectedStandard?.template_code} · Row version{" "}
              {currentProfile?.row_version}
            </p>
          </details>
        </section>
      ) : null}

      {!standards.length ? (
        <div className="mt-10 text-center text-sm text-slate-500">
          No rule standards are available for your assigned Sport scope.
        </div>
      ) : null}
      {standards.length > 0 && initialSportId && !selectedStandard ? (
        <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] px-5 py-6 text-center">
          <p className="font-semibold text-[var(--text-main)]">
            This sport is not included in the selected Intramural.
          </p>
          <p className="mt-1 text-sm text-[var(--text-soft)]">
            Add the sport to {selectedTournamentName || "this Intramural"} before configuring its rules.
          </p>
        </div>
      ) : null}
    </main>
  );
};

export default RuleGovernancePage;
