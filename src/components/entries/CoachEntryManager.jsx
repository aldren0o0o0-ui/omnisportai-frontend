import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardCard from "../common/DashboardCard";
import EmptyState from "../common/EmptyState";
import EntryCard from "./EntryCard";
import SoloEntryForm from "./SoloEntryForm";
import DuoEntryForm from "./DuoEntryForm";
import TeamEntryForm from "./TeamEntryForm";
import {
  describePlayersPerEntry,
  normalizeParticipantShape as normalizeEventParticipantShape,
  participantShapeLabel,
} from "../../utils/tournamentEventCategories";
import {
  createEntry,
  listEntries,
  removeEntryLogo,
  submitEntry,
  updateEntry,
  updateEntryIdentity,
  uploadEntryLogo,
} from "../../services/competitionEntryService";
import { TeamLogo } from "../common/IdentityImage";

const EDITABLE_STATUSES = new Set(["DRAFT", "INCOMPLETE"]);
const NON_LIMIT_STATUSES = new Set(["REJECTED", "EXPIRED"]);

const getSportConfig = (sport) =>
  sport?.configuration && typeof sport.configuration === "object"
    ? sport.configuration
    : sport?.sport_configuration && typeof sport.sport_configuration === "object"
      ? sport.sport_configuration
      : {};

const normalizeParticipantShape = (sport) => {
  const config = getSportConfig(sport);
  const unitType = String(config?.unit_type || "").trim().toUpperCase();
  if (["SOLO", "DUO", "TEAM"].includes(unitType)) return unitType;
  const participationType = String(config?.participation_type || sport?.category || "").trim().toLowerCase();
  if (participationType.includes("double") || participationType.includes("duo")) return "DUO";
  if (participationType.includes("single") || participationType.includes("solo")) return "SOLO";
  return "TEAM";
};

const resolvePlayersPerEntry = (sport, participantShape) => {
  const config = getSportConfig(sport);
  const configured = Number(config?.players_per_unit || 0);
  if (configured > 0) return configured;
  if (participantShape === "SOLO") return 1;
  if (participantShape === "DUO") return 2;
  return Number(config?.min_players || 0) || null;
};

const resolveRosterBounds = (sport) => {
  const config = getSportConfig(sport);
  const minPlayers = Number(sport?.min_players || config?.min_players || 0) || null;
  const maxPlayers = Number(sport?.max_players || config?.max_players || 0) || null;
  return { minPlayers, maxPlayers };
};

const resolveEntryLimit = (sport) => {
  const config = getSportConfig(sport);
  const value = Number(config?.max_entries_per_department || 0);
  return value > 0 ? value : null;
};

const toIdString = (value) => (value === null || value === undefined ? "" : String(value));

const buildDefaultTitle = ({ participantShape, departmentLabel, sportName, entryNumber }) => {
  const safeDepartment = String(departmentLabel || "").trim();
  const safeSport = String(sportName || "").trim();
  if (participantShape === "SOLO") {
    return safeDepartment && safeSport
      ? `${safeDepartment} ${safeSport} Entry ${entryNumber}`
      : `${safeSport || "Solo"} Entry ${entryNumber}`;
  }
  if (participantShape === "DUO") {
    return safeDepartment && safeSport
      ? `${safeDepartment} ${safeSport} Pair ${entryNumber}`
      : `${safeSport || "Doubles"} Pair ${entryNumber}`;
  }
  return safeDepartment && safeSport
    ? `${safeDepartment} ${safeSport} Team`
    : `${safeSport || "Team"} Entry`;
};

const normalizeEntryForUi = (entry, meta) => {
  const participantShape = String(entry?.participant_shape || meta.participantShape || "TEAM").trim().toUpperCase();
  const sortedMembers = Array.isArray(entry?.members)
    ? entry.members.slice().sort((left, right) => Number(left?.member_order || 0) - Number(right?.member_order || 0))
    : [];
  return {
    id: entry?.id,
    isLocal: false,
    entry_name: entry?.entry_name || "",
    logo_url: entry?.logo_url || null,
    entry_number: Number(entry?.entry_number || 0),
    participant_shape: participantShape,
    status: String(entry?.status || "DRAFT").trim().toUpperCase(),
    team_id: toIdString(entry?.team_id),
    members: sortedMembers.map((member) => toIdString(member?.player_id)).filter(Boolean),
    submitted_at: entry?.submitted_at || null,
    reviewed_at: entry?.reviewed_at || null,
    decision_note: entry?.decision_note || "",
  };
};

