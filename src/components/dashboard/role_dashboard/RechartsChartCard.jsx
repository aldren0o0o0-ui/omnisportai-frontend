import { useMemo, useState } from "react";
import DashboardCard from "../../common/DashboardCard";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const palette = [
  "#06b6d4",
  "#22c55e",
  "#f59e0b",
  "#a78bfa",
  "#f43f5e",
  "#3b82f6",
  "#14b8a6",
  "#f97316",
];

const rankedPalette = [
  "#22d3ee",
  "#38bdf8",
  "#60a5fa",
  "#64748b",
  "#475569",
  "#334155",
];

const safeSeries = (chart) =>
  (Array.isArray(chart?.series) ? chart.series : []).map((item, index) => ({
    id: `${String(item?.label ?? "-")}-${index}`,
    label: String(item?.label ?? "-"),
    value: Number(item?.value ?? 0),
  }));

const rankedColorMap = (rows) => {
  const sortedRows = [...rows]
    .sort((left, right) => Number(right?.value || 0) - Number(left?.value || 0));
  const map = new Map();
  sortedRows.forEach((row, index) => {
    map.set(row.id, rankedPalette[Math.min(index, rankedPalette.length - 1)]);
  });
  return map;
};

const DrilldownPanel = ({ selected }) => {
  if (!selected) return null;

  return (
    <div className="mt-4 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-3 text-sm text-[var(--text-main)]">
      <div className="text-xs tracking-wide text-[var(--text-muted)]">Drilldown</div>
      <div className="mt-1">
        {selected.label}: <span className="font-semibold">{selected.value}</span>
      </div>
    </div>
  );
};

const RechartsChartCard = ({ chart, height = 260, barColorMode = "palette" }) => {
  const data = useMemo(() => safeSeries(chart), [chart]);
  const rankedColors = useMemo(
    () => (barColorMode === "ranked" ? rankedColorMap(data) : new Map()),
    [barColorMode, data]
  );
  const [selected, setSelected] = useState(null);

  if (!chart || data.length === 0) {
    return (
      <DashboardCard>
        <h3 className="text-sm font-semibold text-[var(--text-main)]">
          {chart?.title || "Chart"}
        </h3>
        <p className="mt-3 text-sm text-[var(--text-muted)]">No chart data available.</p>
      </DashboardCard>
    );
  }

  const handleChartClick = (state) => {
    const payload = state?.activePayload?.[0]?.payload;
    if (!payload) return;
    setSelected({ label: payload.label, value: payload.value });
  };

  const handleBarClick = (entry) => {
    const payload = entry?.payload || entry;
    if (!payload) return;
    setSelected({ label: payload.label, value: payload.value });
  };

  return (
    <DashboardCard>
      <h3 className="text-sm font-semibold text-[var(--text-main)]">
        {chart.title || "Chart"}
      </h3>
      {chart.description ? (
        <p className="mt-1 text-xs text-[var(--text-muted)]">{chart.description}</p>
      ) : null}

      <div className="mt-4 min-h-56 w-full" style={{ height: `clamp(14rem, 35vw, ${Math.max(224, Number(height) || 260)}px)` }} role="img" aria-label={`${chart.title || "Chart"}. ${chart.description || ""}`.trim()}>
        <ResponsiveContainer width="100%" height="100%">
          {chart.type === "line" ? (
            <LineChart data={data} onClick={handleChartClick}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
              <XAxis dataKey="label" stroke="var(--text-soft)" tick={{ fontSize: 11 }} minTickGap={24} interval="preserveStartEnd" />
              <YAxis stroke="var(--text-soft)" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--surface)",
                  border: "1px solid var(--border-soft)",
                  borderRadius: "10px",
                  color: "var(--text-main)",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                name={chart.title || "Value"}
                stroke="#22d3ee"
                strokeWidth={3}
                dot={{ r: 3, fill: "#06b6d4" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          ) : (
            <BarChart data={data} onClick={handleChartClick}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
              <XAxis dataKey="label" stroke="var(--text-soft)" tick={{ fontSize: 11 }} minTickGap={24} interval="preserveStartEnd" />
              <YAxis stroke="var(--text-soft)" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--surface)",
                  border: "1px solid var(--border-soft)",
                  borderRadius: "10px",
                  color: "var(--text-main)",
                }}
              />
              <Legend />
              <Bar
                dataKey="value"
                name={chart.title || "Value"}
                radius={[6, 6, 0, 0]}
                onClick={handleBarClick}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${entry.id}`}
                    fill={
                      barColorMode === "ranked"
                        ? rankedColors.get(entry.id) || rankedPalette[rankedPalette.length - 1]
                        : palette[index % palette.length]
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
      <ul className="sr-only">
        {data.map((row) => <li key={`chart-summary-${row.id}`}>{row.label}: {row.value}</li>)}
      </ul>

      <DrilldownPanel selected={selected} />
    </DashboardCard>
  );
};

export default RechartsChartCard;
