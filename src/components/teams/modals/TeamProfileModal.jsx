import React from 'react';
import AppModal from "../../../components/common/AppModal";
import { TeamLogo, PlayerAvatar } from "../../../components/common/IdentityImage";
import StatusBadge from "../../../components/common/StatusBadge";
import { getSportDisplayName } from "../../../utils/tournamentEventCategories";
import { resolveProfileUserId } from "../../../components/profile";

const tabClass = (active) =>
  `rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold transition whitespace-nowrap shrink-0 ${
    active
      ? "bg-blue-600 text-white"
      : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-200 dark:hover:bg-[var(--surface)]"
  }`;

export default function TeamProfileModal({
  acceptedApplicationsCount,
  applicationActionBusyId,
  applications,
  applicationsError,
  applicationsLoading,
  // eslint-disable-next-line no-unused-vars
  assigningCandidate,
  // eslint-disable-next-line no-unused-vars
  candidateError,
  // eslint-disable-next-line no-unused-vars
  candidateLoading,
  // eslint-disable-next-line no-unused-vars
  candidatePosition,
  // eslint-disable-next-line no-unused-vars
  candidateQuery,
  closeTeamDetails,
  detailsCoachLabel,
  detailsDepartmentLabel,
  detailsError,
  detailsLoading,
  detailsModal,
  detailsNotice,
  detailsSportLabel,
  detailsTab,
  formatDateTime,
  getPrimaryApplicationAction,
  // eslint-disable-next-line no-unused-vars
  handleAddExistingPlayer,
  handleApplicationAction,
  handleDetailsTabChange,
  normalizeApplicationStatus,
  openAssignCoachModal,
  openPlayerProfile,
  openRemoveRosterModal,
  openUserProfileDrawer,
  pendingApplicationsCount,
  // eslint-disable-next-line no-unused-vars
  player,
  readOnly,
  refreshTeamDetails,
  // eslint-disable-next-line no-unused-vars
  row,
  // eslint-disable-next-line no-unused-vars
  searchExistingPlayers,
  // eslint-disable-next-line no-unused-vars
  selectedCandidateId,
  selectedTournament,
  setApplicationDetailModal,
  // eslint-disable-next-line no-unused-vars
  setCandidatePosition,
  // eslint-disable-next-line no-unused-vars
  setCandidateQuery,
  // eslint-disable-next-line no-unused-vars
  setSelectedCandidateId,
  // eslint-disable-next-line no-unused-vars
  setShowAdvancedOverride,
  summaryRosterCount,
  teamById,
  teamDetails,
  teamRoster
}) {
  return (
    <AppModal
      open={detailsModal.open}
      onClose={closeTeamDetails}
      title={detailsModal.teamName || "Team Details"}
      subtitle="Intramural-aware view for roster, applications, and coach context."
      maxWidthClass="max-w-6xl"
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-[var(--surface)]/50">
            <p className="text-xs uppercase tracking-wide text-slate-500">Department</p>
            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{detailsDepartmentLabel}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-[var(--surface)]/50">
            <p className="text-xs uppercase tracking-wide text-slate-500">Sport</p>
            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{detailsSportLabel}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-[var(--surface)]/50">
            <p className="text-xs uppercase tracking-wide text-slate-500">Tournament Roster Count</p>
            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{summaryRosterCount}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-[var(--surface)]/50">
            <p className="text-xs uppercase tracking-wide text-slate-500">Tournament</p>
            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
              {teamDetails?.tournament_name || selectedTournament?.tournament_name || "-"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto overscroll-x-contain pb-2 border-b border-slate-200 dark:border-slate-800 [scrollbar-width:none]">
          <button type="button" onClick={() => handleDetailsTabChange("overview")} className={tabClass(detailsTab === "overview")}>Overview</button>
          <button type="button" onClick={() => handleDetailsTabChange("roster")} className={tabClass(detailsTab === "roster")}>Tournament Roster</button>
          <button type="button" onClick={() => handleDetailsTabChange("applications")} className={tabClass(detailsTab === "applications")}>Applications</button>
          <button type="button" onClick={() => handleDetailsTabChange("coach")} className={tabClass(detailsTab === "coach")}>Coach / Team Manager</button>
          <button
            type="button"
            onClick={() => refreshTeamDetails(Number(detailsModal.teamId), { keepNotice: true })}
            className="ml-auto shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-200 dark:hover:bg-[var(--surface)]"
          >
            Refresh
          </button>
        </div>

        {detailsError ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
            {detailsError}
          </div>
        ) : null}
        {detailsNotice ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-300">
            {detailsNotice}
          </div>
        ) : null}

        {detailsLoading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading team details...</p>
        ) : null}

        {!detailsLoading && detailsTab === "overview" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[var(--surface)]">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Team Information</h4>
              <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                <p><span className="font-semibold">Team:</span> {teamDetails?.team_name || detailsModal.teamName}</p>
                <p><span className="font-semibold">Department:</span> {detailsDepartmentLabel}</p>
                <p><span className="font-semibold">Sport:</span> {detailsSportLabel}</p>
                <p><span className="font-semibold">Tournament:</span> {teamDetails?.tournament_name || selectedTournament?.tournament_name || "-"}</p>
                <p><span className="font-semibold">Coach:</span> {detailsCoachLabel}</p>
                <p><span className="font-semibold">Status:</span> {teamDetails?.status || "-"}</p>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[var(--surface)]">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Tournament Roster Snapshot</h4>
              {teamRoster.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No players approved for this tournament roster yet.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                    // eslint-disable-next-line no-unused-vars
                  {teamRoster.slice(0, 6).map((player) => (

                    <li key={`overview-player-${player.team_player_id || player.id}`} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-[var(--surface-soft)]/60">
                        // eslint-disable-next-line no-unused-vars
                      <span className="font-medium text-slate-900 dark:text-slate-100">{player.full_name || `${player.first_name || ""} ${player.last_name || ""}`.trim()}</span>
                        // eslint-disable-next-line no-unused-vars
                      <span className="text-xs text-slate-500 dark:text-slate-400">{player.position || "Roster"}</span>
                    </li>
                  ))}
                  {teamRoster.length > 6 ? (
                    <li className="text-xs text-slate-500 dark:text-slate-400">+{teamRoster.length - 6} more players</li>
                  ) : null}
                </ul>
              )}
            </div>
          </div>
        ) : null}

        {!detailsLoading && detailsTab === "roster" ? (
          <div className="space-y-5">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-300">
              These players are approved for this tournament only. Roster players should normally come from approved team applications.
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-[var(--surface)]/50">
                <p className="text-xs uppercase tracking-wide text-slate-500">Total Players</p>
                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{summaryRosterCount}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-[var(--surface)]/50">
                <p className="text-xs uppercase tracking-wide text-slate-500">Pending Applications</p>
                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{pendingApplicationsCount}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-[var(--surface)]/50">
                <p className="text-xs uppercase tracking-wide text-slate-500">Accepted Applications</p>
                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{acceptedApplicationsCount}</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[var(--surface)]">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Current Tournament Roster</h4>
              {teamRoster.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No players are assigned to this tournament roster yet.</p>
              ) : (
                <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600 dark:bg-[var(--surface-soft)] dark:text-slate-400">
                      <tr>
                        <th className="px-3 py-2">Player</th>
                        <th className="px-3 py-2">Student ID</th>
                        <th className="px-3 py-2">Email</th>
                        <th className="px-3 py-2">Position</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        // eslint-disable-next-line no-unused-vars
                      {teamRoster.map((player) => {

                        const profileUserId = resolveProfileUserId(player.user_id, player.applicant_id, player.account_user_id);
                        return (

                          <tr key={`roster-row-${player.team_player_id || player.id}`}>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-slate-100">
                                // eslint-disable-next-line no-unused-vars
                                <PlayerAvatar imageUrl={player.profile_image_url} label={player.full_name || "Player"} scale="sm" />
                                {profileUserId ? (
                                  <button
                                    type="button"
                                    onClick={() => openUserProfileDrawer(profileUserId)}
                                    className="text-left text-blue-700 hover:text-blue-600 dark:text-blue-300 dark:hover:text-blue-200"
                                  >
                                    // eslint-disable-next-line no-unused-vars
                                    {player.full_name || `${player.first_name || ""} ${player.last_name || ""}`.trim() || "Unknown player"}
                                  </button>
                                ) : (

                                  <span>{player.full_name || `${player.first_name || ""} ${player.last_name || ""}`.trim() || "Unknown player"}</span>
                                )}
                              </div>
                            </td>
                            // eslint-disable-next-line no-unused-vars
                            <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{player.student_id || "-"}</td>
                            // eslint-disable-next-line no-unused-vars
                            <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{player.email || "-"}</td>
                            // eslint-disable-next-line no-unused-vars
                            <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{player.position || "Roster"}</td>
                            <td className="px-3 py-2">
                              // eslint-disable-next-line no-unused-vars
                              <StatusBadge status={player.tournament_roster_status || "ASSIGNED"} />
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"

                                  onClick={() => openPlayerProfile(player)}
                                  className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                >
                                  View Details
                                </button>
                                {profileUserId ? (
                                  <button
                                    type="button"
                                    onClick={() => openUserProfileDrawer(profileUserId)}
                                    className="rounded border border-blue-200 bg-white px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                                  >
                                    View Profile
                                  </button>
                                ) : null}
                                <button
                                  type="button"

                                  onClick={() => openRemoveRosterModal(player)}
                                  className="rounded border border-rose-200 bg-white px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                                >
                                  Remove from Roster
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[var(--surface)]">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Advanced Roster Override</h4>
                  <button
                    type="button"
                    // eslint-disable-next-line no-unused-vars
                    onClick={() => setShowAdvancedOverride((prev) => !prev)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-200 dark:hover:bg-[var(--surface)]"
                  >
                    {showAdvancedOverride ? "Hide" : "Show"}
                  </button>
                </div>
                <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                  Use this only for correction, migration, or emergency encoding. Normal roster entry should come from team applications.
                </p>
                {showAdvancedOverride ? (
                  <div className="mt-3 space-y-3">
                    <div className="flex gap-2">
                      <input
                        // eslint-disable-next-line no-unused-vars
                        value={candidateQuery}
                        // eslint-disable-next-line no-unused-vars
                        onChange={(event) => setCandidateQuery(event.target.value)}
                        placeholder="Search name, email, or student ID"
                        className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                      />
                      <button
                        type="button"
                        // eslint-disable-next-line no-unused-vars
                        onClick={searchExistingPlayers}
                        // eslint-disable-next-line no-unused-vars
                        disabled={candidateLoading}
                        className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
                      >
                        // eslint-disable-next-line no-unused-vars
                        {candidateLoading ? "Searching..." : "Search"}
                      </button>
                    </div>
                    // eslint-disable-next-line no-unused-vars
                    {candidateError ? (
                      // eslint-disable-next-line no-unused-vars
                      <p className="text-xs text-slate-500 dark:text-slate-400">{candidateError}</p>
                    ) : null}
                    <select
                      // eslint-disable-next-line no-unused-vars
                      value={selectedCandidateId}
                      // eslint-disable-next-line no-unused-vars
                      onChange={(event) => setSelectedCandidateId(event.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                    >
                      // eslint-disable-next-line no-unused-vars
                      <option value="">Select a player</option>
                      // eslint-disable-next-line no-unused-vars
                      {visibleCandidateRows.map((row) => (
                        // eslint-disable-next-line no-unused-vars
                        <option key={`candidate-${row.id}`} value={row.id}>
                          // eslint-disable-next-line no-unused-vars
                          {row.first_name} {row.last_name} {row.email ? `(${row.email})` : ""}
                        </option>
                      ))}
                    </select>
                    <input
                      // eslint-disable-next-line no-unused-vars
                      value={candidatePosition}
                      // eslint-disable-next-line no-unused-vars
                      onChange={(event) => setCandidatePosition(event.target.value)}
                      placeholder="Position (optional)"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                    />
                    <button
                      type="button"
                      // eslint-disable-next-line no-unused-vars
                      onClick={handleAddExistingPlayer}
                      // eslint-disable-next-line no-unused-vars
                      disabled={assigningCandidate}
                      className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
                    >
                      // eslint-disable-next-line no-unused-vars
                      {assigningCandidate ? "Adding..." : "Add Existing Player to Roster"}
                    </button>
                  </div>
                ) : null}
              </div> */}
          </div>
        ) : null}

        {!detailsLoading && detailsTab === "applications" ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200">
              Review applicants and approve eligible players into this tournament roster. Students or viewers should apply to join this team for the selected tournament, then approved applications become tournament roster players.
            </div>

            {applicationsError ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
                {applicationsError}
              </div>
            ) : null}

            {applicationsLoading ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Loading applications...</p>
            ) : applications.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No applications found for this team in the selected tournament.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600 dark:bg-[var(--surface-soft)] dark:text-slate-400">
                    <tr>
                      <th className="px-3 py-2">Applicant</th>
                      <th className="px-3 py-2">Department</th>
                      <th className="px-3 py-2">Sport</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Submitted</th>
                      <th className="px-3 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      // eslint-disable-next-line no-unused-vars
                    {applications.map((row) => {

                      const status = normalizeApplicationStatus(row.application_status);
                      const isClosed = ["ACCEPTED_AS_PLAYER", "REJECTED", "ELIMINATED_AFTER_TRYOUT", "CANCELLED"].includes(status);
                      const primaryAction = getPrimaryApplicationAction(status);
                      return (

                        <tr key={`app-${row.id}`}>
                          <td className="px-3 py-2">
                              // eslint-disable-next-line no-unused-vars
                            {resolveProfileUserId(row.applicant_id, row.user_id) ? (
                              <button
                                type="button"

                                onClick={() => openUserProfileDrawer(row.applicant_id || row.user_id)}
                                className="font-medium text-blue-700 hover:text-blue-600 dark:text-blue-300 dark:hover:text-blue-200"
                              >
                                  // eslint-disable-next-line no-unused-vars
                                {row.applicant_name || "Unknown user"}
                              </button>
                            ) : (

                              <div className="font-medium text-slate-900 dark:text-slate-100">{row.applicant_name || "Unknown user"}</div>
                            )}
                              // eslint-disable-next-line no-unused-vars
                            <div className="text-xs text-slate-500 dark:text-slate-400">{row.applicant_email || "-"}</div>
                          </td>
                            // eslint-disable-next-line no-unused-vars
                          <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{row.department_name || row.department_id || "-"}</td>
                          <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                              // eslint-disable-next-line no-unused-vars
                            {getSportDisplayName(row, row.sport_id || "-")}
                              // eslint-disable-next-line no-unused-vars
                            {row.event_name && row.event_name !== "Default" && ` (${row.event_name})`}
                          </td>
                            // eslint-disable-next-line no-unused-vars
                          <td className="px-3 py-2"><StatusBadge status={row.application_status} /></td>
                            // eslint-disable-next-line no-unused-vars
                          <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{formatDateTime(row.created_at)}</td>
                          <td className="px-3 py-2">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"

                                onClick={() => setApplicationDetailModal({ open: true, row })}
                                className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                              >
                                View
                              </button>
                                // eslint-disable-next-line no-unused-vars
                              {resolveProfileUserId(row.applicant_id, row.user_id) ? (
                                <button
                                  type="button"

                                  onClick={() => openUserProfileDrawer(row.applicant_id || row.user_id)}
                                  className="rounded border border-blue-200 bg-white px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                                >
                                  View Profile
                                </button>
                              ) : null}
                              {!isClosed ? (
                                <>
                                  {primaryAction ? (
                                    <button
                                      type="button"

                                      onClick={() => handleApplicationAction(row, primaryAction.key)}

                                      disabled={applicationActionBusyId === row.id}
                                      className="rounded border border-emerald-200 bg-white px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                                    >
                                        // eslint-disable-next-line no-unused-vars
                                      {applicationActionBusyId === row.id ? "..." : primaryAction.label}
                                    </button>
                                  ) : null}
                                  <button
                                    type="button"

                                    onClick={() => handleApplicationAction(row, "reject")}

                                    disabled={applicationActionBusyId === row.id}
                                    className="rounded border border-rose-200 bg-white px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                                  >
                                      // eslint-disable-next-line no-unused-vars
                                    {applicationActionBusyId === row.id ? "..." : "Reject"}
                                  </button>
                                </>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}

        {!detailsLoading && detailsTab === "coach" ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[var(--surface)]">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Assigned Coach / Team Manager</h4>
              <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">{detailsCoachLabel}</p>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Team coaching assignments are role-scoped. Replace or remove coach assignments using the assign coach flow.
              </p>
              {!readOnly ? (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      const raw = teamById[detailsModal.teamId] || {};
                      openAssignCoachModal({
                        id: detailsModal.teamId,
                        coach_id: raw.coach_id || teamDetails?.coach_id || null,
                        sport_id: raw.sport_id || teamDetails?.sport_id || null
                      });
                    }}
                    className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
                  >
                    {teamDetails?.coach_id || teamById[detailsModal.teamId]?.coach_id ? "Change Coach" : "Assign Coach"}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </AppModal>
  );
}