const makeLocalDraft = (meta, nextEntryNumber) => ({
  id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  isLocal: true,
  entry_name: "",
  entry_number: nextEntryNumber,
  participant_shape: meta.participantShape,
  status: "DRAFT",
  team_id: "",
  members:
    meta.participantShape === "DUO"
      ? ["", ""]
      : meta.participantShape === "SOLO"
        ? [""]
        : [],
});

const extractApiDetail = (error, fallbackMessage) => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string" && detail.includes("Select an event category")) {
    return {
      message: "Please choose an Event Category first, such as Singles or Doubles.",
      issues: [],
    };
  }
  if (detail && typeof detail === "object") {
    return {
      message: detail.message || fallbackMessage,
      issues: Array.isArray(detail.issues) ? detail.issues : [],
    };
  }
  return {
    message: typeof detail === "string" ? detail : fallbackMessage,
    issues: [],
  };
};

const buildPayload = (entry, meta) => {
  const participantShape = String(entry?.participant_shape || meta.participantShape).trim().toUpperCase();
  const normalizedTeamId = entry?.team_id ? Number(entry.team_id) : null;
  const memberIds = Array.isArray(entry?.members)
    ? entry.members
        .map((member) => Number(member))
        .filter((member) => Number.isInteger(member) && member > 0)
    : [];

  return {
    tournament_id: Number(meta.tournamentId),
    sport_id: Number(meta.sportId),
    department_id: Number(meta.departmentId),
    ...(meta.tournamentSportEventId
      ? { tournament_sport_event_id: Number(meta.tournamentSportEventId) }
      : {}),
    participant_shape: participantShape,
    entry_number: Number(entry.entry_number),
    ...(String(entry?.entry_name || "").trim() ? { entry_name: String(entry.entry_name).trim() } : {}),
    ...(participantShape === "TEAM" && normalizedTeamId ? { team_id: normalizedTeamId } : {}),
    members:
      participantShape === "TEAM"
        ? []
        : memberIds.map((playerId, index) => ({
            player_id: playerId,
            member_order: index + 1,
          })),
  };
};

