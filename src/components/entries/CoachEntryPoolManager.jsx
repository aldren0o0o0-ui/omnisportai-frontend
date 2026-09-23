import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardCard from "../common/DashboardCard";
import EmptyState from "../common/EmptyState";
import StatusBadge from "../common/StatusBadge";
import { participantShapeLabel } from "../../utils/tournamentEventCategories";
import {
  finalizeEntryPoolSelection,
  getCoachEntryPools,
  getEntryPoolApplications,
  updateEntryPoolApplicationDecision,
  updateEntryPoolState,
} from "../../services/entryPoolService";

const toUpper = (value) => String(value || "").trim().toUpperCase();

const canSelectApplicant = (status) => {
  const normalized = toUpper(status);
  return ["PENDING", "FOR_TRYOUT", "ACCEPTED_AS_PLAYER"].includes(normalized);
};

const getEventScopedErrorMessage = (error, fallbackMessage) => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string" && detail.includes("Select an event category")) {
    return "Please choose an Event Category first, such as Singles or Doubles.";
  }
  return detail || fallbackMessage;
};

const buildPoolGroupKey = (pool) => {
  if (pool?.tournament_sport_event_id !== null && pool?.tournament_sport_event_id !== undefined) {
    return `event:${pool.tournament_sport_event_id}`;
  }
  return `legacy:${pool?.sport_id || "0"}:${toUpper(pool?.participant_shape)}`;
};

