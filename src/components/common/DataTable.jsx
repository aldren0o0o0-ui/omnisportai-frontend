import React from 'react';
import { responsiveColumnClass } from './dataTableResponsive';

const DataTable = ({
  columns = [],
  data = [],
  keyExtractor,
  emptyState,
  isLoading = false,
  loadingMessage = "Loading...",
  caption = "",
  stickyHeader = false,
  containerClassName = "",
  tableClassName = "",
  onRowClick = null,
  rowLabel = null,
}) => {
  if (isLoading) {
    const skeletonColumns = Math.max(1, columns.filter((column) => column.priority !== 3).length);
    return (
      <div className="os-soft-table w-full overflow-hidden" role="status" aria-live="polite" aria-label={loadingMessage}>
        <span className="sr-only">{loadingMessage}</span>
        <div className="grid gap-3 p-4" aria-hidden="true">
          {Array.from({ length: 5 }, (_, rowIndex) => (
            <div key={rowIndex} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${skeletonColumns}, minmax(0, 1fr))` }}>
              {Array.from({ length: skeletonColumns }, (_, columnIndex) => <span key={columnIndex} className="h-4 animate-pulse rounded bg-[var(--surface-muted)] motion-reduce:animate-none" />)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return emptyState || (
      <div className="p-8 text-center text-sm text-[var(--text-muted)]">
        No records yet.
      </div>
    );
  }

  return (
    <div className={`os-soft-table w-full max-w-full overflow-x-auto overscroll-x-contain [webkit-overflow-scrolling:touch] ${containerClassName}`}>
      <table className={`w-full text-left text-sm text-[var(--text-muted)] min-w-[500px] sm:min-w-full ${tableClassName}`}>
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead className={`text-xs uppercase tracking-wider text-[var(--text-soft)] ${stickyHeader ? "sticky top-0 z-10" : ""}`}>
          <tr>
            {columns.map((col, idx) => (
              <th scope="col" key={idx} className={`px-3 py-3 font-semibold sm:px-4 ${responsiveColumnClass(col)} ${col.className || ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-[var(--surface)]">
          {data.map((row, rowIdx) => (
            <tr
              key={keyExtractor ? keyExtractor(row, rowIdx) : rowIdx}
              className={`border-b border-[var(--border-soft)] transition-colors hover:bg-[var(--surface-soft)] motion-reduce:transition-none ${onRowClick ? "cursor-pointer focus-visible:bg-[var(--surface-soft)]" : ""}`}
              onClick={onRowClick ? () => onRowClick(row, rowIdx) : undefined}
              onKeyDown={onRowClick ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onRowClick(row, rowIdx);
                }
              } : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              aria-label={onRowClick && rowLabel ? rowLabel(row, rowIdx) : undefined}
            >
              {columns.map((col, colIdx) => (
                <td key={colIdx} className={`min-w-0 px-3 py-3 text-[var(--text-main)] sm:px-4 ${responsiveColumnClass(col)} ${col.cellClassName || ''}`}>
                  {col.render ? col.render(row, rowIdx) : row[col.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
