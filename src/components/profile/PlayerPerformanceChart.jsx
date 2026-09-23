import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { TrendingUp, Award, Calendar } from "lucide-react";
import { formatProfileDate } from "./profileUtils";

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  const resColor =
    data.result === "WIN"
      ? "text-emerald-500 font-bold"
      : data.result === "LOSS"
      ? "text-rose-500 font-bold"
      : "text-amber-500 font-bold";

  return (
    <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-2.5 shadow-lg text-xs">
      <div className="flex items-center justify-between gap-3 font-semibold">
        <span className="text-[var(--text-main)] truncate max-w-[140px]">
          vs {data.opponent}
        </span>
        <span className={resColor}>{data.result}</span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-3 text-[var(--text-muted)]">
        <span>{data.metricLabel}</span>
        <span className="font-bold text-[var(--text-main)]">{data.value}</span>
      </div>
      {data.date ? (
        <span className="mt-1 block text-[10px] text-[var(--text-soft)]">
          {data.formattedDate || data.date}
        </span>
      ) : null}
    </div>
  );
};

export const PlayerPerformanceChart = ({
  performanceHistory = [],
  title = "Performance Trend",
  sportName = null,
}) => {
  // Filter for valid completed matches with actual numeric metric values
  const validHistory = useMemo(() => {
    if (!Array.isArray(performanceHistory)) return [];
    return performanceHistory.filter((m) => {
      return (
        m &&
        m.metric_value !== null &&
        m.metric_value !== undefined &&
        Number.isFinite(Number(m.metric_value))
      );
    });
  }, [performanceHistory]);

  // Primary metric label derived from the actual backend history
  const primaryMetricLabel = useMemo(() => {
    if (validHistory.length === 0) return "Score";
    const firstWithLabel = validHistory.find((m) => Boolean(m.metric_label));
    return firstWithLabel?.metric_label || "Score";
  }, [validHistory]);

  // Zero valid matches
  if (validHistory.length === 0) {
    return (
      <div
        className="rounded-xl border border-dashed border-[var(--border-soft)] bg-[var(--surface-soft)] p-5 text-center"
        data-testid="player-chart-empty"
      >
        <TrendingUp className="mx-auto h-6 w-6 text-[var(--text-soft)]" aria-hidden="true" />
        <p className="mt-1.5 text-xs text-[var(--text-muted)]">
          No completed-match performance data yet.
        </p>
        <span className="sr-only">No historical performance trend data available.</span>
      </div>
    );
  }

  // Exactly one valid match: render a compact single-match summary card
  // rather than pretending there is a multi-point trendline
  // if (performanceHistory.length === 1)
  if (validHistory.length === 1 || performanceHistory.length === 1) {
    const single = validHistory[0] || performanceHistory[0];
    const res = String(single.result || "COMPLETED").toUpperCase();
    const isWin = res === "WIN";
    const isLoss = res === "LOSS";
    const dateFormatted = formatProfileDate(single.date);

    return (
      <div
        className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4"
        data-testid="player-chart-single"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-[var(--primary)]" aria-hidden="true" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-main)]">
              Latest Match Performance
            </h4>
          </div>
          <span
            className={`rounded-md px-2 py-0.5 text-xs font-bold ${
              isWin
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                : isLoss
                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
            }`}
          >
            {res}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-[var(--border-soft)] pt-3 text-xs">
          <div>
            <p className="font-semibold text-[var(--text-main)]">
              vs {single.opponent || "Opponent unavailable"}
            </p>
            {single.date ? (
              <p className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] mt-0.5">
                <Calendar size={11} aria-hidden="true" /> {dateFormatted || single.date}
              </p>
            ) : null}
          </div>
          <div className="text-right">
            <span className="text-[11px] text-[var(--text-muted)]">
              {single.metric_label || primaryMetricLabel}
            </span>
            <p className="text-base font-extrabold text-[var(--text-main)]">
              {single.metric_value}
            </p>
          </div>
        </div>
        <p className="mt-2 text-[10px] text-[var(--text-soft)] italic">
          Multi-match trend visualization will unlock after additional completed matches.
        </p>
      </div>
    );
  }

  // Format historical matches (last 5-10)
  const chartData = validHistory.slice(-10).map((m, idx) => ({
    index: idx + 1,
    label: `M${idx + 1}`,
    value: Number(m.metric_value),
    opponent: m.opponent || "Opponent",
    result: String(m.result || "COMPLETED").toUpperCase(),
    metricLabel: m.metric_label || primaryMetricLabel,
    date: m.date || null,
    formattedDate: formatProfileDate(m.date),
  }));

  const headingText = primaryMetricLabel
    ? `${primaryMetricLabel} Trend`
    : sportName
    ? `${sportName} Performance`
    : title;

  return (
    <div
      className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4"
      data-testid="player-chart-container"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-[var(--primary)]" aria-hidden="true" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-main)]">
            {headingText}
          </h4>
        </div>
        <span className="text-[11px] text-[var(--text-muted)] font-medium">
          Last {chartData.length} matches ({primaryMetricLabel})
        </span>
      </div>

      <p className="sr-only">
        Performance chart for {headingText}: {chartData.length} completed matches plotted.
      </p>

      <div className="h-44 w-full" style={{ minHeight: "176px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="var(--text-soft)"
              tick={{ fontSize: 10 }}
              tickLine={false}
            />
            <YAxis
              stroke="var(--text-soft)"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--primary)"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "var(--primary)" }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PlayerPerformanceChart;
