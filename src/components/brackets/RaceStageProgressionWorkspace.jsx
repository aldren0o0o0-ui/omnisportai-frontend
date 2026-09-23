import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Timer,
  Layers,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Clock,
  Award,
  AlertCircle,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import api from "../../api/axios";
import DashboardCard from "../common/DashboardCard";
import AppModal from "../common/AppModal";

export default function RaceStageProgressionWorkspace({
  eventId,
  sport,
  canManage = false,
  isReadOnlyMode = false,
  openGenerateModalTrigger = 0,
  onRefreshReadiness,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const [stageData, setStageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Active selected contest for viewing lineup & results
  const [activeContestId, setActiveContestId] = useState(null);
  const [contestDetails, setContestDetails] = useState(null);
  const [contestLoading, setContestLoading] = useState(false);

  // Generate Stage Modal
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [laneCapacity, setLaneCapacity] = useState(8);
  const [placesPerContest, setPlacesPerContest] = useState(2);
  const [fastestTimesOverall, setFastestTimesOverall] = useState(2);
  const [modalError, setModalError] = useState("");

  useEffect(() => {
    if (openGenerateModalTrigger > 0) {
      setShowGenerateModal(true);
    }
  }, [openGenerateModalTrigger]);

  const fetchStages = useCallback(async () => {
    if (!eventId) return;
    try {
      setLoading(true);
      const res = await api.get(`/api/v1/stages/event/${eventId}`);
      setStageData(res.data);
      setError(null);

      // Auto-select first contest if none active
      const allStages = res.data?.stages || [];
      const firstContest = allStages[0]?.contests?.[0];
      if (firstContest) {
        setActiveContestId((prev) => prev || firstContest.id);
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message || "Failed to load competition stages.");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchStages();
  }, [fetchStages]);

  // Fetch contest details whenever activeContestId changes
  const fetchContestLineup = useCallback(async (contestId) => {
    if (!contestId) return;
    try {
      setContestLoading(true);
      const res = await api.get(`/api/v1/contests/${contestId}`);
      setContestDetails(res.data);
    } catch (err) {
      console.error("Failed to load contest details:", err);
    } finally {
      setContestLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeContestId) {
      fetchContestLineup(activeContestId);
    }
  }, [activeContestId, fetchContestLineup]);

  const handleGenerateStages = async () => {
    setModalError("");
    try {
      setActionLoading(true);
      await api.post(`/api/v1/stages/event/${eventId}/generate`, {
        lane_capacity: parseInt(laneCapacity, 10),
        places_per_contest: parseInt(placesPerContest, 10),
        fastest_times_overall: parseInt(fastestTimesOverall, 10),
        max_finalists: parseInt(laneCapacity, 10),
      });
      setShowGenerateModal(false);
      await fetchStages();
      if (onRefreshReadiness) onRefreshReadiness();
    } catch (err) {
      setModalError(err.response?.data?.detail || "Failed to generate stages.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdvanceStage = async (prelimStageId) => {
    if (!window.confirm("Execute qualification advancement to seed finalists into the Championship Final?")) {
      return;
    }
    try {
      setActionLoading(true);
      const res = await api.post(`/api/v1/stages/${prelimStageId}/advance`);
      await fetchStages();
      if (activeContestId) await fetchContestLineup(activeContestId);
      alert(`Advancement complete! ${res.data?.total_finalists_assigned || 0} finalists assigned to Championship Final.`);
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to execute advancement.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenTimingConsole = (contestId) => {
    const isFacilitator = location.pathname.includes("/sport-facilitator") || location.pathname.includes("/facilitator");
    const base = isFacilitator ? "/sport-facilitator" : "/coordinator";
    navigate(`${base}/contests/${contestId || activeContestId}/timing`);
  };

  const stages = stageData?.stages || [];
  const prelimStage = stages.find((s) => s.stage_type === "PRELIMINARY_HEATS");
  const finalStage = stages.find((s) => s.stage_type === "CHAMPIONSHIP_FINAL" || s.stage_type === "DIRECT_FINAL");

  const allContests = useMemo(() => {
    const list = [];
    stages.forEach((s) => {
      (s.contests || []).forEach((c) => {
        list.push({ ...c, stage_name: s.stage_name, stage_type: s.stage_type });
      });
    });
    return list;
  }, [stages]);

  const activeContest = useMemo(
    () => allContests.find((c) => c.id === activeContestId) || allContests[0] || null,
    [allContests, activeContestId]
  );

  const contestants = useMemo(
    () => contestDetails?.contestants || [],
    [contestDetails]
  );

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <DashboardCard noPadding>
        <div className="p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-300">
                  <Timer className="h-3.5 w-3.5" />
                  Multi-Contestant Timed Race
                </span>
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {sport?.approvedParticipantCount ?? sport?.valid_entries_count ?? 0} Approved Entries
                </span>
                {stages.length > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300">
                    <CheckCircle2 className="h-3 w-3" />
                    {stages.length} Stages Configured
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
                    Heats Not Generated
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {sport?.targetLabel || stageData?.event_name || "Race Event"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Lanes, heat seedings, millisecond stopwatch timing, and advancement to the championship final.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {canManage && !isReadOnlyMode && (stages.length === 0 || (prelimStage && prelimStage.status !== "COMPLETED")) && (
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500"
                >
                  <Sparkles className="h-4 w-4" />
                  {stages.length === 0 ? "Configure & Generate Heats" : "Reconfigure Heats"}
                </button>
              )}

              {canManage && !isReadOnlyMode && prelimStage && prelimStage.status !== "COMPLETED" && (
                <button
                  type="button"
                  onClick={() => handleAdvanceStage(prelimStage.id)}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50"
                  title="Execute qualification advancement rule to seed finalists"
                >
                  <span>Advance to Final</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}

              {canManage && !isReadOnlyMode && activeContest && (
                <button
                  type="button"
                  onClick={() => handleOpenTimingConsole(activeContest.id)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300"
                >
                  <Clock className="h-3.5 w-3.5" />
                  <span>Open Timing Console</span>
                  <ExternalLink className="h-3 w-3 opacity-60" />
                </button>
              )}
            </div>
          </div>
        </div>
      </DashboardCard>

      {/* Loading & Error States */}
      {loading && (
        <div className="flex min-h-[16rem] items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
          <Clock className="mr-3 h-5 w-5 animate-spin text-indigo-500" />
          <span>Loading competition stages and heat lineups...</span>
        </div>
      )}

      {error && !loading && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-rose-800 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
          <div className="text-xs">
            <p className="font-semibold">Unable to load race progression</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Empty State: Stages Not Generated */}
      {!loading && !error && stages.length === 0 && (
        <DashboardCard noPadding>
          <div className="flex min-h-[22rem] flex-col items-center justify-center p-8 text-center sm:p-12">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 mb-4">
              <Layers className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Heats &amp; Stage Progression Not Generated
            </h3>
            <p className="mt-1.5 max-w-md text-xs text-slate-500 dark:text-slate-400">
              Timed races use multi-contestant lane assignments rather than elimination brackets. Approved department entries are distributed across preliminary heats and advance to the championship final.
            </p>
            {canManage && !isReadOnlyMode ? (
              <button
                type="button"
                onClick={() => setShowGenerateModal(true)}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500"
              >
                <Sparkles className="h-4 w-4" />
                Configure &amp; Generate Heats
              </button>
            ) : (
              <p className="mt-4 text-xs font-medium text-slate-400">
                Heats will appear here once configured by the tournament coordinator.
              </p>
            )}
          </div>
        </DashboardCard>
      )}

      {/* Main Content: Stages & Heat Lineups */}
      {!loading && !error && stages.length > 0 && (
        <div className="space-y-6">
          {/* Stage Progression Overview Grid */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Preliminary Heats Column */}
            {prelimStage && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                      <span>{prelimStage.stage_name}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        Stage 1
                      </span>
                    </h3>
                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                      Top {prelimStage.advancement_rule?.places_per_contest ?? 2} per heat +{" "}
                      {prelimStage.advancement_rule?.fastest_times_overall ?? 2} fastest times advance (Max Finalists:{" "}
                      {prelimStage.advancement_rule?.max_finalists ?? 8})
                    </p>
                  </div>
                  {prelimStage.status === "COMPLETED" ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300">
                      <CheckCircle2 className="h-3 w-3" />
                      Advanced
                    </span>
                  ) : null}
                </div>

                {/* Heat list */}
                <div className="space-y-2">
                  {(prelimStage.contests || []).map((c) => {
                    const isSelected = activeContestId === c.id;
                    return (
                      <div
                        key={c.id}
                        onClick={() => setActiveContestId(c.id)}
                        className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition ${
                          isSelected
                            ? "border-indigo-400 bg-indigo-50/70 shadow-xs dark:border-indigo-500 dark:bg-indigo-500/15"
                            : "border-slate-200/80 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:border-slate-700"
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {c.contest_name}
                          </div>
                          <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                            {c.lane_capacity} Lanes • Status: <strong className="font-semibold text-slate-700 dark:text-slate-300">{c.status}</strong>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {c.is_official ? (
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300">
                              Certified
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">Pending</span>
                          )}
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Championship Final Column */}
            {finalStage && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                      <span>{finalStage.stage_name}</span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
                        <Award className="h-3 w-3" />
                        Medal Round
                      </span>
                    </h3>
                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                      Championship points: 1st (100 pts), 2nd (70 pts), 3rd (40 pts), 4th (20 pts), 5th–8th (10 pts)
                    </p>
                  </div>
                </div>

                {/* Final Contests */}
                <div className="space-y-2">
                  {(finalStage.contests || []).map((c) => {
                    const isSelected = activeContestId === c.id;
                    return (
                      <div
                        key={c.id}
                        onClick={() => setActiveContestId(c.id)}
                        className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition ${
                          isSelected
                            ? "border-amber-400 bg-amber-50/70 shadow-xs dark:border-amber-500 dark:bg-amber-500/15"
                            : "border-slate-200/80 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:border-slate-700"
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {c.contest_name}
                          </div>
                          <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                            {c.lane_capacity} Lanes • Status: <strong className="font-semibold text-slate-700 dark:text-slate-300">{c.status}</strong>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {c.is_official ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300">
                              <CheckCircle2 className="h-3 w-3" />
                              Official Resolved
                            </span>
                          ) : (
                            <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">Ready for Race</span>
                          )}
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Active Contest Lineup & Results Card */}
          {activeContest && (
            <DashboardCard noPadding>
              <div className="p-4 sm:p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {activeContest.contest_name}
                    </h3>
                    <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {activeContest.stage_name || "Contest"}
                    </span>
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                      activeContest.is_official
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200"
                        : "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    }`}>
                      {activeContest.is_official ? "Official Results Certified" : activeContest.status || "Scheduled"}
                    </span>
                  </div>

                  {canManage && !isReadOnlyMode && (
                    <button
                      type="button"
                      onClick={() => handleOpenTimingConsole(activeContest.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-300"
                    >
                      <Clock className="h-3.5 w-3.5" />
                      <span>Record Race Timing</span>
                    </button>
                  )}
                </div>

                {contestLoading ? (
                  <div className="flex min-h-[10rem] items-center justify-center text-xs text-slate-400">
                    <Clock className="mr-2 h-4 w-4 animate-spin text-indigo-500" />
                    <span>Loading contestants and results...</span>
                  </div>
                ) : contestants.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400 dark:border-slate-800">
                    No contestants assigned to this heat yet. Qualifiers will appear once preliminary heats advance.
                  </div>
                ) : (
                  <>
                    {/* Desktop Table View (>= 640px) */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full min-w-[600px] text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-left uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
                            <th className="pb-2 pr-4 font-semibold whitespace-nowrap">Lane</th>
                            <th className="pb-2 pr-4 font-semibold">Contestant / Entry</th>
                            <th className="pb-2 pr-4 font-semibold whitespace-nowrap">Seed</th>
                            <th className="pb-2 pr-4 font-semibold whitespace-nowrap">Recorded Time</th>
                            <th className="pb-2 pr-4 font-semibold whitespace-nowrap">Status</th>
                            <th className="pb-2 pr-4 font-semibold whitespace-nowrap text-right">Advancement / Rank</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                          {contestants.map((c) => {
                            const res = c.result;
                            const isAutoQ = res?.qualification_status === "QUALIFIED_AUTOMATIC";
                            const isTimeQ = res?.qualification_status === "QUALIFIED_TIME";
                            const isElim = res?.qualification_status === "ELIMINATED";
                            const isDNS = res?.result_status === "DNS";
                            const isDNF = res?.result_status === "DNF";
                            const isDQ = res?.result_status === "DQ";

                            return (
                              <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                <td className="py-2.5 pr-4 whitespace-nowrap">
                                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-300 bg-white font-bold text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
                                    {c.lane_number || "-"}
                                  </span>
                                </td>
                                <td className="py-2.5 pr-4">
                                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                                    {c.entry_name || `Entry #${c.competition_entry_id}`}
                                  </div>
                                  {c.advancement_source && (
                                    <div className="text-[10px] text-slate-400">
                                      Advanced from: {c.advancement_source}
                                    </div>
                                  )}
                                </td>
                                <td className="py-2.5 pr-4 text-slate-500 whitespace-nowrap">
                                  {c.seed_number ? `#${c.seed_number}` : "-"}
                                </td>
                                <td className="py-2.5 pr-4 font-mono font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                                  {res?.performance_time ? `${res.performance_time}s` : "--:--.---"}
                                </td>
                                <td className="py-2.5 pr-4 whitespace-nowrap">
                                  {isDNS || isDNF || isDQ ? (
                                    <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
                                      {res?.result_status}
                                    </span>
                                  ) : res?.result_status ? (
                                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300">
                                      {res.result_status}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </td>
                                <td className="py-2.5 text-right whitespace-nowrap">
                                  {res?.placement ? (
                                    <div className="inline-flex items-center gap-1.5 font-bold">
                                      {res.placement === 1 && (
                                        <span className="rounded-md border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
                                          1st Gold (100 pts)
                                        </span>
                                      )}
                                      {res.placement === 2 && (
                                        <span className="rounded-md border border-slate-300 bg-slate-100 px-2 py-0.5 text-[10px] text-slate-800 dark:border-slate-600 dark:bg-slate-700/60 dark:text-slate-200">
                                          2nd Silver (70 pts)
                                        </span>
                                      )}
                                      {res.placement === 3 && (
                                        <span className="rounded-md border border-amber-600/30 bg-amber-50 px-2 py-0.5 text-[10px] text-amber-800 dark:border-amber-600/40 dark:bg-amber-600/10 dark:text-amber-300">
                                          3rd Bronze (40 pts)
                                        </span>
                                      )}
                                      {res.placement > 3 && (
                                        <span className="text-slate-600 dark:text-slate-400">
                                          Rank {res.placement}
                                        </span>
                                      )}
                                    </div>
                                  ) : isAutoQ ? (
                                    <span className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-300">
                                      QUALIFIED (Q)
                                    </span>
                                  ) : isTimeQ ? (
                                    <span className="rounded-md border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-300">
                                      FASTEST TIME (q)
                                    </span>
                                  ) : isElim ? (
                                    <span className="text-[10px] text-slate-400">Eliminated</span>
                                  ) : (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Card View (< 640px) */}
                    <div className="block sm:hidden space-y-2.5">
                      {contestants.map((c) => {
                        const res = c.result;
                        const isAutoQ = res?.qualification_status === "QUALIFIED_AUTOMATIC";
                        const isTimeQ = res?.qualification_status === "QUALIFIED_TIME";
                        return (
                          <div
                            key={`m-contestant-${c.id}`}
                            className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs transition dark:border-slate-800 dark:bg-slate-800/40"
                          >
                            <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-1.5 dark:border-slate-800">
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-300 bg-white font-bold text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
                                L{c.lane_number || "-"}
                              </span>
                              <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                                {res?.performance_time ? `${res.performance_time}s` : "--:--.---"}
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="font-semibold text-slate-800 dark:text-slate-200 truncate pr-2">
                                {c.entry_name || `Entry #${c.competition_entry_id}`}
                              </div>
                              <div>
                                {res?.placement ? (
                                  <span className="font-bold text-amber-600 dark:text-amber-400">
                                    Rank #{res.placement}
                                  </span>
                                ) : isAutoQ ? (
                                  <span className="rounded-md border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-300">
                                    Q (Auto)
                                  </span>
                                ) : isTimeQ ? (
                                  <span className="rounded-md border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-bold text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-300">
                                    q (Time)
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </DashboardCard>
          )}

          {/* Institutional Medal Points Key */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Institutional Championship Points Scale (Final Stage)
            </div>
            <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono sm:grid-cols-5">
              <div className="rounded-xl border border-amber-300/60 bg-amber-50 p-2.5 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
                <div className="font-bold">1st Gold</div>
                <div>100 pts</div>
              </div>
              <div className="rounded-xl border border-slate-300 bg-white p-2.5 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <div className="font-bold">2nd Silver</div>
                <div>70 pts</div>
              </div>
              <div className="rounded-xl border border-amber-600/30 bg-amber-50/60 p-2.5 text-amber-800 dark:border-amber-600/40 dark:bg-amber-600/10 dark:text-amber-300">
                <div className="font-bold">3rd Bronze</div>
                <div>40 pts</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-100 p-2.5 text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                <div className="font-bold">4th Place</div>
                <div>20 pts</div>
              </div>
              <div className="col-span-2 sm:col-span-1 rounded-xl border border-slate-200 bg-slate-100 p-2.5 text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                <div className="font-bold">5th–8th</div>
                <div>10 pts</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generate Heats AppModal */}
      <AppModal
        open={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        title="Generate Heats & Final Stage"
        maxWidthClass="max-w-md"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setShowGenerateModal(false)}
              className="min-h-10 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleGenerateStages}
              disabled={actionLoading}
              className="min-h-10 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-60 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              {actionLoading ? "Generating Stages..." : "Generate Heats & Final Stage"}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Configure preliminary heat distribution and advancement criteria for approved entries.
          </p>

          {modalError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
              {modalError}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Track / Pool Lane Capacity
            </label>
            <select
              value={laneCapacity}
              onChange={(e) => setLaneCapacity(parseInt(e.target.value, 10))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value={8}>8 Lanes (Standard Track / Pool)</option>
              <option value={6}>6 Lanes (Compact Facility)</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Auto-Qualifiers per Heat (Top N Places)
            </label>
            <input
              type="number"
              min={1}
              max={4}
              value={placesPerContest}
              onChange={(e) => setPlacesPerContest(parseInt(e.target.value, 10))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Fastest Times Overall (Next N Places)
            </label>
            <input
              type="number"
              min={0}
              max={4}
              value={fastestTimesOverall}
              onChange={(e) => setFastestTimesOverall(parseInt(e.target.value, 10))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
        </div>
      </AppModal>
    </div>
  );
}
