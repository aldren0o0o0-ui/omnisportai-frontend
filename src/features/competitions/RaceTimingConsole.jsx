import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, 
  Square, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Flag, 
  RotateCcw, 
  ShieldCheck, 
  Wifi, 
  WifiOff, 
  Edit3,
  Award,
  Zap,
  Timer,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import api from '../../api/axios';
import { BACKEND_RUNTIME_URLS } from '../../api/realtimeUrl';

export const parseTimeToDecimalSeconds = (val) => {
  if (val === null || val === undefined) return { valid: false, decimalSeconds: null };
  const raw = String(val).trim();
  if (!raw) return { valid: false, decimalSeconds: null };

  // mm:ss.sss format
  if (raw.includes(':')) {
    const parts = raw.split(':');
    if (parts.length === 2) {
      const mins = parseFloat(parts[0]);
      const secs = parseFloat(parts[1]);
      if (!Number.isNaN(mins) && !Number.isNaN(secs) && mins >= 0 && secs >= 0 && secs < 60) {
        const total = (mins * 60 + secs).toFixed(3);
        return { valid: true, decimalSeconds: total, display: `${total}s` };
      }
    }
  }

  // Decimal seconds format
  const num = parseFloat(raw);
  if (!Number.isNaN(num) && num > 0) {
    const fixed = num.toFixed(3);
    return { valid: true, decimalSeconds: fixed, display: `${fixed}s` };
  }

  return { valid: false, decimalSeconds: null };
};

const STATUS_BADGES = {
  SCHEDULED: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  READY: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-300 animate-pulse dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-600',
  FINISHED: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-600',
  UNDER_REVIEW: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-700',
};

