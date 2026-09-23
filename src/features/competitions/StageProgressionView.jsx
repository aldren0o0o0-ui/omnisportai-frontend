import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  Award, 
  ChevronRight, 
  Users, 
  AlertCircle 
} from 'lucide-react';
import api from '../../api/axios';

export default function StageProgressionView({ eventId, apiBase = '/api/v1', onSelectContest }) {
  const [stageData, setStageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Generate Stage Modal
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [laneCapacity, setLaneCapacity] = useState(8);
  const [placesPerContest, setPlacesPerContest] = useState(2);
  const [fastestTimesOverall, setFastestTimesOverall] = useState(2);

  const fetchStages = async () => {
    try {
      setLoading(true);
      const res = await api.get(`${apiBase}/stages/event/${eventId}`);
      setStageData(res.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to fetch stages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) {
      fetchStages();
    }
  }, [eventId]);

  const handleGenerateStages = async () => {
    try {
      setActionLoading(true);
      await api.post(`${apiBase}/stages/event/${eventId}/generate`, {
        lane_capacity: parseInt(laneCapacity),
        places_per_contest: parseInt(placesPerContest),
        fastest_times_overall: parseInt(fastestTimesOverall),
        max_finalists: parseInt(laneCapacity),
      });
      setShowGenerateModal(false);
      await fetchStages();
      alert('Stages and preliminary heats generated successfully.');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to generate stages');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdvanceStage = async (prelimStageId) => {
    if (!window.confirm('Execute qualification advancement to populate finalists in the Championship Final?')) {
      return;
    }
    try {
      setActionLoading(true);
      const res = await api.post(`${apiBase}/stages/${prelimStageId}/advance`);
      await fetchStages();
      alert(`Advancement complete! ${res.data.total_finalists_assigned} finalists assigned to Championship Final.`);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to execute advancement');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400">
        <Clock className="w-6 h-6 mr-3 animate-spin text-indigo-500" />
        <span>Loading competition progression...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-950/40 border border-red-800 rounded-xl text-red-300 flex items-center">
        <AlertCircle className="w-6 h-6 mr-3 shrink-0" />
        <div>
          <div className="font-semibold">Unable to load stages</div>
          <div className="text-sm opacity-90">{error}</div>
        </div>
      </div>
    );
  }

  const stages = stageData?.stages || [];
  const prelimStage = stages.find(s => s.stage_type === 'PRELIMINARY_HEATS');
  const finalStage = stages.find(s => s.stage_type === 'CHAMPIONSHIP_FINAL' || s.stage_type === 'DIRECT_FINAL');

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider mb-1">
            <Layers className="w-4 h-4" />
            Stage Progression Architecture
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">{stageData?.event_name}</h2>
          <p className="text-sm text-zinc-400 mt-1">
            Multi-contestant heats progression, qualification policy, and canonical standings resolution.
          </p>
        </div>

        {(stages.length === 0 || (prelimStage && prelimStage.status !== 'COMPLETED')) && (
          <button
            onClick={() => setShowGenerateModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-lg shadow-indigo-950/50 transition cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            {stages.length === 0 ? "Generate Heats & Final" : "Reconfigure Heats"}
          </button>
        )}
      </div>

      {stages.length === 0 ? (
        <div className="p-12 text-center bg-zinc-900/50 border border-zinc-800/80 rounded-2xl">
          <Users className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-zinc-300">No competition stages generated yet</h3>
          <p className="text-sm text-zinc-500 max-w-md mx-auto mt-1 mb-6">
            Approved department entries will be seeded across preliminary heats or a direct final based on lane capacity.
          </p>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-lg transition cursor-pointer"
          >
            Configure & Generate Stages
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Preliminary Heats Column */}
          {prelimStage && (
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>{prelimStage.stage_name}</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-normal">
                      Stage 1
                    </span>
                  </h3>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    Policy: Top {prelimStage.advancement_rule?.places_per_contest} per heat + {prelimStage.advancement_rule?.fastest_times_overall} fastest times (Total: {prelimStage.advancement_rule?.max_finalists})
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {prelimStage.status === 'COMPLETED' ? (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Advanced
                    </span>
                  ) : (
                    <button
                      onClick={() => handleAdvanceStage(prelimStage.id)}
                      disabled={actionLoading}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-semibold shadow-lg transition cursor-pointer disabled:opacity-50 flex items-center gap-1"
                    >
                      Advance to Final
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Heats list */}
              <div className="space-y-3">
                {prelimStage.contests?.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => onSelectContest && onSelectContest(c.id)}
                    className="p-4 bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 rounded-xl flex items-center justify-between cursor-pointer transition group"
                  >
                    <div>
                      <div className="font-semibold text-white group-hover:text-indigo-300 transition">
                        {c.contest_name}
                      </div>
                      <div className="text-xs text-zinc-400 mt-0.5">
                        Capacity: {c.lane_capacity} Lanes • Status: <strong className="text-zinc-300">{c.status}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {c.is_official ? (
                        <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded-full">
                          Certified
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-500">Pending</span>
                      )}
                      <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Championship Final Column */}
          {finalStage && (
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>{finalStage.stage_name}</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 font-semibold">
                      <Award className="w-3.5 h-3.5" />
                      Medal Round
                    </span>
                  </h3>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    Awards canonical championship points: 1st (100 pts), 2nd (70 pts), 3rd (40 pts), 4th (20 pts), 5th-8th (10 pts)
                  </div>
                </div>
              </div>

              {/* Final Contests */}
              <div className="space-y-3">
                {finalStage.contests?.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => onSelectContest && onSelectContest(c.id)}
                    className="p-4 bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 rounded-xl flex items-center justify-between cursor-pointer transition group"
                  >
                    <div>
                      <div className="font-semibold text-white group-hover:text-amber-300 transition">
                        {c.contest_name}
                      </div>
                      <div className="text-xs text-zinc-400 mt-0.5">
                        Capacity: {c.lane_capacity} Lanes • Status: <strong className="text-zinc-300">{c.status}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {c.is_official ? (
                        <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Official Standings Resolved
                        </span>
                      ) : (
                        <span className="text-xs text-amber-500/80 font-medium">Ready for Race</span>
                      )}
                      <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Institutional Medal Points Key */}
              <div className="p-4 bg-zinc-900/40 border border-zinc-800/60 rounded-xl space-y-2 mt-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Institutional Standings Points Scale
                </div>
                <div className="grid grid-cols-5 gap-2 text-center text-xs font-mono">
                  <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-300">
                    <div className="font-bold">1st Gold</div>
                    <div>100 pts</div>
                  </div>
                  <div className="p-2 bg-slate-300/10 border border-slate-300/30 rounded-lg text-slate-200">
                    <div className="font-bold">2nd Silver</div>
                    <div>70 pts</div>
                  </div>
                  <div className="p-2 bg-amber-700/10 border border-amber-700/30 rounded-lg text-amber-400">
                    <div className="font-bold">3rd Bronze</div>
                    <div>40 pts</div>
                  </div>
                  <div className="p-2 bg-zinc-800/80 border border-zinc-700/50 rounded-lg text-zinc-300">
                    <div className="font-bold">4th Place</div>
                    <div>20 pts</div>
                  </div>
                  <div className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400">
                    <div className="font-bold">Particip.</div>
                    <div>10 pts</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Generate Heats Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              Generate Heats & Final
            </h3>
            <p className="text-sm text-zinc-400">
              Configure preliminary heat distribution and qualification policy for this race event.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">Track/Pool Lane Capacity</label>
                <select
                  value={laneCapacity}
                  onChange={(e) => setLaneCapacity(parseInt(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100"
                >
                  <option value={8}>8 Lanes (Standard Track / Pool)</option>
                  <option value={6}>6 Lanes (Compact Facility)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">Auto Qualifiers per Heat (Top N Places)</label>
                <input
                  type="number"
                  min={1}
                  max={4}
                  value={placesPerContest}
                  onChange={(e) => setPlacesPerContest(parseInt(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">Fastest Times Overall (Next N)</label>
                <input
                  type="number"
                  min={0}
                  max={4}
                  value={fastestTimesOverall}
                  onChange={(e) => setFastestTimesOverall(parseInt(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateStages}
                disabled={actionLoading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50"
              >
                {actionLoading ? "Generating..." : "Generate Heats & Final Stage"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
