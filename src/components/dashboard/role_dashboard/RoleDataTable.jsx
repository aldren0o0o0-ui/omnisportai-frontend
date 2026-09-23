import DashboardCard from "../../common/DashboardCard";
import DataTable from "../../common/DataTable";

const isNumericLike = (value) => {
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "string") return false;

  const normalized = value.replace(/,/g, "").trim();
  if (!normalized) return false;
  return /^-?\d+(\.\d+)?%?$/.test(normalized);
};

const RoleDataTable = ({ table }) => {
  if (!table || typeof table !== "object") return null;
  const columns = Array.isArray(table.columns) ? table.columns : [];
  const rows = Array.isArray(table.rows) ? table.rows : [];

  const dataColumns = columns.map(col => ({
    header: col.label,
    accessor: col.key,
    render: (row) => {
      const value = row[col.key] ?? "-";
      return (
        <span className={isNumericLike(value) ? "float-right tabular-nums" : ""}>
          {value}
        </span>
      );
    }
  }));

  return (
    <DashboardCard className="flex flex-col gap-4">
      <h3 className="text-base font-semibold text-[var(--text-main)]">
        {table.title || "Data Table"}
      </h3>
      <DataTable columns={dataColumns} data={rows} />
    </DashboardCard>
  );
};

export default RoleDataTable;