export default function RaceTimingConsole({ contestId, apiBase = '/api/v1', onCertified }) {
  const [contest, setContest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  
  // Stopwatch state
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  // Form inputs for results
  const [timesInput, setTimesInput] = useState({});
  const [statusInput, setStatusInput] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Correction modal
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionTarget, setCorrectionTarget] = useState(null);
  const [correctionTime, setCorrectionTime] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');

  // Fetch contest data
  const fetchContest = async () => {
    try {
      setLoading(true);
      const res = await api.get(`${apiBase}/contests/${contestId}`);
      setContest(res.data);
      
      // Initialize inputs from fetched results
      const initialTimes = {};
      const initialStatuses = {};
      res.data.contestants?.forEach(c => {
        if (c.result?.performance_time) {
          initialTimes[c.id] = String(c.result.performance_time);
        }
        const backendStatus = c.result?.result_status;
        initialStatuses[c.id] = backendStatus && backendStatus !== 'ASSIGNED' && backendStatus !== 'CHECKED_IN'
          ? backendStatus
          : (c.result?.performance_time ? 'FINISHED' : 'FINISHED');
      });
      setTimesInput(initialTimes);
      setStatusInput(initialStatuses);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to load contest details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (contestId) {
      fetchContest();
    }
  }, [contestId]);

  // WebSocket live sync
  useEffect(() => {
    if (!contestId) return;

    const wsBase = BACKEND_RUNTIME_URLS.webSocketBaseUrl;
    const wsUrl = `${wsBase}${apiBase}/contests/${contestId}/ws`;

    let socket;
    try {
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        setWsConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const envelope = JSON.parse(event.data);
          if (envelope.event_type) {
            fetchContest();
          }
        } catch {
          // ignore non-json messages
        }
      };

      socket.onclose = () => {
        setWsConnected(false);
      };

      socket.onerror = () => {
        setWsConnected(false);
      };
    } catch {
      setWsConnected(false);
    }

    return () => {
      if (socket) socket.close();
    };
  }, [contestId]);

  // Stopwatch timer logic
  useEffect(() => {
    if (timerRunning) {
      startTimeRef.current = Date.now() - elapsedMs;
      timerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startTimeRef.current);
      }, 10);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning]);

  const formatTimer = (ms) => {
    const totalSeconds = ms / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  };

  // Live Projected Ranking
  const projectedRankings = useMemo(() => {
    if (!contest?.contestants) return {};
    const validEntries = [];
    contest.contestants.forEach((c) => {
      const status = statusInput[c.id] || 'FINISHED';
      const timeVal = timesInput[c.id];
      const parsed = parseTimeToDecimalSeconds(timeVal);
      if (status === 'FINISHED' && parsed.valid) {
        validEntries.push({
          id: c.id,
          seconds: parseFloat(parsed.decimalSeconds),
        });
      }
    });

    validEntries.sort((a, b) => a.seconds - b.seconds);

    const ranks = {};
    let currentRank = 1;
    validEntries.forEach((item, idx) => {
      if (idx > 0 && item.seconds !== validEntries[idx - 1].seconds) {
        currentRank = idx + 1;
      }
      ranks[item.id] = {
        rank: currentRank,
        isLeader: currentRank === 1,
      };
    });
    return ranks;
  }, [contest?.contestants, statusInput, timesInput]);

  // Capture lane time from stopwatch
  const handleCaptureLaneTime = (contestantId) => {
    if (elapsedMs <= 0) {
      setFeedback({ type: 'warning', message: 'Start the stopwatch timer first before recording lane times.' });
      return;
    }
    const currentSeconds = (elapsedMs / 1000).toFixed(3);
    setTimesInput((prev) => ({ ...prev, [contestantId]: currentSeconds }));
    setStatusInput((prev) => ({ ...prev, [contestantId]: 'FINISHED' }));
    setFeedback({ type: 'success', message: `Recorded ${currentSeconds}s for Lane!` });
  };

  const handleStartContest = async () => {
    try {
      setSubmitting(true);
      setFeedback(null);
      await api.post(`${apiBase}/contests/${contestId}/start`);
      setTimerRunning(true);
      await fetchContest();
      setFeedback({ type: 'success', message: 'Race started! Stopwatch timer running.' });
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.detail || 'Failed to start race.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinishContest = async () => {
    try {
      setSubmitting(true);
      setFeedback(null);
      setTimerRunning(false);
      await api.post(`${apiBase}/contests/${contestId}/finish`);
      await fetchContest();
      setFeedback({ type: 'info', message: 'Race finished. Enter or verify all lane times and click Record Results.' });
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.detail || 'Failed to finish race.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetStopwatch = () => {
    setTimerRunning(false);
    setElapsedMs(0);
    setFeedback({ type: 'info', message: 'Stopwatch timer reset to 00:00.00.' });
  };

  const handleRecordResults = async () => {
    try {
      setSubmitting(true);
      setFeedback(null);

      // Validate inputs
      const errors = [];
      const resultsPayload = (contest.contestants || []).map((c) => {
        const rawTime = timesInput[c.id];
        const parsed = parseTimeToDecimalSeconds(rawTime);
        let status = statusInput[c.id] || 'FINISHED';

        if (status === 'FINISHED') {
          if (!parsed.valid) {
            errors.push(`Lane ${c.lane_number || c.id} (${c.entry_name}): Enter a valid finish time (e.g. 10.425 or 1:02.34) or change status to DNS/DNF.`);
          }
        }

        return {
          contestant_id: c.id,
          result_status: status,
          performance_time: status === 'FINISHED' && parsed.valid ? parsed.decimalSeconds : null,
        };
      });

      if (errors.length > 0) {
        setFeedback({ type: 'error', message: errors[0] });
        setSubmitting(false);
        return;
      }

      await api.post(`${apiBase}/contests/${contestId}/results`, { results: resultsPayload });
      await fetchContest();
      setFeedback({ type: 'success', message: 'Official finish times recorded and Standard Competition Ranking applied!' });
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.detail || 'Failed to record results.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCertifyContest = async () => {
    if (!window.confirm('Certify official results? Once certified, times are locked and stage advancement / medal points will be resolved.')) {
      return;
    }
    try {
      setSubmitting(true);
      setFeedback(null);
      const res = await api.post(`${apiBase}/contests/${contestId}/certify`);
      await fetchContest();
      if (onCertified) onCertified(res.data);
      setFeedback({ type: 'success', message: 'Contest officially certified! Standings and qualification resolved.' });
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.detail || 'Failed to certify contest.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApplyCorrection = async () => {
    if (!correctionReason.trim()) {
      alert('A valid reason is required for audited corrections.');
      return;
    }
    try {
      setSubmitting(true);
      const parsed = parseTimeToDecimalSeconds(correctionTime);
      const idempKey = `corr-${contestId}-${correctionTarget.id}-${Date.now()}`;
      await api.post(`${apiBase}/contests/${contestId}/corrections`, {
        contestant_id: correctionTarget.id,
        reason: correctionReason,
        corrected_time: parsed.valid ? parsed.decimalSeconds : null,
        idempotency_key: idempKey,
      });
      setShowCorrectionModal(false);
      setCorrectionTarget(null);
      setCorrectionTime('');
      setCorrectionReason('');
      await fetchContest();
      setFeedback({ type: 'success', message: 'Audited result correction persisted successfully.' });
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to apply correction.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
        <Clock className="w-6 h-6 mr-3 animate-spin text-indigo-500" />
        <span className="text-sm font-medium">Loading race timing console...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-5 rounded-2xl border border-rose-200 bg-rose-50/80 text-rose-800 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200 flex items-center gap-3">
        <AlertTriangle className="w-6 h-6 shrink-0 text-rose-600 dark:text-rose-400" />
        <div>
          <div className="font-semibold text-sm">Unable to load race console</div>
          <div className="text-xs opacity-90 mt-0.5">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Console Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6 dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5 dark:border-slate-800">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-300">
                <Timer className="h-3.5 w-3.5" />
                Race Timing Console
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${STATUS_BADGES[contest.status] || STATUS_BADGES.SCHEDULED}`}>
                {contest.status}
              </span>
              {contest.is_official && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-300 flex items-center gap-1 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  OFFICIAL CERTIFIED
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-2">
              {contest.contest_name}
            </h2>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-4">
              <span>Stage: <strong className="text-slate-700 dark:text-slate-300">{contest.stage_name}</strong></span>
              <span>Capacity: <strong className="text-slate-700 dark:text-slate-300">{contest.lane_capacity} Lanes</strong></span>
              <span>Athletes: <strong className="text-slate-700 dark:text-slate-300">{contest.contestants?.length || 0}</strong></span>
            </div>
          </div>

          {/* Stopwatch Timer Display & WebSocket status */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
              {wsConnected ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Live Feed</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-400">Offline</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="font-mono text-2xl sm:text-3xl font-extrabold tracking-wider px-4 py-2 rounded-xl border border-amber-300/80 bg-amber-50 text-amber-900 shadow-inner dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
                {formatTimer(elapsedMs)}
              </div>
              <button
                type="button"
                onClick={handleResetStopwatch}
                title="Reset Stopwatch Timer"
                className="p-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Feedback Alert Banner */}
        {feedback && (
          <div className={`mt-4 p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 ${
            feedback.type === 'error'
              ? 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/40'
              : feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/40'
              : 'bg-indigo-50 text-indigo-800 border border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/40'
          }`}>
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <AlertTriangle className="w-4 h-4" />}
              <span>{feedback.message}</span>
            </div>
            <button type="button" onClick={() => setFeedback(null)} className="text-xs opacity-60 hover:opacity-100">✕</button>
          </div>
        )}

        {/* Control Action Toolbar */}
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          {contest.status !== 'IN_PROGRESS' && contest.status !== 'FINISHED' && !contest.is_official && (
            <button
              onClick={handleStartContest}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              Start Gun &amp; Timer
            </button>
          )}

          {contest.status === 'IN_PROGRESS' && (
            <button
              onClick={handleFinishContest}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              <Square className="w-4 h-4 fill-white" />
              Finish Race
            </button>
          )}

          {!contest.is_official && (
            <>
              <button
                onClick={handleRecordResults}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50 cursor-pointer"
              >
                <Flag className="w-4 h-4" />
                {submitting ? 'Recording...' : 'Record Results'}
              </button>

              <button
                onClick={handleCertifyContest}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50 sm:ml-auto cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                Sign Off &amp; Certify
              </button>
            </>
          )}

          {contest.is_official && (
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-xs font-bold px-3 py-1.5 sm:ml-auto">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Official Results Locked &amp; Published</span>
            </div>
          )}
        </div>
      </div>

      {/* Lanes and Contestants Board */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden dark:border-slate-800 dark:bg-slate-900/60">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Lane Lineup &amp; Recorded Times</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enter finish times in seconds (e.g. 10.425) or mm:ss format (e.g. 1:02.34), or click Capture Time to record from the live stopwatch.
            </p>
          </div>
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Standard 1224 Ranking
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-slate-100 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-800">
                <th className="py-3 px-4 w-16 text-center">Lane</th>
                <th className="py-3 px-4">Athlete / Entry</th>
                <th className="py-3 px-4 w-32">Status</th>
                <th className="py-3 px-4 w-52">Finish Time</th>
                <th className="py-3 px-4 w-28 text-center">Rank</th>
                <th className="py-3 px-4 w-28 text-center">Advancement</th>
                <th className="py-3 px-4 w-28 text-right">Quick Tool</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans text-xs">
              {contest.contestants?.map((c) => {
                const res = c.result;
                const officialPlace = res?.placement;
                const proj = projectedRankings[c.id];
                const displayPlace = officialPlace || proj?.rank;
                const isLeader = officialPlace === 1 || proj?.isLeader;

                return (
                  <tr key={c.id} className={`transition ${isLeader ? 'bg-amber-50/40 dark:bg-amber-500/5' : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'}`}>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-base text-amber-600 dark:text-amber-400">
                      {c.lane_number || '-'}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <span>{c.entry_name}</span>
                        {isLeader && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full dark:bg-amber-500/20 dark:text-amber-300">
                            Fastest
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Entry #{c.competition_entry_id} • Seed: {c.seed_number || 'N/A'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {contest.is_official ? (
                        <span className="font-semibold text-xs text-slate-700 dark:text-slate-300">
                          {res?.result_status || c.status}
                        </span>
                      ) : (
                        <select
                          value={statusInput[c.id] || 'FINISHED'}
                          onChange={(e) => setStatusInput({ ...statusInput, [c.id]: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                        >
                          <option value="FINISHED">FINISHED</option>
                          <option value="DNS">DNS (Did Not Start)</option>
                          <option value="DNF">DNF (Did Not Finish)</option>
                          <option value="DQ">DQ (Disqualified)</option>
                          <option value="NO_TIME">NO_TIME</option>
                        </select>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {contest.is_official ? (
                        <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                          {res?.performance_time ? `${res.performance_time}s` : '—'}
                        </span>
                      ) : (
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="e.g. 10.425 or 1:02.34"
                            value={timesInput[c.id] || ''}
                            disabled={statusInput[c.id] && statusInput[c.id] !== 'FINISHED'}
                            onChange={(e) => {
                              const val = e.target.value;
                              setTimesInput({ ...timesInput, [c.id]: val });
                              if (val.trim()) {
                                setStatusInput((prev) => ({ ...prev, [c.id]: 'FINISHED' }));
                              }
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-mono text-xs text-slate-900 font-semibold focus:outline-indigo-500 disabled:opacity-40 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                          />
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {displayPlace ? (
                        <span className={`inline-flex items-center justify-center font-bold px-2.5 py-0.5 rounded-full text-[11px] ${
                          displayPlace === 1 ? 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40' :
                          displayPlace === 2 ? 'bg-slate-200 text-slate-800 border border-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600' :
                          displayPlace === 3 ? 'bg-amber-800/10 text-amber-900 border border-amber-800/30 dark:bg-amber-800/20 dark:text-amber-400 dark:border-amber-800/40' :
                          'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {displayPlace === 1 ? '🥇 1st' : displayPlace === 2 ? '🥈 2nd' : displayPlace === 3 ? '🥉 3rd' : `${displayPlace}th`}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {res?.qualification_status ? (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          res.qualification_status === 'QUALIFIED_AUTOMATIC' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800' :
                          res.qualification_status === 'QUALIFIED_TIME' ? 'bg-sky-100 text-sky-800 border border-sky-300 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800' :
                          res.qualification_status === 'RESERVE' ? 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800' :
                          'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {res.qualification_status === 'QUALIFIED_AUTOMATIC' ? 'Q (Auto)' :
                           res.qualification_status === 'QUALIFIED_TIME' ? 'q (Time)' :
                           res.qualification_status}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {!contest.is_official ? (
                        <button
                          type="button"
                          onClick={() => handleCaptureLaneTime(c.id)}
                          title="Capture current stopwatch time into this lane"
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-indigo-500/20 dark:hover:text-indigo-300"
                        >
                          <Zap className="h-3 w-3" />
                          <span>Capture</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setCorrectionTarget(c);
                            setCorrectionTime(res?.performance_time || '');
                            setShowCorrectionModal(true);
                          }}
                          className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-amber-600 transition dark:hover:bg-slate-800 dark:hover:text-amber-400"
                          title="Submit Audited Correction"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {contest.contestants?.map((c) => {
            const res = c.result;
            const officialPlace = res?.placement;
            const proj = projectedRankings[c.id];
            const displayPlace = officialPlace || proj?.rank;
            const isLeader = officialPlace === 1 || proj?.isLeader;

            return (
              <div key={c.id} className={`p-4 space-y-3 ${isLeader ? 'bg-amber-50/40 dark:bg-amber-500/5' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm px-2.5 py-0.5 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40">
                      Lane {c.lane_number || '-'}
                    </span>
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{c.entry_name}</span>
                  </div>
                  {displayPlace ? (
                    <span className="font-bold px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                      {displayPlace === 1 ? '🥇 1st' : displayPlace === 2 ? '🥈 2nd' : displayPlace === 3 ? '🥉 3rd' : `${displayPlace}th`}
                    </span>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">Status</label>
                    <select
                      disabled={contest.is_official}
                      value={statusInput[c.id] || 'FINISHED'}
                      onChange={(e) => setStatusInput({ ...statusInput, [c.id]: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 font-medium dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                    >
                      <option value="FINISHED">FINISHED</option>
                      <option value="DNS">DNS</option>
                      <option value="DNF">DNF</option>
                      <option value="DQ">DQ</option>
                      <option value="NO_TIME">NO_TIME</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">Finish Time (s)</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        disabled={contest.is_official || (statusInput[c.id] && statusInput[c.id] !== 'FINISHED')}
                        placeholder="e.g. 10.425"
                        value={timesInput[c.id] || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTimesInput({ ...timesInput, [c.id]: val });
                          if (val.trim()) setStatusInput((prev) => ({ ...prev, [c.id]: 'FINISHED' }));
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-mono text-xs text-slate-900 font-semibold dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                      />
                      {!contest.is_official && (
                        <button
                          type="button"
                          onClick={() => handleCaptureLaneTime(c.id)}
                          className="px-2 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/40"
                        >
                          ⏱️
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Audited Result Correction Modal */}
      {showCorrectionModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl dark:bg-slate-900 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-amber-500" />
              Audited Result Correction
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Submit an immutable, audited correction for <strong className="text-slate-900 dark:text-slate-100">{correctionTarget?.entry_name}</strong>.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Corrected Time (Seconds / mm:ss)</label>
                <input
                  type="text"
                  placeholder="e.g. 10.420 or 1:02.34"
                  value={correctionTime}
                  onChange={(e) => setCorrectionTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Audit Reason (Required)</label>
                <textarea
                  rows={3}
                  placeholder="State official reason for correction (e.g. Photo finish camera recalibration)..."
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowCorrectionModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyCorrection}
                disabled={submitting}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
              >
                Apply Correction
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
