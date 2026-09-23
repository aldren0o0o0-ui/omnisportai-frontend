import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import RaceTimingConsole from '../../features/competitions/RaceTimingConsole';

export default function RaceFacilitatorConsolePage() {
  const { contestId } = useParams();
  const navigate = useNavigate();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg text-sm font-medium border border-zinc-700 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Stage Progression
        </button>
      </div>
      <RaceTimingConsole
        contestId={contestId ? parseInt(contestId, 10) : null}
        apiBase="/api/v1"
        onCertified={() => {
          // Optional notification / navigation hook
        }}
      />
    </div>
  );
}

