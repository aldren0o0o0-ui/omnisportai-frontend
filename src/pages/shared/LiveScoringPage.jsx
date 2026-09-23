import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import LiveScoringDashboard from "../../components/brackets/LiveScoringDashboard";
import { getMatchById } from "../../services/matchEventService";

const resolveBackPath = (pathname) => {
  if (pathname.startsWith("/coordinator/matches")) return "/coordinator/brackets";
  if (pathname.startsWith("/coordinator")) return "/coordinator/intramurals";
  if (pathname.startsWith("/department")) return "/department/brackets";
  if (pathname.startsWith("/coach")) return "/coach/brackets";
  if (pathname.startsWith("/sport-facilitator")) return "/sport-facilitator/brackets";
  if (pathname.startsWith("/viewer")) return "/viewer/dashboard";
  return "/profile";
};

const LiveScoringPage = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [match, setMatch] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setIsLoading(true);
      setError("");
      try {
        const response = await getMatchById(matchId);
        if (!active) return;
        setMatch(response);
      } catch (loadError) {
        if (!active) return;
        setError(loadError.response?.data?.detail || "Failed to load match details.");
      } finally {
        if (active) setIsLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [matchId, retryKey]);

  if (isLoading) {
    return (
      <div className="mx-4 my-6 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-700 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-cyan-500" />
          <span>Loading live scoring...</span>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="mx-4 my-6 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        <p>{error || "Match not found."}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setRetryKey((value) => value + 1)}
            className="rounded-md border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
          >
            Retry
          </button>
          <button
            type="button"
            onClick={() => navigate(resolveBackPath(location.pathname))}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Back to Matches
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="os-page-shell min-h-[calc(100dvh-5rem)] space-y-4">
      <LiveScoringDashboard
        match={match}
        onExit={() => navigate(resolveBackPath(location.pathname))}
        onLiveState={() => {}}
      />
    </div>
  );
};

export default LiveScoringPage;
