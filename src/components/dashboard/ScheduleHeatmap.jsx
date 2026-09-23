import { useEffect, useRef, useState } from "react";

const GITHUB_HEATMAP_COLORS = {
  light: ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"],
  dark: ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"],
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const getIntensityLevel = (count, maxCount) => {
  if (count <= 0 || maxCount <= 0) return 0;
  const ratio = clamp(count / maxCount, 0, 1);
  return clamp(Math.ceil(ratio * 4), 1, 4);
};

const getCellColor = (count, maxCount) => {
  const isDarkTheme =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark");
  const palette = isDarkTheme
    ? GITHUB_HEATMAP_COLORS.dark
    : GITHUB_HEATMAP_COLORS.light;
  return palette[getIntensityLevel(count, maxCount)];
};

const formatHourLabel = (rawHour) => {
  if (typeof rawHour !== "string" || !rawHour.includes(":")) {
    return String(rawHour || "");
  }
  const [hourText] = rawHour.split(":");
  const hour = Number.parseInt(hourText, 10);
  if (!Number.isInteger(hour)) return rawHour;

  const period = hour >= 12 ? "PM" : "AM";
  const normalized = hour % 12 === 0 ? 12 : hour % 12;
  return `${normalized}:00 ${period}`;
};

const formatCompactHourLabel = (rawHour) => {
  const formatted = formatHourLabel(rawHour);
  if (!formatted.includes(":00 ")) return formatted;
  return formatted.replace(":00 ", "").replace("AM", "a").replace("PM", "p");
};

const shouldRenderHourLabel = (index, size) => {
  if (index === 0 || index === size - 1) return true;
  return index % 3 === 0;
};

const HeatmapTooltip = ({ rowLabel, hour, count, titles }) => {
  const safeTitles = Array.isArray(titles) ? titles : [];
  const preview = safeTitles.slice(0, 5);
  const extraCount = Math.max(0, safeTitles.length - preview.length);

  return (
    <div className="pointer-events-none absolute bottom-full left-1/2 z-20 hidden w-72 -translate-x-1/2 -translate-y-2 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-left shadow-xl group-hover:block group-focus-within:block dark:border-slate-600 dark:bg-[var(--surface)]">
      <p className="text-xs font-semibold text-slate-100">
        {rowLabel} at {formatHourLabel(hour)}
      </p>
      <p className="mt-1 text-[11px] text-emerald-300">Matches: {count}</p>

      {preview.length > 0 ? (
        <ul className="mt-2 space-y-1 text-[11px] text-slate-300">
          {preview.map((title, index) => (
            <li key={`tooltip-title-${index}`} className="break-words">
              {title}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[11px] text-slate-300">No matches in this slot.</p>
      )}

      {extraCount > 0 ? (
        <p className="mt-1 text-[11px] text-slate-300">+{extraCount} more match labels</p>
      ) : null}
    </div>
  );
};

const ScheduleHeatmap = ({ heatmap = null, title = "Match Time Heatmap" }) => {
  const rows = Array.isArray(heatmap?.matrix) ? heatmap.matrix : [];
  const hours = Array.isArray(heatmap?.hours) ? heatmap.hours : [];
  const maxCount = Number(heatmap?.max_count || 0);
  const legendLevels = [0, 1, 2, 3, 4];
  const gridRef = useRef(null);
  const [cellSize, setCellSize] = useState(14);
  const [dayColumnWidth, setDayColumnWidth] = useState(108);

  useEffect(() => {
    const node = gridRef.current;
    if (!node || hours.length === 0) return undefined;

    const updateSizes = () => {
      const width = node.clientWidth || 0;
      if (!width) return;

      const nextDayWidth = clamp(Math.floor(width * 0.2), 88, 140);
      const availableWidth = Math.max(0, width - nextDayWidth - 24);
      const nextCellSize = clamp(Math.floor(availableWidth / hours.length) - 2, 8, 20);

      setDayColumnWidth(nextDayWidth);
      setCellSize(nextCellSize);
    };

    updateSizes();

    let resizeObserver;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(updateSizes);
      resizeObserver.observe(node);
    }

    window.addEventListener("resize", updateSizes);
    return () => {
      window.removeEventListener("resize", updateSizes);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [hours.length]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[var(--surface)]">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">
        {title}
      </h3>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Heat concentration by day and hour. Hover any cell for exact match volume.
      </p>

      {rows.length === 0 || hours.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          No scheduled match heatmap data available.
        </p>
      ) : (
        <>
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/70">
            <div ref={gridRef} className="overflow-x-hidden overflow-y-visible">
              <table
                className="w-full table-fixed border-separate text-xs"
                style={{ borderSpacing: "2px" }}
              >
                <colgroup>
                  <col style={{ width: `${dayColumnWidth}px` }} />
                  {hours.map((hour) => (
                    <col key={`hm-col-${hour.hour}`} />
                  ))}
                </colgroup>
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 bg-slate-100 px-2 py-1 text-left text-[11px] text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                      Day
                    </th>
                    {hours.map((hour, hourIndex) => (
                      <th
                        key={`hm-hour-${hour.hour}`}
                        className="px-0.5 py-1 text-center text-[10px] font-medium text-slate-500 dark:text-slate-400"
                      >
                        {shouldRenderHourLabel(hourIndex, hours.length)
                          ? formatCompactHourLabel(hour.hour)
                          : ""}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={`hm-row-${row.date}`}>
                      <td className="sticky left-0 z-10 rounded bg-slate-100 px-2 py-1 whitespace-nowrap text-[11px] font-medium text-slate-600 dark:bg-slate-950 dark:text-slate-400">
                        {row.label}
                      </td>
                      {(Array.isArray(row.cells) ? row.cells : []).map((cell) => {
                        const count = Number(cell.count || 0);
                        const titles = Array.isArray(cell.titles) ? cell.titles : [];
                        const isEmpty = count <= 0;

                        return (
                          <td key={`hm-cell-${row.date}-${cell.hour}`}>
                            <div className="group relative">
                              <div
                                tabIndex={0}
                                aria-label={`${row.label} at ${formatHourLabel(cell.hour)}: ${count} matches`}
                                className="mx-auto rounded-[3px] border outline-none ring-emerald-400/70 focus:ring-2"
                                style={{
                                  width: `${cellSize}px`,
                                  height: `${cellSize}px`,
                                  backgroundColor: getCellColor(count, maxCount),
                                  borderColor: isEmpty
                                    ? "rgba(148, 163, 184, 0.35)"
                                    : "rgba(15, 23, 42, 0.15)",
                                }}
                              />
                              <HeatmapTooltip
                                rowLabel={row.label}
                                hour={cell.hour}
                                count={count}
                                titles={titles}
                              />
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex items-center justify-end gap-2 text-[11px] text-slate-500">
              <span>Less</span>
              <div className="flex items-center gap-1">
                {legendLevels.map((level) => (
                  <span
                    key={`hm-legend-${level}`}
                    className="rounded-[3px] border"
                    style={{
                      width: `${clamp(cellSize, 10, 14)}px`,
                      height: `${clamp(cellSize, 10, 14)}px`,
                      backgroundColor: getCellColor(
                        level === 0 ? 0 : (maxCount * level) / 4,
                        maxCount || 4
                      ),
                      borderColor: "rgba(148, 163, 184, 0.35)",
                    }}
                  />
                ))}
              </div>
              <span>More</span>
            </div>
          </div>

          <div className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
            Contribution-style intensity: darker cells indicate heavier match concentration.
          </div>
        </>
      )}
    </section>
  );
};

export default ScheduleHeatmap;