const CoachEntryManager = ({
  tournamentId,
  sport = null,
  departmentId,
  departmentLabel = "",
  playerOptions = [],
  teamOptions = [],
  tournamentSportEventId = null,
  eventName = "",
  eventKey = "",
  participantShapeOverride = null,
  maxEntriesPerDepartmentOverride = null,
}) => {
  const participantShape = useMemo(
    () =>
      normalizeEventParticipantShape(
        participantShapeOverride,
        normalizeParticipantShape(sport)
      ),
    [participantShapeOverride, sport]
  );
  const playersPerEntry = useMemo(
    () => resolvePlayersPerEntry(sport, participantShape),
    [sport, participantShape]
  );
  const maxEntriesPerDepartment = useMemo(() => {
    const overrideValue = Number(maxEntriesPerDepartmentOverride || 0);
    if (overrideValue > 0) return overrideValue;
    return resolveEntryLimit(sport);
  }, [maxEntriesPerDepartmentOverride, sport]);
  const rosterBounds = useMemo(() => resolveRosterBounds(sport), [sport]);
  const sportId = Number(sport?.id || 0);
  const sportName = String(sport?.sport_name || sport?.name || "").trim();
  const normalizedEventName = String(eventName || "").trim();
  const normalizedEventKey = String(eventKey || "").trim();

  const [entries, setEntries] = useState([]);
  const [localDrafts, setLocalDrafts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busyMap, setBusyMap] = useState({});
  const [issuesByEntryId, setIssuesByEntryId] = useState({});
  const [logoBusyTeamId, setLogoBusyTeamId] = useState(null);

  const meta = useMemo(
    () => ({
      tournamentId: Number(tournamentId || 0),
      sportId,
      departmentId: Number(departmentId || 0),
      tournamentSportEventId: tournamentSportEventId ? Number(tournamentSportEventId) : null,
      participantShape,
      sportName,
      eventName: normalizedEventName,
      eventKey: normalizedEventKey,
      departmentLabel,
    }),
    [
      departmentId,
      departmentLabel,
      normalizedEventKey,
      normalizedEventName,
      participantShape,
      sportId,
      sportName,
      tournamentId,
      tournamentSportEventId,
    ]
  );

  const loadEntries = useCallback(async () => {
    if (!meta.tournamentId || !meta.sportId || !meta.departmentId) {
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const rows = await listEntries({
        tournamentId: meta.tournamentId,
        sportId: meta.sportId,
        departmentId: meta.departmentId,
        tournamentSportEventId: meta.tournamentSportEventId,
      });
      const safeRows = Array.isArray(rows) ? rows : [];
      setEntries(safeRows.map((row) => normalizeEntryForUi(row, meta)));
    } catch (apiError) {
      setEntries([]);
      const detail = apiError?.response?.data?.detail;
      const resolvedError =
        typeof detail === "string" && detail.includes("Select an event category")
          ? "Please choose an Event Category first, such as Singles or Doubles."
          : typeof detail === "string"
            ? detail
            : "Unable to load competition entries.";
      setError(resolvedError);
    } finally {
      setLoading(false);
    }
  }, [meta]);

  useEffect(() => {
    setLocalDrafts([]);
    setIssuesByEntryId({});
    setMessage("");
    setError("");
    loadEntries();
  }, [loadEntries]);

  const combinedEntries = useMemo(
    () =>
      [...entries, ...localDrafts].sort((left, right) => {
        if (Number(left.entry_number || 0) !== Number(right.entry_number || 0)) {
          return Number(left.entry_number || 0) - Number(right.entry_number || 0);
        }
        return String(left.id).localeCompare(String(right.id));
      }),
    [entries, localDrafts]
  );

  const statusSummary = useMemo(() => {
    return combinedEntries.reduce((accumulator, entry) => {
      const key = String(entry?.status || "DRAFT").trim().toUpperCase();
      accumulator[key] = Number(accumulator[key] || 0) + 1;
      return accumulator;
    }, {});
  }, [combinedEntries]);

  const usedEntryCount = useMemo(
    () => combinedEntries.filter((entry) => !NON_LIMIT_STATUSES.has(String(entry?.status || "").trim().toUpperCase())).length,
    [combinedEntries]
  );

  const nextEntryNumber = useMemo(() => {
    const used = new Set(
      combinedEntries
        .map((entry) => Number(entry?.entry_number || 0))
        .filter((entryNumber) => Number.isInteger(entryNumber) && entryNumber > 0)
    );
    let candidate = 1;
    while (used.has(candidate)) candidate += 1;
    return candidate;
  }, [combinedEntries]);

  const canAddMore = maxEntriesPerDepartment === null ? true : usedEntryCount < maxEntriesPerDepartment;

  const updateEntryState = useCallback((entryId, updater) => {
    const applyUpdate = (rows) =>
      rows.map((row) => (String(row.id) === String(entryId) ? updater(row) : row));
    setEntries((current) => applyUpdate(current));
    setLocalDrafts((current) => applyUpdate(current));
  }, []);

  const handleAddEntry = () => {
    setMessage("");
    setError("");
    if (!canAddMore) return;
    setLocalDrafts((current) => [...current, makeLocalDraft(meta, nextEntryNumber)]);
  };

  const handleRemoveLocalDraft = (entryId) => {
    setLocalDrafts((current) => current.filter((entry) => String(entry.id) !== String(entryId)));
    setIssuesByEntryId((current) => {
      const next = { ...current };
      delete next[String(entryId)];
      return next;
    });
  };

  const persistEntry = useCallback(
    async (entry) => {
      const payload = buildPayload(entry, meta);
      if (entry.isLocal) {
        return createEntry(payload);
      }
      return updateEntry(entry.id, payload);
    },
    [meta]
  );

  const setBusy = (entryId, nextBusy) => {
    setBusyMap((current) => ({ ...current, [String(entryId)]: nextBusy }));
  };

  const handleSaveDraft = async (entry) => {
    const entryId = String(entry.id);
    setMessage("");
    setError("");
    setIssuesByEntryId((current) => ({ ...current, [entryId]: [] }));
    setBusy(entryId, true);
    try {
      await persistEntry(entry);
      await loadEntries();
      if (entry.isLocal) {
        setLocalDrafts((current) => current.filter((row) => String(row.id) !== entryId));
      }
      setMessage(`${entry.entry_name || buildDefaultTitle({ participantShape, departmentLabel, sportName, entryNumber: entry.entry_number })} saved as draft.`);
    } catch (apiError) {
      const parsed = extractApiDetail(apiError, "Unable to save draft.");
      setIssuesByEntryId((current) => ({ ...current, [entryId]: parsed.issues }));
      setError(parsed.message);
    } finally {
      setBusy(entryId, false);
    }
  };

  const handleSubmitForReview = async (entry) => {
    const entryId = String(entry.id);
    setMessage("");
    setError("");
    setIssuesByEntryId((current) => ({ ...current, [entryId]: [] }));
    setBusy(entryId, true);
    try {
      let savedEntry = entry;
      if (entry.isLocal) {
        savedEntry = await persistEntry(entry);
        setLocalDrafts((current) => current.filter((row) => String(row.id) !== entryId));
      }
      await submitEntry(savedEntry.id);
      await loadEntries();
      setMessage(`${savedEntry.entry_name || buildDefaultTitle({ participantShape, departmentLabel, sportName, entryNumber: savedEntry.entry_number })} submitted for review.`);
    } catch (apiError) {
      const parsed = extractApiDetail(apiError, "Unable to submit entry for review.");
      setError(parsed.message);
      const targetId = entry.isLocal ? String(entry.id) : entryId;
      setIssuesByEntryId((current) => ({ ...current, [targetId]: parsed.issues }));
      await loadEntries();
    } finally {
      setBusy(entryId, false);
    }
  };

  const handleEntryLogo = async (entryId, file = null, remove = false) => {
    const numericEntryId = Number(entryId || 0);
    if (!numericEntryId || (!remove && !file)) return;
    setLogoBusyTeamId(`entry-${numericEntryId}`);
    setError("");
    try {
      if (remove) await removeEntryLogo(numericEntryId);
      else await uploadEntryLogo(numericEntryId, file);
      await loadEntries();
      setMessage(remove ? "Entry logo removed." : "Entry logo updated. It will now appear in standings and brackets.");
    } catch (apiError) {
      setError(apiError?.response?.data?.detail || "Unable to update the entry logo.");
    } finally {
      setLogoBusyTeamId(null);
    }
  };

  const handleIdentityName = async (entry) => {
    const entryId = Number(entry?.id || 0);
    const entryName = String(entry?.entry_name || "").trim();
    if (!entryId || entryName.length < 2) {
      setError("Team or entry name must contain at least 2 characters.");
      return;
    }
    setBusy(entryId, true);
    setError("");
    setMessage("");
    try {
      const updated = await updateEntryIdentity(entryId, { entry_name: entryName });
      updateEntryState(entryId, (current) => ({ ...current, entry_name: updated.entry_name }));
      await loadEntries();
      setMessage("Team or entry name updated.");
    } catch (apiError) {
      setError(apiError?.response?.data?.detail || "Unable to update the team or entry name.");
    } finally {
      setBusy(entryId, false);
    }
  };

  if (!meta.tournamentId || !meta.sportId) {
    return (
      <DashboardCard>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Entry Management</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Select a tournament and sport to manage entries for your department.
          </p>
        </div>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Entry Management</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Create, save, and submit {participantShape === "DUO" ? "pair" : participantShape === "SOLO" ? "athlete" : "team"} entries for this event category.
            </p>
            {meta.eventName ? (
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Event Category: <span className="text-slate-700 dark:text-slate-200">{meta.eventName}</span>
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={handleAddEntry}
            disabled={!canAddMore}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Add Entry
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Competition Type</p>
            <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
              {participantShapeLabel(participantShape)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Players per Entry</p>
            <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
              {participantShape === "TEAM" ? describePlayersPerEntry(participantShape) : playersPerEntry ?? "-"}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Entries per Department</p>
            <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
              {maxEntriesPerDepartment ? `${usedEntryCount} of ${maxEntriesPerDepartment} entries used` : `${usedEntryCount} entries used`}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Status Summary</p>
            <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
              {Object.entries(statusSummary).length > 0
                ? Object.entries(statusSummary)
                    .map(([status, count]) => `${count} ${status.replaceAll("_", " ")}`)
                    .join(" • ")
                : "No entries yet"}
            </p>
          </div>
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

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
            Loading entries...
          </div>
        ) : combinedEntries.length === 0 ? (
          <EmptyState message="No entries created yet for this tournament sport." />
        ) : (
          <div className="space-y-4">
            {combinedEntries.map((entry) => {
              const currentIssues = issuesByEntryId[String(entry.id)] || [];
              const readOnly = !entry.isLocal && !EDITABLE_STATUSES.has(String(entry.status || "").trim().toUpperCase());
              const entryTitle =
                entry.entry_name ||
                buildDefaultTitle({
                  participantShape,
                  departmentLabel,
                  sportName,
                  entryNumber: entry.entry_number,
                });
              const busy = Boolean(busyMap[String(entry.id)]);

              let entrySubtitle = entry.isLocal ? "New local draft" : participantShapeLabel(participantShape);
              if (participantShape === "SOLO") {
                const filled = (entry.members || []).filter(Boolean).length;
                entrySubtitle = `${entrySubtitle} • Athlete: ${filled}/1 ${filled === 1 ? "✓" : "• Select athlete"}`;
              } else if (participantShape === "DUO") {
                const filled = (entry.members || []).filter(Boolean).length;
                entrySubtitle = `${entrySubtitle} • Members: ${filled}/2 ${filled === 2 ? "✓" : `• Add ${2 - filled} more`}`;
              } else if (participantShape === "TEAM") {
                const selectedTeam = teamOptions.find((team) => String(team.id) === String(entry.team_id));
                const count = selectedTeam ? Number(selectedTeam.players?.length ?? selectedTeam.players_count ?? selectedTeam.members?.length ?? 0) : 0;
                const { minPlayers, maxPlayers } = rosterBounds;
                const reqLabel = minPlayers && maxPlayers
                  ? `Roster: ${minPlayers}–${maxPlayers} Players`
                  : minPlayers
                  ? `Min: ${minPlayers} Players`
                  : maxPlayers
                  ? `Max: ${maxPlayers} Players`
                  : "TEAM Roster";

                if (entry.team_id) {
                  if (minPlayers && count < minPlayers) {
                    entrySubtitle = `${entrySubtitle} • ${reqLabel} • Needs ${minPlayers - count} more players (${count}/${minPlayers})`;
                  } else if (maxPlayers && count >= maxPlayers) {
                    entrySubtitle = `${entrySubtitle} • ${reqLabel} • Roster full (${count}/${maxPlayers})`;
                  } else {
                    entrySubtitle = `${entrySubtitle} • ${reqLabel} • ${count} Players ✓`;
                  }
                } else {
                  entrySubtitle = `${entrySubtitle} • ${reqLabel} • Select team`;
                }
              }

              return (
                <EntryCard
                  key={`coach-entry-${entry.id}`}
                  title={entryTitle}
                  subtitle={entrySubtitle}
                  status={entry.status}
                  readOnly={readOnly}
                  issues={currentIssues}
                  busy={busy}
                >
                  <div className="grid gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Entry Label
                      </label>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <input
                          value={entry.entry_name}
                          onChange={(event) =>
                            updateEntryState(entry.id, (current) => ({
                              ...current,
                              entry_name: event.target.value,
                            }))
                          }
                          placeholder={buildDefaultTitle({
                            participantShape,
                            departmentLabel,
                            sportName,
                            entryNumber: entry.entry_number,
                          })}
                          className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                        {!entry.isLocal ? (
                          <button type="button" onClick={() => void handleIdentityName(entry)} disabled={busy || String(entry.entry_name || "").trim().length < 2} className="rounded-xl border border-blue-300 px-4 py-2 text-sm font-semibold text-blue-700 disabled:opacity-50 dark:border-blue-500/50 dark:text-blue-300">
                            {busy ? "Saving..." : "Save name"}
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {participantShape === "SOLO" ? (
                      <SoloEntryForm
                        value={entry.members?.[0] || ""}
                        options={playerOptions}
                        disabled={readOnly}
                        onChange={(value) =>
                          updateEntryState(entry.id, (current) => ({
                            ...current,
                            members: [value],
                          }))
                        }
                      />
                    ) : null}

                    {participantShape === "DUO" ? (
                      <DuoEntryForm
                        values={[
                          entry.members?.[0] || "",
                          entry.members?.[1] || "",
                        ]}
                        options={playerOptions}
                        disabled={readOnly}
                        onChange={(values) =>
                          updateEntryState(entry.id, (current) => ({
                            ...current,
                            members: values,
                          }))
                        }
                      />
                    ) : null}

                    {participantShape === "TEAM" ? (
                      <div className="space-y-3">
                        <TeamEntryForm value={entry.team_id || ""} options={teamOptions} disabled={readOnly} onChange={(value) => updateEntryState(entry.id, (current) => ({ ...current, team_id: value }))} />
                        {entry.team_id && !entry.isLocal ? (() => {
                          const selectedTeam = teamOptions.find((team) => Number(team.id) === Number(entry.team_id));
                          const busyLogo = logoBusyTeamId === `entry-${entry.id}`;
                          return <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-3"><TeamLogo imageUrl={entry.logo_url || selectedTeam?.logo_url || selectedTeam?.image_url} label={selectedTeam?.team_name || selectedTeam?.name || entryTitle} /><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-[var(--text-main)]">Team entry logo</p><p className="text-xs text-[var(--text-muted)]">Used only for this Intramural entry.</p></div><label className="cursor-pointer rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-bold text-white"><input type="file" accept=".jpg,.jpeg,.png,.webp" className="sr-only" disabled={busyLogo} onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleEntryLogo(entry.id, file); event.target.value = ""; }} />{busyLogo ? "Uploading…" : entry.logo_url ? "Change logo" : "Upload logo"}</label>{entry.logo_url ? <button type="button" disabled={busyLogo} onClick={() => void handleEntryLogo(entry.id, null, true)} className="rounded-lg border border-rose-500/30 px-3 py-2 text-xs font-bold text-rose-600 disabled:opacity-50">Remove</button> : null}</div>;
                        })() : null}
                      </div>
                    ) : null}

                    {participantShape !== "TEAM" && !entry.isLocal ? <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-3"><TeamLogo imageUrl={entry.logo_url} label={entryTitle} /><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-[var(--text-main)]">Entry logo</p><p className="text-xs text-[var(--text-muted)]">Optional image for this {participantShape === "DUO" ? "pair" : "solo entry"}.</p></div><label className="cursor-pointer rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-bold text-white"><input type="file" accept=".jpg,.jpeg,.png,.webp" className="sr-only" disabled={logoBusyTeamId === `entry-${entry.id}`} onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleEntryLogo(entry.id, file); event.target.value = ""; }} />{logoBusyTeamId === `entry-${entry.id}` ? "Uploading…" : entry.logo_url ? "Change logo" : "Upload logo"}</label>{entry.logo_url ? <button type="button" disabled={logoBusyTeamId === `entry-${entry.id}`} onClick={() => void handleEntryLogo(entry.id, null, true)} className="rounded-lg border border-rose-500/30 px-3 py-2 text-xs font-bold text-rose-600 disabled:opacity-50">Remove</button> : null}</div> : null}

                    {!readOnly ? (
                      <div className="flex flex-wrap gap-2">
                        {entry.isLocal ? (
                          <button
                            type="button"
                            onClick={() => handleRemoveLocalDraft(entry.id)}
                            disabled={busy}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                          >
                            Remove Draft
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => handleSaveDraft(entry)}
                          disabled={busy}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                        >
                          {busy ? "Saving..." : "Save Draft"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSubmitForReview(entry)}
                          disabled={busy}
                          className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {busy ? "Submitting..." : "Submit for Review"}
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        This entry is read-only while it is {String(entry.status || "").toLowerCase().replaceAll("_", " ")}.
                      </p>
                    )}
                  </div>
                </EntryCard>
              );
            })}
          </div>
        )}
      </div>
    </DashboardCard>
  );
};

export default CoachEntryManager;
