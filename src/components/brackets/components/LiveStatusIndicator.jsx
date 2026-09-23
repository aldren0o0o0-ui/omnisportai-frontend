import React from "react";

const statusConfig = {
  live: {
    label: "Live updates connected.",
    badge: "LIVE",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/45 dark:bg-emerald-500/10 dark:text-emerald-100"
  },
  reconnecting: {
    label: "Reconnecting to live updates...",
    badge: "RECONNECTING",
    tone: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/45 dark:bg-amber-500/10 dark:text-amber-100"
  },
  stale: {
    label: "Live updates are delayed. Scores may be outdated.",
    badge: "DELAYED",
    tone: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/45 dark:bg-amber-500/10 dark:text-amber-100"
  },
  offline: {
    label: "Live scoring connection failed. Manual refresh is available.",
    badge: "OFFLINE",
    tone: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/45 dark:bg-rose-500/10 dark:text-rose-100"
  },
  token_expired: {
    label: "Your session expired. Please refresh or sign in again.",
    badge: "SESSION EXPIRED",
    tone: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/45 dark:bg-rose-500/10 dark:text-rose-100"
  }
};

const formatSyncedAt = (value) => {
  if (!value) return "Never synced";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Never synced";
  return `Synced ${parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
};

const LiveStatusIndicator = ({ mode, lastSyncedAt, onRefresh, onReconnect, isRefreshing }) => {
  const resolved = statusConfig[mode] || statusConfig.offline;
  const isDelayed = mode === "stale" || mode === "reconnecting";
  const isHealthy = mode === "live";

  return (
    <div className={`rounded-lg border px-3 py-1.5 ${resolved.tone} shadow-md shadow-slate-300/30 dark:shadow-lg dark:shadow-slate-950/30`}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${isHealthy ? "bg-emerald-400" : isDelayed ? "bg-amber-400" : "bg-rose-400"}`} />
          <p className="truncate font-semibold">
            {isDelayed ? "Live updates delayed" : resolved.label}
          </p>
          <span className="text-[11px] opacity-90">{formatSyncedAt(lastSyncedAt)}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="Refresh live state"
            title="Refresh live state"
            className="rounded-md border border-current/40 px-2 py-1 text-xs font-semibold transition hover:bg-black/5 dark:hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRefreshing ? "..." : "Refresh"}
          </button>
          {(mode === "reconnecting" || mode === "offline") && (
            <button
              type="button"
              onClick={onReconnect}
              className="rounded-md border border-current/40 px-2 py-1 text-xs font-semibold transition hover:bg-black/5 dark:hover:bg-white/10"
            >
              Reconnect
            </button>
          )}
          {!isHealthy && (
            <span className="rounded-full border border-current/40 px-2 py-0.5 text-[10px] font-semibold tracking-wide">
              {resolved.badge}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveStatusIndicator;
