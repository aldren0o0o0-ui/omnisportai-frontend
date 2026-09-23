import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardCard from "../common/DashboardCard";
import EmptyState from "../common/EmptyState";
import {
  createAssistantCoach,
  getEligibleCoaches,
  listAssistantCoaches,
  removeAssistantCoach,
  updateAssistantCoach,
} from "../../services/tournamentService";

const normalizeText = (value) => String(value ?? "").trim();

const getErrorMessage = (error, fallbackMessage) => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string") {
    if (error?.response?.status === 403) {
      return "You are not authorized to manage assistant coaches for this event.";
    }
    if (detail.includes("already actively assigned")) {
      return "This user is already assigned as an assistant coach for this event.";
    }
    return detail;
  }
  return fallbackMessage;
};

const AssistantCoachManager = ({
  tournamentId,
  departmentId,
  sportId,
  tournamentSportEventId = null,
  targetType,
  targetId,
  targetLabel = "",
  competitionTypeLabel = "",
  canManage = false,
  readOnly = false,
  headCoach = null,
  className = "",
}) => {
  const [assignments, setAssignments] = useState([]);
  const [candidateUsers, setCandidateUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedAssistantId, setSelectedAssistantId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const normalizedHeadCoachId = headCoach?.user_id ?? headCoach?.id ?? null;

  const loadAssignments = useCallback(async () => {
    if (!tournamentId || !targetType || !targetId) {
      setAssignments([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await listAssistantCoaches(Number(tournamentId), {
        department_id: departmentId,
        sport_id: sportId,
        tournament_sport_event_id: tournamentSportEventId,
        target_type: targetType,
        target_id: targetId,
      });
      setAssignments(Array.isArray(response?.items) ? response.items : []);
    } catch (apiError) {
      setAssignments([]);
      setError(getErrorMessage(apiError, "Failed to load assistant coaches."));
    } finally {
      setLoading(false);
    }
  }, [
    departmentId,
    sportId,
    targetId,
    targetType,
    tournamentId,
    tournamentSportEventId,
  ]);

  const loadCandidateUsers = useCallback(async () => {
    if (!canManage || readOnly || !tournamentId || !departmentId) {
      setCandidateUsers([]);
      return;
    }
    setCandidateLoading(true);
    try {
      const rows = await getEligibleCoaches(Number(tournamentId), {
        departmentId: Number(departmentId),
        sportId: sportId ? Number(sportId) : null,
      });
      setCandidateUsers(Array.isArray(rows) ? rows : []);
    } catch {
      setCandidateUsers([]);
    } finally {
      setCandidateLoading(false);
    }
  }, [canManage, departmentId, readOnly, sportId, tournamentId]);

  useEffect(() => {
    setSelectedAssistantId("");
    setSearch("");
    setMessage("");
    setError("");
    void loadAssignments();
    void loadCandidateUsers();
  }, [loadAssignments, loadCandidateUsers]);

  const assignedAssistantIds = useMemo(
    () =>
      new Set(
        assignments
          .map((assignment) => Number(assignment?.assistant_user_id || 0))
          .filter((value) => value > 0)
      ),
    [assignments]
  );

  const availableCandidates = useMemo(() => {
    const normalizedQuery = normalizeText(search).toLowerCase();
    return candidateUsers
      .filter((candidate) => {
        const candidateId = Number(candidate?.user_id || 0);
        if (!candidateId) return false;
        if (normalizedHeadCoachId && candidateId === Number(normalizedHeadCoachId)) return false;
        if (assignedAssistantIds.has(candidateId)) return false;
        if (!normalizedQuery) return true;
        const haystack = [
          candidate?.name,
          candidate?.email,
          candidate?.eligibility_scope,
        ]
          .map((value) => normalizeText(value).toLowerCase())
          .join(" ");
        return haystack.includes(normalizedQuery);
      })
      .sort((left, right) =>
        normalizeText(left?.name || left?.email).localeCompare(
          normalizeText(right?.name || right?.email)
        )
      );
  }, [assignedAssistantIds, candidateUsers, normalizedHeadCoachId, search]);

  const selectedCandidate = useMemo(
    () =>
      availableCandidates.find(
        (candidate) => String(candidate?.user_id || "") === String(selectedAssistantId || "")
      ) || null,
    [availableCandidates, selectedAssistantId]
  );

  const handleAddAssistant = async () => {
    if (!canManage || readOnly || !selectedAssistantId) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await createAssistantCoach(Number(tournamentId), {
        department_id: Number(departmentId),
        sport_id: Number(sportId),
        tournament_sport_event_id:
          tournamentSportEventId !== null && tournamentSportEventId !== undefined && tournamentSportEventId !== ""
            ? Number(tournamentSportEventId)
            : null,
        target_type: String(targetType),
        target_id: Number(targetId),
        assistant_user_id: Number(selectedAssistantId),
      });
      setSelectedAssistantId("");
      setSearch("");
      setMessage("Assistant coach added.");
      await loadAssignments();
      await loadCandidateUsers();
    } catch (apiError) {
      setError(getErrorMessage(apiError, "Failed to add assistant coach."));
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAssistant = async (assignmentId) => {
    if (!canManage || readOnly || !assignmentId) return;
    setRemovingId(Number(assignmentId));
    setMessage("");
    setError("");
    try {
      await removeAssistantCoach(Number(tournamentId), Number(assignmentId));
      setMessage("Assistant coach removed.");
      await loadAssignments();
      await loadCandidateUsers();
    } catch (apiError) {
      setError(getErrorMessage(apiError, "Failed to remove assistant coach."));
    } finally {
      setRemovingId(null);
    }
  };

  const handleToggleLiveScoring = async (assignment, nextValue) => {
    if (!canManage || readOnly || !assignment?.id) return;
    setUpdatingId(Number(assignment.id));
    setMessage("");
    setError("");
    try {
      await updateAssistantCoach(Number(tournamentId), Number(assignment.id), {
        can_live_score: Boolean(nextValue),
      });
      setMessage(
        nextValue
          ? "Assistant coach can now update live scores for assigned matches."
          : "Assistant coach live scoring permission removed."
      );
      await loadAssignments();
    } catch (apiError) {
      if (apiError?.response?.status === 403) {
        setError(
          "You are not authorized to update live scoring permission for this assistant coach."
        );
      } else {
        setError(
          getErrorMessage(
            apiError,
            "Unable to update assistant coach permission."
          )
        );
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const helperText =
    "Assistant coaches can view assigned roster, entries, schedule, and brackets. Official submissions remain limited to the assigned coach or authorized staff.";

  return (
    <DashboardCard className={className}>
      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Coaching Staff
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {targetLabel
              ? `${targetLabel}${competitionTypeLabel ? ` · ${competitionTypeLabel}` : ""}`
              : "Manage support staff for this assigned event target."}
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Head Coach
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
              {normalizeText(headCoach?.name || headCoach?.email || headCoach?.label) || "Not assigned"}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Assistant Coaches
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
              {loading ? "Loading..." : assignments.length}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200">
          {helperText}
        </div>

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

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Assistant Coaches
            </h3>
            {readOnly ? (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                Read-only
              </span>
            ) : null}
          </div>

          {loading ? (
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Loading assistant coaches...
            </div>
          ) : assignments.length === 0 ? (
            <EmptyState
              message={
                readOnly
                  ? "Assistant coaches can support this event, but only authorized users can add or remove them."
                  : "No assistant coaches assigned yet."
              }
            />
          ) : (
            <div className="space-y-2">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900/70"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {assignment.assistant_display_name || `User #${assignment.assistant_user_id}`}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Assistant Coach
                      </p>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                          assignment?.can_live_score
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200"
                            : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {assignment?.can_live_score
                          ? "Live scoring allowed"
                          : "Live scoring not allowed"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Allows this assistant coach to update live scores for assigned matches only.
                    </p>
                  </div>
                  {canManage && !readOnly ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200">
                        <input
                          type="checkbox"
                          checked={Boolean(assignment?.can_live_score)}
                          disabled={updatingId === Number(assignment.id)}
                          onChange={(event) =>
                            handleToggleLiveScoring(assignment, event.target.checked)
                          }
                        />
                        <span>
                          {updatingId === Number(assignment.id)
                            ? "Updating..."
                            : "Allow live scoring"}
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleRemoveAssistant(assignment.id)}
                        disabled={removingId === Number(assignment.id)}
                        className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-500/40 dark:bg-transparent dark:text-rose-200 dark:hover:bg-rose-500/10"
                      >
                        {removingId === Number(assignment.id) ? "Removing..." : "Remove"}
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        {canManage && !readOnly ? (
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-700 dark:bg-slate-800/40">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Add Assistant Coach
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Select an existing department user to support this event category.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Find User
              </label>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name or email"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Assistant Coach
              </label>
              <select
                value={selectedAssistantId}
                onChange={(event) => setSelectedAssistantId(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="">
                  {candidateLoading ? "Loading users..." : "Select a user"}
                </option>
                {availableCandidates.map((candidate) => (
                  <option key={candidate.user_id} value={candidate.user_id}>
                    {normalizeText(candidate.name || candidate.email || `User #${candidate.user_id}`)}
                    {candidate.email ? ` (${candidate.email})` : ""}
                  </option>
                ))}
              </select>
              {!candidateLoading && availableCandidates.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No additional department users are available for this event right now.
                </p>
              ) : null}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleAddAssistant}
                disabled={saving || !selectedCandidate}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Adding..." : "Add Assistant Coach"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </DashboardCard>
  );
};

export default AssistantCoachManager;
