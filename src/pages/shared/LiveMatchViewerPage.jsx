import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import {
  createMatchEventsSocket,
  getLiveMatchViewer,
  getLiveMatchViewerActions,
} from "../../services/matchEventService";
import { MatchRealtimeClient } from "../../services/realtime/realtimeClient";
import { useWorkspace } from "../../context/WorkspaceContext";
import MatchPresentation from "../../components/live-match-viewer/MatchPresentation";
import SportMatchAnalytics from "../../components/brackets/live-scoring/SportMatchAnalytics";
import {
  LiveSummaryAnnouncer,
  MatchContextHeader,
  SegmentBreakdown,
  ViewerStateNotice,
} from "../../components/live-match-viewer/ViewerPanels";

const resolveBackPath = (pathname) => {
  if (pathname.startsWith("/coordinator")) return "/coordinator/schedules";
  if (pathname.startsWith("/department")) return "/department/schedules";
  if (pathname.startsWith("/coach")) return "/coach/schedules";
  if (pathname.startsWith("/sport-facilitator")) return "/sport-facilitator/schedules";
  if (pathname.startsWith("/facilitator")) return "/sport-facilitator/schedules";
  if (pathname.startsWith("/viewer")) return "/viewer/schedules";
  return "/profile";
};

const errorMessage = (error) => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (detail?.message) return detail.message;
  return "The live Match viewer could not be loaded.";
};

const versionedViewerState = async (matchId) => {
  const viewer = await getLiveMatchViewer(matchId);
  return {
    ...viewer,
    state_version: Number(viewer?.realtime?.state_version || 0),
  };
};

const ViewerLoadingState = () => (
  <div className="space-y-6" aria-label="Loading live Match viewer" aria-busy="true">
    <div className="h-24 animate-pulse rounded-3xl bg-[var(--surface-muted)]" />
    <div className="h-96 animate-pulse rounded-[1.75rem] bg-[var(--surface-muted)]" />
    <div className="h-44 animate-pulse rounded-[1.5rem] bg-[var(--surface-muted)]" />
  </div>
);

