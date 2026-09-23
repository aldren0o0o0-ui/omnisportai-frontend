import React from 'react';
import DashboardCard from './DashboardCard';

const Spinner = () => (
  <div aria-hidden="true" className="h-8 w-8 animate-spin rounded-full border-[3px] border-[var(--surface-muted)] border-t-[var(--primary)] motion-reduce:animate-none" />
);

const LoadingState = ({ message = "Loading...", inline = false }) => {
  // inline: no card wrapper — for use inside an existing card/panel.
  if (inline) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-8 text-center" role="status" aria-live="polite">
        <Spinner />
        <p className="text-sm font-medium text-[var(--text-muted)]">{message}</p>
      </div>
    );
  }

  return (
    <DashboardCard className="flex flex-col items-center justify-center p-8 text-center" role="status" aria-live="polite">
      <div className="mb-4">
        <Spinner />
      </div>
      <p className="text-sm font-medium text-[var(--text-muted)]">{message}</p>
    </DashboardCard>
  );
};

export default LoadingState;
