import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  getAISchedulerConfig,
  updateAISchedulerConfig
} from "../../services/scheduleService";
import { getTournaments } from "../../services/tournamentService";
import { useWorkspace } from "../../context/WorkspaceContext";

const DEFAULT_AI_WEIGHTS = {
  venue_penalty: 10,
  time_penalty: 1,
  importance_penalty: 4,
  balance_penalty: 25
};

const parseTournamentHour = (rawValue, fallback) => {
  const parsed = Number.parseInt(String(rawValue ?? ""), 10);
  return Number.isInteger(parsed) ? parsed : fallback;
};

const SchedulerPanel = () => {
  const { selectedIntramural } = useWorkspace();
  const selectedWorkspaceId = selectedIntramural?.id ?? null;
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState([]);
  const [tournamentId, setTournamentId] = useState("");
  const [dateRange, setDateRange] = useState({
    start: "",
    end: ""
  });
  const [slotMinutes, setSlotMinutes] = useState("120");
  const [startHour, setStartHour] = useState("5");
  const [endHour, setEndHour] = useState("18");
  const [venueIdsInput, setVenueIdsInput] = useState("");

  const [minRestMinutes, setMinRestMinutes] = useState("30");
  const [fairnessThreshold, setFairnessThreshold] = useState("80");
  const [maxMatchesPerDayPerTeam, setMaxMatchesPerDayPerTeam] = useState("");
  const [aiMaxIterations, setAiMaxIterations] = useState("5");
  const [useAutonomousScheduler, setUseAutonomousScheduler] = useState(true);
  const [schedulingMode, setSchedulingMode] = useState("BALANCED");

  const [weightInputs, setWeightInputs] = useState({
    venue_penalty: String(DEFAULT_AI_WEIGHTS.venue_penalty),
    time_penalty: String(DEFAULT_AI_WEIGHTS.time_penalty),
    importance_penalty: String(DEFAULT_AI_WEIGHTS.importance_penalty),
    balance_penalty: String(DEFAULT_AI_WEIGHTS.balance_penalty)
  });
  const [aiConfigMeta, setAiConfigMeta] = useState({
    exists: false,
    last_fairness_score: null,
    updated_at: null
  });
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isGenerating] = useState(false);
  const [result] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const tournamentsData = await getTournaments(selectedWorkspaceId ? { workspaceId: selectedWorkspaceId } : {});
        const items = Array.isArray(tournamentsData) ? tournamentsData : [];
        setTournaments(items);

        setTournamentId((currentTournamentId) => {
          const currentValid = items.some(
            (t) => String(t?.id || "") === String(currentTournamentId || "")
          );
          if ((!currentTournamentId || !currentValid) && items.length > 0) {
            const active = items.find((t) => String(t?.status || "").toUpperCase() === "ONGOING");
            return String((active || items[0])?.id || "");
          }
          return items.length === 0 ? "" : currentTournamentId;
        });
      } catch (error) {
        console.error(error);
        alert("Failed to load scheduler data.");
      }
    };

    loadData();
  }, [selectedWorkspaceId]);

  const selectedTournament = useMemo(
    () =>
      tournaments.find(
        (tournament) => Number(tournament.id) === Number(tournamentId)
      ) || null,
    [tournamentId, tournaments]
  );

  useEffect(() => {
    if (!selectedTournament) {
      setDateRange({
        start: "",
        end: ""
      });
      setStartHour("5");
      setEndHour("18");
      return;
    }

    const includeEvening = Boolean(selectedTournament.include_evening);
    const policyStartHour = parseTournamentHour(
      selectedTournament.schedule_start_hour,
      5
    );
    const fallbackEndHour = includeEvening ? 22 : 18;
    const policyEndHour = parseTournamentHour(
      selectedTournament.schedule_end_hour,
      fallbackEndHour
    );

    setDateRange({
      start: selectedTournament.start_date || "",
      end: selectedTournament.end_date || selectedTournament.start_date || ""
    });
    setStartHour(String(policyStartHour));
    setEndHour(String(policyEndHour));
  }, [selectedTournament]);

  const loadAiConfig = async (selectedTournamentId) => {
    if (!selectedTournamentId) {
      setWeightInputs({
        venue_penalty: String(DEFAULT_AI_WEIGHTS.venue_penalty),
        time_penalty: String(DEFAULT_AI_WEIGHTS.time_penalty),
        importance_penalty: String(DEFAULT_AI_WEIGHTS.importance_penalty),
        balance_penalty: String(DEFAULT_AI_WEIGHTS.balance_penalty)
      });
      setAiConfigMeta({
        exists: false,
        last_fairness_score: null,
        updated_at: null
      });
      return;
    }

    setIsLoadingConfig(true);
    try {
      const config = await getAISchedulerConfig(Number(selectedTournamentId));
      const weights = config?.weights || DEFAULT_AI_WEIGHTS;

      setWeightInputs({
        venue_penalty: String(weights.venue_penalty ?? DEFAULT_AI_WEIGHTS.venue_penalty),
        time_penalty: String(weights.time_penalty ?? DEFAULT_AI_WEIGHTS.time_penalty),
        importance_penalty: String(
          weights.importance_penalty ?? DEFAULT_AI_WEIGHTS.importance_penalty
        ),
        balance_penalty: String(weights.balance_penalty ?? DEFAULT_AI_WEIGHTS.balance_penalty)
      });

      setAiConfigMeta({
        exists: Boolean(config?.exists),
        last_fairness_score:
          config?.last_fairness_score === null || config?.last_fairness_score === undefined
            ? null
            : Number(config.last_fairness_score),
        updated_at: config?.updated_at || null
      });
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.detail || "Failed to load saved AI config.");
    } finally {
      setIsLoadingConfig(false);
    }
  };

  useEffect(() => {
    loadAiConfig(tournamentId);
  }, [tournamentId]);

  const parseOptionalInt = (value) => {
    const parsed = Number.parseInt(String(value ?? "").trim(), 10);
    return Number.isInteger(parsed) ? parsed : null;
  };

  const parseWeightPayload = () => {
    const venuePenalty = parseOptionalInt(weightInputs.venue_penalty);
    const timePenalty = parseOptionalInt(weightInputs.time_penalty);
    const importancePenalty = parseOptionalInt(weightInputs.importance_penalty);
    const balancePenalty = parseOptionalInt(weightInputs.balance_penalty);

    return {
      venue_penalty: venuePenalty ?? DEFAULT_AI_WEIGHTS.venue_penalty,
      time_penalty: timePenalty ?? DEFAULT_AI_WEIGHTS.time_penalty,
      importance_penalty:
        importancePenalty ?? DEFAULT_AI_WEIGHTS.importance_penalty,
      balance_penalty: balancePenalty ?? DEFAULT_AI_WEIGHTS.balance_penalty
    };
  };

  const handleWeightInputChange = (field, value) => {
    setWeightInputs((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveAiConfig = async () => {
    if (!tournamentId) {
      alert("Select a tournament before saving AI config.");
      return;
    }

    setIsSavingConfig(true);
    try {
      const updated = await updateAISchedulerConfig(
        Number(tournamentId),
        parseWeightPayload()
      );
      const updatedWeights = updated?.weights || DEFAULT_AI_WEIGHTS;
      setWeightInputs({
        venue_penalty: String(updatedWeights.venue_penalty),
        time_penalty: String(updatedWeights.time_penalty),
        importance_penalty: String(updatedWeights.importance_penalty),
        balance_penalty: String(updatedWeights.balance_penalty)
      });
      setAiConfigMeta({
        exists: Boolean(updated?.exists),
        last_fairness_score:
          updated?.last_fairness_score === null ||
          updated?.last_fairness_score === undefined
            ? null
            : Number(updated.last_fairness_score),
        updated_at: updated?.updated_at || null
      });
      alert("AI scheduler config saved.");
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.detail || "Failed to save AI config.");
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleGenerate = () => {
    if (!tournamentId) {
      alert("Please select a tournament first.");
      return;
    }

    alert("Use Schedule & Venues to run guided generation with preflight and exact checks.");
    navigate("/coordinator/schedules");
  };

  const fairnessReport = result?.intelligence_report?.fairness_report || null;
  const aiSchedulerReport = result?.intelligence_report?.ai_scheduler || null;

  return (
    <div className="space-y-5 rounded-xl border border-slate-800 bg-slate-900 p-6">
      <div>
        <h2 className="text-xl font-bold">Smart Scheduler</h2>
        <p className="mt-1 text-sm text-slate-400">
          Autonomous CP-SAT scheduling with fairness optimization and learned
          weights.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <select
          value={tournamentId}
          onChange={(e) => setTournamentId(e.target.value)}
          className="rounded bg-slate-800 p-3"
        >
          <option value="">Select Tournament</option>
          {tournaments.map((tournament) => (
            <option key={tournament.id} value={tournament.id}>
              {tournament.tournament_name}
            </option>
          ))}
        </select>

        <div className="rounded bg-slate-800 p-3 text-sm text-slate-300">
          Scope: All tournament sports
        </div>

        <div className="rounded bg-slate-800 p-3 text-xs text-slate-300">
          Evening:{" "}
          {selectedTournament?.include_evening ? "Enabled" : "Disabled"}
        </div>

        <input
          type="date"
          value={dateRange.start}
          readOnly
          className="rounded bg-slate-800 p-3"
        />

        <input
          type="date"
          value={dateRange.end}
          readOnly
          className="rounded bg-slate-800 p-3"
        />

        <input
          type="number"
          min="15"
          max="720"
          value={slotMinutes}
          onChange={(e) => setSlotMinutes(e.target.value)}
          className="rounded bg-slate-800 p-3"
          placeholder="Slot minutes"
        />

        <input
          type="number"
          min="0"
          max="23"
          value={startHour}
          onChange={(e) => setStartHour(e.target.value)}
          className="rounded bg-slate-800 p-3"
          placeholder="Start hour"
        />

        <input
          type="number"
          min="1"
          max="24"
          value={endHour}
          onChange={(e) => setEndHour(e.target.value)}
          className="rounded bg-slate-800 p-3"
          placeholder="End hour"
        />

        <input
          value={venueIdsInput}
          onChange={(e) => setVenueIdsInput(e.target.value)}
          className="rounded bg-slate-800 p-3"
          placeholder="Venue IDs (comma-separated)"
        />
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">
          Policy Controls
        </h3>
        <div className="grid gap-4 md:grid-cols-4">
          <input
            type="number"
            min="0"
            max="1440"
            value={minRestMinutes}
            onChange={(e) => setMinRestMinutes(e.target.value)}
            className="rounded bg-slate-800 p-3"
            placeholder="Min Rest Minutes"
          />
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={fairnessThreshold}
            onChange={(e) => setFairnessThreshold(e.target.value)}
            className="rounded bg-slate-800 p-3"
            placeholder="Fairness Threshold"
          />
          <input
            type="number"
            min="1"
            max="20"
            value={maxMatchesPerDayPerTeam}
            onChange={(e) => setMaxMatchesPerDayPerTeam(e.target.value)}
            className="rounded bg-slate-800 p-3"
            placeholder="Max Matches/Day/Team"
          />
          <input
            type="number"
            min="1"
            max="20"
            value={aiMaxIterations}
            onChange={(e) => setAiMaxIterations(e.target.value)}
            className="rounded bg-slate-800 p-3"
            placeholder="AI Max Iterations"
          />
          <select
            value={schedulingMode}
            onChange={(e) => setSchedulingMode(e.target.value)}
            className="rounded bg-slate-800 p-3"
          >
            <option value="BALANCED">Balanced Day</option>
            <option value="COMPACT">Compact / Earliest Finish</option>
            <option value="SPREAD">Spread Across Days</option>
          </select>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Lunch break: 12:00 PM - 1:00 PM. Matches resume at 1:00 PM.
        </p>

        <label className="mt-4 flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={useAutonomousScheduler}
            onChange={(e) => setUseAutonomousScheduler(e.target.checked)}
          />
          Use autonomous scheduler loop (Run to Evaluate to Reweight to Re-run)
        </label>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
            Learned AI Weights
          </h3>
          <div className="text-xs text-slate-400">
            {isLoadingConfig
              ? "Loading saved config..."
              : aiConfigMeta.exists
                ? "Using saved tournament config"
                : "Using default config"}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <input
            type="number"
            min="1"
            max="200"
            value={weightInputs.venue_penalty}
            onChange={(e) => handleWeightInputChange("venue_penalty", e.target.value)}
            className="rounded bg-slate-800 p-3"
            placeholder="Venue Penalty Weight"
          />
          <input
            type="number"
            min="1"
            max="200"
            value={weightInputs.time_penalty}
            onChange={(e) => handleWeightInputChange("time_penalty", e.target.value)}
            className="rounded bg-slate-800 p-3"
            placeholder="Time Penalty Weight"
          />
          <input
            type="number"
            min="1"
            max="200"
            value={weightInputs.importance_penalty}
            onChange={(e) =>
              handleWeightInputChange("importance_penalty", e.target.value)
            }
            className="rounded bg-slate-800 p-3"
            placeholder="Importance Weight"
          />
          <input
            type="number"
            min="1"
            max="400"
            value={weightInputs.balance_penalty}
            onChange={(e) => handleWeightInputChange("balance_penalty", e.target.value)}
            className="rounded bg-slate-800 p-3"
            placeholder="Balance Weight"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => loadAiConfig(tournamentId)}
            disabled={isLoadingConfig || !tournamentId}
            className="rounded bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 disabled:opacity-50"
          >
            Reload Saved Weights
          </button>
          <button
            type="button"
            onClick={handleSaveAiConfig}
            disabled={isSavingConfig || !tournamentId}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isSavingConfig ? "Saving..." : "Save AI Config"}
          </button>
        </div>

        <div className="mt-3 text-xs text-slate-400">
          Last fairness score:{" "}
          {aiConfigMeta.last_fairness_score !== null
            ? aiConfigMeta.last_fairness_score
            : "-"}
          {" | "}
          Updated: {aiConfigMeta.updated_at || "-"}
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="rounded bg-green-600 px-5 py-3 font-bold disabled:opacity-60"
      >
        {isGenerating ? "Generating..." : "Run Smart Scheduler"}
      </button>

      {result && (
        <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/50 p-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="rounded bg-emerald-700/20 px-3 py-1 text-emerald-300">
              Scheduled: {result.scheduled_count}
            </span>
            <span className="rounded bg-amber-700/20 px-3 py-1 text-amber-300">
              Unscheduled: {result.unscheduled_count}
            </span>
            {fairnessReport && (
              <span className="rounded bg-cyan-700/20 px-3 py-1 text-cyan-300">
                Fairness: {fairnessReport.overall_score}
              </span>
            )}
          </div>

          {aiSchedulerReport && (
            <div className="rounded border border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-300">
              <p>
                AI Mode: {aiSchedulerReport.enabled ? "Enabled" : "Disabled"}
              </p>
              <p>
                Iterations: {aiSchedulerReport.iterations_run ?? 0}
                {aiSchedulerReport.max_iterations
                  ? ` / ${aiSchedulerReport.max_iterations}`
                  : ""}
              </p>
              <p>Best Score: {aiSchedulerReport.best_score ?? "-"}</p>
              {aiSchedulerReport.best_weights && (
                <p>
                  Best Weights: venue {aiSchedulerReport.best_weights.venue_penalty},
                  time {aiSchedulerReport.best_weights.time_penalty}, importance{" "}
                  {aiSchedulerReport.best_weights.importance_penalty}, balance{" "}
                  {aiSchedulerReport.best_weights.balance_penalty}
                </p>
              )}
            </div>
          )}

          {result.unscheduled_matches.length > 0 && (
            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">
                Unscheduled Matches
              </p>
              <ul className="space-y-1 text-sm text-slate-300">
                {result.unscheduled_matches.map((item) => (
                  <li key={`unscheduled-${item.match_id}`}>
                    Match: {item.reason || "No valid slot"}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SchedulerPanel;