export default function CoachEntryPoolManager({
  tournamentId,
  sport,
  departmentId,
  participantShape,
  entryLimit,
  eventScope = null,
  onFinalized,
}) {
  const [pools, setPools] = useState([]);
  const [applicationsByPoolId, setApplicationsByPoolId] = useState({});
  const [expandedPoolId, setExpandedPoolId] = useState(null);
  const [selectedByPoolId, setSelectedByPoolId] = useState({});
  const [loading, setLoading] = useState(false);
  const [savingPoolId, setSavingPoolId] = useState(null);
  const [finalizingPoolId, setFinalizingPoolId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const filteredPools = useMemo(
    () =>
      pools.filter(
        (pool) =>
          String(pool?.sport_id || "") === String(sport?.id || "") &&
          String(pool?.department_id || "") === String(departmentId || "")
      ),
    [departmentId, pools, sport?.id]
  );

  const poolGroups = useMemo(() => {
    const groups = new Map();

    filteredPools.forEach((pool) => {
      const key = buildPoolGroupKey(pool);
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          tournamentSportEventId:
            pool?.tournament_sport_event_id ?? null,
          eventName: String(pool?.event_name || "").trim(),
          eventKey: String(pool?.event_key || "").trim(),
          participantShape:
            toUpper(pool?.participant_shape) || toUpper(participantShape) || "SOLO",
          entryLimit:
            Number(pool?.max_entries_per_department || pool?.max_entries_allowed || 0) > 0
              ? Number(pool?.max_entries_per_department || pool?.max_entries_allowed)
              : entryLimit,
          pools: [],
        });
      }
      groups.get(key).pools.push(pool);
    });

    return Array.from(groups.values()).sort((left, right) => {
      if (left.tournamentSportEventId && right.tournamentSportEventId) {
        return Number(left.tournamentSportEventId) - Number(right.tournamentSportEventId);
      }
      return String(left.eventName || left.participantShape).localeCompare(
        String(right.eventName || right.participantShape)
      );
    });
  }, [entryLimit, filteredPools, participantShape]);

  const selectedGroupKey = useMemo(() => {
    if (eventScope?.tournamentSportEventId) {
      return `event:${eventScope.tournamentSportEventId}`;
    }
    if (poolGroups.length === 1) return poolGroups[0].key;
    if (eventScope?.participantShape) {
      const fallback = poolGroups.find(
        (group) =>
          !group.tournamentSportEventId &&
          toUpper(group.participantShape) === toUpper(eventScope.participantShape)
      );
      return fallback?.key || null;
    }
    return null;
  }, [eventScope?.participantShape, eventScope?.tournamentSportEventId, poolGroups]);

  const selectedGroup = useMemo(
    () => poolGroups.find((group) => group.key === selectedGroupKey) || null,
    [poolGroups, selectedGroupKey]
  );

  const scopedPools = selectedGroup?.pools || [];

  const loadPools = useCallback(async () => {
    if (!tournamentId) {
      setPools([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const rows = await getCoachEntryPools(Number(tournamentId));
      setPools(Array.isArray(rows) ? rows : []);
    } catch (apiError) {
      setPools([]);
      setError(getEventScopedErrorMessage(apiError, "Failed to load entry pools."));
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    loadPools();
  }, [loadPools]);

  const loadApplications = async (poolId) => {
    try {
      const rows = await getEntryPoolApplications(Number(poolId));
      setApplicationsByPoolId((prev) => ({ ...prev, [poolId]: Array.isArray(rows) ? rows : [] }));
    } catch (apiError) {
      setError(getEventScopedErrorMessage(apiError, "Failed to load pool applicants."));
    }
  };

  const toggleExpand = async (poolId) => {
    if (expandedPoolId === poolId) {
      setExpandedPoolId(null);
      return;
    }
    setExpandedPoolId(poolId);
    await loadApplications(poolId);
  };

  const handlePoolState = async (poolId, payload) => {
    setSavingPoolId(poolId);
    setError("");
    setMessage("");
    try {
      await updateEntryPoolState(poolId, payload);
      setMessage("Entry pool updated.");
      await loadPools();
      if (expandedPoolId === poolId) await loadApplications(poolId);
    } catch (apiError) {
      setError(getEventScopedErrorMessage(apiError, "Failed to update entry pool."));
    } finally {
      setSavingPoolId(null);
    }
  };

  const handleDecision = async (applicationId, status) => {
    setError("");
    setMessage("");
    try {
      await updateEntryPoolApplicationDecision(applicationId, { status });
      setMessage("Applicant status updated.");
      if (expandedPoolId) await loadApplications(expandedPoolId);
    } catch (apiError) {
      setError(getEventScopedErrorMessage(apiError, "Failed to update applicant status."));
    }
  };

  const toggleSelected = (poolId, applicationId) => {
    setSelectedByPoolId((prev) => {
      const current = new Set(prev[poolId] || []);
      if (current.has(applicationId)) current.delete(applicationId);
      else current.add(applicationId);
      return { ...prev, [poolId]: Array.from(current) };
    });
  };

  const handleFinalize = async (pool) => {
    const selected = selectedByPoolId[pool.id] || [];
    if (!selected.length) {
      setError("Select applicants first.");
      return;
    }
    if (toUpper(pool.participant_shape) === "DUO" && selected.length !== 2) {
      setError("Select exactly two applicants to form one Pair entry.");
      return;
    }
    setFinalizingPoolId(pool.id);
    setError("");
    setMessage("");
    try {
      if (toUpper(pool.participant_shape) === "SOLO") {
        await finalizeEntryPoolSelection(pool.id, { selected_application_ids: selected });
      } else {
        await finalizeEntryPoolSelection(pool.id, { selected_pairs: [selected] });
      }
      setMessage("Final competition entries submitted for facilitator review.");
      setSelectedByPoolId((prev) => ({ ...prev, [pool.id]: [] }));
      await loadPools();
      await loadApplications(pool.id);
      if (typeof onFinalized === "function") onFinalized(pool);
    } catch (apiError) {
      setError(getEventScopedErrorMessage(apiError, "Failed to finalize entry pool selection."));
    } finally {
      setFinalizingPoolId(null);
    }
  };

  return (
    <DashboardCard>
      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Individual / Pair Entry Pools
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Open recruiting, review applicants, and turn final selections into real competition entries.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Competition Type</p>
            <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
              {participantShapeLabel(selectedGroup?.participantShape || participantShape)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Entries per Department</p>
            <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
              {selectedGroup?.entryLimit ?? entryLimit ?? "Backend validated"}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Pools</p>
            <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{scopedPools.length}</p>
          </div>
        </div>

        {selectedGroup?.eventName ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
            Event Category: <span className="font-semibold">{selectedGroup.eventName}</span>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
            {error}
          </div>
        ) : null}
        {message ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200">
            {message}
          </div>
        ) : null}

        {loading ? (
          <div className="text-sm text-slate-500 dark:text-slate-400">Loading entry pools...</div>
        ) : scopedPools.length === 0 ? (
          <EmptyState
            message={
              selectedGroupKey
                ? "No entry pool is available for this Event Category yet."
                : "No Individual or Pair entry pool is available for this tournament sport yet."
            }
          />
        ) : (
          <div className="space-y-4">
            {scopedPools.map((pool) => {
              const applicants = applicationsByPoolId[pool.id] || [];
              const selected = selectedByPoolId[pool.id] || [];
              return (
                <div
                  key={pool.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/80"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{pool.pool_name}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {[
                          pool.event_name ? `Event Category: ${pool.event_name}` : null,
                          `Competition Type: ${participantShapeLabel(pool.participant_shape)}`,
                          pool.max_entries_per_department
                            ? `Entries per Department: ${pool.max_entries_per_department}`
                            : null,
                          `Coach: ${pool.coach_name || "Not assigned"}`,
                          `Applicants: ${pool.applicant_count}`,
                          `Finalized: ${pool.selected_entries_count}`,
                        ]
                          .filter(Boolean)
                          .join(" • ")}
                      </p>
                    </div>
                    <StatusBadge status={pool.status} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={savingPoolId === pool.id}
                      onClick={() =>
                        handlePoolState(pool.id, {
                          applications_open: true,
                          is_visible_to_players: true,
                          status: "OPEN_FOR_APPLICATION",
                        })
                      }
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
                    >
                      {savingPoolId === pool.id ? "Saving..." : "Open Applications"}
                    </button>
                    <button
                      type="button"
                      disabled={savingPoolId === pool.id}
                      onClick={() =>
                        handlePoolState(pool.id, {
                          applications_open: false,
                          status: "CLOSED",
                        })
                      }
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    >
                      Close Applications
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleExpand(pool.id)}
                      className="rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-200"
                    >
                      {expandedPoolId === pool.id ? "Hide Applicants" : "View Applicants"}
                    </button>
                  </div>

                  {expandedPoolId === pool.id ? (
                    <div className="mt-4 space-y-3">
                      {applicants.length === 0 ? (
                        <EmptyState message="No applicants yet for this pool." />
                      ) : (
                        applicants.map((application) => (
                          <div
                            key={application.id}
                            className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-slate-900 dark:text-slate-100">
                                  {application.user_name || application.user_email || `Applicant #${application.user_id}`}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {application.user_email || "No email"} {application.position ? `• ${application.position}` : ""}
                                </p>
                              </div>
                              <StatusBadge status={application.application_status} />
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              {canSelectApplicant(application.application_status) ? (
                                <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                                  <input
                                    type="checkbox"
                                    checked={selected.includes(application.id)}
                                    onChange={() => toggleSelected(pool.id, application.id)}
                                  />
                                  Select for finalization
                                </label>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => handleDecision(application.id, "FOR_TRYOUT")}
                                className="rounded-lg border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-200"
                              >
                                For Tryout
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDecision(application.id, "ACCEPTED_AS_PLAYER")}
                                className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
                              >
                                Accept
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDecision(application.id, "REJECTED")}
                                className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        ))
                      )}

                      {applicants.length > 0 ? (
                        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {toUpper(pool.participant_shape) === "DUO"
                              ? "Select exactly 2 applicants to create one Pair entry."
                              : "Select applicants to create final Individual entries and submit them for review."}
                          </p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Selected: {selected.length}
                          </p>
                          <button
                            type="button"
                            onClick={() => handleFinalize(pool)}
                            disabled={finalizingPoolId === pool.id || selected.length === 0}
                            className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
                          >
                            {finalizingPoolId === pool.id
                              ? "Submitting..."
                              : toUpper(pool.participant_shape) === "DUO"
                                ? "Create Pair Entry"
                                : "Finalize Selected Entries"}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardCard>
  );
}
