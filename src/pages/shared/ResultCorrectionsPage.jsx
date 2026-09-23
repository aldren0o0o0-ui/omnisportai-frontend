import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ClipboardCheck, ExternalLink, RefreshCw, ShieldAlert, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import {
  applyCorrection,
  approveCorrection,
  getCorrectionQueue,
  rejectCorrection,
} from "../../services/resultCorrectionService";
import {
  correctionErrorMessage,
  correctionStatusPresentation,
  summarizeCorrectionImpact,
} from "../../components/brackets/utils/resultCorrectionPresentation";

const statusOptions = ["", "DRAFT", "SUBMITTED", "APPROVED", "APPLIED", "REJECTED", "FAILED"];

const ResultCorrectionsPage = () => {
  const { roleNames } = useAuth();
  const location = useLocation();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState(null);
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reviewNotes, setReviewNotes] = useState({});

  const isCoordinator = roleNames.includes("SPORTS_COORDINATOR");
  const rolePrefix = location.pathname.startsWith("/sport-facilitator") ? "/sport-facilitator" : "/coordinator";

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRows(await getCorrectionQueue({ status }));
    } catch (requestError) {
      setError(correctionErrorMessage(requestError, "Correction requests could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const visibleRows = useMemo(
    () => rows.filter((row) => !type || row.correction_type === type),
    [rows, type],
  );
  const correctionTypes = useMemo(
    () => [...new Set(rows.map((row) => row.correction_type))].sort(),
    [rows],
  );

  const runAction = async (row, action) => {
    const reviewNote = String(reviewNotes[row.id] || "");
    setWorkingId(row.id);
    setError("");
    setNotice("");
    try {
      if (action === "approve") await approveCorrection(row.id, row.row_version, reviewNote);
      if (action === "reject") {
        if (reviewNote.trim().length < 3) throw new Error("Enter a short review note before rejecting this request.");
        await rejectCorrection(row.id, row.row_version, reviewNote.trim());
      }
      if (action === "apply") await applyCorrection(row);
      setNotice(action === "apply" ? "The corrected result is now official." : `Correction ${action === "approve" ? "approved" : "rejected"}.`);
      setReviewNotes((current) => ({ ...current, [row.id]: "" }));
      await load();
    } catch (requestError) {
      setError(correctionErrorMessage(requestError, requestError?.message));
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <header>
        <h1 className="text-2xl font-bold text-[var(--text-main)]">Result corrections</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Review requested changes without deleting the original Match history.</p>
      </header>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm font-medium text-[var(--text-main)]">Status<select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-1 block min-w-44 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm"><option value="">All statuses</option>{statusOptions.filter(Boolean).map((item) => <option key={item} value={item}>{correctionStatusPresentation(item).label}</option>)}</select></label>
        <label className="text-sm font-medium text-[var(--text-main)]">Correction type<select value={type} onChange={(event) => setType(event.target.value)} className="mt-1 block min-w-52 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm"><option value="">All types</option>{correctionTypes.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ").toLowerCase()}</option>)}</select></label>
        <button type="button" onClick={load} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border-soft)] px-3 py-2 text-sm font-semibold text-[var(--text-main)]"><RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh</button>
      </div>

      {notice ? <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">{notice}</p> : null}
      {error ? <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:bg-rose-500/10 dark:text-rose-200">{error}</p> : null}

      {loading ? (
        <div className="space-y-3" aria-label="Loading correction requests">{[1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl bg-[var(--surface-soft)]" />)}</div>
      ) : visibleRows.length === 0 ? (
        <div className="py-16 text-center"><ClipboardCheck className="mx-auto text-[var(--text-muted)]" /><h2 className="mt-3 font-semibold text-[var(--text-main)]">No correction requests</h2><p className="mt-1 text-sm text-[var(--text-muted)]">Completed-Match correction requests will appear here.</p></div>
      ) : (
        <div className="space-y-4">
          {visibleRows.map((row) => {
            const presentation = correctionStatusPresentation(row.status);
            const blocked = (row.impact_snapshot?.blockers || []).length > 0;
            return (
              <article key={row.id} className="rounded-2xl bg-[var(--surface-soft)] p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-[var(--text-main)]">Match #{row.match_id} · Correction v{row.correction_version}</h2><span className="rounded-full bg-[var(--surface)] px-2.5 py-1 text-xs font-semibold text-[var(--text-muted)]">{presentation.label}</span></div><p className="mt-1 text-sm text-[var(--text-muted)]">{row.correction_type.replaceAll("_", " ").toLowerCase()} · Sport #{row.sport_id}{row.event_id ? ` · Event #${row.event_id}` : ""}</p></div>
                  <Link to={`${rolePrefix}/matches/${row.match_id}/live-scoring`} className="inline-flex items-center gap-1 text-sm font-semibold text-cyan-700 hover:underline dark:text-cyan-300">Open Match <ExternalLink size={14} /></Link>
                </div>
                <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
                  <div><p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Requested change</p><p className="mt-1 text-sm text-[var(--text-main)]">{(row.impact_snapshot?.result_changes || []).map((item) => `${item.field.replaceAll("_", " ")}: ${item.before ?? "—"} → ${item.after ?? "—"}`).join(" · ") || "Review the proposed official result."}</p><p className="mt-2 text-xs text-[var(--text-muted)]">Reason: {row.reason}</p></div>
                  <div><p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Impact</p><ul className="mt-1 space-y-1 text-sm text-[var(--text-muted)]">{summarizeCorrectionImpact(row.impact_snapshot).map((item) => <li key={item}>• {item}</li>)}</ul></div>
                </div>
                {blocked ? <div className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-500/10 dark:text-rose-200"><p className="flex items-center gap-2 font-semibold"><ShieldAlert size={16} /> Downstream repair required</p>{row.impact_snapshot.blockers.map((item) => <p key={item.code} className="mt-1">{item.message}</p>)}</div> : null}
                {isCoordinator && row.status === "SUBMITTED" ? <div className="mt-4 flex flex-wrap items-end gap-2"><label className="min-w-64 flex-1 text-sm font-medium text-[var(--text-main)]">Review note<input value={reviewNotes[row.id] || ""} onChange={(event) => setReviewNotes((current) => ({ ...current, [row.id]: event.target.value }))} className="mt-1 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm" /></label><button type="button" onClick={() => runAction(row, "reject")} disabled={workingId === row.id} className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-700 dark:text-rose-300"><X size={15} /> Reject</button><button type="button" onClick={() => runAction(row, "approve")} disabled={workingId === row.id || blocked} className="inline-flex min-h-10 items-center gap-1 rounded-xl bg-cyan-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"><Check size={15} /> Approve</button></div> : null}
                {isCoordinator && row.status === "APPROVED" ? <div className="mt-4 flex justify-end"><button type="button" onClick={() => runAction(row, "apply")} disabled={workingId === row.id || blocked} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{workingId === row.id ? "Applying…" : "Apply correction"}</button></div> : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ResultCorrectionsPage;
