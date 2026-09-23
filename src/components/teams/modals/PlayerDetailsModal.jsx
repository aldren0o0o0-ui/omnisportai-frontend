import React from 'react';
import AppModal from "../../../components/common/AppModal";

export default function PlayerDetailsModal({
  closePlayerProfile,
  formatDateTime,
  playerProfileModal
}) {
  return (
    <AppModal
        open={playerProfileModal.open}
        onClose={closePlayerProfile}
        title="Player Details"
        subtitle="Participant record details"
        maxWidthClass="max-w-xl"
      >
        <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
          <p><span className="font-semibold">Name:</span> {playerProfileModal.player?.full_name || `${playerProfileModal.player?.first_name || ""} ${playerProfileModal.player?.last_name || ""}`.trim() || "-"}</p>
          <p><span className="font-semibold">Student ID:</span> {playerProfileModal.player?.student_id || "-"}</p>
          <p><span className="font-semibold">Email:</span> {playerProfileModal.player?.email || "-"}</p>
          <p><span className="font-semibold">Position:</span> {playerProfileModal.player?.position || "Roster"}</p>
          <p><span className="font-semibold">Joined:</span> {formatDateTime(playerProfileModal.player?.joined_at)}</p>
        </div>
      </AppModal>
  );
}
