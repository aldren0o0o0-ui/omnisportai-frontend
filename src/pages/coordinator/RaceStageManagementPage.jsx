import React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import StageProgressionView from '../../features/competitions/StageProgressionView';

export default function RaceStageManagementPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSelectContest = (contestId) => {
    const isFacilitator = location.pathname.includes('/facilitator');
    const base = isFacilitator ? '/sport-facilitator' : '/coordinator';
    navigate(`${base}/contests/${contestId}/timing`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <StageProgressionView
        eventId={eventId ? parseInt(eventId, 10) : null}
        apiBase="/api/v1"
        onSelectContest={handleSelectContest}
      />
    </div>
  );
}

