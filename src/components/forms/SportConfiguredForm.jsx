import React, { useEffect, useMemo, useState } from "react";
import "./SportConfiguredForm.css";

const SURFACE_OPTIONS = ["wood", "grass", "turf", "court", "canvas"];

const buildStructuredSnapshot = (config, matchType, participationType) => {
  const normalizedMatchType = String(matchType || "").trim().toUpperCase();
  const normalizedParticipation = String(participationType || "").trim().toUpperCase();

  const rules = {
    overtime_rule: String(config?.rules?.overtime_rule || "none"),
    timeout_count: Number.isFinite(Number(config?.rules?.timeout_count))
      ? Number(config.rules.timeout_count)
      : 0,
    allow_substitutes:
      normalizedParticipation === "TEAM"
        ? Boolean(config?.rules?.allow_substitutes)
        : false
  };

  const venue = {
    indoor: Boolean(config?.venue?.indoor),
    length: config?.venue?.length ?? null,
    width: config?.venue?.width ?? null,
    surface_types: Array.isArray(config?.venue?.surface_types)
      ? config.venue.surface_types.filter((surface) => SURFACE_OPTIONS.includes(surface))
      : []
  };

  const ai = {
    predict_outcome: Boolean(config?.ai?.predict_outcome),
    track_performance: Boolean(config?.ai?.track_performance)
  };

  const scoringRules = normalizedMatchType === "SCORE"
    ? (Array.isArray(config?.scoring_rules) ? config.scoring_rules : [{ event: "", points: "" }])
    : [];

  return {
    rules,
    venue,
    ai,
    scoring_rules: scoringRules
  };
};

