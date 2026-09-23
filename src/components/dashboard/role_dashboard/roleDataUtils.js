export const pickChart = (dashboard, ...ids) => {
  const charts = Array.isArray(dashboard?.charts) ? dashboard.charts : [];
  for (const id of ids) {
    const found = charts.find((chart) => chart?.id === id);
    if (found) return found;
  }
  return charts[0] || null;
};

export const pickTable = (dashboard, ...ids) => {
  const tables = Array.isArray(dashboard?.tables) ? dashboard.tables : [];
  for (const id of ids) {
    const found = tables.find((table) => table?.id === id);
    if (found) return found;
  }
  return tables[0] || null;
};

export const listTables = (dashboard) =>
  Array.isArray(dashboard?.tables) ? dashboard.tables : [];

export const listInsights = (dashboard) =>
  Array.isArray(dashboard?.insights) ? dashboard.insights : [];