const LiveMatchViewerPage = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedIntramural, selectIntramural } = useWorkspace();
  const [viewer, setViewer] = useState(null);
  const [actions, setActions] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const mountedRef = useRef(true);
  const refreshPromiseRef = useRef(null);
  const viewerVersionRef = useRef(0);

  const applyViewer = useCallback((payload, { replaceActions = true } = {}) => {
    if (!payload?.presentation || !payload?.match) return;
    viewerVersionRef.current = Number(payload?.realtime?.state_version || payload?.state_version || 0);
    setViewer(payload);
    if (replaceActions) {
      setActions(payload.actions_page?.actions || []);
      setNextCursor(payload.actions_page?.next_cursor ?? null);
      setHasMore(Boolean(payload.actions_page?.has_more));
    }
  }, []);

  const refreshViewer = useCallback(async () => {
    if (refreshPromiseRef.current) return refreshPromiseRef.current;
    refreshPromiseRef.current = versionedViewerState(matchId)
      .then((payload) => {
        if (mountedRef.current) applyViewer(payload);
        return payload;
      })
      .finally(() => {
        refreshPromiseRef.current = null;
      });
    return refreshPromiseRef.current;
  }, [applyViewer, matchId]);

  useEffect(() => {
    mountedRef.current = true;
    setIsLoading(true);
    setError("");
    refreshViewer()
      .catch((loadError) => {
        if (mountedRef.current) setError(errorMessage(loadError));
      })
      .finally(() => {
        if (mountedRef.current) setIsLoading(false);
      });
    return () => {
      mountedRef.current = false;
    };
  }, [refreshViewer]);

  useEffect(() => {
    const actualIntramural = viewer?.match?.intramural;
    const actualId = Number(actualIntramural?.id || 0);
    if (!actualId || actualId === Number(selectedIntramural?.id || 0)) return;
    selectIntramural({
      id: actualId,
      name: actualIntramural.name,
      status: actualIntramural.status,
      school_year: actualIntramural.school_year,
      semester: actualIntramural.semester,
    });
  }, [selectIntramural, selectedIntramural?.id, viewer?.match?.intramural]);

  useEffect(() => {
    if (!matchId) return undefined;
    const client = new MatchRealtimeClient({
      matchId,
      socketFactory: () => createMatchEventsSocket(matchId),
      fetchCanonicalState: versionedViewerState,
      onState: (state) => {
        if (state?.presentation && state?.match) {
          applyViewer(state);
          return;
        }
        // Socket envelopes carry the existing canonical live state. Confirm
        // it through the compact viewer REST projection before changing score
        // or public recent actions.
        void refreshViewer().catch(() => {});
      },
      onStatus: setConnectionStatus,
      pollSeconds: Number(import.meta.env.VITE_REALTIME_FALLBACK_POLL_SECONDS || 5),
    });
    client.currentVersion = viewerVersionRef.current;
    client.connect();
    return () => client.disconnect();
  }, [applyViewer, matchId, refreshViewer]);

  const loadMore = async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const page = await getLiveMatchViewerActions(matchId, {
        before_sequence: nextCursor,
        limit: 25,
      });
      setActions((current) => {
        const seen = new Set(current.map((action) => action.event_id));
        return [...current, ...(page.actions || []).filter((action) => !seen.has(action.event_id))];
      });
      setNextCursor(page.next_cursor ?? null);
      setHasMore(Boolean(page.has_more));
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setIsLoadingMore(false);
    }
  };

  const retry = () => {
    setIsLoading(true);
    setError("");
    refreshViewer()
      .catch((loadError) => setError(errorMessage(loadError)))
      .finally(() => setIsLoading(false));
  };

  const viewerPlayerStats = useMemo(() => {
    if (viewer?.player_stats && Object.keys(viewer.player_stats).length > 0) {
      return viewer.player_stats;
    }
    const res = {};
    for (const row of viewer?.statistics?.rows || []) {
      if (row.player_id && Array.isArray(row.values)) {
        const map = {};
        for (const val of row.values) {
          if (val.metric_key && val.value != null) {
            map[val.metric_key] = val.value;
          }
        }
        res[String(row.player_id)] = map;
      }
    }
    return res;
  }, [viewer?.player_stats, viewer?.statistics?.rows]);

  const viewerTimeline = useMemo(() => {
    if (Array.isArray(viewer?.timeline) && viewer.timeline.length > 0) {
      return viewer.timeline;
    }
    return Array.isArray(actions) && actions.length > 0
      ? actions
      : (viewer?.actions_page?.actions || viewer?.recent_actions || []);
  }, [viewer?.timeline, viewer?.actions_page?.actions, viewer?.recent_actions, actions]);

  const handleBack = useCallback(() => {
    if (location.state?.from) {
      navigate(location.state.from);
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(resolveBackPath(location.pathname));
    }
  }, [location.pathname, location.state?.from, navigate]);

  if (isLoading && !viewer) {
    return <div className="os-page-shell min-h-[calc(100dvh-5rem)]"><ViewerLoadingState /></div>;
  }

  if (!viewer) {
    return (
      <div className="os-page-shell min-h-[calc(100dvh-5rem)]">
        <section className="mx-auto max-w-xl rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-800 dark:border-rose-900 dark:bg-rose-950/35 dark:text-rose-200">
          <h1 className="text-xl font-black">Live Match unavailable</h1>
          <p className="mt-2 text-sm">{error || "The Match could not be found."}</p>
          <div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={retry} className="inline-flex items-center gap-2 rounded-full border border-rose-300 px-4 py-2 text-sm font-bold hover:bg-white/70"><RefreshCw size={16} aria-hidden="true" />Retry</button><button type="button" onClick={handleBack} className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700">Back to Matches</button></div>
        </section>
      </div>
    );
  }

  return (
    <article className="os-page-shell min-h-[calc(100dvh-5rem)] space-y-7 pb-12 sm:space-y-8" aria-labelledby="live-match-viewer-title">
      <MatchContextHeader match={viewer.match} connectionStatus={connectionStatus} onBack={handleBack} />
      <span id="live-match-viewer-title" className="sr-only">{viewer.match?.sport?.name} live Match viewer</span>
      {error ? <div role="status" className="flex items-center justify-between gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/35 dark:text-amber-100"><span>{error}</span><button type="button" onClick={() => setError("")} className="font-bold">Dismiss</button></div> : null}
      <ViewerStateNotice match={viewer.match} result={viewer.result} />
      <MatchPresentation presentation={viewer.presentation} participants={viewer.participants} rules={viewer.rules} result={viewer.result} />
      <LiveSummaryAnnouncer match={viewer.match} presentation={viewer.presentation} result={viewer.result} />
      <SegmentBreakdown segments={viewer.segment_history} />
      <SportMatchAnalytics
        sportKey={viewer.match?.sport?.key || viewer.match?.sport?.name || viewer.presentation?.sport_key || ""}
        participants={viewer.participants}
        scores={[
          viewer.presentation?.score?.participant1 ?? 0,
          viewer.presentation?.score?.participant2 ?? 0,
        ]}
        timeline={viewerTimeline}
        currentPeriod={viewer.presentation?.period?.current || viewer.presentation?.set_state?.current_set || null}
        playerStats={viewerPlayerStats}
        teamStats={viewer?.team_stats}
      />
    </article>
  );
};

export default LiveMatchViewerPage;
