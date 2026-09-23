import React from "react";

const normalizeIssues = (response) => {
  const rows = Array.isArray(response?.issues) ? response.issues : [];
  const cleaned = rows.map((row) => String(row || "").trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned : ["Invalid sport template configuration."];
};

const SafeModePanel = ({ response, onRefreshConfig, onReloadState }) => {
  const status = String(response?.status || "CONFIG_LOCKED").toUpperCase();
  const isMismatch = status === "CONFIG_MISMATCH" || status === "REVIEW";
  const [showDetails, setShowDetails] = React.useState(false);
  const reason = String(
    response?.reason
      || (isMismatch ? "Template has changed since match creation." : "Invalid sport template configuration")
  );
  const issues = normalizeIssues(response);

  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-amber-100">
      <h3 className="text-base font-semibold uppercase tracking-wide">
        {isMismatch ? "Scoring Temporarily Locked" : "Scoring Temporarily Disabled"}
      </h3>
      <p className="mt-2 text-sm text-slate-200">
        {isMismatch
          ? "Scoring is locked because the match rules changed or are out of sync."
          : "Scoring is paused because this match configuration needs attention."}
      </p>

      <div className="mt-3 rounded-lg border border-amber-500/30 bg-slate-950/60 p-3 text-sm text-slate-200">
        <p className="font-semibold uppercase tracking-wide text-amber-200">Reason</p>
        <p className="mt-1">{reason}</p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onRefreshConfig}
          className="rounded-lg border border-amber-400/50 bg-amber-400/15 px-3 py-1.5 text-xs font-semibold text-amber-100 transition hover:bg-amber-400/25"
        >
          Refresh Scoring Config
        </button>
        <button
          type="button"
          onClick={onReloadState}
          className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-slate-800"
        >
          Reload Match State
        </button>
        <button
          type="button"
          onClick={() => setShowDetails((current) => !current)}
          className="rounded-lg border border-amber-500/40 bg-transparent px-3 py-1.5 text-xs font-semibold text-amber-100 transition hover:bg-amber-500/15"
        >
          {showDetails ? "Hide Technical Details" : "View Technical Details"}
        </button>
      </div>

      {showDetails && (
        <div className="mt-3 rounded-lg border border-amber-500/30 bg-slate-950/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-200">Technical Details</p>
          <ul className="mt-1 space-y-1 text-xs text-slate-200">
            <li>Status: {status}</li>
            <li>Mode: {String(response?.mode || "READ_ONLY").toUpperCase()}</li>
          </ul>
          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-amber-200">Issues</p>
          <ul className="mt-1 space-y-1 text-xs text-slate-200">
          {issues.map((issue, idx) => (
            <li key={`${issue}-${idx}`}>- {issue}</li>
          ))}
          </ul>
        </div>
      )}

      <div className="mt-3 rounded-lg border border-slate-700 bg-slate-900/70 p-3 text-xs text-slate-200">
        <p>Scoreboard and timeline stay available while editing is locked.</p>
        <p className="mt-1">This protection prevents accidental scoring inconsistencies.</p>
        <p className="mt-1 text-slate-300">If this persists, contact the sports administrator to sync match rules.</p>
      </div>
    </div>
  );
};

export default SafeModePanel;