export default function SportConfiguredForm({
  format,
  onConfigChange,
  matchType,
  participationType
}) {
  const config = format?.config || {};
  const structured = useMemo(
    () => buildStructuredSnapshot(config, matchType, participationType),
    [config, matchType, participationType]
  );

  const [advancedMode, setAdvancedMode] = useState(Boolean(config?.advanced_mode));
  const [jsonEditor, setJsonEditor] = useState(
    JSON.stringify(config?.advanced_override || structured, null, 2)
  );

  useEffect(() => {
    setAdvancedMode(Boolean(config?.advanced_mode));
  }, [config?.advanced_mode]);

  useEffect(() => {
    if (!advancedMode) {
      setJsonEditor(JSON.stringify(structured, null, 2));
      return;
    }
    const current = config?.advanced_override || structured;
    setJsonEditor(JSON.stringify(current, null, 2));
  }, [advancedMode, config?.advanced_override, structured]);

  useEffect(() => {
    const normalizedParticipation = String(participationType || "").trim().toUpperCase();
    if (normalizedParticipation !== "TEAM" && structured.rules.allow_substitutes) {
      onConfigChange({
        ...config,
        rules: {
          ...structured.rules,
          allow_substitutes: false
        }
      });
    }
    // Intentionally omits onConfigChange/config to avoid needless loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participationType, structured.rules.allow_substitutes]);

  const applyStructuredPatch = (partial) => {
    onConfigChange({
      ...config,
      ...partial
    });
  };

  const handleRuleChange = (key, value) => {
    applyStructuredPatch({
      rules: {
        ...structured.rules,
        [key]: value
      }
    });
  };

  const handleVenueChange = (key, value) => {
    applyStructuredPatch({
      venue: {
        ...structured.venue,
        [key]: value
      }
    });
  };

  const handleAIChange = (key, value) => {
    applyStructuredPatch({
      ai: {
        ...structured.ai,
        [key]: value
      }
    });
  };

  const handleScoringRuleChange = (index, field, value) => {
    const nextRules = [...structured.scoring_rules];
    nextRules[index] = { ...nextRules[index], [field]: value };
    applyStructuredPatch({ scoring_rules: nextRules });
  };

  const handleAddScoringRule = () => {
    applyStructuredPatch({
      scoring_rules: [...structured.scoring_rules, { event: "", points: "" }]
    });
  };

  const handleRemoveScoringRule = (index) => {
    const nextRules = structured.scoring_rules.filter((_, rowIndex) => rowIndex !== index);
    applyStructuredPatch({
      scoring_rules: nextRules.length > 0 ? nextRules : [{ event: "", points: "" }]
    });
  };

  const handleSurfaceTypeChange = (surface) => {
    const current = structured.venue.surface_types || [];
    const next = current.includes(surface)
      ? current.filter((entry) => entry !== surface)
      : [...current, surface];
    handleVenueChange("surface_types", next);
  };

  const toggleAdvancedMode = () => {
    const nextMode = !advancedMode;
    setAdvancedMode(nextMode);
    if (!nextMode) {
      applyStructuredPatch({
        advanced_mode: false,
        advanced_override: null
      });
      return;
    }

    let parsed = null;
    try {
      parsed = JSON.parse(jsonEditor);
    } catch {
      parsed = structured;
      setJsonEditor(JSON.stringify(structured, null, 2));
    }

    applyStructuredPatch({
      advanced_mode: true,
      advanced_override: parsed
    });
  };

  const handleJsonEditorChange = (event) => {
    const rawValue = event.target.value;
    setJsonEditor(rawValue);
    try {
      const parsed = JSON.parse(rawValue);
      applyStructuredPatch({
        advanced_mode: true,
        advanced_override: parsed
      });
    } catch {
      // Keep typing fluid; server validation will reject invalid JSON overrides.
    }
  };

  const normalizedMatchType = String(matchType || "").trim().toUpperCase();
  const normalizedParticipation = String(participationType || "").trim().toUpperCase();

  return (
    <div className="sport-configured-form">
      <section className="form-section">
        <h3 className="section-title">Game Rules</h3>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="overtime-rule">Overtime Rule</label>
            <select
              id="overtime-rule"
              value={structured.rules.overtime_rule}
              onChange={(event) => handleRuleChange("overtime_rule", event.target.value)}
            >
              <option value="none">None</option>
              <option value="sudden_death">Sudden Death</option>
              <option value="extra_time">Extra Time</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="timeout-count">Timeout Count</label>
            <input
              id="timeout-count"
              type="number"
              min="0"
              max="10"
              value={structured.rules.timeout_count}
              onChange={(event) =>
                handleRuleChange("timeout_count", Number.parseInt(event.target.value || "0", 10))
              }
            />
          </div>

          {normalizedParticipation === "TEAM" && (
            <div className="form-group checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={Boolean(structured.rules.allow_substitutes)}
                  onChange={(event) => handleRuleChange("allow_substitutes", event.target.checked)}
                />
                <span>Allow Substitutes</span>
              </label>
            </div>
          )}
        </div>
      </section>

      <section className="form-section">
        <h3 className="section-title">Venue</h3>
        <div className="form-grid">
          <div className="form-group checkbox">
            <label>
              <input
                type="checkbox"
                checked={Boolean(structured.venue.indoor)}
                onChange={(event) => handleVenueChange("indoor", event.target.checked)}
              />
              <span>Indoor</span>
            </label>
          </div>

          <div className="form-group">
            <label htmlFor="venue-length">Length</label>
            <input
              id="venue-length"
              type="number"
              min="0"
              step="0.01"
              value={structured.venue.length ?? ""}
              onChange={(event) =>
                handleVenueChange(
                  "length",
                  event.target.value === "" ? null : Number.parseFloat(event.target.value)
                )
              }
            />
          </div>

          <div className="form-group">
            <label htmlFor="venue-width">Width</label>
            <input
              id="venue-width"
              type="number"
              min="0"
              step="0.01"
              value={structured.venue.width ?? ""}
              onChange={(event) =>
                handleVenueChange(
                  "width",
                  event.target.value === "" ? null : Number.parseFloat(event.target.value)
                )
              }
            />
          </div>

          <div className="form-group surface-types">
            <label>Surface Type</label>
            <div className="checkbox-group">
              {SURFACE_OPTIONS.map((surface) => (
                <label key={surface} className="checkbox-inline">
                  <input
                    type="checkbox"
                    checked={structured.venue.surface_types.includes(surface)}
                    onChange={() => handleSurfaceTypeChange(surface)}
                  />
                  <span>{surface.charAt(0).toUpperCase() + surface.slice(1)}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="form-section">
        <h3 className="section-title">AI Features</h3>
        <div className="form-grid">
          <div className="form-group checkbox">
            <label>
              <input
                type="checkbox"
                checked={Boolean(structured.ai.predict_outcome)}
                onChange={(event) => handleAIChange("predict_outcome", event.target.checked)}
              />
              <span>Enable Outcome Prediction</span>
            </label>
          </div>

          <div className="form-group checkbox">
            <label>
              <input
                type="checkbox"
                checked={Boolean(structured.ai.track_performance)}
                onChange={(event) => handleAIChange("track_performance", event.target.checked)}
              />
              <span>Enable Performance Tracking</span>
            </label>
          </div>
        </div>
      </section>

      {normalizedMatchType === "SCORE" && (
        <section className="form-section">
          <h3 className="section-title">Scoring Rules</h3>
          <div className="scoring-rules">
            {structured.scoring_rules.map((rule, index) => (
              <div key={`score-rule-${index}`} className="scoring-rule-item">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor={`scoring-event-${index}`}>Event Name</label>
                    <input
                      id={`scoring-event-${index}`}
                      type="text"
                      value={rule.event || ""}
                      placeholder="e.g. goal, dunk, takedown"
                      onChange={(event) =>
                        handleScoringRuleChange(index, "event", event.target.value)
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor={`scoring-points-${index}`}>Points</label>
                    <input
                      id={`scoring-points-${index}`}
                      type="number"
                      min="0"
                      value={rule.points ?? ""}
                      onChange={(event) =>
                        handleScoringRuleChange(index, "points", event.target.value)
                      }
                    />
                  </div>
                  <button
                    type="button"
                    className="btn-remove"
                    onClick={() => handleRemoveScoringRule(index)}
                    aria-label="Remove rule"
                  >
                    x
                  </button>
                </div>
              </div>
            ))}
            <button type="button" className="btn-add-rule" onClick={handleAddScoringRule}>
              + Add Scoring Rule
            </button>
          </div>
        </section>
      )}

      <section className="form-section">
        <div className="advanced-mode-toggle">
          <button
            type="button"
            className={`btn-toggle ${advancedMode ? "active" : ""}`}
            onClick={toggleAdvancedMode}
          >
            {advancedMode ? "Hide" : "Enable"} Advanced Mode
          </button>
        </div>

        {advancedMode && (
          <div className="json-editor-section">
            <p className="help-text">
              Manual JSON override is enabled. This only appears in advanced mode.
            </p>
            <textarea
              className="json-editor"
              value={jsonEditor}
              onChange={handleJsonEditorChange}
              rows="12"
              placeholder="Paste JSON override configuration"
            />
            {(() => {
              try {
                JSON.parse(jsonEditor);
                return <p className="status-valid">Valid JSON</p>;
              } catch (error) {
                return <p className="status-error">Invalid JSON: {error.message}</p>;
              }
            })()}
          </div>
        )}
      </section>
    </div>
  );
}
