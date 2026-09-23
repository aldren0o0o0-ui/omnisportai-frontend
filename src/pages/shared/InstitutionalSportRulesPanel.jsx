import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, LoaderCircle, Save } from "lucide-react";

import {
  getInstitutionalSportRules,
  publishInstitutionalSportRules,
} from "../../services/ruleProfileService";
import {
  buildRuleDraftValues,
  configurationOverrides,
  normalizeRuleFieldValue,
} from "../../utils/ruleGovernanceUi";
import { RuleField } from "./RuleGovernancePage";

const FIELD_CLASS =
  "mt-1 min-h-11 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 text-sm text-[var(--text-main)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 disabled:bg-[var(--surface-muted)] disabled:text-[var(--text-soft)]";

const messageFromError = (error) => {
  const detail = error?.response?.data?.detail;
  return typeof detail === "string" ? detail : "The rules could not be saved. Review the values and try again.";
};

const InstitutionalSportRulesPanel = ({ sportId }) => {
  const [context, setContext] = useState(null);
  const [selectedModel, setSelectedModel] = useState("");
  const [values, setValues] = useState({});
  const [reason, setReason] = useState("Update the rules used by future Intramurals.");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getInstitutionalSportRules(sportId);
      setContext(result);
      setSelectedModel((current) =>
        result.participant_scopes?.some((scope) => scope.participant_model === current)
          ? current
          : result.participant_scopes?.[0]?.participant_model || ""
      );
    } catch (requestError) {
      setError(messageFromError(requestError));
    } finally {
      setLoading(false);
    }
  }, [sportId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedScope = useMemo(
    () => context?.participant_scopes?.find((scope) => scope.participant_model === selectedModel) || null,
    [context, selectedModel]
  );
  const currentDefault = useMemo(
    () => context?.current_defaults?.find(
      (profile) =>
        profile.participant_model === selectedModel &&
        String(profile.event_key || "") === String(selectedScope?.event_key || "")
    ) || null,
    [context, selectedModel, selectedScope]
  );

  useEffect(() => {
    if (!context?.standard || !selectedScope) return;
    setValues(buildRuleDraftValues(context.standard, currentDefault));
    setSuccess("");
    setError("");
  }, [context, currentDefault, selectedScope]);

  const publish = async () => {
    if (!context?.standard || !selectedScope) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await publishInstitutionalSportRules(sportId, {
        standard_profile_id: context.standard.id,
        participant_model: selectedScope.participant_model,
        event_key: selectedScope.event_key,
        configuration: configurationOverrides(context.standard, values),
        reason,
      });
      await load();
      setSuccess("Future Intramurals will use this rule version.");
    } catch (requestError) {
      setError(messageFromError(requestError));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-40 items-center justify-center text-[var(--text-soft)]"><LoaderCircle className="h-5 w-5 animate-spin" /></div>;
  }

  if (!context) {
    return <div role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800 dark:bg-rose-500/10 dark:text-rose-200">{error}</div>;
  }

  const scopes = context.participant_scopes || [];
  const configurableFields = Object.entries(context.standard?.configurable_schema || {});
  if (configurableFields.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4">
        <h3 className="font-semibold text-[var(--text-main)]">System-standard match rules</h3>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          This sport currently has no institutional rule settings to change.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="max-w-sm">
        <label className="block text-sm font-medium text-[var(--text-main)]">
          Participant type
          <select
            value={selectedModel}
            disabled={scopes.length <= 1}
            onChange={(event) => setSelectedModel(event.target.value)}
            className={FIELD_CLASS}
          >
            {scopes.map((scope) => <option key={scope.participant_model} value={scope.participant_model}>{scope.label}</option>)}
          </select>
        </label>
      </div>

      <section>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-[var(--text-main)]">Rule settings</h3>
          <span className="rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-semibold text-[var(--text-soft)]">
            {currentDefault ? `Rules version ${currentDefault.version}` : "Using standard rules"}
          </span>
        </div>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          {configurableFields.map(([name, definition]) => (
            <RuleField
              key={name}
              name={name}
              definition={definition}
              value={values[name]}
              disabled={saving}
              onChange={(field, value, schema) => setValues((current) => ({
                ...current,
                [field]: normalizeRuleFieldValue(schema, value),
              }))}
            />
          ))}
        </div>
      </section>

      <label className="block text-sm font-medium text-[var(--text-main)]">
        Reason for change
        <input value={reason} onChange={(event) => setReason(event.target.value)} className={FIELD_CLASS} />
      </label>

      {error ? <div role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-500/10 dark:text-rose-200">{error}</div> : null}
      {success ? <div role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200"><Check className="h-4 w-4" />{success}</div> : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-soft)] pt-5">
        <p className="max-w-lg text-xs text-[var(--text-soft)]">Existing Intramurals and completed Matches keep their saved rule versions.</p>
        <button type="button" onClick={() => void publish()} disabled={saving || !selectedScope} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
          {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Use for future Intramurals
        </button>
      </div>
    </div>
  );
};

export default InstitutionalSportRulesPanel;
