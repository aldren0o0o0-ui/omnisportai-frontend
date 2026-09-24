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
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          <span>Back to Stage Progression</span>
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

