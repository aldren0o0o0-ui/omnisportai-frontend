import React from 'react';
import { AlertTriangle } from 'lucide-react';
import DashboardCard from './DashboardCard';

// Shared error surface for data-load failures. Mirrors LoadingState/EmptyState
// so pages present a consistent "something went wrong + retry" experience
// instead of hand-rolled rose divs. `inline` skips the card wrapper for use
// inside an existing panel. Provide `onRetry` to render a Retry button.
const ErrorState = ({
  title = 'Something went wrong',
  message = 'Unable to load data. Please try again.',
  onRetry,
  retryLabel = 'Retry',
  inline = false,
}) => {
  const body = (
    <div className="flex flex-col items-center justify-center gap-3 text-center" role="alert">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--danger-soft)] text-[var(--danger)]" aria-hidden="true">
        <AlertTriangle size={28} />
      </div>
      <div>
        <h3 className="text-base font-semibold text-[var(--text-main)]">{title}</h3>
        <p className="mt-1 max-w-md text-sm text-[var(--text-muted)]">{message}</p>
      </div>
      {typeof onRetry === 'function' ? (
        <button type="button" onClick={onRetry} className="os-btn-primary-soft mt-1">
          {retryLabel}
        </button>
      ) : null}
    </div>
  );

  if (inline) return body;
  return <DashboardCard className="p-6">{body}</DashboardCard>;
};

export default ErrorState;
