import { useEffect, useMemo, useState } from "react";
import { getTeamPlayers, getTeams } from "../../services/teamService";
import {
  archivePlayer,
  assignPlayerToTeam,
  createPlayer,
  getPlayerDeleteImpact,
  getPlayers,
  removePlayerFromTeam,
  removePlayerProfileImage,
  restorePlayer,
  updatePlayer,
  uploadPlayerProfileImage
} from "../../services/playerService";
import { PlayerAvatar } from "../../components/common/IdentityImage";
import { Users } from "lucide-react";
import PageHeaderCard from "../../components/common/PageHeaderCard";
import AppModal from "../../components/common/AppModal";
import ActionMenu from "../../components/common/ActionMenu";
import CollapsibleFilterPanel from "../../components/common/CollapsibleFilterPanel";
import { useProfileDrawer, resolveProfileUserId } from "../../components/profile";

const emptyForm = {
  student_id: "",
  first_name: "",
  last_name: "",
  email: ""
};

const Players = () => {
  const { openProfile } = useProfileDrawer();
  const [teams, setTeams] = useState([]);
  const [teamFilter, setTeamFilter] = useState("");
  const [players, setPlayers] = useState([]);
  const [roster, setRoster] = useState([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [uploadingPlayerId, setUploadingPlayerId] = useState(null);
  const [archiveFilter, setArchiveFilter] = useState("active");
  const [archiveModal, setArchiveModal] = useState({
    open: false,
    playerId: null,
    playerName: "",
    deleteImpact: null,
    hasDependencies: false,
    busy: false,
    error: ""
  });

  const selectedTeam = useMemo(
    () => teams.find((row) => Number(row.id) === Number(teamFilter)) || null,
    [teamFilter, teams]
  );

  const filterSummaryParts = useMemo(() => {
    const parts = [];
    if (teamFilter) parts.push(selectedTeam?.team_name || "Selected team");
    if (archiveFilter !== "active") {
      const archiveMap = {
        archived: "Archived players",
        all: "All archive states",
      };
      parts.push(archiveMap[archiveFilter] || "Archive filter");
    }
    if (query.trim()) parts.push(`Search: "${query.trim()}"`);
    return parts;
  }, [archiveFilter, query, selectedTeam?.team_name, teamFilter]);

  const activeFilterCount = filterSummaryParts.length;

  const clearFilters = () => {
    setTeamFilter("");
    setArchiveFilter("active");
    setQuery("");
  };

  const loadTeams = async () => {
    const rows = await getTeams();
    const sorted = (Array.isArray(rows) ? rows : [])
      .slice()
      .sort((a, b) => String(a.team_name || "").localeCompare(String(b.team_name || "")));
    setTeams(sorted);
  };

  const loadPlayers = async () => {
    setIsLoading(true);
    setError("");
    try {
      const rows = await getPlayers({
        teamId: teamFilter ? Number(teamFilter) : null,
        query,
        includeArchived: archiveFilter === "all",
        archiveState: archiveFilter
      });
      setPlayers(Array.isArray(rows) ? rows : []);
    } catch (apiError) {
      setPlayers([]);
      setError(apiError?.response?.data?.detail || "Failed to load players.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadRoster = async () => {
    if (!teamFilter) {
      setRoster([]);
      return;
    }
    try {
      const rows = await getTeamPlayers(Number(teamFilter));
      setRoster(Array.isArray(rows) ? rows : []);
    } catch {
      setRoster([]);
    }
  };

  useEffect(() => {
    let active = true;
    const bootstrap = async () => {
      try {
        await loadTeams();
      } catch (apiError) {
        if (active) {
          setError(apiError?.response?.data?.detail || "Failed to load teams.");
        }
      }
    };
    bootstrap();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    loadPlayers();
    loadRoster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamFilter, archiveFilter]);

  const submitPlayer = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsSaving(true);
    try {
      if (editingId) {
        await updatePlayer(editingId, form);
        setNotice("Player updated successfully.");
      } else {
        await createPlayer(form);
        setNotice("Player created successfully.");
      }
      setForm(emptyForm);
      setEditingId(null);
      await loadPlayers();
      await loadRoster();
    } catch (apiError) {
      setError(apiError?.response?.data?.detail || "Failed to save player.");
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = (player) => {
    setEditingId(player.id);
    setForm({
      student_id: player.student_id || "",
      first_name: player.first_name || "",
      last_name: player.last_name || "",
      email: player.email || ""
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const openArchiveModal = async (player) => {
    setArchiveModal({
      open: true,
      playerId: Number(player.id),
      playerName: `${player.first_name || ""} ${player.last_name || ""}`.trim() || "Unknown player",
      deleteImpact: null,
      hasDependencies: false,
      busy: true,
      error: ""
    });
    try {
      const impact = await getPlayerDeleteImpact(Number(player.id));
      setArchiveModal((prev) => ({
        ...prev,
        busy: false,
        deleteImpact: impact,
        hasDependencies: Boolean(impact?.has_dependencies)
      }));
    } catch (apiError) {
      setArchiveModal((prev) => ({
        ...prev,
        busy: false,
        error: apiError?.response?.data?.detail || "Unable to load player impact."
      }));
    }
  };

  const closeArchiveModal = () => {
    if (archiveModal.busy) return;
    setArchiveModal({
      open: false,
      playerId: null,
      playerName: "",
      deleteImpact: null,
      hasDependencies: false,
      busy: false,
      error: ""
    });
  };

  const confirmArchivePlayer = async () => {
    if (!archiveModal.playerId) return;
    setError("");
    setNotice("");
    setArchiveModal((prev) => ({ ...prev, busy: true, error: "" }));
    try {
      await archivePlayer(archiveModal.playerId);
      setNotice("Player archived successfully.");
      await loadPlayers();
      await loadRoster();
      closeArchiveModal();
    } catch (apiError) {
      setArchiveModal((prev) => ({
        ...prev,
        busy: false,
        error: apiError?.response?.data?.detail || "Failed to archive player."
      }));
    }
  };

  const handleRestorePlayer = async (playerId) => {
    setError("");
    setNotice("");
    try {
      await restorePlayer(playerId);
      setNotice("Player restored successfully.");
      await loadPlayers();
      await loadRoster();
    } catch (apiError) {
      setError(apiError?.response?.data?.detail || "Failed to restore player.");
    }
  };

  const handleAssign = async (playerId) => {
    if (!teamFilter) {
      setError("Select a team first before assigning players.");
      return;
    }
    setError("");
    setNotice("");
    try {
      await assignPlayerToTeam(playerId, Number(teamFilter), { position: "Roster" });
      setNotice("Player assigned to roster.");
      await loadPlayers();
      await loadRoster();
    } catch (apiError) {
      setError(apiError?.response?.data?.detail || "Failed to assign player.");
    }
  };

  const handleRemoveFromRoster = async (playerId) => {
    if (!teamFilter) return;
    setError("");
    setNotice("");
    try {
      await removePlayerFromTeam(playerId, Number(teamFilter));
      setNotice("Player removed from roster.");
      await loadPlayers();
      await loadRoster();
    } catch (apiError) {
      setError(apiError?.response?.data?.detail || "Failed to remove player.");
    }
  };

  const isPlayerInSelectedRoster = (playerId) =>
    roster.some((row) => Number(row.id) === Number(playerId));

  const handleUploadPlayerImage = async (playerId, file) => {
    if (!file) return;
    setError("");
    setNotice("");
    setUploadingPlayerId(playerId);
    try {
      await uploadPlayerProfileImage(playerId, file);
      setNotice("Player image updated.");
      await loadPlayers();
      await loadRoster();
    } catch (apiError) {
      setError(apiError?.response?.data?.detail || "Failed to upload player image.");
    } finally {
      setUploadingPlayerId(null);
    }
  };

  const handleRemovePlayerImage = async (playerId) => {
    setError("");
    setNotice("");
    setUploadingPlayerId(playerId);
    try {
      await removePlayerProfileImage(playerId);
      setNotice("Player image removed.");
      await loadPlayers();
      await loadRoster();
    } catch (apiError) {
      setError(apiError?.response?.data?.detail || "Failed to remove player image.");
    } finally {
      setUploadingPlayerId(null);
    }
  };

  const openUserProfile = (userId, playerId = null) => {
    const resolved = resolveProfileUserId(userId);
    if (!resolved && !playerId) return;
    openProfile({
      userId: resolved || null,
      playerId: playerId ? Number(playerId) : null,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeaderCard
        icon={Users}
        title="Global Player Administration"
        subtitle="Administrative player records across all Intramurals. Competition rosters are managed from Teams & Entries."
      />

      <section className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-200">
        Tournament roster management is now handled in Team Details on the Teams page. Manual player records here are legacy/admin-only.
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <CollapsibleFilterPanel
          title="Player Filters"
          activeCount={activeFilterCount}
          onClear={clearFilters}
          summaryText={
            activeFilterCount > 0
              ? `Filtered by: ${filterSummaryParts.join(" · ")}`
              : "No active filters"
          }
        >
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
            <select
              aria-label="Filter players by team"
              value={teamFilter}
              onChange={(event) => setTeamFilter(event.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
            >
              <option value="">All Teams</option>
              {teams.map((team) => (
                <option key={team.id} value={String(team.id)}>
                  {team.team_name}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter players by archive status"
              value={archiveFilter}
              onChange={(event) => setArchiveFilter(event.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
            >
              <option value="active">Active</option>
              <option value="archived">Archived</option>
              <option value="all">All</option>
            </select>
            <input
              aria-label="Search players"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, email, or student ID"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 lg:col-span-2"
            />
            <button
              type="button"
              onClick={loadPlayers}
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Search
            </button>
          </div>
        </CollapsibleFilterPanel>
        {selectedTeam ? (
          <p className="mt-2 text-xs text-slate-500">
            Selected Team: {selectedTeam.team_name} | Current roster: {roster.length}
          </p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {editingId ? "Edit Player" : "Create Player"}
        </h2>
        <form onSubmit={submitPlayer} className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-300">Student ID<input value={form.student_id} onChange={(event) => setForm((prev) => ({ ...prev, student_id: event.target.value }))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" /></label>
          <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-300">Email<input type="email" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" /></label>
          <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-300">First Name <span className="sr-only">required</span><input required value={form.first_name} onChange={(event) => setForm((prev) => ({ ...prev, first_name: event.target.value }))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" /></label>
          <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-300">Last Name <span className="sr-only">required</span><input required value={form.last_name} onChange={(event) => setForm((prev) => ({ ...prev, last_name: event.target.value }))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" /></label>
          <div className="md:col-span-2 flex flex-wrap gap-2">
            <button type="submit" disabled={isSaving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60">
              {isSaving ? "Saving..." : editingId ? "Update Player" : "Create Player"}
            </button>
            {editingId ? (
              <button type="button" onClick={cancelEdit} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </section>

      {error ? (
        <section className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </section>
      ) : null}
      {notice ? (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300">
          {notice}
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Player Directory</h2>
        {isLoading ? (
          <div className="mt-3 grid gap-3" role="status" aria-label="Loading players">
            {[1, 2, 3, 4, 5].map((row) => <div key={row} className="h-11 animate-pulse rounded-lg bg-slate-100 motion-reduce:animate-none dark:bg-slate-800" />)}
          </div>
        ) : players.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No players found for the selected filters.</p>
        ) : (
          <div className="mt-3 overflow-visible rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Player directory</caption>
              <thead className="sticky top-0 z-10 bg-slate-100 text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="hidden px-3 py-2 sm:table-cell">Student ID</th>
                  <th className="hidden px-3 py-2 lg:table-cell">Email</th>
                  <th className="px-3 py-2">Roster</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {players.map((player) => {
                  const inRoster = teamFilter ? isPlayerInSelectedRoster(player.id) : false;
                  return (
                    <tr
                      key={player.id}
                      className={`${
                        player.is_archived
                          ? "bg-slate-100/70 text-slate-500 dark:bg-slate-900/70 dark:text-slate-400"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      }`}
                    >
                      <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">
                        <div className="flex items-center gap-2">
                          <PlayerAvatar imageUrl={player.profile_image_url} label={`${player.first_name || ""} ${player.last_name || ""}`.trim() || "Player"} scale="sm" />
                          {resolveProfileUserId(player.user_id, player.account_user_id) || player.id ? (
                            <button
                              type="button"
                              onClick={() => openUserProfile(player.user_id || player.account_user_id, player.id)}
                              className="text-left text-blue-700 hover:text-blue-600 dark:text-blue-300 dark:hover:text-blue-200"
                              aria-label={`View ${player.first_name} ${player.last_name}'s profile`}
                            >
                              {player.first_name} {player.last_name}
                            </button>
                          ) : (
                            <span>{player.first_name} {player.last_name}</span>
                          )}
                          {player.is_archived ? (
                            <span className="rounded-full bg-slate-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                              Archived
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="hidden px-3 py-2 text-slate-600 sm:table-cell dark:text-slate-400">{player.student_id || "-"}</td>
                      <td className="hidden px-3 py-2 text-slate-600 lg:table-cell dark:text-slate-400">{player.email || "-"}</td>
                      <td className="px-3 py-2">
                        {teamFilter ? (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${inRoster ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400"}`}>
                            {inRoster ? "Assigned" : "Not assigned"}
                          </span>
                        ) : <span className="text-xs text-slate-400">Select a team</span>}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end">
                          <input id={`player-photo-${player.id}`} type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" disabled={uploadingPlayerId === player.id || player.is_archived} onChange={(event) => handleUploadPlayerImage(player.id, event.target.files?.[0] || null)} />
                          <ActionMenu buttonLabel="Actions" items={[
                            teamFilter ? { label: inRoster ? "Remove from roster" : "Assign to roster", disabled: player.is_archived, onClick: () => inRoster ? handleRemoveFromRoster(player.id) : handleAssign(player.id), danger: inRoster } : null,
                            { label: "Edit", disabled: player.is_archived, onClick: () => startEdit(player) },
                            { label: "View profile", onClick: () => openUserProfile(player.user_id || player.account_user_id, player.id) },
                            { label: uploadingPlayerId === player.id ? "Uploading photo…" : "Upload photo", disabled: uploadingPlayerId === player.id || player.is_archived, onClick: () => document.getElementById(`player-photo-${player.id}`)?.click() },
                            player.profile_image_url ? { label: "Remove photo", disabled: uploadingPlayerId === player.id || player.is_archived, onClick: () => handleRemovePlayerImage(player.id) } : null,
                            player.is_archived ? { label: "Restore", onClick: () => handleRestorePlayer(player.id) } : { label: "Archive", danger: true, onClick: () => openArchiveModal(player) },
                          ]} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <AppModal
        open={archiveModal.open}
        onClose={closeArchiveModal}
        title="Archive Player?"
        subtitle="Archive preserves roster, match, and statistics history."
        maxWidthClass="max-w-xl"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            This player may be linked to rosters, applications, matches, or statistics. Archive instead of deleting to preserve history.
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Player: <span className="font-semibold">{archiveModal.playerName}</span>
          </p>
          {archiveModal.deleteImpact?.counts ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300">
              Linked records: Tournament Roster {archiveModal.deleteImpact.counts.tournament_team_player || 0}
              {" | "}
              Team Roster {archiveModal.deleteImpact.counts.team_player || 0}
              {" | "}
              Match Participation {archiveModal.deleteImpact.counts.match_player || 0}
              {" | "}
              Player Stats {archiveModal.deleteImpact.counts.player_stats || 0}
            </div>
          ) : null}
          {archiveModal.error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
              {archiveModal.error}
            </div>
          ) : null}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeArchiveModal}
              disabled={archiveModal.busy}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmArchivePlayer}
              disabled={archiveModal.busy}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-60"
            >
              {archiveModal.busy ? "Archiving..." : "Archive Player"}
            </button>
          </div>
        </div>
      </AppModal>

      {selectedTeam ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Approved Team Roster: {selectedTeam.team_name}
          </h2>
          {roster.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No players are assigned to this roster yet.</p>
          ) : (
            <ul className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
              {roster.map((player) => (
                <li key={`roster-${player.team_player_id}`} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800/50">
                  <div className="flex items-center gap-2">
                    <PlayerAvatar imageUrl={player.profile_image_url} label={player.full_name || "Player"} scale="sm" />
                    {resolveProfileUserId(player.user_id, player.applicant_id, player.account_user_id) ? (
                      <button
                        type="button"
                        onClick={() => openUserProfile(player.user_id || player.applicant_id || player.account_user_id)}
                        className="font-semibold text-blue-700 hover:text-blue-600 dark:text-blue-300 dark:hover:text-blue-200"
                      >
                        {player.full_name}
                      </button>
                    ) : (
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{player.full_name}</p>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">{player.student_id || "-"} | {player.email || "-"}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
};

export default Players;
